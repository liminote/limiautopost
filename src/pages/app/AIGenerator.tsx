import { useState, useRef, useEffect } from 'react'
import AdminSubnav from '../../components/AdminSubnav'

export default function AIGenerator() {
  const [isEditing, setIsEditing] = useState(false)
  const [testValue, setTestValue] = useState('測試值')
  const inputRef = useRef<HTMLInputElement>(null)
  const renderCount = useRef(0)
  
  // 追蹤渲染次數
  renderCount.current += 1

  // 當進入編輯模式時，聚焦到輸入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  // 處理保存
  const handleSave = () => {
    console.log('保存前值:', testValue)
    setIsEditing(false)
    console.log('保存後值:', testValue)
  }

  // 處理取消
  const handleCancel = () => {
    console.log('取消前值:', testValue)
    setTestValue('測試值')
    setIsEditing(false)
    console.log('取消後值:', testValue)
  }

  // 處理輸入變化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    console.log('輸入變化:', newValue)
    setTestValue(newValue)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <AdminSubnav />
      
      <div>
        <h1 className="text-2xl font-bold mb-2">AI 生成器模板管理 - 調試版</h1>
        <p className="text-gray-600">調試狀態更新問題</p>
      </div>

      {/* 調試信息 */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">調試信息</h3>
        <p className="text-sm text-yellow-700">渲染次數: {renderCount.current}</p>
        <p className="text-sm text-yellow-700">當前狀態: {isEditing ? '編輯模式' : '顯示模式'}</p>
        <p className="text-sm text-yellow-700">測試值: "{testValue}"</p>
        <p className="text-sm text-yellow-700">測試值長度: {testValue.length}</p>
      </div>

      {/* 測試編輯功能 */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-semibold mb-4">編輯測試</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">測試欄位</label>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={testValue}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="輸入測試內容"
              />
            ) : (
              <div className="p-2 bg-gray-50 border rounded">
                <span className="font-mono">"{testValue}"</span>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  取消
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                編輯
              </button>
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium mb-2">額外操作</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => setTestValue('手動設置值')}
              className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              設置為「手動設置值」
            </button>
            <button
              onClick={() => setTestValue('')}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              清空值
            </button>
            <button
              onClick={() => console.log('當前狀態:', { isEditing, testValue })}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              輸出到 Console
            </button>
          </div>
        </div>
      </div>

      {/* 原始模板顯示（只讀） */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-semibold mb-4">預設模板（只讀）</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">第一則貼文</label>
            <div className="p-2 bg-gray-50 border rounded">
              480-500字，完整觀點論述，獨立主題
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">第二則貼文</label>
            <div className="p-2 bg-gray-50 border rounded">
              330-350字，完整觀點論述，獨立主題
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">第三則貼文</label>
            <div className="p-2 bg-gray-50 border rounded">
              180-200字，完整觀點論述，獨立主題
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Instagram 貼文</label>
            <div className="p-2 bg-gray-50 border rounded">
              溫暖語氣，開放式問題結尾，具洞察力
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
