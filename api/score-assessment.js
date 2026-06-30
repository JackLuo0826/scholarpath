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

  const systemPrompt = `You are an expert NZC educational assessor marking a diagnostic ${subject} assessment.

Student: ${name}, ${age} years old, ${grade}.

This diagnostic has 7 questions in three tiers:
- Q1-Q2: FOUNDATION (prerequisite knowledge, 1-2 year levels below expected)
- Q3-Q5: DEVELOPING (at expected year level)
- Q6-Q7: ADVANCED (1-2 year levels above expected)

━━━ SCORING EACH QUESTION ━━━
Score each answer 0-100:
- Multiple-choice: 100 if correct, 0 if wrong (no partial credit)
- Open-ended: use these anchors strictly:
  • 0:  No answer, "I don't know", completely irrelevant, or blank
  • 20: Vague mention of a related topic without demonstrating actual knowledge
  • 40: Shows partial understanding but significant gaps or errors
  • 60: Mostly correct with minor gaps or imprecision
  • 80: Correct and clear, minor omissions only
  • 100: Fully correct, complete, well-explained
- DO NOT be lenient: vague or approximate answers that don't demonstrate specific knowledge score ≤30
- A student who shows they attempted but clearly doesn't know the concept scores 10-20, NOT 40-60
- "isCorrect" = true only if score ≥ 70

━━━ LEVEL PLACEMENT — USE THIS EXACT LOGIC ━━━
Step 1: Compute tier averages from the scores above:
  foundationAvg = average score of the 2 foundation questions (Q1-Q2)
  developingAvg = average score of the 3 developing questions (Q3-Q5)
  advancedAvg   = average score of the 2 advanced questions (Q6-Q7)

Step 2: Determine level using DEVELOPING TIER as the primary diagnostic:

  "expert":     developingAvg ≥ 85 AND advancedAvg ≥ 65
    → Student consistently operates above year level; mastery of at-level AND strong advanced work

  "advanced":   developingAvg ≥ 70 AND advancedAvg ≥ 30 (but not expert)
    → Student is solid at year-level AND shows meaningful above-level capability

  "developing": developingAvg ≥ 30 (but not advanced or expert)
    → Student is working at or approaching year level; shows some year-level understanding

  "foundation": developingAvg < 30
    → Student has significant gaps at year level; needs prerequisite support

  DECISION ORDER: Check expert first, then advanced, then developing, then foundation.
  Use developing tier score as the primary signal. Foundation tier confirms prerequisites but
  a student who passes developing is at minimum "developing" regardless of foundation score.
  A student who gets ALL foundation and developing correct (100%) but only 15% on advanced
  is "developing" (excellent at year level, not yet above it).
  A student who gets 100% developing and 30%+ advanced is "advanced".
  A student who gets 85%+ developing and 65%+ advanced is "expert".

Step 3: Compute overallScore as a WEIGHTED average that reflects the tier logic:
  overallScore = (foundationAvg × 0.20) + (developingAvg × 0.50) + (advancedAvg × 0.30)
  Round to the nearest whole number.

IMPORTANT: The level MUST match the tier logic above. Do not override the tier logic with overall score gut-feel.

━━━ LABELS AND FEEDBACK ━━━
Level label format: "${grade} ${subject} — [Level]"
Examples: "Year 4 Mathematics — Foundation" / "Year 8 Science — Advanced"

Feedback: 2-3 sentences. Be specific about which topics were strong and which need work.
SubjectReport: 2-3 sentences on what this level means for the student's next learning steps.

Return ONLY valid JSON with no markdown fences:
{
  "questionScores": [
    {
      "questionId": "q1",
      "score": 85,
      "isCorrect": true,
      "feedback": "Specific feedback on their actual answer — what was right or wrong and why."
    }
  ],
  "overallScore": 62,
  "level": "developing",
  "levelLabel": "${grade} ${subject} — Developing",
  "feedback": "Strong on [specific topics]. Needs to develop [specific gaps].",
  "subjectReport": "This result means... Next steps are..."
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
      max_tokens: 3200,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = response.content[0].text.trim()
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('Invalid JSON response from AI')
    const result = JSON.parse(raw.slice(start, end + 1))

    // Normalise question scores
    const questionScores = (result.questionScores || []).map(qs => ({
      questionId: qs.questionId || '',
      score: Math.min(100, Math.max(0, Number(qs.score) || 0)),
      isCorrect: Boolean(qs.isCorrect),
      feedback: qs.feedback || '',
    }))

    // Server-side tier logic — overrides AI judgment to enforce consistent rules.
    // Match scores by questionId so AI response ordering never corrupts tier averages.
    const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0
    const scoreById = {}
    questionScores.forEach(qs => { scoreById[qs.questionId] = qs.score })
    const tierScores = { foundation: [], developing: [], advanced: [] }
    questions.forEach(q => {
      const s = scoreById[q.id]
      if (s !== undefined && tierScores[q.difficulty]) tierScores[q.difficulty].push(s)
    })
    const dAvg = avg(tierScores.developing)
    const aAvg = avg(tierScores.advanced)

    let level
    if      (dAvg >= 85 && aAvg >= 65) level = 'expert'
    else if (dAvg >= 70 && aAvg >= 30) level = 'advanced'
    else if (dAvg >= 30)               level = 'developing'
    else                               level = 'foundation'

    const overallScore = Math.min(100, Math.max(0, Number(result.overallScore) || 0))

    res.json({
      questionScores,
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
