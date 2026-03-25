// YouTube 抓取 - 精准对齐5类选材方向

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'YouTube API key not configured' })

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const publishedAfter = threeDaysAgo.toISOString()

  // 5类选材方向，每类2个搜索词，保证覆盖
  const queries = [
    // 1. AI工具实操教程
    { q: 'AI tool tutorial beginners step by step 2026', category: 'tutorial' },
    { q: 'how to use ChatGPT Claude Gemini workflow hands-on', category: 'tutorial' },
    // 2. 普通人用AI赚钱
    { q: 'earn money with AI real example income 2026', category: 'monetization' },
    { q: 'AI side hustle business passive income case study', category: 'monetization' },
    // 3. AI新功能首发体验
    { q: 'new AI feature release first look amazing 2026', category: 'newfeature' },
    { q: 'AI model update mind blowing new capability', category: 'newfeature' },
    // 4. Prompt / Workflow 技巧
    { q: 'AI prompt engineering tips workflow productivity', category: 'prompt' },
    { q: 'ChatGPT prompts workflow automation productivity hacks', category: 'prompt' },
    // 5. AI与教育/职场
    { q: 'AI education learning career skills workplace 2026', category: 'career' },
    { q: 'AI replace job skill future work learn use', category: 'career' },
  ]

  // 各类别优先级（影响最终排序）
  const categoryPriority = {
    monetization: 5,  // 赚钱案例 ── 变现转化最强
    tutorial: 5,      // 实操教程 ── 带来学习欲
    newfeature: 4,    // 新功能   ── 时效性强
    prompt: 4,        // 技巧     ── 实用收藏高
    career: 3,        // 职场     ── 受众广
  }

  // 标题震撼度关键词
  const wowWords = [
    'mind-blowing', 'incredible', 'amazing', 'insane', 'shocking', 'game changer',
    'can\'t believe', 'blew my mind', 'everyone needs', 'you need to see this',
    'nobody talks about', 'changed everything', '10x', '100x', 'in minutes',
  ]

  // 排除词：纯学术/股票/政治
  const excludeWords = [
    'research paper', 'arxiv', 'stock', 'invest', 'crypto', 'trading',
    'political', 'regulation', 'lawsuit', 'earnings call',
  ]

  const allVideos = []
  const seen = new Set()

  for (const { q, category } of queries) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&maxResults=5&relevanceLanguage=en&key=${apiKey}`
      const r = await fetch(url)
      if (!r.ok) {
        const err = await r.json()
        return res.status(400).json({ error: err.error?.message || 'YouTube API error' })
      }
      const data = await r.json()

      for (const item of data.items || []) {
        const id = item.id.videoId
        if (seen.has(id)) continue
        seen.add(id)

        const title = item.snippet.title || ''
        const desc = item.snippet.description || ''
        const text = (title + ' ' + desc).toLowerCase()

        if (excludeWords.some(w => text.includes(w))) continue

        const wowScore = wowWords.filter(w => text.includes(w)).length
          + (/\d+\s+(ways|tools|tips|tricks|prompts|steps|minutes|seconds)/.test(text) ? 1 : 0)
          + (text.includes('?') ? 0.5 : 0)

        const practiceScore = [
          'tutorial', 'how to', 'step by step', 'beginner', 'hands-on',
          'workflow', 'prompt', 'automate', 'real', 'example', 'earn',
          'money', 'build', 'create', 'guide', 'case study',
        ].filter(w => text.includes(w)).length

        const priority = categoryPriority[category] || 2
        const douyinFit = priority * 2 + practiceScore * 1.5 + wowScore * 1.2

        allVideos.push({
          id,
          title,
          channel: item.snippet.channelTitle,
          description: desc.slice(0, 150),
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails?.medium?.url,
          url: `https://youtube.com/watch?v=${id}`,
          category,
          wowScore,
          practiceScore,
          douyinFit,
        })
      }

      await new Promise(r => setTimeout(r, 200))
    } catch (e) {
      console.error('YouTube fetch error:', e.message)
    }
  }

  const sorted = allVideos
    .sort((a, b) => b.douyinFit - a.douyinFit)
    .slice(0, 15)

  res.json({ videos: sorted })
}
