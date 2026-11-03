import { describe, expect, it } from "vitest"

import { createAnchorIdFactory, splitLeadingEmoji } from "@/lib/category"
import { filterCategories } from "@/lib/search"
import type { NavCategory } from "@/lib/nav-types"

describe("splitLeadingEmoji", () => {
  it("拆出開頭的 emoji", () => {
    expect(splitLeadingEmoji("🎨 CSS相關")).toEqual({
      emoji: "🎨",
      name: "CSS相關",
    })
    expect(splitLeadingEmoji("👨‍💻開發工具")).toEqual({
      emoji: "👨‍💻",
      name: "開發工具",
    })
    expect(splitLeadingEmoji("❤️ 收藏")).toEqual({ emoji: "❤️", name: "收藏" })
  })

  it("沒有 emoji 或只有 emoji 時保持原樣", () => {
    expect(splitLeadingEmoji("CSS相關")).toEqual({
      emoji: null,
      name: "CSS相關",
    })
    expect(splitLeadingEmoji("🔥")).toEqual({ emoji: null, name: "🔥" })
  })
})

describe("createAnchorIdFactory", () => {
  it("空白轉成 -，並避免重複", () => {
    const toId = createAnchorIdFactory()
    expect(toId("UI 元件庫")).toBe("UI-元件庫")
    expect(toId("UI 元件庫")).toBe("UI-元件庫-2")
    expect(toId("C# 工具")).toBe("C-工具")
  })
})

describe("filterCategories", () => {
  const categories: NavCategory[] = [
    {
      id: "css",
      name: "CSS相關",
      emoji: null,
      color: "green",
      links: [
        {
          id: "1",
          title: "Sass/SCSS",
          description: "CSS 預處理器",
          url: "https://sass-lang.com/",
          hostname: "sass-lang.com",
          icon: null,
          emoji: null,
        },
      ],
    },
    {
      id: "tools",
      name: "開發工具",
      emoji: null,
      color: "blue",
      links: [
        {
          id: "2",
          title: "Vite",
          description: "前端建置工具",
          url: "https://vite.dev/",
          hostname: "vite.dev",
          icon: null,
          emoji: null,
        },
      ],
    },
  ]

  it("空字串回傳原資料", () => {
    expect(filterCategories(categories, "  ")).toBe(categories)
  })

  it("比對名稱、描述、網域與分類（不分大小寫、多關鍵字 AND）", () => {
    expect(filterCategories(categories, "SASS").map((c) => c.id)).toEqual([
      "css",
    ])
    expect(filterCategories(categories, "vite.dev").map((c) => c.id)).toEqual([
      "tools",
    ])
    expect(filterCategories(categories, "開發工具").map((c) => c.id)).toEqual([
      "tools",
    ])
    expect(filterCategories(categories, "css 預處理")).toHaveLength(1)
    expect(filterCategories(categories, "css vite")).toHaveLength(0)
  })
})
