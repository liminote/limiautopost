// Mock Threads publish function
// POST /.netlify/functions/threads-post { content: string }
export async function handler(event: any) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  try {
    const body = JSON.parse(event.body || '{}') as { content?: string }
    const id = 'th_' + Math.random().toString(36).slice(2, 10)
    const permalink = `https://threads.net/post/${id}`
    // simulate latency
    await new Promise(r => setTimeout(r, 300))
    return { statusCode: 200, body: JSON.stringify({ id, permalink }) }
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request' }) }
  }
}




