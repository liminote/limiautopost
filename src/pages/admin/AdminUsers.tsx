import { useEffect, useMemo, useState } from 'react'
import { createUser, getUsers, updateUser, type AppUser } from '../../auth/users'

type UserRow = Pick<AppUser, 'id'|'email'|'createdAt'|'expiresAt'>

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([])
  useEffect(()=>{ setRows(getUsers()) }, [])
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
              const u = createUser(payload)
              setRows(prev => [u, ...prev])
            } else if (modal.mode === 'edit' && modal.row) {
              const u = updateUser(modal.row.id, payload as any)
              if (u) setRows(prev => prev.map(r => r.id === u.id ? u : r))
            }
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

function UserModal({ mode, row, onClose, onSave }: { mode: 'create' | 'edit'; row?: UserRow; onClose: () => void; onSave: (p: { email: string; password: string; expiresAt?: string; mustChangePassword?: boolean }) => void }){
  const [email, setEmail] = useState(row?.email ?? '')
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState(row?.expiresAt ?? '')
  const [mustChange, setMustChange] = useState(true)
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
          {mode === 'create' && (
            <div>
              <label className="block text-sm text-gray-600">初始密碼</label>
              <input className="mt-1 w-full rounded border px-3 py-2" type="text" value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 8 碼" />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600">使用期限</label>
            <input className="mt-1 w-full rounded border px-3 py-2" type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} />
          </div>
          {mode === 'create' && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={mustChange} onChange={e=>setMustChange(e.target.checked)} />
              首次登入需更改密碼
            </label>
          )}
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={onClose}>取消</button>
          <button
            className="px-3 py-2 rounded bg-black text-white"
            onClick={()=> onSave({ email, password, expiresAt: expiresAt || undefined, mustChangePassword: mustChange })}
            disabled={!email || (mode==='create' && !password)}
          >儲存</button>
        </div>
      </div>
    </div>
  )
}


