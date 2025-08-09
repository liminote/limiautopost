export type AppUser = {
  id: string
  email: string
  password: string // NOTE: prototype only; replace with proper hashing in production
  createdAt: string
  expiresAt?: string
  mustChangePassword?: boolean
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

export function createUser(payload: { email: string; password: string; expiresAt?: string; mustChangePassword?: boolean }): AppUser {
  const u: AppUser = {
    id: crypto.randomUUID(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    createdAt: new Date().toISOString().slice(0,10),
    expiresAt: payload.expiresAt,
    mustChangePassword: payload.mustChangePassword ?? true,
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

export function findUserByEmail(email: string): AppUser | undefined {
  const e = email.trim().toLowerCase()
  return getUsers().find(u => u.email === e)
}

export function ensureUser(email: string, password: string, expiresAt?: string) {
  const existing = findUserByEmail(email)
  if (existing) return existing
  return createUser({ email, password, expiresAt, mustChangePassword: false })
}


