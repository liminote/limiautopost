import { useEffect, useState } from 'react'

export default function AdminSettings() {
  // 管理者頁不再需要 Threads 連結狀態
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
        // 忽略 threads 引導參數（只在使用者設定頁處理）
      } catch {}
      // 2) 向後端查詢狀態
      try {
        // 管理者頁不查詢使用者 Threads 狀態
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
    // 管理者頁不需要輪詢 Threads 狀態
    return () => {}
  }, [])
  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>系統設定</h1>
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <div>站點層設定（平台前綴、模型 API key、通知、報表等）。</div>
        {statusMsg && <div className="text-red-600 text-sm">{statusMsg}</div>}
        {/* 管理者畫面完全不顯示 Threads 連結資訊，請改由使用者在「設定」頁操作 */}
      </div>
    </div>
  )
}


