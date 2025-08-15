import { useEffect, useState } from 'react'

type Commit = { sha: string; html_url: string; commit: { message: string; author: { date: string } } }

export default function DevProgress({ repo = 'liminote/limiautopost' }: { repo?: string }){
  const [list, setList] = useState<Commit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const r = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=10`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`GitHub API ${r.status}`)
      const j = (await r.json()) as Commit[]
      setList(j)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="card card-body text-sm space-y-2">
      <div className="flex items-center gap-2">
        <div className="font-medium">開發進度（最近 10 筆提交）</div>
        <button className="btn btn-ghost ui-12" onClick={load} disabled={loading}>{loading? '重新整理中…':'重新整理'}</button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <ul className="space-y-1">
        {list.map(c => (
          <li key={c.sha} className="flex items-center gap-2">
            <code className="px-1 rounded bg-gray-100 border text-xs">{c.sha.slice(0,7)}</code>
            <span className="truncate">{c.commit.message}</span>
            <span className="text-muted ml-auto ui-12">{new Date(c.commit.author.date).toLocaleString()}</span>
          </li>
        ))}
        {list.length === 0 && !error && <li className="text-muted">尚無資料</li>}
      </ul>
      <div className="ui-12 text-muted">資料來源：GitHub 公開 API（自動即時）。</div>
    </div>
  )
}


