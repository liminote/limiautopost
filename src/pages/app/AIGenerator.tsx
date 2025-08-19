import { useState, useRef, useEffect } from 'react'
import AdminSubnav from '../../components/AdminSubnav'

export default function AIGenerator() {
  // 從 localStorage 讀取初始值，避免組件重新掛載時重置
  const [isEditing, setIsEditing] = useState(false)
  const [testValue, setTestValue] = useState(() => {
    const saved = localStorage.getItem('aigenerator_test_value')
    return saved || '測試值'
  })
  const [publishStatus, setPublishStatus] = useState('檢查中...')
  
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

  // 當 testValue 變化時，保存到 localStorage
  useEffect(() => {
    localStorage.setItem('aigenerator_test_value', testValue)
  }, [testValue])

  // 自動檢查發佈失敗原因
  useEffect(() => {
    const checkPublishStatus = async () => {
      try {
        // 檢查 GitHub Actions 狀態
        const response = await fetch('https://api.github.com/repos/liminote/limiautopost/actions/runs?per_page=5')
        const data = await response.json()
        
        if (data.workflow_runs && data.workflow_runs.length > 0) {
          const latestRun = data.workflow_runs[0]
          setPublishStatus(`最新排程: ${latestRun.status} (${new Date(latestRun.created_at).toLocaleString()})`)
        } else {
          setPublishStatus('無法獲取排程狀態')
        }
      } catch (error) {
        setPublishStatus(`檢查失敗: ${error}`)
      }
    }

    checkPublishStatus()
    // 每 30 秒檢查一次
    const interval = setInterval(checkPublishStatus, 30000)
    return () => clearInterval(interval)
  }, [])

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
        <h1 className="text-2xl font-bold mb-2">AI 生成器模板管理 - 修復版</h1>
        <p className="text-gray-600">修復狀態重置問題 + 自動檢查發佈狀態</p>
      </div>

      {/* 發佈狀態檢查 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">發佈狀態自動檢查</h3>
        <p className="text-sm text-blue-700 mb-2">每 30 秒自動檢查 GitHub Actions 排程狀態</p>
        <p className="text-sm text-blue-700">當前狀態: {publishStatus}</p>
        <div className="mt-2 text-xs text-blue-600">
          <p>• 如果看到「失敗」狀態，可能是 Threads 授權過期</p>
          <p>• 如果看到「發佈中」卡住，可能是 API 調用失敗</p>
          <p>• 建議檢查 Threads 帳號是否需要重新授權</p>
        </div>
      </div>

      {/* 調試信息 */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">調試信息</h3>
        <p className="text-sm text-yellow-700">渲染次數: {renderCount.current}</p>
        <p className="text-sm text-yellow-700">當前狀態: {isEditing ? '編輯模式' : '顯示模式'}</p>
        <p className="text-sm text-yellow-700">測試值: "{testValue}"</p>
        <p className="text-sm text-yellow-700">測試值長度: {testValue.length}</p>
        <p className="text-sm text-yellow-700">localStorage 值: "{localStorage.getItem('aigenerator_test_value')}"</p>
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
              onClick={() => console.log('當前狀態:', { isEditing, testValue, localStorage: localStorage.getItem('aigenerator_test_value') })}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              輸出到 Console
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('aigenerator_test_value')
                setTestValue('測試值')
              }}
              className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
            >
              重置 localStorage
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
