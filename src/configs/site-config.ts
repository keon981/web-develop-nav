// Basic website settings, such as title, description, and links.
export const siteConfig = {
  name: "Web Develop Nav",
  description: "收集好用的前端開發工具與資源，資料由 Notion 資料庫即時同步。",
  locale: "zh-TW",
  timeZone: "Asia/Taipei",
  links: {
    github: "https://github.com/keon981/web-develop-nav",
  },
  faviconService: "https://www.google.com/s2/favicons?domain={hostname}&sz=64", // The favicon service is used when no icon is set.
} as const
