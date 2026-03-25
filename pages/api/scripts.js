// 脚本生成模块 - 无需任何 AI API
// 返回空脚本占位，实际脚本由用户粘贴 claude_prompt 到 Claude.ai 生成

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  // 脚本生成已集成到 analyze 返回的 claude_prompt 中
  // 此接口返回提示，引导用户使用一键复制功能
  res.json({ scripts: [], use_claude_prompt: true })
}
