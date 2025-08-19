import { useState } from 'react'
import AdminSubnav from '../../components/AdminSubnav'

// 簡單的模板資料結構
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

export default function AIGeneratorSimple() {
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // 開始編輯
  const startEdit = (index: number) => {
    setEditingIndex(index)
  }

  // 取消編輯
  const cancelEdit = () => {
    setEditingIndex(null)
    // 重新載入原始資料
    setTemplates(TEMPLATES)
  }

  // 保存編輯
  const saveEdit = () => {
    // 這裡可以添加保存到後端的邏輯
    console.log('保存模板:', templates[editingIndex!])
    setEditingIndex(null)
  }

  // 更新模板
  const updateTemplate = (field: keyof Template, value: string) => {
    if (editingIndex === null) return
    
    const newTemplates = [...templates]
    newTemplates[editingIndex] = {
      ...newTemplates[editingIndex],
      [field]: value
    }
    setTemplates(newTemplates)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <AdminSubnav />
      
      <div>
        <h1 className="text-2xl font-bold mb-2">AI 生成器模板管理</h1>
        <p className="text-gray-600">管理四個預設模板的設定</p>
      </div>

      <div className="space-y-4">
        {templates.map((template, index) => (
          <div key={template.id} className="border rounded-lg p-4 bg-white">
            {/* 標題行 */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">{template.title}</h3>
                <p className="text-sm text-gray-500">{template.platform}</p>
              </div>
              
              {editingIndex === index ? (
                <div className="space-x-2">
                  <button
                    onClick={saveEdit}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(index)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  編輯
                </button>
              )}
            </div>

            {/* 內容區域 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 平台 */}
              <div>
                <label className="block text-sm font-medium mb-1">平台</label>
                {editingIndex === index ? (
                  <select
                    value={template.platform}
                    onChange={(e) => updateTemplate('platform', e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Threads">Threads</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="General">通用</option>
                  </select>
                ) : (
                  <div className="p-2 bg-gray-50 border rounded">{template.platform}</div>
                )}
              </div>

              {/* 標題 */}
              <div>
                <label className="block text-sm font-medium mb-1">模板名稱</label>
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={template.title}
                    onChange={(e) => updateTemplate('title', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 border rounded">{template.title}</div>
                )}
              </div>

              {/* 特徵 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">模板內容</label>
                {editingIndex === index ? (
                  <textarea
                    value={template.features}
                    onChange={(e) => updateTemplate('features', e.target.value)}
                    rows={2}
                    className="w-full p-2 border rounded"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 border rounded">{template.features}</div>
                )}
              </div>

              {/* Prompt */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">模板 Prompt</label>
                {editingIndex === index ? (
                  <textarea
                    value={template.prompt}
                    onChange={(e) => updateTemplate('prompt', e.target.value)}
                    rows={5}
                    className="w-full p-2 border rounded"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 border rounded whitespace-pre-wrap">{template.prompt}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
