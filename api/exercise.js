import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { topic, concept, mastery, apiKey, model, studentGoal } = req.body
  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })

  const difficultyMap = {
    beginner: 'foundational — build confidence with straightforward examples',
    developing: 'moderate — zone of proximal development, slightly challenging',
    confident: 'challenging — extend mastery and introduce the next prerequisite concept',
  }
  const difficulty = difficultyMap[mastery] || difficultyMap.developing

  try {
    const client = new Anthropic({ apiKey })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = await client.messages.stream({
      model: model || 'claude-opus-4-6',
      max_tokens: 1024,
      system: `You are ScholarPath Tutor generating a focused practice exercise.
You use the Socratic method: pose a clear problem, then guide the student to discover the answer rather than giving it outright.
Keep exercises age-appropriate, encouraging, and directly tied to the specified concept.`,
      messages: [
        {
          role: 'user',
          content: `Generate a single practice exercise for:
- Subject: Mathematics
- Topic: ${topic}
- Concept: ${concept}
- Student mastery level: ${mastery} (${difficulty})
- Student goal: ${studentGoal || 'academic excellence'}

Format your response exactly like this:

**Exercise: [short title]**

[Clear problem statement — 2-4 sentences. Make it concrete and engaging.]

*Hint: [A gentle hint that nudges without giving away the answer]*

---
When the student has tried, ask them to share their working and you'll guide them through it step by step.`,
        },
      ],
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Exercise generation error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
}
