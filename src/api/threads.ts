export async function mockPublishToThreads(content: string): Promise<{ id: string; permalink: string }> {
  const res = await fetch('/.netlify/functions/threads-post', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content })
  })
  if (!res.ok) throw new Error('發布失敗')
  return res.json()
}

export async function mockFetchMetrics(id: string): Promise<{ id: string; likes: number; comments: number; shares: number }> {
  const res = await fetch('/.netlify/functions/threads-metrics?id=' + encodeURIComponent(id))
  if (!res.ok) throw new Error('讀取失敗')
  return res.json()
}

export async function fetchRealMetrics(id: string): Promise<{ id: string; likes: number; comments: number; shares: number }> {
  const res = await fetch('/.netlify/functions/threads-insights?id=' + encodeURIComponent(id))
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}




