import { useState } from 'react'
import { ensureUser, getUsers, findUserByEmail, isUserValid } from '../auth/users'
import { getSession, signIn } from '../auth/auth'

export default function LoginDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [message, setMessage] = useState('')

  const runDiagnostics = () => {
    try {
      // 檢查瀏覽器相容性
      const browserSupport = {
        localStorage: typeof localStorage !== 'undefined',
        crypto: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function',
        json: typeof JSON !== 'undefined',
        date: typeof Date !== 'undefined'
      }
      
      // 檢查 localStorage 狀態
      const usersRaw = localStorage.getItem('limiautopost:users')
      const sessionRaw = localStorage.getItem('limiautopost:session')
      
      // 檢查使用者資料
      const users = getUsers()
      const session = getSession()
      
      // 檢查預設帳號
      const vannyma = findUserByEmail('vannyma@gmail.com')
      const operatic = findUserByEmail('operatic')
      const operaticEmail = findUserByEmail('operatic@gmail.com')
      const guest = findUserByEmail('guest@gmail.com')
      
      // 檢查用戶有效性
      const userValidations = {
        vannyma: vannyma ? isUserValid(vannyma) : { valid: false, reason: '用戶不存在' },
        operatic: operatic ? isUserValid(operatic) : { valid: false, reason: '用戶不存在' },
        operaticEmail: operaticEmail ? isUserValid(operaticEmail) : { valid: false, reason: '用戶不存在' },
        guest: guest ? isUserValid(guest) : { valid: false, reason: '用戶不存在' }
      }
      
      // 檢查 localStorage 容量
      let localStorageSize = 0
      try {
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            localStorageSize += localStorage[key].length
          }
        }
      } catch (e) {
        localStorageSize = -1
      }
      
      const info = {
        browserSupport,
        localStorage: {
          users: usersRaw ? '存在' : '不存在',
          session: sessionRaw ? '存在' : '不存在',
          usersData: usersRaw,
          sessionData: sessionRaw,
          size: localStorageSize,
          quota: '無法檢測'
        },
        users: {
          total: users.length,
          list: users.map(u => ({ id: u.id, email: u.email, enabled: u.enabled }))
        },
        session: session,
        defaultAccounts: {
          vannyma: vannyma ? '存在' : '不存在',
          operatic: operatic ? '存在' : '不存在',
          operaticEmail: operaticEmail ? '存在' : '不存在',
          guest: guest ? '存在' : '不存在'
        },
        userValidations,
        environment: {
          dev: import.meta.env.DEV,
          hasSeedEmail: !!(import.meta as any).env?.VITE_SEED_ADMIN_EMAIL,
          hasSeedPassword: !!(import.meta as any).env?.VITE_SEED_ADMIN_PASSWORD
        },
        errors: [] as string[]
      }
      
      // 檢查可能的錯誤
      if (!browserSupport.localStorage) {
        info.errors.push('瀏覽器不支援 localStorage')
      }
      if (!browserSupport.crypto) {
        info.errors.push('瀏覽器不支援 crypto.randomUUID')
      }
      if (localStorageSize === -1) {
        info.errors.push('無法讀取 localStorage 大小')
      }
      if (localStorageSize > 5000000) { // 5MB
        info.errors.push('localStorage 可能已滿')
      }
      
      setDebugInfo(info)
      setMessage('診斷完成')
    } catch (error) {
      setMessage(`診斷失敗: ${error}`)
    }
  }

  const fixDefaultAccounts = () => {
    try {
      ensureUser('vannyma@gmail.com', 'admin123')
      ensureUser('operatic', 'operatic123')
      ensureUser('operatic@gmail.com', 'operatic123')
      ensureUser('guest@gmail.com', 'guest123')
      setMessage('已修復預設帳號')
      runDiagnostics()
    } catch (error) {
      setMessage(`修復失敗: ${error}`)
    }
  }

  const clearAllData = () => {
    try {
      localStorage.removeItem('limiautopost:users')
      localStorage.removeItem('limiautopost:session')
      setMessage('已清除所有資料')
      runDiagnostics()
    } catch (error) {
      setMessage(`清除失敗: ${error}`)
    }
  }

  const testLogin = (email: string, password: string) => {
    try {
      const user = findUserByEmail(email)
      if (!user) {
        setMessage(`使用者 ${email} 不存在`)
        return
      }
      if (user.password !== password) {
        setMessage(`密碼錯誤`)
        return
      }
      if (user.enabled === false) {
        setMessage(`帳號未啟用`)
        return
      }
      
      signIn(email)
      setMessage(`登入成功！現在可以導向到 /app`)
    } catch (error) {
      setMessage(`登入失敗: ${error}`)
    }
  }

  const checkConsoleErrors = () => {
    try {
      // 嘗試檢查 console 錯誤（這在生產環境可能不會有作用）
      const errors: string[] = []
      
      // 檢查是否有未定義的變數或函數
      if (typeof window !== 'undefined') {
        try {
          // 檢查一些關鍵的 API
          if (!window.localStorage) errors.push('window.localStorage 不存在')
          if (!window.JSON) errors.push('window.JSON 不存在')
          if (!window.crypto) errors.push('window.crypto 不存在')
        } catch (e) {
          errors.push(`檢查 window API 時出錯: ${e}`)
        }
      }
      
      setMessage(`Console 檢查完成，發現 ${errors.length} 個問題`)
      if (errors.length > 0) {
        setDebugInfo((prev: any) => ({
          ...prev,
          consoleErrors: errors
        }))
      }
    } catch (error) {
      setMessage(`Console 檢查失敗: ${error}`)
    }
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">登入診斷工具</h3>
      
      <div className="space-y-4">
        <button 
          onClick={runDiagnostics}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          執行診斷
        </button>
        
        <button 
          onClick={checkConsoleErrors}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 ml-2"
        >
          檢查 Console
        </button>
        
        <button 
          onClick={fixDefaultAccounts}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
        >
          修復預設帳號
        </button>
        
        <button 
          onClick={clearAllData}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-2"
        >
          清除所有資料
        </button>
      </div>

      {message && (
        <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded">
          {message}
        </div>
      )}

      {debugInfo && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">診斷結果：</h4>
          <pre className="bg-white p-4 rounded border text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6">
        <h4 className="font-semibold mb-2">測試登入：</h4>
        <div className="space-y-2">
          <button 
            onClick={() => testLogin('vannyma@gmail.com', 'admin123')}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            測試 vannyma@gmail.com / admin123
          </button>
          <button 
            onClick={() => testLogin('operatic', 'operatic123')}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm ml-2"
          >
            測試 operatic / operatic123
          </button>
          <button 
            onClick={() => testLogin('operatic@gmail.com', 'operatic123')}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-yellow-300 text-sm ml-2"
          >
            測試 operatic@gmail.com / operatic123
          </button>
          <button 
            onClick={() => testLogin('guest@gmail.com', 'guest123')}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-green-300 text-sm ml-2"
          >
            測試 guest@gmail.com / guest123
          </button>
        </div>
      </div>
    </div>
  )
}
