import Anthropic from '@anthropic-ai/sdk'
import { getCurrentDate, getCurrentYear } from './_utils.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { conversation, apiKey, model } = req.body
  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })

  const currentDate = getCurrentDate()
  const currentYear = getCurrentYear()
  const targetYearExample = currentYear + 3

  const transcript = conversation
    .filter(m => !m.content.includes('[PLAN_READY]'))
    .map(m => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.content}`)
    .join('\n\n')

  const systemPrompt = `You are an expert academic planner. Based on a goal-setting conversation, generate a comprehensive, evidence-based long-term academic plan.

Apply these frameworks rigorously:
1. **WOOP** (Oettingen): Articulate Wish, Outcome, Obstacles, and explicit if-then Plans for each obstacle
2. **Backward Planning**: Start from the target, reverse-engineer year-by-year milestones
3. **SMART Goals** (Locke & Latham): Every milestone must be Specific, Measurable, Achievable, Relevant, Time-bound
4. **Self-Determination Theory** (Deci & Ryan): Frame goals around intrinsic motivation (autonomy, competence, meaning) not just grades
5. **Implementation Intentions** (Gollwitzer): For each major obstacle, write "When [situation], I will [action]"
6. **Mastery Orientation**: Emphasise learning and growth over performance metrics alone

Return ONLY valid JSON — no markdown, no explanation. Use this exact structure:

{
  "goalStatement": "A single inspiring, SMART goal statement",
  "targetYear": ${targetYearExample},
  "currentYear": ${currentYear},
  "intrinsicWhy": "The deep personal reason this matters (from SDT — autonomy/competence/meaning)",
  "wishOutcome": "Vivid description of the desired future state",
  "yearsToGoal": 3,
  "roadmap": [
    {
      "year": ${currentYear},
      "label": "Foundation Year",
      "theme": "One-line theme for this year",
      "milestones": [
        {
          "quarter": "Q1",
          "title": "Milestone title",
          "description": "Specific, measurable action",
          "category": "academic|test|extracurricular|application|habit",
          "metric": "How success is measured (e.g. score ≥ 80%, habit ≥ 4×/week)"
        }
      ]
    }
  ],
  "subjectTargets": [
    {
      "subject": "Mathematics",
      "currentLevel": "Brief honest description",
      "targetLevel": "Specific measurable target",
      "keyActions": ["action 1", "action 2"]
    }
  ],
  "obstaclePlans": [
    {
      "obstacle": "The specific obstacle identified",
      "type": "internal|external",
      "implementationIntention": "When [specific situation], I will [specific action]",
      "contingency": "If the plan fails, I will..."
    }
  ],
  "weeklyHabits": [
    {
      "habit": "Habit description",
      "frequency": "e.g. 5×/week, daily, every Sunday",
      "rationale": "Why this habit matters for the goal (cite the framework — e.g. spaced repetition, deliberate practice)"
    }
  ],
  "keyDates": [
    {
      "date": "Month Year",
      "event": "Exam, application deadline, or milestone",
      "importance": "Why this date matters"
    }
  ],
  "sdtCheck": {
    "autonomy": "How the plan supports the student's own choices and values",
    "competence": "How the plan builds genuine skill and mastery",
    "relatedness": "How the student can connect this goal to people and community"
  },
  "coachNote": "A warm, personalised 2-3 sentence message to the student from their coach"
}`

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: model || 'claude-opus-4-6',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Today's date: ${currentDate}\n\nHere is the goal-setting conversation transcript. Generate the comprehensive plan:\n\n${transcript}`,
        },
      ],
    })

    const text = response.content[0].text.trim()
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const jsonText = (start !== -1 && end !== -1) ? text.slice(start, end + 1) : text
    const parsed = JSON.parse(jsonText)
    res.json(parsed)
  } catch (err) {
    console.error('Goal plan error:', err)
    res.status(500).json({ error: err.message })
  }
}
