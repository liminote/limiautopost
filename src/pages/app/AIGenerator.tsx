import { useState, useEffect, useCallback } from 'react'
import AdminSubnav from '../../components/AdminSubnav'

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

  // 全新的載入邏輯：優先從後端載入，備用 localStorage
  const loadSavedTemplates = useCallback(async () => {
    try {
      console.log('🔍 開始載入模板數據...')
      
      // 🔥 強制清空舊的 localStorage 數據，確保使用新的空白模板
      console.log('🧹 強制清空舊的 localStorage 數據')
      localStorage.removeItem('aigenerator_templates')
      
      // 1. 優先從後端 API 載入最新數據
      try {
        const response = await fetch('/.netlify/functions/update-system-template', {
          method: 'GET'
        })
        
        if (response.ok) {
          const backendTemplates = await response.json()
          console.log('📥 從後端載入到數據:', backendTemplates)
          
          if (backendTemplates && Object.keys(backendTemplates).length >= 4) {
            // 如果有完整的後端數據，使用後端數據
            const templatesFromBackend = Object.values(backendTemplates).map((saved: any) => ({
              id: saved.id || saved.cardId,
              platform: saved.platform || 'threads',
              title: saved.title || saved.templateTitle || '',
              features: saved.features || saved.templateFeatures || '',
              prompt: saved.prompt || ''
            }))
            
            setTemplates(templatesFromBackend)
            console.log('✅ 使用後端模板數據:', templatesFromBackend)
            
            // 同時更新 localStorage 作為備用
            localStorage.setItem('aigenerator_templates', JSON.stringify(backendTemplates))
            return
          }
        }
      } catch (backendError) {
        console.warn('⚠️ 後端載入失敗，嘗試使用 localStorage:', backendError)
      }
      
      // 2. 如果後端載入失敗，嘗試從 localStorage 載入
      const localSaved = localStorage.getItem('aigenerator_templates')
      if (localSaved) {
        const localTemplates = JSON.parse(localSaved)
        console.log('📥 從 localStorage 載入到數據:', localTemplates)
        
        if (Object.keys(localTemplates).length >= 4) {
          // 如果有完整的 localStorage 數據，使用它
          const templatesFromLocal = Object.values(localTemplates).map((saved: any) => ({
            id: saved.id,
            platform: saved.platform || 'threads',
            title: saved.title || '',
            features: saved.features || '',
            prompt: saved.prompt || ''
          }))
          
          setTemplates(templatesFromLocal)
          console.log('✅ 使用 localStorage 模板數據:', templatesFromLocal)
          return
        }
      }
      
      // 3. 如果都沒有數據，使用空白預設模板
      console.log('ℹ️ 沒有保存的數據，使用空白預設模板')
      setTemplates(TEMPLATES)
      
    } catch (error) {
      console.error('❌ 載入模板失敗:', error)
      setTemplates(TEMPLATES)
    }
  }, [])

  // 初始化時載入模板
  useEffect(() => {
    loadSavedTemplates()
  }, [loadSavedTemplates])

  // 開始編輯
  const startEdit = (id: string) => {
    console.log('✏️ 開始編輯模板:', id)
    setEditingId(id)
  }

  // 取消編輯
  const cancelEdit = () => {
    console.log('❌ 取消編輯')
    setEditingId(null)
    // 重新載入保存的模板
    loadSavedTemplates()
    console.log('🔄 已重新載入保存的模板')
  }

  // 保存編輯 - 同時保存到 localStorage 和後端
  const saveEdit = async () => {
    if (!editingId) return
    
    console.log('💾 開始保存模板:', editingId)
    setIsSaving(true)
    
    try {
      // 找到正在編輯的模板
      const editingTemplate = templates.find((t: Template) => t.id === editingId)
      if (!editingTemplate) {
        console.error('❌ 找不到正在編輯的模板')
        return
      }

      console.log('📝 準備保存的模板資料:', editingTemplate)

      // 1. 保存到 localStorage（作為備用）
      const currentSaved = JSON.parse(localStorage.getItem('aigenerator_templates') || '{}')
      
      // 保存當前編輯的模板
      currentSaved[editingTemplate.id] = {
        id: editingTemplate.id,
        platform: editingTemplate.platform,
        title: editingTemplate.title,
        features: editingTemplate.features,
        prompt: editingTemplate.prompt,
        updatedAt: new Date().toISOString()
      }
      
      // 同時保存所有其他模板的當前狀態
      templates.forEach(template => {
        if (template.id !== editingId) {
          currentSaved[template.id] = {
            id: template.id,
            platform: template.platform,
            title: template.title,
            features: template.features,
            prompt: template.prompt,
            updatedAt: new Date().toISOString()
          }
        }
      })
      
      localStorage.setItem('aigenerator_templates', JSON.stringify(currentSaved))
      console.log('💾 已保存到 localStorage，包含所有模板:', currentSaved)

      // 2. 同時保存到後端 API（讓所有用戶都能看到）
      try {
        const response = await fetch('/.netlify/functions/update-system-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cardId: editingTemplate.id,
            platform: editingTemplate.platform,
            templateTitle: editingTemplate.title,
            templateFeatures: editingTemplate.features,
            prompt: editingTemplate.prompt,
            updatedAt: new Date().toISOString()
          })
        })

        if (response.ok) {
          const result = await response.json()
          console.log('✅ 後端保存成功:', result)
        } else {
          console.warn('⚠️ 後端保存失敗，但 localStorage 保存成功')
        }
      } catch (apiError) {
        console.warn('⚠️ 後端 API 調用失敗，但 localStorage 保存成功:', apiError)
      }

      // 觸發同步事件
      window.dispatchEvent(new CustomEvent('templatesUpdated'))
      console.log('📡 已觸發同步事件')

      // 關閉編輯模式
      setEditingId(null)
      console.log('✅ 模板保存成功:', editingTemplate.id)
      
      // 重要：保存後立即重新載入，確保狀態一致
      setTimeout(() => {
        console.log('🔄 保存後重新載入模板...')
        loadSavedTemplates()
      }, 100)
      
    } catch (error) {
      console.error('❌ 保存失敗:', error)
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
