import { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getTracked, clearTracked, addTracked, type TrackedPost } from '../../tracking/tracking'
import TrackingTable from '../../components/TrackingTable'

export default function TrackingPage() {
  const [rows, setRows] = useState<TrackedPost[]>([])
  const [allRows, setAllRows] = useState<TrackedPost[]>([])
  const [loading, setLoading] = useState(true)
  
  const refresh = () => { const data = getTracked(); setRows(data); setAllRows(data); setLoading(false) }
  useEffect(() => { const id = setTimeout(refresh, 300); return () => clearTimeout(id) }, [])
  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const seedExamples = () => {
    addTracked([
      {
        articleId: 'A001',
        articleTitle: '如何把長文轉為 Threads/IG 貼文',
        content: '把長文切段，精煉重點，加入表情與標籤。',
        platform: 'Threads',
        permalink: '',
        publishDate: '',
        notes: '示例資料'
      },
      {
        articleId: 'A002',
        articleTitle: '本週社群重點',
        content: '本週精選 3 篇內容與成效摘要。',
        platform: 'Instagram',
        permalink: '',
        publishDate: '',
        notes: '示例資料'
      },
      {
        articleId: 'A003',
        articleTitle: '產品更新公告',
        content: '新增健康檢查與開發進度面板，優化載入體驗。',
        platform: 'Facebook',
        permalink: '',
        publishDate: '',
        notes: '示例資料'
      }
    ])
    refresh()
  }

  // 排序與分頁
  const [sortKey, setSortKey] = useState<'createdAt'|'likes'|'comments'|'shares'>('createdAt')
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  useEffect(() => { setPage(1) }, [sortKey, sortDir, pageSize, rows])
  const displayed = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const val = (r: TrackedPost): number => {
      if (sortKey === 'createdAt') return r.createdAt ? new Date(r.createdAt).getTime() : 0
      return Number((r as any)[sortKey] ?? 0)
    }
    const sorted = [...rows].sort((a,b) => (val(a) - val(b)) * dir)
    const total = sorted.length
    const start = Math.max(0, (page - 1) * pageSize)
    const end = Math.min(total, start + pageSize)
    return { list: sorted.slice(start, end), total, start: start + 1, end }
  }, [rows, sortKey, sortDir, page, pageSize])

  const exportCSV = () => {
    if (!rows.length) return
    const header = ['postId','articleId','articleTitle','platform','content','permalink','publishDate','likes','comments','shares','notes','createdAt']
    const data = rows.map(r => [
      r.postId,
      r.articleId,
      (r.articleTitle||'').replaceAll('\n',' '),
      r.platform,
      (r.content||'').replaceAll('\n',' '),
      r.permalink ?? '',
      r.publishDate ?? '',
      r.likes ?? 0,
      r.comments ?? 0,
      r.shares ?? 0,
      r.notes ?? '',
      r.createdAt ?? '',
    ])
    const lines = [header, ...data]
      .map(r => r.map(x => '"' + String(x ?? '').replaceAll('"','""') + '"').join(','))
      .join('\r\n')
    const csv = '\uFEFF' + lines
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tracked-posts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">追蹤列表</h1>
          <p className="text-gray-600">管理已發佈的貼文與追蹤成效</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={seedExamples}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            載入示例
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            匯出 CSV
          </button>
          <button
            onClick={clearTracked}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            清空列表
          </button>
        </div>
      </div>

      <TrackingTable
        rows={displayed.list}
        setRows={setRows}
        loading={loading}
      />
    </div>
  )
}

type FilterPayload = {
  keyword?: string
  start?: string
  end?: string
  platforms?: Array<'Threads'|'Instagram'|'Facebook'>
  permalink?: 'any' | 'yes' | 'no'
  notes?: 'any' | 'yes' | 'no'
  minLikes?: number | ''
  maxLikes?: number | ''
  tags?: string[]
}

