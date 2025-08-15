import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import AdminUsers from './pages/admin/AdminUsers'
import TrackingPage from './pages/app/Tracking'
import Login from './pages/Login'
import Generator from './pages/app/Generator.tsx'
import { hasRole, signOut, mustChangePassword, useSession } from './auth/auth'
import ForceChangePassword from './pages/ForceChangePassword'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSettings from './pages/admin/AdminSettings'
import UserSettings from './pages/UserSettings'
import Home from './pages/Home'
import ErrorBoundary from './components/ErrorBoundary'

function TopNav() {
  const loc = useLocation()
  const nav = useNavigate()
  const active = (to: string) => loc.pathname.startsWith(to)
  const session = useSession()
  const username = session?.email?.split('@')[0] || ''
  const ver = (import.meta as any).env?.VITE_APP_VERSION as string | undefined

  return (
    <>
    {ver && (
      <div className="container-app" style={{ paddingTop: '6px' }}>
        <div className="text-xs text-muted" style={{ lineHeight: 1, textAlign: 'right' }}>v{ver}</div>
      </div>
    )}
    <header className="nav">
      <div className="container-app h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif', color: 'var(--yinmn-blue)' }}>隙音貼文生成器</span>
        </Link>
        <nav className="text-sm flex items-center gap-4">
          {hasRole('admin', session) && (
            <>
              <span className="nav-label">管理</span>
              <Link to="/admin" className={`admin-link ${active('/admin') && !active('/admin/settings') && !active('/admin/users') ? 'active' : ''}`}>總覽</Link>
              <Link to="/admin/users" className={`admin-link ${active('/admin/users') ? 'active' : ''}`}>使用者</Link>
              <Link to="/admin/settings" className={`admin-link ${active('/admin/settings') ? 'active' : ''}`}>管理者設定</Link>
              <span className="nav-divider" />
              <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Admin Mode</span>
            </>
          )}
          {session ? (
          <>
          <Link
            to="/app"
            className={active('/app') ? 'active' : ''}
          >貼文生成器</Link>
          <Link
            to="/tracking"
            className={active('/tracking') ? 'active' : ''}
          >追蹤列表</Link>
          {/* 使用者選單：管理者也可見（方便單帳號切換行為） */}
          <Link to="/app" className={active('/app') ? 'active' : ''}>貼文生成器</Link>
          <Link to="/tracking" className={active('/tracking') ? 'active' : ''}>追蹤列表</Link>
          <Link to="/settings" className={active('/settings') ? 'active' : ''}>設定</Link>
          {username && <span className="text-sm text-muted">hi {username}</span>}
          {session && (
            <button
              className="ml-2 btn btn-ghost"
              onClick={() => { signOut(); nav('/login', { replace: true }) }}
            >登出</button>
          )}
          </>
          ) : (
            <Link to="/login">登入</Link>
          )}
        </nav>
      </div>
    </header>
    </>
  )
}

function App() {
  const session = useSession()
  const isAdmin = hasRole('admin', session)
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="min-h-screen">
          <TopNav />
          <main className="container-app py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={session ? <Navigate to="/app" replace /> : <Login />} />
              {/* Admin */}
              <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/login" replace />} />
              <Route path="/admin/users" element={isAdmin ? <AdminUsers /> : <Navigate to="/login" replace />} />
              <Route path="/admin/settings" element={isAdmin ? <AdminSettings /> : <Navigate to="/login" replace />} />
              {/* User Settings: 個人 Threads 連結與偏好設定（若為管理者則導回管理設定） */}
              <Route path="/settings" element={!session ? <Navigate to="/login" replace /> : (isAdmin ? <Navigate to="/admin/settings" replace /> : <UserSettings />)} />
              {/* User */}
              <Route path="/force-change-password" element={<ForceChangePassword />} />
              <Route path="/tracking" element={!session ? <Navigate to="/login" replace /> : (mustChangePassword() ? <Navigate to="/force-change-password" replace /> : <TrackingPage />)} />
              <Route path="/app" element={!session ? <Navigate to="/login" replace /> : (mustChangePassword() ? <Navigate to="/force-change-password" replace /> : <Generator />)} />
              <Route path="*" element={<Navigate to={session ? (isAdmin ? '/admin' : '/app') : '/'} replace />} />
            </Routes>
          </main>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
