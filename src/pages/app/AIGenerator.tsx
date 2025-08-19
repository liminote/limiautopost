import { useState } from 'react'
import AdminSubnav from '../../components/AdminSubnav'

export default function AIGenerator() {
  const [isEditing, setIsEditing] = useState(false)
  const [testValue, setTestValue] = useState('測試值')

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <AdminSubnav />
      
      <div>
        <h1 className="text-2xl font-bold mb-2">AI 生成器模板管理 - 測試版</h1>
        <p className="text-gray-600">極簡測試版本</p>
      </div>

      {/* 測試編輯功能 */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-semibold mb-4">編輯測試</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">測試欄位</label>
            {isEditing ? (
              <input
                type="text"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                className="w-full p-2 border rounded"
              />
            ) : (
              <div className="p-2 bg-gray-50 border rounded">{testValue}</div>
            )}
          </div>

          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setTestValue('測試值') // 恢復原值
                    setIsEditing(false)
                  }}
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

        {/* 狀態顯示 */}
        <div className="mt-4 p-3 bg-blue-50 border rounded">
          <p className="text-sm text-blue-800">
            <strong>當前狀態：</strong> {isEditing ? '編輯模式' : '顯示模式'}
          </p>
          <p className="text-sm text-blue-800">
            <strong>測試值：</strong> {testValue}
          </p>
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
