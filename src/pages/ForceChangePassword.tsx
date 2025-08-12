import { useEffect, useState } from 'react'
import { changeCurrentUserPassword, useSession } from '../auth/auth'
import { useNavigate } from 'react-router-dom'

export default function ForceChangePassword() {
  const [pwd1, setPwd1] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const nav = useNavigate()
  const session = useSession()

  useEffect(() => {
    // 若未登入，導回登入頁避免無法變更
    if (!session) nav('/login', { replace: true })
  }, [session])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwd1 || pwd1.length < 8) { setErr('密碼至少 8 碼'); return }
    if (pwd1 !== pwd2) { setErr('兩次輸入不一致'); return }
    const u = changeCurrentUserPassword(pwd1)
    if (u) nav('/app', { replace: true })
    else setErr('變更失敗，請稍後再試')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">首次登入請更改密碼</h1>
        {session && <div className="text-sm text-gray-500">目前帳號：{session.email}</div>}
        <div>
          <label className="block text-sm text-gray-600">新密碼</label>
          <input className="mt-1 w-full rounded border px-3 py-2" type="password" value={pwd1} onChange={e=>setPwd1(e.target.value)} placeholder="至少 8 碼" />
        </div>
        <div>
          <label className="block text-sm text-gray-600">確認新密碼</label>
          <input className="mt-1 w-full rounded border px-3 py-2" type="password" value={pwd2} onChange={e=>setPwd2(e.target.value)} placeholder="再次輸入" />
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button type="submit" className="w-full rounded bg-black text-white py-2">儲存新密碼</button>
      </form>
    </div>
  )
}


