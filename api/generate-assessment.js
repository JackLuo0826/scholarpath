import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/generate-assessment
 * Generates a 7-question diagnostic assessment spanning foundation/developing/advanced.
 * Optionally analyses uploaded exercise photos via Claude Vision before generating.
 *
 * Body: {
 *   subject,             // e.g. "Mathematics"
 *   childAge,
 *   childGrade,
 *   childName?,
 *   exerciseImages?,     // string[] of base64 PNG/JPG (recent student work, optional)
 *   apiKey, model
 * }
 * Returns: { questions: AssessmentQuestion[], estimatedCurrentLevel, levelDescription }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    subject, childAge, childGrade, childName,
    exerciseImages,
    apiKey, model,
  } = req.body

  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })
  if (!subject) return res.status(400).json({ error: 'subject is required' })

  const age = parseInt(childAge) || 13
  const grade = childGrade || 'school age'
  const name = childName || 'Student'

  // Map grade/year to expected NZC curriculum level for context
  const nzcLevel = estimateNzcLevel(grade, age)

  const subjectGuidance = buildSubjectGuidance(subject, nzcLevel)

  const systemPrompt = `You are an expert NZC educational assessor creating a diagnostic placement assessment.

Student profile: ${name}, ${age} years old, ${grade}.
Subject: ${subject}
Expected curriculum level: ${nzcLevel}

${subjectGuidance}

TASK: Generate exactly 7 assessment questions spanning three difficulty tiers to accurately place this student:
- 2 FOUNDATION questions: skills from 1-2 year levels BELOW expected (prerequisite knowledge the student should have mastered earlier)
- 3 DEVELOPING questions: skills AT the expected year level (what a typical student this age should know)
- 2 ADVANCED questions: skills from 1-2 year levels ABOVE expected (genuine stretch — most students at this year level cannot yet do this)

CALIBRATION RULES — strictly follow these:
- Foundation questions must be genuinely easy for an on-level student (they should score ~90% on these)
- Developing questions must be genuinely at-level (on-level students score ~65% on these)
- Advanced questions must be genuinely hard for this year (on-level students score ~25% on these)
- Do NOT make all questions the same style — vary question types and topics
- Each question must test a SPECIFIC, MEASURABLE skill — not just general recall
- Questions must be unambiguous with only one correct answer or clear marking criteria

Question type guidelines:
- "multiple-choice": 4 options (label them "A. ...", "B. ...", "C. ...", "D. ..."); one clearly correct, three plausible distractors based on common errors
- "short-answer": 1-2 sentence response — good for vocabulary, definitions, calculations, inference
- "long-answer": multi-step explanation, extended writing, or analysis — good for essays, experimental design, evaluation
- "drawing": diagram, labelled sketch, or SHOW YOUR WORKING — mark what the student writes or draws

Variety rules (use at least 3 different question types across the 7 questions):
- Mathematics: ≥1 drawing (show working), ≥1 MC, ≥1 short-answer
- Sciences (Science, Biology, Chemistry, Physics): ≥1 MC (factual recall), ≥1 short-answer (explain/describe), ≥1 drawing or long-answer
- English: ≥1 MC or short-answer (language feature identification), ≥1 long-answer (writing task)
- Social Sciences (History, Geography, Economics): ≥1 MC (factual recall), ≥1 short-answer (explain), ≥1 long-answer (analysis/essay)
- Languages (French, Spanish, Te Reo Māori): ≥1 MC (vocab/grammar), ≥1 short-answer (translation), ≥1 writing task
- Computing: ≥1 MC (concept/theory), ≥1 short-answer (explain algorithm or write code snippet), ≥1 drawing (flowchart or trace)
- Music: ≥1 MC (notation/theory), ≥1 short-answer (describe musical elements), ≥1 drawing (write rhythm or notation)
- Each question must have a "topic" field (e.g. "Fractions", "Genetics", "Narrative Writing", "Supply and Demand")
- Each question must have a gentle "hint" that guides thinking without revealing the answer

Return ONLY valid JSON with no markdown fences:
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "hint": "...",
      "type": "short-answer",
      "difficulty": "foundation",
      "topic": "..."
    },
    {
      "id": "q2",
      "question": "...",
      "hint": "...",
      "type": "multiple-choice",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "difficulty": "foundation",
      "topic": "..."
    }
  ],
  "estimatedCurrentLevel": "developing",
  "levelDescription": "Expected ${grade} level in ${subject} — what a typical student this age should know"
}

IMPORTANT: Order questions from easiest to hardest (foundation first, then developing, then advanced).`

  // Build message content — include exercise images if provided
  let messageContent

  if (exerciseImages && exerciseImages.length > 0) {
    const parts = [
      {
        type: 'text',
        text: `Please analyse this student's recent ${subject} work to understand their current level, then generate an appropriate diagnostic assessment. The student is ${name}, ${age} years old, ${grade}.`,
      },
    ]

    for (let i = 0; i < Math.min(exerciseImages.length, 3); i++) {
      const raw = exerciseImages[i]
      const base64Data = raw.replace(/^data:image\/[a-z]+;base64,/, '')
      const mediaType = raw.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png'
      parts.push({
        type: 'text',
        text: `Recent work sample ${i + 1}:`,
      })
      parts.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64Data },
      })
    }

    parts.push({
      type: 'text',
      text: `Based on the work samples above, generate a diagnostic assessment following the system prompt instructions.`,
    })

    messageContent = parts
  } else {
    messageContent = `Generate a diagnostic ${subject} assessment for ${name} (${age} years old, ${grade}). Follow the system prompt instructions exactly.`
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = response.content[0].text.trim()
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('Invalid JSON response from AI')
    const result = JSON.parse(raw.slice(start, end + 1))

    // Validate we have questions
    if (!Array.isArray(result.questions) || result.questions.length === 0) {
      throw new Error('No questions returned')
    }

    // Ensure each question has an id
    result.questions = result.questions.map((q, i) => ({
      ...q,
      id: q.id || `q${i + 1}`,
    }))

    res.json(result)
  } catch (err) {
    console.error('generate-assessment error:', err)
    res.status(500).json({ error: err.message || 'Assessment generation failed' })
  }
}

function estimateNzcLevel(grade, age) {
  // Normalise no-space variants ("year13" → "year 13") and lowercase
  const g = String(grade).toLowerCase().replace(/year(\d)/g, 'year $1')

  // Pre-school / early childhood
  if (g.includes('preschool') || g.includes('pre-school') || g.includes('kindergarten') || g.includes('kindy') || g.includes('kohanga') || g.includes('early childhood')) return 'NZC Level 1 (Year 1-2)'

  // NZ legacy "Form" terminology (phased out 1989): Form 7=Yr13, 6=Yr12, 5=Yr11, 4=Yr10, 3=Yr9
  if (g.includes('form 7') || g.includes('7th form') || g.includes('seventh form')) return 'NZC Level 8 / NCEA Level 3'
  if (g.includes('form 6') || g.includes('6th form') || g.includes('sixth form'))   return 'NZC Level 7 / NCEA Level 2'
  if (g.includes('form 5') || g.includes('5th form') || g.includes('fifth form'))   return 'NZC Level 6 / NCEA Level 1'
  if (g.includes('form 4') || g.includes('4th form') || g.includes('fourth form'))  return 'NZC Level 5 (Year 9-10)'
  if (g.includes('form 3') || g.includes('3rd form') || g.includes('third form'))   return 'NZC Level 4 (Year 7-8)'

  // Check longest year strings FIRST — "year 1" is a substring of "year 10/11/12/13"
  if (g.includes('year 13') || g.includes('y13') || age >= 18) return 'NZC Level 8 / NCEA Level 3'
  if (g.includes('year 12') || g.includes('y12') || age === 17) return 'NZC Level 7 / NCEA Level 2'
  if (g.includes('year 11') || g.includes('y11') || age === 16) return 'NZC Level 6 / NCEA Level 1'
  if (g.includes('year 10') || g.includes('y10') || age === 15) return 'NZC Level 5 (Year 9-10)'
  if (g.includes('year 9')  || g.includes('y9')  || age === 14) return 'NZC Level 5 (Year 9-10)'
  if (g.includes('year 8')  || g.includes('y8')  || age === 13) return 'NZC Level 4 (Year 7-8)'
  if (g.includes('year 7')  || g.includes('y7')  || age === 12) return 'NZC Level 4 (Year 7-8)'
  if (g.includes('year 6')  || g.includes('y6')  || age === 11) return 'NZC Level 3 (Year 5-6)'
  if (g.includes('year 5')  || g.includes('y5')  || age === 10) return 'NZC Level 3 (Year 5-6)'
  if (g.includes('year 4')  || g.includes('y4')  || age === 9)  return 'NZC Level 2 (Year 3-4)'
  if (g.includes('year 3')  || g.includes('y3')  || age === 8)  return 'NZC Level 2 (Year 3-4)'
  if (g.includes('year 2')  || g.includes('y2')  || age === 7)  return 'NZC Level 1 (Year 1-2)'
  if (g.includes('year 1')  || g.includes('y1')  || age <= 6)   return 'NZC Level 1 (Year 1-2)'
  return `Expected year level for age ${age}`
}

