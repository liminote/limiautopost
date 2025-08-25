import { useLayoutEffect, useRef, useState, useEffect, useCallback } from 'react'
import TagInput from './TagInput'
import { getTracked, removeTracked, updateTracked, type TrackedPost } from '../tracking/tracking'
import { PLATFORM_DISPLAY_MAP, PLATFORM_CONFIG, getTrackedPostPlatformConfig } from '../config/platformConfig'
// import removed: mock metrics no longer used

export default function TrackingTable({ rows, setRows, loading, userEmail }: { rows: TrackedPost[]; setRows: (r: TrackedPost[]) => void; loading?: boolean; userEmail?: string }){
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ left: number; top: number } | null>(null)
  const [hoverText, setHoverText] = useState<string>('')
  const [hoverIsNotes, setHoverIsNotes] = useState<boolean>(false)
  const hideTimerRef = useRef<number | null>(null)
  const anchorRectRef = useRef<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)

  const [publishDateDialog, setPublishDateDialog] = useState<{ show: boolean; row: TrackedPost | null; input: string }>({ show: false, row: null, input: '' })

  // 移除所有排程相關功能
  useEffect(() => {
    // 移除排程檢查邏輯
  }, [])

  // 檢查卡住的「發佈中」狀態，防止狀態卡住
  useEffect(() => {
    const stuckPosts = rows.filter(r => 
      r.status === 'publishing' && 
      r.publishDate && 
      new Date(r.publishDate) < new Date(Date.now() - 5 * 60 * 1000) // 5分鐘前
    )

    if (stuckPosts.length > 0) {
      console.log(`發現 ${stuckPosts.length} 個卡住的發佈中狀態`)
      stuckPosts.forEach(post => {
        updateTracked(post.id, { status: 'failed', publishError: '發佈狀態卡住，已重置為失敗' })
        setRows(rows.map(x => x.id === post.id ? { ...x, status: 'failed', publishError: '發佈狀態卡住，已重置為失敗' }: x))
      })
    }
  }, [rows, setRows])

  // 檢查卡住的「發佈中」狀態（無 publishDate 的情況）
  useEffect(() => {
    const stuckPostsWithoutDate = rows.filter(r => 
      r.status === 'publishing' && 
      !r.publishDate
    )

    if (stuckPostsWithoutDate.length > 0) {
      console.log(`發現 ${stuckPostsWithoutDate.length} 個無日期的卡住發佈中狀態`)
      stuckPostsWithoutDate.forEach(post => {
        // 檢查是否超過 2 分鐘
        const postRow = rows.find(x => x.id === post.id)
        if (postRow && publishingId === post.id) {
          // 如果正在發佈中且超過 2 分鐘，重置狀態
          const timeSinceStart = Date.now() - (postRow as any)._publishStartTime || 0
          if (timeSinceStart > 2 * 60 * 1000) { // 2分鐘
            console.log(`重置卡住的發佈狀態: ${post.id}`)
            updateTracked(post.id, { status: 'failed', publishError: '發佈超時，已重置為失敗' })
            setRows(rows.map(x => x.id === post.id ? { ...x, status: 'failed', publishError: '發佈超時，已重置為失敗' }: x))
            setPublishingId(null)
          }
        }
      })
    }
  }, [rows, setRows, publishingId])

  // 移除排程相關函數
  // const openScheduleDialog = (row: TrackedPost) => { ... } - 已移除
  // const handleScheduleSubmit = async () => { ... } - 已移除
  // const handleScheduleCancel = () => { ... } - 已移除

  // 立即發佈函數
  const handlePublish = async (r: TrackedPost) => {
    // 防重複發佈檢查
    if (r.status === 'published') {
      alert('此貼文已經發佈，無法重複發佈')
      return
    }
    
    if (r.status === 'publishing') {
      alert('此貼文正在發佈中，請稍候')
      return
    }
    
    const text = (r.content || '').trim()
    if (!text) { alert('內容為空，無法發佈'); return }
    
    // 檢查 Threads 平台的字符限制
    if (r.platform === 'Threads' && text.length > 500) {
      alert(`Threads 發佈失敗：內容超過 500 字符限制（當前：${text.length} 字符）\n\n請縮短內容後再發佈。`)
      return
    }
    
    // 檢查用戶是否已登入
    if (!userEmail) {
      alert('請先登入後再發佈貼文')
      return
    }
    
    // 直接嘗試發佈，如果授權失敗會自動處理
    console.log('[TrackingTable] 開始發佈貼文')
    
    try {
      setPublishingId(r.id)
      // 記錄發佈開始時間
      const publishStartTime = Date.now()
      updateTracked(r.id, { status: 'publishing' })
      setRows(rows.map(x=> x.id===r.id? { ...x, status: 'publishing', _publishStartTime: publishStartTime }: x))
      
      // 添加超時保護
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('發佈超時')), 2 * 60 * 1000) // 2分鐘超時
      })
      
      const publishPromise = publishWithRetry(text)
      const j = await Promise.race([publishPromise, timeoutPromise])
      
      if (!j.ok) {
        const t = j.errorText || 'unknown'
        
        // 檢查是否為 token 過期錯誤
        if (t.includes('TOKEN_EXPIRED') || t.includes('401') || t.includes('Session has expired')) {
          if (confirm('Threads 授權已過期，是否現在重新連結？')) {
            window.location.href = '/api/threads/oauth/start'
            return
          }
        }
        
        updateTracked(r.id, { status: 'failed', publishError: t })
        setRows(rows.map(x=> x.id===r.id? { ...x, status: 'failed', publishError: t }: x))
        alert('發佈失敗：' + t)
        return
      }
      
      // 發佈成功
      const publishedAt = r.publishDate || nowYMDHM()
      updateTracked(r.id, { 
        status: 'published', 
        threadsPostId: j.id, 
        permalink: j.permalink, 
        permalinkSource: 'auto', 
        publishDate: publishedAt 
      })
      setRows(rows.map(x=> x.id===r.id? { 
        ...x, 
        status: 'published', 
        threadsPostId: j.id, 
        permalink: j.permalink, 
        permalinkSource: 'auto', 
        publishDate: publishedAt 
      }: x))
      alert(`發佈成功！ID: ${j.id}`)
    } catch (error) { 
      console.error('發佈失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '網路錯誤'
      updateTracked(r.id, { status: 'failed', publishError: errorMessage })
      setRows(rows.map(x=> x.id===r.id? { ...x, status: 'failed', publishError: errorMessage }: x))
      alert('發佈失敗：' + errorMessage)
    } finally { 
      setPublishingId(null) 
    }
  }

  const openPublishDateDialog = (row: TrackedPost) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const now = new Date(Date.now() + 10 * 60 * 1000) // 預設現在+10分鐘
    const def = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    const current = row.publishDate ? formatLocal(row.publishDate) : def
    setPublishDateDialog({ show: true, row, input: current })
  }

  const handlePublishDateSubmit = () => {
    const { row, input } = publishDateDialog
    if (!row) return
    
    const s = input.trim().replace('T',' ')
    const m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(s)
    if (!m) { 
      alert('格式需為 YYYY-MM-DD HH:mm')
      return 
    }
    
    // 檢查是否為過去的時間
    const selectedTime = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`)
    const now = new Date()
    
    if (selectedTime <= now) {
      alert('發佈日期不能設定為過去的時間，請選擇未來的時間')
      return
    }
    
    const publishDate = selectedTime.toISOString()
    updateTracked(row.id, { publishDate })
    setRows(rows.map(x => x.id === row.id ? { ...x, publishDate } : x))
    setPublishDateDialog({ show: false, row: null, input: '' })
  }

  const handlePublishDateCancel = () => {
    setPublishDateDialog({ show: false, row: null, input: '' })
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

  // 發佈日期專用格式：只顯示到時分，避免格子打架
  const formatPublishDate = (iso?: string): string => {
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
    // 檢查用戶是否已登入
    if (!userEmail) {
      return { ok: false, errorText: 'User not logged in' }
    }
    
    // 每次發佈時都要求重新授權，不進行預檢查
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
          const resp = await fetch(url, { 
            method: 'POST', 
            headers: { 'content-type': 'application/json' }, 
            body: JSON.stringify({ text, userEmail }) 
          })
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
    
    // 移除授權狀態檢查，直接返回錯誤
    return { ok: false, errorText: lastError ? `Service temporarily unavailable: ${lastError}` : 'Service temporarily unavailable, please retry.' }
  }

  // 手動重置卡住的發佈狀態
  const resetStuckPublishingStatus = () => {
    const stuckPosts = rows.filter(r => r.status === 'publishing')
    if (stuckPosts.length === 0) {
      alert('沒有卡住的發佈中狀態')
      return
    }
    
    if (confirm(`發現 ${stuckPosts.length} 個卡住的發佈中狀態，是否重置為失敗狀態？`)) {
      stuckPosts.forEach(post => {
        updateTracked(post.id, { status: 'failed', publishError: '手動重置卡住的發佈狀態' })
        setRows(rows.map(x => x.id === post.id ? { ...x, status: 'failed', publishError: '手動重置卡住的發佈狀態' }: x))
      })
      setPublishingId(null)
      alert('已重置所有卡住的發佈狀態')
    }
  }

  return (
    <div className="card">
      <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
        {/* 添加手動重置按鈕 */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={resetStuckPublishingStatus}
            className="px-3 py-1 text-xs bg-orange-100 text-orange-600 rounded hover:bg-orange-200"
            title="重置卡住的發佈狀態"
          >
            重置卡住狀態
          </button>
        </div>
      

      <table className="table ui-compact" style={{ width: '100%' }}>
        <colgroup>
          {/* 移除所有固定寬度，讓瀏覽器自動調整 */}
          <col /> {/* 1 原文編號 */}
          <col /> {/* 2 識別碼 */}
          <col /> {/* 3 平台 */}
          <col /> {/* 4 狀態 */}
          <col /> {/* 5 原文標題 */}
          <col /> {/* 6 內容 */}
          <col /> {/* 7 標籤 */}
          <col /> {/* 8 連結 */}
          <col /> {/* 9 發佈日期 */}
          <col /> {/* 10 讚 */}
          <col /> {/* 11 留言 */}
          <col /> {/* 12 分享 */}
          <col /> {/* 13 備註 */}
          <col /> {/* 14 建立時間 */}
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
                  <td key={j} className="px-3 py-3 border-t align-top">
                    <div className="animate-pulse bg-gray-100 rounded" style={{ height: '14px', width: j % 3 === 0 ? '8ch' : j % 3 === 1 ? '16ch' : '10ch' }} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr><td colSpan={15} className="px-3 py-6 text-center text-gray-500">尚無資料</td></tr>
          ) : rows.map(r => (
            <tr key={r.id}>
              <td className="px-3 py-3 border-t align-top">{r.articleId}</td>
              <td className="px-3 py-3 border-t align-top">{r.postId}</td>
              <td className="px-3 py-3 border-t align-top" style={{ minWidth: '6ch', textAlign: 'center' }}>
                {(() => {
                  const platformConfig = getTrackedPostPlatformConfig(r.platform)
                  return (
                    <span className="ui-chip" style={{ padding: '0 6px', color: platformConfig.color }}>
                      {platformConfig.display}
                    </span>
                  )
                })()}
              </td>
              <td className="px-3 py-3 border-t align-top" style={{ minWidth: '8ch', whiteSpace: 'nowrap' }}>
                <span 
                  className={`px-2 py-1 rounded font-medium ${
                    r.status === 'published' ? 'bg-green-100 text-green-800' :
                    r.status === 'publishing' ? 'bg-blue-100 text-blue-800' :
                    r.status === 'failed' ? 'bg-red-100 text-red-800' :
                    r.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {r.status === 'published' ? '已發佈' :
                   r.status === 'publishing' ? '發佈中' :
                   r.status === 'failed' ? '失敗' :
                   r.status === 'draft' ? '草稿' :
                   '未知'}
                </span>
              </td>
              <td className="px-3 py-3 border-t align-top" style={{ width: '12ch' }} onMouseEnter={(e)=>{ clearHideTimer(); anchorRectRef.current = (e.currentTarget as HTMLTableCellElement).getBoundingClientRect(); setHoverIsNotes(false); setHoverText(r.articleTitle || '（無標題）'); setHoverId(r.id) }} onMouseLeave={hideTooltipLater}>
                <div style={{ width: '12ch', overflow: 'hidden', display: 'block', pointerEvents: 'none' }}>{r.articleTitle || '（無標題）'}</div>
              </td>
              <td className="px-3 py-3 border-t text-gray-600 align-top" style={{ width: '15ch' }} onMouseEnter={(e)=>{ clearHideTimer(); anchorRectRef.current = (e.currentTarget as HTMLTableCellElement).getBoundingClientRect(); setHoverIsNotes(false); setHoverText(r.content || ''); setHoverId(r.id) }} onMouseLeave={hideTooltipLater}>
                <div style={{ width: '13ch', overflow: 'hidden', display: 'block', pointerEvents: 'none', textAlign: 'left' }}>
                  {(r.content || '').slice(0, 30)}{(r.content || '').length > 30 ? '…' : ''}
                </div>
              </td>
              <td className="px-3 py-3 border-t align-top" style={{ width: '14ch' }}>
                <TagInput
                  className="w-14ch"
                  value={r.tags || []}
                  onChange={(tags)=>{ updateTracked(r.id,{ tags }); setRows(rows.map(x=> x.id===r.id? { ...x, tags }: x)); }}
                  suggestions={Array.from(new Set(getTracked().flatMap(x => x.tags || [])))}
                />
              </td>
              <td className="px-3 py-3 border-t align-top">
                {r.permalink ? (
                  <div className="flex items-center gap-1">
                    {/* 連結 icon：雙鏈節，語意更直覺 */}
                    <button className="icon-btn" title="開啟連結" onClick={()=> ensurePermalinkAndOpen(r)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 1 7-7l1 1"/><path d="M14 11a5 5 0 0 1-7 7l-1-1"/><path d="M8 12l8 0"/></svg>
                    </button>
                    {/* IG/FB 貼文：顯示「筆」圖示，可編輯連結 */}
                    {r.platform !== 'Threads' && (
                      <button className="icon-btn" title="編輯連結" onClick={()=> setPermalink(r.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {/* 無連結時：只有 IG/FB 貼文才顯示「筆」圖示，代表可以輸入連結 */}
                    {r.platform !== 'Threads' && (
                      <button className="icon-btn" title="輸入連結" onClick={()=> setPermalink(r.id)}>
                        {/* 筆圖示，代表可以編輯/輸入 */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                    )}
                    {/* Threads 貼文：只顯示立即發佈按鈕 */}
                    {r.platform === 'Threads' && (
                      <>
                        {/* 移除排程按鈕，只保留立即發佈功能 */}
                        {r.status !== 'published' && r.status !== 'publishing' && (
                          <button className="icon-btn" title="立即發佈" style={{ color:'#3b82f6', borderColor:'#3b82f6' }} onClick={()=> handlePublish(r)}>
                            <span>✈️</span>
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
              <td className="px-3 py-3 border-t align-top">
                <div className="flex items-center gap-1">
                  <span className="text-gray-700">
                    {r.publishDate ? formatPublishDate(r.publishDate) : '-'}
                  </span>
                  {/* 所有平台都顯示「筆」圖示，保持對齊 */}
                  <button 
                    className="icon-btn" 
                    title={r.platform === 'Threads' ? "Threads 發佈日期為自動抓取，無法手動編輯" : "設定發佈日期"}
                    onClick={()=> r.platform === 'Threads' ? alert('Threads 發佈日期為自動抓取，無法手動編輯') : openPublishDateDialog(r)}
                    style={{ opacity: r.platform === 'Threads' ? 0.3 : 1 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                  </button>
                </div>
              </td>
              <td className="px-3 py-3 border-t ui-gap-x">
                <input
                  type="number"
                  min="0"
                  className="w-10 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={r.likes || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseInt(e.target.value) || 0
                    updateTracked(r.id, { likes: value })
                    setRows(rows.map(x => x.id === r.id ? { ...x, likes: value } : x))
                  }}
                  placeholder="0"
                />
              </td>
              <td className="px-3 py-3 border-t ui-gap-x">
                <input
                  type="number"
                  min="0"
                  className="w-10 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={r.comments || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseInt(e.target.value) || 0
                    updateTracked(r.id, { comments: value })
                    setRows(rows.map(x => x.id === r.id ? { ...x, comments: value } : x))
                  }}
                  placeholder="0"
                />
              </td>
              <td className="px-3 py-3 border-t ui-gap-x">
                <input
                  type="number"
                  min="0"
                  className="w-10 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={r.shares || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseInt(e.target.value) || 0
                    const when = new Date().toISOString()
                    updateTracked(r.id, { shares: value, metricsSyncedAt: when })
                    setRows(rows.map(x => x.id === r.id ? { ...x, shares: value, metricsSyncedAt: when } : x))
                  }}
                  placeholder="0"
                />
              </td>
              <td className="px-3 py-3 border-t align-top">
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
                    <span className="has-tip" data-tip={`手動輸入模式\n最後更新：${r.metricsSyncedAt ? formatLocal(r.metricsSyncedAt) : '—'}`}>
                      <button className="icon-btn" style={{ background: 'var(--yinmn-blue)', color:'#fff', borderColor:'var(--yinmn-blue)' }} disabled={true} title="已改為手動輸入模式">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
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

      {/* 發佈日期設定對話框 */}
      {publishDateDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">設定發佈日期</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇發佈日期時間
              </label>
              <div className="flex space-x-3">
                {/* 日期選擇器 */}
                <div className="flex-1">
                  <input
                    type="date"
                    value={publishDateDialog.input.split(' ')[0]}
                    onChange={(e) => {
                      const date = e.target.value
                      const time = publishDateDialog.input.split(' ')[1] || '12:00'
                      setPublishDateDialog(prev => ({ ...prev, input: `${date} ${time}` }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* 時間選擇器 */}
                <div className="flex-1">
                  <input
                    type="time"
                    value={publishDateDialog.input.split(' ')[1] || '12:00'}
                    onChange={(e) => {
                      const date = publishDateDialog.input.split(' ')[0]
                      const time = e.target.value
                      setPublishDateDialog(prev => ({ ...prev, input: `${date} ${time}` }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handlePublishDateCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handlePublishDateSubmit}
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


