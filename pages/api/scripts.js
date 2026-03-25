// 脚本生成 - 使用 Gemini API（免费：每天1500次）

async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 5000 },
    }),
  })
  if (!r.ok) {
    const err = await r.json()
    throw new Error(err.error?.message || `Gemini API error ${r.status}`)
  }
  const data = await r.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'Missing GEMINI_API_KEY. Get free key at aistudio.google.com (1500 requests/day free)'
    })
  }

  const { analysis } = req.body
  if (!analysis) return res.status(400).json({ error: 'Missing analysis data' })

  const picks = analysis.top_picks || []
  const pick1 = picks[0]
  const pick2 = picks[1]

  const prompt = `你是顶级抖音AI教学博主的专属编剧。博主技术出身，专门把AI讲给非技术普通大众听，变现方式是卖课、卖书、卖资料包，核心是通过视频内容引流进私域。

【今日选题数据】
核心趋势：${analysis.core_trend}
变现机会：${analysis.douyin_opportunity}
最佳选题1：${pick1 ? `${pick1.title}（${pick1.category}）\n改编角度：${pick1.adaptation_angle}\n转化话术：${pick1.conversion_hook}` : '根据趋势自选'}
最佳选题2：${pick2 ? `${pick2.title}（${pick2.category}）\n改编角度：${pick2.adaptation_angle}` : ''}
热门话题：${(analysis.content_factors?.hot_topics || []).join('、')}

【脚本铁律】
1. Hook 3秒内让普通人停下来：用结果/数字/强烈反差，绝不用AI术语
2. 每步骤具体可操作：动词+工具+结果，例如"打开Claude，输入'帮我把合同里的风险点列出来'，30秒给你分析报告"
3. 结尾自然引出私域，不突兀
4. 语言口语化，像聪明朋友在聊，不像教科书

生成3个脚本，覆盖不同受众和痛点。只返回JSON数组，不要其他任何文字、不要markdown代码块：
[
  {
    "id": 1,
    "style": "震撼演示向",
    "target": "目标受众及其核心痛点（一句话）",
    "title": "视频标题（含数字或强烈反差，25字以内）",
    "hook": "前3秒台词（直接展示结果或强烈反差问题，30字以内，无术语）",
    "intro": "0-15秒开场（建立共鸣，让观众觉得说的就是我，约50字）",
    "body": "15秒-1分30秒正文（3-4个具体步骤，每步说清楚做什么、怎么做、得到什么结果，约200字）",
    "cta": "结尾30秒口播（总结价值+引出私域，可直接念，约60字）",
    "hashtags": ["#AI实践","#话题2","#话题3","#话题4","#话题5"],
    "duration": "建议时长",
    "shooting_tips": "拍摄/录屏建议：设备、展示方式、需要准备的素材",
    "conversion_design": "①评论区置顶放什么内容 ②主页简介怎么写引导进私域 ③视频第几秒口播引导 ④用什么免费钩子吸引加私域（具体说明）"
  },
  {
    "id": 2,
    "style": "实操教程向",
    "target": "...",
    "title": "...",
    "hook": "...",
    "intro": "...",
    "body": "...",
    "cta": "...",
    "hashtags": ["..."],
    "duration": "...",
    "shooting_tips": "...",
    "conversion_design": "..."
  },
  {
    "id": 3,
    "style": "赚钱案例向",
    "target": "...",
    "title": "...",
    "hook": "...",
    "intro": "...",
    "body": "...",
    "cta": "...",
    "hashtags": ["..."],
    "duration": "...",
    "shooting_tips": "...",
    "conversion_design": "..."
  }
]`

  try {
    const text = await callGemini(apiKey, prompt)
    const clean = text.replace(/```json|```/g, '').trim()
    const match = clean.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array found in response')
    res.json({ scripts: JSON.parse(match[0]) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
