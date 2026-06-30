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
- "short-answer": 1-2 sentence response — good for vocabulary, definitions, inference
- "long-answer": multi-step explanation, extended writing, or analysis — good for problem-solving and persuasive writing
- "drawing": diagram, labelled sketch, or SHOW YOUR WORKING (maths/science) — mark what the student writes

Variety rules:
- Use at least 3 different question types across the 7 questions
- For Mathematics: at least 1 drawing (show working), at least 1 MC, at least 1 short-answer
- For Sciences: at least 1 MC (factual recall), at least 1 short-answer (explain/describe), at least 1 long-answer or drawing
- For English: at least 1 MC or short-answer (language feature), at least 1 long-answer (writing task)
- For French: at least 1 MC (vocabulary/grammar), at least 1 short-answer, at least 1 writing task
- Each question must have a "topic" field (e.g. "Fractions", "Living World", "Narrative Writing")
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
  const g = String(grade).toLowerCase()
  if (g.includes('year 1') || g.includes('y1') || age <= 6) return 'NZC Level 1 (Year 1-2)'
  if (g.includes('year 2') || g.includes('y2') || age === 7) return 'NZC Level 1 (Year 1-2)'
  if (g.includes('year 3') || g.includes('y3') || age === 8) return 'NZC Level 2 (Year 3-4)'
  if (g.includes('year 4') || g.includes('y4') || age === 9) return 'NZC Level 2 (Year 3-4)'
  if (g.includes('year 5') || g.includes('y5') || age === 10) return 'NZC Level 3 (Year 5-6)'
  if (g.includes('year 6') || g.includes('y6') || age === 11) return 'NZC Level 3 (Year 5-6)'
  if (g.includes('year 7') || g.includes('y7') || age === 12) return 'NZC Level 4 (Year 7-8)'
  if (g.includes('year 8') || g.includes('y8') || age === 13) return 'NZC Level 4 (Year 7-8)'
  if (g.includes('year 9') || g.includes('y9') || age === 14) return 'NZC Level 5 (Year 9-10)'
  if (g.includes('year 10') || g.includes('y10') || age === 15) return 'NZC Level 5 (Year 9-10)'
  if (g.includes('year 11') || g.includes('y11') || age === 16) return 'NZC Level 6 / NCEA Level 1'
  if (g.includes('year 12') || g.includes('y12') || age === 17) return 'NZC Level 7 / NCEA Level 2'
  if (g.includes('year 13') || g.includes('y13') || age >= 18) return 'NZC Level 8 / NCEA Level 3'
  return `Expected year level for age ${age}`
}

