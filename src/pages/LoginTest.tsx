import { useState } from 'react'
import { ensureUser, getUsers, findUserByEmail } from '../auth/users'
import { getSession, signIn } from '../auth/auth'
import { useNavigate } from 'react-router-dom'

export default function LoginTest() {
  const [message, setMessage] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const nav = useNavigate()

  const steps = [
    {
      title: '檢查瀏覽器支援',
      action: () => {
        try {
          const support = {
            localStorage: typeof localStorage !== 'undefined',
            crypto: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function',
            json: typeof JSON !== 'undefined',
            date: typeof Date !== 'undefined'
          }
          
          const hasAllSupport = Object.values(support).every(Boolean)
          if (hasAllSupport) {
            setMessage('✅ 瀏覽器支援檢查通過')
            return true
          } else {
            setMessage(`❌ 瀏覽器支援檢查失敗: ${JSON.stringify(support)}`)
            return false
          }
        } catch (error) {
          setMessage(`❌ 瀏覽器支援檢查出錯: ${error}`)
          return false
        }
      }
    },
    {
      title: '檢查 localStorage 狀態',
      action: () => {
        try {
          const usersRaw = localStorage.getItem('limiautopost:users')
          const sessionRaw = localStorage.getItem('limiautopost:session')
          
          if (usersRaw && sessionRaw) {
            setMessage('✅ localStorage 資料完整')
            return true
          } else if (!usersRaw && !sessionRaw) {
            setMessage('⚠️ localStorage 完全空白，需要初始化')
            return true
          } else {
            setMessage(`⚠️ localStorage 資料不完整: users=${!!usersRaw}, session=${!!sessionRaw}`)
            return true
          }
        } catch (error) {
          setMessage(`❌ localStorage 檢查出錯: ${error}`)
          return false
        }
      }
    },
    {
      title: '初始化預設帳號',
      action: () => {
        try {
          ensureUser('vannyma@gmail.com', 'admin123')
          ensureUser('operatic', 'operatic123')
          ensureUser('operatic@gmail.com', 'operatic123')
          
          const users = getUsers()
          if (users.length >= 3) {
            setMessage('✅ 預設帳號建立成功')
            return true
          } else {
            setMessage(`❌ 預設帳號建立失敗，只有 ${users.length} 個帳號`)
            return false
          }
        } catch (error) {
          setMessage(`❌ 預設帳號建立出錯: ${error}`)
          return false
        }
      }
    },
    {
      title: '測試登入功能',
      action: () => {
        try {
          const testEmail = 'operatic@gmail.com'
          const testPassword = 'operatic123'
          
          const user = findUserByEmail(testEmail)
          if (!user) {
            setMessage('❌ 測試帳號不存在')
            return false
          }
          
          if (user.password !== testPassword) {
            setMessage('❌ 測試帳號密碼不正確')
            return false
          }
          
          signIn(testEmail)
          const session = getSession()
          if (session && session.email === testEmail) {
            setMessage('✅ 登入功能測試成功')
            return true
          } else {
            setMessage('❌ 登入功能測試失敗')
            return false
          }
        } catch (error) {
          setMessage(`❌ 登入功能測試出錯: ${error}`)
          return false
        }
      }
    },
    {
      title: '導向到應用程式',
      action: () => {
        try {
          setMessage('✅ 所有測試通過，正在導向到應用程式...')
          setTimeout(() => {
            nav('/app', { replace: true })
          }, 1000)
          return true
        } catch (error) {
          setMessage(`❌ 導向失敗: ${error}`)
          return false
        }
      }
    }
  ]

  const runStep = async () => {
    if (currentStep >= steps.length) return
    
    const step = steps[currentStep]
    setMessage(`正在執行: ${step.title}...`)
    
    const success = await step.action()
    if (success) {
      setTimeout(() => {
        setCurrentStep(prev => prev + 1)
        setMessage('')
      }, 1000)
    }
  }

  const runAllSteps = async () => {
    setCurrentStep(0)
    setMessage('開始執行所有步驟...')
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i)
      const step = steps[i]
      setMessage(`正在執行: ${step.title}...`)
      
      const success = await step.action()
      if (!success) {
        setMessage(`❌ 步驟 ${i + 1} 失敗，請檢查問題`)
        return
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    setMessage('✅ 所有步驟完成！')
  }

  const resetEverything = () => {
    try {
      localStorage.removeItem('limiautopost:users')
      localStorage.removeItem('limiautopost:session')
      setCurrentStep(0)
      setMessage('已重置所有資料，請重新開始')
    } catch (error) {
      setMessage(`重置失敗: ${error}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-center mb-6" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          登入問題診斷工具
        </h1>
        
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button 
              onClick={runStep}
              disabled={currentStep >= steps.length}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              執行當前步驟
            </button>
            
            <button 
              onClick={runAllSteps}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              執行所有步驟
            </button>
            
            <button 
              onClick={resetEverything}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              重置所有資料
            </button>
          </div>
          
          {message && (
            <div className="p-3 bg-blue-100 text-blue-800 rounded">
              {message}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`p-3 rounded border ${
                index < currentStep ? 'bg-green-100 border-green-300' :
                index === currentStep ? 'bg-blue-100 border-blue-300' :
                'bg-gray-100 border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
                  ${index < currentStep ? 'bg-green-500 text-white' :
                    index === currentStep ? 'bg-blue-500 text-white' :
                    'bg-gray-300 text-gray-600'}"
                >
                  {index < currentStep ? '✓' : index === currentStep ? '→' : index + 1}
                </span>
                <span className="font-medium">{step.title}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => nav('/login')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            回到登入頁面
          </button>
        </div>
      </div>
    </div>
  )
}
