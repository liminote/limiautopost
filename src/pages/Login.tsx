import { useState } from 'react'
import { signIn } from '../auth/auth'
import { findUserByEmail } from '../auth/users'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('請輸入 Email'); return }
    const u = findUserByEmail(email)
    if (!u || u.password !== password) { setError('帳號或密碼錯誤'); return }
    const s = signIn(email)
    if (s.roles.includes('admin')) nav('/admin')
    else nav('/app')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">隙音自動貼文生成器</h1>
        <div>
          <label className="block text-sm text-gray-600">Email</label>
          <input className="mt-1 w-full rounded border px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm text-gray-600">密碼</label>
          <input className="mt-1 w-full rounded border px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" className="w-full rounded bg-black text-white py-2">登入</button>
      </form>
    </div>
  )
}


