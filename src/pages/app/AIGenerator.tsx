import React, { useState, useEffect } from 'react'
import { GitHubSyncService } from '../../services/githubSyncService'
import { GitHubUpdateService } from '../../services/githubUpdateService'
import AdminSubnav from '../../components/AdminSubnav'

// 簡化的模板類型
interface Template {
  id: string
  title: string
  platform: string
  features: string
  prompt: string
}

// 默認空白模板
const DEFAULT_TEMPLATES: Template[] = [
  { id: 'template-1', title: '', platform: 'threads', features: '', prompt: '' },
  { id: 'template-2', title: '', platform: 'threads', features: '', prompt: '' },
  { id: 'template-3', title: '', platform: 'threads', features: '', prompt: '' },
  { id: 'template-4', title: '', platform: 'threads', features: '', prompt: '' }
]

export default function AIGenerator() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState({ title: '', features: '', prompt: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  
  const githubService = GitHubSyncService.getInstance()
  const githubUpdateService = GitHubUpdateService.getInstance()

  // 載入模板
  useEffect(() => {
    loadTemplates()
  }, [])

  // 從 GitHub 載入模板
  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      console.log('[AIGenerator] 從 GitHub 載入系統模板...')
      
      const githubTemplates = await githubService.getSystemTemplatesFromGitHub()
      
      if (Object.keys(githubTemplates).length > 0) {
        console.log('[AIGenerator] 從 GitHub 成功載入模板，數量:', Object.keys(githubTemplates).length)
        
        // 將 GitHub 模板轉換為前端格式
        const convertedTemplates = Object.values(githubTemplates).map(template => ({
          id: template.id,
          title: template.title || '',
          platform: template.platform,
          features: template.features || '',
          prompt: template.prompt || ''
        }))
        
        // 確保有 4 個模板位置
        const finalTemplates = [...convertedTemplates]
        for (let i = 1; i <= 4; i++) {
          const templateId = `template-${i}`
          if (!finalTemplates.find(t => t.id === templateId)) {
            finalTemplates.push({
              id: templateId,
              title: '',
              platform: 'threads',
              features: '',
              prompt: ''
            })
          }
        }
        
        // 按 ID 排序
        finalTemplates.sort((a, b) => a.id.localeCompare(b.id))
        setTemplates(finalTemplates)
        console.log('[AIGenerator] 設置最終模板，數量:', finalTemplates.length)
      } else {
        console.warn('[AIGenerator] GitHub 上沒有找到模板數據，使用默認模板')
        setTemplates(DEFAULT_TEMPLATES)
      }
    } catch (error) {
      console.error('[AIGenerator] 從 GitHub 載入模板失敗:', error)
      console.warn('[AIGenerator] 使用默認模板作為備用方案')
      setTemplates(DEFAULT_TEMPLATES)
    } finally {
      setIsLoading(false)
    }
  }

  // 開始編輯
  const startEdit = (template: Template) => {
    setEditingId(template.id)
    setEditingData({
      title: template.title,
      features: template.features,
      prompt: template.prompt
    })
  }

  // 取消編輯
  const cancelEdit = () => {
    setEditingId(null)
    setEditingData({ title: '', features: '', prompt: '' })
  }

  // 保存編輯
  const saveEdit = async () => {
    if (!editingId) return
    
    try {
      console.log('[AIGenerator] 保存模板到 GitHub:', editingId)
      
      // 檢查是否有 GitHub token
      if (!githubUpdateService.hasGitHubToken()) {
        alert('需要設置 GitHub Personal Access Token 才能保存模板。請聯繫管理員設置。')
        return
      }
      
      // 準備更新的模板數據
      const updatedTemplates: Record<string, any> = {}
      templates.forEach(template => {
        updatedTemplates[template.id] = {
          id: template.id,
          platform: template.platform,
          title: template.title,
          features: template.features,
          prompt: template.prompt,
          updatedAt: template.id === editingId ? new Date().toISOString() : new Date().toISOString()
        }
      })
      
      // 更新編輯中的模板
      updatedTemplates[editingId] = {
        id: editingId,
        platform: 'threads' as const,
        title: editingData.title,
        features: editingData.features,
        prompt: editingData.prompt,
        updatedAt: new Date().toISOString()
      }
      
      // 更新到 GitHub
      const updateSuccess = await githubUpdateService.updateSystemTemplates(updatedTemplates)
      
      if (updateSuccess) {
        // 更新本地狀態
        setTemplates(prev => prev.map(t => 
          t.id === editingId 
            ? { ...t, ...editingData }
            : t
        ))
        
        // 重置編輯狀態
        setEditingId(null)
        setEditingData({ title: '', features: '', prompt: '' })
        
        // 通知其他組件
        window.dispatchEvent(new CustomEvent('templatesUpdated'))
        
        // 顯示成功消息
        alert('模板已成功保存到 GitHub！所有用戶都能看到最新的模板。')
      } else {
        throw new Error('GitHub 更新失敗')
      }
      
    } catch (error) {
      console.error('[AIGenerator] 保存模板失敗:', error)
      alert(`保存失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  // 處理編輯數據變化
  const handleEditChange = (field: keyof typeof editingData, value: string) => {
    setEditingData(prev => ({ ...prev, [field]: value }))
  }
  
  // 設置 GitHub token
  const handleSetGitHubToken = () => {
    if (githubToken.trim()) {
      githubUpdateService.setGitHubToken(githubToken.trim())
      setGithubToken('')
      setShowTokenInput(false)
      alert('GitHub Token 已設置！現在可以保存模板了。')
    } else {
      alert('請輸入有效的 GitHub Token')
    }
  }
  
  // 檢查 GitHub token 狀態
  const hasValidToken = githubUpdateService.hasGitHubToken()

  // 載入中顯示骨架屏
  if (isLoading) {
    return (
      <div className="space-y-4">
        <AdminSubnav />
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">AI 生成器模板管理</h1>
            <p className="text-gray-600">管理四個預設模板的設定</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="border rounded-lg p-4 bg-white">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="h-10 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AdminSubnav />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">AI 生成器模板管理</h1>
          <p className="text-gray-600">管理四個預設模板的設定</p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>數據來源</strong>：模板數據直接從 GitHub 讀取，確保所有用戶都能看到最新的系統模板。
            </p>
            {!hasValidToken && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>需要設置 GitHub Token</strong>：要保存模板修改，需要設置 GitHub Personal Access Token。
                </p>
                <button
                  onClick={() => setShowTokenInput(true)}
                  className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  設置 GitHub Token
                </button>
              </div>
            )}
            {hasValidToken && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ <strong>GitHub Token 已設置</strong>：可以保存模板修改了。
                </p>
                <button
                  onClick={() => {
                    githubUpdateService.removeGitHubToken()
                    window.location.reload()
                  }}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  移除 Token
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4 bg-white">
              {editingId === template.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editingData.title}
                    onChange={(e) => handleEditChange('title', e.target.value)}
                    placeholder="模板標題"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <textarea
                    value={editingData.features}
                    onChange={(e) => handleEditChange('features', e.target.value)}
                    placeholder="模板特色"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <textarea
                    value={editingData.prompt}
                    onChange={(e) => handleEditChange('prompt', e.target.value)}
                    placeholder="AI 提示詞"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-500 text-gray-500 rounded-lg hover:bg-gray-500 hover:text-white transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--yinmn-blue)' }}
                  >
                    {template.title || '未命名模板'}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    {template.features || '無特色描述'}
                  </p>
                  <button
                    onClick={() => startEdit(template)}
                    className="px-4 py-2 border rounded-lg transition-colors"
                    style={{ 
                      borderColor: 'var(--yinmn-blue)', 
                      color: 'var(--yinmn-blue)' 
                    }}
                  >
                    編輯
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* GitHub Token 設置界面 */}
      {showTokenInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">設置 GitHub Personal Access Token</h3>
            <p className="text-sm text-gray-600 mb-4">
              要保存模板修改，需要 GitHub Personal Access Token。請按照以下步驟獲取：
            </p>
            <ol className="text-sm text-gray-600 mb-4 list-decimal list-inside space-y-1">
              <li>前往 GitHub Settings → Developer settings → Personal access tokens</li>
              <li>點擊 "Generate new token (classic)"</li>
              <li>選擇 "repo" 權限</li>
              <li>複製生成的 token</li>
            </ol>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="輸入 GitHub Token"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleSetGitHubToken}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                設置 Token
              </button>
              <button
                onClick={() => {
                  setShowTokenInput(false)
                  setGithubToken('')
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
