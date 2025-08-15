import { useEffect, useState } from 'react'

type Health = {
  version: string
  env: 'DEV' | 'PROD'
  storageOk: boolean
  githubOk: boolean
  githubRemaining?: number
  checkedAt: number
  error?: string | null
}

function testLocalStorage(): boolean {
  try {
    const key = 'limiautopost:health:test'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export default function HealthStatus() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const version = String((import.meta as any).env?.VITE_APP_VERSION || '')
      const env: 'DEV' | 'PROD' = import.meta.env.DEV ? 'DEV' : 'PROD'
      const storageOk = testLocalStorage()

      let githubOk = false
      let githubRemaining: number | undefined = undefined
      let error: string | null = null

      try {
        const r = await fetch('https://api.github.com/rate_limit', {
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })
        if (r.ok) {
          const j = await r.json()
          githubOk = true
          githubRemaining = j?.resources?.core?.remaining ?? undefined
        } else if (r.status === 403) {
          githubOk = false
          error = 'GitHub API 限流，請稍後再試'
        } else {
          githubOk = false
          error = `GitHub API ${r.status}`
        }
      } catch (e) {
        githubOk = false
        error = e instanceof Error ? e.message : 'GitHub API 連線失敗'
      }

      setHealth({ version, env, storageOk, githubOk, githubRemaining, checkedAt: Date.now(), error })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const id = setInterval(load, 60_000)
    const onVisibility = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  const dot = (ok: boolean) => (
    <span
      aria-hidden
      className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
    />
  )

  return (
    <div className="card card-body text-sm space-y-2">
      <div className="flex items-center gap-2">
        <div className="font-medium">系統健康檢查</div>
        <button className="btn btn-ghost ui-12" onClick={load} disabled={loading}>{loading ? '檢查中…' : '重新檢查'}</button>
        {health?.checkedAt && (
          <span className="ui-12 text-muted">上次檢查：{new Date(health.checkedAt).toLocaleTimeString()}</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="flex items-center gap-2">
          {dot(true)}<span>版本</span>
          <code className="px-1 rounded bg-gray-100 border text-xs">{health?.version || 'N/A'}</code>
        </div>
        <div className="flex items-center gap-2">
          {dot(true)}<span>環境</span>
          <span className="text-xs text-muted">{health?.env || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2">
          {dot(!!health?.storageOk)}<span>LocalStorage</span>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          {dot(!!health?.githubOk)}<span>GitHub API</span>
          {typeof health?.githubRemaining === 'number' && (
            <span className="ui-12 text-muted">剩餘額度：{health.githubRemaining}</span>
          )}
        </div>
      </div>
      {!!health?.error && (
        <div className="ui-12 text-red-600">{health.error}</div>
      )}
    </div>
  )
}


