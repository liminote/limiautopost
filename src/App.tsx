import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import AdminUsers from './pages/admin/AdminUsers'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/admin" className="font-semibold">隙音自動貼文生成器 · 管理者</Link>
            <nav className="text-sm text-gray-600 space-x-4">
              <Link to="/admin" className="hover:text-black">使用者</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/admin" element={<AdminUsers />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
