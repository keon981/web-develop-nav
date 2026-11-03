import { groupLinksByCategory, type CategoryInput } from "@/lib/category"
import type { NavData, NavLink } from "@/lib/nav-types"
import { getHostname } from "@/lib/url"

/** 尚未設定 Notion 時顯示的範例資料（欄位與 Notion 資料庫相同） */
const categories: CategoryInput[] = [
  { name: "CSS相關", color: "green" },
  { name: "前端框架", color: "blue" },
  { name: "UI 元件庫", color: "purple" },
  { name: "開發工具", color: "orange" },
  { name: "設計資源", color: "pink" },
  { name: "學習資源", color: "yellow" },
]

// prettier-ignore
const rows: [title: string, desc: string, type: string[], link: string][] = [
  ["Sass/SCSS", "一個成熟，穩定，功能強大的CSS 預處理器", ["CSS相關"], "https://sass-lang.com/"],
  ["Tailwind CSS", "Utility-first 的 CSS 框架，直接在 HTML 中快速打造任何設計", ["CSS相關"], "https://tailwindcss.com/"],
  ["PostCSS", "用 JavaScript 外掛轉換 CSS 的工具", ["CSS相關"], "https://postcss.org/"],
  ["Can I use", "查詢瀏覽器對前端技術的支援程度", ["CSS相關", "開發工具"], "https://caniuse.com/"],
  ["React", "用於建構使用者介面的 JavaScript 函式庫", ["前端框架"], "https://react.dev/"],
  ["Vue.js", "漸進式 JavaScript 框架，易學易用、效能出色", ["前端框架"], "https://vuejs.org/"],
  ["Astro", "專為內容導向網站打造的 Web 框架，預設零 JavaScript", ["前端框架"], "https://astro.build/"],
  ["Svelte", "在編譯階段完成工作的 UI 框架", ["前端框架"], "https://svelte.dev/"],
  ["shadcn/ui", "設計精美、可直接複製到專案中客製化的元件集合", ["UI 元件庫"], "https://ui.shadcn.com/"],
  ["Base UI", "無樣式、重視無障礙的 React 元件庫", ["UI 元件庫"], "https://base-ui.com/"],
  ["daisyUI", "Tailwind CSS 的元件類別庫", ["UI 元件庫"], "https://daisyui.com/"],
  ["Vite", "下一代前端建置工具，極速的開發伺服器", ["開發工具"], "https://vite.dev/"],
  ["pnpm", "快速、節省磁碟空間的套件管理工具", ["開發工具"], "https://pnpm.io/"],
  ["TypeScript Playground", "線上撰寫與分享 TypeScript 程式碼", ["開發工具"], "https://www.typescriptlang.org/play"],
  ["Lucide", "美觀且一致的開源 icon 圖示庫", ["設計資源"], "https://lucide.dev/"],
  ["Coolors", "快速產生配色方案", ["設計資源"], "https://coolors.co/"],
  ["Google Fonts", "免費、開源的網頁字型", ["設計資源"], "https://fonts.google.com/"],
  ["MDN Web Docs", "最完整的 Web 技術文件", ["學習資源"], "https://developer.mozilla.org/"],
  ["web.dev", "Google 出品的現代 Web 開發指南", ["學習資源"], "https://web.dev/"],
  ["JavaScript.info", "從基礎到進階的現代 JavaScript 教學", ["學習資源"], "https://javascript.info/"],
]

export function getDemoNavData(): NavData {
  const entries = rows.map(([title, description, types, url], index) => {
    const link: NavLink = {
      id: `demo-${index}`,
      title,
      description,
      url,
      hostname: getHostname(url),
      icon: null,
      emoji: null,
    }
    return { link, categories: types }
  })

  return {
    categories: groupLinksByCategory(categories, entries),
    total: entries.length,
    source: "demo",
    updatedAt: new Date().toISOString(),
  }
}
