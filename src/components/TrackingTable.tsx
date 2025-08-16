import { useLayoutEffect, useRef, useState, useEffect, useCallback } from 'react'
import TagInput from './TagInput'
import { getTracked, removeTracked, updateTracked, type TrackedPost } from '../tracking/tracking'
// import removed: mock metrics no longer used

export default function TrackingTable({ rows, setRows, loading }: { rows: TrackedPost[]; setRows: (r: TrackedPost[]) => void; loading?: boolean }){
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ left: number; top: number } | null>(null)
  const [hoverText, setHoverText] = useState<string>('')
  const [hoverIsNotes, setHoverIsNotes] = useState<boolean>(false)
  const hideTimerRef = useRef<number | null>(null)
  const anchorRectRef = useRef<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const scheduleCheckRef = useRef<number | null>(null)
  const [scheduleDialog, setScheduleDialog] = useState<{ show: boolean; row: TrackedPost | null; input: string }>({ show: false, row: null, input: '' })

  // 檢查排程發文
  const checkScheduledPosts = useCallback(async () => {
    const now = new Date()
    const scheduledPosts = rows.filter(r => 
      r.platform === 'Threads' && 
      r.status === 'scheduled' && 
      r.scheduledAt && 
      new Date(r.scheduledAt) <= now
    )

    for (const post of scheduledPosts) {
      try {
        console.log(`執行排程發文：${post.id}`)
        setPublishingId(post.id)
        
        // 更新狀態為發佈中
        updateTracked(post.id, { status: 'publishing' })
        setRows(rows.map(x => x.id === post.id ? { ...x, status: 'publishing' } : x))
        
        // 執行發佈
        const j = await publishWithRetry(post.content)
        if (j.ok) {
          const publishedAt = nowYMDHM()
          updateTracked(post.id, { 
            status: 'published', 
            threadsPostId: j.id, 
            permalink: j.permalink, 
            permalinkSource: j.permalink ? 'auto' : undefined, 
            publishDate: publishedAt,
            scheduledAt: undefined // 清除排程時間
          })
          setRows(rows.map(x => x.id === post.id ? { 
            ...x, 
            status: 'published', 
            threadsPostId: j.id, 
            permalink: j.permalink, 
            permalinkSource: j.permalink ? 'auto' : x.permalinkSource, 
            publishDate: publishedAt,
            scheduledAt: undefined
          } : x))
          console.log(`排程發文成功：${post.id}`)
        } else {
          updateTracked(post.id, { status: 'failed', publishError: j.errorText })
          setRows(rows.map(x => x.id === post.id ? { ...x, status: 'failed', publishError: j.errorText } : x))
          console.error(`排程發文失敗：${post.id}`, j.errorText)
        }
      } catch (error) {
        console.error(`排程發文錯誤：${post.id}`, error)
        updateTracked(post.id, { status: 'failed', publishError: String(error) })
        setRows(rows.map(x => x.id === post.id ? { ...x, status: 'failed', publishError: String(error) } : x))
      } finally {
        setPublishingId(null)
      }
    }
  }, [rows, setRows])

  // 智能排程檢查：固定5分鐘檢查，確保準時發佈
  useEffect(() => {
    const scheduledPosts = rows.filter(r => 
      r.platform === 'Threads' && 
      r.status === 'scheduled' && 
      r.scheduledAt
    )

    if (scheduledPosts.length === 0) {
      // 沒有排程文章時，清除輪詢
      if (scheduleCheckRef.current) {
        clearInterval(scheduleCheckRef.current)
        scheduleCheckRef.current = null
      }
      return
    }

    // 有排程文章時，立即檢查一次是否有過期的
    const now = new Date()
    const hasExpiredPosts = scheduledPosts.some(p => new Date(p.scheduledAt!) <= now)
    
    if (hasExpiredPosts) {
      // 有過期的排程，立即檢查
      checkScheduledPosts()
    }

    // 固定5分鐘檢查一次，確保準時發佈
    const checkInterval = 5 * 60 * 1000 // 5分鐘

    // 啟動輪詢
    scheduleCheckRef.current = window.setInterval(checkScheduledPosts, checkInterval)
    
    return () => {
      if (scheduleCheckRef.current) {
        clearInterval(scheduleCheckRef.current)
      }
    }
  }, [rows, checkScheduledPosts])

  const openScheduleDialog = (row: TrackedPost) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const now = new Date(Date.now() + 10 * 60 * 1000) // 預設現在+10分鐘
    const def = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    const current = row.scheduledAt ? formatLocal(row.scheduledAt) : def
    setScheduleDialog({ show: true, row, input: current })
  }

  const handleScheduleSubmit = () => {
    const { row, input } = scheduleDialog
    if (!row) return
    
    const s = input.trim().replace('T',' ')
    const m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(s)
    if (!m) { 
      alert('格式需為 YYYY-MM-DD HH:mm')
      return 
    }
    
    const iso = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`).toISOString()
    updateTracked(row.id, { scheduledAt: iso, status: 'scheduled' })
    setRows(rows.map(x=> x.id===row.id? { ...x, scheduledAt: iso, status: 'scheduled' }: x))
    setScheduleDialog({ show: false, row: null, input: '' })
  }

  const handleScheduleCancel = () => {
    setScheduleDialog({ show: false, row: null, input: '' })
  }

  const clearHideTimer = () => { if (hideTimerRef.current) { window.clearTimeout(hideTimerRef.current); hideTimerRef.current = null } }
  const hideTooltipLater = () => { clearHideTimer(); hideTimerRef.current = window.setTimeout(()=>{ setHoverId(null); setHoverPos(null); setHoverText('') }, 120) }

  useLayoutEffect(() => {
    if (!hoverId || !anchorRectRef.current) return
    const margin = 8
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    let left = Math.max(margin, Math.min(anchorRectRef.current.left, viewportW - margin - 1))
    let top = Math.max(margin, Math.min(anchorRectRef.current.bottom + margin, viewportH - margin - 1))
    const el = tooltipRef.current
    if (el) {
      const w = el.offsetWidth
      const h = el.offsetHeight
      const canPlaceRight = anchorRectRef.current.right + margin + w <= viewportW - margin
      const canPlaceLeft = anchorRectRef.current.left - margin - w >= margin
      if (canPlaceRight) left = anchorRectRef.current.right + margin
      else if (canPlaceLeft) left = anchorRectRef.current.left - margin - w
      else left = Math.max(margin, Math.min(anchorRectRef.current.left, viewportW - margin - w))
      const desiredTop = anchorRectRef.current.top
      top = Math.max(margin, Math.min(desiredTop, viewportH - margin - h))
    }
    setHoverPos({ left, top })
  }, [hoverId, hoverText])

  const formatLocal = (iso?: string): string => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso.replace('T',' ').slice(0,16)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const nowYMDHM = (): string => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const setPermalink = (id: string) => {
    const current = rows.find(x => x.id === id)?.permalink || ''
    const url = window.prompt('輸入貼文連結（含 https://）', current)
    if (url === null) return
    updateTracked(id, { permalink: url })
    setRows(rows.map(x => x.id === id ? { ...x, permalink: url } : x))
  }

  const setNotesValue = (id: string) => {
    const current = rows.find(x => x.id === id)?.notes || ''
    const note = window.prompt('輸入備註', current)
    if (note === null) return
    updateTracked(id, { notes: note })
    setRows(rows.map(x => x.id === id ? { ...x, notes: note } : x))
  }

  async function ensurePermalinkAndOpen(row: TrackedPost) {
    try {
      let link = row.permalink || ''
      const needFetch = !link || !/^https?:\/\//i.test(link)
      if (needFetch && row.threadsPostId) {
        const resp = await fetch(`/api/threads/permalink?id=${encodeURIComponent(row.threadsPostId)}`)
        if (resp.ok) {
          const j = (await resp.json()) as { ok?: boolean; permalink?: string }
          if (j.ok && j.permalink) {
            link = j.permalink
            updateTracked(row.id, { permalink: link, permalinkSource: 'auto' })
            setRows(rows.map(x=> x.id===row.id? { ...x, permalink: link, permalinkSource: 'auto' }: x))
          }
        }
      }
      // 後援：若仍無連結，查最新一篇
      if (!link) {
        try {
          const latest = await fetch('/api/threads/latest').then(r=> r.ok ? r.json() : null).catch(()=>null) as any
          if (latest?.permalink) link = latest.permalink
        } catch {}
      }
      // 不再以 threadsPostId 猜測網址格式（避免錯誤連結）
      if (link) window.open(link, '_blank', 'noopener,noreferrer')
      else alert('目前尚未取得連結，請稍後重試')
    } catch {}
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  async function publishWithRetry(text: string): Promise<{ ok: boolean; id?: string; permalink?: string; errorText?: string }>{
    // 先打 Functions 直連，較少遇到部署切換時的 404/HTML 回應
    const ts = Date.now()
    const endpoints = [
      `/.netlify/functions/threads-publish?ts=${ts}`,
    ]
    const delays = [700, 1200, 2200, 4200, 8200]
    let lastError: string | undefined
    for (let i = 0; i < delays.length; i++) {
      for (const url of endpoints) {
        try {
          const resp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
          const ct = resp.headers.get('content-type') || ''
          const isJson = ct.includes('application/json')
          if (resp.ok && isJson) {
            const j = await resp.json() as { ok?: boolean; id?: string; permalink?: string }
            if (j?.ok) return { ok: true, id: j.id, permalink: j.permalink }
            return { ok: false, errorText: 'unknown' }
          }
          const bodyText = isJson ? '' : await resp.text().catch(()=> '')
          if (/deployment failed/i.test(bodyText) || /<html/i.test(bodyText) || /page not found/i.test(bodyText) || resp.status >= 500) {
            lastError = bodyText || `HTTP ${resp.status}`
            await sleep(delays[i])
            continue
          }
          return { ok: false, errorText: bodyText || `HTTP ${resp.status}` }
        } catch {
          lastError = 'network error'
          await sleep(delays[i])
        }
      }
    }
    // 最後嘗試：狀態檢查與最新貼文確認
    try {
      const st = await fetch('/.netlify/functions/threads-status').then(r=> r.ok ? r.json() : null).catch(()=>null) as any
      if (st && st.status !== 'linked') {
        const reason = st.reasonCode ? ` (${st.reasonCode})` : ''
        return { ok: false, errorText: `Threads 未連結${reason}` }
      }
    } catch {}
    try {
      const start = Date.now()
      while (Date.now() - start < 18_000) {
        const latest = await fetch('/.netlify/functions/threads-latest').then(r=> r.ok ? r.json() : null).catch(()=>null) as any
        if (latest?.id && latest?.permalink) {
          return { ok: true, id: latest.id, permalink: latest.permalink }
        }
        await sleep(1200)
      }
    } catch {}
    return { ok: false, errorText: lastError ? `Service temporarily unavailable: ${lastError}` : 'Service temporarily unavailable, please retry.' }
  }

  return (
    <div className="card">
      <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
      {/* 全部同步按鈕依需求移除 */}
      <table className="table ui-compact" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col className="w-8ch" /> {/* 1 原文編號 */}
          <col className="w-8ch" /> {/* 2 識別碼 */}
          <col className="w-9ch" /> {/* 3 平台 */}
          <col className="w-8ch" /> {/* 4 狀態 */}
          <col className="w-12ch" /> {/* 5 原文標題 */}
          <col className="w-20ch" /> {/* 6 內容 */}
          <col className="w-12ch" /> {/* 7 標籤 */}
          <col /> {/* 8 連結 */}
          <col className="w-8ch" /> {/* 9 發佈日期 */}
          <col /> {/* 10 讚 */}
          <col /> {/* 11 留言 */}
          <col /> {/* 12 分享 */}
          <col /> {/* 13 備註 */}
          <col className="w-8ch" /> {/* 14 建立時間 */}
          <col /> {/* 15 操作 */}
        </colgroup>
        <thead style={{ fontSize: '14px', position: 'sticky', top: 0, background: 'var(--ui-bg)', zIndex: 5, boxShadow: '0 1px 0 var(--ui-border)' }}>
          <tr>
            <th>原文編號</th>
            <th>識別碼</th>
            <th>平台</th>
            <th>狀態</th>
            <th>原文標題</th>
            <th>內容</th>
            <th>標籤</th>
            <th>連結</th>
            <th>發佈日期</th>
            <th>讚</th>
            <th>留言</th>
            <th>分享</th>
            <th>備註</th>
            <th>建立時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`s-${i}`}>
                {Array.from({ length: 15 }).map((__, j) => (
                  <td key={j} className="px-3 py-2 border-t align-top">
                    <div className="animate-pulse bg-gray-100 rounded" style={{ height: '14px', width: j % 3 === 0 ? '8ch' : j % 3 === 1 ? '16ch' : '10ch' }} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr><td colSpan={15} className="px-3 py-6 text-center text-gray-500">尚無資料</td></tr>
          ) : rows.map(r => (
            <tr key={r.id}>
              <td className="px-3 py-2 border-t align-top">{r.articleId}</td>
              <td className="px-3 py-2 border-t align-top">{r.postId}</td>
              <td className="px-3 py-2 border-t align-top" style={{ minWidth: '6ch', textAlign: 'center' }}>
                {(() => {
                  const code = r.platform === 'Instagram' ? 'IG' : r.platform === 'Facebook' ? 'FB' : 'TD'
                  const color = r.platform === 'Instagram' ? '#ec4899' : r.platform === 'Facebook' ? '#2563eb' : '#0ea5a1'
                  return (
                    <span className="ui-chip" style={{ padding: '0 6px', color }}>
                      {code}
                    </span>
                  )
                })()}
              </td>
              <td className="px-3 py-2 border-t align-top" style={{ minWidth: '8ch' }}>
                {(() => {
                  const statusText = r.status === 'failed' ? '失敗' : 
                                   r.status === 'published' ? '成功' : 
                                   r.status === 'scheduled' ? '排程' : 
                                   r.status === 'publishing' ? '發佈中' : '草稿'
                  const style = r.status === 'failed'
                    ? { color: '#dc2626', background: 'rgba(220,38,38,0.10)', borderColor: 'rgba(220,38,38,0.30)' } // 酒紅色
                    : r.status === 'published'
                      ? { color: '#0ea5a1', background: 'rgba(14,165,160,0.10)', borderColor: 'rgba(14,165,160,0.30)' } // 藍綠色
                      : r.status === 'scheduled'
                        ? { color: '#f59e0b', background: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.30)' } // 橘色
                        : r.status === 'publishing'
                          ? { color: '#3b82f6', background: 'rgba(59,130,246,0.10)', borderColor: 'rgba(59,130,246,0.30)' } // 藍色
                          : { color: '#6b7280', background: 'rgba(107,114,128,0.10)', borderColor: 'rgba(107,114,128,0.20)' } // 灰色
                  return (
                    <span className="ui-chip" title={r.publishError || ''} style={style as any}>{statusText}</span>
                  )
                })()}
              </td>
              <td className="px-3 py-2 border-t align-top" onMouseEnter={(e)=>{ clearHideTimer(); anchorRectRef.current = (e.currentTarget as HTMLTableCellElement).getBoundingClientRect(); setHoverIsNotes(false); setHoverText(r.articleTitle || '（無標題）'); setHoverId(r.id) }} onMouseLeave={hideTooltipLater}>
                <div className="w-12ch" style={{ overflow: 'hidden', display: 'block', pointerEvents: 'none' }}>{r.articleTitle || '（無標題）'}</div>
              </td>
              <td className="px-3 py-2 border-t text-gray-600 align-top" onMouseEnter={(e)=>{ clearHideTimer(); anchorRectRef.current = (e.currentTarget as HTMLTableCellElement).getBoundingClientRect(); setHoverIsNotes(false); setHoverText(r.content || ''); setHoverId(r.id) }} onMouseLeave={hideTooltipLater}>
                <div className="w-20ch" style={{ overflow: 'hidden', display: 'block', pointerEvents: 'none' }}>
                  {(r.content || '').slice(0, 36)}{(r.content || '').length > 36 ? '…' : ''}
                </div>
              </td>
              <td className="px-3 py-2 border-t align-top" style={{ width: '9ch' }}>
                <TagInput
                  className="w-9ch"
                  value={r.tags || []}
                  onChange={(tags)=>{ updateTracked(r.id,{ tags }); setRows(rows.map(x=> x.id===r.id? { ...x, tags }: x)); }}
                  suggestions={Array.from(new Set(getTracked().flatMap(x => x.tags || [])))}
                />
              </td>
              <td className="px-3 py-2 border-t align-top">
                {r.permalink ? (
                  <div className="flex items-center gap-1">
                    {/* 「自動/手動」在有連結時顯示，字級較小 */}
                    <span className="text-muted" style={{ fontSize: '11px' }}>{r.permalinkSource === 'manual' || r.permalinkSource === 'locked-manual' ? '手動' : '自動'}</span>
                    {/* 連結 icon：雙鏈節，語意更直覺 */}
                    <button className="icon-btn" title="開啟連結" onClick={()=> ensurePermalinkAndOpen(r)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 1 7-7l1 1"/><path d="M14 11a5 5 0 0 1-7 7l-1-1"/><path d="M8 12l8 0"/></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {/* 無連結時：只有 IG/FB 貼文才顯示手動輸入連結的 icon */}
                    {r.platform !== 'Threads' && (
                      <button className="icon-btn" title="手動貼上連結" onClick={()=> setPermalink(r.id)}>
                        {/* 連結圖示（與上方開啟連結一致的鏈結造型，易於辨識為手動貼上） */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 1 7 7l-3 3a5 5 0 1 1-7-7l1-1"/><path d="M14 11a5 5 0 0 1-7-7l3-3a5 5 0 1 1 7 7l-1 1"/></svg>
                      </button>
                    )}
                    {r.platform === 'Threads' && r.status === 'published' && (
                      <button className="icon-btn" title="重試抓取連結" onClick={async ()=>{
                        try {
                          const resp = await fetch(`/api/threads/permalink?id=${encodeURIComponent(r.threadsPostId || '')}`)
                          if (!resp.ok) { alert('抓取連結失敗'); return }
                          const j = await resp.json() as { ok?: boolean; permalink?: string }
                          if (j.ok && j.permalink) {
                            updateTracked(r.id, { permalink: j.permalink, permalinkSource: 'auto' })
                            setRows(rows.map(x=> x.id===r.id? { ...x, permalink: j.permalink, permalinkSource: 'auto' }: x))
                          } else {
                            alert('尚未取得連結，稍後再試')
                          }
                        } catch { alert('抓取連結失敗') }
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 22v-6h6"/><path d="M3 16a9 9 0 0 0 15 5"/><path d="M21 8a9 9 0 0 0-15-5"/></svg>
                      </button>
                    )}
                    {/* Threads 貼文：顯示藍色飛機（立即發佈）和橘色飛機（排程發佈） */}
                    {r.platform === 'Threads' && (
                      <>
                        {/* 藍色飛機：立即發佈 */}
                        <button className="icon-btn" title={publishingId === r.id ? '發佈中…' : '立即發佈到 Threads'} style={{ background: 'var(--yinmn-blue)', color: '#fff', borderColor: 'var(--yinmn-blue)' }} disabled={publishingId === r.id} onClick={async ()=>{
                          const text = (r.content || '').trim()
                          if (!text) { alert('內容為空，無法發佈'); return }
                          try {
                            setPublishingId(r.id)
                            // 如果原本是排程狀態，清除排程並改為發佈中
                            if (r.scheduledAt) {
                              updateTracked(r.id, { scheduledAt: undefined, status: 'publishing' })
                              setRows(rows.map(x=> x.id===r.id? { ...x, scheduledAt: undefined, status: 'publishing' }: x))
                            } else {
                              updateTracked(r.id, { status: 'publishing' })
                              setRows(rows.map(x=> x.id===r.id? { ...x, status: 'publishing' }: x))
                            }
                            const j = await publishWithRetry(text)
                            if (!j.ok) {
                              const t = j.errorText || 'unknown'
                              // 若是部署切換或 HTML 錯頁，維持發佈中並背景輪詢最新一篇，若 10 秒內抓到新貼文，視為成功
                              if (/deployment failed/i.test(t) || /<html/i.test(t) || /page not found/i.test(t)) {
                                updateTracked(r.id, { status: 'publishing', publishError: undefined })
                                setRows(rows.map(x=> x.id===r.id? { ...x, status: 'publishing', publishError: undefined }: x))
                                try {
                                  const start = Date.now()
                                  while (Date.now() - start < 10_000) {
                                    const latest = await fetch('/api/threads/latest').then(x=> x.ok ? x.json() : null).catch(()=>null) as any
                                    const link = latest?.permalink
                                    const pid = latest?.id
                                    if (link && pid) {
                                      const publishedAt = r.publishDate || nowYMDHM()
                                      updateTracked(r.id, { status: 'published', threadsPostId: pid, permalink: link, permalinkSource: 'auto', publishDate: publishedAt })
                                      setRows(rows.map(x=> x.id===r.id? { ...x, status: 'published', threadsPostId: pid, permalink: link, permalinkSource: 'auto', publishDate: publishedAt }: x))
                                      return
                                    }
                                    await sleep(1200)
                                  }
                                } catch {}
                                return
                              }
                              updateTracked(r.id, { status: 'failed', publishError: t })
                              setRows(rows.map(x=> x.id===r.id? { ...x, status: 'failed', publishError: t }: x))
                              alert('發佈失敗：' + t)
                              return
                            }
                            const confirmed = (j as any).confirmed === true || !!j.permalink
                            const publishedAt = confirmed ? (r.publishDate || nowYMDHM()) : undefined
                            updateTracked(r.id, { status: confirmed ? 'published' : 'publishing', threadsPostId: j.id, permalink: j.permalink, permalinkSource: j.permalink ? 'auto' : undefined, publishDate: publishedAt })
                            setRows(rows.map(x=> x.id===r.id? { ...x, status: confirmed ? 'published' : 'publishing', threadsPostId: j.id, permalink: j.permalink, permalinkSource: j.permalink ? 'auto' : x.permalinkSource, publishDate: publishedAt ?? x.publishDate }: x))
                            if (confirmed) {
                              alert(`已發佈（ID: ${j.id || '未知'}）`)
                            } else {
                              // 背景輪詢補確認
                              const start = Date.now()
                              try {
                                while (Date.now() - start < 12_000) {
                                  const latest = await fetch('/api/threads/latest').then(x=> x.ok ? x.json() : null).catch(()=>null) as any
                                  const link = latest?.permalink
                                  const pid = latest?.id
                                  if (pid && link && (!j.id || String(pid) === String(j.id))) {
                                    const publishedAt2 = r.publishDate || nowYMDHM()
                                    updateTracked(r.id, { status: 'published', threadsPostId: pid, permalink: link, permalinkSource: 'auto', publishDate: publishedAt2 })
                                    setRows(rows.map(x=> x.id===r.id? { ...x, status: 'published', threadsPostId: pid, permalink: link, permalinkSource: 'auto', publishDate: publishedAt2 }: x))
                                    break
                                  }
                                  await sleep(1200)
                                }
                              } catch {}
                            }
                          } catch { alert('發佈失敗：網路錯誤') }
                          finally { setPublishingId(null) }
                        }}>
                          {publishingId === r.id ? (
                            // 簡易 spinner（無動畫依然可辨識）
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" opacity=".3"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                          )}
                        </button>
                        {/* 橘色飛機：排程發佈 - 只在非發佈/發佈中/已排程狀態時顯示 */}
                        {r.status !== 'published' && r.status !== 'publishing' && !r.scheduledAt && (
                          <button className="icon-btn" title="排程發佈（設定發佈時間）" style={{ background: '#f59e0b', color:'#fff', borderColor:'#f59e0b' }} onClick={()=> openScheduleDialog(r)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-4 20-7z"/></svg>
                          </button>
                        )}
                      </>
                    )}
                    {import.meta.env.DEV && (
                      <button
                        className="icon-btn icon-ghost"
                        title="模擬成功（本機測試）"
                        onClick={()=>{
                          const pid = `dev-${Date.now()}`
                          const publishedAt = r.publishDate || nowYMDHM()
                          updateTracked(r.id, { status: 'published', threadsPostId: pid, permalink: `https://www.threads.net/t/${pid}` , permalinkSource: 'auto', publishDate: publishedAt })
                          setRows(rows.map(x=> x.id===r.id? { ...x, status: 'published', threadsPostId: pid, permalink: `https://www.threads.net/t/${pid}`, permalinkSource: 'auto', publishDate: publishedAt }: x))
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 border-t align-top">
                <span className="text-gray-700">
                  {r.scheduledAt && r.status !== 'published' && r.status !== 'publishing' ? `排程：${formatLocal(r.scheduledAt)}` : (r.publishDate || '-')}
                </span>
              </td>
              <td className="px-3 py-2 border-t ui-gap-x"><span className="text-gray-400">N/A（API 限制）</span></td>
              <td className="px-3 py-2 border-t ui-gap-x"><span className="text-gray-400">N/A（API 限制）</span></td>
              <td className="px-3 py-2 border-t ui-gap-x">
                <span className="text-gray-400">N/A（API 限制）</span>
              </td>
              <td className="px-3 py-2 border-t align-top">
                {r.notes && r.notes.trim() ? (
                  <div className="flex flex-col items-start gap-1">
                    <button
                      className="icon-btn"
                      onMouseEnter={(e)=>{ clearHideTimer(); anchorRectRef.current = (e.currentTarget as HTMLButtonElement).getBoundingClientRect(); setHoverIsNotes(true); setHoverText(r.notes || ''); setHoverId(r.id) }}
                      onMouseLeave={hideTooltipLater}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
                    </button>
                    <button className="icon-btn icon-ghost" title="編輯備註" onClick={()=> setNotesValue(r.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                  </div>
                ) : (
                  <button className="icon-btn" title="新增備註" onClick={()=> setNotesValue(r.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  </button>
                )}
              </td>
              <td className="px-3 py-2 border-t align-top">{formatLocal(r.createdAt)}</td>
              <td className="px-3 py-2 border-t align-top">
                <div className="flex flex-col gap-1 items-end justify-end">
                  {r.threadsPostId && (
                    <span className="has-tip" data-tip={`已停用：API 限制\n最後同步：${r.metricsSyncedAt ? formatLocal(r.metricsSyncedAt) : '—'}`}>
                      <button className="icon-btn" style={{ background: 'var(--yinmn-blue)', color:'#fff', borderColor:'var(--yinmn-blue)' }} disabled={true} onClick={async ()=>{
                        try {
                          setSyncingId(r.id)
                          const m = await import('../api/threads').then(m=> m.fetchRealMetrics(r.threadsPostId!))
                          const when = new Date().toISOString()
                          updateTracked(r.id, { likes: m.likes, comments: m.comments, shares: m.shares, saves: m.saves, metricsSyncedAt: when })
                          setRows(rows.map(x=> x.id===r.id? { ...x, likes: m.likes, comments: m.comments, shares: m.shares, saves: m.saves, metricsSyncedAt: when }: x))
                        } catch (e: any) {
                          const msg = String(e)
                          if (msg.includes('TOKEN_EXPIRED') || msg.includes('401')) {
                            if (confirm('Threads 授權已過期，是否現在重新連結？')) {
                              window.location.href = '/api/threads/oauth/start'
                            }
                          } else if (msg.includes('NOT_SUPPORTED') || msg.includes('501')) {
                            alert('此 API 暫不提供該貼文的互動數（Threads Graph API 限制）。')
                          } else {
                            alert('同步失敗：' + msg)
                          }
                        } finally { setSyncingId(null) }
                      }}>
                        {syncingId===r.id
                          ? (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12a9 9 0 1 1 18 0"/></svg>)
                          : (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 22v-6h6"/><path d="M3 16a9 9 0 0 0 15 5"/><path d="M21 8a9 9 0 0 0-15-5"/></svg>)}
                      </button>
                    </span>
                  )}
                  <button className="icon-btn icon-ghost" title="移除" onClick={()=> { if (confirm('刪除後無法復原，你確定要刪除？')) { removeTracked(r.id); setRows(rows.filter(x=>x.id!==r.id)) } }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {hoverId && hoverPos && (
        <div
          ref={tooltipRef}
          className={hoverIsNotes ? "fixed z-50 max-h-56 overflow-auto p-2 ui-tooltip ui-12 notes" : "fixed z-50 w-[16rem] max-h-56 overflow-auto p-2 ui-tooltip ui-12 whitespace-pre-wrap"}
          style={{ left: hoverPos.left, top: hoverPos.top }}
          onMouseEnter={clearHideTimer}
          onMouseLeave={hideTooltipLater}
        >
          {hoverText}
        </div>
      )}

      {/* 排程發文對話框 */}
      {scheduleDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">排程發文</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇排程時間
              </label>
              <div className="flex space-x-3">
                {/* 日期選擇器 */}
                <div className="flex-1">
                  <input
                    type="date"
                    value={scheduleDialog.input.split(' ')[0]}
                    onChange={(e) => {
                      const date = e.target.value
                      const time = scheduleDialog.input.split(' ')[1] || '12:00'
                      setScheduleDialog(prev => ({ ...prev, input: `${date} ${time}` }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* 時間選擇器 */}
                <div className="flex-1">
                  <input
                    type="time"
                    value={scheduleDialog.input.split(' ')[1] || '12:00'}
                    onChange={(e) => {
                      const date = scheduleDialog.input.split(' ')[0]
                      const time = e.target.value
                      setScheduleDialog(prev => ({ ...prev, input: `${date} ${time}` }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 紅色提示文字 */}
            <div className="mb-4">
              <p className="text-red-600 text-sm">
                排程發文5分鐘檢查一次，與實際發文時間有時間落差
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleScheduleCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleScheduleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


