import { useMemo, useState } from 'react'

type UserRow = {
  id: string
  email: string
  createdAt: string
  expiresAt?: string
}

// 暫時使用本地 state 模擬，之後可接後端 API
const seed: UserRow[] = [
  { id: 'u_001', email: 'admin@example.com', createdAt: '2025-08-01', expiresAt: '2026-08-01' },
  { id: 'u_002', email: 'user@example.com', createdAt: '2025-08-02' },
]

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>(seed)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; row?: UserRow } | null>(null)

  const sorted = useMemo(() => [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [rows])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理者後台 · 使用者</h1>
        <button
          className="px-3 py-2 rounded bg-black text-white text-sm hover:opacity-90"
          onClick={() => setModal({ mode: 'create' })}
        >新增使用者</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0 shadow-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-900">
              <th className="text-left px-3 py-2 border-b">Email</th>
              <th className="text-left px-3 py-2 border-b">建立日期</th>
              <th className="text-left px-3 py-2 border-b">使用期限</th>
              <th className="text-left px-3 py-2 border-b">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border-t">{r.email}</td>
                <td className="px-3 py-2 border-t">{r.createdAt}</td>
                <td className="px-3 py-2 border-t">{r.expiresAt ?? '-'}</td>
                <td className="px-3 py-2 border-t">
                  <button className="px-2 py-1 rounded border mr-2" onClick={() => setModal({ mode: 'edit', row: r })}>編輯</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <UserModal
          mode={modal.mode}
          row={modal.row}
          onClose={() => setModal(null)}
          onSave={(payload) => {
            if (modal.mode === 'create') {
              setRows(prev => [{ id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString().slice(0,10) }, ...prev])
            } else if (modal.mode === 'edit' && modal.row) {
              setRows(prev => prev.map(r => r.id === modal.row!.id ? { ...r, ...payload } : r))
            }
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

function UserModal({ mode, row, onClose, onSave }: { mode: 'create' | 'edit'; row?: UserRow; onClose: () => void; onSave: (p: { email: string; expiresAt?: string }) => void }){
  const [email, setEmail] = useState(row?.email ?? '')
  const [expiresAt, setExpiresAt] = useState(row?.expiresAt ?? '')
  const title = mode === 'create' ? '新增使用者' : '編輯使用者'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="px-4 py-3 border-b font-semibold">{title}</div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-600">Email</label>
            <input className="mt-1 w-full rounded border px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">使用期限</label>
            <input className="mt-1 w-full rounded border px-3 py-2" type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} />
          </div>
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={onClose}>取消</button>
          <button
            className="px-3 py-2 rounded bg-black text-white"
            onClick={()=> onSave({ email, expiresAt: expiresAt || undefined })}
            disabled={!email}
          >儲存</button>
        </div>
      </div>
    </div>
  )
}


