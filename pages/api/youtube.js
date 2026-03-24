export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'YouTube API key not configured' })

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const publishedAfter = threeDaysAgo.toISOString()

  const queries = ['artificial intelligence 2026', 'AI model release', 'ChatGPT Claude Gemini']
  const allVideos = []
  const seen = new Set()

  for (const q of queries) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&maxResults=6&key=${apiKey}`
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
        allVideos.push({
          id,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          description: item.snippet.description?.slice(0, 120),
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails?.medium?.url,
          url: `https://youtube.com/watch?v=${id}`,
        })
      }
      await new Promise(r => setTimeout(r, 200))
    } catch (e) {
      console.error('YouTube fetch error:', e)
    }
  }

  res.json({ videos: allVideos.slice(0, 15) })
}
