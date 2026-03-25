// X.com 热帖搜索 - 使用 SerpAPI（免费100次/月）
// 申请免费 Key: https://serpapi.com → 注册后即得100次/月免费额度
// 无需信用卡，注册即用

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const serpKey = process.env.SERP_API_KEY
  if (!serpKey) {
    return res.status(500).json({
      error: 'Missing SERP_API_KEY. Get free key at serpapi.com (100 searches/month free)'
    })
  }

  // 针对5类核心选材方向的精准搜索词
  const queries = [
    // 1. AI工具实操教程
    'site:x.com AI tutorial workflow how to step by step 2026',
    // 2. 普通人用AI赚钱真实案例
    'site:x.com AI earn money income side hustle real example 2026',
    // 3. AI新功能首发体验
    'site:x.com new AI feature release first look amazing 2026',
    // 4. Prompt / workflow 技巧
    'site:x.com AI prompt tips workflow productivity mind-blowing 2026',
    // 5. AI与教育/职场结合
    'site:x.com AI education career job skills learning 2026',
  ]

  const allPosts = []
  const seen = new Set()

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        api_key: serpKey,
        engine: 'google',
        q,
        tbs: 'qdr:w', // past week（覆盖3天以上，避免漏内容）
        num: '5',
        gl: 'us',
        hl: 'en',
      })

      const r = await fetch(`https://serpapi.com/search.json?${params}`)
      if (!r.ok) {
        const err = await r.json()
        console.error('SerpAPI error:', err.error)
        continue
      }
      const data = await r.json()

      for (const item of (data.organic_results || [])) {
        const link = item.link || ''
        if (!link.includes('x.com') && !link.includes('twitter.com')) continue
        if (seen.has(link)) continue
        seen.add(link)

        const title = item.title || ''
        const snippet = item.snippet || ''
        const text = (title + ' ' + snippet).toLowerCase()

        allPosts.push({
          author: extractAuthor(link, title),
          content: cleanSnippet(snippet, title),
          topic: classifyTopic(text),
          engagement: scoreEngagement(allPosts.length, text),
          why_viral: whyViral(text),
          url: link,
          category: getCategory(text),
        })
      }

      // 控制请求频率，避免触发限制
      await new Promise(r => setTimeout(r, 400))
    } catch (e) {
      console.error('SerpAPI fetch error:', e.message)
    }
  }

  // 按变现潜力排序：赚钱案例 > 教程 > 新功能 > prompt > 职场
  const categoryOrder = { monetization: 0, tutorial: 1, newfeature: 2, prompt: 3, career: 4, other: 5 }
  const sorted = allPosts
    .sort((a, b) => (categoryOrder[a.category] ?? 5) - (categoryOrder[b.category] ?? 5))
    .slice(0, 12)

  res.json({ posts: sorted })
}

function extractAuthor(url, title) {
  const match = url.match(/(?:x|twitter)\.com\/([^/?#]+)\/status/)
  if (match && match[1] !== 'i') return match[1]
  const titleMatch = title.match(/^(.+?)\s+on\s+(?:X|Twitter)/i)
  if (titleMatch) return titleMatch[1].trim()
  return 'X用户'
}

function cleanSnippet(snippet, title) {
  return snippet
    .replace(/^[A-Z][a-z]{2}\s+\d+,\s+\d{4}\s+[·•—]\s+/, '')
    .replace(/^(?:X|Twitter)\s+[·•—]\s+/, '')
    .trim() || title
}

function getCategory(text) {
  if (/earn|income|money|revenue|profit|side.?hustle|客户|赚/.test(text)) return 'monetization'
  if (/tutorial|how.?to|step.?by.?step|guide|beginner|hands.?on/.test(text)) return 'tutorial'
  if (/new|release|launch|just.?dropped|first.?look|update|announce/.test(text)) return 'newfeature'
  if (/prompt|workflow|automat|productivity|tips|tricks|hacks/.test(text)) return 'prompt'
  if (/job|career|education|learn|school|work|skill|hire/.test(text)) return 'career'
  return 'other'
}

function classifyTopic(text) {
  if (/earn|money|income|side.?hustle/.test(text)) return '💰 AI赚钱实践'
  if (/tutorial|how.?to|step.?by.?step/.test(text)) return '📚 AI实操教程'
  if (/new|release|launch|just.?dropped/.test(text)) return '🚀 AI新功能首发'
  if (/prompt|workflow/.test(text)) return '⚡ Prompt/Workflow'
  if (/job|career|education|learn/.test(text)) return '🎓 AI职场/教育'
  return '🤖 AI实践'
}

function scoreEngagement(index, text) {
  const hasWowWords = /amazing|mind.?blow|incredible|insane|game.?changer|wild|crazy/.test(text)
  if (index < 2 || hasWowWords) return 'viral'
  if (index < 6) return 'high'
  return 'medium'
}

function whyViral(text) {
  if (/earn|money|income|side.?hustle/.test(text))
    return '展示用AI赚钱的真实数字，利益驱动强，分享欲极强'
  if (/replace|job|career/.test(text))
    return '触发职场危机感，焦虑情绪推动大量转发讨论'
  if (/beginner|easy|simple|anyone/.test(text))
    return '"普通人也能做到"的代入感，降低学习门槛，收藏率高'
  if (/amazing|mind.?blow|incredible|wow/.test(text))
    return '效果远超预期的视觉冲击，"怎么做到的"好奇心爆发'
  if (/prompt/.test(text))
    return '可直接复制使用的提示词，即时实用价值，收藏转发率高'
  if (/workflow|automat/.test(text))
    return '完整可复制的自动化流程，省时效果显著，实践价值强'
  if (/new|release|launch/.test(text))
    return '第一时间体验新功能，满足科技早鸟的优越感和分享欲'
  if (/education|learn|school/.test(text))
    return 'AI改变学习/工作方式，受众广泛，职场人群强烈共鸣'
  return '聚焦AI实际应用场景，可操作性强，目标受众精准'
}
