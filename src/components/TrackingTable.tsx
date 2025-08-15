import { useLayoutEffect, useRef, useState } from 'react'
import TagInput from './TagInput'
import { getTracked, removeTracked, updateTracked, type TrackedPost } from '../tracking/tracking'
import { mockFetchMetrics } from '../api/threads'

export default function TrackingTable({ rows, setRows, loading }: { rows: TrackedPost[]; setRows: (r: TrackedPost[]) => void; loading?: boolean }){
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ left: number; top: number } | null>(null)
  const [hoverText, setHoverText] = useState<string>('')
  const [hoverIsNotes, setHoverIsNotes] = useState<boolean>(false)
  const hideTimerRef = useRef<number | null>(null)
  const anchorRectRef = useRef<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)

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

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  async function publishWithRetry(text: string): Promise<{ ok: boolean; id?: string; permalink?: string; errorText?: string }>{
    // 先打 Functions 直連，較少遇到部署切換時的 404/HTML 回應
    const endpoints = ['/.netlify/functions/threads-publish', '/api/threads/publish']
    const delays = [400, 800, 1600, 3200]
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
            await sleep(delays[i])
            continue
          }
          return { ok: false, errorText: bodyText || `HTTP ${resp.status}` }
        } catch {
          await sleep(delays[i])
        }
      }
    }
    return { ok: false, errorText: 'Service temporarily unavailable, please retry.' }
  }

  return (
    <div className="card">
      <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
      <table className="table ui-compact">
        <thead style={{ fontSize: '14px', position: 'sticky', top: 0, background: 'var(--ui-bg)', zIndex: 5, boxShadow: '0 1px 0 var(--ui-border)' }}>
          <tr>
            <th>原文編號</th>
            <th>識別碼</th>
            <th>平台</th>
            <th>原文標題</th>
            <th>內容</th>
            <th>狀態</th>
            <th>標籤</th>
            <th>連結</th>
            <th>發佈日期</th>
            <th>讚</th>
            <th>留言</th>
            <th>分享</th>
            <th>儲存</th>
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
              <td className="px-3 py-2 border-t align-top" style={{ minWidth: '6ch' }}>
                <select
                  className="ui-select-sm"
                  value={(r.platform ?? (r.articleId?.toUpperCase().includes('IG') ? 'Instagram' : 'Threads')) as TrackedPost['platform']}
                  onChange={(e)=>{ const v = e.target.value as TrackedPost['platform']; updateTracked(r.id, { platform: v }); setRows(rows.map(x=> x.id===r.id? { ...x, platform: v }: x)); }}
                  style={{ width: 'auto' }}
                >
                  <option value="Threads">TD</option>
                  <option value="Instagram">IG</option>
                  <option value="Facebook">FB</option>
                </select>
              </td>
              <td className="px-3 py-2 border-t align-top">
                <span className="ui-chip" title={r.publishError || ''}>
                  {r.status === 'published' ? '已發佈' : r.status === 'scheduled' ? '已排程' : r.status === 'publishing' ? '發佈中' : r.status === 'failed' ? '失敗' : '草稿'}
                </span>
              </td>
              <td className="px-3 py-2 border-t align-top" style={{ minWidth: '14ch' }}>{r.articleTitle || '（無標題）'}</td>
              <td className="px-3 py-2 border-t text-gray-600 align-top" style={{ minWidth: '14ch' }}>
                <div
                  className="max-w-64"
                  onMouseEnter={(e) => { clearHideTimer(); const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); anchorRectRef.current = rect; setHoverIsNotes(false); setHoverText(r.content || ''); setHoverId(r.id) }}
                  onMouseLeave={hideTooltipLater}
                >
                  <span>{(r.content || '').slice(0, 14)}{(r.content || '').length > 14 ? '…' : ''}</span>
                </div>
              </td>
              <td className="px-3 py-2 border-t align-top" style={{ width: '14ch' }}>
                <TagInput
                  className="min-w-full"
                  value={r.tags || []}
                  onChange={(tags)=>{ updateTracked(r.id,{ tags }); setRows(rows.map(x=> x.id===r.id? { ...x, tags }: x)); }}
                  suggestions={Array.from(new Set(getTracked().flatMap(x => x.tags || [])))}
                />
              </td>
              <td className="px-3 py-2 border-t align-top">
                {r.permalink ? (
                  <div className="flex items-center gap-1">
                    {/* Threads icon */}
                    <button className="icon-btn" title="開啟 Threads" onClick={()=> window.open(r.permalink!, '_blank')}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm3.9 9.1c-.148-.89-.719-1.76-2.1-1.76-1.012 0-1.741.515-1.741 1.26 0 .64.49 1.003 1.298 1.23l1.072.302c2.013.567 3.007 1.648 3.007 3.253 0 2.095-1.854 3.615-4.51 3.615-2.678 0-4.285-1.383-4.51-3.49l2.098-.316c.148 1.2 1.003 1.9 2.412 1.9 1.19 0 2.1-.59 2.1-1.465 0-.69-.49-1.072-1.436-1.326l-1.07-.302c-1.93-.528-2.847-1.554-2.847-3.14 0-2.013 1.825-3.417 4.195-3.417 2.47 0 3.85 1.383 4.078 3.26l-2.146.136Z"/></svg>
                    </button>
                    <span className="text-xs text-muted">{r.permalinkSource === 'manual' || r.permalinkSource === 'locked-manual' ? '手動' : '自動'}</span>
                    <button className="icon-btn icon-ghost" title="編輯連結" onClick={()=> setPermalink(r.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button className="icon-btn" title="手動貼上連結" onClick={()=> setPermalink(r.id)}>
                      {/* 連結圖示（與上方開啟連結一致的鏈結造型，易於辨識為手動貼上） */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 1 7 7l-3 3a5 5 0 1 1-7-7l1-1"/><path d="M14 11a5 5 0 0 1-7-7l3-3a5 5 0 1 1 7 7l-1 1"/></svg>
                    </button>
                    {r.status === 'published' && (
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
                    <button className="icon-btn" title="發佈到 Threads" style={{ background: 'var(--yinmn-blue)', color: '#fff', borderColor: 'var(--yinmn-blue)' }} disabled={publishingId === r.id} onClick={async ()=>{
                      const text = (r.content || '').trim()
                      if (!text) { alert('內容為空，無法發佈'); return }
                      try {
                        setPublishingId(r.id)
                        updateTracked(r.id, { status: 'publishing' })
                        setRows(rows.map(x=> x.id===r.id? { ...x, status: 'publishing' }: x))
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
                                  updateTracked(r.id, { status: 'published', threadsPostId: pid, permalink: link, permalinkSource: 'auto' })
                                  setRows(rows.map(x=> x.id===r.id? { ...x, status: 'published', threadsPostId: pid, permalink: link, permalinkSource: 'auto' }: x))
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
                        updateTracked(r.id, { status: 'published', threadsPostId: j.id, permalink: j.permalink, permalinkSource: j.permalink ? 'auto' : undefined })
                        setRows(rows.map(x=> x.id===r.id? { ...x, status: 'published', threadsPostId: j.id, permalink: j.permalink, permalinkSource: j.permalink ? 'auto' : x.permalinkSource }: x))
                        alert(`已發佈（ID: ${j.id || '未知'}）`)
                      } catch { alert('發佈失敗：網路錯誤') }
                      finally { setPublishingId(null) }
                    }}>
                      {/* 紙飛機圖示，代表自動發佈 */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    </button>
                  </div>
                )}
              </td>
              <td className="px-3 py-2 border-t">
                <input className="ui-date-sm" type="date" value={r.publishDate || ''}
                  onChange={e=>{ updateTracked(r.id,{ publishDate: e.target.value }); setRows(rows.map(x=> x.id===r.id? { ...x, publishDate: e.target.value }: x)); }} />
              </td>
              <td className="px-3 py-2 border-t ui-gap-x">
                <input className="ui-input-xs" type="number" min={0} step={1} value={r.likes ?? 0}
                  onChange={e=>{ const v = Number(e.target.value||0); updateTracked(r.id,{ likes: v }); setRows(rows.map(x=> x.id===r.id? { ...x, likes: v }: x)); }} />
              </td>
              <td className="px-3 py-2 border-t ui-gap-x">
                <input className="ui-input-xs" type="number" min={0} step={1} value={r.comments ?? 0}
                  onChange={e=>{ const v = Number(e.target.value||0); updateTracked(r.id,{ comments: v }); setRows(rows.map(x=> x.id===r.id? { ...x, comments: v }: x)); }} />
              </td>
              <td className="px-3 py-2 border-t ui-gap-x">
                <input className="ui-input-xs" type="number" min={0} step={1} value={r.shares ?? 0}
                  onChange={e=>{ const v = Number(e.target.value||0); updateTracked(r.id,{ shares: v }); setRows(rows.map(x=> x.id===r.id? { ...x, shares: v }: x)); }} />
              </td>
              <td className="px-3 py-2 border-t ui-gap-x">
                <input className="ui-input-xs" type="number" min={0} step={1} value={r.saves ?? 0}
                  onChange={e=>{ const v = Number(e.target.value||0); updateTracked(r.id,{ saves: v }); setRows(rows.map(x=> x.id===r.id? { ...x, saves: v }: x)); }} />
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
                <div className="flex gap-1 justify-end">
                  {r.threadsPostId && (
                    <button className="icon-btn" title="同步互動數（模擬）" onClick={async ()=>{
                      try {
                        const m = await mockFetchMetrics(r.threadsPostId!)
                        updateTracked(r.id, { likes: m.likes, comments: m.comments, shares: m.shares, saves: m.saves })
                        setRows(rows.map(x=> x.id===r.id? { ...x, likes: m.likes, comments: m.comments, shares: m.shares, saves: m.saves }: x))
                      } catch { alert('同步失敗') }
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 22v-6h6"/><path d="M3 16a9 9 0 0 0 15 5"/><path d="M21 8a9 9 0 0 0-15-5"/></svg>
                    </button>
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
    </div>
  )
}


