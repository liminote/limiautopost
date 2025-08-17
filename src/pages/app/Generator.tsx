import { useEffect, useMemo, useState, useCallback } from 'react'
import { addTracked, getTracked, nextArticleId } from '../../tracking/tracking'
import type { TrackedPost } from '../../tracking/tracking'
import GeneratedCard, { type GeneratedCardData } from '../../components/GeneratedCard'
import { CardService } from '../../services/cardService'
import type { BaseCard } from '../../types/cards'
import { useSession } from '../../auth/auth'
import { PLATFORM_CONFIG, generateCode, mapPlatform, getPlatformLabel, type PlatformType } from '../../config/platformConfig'

type Platform = 'Threads' | 'Instagram' | 'Facebook' | 'General'

type Card = {
  id: string
  platform: Platform
  label: string
  content: string
  checked: boolean
  code: string // T1/T2/T3/IG/MAN
}

export default function Generator() {
  const session = useSession()
  const [title, setTitle] = useState('')
  const [article, setArticle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<BaseCard[]>([])
  // 追蹤列表刷新（暫存於本地，供加入追蹤後同步 UI 用）
  const [, setTracked] = useState<TrackedPost[]>([])
  
  const cardService = CardService.getInstance()

  // 使用 useCallback 來避免無限循環
  const refreshTracked = useCallback(() => {
    setTracked(getTracked())
  }, [])

  useEffect(() => { refreshTracked() }, [refreshTracked])

  // 載入用戶選擇的模板
  useEffect(() => {
    if (!session) {
      return // 未登入時不載入
    }
    
    const loadSelectedTemplates = () => {
      const templates = cardService.getSelectedTemplates(session.email)
      setSelectedTemplates(templates)
    }

    loadSelectedTemplates()
  }, [session?.email]) // 只依賴 session.email，避免無限迴圈

  // 載入保存的內容（頁面載入時）
  useEffect(() => {
    if (!session) return // 未登入時不載入
    
    try {
      const savedTitle = localStorage.getItem(`generator:${session.email}:title`)
      const savedArticle = localStorage.getItem(`generator:${session.email}:article`)
      const savedCards = localStorage.getItem(`generator:${session.email}:cards`)
      
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
  }, [session?.email])

  // 保存內容到 localStorage（當內容變化時）
  useEffect(() => {
    if (!session) return // 未登入時不保存
    
    try {
      localStorage.setItem(`generator:${session.email}:title`, title)
      localStorage.setItem(`generator:${session.email}:article`, article)
      localStorage.setItem(`generator:${session.email}:cards`, JSON.stringify(cards))
    } catch (e) {
      console.warn('保存內容失敗:', e)
    }
  }, [title, article, cards, session?.email])

  // 頁面卸載時清除保存的內容（重新載入時會清除）
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!session) return
      
      try {
        localStorage.removeItem(`generator:${session.email}:title`)
        localStorage.removeItem(`generator:${session.email}:article`)
        localStorage.removeItem(`generator:${session.email}:cards`)
      } catch (e) {
        console.warn('清除保存的內容失敗:', e)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [session?.email])

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
    return cards.some(c => c.checked)
  }, [cards])

  const onClear = () => {
    if (title || article) {
      if (confirm('確定要清空所有內容嗎？')) {
        setTitle('')
        setArticle('')
        // 清除 localStorage 中的保存內容
        if (session) {
          try {
            localStorage.removeItem(`generator:${session.email}:title`)
            localStorage.removeItem(`generator:${session.email}:article`)
            localStorage.removeItem(`generator:${session.email}:cards`)
          } catch (e) {
            console.warn('清除保存的內容失敗:', e)
          }
        }
        // 清空生成的卡片
        setCards([])
      }
    }
  }

  const onGenerate = () => {
    if (selectedTemplates.length === 0) {
      alert('請先在「個人設定」中選擇至少一個模板')
      return
    }

    if (!article.trim()) {
      alert('請先輸入文章內容')
      return
    }

    setGenerating(true)
    setTimeout(() => {
      const res = generateFrom(article)
      const articleId = nextArticleId()
      
      // 根據用戶選擇的模板生成卡片
      console.log('[Generator] 選擇的模板:', selectedTemplates.map((t, i) => ({ index: i, platform: t.platform, title: t.templateTitle })))
      
      // 為每個平台獨立計數
      const platformCounters = { threads: 0, instagram: 0, general: 0, facebook: 0 }
      
      const newCards: Card[] = selectedTemplates.map((template) => {
        const platform = template.platform as PlatformType
        const config = PLATFORM_CONFIG[platform]
        
        // 根據平台配置生成內容和編號
        let content = ''
        if (platform === 'threads') {
          // Threads 平台根據模板順序選擇不同長度
          if (platformCounters.threads === 0) content = res[0] // 500字
          else if (platformCounters.threads === 1) content = res[1] // 350字
          else if (platformCounters.threads === 2) content = res[2] // 200字
          else content = res[0] // 超過3個模板時使用最長內容
        } else {
          // 其他平台使用配置的內容索引
          content = res[config.contentIndex]
        }
        
        // 生成編號（使用平台專用計數器）
        const code = generateCode(platform, platformCounters[platform])
        platformCounters[platform]++ // 增加該平台的計數器
        
        const card: Card = {
          id: crypto.randomUUID(),
          platform: mapPlatform(platform),
          label: `${getPlatformLabel(platform)} - ${template.templateTitle} · ${articleId}`,
          content: content || template.prompt || '請輸入內容',
          checked: false,
          code: code
        }
        
        console.log(`[Generator] 生成卡片 ${platformCounters[platform]}:`, { platform: template.platform, code, title: template.templateTitle })
        
        return card
      })
      
      setCards(newCards)
      setGenerating(false)
    }, 300)
  }

  const onCopy = async (content: string) => {
    try { await navigator.clipboard.writeText(content); alert('已複製到剪貼簿') } catch { alert('複製失敗') }
  }



  const onAddToTracking = () => {
    const selected = cards.filter(c => c.checked)
    
    if (!selected.length) {
      return
    }
    
    // 從第一張卡片的 label 取出 Axxx（若沒有，臨時給一個）
    const articleId = /A\d{3}/.exec(selected[0]?.label || '')?.[0] || nextArticleId()
    
    try {
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
      
      // 成功加入追蹤後，清除保存的內容
      try {
        if (session) {
          localStorage.removeItem(`generator:${session.email}:title`)
          localStorage.removeItem(`generator:${session.email}:article`)
          localStorage.removeItem(`generator:${session.email}:cards`)
        }
      } catch (e) {
        console.warn('清除保存的內容失敗:', e)
      }
      
      // 導向追蹤列表頁面
      window.location.href = '/tracking'
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
            <button 
              className="btn" 
              style={{ 
                backgroundColor: 'var(--yinmn-blue-300)', 
                color: 'white', 
                border: '1px solid var(--yinmn-blue-300)'
              }}
              onClick={onClear}
              disabled={!title && !article}
            >
              清空內容
            </button>
            <button className="btn btn-primary disabled:opacity-50" disabled={!article || generating} onClick={onGenerate}>
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

