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
    id: 'threads-1',
    title: '第一則貼文',
    platform: 'Threads',
    features: '480-500字，完整觀點論述，獨立主題',
    prompt: '請嚴格遵守以下規則生成 Threads 第一則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：480～500 字\n- 不能與其他貼文有上下文延續關係'
  },
  {
    id: 'threads-2',
    title: '第二則貼文',
    platform: 'Threads',
    features: '330-350字，完整觀點論述，獨立主題',
    prompt: '請嚴格遵守以下規則生成 Threads 第二則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：330～350 字\n- 不能與其他貼文有上下文延續關係'
  },
  {
    id: 'threads-3',
    title: '第三則貼文',
    platform: 'Threads',
    features: '180-200字，完整觀點論述，獨立主題',
    prompt: '請嚴格遵守以下規則生成 Threads 第三則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：180～200 字\n- 不能與其他貼文有上下文延續關係'
  },
  {
    id: 'instagram',
    title: 'Instagram 貼文',
    platform: 'Instagram',
    features: '溫暖語氣，開放式問題結尾，具洞察力',
    prompt: '請生成 Instagram 貼文：\n- 語氣溫暖但具洞察力\n- 可結尾搭配開放式問題（例如「你也有這樣的經驗嗎？」）\n- 長度可以略長於 Threads\n- 保持與主題相關的連貫性'
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
        const response = await fetch('/.netlify/functions/get-system-templates')
        if (response.ok) {
          const savedTemplates = await response.json()
          
          // 將保存的修改應用到模板
          const updatedTemplates = TEMPLATES.map(template => {
            const savedTemplate = savedTemplates[template.id]
            if (savedTemplate) {
              return {
                ...template,
                platform: savedTemplate.platform,
                title: savedTemplate.templateTitle,
                features: savedTemplate.templateFeatures,
                prompt: savedTemplate.prompt
              }
            }
            return template
          })
          
          setTemplates(updatedTemplates)
        }
      } catch (error) {
        console.warn('無法從伺服器載入模板，使用預設模板:', error)
        setTemplates(TEMPLATES)
      }
    }
    
    loadSavedTemplates()
  }, [])

  // 開始編輯
  const startEdit = (id: string) => setEditingId(id)

  // 取消編輯
  const cancelEdit = () => {
    setEditingId(null)
    // 重新載入已保存的模板，而不是重置為原始資料
    const loadSavedTemplates = async () => {
      try {
        const response = await fetch('/.netlify/functions/get-system-templates')
        if (response.ok) {
          const savedTemplates = await response.json()
          
          const updatedTemplates = TEMPLATES.map(template => {
            const savedTemplate = savedTemplates[template.id]
            if (savedTemplate) {
              return {
                ...template,
                platform: savedTemplate.platform,
                title: savedTemplate.templateTitle,
                features: savedTemplate.templateFeatures,
                prompt: savedTemplate.prompt
              }
            }
            return template
          })
          
          setTemplates(updatedTemplates)
        }
      } catch (error) {
        console.warn('無法從伺服器載入模板，使用預設模板:', error)
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
      
      console.log('正在保存模板:', editingTemplate)
      
      // 保存到伺服器
      const response = await fetch('/.netlify/functions/update-system-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        console.log('模板保存成功:', result)
        setEditingId(null)
        
        // 觸發頁面重新載入以同步其他組件
        window.dispatchEvent(new CustomEvent('templatesUpdated'))
        
        // 同時更新 localStorage 以確保向後相容
        const currentSaved = JSON.parse(localStorage.getItem('aigenerator_templates') || '{}')
        currentSaved[editingTemplate.id] = {
          ...editingTemplate,
          updatedAt: new Date().toISOString()
        }
        localStorage.setItem('aigenerator_templates', JSON.stringify(currentSaved))
        
        alert('模板保存成功！')
      } else {
        const errorText = await response.text()
        console.error('保存模板失敗:', response.status, errorText)
        alert(`保存失敗 (${response.status}): ${errorText}`)
      }
    } catch (error) {
      console.error('保存模板時發生錯誤:', error)
      alert(`保存失敗: ${error instanceof Error ? error.message : '網路錯誤'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // 更新模板欄位
  const updateField = (id: string, field: keyof Template, value: string) => {
    setTemplates((prev: Template[]) => prev.map((t: Template) => 
      t.id === id ? { ...t, [field]: value } : t
    ))
  }

  // 渲染編輯或顯示模式
  const renderField = (template: Template, field: keyof Template, label: string, type: 'text' | 'textarea' | 'select', options?: string[]) => {
    const isEditing = editingId === template.id
    const value = template[field] as string

    if (!isEditing) {
      return (
        <div className="p-2 bg-gray-50 border rounded">
          {field === 'prompt' ? <span className="whitespace-pre-wrap">{value}</span> : value}
        </div>
      )
    }

    if (type === 'select' && options) {
      return (
        <select
          value={value}
          onChange={(e) => updateField(template.id, field, e.target.value)}
          className="w-full p-2 border rounded"
        >
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )
    }

    if (type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => updateField(template.id, field, e.target.value)}
          rows={field === 'prompt' ? 5 : 2}
          className="w-full p-2 border rounded"
        />
      )
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => updateField(template.id, field, e.target.value)}
        className="w-full p-2 border rounded"
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <AdminSubnav />
      
      <div>
        <h1 className="text-2xl font-bold mb-2">AI 生成器模板管理</h1>
        <p className="text-gray-600">管理四個預設模板的設定</p>
      </div>

      <div className="space-y-4">
        {templates.map((template: Template) => (
          <div key={template.id} className="border rounded-lg p-4 bg-white">
            {/* 標題行 */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">{template.title}</h3>
                <p className="text-sm text-gray-500">{template.platform}</p>
              </div>
              
              {editingId === template.id ? (
                <div className="space-x-2">
                  <button 
                    onClick={saveEdit} 
                    disabled={isSaving}
                    className={`px-3 py-1 rounded text-white ${
                      isSaving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                  <button 
                    onClick={cancelEdit} 
                    disabled={isSaving}
                    className={`px-3 py-1 rounded text-white ${
                      isSaving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit(template.id)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                  編輯
                </button>
              )}
            </div>

            {/* 內容區域 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">平台</label>
                {renderField(template, 'platform', '平台', 'select', ['Threads', 'Instagram', 'Facebook', '通用'])}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">模板名稱</label>
                {renderField(template, 'title', '模板名稱', 'text')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">模板內容</label>
                {renderField(template, 'features', '模板內容', 'textarea')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">模板 Prompt</label>
                {renderField(template, 'prompt', '模板 Prompt', 'textarea')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
