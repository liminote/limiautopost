import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import AdminUsers from './pages/admin/AdminUsers'
import Login from './pages/Login'
import Generator from './pages/app/Generator'
import { getSession, hasRole, signOut } from './auth/auth'

function TopNav() {
  const loc = useLocation()
  const nav = useNavigate()
  const active = (to: string) => loc.pathname.startsWith(to)
  const session = getSession()

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={hasRole('admin', session) ? '/admin' : '/app'} className="font-semibold">
          隙音自動貼文生成器 · 管理者
        </Link>
        <nav className="text-sm text-gray-600 flex items-center gap-4">
          {hasRole('admin', session) && (
            <Link
              to="/admin"
              className={active('/admin') ? 'text-black font-semibold border-b-2 border-black pb-0.5' : 'hover:text-black'}
            >使用者</Link>
          )}
          <Link
            to="/app"
            className={active('/app') ? 'text-black font-semibold border-b-2 border-black pb-0.5' : 'hover:text-black'}
          >回到生成器</Link>
          {session && (
            <button
              className="ml-2 px-3 py-1.5 rounded border hover:bg-gray-50"
              onClick={() => { signOut(); nav('/login', { replace: true }) }}
            >登出</button>
          )}
        </nav>
      </div>
    </header>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={hasRole('admin', getSession()) ? <AdminUsers /> : <Navigate to="/login" replace />} />
            <Route path="/app" element={<Generator />} />
            <Route path="*" element={<Navigate to={getSession() ? (hasRole('admin') ? '/admin' : '/app') : '/login'} replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
