import {
  APIErrorCode,
  Client,
  collectAllDataSourceRows,
  extractNotionId,
  isFullDatabase,
  isFullDataSource,
  isFullPage,
  isNotionClientError,
  type DataSourceObjectResponse,
  type PageObjectResponse,
} from "@notionhq/client"

import { notionPropertyAliases } from "@/config/site"
import { groupLinksByCategory, type CategoryInput } from "@/lib/category"
import type { NavData, NavLink } from "@/lib/nav-types"
import { getHostname, normalizeUrl } from "@/lib/url"

/** 固定 API 版本，避免 SDK 升級時預設版本改變而影響行為 */
const NOTION_VERSION = "2025-09-03"

type PropertySchema = DataSourceObjectResponse["properties"][string]
type PropertyType = PropertySchema["type"]
type PageProperty = PageObjectResponse["properties"][string]

export interface NotionPropertyMap {
  title?: PropertySchema
  description?: PropertySchema
  category?: PropertySchema
  icon?: PropertySchema
  url?: PropertySchema
  order?: PropertySchema
}

/** 圖示來源；hosted = 存在 Notion 的檔案，網址約 1 小時後失效 */
interface IconSource {
  url: string
  hosted: boolean
}

function findProperty(
  properties: Record<string, PropertySchema>,
  aliases: readonly string[],
  types: readonly PropertyType[]
): PropertySchema | undefined {
  const candidates = Object.values(properties).filter((p) =>
    types.includes(p.type)
  )
  // 依 alias 順序比對，排在前面的名稱優先
  for (const alias of aliases) {
    const match = candidates.find(
      (p) => p.name.trim().toLowerCase() === alias.toLowerCase()
    )
    if (match) return match
  }
  return undefined
}

/** 依名稱 + 型別找出資料庫中對應的欄位；找不到的欄位為 undefined，不會報錯 */
export function resolveProperties(
  properties: Record<string, PropertySchema>
): NotionPropertyMap {
  const a = notionPropertyAliases
  return {
    title: Object.values(properties).find((p) => p.type === "title"),
    description: findProperty(properties, a.description, ["rich_text"]),
    category: findProperty(properties, a.category, [
      "multi_select",
      "select",
      "status",
    ]),
    icon: findProperty(properties, a.icon, ["url", "files", "rich_text"]),
    url: findProperty(properties, a.url, ["url", "rich_text"]),
    order: findProperty(properties, a.order, ["number"]),
  }
}

/** 取得分類選項（保留 Notion 中拖曳排列的順序與顏色） */
export function getCategoryOptions(schema?: PropertySchema): CategoryInput[] {
  if (!schema) return []
  switch (schema.type) {
    case "select":
      return schema.select.options.map(({ name, color }) => ({ name, color }))
    case "multi_select":
      return schema.multi_select.options.map(({ name, color }) => ({
        name,
        color,
      }))
    case "status":
      return schema.status.options.map(({ name, color }) => ({ name, color }))
    default:
      return []
  }
}

function getProperty(page: PageObjectResponse, schema?: PropertySchema) {
  return schema ? page.properties[schema.name] : undefined
}

function readText(prop?: PageProperty): string {
  switch (prop?.type) {
    case "title":
      return prop.title.map((t) => t.plain_text).join("")
    case "rich_text":
      return prop.rich_text.map((t) => t.plain_text).join("")
    case "url":
      return prop.url ?? ""
    default:
      return ""
  }
}

/** icon link 欄位：URL / 文字填的是外部網址；檔案欄位上傳的檔案存在 Notion */
function readIconProperty(prop?: PageProperty): IconSource | null {
  if (prop?.type === "files") {
    const file = prop.files[0]
    if (!file) return null
    return file.type === "external"
      ? { url: file.external.url, hosted: false }
      : { url: file.file.url, hosted: true }
  }
  const url = readText(prop)
  return url ? { url, hosted: false } : null
}

