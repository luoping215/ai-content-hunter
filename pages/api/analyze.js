// 分析模块 - 使用 Gemini API（免费：每天1500次）
// 申请 Key：https://aistudio.google.com → Get API Key（用 Google 账号登录即可）

async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 3500 },
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

  const { videos = [], posts = [] } = req.body

  const topVideos = [...videos]
    .sort((a, b) => (b.douyinFit || 0) - (a.douyinFit || 0))
    .slice(0, 8)

  const categoryLabel = {
    tutorial: 'AI实操教程',
    monetization: 'AI赚钱案例',
    newfeature: 'AI新功能首发',
    prompt: 'Prompt/Workflow技巧',
    career: 'AI职场/教育',
  }

  const ytSummary = topVideos.map(v =>
    `[${categoryLabel[v.category] || 'AI内容'} | 震撼度:${v.wowScore || 0} | 实践分:${v.practiceScore || 0}]\n标题: ${v.title}\n频道: ${v.channel}\n描述: ${v.description}`
  ).join('\n\n')

  const xSummary = posts.slice(0, 8).map(p =>
    `[${p.topic} | 热度:${p.engagement}]\n内容: ${p.content}\n爆火原因: ${p.why_viral}`
  ).join('\n\n')

  const prompt = `你是一位资深AI科技博主的内容策略顾问，服务对象是技术出身、面向非技术普通大众的抖音博主，变现路径是：知识分享 → 私域沉淀 → 卖课/卖书/卖资料包。

【选材5大方向（按变现潜力排序）】
① AI工具实操教程 —— 收藏率高，易转化付费教程
② 普通人用AI赚钱的真实案例 —— 利益驱动最强，最容易带动私域涌入
③ AI新功能首发体验 —— 时效性强，快速涨粉
④ Prompt/Workflow技巧分享 —— 可延伸为付费资料包
⑤ AI与教育/职场结合实践 —— 受众广，职场人群付费意愿强

【今日待分析内容】
===YouTube（按抖音适配度排序）===
${ytSummary || '暂无YouTube数据'}

===X.com（近3天热帖）===
${xSummary || '暂无X.com数据'}

请从变现博主视角深度分析，只返回如下JSON，不要其他任何文字、不要markdown代码块：
{
  "content_factors": {
    "insights": ["洞察1（举具体内容举例）","洞察2","洞察3","洞察4"],
    "hot_topics": ["话题1","话题2","话题3","话题4","话题5"]
  },
  "opinion_factors": {
    "insights": ["哪种观点最能让非技术受众产生震撼+学习欲","洞察2","洞察3"],
    "angles": ["震撼感角度","实用感角度","危机感角度","机会感角度"]
  },
  "format_factors": {
    "insights": ["什么展示形式最能触发我也想学的冲动","洞察2","洞察3"],
    "techniques": ["before/after对比","数字冲击","技巧3","技巧4"]
  },
  "core_trend": "今天最值得蹭的AI实践热点（具体，不泛泛）",
  "douyin_opportunity": "今天最大的内容机会点，以及如何设计视频→私域→付费的完整路径",
  "top_picks": [
    {
      "source": "YouTube或X.com",
      "title": "原内容标题或概述",
      "category": "5大方向中的哪类",
      "why_adapt": "为什么值得改编（震撼感+学习欲+变现角度各一点）",
      "adaptation_angle": "抖音改编角度（如何本土化、降低技术门槛）",
      "conversion_hook": "结尾可以直接念的口播转化文案"
    },
    {
      "source": "YouTube或X.com",
      "title": "第二推荐",
      "category": "分类",
      "why_adapt": "改编理由",
      "adaptation_angle": "改编角度",
      "conversion_hook": "转化文案"
    }
  ]
}`

  try {
    const text = await callGemini(apiKey, prompt)
    const clean = text.replace(/```json|```/g, '').trim()
    // 提取第一个完整的 JSON 对象
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found in response')
    res.json(JSON.parse(match[0]))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
