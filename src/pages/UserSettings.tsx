import { useEffect, useState } from 'react'
import CardManager from '../components/CardManager'
import { CardService } from '../services/cardService'
import { GitHubSyncService } from '../services/githubSyncService'
import type { BaseCard } from '../types/cards'
import { useSession } from '../auth/auth'

export default function UserSettings(){
  const session = useSession()
  // 簡化的授權狀態，只用於顯示 OAuth 回調結果
  const [linked, setLinked] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // 模板管理相關狀態
  const [availableTemplates, setAvailableTemplates] = useState<BaseCard[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<BaseCard[]>([])
  const [maxSelections, setMaxSelections] = useState(5)

  const cardService = CardService.getInstance()
  const githubService = GitHubSyncService.getInstance()

  // 載入模板管理資訊
  const loadTemplateManagement = async () => {
    if (!session) return
    
    try {
      console.log('[UserSettings] 開始從 GitHub 載入最新模板...')
      
      // 直接從 GitHub 讀取系統模板
      const githubTemplates = await githubService.getSystemTemplatesFromGitHub()
      
      if (Object.keys(githubTemplates).length > 0) {
        console.log('[UserSettings] 從 GitHub 成功載入模板，數量:', Object.keys(githubTemplates).length)
        
        // 將 GitHub 模板轉換為 BaseCard 格式
        const systemTemplates: BaseCard[] = Object.values(githubTemplates).map((template: any) => ({
          id: template.id,
          name: template.title || '',
          description: template.features || '',
          category: template.platform.toLowerCase() as any,
          prompt: template.prompt || '',
          isActive: true,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(template.updatedAt),
          platform: template.platform.toLowerCase() as any,
          templateTitle: template.title || '',
          templateFeatures: template.features || '',
          isSelected: false
        }))
        
        // 獲取用戶個人模板
        const userTemplates = cardService.getUserCards(session.email)
        
        // 合併系統模板和用戶模板
        const allTemplates = [...systemTemplates, ...userTemplates]
        
        // 獲取用戶選擇狀態
        const userSelections = cardService.getUserSelections(session.email)
        const selectedTemplates = allTemplates.filter(template => userSelections.has(template.id))
        
        console.log('[UserSettings] 載入模板完成:', {
          total: allTemplates.length,
          system: systemTemplates.length,
          user: userTemplates.length,
          selected: selectedTemplates.length,
          maxSelections
        })
        
        setAvailableTemplates(allTemplates)
        setSelectedTemplates(selectedTemplates)
        setMaxSelections(5)
      } else {
        throw new Error('GitHub 上沒有找到模板數據')
      }
    } catch (error) {
      console.error('[UserSettings] 從 GitHub 載入模板失敗:', error)
      console.warn('[UserSettings] 使用 CardService 作為備用方案')
      
      // 備用方案：使用 CardService
      const allTemplates = cardService.getAllCards(session.email)
      const selectedTemplates = allTemplates.filter(template => template.isSelected)
      
      setAvailableTemplates(allTemplates)
      setSelectedTemplates(selectedTemplates)
      setMaxSelections(5)
    }
  }

  // 強制重新載入模板（清除快取）
  const forceReloadTemplates = () => {
    console.log('[UserSettings] 強制重新載入模板')
    
    // 只清除用戶選擇的快取，不清除系統模板
    try {
      localStorage.removeItem('limiautopost:userSelections')
      // 不再清除系統模板快取，因為我們現在使用新的存儲鍵
      // localStorage.removeItem('aigenerator_templates') // 已移除：會清除系統模板
      console.log('[UserSettings] 已清除用戶選擇快取，保留系統模板')
    } catch (error) {
      console.warn('[UserSettings] 清除快取失敗:', error)
    }
    
    // 重新載入
    loadTemplateManagement()
  }

  // 監聽模板更新事件 - 已禁用，避免覆蓋用戶編輯的內容
  useEffect(() => {
    // 注意：不再監聽 templatesUpdated 事件，避免覆蓋用戶正在編輯的模板內容
    // 只有在用戶主動刷新頁面時才重新載入模板
    console.log('[UserSettings] 模板更新事件監聽已禁用，避免數據覆蓋')
    
    // 如果需要手動重新載入，用戶可以點擊「重新載入」按鈕
    return () => {
      // 清理函數
    }
  }, [])

  // 移除授權狀態檢查相關函數
  // const checkAuthStatus = async (deepVerify: boolean = false) => { ... }

  // 移除頁面載入時檢查授權狀態
  // useEffect(() => { ... }, [session?.email])

  // 處理 OAuth 回調 - 恢復此功能以處理授權成功
  useEffect(() => {
    if (!session) return
    
    try {
      const qs = new URLSearchParams(location.search)
      if (qs.get('threads') === 'linked') {
        // OAuth 成功回調
        setLinked(true)
        setStatusMsg('Threads 連接成功！')
        
        // 清除 query 參數
        const url = new URL(location.href)
        url.searchParams.delete('threads')
        url.searchParams.delete('user')
        history.replaceState({}, '', url.toString())
        
        // 顯示成功狀態 3 秒後自動隱藏
        setTimeout(() => {
          setStatusMsg(null)
        }, 3000)
      }
    } catch (error) {
      console.warn('OAuth 回調處理失敗:', error)
    }
  }, [session?.email, location.search])

  // 移除定期檢查授權狀態
  // useEffect(() => { ... }, [session?.email])

  // 載入模板管理資訊
  useEffect(() => {
    if (!session) return // 未登入時不載入
    
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
    
    console.log('[UserSettings] 切換模板選擇:', {
      cardId,
      currentSelected: selectedTemplates.length,
      maxSelections
    })
    
    const success = cardService.toggleUserSelection(session.email, cardId)
    
    if (success) {
      console.log('[UserSettings] 模板選擇切換成功')
      // 重新載入模板管理資訊
      loadTemplateManagement()
    } else {
      console.warn('[UserSettings] 模板選擇切換失敗，可能已達最大選擇數量')
      alert('無法選擇更多模板，已達最大選擇數量（5個）')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>個人設定</h1>
      
      {/* Threads 連結設定 - 簡化為直接連結按鈕 */}
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <h2 className="font-semibold">Threads 連結</h2>

        <div className="space-y-3">
          <div className="flex gap-2">
            <a className="btn btn-primary" href={`/.netlify/functions/threads-oauth-start?user=${encodeURIComponent(session?.email || '')}`}>
              {linked ? '重新連結 Threads（OAuth）' : '連結 Threads（OAuth）'}
            </a>
          </div>
          
          {/* 授權狀態顯示 */}
          {statusMsg && (
            <div className="text-sm">
              <span className="font-medium">狀態：</span>
              <span className={linked ? 'text-green-600' : 'text-red-600'}>
                {statusMsg}
              </span>
            </div>
          )}
          
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <p className="font-medium">授權說明：</p>
            <ul className="mt-1 space-y-1">
              <li>• 每次發佈貼文時都會要求重新授權</li>
              <li>• 這樣可以確保授權狀態始終是最新的</li>
              <li>• 避免授權過期導致的發佈失敗</li>
              {linked && (
                <li>• 您已完成授權，可以嘗試發佈貼文</li>
              )}
            </ul>
          </div>
        </div>
      </div>


                  


      {/* 模板選擇管理 */}
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">模板選擇管理</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              已選擇 {selectedTemplates.length} / {maxSelections} 個模板
            </div>
            <button
              onClick={forceReloadTemplates}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              title="強制重新載入模板，清除快取"
            >
              重新載入
            </button>
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
        <div className="mb-4">
          <h2 className="font-semibold mb-2">個人模板管理</h2>
          <p className="text-gray-500 text-sm">
            創建和管理你的個人 AI 生成模板（最多 6 個）
          </p>
        </div>
        <CardManager />
      </div>
    </div>
  )
}


