export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' })

  const { analysis } = req.body
  if (!analysis) return res.status(400).json({ error: 'Missing analysis data' })

  const prompt = `你是顶级抖音AI科技博主的创作团队。基于以下分析生成3个抖音视频脚本：

今日核心趋势：${analysis.core_trend}
机会点：${analysis.douyin_opportunity}
热门话题：${(analysis.content_factors?.hot_topics || []).join('、')}
爆火角度：${(analysis.opinion_factors?.angles || []).join('、')}

生成3个不同受众的脚本：1.科技极客向 2.普通大众向 3.职场人群向

返回JSON数组：
[
  {
    "id": 1,
    "style": "科技极客向",
    "target": "目标受众",
    "title": "视频标题（含数字或悬念，吸睛）",
    "hook": "前3秒台词（制造强烈悬念，让人停下来）",
    "intro": "0-15秒开场内容",
    "body": "15秒-1分钟核心内容（3-4个要点）",
    "cta": "结尾互动引导话术",
    "hashtags": ["标签1","标签2","标签3","标签4","标签5"],
    "duration": "建议时长",
    "shooting_tips": "拍摄建议"
  }
]

要求：Hook必须3秒内制造悬念；语言口语化接地气；结合今日热点；完整可拍摄。只返回JSON数组。`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
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
    const match = clean.match(/\[[\s\S]*\]/)
    res.json({ scripts: match ? JSON.parse(match[0]) : [] })
  } catch {
    res.status(500).json({ error: 'Failed to parse scripts' })
  }
}
