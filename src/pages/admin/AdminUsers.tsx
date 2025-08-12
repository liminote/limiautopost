import { useEffect, useMemo, useState } from 'react'
import { createUser, getUsers, updateUser, deleteUser, type AppUser } from '../../auth/users'

type UserRow = Pick<AppUser, 'id'|'email'|'createdAt'|'expiresAt'|'notes'|'enabled'>

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([])
  useEffect(()=>{ setRows(getUsers()) }, [])
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; row?: UserRow } | null>(null)

  const sorted = useMemo(() => [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [rows])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: 'var(--yinmn-blue)', fontFamily: 'Noto Serif TC, serif' }}>管理者後台 · 使用者</h1>
        <button
          className="btn btn-primary text-sm"
          onClick={() => setModal({ mode: 'create' })}
        >新增使用者</button>
      </div>

      <div className="overflow-x-auto card">
        <table className="table">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 border-b">Email</th>
              <th className="text-left px-3 py-2 border-b">建立日期</th>
              <th className="text-left px-3 py-2 border-b">使用期限</th>
              <th className="text-left px-3 py-2 border-b">備註</th>
              <th className="text-left px-3 py-2 border-b">啟用</th>
              <th className="text-left px-3 py-2 border-b">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2 border-t">{r.email}</td>
                <td className="px-3 py-2 border-t">{r.createdAt}</td>
                <td className="px-3 py-2 border-t">{r.expiresAt ?? '-'}</td>
                <td className="px-3 py-2 border-t">{r.notes?.trim() ? r.notes : '-'}</td>
                <td className="px-3 py-2 border-t">
                  <input type="checkbox" className="size-4" checked={r.enabled !== false}
                    onChange={e=>{
                      const u = updateUser(r.id, { enabled: e.target.checked })
                      if (u) setRows(prev => prev.map(x => x.id===u.id? u : x))
                    }}
                  />
                </td>
                <td className="px-3 py-2 border-t">
                  <button className="btn btn-outline mr-2" onClick={() => setModal({ mode: 'edit', row: r })}>編輯</button>
                  <button
                    className="btn btn-ghost text-red-600"
                    onClick={() => {
                      if (confirm('確定要刪除這位使用者嗎？此動作無法復原。')) {
                        const ok = deleteUser(r.id)
                        if (ok) setRows(prev => prev.filter(x => x.id !== r.id))
                      }
                    }}
                  >刪除</button>
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
              const u = createUser(payload as { email: string; password: string; expiresAt?: string; mustChangePassword?: boolean; notes?: string })
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

function UserModal({ mode, row, onClose, onSave }: { mode: 'create' | 'edit'; row?: UserRow; onClose: () => void; onSave: (p: { email: string; password?: string; expiresAt?: string; mustChangePassword?: boolean; notes?: string; enabled?: boolean }) => void }){
  const [email, setEmail] = useState(row?.email ?? '')
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState(row?.expiresAt ?? '')
  const [mustChange, setMustChange] = useState(true)
  const [notes, setNotes] = useState(row?.notes ?? '')
  const [enabled, setEnabled] = useState(row?.enabled ?? true)
  const title = mode === 'create' ? '新增使用者' : '編輯使用者'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md card">
        <div className="card-header">{title}</div>
        <div className="card-body space-y-3">
          <div>
            <label className="block text-sm text-gray-600">Email</label>
            <input className="mt-1 input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          {mode === 'create' && (
            <div>
              <label className="block text-sm text-gray-600">初始密碼</label>
              <input className="mt-1 input" type="text" value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 8 碼" />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600">使用期限</label>
            <input className="mt-1 input" type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600">備註</label>
            <textarea className="mt-1 textarea w-full" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="可輸入管理用備註" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />
            帳號啟用
          </label>
          {mode === 'create' && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={mustChange} onChange={e=>setMustChange(e.target.checked)} />
              首次登入需更改密碼
            </label>
          )}
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button
            className="btn btn-primary"
            onClick={()=> onSave({
              email,
              ...(mode === 'create' ? { password } : {}),
              expiresAt: expiresAt || undefined,
              ...(mode === 'create' ? { mustChangePassword: mustChange } : {}),
              notes: notes || '',
              enabled
            })}
            disabled={!email || (mode==='create' && !password)}
          >儲存</button>
        </div>
      </div>
    </div>
  )
}


