import type {
  DataSourceObjectResponse,
  PageObjectResponse,
} from "@notionhq/client"
import { describe, expect, it } from "vitest"

import {
  buildNavData,
  localizeNotionIcons,
  resolveProperties,
} from "@/lib/notion"

// ---- 依 Notion API（2025-09-03）回傳格式建立測試資料 ----

type Schema = DataSourceObjectResponse["properties"]

const richText = (content: string) => [
  {
    type: "text",
    text: { content, link: null },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default",
    },
    plain_text: content,
    href: null,
  },
]

/** 與使用者資料庫相同的欄位：Name / Desc / Type(多選) / icon link / link */
function createSchema(
  categoryType: "multi_select" | "select" = "multi_select",
  extra: Record<string, unknown> = {}
): Schema {
  const options = [
    { id: "o1", name: "CSS相關", color: "green", description: null },
    { id: "o2", name: "🛠️ 開發工具", color: "blue", description: null },
    { id: "o3", name: "沒有資料的分類", color: "red", description: null },
  ]
  return {
    Name: {
      id: "title",
      name: "Name",
      type: "title",
      title: {},
      description: null,
    },
    Desc: {
      id: "d",
      name: "Desc",
      type: "rich_text",
      rich_text: {},
      description: null,
    },
    Type: {
      id: "t",
      name: "Type",
      type: categoryType,
      [categoryType]: { options },
      description: null,
    },
    "icon link": {
      id: "i",
      name: "icon link",
      type: "url",
      url: {},
      description: null,
    },
    link: { id: "l", name: "link", type: "url", url: {}, description: null },
    ...extra,
  } as unknown as Schema
}

let seq = 0
function createPage(
  fields: {
    name: string
    desc?: string
    types?: string[]
    link?: string | null
    iconLink?: string | null
    icon?: PageObjectResponse["icon"]
    sort?: number | null
  },
  categoryType: "multi_select" | "select" = "multi_select"
): PageObjectResponse {
  seq += 1
  const types = fields.types ?? []
  const properties: Record<string, unknown> = {
    Name: { id: "title", type: "title", title: richText(fields.name) },
    Desc: {
      id: "d",
      type: "rich_text",
      rich_text: fields.desc ? richText(fields.desc) : [],
    },
    Type:
      categoryType === "multi_select"
        ? {
            id: "t",
            type: "multi_select",
            multi_select: types.map((name) => ({
              id: name,
              name,
              color: "default",
            })),
          }
        : {
            id: "t",
            type: "select",
            select: types[0]
              ? { id: types[0], name: types[0], color: "default" }
              : null,
          },
    "icon link": { id: "i", type: "url", url: fields.iconLink ?? null },
    link: { id: "l", type: "url", url: fields.link ?? null },
  }
  if (fields.sort !== undefined) {
    properties.Sort = { id: "s", type: "number", number: fields.sort }
  }
  return {
    object: "page",
    id: `page-${seq}`,
    created_time: new Date(Date.UTC(2026, 0, 1, 0, seq)).toISOString(),
    last_edited_time: new Date(Date.UTC(2026, 0, 2)).toISOString(),
    in_trash: false,
    icon: fields.icon ?? null,
    properties,
  } as unknown as PageObjectResponse
}

describe("resolveProperties", () => {
  it("對應到使用者資料庫的欄位", () => {
    const props = resolveProperties(createSchema())
    expect(props.title?.name).toBe("Name")
    expect(props.description?.name).toBe("Desc")
    expect(props.category?.name).toBe("Type")
    expect(props.icon?.name).toBe("icon link")
    expect(props.url?.name).toBe("link")
    expect(props.order).toBeUndefined()
  })

  it("欄位名稱不分大小寫", () => {
    const schema = createSchema() as Record<string, { name: string }>
    schema.link.name = "LINK"
    schema.Desc.name = "description"
    const props = resolveProperties(schema as unknown as Schema)
    expect(props.url?.name).toBe("LINK")
    expect(props.description?.name).toBe("description")
  })
})

