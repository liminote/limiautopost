import { useState, useEffect } from 'react'
import { CardService } from '../../services/cardService'
import AdminSubnav from '../../components/AdminSubnav'

// 模板編輯的類型定義
type TemplateEditData = {
  id: string
  platform: 'threads' | 'instagram' | 'facebook' | 'general'
  templateTitle: string
  templateFeatures: string
  prompt: string
}

// 平台名稱映射
const PLATFORM_NAMES = {
  threads: 'Threads',
  instagram: 'Instagram', 
  facebook: 'Facebook',
  general: 'General'
} as const

// 共用樣式
const INPUT_STYLES = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function AIGenerator() {
  const [templates, setTemplates] = useState<TemplateEditData[]>([])
  const [editState, setEditState] = useState<{
    template: TemplateEditData | null
    isOpen: boolean
    message: string | null
  }>({
    template: null,
    isOpen: false,
    message: null
  })

  const cardService = CardService.getInstance()

  // 載入系統預設模板
  useEffect(() => {
    const loadTemplates = async () => {
      console.log('🔄 開始載入模板...')
      
      try {
        // 載入保存的系統模板修改
        await cardService.loadSavedSystemTemplates()
        console.log('✅ 載入保存的模板完成')
        
        // 將系統卡片轉換為編輯格式
        const systemCards = cardService.getSystemCardsSync() // 使用同步版本
        console.log('📋 系統卡片:', systemCards)
        
        const templateData: TemplateEditData[] = systemCards.map(card => ({
          id: card.id,
          platform: card.platform,
          templateTitle: card.templateTitle,
          templateFeatures: card.templateFeatures,
          prompt: card.prompt
        }))
        
        console.log('🔄 轉換後的模板資料:', templateData)
        setTemplates(templateData)
        
        // 如果沒有載入到資料，使用預設資料
        if (templateData.length === 0) {
          console.log('⚠️ 沒有載入到模板資料，使用預設資料')
          const defaultTemplates: TemplateEditData[] = [
            {
              id: 'system-threads-1',
              platform: 'threads',
              templateTitle: '第一則貼文',
              templateFeatures: '480-500字，完整觀點論述，獨立主題',
              prompt: '請嚴格遵守以下規則生成 Threads 第一則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：480～500 字\n- 不能與其他貼文有上下文延續關係'
            },
            {
              id: 'system-threads-2',
              platform: 'threads',
              templateTitle: '第二則貼文',
              templateFeatures: '330-350字，完整觀點論述，獨立主題',
              prompt: '請嚴格遵守以下規則生成 Threads 第二則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：330～350 字\n- 不能與其他貼文有上下文延續關係'
            }
          ]
          setTemplates(defaultTemplates)
        }
      } catch (error) {
        console.error('❌ 載入模板失敗:', error)
        // 使用預設資料作為備用
        const fallbackTemplates: TemplateEditData[] = [
          {
            id: 'fallback-1',
            platform: 'threads',
            templateTitle: '備用模板 1',
            templateFeatures: '備用模板內容',
            prompt: '備用 prompt'
          }
        ]
        setTemplates(fallbackTemplates)
      }
    }

    loadTemplates()
  }, [cardService])

  // 開始編輯模板
  const startEdit = (template: TemplateEditData) => {
    console.log('🔧 開始編輯模板:', template)
    console.log('🔧 當前 editState:', editState)
    
    setEditState({
      template: { ...template },
      isOpen: true,
      message: null
    })
    
    console.log('🔧 設置 editState 後:', {
      template: { ...template },
      isOpen: true,
      message: null
    })
  }

  // 取消編輯
  const cancelEdit = () => {
    setEditState({
      template: null,
      isOpen: false,
      message: null
    })
  }

  // 保存模板
  const saveTemplate = async () => {
    const { template } = editState
    if (!template) return

    try {
      // 更新本地狀態
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? template : t
      ))
      
      // 更新 CardService 中的模板（現在是 async）
      const success = await cardService.updateSystemTemplate(
        template.id,
        template.platform,
        template.templateTitle,
        template.templateFeatures,
        template.prompt
      )
      
      if (success) {
        setEditState(prev => ({
          ...prev,
          message: '模板保存成功！',
          isOpen: false,
          template: null
        }))
        
        // 3秒後清除成功訊息
        setTimeout(() => setEditState(prev => ({ ...prev, message: null })), 3000)
      } else {
        setEditState(prev => ({ ...prev, message: '保存失敗' }))
      }
    } catch (error) {
      setEditState(prev => ({ ...prev, message: '保存失敗：' + String(error) }))
    }
  }

  // 處理編輯欄位變化
  const handleEditChange = (field: keyof TemplateEditData, value: string) => {
    setEditState(prev => prev.template ? {
      ...prev,
      template: { ...prev.template!, [field]: value }
    } : prev)
  }

  const { template: editingTemplate, isOpen, message: saveMessage } = editState

  // 調試信息
  console.log('🔍 渲染時的狀態:', { editingTemplate, isOpen, message: saveMessage })

  return (
    <div className="space-y-6">
      {/* Admin sub header */}
      <AdminSubnav />
      
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
                disabled={isOpen}
              >
                編輯模板
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">平台</label>
                <div className="p-2 bg-gray-50 rounded border">
                  {PLATFORM_NAMES[template.platform]}
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

      {/* 編輯對話框調試信息 */}
      <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded text-sm">
        <strong>編輯對話框狀態：</strong><br/>
        isOpen: {String(isOpen)}<br/>
        editingTemplate: {editingTemplate ? `存在 (${editingTemplate.templateTitle})` : '不存在'}<br/>
        templates.length: {templates.length}
      </div>

      {/* 編輯對話框 */}
      {isOpen && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">編輯模板：{editingTemplate.templateTitle}</h3>
            
            {/* 調試信息 */}
            <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
              <strong>調試信息：</strong> isOpen={String(isOpen)}, editingTemplate={editingTemplate ? '存在' : '不存在'}
            </div>
            
            <div className="space-y-4">
              {/* 平台選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  平台
                </label>
                <select
                  className={INPUT_STYLES}
                  value={editingTemplate.platform}
                  onChange={(e) => handleEditChange('platform', e.target.value)}
                >
                  {Object.entries(PLATFORM_NAMES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* 模板名稱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模板名稱
                </label>
                <input
                  type="text"
                  className={INPUT_STYLES}
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
                  className={INPUT_STYLES}
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
                  className={INPUT_STYLES}
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
