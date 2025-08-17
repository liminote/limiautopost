import { useState, useEffect } from 'react'
import { useSession } from '../auth/auth'

export default function ThreadsStatusChecker() {
  const session = useSession()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (!session) return
      const response = await fetch(`/.netlify/functions/threads-status?user=${encodeURIComponent(session.email)}`, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store' }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '檢查失敗')
    } finally {
      setLoading(false)
    }
  }

  const checkHealth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/health')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setStatus({ ...status, health: data })
    } catch (err) {
      setError(err instanceof Error ? err.message : '健康檢查失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      checkStatus()
    }
  }, [session])

  if (!session) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">請先登入以檢查 Threads 狀態</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button 
          onClick={checkStatus}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {loading ? '檢查中...' : '檢查 Threads 狀態'}
        </button>
        
        <button 
          onClick={checkHealth}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
        >
          健康檢查
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded">
          <strong>錯誤：</strong> {error}
        </div>
      )}

      {status && (
        <div className="space-y-3">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Threads 狀態</h3>
            <div className="space-y-1 text-sm">
              <div><strong>狀態：</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  status.status === 'linked' ? 'bg-green-100 text-green-800' :
                  status.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                  status.status === 'not_configured' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {status.status}
                </span>
              </div>
              {status.username && <div><strong>使用者名稱：</strong> {status.username}</div>}
              {status.reasonCode && <div><strong>原因代碼：</strong> {status.reasonCode}</div>}
              {status.tokenSavedAt && <div><strong>Token 時間：</strong> {new Date(status.tokenSavedAt).toLocaleString()}</div>}
            </div>
          </div>

          {status.health && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">環境變數狀態</h3>
              <div className="space-y-1 text-sm">
                <div><strong>APP_ID：</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    status.health.appId ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {status.health.appId ? '已設定' : '未設定'}
                  </span>
                </div>
                <div><strong>APP_SECRET：</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    status.health.appSecret ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {status.health.appSecret ? '已設定' : '未設定'}
                  </span>
                </div>
                <div><strong>REDIRECT_URL：</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    status.health.redirectUrl ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {status.health.redirectUrl ? '已設定' : '未設定'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">故障排除</h3>
        <div className="text-sm text-blue-700 space-y-2">
          {status?.status === 'not_configured' && (
            <div>
              <strong>問題：</strong> 環境變數未設定
              <br />
              <strong>解決方案：</strong> 在 Netlify 中設定 THREADS_APP_ID、THREADS_APP_SECRET、THREADS_REDIRECT_URL
            </div>
          )}
          
          {status?.status === 'link_failed' && (
            <div>
              <strong>問題：</strong> 連接失敗
              <br />
              <strong>可能原因：</strong> Token 過期、權限不足、網路問題
              <br />
              <strong>解決方案：</strong> 重新嘗試連接或聯繫管理員
            </div>
          )}
          
          {status?.status === 'ready' && (
            <div>
              <strong>狀態：</strong> 準備就緒，可以開始連接
              <br />
              <strong>下一步：</strong> 點擊「連結 Threads（OAuth）」按鈕
            </div>
          )}
          
          {status?.status === 'linked' && (
            <div>
              <strong>狀態：</strong> 已成功連接
              <br />
              <strong>功能：</strong> 現在可以使用 Threads 相關功能
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
