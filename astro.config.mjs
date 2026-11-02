// @ts-check

import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, envField } from "astro/config"

// 純靜態輸出（SSG）：build 時讀取 Notion 產生 HTML，部署到 Cloudflare Pages。
// https://astro.build/config
export default defineConfig({
  env: {
    schema: {
      // build 時讀取（Cloudflare Pages 的環境變數 / 本機 .env），不會打包進前端
      NOTION_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      NOTION_DATABASE_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  image: {
    // build 時下載 Notion 上傳的圖示（Notion 檔案網址約 1 小時後失效）
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.notion.so" },
      { protocol: "https", hostname: "**.notion-static.com" },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    // @notionhq/client 是 CommonJS，`Client` 無法被 Node ESM 偵測為具名匯出，
    // 交給 Vite 打包以取得正確的 ESM interop
    ssr: {
      // 開發模式（dev 時預先轉換）
      noExternal: ["@notionhq/client"],
      optimizeDeps: { include: ["@notionhq/client"] },
    },
    environments: {
      // SSG build 時用來預先產生頁面的環境
      prerender: { resolve: { noExternal: ["@notionhq/client"] } },
    },
  },
  integrations: [react()],
})
