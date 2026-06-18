import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { profile, apiKey, model } = req.body
  if (!apiKey) return res.status(400).json({ error: 'No API key' })

  // profile = { system, field, universityTier, specificUniversity, currentYear, currentGrade, studentName, strengths, weaknesses }

  const systemPrompt = `You are a world-class university admissions strategist and academic planner with deep knowledge of admissions requirements for the US, UK, Australian, and international university systems.

Generate a highly specific, actionable, year-by-year university preparation plan based on the student profile provided.

Your plan must be:
1. **Grounded in real admission requirements** — cite actual prerequisites, score ranges, and test requirements for the target field and university tier
2. **Backward-planned** — start from the application year and work backward to now
3. **Career-connected** — every subject and activity must be explicitly linked to the target career/field
4. **Realistic and honest** — include the hard truths about what competitive applications require
5. **System-specific** — use the correct grading system, tests, and curriculum for the specified education system

Return ONLY valid JSON with this exact structure:

{
  "summary": {
    "studentName": "string",
    "targetField": "string",
    "targetCareer": "string (specific career within the field)",
    "targetUniversityTier": "string",
    "exampleUniversities": ["list of 3-5 real universities matching the tier and field"],
    "educationSystem": "string",
    "currentYear": "string (e.g. Year 9 / Grade 9)",
    "applicationYear": "string (e.g. 2028)",
    "yearsRemaining": 3,
    "competitivenessBrief": "2-sentence honest assessment of how competitive this path is",
    "overallATARorEquivalent": "The score/grade needed (e.g. ATAR 99+, GPA 4.0, A*AA)"
  },
  "prerequisites": {
    "essential": [
      { "subject": "Mathematics", "why": "Required for all engineering programs", "targetGrade": "A / 90%+", "urgency": "critical|important|recommended" }
    ],
    "recommended": [
      { "subject": "Physics", "why": "Strongly preferred for engineering", "targetGrade": "A / 85%+", "urgency": "important" }
    ],
    "standardisedTests": [
      { "test": "SAT / ACT", "targetScore": "1550+ / 35+", "whenToTake": "Year 11 (first attempt)", "notes": "Allow time for a retake in Year 12" }
    ],
    "extracurriculars": [
      { "activity": "Maths Olympiad or competition", "why": "Demonstrates passion and ability beyond grades", "startBy": "Year 9" }
    ]
  },
  "yearlyPlan": [
    {
      "yearLabel": "Year 9 / Grade 9",
      "calendarYear": 2025,
      "theme": "Foundation Building",
      "focus": "One-sentence focus for this year",
      "subjects": [
        { "subject": "Mathematics Advanced", "priority": "critical|high|medium", "target": "90%+", "rationale": "Why this subject this year" }
      ],
      "milestones": [
        { "quarter": "Q1", "action": "Specific action", "category": "academic|test|extracurricular|application|wellbeing", "metric": "How to measure success" }
      ],
      "warningFlags": ["Any risks or common mistakes students make in this year"],
      "parentActions": ["What the parent should do or arrange this year"]
    }
  ],
  "applicationTimeline": [
    { "timeframe": "18 months before deadline", "action": "Begin drafting personal statement / common app essay", "category": "application" }
  ],
  "subjectDeepDives": [
    {
      "subject": "Chemistry",
      "currentPriority": "high",
      "whyItMatters": "Direct prerequisite for medicine — no exceptions at top universities",
      "topicsThatMatter": ["Organic chemistry", "Biochemistry basics", "Periodic table mastery"],
      "resourceSuggestions": ["Khan Academy Chemistry", "Past HSC/VCE/A-level papers"]
    }
  ],
  "careerInsights": {
    "dayInTheLife": "What a typical day looks like in this career",
    "salaryRange": "Realistic salary range (entry → senior)",
    "jobMarketOutlook": "2025-2035 outlook for this field",
    "alternativePaths": ["Alternative careers if they change direction mid-degree"],
    "universityMatters": "Whether the specific university name matters for this career (be honest)"
  },
  "parentChecklist": [
    { "action": "Research selective school opportunities", "timing": "Now", "priority": "high" }
  ],
  "coachMessage": "A warm, motivating 2-3 sentence message personalised to this student and their specific goal"
}`

  try {
    const client = new Anthropic({ apiKey })

    const userMessage = `Generate a comprehensive university preparation plan for this student:

**Education System:** ${profile.system}
**Student Name:** ${profile.studentName || 'the student'}
**Current Year/Grade:** ${profile.currentYear}
**Target Field:** ${profile.field}
**Target Career (if specified):** ${profile.specificCareer || 'Not specified — use the most common career for this field'}
**University Tier:** ${profile.universityTier}
**Specific University (if named):** ${profile.specificUniversity || 'None — use the tier requirements'}
**Academic Strengths:** ${profile.strengths || 'Not provided'}
**Academic Weaknesses:** ${profile.weaknesses || 'Not provided'}
**Additional Context:** ${profile.additionalContext || 'None'}

Create a detailed, honest, system-specific year-by-year plan. Be concrete with scores, tests, and requirements. Do not be vague.`

    const response = await client.messages.create({
      model: model || 'claude-opus-4-6',
      max_tokens: 16000,
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
    console.error('University path error:', err)
    res.status(500).json({ error: err.message })
  }
}
