/** Notion 選項顏色（select / multi_select） */
export type NotionColor =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red"

export interface NavLink {
  /** Notion page id */
  id: string
  title: string
  description: string
  /** 正規化後的 http(s) 連結 */
  url: string
  hostname: string
  /** 圖片 icon（icon link 欄位或 Notion 頁面圖示），沒有時為 null */
  icon: string | null
  /** Notion 頁面 emoji 圖示 */
  emoji: string | null
}

export interface NavCategory {
  /** 錨點 id，用於側邊欄跳轉（#id） */
  id: string
  /** 顯示名稱（已移除開頭的 emoji） */
  name: string
  /** 選項名稱開頭的 emoji，例如「🎨 CSS相關」→ 🎨 */
  emoji: string | null
  color: NotionColor
  links: NavLink[]
}

export type NavDataSource = "notion" | "demo"

export interface NavData {
  categories: NavCategory[]
  /** 不重複的網站數量 */
  total: number
  source: NavDataSource
  /** 讀取資料的時間（ISO 字串） */
  updatedAt: string
  /** 讀取 Notion 失敗時的錯誤訊息 */
  error?: string
}
