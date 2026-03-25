// 分析模块 - 无需任何 AI API
// 直接返回整理好的素材摘要，供用户手动粘贴到 Claude.ai

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { videos = [], posts = [] } = req.body

  const categoryLabel = {
    tutorial: 'AI实操教程',
    monetization: 'AI赚钱案例',
    newfeature: 'AI新功能首发',
    prompt: 'Prompt/Workflow技巧',
    career: 'AI职场/教育',
  }

  const topVideos = [...videos]
    .sort((a, b) => (b.douyinFit || 0) - (a.douyinFit || 0))
    .slice(0, 8)

  // 生成可直接粘贴到 Claude.ai 的 prompt
  const ytSection = topVideos.map((v, i) =>
    `${i + 1}. 【${categoryLabel[v.category] || 'AI内容'}】${v.title}\n   频道: ${v.channel} | 链接: ${v.url}\n   描述: ${v.description}`
  ).join('\n\n')

  const xSection = posts.slice(0, 8).map((p, i) =>
    `${i + 1}. 【${p.topic}·${p.engagement}】@${p.author}\n   内容: ${p.content}\n   爆火原因: ${p.why_viral}`
  ).join('\n\n')

  const claudePrompt = `你是一位资深AI科技博主的内容策略顾问，服务对象是技术出身、面向非技术普通大众的抖音博主，变现路径是：知识分享 → 私域沉淀 → 卖课/卖书/卖资料包。

【选材5大方向（按变现潜力排序）】
① AI工具实操教程 —— 收藏率高，易转化付费教程
② 普通人用AI赚钱的真实案例 —— 利益驱动最强，最容易带动私域涌入
③ AI新功能首发体验 —— 时效性强，快速涨粉
④ Prompt/Workflow技巧分享 —— 可延伸为付费资料包
⑤ AI与教育/职场结合实践 —— 受众广，职场人群付费意愿强

【今日抓取内容】
===YouTube近3天高播放量AI视频===
${ytSection || '暂无数据'}

===X.com近3天热帖===
${xSection || '暂无数据'}

请完成两件事：

第一，从变现博主视角分析爆火因素，输出：
- 内容维度：4条洞察 + 5个热门话题
- 观点维度：3条洞察 + 4个角度
- 形式维度：3条洞察 + 4个技巧
- 今日核心趋势（一句话，具体）
- 抖音变现机会点（说清楚视频→私域→付费的路径）
- 今日最值得改编的2条内容（说明改编角度和结尾口播转化文案）

第二，生成3个抖音视频脚本（震撼演示向、实操教程向、赚钱案例向），每个脚本包含：
- 视频标题（25字以内，含数字或反差）
- 前3秒Hook（30字以内，无术语）
- 0-15秒开场
- 15秒-1分30秒正文（3-4个具体可操作步骤）
- 结尾CTA口播（含私域引导）
- hashtag推荐
- 转化路径设计（评论区/主页/口播时间点/免费钩子）`

  // 同时生成简版本地分析（基于规则，不调用AI）
  const hotTopics = extractHotTopics(topVideos, posts)
  const coreTrend = detectCoreTrend(topVideos, posts)

  res.json({
    // 供页面展示的本地分析结果
    content_factors: {
      insights: [
        `今日YouTube共抓取${topVideos.length}条内容，其中${topVideos.filter(v => v.category === 'tutorial').length}条教程类、${topVideos.filter(v => v.category === 'monetization').length}条赚钱案例类`,
        `X.com热帖中"viral"级别内容${posts.filter(p => p.engagement === 'viral').length}条，话题集中在${hotTopics.slice(0, 2).join('、')}`,
        `最高实践评分视频：「${topVideos[0]?.title?.slice(0, 30) || '暂无'}...」`,
        `今日内容适合抖音改编的共${topVideos.filter(v => (v.douyinFit || 0) > 8).length}条，建议优先选用`,
      ],
      hot_topics: hotTopics,
    },
    opinion_factors: {
      insights: [
        '实操演示类内容最能触发"我也想学"的冲动，尤其是有before/after对比的',
        '普通人视角（"我用AI做了XX"）比专家讲解更容易引发共鸣和转发',
        '数字化结果（省了X小时、赚了X元）比抽象描述更能刺激行动欲',
      ],
      angles: ['震撼效果展示', '手把手实操', '普通人赚钱案例', '职场效率提升'],
    },
    format_factors: {
      insights: [
        '录屏展示AI操作过程比纯口播效果好3-5倍，观众需要看到"怎么做"',
        '标题含具体数字（时间/金额/步骤数）点击率显著更高',
        '前3秒直接展示最终结果，再回来讲过程，完播率更高',
      ],
      techniques: ['before/after对比', '数字冲击标题', '结果前置Hook', '分步骤字幕'],
    },
    core_trend: coreTrend,
    douyin_opportunity: `今日最大机会：将YouTube高分内容本土化，用"普通人也能做到"角度切入，结尾引导加微信领取免费资料包，沉淀私域后推付费课程`,
    top_picks: topVideos.slice(0, 2).map(v => ({
      source: 'YouTube',
      title: v.title,
      category: categoryLabel[v.category] || 'AI内容',
      why_adapt: `实践评分${v.practiceScore}分、震撼度${v.wowScore}分，适合抖音改编`,
      adaptation_angle: `用"普通人3步做到"框架重构，加入中文场景举例`,
      conversion_hook: `"我把完整的操作步骤和提示词都整理好了，评论区扣1，我私信给你"`,
    })),
    // 供用户复制到 Claude.ai 的完整 prompt
    claude_prompt: claudePrompt,
    // 统计信息
    stats: {
      youtube_count: topVideos.length,
      x_count: posts.length,
      top_video: topVideos[0]?.title || '',
      top_post: posts[0]?.content?.slice(0, 50) || '',
    },
  })
}

function extractHotTopics(videos, posts) {
  const topics = []
  const catCount = {}
  videos.forEach(v => { catCount[v.category] = (catCount[v.category] || 0) + 1 })
  if (catCount.tutorial > 0) topics.push('AI实操教程')
  if (catCount.monetization > 0) topics.push('AI赚钱案例')
  if (catCount.newfeature > 0) topics.push('AI新功能')
  if (catCount.prompt > 0) topics.push('Prompt技巧')
  if (catCount.career > 0) topics.push('AI职场应用')
  posts.slice(0, 3).forEach(p => { if (p.topic && !topics.includes(p.topic)) topics.push(p.topic) })
  return topics.slice(0, 5)
}

function detectCoreTrend(videos, posts) {
  const cats = videos.map(v => v.category)
  const topCat = ['monetization', 'tutorial', 'newfeature', 'prompt', 'career']
    .find(c => cats.includes(c))
  const labels = {
    monetization: '普通人用AI赚钱的真实案例正在爆发，变现类内容窗口期已到',
    tutorial: 'AI工具实操教程需求激增，手把手教学内容供不应求',
    newfeature: 'AI新功能密集发布，第一时间体验类内容流量红利显著',
    prompt: 'Prompt和工作流技巧分享热度持续，可复用资料变现潜力大',
    career: 'AI与职场结合的内容受众快速扩大，职场人群付费意愿强',
  }
  return labels[topCat] || '今日AI实践内容热度整体偏高，建议结合实操演示切入'
}
