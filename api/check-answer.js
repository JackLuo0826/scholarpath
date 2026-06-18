import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/check-answer
 * Evaluates a student's answer (text or drawing) using Claude.
 * For drawings, the base64 PNG is sent via Claude Vision.
 *
 * Body: {
 *   question, subject, activityTitle, activityType,
 *   childAge, childGrade,
 *   answerText?,        // text answer
 *   answerImageBase64?, // base64 PNG (strip data:image/png;base64, prefix before sending)
 *   apiKey, model
 * }
 * Returns: { isCorrect, score, feedback, explanation, encouragement }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    question, subject, activityTitle, activityType,
    childAge, childGrade,
    answerText, answerImageBase64,
    apiKey, model,
  } = req.body

  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })
  if (!question) return res.status(400).json({ error: 'question is required' })
  if (!answerText && !answerImageBase64) return res.status(400).json({ error: 'answerText or answerImageBase64 required' })

  const age = parseInt(childAge) || 13
  const grade = childGrade || 'school age'

  // Calibrate feedback tone & vocabulary to age
  let languageNote = 'Use clear, friendly language suitable for a teenager.'
  if (age <= 10) languageNote = 'Use very simple, encouraging language. Short sentences. Lots of warmth. Avoid technical jargon.'
  else if (age <= 12) languageNote = 'Use friendly, accessible language. Relatable analogies. Keep explanations concise.'
  else if (age >= 16) languageNote = 'The student is preparing for senior exams. Be precise and exam-focused in feedback. Point to specific techniques or rubric requirements where relevant.'

  const systemPrompt = `You are a warm, encouraging tutor evaluating a student's work.

Student profile: ${age} years old, ${grade}.
${languageNote}

Your evaluation approach:
- Award partial credit generously — a partially correct answer is still learning
- For written/exercise tasks (todo, reading) that don't have a single right answer, check whether they completed the task thoughtfully — award full marks if so
- Feedback must be specific to THEIR actual answer, not generic
- Explanation should clarify the correct approach without being condescending
- Encouragement must be genuine, not hollow

Return ONLY valid JSON. No markdown fences. Schema:
{
  "isCorrect": boolean,
  "score": number between 0 and 100,
  "feedback": "1-2 sentences directly about their answer — what they got right, what was off",
  "explanation": "2-3 sentences explaining the correct approach or answer, in age-appropriate terms. Empty string if they got it fully right.",
  "encouragement": "1 warm, specific closing sentence"
}`

  // Build the user message content (text or Vision)
  let messageContent

  if (answerImageBase64) {
    // Strip data URI prefix if present
    const base64Data = answerImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    messageContent = [
      {
        type: 'text',
        text: `Activity: "${activityTitle}" (${subject}, ${activityType})

Question / Task:
${question}

The student has submitted a handwritten answer (see image below). Please evaluate it.`,
      },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: base64Data,
        },
      },
    ]
  } else {
    messageContent = `Activity: "${activityTitle}" (${subject}, ${activityType})

Question / Task:
${question}

Student's answer:
${answerText}`
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: model || 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = response.content[0].text.trim()
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const json = (start !== -1 && end !== -1) ? raw.slice(start, end + 1) : raw
    const result = JSON.parse(json)

    // Normalise: ensure all fields are present
    res.json({
      isCorrect:    Boolean(result.isCorrect),
      score:        Math.min(100, Math.max(0, Number(result.score) || 0)),
      feedback:     result.feedback || '',
      explanation:  result.explanation || '',
      encouragement: result.encouragement || 'Keep it up!',
    })
  } catch (err) {
    console.error('check-answer error:', err)
    res.status(500).json({ error: err.message || 'Evaluation failed' })
  }
}
