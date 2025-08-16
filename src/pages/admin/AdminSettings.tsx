import AdminSubnav from '../../components/AdminSubnav'

// 管理者設定頁：依用戶要求，暫時清空整頁內容
export default function AdminSettings(){
  return (
    <div className="space-y-4">
      {/* Admin sub header */}
      <AdminSubnav />
      
      <div className="text-sm text-gray-600">（預留區）未來會放站點層設定項目。</div>
    </div>
  )
}


