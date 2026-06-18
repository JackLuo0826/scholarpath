import Anthropic from '@anthropic-ai/sdk'
import { getCurrentDate, getCurrentYear, getSchoolTermContext } from './_utils.js'

/**
 * POST /api/expand-year
 * Expands a high-level year summary into a fully detailed year plan.
 *
 * Body: { yearEntry, planContext, apiKey, model }
 *   yearEntry   — the high-level yearlyPlan entry (isHighLevel: true) to expand
 *   planContext — relevant fields from the parent plan (summary, education system, etc.)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { yearEntry, planContext, apiKey, model } = req.body
  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })
  if (!yearEntry) return res.status(400).json({ error: 'yearEntry is required' })

  const currentDate = getCurrentDate()
  const currentYear = getCurrentYear()
  const termContext = getSchoolTermContext(planContext?.educationSystem, yearEntry.calendarYear)

  const systemPrompt = `You are a world-class university admissions strategist expanding a single year of a student's university preparation plan into full detail.

Your expansion must be:
- Grounded in the student's specific target field, tier, and education system
- Internally consistent with the student's overall plan (application year, target score, prerequisites)
- Term-specific where possible — schedule milestones into the correct school term/quarter
- Age-appropriate in language and cognitive demand for the year level

Return ONLY valid JSON — no markdown, no explanation.`

  const keyFocusText = (yearEntry.keyFocus || []).map((k, i) => `${i + 1}. ${k}`).join('\n')

  const userMessage = `Expand this year into a fully detailed plan.

**Today's date:** ${currentDate}
${termContext ? `**School terms for ${yearEntry.calendarYear}:** ${termContext}` : ''}

**Student overview:**
- Name: ${planContext?.studentName || 'the student'}
- Education system: ${planContext?.educationSystem || 'Not specified'}
- Current grade: ${planContext?.currentYear || 'Not specified'}
- Target: ${planContext?.targetField || 'Not specified'} — ${planContext?.targetCareer || 'Not specified'}
- University tier: ${planContext?.targetUniversityTier || 'Not specified'}
- Application year: ${planContext?.applicationYear || 'Not specified'}
- Target score/grade: ${planContext?.overallATARorEquivalent || 'Not specified'}

**Year to expand:**
- Year label: ${yearEntry.yearLabel}
- Calendar year: ${yearEntry.calendarYear}
- Theme: ${yearEntry.theme}
- Focus: ${yearEntry.focus}
- High-level priorities:
${keyFocusText || '(none provided)'}

Generate 4–8 milestones (at least one per school term or quarter), 3–5 subjects, 2–3 warning flags, and 2–3 parent actions.

Return this exact JSON structure:
{
  "yearLabel": "${yearEntry.yearLabel}",
  "calendarYear": ${yearEntry.calendarYear},
  "theme": "${yearEntry.theme}",
  "focus": "${yearEntry.focus}",
  "isHighLevel": false,
  "keyFocus": [],
  "subjects": [
    { "subject": "Subject name", "priority": "critical|high|medium", "target": "Target grade/score", "rationale": "Why this subject this year" }
  ],
  "milestones": [
    { "quarter": "Q1|Q2|Q3|Q4", "action": "Specific, measurable action", "category": "academic|test|extracurricular|application|wellbeing", "metric": "How success is measured" }
  ],
  "warningFlags": ["Risk or common mistake specific to this year"],
  "parentActions": ["What the parent should arrange or monitor this year"]
}`

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: model || 'claude-opus-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0].text.trim()
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const jsonText = (start !== -1 && end !== -1) ? text.slice(start, end + 1) : text
    const parsed = JSON.parse(jsonText)
    res.json(parsed)
  } catch (err) {
    console.error('Expand year error:', err)
    res.status(500).json({ error: err.message })
  }
}
