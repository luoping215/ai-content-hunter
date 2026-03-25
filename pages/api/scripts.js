// 脚本生成 - 对齐5类选材方向，每类一个脚本，附完整转化路径

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' })

  const { analysis } = req.body
  if (!analysis) return res.status(400).json({ error: 'Missing analysis data' })

  const picks = analysis.top_picks || []
  const pick1 = picks[0]
  const pick2 = picks[1]

  const prompt = `你是一位顶级抖音AI教学博主的专属编剧。博主是技术出身、专门把AI讲给非技术的普通大众听，变现方式是卖课、卖书、卖资料包，核心是通过视频内容把流量引入私域。

【今日选题数据】
核心趋势：${analysis.core_trend}
变现机会：${analysis.douyin_opportunity}

最佳选题1：${pick1 ? `${pick1.title}（类别：${pick1.category}）\n改编角度：${pick1.adaptation_angle}\n建议转化话术：${pick1.conversion_hook}` : '根据趋势自选'}
最佳选题2：${pick2 ? `${pick2.title}（类别：${pick2.category}）\n改编角度：${pick2.adaptation_angle}` : ''}

热门话题：${(analysis.content_factors?.hot_topics || []).join('、')}

【脚本创作铁律】
1. Hook必须3秒内让普通人停下来 → 用结果/数字/强烈反差，绝对不用AI术语
2. 内容必须让人有"震撼感"+"我也能学会"的双重感受
3. 每个步骤必须具体可操作，不能说"用AI生成内容"这种模糊表达
4. 结尾必须有自然不突兀的转化设计，引导进私域或付费
5. 语言口语化，像聪明的朋友在讲，不像教科书

请生成3个脚本，分别对应今日最值得做的3个方向，返回JSON数组：
[
  {
    "id": 1,
    "style": "震撼演示向（首选：${pick1?.category || 'AI实操教程'}）",
    "target": "目标受众（一句话描述这类人的痛点）",
    "title": "视频标题（含具体数字或强烈反差，25字以内，不用'：'）",
    "hook": "前3秒台词（直接展示震撼结果 或 提出强烈反差问题，不超过30字，无术语）",
    "intro": "0-15秒开场：用最简单的语言建立共鸣，让观众觉得'说的就是我'（约50字）",
    "body": "15秒-1分30秒正文：3-4个具体步骤，每步说清楚做什么、怎么做、会得到什么结果（约200字）",
    "cta": "结尾30秒：总结价值 + 自然引出私域，给出可以直接念的口播文案（约60字）",
    "hashtags": ["#AI实践", "#话题2", "#话题3", "#话题4", "#话题5"],
    "duration": "建议时长（如：60-90秒）",
    "shooting_tips": "拍摄/录屏建议：用什么设备、怎么展示操作过程、需要准备什么素材",
    "conversion_design": "完整转化路径设计：①评论区置顶放什么 ②主页简介怎么写 ③视频内口播在哪个时间点引导 ④引导进私域的具体钩子（如免费资料、社群、答疑）"
  },
  {
    "id": 2,
    "style": "实操教程向",
    "target": "...",
    ...
  },
  {
    "id": 3,
    "style": "赚钱案例向",
    "target": "...",
    ...
  }
]

重要：
- conversion_design必须给出4个具体细节，不能笼统说"引导关注"
- body里的每个步骤要有动词+工具+结果，例如"打开Claude，输入这句话：'帮我把这份合同里的风险点列出来'，它会在30秒内给你一份分析报告"
- 3个脚本要明显不同，覆盖不同的受众和痛点

只返回JSON数组，不要其他文字。`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5000,
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
