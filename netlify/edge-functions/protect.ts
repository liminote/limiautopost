// Netlify Edge Function: simple password wall for staging/internal testing
// Enable by setting env var SITE_LOCK_PASSWORD in Netlify site settings.
// After entering the password once, a cookie will be set and the site can be accessed normally.

const COOKIE_NAME = 'site_lock';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function renderForm(message?: string): Response {
  const html = `<!doctype html>
  <html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>受保護的網站</title>
    <style>
      body{font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Noto Sans TC, Arial, sans-serif; background:#f7f7f7; display:flex; align-items:center; justify-content:center; min-height:100vh;}
      .card{background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:20px; width:min(360px, 92vw); box-shadow:0 10px 30px rgba(0,0,0,.05)}
      h1{font-size:18px; margin:0 0 12px}
      p{color:#6b7280; font-size:13px; margin:0 0 14px}
      .error{color:#b91c1c; font-size:13px; margin:0 0 10px}
      input{width:100%; height:40px; padding:0 12px; border:1px solid #d1d5db; border-radius:8px}
      button{margin-top:12px; width:100%; height:40px; border-radius:8px; border:1px solid #6e9aad; background:#6e9aad; color:#fff; cursor:pointer}
    </style>
  </head>
  <body>
    <form class="card" method="post">
      <h1>輸入站點密碼</h1>
      ${message ? `<div class="error">${message}</div>` : ''}
      <input type="password" name="password" placeholder="站點密碼" autofocus required />
      <button type="submit">進入</button>
    </form>
  </body>
  </html>`
  return new Response(html, { status: 401, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export default async function handler(request: Request, context: any) {
  // 兼容不同執行環境：優先從 context.env，其次從 Deno.env 讀取
  const required = (context as any)?.env?.SITE_LOCK_PASSWORD
    || (globalThis as any).Deno?.env?.get?.('SITE_LOCK_PASSWORD')
    || ''
  // If not configured, pass-through
  if (!required) return context.next()

  const expected = await sha256Hex(required)
  const got = (context as any).cookies?.get?.(COOKIE_NAME)
  const token = typeof got === 'string' ? got : (got?.value ?? undefined)

  if (token === expected) {
    return context.next()
  }

  if (request.method.toUpperCase() === 'POST') {
    try {
      const form = await request.formData()
      const password = String(form.get('password') || '')
      if (password === required) {
        ;(context as any).cookies?.set?.({
          name: COOKIE_NAME,
          value: expected,
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
        // redirect back to original URL
        return Response.redirect(new URL(request.url), 302)
      }
      return renderForm('密碼錯誤，請再試一次')
    } catch {
      return renderForm('請重新輸入密碼')
    }
  }

  return renderForm()
}

export const config = { path: '/*' }


