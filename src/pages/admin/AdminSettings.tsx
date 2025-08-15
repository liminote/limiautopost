import { useEffect, useState } from 'react'

export default function AdminSettings() {
  const [linked, setLinked] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function fetchJSONFallback(paths: string[]) {
    let lastErr: any
    for (const p of paths) {
      try {
        const r = await fetch(p, { cache: 'no-store' })
        if (!r.ok) { lastErr = new Error(`HTTP ${r.status}`); continue }
        return await r.json()
      } catch (e) { lastErr = e }
    }
    throw lastErr || new Error('All endpoints failed')
  }
  useEffect(() => {
    const run = async () => {
      // 0) 健康檢查（不阻塞主流程；在某些站台 Edge 保護下可能返回非 JSON）
      try {
        const hj = await fetchJSONFallback(['/api/health', '/.netlify/functions/health'])
        if (!hj.ok) { setStatusMsg('健康檢查未就緒（可能缺環境變數或 Blobs 權限）') }
      } catch {
        // 略過：不影響 Threads 連結狀態
      }
      // 1) 先讀 URL 提示（剛完成授權時）
      try {
        const qs = new URLSearchParams(location.search)
        if (qs.get('threads') === 'linked') {
          setLinked(true)
          try { localStorage.setItem('threads:linked', '1') } catch {}
        }
      } catch {}
      // 2) 向後端查詢狀態
      try {
        const j = await fetchJSONFallback(['/api/threads/status', '/.netlify/functions/threads-status'])
        if (j.status === 'linked') {
          setLinked(true)
          if (j.username) setUsername(j.username)
          try { if (j.username) localStorage.setItem('threads:username', j.username) } catch {}
          if (j.reasonCode === 'me_fetch_failed' && !j.username) setStatusMsg('已連結，但暫時無法取得 username（稍後自動再試）')
        } else {
          setLinked(false); setStatusMsg(j.reasonCode ? `未連結：${j.reasonCode}` : '未連結')
        }
        try { localStorage.setItem('threads:linked', j.status === 'linked' ? '1' : '0') } catch {}
        return
      } catch {}
      // 3) 後援：讀本機快取
      try {
        setLinked(localStorage.getItem('threads:linked') === '1')
        const u = localStorage.getItem('threads:username') || ''
        if (u) setUsername(u)
      } catch {}
    }
    run()
    // 定時輪詢一次，協助在授權後幾秒內補上 username
    const id = window.setInterval(() => {
      fetchJSONFallback(['/api/threads/status', '/.netlify/functions/threads-status']).then(j => {
        if (j.status === 'linked') {
          setLinked(true)
          if (j.username) { setUsername(j.username); try { localStorage.setItem('threads:username', j.username) } catch {} }
        }
      }).catch(()=>{})
    }, 5000)
    setTimeout(()=> clearInterval(id), 60_000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>系統設定</h1>
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <div>站點層設定（平台前綴、模型 API key、通知、報表等）。</div>
        {statusMsg && <div className="text-red-600 text-sm">{statusMsg}</div>}
        {/* 管理者畫面不再顯示 Threads 連結按鈕（搬到使用者設定） */}
        {linked && <div className="text-green-700 text-sm">目前站點已存在 Threads 連結紀錄{username ? `（${username}）` : ''}。若需變更，請至「設定」頁由個人帳號重新連結。</div>}
      </div>
    </div>
  )
}


