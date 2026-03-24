export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' })

  const { videos = [], posts = [] } = req.body

  const ytSummary = videos.slice(0, 6).map(v =>
    `[YouTube] ${v.title} | ${v.channel} | ${v.description}`
  ).join('\n')

  const xSummary = posts.slice(0, 6).map(p =>
    `[X.com] @${p.author} | ${p.content} | 爆火原因: ${p.why_viral}`
  ).join('\n')

  const prompt = `你是资深AI内容分析师。分析以下近3天在YouTube和X.com爆火的AI内容：

===YouTube===
${ytSummary || '暂无数据'}

===X.com===
${xSummary || '暂无数据'}

从三个维度分析爆火因素，返回严格JSON：
{
  "content_factors": {
    "insights": ["洞察1","洞察2","洞察3","洞察4"],
    "hot_topics": ["话题1","话题2","话题3","话题4","话题5"]
  },
  "opinion_factors": {
    "insights": ["观点1","观点2","观点3"],
    "angles": ["角度1","角度2","角度3","角度4"]
  },
  "format_factors": {
    "insights": ["形式1","形式2","形式3"],
    "techniques": ["技巧1","技巧2","技巧3","技巧4"]
  },
  "core_trend": "一句话总结今日AI内容核心爆点",
  "douyin_opportunity": "抖音创作者最大的机会点"
}

只返回JSON。`

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
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    return res.status(400).json({ error: err.error?.message })
  }

  const data = await response.json()
  const text = data.content.find(b => b.type === 'text')?.text || ''
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    res.json(JSON.parse(clean))
  } catch {
    res.status(500).json({ error: 'Failed to parse analysis' })
  }
}
