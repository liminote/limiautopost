import { useEffect, useState } from 'react'
import CardManager from '../components/CardManager'
import { CardService } from '../services/cardService'
import type { BaseCard } from '../types/cards'
import { useSession } from '../auth/auth'
import ThreadsDiagnostic from '../components/ThreadsDiagnostic'


export default function UserSettings(){
  const session = useSession()
  const [linked, setLinked] = useState(() => { 
    if (!session) return false
    try { 
      return localStorage.getItem(`threads:${session.email}:linked`) === '1' 
    } catch { 
      return false 
    } 
  })
  const [username, setUsername] = useState<string | null>(() => { 
    if (!session) return null
    try { 
      return localStorage.getItem(`threads:${session.email}:username`) 
    } catch { 
      return null 
    } 
  })
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 模板管理相關狀態
  const [availableTemplates, setAvailableTemplates] = useState<BaseCard[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<BaseCard[]>([])
  const [maxSelections, setMaxSelections] = useState(5)

  const cardService = CardService.getInstance()

  useEffect(() => {
    if (!session) return // 未登入時不執行
    
    const run = async () => {
      try {
        // 優先從本地快取讀取狀態
        const localLinked = localStorage.getItem(`threads:${session.email}:linked`) === '1'
        const localUsername = localStorage.getItem(`threads:${session.email}:username`)
        
        // 立即設定本地狀態，確保 UI 響應
        if (localLinked) {
          setLinked(true)
          if (localUsername) setUsername(localUsername)
          setStatusMsg('Threads 已連接')
        }
        
        // 從伺服器檢查狀態（非阻塞）
        try {
          const j = await fetch(`/api/threads/status?user=${encodeURIComponent(session.email)}`, { 
            cache: 'no-store', 
            headers: { 'Cache-Control': 'no-store' } 
          }).then(r => r.ok ? r.json() : Promise.reject(new Error('status http')))
          
          const serverLinked = j.status === 'linked'
          
          // 如果伺服器狀態與本地狀態不同，更新本地狀態
          if (serverLinked !== localLinked) {
            setLinked(serverLinked)
            if (serverLinked) {
              if (j.username) setUsername(j.username)
              if (j.tokenSavedAt) setStatusMsg(`Token 取得於 ${new Date(j.tokenSavedAt).toLocaleString()}`)
            } else {
              setUsername(null)
              setStatusMsg(null)
            }
            
            // 同步到本地快取
            try {
              localStorage.setItem(`threads:${session.email}:linked`, serverLinked ? '1' : '0')
              if (j.username) localStorage.setItem(`threads:${session.email}:username`, j.username)
            } catch {}
          }
        } catch (error) {
          console.warn('Threads 狀態檢查失敗:', error)
          // 如果 API 失敗，保持本地狀態不變
        }
      } catch (error) {
        console.error('Threads 狀態管理錯誤:', error)
      }
    }
    
    run()
  }, [session?.email])

  // 處理 OAuth 回調
  useEffect(() => {
    if (!session) return
    
    try {
      const qs = new URLSearchParams(location.search)
      if (qs.get('threads') === 'linked') {
        // OAuth 成功回調
        setLinked(true)
        setStatusMsg('Threads 連接成功！')
        
        // 立即保存到本地快取
        try {
          localStorage.setItem(`threads:${session.email}:linked`, '1')
        } catch {}
        
        // 清除 query 參數
        const url = new URL(location.href)
        url.searchParams.delete('threads')
        history.replaceState({}, '', url.toString())
      }
    } catch (error) {
      console.warn('OAuth 回調處理失敗:', error)
    }
  }, [session?.email, location.search])

  // 載入模板管理資訊
  useEffect(() => {
    if (!session) return // 未登入時不載入
    
    const loadTemplateManagement = () => {
      const management = cardService.getTemplateManagement(session.email)
      setAvailableTemplates(management.availableTemplates)
      setSelectedTemplates(management.selectedTemplates)
      setMaxSelections(management.maxSelectedTemplates)
    }

    loadTemplateManagement()

    // 監聽卡片創建/更新/刪除事件
    const handleUserCardChange = () => {
      loadTemplateManagement()
    }

    window.addEventListener('userCardCreated', handleUserCardChange)
    window.addEventListener('userCardUpdated', handleUserCardChange)
    window.addEventListener('userCardDeleted', handleUserCardChange)

    return () => {
      window.removeEventListener('userCardCreated', handleUserCardChange)
      window.removeEventListener('userCardUpdated', handleUserCardChange)
      window.removeEventListener('userCardDeleted', handleUserCardChange)
    }
  }, [session?.email, cardService])

  // 監聽頁面可見性變化，當頁面重新可見時恢復狀態
  useEffect(() => {
    if (!session) return
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 頁面重新可見時，立即從本地快取恢復狀態
        const localLinked = localStorage.getItem(`threads:${session.email}:linked`) === '1'
        const localUsername = localStorage.getItem(`threads:${session.email}:username`)
        
        if (localLinked) {
          setLinked(true)
          if (localUsername) setUsername(localUsername)
          setStatusMsg('Threads 已連接')
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session?.email])

  // 監聽 localStorage 變化，確保狀態同步
  useEffect(() => {
    if (!session) return
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `threads:${session.email}:linked` || e.key === `threads:${session.email}:username`) {
        // localStorage 發生變化時，重新讀取狀態
        const localLinked = localStorage.getItem(`threads:${session.email}:linked`) === '1'
        const localUsername = localStorage.getItem(`threads:${session.email}:username`)
        
        setLinked(localLinked)
        if (localUsername) setUsername(localUsername)
        if (localLinked) {
          setStatusMsg('Threads 已連接')
        } else {
          setStatusMsg(null)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [session?.email])

  // 頁面載入和卸載時的狀態管理
  useEffect(() => {
    if (!session) return
    
    // 頁面載入時立即恢復狀態
    const localLinked = localStorage.getItem(`threads:${session.email}:linked`) === '1'
    const localUsername = localStorage.getItem(`threads:${session.email}:username`)
    
    if (localLinked) {
      setLinked(true)
      if (localUsername) setUsername(localUsername)
      setStatusMsg('Threads 已連接')
    }
    
    // 頁面卸載前保存狀態
    const handleBeforeUnload = () => {
      if (linked) {
        try {
          localStorage.setItem(`threads:${session.email}:linked`, '1')
          if (username) localStorage.setItem(`threads:${session.email}:username`, username)
        } catch {}
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [session?.email, linked, username])

  // 切換模板選擇
  const toggleTemplateSelection = (cardId: string) => {
    if (!session) return
    
    const success = cardService.toggleUserSelection(session.email, cardId)
    
    if (success) {
      // 重新載入模板管理資訊
      const management = cardService.getTemplateManagement(session.email)
      setAvailableTemplates(management.availableTemplates)
      setSelectedTemplates(management.selectedTemplates)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>個人設定</h1>
      
      {/* Threads 連結設定 */}
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <h2 className="font-semibold">Threads 連結</h2>
        {statusMsg && <div className="text-red-600 text-sm">{statusMsg}</div>}
        {/* 允許管理者也能連結 Threads（單帳號同時具 admin/user 的情境） */}
        {true ? (
        <div className="flex gap-2">
          <a className="btn btn-primary" href={`/api/threads/oauth/start?user=${encodeURIComponent(session?.email || '')}`}>{linked ? '已連結 Threads（OAuth）' : '連結 Threads（OAuth）'}</a>
          {linked && (
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={async ()=>{
                try {
                  setBusy(true)
                  const j = await (async () => {
                    try { return await (await fetch('/api/threads/disconnect', { method: 'POST' })).json() } catch {}
                    return await (await fetch('/.netlify/functions/threads-disconnect', { method: 'POST' })).json()
                  })()
                  if (j.ok) {
                    setLinked(false); setUsername(null); setStatusMsg('已斷開連結')
                  } else { setStatusMsg('斷開連結失敗') }
                } catch { setStatusMsg('斷開連結失敗') }
                finally { setBusy(false) }
              }}
            >斷開連結</button>
          )}
        </div>
        ) : null}
        {linked && <div className="text-green-700 text-sm">已成功連結 Threads 帳號{username ? `（${username}）` : ''}</div>}
      </div>

                        {/* Threads 連接診斷工具 */}
                  <div className="card card-body text-sm text-gray-600 space-y-2">
                    <h2 className="font-semibold">Threads 連接診斷</h2>
                    <ThreadsDiagnostic />
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
        <h2 className="font-semibold">AI 卡片管理</h2>
        <p className="text-gray-500">管理你的自定義 AI 生成卡片，創建專屬的內容生成模板</p>
        <CardManager />
      </div>
    </div>
  )
}


