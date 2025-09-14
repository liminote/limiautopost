import { Link } from 'react-router-dom'
import { useSession, hasRole } from '../auth/auth'

export default function Home(){
  const session = useSession()
  const isAdmin = hasRole('admin', session)
  return (
    <div className="mx-auto max-w-3xl">
      <div className="card card-body">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Noto Serif TC, serif', color: 'var(--yinmn-blue)' }}>貼文生成器</h1>
        <p className="text-gray-600 mb-4">將長文快速轉為 Threads/IG 風格貼文，並可集中管理追蹤成效。</p>
        <div className="flex flex-wrap gap-2">
          {session ? (
            <>
              <Link to="/app" className="btn btn-primary">進入生成器</Link>
              <Link to="/tracking" className="btn">查看追蹤列表</Link>
              {isAdmin && <Link to="/admin" className="btn">管理者後台</Link>}
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">登入開始使用</Link>
          )}
        </div>
      </div>
    </div>
  )
}



