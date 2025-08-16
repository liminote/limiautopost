import type { SystemCard } from '../types/cards'

// 系統預設的基本卡片
export const defaultSystemCards: SystemCard[] = [
  {
    id: 'system-threads-basic',
    name: 'Threads 基本三則貼文',
    description: '生成 Threads 三則獨立貼文，每則聚焦不同觀點，無上下文延續關係',
    category: 'threads',
    prompt: `請嚴格遵守以下規則：

Threads 三則貼文規則：
1. 每則 Threads 貼文需聚焦於不同的觀點或角度，**不能有上下文延續關係**。
2. 每則貼文都需包含：
   - 一個清晰的主題（例如一個體悟、一種情境、一次對話）
   - 獨立完整的觀點與論述，結尾可加一句收束句
   - 一個與內容相關的 hashtag，例如 #職場日常 #成長筆記（限一個）
3. 長度限制如下（請**嚴格控制字數**）：
   - Threads 1：480～500 字
   - Threads 2：330～350 字
   - Threads 3：180～200 字

主題：{topic}
風格：{style}

格式請用以下 JSON 輸出：
{
  "threads": [
    {"content": "Threads 第一則內容"},
    {"content": "Threads 第二則內容"},
    {"content": "Threads 第三則內容"}
  ],
  "instagram": {"content": "IG 貼文內容"}
}`,
    isSystem: true,
    isActive: true,
    userId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'system-instagram-basic',
    name: 'Instagram 基本貼文',
    description: '生成 Instagram 貼文，語氣溫暖但具洞察力，結尾搭配開放式問題',
    category: 'instagram',
    prompt: `請生成 Instagram 貼文，遵循以下規則：

Instagram 貼文規則：
- 可以略長，語氣溫暖但具洞察力
- 可結尾搭配開放式問題（例如「你也有這樣的經驗嗎？」）
- 內容要有啟發性和互動性
- 適合視覺化呈現

主題：{topic}
風格：{style}

格式請用以下 JSON 輸出：
{
  "instagram": {"content": "IG 貼文內容"}
}`,
    isSystem: true,
    isActive: true,
    userId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'system-facebook-basic',
    name: 'Facebook 基本貼文',
    description: '生成 Facebook 貼文，適合社群互動和分享',
    category: 'facebook',
    prompt: `請生成 Facebook 貼文，遵循以下規則：

Facebook 貼文規則：
- 內容要有社群性和分享價值
- 語氣親切，適合朋友間分享
- 可以包含個人經驗和觀點
- 鼓勵互動和討論

主題：{topic}
風格：{style}

格式請用以下 JSON 輸出：
{
  "facebook": {"content": "FB 貼文內容"}
}`,
    isSystem: true,
    isActive: true,
    userId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]
