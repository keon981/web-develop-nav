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

/** 依名稱 + 型別找出資料庫中對應的欄位 */
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

function readFileUrl(prop?: PageProperty): string {
  if (prop?.type !== "files") return readText(prop)
  const file = prop.files[0]
  if (!file) return ""
  return file.type === "external" ? file.external.url : file.file.url
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

/** 頁面圖示：emoji 直接顯示；圖片類（外部連結 / 上傳檔案 / 自訂 emoji）回傳網址 */
function readPageIcon(page: PageObjectResponse): {
  emoji: string | null
  image: string | null
} {
  const icon = page.icon
  switch (icon?.type) {
    case "emoji":
      return { emoji: icon.emoji, image: null }
    case "external":
      return { emoji: null, image: icon.external.url }
    case "file":
      // 注意：Notion 上傳檔案的網址約 1 小時後過期，前端有 favicon 備援
      return { emoji: null, image: icon.file.url }
    case "custom_emoji":
      return { emoji: null, image: icon.custom_emoji.url }
    default:
      return { emoji: null, image: null }
  }
}

/** 把 Notion 頁面轉成導航連結；沒有標題或連結的資料列會被略過 */
export function pageToEntry(
  page: PageObjectResponse,
  props: NotionPropertyMap
): { link: NavLink; categories: string[]; order: number | null } | null {
  const title = readText(getProperty(page, props.title)).trim()
  const url = normalizeUrl(readText(getProperty(page, props.url)))
  if (!title || !url) return null

  const pageIcon = readPageIcon(page)
  const icon =
    normalizeUrl(readFileUrl(getProperty(page, props.icon))) ??
    normalizeUrl(pageIcon.image)

  return {
    link: {
      id: page.id,
      title,
      description: readText(getProperty(page, props.description)).trim(),
      url,
      hostname: getHostname(url),
      icon,
      emoji: icon ? null : pageIcon.emoji,
    },
    categories: [...new Set(readCategories(getProperty(page, props.category)))],
    order: readNumber(getProperty(page, props.order)),
  }
}

/**
 * 純函式：Notion 資料來源 schema + 頁面 → 導航資料。
 * 排序規則：分類依選項順序；分類內先依 order 欄位（若有），再依建立時間。
 */
export function buildNavData(
  dataSource: Pick<DataSourceObjectResponse, "properties">,
  pages: PageObjectResponse[],
  now = new Date()
): NavData {
  const props = resolveProperties(dataSource.properties)
  if (!props.url) {
    throw new Error(
      `找不到連結欄位，請確認資料庫有 URL 型別的欄位，名稱為：${notionPropertyAliases.url.join(" / ")}`
    )
  }

  const entries = pages
    .map((page) => ({ page, entry: pageToEntry(page, props) }))
    .filter(
      (
        item
      ): item is {
        page: PageObjectResponse
        entry: NonNullable<typeof item.entry>
      } => item.entry !== null
    )
    .sort((a, b) => {
      const orderA = a.entry.order ?? Number.POSITIVE_INFINITY
      const orderB = b.entry.order ?? Number.POSITIVE_INFINITY
      if (orderA !== orderB) return orderA - orderB
      return a.page.created_time.localeCompare(b.page.created_time)
    })
    .map(({ entry }) => entry)

  return {
    categories: groupLinksByCategory(
      getCategoryOptions(props.category),
      entries
    ),
    total: entries.length,
    source: "notion",
    updatedAt: now.toISOString(),
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
}: NotionConfig): Promise<NavData> {
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
