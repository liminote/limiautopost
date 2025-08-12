import { getAdminDashboardStats } from '../../auth/auth'

export default function AdminDashboard() {
  const { total, activeThisMonth, soonExpiring } = getAdminDashboardStats()
  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>管理者總覽</h1>
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
      <div className="card card-body text-sm text-gray-600">
        這裡將放置管理者儀表資訊（之後串接後端/報表時補上）。
      </div>
    </div>
  )
}


