import { useState, useEffect, useCallback } from 'react'
import AdminSubnav from '../../components/AdminSubnav'
import type { BackendSystemTemplate } from '../../services/backendTemplateService'
import { BackendTemplateService } from '../../services/backendTemplateService'

// 簡化的模板資料結構
type Template = {
  id: string
  title: string
  platform: string
  features: string
  prompt: string
}

// 平台選項
const PLATFORM_OPTIONS = [
  { value: 'threads', label: 'Threads' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'general', label: '通用' }
]

// 固定的四個模板 - 清空內容
const TEMPLATES: Template[] = [
  {
    id: 'template-1',
    title: '',
    platform: 'threads',
    features: '',
    prompt: ''
  },
  {
    id: 'template-2',
    title: '',
    platform: 'threads',
    features: '',
    prompt: ''
  },
  {
    id: 'template-3',
    title: '',
    platform: 'threads',
    features: '',
    prompt: ''
  },
  {
    id: 'template-4',
    title: '',
    platform: 'threads',
    features: '',
    prompt: ''
  }
]

export default function AIGenerator() {
  // 直接使用 useState，簡化邏輯
  const [templates, setTemplates] = useState<Template[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [backendService] = useState(() => BackendTemplateService.getInstance())

  // 載入已保存的模板
  const loadSavedTemplates = useCallback(async () => {
    try {
      console.log('[AIGenerator] 開始載入已保存的模板...')
      
      // 嘗試從後端 API 獲取
      const backendTemplates = await backendService.getSystemTemplates()
      if (templates.length > 0) {
        console.log('[AIGenerator] 從後端獲取到模板，設置狀態')
        
        // 將後端模板轉換為前端格式
        const convertedTemplates = backendTemplates.map(template => ({
          id: template.id,
          title: template.title,
          platform: template.platform,
          features: template.features,
          prompt: template.prompt
        }))
        
        setTemplates(convertedTemplates)
        return
      }
      


      
      // 沒有找到任何模板，顯示 4 個可編輯的空白預設模板
      console.log('[AIGenerator] 沒有找到模板數據，顯示空白預設模板供編輯')
      setTemplates(TEMPLATES)
      
    } catch (error) {
      console.error('[AIGenerator] 載入模板失敗:', error)
      // 出錯時也顯示空白預設模板
      setTemplates(TEMPLATES)
    }
  }, [backendService]) // 依賴 backendService







  // 初始化時載入模板 - 只在組件掛載時執行一次
  useEffect(() => {
    console.log('[AIGenerator] 組件掛載，開始載入模板')
    loadSavedTemplates()
  }, []) // 空依賴項，確保只在掛載時執行一次

  // 監聽模板更新事件，確保當管理者更新模板時能同步
  useEffect(() => {
    const handleTemplatesUpdated = () => {
      console.log('[AIGenerator] 收到模板更新事件，重新載入模板')
      loadSavedTemplates()
    }

    window.addEventListener('templatesUpdated', handleTemplatesUpdated)
    
    return () => {
      window.removeEventListener('templatesUpdated', handleTemplatesUpdated)
    }
  }, [])

  // 開始編輯
  const startEdit = (id: string) => {
    console.log('✏️ 開始編輯模板:', id)
    setEditingId(id)
  }

  // 取消編輯
  const cancelEdit = () => {
    console.log('❌ 取消編輯')
    setEditingId(null)
    // 不重新載入，避免覆蓋正在編輯的數據
    console.log('🔄 取消編輯，保持當前狀態')
  }

  // 保存編輯
  const saveEdit = async () => {
    if (!editingId) return
    
    setIsSaving(true)
    try {
      console.log('[AIGenerator] 開始保存模板:', editingId)
      
      // 找到正在編輯的模板
      const editingTemplate = templates.find(t => t.id === editingId)
      if (!editingTemplate) {
        console.error('[AIGenerator] 找不到正在編輯的模板')
        return
      }
      
      // 1. 保存到後端服務
      try {
        const result = await backendService.updateSystemTemplate(
          editingTemplate.id,
          {
            title: editingTemplate.title || '',
            features: editingTemplate.features || '',
            prompt: editingTemplate.prompt || '',
            platform: (editingTemplate.platform as 'threads' | 'instagram' | 'facebook' | 'general') || 'threads'
          },
          'admin' // 假設是管理員更新
        )
        
        console.log('[AIGenerator] 後端保存成功:', result)
      } catch (error) {
        console.warn('[AIGenerator] 後端服務調用失敗:', error)
      }
      
      // 2. 更新本地狀態
      const updatedTemplates = templates.map(template =>
        template.id === editingId
          ? {
              ...template,
              title: editingTemplate.title || '',
              features: editingTemplate.features || '',
              prompt: editingTemplate.prompt || ''
            }
          : template
      )
      
      setTemplates(updatedTemplates)
      
      console.log('[AIGenerator] 本地狀態已更新')
      
      // 4. 關閉編輯模式
      setEditingId(null)
      
      // 5. 觸發模板更新事件，通知其他頁面
      window.dispatchEvent(new CustomEvent('templatesUpdated'))
      console.log('[AIGenerator] 已觸發 templatesUpdated 事件')
      
      // 6. 顯示保存成功狀態，不重新載入
      console.log('[AIGenerator] 模板保存成功，不重新載入避免覆蓋數據')
      
      // 注意：刪除了 setTimeout 和 loadSavedTemplates() 調用
      // 這樣可以避免保存後立即重新載入，覆蓋剛保存的數據
      
    } catch (error) {
      console.error('[AIGenerator] 保存失敗:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 更新模板欄位 - 直接更新狀態
  const updateTemplateField = (id: string, field: keyof Template, value: string) => {
    console.log(`🔄 更新模板 ${id} 的 ${field} 欄位為:`, value)
    
    setTemplates(prev => 
      prev.map(template =>
        template.id === id ? { ...template, [field]: value } : template
      )
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSubnav />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">AI 生成器模板管理</h1>
            <p className="text-gray-600 mt-1">管理系統預設的 AI 生成模板</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              {/* 調試信息 */}
              <div className="bg-gray-100 p-3 rounded text-sm">
                <p>調試信息：templates 數組長度: {templates.length}</p>
                <p>templates 內容: {JSON.stringify(templates, null, 2)}</p>
              </div>
              
              {templates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm font-medium text-gray-700">平台:</label>
                          {editingId === template.id ? (
                            <select
                              value={template.platform}
                              onChange={(e) => {
                                const newValue = e.target.value
                                console.log(`platform select onChange: "${newValue}"`)
                                updateTemplateField(template.id, 'platform', newValue)
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              {PLATFORM_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                              {PLATFORM_OPTIONS.find(p => p.value === template.platform)?.label || template.platform}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {editingId === template.id ? (
                                                      <input
                            type="text"
                            value={template.title}
                            onChange={(e) => {
                              const newValue = e.target.value
                              console.log(`title input onChange: "${newValue}"`)
                              updateTemplateField(template.id, 'title', newValue)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          ) : (
                            template.title
                          )}
                        </h3>
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          功能描述
                        </label>
                        {editingId === template.id ? (
                          <input
                            type="text"
                            value={template.features}
                            onChange={(e) => {
                              const newValue = e.target.value
                              console.log(`features input onChange: "${newValue}"`)
                              updateTemplateField(template.id, 'features', newValue)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-600">{template.features}</p>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          AI 提示詞
                        </label>
                        {editingId === template.id ? (
                          <textarea
                            value={template.prompt}
                            onChange={(e) => {
                              const newValue = e.target.value
                              console.log(`textarea onChange: ${newValue.length} 字元`)
                              updateTemplateField(template.id, 'prompt', newValue)
                            }}
                            onBlur={(e) => {
                              const finalValue = e.target.value
                              console.log(`textarea onBlur: ${finalValue.length} 字元`)
                              updateTemplateField(template.id, 'prompt', finalValue)
                            }}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          />
                        ) : (
                          <pre className="text-gray-600 text-sm whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded">
                            {template.prompt}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    {editingId === template.id ? (
                      <>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          取消
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {isSaving ? '保存中...' : '保存'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(template.id)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        編輯
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