function readCategories(prop?: PageProperty): string[] {
  switch (prop?.type) {
    case "select":
      return prop.select ? [prop.select.name] : []
    case "multi_select":
      return prop.multi_select.map((o) => o.name)
    case "status":
      return prop.status ? [prop.status.name] : []
    default:
      return []
  }
}

function readNumber(prop?: PageProperty): number | null {
  return prop?.type === "number" ? prop.number : null
}

/** 頁面圖示：emoji 直接顯示；圖片類回傳網址，上傳檔案與自訂 emoji 存在 Notion */
function readPageIcon(page: PageObjectResponse): {
  emoji: string | null
  image: IconSource | null
} {
  const icon = page.icon
  switch (icon?.type) {
    case "emoji":
      return { emoji: icon.emoji, image: null }
    case "external":
      return { emoji: null, image: { url: icon.external.url, hosted: false } }
    case "file":
      return { emoji: null, image: { url: icon.file.url, hosted: true } }
    case "custom_emoji":
      return {
        emoji: null,
        image: { url: icon.custom_emoji.url, hosted: true },
      }
    default:
      return { emoji: null, image: null }
  }
}

export interface NotionEntry {
  link: NavLink
  categories: string[]
  order: number | null
  /** icon 是 Notion 上傳的檔案，build 時需要下載 */
  iconHosted: boolean
}

/**
 * 把 Notion 頁面轉成導航連結。
 * 規則：沒有名字不顯示；其他欄位空白沒關係；沒有連結也顯示（卡片不可點）。
 */
export function pageToEntry(
  page: PageObjectResponse,
  props: NotionPropertyMap
): NotionEntry | null {
  const title = readText(getProperty(page, props.title)).trim()
  if (!title) return null

  const url = normalizeUrl(readText(getProperty(page, props.url)))
  const pageIcon = readPageIcon(page)
  const icon = [readIconProperty(getProperty(page, props.icon)), pageIcon.image]
    .map((source) =>
      source ? { ...source, url: normalizeUrl(source.url) } : null
    )
    .find((source): source is IconSource => Boolean(source?.url))

  return {
    link: {
      id: page.id,
      title,
      description: readText(getProperty(page, props.description)).trim(),
      url,
      hostname: url ? getHostname(url) : "",
      icon: icon?.url ?? null,
      emoji: icon ? null : pageIcon.emoji,
    },
    categories: [...new Set(readCategories(getProperty(page, props.category)))],
    order: readNumber(getProperty(page, props.order)),
    iconHosted: icon?.hosted ?? false,
  }
}

export interface NotionNavResult {
  data: NavData
  /** icon 存在 Notion（會過期）的連結 id */
  hostedIconLinkIds: string[]
}

/**
 * 純函式：Notion 資料來源 schema + 頁面 → 導航資料。
 * 排序規則：分類依選項順序；分類內先依 order 欄位（若有），再依建立時間。
 */
export function buildNavData(
  dataSource: Pick<DataSourceObjectResponse, "properties">,
  pages: PageObjectResponse[],
  now = new Date()
): NotionNavResult {
  const props = resolveProperties(dataSource.properties)

  const entries = pages
    .map((page) => ({ page, entry: pageToEntry(page, props) }))
    .filter(
      (item): item is { page: PageObjectResponse; entry: NotionEntry } =>
        item.entry !== null
    )
    .sort((a, b) => {
      const orderA = a.entry.order ?? Number.POSITIVE_INFINITY
      const orderB = b.entry.order ?? Number.POSITIVE_INFINITY
      if (orderA !== orderB) return orderA - orderB
      return a.page.created_time.localeCompare(b.page.created_time)
    })
    .map(({ entry }) => entry)

  return {
    data: {
      categories: groupLinksByCategory(
        getCategoryOptions(props.category),
        entries
      ),
      total: entries.length,
      source: "notion",
      updatedAt: now.toISOString(),
    },
    hostedIconLinkIds: entries
      .filter((entry) => entry.iconHosted && entry.link.icon)
      .map((entry) => entry.link.id),
  }
}

