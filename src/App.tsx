import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import AdminUsers from './pages/admin/AdminUsers'
import TrackingPage from './pages/app/Tracking'
import Login from './pages/Login'
import LoginTest from './pages/LoginTest'
import Generator from './pages/app/Generator.tsx'
import AIGenerator from './pages/app/AIGenerator'
import { hasRole, signOut, useSession } from './auth/auth'
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
  // 版本列已隱藏，不再取得版本字串

  const handleNavClick = (to: string, label: string) => {
    console.log(`點擊導航: ${label} -> ${to}`)
    try {
      nav(to)
      console.log(`導航成功: ${label} -> ${to}`)
    } catch (error) {
      console.error(`導航失敗: ${label} -> ${to}`, error)
    }
  }

  return (
    <>
    {/* 隱藏版本列（保持空白以免占位影響布局） */}
    <header className="nav">
      <div className="container-app h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif', color: 'var(--yinmn-blue)' }}>隙音貼文生成器</span>
        </Link>
        <nav className="text-sm flex items-center gap-4">
          {hasRole('admin', session) && (
            <button
              onClick={() => handleNavClick('/admin', 'Admin Mode')}
              className={`admin-link ${active('/admin') ? 'active' : ''}`}
            >Admin Mode</button>
          )}
          {session ? (
          <>
          <button
            onClick={() => handleNavClick('/app', '貼文生成器')}
            className={active('/app') ? 'active' : ''}
          >貼文生成器</button>
          <button
            onClick={() => handleNavClick('/tracking', '追蹤列表')}
            className={active('/tracking') ? 'active' : ''}
          >追蹤列表</button>
          {/* 使用者選單 */}
          <button
            onClick={() => handleNavClick('/settings', '設定')}
            className={active('/settings') ? 'active' : ''}
          >設定</button>
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
              <Route path="/login-test" element={<LoginTest />} />
              {/* Admin */}
              <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/login" replace />} />
              <Route path="/admin/users" element={isAdmin ? <AdminUsers /> : <Navigate to="/login" replace />} />
              <Route path="/admin/settings" element={isAdmin ? <AdminSettings /> : <Navigate to="/login" replace />} />
              <Route path="/admin/ai-generator" element={isAdmin ? <AIGenerator /> : <Navigate to="/login" replace />} />
              {/* User Settings: 一律進入個人設定（包含 Threads 連結） */}
              <Route path="/settings" element={!session ? <Navigate to="/login" replace /> : <UserSettings />} />
              {/* User */}
              <Route path="/force-change-password" element={<ForceChangePassword />} />
              <Route path="/tracking" element={!session ? <Navigate to="/login" replace /> : <TrackingPage />} />
              <Route path="/app" element={!session ? <Navigate to="/login" replace /> : <Generator />} />
              <Route path="*" element={<Navigate to={session ? (isAdmin ? '/admin' : '/app') : '/'} replace />} />
            </Routes>
          </main>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
