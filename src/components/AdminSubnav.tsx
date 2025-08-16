import { Link, useLocation } from 'react-router-dom'

export default function AdminSubnav(){
  const loc = useLocation()
  const isActive = (to: string) => {
    const p = loc.pathname
    if (to === '/admin') return p === '/admin' || p === '/admin/'
    return p === to
  }
  const base = "px-2 py-1 rounded hover:bg-gray-100 text-sm"
  const activeCls = "text-base font-semibold" // 大一級
  const activeStyle: React.CSSProperties = { color: 'var(--yinmn-blue)' } // 變藍色
  return (
    <div className="flex items-center gap-3 border-b pb-2">
      <Link to="/admin" className={`${base} ${isActive('/admin') ? activeCls : ''}`} style={isActive('/admin') ? activeStyle : undefined}>總覽</Link>
      <Link to="/admin/users" className={`${base} ${isActive('/admin/users') ? activeCls : ''}`} style={isActive('/admin/users') ? activeStyle : undefined}>使用者</Link>
      <Link to="/admin/ai-generator" className={`${base} ${isActive('/admin/ai-generator') ? activeCls : ''}`} style={isActive('/admin/ai-generator') ? activeStyle : undefined}>AI 生成器</Link>
      <Link to="/admin/settings" className={`${base} ${isActive('/admin/settings') ? activeCls : ''}`} style={isActive('/admin/settings') ? activeStyle : undefined}>管理者設定</Link>
    </div>
  )
}


