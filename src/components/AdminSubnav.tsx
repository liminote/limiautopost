import { Link, useLocation } from 'react-router-dom'

export default function AdminSubnav(){
  const loc = useLocation()
  const active = (to: string) => loc.pathname === to
  const base = "text-sm px-2 py-1 rounded hover:bg-gray-100"
  const activeCls = "font-semibold underline"
  return (
    <div className="flex items-center gap-3 border-b pb-2">
      <Link to="/admin" className={`${base} ${active('/admin') ? activeCls : ''}`}>總覽</Link>
      <Link to="/admin/users" className={`${base} ${active('/admin/users') ? activeCls : ''}`}>使用者</Link>
      <Link to="/admin/settings" className={`${base} ${active('/admin/settings') ? activeCls : ''}`}>管理者設定</Link>
    </div>
  )
}


