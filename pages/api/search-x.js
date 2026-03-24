export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' })

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const prompt = `Today is ${today}. Search X.com (Twitter) for the most viral AI-related posts from the past 3 days.

Find posts about: AI breakthroughs, new models, AI tools, ChatGPT, Claude, Gemini, AI agents, LLMs, robotics AI, AI art.

Return a JSON array of the top 8 most viral posts:
[
  {
    "author": "handle",
    "content": "post summary in Chinese (2-3 sentences)",
    "topic": "main topic tag",
    "engagement": "viral|high|medium",
    "why_viral": "why it went viral in Chinese (1 sentence)",
    "url": "x.com url if known or empty string"
  }
]

Focus on posts generating massive discussion or controversy. Return ONLY the JSON array.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    return res.status(400).json({ error: err.error?.message || 'Anthropic API error' })
  }

  const data = await response.json()
  const textBlock = data.content.find(b => b.type === 'text')
  if (!textBlock) return res.json({ posts: [] })

  try {
    const clean = textBlock.text.replace(/```json|```/g, '').trim()
    const match = clean.match(/\[[\s\S]*\]/)
    const posts = match ? JSON.parse(match[0]) : []
    res.json({ posts: Array.isArray(posts) ? posts : [] })
  } catch {
    res.json({ posts: [] })
  }
}
