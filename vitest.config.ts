/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config"

export default getViteConfig({
  test: {
    include: ["src/**/*.test.ts"],
    server: {
      // 與 astro.config.mjs 相同：讓 CommonJS 的 @notionhq/client 經過 Vite 轉換
      deps: { inline: ["@notionhq/client"] },
    },
  },
})
