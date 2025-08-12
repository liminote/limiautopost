import { useSyncExternalStore } from 'react'

export type Session = {
  email: string
  roles: Array<'admin' | 'user'>
}

const LS_KEY = 'limiautopost:session'

// 簡易設定：在前端定義管理者清單。之後可改為由後端/資料庫提供
const ADMIN_EMAILS: string[] = [
  'vannyma@gmail.com',
]
// 開發期：確保管理者帳號存在（預設密碼可稍後修改）
import { ensureUser, findUserByEmail, updateUser, getUsers, type AppUser } from './users'
// 僅在開發環境建立本機測試帳號；正式環境不會執行
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  try { ensureUser('vannyma@gmail.com', 'admin123') } catch {}
  try { ensureUser('operatic', 'operatic123') } catch {}
  try { ensureUser('operatic@gmail.com', 'operatic123') } catch {}
}

export function signIn(email: string): Session {
  // 登入前檢查啟用與到期
  try {
    const u = findUserByEmail(email)
    if (u) {
      if (u.enabled === false) {
        throw new Error('帳號未啟用')
      }
      if (u.expiresAt) {
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth()+1).padStart(2,'0')
        const dd = String(today.getDate()).padStart(2,'0')
        const ymd = `${yyyy}-${mm}-${dd}`
        if (ymd > u.expiresAt) {
          throw new Error('帳號已到期')
        }
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      // 讓呼叫端決定如何呈現
      throw err
    }
  }
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase().trim())
  const roles: Session['roles'] = isAdmin ? ['admin', 'user'] : ['user']
  const s: Session = { email, roles }
  localStorage.setItem(LS_KEY, JSON.stringify(s))
  try { const u = findUserByEmail(email); if (u) updateUser(u.id, { lastLoginAt: new Date().toISOString() }) } catch {}
  // 通知全域 session 已變更，讓使用到 useSession 的組件重新渲染
  try { window.dispatchEvent(new Event('limiautopost:session')) } catch {}
  return s
}

export function getAdminDashboardStats() {
  const list = getUsers()
  const total = list.length
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const monthPrefix = `${yyyy}-${mm}`
  const activeThisMonth = list.filter(u => (u.lastLoginAt || '').startsWith(monthPrefix)).length
  const soonExpiring = list.filter(u => {
    if (u.enabled === false) return false
    if (!u.expiresAt) return false
    try {
      const d = new Date(u.expiresAt + 'T00:00:00')
      const diff = d.getTime() - now.getTime()
      const days = diff / (24*60*60*1000)
      return days >= 0 && days <= 14
    } catch { return false }
  }).length
  return { total, activeThisMonth, soonExpiring }
}

export function getCurrentUser(): AppUser | null {
  try {
    const s = getSession()
    if (!s) return null
    const u = findUserByEmail(s.email)
    return u ?? null
  } catch { return null }
}

export function mustChangePassword(): boolean {
  const u = getCurrentUser()
  return !!(u && u.mustChangePassword)
}

export function changeCurrentUserPassword(newPassword: string): AppUser | null {
  const u = getCurrentUser()
  if (!u) return null
  return updateUser(u.id, { password: newPassword, mustChangePassword: false })
}

export function signOut() {
  localStorage.removeItem(LS_KEY)
  // 廣播變更事件
  try { window.dispatchEvent(new Event('limiautopost:session')) } catch {}
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function hasRole(required: 'admin' | 'user', session: Session | null = getSession()): boolean {
  if (!session) return false
  return session.roles.includes(required)
}

// 讓 React 元件可以訂閱 session 變化
function subscribeSession(callback: () => void) {
  const handler = () => callback()
  window.addEventListener('storage', handler)
  window.addEventListener('limiautopost:session', handler)
  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener('limiautopost:session', handler)
  }
}

// 供外部儲存庫訂閱時取得「穩定不變動的快照」
function getSessionRaw(): string {
  try { return localStorage.getItem(LS_KEY) ?? '' } catch { return '' }
}

export function useSession(): Session | null {
  // 返回字串原文作為快照，避免 JSON.parse 造成每次回傳不同參考導致無限重渲染
  const raw = useSyncExternalStore(subscribeSession, getSessionRaw, () => '')
  try { return raw ? (JSON.parse(raw) as Session) : null } catch { return null }
}


