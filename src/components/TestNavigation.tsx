import React from 'react'

export default function TestNavigation() {
  const testNavigation = (to: string, label: string) => {
    console.log(`=== 測試導航: ${label} ===`)
    console.log('目標路徑:', to)
    console.log('當前路徑:', window.location.pathname)
    console.log('當前 URL:', window.location.href)
    
    try {
      // 方法1: 直接修改 location
      console.log('方法1: 直接修改 location.href')
      window.location.href = to
    } catch (error) {
      console.error('方法1 失敗:', error)
      
      try {
        // 方法2: 使用 location.assign
        console.log('方法2: 使用 location.assign')
        window.location.assign(to)
      } catch (error2) {
        console.error('方法2 失敗:', error2)
        
        try {
          // 方法3: 使用 location.replace
          console.log('方法3: 使用 location.replace')
          window.location.replace(to)
        } catch (error3) {
          console.error('方法3 失敗:', error3)
        }
      }
    }
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '100px', 
      right: '20px', 
      background: 'white', 
      border: '2px solid red', 
      padding: '20px', 
      borderRadius: '8px',
      zIndex: 9999
    }}>
      <h3 style={{ color: 'red', margin: '0 0 15px 0' }}>測試導航</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={() => testNavigation('/admin', 'Admin Mode')}
          style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          測試 Admin Mode
        </button>
        <button 
          onClick={() => testNavigation('/app', '貼文生成器')}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          測試貼文生成器
        </button>
        <button 
          onClick={() => testNavigation('/tracking', '追蹤列表')}
          style={{ padding: '8px 16px', background: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          測試追蹤列表
        </button>
        <button 
          onClick={() => testNavigation('/settings', '設定')}
          style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          測試設定
        </button>
      </div>
      <div style={{ marginTop: '15px', fontSize: '12px', color: 'gray' }}>
        點擊按鈕後查看 console 日誌
      </div>
    </div>
  )
}
