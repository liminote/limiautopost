import { useEffect, useState } from 'react'
import CardManager from '../components/CardManager'
import { CardService } from '../services/cardService'
import type { BaseCard } from '../types/cards'
import { useSession } from '../auth/auth'

export default function UserSettings(){
  const session = useSession()
  const [linked, setLinked] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // 模板管理相關狀態
  const [availableTemplates, setAvailableTemplates] = useState<BaseCard[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<BaseCard[]>([])
  const [maxSelections, setMaxSelections] = useState(5)

  const cardService = CardService.getInstance()

  // 從 AIGenerator 的 localStorage 讀取最新的系統模板
  const getSystemTemplatesFromAIGenerator = (): BaseCard[] => {
    try {
      const saved = localStorage.getItem('aigenerator_templates')
      if (saved) {
        const templates = JSON.parse(saved)
        return templates.map((template: any) => ({
          id: template.id,
          name: template.title, // 使用 AIGenerator 中的 title
          description: template.features, // 使用 AIGenerator 中的 features
          category: template.platform.toLowerCase(),
          prompt: template.prompt,
          isActive: true,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          platform: template.platform.toLowerCase(),
          templateTitle: template.title,
          templateFeatures: template.features,
          isSelected: true
        }))
      }
    } catch (error) {
      console.warn('無法從 AIGenerator 讀取模板:', error)
    }
    
    // 如果無法讀取，回退到預設模板
    return cardService.getAllCards(session?.email || 'default').filter(card => card.isSystem)
  }

  // 統一的授權狀態檢查函數
  const checkAuthStatus = async () => {
    if (!session) return
    
    try {
      setBusy(true)
      
      const response = await fetch(`/.netlify/functions/threads-status?user=${encodeURIComponent(session.email)}`, { 
        cache: 'no-store', 
        headers: { 'Cache-Control': 'no-store' } 
      })
      
      if (response.ok) {
        const data = await response.json()
        
        const isLinked = data.status === 'linked'
        const hasUsername = !!data.username
        
        setLinked(isLinked)
        setUsername(data.username || null)
        setLastChecked(new Date())
        
        if (isLinked) {
          if (hasUsername) {
            setStatusMsg(`Threads 已連接（${data.username}）`)
            // 同步到本地快取
            try {
              localStorage.setItem(`threads:${session.email}:linked`, '1')
              localStorage.setItem(`threads:${session.email}:username`, data.username)
            } catch {}
          } else {
            setStatusMsg('Threads 已連接，但無法取得帳號資訊')
            try {
              localStorage.setItem(`threads:${session.email}:linked`, '1')
              localStorage.removeItem(`threads:${session.email}:username`)
            } catch {}
          }
        } else {
          setStatusMsg('Threads 未連接')
          try {
            localStorage.setItem(`threads:${session.email}:linked`, '0')
            localStorage.removeItem(`threads:${session.email}:username`)
          } catch {}
        }
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Threads 狀態檢查失敗:', error)
      setStatusMsg('狀態檢查失敗，請重新整理頁面')
    } finally {
      setBusy(false)
    }
  }

  // 頁面載入時檢查授權狀態
  useEffect(() => {
    if (!session) return
    
    // 先從本地快取恢復狀態
    const localLinked = localStorage.getItem(`threads:${session.email}:linked`) === '1'
    const localUsername = localStorage.getItem(`threads:${session.email}:username`)
    
    if (localLinked) {
      setLinked(true)
      if (localUsername) {
        setUsername(localUsername)
        setStatusMsg(`Threads 已連接（${localUsername}）`)
      } else {
        setStatusMsg('Threads 已連接，但缺少帳號資訊')
      }
    }
    
    // 從伺服器檢查最新狀態
    checkAuthStatus()
  }, [session?.email])

  // 處理 OAuth 回調
  useEffect(() => {
    if (!session) return
    
    try {
      const qs = new URLSearchParams(location.search)
      if (qs.get('threads') === 'linked') {
        // OAuth 成功回調
        setLinked(true)
        setStatusMsg('Threads 連接成功！正在取得帳號資訊...')
        
        // 立即保存到本地快取
        try {
          localStorage.setItem(`threads:${session.email}:linked`, '1')
        } catch {}
        
        // 清除 query 參數
        const url = new URL(location.href)
        url.searchParams.delete('threads')
        history.replaceState({}, '', url.toString())
        
        // 延遲檢查狀態，確保 username 被設定
        setTimeout(async () => {
          await checkAuthStatus()
        }, 1000)
      }
    } catch (error) {
      console.warn('OAuth 回調處理失敗:', error)
    }
  }, [session?.email, location.search])

  // 定期檢查授權狀態（每 30 分鐘）
  useEffect(() => {
    if (!session) return
    
    const interval = setInterval(() => {
      checkAuthStatus()
    }, 30 * 60 * 1000) // 30 分鐘
    
    return () => clearInterval(interval)
  }, [session?.email])

  // 載入模板管理資訊
  useEffect(() => {
    if (!session) return // 未登入時不載入
    
    const loadTemplateManagement = async () => {
      // 優先使用 AIGenerator 的模板資料
      const systemTemplates = getSystemTemplatesFromAIGenerator()
      
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
      
      setAvailableTemplates(availableTemplates)
      setSelectedTemplates(selectedTemplates)
      setMaxSelections(5) // 固定最大選擇數量
    }

    loadTemplateManagement()

    // 使用 CardService 的訂閱機制來監聽資料變更
    const unsubscribe = cardService.subscribeToChanges(() => {
      console.log('[UserSettings] 收到模板資料變更通知，重新載入...')
      loadTemplateManagement()
    })

    return () => {
      unsubscribe()
    }
  }, [session?.email, cardService])

  // 切換模板選擇
  const toggleTemplateSelection = (cardId: string) => {
    if (!session) return
    
    const success = cardService.toggleUserSelection(session.email, cardId)
    
    if (success) {
      // 重新載入模板管理資訊
      const systemTemplates = getSystemTemplatesFromAIGenerator()
      const userTemplates = cardService.getUserCards(session.email)
      const allTemplates = [...systemTemplates, ...userTemplates]
      const userSelections = cardService.getUserSelections(session.email)
      
      const availableTemplates = allTemplates.map(template => ({
        ...template,
        isSelected: userSelections.has(template.id)
      }))
      
      const selectedTemplates = availableTemplates.filter(template => template.isSelected)
      
      setAvailableTemplates(availableTemplates)
      setSelectedTemplates(selectedTemplates)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>個人設定</h1>
      
      {/* Threads 連結設定 */}
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <h2 className="font-semibold">Threads 連結</h2>

        {/* 允許管理者也能連結 Threads（單帳號同時具 admin/user 的情境） */}
        {true ? (
        <div className="flex gap-2">
          <a className="btn btn-primary" href={`/.netlify/functions/threads-oauth-start?user=${encodeURIComponent(session?.email || '')}`}>
            {linked ? '已連結 Threads（OAuth）' : '連結 Threads（OAuth）'}
          </a>
          {linked && (
            <div>
              <button
                className="btn btn-ghost"
                disabled={busy}
                onClick={checkAuthStatus}
              >
                重新檢查狀態
              </button>
            </div>
          )}
        </div>
        ) : null}

        {/* 狀態顯示 */}
        {statusMsg && (
          <div className="text-sm">
            <span className="font-medium">狀態：</span>
            <span className={linked ? 'text-green-600' : 'text-red-600'}>
              {statusMsg}
            </span>
          </div>
        )}
        
        {/* 最後檢查時間 */}
        {lastChecked && (
          <div className="text-xs text-gray-500">
            最後檢查：{lastChecked.toLocaleString('zh-TW')}
          </div>
        )}

        {/* 授權狀態說明 */}
        {linked && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <p className="font-medium">授權狀態說明：</p>
            <ul className="mt-1 space-y-1">
              <li>• 系統會自動監控授權狀態</li>
              <li>• 如果授權即將過期，會自動嘗試刷新</li>
              <li>• 貼文會自動檢查授權狀態</li>
              <li>• 授權失效時會通知您重新連結</li>
            </ul>
          </div>
        )}
      </div>


                  


      {/* 模板選擇管理 */}
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">模板選擇管理</h2>
          <div className="text-sm text-gray-500">
            已選擇 {selectedTemplates.length} / {maxSelections} 個模板
          </div>
        </div>
        <p className="text-gray-500">選擇要在「貼文生成器」中顯示的模板（最多可選擇 {maxSelections} 個）</p>
        
        {availableTemplates.length === 0 ? (
          <p className="text-gray-500 text-center py-4">載入中...</p>
        ) : (
          <div className="space-y-3">
            {availableTemplates.map((template) => {
              const isSelected = selectedTemplates.some(t => t.id === template.id)
              return (
                <div 
                  key={template.id} 
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                    isSelected 
                      ? 'border-[color:var(--yinmn-blue)] bg-gray-50 shadow-sm' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`template-${template.id}`}
                    checked={isSelected}
                    onChange={() => toggleTemplateSelection(template.id)}
                    disabled={!isSelected && selectedTemplates.length >= maxSelections}
                    className="w-4 h-4 text-[color:var(--yinmn-blue)] border-gray-300 rounded focus:ring-[color:var(--yinmn-blue)]"
                  />
                  <label htmlFor={`template-${template.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-medium ${isSelected ? 'text-[color:var(--yinmn-blue)]' : 'text-gray-900'}`}>
                          {template.templateTitle}
                        </h3>
                        <p className={`text-xs ${isSelected ? 'text-[color:var(--yinmn-blue-600)]' : 'text-gray-600'}`}>
                          {template.templateFeatures}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          isSelected 
                            ? 'bg-[color:var(--yinmn-blue)] text-white' 
                            : 'bg-[color:var(--yinmn-blue-300)] text-[color:var(--yinmn-blue)]'
                        }`}>
                          {template.platform}
                        </span>
                        {template.isSystem && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            isSelected 
                              ? 'bg-[color:var(--yinmn-blue-300)] text-[color:var(--yinmn-blue)]' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            系統預設
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI 卡片管理 */}
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <CardManager />
      </div>
    </div>
  )
}


