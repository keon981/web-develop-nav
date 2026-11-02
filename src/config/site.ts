/**
 * 網站基本設定：標題、描述、連結等都集中在這裡修改。
 */
export const siteConfig = {
  name: "Web Develop Nav",
  description: "收集好用的前端開發工具與資源，資料由 Notion 資料庫即時同步。",
  /** 網站語系，影響 <html lang> 與日期格式 */
  locale: "zh-TW",
  /** 顯示「最後更新時間」用的時區（固定時區可避免 SSR / hydration 不一致） */
  timeZone: "Asia/Taipei",
  links: {
    github: "https://github.com/keon981/web-develop-nav",
  },
  /**
   * 當 Notion 沒有設定 icon 時，使用的 favicon 服務。
   * `{hostname}` 會被替換成網站網域，例如 sass-lang.com。
   */
  faviconService: "https://www.google.com/s2/favicons?domain={hostname}&sz=64",
} as const

/** Notion 相關的頁面快取都掛在這個 tag 上，revalidate 時一次清除 */
export const NOTION_CACHE_TAG = "notion"

/**
 * Notion 資料庫欄位對應（不分大小寫）。
 * 預設對應你目前資料庫的欄位：Name(標題) / Desc / Type / icon link / link，
 * 若之後改了欄位名稱，把新名稱加進對應陣列即可。
 */
export const notionPropertyAliases = {
  /** 文字欄位：網站描述 */
  description: ["desc", "description", "描述", "簡介", "說明"],
  /** 單選 / 多選欄位：分類（會依 Notion 選項的排列順序顯示） */
  category: ["type", "category", "categories", "tags", "分類", "類型"],
  /** URL 欄位：自訂 icon 圖片網址（可留空，會自動抓網站 favicon） */
  icon: ["icon link", "icon", "icon url", "logo", "圖示"],
  /** URL 欄位：網站連結 */
  url: ["link", "url", "網址", "連結"],
  /** （選用）數字欄位：同分類內的排序，數字小的在前 */
  order: ["sort", "order", "rank", "排序"],
} as const
