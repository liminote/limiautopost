import React, { useState, useCallback, useEffect } from 'react'
import { CardService } from '../../services/cardService'
import { BackendTemplateService } from '../../services/backendTemplateService'
import { defaultSystemCards } from '../../data/defaultCards'
import { ChatGPTService } from '../../services/chatgptService'

// 診斷日誌系統
class TemplateDiagnostics {
  private logs: Array<{ timestamp: string; action: string; details: any }> = []
  
  log(action: string, details?: any) {
    const logEntry = {
      timestamp: new Date().toLocaleString('zh-TW'),
      action,
      details
    }
    this.logs.push(logEntry)
    console.log(`[TemplateDiagnostics] ${action}:`, details)
    
    // 保持最多 50 條日誌
    if (this.logs.length > 50) {
      this.logs.shift()
    }
  }
  
  getLogs() {
    return this.logs
  }
  
  exportLogs() {
    return JSON.stringify(this.logs, null, 2)
  }
}

const diagnostics = new TemplateDiagnostics()

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
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  
  const cardService = CardService.getInstance()
  const backendService = BackendTemplateService.getInstance()
  const chatgptService = new ChatGPTService()

  // 載入已保存的模板
  const loadSavedTemplates = useCallback(async () => {
    diagnostics.log('loadSavedTemplates 開始執行')
    
    try {
      // 完全依賴後端 API，不再讀取 localStorage
      console.log('[AIGenerator] 從後端 API 獲取系統模板...')
      diagnostics.log('從後端 API 獲取系統模板')
      
      const backendTemplates = await backendService.getSystemTemplates()
      diagnostics.log('後端 API 回應', { 
        count: backendTemplates.length, 
        templates: backendTemplates 
      })
      
      if (backendTemplates.length > 0) {
        console.log('[AIGenerator] 從後端獲取到模板，數量:', backendTemplates.length)
        diagnostics.log('從後端獲取到模板', { count: backendTemplates.length })
        
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
        diagnostics.log('設置最終模板', { 
          count: finalTemplates.length, 
          templates: finalTemplates 
        })
        
        setTemplates(finalTemplates)
        return
      }
      
      // 沒有找到任何模板，顯示 4 個可編輯的空白預設模板
      console.log('[AIGenerator] 沒有找到模板數據，顯示空白預設模板供編輯')
      diagnostics.log('沒有找到模板數據，顯示空白預設模板')
      setTemplates(TEMPLATES)
      
    } catch (error) {
      console.error('[AIGenerator] 載入模板失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      diagnostics.log('載入模板失敗', { error: errorMessage })
      
      // 如果後端失敗，顯示預設模板
      setTemplates(TEMPLATES)
    }
  }, [backendService])

  // 保存編輯
  const saveEdit = useCallback(async () => {
    if (!editingId) return
    
    diagnostics.log('saveEdit 開始執行', { 
      editingId, 
      title: editingTitle, 
      features: editingFeatures, 
      prompt: editingPrompt 
    })
    
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
      
      diagnostics.log('後端保存結果', saveResult)
      
      // 檢查保存結果 - 後端返回的是完整的模板對象，不是布爾值
      if (saveResult && saveResult.id) {
        console.log('[AIGenerator] 模板保存成功')
        diagnostics.log('模板保存成功')
        
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
        diagnostics.log('模板保存失敗', { error: '保存結果為空或無效' })
        alert('保存失敗: 後端回應異常')
      }
    } catch (error) {
      console.error('[AIGenerator] 保存模板時發生錯誤:', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      diagnostics.log('保存模板時發生錯誤', { error: errorMessage })
      alert(`保存失敗: ${errorMessage}`)
    }
  }, [editingId, editingTitle, editingFeatures, editingPrompt, templates, backendService])

  // 開始編輯
  const startEdit = useCallback((template: { id: string; title: string; features: string; prompt: string }) => {
    diagnostics.log('開始編輯模板', { 
      id: template.id, 
      title: template.title, 
      features: template.features, 
      prompt: template.prompt 
    })
    
    setEditingId(template.id)
    setEditingTitle(template.title)
    setEditingFeatures(template.features)
    setEditingPrompt(template.prompt)
  }, [])

  // 取消編輯
  const cancelEdit = useCallback(() => {
    diagnostics.log('取消編輯')
    setEditingId(null)
    setEditingTitle('')
    setEditingFeatures('')
    setEditingPrompt('')
  }, [])

  // 生成內容
  const generateContent = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return
    
    diagnostics.log('開始生成內容', { prompt })
    setIsGenerating(true)
    
    try {
      const result = await chatgptService.generateContent({ prompt })
      
      if (result.success && result.content) {
        setGeneratedContent(result.content)
        diagnostics.log('內容生成成功', { contentLength: result.content.length })
      } else {
        console.error('生成失敗:', result.error)
        diagnostics.log('內容生成失敗', { error: result.error })
        setGeneratedContent(`生成失敗: ${result.error}`)
      }
    } catch (error) {
      console.error('生成內容時發生錯誤:', error)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      diagnostics.log('生成內容時發生錯誤', { error: errorMessage })
      setGeneratedContent(`生成錯誤: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }, [chatgptService])

  // 組件掛載時載入模板
  useEffect(() => {
    diagnostics.log('AIGenerator 組件掛載')
    loadSavedTemplates()
    
    // 清理函數
    return () => {
      diagnostics.log('AIGenerator 組件卸載')
    }
  }, [loadSavedTemplates])

  // 監聽模板更新事件
  useEffect(() => {
    const handleTemplatesUpdated = () => {
      diagnostics.log('收到 templatesUpdated 事件')
      // 注意：不再自動重新載入，避免覆蓋用戶編輯
    }
    
    window.addEventListener('templatesUpdated', handleTemplatesUpdated)
    
    return () => {
      window.removeEventListener('templatesUpdated', handleTemplatesUpdated)
    }
  }, [])

  // 監聽頁面可見性變化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        diagnostics.log('頁面變為可見')
      } else {
        diagnostics.log('頁面變為隱藏')
      }
    }
    
    const handleFocus = () => {
      diagnostics.log('頁面獲得焦點')
    }
    
    const handleBlur = () => {
      diagnostics.log('頁面失去焦點')
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // 監聽 localStorage 變化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes('template')) {
        diagnostics.log('localStorage 變化', { 
          key: e.key, 
          oldValue: e.oldValue, 
          newValue: e.newValue 
        })
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 生成器</h1>
          <p className="text-gray-600">管理您的 AI 生成模板</p>
        </div>

        {/* 診斷控制面板 */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-blue-900">診斷工具</h3>
            <div className="space-x-2">
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {showDiagnostics ? '隱藏診斷' : '顯示診斷'}
              </button>
              <button
                onClick={() => {
                  const logs = diagnostics.exportLogs()
                  navigator.clipboard.writeText(logs)
                  alert('診斷日誌已複製到剪貼板')
                }}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                複製日誌
              </button>
              <button
                onClick={() => {
                  diagnostics.log('手動觸發 loadSavedTemplates')
                  loadSavedTemplates()
                }}
                className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                手動重新載入
              </button>
            </div>
          </div>
          
          {showDiagnostics && (
            <div className="mt-4 p-3 bg-white rounded border">
              <div className="text-sm text-gray-700 mb-2">
                <strong>當前狀態：</strong>
                - 模板數量: {templates.length}
                - 編輯中: {editingId || '無'}
                - 最後更新: {new Date().toLocaleString('zh-TW')}
              </div>
              <div className="text-xs text-gray-600 max-h-40 overflow-y-auto">
                {diagnostics.getLogs().slice(-10).map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-blue-600">{log.timestamp}</span>
                    <span className="text-gray-800">: {log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 模板列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
