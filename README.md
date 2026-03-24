# AI 内容猎手 · 抖音脚本工厂

每天自动抓取 YouTube 和 X.com 上的 AI 爆款内容，分析爆火因素，生成抖音视频脚本，推送到飞书。

## 部署步骤（约20分钟）

### 第一步：上传代码到 GitHub

1. 打开 https://github.com，注册/登录
2. 点右上角 "+" → "New repository"
3. 名字填 `ai-content-hunter`，选 Private，点 "Create repository"
4. 在你电脑终端运行：

```bash
cd ai-content-hunter
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/你的用户名/ai-content-hunter.git
git push -u origin main
```

### 第二步：部署到 Vercel

1. 打开 https://vercel.com，用 GitHub 账号登录
2. 点 "Add New Project"
3. 找到 `ai-content-hunter`，点 "Import"
4. 点 "Environment Variables"，添加以下3个变量：

| 变量名 | 值 |
|--------|-----|
| `ANTHROPIC_API_KEY` | 你的 Anthropic Key (sk-ant-...) |
| `YOUTUBE_API_KEY` | 你的 YouTube Key (AIza...) |
| `FEISHU_WEBHOOK` | 你的飞书 Webhook URL |

5. 点 "Deploy"，等待1-2分钟
6. 部署完成后点 "Visit" 即可访问！

### 本地开发（可选）

```bash
cp .env.example .env.local
# 编辑 .env.local 填入你的 Key
npm install
npm run dev
# 打开 http://localhost:3000
```

## 使用

- 每天早上打开网址，点「开始今日分析」
- 页面保持打开时，8:00 自动触发
- 结果自动推送到飞书
