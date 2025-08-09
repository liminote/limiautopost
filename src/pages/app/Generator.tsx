import { useMemo, useState } from 'react'
import { addTracked } from '../../tracking/tracking'

type Platform = 'Threads' | 'Instagram' | 'Facebook'

type Card = {
  id: string
  platform: Platform
  label: string
  content: string
  checked: boolean
  code: string // T1/T2/T3/IG/MAN
}

export default function Generator() {
  const [title, setTitle] = useState('')
  const [article, setArticle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [cards, setCards] = useState<Card[]>([])

  const anyChecked = useMemo(() => cards.some(c => c.checked), [cards])

  const onGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      const res = generateFrom(article)
      const newCards: Card[] = [
        { id: crypto.randomUUID(), platform: 'Threads', label: 'Threads 建議 1（約 500 字）', content: res[0], checked: false, code: 'T1' },
        { id: crypto.randomUUID(), platform: 'Threads', label: 'Threads 建議 2（約 350 字）', content: res[1], checked: false, code: 'T2' },
        { id: crypto.randomUUID(), platform: 'Threads', label: 'Threads 建議 3（約 200 字）', content: res[2], checked: false, code: 'T3' },
        { id: crypto.randomUUID(), platform: 'Instagram', label: 'Instagram 建議', content: res[3], checked: false, code: 'IG' },
      ]
      setCards(newCards)
      setGenerating(false)
    }, 300)
  }

  const onCopy = async (content: string) => {
    try { await navigator.clipboard.writeText(content); alert('已複製到剪貼簿') } catch { alert('複製失敗') }
  }

  const addManual = () => {
    setCards(prev => ([
      ...prev,
      { id: crypto.randomUUID(), platform: 'Threads', label: '手動新增', content: '', checked: false, code: 'MAN' }
    ]))
  }

  const onAddToTracking = () => {
    const selected = cards.filter(c => c.checked)
    if (!selected.length) return
    addTracked(selected.map(c => ({
      platform: c.platform,
      title,
      content: c.content,
      branchCode: c.code,
    })))
    alert('已加入追蹤列表：' + selected.length + ' 筆')
    setCards(prev => prev.map(c => ({ ...c, checked: false })))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左：輸入與設定 */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-600">標題</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)} placeholder="輸入原文標題" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">文章</label>
            <textarea className="mt-1 w-full rounded border px-3 py-2 h-56" value={article} onChange={e=>setArticle(e.target.value)} placeholder="貼上完整長文…" />
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded border text-gray-500 cursor-not-allowed" title="即將推出" disabled>個人化風格設定</button>
            <button className="ml-auto px-3 py-2 rounded bg-black text-white disabled:opacity-50" disabled={!article || generating} onClick={onGenerate}>
              {generating ? '生成中…' : '開始生成貼文'}
            </button>
          </div>
        </div>
      </div>

      {/* 右：結果卡片 */}
      <div className="lg:col-span-2 space-y-4">
        {cards.length === 0 ? (
          <div className="text-sm text-gray-500">尚未有結果，請先輸入文章並點「開始生成貼文」。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((c, idx) => (
              <div key={c.id} className="relative bg-white border rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.label} · {c.platform}</div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={c.checked} onChange={e=> setCards(prev => prev.map(x => x.id===c.id? { ...x, checked: e.target.checked }: x))} />
                    選取
                  </label>
                </div>
                {c.code === 'MAN' && (
                  <select className="w-40 rounded border px-2 py-1 text-sm" value={c.platform} onChange={e=> setCards(prev => prev.map(x => x.id===c.id? { ...x, platform: e.target.value as Platform }: x))}>
                    <option>Threads</option>
                    <option>Instagram</option>
                    <option>Facebook</option>
                  </select>
                )}
                <textarea className="min-h-40 rounded border px-3 py-2 text-sm" value={c.content} onChange={e=> setCards(prev => prev.map(x => x.id===c.id? { ...x, content: e.target.value }: x))} />
                <div className="flex justify-end">
                  <button className="px-2 py-1 rounded border text-sm" onClick={()=>onCopy(c.content)}>複製</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button className="px-3 py-2 rounded border" onClick={addManual}>＋ 手動新增卡片</button>
          {anyChecked && (
            <button className="ml-auto px-3 py-2 rounded bg-black text-white" onClick={onAddToTracking}>將選取項目加入追蹤列表</button>
          )}
        </div>
      </div>
    </div>
  )
}

function generateFrom(text: string): [string, string, string, string] {
  const cleaned = text.replace(/\n+/g, '\n').trim()
  const parts = cleaned.split(/(?<=[。！？!?.])\s*/)
  const makeLen = (limit: number) => {
    if (!cleaned) return ''
    let out = ''
    for (const s of parts) {
      if ((out + s).length > limit) break
      out += s
    }
    if (!out) out = cleaned.slice(0, limit)
    return out
  }
  return [makeLen(500), makeLen(350), makeLen(200), makeLen(220)]
}


