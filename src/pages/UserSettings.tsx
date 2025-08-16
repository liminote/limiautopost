import { useEffect, useState } from 'react'

export default function UserSettings(){
  const [linked, setLinked] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const j = await fetch('/api/threads/status', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } }).then(r=> r.ok ? r.json() : Promise.reject(new Error('status http')))
        setLinked(j.status === 'linked')
        if (j.username) setUsername(j.username)
        if (j.tokenSavedAt) {
          setStatusMsg(`Token 取得於 ${new Date(j.tokenSavedAt).toLocaleString()}`)
        }
        // 同步快取
        try {
          localStorage.setItem('threads:linked', j.status === 'linked' ? '1' : '0')
          if (j.username) localStorage.setItem('threads:username', j.username)
        } catch {}
      } catch {}
      // 若剛從 OAuth 回來，帶 threads=linked 時立即顯示成功訊息並清掉參數
      try {
        const qs = new URLSearchParams(location.search)
        if (qs.get('threads') === 'linked') {
          setLinked(true)
          setStatusMsg(null)
          // 讀取本地快取 username
          try { const u = localStorage.getItem('threads:username'); if (u) setUsername(u) } catch {}
          // 清除 query 以避免重新整理又出現
          const url = new URL(location.href)
          url.searchParams.delete('threads')
          history.replaceState({}, '', url.toString())
          // 回來後再打一次狀態拿 tokenSavedAt
          try {
            const j2 = await fetch('/api/threads/status', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } }).then(r=> r.ok ? r.json() : null)
            if (j2?.tokenSavedAt) setStatusMsg(`Token 取得於 ${new Date(j2.tokenSavedAt).toLocaleString()}`)
          } catch {}
        }
      } catch {}
    }
    run()
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>個人設定</h1>
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <h2 className="font-semibold">Threads 連結</h2>
        {statusMsg && <div className="text-red-600 text-sm">{statusMsg}</div>}
        {/* 允許管理者也能連結 Threads（單帳號同時具 admin/user 的情境） */}
        {true ? (
        <div className="flex gap-2">
          <a className="btn btn-primary" href="/api/threads/oauth/start">{linked ? '已連結 Threads（OAuth）' : '連結 Threads（OAuth）'}</a>
          {linked && (
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={async ()=>{
                try {
                  setBusy(true)
                  const j = await (async () => {
                    try { return await (await fetch('/api/threads/disconnect', { method: 'POST' })).json() } catch {}
                    return await (await fetch('/.netlify/functions/threads-disconnect', { method: 'POST' })).json()
                  })()
                  if (j.ok) {
                    setLinked(false); setUsername(null); setStatusMsg('已斷開連結')
                  } else { setStatusMsg('斷開連結失敗') }
                } catch { setStatusMsg('斷開連結失敗') }
                finally { setBusy(false) }
              }}
            >斷開連結</button>
          )}
        </div>
        ) : null}
        {linked && <div className="text-green-700 text-sm">已成功連結 Threads 帳號{username ? `（${username}）` : ''}</div>}
      </div>
    </div>
  )
}


