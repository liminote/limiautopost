export default function AdminSettings() {
  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>系統設定（占位）</h1>
      <div className="card card-body text-sm text-gray-600 space-y-2">
        <div>未來可在此管理：平台前綴、字數建議、模型 API key、使用者通知、報表匯出等。</div>
        <div className="flex gap-2">
          <a className="btn btn-primary" href="/api/threads/oauth/start">連結 Threads（OAuth）</a>
          <a className="btn" href="/admin">返回</a>
        </div>
      </div>
    </div>
  )
}


