// 飞书推送 - 无需任何 AI API

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const webhookUrl = process.env.FEISHU_WEBHOOK
  if (!webhookUrl) return res.status(500).json({ error: 'Feishu webhook not configured' })

  const { analysis, scripts } = req.body
  const today = new Date().toLocaleDateString('zh-CN')

  const scriptText = (scripts || []).slice(0, 3).map((s, i) =>
    `**脚本${i + 1}·${s.style}**\n📌 ${s.title}\n⚡ Hook：${s.hook}\n💰 转化：${s.conversion_design?.slice(0, 60) || s.cta?.slice(0, 60) || ''}`
  ).join('\n\n')

  const card = {
    msg_type: 'interactive',
    card: {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: `🤖 AI内容日报 · ${today}` },
        template: 'red',
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**📈 今日核心趋势**\n${analysis.core_trend}\n\n**💡 变现机会点**\n${analysis.douyin_opportunity}`,
          },
        },
        { tag: 'hr' },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**🔥 热门话题**\n${(analysis.content_factors?.hot_topics || []).slice(0, 5).map(t => `#${t}`).join('  ')}`,
          },
        },
        ...(analysis.top_picks?.length ? [{
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**⭐ 今日最佳选题**\n${analysis.top_picks.map(p => `• ${p.title}\n  改编：${p.adaptation_angle}`).join('\n')}`,
          },
        }] : []),
        { tag: 'hr' },
        {
          tag: 'div',
          text: { tag: 'lark_md', content: `**✍️ 今日脚本**\n\n${scriptText}` },
        },
        {
          tag: 'note',
          elements: [{ tag: 'plain_text', content: `AI内容猎手自动生成 · ${new Date().toLocaleTimeString('zh-CN')}` }],
        },
      ],
    },
  }

  try {
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    })
    const result = await r.json()
    if (result.code !== 0) return res.status(400).json({ error: result.msg || 'Feishu error' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
