import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, apiKey, model } = req.body
  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })

  const chatText = messages
    .filter(m => m.content && m.content.length > 0)
    .map(m => `${m.sender === 'student' ? 'Student' : 'Tutor'}: ${m.content}`)
    .join('\n')

  if (!chatText.trim()) return res.json({ topics: [] })

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: model || 'claude-opus-4-6',
      max_tokens: 2048,
      system: `You are an educational analyst. Analyse a tutoring chat transcript and extract a structured knowledge base of what the student has learned.

Return ONLY valid JSON — no markdown, no explanation, just the JSON object.`,
      messages: [
        {
          role: 'user',
          content: `Analyse this tutoring chat and extract a knowledge base. For each concept/topic the student engaged with, create an entry.

Chat transcript:
${chatText}

Return this exact JSON structure:
{
  "topics": [
    {
      "id": "unique_slug",
      "subject": "Mathematics",
      "topic": "Topic name (e.g. Quadratic Equations)",
      "concept": "Specific concept (e.g. Factoring method)",
      "summary": "One sentence: what the student learned or struggled with",
      "mastery": "beginner|developing|confident",
      "evidence": "Brief quote or paraphrase from chat showing engagement",
      "suggestedExercise": "A short description of a useful exercise for this concept"
    }
  ]
}

If the chat is too short or off-topic, return { "topics": [] }.`,
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
    console.error('Knowledge extraction error:', err)
    res.status(500).json({ error: err.message })
  }
}
