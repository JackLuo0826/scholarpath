import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/generate-weekly
 * Generates a personalised set of weekly activities based on the child's
 * age, grade, goal plan, and current quarter milestones.
 *
 * Body: { childAge, childGrade, childName, goalPlan, apiKey, model }
 * Returns: { weekTheme, activities: WeeklyActivity[] }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { childAge, childGrade, childName, goalPlan, apiKey, model } = req.body
  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })

  // ── Derive current context ─────────────────────────────────────────────────
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1
  const qLabel = ['Q1', 'Q2', 'Q3', 'Q4'][currentQuarter - 1]

  const yearEntry = goalPlan?.roadmap?.find(r => r.year === currentYear) ?? goalPlan?.roadmap?.[0]
  const currentMilestones = yearEntry?.milestones?.filter(m => m.quarter === qLabel) ?? []
  const subjectTargets = goalPlan?.subjectTargets ?? []
  const weeklyHabits = goalPlan?.weeklyHabits ?? []

  const name = childName || 'the student'
  const ageCtx = childAge ? `${childAge} years old` : 'school age'
  const gradeCtx = childGrade || 'unspecified grade'

  // Estimate developmental stage for content calibration
  const age = parseInt(childAge) || 13
  let devStage = 'middle school (concrete operational thinking, benefit from worked examples)'
  if (age <= 10) devStage = 'primary school (concrete objects, visual representations, short tasks)'
  else if (age <= 12) devStage = 'upper primary / early secondary (beginning abstract thinking, relatable contexts)'
  else if (age >= 16) devStage = 'senior secondary (abstract reasoning, exam-focused, time-pressure practice)'

  const systemPrompt = `You are an expert educational content designer and learning scientist.

You create personalised weekly learning activities that are:
- Age-appropriate in language, complexity, and cognitive demand
- Directly tied to the student's goals and current quarter milestones
- Based on evidence: spaced repetition, interleaving, retrieval practice, desirable difficulties
- A balanced mix of types: exercises (solve problems), quizzes (test recall), reading/todo (research/prep)
- Achievable within the time specified — no more than 20-40 minutes per activity
- Written so the student can work independently in the app

Return ONLY valid JSON. No markdown fences.`

  const prompt = `Create 5-6 weekly learning activities for ${name}.

Student profile:
- Age: ${ageCtx}
- Grade: ${gradeCtx}
- Developmental stage: ${devStage}
- Long-term goal: ${goalPlan?.goalStatement ?? 'Academic excellence'}
- Target year: ${goalPlan?.targetYear ?? 'TBD'}

Current focus — ${qLabel} ${currentYear}:
${currentMilestones.length > 0
  ? currentMilestones.map(m => `• ${m.title}: ${m.description} (measure: ${m.metric ?? 'n/a'})`).join('\n')
  : '• General academic progress'}

Subject targets:
${subjectTargets.length > 0
  ? subjectTargets.map(s => `• ${s.subject}: currently "${s.currentLevel}", target "${s.targetLevel}"`).join('\n')
  : '• Not specified'}

Weekly habits to reinforce (include at least 1 habit check-in as a "todo"):
${weeklyHabits.length > 0
  ? weeklyHabits.slice(0, 3).map(h => `• ${h.habit} — ${h.frequency}`).join('\n')
  : '• None specified'}

Design guidelines:
- Mix subjects (don't put all maths together)
- Calibrate difficulty to age ${age}: use vocabulary, context, and problem complexity appropriate for ${gradeCtx}
- For exercise/quiz types: write 2-3 specific practice problems in the "question" field
- For reading/todo types: give a clear, concrete task the student can complete alone
- Hints should nudge thinking without giving away the answer
- milestoneRef should name the specific milestone or habit it serves

Return this exact JSON structure:
{
  "weekTheme": "One inspiring sentence summarising what this week is about",
  "activities": [
    {
      "id": "act-1",
      "type": "exercise",
      "subject": "Mathematics",
      "subjectColor": "#6366f1",
      "title": "Short, descriptive title (max 6 words)",
      "description": "1-2 sentences: what the student will do and why it matters for their goal",
      "question": "The actual problem, exercise, or task. Be specific and complete. For exercise/quiz include 2-3 problems.",
      "hint": "A gentle nudge — points toward the approach without revealing the answer",
      "durationMin": 25,
      "difficulty": "foundation",
      "milestoneRef": "Which milestone or habit this serves"
    }
  ]
}

Type values: "exercise" | "quiz" | "todo" | "reading"
Difficulty values: "foundation" | "developing" | "advanced"
Subject colours: Mathematics #6366f1, English/Reading #10b981, Science #f59e0b, History #ef4444, Test Prep #8b5cf6, Other #0ea5e9`

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: model || 'claude-opus-4-6',
      max_tokens: 3500,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].text.trim()
    // Strip markdown code fences if the model wraps the JSON
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(json)
    res.json(parsed)
  } catch (err) {
    console.error('generate-weekly error:', err)
    res.status(500).json({ error: err.message || 'Generation failed' })
  }
}
