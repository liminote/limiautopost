import { getAdminDashboardStats } from '../../auth/auth'
import DevProgress from '../../components/DevProgress'
import HealthStatus from '../../components/HealthStatus'

export default function AdminDashboard() {
  const { total, activeThisMonth, soonExpiring } = getAdminDashboardStats()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>管理者總覽</h1>
      </div>
      {/* Sub header tabs */}
      <div className="flex items-center gap-3 border-b pb-2">
        <a href="/admin/users" className="text-sm px-2 py-1 rounded hover:bg-gray-100">使用者</a>
        <a href="/admin/settings" className="text-sm px-2 py-1 rounded hover:bg-gray-100">管理者設定</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-body">
          <div className="text-base text-gray-600 font-semibold">使用者總數</div>
          <div className="text-2xl font-semibold">{total}</div>
        </div>
        <div className="card card-body">
          <div className="text-base text-gray-600 font-semibold">本月活躍</div>
          <div className="text-2xl font-semibold">{activeThisMonth}</div>
        </div>
        <div className="card card-body">
          <div className="text-base text-gray-600 font-semibold">即將到期</div>
          <div className="text-2xl font-semibold">{soonExpiring}</div>
        </div>
      </div>
      <HealthStatus />
      <DevProgress />
    </div>
  )
