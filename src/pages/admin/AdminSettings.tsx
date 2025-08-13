import { useEffect, useState } from 'react'

export default function AdminSettings() {
  const [linked, setLinked] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  useEffect(() => {
    const run = async () => {
      // 1) 先讀 URL 提示（剛完成授權時）
      try {
        const qs = new URLSearchParams(location.search)
        if (qs.get('threads') === 'linked') {
          setLinked(true)
          try { localStorage.setItem('threads:linked', '1') } catch {}
        }
      } catch {}
      // 2) 向後端查詢權威狀態
      try {
        const r = await fetch('/.netlify/functions/threads-linked', { cache: 'no-store', headers: { 'accept': 'application/json' } })
        const j = await r.json()
        if (typeof j.linked === 'boolean') {
          setLinked(j.linked)
          if (j.username) setUsername(j.username as string)
          try { localStorage.setItem('threads:linked', j.linked ? '1' : '0') } catch {}
          return
        }
      } catch {}
      // 3) 後援：讀本機快取
      try { setLinked(localStorage.getItem('threads:linked') === '1') } catch {}
    }
    run()
  }, [])
  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>系統設定（占位）</h1>
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <div>未來可在此管理：平台前綴、字數建議、模型 API key、使用者通知、報表匯出等。</div>
        <div className="flex gap-2">
          <a className="btn btn-primary" href="/api/threads/oauth/start">{linked ? '已連結 Threads（OAuth）' : '連結 Threads（OAuth）'}</a>
        </div>
        {linked && <div className="text-green-700 text-sm">已成功連結 Threads 帳號{username ? `（${username}）` : ''}</div>}
      </div>
    </div>
  )
}


