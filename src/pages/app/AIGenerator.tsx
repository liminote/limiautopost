import { useState, useEffect } from 'react'
import { CardService } from '../../services/cardService'

// 模板編輯的類型定義
type TemplateEditData = {
  id: string
  platform: 'threads' | 'instagram' | 'facebook' | 'general'
  templateTitle: string
  templateFeatures: string
  prompt: string
  isSystem: boolean
}

export default function AIGenerator() {
  const [templates, setTemplates] = useState<TemplateEditData[]>([])
  const [editingTemplate, setEditingTemplate] = useState<TemplateEditData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const cardService = CardService.getInstance()

  // 載入系統預設模板
  useEffect(() => {
    const loadSystemTemplates = () => {
      const systemCards = cardService.getSystemCards()
      const templateData: TemplateEditData[] = systemCards.map(card => ({
        id: card.id,
        platform: card.platform,
        templateTitle: card.templateTitle,
        templateFeatures: card.templateFeatures,
        prompt: card.prompt,
        isSystem: card.isSystem
      }))
      setTemplates(templateData)
    }

    loadSystemTemplates()
  }, [])

  // 開始編輯模板
  const startEdit = (template: TemplateEditData) => {
    setEditingTemplate({ ...template })
    setIsEditing(true)
  }

  // 取消編輯
  const cancelEdit = () => {
    setEditingTemplate(null)
    setIsEditing(false)
    setSaveMessage(null)
  }

  // 保存模板
  const saveTemplate = () => {
    if (!editingTemplate) return

    try {
      // 更新本地狀態
      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id ? editingTemplate : t
      ))
      
      // 更新 CardService 中的模板
      cardService.updateSystemTemplate(
        editingTemplate.id,
        editingTemplate.platform,
        editingTemplate.templateTitle,
        editingTemplate.templateFeatures,
        editingTemplate.prompt
      )
      
      setSaveMessage('模板保存成功！')
      setIsEditing(false)
      setEditingTemplate(null)
      
      // 3秒後清除成功訊息
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      setSaveMessage('保存失敗：' + String(error))
    }
  }

  // 處理編輯欄位變化
  const handleEditChange = (field: keyof TemplateEditData, value: string) => {
    if (!editingTemplate) return
    setEditingTemplate(prev => prev ? { ...prev, [field]: value } : null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>
          AI 生成器模板管理
        </h1>
        <div className="text-sm text-gray-600">
          管理四個預設模板的設定
        </div>
      </div>

      {/* 成功/錯誤訊息 */}
      {saveMessage && (
        <div className={`p-3 rounded-lg ${saveMessage.includes('成功') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {saveMessage}
        </div>
      )}

      {/* 模板列表 */}
      <div className="grid grid-cols-1 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="card card-body">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{template.templateTitle}</h3>
              <button
                className="btn btn-primary"
                onClick={() => startEdit(template)}
                disabled={isEditing}
              >
                編輯模板
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">平台</label>
                <div className="p-2 bg-gray-50 rounded border">
                  {template.platform === 'threads' ? 'Threads' : 
                   template.platform === 'instagram' ? 'Instagram' : 
                   template.platform === 'facebook' ? 'Facebook' : 'General'}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-600 mb-1">模板名稱</label>
                <div className="p-2 bg-gray-50 rounded border">
                  {template.templateTitle}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-600 mb-1">模板內容</label>
                <div className="p-2 bg-gray-50 rounded border">
                  {template.templateFeatures}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-600 mb-1">模板 Prompt</label>
                <div className="p-2 bg-gray-50 rounded border">
                  {template.prompt}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 編輯對話框 */}
      {isEditing && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">編輯模板：{editingTemplate.templateTitle}</h3>
            
            <div className="space-y-4">
              {/* 平台選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  平台
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingTemplate.platform}
                  onChange={(e) => handleEditChange('platform', e.target.value as any)}
                >
                  <option value="threads">Threads</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="general">General</option>
                </select>
              </div>

              {/* 模板名稱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模板名稱
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingTemplate.templateTitle}
                  onChange={(e) => handleEditChange('templateTitle', e.target.value)}
                />
              </div>

              {/* 模板內容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模板內容
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={editingTemplate.templateFeatures}
                  onChange={(e) => handleEditChange('templateFeatures', e.target.value)}
                />
              </div>

              {/* 模板 Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模板 Prompt
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  value={editingTemplate.prompt}
                  onChange={(e) => handleEditChange('prompt', e.target.value)}
                  placeholder="輸入 AI 生成時使用的 prompt 模板..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={saveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