function SearchBar({ onFilter, availableTags }: { onFilter: (payload: FilterPayload) => void; availableTags: string[] }){
  const [kw, setKw] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [pThreads, setPThreads] = useState(true)
  const [pIG, setPIG] = useState(true)
  const [pFB, setPFB] = useState(true)
  const [permalink, setPermalink] = useState<'any'|'yes'|'no'>('any')
  const [notes, setNotes] = useState<'any'|'yes'|'no'>('any')
  const [minLikes, setMinLikes] = useState<string>('')
  const [maxLikes, setMaxLikes] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const submit = () => onFilter({
    keyword: kw,
    start: start || undefined,
    end: end || undefined,
    platforms: [pThreads && 'Threads', pIG && 'Instagram', pFB && 'Facebook'].filter(Boolean) as any,
    permalink,
    notes,
    minLikes: (minLikes === '' ? undefined : Number(minLikes)) as any,
    maxLikes: (maxLikes === '' ? undefined : Number(maxLikes)) as any,
    tags: selectedTags,
  })

  const reset = () => {
    setKw(''); setStart(''); setEnd(''); setPThreads(true); setPIG(true); setPFB(true); setPermalink('any'); setNotes('any'); setMinLikes(''); setMaxLikes(''); setSelectedTags([]);
    onFilter({})
  }

  return (
    <div className="card card-body flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm text-gray-600">關鍵字</label>
        <input className="ui-input-sm" placeholder="輸入關鍵字" value={kw} onChange={e=>setKw(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600">建立起</label>
        <input className="ui-date-sm" type="date" value={start} onChange={e=>setStart(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600">建立迄</label>
        <input className="ui-date-sm" type="date" value={end} onChange={e=>setEnd(e.target.value)} />
      </div>

      <div className="flex items-center gap-2 ml-4">
        <span className="text-sm text-gray-600">平台</span>
        <label className="inline-flex items-center gap-1 text-sm"><input type="checkbox" className="size-4" checked={pThreads} onChange={e=>setPThreads(e.target.checked)} />TD</label>
        <label className="inline-flex items-center gap-1 text-sm"><input type="checkbox" className="size-4" checked={pIG} onChange={e=>setPIG(e.target.checked)} />IG</label>
        <label className="inline-flex items-center gap-1 text-sm"><input type="checkbox" className="size-4" checked={pFB} onChange={e=>setPFB(e.target.checked)} />FB</label>
      </div>

      <div>
        <label className="block text-sm text-gray-600">連結</label>
        <select className="ui-select-sm" value={permalink} onChange={e=>setPermalink(e.target.value as any)}>
          <option value="any">不限</option>
          <option value="yes">有</option>
          <option value="no">無</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-600">備註</label>
        <select className="ui-select-sm" value={notes} onChange={e=>setNotes(e.target.value as any)}>
          <option value="any">不限</option>
          <option value="yes">有</option>
          <option value="no">無</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-600">讚數 ≥</label>
        <input className="ui-input-sm w-24" inputMode="numeric" pattern="[0-9]*" value={minLikes} onChange={e=>setMinLikes(e.target.value.replace(/[^0-9]/g,''))} />
      </div>
      <div>
        <label className="block text-sm text-gray-600">讚數 ≤</label>
        <input className="ui-input-sm w-24" inputMode="numeric" pattern="[0-9]*" value={maxLikes} onChange={e=>setMaxLikes(e.target.value.replace(/[^0-9]/g,''))} />
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-col gap-1 max-w-full min-w-[18rem]">
          <span className="text-sm text-gray-600">標籤</span>
          <div className="relative w-full">
            {/* 已選標籤 + 輸入框 */}
            <div className="flex flex-wrap items-center gap-1 border rounded px-2 py-1 bg-white">
              {selectedTags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                  <span>{tag}</span>
                  <button type="button" className="text-blue-600" onClick={()=> setSelectedTags(prev => prev.filter(t => t !== tag))}>×</button>
                </span>
              ))}
              <TagAutocompleteInput
                placeholder="輸入以搜尋標籤…"
                suggestions={availableTags}
                onPick={(t)=> setSelectedTags(prev => prev.includes(t) ? prev : [...prev, t])}
              />
            </div>
          </div>
        </div>
      )}

      <div className="ml-auto flex gap-2">
        <button className="btn btn-outline" onClick={submit}>搜尋</button>
        <button className="btn btn-ghost" onClick={reset}>重置</button>
      </div>
    </div>
  )
}

function TagAutocompleteInput({ suggestions, onPick, placeholder }: { suggestions: string[]; onPick: (tag: string) => void; placeholder?: string }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const list = useMemo(() => {
    const q = value.trim().toLowerCase()
    const arr = q ? suggestions.filter(t => t.toLowerCase().includes(q)) : suggestions.slice(0, 20)
    return arr.slice(0, 20)
  }, [value, suggestions])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const pick = (t: string) => {
    if (!t) return
    onPick(t)
    setValue('')
    setOpen(false)
    setHi(0)
  }

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-[10rem]">
      <input
        className="ui-input-sm w-full border-0 focus:ring-0"
        placeholder={placeholder}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={e => { setValue(e.target.value); setOpen(true); setHi(0) }}
        onKeyDown={e => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
          if (e.key === 'ArrowDown') { setHi(i => Math.min(i + 1, Math.max(0, list.length - 1))); e.preventDefault() }
          else if (e.key === 'ArrowUp') { setHi(i => Math.max(i - 1, 0)); e.preventDefault() }
          else if (e.key === 'Enter') { if (list[hi]) { pick(list[hi]) } }
          else if (e.key === 'Escape') { setOpen(false) }
        }}
      />
      {open && list.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded border bg-white shadow">
          {list.map((t, idx) => (
            <div
              key={t}
              className={`px-2 py-1 text-sm cursor-pointer ${idx===hi? 'bg-blue-50' : ''}`}
              onMouseEnter={()=> setHi(idx)}
              onMouseDown={(e)=> { e.preventDefault(); pick(t) }}
            >{t}</div>
          ))}
        </div>
      )}
    </div>
  )
}

