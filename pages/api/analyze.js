// 分析模块 - 聚焦5类选材方向 + 知识变现博主视角

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' })

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

  const prompt = `你是一位资深AI科技博主的内容策略顾问，服务对象是一位技术出身、面向非技术普通大众的抖音博主，变现路径是：知识分享 → 私域沉淀 → 卖课/卖书/卖资料包。

【选材5大方向（按变现潜力排序）】
① AI工具实操教程 —— 让人看完想立刻跟着做，收藏率高，易转化付费教程
② 普通人用AI赚钱的真实案例 —— 利益驱动最强，最容易带动私域涌入
③ AI新功能首发体验 —— 时效性强，蹭热点窗口期，快速涨粉
④ Prompt/Workflow技巧分享 —— 实用价值高，可延伸为付费资料包
⑤ AI与教育/职场结合实践 —— 受众广，职场人群付费意愿强

【今日待分析内容】
===YouTube（按抖音适配度排序）===
${ytSummary || '暂无YouTube数据'}

===X.com（近3天热帖）===
${xSummary || '暂无X.com数据'}

请从变现博主视角深度分析，严格返回以下JSON（不要其他文字）：
{
  "content_factors": {
    "insights": [
      "结合具体内容的洞察1（举例说明哪条内容符合哪个选材方向）",
      "洞察2",
      "洞察3",
      "洞察4"
    ],
    "hot_topics": ["话题1", "话题2", "话题3", "话题4", "话题5"]
  },
  "opinion_factors": {
    "insights": [
      "哪种观点角度最能让非技术受众产生震撼+学习欲",
      "观点洞察2",
      "观点洞察3"
    ],
    "angles": ["震撼感角度", "实用感角度", "危机感角度", "机会感角度"]
  },
  "format_factors": {
    "insights": [
      "什么样的展示形式最能触发'我也想学'的冲动",
      "形式洞察2",
      "形式洞察3"
    ],
    "techniques": ["before/after对比", "数字冲击", "技巧1", "技巧2"]
  },
  "core_trend": "一句话：今天最值得蹭的AI实践热点（要具体，不要泛泛而谈）",
  "douyin_opportunity": "结合变现路径，今天最大的内容机会点是什么，以及如何设计从视频→私域→付费的完整路径",
  "top_picks": [
    {
      "source": "YouTube 或 X.com",
      "title": "原内容标题或核心内容概述",
      "category": "属于5大方向中的哪一类",
      "why_adapt": "为什么这条最值得改编（从震撼感+学习欲+变现角度各说一点）",
      "adaptation_angle": "建议的抖音改编角度（具体说明如何本土化、如何降低技术门槛）",
      "conversion_hook": "这条视频结尾的具体转化话术（给出可以直接念的口播文案）"
    },
    {
      "source": "YouTube 或 X.com",
      "title": "第二推荐内容",
      "category": "分类",
      "why_adapt": "改编理由",
      "adaptation_angle": "改编角度",
      "conversion_hook": "转化话术"
    }
  ]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3500,
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
    res.status(500).json({ error: 'Failed to parse analysis result' })
  }
}
