import Anthropic from '@anthropic-ai/sdk'

// 7-step intake based on:
// - WOOP (Oettingen 2014): Wish → Outcome → Obstacle → Plan
// - Goal Setting Theory (Locke & Latham 1990/2002): specific + challenging goals
// - Self-Determination Theory (Deci & Ryan): intrinsic motivation
// - Implementation Intentions (Gollwitzer 1999): if-then obstacle planning
// - Backward planning: start from end goal, work backward to milestones

const STEPS = [
  {
    step: 1,
    framework: 'WOOP — Wish',
    question: "Let's start with the big picture. What's your dream — where do you want to be in 5 to 10 years? Don't hold back, think big. 🌟",
  },
  {
    step: 2,
    framework: 'Goal Setting Theory — Specific Target',
    question: "Great! Now let's make that concrete. What specific goal are you working toward? For example: a particular university or program, a career, a specific exam score, or a scholarship.",
  },
  {
    step: 3,
    framework: 'Backward Planning — Timeline',
    question: "To map your path, I need to know where you are now. What year/grade are you currently in, and when is your target year or deadline?",
  },
  {
    step: 4,
    framework: 'Gap Analysis — Current Baseline',
    question: "Now let's look at where you're starting from. How are you currently performing in your key subjects? What are your strongest areas, and where do you feel you need the most work?",
  },
  {
    step: 5,
    framework: 'SDT + WOOP — Outcome & Intrinsic Motivation',
    question: "This is important: *why* does this goal matter to you personally? Imagine you've achieved it — how do you feel? What does it mean for your life? The stronger your 'why', the more resilient you'll be. 💪",
  },
  {
    step: 6,
    framework: 'WOOP — Obstacle (Mental Contrasting)',
    question: "Now the honest part. What stands between you and this goal? Think about both internal obstacles (habits, focus, confidence) and external ones (time, resources, competing demands). What has tripped you up before?",
  },
  {
    step: 7,
    framework: 'Implementation Intentions — Resources & Plan',
    question: "Last question! What do you have going *for* you? This includes: time available for study each week, family or tutor support, personal strengths, or anything else that will help you succeed. Every advantage counts! 🎯",
  },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, currentStep, apiKey, model } = req.body
  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })

  const step = STEPS[currentStep - 1] || STEPS[STEPS.length - 1]
  const isLastStep = currentStep >= STEPS.length

  const systemPrompt = `You are a warm, expert goal-setting coach for ScholarPath — an AI tutoring platform for students.

You are conducting a structured 7-step goal-setting intake interview grounded in:
- WOOP framework (Gabriele Oettingen): Wish → Outcome → Obstacle → Plan
- Goal Setting Theory (Locke & Latham): specific, challenging, committed goals outperform vague ones
- Self-Determination Theory (Deci & Ryan): intrinsic motivation drives long-term success
- Implementation Intentions (Gollwitzer): "When [obstacle], I will [action]" planning
- Backward planning: start from the end goal, reverse-engineer milestones

Current step: ${currentStep} of 7 — Framework: "${step.framework}"

Rules:
- Respond to the student's answer warmly and briefly (1–2 sentences acknowledging what they said)
- ${isLastStep
    ? 'This was the FINAL question. Acknowledge their answer warmly, tell them you have everything needed to build their personalised roadmap, and end with exactly this token on its own line: [PLAN_READY]'
    : `Then naturally ask step ${currentStep + 1}: "${STEPS[currentStep]?.question}"`
  }
- Keep your entire response to 3–4 sentences max
- Be encouraging, non-judgmental, and age-appropriate
- Never reveal the framework names to the student — just be natural
- If the student gives a vague answer, ask ONE brief clarifying question before moving on`

  try {
    const client = new Anthropic({ apiKey })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = await client.messages.stream({
      model: model || 'claude-opus-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    })

    let fullText = ''
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
      }
    }

    const planReady = fullText.includes('[PLAN_READY]')
    res.write(`data: ${JSON.stringify({ done: true, planReady })}\n\n`)
    res.end()
  } catch (err) {
    console.error('Goal intake error:', err)
    if (!res.headersSent) res.status(500).json({ error: err.message })
    else { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end() }
  }
}
