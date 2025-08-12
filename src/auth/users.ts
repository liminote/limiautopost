export type AppUser = {
  id: string
  email: string
  password: string // NOTE: prototype only; replace with proper hashing in production
  createdAt: string
  expiresAt?: string
  mustChangePassword?: boolean
  notes?: string
  enabled?: boolean
  lastLoginAt?: string
}

const LS_KEY = 'limiautopost:users'

export function getUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as AppUser[]) : []
  } catch {
    return []
  }
}

function setUsers(users: AppUser[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(users))
}

export function createUser(payload: { email: string; password: string; expiresAt?: string; mustChangePassword?: boolean; notes?: string; enabled?: boolean }): AppUser {
  const now = new Date()
  const u: AppUser = {
    id: crypto.randomUUID(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    // 使用本地時區的日期 YYYY-MM-DD
    createdAt: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
    expiresAt: payload.expiresAt,
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
  const merged = { ...list[idx], ...changes }
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
  return createUser({ email, password, expiresAt, mustChangePassword: false, enabled: true })
}