function buildSubjectGuidance(subject, nzcLevel) {
  const s = subject.toLowerCase()

  // Mathematics
  if (s.includes('math') || s.includes('maths') || s.includes('numeracy')) {
    if (nzcLevel.includes('Level 1') || nzcLevel.includes('Year 1') || nzcLevel.includes('Year 2')) {
      return `NZC MATHEMATICS LEVEL 1 CALIBRATION:
- FOUNDATION (pre-school/entry): Counting objects to 20, recognising numerals, simple patterns
- DEVELOPING (Year 1-2): Addition/subtraction within 20 using counting strategies; halves and quarters of shapes; non-standard measurement (hand-spans); simple 2D shape names; tally charts
- ADVANCED (Year 3-4): Place value to 1000; 2-3 digit addition/subtraction; multiplication by 2s, 5s, 10s; standard units (cm, kg, L); time to the quarter-hour`
    }
    if (nzcLevel.includes('Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC MATHEMATICS LEVEL 2 CALIBRATION:
- FOUNDATION (Year 1-2 skills): Addition/subtraction within 20; halves and quarters of simple shapes; non-standard measurement; simple number sequences
- DEVELOPING (Year 3-4 skills): Place value to 1000 (hundreds, tens, ones); addition and subtraction of 2- and 3-digit numbers using place-value strategies; multiplication by 2s, 5s, 10s (working toward all basic facts); fractions of sets and shapes (halves, quarters, thirds, eighths); standard measurement (cm/m, kg, L); time to the quarter-hour; extending number patterns; reading simple tally charts and picture graphs
- ADVANCED (Year 5-6 skills): All multiplication/division facts to 10×10 with fluency; multiplying 2-digit numbers; decimals to one decimal place; equivalent fractions; perimeter using formulae; 24-hour time; mean of a data set`
    }
    if (nzcLevel.includes('Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC MATHEMATICS LEVEL 3 CALIBRATION:
- FOUNDATION (Year 3-4 skills): 3-digit addition/subtraction; multiplication by 2s, 5s, 10s; simple fractions; standard measurement units; time to the quarter-hour
- DEVELOPING (Year 5-6 skills): All multiplication/division basic facts to 10×10 fluently; written algorithms for multi-digit multiplication and division; fractions, decimals (tenths, hundredths) and simple percentages; equivalent fractions; area and perimeter using formulae; metric conversions; identifying and describing transformations (reflection, rotation, translation); tables, graphs, and patterns; probability as fractions
- ADVANCED (Year 7-8 skills): Integers and directed numbers; multi-step problems with fractions/decimals/percentages; introduction to algebra (simple equations); scale drawings; ratio and proportion`
    }
    if (nzcLevel.includes('Level 4') || nzcLevel.includes('Year 7') || nzcLevel.includes('Year 8')) {
      return `NZC MATHEMATICS LEVEL 4 CALIBRATION:
- FOUNDATION (Year 5-6 skills): All basic facts; fractions, decimals, percentages; area/perimeter; metric conversions; transformations; probability as fractions
- DEVELOPING (Year 7-8 skills): Integers; multi-step ratio/proportion problems; linear algebra (solve for x); geometric proofs (angles, parallel lines); Pythagoras theorem; statistical investigations with mean/median/mode; probability with complementary events; number properties (prime, composite, factors)
- ADVANCED (Year 9-10 skills): Quadratic equations; index laws; simultaneous equations; trigonometry (SOH CAH TOA); statistical inference; probability trees`
    }
    return `Use appropriate NZC mathematics content for ${nzcLevel}, calibrating foundation 1-2 year levels below, developing at level, and advanced 1-2 year levels above.`
  }

  // English
  if (s.includes('english') || s.includes('literacy') || s.includes('reading') || s.includes('writing')) {
    if (nzcLevel.includes('Level 1') || nzcLevel.includes('Year 1') || nzcLevel.includes('Year 2')) {
      return `NZC ENGLISH LEVEL 1 CALIBRATION:
- FOUNDATION (pre-school): Letter recognition, initial sounds, simple sight words
- DEVELOPING (Year 1-2): Phonics decoding of simple words; reading simple decodable texts; writing simple sentences with capital letters and full stops; basic high-frequency word spelling; recognising nouns, verbs in simple sentences
- ADVANCED (Year 3-4): Reading with inference; writing in paragraphs; multiple text types; complex sentences; speech marks; commas`
    }
    if (nzcLevel.includes('Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC ENGLISH LEVEL 2 CALIBRATION:
- FOUNDATION (Year 1-2 skills): Simple sentence construction with capital letter and full stop; recognising basic nouns and verbs; decoding simple words; reading short simple texts literally
- DEVELOPING (Year 3-4 skills): Reading fiction/non-fiction with inference and making connections; identifying text features (heading, subheading, caption); writing in paragraphs using topic sentences; narrative writing with problem and resolution; simple report and recount writing; using speech marks, commas, and simple conjunctions (but, because, so, when); identifying nouns, verbs, adjectives, adverbs; spelling phonically regular and common words; basic simile and metaphor recognition
- ADVANCED (Year 5-6 skills): Identifying subordinate clauses and complex sentence structures; persuasive writing with structured arguments; recognising personification, hyperbole, and symbolism; identifying author purpose and point of view; using colons, semicolons, and dashes correctly; writing from multiple perspectives`
    }
    if (nzcLevel.includes('Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC ENGLISH LEVEL 3 CALIBRATION:
- FOUNDATION (Year 3-4 skills): Reading with inference; paragraph writing; simple narrative; simile and metaphor; speech marks; adjectives and adverbs
- DEVELOPING (Year 5-6 skills): Reading longer texts and identifying author purpose, bias, and point of view; writing extended paragraphs with evidence and elaboration; persuasive essays with structured arguments (PEEL); correct apostrophes, colons, varied punctuation; figurative language (personification, hyperbole, symbolism); vocabulary in context; audience and register awareness; synthesising information from two sources
- ADVANCED (Year 7-8 skills): Critical literary analysis; sustained multi-paragraph essays with thesis statements; genre manipulation; complex grammatical structures; independent evaluation of texts for bias and purpose`
    }
    return `Use appropriate NZC English content for ${nzcLevel}.`
  }

  // Science
  if (s.includes('science') || s.includes('biology') || s.includes('chemistry') || s.includes('physics')) {
    if (nzcLevel.includes('Level 2') || nzcLevel.includes('Year 3') || nzcLevel.includes('Year 4')) {
      return `NZC SCIENCE LEVEL 2 CALIBRATION:
- FOUNDATION (Year 1-2 skills): Basic needs of living things (food, water, light, shelter); simple push/pull forces from everyday life; observable weather; floating and sinking; day/night cycle observation
- DEVELOPING (Year 3-4 skills): Life cycles of diverse animals (butterfly, frog, bird, mammal); plant growth conditions (light, water, warmth, nutrients); how physical features and behaviours help organisms survive (basic adaptation); properties of common materials (hard/soft, waterproof, transparent); push/pull forces and how they change motion, speed, direction; states of matter (solid, liquid, gas) and simple changes (melting, freezing, evaporation); Earth's resources (water cycle, soil, rocks); basic scientific method (predict, observe, record); food chains (producer → consumer)
- ADVANCED (Year 5-6 skills): Ecosystems and interdependence; food webs; fair testing with controlled variables; classification of living organisms; water cycle in detail; solar system; concept of energy transfer`
    }
    if (nzcLevel.includes('Level 3') || nzcLevel.includes('Year 5') || nzcLevel.includes('Year 6')) {
      return `NZC SCIENCE LEVEL 3 CALIBRATION:
- FOUNDATION (Year 3-4 skills): Life cycles; basic adaptation; push/pull forces; states of matter; food chains; properties of materials; simple scientific method
- DEVELOPING (Year 5-6 skills): Life processes common to all living things (respiration, reproduction, growth, nutrition, excretion); ecosystems and interdependence; food webs; water cycle and effects on climate; classification of living things into groups; Earth's layers; solar system; how light, sound, and electricity behave; fair testing (controlling variables, identifying dependent/independent variables); forming explanations with evidence
- ADVANCED (Year 7-8 skills): Cell theory and cell structure; chemical reactions and particle theory; genetics (variation and inheritance); forces including gravity, friction, balanced/unbalanced; energy transfer and transformation; designing multi-variable experiments`
    }
    return `Use appropriate NZC Science content for ${nzcLevel}, covering Living World, Physical World, Material World, and Planet Earth and Beyond strands.`
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
