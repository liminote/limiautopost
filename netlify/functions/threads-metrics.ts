// Mock Threads metrics function
// GET /.netlify/functions/threads-metrics?id=th_xxx
export async function handler(event: any) {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }
  const id = (event.queryStringParameters?.id || 'th_mock') as string
  // simple deterministic numbers based on id
  const seed = Array.from(id).reduce((s, c) => s + c.charCodeAt(0), 0)
  const likes = (seed % 50) + 10
  const comments = (seed % 10) + 1
  const shares = (seed % 7)
  const saves = (seed % 9)
  await new Promise(r => setTimeout(r, 200))
  return { statusCode: 200, body: JSON.stringify({ id, likes, comments, shares, saves }) }
}


