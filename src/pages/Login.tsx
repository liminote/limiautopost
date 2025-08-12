import { useEffect, useState } from 'react'
import BrandLogo from '../components/BrandLogo'
import { signIn, getSession } from '../auth/auth'
import { findUserByEmail, ensureUser } from '../auth/users'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()
  useEffect(() => {
    const s = getSession()
    if (s) nav('/app', { replace: true })
  }, [])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('請輸入 Email'); return }
    const u = findUserByEmail(email)
    if (!u || u.password !== password) { setError('帳號或密碼錯誤'); return }
    try {
      signIn(email)
      nav('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗')
      return
    }
    
  }

  const resetLocal = () => {
    try {
      localStorage.removeItem('limiautopost:users')
      localStorage.removeItem('limiautopost:session')
      ensureUser('vannyma@gmail.com', 'admin123')
      ensureUser('operatic', 'operatic123')
      ensureUser('operatic@gmail.com', 'operatic123')
      setError('已重置本機帳號，請使用 operatic/operatic123 或 vannyma@gmail.com/admin123 登入')
    } catch {
      setError('重置失敗，請重新整理後再試')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-center mb-2">
          <BrandLogo />
        </div>
        <h1 className="text-lg font-semibold text-center" style={{ fontFamily: 'Noto Serif TC, serif' }}>隙音自動貼文生成器</h1>
        <div>
          <label className="block text-sm text-gray-600">Email</label>
          <input className="mt-1 w-full rounded border px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm text-gray-600">密碼</label>
          <input className="mt-1 w-full rounded border px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" className="w-full rounded bg-[color:var(--yinmn-blue)] text-white py-2">登入</button>
        {import.meta.env.DEV && (
          <button type="button" onClick={resetLocal} className="w-full mt-2 text-xs text-gray-500 hover:text-gray-800">重置本機帳號（本機測試用）</button>
        )}
      </form>
    </div>
  )
}


