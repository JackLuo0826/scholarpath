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

  const systemPrompt = `You are an expert educational assessor creating a diagnostic placement assessment.

Student profile: ${name}, ${age} years old, ${grade}.
Subject: ${subject}
Expected curriculum level: ${nzcLevel}

TASK: Generate exactly 7 assessment questions spanning three difficulty tiers to accurately place this student:
- 2 FOUNDATION questions: 1-2 year levels BELOW expected (test prerequisite knowledge)
- 3 DEVELOPING questions: AT the expected year level
- 2 ADVANCED questions: 1-2 year levels ABOVE expected (stretch questions)

Question type guidelines:
- "multiple-choice": 4 options (label them "A. ...", "B. ...", "C. ...", "D. ...") — good for factual/conceptual recall
- "short-answer": 1-2 sentence response — good for explanations and definitions
- "long-answer": detailed working or multi-step explanation — good for problem-solving
- "drawing": diagram, graph, labelled sketch, or written mathematical working — good for maths, science

Variety rules:
- Use at least 2 different question types
- For Mathematics: mix drawing (show working) with short-answer
- For Sciences: mix multiple-choice (facts) with short-answer (explain concepts)
- For English/French: mix short-answer with long-answer
- Each question must have a "topic" field (e.g. "Fractions", "Cell Biology", "Metaphors")
- Each question should have a gentle "hint" (don't give the answer away)

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
  "levelDescription": "Expected ${grade} level in ${subject}"
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
  // NZC levels: 1 (Y1-2), 2 (Y3-4), 3 (Y5-6), 4 (Y7-8), 5 (Y9-10), 6 (Y11), 7 (Y12), 8 (Y13)
  const g = String(grade).toLowerCase()
  if (g.includes('year 1') || g.includes('y1') || age <= 7) return 'NZC Level 1 (Year 1-2)'
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
