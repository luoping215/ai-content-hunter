import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const STEP_LABELS = ['YouTube 抓取', 'X.com 搜索', '爆火因素分析', '抖音脚本生成', '飞书推送']

export default function Home() {
  const [step, setStep] = useState(-1) // -1=idle, 0-4=running, 5=done
  const [stepStatus, setStepStatus] = useState(Array(5).fill('idle')) // idle|active|done|error
  const [videos, setVideos] = useState([])
  const [posts, setPosts] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [scripts, setScripts] = useState([])
  const [logs, setLogs] = useState([])
  const [activeScript, setActiveScript] = useState(0)
  const [openSections, setOpenSections] = useState({})
  const [clock, setClock] = useState('')
  const [nextRun, setNextRun] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [running, setRunning] = useState(false)
  const logRef = useRef(null)

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('zh-CN', { hour12: false }))
      const next = new Date(now)
      next.setHours(8, 0, 0, 0)
      if (now >= next) next.setDate(next.getDate() + 1)
      const diff = next - now
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setNextRun(`每日08:00 · 下次 ${h}h${m}m 后`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  // Auto-run at 8am
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      if (now.getHours() === 8 && now.getMinutes() === 0 && now.getSeconds() < 5) {
        const key = `ran_${now.toDateString()}`
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, '1')
          startPipeline()
        }
      }
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const addLog = (msg, type = '') => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setLogs(l => [...l.slice(-80), { time, msg, type }])
  }

  const toast = (msg, ms = 3000) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), ms)
  }

  const setStepState = (idx, state) => {
    setStepStatus(s => s.map((v, i) => i === idx ? state : v))
  }

  const toggleSection = (key) => {
    setOpenSections(s => ({ ...s, [key]: !s[key] }))
  }

  const openSection = (key) => {
    setOpenSections(s => ({ ...s, [key]: true }))
  }

  async function startPipeline() {
    if (running) return
    setRunning(true)
    setStepStatus(Array(5).fill('idle'))
    setVideos([]); setPosts([]); setAnalysis(null); setScripts([])
    setLogs([]); setActiveScript(0)

    try {
      // Step 0: YouTube
      setStep(0); setStepState(0, 'active')
      addLog('开始抓取 YouTube 近3天 AI 热门视频…', 'info')
      const ytRes = await fetch('/api/youtube')
      const ytData = await ytRes.json()
      if (ytData.error) {
        addLog(`YouTube 错误: ${ytData.error}`, 'error')
        setStepState(0, 'error')
      } else {
        setVideos(ytData.videos || [])
        addLog(`✓ YouTube 获取 ${ytData.videos?.length || 0} 条内容`, 'success')
        setStepState(0, 'done')
        openSection('youtube')
      }

      // Step 1: X.com
      setStep(1); setStepState(1, 'active')
      addLog('调用 Claude 搜索 X.com 热帖…', 'info')
      const xRes = await fetch('/api/search-x')
      const xData = await xRes.json()
      if (xData.error) {
        addLog(`X.com 错误: ${xData.error}`, 'error')
        setStepState(1, 'error')
      } else {
        setPosts(xData.posts || [])
        addLog(`✓ X.com 获取 ${xData.posts?.length || 0} 条热帖`, 'success')
        setStepState(1, 'done')
        openSection('x')
      }

      // Step 2: Analyze
      setStep(2); setStepState(2, 'active')
      addLog('Claude 深度分析爆火因素…', 'info')
      const anRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos: ytData.videos || [], posts: xData.posts || [] }),
      })
      const anData = await anRes.json()
      if (anData.error) throw new Error(anData.error)
      setAnalysis(anData)
      addLog('✓ 爆火因素分析完成', 'success')
      setStepState(2, 'done')
      openSection('analysis')

      // Step 3: Scripts
      setStep(3); setStepState(3, 'active')
      addLog('生成3个抖音视频脚本…', 'info')
      const scRes = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: anData }),
      })
      const scData = await scRes.json()
      if (scData.error) throw new Error(scData.error)
      setScripts(scData.scripts || [])
      addLog(`✓ 生成 ${scData.scripts?.length || 0} 个视频脚本`, 'success')
      setStepState(3, 'done')
      openSection('scripts')

      // Step 4: Feishu
      setStep(4); setStepState(4, 'active')
      addLog('推送到飞书…', 'info')
      const fRes = await fetch('/api/feishu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: anData, scripts: scData.scripts }),
      })
      const fData = await fRes.json()
      if (fData.error) {
        addLog(`飞书推送失败: ${fData.error}`, 'error')
        setStepState(4, 'error')
      } else {
        addLog('✓ 飞书推送成功', 'success')
        setStepState(4, 'done')
        toast('🎉 已推送到飞书！')
      }

      setStep(5)
      addLog('─── 全流程完成 ───', 'success')
      toast('✅ 今日AI内容分析全部完成！', 4000)
    } catch (e) {
      addLog(`❌ ${e.message}`, 'error')
      toast(`❌ ${e.message}`, 5000)
    } finally {
      setRunning(false)
    }
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text)
    toast('✅ 已复制到剪贴板')
  }

  const engagementColor = (e) => ({
    viral: '#ff3c5f', high: '#ff9f1c', medium: '#00d4ff'
  }[e] || '#888')

  return (
    <>
      <Head>
        <title>AI 内容猎手 · 抖音脚本工厂</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;700&family=Noto+Serif+SC:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        {/* HEADER */}
        <header>
          <div className="logo">
            <div className="logo-mark">▲</div>
            <div>
              <div className="logo-name">AI 内容猎手</div>
              <div className="logo-sub">DOUYIN SCRIPT FACTORY</div>
            </div>
          </div>
          <div className="header-right">
            <div className="clock">{clock}</div>
            <div className="schedule">
              <span className="dot" />
              {nextRun}
            </div>
          </div>
        </header>

        <main>
          {/* PIPELINE */}
          <div className="pipeline">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="pipe-step">
                <div className={`pipe-node ${stepStatus[i]}`}>
                  {stepStatus[i] === 'done' ? '✓' : stepStatus[i] === 'error' ? '✕' : i + 1}
                </div>
                <div className="pipe-label">{label}</div>
                {i < 4 && <div className="pipe-arrow">›</div>}
              </div>
            ))}
          </div>

          {/* ACTION ROW */}
          <div className="action-row">
            <button className="btn-run" onClick={startPipeline} disabled={running}>
              {running ? '⏳ 运行中…' : '▶ 开始今日分析'}
            </button>
            <div className="log-panel" ref={logRef}>
              {logs.length === 0 && <span className="log-empty">日志将在运行后显示…</span>}
              {logs.map((l, i) => (
                <div key={i} className="log-line">
                  <span className="log-time">{l.time}</span>
                  <span className={`log-msg ${l.type}`}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: YOUTUBE */}
          <Section
            id="youtube" open={openSections.youtube} onToggle={() => toggleSection('youtube')}
            num="1" emoji="🎬" title="YouTube 近3天 AI 爆款视频"
            badge={videos.length ? `${videos.length} 条` : ''}
            status={stepStatus[0]}
            empty="等待抓取 YouTube 热门 AI 视频…"
          >
            <div className="card-grid">
              {videos.map((v, i) => (
                <a key={i} href={v.url} target="_blank" rel="noreferrer" className="content-card" style={{ textDecoration: 'none' }}>
                  <div className="card-platform yt">▶ YouTube</div>
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="card-thumb" />}
                  <div className="card-title">{v.title}</div>
                  <div className="card-meta">
                    <span>📺 {v.channel}</span>
                    <span>📅 {new Date(v.publishedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </a>
              ))}
            </div>
          </Section>

          {/* SECTION: X.COM */}
          <Section
            id="x" open={openSections.x} onToggle={() => toggleSection('x')}
            num="2" emoji="𝕏" title="X.com 近3天 AI 热帖"
            badge={posts.length ? `${posts.length} 条` : ''}
            status={stepStatus[1]}
            empty="AI 驱动搜索 X.com 热帖，无需 API 权限…"
          >
            <div className="card-grid">
              {posts.map((p, i) => (
                <div key={i} className="content-card">
                  <div className="card-platform x">𝕏 X.com</div>
                  <div className="card-title">{p.content}</div>
                  <div className="card-meta">
                    <span>👤 @{p.author}</span>
                    <span style={{ color: engagementColor(p.engagement) }}>🔥 {p.engagement}</span>
                  </div>
                  <div className="card-reason">💡 {p.why_viral}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* SECTION: ANALYSIS */}
          <Section
            id="analysis" open={openSections.analysis} onToggle={() => toggleSection('analysis')}
            num="3" emoji="🔥" title="爆火因素深度分析"
            badge="内容·观点·形式"
            status={stepStatus[2]}
            empty="Claude 将从内容、观点、形式三维度分析爆火因素…"
          >
            {analysis && (
              <div>
                <div className="trend-box">
                  <div className="trend-label">今日核心趋势</div>
                  <div className="trend-text">{analysis.core_trend}</div>
                </div>
                <div className="opp-box">
                  <div className="trend-label">抖音机会点</div>
                  <div className="opp-text">{analysis.douyin_opportunity}</div>
                </div>
                <div className="analysis-grid">
                  {[
                    { key: 'content_factors', color: '#ff3c5f', title: '内容维度', insights: analysis.content_factors?.insights, tags: analysis.content_factors?.hot_topics, tagColor: '#ff3c5f' },
                    { key: 'opinion_factors', color: '#ff9f1c', title: '观点维度', insights: analysis.opinion_factors?.insights, tags: analysis.opinion_factors?.angles, tagColor: '#ff9f1c' },
                    { key: 'format_factors', color: '#00d4ff', title: '形式维度', insights: analysis.format_factors?.insights, tags: analysis.format_factors?.techniques, tagColor: '#00d4ff' },
                  ].map(col => (
                    <div key={col.key} className="analysis-col">
                      <div className="analysis-col-title" style={{ borderLeftColor: col.color }}>{col.title}</div>
                      {(col.insights || []).map((ins, j) => (
                        <div key={j} className="analysis-insight">• {ins}</div>
                      ))}
                      <div className="tag-list">
                        {(col.tags || []).map((t, j) => (
                          <span key={j} className="tag" style={{ borderColor: col.tagColor + '66', color: col.tagColor }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* SECTION: SCRIPTS */}
          <Section
            id="scripts" open={openSections.scripts} onToggle={() => toggleSection('scripts')}
            num="4" emoji="✍️" title="抖音视频脚本"
            badge="3个方向 · 开箱即用"
            status={stepStatus[3]}
            empty="结合抖音平台特点，生成 Hook-内容-CTA 完整脚本…"
          >
            {scripts.length > 0 && (
              <div>
                <div className="script-tabs">
                  {scripts.map((s, i) => (
                    <button key={i} className={`script-tab ${i === activeScript ? 'active' : ''}`} onClick={() => setActiveScript(i)}>
                      {s.style}
                    </button>
                  ))}
                </div>
                {scripts[activeScript] && (() => {
                  const s = scripts[activeScript]
                  return (
                    <div className="script-body">
                      <div className="script-title-row">
                        <div className="script-video-title">{s.title}</div>
                        <button className="btn-copy" onClick={() => copyText(
                          `【${s.style}】\n标题：${s.title}\n\nHook：${s.hook}\n\n开场：${s.intro}\n\n正文：${s.body}\n\n结尾：${s.cta}\n\n标签：${(s.hashtags||[]).join(' ')}`
                        )}>📋 复制</button>
                      </div>
                      {[
                        { label: '⚡ HOOK · 前3秒', text: s.hook, cls: 'sb-hook' },
                        { label: '🎬 开场 · 0–15s', text: s.intro, cls: 'sb-intro' },
                        { label: '📖 正文 · 15s–1min', text: s.body, cls: 'sb-body' },
                        { label: '🎯 CTA · 收尾', text: s.cta, cls: 'sb-cta' },
                      ].map((b, i) => (
                        <div key={i} className={`script-block ${b.cls}`}>
                          <div className="sb-label">{b.label}</div>
                          <div className="sb-text">{b.text}</div>
                        </div>
                      ))}
                      <div className="script-footer">
                        <div>
                          <div className="meta-label">HASHTAGS</div>
                          <div className="tag-list">{(s.hashtags||[]).map((h,i)=><span key={i} className="tag">{h}</span>)}</div>
                        </div>
                        <div>
                          <div className="meta-label">时长建议</div>
                          <div className="duration">{s.duration}</div>
                        </div>
                      </div>
                      {s.shooting_tips && (
                        <div className="shooting-tips">🎥 拍摄建议：{s.shooting_tips}</div>
                      )}
                    </div>
                  )
                })()}
                <div className="script-actions">
                  <button className="btn-action" onClick={() => copyText(
                    scripts.map(s => `【${s.style}】\n标题：${s.title}\n\nHook：${s.hook}\n\n开场：${s.intro}\n\n正文：${s.body}\n\n结尾：${s.cta}\n\n标签：${(s.hashtags||[]).join(' ')}`).join('\n\n' + '─'.repeat(30) + '\n\n')
                  )}>📄 复制全部脚本</button>
                </div>
              </div>
            )}
          </Section>
        </main>
      </div>

      {/* TOAST */}
      {toastMsg && <div className="toast">{toastMsg}</div>}

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0a0f;
          --surface: #111118;
          --surface2: #1a1a24;
          --border: #2a2a3a;
          --accent: #ff3c5f;
          --accent2: #ff9f1c;
          --accent3: #00d4ff;
          --text: #e8e8f0;
          --text-dim: #6a6a8a;
          --text-mid: #a0a0c0;
          --green: #00ff9f;
        }
        html { font-size: 14px; }
        body { background: var(--bg); color: var(--text); font-family: 'JetBrains Mono', monospace; min-height: 100vh; }
        body::before {
          content: '';
          position: fixed; inset: 0;
          background-image: linear-gradient(rgba(255,60,95,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,60,95,.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none; z-index: 0;
        }
        .app { position: relative; z-index: 1; }

        header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 32px;
          border-bottom: 1px solid var(--border);
          background: rgba(10,10,15,.85);
          backdrop-filter: blur(10px);
          position: sticky; top: 0; z-index: 100;
        }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-mark {
          width: 36px; height: 36px;
          background: var(--accent);
          clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
          display: grid; place-items: center;
          font-size: 14px; font-weight: 700;
        }
        .logo-name { font-family: 'Noto Serif SC', serif; font-size: 17px; font-weight: 900; }
        .logo-sub { font-size: 9px; color: var(--text-dim); letter-spacing: .2em; }
        .header-right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .clock {
          font-size: 12px; color: var(--accent3);
          padding: 5px 12px;
          border: 1px solid rgba(0,212,255,.3); border-radius: 4px;
        }
        .schedule {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; color: var(--green);
          padding: 5px 12px;
          border: 1px solid rgba(0,255,159,.25); border-radius: 4px;
        }
        .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--green);
          animation: blink 1.2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }

        main { max-width: 1200px; margin: 0 auto; padding: 28px 24px; }

        /* PIPELINE */
        .pipeline {
          display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;
          overflow-x: auto;
        }
        .pipe-step { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .pipe-node {
          width: 30px; height: 30px; border-radius: 50%;
          border: 1.5px solid var(--border);
          display: grid; place-items: center;
          font-size: 11px; font-weight: 700;
          transition: all .3s;
        }
        .pipe-node.active { border-color: var(--accent); background: rgba(255,60,95,.12); animation: glow 1s ease-in-out infinite; }
        .pipe-node.done { border-color: var(--green); background: rgba(0,255,159,.1); color: var(--green); }
        .pipe-node.error { border-color: var(--accent); color: var(--accent); }
        @keyframes glow { 0%,100%{box-shadow:0 0 8px rgba(255,60,95,.3)} 50%{box-shadow:0 0 18px rgba(255,60,95,.6)} }
        .pipe-label { font-size: 11px; color: var(--text-dim); }
        .pipe-arrow { font-size: 18px; color: var(--border); padding: 0 2px; }

        /* ACTION ROW */
        .action-row { display: flex; gap: 16px; margin-bottom: 24px; align-items: flex-start; }
        .btn-run {
          background: var(--accent); color: #fff;
          border: none; border-radius: 6px;
          padding: 11px 24px;
          font-family: inherit; font-size: 13px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
          transition: all .2s; flex-shrink: 0;
        }
        .btn-run:hover:not(:disabled) { background: #ff5472; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,60,95,.4); }
        .btn-run:disabled { opacity: .5; cursor: not-allowed; }
        .log-panel {
          flex: 1; background: #050508;
          border: 1px solid var(--border); border-radius: 6px;
          padding: 10px 14px; height: 80px; overflow-y: auto;
          font-size: 11px; line-height: 1.8;
        }
        .log-empty { color: var(--text-dim); }
        .log-line { display: flex; gap: 10px; }
        .log-time { color: var(--text-dim); flex-shrink: 0; }
        .log-msg { color: var(--text-mid); }
        .log-msg.success { color: var(--green); }
        .log-msg.error { color: var(--accent); }
        .log-msg.info { color: var(--accent3); }

        /* SECTION */
        .section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
        .section.done { border-color: rgba(0,255,159,.15); }
        .section.active { border-color: rgba(255,60,95,.3); }
        .section-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px;
          background: var(--surface2);
          cursor: pointer; user-select: none;
          border-bottom: 1px solid transparent;
        }
        .section-header:hover { background: #1e1e2a; }
        .section.open .section-header { border-bottom-color: var(--border); }
        .section-title { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; }
        .sec-num {
          width: 22px; height: 22px; border-radius: 4px;
          background: var(--accent); display: grid; place-items: center;
          font-size: 10px; font-weight: 700;
        }
        .sec-num.done { background: var(--green); color: #000; }
        .sec-num.active { background: var(--accent2); }
        .section-badge { font-size: 11px; color: var(--text-dim); }
        .section-body { padding: 20px; }
        .section-empty { color: var(--text-dim); font-size: 12px; text-align: center; padding: 32px; }

        /* CARDS */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .content-card {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 6px; padding: 14px;
          transition: border-color .2s; display: block; color: var(--text);
        }
        .content-card:hover { border-color: var(--accent3); }
        .card-platform {
          display: inline-block; font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
          padding: 2px 8px; border-radius: 3px; margin-bottom: 8px;
        }
        .card-platform.yt { background: rgba(255,60,95,.12); color: var(--accent); border: 1px solid rgba(255,60,95,.25); }
        .card-platform.x { background: rgba(155,89,255,.12); color: #9b59ff; border: 1px solid rgba(155,89,255,.25); }
        .card-thumb { width: 100%; border-radius: 4px; margin-bottom: 8px; display: block; }
        .card-title { font-family: 'Noto Serif SC', serif; font-size: 13px; line-height: 1.6; margin-bottom: 8px; }
        .card-meta { display: flex; gap: 12px; font-size: 11px; color: var(--text-dim); flex-wrap: wrap; }
        .card-reason { margin-top: 8px; font-size: 11px; color: var(--text-dim); padding: 6px 8px; background: rgba(255,255,255,.03); border-radius: 3px; }

        /* ANALYSIS */
        .trend-box { padding: 14px 16px; background: rgba(255,60,95,.07); border: 1px solid rgba(255,60,95,.2); border-radius: 6px; margin-bottom: 12px; }
        .opp-box { padding: 14px 16px; background: rgba(0,255,159,.05); border: 1px solid rgba(0,255,159,.15); border-radius: 6px; margin-bottom: 16px; }
        .trend-label { font-size: 9px; letter-spacing: .2em; color: var(--text-dim); text-transform: uppercase; margin-bottom: 6px; }
        .trend-text { font-family: 'Noto Serif SC', serif; font-size: 15px; font-weight: 700; line-height: 1.6; }
        .opp-text { font-size: 13px; color: var(--green); line-height: 1.7; }
        .analysis-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .analysis-col { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 14px; }
        .analysis-col-title { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px; padding-left: 8px; border-left: 3px solid; }
        .analysis-insight { font-size: 12px; color: var(--text-mid); margin-bottom: 7px; padding-left: 8px; border-left: 2px solid rgba(255,255,255,.08); line-height: 1.5; }
        .tag-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
        .tag { font-size: 11px; padding: 3px 8px; border-radius: 3px; background: rgba(255,255,255,.04); border: 1px solid var(--border); }

        /* SCRIPTS */
        .script-tabs { display: flex; border-bottom: 1px solid var(--border); overflow-x: auto; }
        .script-tab {
          padding: 10px 18px; font-size: 11px; letter-spacing: .08em;
          cursor: pointer; color: var(--text-dim); background: none; border: none;
          border-bottom: 2px solid transparent; white-space: nowrap;
          font-family: inherit; transition: all .2s;
        }
        .script-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .script-tab:hover:not(.active) { color: var(--text-mid); }
        .script-body { padding: 20px; }
        .script-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .script-video-title { font-family: 'Noto Serif SC', serif; font-size: 16px; font-weight: 700; line-height: 1.5; flex: 1; }
        .btn-copy {
          background: rgba(255,255,255,.06); border: 1px solid var(--border);
          color: var(--text-mid); border-radius: 4px; padding: 6px 12px;
          font-family: inherit; font-size: 11px; cursor: pointer; white-space: nowrap;
          transition: all .2s; flex-shrink: 0;
        }
        .btn-copy:hover { border-color: var(--accent3); color: var(--accent3); }
        .script-block { border-radius: 4px; padding: 14px; margin-bottom: 12px; border-left: 3px solid; }
        .sb-hook { border-left-color: var(--accent); background: rgba(255,60,95,.05); }
        .sb-intro { border-left-color: var(--accent2); background: rgba(255,159,28,.05); }
        .sb-body { border-left-color: var(--accent3); background: rgba(0,212,255,.05); }
        .sb-cta { border-left-color: #9b59ff; background: rgba(155,89,255,.05); }
        .sb-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 7px; }
        .sb-text { font-family: 'Noto Serif SC', serif; font-size: 14px; line-height: 1.85; color: var(--text); }
        .script-footer { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 14px; }
        .meta-label { font-size: 9px; letter-spacing: .18em; color: var(--text-dim); text-transform: uppercase; margin-bottom: 6px; }
        .duration { font-size: 12px; color: var(--accent2); }
        .shooting-tips { margin-top: 14px; padding: 12px; background: rgba(155,89,255,.07); border: 1px solid rgba(155,89,255,.2); border-radius: 4px; font-size: 12px; color: var(--text-mid); line-height: 1.6; }
        .script-actions { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 10px; }
        .btn-action {
          font-size: 11px; padding: 7px 14px; border-radius: 4px;
          cursor: pointer; border: 1px solid var(--border);
          background: transparent; color: var(--text-mid);
          font-family: inherit; transition: all .2s;
        }
        .btn-action:hover { border-color: var(--accent3); color: var(--accent3); }

        /* TOAST */
        .toast {
          position: fixed; bottom: 24px; right: 24px;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 6px; padding: 10px 18px;
          font-size: 12px; z-index: 9999;
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        @media (max-width: 600px) {
          header { padding: 12px 16px; }
          main { padding: 16px; }
          .action-row { flex-direction: column; }
          .log-panel { height: 70px; }
          .schedule { display: none; }
        }
      `}</style>
    </>
  )
}

function Section({ id, open, onToggle, num, emoji, title, badge, status, empty, children }) {
  const hasContent = children && (Array.isArray(children) ? children.length > 0 : true)
  return (
    <div className={`section ${status === 'done' ? 'done' : status === 'active' ? 'active' : ''} ${open ? 'open' : ''}`}>
      <div className="section-header" onClick={onToggle}>
        <div className="section-title">
          <div className={`sec-num ${status}`}>{status === 'done' ? '✓' : num}</div>
          {emoji} {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {badge && <span className="section-badge">{badge}</span>}
          <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="section-body">
          {hasContent ? children : <div className="section-empty">{empty}</div>}
        </div>
      )}
    </div>
  )
}
