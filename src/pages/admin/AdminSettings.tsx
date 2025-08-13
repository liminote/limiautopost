import { useEffect, useState } from 'react'

export default function AdminSettings() {
  const [linked, setLinked] = useState(false)
  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch('/api/threads/linked')
        const j = await r.json()
        setLinked(!!j.linked)
      } catch { setLinked(false) }
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
        {linked && <div className="text-green-700 text-sm">已成功連結 Threads 帳號</div>}
      </div>
    </div>
  )
}


