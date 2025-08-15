import { getAdminDashboardStats } from '../../auth/auth'
import DevProgress from '../../components/DevProgress'
import HealthStatus from '../../components/HealthStatus'
import AdminSubnav from '../../components/AdminSubnav'

export default function AdminDashboard() {
  const { total, activeThisMonth, soonExpiring } = getAdminDashboardStats()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>管理者總覽</h1>
      </div>
      {/* Sub header tabs appear only inside Admin Mode */}
      <AdminSubnav />
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
