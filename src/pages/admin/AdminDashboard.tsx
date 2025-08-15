import { getAdminDashboardStats } from '../../auth/auth'
import DevProgress from '../../components/DevProgress'
import HealthStatus from '../../components/HealthStatus'
import AdminSubnav from '../../components/AdminSubnav'

export default function AdminDashboard() {
  const { total, activeThisMonth, soonExpiring } = getAdminDashboardStats()
  return (
    <div className="space-y-4">
      {/* Sub header tabs appear only inside Admin Mode */}
      <AdminSubnav />
      {/* 以使用者列表樣式作為總覽內容 */}
      <div className="card card-body text-sm text-gray-600">
        總覽已切換為與「使用者」頁一致的操作風格。請使用上方子導覽進入「使用者」或「管理者設定」。
      </div>
    </div>
  )
}