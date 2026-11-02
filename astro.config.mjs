// @ts-check

import node from "@astrojs/node"
import react from "@astrojs/react"
import vercel from "@astrojs/vercel"
import { cacheVercel } from "@astrojs/vercel/cache"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, envField, memoryCache } from "astro/config"

// Vercel 建置時會注入 VERCEL=1：使用 Vercel adapter + CDN 快取；
// 其他環境（本機 / Docker / VPS）則輸出 Node standalone server + 記憶體快取。
const isVercel = Boolean(process.env.VERCEL)

// https://astro.build/config
export default defineConfig({
  adapter: isVercel ? vercel() : node({ mode: "standalone" }),
  cache: {
    provider: isVercel
      ? cacheVercel()
      : // 頁面內容與 query string 無關，忽略它可避免 ?xxx 造成快取碎片化
        memoryCache({ query: { include: [] } }),
  },
  env: {
    // 全部以 secret 宣告：於執行階段讀取，不會被打包進前端程式碼
    schema: {
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
      NOTION_WEBHOOK_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      REVALIDATE_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CACHE_MAX_AGE: envField.number({
        context: "server",
        access: "secret",
        default: 300,
        int: true,
        min: 0,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // @notionhq/client 是 CommonJS，`Client` 無法被 Node ESM 偵測為具名匯出，
      // 交給 Vite 打包（dev 時預先轉換）以取得正確的 ESM interop
      noExternal: ["@notionhq/client"],
      optimizeDeps: { include: ["@notionhq/client"] },
    },
  },
  integrations: [react()],
})
