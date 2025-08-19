import { useEffect, useMemo, useState, useCallback } from 'react'
import { addTracked, getTracked, nextArticleId } from '../../tracking/tracking'
import type { TrackedPost } from '../../tracking/tracking'
import GeneratedCard, { type GeneratedCardData } from '../../components/GeneratedCard'
import { CardService } from '../../services/cardService'
import type { BaseCard } from '../../types/cards'
import { GeminiService } from '../../services/geminiService'
import { aiServiceManager, type AIModel } from '../../services/aiServiceManager'
import { useSession } from '../../auth/auth'

type PlatformType = 'threads' | 'instagram' | 'facebook' | 'general'
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
  const session = useSession()
  const [title, setTitle] = useState('')
  const [article, setArticle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<BaseCard[]>([])
  const [selectedAIModel, setSelectedAIModel] = useState<AIModel>('gemini')
  const [aiServicesStatus, setAiServicesStatus] = useState<Array<{ model: AIModel; success: boolean; message: string }>>([])
  // 追蹤列表刷新（暫存於本地，供加入追蹤後同步 UI 用）
  const [, setTracked] = useState<TrackedPost[]>([])
  
  const cardService = CardService.getInstance()
  const geminiService = GeminiService.getInstance()

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
    
    const loadSelectedTemplates = async () => {
      // 從 CardService 獲取最新的系統模板
      const systemTemplates = cardService.getSystemTemplatesAsBaseCards()
      
      // 獲取用戶自定義模板
      const userTemplates = cardService.getUserCards(session.email)
      
      // 合併模板並標記選擇狀態
      const allTemplates = [...systemTemplates, ...userTemplates]
      const userSelections = cardService.getUserSelections(session.email)
      
      const availableTemplates = allTemplates.map(template => ({
        ...template,
        isSelected: userSelections.has(template.id)
      }))
      
      const selectedTemplates = availableTemplates.filter(template => template.isSelected)
      setSelectedTemplates(selectedTemplates)
    }

    loadSelectedTemplates()

    // 使用 CardService 的訂閱機制來監聽資料變更
    const unsubscribe = cardService.subscribeToChanges(() => {
      console.log('[Generator] 收到模板資料變更通知，重新載入...')
      loadSelectedTemplates()
    })

    return () => {
      unsubscribe()
    }
  }, [session?.email, cardService])

  // 檢查 AI 服務狀態
  useEffect(() => {
    const checkAIServices = async () => {
      const status = await aiServiceManager.testAllServices()
      setAiServicesStatus(status)
      
      // 自動選擇可用的服務
      const availableServices = status.filter(s => s.success)
      if (availableServices.length > 0) {
        const firstAvailable = availableServices[0]
        setSelectedAIModel(firstAvailable.model)
      }
    }
    
    checkAIServices()
  }, [])

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
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [session?.email])

  const onClear = () => {
    setTitle('')
    setArticle('')
    setCards([])
    
    if (session) {
      try {
        localStorage.removeItem(`generator:${session.email}:title`)
        localStorage.removeItem(`generator:${session.email}:article`)
        localStorage.removeItem(`generator:${session.email}:cards`)
      } catch (e) {
        console.warn('清除保存的內容失敗:', e)
      }
    }
  }

  const onGenerate = async () => {
    if (selectedTemplates.length === 0) {
      alert('請先選擇模板')
      return
    }

    if (!article.trim()) {
      alert('請輸入文章內容')
      return
    }

    setGenerating(true)
    
    try {
      console.log('[Generator] 開始 AI 生成，選擇的模板數量:', selectedTemplates.length)
      
      const articleId = nextArticleId()
      const newCards: Card[] = []
      
      // 為每個選中的模板生成內容
      for (let i = 0; i < selectedTemplates.length; i++) {
        const template = selectedTemplates[i]
        const platform = template.platform as PlatformType
        
        console.log(`[Generator] 生成模板 ${i + 1}/${selectedTemplates.length}:`, {
          platform: template.platform,
          title: template.templateTitle,
          prompt: template.prompt.substring(0, 100) + '...'
        })
        
        // 調用選定的 AI 服務生成內容，字數完全由 Prompt 決定
        const result = await aiServiceManager.generatePostWithModel(
          selectedAIModel,
          template.prompt,
          article,
          0 // 傳入 0 表示字數由 Prompt 決定
        )
        
        if (result.success && result.content) {
          const code = generateCode(platform, i)
          const card: Card = {
            id: crypto.randomUUID(),
            platform: mapPlatform(platform),
            label: `${articleId} | ${template.templateTitle} (${result.model.toUpperCase()})`,
            content: result.content,
            checked: false,
            code: code
          }
          newCards.push(card)
          console.log(`[Generator] 模板 ${i + 1} 生成成功，使用 ${result.model}，字數:`, result.content.length)
        } else {
          console.error(`[Generator] 模板 ${i + 1} 生成失敗:`, result.error)
          // 生成失敗時，使用備用的簡單截取（預設 300 字）
          const fallbackContent = generateFallbackContent(article, 300, i)
          const code = generateCode(platform, i)
          const card: Card = {
            id: crypto.randomUUID(),
            platform: mapPlatform(platform),
            label: `${articleId} | ${template.templateTitle} (備用)`,
            content: fallbackContent,
            checked: false,
            code: code
          }
          newCards.push(card)
        }
      }
      
      setCards(newCards)
      console.log('[Generator] AI 生成完成，總共生成卡片:', newCards.length)
      
    } catch (error) {
      console.error('[Generator] AI 生成過程發生錯誤:', error)
      alert('生成失敗，請稍後再試')
    } finally {
      setGenerating(false)
    }
  }

  const onCopy = async (content: string) => {
    try { 
      await navigator.clipboard.writeText(content)
      alert('已複製到剪貼簿') 
    } catch { 
      alert('複製失敗') 
    }
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
        platform: c.platform as 'Threads' | 'Instagram' | 'Facebook',
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

  const anyChecked = useMemo(() => cards.some(c => c.checked), [cards])

  return (
    <div className="ui-12" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', position: 'relative' }}>
      {/* 左：輸入與設定 */}
      <div className="space-y-4">
        <div className="card card-body space-y-3">
          <div>
            <label className="block text-sm text-gray-600">標題</label>
            <input className="mt-1 input w-full text-base" value={title} onChange={e=>setTitle(e.target.value)} placeholder="輸入原文標題" />
          </div>
          
          {/* AI 模型選擇 */}
          <div>
            <label className="block text-sm text-gray-600">AI 模型</label>
            <div className="mt-1 flex gap-2">
              {aiServicesStatus.map((status) => (
                <button
                  key={status.model}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedAIModel === status.model
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : status.success
                      ? 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
                      : 'bg-red-100 text-red-700 border-2 border-red-200 cursor-not-allowed'
                  }`}
                  onClick={() => status.success && setSelectedAIModel(status.model)}
                  disabled={!status.success}
                  title={status.message}
                >
                  {status.model === 'gemini' ? 'Gemini' : 'ChatGPT'}
                  {!status.success && ' (不可用)'}
                </button>
              ))}
            </div>
            {aiServicesStatus.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                選擇使用 {selectedAIModel === 'gemini' ? 'Google Gemini' : 'OpenAI ChatGPT'} 來生成內容
              </div>
            )}
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
            <button className="btn btn-primary disabled:opacity-50" disabled={!article || generating || selectedTemplates.length === 0} onClick={onGenerate}>
              {generating ? 'AI 生成中…' : '開始 AI 生成貼文'}
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
          <div className="text-sm text-gray-500">尚未有結果，請先輸入文章並點「開始 AI 生成貼文」。</div>
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
                onCopy={(content)=> onCopy(c.content)}
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

// 輔助函數
function generateCode(platform: PlatformType, index: number): string {
  const platformMap = {
    threads: 'T',
    instagram: 'I',
    facebook: 'F',
    general: 'G'
  }
  return `${platformMap[platform]}${index + 1}`
}

function mapPlatform(platform: PlatformType): Platform {
  const platformMap = {
    threads: 'Threads',
    instagram: 'Instagram',
    facebook: 'Facebook',
    general: 'Threads' // 預設為 Threads
  }
  return platformMap[platform] as Platform
}

function getPlatformLabel(platform: PlatformType): string {
  const platformMap = {
    threads: 'Threads',
    instagram: 'Instagram',
    facebook: 'Facebook',
    general: 'General'
  }
  return platformMap[platform]
}

// 備用內容生成函數（當 AI 生成失敗時使用）
function generateFallbackContent(text: string, targetLength: number, templateIndex: number = 0): string {
  const cleaned = text.replace(/\n+/g, '\n').trim()
  const parts = cleaned.split(/(?<=[。！？!?.])\s*/)
  
  // 根據模板索引選擇不同的起始位置，避免重複
  const startIndex = (templateIndex * 2) % parts.length
  const selectedParts = [...parts.slice(startIndex), ...parts.slice(0, startIndex)]
  
  let out = ''
  for (const s of selectedParts) {
    if ((out + s).length > targetLength) break
    out += s
  }
  
  if (!out) {
    // 如果還是沒有內容，從不同位置截取
    const startPos = (templateIndex * 100) % cleaned.length
    out = cleaned.slice(startPos, startPos + targetLength)
  }
  
  return out
}

