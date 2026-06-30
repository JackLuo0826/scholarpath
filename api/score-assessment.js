import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/score-assessment
 * Scores all assessment answers and determines the student's subject level.
 * Handles text answers, multiple-choice, and drawing (image) answers via Claude Vision.
 *
 * Body: {
 *   subject, childAge, childGrade, childName?,
 *   questions: AssessmentQuestion[],
 *   answers:   AssessmentAnswer[],
 *   apiKey, model
 * }
 * Returns: { questionScores, overallScore, level, levelLabel, feedback, subjectReport }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    subject, childAge, childGrade, childName,
    questions, answers,
    apiKey, model,
  } = req.body

  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })
  if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: 'questions required' })
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers required' })

  const age = parseInt(childAge) || 13
  const grade = childGrade || 'school age'
  const name = childName || 'Student'

  const systemPrompt = `You are an expert educational assessor marking a diagnostic ${subject} assessment.

Student: ${name}, ${age} years old, ${grade}.

Evaluate each question-answer pair and compute an overall level placement.

Scoring rules:
- Award partial credit generously — partial understanding is still learning
- For unanswered questions, score 0 with feedback "No answer provided"
- Drawing/handwriting answers: evaluate the content shown in the image
- Multiple-choice: correct = 100, wrong = 0 (no partial credit)

Level placement thresholds (based on weighted score across difficulty tiers):
- "expert":     85–100% overall — consistently demonstrates above-level mastery
- "advanced":   65–84%  overall — solid at-level work, some above-level success
- "developing": 40–64%  overall — mostly at-level with some gaps; needs targeted support
- "foundation": 0–39%   overall — significant gaps; foundational support needed

Level label format examples:
- "Year 4 Mathematics — Foundation"
- "Year 8 Science — Developing"
- "Year 10 English — Advanced"
- "Year 7 French — Expert"

Return ONLY valid JSON with no markdown fences:
{
  "questionScores": [
    {
      "questionId": "q1",
      "score": 85,
      "isCorrect": true,
      "feedback": "Good — you correctly identified... [specific to their answer]"
    }
  ],
  "overallScore": 72,
  "level": "advanced",
  "levelLabel": "Year 8 Mathematics — Advanced",
  "feedback": "Strong understanding of [topics]. Areas to develop: [specific gaps].",
  "subjectReport": "2-3 sentences on what this level means for the student's learning journey and next steps."
}`

  // Build the Q&A pairs for the prompt
  const qaPairs = questions.map(q => {
    const answer = answers.find(a => a.questionId === q.id)
    let answerDesc = 'No answer provided'
    if (answer?.selectedOption) answerDesc = `Selected: ${answer.selectedOption}`
    else if (answer?.answerText?.trim()) answerDesc = answer.answerText.trim()
    else if (answer?.answerImageBase64) answerDesc = '[Handwritten/drawn answer — see image below]'
    return { q, answer, answerDesc }
  })

  const textSummary = qaPairs.map(({ q, answerDesc }, i) =>
    `Q${i + 1} [${q.difficulty.toUpperCase()}] — ${q.topic}\nQuestion: ${q.question}${q.options ? '\nOptions: ' + q.options.join(' | ') : ''}\nStudent's answer: ${answerDesc}`
  ).join('\n\n---\n\n')

  // Collect drawing answers for vision
  const drawingPairs = qaPairs.filter(p => p.answer?.answerImageBase64)

  let messageContent
  if (drawingPairs.length > 0) {
    const parts = [
      {
        type: 'text',
        text: `Please mark this ${subject} diagnostic assessment for ${name} (${age} years old, ${grade}).\n\n${textSummary}\n\nDrawing answers are shown below:`,
      },
    ]
    drawingPairs.forEach(({ q, answer }, idx) => {
      const qNum = questions.indexOf(q) + 1
      const base64Data = answer.answerImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
      const mediaType = answer.answerImageBase64.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png'
      parts.push({ type: 'text', text: `Drawing for Q${qNum} (${q.topic}, ${q.difficulty}):` })
      parts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } })
      if (idx === 0) {} // suppress unused warning
    })
    messageContent = parts
  } else {
    messageContent = `Please mark this ${subject} diagnostic assessment for ${name} (${age} years old, ${grade}).\n\n${textSummary}`
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = response.content[0].text.trim()
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('Invalid JSON response from AI')
    const result = JSON.parse(raw.slice(start, end + 1))

    // Normalise
    const validLevels = ['foundation', 'developing', 'advanced', 'expert']
    const level = validLevels.includes(result.level) ? result.level : 'developing'
    const overallScore = Math.min(100, Math.max(0, Number(result.overallScore) || 0))

    res.json({
      questionScores: (result.questionScores || []).map(qs => ({
        questionId: qs.questionId || '',
        score: Math.min(100, Math.max(0, Number(qs.score) || 0)),
        isCorrect: Boolean(qs.isCorrect),
        feedback: qs.feedback || '',
      })),
      overallScore,
      level,
      levelLabel: result.levelLabel || `${grade} ${subject} — ${level.charAt(0).toUpperCase() + level.slice(1)}`,
      feedback: result.feedback || '',
      subjectReport: result.subjectReport || '',
    })
  } catch (err) {
    console.error('score-assessment error:', err)
    res.status(500).json({ error: err.message || 'Assessment scoring failed' })
  }
}