function buildSubjectGuidance(subject, nzcLevel) {
  const s = subject.toLowerCase()

  // Mathematics
  if (s.includes('math') || s.includes('maths') || s.includes('numeracy')) {
    if (nzcLevel.startsWith('NZC Level 1') || nzcLevel.includes('Year 1') || nzcLevel.includes('Year 2')) {
      return `NZC MATHEMATICS LEVEL 1 CALIBRATION:
- FOUNDATION (pre-school/entry): Counting objects to 20, recognising numerals, simple patterns
- DEVELOPING (Year 1-2): Addition/subtraction within 20 using counting strategies; halves and quarters of shapes; non-standard measurement (hand-spans); simple 2D shape names; tally charts
- ADVANCED (Year 3-4): Place value to 1000; 2-3 digit addition/subtraction; multiplication by 2s, 5s, 10s; standard units (cm, kg, L); time to the quarter-hour`
    }
    if (nzcLevel.startsWith('NZC Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC MATHEMATICS LEVEL 2 CALIBRATION:
- FOUNDATION (Year 1-2 skills): Addition/subtraction within 20; halves and quarters of simple shapes; non-standard measurement; simple number sequences
- DEVELOPING (Year 3-4 skills): Place value to 1000 (hundreds, tens, ones); addition and subtraction of 2- and 3-digit numbers using place-value strategies; multiplication by 2s, 5s, 10s (working toward all basic facts); fractions of sets and shapes (halves, quarters, thirds, eighths); standard measurement (cm/m, kg, L); time to the quarter-hour; extending number patterns; reading simple tally charts and picture graphs
- ADVANCED (Year 5-6 skills): All multiplication/division facts to 10×10 with fluency; multiplying 2-digit numbers; decimals to one decimal place; equivalent fractions; perimeter using formulae; 24-hour time; mean of a data set`
    }
    if (nzcLevel.startsWith('NZC Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC MATHEMATICS LEVEL 3 CALIBRATION:
- FOUNDATION (Year 3-4 skills): 3-digit addition/subtraction; multiplication by 2s/5s/10s; simple fractions; standard measurement units; time to the quarter-hour
- DEVELOPING (Year 5-6 skills): All ×/÷ facts to 10×10 fluently; multi-digit multiplication/division algorithms; fractions, decimals (tenths, hundredths), simple percentages; equivalent fractions; area and perimeter formulae; metric conversions; transformations (reflection, rotation, translation); tables, graphs, and patterns; probability as fractions
- ADVANCED (Year 7-8 skills): Integers; multi-step ratio/proportion; introduction to algebra (solve for x); scale; Pythagoras theorem; statistical mean/median/mode`
    }
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC MATHEMATICS LEVEL 4 CALIBRATION:
- FOUNDATION (Year 5-6 skills): ×/÷ basic facts; fractions, decimals, percentages; area/perimeter; metric conversions; transformations; probability as fractions
- DEVELOPING (Year 7-8 skills): Integers; multi-step ratio/proportion; linear algebra (solve equations with one variable); geometric properties (angles in parallel lines, properties of polygons); Pythagoras theorem; statistical investigations with mean/median/mode/range; complementary probability; index notation and number properties (prime factorisation)
- ADVANCED (Year 9-10 skills): Quadratic equations; index laws; simultaneous equations; trigonometry (SOH CAH TOA); statistical inference; probability trees`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC MATHEMATICS LEVEL 5 CALIBRATION:
- FOUNDATION (Year 7-8 skills): Linear equations; Pythagoras theorem; ratio/proportion; geometric angles; statistical measures; complementary probability
- DEVELOPING (Year 9-10 skills): Quadratic equations (factorising, formula); index laws (including negative and fractional indices); simultaneous equations (substitution/elimination); trigonometry (SOH CAH TOA in right triangles); statistical inference with box plots and histograms; probability trees and conditional probability; coordinate geometry (gradient, midpoint, distance)
- ADVANCED (NCEA Level 1 skills): Sequences and series; logarithms; circle theorems; two-way tables for probability; bivariate data and linear regression`
    }
    if (nzcLevel.includes('Level 6') || nzcLevel.includes('NCEA Level 1') || nzcLevel.includes('Year 11')) {
      return `NCEA MATHEMATICS LEVEL 1 (Year 11) CALIBRATION:
- FOUNDATION (Year 9-10 skills): Quadratic equations; simultaneous equations; trigonometry in right triangles; statistical measures; probability trees
- DEVELOPING (NCEA Level 1 skills): Algebra (quadratics, exponentials, logarithms); trigonometry (including non-right triangles using sine and cosine rules); geometric reasoning (circle theorems); statistical investigations and inference; network diagrams; sequences and series
- ADVANCED (NCEA Level 2 skills): Calculus concepts (rates of change, gradient functions); complex algebraic manipulation; statistical literacy (design and analysis of statistical studies)`
    }
    if (nzcLevel.includes('Level 7') || nzcLevel.includes('NCEA Level 2') || nzcLevel.includes('Year 12')) {
      return `NCEA MATHEMATICS LEVEL 2 (Year 12) CALIBRATION:
- FOUNDATION (NCEA Level 1 skills): Quadratics; logarithms; trigonometry (sine and cosine rules); circle theorems; sequences and series; statistical inference
- DEVELOPING (NCEA Level 2 skills): Calculus (differentiation — product rule, quotient rule, chain rule; integration — definite and indefinite integrals; applications — finding gradients, maxima/minima, area under a curve); algebra (complex numbers — operations, Argand diagram, modulus-argument form; conic sections — circles, parabolas, ellipses, hyperbolas); trigonometry (reciprocal functions; compound and double angle formulae; solving trig equations over a domain); statistics (bivariate data — correlation, regression, coefficient of determination; confidence intervals; hypothesis testing using p-values; normal distribution calculations; sampling methods)
- ADVANCED (NCEA Level 3 skills): Limits and continuity; integration by parts/substitution; vector algebra; complex plane mapping`
    }
    if (nzcLevel.includes('Level 8') || nzcLevel.includes('NCEA Level 3') || nzcLevel.includes('Year 13')) {
      return `NCEA MATHEMATICS LEVEL 3 (Year 13) CALIBRATION:
- FOUNDATION (NCEA Level 2 skills): Calculus (differentiation with product/quotient/chain rules; definite/indefinite integration; maxima/minima); complex numbers; trigonometric equations; bivariate statistics; confidence intervals
- DEVELOPING (NCEA Level 3 skills): Calculus in depth (integration by substitution; integration by parts; differential equations — separable, logistic growth; Maclaurin series; rates of change problems); complex numbers (De Moivre's theorem; roots of complex numbers; loci in the Argand diagram); linear algebra (vectors in 3D; dot and cross products; vector equations of lines and planes; matrix operations — determinant, inverse, eigenvalues/eigenvectors concept); probability (probability density functions; expected value E(X) and variance Var(X); standard distributions — binomial, Poisson, normal; combination of random variables); statistics (statistical inference — hypothesis tests for means and proportions; chi-squared test for independence; non-parametric tests)
- ADVANCED (scholarship/university skills): Real analysis (epsilon-delta definitions); multivariable calculus; abstract algebra; Fourier series`
    }
    return `Use appropriate NZC mathematics content for ${nzcLevel}, calibrating foundation 1-2 year levels below, developing at level, and advanced 1-2 year levels above.`
  }

  // English
  if (s.includes('english') || s.includes('literacy') || s.includes('reading') || s.includes('writing')) {
    if (nzcLevel.startsWith('NZC Level 1') || nzcLevel.includes('Year 1') || nzcLevel.includes('Year 2')) {
      return `NZC ENGLISH LEVEL 1 CALIBRATION:
- FOUNDATION (pre-school): Letter recognition, initial sounds, simple sight words
- DEVELOPING (Year 1-2): Phonics decoding of simple words; reading simple decodable texts; writing simple sentences with capital letters and full stops; basic high-frequency word spelling; recognising nouns, verbs in simple sentences
- ADVANCED (Year 3-4): Reading with inference; writing in paragraphs; multiple text types; complex sentences; speech marks; commas`
    }
    if (nzcLevel.startsWith('NZC Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC ENGLISH LEVEL 2 CALIBRATION:
- FOUNDATION (Year 1-2 skills): Simple sentence construction with capital letter and full stop; recognising basic nouns and verbs; decoding simple words; reading short simple texts literally
- DEVELOPING (Year 3-4 skills): Reading fiction/non-fiction with inference and making connections; identifying text features (heading, subheading, caption); writing in paragraphs using topic sentences; narrative writing with problem and resolution; simple report and recount writing; using speech marks, commas, and simple conjunctions (but, because, so, when); identifying nouns, verbs, adjectives, adverbs; spelling phonically regular and common words; basic simile and metaphor recognition
- ADVANCED (Year 5-6 skills): Identifying subordinate clauses and complex sentence structures; persuasive writing with structured arguments; recognising personification, hyperbole, and symbolism; identifying author purpose and point of view; using colons, semicolons, and dashes correctly; writing from multiple perspectives`
    }
    if (nzcLevel.startsWith('NZC Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC ENGLISH LEVEL 3 CALIBRATION:
- FOUNDATION (Year 3-4 skills): Reading with inference; paragraph writing; simple narrative; simile and metaphor; speech marks; adjectives and adverbs
- DEVELOPING (Year 5-6 skills): Reading longer texts and identifying author purpose, bias, and point of view; writing extended paragraphs with evidence and elaboration; persuasive essays with structured arguments (PEEL); correct apostrophes, colons, varied punctuation; figurative language (personification, hyperbole, symbolism); vocabulary in context; audience and register awareness; synthesising information from two sources
- ADVANCED (Year 7-8 skills): Critical literary analysis; sustained multi-paragraph essays with thesis statements; genre manipulation; complex grammatical structures; independent evaluation of texts for bias and purpose`
    }
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC ENGLISH LEVEL 4 CALIBRATION:
- FOUNDATION (Year 5-6 skills): PEEL paragraphs; identifying author purpose and bias; figurative language (personification, hyperbole, symbolism); colons and apostrophes; synthesising two sources
- DEVELOPING (Year 7-8 skills): Sustained multi-paragraph essays with clear thesis and evidence; critical analysis of literary techniques (irony, foreshadowing, motif, extended metaphor); evaluating texts for bias, perspective, and audience; complex sentence structures (subordinate clauses, relative clauses); vocabulary precision; writing for specific audiences and purposes; formal and informal register distinction; analysing visual and multimodal texts
- ADVANCED (Year 9-10 skills): Independent literary criticism with sustained argument; analysis of narrative voice and unreliable narrator; comparing texts across time periods; genre hybrid texts; nuanced evaluation of propaganda and rhetorical devices`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC ENGLISH LEVEL 5 CALIBRATION:
- FOUNDATION (Year 7-8 skills): Multi-paragraph essays; literary techniques (irony, motif, extended metaphor); evaluating texts for bias; complex sentence structures
- DEVELOPING (Year 9-10 skills): Independent literary criticism with sustained argument; analysis of narrative voice, unreliable narrator, and structural choices; comparing texts for purpose, audience, and context; analysis of propaganda and rhetorical devices (ethos, pathos, logos); writing across diverse genres; independent editing for style, voice, and impact; close reading of unseen texts; semiotics (how images and layout create meaning)
- ADVANCED (NCEA Level 1 skills): Formal literary essay structure with close textual analysis; evaluation of authorial intent and cultural/historical context; sophisticated vocabulary and syntactic variety`
    }
    if (nzcLevel.includes('Level 6') || nzcLevel.includes('NCEA Level 1') || nzcLevel.includes('Year 11')) {
      return `NCEA ENGLISH LEVEL 1 (Year 11) CALIBRATION:
- FOUNDATION (Year 9-10 skills): Literary criticism essays; rhetorical devices; narrative voice; comparing texts; genre manipulation; independent editing
- DEVELOPING (NCEA Level 1 skills): Formal literary essay structure (thesis + close textual evidence + analysis + evaluation); analysing language features and their effects in detail (connotation, diction, tone, syntax, form, structure); evaluating texts in context (cultural, social, historical context; author purpose and perspective); writing for specific purposes in formal contexts (essay, report, speech, formal letter); reading visual and multimodal texts (film techniques — close-up, wide shot, soundtrack, editing; graphic texts); comparing two or more texts on a related theme or by the same author
- ADVANCED (NCEA Level 2 skills): Sustained critical argument about authorial intent and literary merit; intertextuality; sophisticated stylistic analysis; original creative writing with authorial commentary`
    }
    if (nzcLevel.includes('Level 7') || nzcLevel.includes('NCEA Level 2') || nzcLevel.includes('Year 12')) {
      return `NCEA ENGLISH LEVEL 2 (Year 12) CALIBRATION:
- FOUNDATION (NCEA Level 1 skills): Literary essay structure; close textual analysis; evaluating texts in context; writing for specific purposes; visual text analysis; comparing texts
- DEVELOPING (NCEA Level 2 skills): Extended literary analysis (sustained critical argument over multiple paragraphs with close textual evidence; analysing how writers create meaning through language, structure, and form; examining authorial intent, literary merit, and cultural significance); creative writing (crafting extended narratives, poetry, or scripts with stylistic intentionality and craft commentary); language study in depth (registers and discourse; analysing spoken language; stylistics; sociolinguistics concepts); film and media studies (mise-en-scène, cinematography, editing, sound; genre conventions; representation and ideology; intertextuality); comparing texts across time periods, cultures, or media types
- ADVANCED (NCEA Level 3 skills): Evaluation of literary theory and critical perspectives; nuanced authorial commentary on own writing; sustained comparison of complex texts; independent research on literary context`
    }
    if (nzcLevel.includes('Level 8') || nzcLevel.includes('NCEA Level 3') || nzcLevel.includes('Year 13')) {
      return `NCEA ENGLISH LEVEL 3 (Year 13) CALIBRATION:
- FOUNDATION (NCEA Level 2 skills): Extended literary analysis; creative writing with commentary; language study; film analysis; comparing texts across time/media
- DEVELOPING (NCEA Level 3 skills): Literary criticism applying critical theory (feminist reading, Marxist criticism, postcolonial theory, psychoanalytic reading, reader-response theory — understanding and applying these lenses); independent wide reading and synthesis (connecting ideas across multiple literary texts and contexts; identifying themes across a body of work); complex essay writing (nuanced thesis, sustained argument, evaluation of multiple critical perspectives, sophisticated textual evidence); language and power (how language constructs identity and ideology; discourse analysis; representation in media; propaganda techniques); original writing at a sophisticated level (stylistic awareness; voice; form experiments; authorial commentary explaining choices in terms of effect on reader)
- ADVANCED (university skills): Academic literary essay conventions; postmodern textuality; critical discourse analysis; creative writing portfolio`
    }
    return `Use appropriate NZC English content for ${nzcLevel}.`
  }

  // General Science (Year 1-10 only — Biology, Chemistry, Physics handled separately below)
  if (s.includes('science') && s !== 'biology' && s !== 'chemistry' && s !== 'physics') {
    if (nzcLevel.startsWith('NZC Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC SCIENCE LEVEL 2 CALIBRATION:
- FOUNDATION (Year 1-2 skills): Basic needs of living things (food, water, light, shelter); simple push/pull forces from everyday life; observable weather; floating and sinking; day/night cycle observation
- DEVELOPING (Year 3-4 skills): Life cycles of diverse animals (butterfly, frog, bird, mammal); plant growth conditions (light, water, warmth, nutrients); how physical features and behaviours help organisms survive (basic adaptation); properties of common materials (hard/soft, waterproof, transparent); push/pull forces and how they change motion, speed, direction; states of matter (solid, liquid, gas) and simple changes (melting, freezing, evaporation); Earth's resources (water cycle, soil, rocks); basic scientific method (predict, observe, record); food chains (producer → consumer)
- ADVANCED (Year 5-6 skills): Ecosystems and interdependence; food webs; fair testing with controlled variables; classification of living organisms; water cycle in detail; solar system; concept of energy transfer`
    }
    if (nzcLevel.startsWith('NZC Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC SCIENCE LEVEL 3 CALIBRATION:
- FOUNDATION (Year 3-4 skills): Life cycles; basic adaptation; push/pull forces; states of matter; food chains; properties of materials; simple scientific method
- DEVELOPING (Year 5-6 skills): Life processes common to all living things (respiration, reproduction, growth, nutrition); ecosystems and food webs; water cycle; classification of living things; Earth's layers; solar system; properties of light and sound; series and parallel circuits; fair testing (controlling variables, identifying IV/DV); forming evidence-based explanations
- ADVANCED (Year 7-8 skills): Basic cell structure (nucleus, cell membrane, chloroplast, mitochondria); particle theory of matter; basic genetics (variation and inherited traits); balanced/unbalanced forces; energy transfer and transformation; designing multi-variable investigations`
    }
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC SCIENCE LEVEL 4 CALIBRATION:
- FOUNDATION (Year 5-6 skills): Ecosystems and food webs; classification; Earth's layers; basic circuits; fair testing with IV/DV/controlled variables
- DEVELOPING (Year 7-8 skills): Cell biology (plant vs animal cell structure, function of organelles); photosynthesis and cellular respiration equations; basic genetics (Mendelian inheritance, dominant/recessive alleles, Punnett squares); Newton's three laws of motion; wave properties (frequency, amplitude, wavelength); acid/base reactions; particle theory and physical vs chemical change; ecological relationships (competition, predation, symbiosis); rock cycle and plate tectonics
- ADVANCED (Year 9-10 skills): DNA structure and gene expression; evolution by natural selection; Newton's law of gravitation; Ohm's law and circuit calculations; stoichiometry; atomic structure and periodic table trends`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC SCIENCE LEVEL 5 (Year 9-10) CALIBRATION:
- FOUNDATION (Year 7-8 skills): Cell structure; photosynthesis/respiration; Mendelian genetics; Newton's laws; wave properties; acid/base; particle theory; plate tectonics
- DEVELOPING (Year 9-10 skills): DNA structure (double helix, base pairing, replication); gene expression (transcription and translation in outline); evolution by natural selection with evidence; Newton's law of gravitation and orbital motion; electromagnetic spectrum; Ohm's law (V=IR) and power calculations; atomic structure (protons, neutrons, electrons, electron shells); periodic table trends; types of chemical reactions (synthesis, decomposition, combustion, neutralisation); stoichiometry (balancing equations, mole concept)
- ADVANCED (NCEA Level 1 skills): Cell biology (mitosis/meiosis); genetics (codominance, incomplete dominance); mechanics (work, energy, power); waves (interference, diffraction); organic chemistry (hydrocarbons)`
    }
    return `Use appropriate NZC Science content for ${nzcLevel}, covering Living World, Physical World, Material World, and Planet Earth and Beyond strands.`
  }

  // Biology (separate subject for senior students, NZC Level 4+)
  if (s === 'biology') {
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC BIOLOGY LEVEL 4 CALIBRATION (Living World strand):
- FOUNDATION (Year 5-6 skills): Life processes common to all living things; ecosystems and food webs; classification of living things; plant/animal cell comparison
- DEVELOPING (Year 7-8 skills): Cell structure and organelle functions (nucleus, mitochondria, chloroplast, cell membrane, vacuole); photosynthesis (word equation, inputs/outputs, role of chlorophyll); cellular respiration (word equation, aerobic vs anaerobic); Mendelian inheritance (dominant/recessive, Punnett squares, phenotype vs genotype); ecological relationships (predation, competition, mutualism, parasitism); adaptation — structural/behavioural/physiological features for survival
- ADVANCED (Year 9-10 skills): DNA structure, replication, and protein synthesis; evolution by natural selection; mitosis and cell cycle; biodiversity and classification (domains, kingdoms, phyla)`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC BIOLOGY LEVEL 5 (Year 9-10) CALIBRATION:
- FOUNDATION (Year 7-8 skills): Cell organelles; photosynthesis/respiration word equations; Mendelian genetics; ecological relationships; adaptation
- DEVELOPING (Year 9-10 skills): DNA structure (double helix, antiparallel strands, base pairing A-T, G-C); semi-conservative replication; transcription and translation (mRNA, codons, amino acids); mitosis (PMAT stages and outcome); evolution by natural selection (variation, heritability, selective pressure, differential survival); evidence for evolution (fossil record, homologous structures, DNA comparisons); classification (domains, kingdoms, phyla); nitrogen cycle; enzyme action (lock and key model, enzyme-substrate complex, effect of pH and temperature)
- ADVANCED (NCEA Level 1 skills): Meiosis; genetic variation (crossing over, independent assortment); population ecology (logistic growth, carrying capacity); speciation`
    }
    if (nzcLevel.includes('Level 6') || nzcLevel.includes('NCEA Level 1') || nzcLevel.includes('Year 11')) {
      return `NCEA BIOLOGY LEVEL 1 (Year 11) CALIBRATION:
- FOUNDATION (Year 9-10 skills): DNA structure and replication; transcription and translation; mitosis; natural selection; classification; enzyme action
- DEVELOPING (NCEA Level 1 skills): Life processes of plants (photosynthesis in detail — light-dependent and light-independent reactions at outline level; transpiration, translocation); life processes of animals (nutrition, digestion, gas exchange, circulation); genetic inheritance patterns (including codominance, sex-linkage, incomplete dominance); ecological investigation methods (quadrats, transects); identifying controlled/independent/dependent variables; interpreting biological data
- ADVANCED (NCEA Level 2 skills): Cell biology (organelle ultrastructure; DNA structure and function at molecular level); genetics (molecular basis of gene expression); population ecology`
    }
    if (nzcLevel.includes('Level 7') || nzcLevel.includes('NCEA Level 2') || nzcLevel.includes('Year 12')) {
      return `NCEA BIOLOGY LEVEL 2 (Year 12) CALIBRATION:
- FOUNDATION (NCEA Level 1 skills): Photosynthesis/respiration; inheritance patterns; ecological investigation; life processes of plants/animals
- DEVELOPING (NCEA Level 2 skills): Cellular biology in depth (organelles at ultrastructure level, cell membranes — fluid mosaic model, active/passive transport, osmosis); cellular respiration (glycolysis, Krebs cycle, electron transport chain in outline); molecular genetics (DNA replication, transcription, translation, mutations, gene regulation); plant adaptation to environment; animal physiology (thermoregulation, osmoregulation, gas exchange in mammals, fish, insects); gene mutation and evolution; population genetics (Hardy-Weinberg)
- ADVANCED (NCEA Level 3 skills): Human evolution; homeostasis mechanisms; genetic engineering applications; ecological modelling`
    }
    if (nzcLevel.includes('Level 8') || nzcLevel.includes('NCEA Level 3') || nzcLevel.includes('Year 13')) {
      return `NCEA BIOLOGY LEVEL 3 (Year 13) CALIBRATION:
- FOUNDATION (NCEA Level 2 skills): Cell membranes and transport; cellular respiration (glycolysis, Krebs cycle); molecular genetics; animal physiology (thermoregulation, osmoregulation); population genetics (Hardy-Weinberg)
- DEVELOPING (NCEA Level 3 skills): Human evolution (hominid lineage, comparative anatomy, DNA evidence; cultural vs biological evolution); homeostasis in depth (negative feedback — blood glucose regulation by insulin/glucagon; thermoregulation mechanisms; blood pressure regulation); genetic engineering and biotechnology (recombinant DNA, PCR, gel electrophoresis, CRISPR concept; ethical implications); ecology and ecosystems (energy flow through trophic levels, pyramid of energy; biogeochemical cycles — nitrogen cycle, carbon cycle; population dynamics — logistic growth, carrying capacity; succession); speciation (allopatric vs sympatric; reproductive isolation; evidence from Darwin's finches and other examples)
- ADVANCED (university/scholarship skills): Complex metabolic pathways; gene expression regulation (lac operon, operons concept); evolutionary mechanisms (genetic drift, bottleneck, founder effect); applied immunology`
    }
    return `Use appropriate NZC/NCEA Biology content for ${nzcLevel}, covering cell biology, genetics, ecology, and evolution.`
  }

  // Physics (separate subject for senior students, NZC Level 4+)
  if (s === 'physics') {
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC PHYSICS LEVEL 4 CALIBRATION (Physical World strand):
- FOUNDATION (Year 5-6 skills): Push/pull forces change motion; properties of light and sound; simple circuits; energy as a concept
- DEVELOPING (Year 7-8 skills): Newton's three laws of motion (inertia, F=ma, action/reaction); wave properties (frequency, wavelength, amplitude, speed; longitudinal vs transverse); reflection and refraction of light; series and parallel circuits (current, voltage); work = force × distance; energy transformations (kinetic, potential, thermal, electrical); levers, pulleys, and simple machines; magnets and magnetic fields
- ADVANCED (Year 9-10 skills): Kinematics (speed, velocity, acceleration, distance-time and velocity-time graphs); Ohm's law V=IR; power P=IV; gravitational potential energy; electromagnetic induction (generators and transformers concept)`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC PHYSICS LEVEL 5 (Year 9-10) CALIBRATION:
- FOUNDATION (Year 7-8 skills): Newton's three laws; wave properties; circuits; energy transformations; work = force × distance
- DEVELOPING (Year 9-10 skills): Kinematics (speed, velocity, acceleration; d-t and v-t graphs; equations of motion); Ohm's law (V = IR) and circuit calculations; power (P = IV = I²R); energy calculations (Ek = ½mv², Ep = mgh); gravitational potential and kinetic energy conservation; wave behaviour (reflection, refraction, diffraction, interference); electromagnetic spectrum (types and uses); basic nuclear physics (radioactive decay, half-life); pressure (P = F/A)
- ADVANCED (NCEA Level 1 skills): Newton's law of universal gravitation; electric field concept; electromagnetic induction; AC vs DC; nuclear fission/fusion`
    }
    if (nzcLevel.includes('Level 6') || nzcLevel.includes('NCEA Level 1') || nzcLevel.includes('Year 11')) {
      return `NCEA PHYSICS LEVEL 1 (Year 11) CALIBRATION:
- FOUNDATION (Year 9-10 skills): Kinematics; Ohm's law and circuit calculations; energy conservation; wave behaviour; electromagnetic spectrum; nuclear decay
- DEVELOPING (NCEA Level 1 skills): Waves in depth (wave speed = frequency × wavelength; standing waves; resonance; sound intensity); nuclear physics (radioactive decay types — alpha, beta, gamma; half-life calculations; fission and fusion); mechanics (Newton's laws applied to multi-body systems; momentum = mv; impulse; static equilibrium); electrical systems (resistors in series/parallel; power calculations; charging and discharging capacitors at outline level)
- ADVANCED (NCEA Level 2 skills): Circular motion; projectile motion; rotational mechanics (torque); electromagnetism (Faraday's law)`
    }
    if (nzcLevel.includes('Level 7') || nzcLevel.includes('NCEA Level 2') || nzcLevel.includes('Year 12')) {
      return `NCEA PHYSICS LEVEL 2 (Year 12) CALIBRATION:
- FOUNDATION (NCEA Level 1 skills): Wave properties and calculations; nuclear physics; Newton's laws; momentum; series/parallel circuits
- DEVELOPING (NCEA Level 2 skills): Mechanics in depth (circular motion — centripetal force F=mv²/r; projectile motion; angular momentum; torque and rotational equilibrium); electromagnetism (Faraday's law of induction; transformers; DC generator and motor; magnetic force on current-carrying conductor F=BIL); atomic and nuclear physics (Rutherford model; photoelectric effect; energy levels and emission spectra; E=hf; binding energy and mass-energy equivalence E=mc²); electricity (capacitance; RC circuits; internal resistance)
- ADVANCED (NCEA Level 3 skills): Mechanical systems (SHM, resonance); electrical systems (AC circuits, impedance); modern physics (special relativity concepts)`
    }
    if (nzcLevel.includes('Level 8') || nzcLevel.includes('NCEA Level 3') || nzcLevel.includes('Year 13')) {
      return `NCEA PHYSICS LEVEL 3 (Year 13) CALIBRATION:
- FOUNDATION (NCEA Level 2 skills): Circular motion; projectile motion; Faraday's law; photoelectric effect; E=hf; capacitance; torque
- DEVELOPING (NCEA Level 3 skills): Mechanical systems (simple harmonic motion — period, frequency, displacement equations; resonance; damping; rotational motion with moment of inertia I=mr²; angular velocity ω; L=Iω); AC electricity (RMS values; frequency; phasors; inductive and capacitive reactance XL=2πfL, XC=1/2πfC; impedance and resonance in LCR circuits); wave systems (standing waves with open/closed pipe and string conditions; diffraction and interference; double-slit and single-slit experiments; diffraction gratings d sinθ=mλ); modern physics (special relativity — time dilation, length contraction, E=mc²; photoelectric effect; atomic spectra; nuclear reactions; particle physics — quarks, leptons at conceptual level)
- ADVANCED (scholarship/university skills): Lagrangian mechanics; quantum wave functions; general relativity concepts`
    }
    return `Use appropriate NZC/NCEA Physics content for ${nzcLevel}, covering mechanics, waves, electricity, and modern physics.`
  }

  // Chemistry (separate subject for senior students, NZC Level 4+)
  if (s === 'chemistry') {
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC CHEMISTRY LEVEL 4 CALIBRATION (Material World strand):
- FOUNDATION (Year 5-6 skills): States of matter (solid/liquid/gas) and phase changes; properties of common materials; mixtures vs pure substances
- DEVELOPING (Year 7-8 skills): Particle theory of matter (solids, liquids, gases in terms of particle arrangement and movement); physical vs chemical change (examples and evidence); properties of acids and bases (litmus, pH scale, indicators); neutralisation (acid + base → salt + water); combustion (fuel + oxygen → CO₂ + H₂O); metals and non-metals; solutions and solubility; separating mixtures (filtration, evaporation, distillation, chromatography)
- ADVANCED (Year 9-10 skills): Atomic structure (protons, neutrons, electrons, electron shells, atomic number, mass number); periodic table (periods, groups, trends); ionic and covalent bonding; chemical formulae and simple equations`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC CHEMISTRY LEVEL 5 (Year 9-10) CALIBRATION:
- FOUNDATION (Year 7-8 skills): Particle theory; physical vs chemical changes; acids/bases/neutralisation; combustion; separating mixtures
- DEVELOPING (Year 9-10 skills): Atomic structure (proton, neutron, electron; atomic number, mass number; isotopes; electron shell configurations for first 20 elements); periodic table (periods and groups; metals/metalloids/non-metals; reactivity trends; properties of groups 1, 7, 0/18); chemical bonding (ionic bonding — transfer of electrons, formation of ions, lattice structure; covalent bonding — sharing electrons, molecular vs network structures); writing and balancing chemical equations; types of reactions (synthesis, decomposition, displacement, combustion, precipitation); acids and bases (strong vs weak, pH, titration concept)
- ADVANCED (NCEA Level 1 skills): Mole concept and stoichiometry; limiting reactants; electrochemistry (oxidation/reduction); organic chemistry basics (hydrocarbons, functional groups)`
    }
    if (nzcLevel.includes('Level 6') || nzcLevel.includes('NCEA Level 1') || nzcLevel.includes('Year 11')) {
      return `NCEA CHEMISTRY LEVEL 1 (Year 11) CALIBRATION:
- FOUNDATION (Year 9-10 skills): Atomic structure; periodic table trends; ionic and covalent bonding; balancing equations; types of reactions; acids and bases
- DEVELOPING (NCEA Level 1 skills): Acids and bases in depth (Brønsted-Lowry model; conjugate acid-base pairs; Ka, Kb concept; buffer solutions at outline level; titration calculations); quantitative chemistry (mole calculations; concentration = moles/volume; stoichiometry with molar masses); redox reactions (oxidation states, oxidising/reducing agents, half-equations); electrochemistry (electrolytic cells; galvanic cells; standard electrode potentials)
- ADVANCED (NCEA Level 2 skills): Organic chemistry (naming and reactions of alkanes, alkenes, alcohols, carboxylic acids, esters); thermochemistry (enthalpy, Hess's law); chemical equilibrium (Le Chatelier's principle)`
    }
    if (nzcLevel.includes('Level 7') || nzcLevel.includes('NCEA Level 2') || nzcLevel.includes('Year 12')) {
      return `NCEA CHEMISTRY LEVEL 2 (Year 12) CALIBRATION:
- FOUNDATION (NCEA Level 1 skills): Acids/bases; mole calculations; redox; electrochemistry
- DEVELOPING (NCEA Level 2 skills): Organic chemistry (structure and naming of alkanes, alkenes, alkynes, alcohols, aldehydes, ketones, carboxylic acids, esters, amines; reactions including addition, substitution, oxidation, esterification; structural and optical isomerism); thermochemistry (enthalpy changes, Hess's law, bond enthalpies; standard enthalpy of formation); chemical equilibrium (equilibrium expression Kc; Le Chatelier's principle; effect of temperature, pressure, concentration); bonding and structure in depth (VSEPR, polarity, intermolecular forces)
- ADVANCED (NCEA Level 3 skills): Spectroscopy (IR, mass spec, NMR interpretation); kinetics (rate laws, Arrhenius equation); nuclear chemistry`
    }
    if (nzcLevel.includes('Level 8') || nzcLevel.includes('NCEA Level 3') || nzcLevel.includes('Year 13')) {
      return `NCEA CHEMISTRY LEVEL 3 (Year 13) CALIBRATION:
- FOUNDATION (NCEA Level 2 skills): Organic chemistry reactions; thermochemistry and Hess's law; equilibrium (Kc and Le Chatelier); VSEPR; structural isomerism
- DEVELOPING (NCEA Level 3 skills): Spectroscopy (IR spectroscopy — identifying functional groups from absorption peaks; mass spectrometry — molecular ion peak, fragmentation pattern, M/Z ratios; NMR — chemical shift, splitting patterns at conceptual level); chemical kinetics (rate = k[A]^m[B]^n; first-order and second-order rate equations; half-life; Arrhenius equation k=Ae^(-Ea/RT); effect of temperature and catalysts on rate); organic synthesis (multi-step synthesis planning; identifying reagents for functional group interconversion; stereochemistry — chirality, enantiomers, R/S notation); thermodynamics (Gibbs free energy ΔG=ΔH-TΔS; spontaneity; entropy; relationship between ΔG° and equilibrium constant); electrochemistry (standard cell potential; Nernst equation; electrolysis quantitative calculations using Faraday's law)
- ADVANCED (scholarship/university skills): Molecular orbital theory; reaction mechanisms (SN1, SN2, E1, E2, catalytic cycles); advanced NMR interpretation`
    }
    return `Use appropriate NZC/NCEA Chemistry content for ${nzcLevel}, covering atomic structure, bonding, reactions, and quantitative chemistry.`
  }

  // History (NZC Social Sciences — Continuity and Change strand)
  if (s === 'history') {
    if (nzcLevel.startsWith('NZC Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC HISTORY LEVEL 2 CALIBRATION (Year 3-4):
- FOUNDATION (Year 1-2 skills): Family history; recognising old vs new objects; sequencing events (before/after/then); simple timelines
- DEVELOPING (Year 3-4 skills): How and why things change over time in a community (technology, transport, buildings); how people in the past lived differently; significant events and people in local/NZ history; simple cause-and-effect (why did this change happen?); using photographs, artefacts, and oral histories as evidence; the role of Māori and settlers in early NZ history at a simple level; Treaty of Waitangi — who signed it and why (at a basic level)
- ADVANCED (Year 5-6 skills): Colonisation of NZ and its impacts; why NZ became a British colony; significant NZ historical events (gold rush, early Parliament); comparing different perspectives on historical events`
    }
    if (nzcLevel.startsWith('NZC Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC HISTORY LEVEL 3 CALIBRATION (Year 5-6):
- FOUNDATION (Year 3-4 skills): Local/community historical changes; basic cause-and-effect; Treaty of Waitangi basics; using historical evidence
- DEVELOPING (Year 5-6 skills): Colonisation of NZ — timeline, key events, causes and consequences for Māori and Pākehā; Treaty of Waitangi — key principles, significance, breaches and renegotiation; significant events in NZ history (NZ Wars, women's suffrage 1893, Gold Rush, early immigration); historical perspectives — understanding that people in the past had different viewpoints; use of primary and secondary sources; migration stories to NZ (European, Pacific, Chinese); World Wars — NZ's participation and impact at home
- ADVANCED (Year 7-8 skills): NZ Wars in depth; causes of WWI; impacts of the Great Depression on NZ; how historical narratives can be contested`
    }
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC HISTORY LEVEL 4 CALIBRATION (Year 7-8):
- FOUNDATION (Year 5-6 skills): NZ colonisation; Treaty of Waitangi; NZ women's suffrage; WWI NZ involvement; primary vs secondary sources
- DEVELOPING (Year 7-8 skills): NZ Wars — causes, key events (Gate Pā, Ōrākau), land confiscations (raupatu), impacts; Treaty of Waitangi — principles (partnership, participation, protection), Treaty settlements; WWI causes (MAIN — militarism, alliances, imperialism, nationalism) and NZ's role (Gallipoli, Western Front); WWII — causes (rise of fascism, appeasement), key events, NZ's home front and overseas contribution; the Great Depression and its impact; how historians use evidence to construct arguments; multiple perspectives on events
- ADVANCED (Year 9-10 skills): Cold War origins and key events; decolonisation movements; Holocaust — causes, events, consequences; NZ's role in the Pacific`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC HISTORY LEVEL 5 (Year 9-10) CALIBRATION:
- FOUNDATION (Year 7-8 skills): NZ Wars; WWI causes; WWII overview; Treaty of Waitangi; historical source analysis
- DEVELOPING (Year 9-10 skills): WWI in depth (causes — assassination of Franz Ferdinand, system of alliances; trench warfare; key battles; armistice; Treaty of Versailles and its consequences); WWII in depth (rise of Hitler and Nazi Germany; Holocaust; Pacific War; atomic bomb; post-war order); Cold War (origins, key events — Berlin Wall, Cuban Missile Crisis, Korean War, Vietnam War; nuclear arms race; détente and collapse of Soviet Union); decolonisation (independence movements in Africa and Asia; methods — peaceful and armed struggle); NZ in the 20th century (nuclear-free policy, Springbok Tour, Māori renaissance, Treaty settlements)
- ADVANCED (NCEA Level 1 skills): Writing analytical historical essays; evaluating the reliability and usefulness of historical sources; causation and consequence at a conceptual level`
    }
    if (nzcLevel.includes('Level 6') || nzcLevel.includes('NCEA Level 1') || nzcLevel.includes('Year 11')) {
      return `NCEA HISTORY LEVEL 1 (Year 11) CALIBRATION:
- FOUNDATION (Year 9-10 skills): WWI causes and key events; WWII overview; Cold War basics; NZ in the 20th century; historical source analysis; causation and consequence
- DEVELOPING (NCEA Level 1 skills): Historical essay writing (structured argument with introduction, body paragraphs using PEEL, conclusion); evaluating historical sources (reliability, usefulness, bias, purpose, perspective); causation in depth (short-term triggers vs long-term underlying causes; multiple causation); NZ history focus topics (Treaty settlements and modern NZ; the Springbok Tour and social division; anti-nuclear policy; Māori renaissance); world history topics (apartheid in South Africa; decolonisation in Africa and Asia; Cuban Missile Crisis; Vietnam War); significance (why certain events matter); change and continuity (what changed, what stayed the same, and why)
- ADVANCED (NCEA Level 2 skills): Contested history (historiography — how interpretations change over time; why historians disagree; using historians' views as evidence); complex multi-causal analysis; historical parallels and comparisons`
    }
    if (nzcLevel.includes('Level 7') || nzcLevel.includes('NCEA Level 2') || nzcLevel.includes('Year 12')) {
      return `NCEA HISTORY LEVEL 2 (Year 12) CALIBRATION:
- FOUNDATION (NCEA Level 1 skills): Historical essay structure; source evaluation; causation; NZ 20th century history; Cold War; decolonisation; significance; change/continuity
- DEVELOPING (NCEA Level 2 skills): Historiography (how and why historical interpretations change; competing narratives; using historians as sources); causation with historiographical context; in-depth study of a significant historical event (e.g. the Holocaust — causes, events, consequences, historiographical debates including functionalism vs intentionalism; OR WWII in the Pacific — Pearl Harbor, Hiroshima, Japanese imperialism; OR the Russian Revolution); examining perspectives of different groups (colonisers/colonised, victors/defeated, majority/minority); evaluating long-term consequences of historical events; writing extended essays with nuanced argument
- ADVANCED (NCEA Level 3 skills): Complex historiographical debate; analysing primary sources from multiple periods; evaluating contradictory historical accounts; research skills`
    }
    if (nzcLevel.includes('Level 8') || nzcLevel.includes('NCEA Level 3') || nzcLevel.includes('Year 13')) {
      return `NCEA HISTORY LEVEL 3 (Year 13) CALIBRATION:
- FOUNDATION (NCEA Level 2 skills): Historiography; extended essay writing; in-depth event study; multiple historical perspectives; evaluating historical consequences
- DEVELOPING (NCEA Level 3 skills): Complex historiographical analysis (identifying and evaluating major historiographical schools on a topic; e.g. orthodox vs revisionist vs post-revisionist Cold War historians; structuralist vs intentionalist on the Holocaust); research skills (identifying, locating, and evaluating primary sources; annotated bibliography; historical methodology); examining the role of individuals vs structural forces in history; historical inquiry project (thesis-driven; evidence from multiple perspectives; sustained argumentation); historical comparisons (comparing similar events in different contexts — e.g. genocides, revolutions, independence movements); ethical dimensions of history (memory, trauma, reconciliation, reparations)
- ADVANCED (university skills): Archival research methods; historiographical meta-analysis; oral history methodology; post-colonial historical theory`
    }
    return `Use appropriate NZC/NCEA History content for ${nzcLevel}, focusing on NZ and world history, historical thinking, and source analysis.`
  }

  // Geography (NZC Social Sciences — Place and Environment strand)
  if (s === 'geography') {
    if (nzcLevel.startsWith('NZC Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC GEOGRAPHY LEVEL 2 CALIBRATION (Year 3-4):
- FOUNDATION (Year 1-2 skills): Immediate local environment; directions (north/south/east/west); simple maps of classroom or school
- DEVELOPING (Year 3-4 skills): Reading and making simple maps (key/legend, compass rose, scale concept); how people use their local environment; weather patterns and seasons; how the environment affects how people live; basic landforms (mountain, river, coast, plain, hill, valley); how people change the environment (farming, building, deforestation); NZ's location in the Pacific; difference between a town, city, region, and country
- ADVANCED (Year 5-6 skills): NZ's physical regions; how rivers and coasts are shaped; comparing NZ environments to those of other countries; basic economic geography (primary/secondary/tertiary industries)`
    }
    if (nzcLevel.startsWith('NZC Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC GEOGRAPHY LEVEL 3 CALIBRATION (Year 5-6):
- FOUNDATION (Year 3-4 skills): Map reading (legend, scale, compass); landforms; how people change environments; NZ's Pacific location
- DEVELOPING (Year 5-6 skills): NZ's physical geography — landforms, major rivers, mountains, volcanic plateau, Southern Alps; how volcanic and tectonic activity shapes NZ (Ring of Fire, plate tectonics at basic level); NZ climate zones and how they vary; natural disasters in NZ (earthquakes, volcanoes, tsunamis, floods) and how people respond; comparing NZ environments to Pacific Island nations; primary, secondary, and tertiary industries in NZ; how migration shapes communities; sustainability — how people affect and protect environments
- ADVANCED (Year 7-8 skills): Plate tectonics in depth; urbanisation and its effects; globalisation and trade; climate change causes and effects`
    }
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC GEOGRAPHY LEVEL 4 CALIBRATION (Year 7-8):
- FOUNDATION (Year 5-6 skills): NZ physical geography; plate tectonics basics; natural disasters; NZ climate; sustainability
- DEVELOPING (Year 7-8 skills): Plate tectonics in depth (convergent, divergent, transform boundaries; subduction; formation of mountains, volcanoes, trenches); geomorphic processes (weathering — physical/chemical/biological; erosion and deposition; river processes — erosion, transport, deposition, features like meanders, deltas); urbanisation (growth of cities, urban vs rural, urban issues such as traffic, housing, pollution); climate change (greenhouse effect, causes, evidence, consequences for NZ and Pacific); globalisation (trade, supply chains, TNC, impacts on developing countries); geographic skills (topographic maps, grid references, cross-sections, GIS concept)
- ADVANCED (Year 9-10 skills): Hydrological cycle in detail; population dynamics (birth/death rates, demographic transition model); economic development (HDI, sustainable development goals)`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC GEOGRAPHY LEVEL 5 (Year 9-10) CALIBRATION:
- FOUNDATION (Year 7-8 skills): Plate tectonics; geomorphic processes; urbanisation; climate change causes; globalisation; topographic maps
- DEVELOPING (Year 9-10 skills): Population geography (population pyramids; birth/death/natural increase rates; demographic transition model — 4 stages; push and pull factors; migration flows); economic development (GDP vs GNI vs HDI; development gap; fair trade and ethical consumption; role of TNCs in developing world); hydrological cycle in detail (infiltration, surface runoff, water table, drainage basins); coastal processes (erosion types — hydraulic action, corrasion, attrition; coastal landforms — cliffs, wave-cut platforms, headlands, bays, spits, tombolos; coastal management strategies); geographic inquiry (developing research questions, collecting and presenting data, evaluating sources)
- ADVANCED (NCEA Level 1 skills): Statistical analysis of geographic data; geographic concepts (place, space, environment, interconnection, sustainability, scale); applying geographic concepts to case studies`
    }
    if (nzcLevel.includes('Level 6') || nzcLevel.includes('NCEA Level 1') || nzcLevel.includes('Year 11')) {
      return `NCEA GEOGRAPHY LEVEL 1 (Year 11) CALIBRATION:
- FOUNDATION (Year 9-10 skills): Population geography; economic development (HDI); coastal processes; hydrological cycle; geographic inquiry
- DEVELOPING (NCEA Level 1 skills): Geographic concepts applied in depth (place — how place shapes identity; space — relative vs absolute location, distance decay; environment — natural and built environment interaction; interconnection — how events in one place affect others; sustainability — meeting present needs without compromising future; scale — local to global); natural hazards and their management (earthquake, volcano, tsunami, flood, cyclone — causes, patterns, impacts, responses, management strategies — GeoSmart concept); geographic skills (topographic and thematic map analysis; satellite imagery; GIS; statistical analysis — scatter graphs, Lorenz curves; geographic fieldwork)
- ADVANCED (NCEA Level 2 skills): Urban geography in depth; glacial and fluvial geomorphology; global environmental issues; development gap and interventions`
    }
    if (nzcLevel.includes('Level 7') || nzcLevel.includes('NCEA Level 2') || nzcLevel.includes('Year 12')) {
      return `NCEA GEOGRAPHY LEVEL 2 (Year 12) CALIBRATION:
- FOUNDATION (NCEA Level 1 skills): Geographic concepts; natural hazards; topographic map skills; GIS; population geography; economic development
- DEVELOPING (NCEA Level 2 skills): Urban geography (urbanisation trends globally; urban structure models — Burgess concentric zone, Hoyt sector, multiple nuclei; urban issues — traffic congestion, urban heat island, housing, crime; gentrification; suburbanisation and counter-urbanisation; sustainable urban planning — smart growth, transit-oriented development); geomorphology (glacial processes — erosion by abrasion and plucking; glacial landforms — cirques, arêtes, U-valleys, moraines, drumlins; river processes in depth — hydraulic radius, Manning equation concept, hydrographs; coastal landforms and management); climate change (causes, evidence, consequences for different regions; mitigation vs adaptation strategies; IPCC reports; climate justice); global development (causes of development gap; fair trade; debt relief; foreign aid; MDGs/SDGs; role of TNCs and FDI; case studies from Africa, Asia, Pacific)
- ADVANCED (NCEA Level 3 skills): Geographic research methodology; complex spatial analysis; resource management debates; political geography`
    }
    return `Use appropriate NZC/NCEA Geography content for ${nzcLevel}, covering physical and human geography, geographic processes, and geographic skills.`
  }

  // Economics (NZC Social Sciences — The Economic World strand)
  if (s === 'economics') {
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC ECONOMICS LEVEL 4 CALIBRATION (Year 7-8):
- FOUNDATION (Year 5-6 skills): Needs vs wants; producers and consumers; goods and services; money and exchange; simple budgeting
- DEVELOPING (Year 7-8 skills): Scarcity — unlimited wants vs limited resources; opportunity cost — the next best alternative foregone; economic decision-making (individuals, businesses, government); specialisation and trade; market — buyers and sellers; price as a signal; types of businesses (sole trader, partnership, company); role of banks and money; NZ's main trading partners and exports (dairy, meat, tourism, tech); government revenue (taxes) and spending (public services); economic roles (producer/consumer/government)
- ADVANCED (Year 9-10 skills): Supply and demand — the law of demand/supply; market equilibrium; price mechanism; elasticity concept; inflation and its effects; unemployment`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC ECONOMICS LEVEL 5 (Year 9-10) CALIBRATION:
- FOUNDATION (Year 7-8 skills): Scarcity; opportunity cost; market and price; specialisation; NZ trading partners; government role in economy
- DEVELOPING (Year 9-10 skills): Supply and demand (law of demand — inverse relationship; law of supply — direct relationship; shift factors for both supply and demand; market equilibrium — where supply meets demand; surplus and shortage; how markets clear); price elasticity of demand (elastic vs inelastic; calculating PED; factors affecting PED); market structures (perfect competition, monopoly, oligopoly — characteristics); macroeconomics (GDP — what it measures; inflation — causes, CPI, effects; unemployment — types and rates; business cycle — expansion, peak, contraction, trough); government economic policies (fiscal policy — taxes and spending; monetary policy — interest rates); international trade (comparative advantage; free trade vs protectionism; NZ's current account)
- ADVANCED (NCEA Level 1 skills): Welfare analysis (consumer and producer surplus); market failure (externalities, public goods); evaluating government intervention`
    }
    if (nzcLevel.includes('Level 6') || nzcLevel.includes('NCEA Level 1') || nzcLevel.includes('Year 11')) {
      return `NCEA ECONOMICS LEVEL 1 (Year 11) CALIBRATION:
- FOUNDATION (Year 9-10 skills): Supply and demand; price elasticity; macroeconomic indicators; government fiscal and monetary policy; international trade
- DEVELOPING (NCEA Level 1 skills): Microeconomics in depth (supply and demand analysis — shifts and movements along curves; consumer and producer surplus; price floors and ceilings and their effects; elasticity — price, income, cross-elasticity; market structures — profit maximisation, barriers to entry); macroeconomics (aggregate demand and supply; economic growth and its measurement; inflation — demand-pull vs cost-push, consequences; unemployment — cyclical, structural, frictional; balance of payments); New Zealand economic context (role of RBNZ; exchange rate effects on exports and imports)
- ADVANCED (NCEA Level 2 skills): Market failure in depth (externalities, merit goods, public goods, information asymmetry); evaluation of policies (cost-benefit analysis, trade-offs)`
    }
    if (nzcLevel.includes('Level 7') || nzcLevel.includes('NCEA Level 2') || nzcLevel.includes('Year 12')) {
      return `NCEA ECONOMICS LEVEL 2 (Year 12) CALIBRATION:
- FOUNDATION (NCEA Level 1 skills): Supply and demand analysis; consumer/producer surplus; elasticity; market structures; aggregate demand/supply; inflation; unemployment; NZ context
- DEVELOPING (NCEA Level 2 skills): Market failure in depth (negative and positive externalities — diagram showing social vs private cost/benefit, deadweight loss; public goods — non-excludable, non-rival; merit and demerit goods; information asymmetry; natural monopoly); government intervention (taxes and subsidies — effects on market equilibrium, incidence; price controls — price floors and ceilings with welfare analysis; regulation; nationalisation; public provision; cost-benefit analysis and limitations); trade and development (absolute vs comparative advantage; terms of trade; protectionism instruments — tariffs, quotas, subsidies; WTO; economic integration); income distribution (Gini coefficient; causes of inequality; redistributive policies — progressive taxation, welfare, minimum wage)
- ADVANCED (NCEA Level 3 skills): Behavioural economics; game theory concepts; developing-country economic growth models; advanced macroeconomic policy trade-offs`
    }
    if (nzcLevel.includes('Level 8') || nzcLevel.includes('NCEA Level 3') || nzcLevel.includes('Year 13')) {
      return `NCEA ECONOMICS LEVEL 3 (Year 13) CALIBRATION:
- FOUNDATION (NCEA Level 2 skills): Market failure; government intervention; trade and comparative advantage; income distribution; Gini coefficient; welfare analysis
- DEVELOPING (NCEA Level 3 skills): Behavioural economics (bounded rationality; heuristics and biases — anchoring, availability, representativeness, loss aversion, present bias; nudge theory; implications for policy design); macroeconomic policy in depth (Phillips curve — short-run vs long-run; NAIRU; monetary policy — inflation targeting, Taylor rule, unconventional policy; fiscal multiplier; crowding out; Ricardian equivalence); international finance (exchange rate systems — fixed, floating, managed; purchasing power parity; capital flows and financial crises; IMF and World Bank roles); economic development (Rostow's stages; import substitution vs export-led growth; dependency theory; sustainable development goals; role of institutions — property rights, rule of law); game theory (Nash equilibrium; prisoner's dilemma; applications to oligopoly, public goods, international negotiations)
- ADVANCED (university skills): General equilibrium theory; Keynesian vs monetarist debates; financial market models; econometric methods`
    }
    return `Use appropriate NZC/NCEA Economics content for ${nzcLevel}, covering microeconomics, macroeconomics, and the NZ economic context.`
  }

  // Computing / Digital Technology
  if (s.includes('computing') || s.includes('computer') || s.includes('digital tech') || s.includes('coding') || s.includes('programming')) {
    if (nzcLevel.startsWith('NZC Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC DIGITAL TECHNOLOGY LEVEL 2 CALIBRATION (Year 3-4):
- FOUNDATION (Year 1-2 skills): Using a mouse and keyboard; recognising common devices; taking photos or making simple digital art
- DEVELOPING (Year 3-4 skills): Algorithms as step-by-step instructions (recipe, directions); creating simple sequences in Scratch or similar block-based tools (move, turn, repeat, wait); understanding loops (repeat a set of instructions); debugging simple errors; binary concept — computers use 1s and 0s; input-output-process model; online safety (personal information, trusted adults, cyberbullying); creating simple digital media (presentation, document, simple animation)
- ADVANCED (Year 5-6 skills): Conditional statements (if/else); variables; more complex Scratch programs; basic binary counting (0-7 in 3 bits); data and its types (number, text, Boolean)`
    }
    if (nzcLevel.startsWith('NZC Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC DIGITAL TECHNOLOGY LEVEL 3 CALIBRATION (Year 5-6):
- FOUNDATION (Year 3-4 skills): Sequences and loops in block coding; input/output model; binary concept; online safety; digital media creation
- DEVELOPING (Year 5-6 skills): Algorithms with conditionals (if/else) and repetition (while/for loops); variables (storing and updating values); decomposition — breaking problems into smaller parts; tracing through an algorithm manually (dry run); binary numbers (converting between binary and decimal, 0-255); representing data — how text is encoded (ASCII concept); flowcharts as visual algorithm representation; creating interactive programs in Scratch (event handlers, user input); data collection and simple spreadsheet use; cybersecurity basics (strong passwords, phishing, safe browsing)
- ADVANCED (Year 7-8 skills): Introduction to text-based programming (Python basics — print, input, variables, if/else); functions as reusable procedures; basic data structures (lists); network basics (how the internet works at a conceptual level)`
    }
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC DIGITAL TECHNOLOGY LEVEL 4 CALIBRATION (Year 7-8):
- FOUNDATION (Year 5-6 skills): Conditionals; loops; variables; decomposition; binary conversion; flowcharts; Scratch programs; cybersecurity basics
- DEVELOPING (Year 7-8 skills): Python programming — variables, data types (int, float, string, bool), input/output, arithmetic operators, comparison operators, if/elif/else, while loops, for loops, lists (indexing, appending, iterating), defining and calling functions; binary and hexadecimal (converting between bases, use in computing); number representation (two's complement for negative numbers); data representation (image as pixels, ASCII/Unicode for text); networks — components (router, switch, server, client), protocols (HTTP, TCP/IP), IP addresses, DNS; cybersecurity — encryption (symmetric/asymmetric concept), HTTPS, firewalls, common attacks (SQL injection, phishing); database concepts (tables, fields, records, primary key, simple SQL SELECT)
- ADVANCED (Year 9-10 skills): Object-oriented programming concepts (classes, objects, attributes, methods); recursive algorithms; sorting algorithms (bubble sort, merge sort); 2D lists and nested loops`
    }
    if (nzcLevel.includes('Level 5') || nzcLevel.includes('Year 9') || nzcLevel.includes('Year 10')) {
      return `NZC DIGITAL TECHNOLOGY LEVEL 5 (Year 9-10) CALIBRATION:
- FOUNDATION (Year 7-8 skills): Python basics; binary/hexadecimal; data representation; network components; SQL SELECT; cybersecurity concepts
- DEVELOPING (Year 9-10 skills): Object-oriented programming (classes and objects, attributes, constructors, methods, encapsulation, inheritance); sorting and searching algorithms (bubble sort, insertion sort, selection sort, linear search, binary search — implementing and comparing efficiency); Big O notation (O(n), O(n²), O(log n)); recursive algorithms (factorial, Fibonacci, towers of Hanoi); 2D arrays and their manipulation; SQL (SELECT with WHERE, ORDER BY, GROUP BY; INSERT; UPDATE; JOIN concept); web development (HTML structure — head/body/headings/paragraphs/links/images; CSS selectors, properties — colour, font, margin, padding, flexbox basics; JavaScript variables, events, DOM manipulation); OSI and TCP/IP network models; public key encryption; hashing; ethical and social implications of AI and data collection
- ADVANCED (NCEA Level 1 skills): Complex algorithm design; database design (normalisation to 2NF); cybersecurity threats and countermeasures; programming with complex data structures`
    }
    if (nzcLevel.includes('Level 6') || nzcLevel.includes('NCEA Level 1') || nzcLevel.includes('Year 11')) {
      return `NCEA DIGITAL TECHNOLOGY LEVEL 1 (Year 11) CALIBRATION:
- FOUNDATION (Year 9-10 skills): OOP; sorting/searching algorithms; Big O notation; SQL with JOINs; HTML/CSS/JS basics; OSI model; public key encryption
- DEVELOPING (NCEA Level 1 skills): Complex algorithm design (designing algorithms for non-trivial problems; pseudocode and flowcharts; algorithm analysis and efficiency; testing and debugging strategies); database design in depth (entity-relationship diagrams; normalisation to 3NF; writing complex SQL queries — subqueries, aggregation, multiple JOINs; data integrity constraints); cybersecurity in depth (types of attacks — malware, ransomware, social engineering, MITM, DDoS; defensive strategies — firewalls, IDS, encryption, 2FA, patch management; ethical hacking concepts); programming project (developing a solution to a real problem using OOP; testing plan; documentation); human-computer interaction (interface design principles — affordance, feedback, consistency; accessibility; user testing)
- ADVANCED (NCEA Level 2 skills): Agile software development; version control (Git); full-stack web development; AI and machine learning concepts; network security protocols`
    }
    if (nzcLevel.includes('Level 7') || nzcLevel.includes('NCEA Level 2') || nzcLevel.includes('Year 12')) {
      return `NCEA DIGITAL TECHNOLOGY LEVEL 2 (Year 12) CALIBRATION:
- FOUNDATION (NCEA Level 1 skills): Complex algorithm design; database normalisation to 3NF; SQL subqueries; cybersecurity threats and defenses; OOP programming project; HCI principles
- DEVELOPING (NCEA Level 2 skills): Software development lifecycle (waterfall, agile — sprints, Scrum, kanban; version control with Git — branching, merging, pull requests; code review); full-stack web development (RESTful APIs — GET/POST/PUT/DELETE; JSON data exchange; front-end frameworks concept; authentication — sessions, JWT; server-side scripting); network infrastructure (VLAN; subnetting and CIDR notation; NAT; routing protocols — RIP, OSPF concept; wireless security — WPA3); AI and machine learning (supervised vs unsupervised learning; training data and overfitting; neural networks at conceptual level; natural language processing; ethical implications of AI); digital forensics and security (evidence collection; log analysis; incident response)
- ADVANCED (NCEA Level 3 skills): Cloud computing; microservices architecture; advanced machine learning; research into emerging technologies`
    }
    return `Use appropriate NZC/NCEA Digital Technology content for ${nzcLevel}, covering programming, data representation, networks, and cybersecurity.`
  }

  // Music (NZC The Arts — Music strand)
  if (s === 'music') {
    if (nzcLevel.startsWith('NZC Level 1') || nzcLevel.includes('Year 1') || nzcLevel.includes('Year 2')) {
      return `NZC MUSIC LEVEL 1 CALIBRATION (Year 1-2):
- FOUNDATION (pre-school): Responding to music (fast/slow, loud/soft); clapping a simple beat; recognising familiar songs
- DEVELOPING (Year 1-2 skills): Musical elements — beat (steady pulse), rhythm (pattern of long/short sounds), tempo (fast/slow), dynamics (loud/soft — forte/piano), pitch (high/low); performing simple songs and chants; distinguishing between instruments by sound; creating simple soundscapes; ta (crotchet) and ti-ti (quaver pair) rhythm notation in basic form; call and response patterns
- ADVANCED (Year 3-4 skills): Treble clef note names on lines and spaces (EGBDF, FACE); time signatures (4/4 meaning); quarter rests; naming common instrument families`
    }
    if (nzcLevel.startsWith('NZC Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC MUSIC LEVEL 2 CALIBRATION (Year 3-4):
- FOUNDATION (Year 1-2 skills): Beat, rhythm, tempo, dynamics, pitch; simple rhythm notation (ta, ti-ti); performing songs; instrument families
- DEVELOPING (Year 3-4 skills): Musical elements in practice — duration (note values: semibreve=4, minim=2, crotchet=1, quaver=½); time signature 4/4 (4 beats per bar); treble clef note reading (lines: EGBDF, spaces: FACE); simple C major scale; dynamics markings (p, mp, mf, f, ff, pp); tempo markings (allegro, andante, adagio); timbre — identifying instruments by sound; texture (thin/thick; melody and accompaniment); creating simple 4-bar rhythmic or melodic patterns; responding to music — describing mood, style, and character; recognising AB and ABA musical form
- ADVANCED (Year 5-6 skills): Bass clef note reading; major and minor scales; sharp/flat/natural signs; chord recognition (I, IV, V); musical periods (Baroque, Classical, Romantic) at a basic level`
    }
    if (nzcLevel.startsWith('NZC Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC MUSIC LEVEL 3 CALIBRATION (Year 5-6):
- FOUNDATION (Year 3-4 skills): Note values; 4/4 time signature; treble clef reading; dynamics and tempo markings; AB/ABA form; instrument timbres
- DEVELOPING (Year 5-6 skills): Staff notation — treble and bass clef reading; major scales (C, G, D, F); key signatures (up to 2 sharps/flats); time signatures (2/4, 3/4, 4/4); note values including dotted notes and ties; musical form (binary AB, ternary ABA, rondo ABACA, theme and variations); harmonic concepts (major vs minor; tonic, dominant, subdominant chords); musical periods (Baroque, Classical, Romantic — key composers and characteristics); musical devices (sequence, ostinato, syncopation, imitation); analysing music for style, structure, and expressive techniques; composing an 8-bar melody with accompaniment
- ADVANCED (Year 7-8 skills): Modes and pentatonic scales; extended harmonies (7th chords); more complex rhythmic patterns (triplets, syncopation); musical analysis using subject-specific vocabulary; 20th century music styles`
    }
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC MUSIC LEVEL 4 CALIBRATION (Year 7-8):
- FOUNDATION (Year 5-6 skills): Treble/bass clef; major scales and key signatures; time signatures; musical form; major/minor; chord I/IV/V; musical periods and composers
- DEVELOPING (Year 7-8 skills): Modes (Dorian, Mixolydian, Aeolian/natural minor); pentatonic scale; extended harmonies (7th chords — dominant 7th, major 7th); chord progressions (I-IV-V-I, ii-V-I in jazz); complex rhythms (triplets, syncopation, polyrhythm); musical texture (monophony, homophony, polyphony, heterophony); musical analysis — identifying compositional devices (canon, fugue subject/answer, augmentation, diminution, inversion); comparing music across world cultures; 20th century styles (jazz, blues, rock, electronic — characteristics and context); composing for different instruments with attention to playability; performing with technical accuracy and expression
- ADVANCED (NCEA Level 1 skills): Advanced harmony; modulation; composing in a specific style with analytical commentary; music history in depth (specific periods and composers)`
    }
    return `Use appropriate NZC Music content for ${nzcLevel}, covering musical elements (pitch, rhythm, dynamics, timbre, texture), notation, theory, performance, composition, and musical history/styles.`
  }

  // Spanish (NZC Learning Languages)
  if (s.includes('spanish') || s.includes('español')) {
    return `NZC SPANISH (LEARNING LANGUAGES) CALIBRATION:
NOTE: Spanish in NZ is proficiency-based (Novice → Intermediate → Advanced). Assess based on years of study, not just year group.
- FOUNDATION (zero/minimal Spanish): Cannot produce any Spanish; may recognise a few cognates (hotel, chocolate, animal, musica); no knowledge of grammar
- DEVELOPING (Novice 1-2, typical 1-3 years of study): Greetings and farewells (Hola, Buenos días/tardes/noches, Adiós, Hasta luego, ¿Cómo estás?/¿Cómo te llamas?); self-introduction (Me llamo..., Tengo ... años, Soy de...); numbers 0-100 (uno, dos, tres... veinte, treinta...); colours (rojo, azul, verde, amarillo, negro, blanco, anaranjado); days of the week (lunes, martes... domingo) and months; family members (madre/mamá, padre/papá, hermano/a, abuelo/a); expressing likes and dislikes (Me gusta / No me gusta + noun/infinitive; Me encanta; Odio); basic classroom objects and instructions; present tense of SER (soy, eres, es, somos, sois, son) and TENER (tengo, tienes, tiene...); present tense of regular -AR verbs (hablar, gustar, escuchar); describing self (alto/a, bajo/a, rubio/a, moreno/a; simpático/a, divertido/a)
- ADVANCED (Emergent, 3-4 years): Writing 4-6 sentences in correct Spanish; present tense of regular -ER/-IR verbs; adjective agreement (gender and number — un perro negro, una gata negra, unos perros negros); SER vs ESTAR distinction; ir + a + infinitive for near future; reflexive verbs (me llamo, me despierto); negation; basic question formation`
  }

  // Te Reo Māori (NZC — Learning Languages and curriculum context)
  if (s.includes('te reo') || s.includes('maori') || s.includes('māori') || s.includes('reo')) {
    if (nzcLevel.startsWith('NZC Level 1') || nzcLevel.includes('Year 1') || nzcLevel.includes('Year 2')) {
      return `NZC TE REO MĀORI LEVEL 1 CALIBRATION (Year 1-2):
- FOUNDATION: No te reo knowledge; cannot recognise any Māori words
- DEVELOPING (Year 1-2 skills): Basic greetings (Kia ora, Tēnā koe, Mōrena); farewell (Ka kite anō, Haere rā); numbers 1-10 (tahi, rua, toru, whā, rima, ono, whitu, waru, iwa, tekau); colours (whero-red, kākāriki-green, kōwhai-yellow, mā-white, pango-black, kikorangi-blue); simple body parts (māhunga-head, ringa-hand, waewae-foot, kanohi-face); responding to simple instructions (tū ake — stand up; noho iho — sit down; āe — yes; kāo — no)
- ADVANCED (Year 3-4 skills): Self-introduction using ko/nō sentence structures; numbers to 20; days of the week (Rāhina-Monday through Rātapu-Sunday); simple descriptive sentences; whanau words`
    }
    if (nzcLevel.startsWith('NZC Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC TE REO MĀORI LEVEL 2 CALIBRATION (Year 3-4):
- FOUNDATION (Year 1-2 skills): Basic greetings; numbers 1-10; colours; body parts; simple classroom instructions
- DEVELOPING (Year 3-4 skills): Ko-sentences for identity (Ko [name] tōku ingoa; Ko [tribe] tōku iwi; Ko [mountain] tōku maunga; Ko [river] tōku awa); Nō-sentences for origin (Nō Tāmaki Mākorau ahau); numbers to 100 (tekau mā tahi...); days of week and months; whanau vocabulary (māmā, pāpā, tuakana, teina, tungāne, tuahine, koro, kui, mokopuna); colour adjectives; simple present tense statements (E... ana ahau — I am...ing; Kei te... ahau — I am...); describing weather; responding to and giving simple instructions; common nouns for food, animals, and places in NZ
- ADVANCED (Year 5-6 skills): Verb-subject-object sentence structure (basic Māori grammar — VSO order); possessive pronouns (tōku, tōu, tōna); past and future tense markers (I...; Ka...); question words (He aha? He wai? Kei hea?)`
    }
    if (nzcLevel.startsWith('NZC Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC TE REO MĀORI LEVEL 3 CALIBRATION (Year 5-6):
- FOUNDATION (Year 3-4 skills): Ko/Nō sentences; numbers to 100; days and months; whanau vocabulary; present tense E...ana; basic nouns
- DEVELOPING (Year 5-6 skills): Māori sentence structure (VSO — verb first: Ka kai ahau; Kei te mahi ia); past tense (I — I haere ahau ki te kura); future tense (Ka — Ka hoki āpōpō); locative sentences (Kei hea? — where is?; Kei [place] a [person/thing]); possessives — a-class and o-class (tōku/tāku distinction at a basic level); directions (ki te raro, ki runga, ki roto, ki waho); describing people and things with adjectives; question formation (He aha...? He wai...? Nō wai...? Kei hea...? He mea aha...?); numbers with people and things (tekau ngā tamariki); Māori concepts (kaitiakitanga, manaakitanga, whanaungatanga — meaning and use); reading and responding to a short simple te reo passage
- ADVANCED (Year 7-8 skills): Subordinate clauses; dual and plural pronouns; passive voice (e...ia); writing a personal paragraph in te reo Māori using correct grammar`
    }
    return `Use appropriate NZC Te Reo Māori content for ${nzcLevel}, covering greetings, self-introduction, basic grammar structures, and key vocabulary in cultural context.`
  }

  // French
  if (s.includes('french') || s.includes('français')) {
    return `NZC FRENCH (LEARNING LANGUAGES) CALIBRATION:
NOTE: French in NZ is proficiency-based, not strictly year-based. Assess at Novice level unless the student's grade/age indicates they have had several years of instruction.
- FOUNDATION (zero/minimal French): No French knowledge; possibly recognises a few cognates (restaurant, café, musique); cannot produce any French
- DEVELOPING (Novice 1-2, typical 1-2 years): Greetings (Bonjour, Salut, Au revoir, Bonsoir); self-introduction (Je m'appelle..., J'ai ... ans); numbers 1-20; colours (rouge, bleu, vert, jaune, blanc, noir); classroom objects and instructions; days of week and months; expressing likes/dislikes (J'aime / Je n'aime pas + noun); family members (mère, père, frère, sœur); isolated words and formulaic phrases; present tense of avoir and être (basic); listening to slow, clear speech
- ADVANCED (Emergent, 3-4 years): Writing short sentences in correct French; present tense of regular -er verbs (jouer, manger, aimer); describing self and family in 3-4 sentences; understanding short written passages; politeness conventions (tu vs. vous); adjective agreement (un chat noir / une maison noire)`
  }

  // Fallback for other subjects
  return `Use appropriate content for ${subject} at ${nzcLevel}. Ensure foundation questions test prerequisites, developing questions test expected skills, and advanced questions genuinely stretch beyond the expected year level.`
}