/**
 * 把 Notion 上傳的圖示換成 build 時下載的本地檔案（Notion 檔案網址約 1 小時後失效）。
 * `localize` 失敗會直接拋錯，讓 build 失敗並保留上一版網站。
 */
export async function localizeNotionIcons(
  data: NavData,
  hostedIconLinkIds: Iterable<string>,
  localize: (url: string) => Promise<string>,
  concurrency = 4
): Promise<NavData> {
  const hosted = new Set(hostedIconLinkIds)
  const links = new Map<string, NavLink>()
  for (const category of data.categories) {
    for (const link of category.links) {
      if (hosted.has(link.id) && link.icon) links.set(link.id, link)
    }
  }

  const localized = new Map<string, string>()
  const queue = [...links.values()]
  const worker = async () => {
    for (let link = queue.shift(); link; link = queue.shift()) {
      localized.set(link.id, await localize(link.icon!))
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))

  return {
    ...data,
    categories: data.categories.map((category) => ({
      ...category,
      links: category.links.map((link) =>
        localized.has(link.id)
          ? { ...link, icon: localized.get(link.id)! }
          : link
      ),
    })),
  }
}

/**
 * 支援填入「資料庫」或「資料來源（data source）」的 ID / 網址。
 * Notion API 2025-09-03 起，資料庫底下可以有多個 data source，預設取第一個。
 */
async function resolveDataSource(
  notion: Client,
  id: string
): Promise<DataSourceObjectResponse> {
  try {
    const database = await notion.databases.retrieve({ database_id: id })
    const first = isFullDatabase(database)
      ? database.data_sources[0]
      : undefined
    if (!first)
      throw new Error("這個 Notion 資料庫沒有任何資料來源（data source）")
    id = first.id
  } catch (error) {
    // 不是資料庫 ID → 可能直接給了 data source ID，改用 data source 讀取
    if (
      !isNotionClientError(error) ||
      (error.code !== APIErrorCode.ObjectNotFound &&
        error.code !== APIErrorCode.ValidationError)
    ) {
      throw error
    }
  }

  const dataSource = await notion.dataSources.retrieve({ data_source_id: id })
  if (!isFullDataSource(dataSource)) {
    throw new Error("無法讀取 Notion 資料來源的欄位設定")
  }
  return dataSource
}

export interface NotionConfig {
  token: string
  /** 資料庫（或 data source）ID，也可以直接貼 Notion 網址 */
  databaseId: string
}

export async function fetchNotionNavData({
  token,
  databaseId,
}: NotionConfig): Promise<NotionNavResult> {
  const id = extractNotionId(databaseId)
  if (!id)
    throw new Error("NOTION_DATABASE_ID 格式不正確，請填入資料庫 ID 或網址")

  const notion = new Client({
    auth: token,
    notionVersion: NOTION_VERSION,
    timeoutMs: 20_000,
  })

  const dataSource = await resolveDataSource(notion, id)
  const rows = await collectAllDataSourceRows(notion, {
    data_source_id: dataSource.id,
    page_size: 100,
    result_type: "page",
  })

  return buildNavData(dataSource, rows.filter(isFullPage))
}

/** 把 Notion API 錯誤轉成看得懂的訊息 */
export function describeNotionError(error: unknown): string {
  if (isNotionClientError(error)) {
    switch (error.code) {
      case APIErrorCode.Unauthorized:
        return "NOTION_TOKEN 無效，請確認 integration token 是否正確。"
      case APIErrorCode.ObjectNotFound:
      case APIErrorCode.RestrictedResource:
        return "找不到資料庫：請確認 NOTION_DATABASE_ID 正確，並在 Notion 資料庫右上角「⋯ → Connections」把它分享給你的 integration。"
      case APIErrorCode.RateLimited:
        return "Notion API 請求過於頻繁，請稍後再試。"
      default:
        return `Notion API 錯誤（${error.code}）：${error.message}`
    }
  }
  return error instanceof Error ? error.message : String(error)
}
