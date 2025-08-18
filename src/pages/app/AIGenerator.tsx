import { useState } from 'react'
import AdminSubnav from '../../components/AdminSubnav'

// 系統模板資料
const SYSTEM_TEMPLATES = [
  {
    id: 'threads-1',
    platform: 'threads' as const,
    title: '第一則貼文',
    features: '480-500字，完整觀點論述，獨立主題',
    prompt: '請嚴格遵守以下規則生成 Threads 第一則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：480～500 字\n- 不能與其他貼文有上下文延續關係'
  },
  {
    id: 'threads-2',
    platform: 'threads' as const,
    title: '第二則貼文',
    features: '330-350字，完整觀點論述，獨立主題',
    prompt: '請嚴格遵守以下規則生成 Threads 第二則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：330～350 字\n- 不能與其他貼文有上下文延續關係'
  },
  {
    id: 'threads-3',
    platform: 'threads' as const,
    title: '第三則貼文',
    features: '180-200字，完整觀點論述，獨立主題',
    prompt: '請嚴格遵守以下規則生成 Threads 第三則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：180～200 字\n- 不能與其他貼文有上下文延續關係'
  },
  {
    id: 'instagram',
    platform: 'instagram' as const,
    title: 'Instagram 貼文',
    features: '溫暖語氣，開放式問題結尾，具洞察力',
    prompt: '請生成 Instagram 貼文：\n- 語氣溫暖但具洞察力\n- 可結尾搭配開放式問題（例如「你也有這樣的經驗嗎？」）\n- 長度可以略長於 Threads\n- 保持與主題相關的連貫性'
  }
]

type Platform = typeof SYSTEM_TEMPLATES[0]['platform']

const PLATFORM_LABELS: Record<Platform, string> = {
  threads: 'Threads',
  instagram: 'Instagram'
}

export default function AIGenerator() {
  const [templates, setTemplates] = useState(SYSTEM_TEMPLATES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    features: '',
    prompt: ''
  })

  // 開始編輯
  const startEdit = (template: typeof SYSTEM_TEMPLATES[0]) => {
    setEditingId(template.id)
    setEditForm({
      title: template.title,
      features: template.features,
      prompt: template.prompt
    })
  }

  // 取消編輯
  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ title: '', features: '', prompt: '' })
  }

  // 保存編輯
  const saveEdit = () => {
    if (!editingId) return
    
    setTemplates(prev => prev.map(t => 
      t.id === editingId 
        ? { ...t, ...editForm }
        : t
    ))
    
    setEditingId(null)
    setEditForm({ title: '', features: '', prompt: '' })
  }

  // 處理表單變化
  const handleChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <AdminSubnav />
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>
          AI 生成器模板管理
        </h1>
        <div className="text-sm text-gray-600">
          管理四個預設模板的設定
        </div>
      </div>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{template.title}</h3>
                <p className="text-sm text-gray-500">{PLATFORM_LABELS[template.platform]}</p>
              </div>
              {editingId === template.id ? (
                <div className="space-x-2">
                  <button
                    onClick={saveEdit}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(template)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  編輯
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">模板名稱</label>
                {editingId === template.id ? (
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded border text-gray-900">
                    {template.title}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">模板內容</label>
                {editingId === template.id ? (
                  <textarea
                    value={editForm.features}
                    onChange={(e) => handleChange('features', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded border text-gray-900">
                    {template.features}
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">模板 Prompt</label>
                {editingId === template.id ? (
                  <textarea
                    value={editForm.prompt}
                    onChange={(e) => handleChange('prompt', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded border text-gray-900">
                    {template.prompt}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
