import { useEffect, useMemo, useState } from 'react'
import { addTracked, getTracked, nextArticleId } from '../../tracking/tracking'
import type { TrackedPost } from '../../tracking/tracking'
import GeneratedCard, { type GeneratedCardData } from '../../components/GeneratedCard'

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
  // 追蹤列表刷新（暫存於本地，供加入追蹤後同步 UI 用）
  const [, setTracked] = useState<TrackedPost[]>([])
  const refreshTracked = () => setTracked(getTracked())
  useEffect(() => { refreshTracked() }, [])

  // SEO
  useEffect(() => {
    document.title = '貼文生成器 - limiautopost'
    let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m) }
    m.content = '生成 Threads/IG 文案的結果卡片，緊湊操作與一致對齊。'
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = location.href
  }, [])

  const anyChecked = useMemo(() => {
    const checked = cards.some(c => c.checked)
    console.log('[Generator] anyChecked:', checked, 'cards:', cards.map(c => ({ id: c.id, checked: c.checked, platform: c.platform })))
    return checked
  }, [cards])

  const onGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      const res = generateFrom(article)
      const articleId = nextArticleId()
      const newCards: Card[] = [
        // 調整順序：200 → 350 → 500 → IG
        { id: crypto.randomUUID(), platform: 'Threads', label: `Threads 建議 1（約 200 字） · ${articleId}`, content: res[2], checked: false, code: 'T3' },
        { id: crypto.randomUUID(), platform: 'Threads', label: `Threads 建議 2（約 350 字） · ${articleId}`, content: res[1], checked: false, code: 'T2' },
        { id: crypto.randomUUID(), platform: 'Threads', label: `Threads 建議 3（約 500 字） · ${articleId}`, content: res[0], checked: false, code: 'T1' },
        { id: crypto.randomUUID(), platform: 'Instagram', label: `Instagram 建議 · ${articleId}`, content: res[3], checked: false, code: 'IG' },
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
      { id: crypto.randomUUID(), platform: 'Threads', label: '手動新增', content: '', checked: false, code: 'MAN' },
      ...prev
    ]))
  }
  
  // 新增不同平台的卡片
  const addManualWithPlatform = (platform: 'Threads' | 'Instagram' | 'Facebook') => {
    setCards(prev => ([
      { id: crypto.randomUUID(), platform, label: `手動新增 - ${platform}`, content: '', checked: false, code: 'MAN' },
      ...prev
    ]))
  }

  const onAddToTracking = () => {
    const selected = cards.filter(c => c.checked)
    if (!selected.length) return
    // 從第一張卡片的 label 取出 Axxx（若沒有，臨時給一個）
    const articleId = /A\d{3}/.exec(selected[0]?.label || '')?.[0] || nextArticleId()
    addTracked(selected.map(c => ({
      articleId,
      branchCode: c.code,
      postId: '',
      articleTitle: title,
      content: c.content,
      platform: c.platform,
    })))
    alert('已加入追蹤列表：' + selected.length + ' 筆')
    setCards(prev => prev.map(c => ({ ...c, checked: false })))
    refreshTracked()
  }

  return (
    <div className="ui-12" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', position: 'relative' }}>
      {/* 左：輸入與設定 */}
      <div className="space-y-4">
        <div className="card card-body space-y-3">
          <div>
            <label className="block text-sm text-gray-600">標題</label>
            <input className="mt-1 input w-full text-base" value={title} onChange={e=>setTitle(e.target.value)} placeholder="輸入原文標題" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">文章</label>
            <textarea className="mt-1 textarea w-full text-sm" style={{ height: '20rem' }} value={article} onChange={e=>setArticle(e.target.value)} placeholder="貼上完整長文…" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost text-gray-500 cursor-not-allowed" title="即將推出" disabled>個人化風格設定</button>
            <button className="ml-auto btn btn-primary disabled:opacity-50" disabled={!article || generating} onClick={onGenerate}>
              {generating ? '生成中…' : '開始生成貼文'}
            </button>
          </div>
        </div>
      </div>

      {/* 右：結果卡片（2/3） */}
      <div className="space-y-4">
        {cards.length === 0 ? (
          <div className="text-sm text-gray-500">尚未有結果，請先輸入文章並點「開始生成貼文」。</div>
        ) : (
           <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <button className="btn btn-outline text-sm" onClick={addManual}>＋ Threads</button>
                <button className="btn btn-outline text-sm" onClick={() => addManualWithPlatform('Instagram')}>＋ Instagram</button>
                <button className="btn btn-outline text-sm" onClick={() => addManualWithPlatform('Facebook')}>＋ Facebook</button>
              </div>
              <div className="ml-auto mr-5 flex items-center gap-3">
                <button
                  className="text-xs text-gray-600 hover:text-gray-900"
                  onClick={()=> setCards(prev => prev.map(x => ({ ...x, checked: true })))}
                >全選</button>
                <button
                  className="text-xs text-gray-600 hover:text-gray-900"
                  onClick={()=> setCards(prev => prev.map(x => ({ ...x, checked: false })))}
                >全不選</button>
              </div>
            </div>
            {cards.map((c, idx) => (
              <GeneratedCard
                key={c.id}
                card={c as unknown as GeneratedCardData}
                bgVar={idx % 4 === 0 ? '--card-tint-1' : idx % 4 === 1 ? '--card-tint-2' : idx % 4 === 2 ? '--card-tint-3' : '--card-tint-4'}
                onToggleChecked={(id, checked)=> setCards(prev => prev.map(x => x.id===id? { ...x, checked }: x))}
                onPlatformChange={(id, platform)=> setCards(prev => prev.map(x => x.id===id? { ...x, platform: platform as Platform }: x))}
                onContentChange={(id, content)=> setCards(prev => prev.map(x => x.id===id? { ...x, content }: x))}
                onCopy={(content)=> onCopy(content)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 追蹤列表移至 /tracking；此頁僅保留「加入追蹤」行為 */}

      {anyChecked && (
        <button
          className="btn btn-primary shadow-lg fixed bottom-6 right-6 z-50"
          onClick={onAddToTracking}
        >
          將選取項目加入追蹤列表
        </button>
      )}
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

