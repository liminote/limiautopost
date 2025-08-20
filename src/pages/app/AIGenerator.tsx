import { useState, useEffect } from 'react'
import AdminSubnav from '../../components/AdminSubnav'

// 簡化的模板資料結構
type Template = {
  id: string
  title: string
  platform: string
  features: string
  prompt: string
}

// 固定的四個模板
const TEMPLATES: Template[] = [
  {
    id: 'template-1',
    title: '生活體悟',
    platform: 'threads',
    features: '分享生活感悟、個人成長、心靈啟發',
    prompt: '請嚴格遵守以下規則生成 Threads 第一則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：480～500 字\n- 不能與其他貼文有上下文延續關係'
  },
  {
    id: 'template-2',
    title: '專業分享',
    platform: 'threads',
    features: '行業見解、技能分享、專業知識',
    prompt: '請嚴格遵守以下規則生成 Threads 第一則貼文：\n- 聚焦於一個專業主題或技能分享\n- 包含實用的建議或見解，結尾加行動呼籲\n- 加入一個相關 hashtag（限一個）\n- 字數限制：480～500 字\n- 不能與其他貼文有上下文延續關係'
  },
  {
    id: 'template-3',
    title: '創意故事',
    platform: 'threads',
    features: '故事創作、想像力、創意表達',
    prompt: '請嚴格遵守以下規則生成 Threads 第一則貼文：\n- 聚焦於一個創意故事或想像情境\n- 包含生動的描述和情感表達，結尾加反思\n- 加入一個相關 hashtag（限一個）\n- 字數限制：480～500 字\n- 不能與其他貼文有上下文延續關係'
  },
  {
    id: 'template-4',
    title: '時事評論',
    platform: 'threads',
    features: '社會議題、時事分析、觀點表達',
    prompt: '請嚴格遵守以下規則生成 Threads 第一則貼文：\n- 聚焦於一個時事議題或社會現象\n- 包含客觀分析和個人觀點，結尾加思考問題\n- 加入一個相關 hashtag（限一個）\n- 字數限制：480～500 字\n- 不能與其他貼文有上下文延續關係'
  }
]

export default function AIGenerator() {
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // 載入已保存的模板
  useEffect(() => {
    const loadSavedTemplates = async () => {
      try {
        // 優先從 localStorage 讀取（因為這是即時編輯的資料）
        const localSaved = localStorage.getItem('aigenerator_templates')
        if (localSaved) {
          const localTemplates = JSON.parse(localSaved)
          console.log('從 localStorage 讀取到模板:', localTemplates)
          
          // 將 localStorage 的資料應用到模板
          const updatedTemplates = TEMPLATES.map(template => {
            const localTemplate = localTemplates[template.id]
            if (localTemplate) {
              return {
                ...template,
                platform: localTemplate.platform,
                title: localTemplate.title,
                features: localTemplate.features,
                prompt: localTemplate.prompt
              }
            }
            return template
          })
          
          setTemplates(updatedTemplates)
          return
        }
        
        // 如果 localStorage 沒有資料，嘗試從 GitHub 讀取
        console.log('localStorage 沒有資料，嘗試從 GitHub 讀取')
        const response = await fetch('/.netlify/functions/get-system-templates')
        if (response.ok) {
          const savedTemplates = await response.json()
          
          if (Object.keys(savedTemplates).length > 0) {
            // 將保存的修改應用到模板
            const updatedTemplates = TEMPLATES.map(template => {
              const savedTemplate = savedTemplates[template.id]
              if (savedTemplate) {
                return {
                  ...template,
                  platform: savedTemplate.platform,
                  title: savedTemplate.templateTitle || savedTemplate.title,
                  features: savedTemplate.templateFeatures || savedTemplate.features,
                  prompt: savedTemplate.prompt
                }
              }
              return template
            })
            
            setTemplates(updatedTemplates)
          }
        }
      } catch (error) {
        console.error('載入模板失敗:', error)
      }
    }
    
    loadSavedTemplates()
  }, [])

  // 開始編輯
  const startEdit = (id: string) => setEditingId(id)

  // 取消編輯
  const cancelEdit = () => {
    setEditingId(null)
    // 重新載入已保存的模板
    const loadSavedTemplates = async () => {
      try {
        const localSaved = localStorage.getItem('aigenerator_templates')
        if (localSaved) {
          const localTemplates = JSON.parse(localSaved)
          
          const updatedTemplates = TEMPLATES.map(template => {
            const localTemplate = localTemplates[template.id]
            if (localTemplate) {
              return {
                ...template,
                platform: localTemplate.platform,
                title: localTemplate.title,
                features: localTemplate.features,
                prompt: localTemplate.prompt
              }
            }
            return template
          })
          
          setTemplates(updatedTemplates)
        } else {
          setTemplates(TEMPLATES)
        }
      } catch (error) {
        console.warn('無法載入模板，使用預設模板:', error)
        setTemplates(TEMPLATES)
      }
    }
    
    loadSavedTemplates()
  }

  // 保存編輯
  const saveEdit = async () => {
    if (!editingId) return
    
    setIsSaving(true)
    
    try {
      // 找到正在編輯的模板
      const editingTemplate = templates.find((t: Template) => t.id === editingId)
      if (!editingTemplate) return

      // 更新模板資料
      const updatedTemplates = templates.map(template =>
        template.id === editingId ? editingTemplate : template
      )
      setTemplates(updatedTemplates)

      // 保存到 localStorage
      const currentSaved = JSON.parse(localStorage.getItem('aigenerator_templates') || '{}')
      currentSaved[editingTemplate.id] = {
        id: editingTemplate.id,
        platform: editingTemplate.platform,
        title: editingTemplate.title,
        features: editingTemplate.features,
        prompt: editingTemplate.prompt,
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem('aigenerator_templates', JSON.stringify(currentSaved))

      // 觸發同步事件
      window.dispatchEvent(new CustomEvent('templatesUpdated'))

      setEditingId(null)
      console.log('模板保存成功:', editingTemplate.id)
    } catch (error) {
      console.error('保存失敗:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 更新模板欄位
  const updateTemplateField = (id: string, field: keyof Template, value: string) => {
    setTemplates(prev => prev.map(template =>
      template.id === id ? { ...template, [field]: value } : template
    ))
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
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                          {template.platform}
                        </span>
                        <h3 className="text-lg font-medium text-gray-900">
                          {editingId === template.id ? (
                            <input
                              type="text"
                              value={template.title}
                              onChange={(e) => updateTemplateField(template.id, 'title', e.target.value)}
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
                            onChange={(e) => updateTemplateField(template.id, 'features', e.target.value)}
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
                            onChange={(e) => updateTemplateField(template.id, 'prompt', e.target.value)}
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
