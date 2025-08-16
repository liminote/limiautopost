import { useEffect, useMemo, useState } from 'react'
import { addTracked, getTracked, nextArticleId } from '../../tracking/tracking'
import type { TrackedPost } from '../../tracking/tracking'
import GeneratedCard, { type GeneratedCardData } from '../../components/GeneratedCard'
import { CardService } from '../../services/cardService'
import type { BaseCard } from '../../types/cards'

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
  const [selectedTemplates, setSelectedTemplates] = useState<BaseCard[]>([])
  // 追蹤列表刷新（暫存於本地，供加入追蹤後同步 UI 用）
  const [, setTracked] = useState<TrackedPost[]>([])
  const refreshTracked = () => setTracked(getTracked())
  
  const cardService = CardService.getInstance()

  useEffect(() => { refreshTracked() }, [])

  // 載入用戶選擇的模板
  useEffect(() => {
    const loadSelectedTemplates = () => {
      // TODO: 獲取真實用戶 ID
      const userId = 'current-user'
      const templates = cardService.getSelectedTemplates(userId)
      setSelectedTemplates(templates)
      console.log('[Generator] 載入的選擇模板:', templates)
    }

    loadSelectedTemplates()
  }, [])

  // 載入保存的內容（頁面載入時）
  useEffect(() => {
    try {
      const savedTitle = localStorage.getItem('generator:title')
      const savedArticle = localStorage.getItem('generator:article')
      const savedCards = localStorage.getItem('generator:cards')
      
      if (savedTitle) setTitle(savedTitle)
      if (savedArticle) setArticle(savedArticle)
      if (savedCards) {
        try {
          const parsedCards = JSON.parse(savedCards)
          setCards(parsedCards)
        } catch (e) {
          console.warn('無法解析保存的卡片數據:', e)
        }
      }
    } catch (e) {
      console.warn('載入保存的內容失敗:', e)
    }
  }, [])

  // 保存內容到 localStorage（當內容變化時）
  useEffect(() => {
    try {
      localStorage.setItem('generator:title', title)
      localStorage.setItem('generator:article', article)
      localStorage.setItem('generator:cards', JSON.stringify(cards))
    } catch (e) {
      console.warn('保存內容失敗:', e)
    }
  }, [title, article, cards])

  // 頁面卸載時清除保存的內容（重新載入時會清除）
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.removeItem('generator:title')
        localStorage.removeItem('generator:article')
        localStorage.removeItem('generator:cards')
      } catch (e) {
        console.warn('清除保存的內容失敗:', e)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

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
    if (selectedTemplates.length === 0) {
      alert('請先在「個人設定」中選擇至少一個模板')
      return
    }

    setGenerating(true)
    setTimeout(() => {
      const res = generateFrom(article)
      const articleId = nextArticleId()
      
              // 根據用戶選擇的模板生成卡片
        const newCards: Card[] = selectedTemplates.map((template, index) => {
          let content = ''
          let code = ''
          
          // 根據模板類型和平台生成內容
          if (template.platform === 'threads') {
            // 根據模板順序選擇不同長度的內容
            if (index === 0) {
              content = res[0] // 500字
              code = 'T1'
            } else if (index === 1) {
              content = res[1] // 350字
              code = 'T2'
            } else {
              content = res[2] // 200字
              code = 'T3'
            }
          } else if (template.platform === 'instagram') {
            content = res[3] // 220字
            code = 'IG'
          } else {
            content = res[0] // 預設使用最長內容
            code = 'FB'
          }
          
          return {
            id: crypto.randomUUID(),
            platform: template.platform === 'threads' ? 'Threads' : 
                     template.platform === 'instagram' ? 'Instagram' : 
                     template.platform === 'facebook' ? 'Facebook' : 'Threads',
            label: `${template.platform === 'threads' ? 'Threads' : 
                    template.platform === 'instagram' ? 'Instagram' : 
                    template.platform === 'facebook' ? 'Facebook' : 'Threads'} - ${template.templateTitle} · ${articleId}`,
            content: content || template.prompt || '請輸入內容',
            checked: false,
            code: code
          }
        })
      
      setCards(newCards)
      setGenerating(false)
    }, 300)
  }

  const onCopy = async (content: string) => {
    try { await navigator.clipboard.writeText(content); alert('已複製到剪貼簿') } catch { alert('複製失敗') }
  }



  const onAddToTracking = () => {
    console.log('[onAddToTracking] 開始執行')
    const selected = cards.filter(c => c.checked)
    console.log('[onAddToTracking] 選取的卡片:', selected.map(c => ({ id: c.id, platform: c.platform, content: c.content.substring(0, 50) })))
    
    if (!selected.length) {
      console.log('[onAddToTracking] 沒有選取任何卡片')
      return
    }
    
    // 從第一張卡片的 label 取出 Axxx（若沒有，臨時給一個）
    const articleId = /A\d{3}/.exec(selected[0]?.label || '')?.[0] || nextArticleId()
    console.log('[onAddToTracking] 使用的 articleId:', articleId)
    
    try {
      const result = addTracked(selected.map(c => ({
        articleId,
        branchCode: c.code,
        postId: '',
        articleTitle: title,
        content: c.content,
        platform: c.platform,
      })))
      console.log('[onAddToTracking] addTracked 結果:', result)
      alert('已加入追蹤列表：' + selected.length + ' 筆')
      setCards(prev => prev.map(c => ({ ...c, checked: false })))
      refreshTracked()
      
      // 成功加入追蹤後，清除保存的內容
      try {
        localStorage.removeItem('generator:title')
        localStorage.removeItem('generator:article')
        localStorage.removeItem('generator:cards')
      } catch (e) {
        console.warn('清除保存的內容失敗:', e)
      }
    } catch (error) {
      console.error('[onAddToTracking] 錯誤:', error)
      alert('加入追蹤列表失敗：' + String(error))
    }
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
            <button className="ml-auto btn btn-primary disabled:opacity-50" disabled={!article || generating} onClick={onGenerate}>
              {generating ? '生成中…' : '開始生成貼文'}
            </button>
          </div>
        </div>
      </div>

      {/* 右：結果卡片（2/3） */}
      <div className="space-y-4">
        {selectedTemplates.length === 0 ? (
          <div className="card card-body text-center">
            <div className="text-lg text-gray-600 mb-2">尚未選擇模板</div>
            <div className="text-sm text-gray-500 mb-4">請先在「個人設定」中選擇要使用的模板</div>
            <a href="/settings" className="btn btn-primary">前往個人設定</a>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-sm text-gray-500">尚未有結果，請先輸入文章並點「開始生成貼文」。</div>
        ) : (
           <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
              <div className="ml-auto flex items-center gap-3">
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

