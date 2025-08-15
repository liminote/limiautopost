// 管理者設定頁：依用戶要求，暫時清空整頁內容
export default function AdminSettings(){
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b pb-2">
        <a href="/admin" className="px-2 py-1 rounded hover:bg-gray-100 text-sm">總覽</a>
        <a href="/admin/users" className="px-2 py-1 rounded hover:bg-gray-100 text-sm">使用者</a>
        <a href="/admin/settings" className="px-2 py-1 rounded hover:bg-gray-100 text-base font-semibold" style={{ color: 'var(--yinmn-blue)' }}>管理者設定</a>
      </div>
      <div className="text-sm text-gray-600">（預留區）未來會放站點層設定項目。</div>
    </div>
  )
}


