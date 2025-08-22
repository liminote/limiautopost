import React, { useState, useEffect } from 'react'
import { BackendTemplateService } from '../../services/backendTemplateService'
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
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState({ title: '', features: '', prompt: '' })
  
  const backendService = BackendTemplateService.getInstance()

  // 載入模板
  useEffect(() => {
    loadTemplates()
  }, [])

  // 簡化的載入邏輯
  const loadTemplates = async () => {
    try {
      const backendTemplates = await backendService.getSystemTemplates()
      
      if (backendTemplates.length > 0) {
        // 直接轉換為前端格式
        const convertedTemplates = backendTemplates.map(t => ({
          id: t.id,
          title: t.title || '',
          platform: t.platform,
          features: t.features || '',
          prompt: t.prompt || ''
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
      } else {
        setTemplates(DEFAULT_TEMPLATES)
      }
    } catch (error) {
      console.error('載入模板失敗:', error)
      setTemplates(DEFAULT_TEMPLATES)
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
      // 保存到後端
      const saveResult = await backendService.updateSystemTemplate(editingId, editingData)
      
      if (saveResult?.id) {
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
      } else {
        alert('保存失敗')
      }
    } catch (error) {
      console.error('保存失敗:', error)
      alert(`保存失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  // 處理編輯數據變化
  const handleEditChange = (field: keyof typeof editingData, value: string) => {
    setEditingData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <AdminSubnav />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">AI 生成器模板管理</h1>
          <p className="text-gray-600">管理四個預設模板的設定</p>
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
    </div>
  )
}