describe("buildNavData", () => {
  const build = (pages: PageObjectResponse[], schema = createSchema()) =>
    buildNavData({ properties: schema }, pages)

  it("轉換截圖中的 Sass/SCSS 資料列", () => {
    const { data } = build([
      createPage({
        name: "Sass/SCSS",
        desc: "一個成熟，穩定，功能強大的CSS 預處理器",
        types: ["CSS相關"],
        link: "sass-lang.com/",
      }),
    ])

    expect(data.source).toBe("notion")
    expect(data.total).toBe(1)
    expect(data.categories).toHaveLength(1)
    expect(data.categories[0]).toMatchObject({
      id: "CSS相關",
      name: "CSS相關",
      emoji: null,
      color: "green",
    })
    expect(data.categories[0].links[0]).toMatchObject({
      title: "Sass/SCSS",
      description: "一個成熟，穩定，功能強大的CSS 預處理器",
      url: "https://sass-lang.com/",
      hostname: "sass-lang.com",
      icon: null,
      emoji: null,
    })
  })

  it("分類依 Notion 選項順序、空分類移除、未分類放最後、多選會出現在多個分類", () => {
    const { data } = build([
      createPage({ name: "無分類", link: "https://a.dev" }),
      createPage({ name: "Vite", types: ["🛠️ 開發工具"], link: "vite.dev" }),
      createPage({
        name: "Can I use",
        types: ["🛠️ 開發工具", "CSS相關"],
        link: "caniuse.com",
      }),
    ])

    expect(data.categories.map((c) => c.name)).toEqual([
      "CSS相關",
      "開發工具",
      "未分類",
    ])
    expect(data.categories[1].emoji).toBe("🛠️")
    expect(data.categories[1].links.map((l) => l.title)).toEqual([
      "Vite",
      "Can I use",
    ])
    expect(data.total).toBe(3)
  })

  it("沒有名字不顯示；沒有連結或連結無效仍顯示（url 為 null）；其他欄位空白沒關係", () => {
    const { data } = build([
      createPage({ name: "", types: ["CSS相關"], link: "https://a.dev" }),
      createPage({ name: "   ", types: ["CSS相關"], link: "https://b.dev" }),
      createPage({ name: "沒有連結", types: ["CSS相關"] }),
      createPage({
        name: "XSS",
        types: ["CSS相關"],
        link: "javascript:alert(1)",
      }),
      createPage({ name: "只有名字" }),
    ])

    expect(data.total).toBe(3)
    expect(data.categories.map((c) => c.name)).toEqual(["CSS相關", "未分類"])
    expect(data.categories[0].links).toMatchObject([
      { title: "沒有連結", url: null, hostname: "", description: "" },
      { title: "XSS", url: null, hostname: "" },
    ])
    expect(data.categories[1].links[0]).toMatchObject({
      title: "只有名字",
      url: null,
      description: "",
      icon: null,
      emoji: null,
    })
  })

  it("缺少欄位時不報錯：只有標題欄位也能產生資料", () => {
    const schema = createSchema() as Record<string, unknown>
    for (const key of ["Desc", "Type", "icon link", "link"]) delete schema[key]

    const { data } = build(
      [
        createPage({
          name: "Sass",
          desc: "x",
          types: ["CSS相關"],
          link: "a.dev",
        }),
      ],
      schema as unknown as Schema
    )
    expect(data.categories.map((c) => c.name)).toEqual(["未分類"])
    expect(data.categories[0].links[0]).toMatchObject({
      title: "Sass",
      description: "",
      url: null,
    })
  })

  it("icon 優先順序：icon link → 頁面圖片；emoji 只在沒有圖片時使用", () => {
    const { data } = build([
      createPage({
        name: "有 icon link",
        types: ["CSS相關"],
        link: "a.dev",
        iconLink: "https://cdn.a.dev/logo.svg",
        icon: { type: "emoji", emoji: "🎨" },
      }),
      createPage({
        name: "頁面外部圖示",
        types: ["CSS相關"],
        link: "b.dev",
        icon: { type: "external", external: { url: "https://b.dev/icon.png" } },
      }),
      createPage({
        name: "頁面 emoji",
        types: ["CSS相關"],
        link: "c.dev",
        icon: { type: "emoji", emoji: "🚀" },
      }),
    ])
    const [a, b, c] = data.categories[0].links
    expect(a).toMatchObject({ icon: "https://cdn.a.dev/logo.svg", emoji: null })
    expect(b).toMatchObject({ icon: "https://b.dev/icon.png", emoji: null })
    expect(c).toMatchObject({ icon: null, emoji: "🚀" })
  })

  it("標記 Notion 上傳（會過期）的圖示，外部網址不標記", () => {
    const uploaded = createPage({
      name: "上傳圖示",
      types: ["CSS相關"],
      link: "a.dev",
      icon: {
        type: "file",
        file: {
          url: "https://prod-files-secure.s3.us-west-2.amazonaws.com/x/icon.png?X-Amz-Signature=abc",
          expiry_time: "2026-11-02T18:00:00.000Z",
        },
      },
    })
    const external = createPage({
      name: "外部圖示",
      types: ["CSS相關"],
      link: "b.dev",
      icon: { type: "external", external: { url: "https://b.dev/icon.png" } },
    })

    const { hostedIconLinkIds } = build([uploaded, external])
    expect(hostedIconLinkIds).toEqual([uploaded.id])
  })

  it("依建立時間排序；有 Sort 欄位時優先依數字排序", () => {
    const sortProp = {
      Sort: {
        id: "s",
        name: "Sort",
        type: "number",
        number: { format: "number" },
        description: null,
      },
    }
    const pages = [
      createPage({ name: "A", types: ["CSS相關"], link: "a.dev", sort: 3 }),
      createPage({ name: "B", types: ["CSS相關"], link: "b.dev", sort: null }),
      createPage({ name: "C", types: ["CSS相關"], link: "c.dev", sort: 1 }),
    ]

    const byCreated = build(pages).data
    expect(byCreated.categories[0].links.map((l) => l.title)).toEqual([
      "A",
      "B",
      "C",
    ])

    const bySort = build(pages, createSchema("multi_select", sortProp)).data
    expect(bySort.categories[0].links.map((l) => l.title)).toEqual([
      "C",
      "A",
      "B",
    ])
  })

  it("支援單選（select）的分類欄位", () => {
    const { data } = build(
      [
        createPage(
          { name: "Vite", types: ["🛠️ 開發工具"], link: "vite.dev" },
          "select"
        ),
      ],
      createSchema("select")
    )
    expect(data.categories.map((c) => c.name)).toEqual(["開發工具"])
  })
})

