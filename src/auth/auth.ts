export type Session = {
  email: string
  roles: Array<'admin' | 'user'>
}

const LS_KEY = 'limiautopost:session'

// 簡易設定：在前端定義管理者清單。之後可改為由後端/資料庫提供
const ADMIN_EMAILS: string[] = [
  'admin@example.com',
]

export function signIn(email: string): Session {
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase().trim())
  const roles: Session['roles'] = isAdmin ? ['admin', 'user'] : ['user']
  const s: Session = { email, roles }
  localStorage.setItem(LS_KEY, JSON.stringify(s))
  return s
}

export function signOut() {
  localStorage.removeItem(LS_KEY)
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


