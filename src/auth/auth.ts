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
import { ensureUser, findUserByEmail, updateUser, getUsers, isUserValid, fixUserTimeRanges, type AppUser } from './users'

// 改進的用戶初始化函數
function initializeTestUsers() {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    try { 
      ensureUser('vannyma@gmail.com', 'admin123') 
      console.log('✅ 測試管理員帳號已創建: vannyma@gmail.com')
    } catch (error) {
      console.warn('創建管理員帳號失敗:', error)
    }
    
    try { 
      ensureUser('operatic', 'operatic123') 
      console.log('✅ 測試用戶帳號已創建: operatic')
    } catch (error) {
      console.warn('創建測試用戶帳號失敗:', error)
    }
    
    try { 
      ensureUser('operatic@gmail.com', 'operatic123') 
      console.log('✅ 測試用戶帳號已創建: operatic@gmail.com')
    } catch (error) {
      console.warn('創建測試用戶帳號失敗:', error)
    }
    
    try { 
      ensureUser('guest@gmail.com', 'guest123') 
      console.log('✅ 測試用戶帳號已創建: guest@gmail.com')
    } catch (error) {
      console.warn('創建測試用戶帳號失敗:', error)
    }
  }
}

// 在頁面加載時初始化用戶（延遲執行避免循環依賴）
if (typeof window !== 'undefined') {
  setTimeout(() => {
    try {
      // 先修復現有用戶的時間範圍問題
      fixUserTimeRanges()
      // 然後初始化測試用戶
      initializeTestUsers()
    } catch (error) {
      console.error('用戶初始化失敗:', error)
    }
  }, 50)
}

// 部署環境：若提供 Vite 環境變數，建立正式管理者帳號（注意：純前端原型，僅供內部測試）
// 使用方式：在 Netlify 設定環境變數 VITE_SEED_ADMIN_EMAIL / VITE_SEED_ADMIN_PASSWORD 後重新部署
if (typeof window !== 'undefined') {
  setTimeout(() => {
    try {
      const seedEmail = (import.meta as any).env?.VITE_SEED_ADMIN_EMAIL as string | undefined
      const seedPassword = (import.meta as any).env?.VITE_SEED_ADMIN_PASSWORD as string | undefined
      if (seedEmail && seedPassword) {
        ensureUser(seedEmail, seedPassword)
        const e = seedEmail.toLowerCase().trim()
        if (!ADMIN_EMAILS.includes(e)) ADMIN_EMAILS.push(e)
        console.log('✅ 正式管理員帳號已創建:', seedEmail)
      }
    } catch (error) {
      console.warn('創建正式管理員帳號失敗:', error)
    }
  }, 75)
}

// 緊急修復：確保管理者帳號存在
function emergencyFixAdminAccount() {
  if (typeof window !== 'undefined') {
    try {
      // 強制創建管理者帳號
      ensureUser('vannyma@gmail.com', 'admin123')
      console.log('🚨 緊急修復：管理者帳號已確保存在')
      
      // 檢查並修復 session
      const currentSession = getSession()
      if (currentSession && currentSession.email === 'vannyma@gmail.com') {
        // 如果當前登入的是管理者，確保角色正確
        if (!currentSession.roles.includes('admin')) {
          const fixedSession: Session = { 
            email: 'vannyma@gmail.com', 
            roles: ['admin', 'user'] 
          }
          localStorage.setItem(LS_KEY, JSON.stringify(fixedSession))
          console.log('🚨 緊急修復：管理者 session 角色已修正')
          // 觸發重新渲染
          window.dispatchEvent(new Event('limiautopost:session'))
        }
      }
    } catch (error) {
      console.error('🚨 緊急修復失敗:', error)
    }
  }
}

// 在頁面加載時執行緊急修復（延遲執行避免循環依賴）
if (typeof window !== 'undefined') {
  // 使用 setTimeout 確保所有模組都已載入
  setTimeout(() => {
    try {
      emergencyFixAdminAccount()
    } catch (error) {
      console.error('緊急修復執行失敗:', error)
    }
  }, 100)
}

export function signIn(email: string): Session {
  // 登入前檢查用戶有效性
  try {
    const u = findUserByEmail(email)
    if (u) {
      const validation = isUserValid(u)
      if (!validation.valid) {
        throw new Error(validation.reason || '帳號無效')
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

/**
 * 讓使用者自行修改密碼（需輸入原密碼以驗證）。
 * 失敗時會丟出 Error，呼叫端負責顯示訊息。
 */
export function changeCurrentUserPasswordWithVerify(currentPassword: string, newPassword: string): AppUser | null {
  const u = getCurrentUser()
  if (!u) throw new Error('尚未登入')
  if (!currentPassword) throw new Error('請輸入目前密碼')
  if (u.password !== currentPassword) throw new Error('目前密碼不正確')
  if (!newPassword || newPassword.length < 8) throw new Error('新密碼至少 8 碼')
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
  if (!session) {
    console.log('🔍 hasRole 檢查失敗：沒有 session')
    return false
  }
  
  console.log('🔍 hasRole 檢查:', { required, session, roles: session.roles })
  
  // 檢查是否為已知的管理者 email
  const isKnownAdmin = ADMIN_EMAILS.includes(session.email.toLowerCase().trim())
  if (isKnownAdmin && !session.roles.includes('admin')) {
    console.warn('🚨 發現已知管理者但角色不正確，自動修復...')
    // 自動修復管理者角色
    const fixedSession: Session = { 
      email: session.email, 
      roles: ['admin', 'user'] 
    }
    localStorage.setItem(LS_KEY, JSON.stringify(fixedSession))
    // 觸發重新渲染
    window.dispatchEvent(new Event('limiautopost:session'))
    return true
  }
  
  const hasRole = session.roles.includes(required)
  console.log('🔍 hasRole 結果:', { required, hasRole, sessionEmail: session.email, isKnownAdmin })
  return hasRole
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


