import React, { useState, useCallback, useEffect } from 'react'
import { CardService } from '../../services/cardService'
import { BackendTemplateService } from '../../services/backendTemplateService'
import { defaultSystemCards } from '../../data/defaultCards'
import { ChatGPTService } from '../../services/chatgptService'
import AdminSubnav from '../../components/AdminSubnav'

// 創建模板數據結構
const TEMPLATES = defaultSystemCards.map(card => ({
  id: card.id,
  title: card.templateTitle || '',
  platform: card.platform,
  features: card.templateFeatures || '',
  prompt: card.prompt || ''
}))

export default function AIGenerator() {
  const [templates, setTemplates] = useState(TEMPLATES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingFeatures, setEditingFeatures] = useState('')
  const [editingPrompt, setEditingPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  
  const cardService = CardService.getInstance()
  const backendService = BackendTemplateService.getInstance()
  const chatgptService = new ChatGPTService()

  // 載入已保存的模板
  const loadSavedTemplates = useCallback(async () => {
    try {
      // 完全依賴後端 API，不再讀取 localStorage
      console.log('[AIGenerator] 從後端 API 獲取系統模板...')
      
      const backendTemplates = await backendService.getSystemTemplates()
      
      if (backendTemplates.length > 0) {
        console.log('[AIGenerator] 從後端獲取到模板，數量:', backendTemplates.length)
        
        // 將後端模板轉換為前端格式
        const convertedTemplates = backendTemplates.map(template => ({
          id: template.id,
          title: template.title,
          platform: template.platform,
          features: template.features,
          prompt: template.prompt
        }))
        
        // 確保有 4 個模板位置
        const finalTemplates = [...convertedTemplates]
        for (let i = 1; i <= 4; i++) {
          const templateId = `template-${i}`
          if (!finalTemplates.find(t => t.id === templateId)) {
            // 補充缺失的模板位置
            finalTemplates.push({
              id: templateId,
              title: '',
              platform: 'threads',
              features: '',
              prompt: ''
            })
          }
        }
        
        // 按 ID 排序，確保 template-1, template-2, template-3, template-4 的順序
        finalTemplates.sort((a, b) => a.id.localeCompare(b.id))
        
        console.log('[AIGenerator] 設置最終模板，數量:', finalTemplates.length)
        setTemplates(finalTemplates)
        return
      }
      
      // 沒有找到任何模板，顯示 4 個可編輯的空白預設模板
      console.log('[AIGenerator] 沒有找到模板數據，顯示空白預設模板供編輯')
      setTemplates(TEMPLATES)
      
    } catch (error) {
      console.error('[AIGenerator] 載入模板失敗:', error)
      
      // 如果後端失敗，顯示預設模板
      setTemplates(TEMPLATES)
    }
  }, [backendService])

  // 載入模板
  useEffect(() => {
    loadSavedTemplates()
  }, [loadSavedTemplates])

  // 開始編輯
  const startEdit = useCallback((template: typeof TEMPLATES[0]) => {
    console.log('🔧 開始編輯模板:', template.id)
    setEditingId(template.id)
    setEditingTitle(template.title)
    setEditingFeatures(template.features)
    setEditingPrompt(template.prompt)
  }, [])

  // 取消編輯
  const cancelEdit = useCallback(() => {
    console.log('❌ 取消編輯')
    setEditingId(null)
    setEditingTitle('')
    setEditingFeatures('')
    setEditingPrompt('')
  }, [])

  // 保存編輯
  const saveEdit = useCallback(async () => {
    if (!editingId) return
    
    try {
      const updatedTemplates = templates.map(template =>
        template.id === editingId
          ? {
              ...template,
              title: editingTitle,
              features: editingFeatures,
              prompt: editingPrompt
            }
          : template
      )
      
      // 保存到後端
      const saveResult = await backendService.updateSystemTemplate(editingId, {
        title: editingTitle,
        features: editingFeatures,
        prompt: editingPrompt
      })
      
      // 檢查保存結果 - 後端返回的是完整的模板對象，不是布爾值
      if (saveResult && saveResult.id) {
        console.log('[AIGenerator] 模板保存成功')
        
        // 更新本地狀態
        setTemplates(updatedTemplates)
        setEditingId(null)
        setEditingTitle('')
        setEditingFeatures('')
        setEditingPrompt('')
        
        // 通知其他組件
        window.dispatchEvent(new CustomEvent('templatesUpdated'))
      } else {
        console.error('[AIGenerator] 模板保存失敗')
        alert('保存失敗: 後端回應異常')
      }
    } catch (error) {
      console.error('[AIGenerator] 保存模板時發生錯誤:', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      alert(`保存失敗: ${errorMessage}`)
    }
  }, [editingId, editingTitle, editingFeatures, editingPrompt, templates, backendService])

  // 生成內容
  const generateContent = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    setGeneratedContent('')
    
    try {
      const result = await chatgptService.generateContent({ prompt })
      
      if (result.success && result.content) {
        setGeneratedContent(result.content)
      } else {
        console.error('生成失敗:', result.error)
        setGeneratedContent(`生成失敗: ${result.error}`)
      }
    } catch (error) {
      console.error('生成內容失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      setGeneratedContent(`生成失敗: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }, [chatgptService])

  return (
    <div className="space-y-4">
      {/* Admin sub header */}
      <AdminSubnav />
      
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">AI 生成器模板管理</h1>
          <p className="text-gray-600">管理四個預設模板的設定</p>
        </div>

        {/* 模板列表 */}
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4 bg-white">
              {editingId === template.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    placeholder="模板標題"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <textarea
                    value={editingFeatures}
                    onChange={(e) => setEditingFeatures(e.target.value)}
                    placeholder="模板特色"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <textarea
                    value={editingPrompt}
                    onChange={(e) => setEditingPrompt(e.target.value)}
                    placeholder="AI 提示詞"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {template.title || '未命名模板'}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    {template.features || '無特色描述'}
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-gray-700">
                      {template.prompt || '無提示詞'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(template)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => generateContent(template.prompt)}
                      disabled={!template.prompt.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      生成內容
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 生成的內容 */}
        {generatedContent && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">生成的內容</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{generatedContent}</p>
            </div>
            {isGenerating && (
              <div className="mt-4 text-center text-gray-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2">正在生成內容...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
