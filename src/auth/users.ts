import { getSession } from './auth'

export type AppUser = {
  id: string
  email: string
  password: string // NOTE: prototype only; replace with proper hashing in production
  createdAt: string
  // 新版：有效起訖
  validFrom?: string // YYYY-MM-DD
  validTo?: string   // YYYY-MM-DD
  // 舊版：僅結束日（保留以便讀舊資料）
  expiresAt?: string
  mustChangePassword?: boolean
  notes?: string
  enabled?: boolean
  lastLoginAt?: string
  // 變更紀錄
  logs?: Array<{
    at: string // ISO
    actor: string // email 或 system
    changes: Partial<Pick<AppUser, 'validFrom' | 'validTo' | 'notes' | 'enabled' | 'password' | 'mustChangePassword'>>
  }>
}

const LS_KEY = 'limiautopost:users'

export function getUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const list: AppUser[] = raw ? (JSON.parse(raw) as AppUser[]) : []
    // 一次性遷移：將舊的 expiresAt 搬到 validTo
    let migrated = false
    for (const u of list) {
      if (!u.validFrom) u.validFrom = u.createdAt
      if (!u.validTo && u.expiresAt) { u.validTo = u.expiresAt; migrated = true }
    }
    if (migrated) setUsers(list)
    return list
  } catch {
    return []
  }
}

function setUsers(users: AppUser[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(users))
}

export function createUser(payload: { email: string; password: string; validFrom?: string; validTo?: string; expiresAt?: string; mustChangePassword?: boolean; notes?: string; enabled?: boolean }): AppUser {
  const now = new Date()
  const u: AppUser = {
    id: crypto.randomUUID(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    // 使用本地時區的日期 YYYY-MM-DD
    createdAt: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
    validFrom: payload.validFrom,
    validTo: payload.validTo ?? payload.expiresAt,
    mustChangePassword: payload.mustChangePassword ?? true,
    notes: payload.notes?.trim() || ''
    ,enabled: payload.enabled ?? true
  }
  const list = getUsers()
  list.unshift(u)
  setUsers(list)
  return u
}

export function updateUser(id: string, changes: Partial<AppUser>): AppUser | null {
  const list = getUsers()
  const idx = list.findIndex(u => u.id === id)
  if (idx === -1) return null
  const prev = list[idx]
  const merged: AppUser = { ...prev, ...changes }
  // 寫入變更紀錄（只記錄關鍵欄位）
  const keys: Array<keyof AppUser> = ['validFrom','validTo','notes','enabled','password','mustChangePassword']
  const diff: any = {}
  for (const k of keys) {
    if ((prev as any)[k] !== (merged as any)[k]) diff[k] = (merged as any)[k]
  }
  if (Object.keys(diff).length) {
    const actor = getSession()?.email || 'system'
    const log = { at: new Date().toISOString(), actor, changes: diff }
    merged.logs = [...(prev.logs || []), log]
  }
  list[idx] = merged
  setUsers(list)
  return merged
}

export function deleteUser(id: string): boolean {
  const list = getUsers()
  const newList = list.filter(u => u.id !== id)
  if (newList.length === list.length) return false
  setUsers(newList)
  return true
}

export function findUserByEmail(email: string): AppUser | undefined {
  const e = email.trim().toLowerCase()
  return getUsers().find(u => u.email === e)
}

export function ensureUser(email: string, password: string, expiresAt?: string) {
  const existing = findUserByEmail(email)
  if (existing) return existing
  
  // 設定合理的預設時間範圍（從今天開始，到明年年底）
  const today = new Date()
  const nextYear = new Date(today.getFullYear() + 1, 11, 31) // 明年12月31日
  
  const validFrom = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const validTo = `${nextYear.getFullYear()}-${String(nextYear.getMonth()+1).padStart(2,'0')}-${String(nextYear.getDate()).padStart(2,'0')}`
  
  return createUser({ 
    email, 
    password, 
    validFrom,
    validTo: expiresAt || validTo,
    mustChangePassword: false, 
    enabled: true 
  })
}

export function isUserValid(user: AppUser): { valid: boolean; reason?: string } {
  // 檢查是否啟用
  if (user.enabled === false) {
    return { valid: false, reason: '帳號已被停用' }
  }
  
  // 檢查時間範圍
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth()+1).padStart(2,'0')
  const dd = String(today.getDate()).padStart(2,'0')
  const todayStr = `${yyyy}-${mm}-${dd}`
  
  // 檢查 validFrom（開始日期）
  if (user.validFrom && todayStr < user.validFrom) {
    return { valid: false, reason: `帳號尚未生效，生效日期：${user.validFrom}` }
  }
  
  // 檢查 validTo（結束日期）
  if (user.validTo && todayStr > user.validTo) {
    return { valid: false, reason: `帳號已到期，到期日期：${user.validTo}` }
  }
  
  // 檢查舊版 expiresAt（向後相容）
  if (user.expiresAt && todayStr > user.expiresAt) {
    return { valid: false, reason: `帳號已到期，到期日期：${user.expiresAt}` }
  }
  
  return { valid: true }
}

// 修復現有用戶的時間範圍問題
export function fixUserTimeRanges(): void {
  try {
    const users = getUsers()
    const today = new Date()
    const nextYear = new Date(today.getFullYear() + 1, 11, 31)
    
    const validFrom = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const validTo = `${nextYear.getFullYear()}-${String(nextYear.getMonth()+1).padStart(2,'0')}-${String(nextYear.getDate()).padStart(2,'0')}`
    
    let updated = false
    for (const user of users) {
      // 如果 validTo 是過去的日期，或者沒有設定，就修復它
      if (!user.validTo || (user.validTo && user.validTo < validFrom)) {
        updateUser(user.id, { validFrom, validTo })
        console.log(`[fixUserTimeRanges] 修復用戶 ${user.email} 的時間範圍: ${validFrom} ~ ${validTo}`)
        updated = true
      }
    }
    
    if (updated) {
      console.log('[fixUserTimeRanges] 用戶時間範圍修復完成')
    }
  } catch (error) {
    console.error('[fixUserTimeRanges] 修復失敗:', error)
  }
}