describe("localizeNotionIcons", () => {
  it("只替換 Notion 上傳的圖示，多個分類共用同一筆時只下載一次", async () => {
    const hostedUrl =
      "https://prod-files-secure.s3.us-west-2.amazonaws.com/x/icon.png?X-Amz-Signature=abc"
    const uploaded = createPage({
      name: "上傳圖示",
      types: ["CSS相關", "🛠️ 開發工具"],
      link: "a.dev",
      icon: {
        type: "file",
        file: { url: hostedUrl, expiry_time: "2026-11-02T18:00:00.000Z" },
      },
    })
    const external = createPage({
      name: "外部圖示",
      types: ["CSS相關"],
      link: "b.dev",
      icon: { type: "external", external: { url: "https://b.dev/icon.png" } },
    })
    const { data, hostedIconLinkIds } = buildNavData(
      { properties: createSchema() },
      [uploaded, external]
    )

    const downloaded: string[] = []
    const result = await localizeNotionIcons(
      data,
      hostedIconLinkIds,
      async (url) => {
        downloaded.push(url)
        return "/_astro/icon.webp"
      }
    )

    expect(downloaded).toEqual([hostedUrl])
    const icons = result.categories.flatMap((c) =>
      c.links.map((l) => [l.title, l.icon])
    )
    expect(icons).toEqual([
      ["上傳圖示", "/_astro/icon.webp"],
      ["外部圖示", "https://b.dev/icon.png"],
      ["上傳圖示", "/_astro/icon.webp"],
    ])
  })

  it("下載失敗時拋出錯誤（讓 build 失敗）", async () => {
    const page = createPage({
      name: "上傳圖示",
      types: ["CSS相關"],
      link: "a.dev",
      icon: {
        type: "file",
        file: {
          url: "https://prod-files-secure.s3.us-west-2.amazonaws.com/x.png",
          expiry_time: "2026-11-02T18:00:00.000Z",
        },
      },
    })
    const { data, hostedIconLinkIds } = buildNavData(
      { properties: createSchema() },
      [page]
    )
    await expect(
      localizeNotionIcons(data, hostedIconLinkIds, async () => {
        throw new Error("download failed")
      })
    ).rejects.toThrow("download failed")
  })
})
