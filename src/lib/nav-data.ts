import { getImage } from "astro:assets"
import { NOTION_DATABASE_ID, NOTION_TOKEN } from "astro:env/server"

import { getDemoNavData } from "@/lib/demo-data"
import type { NavData } from "@/lib/nav-types"
import {
  describeNotionError,
  fetchNotionNavData,
  localizeNotionIcons,
} from "@/lib/notion"

/** build 時把 Notion 上傳的圖示下載成網站內的靜態檔（縮成 80px 寬的 webp） */
async function downloadIcon(url: string): Promise<string> {
  const image = await getImage({
    src: url,
    inferSize: true,
    width: 80,
    format: "webp",
  })
  return image.src
}

/**
 * 頁面資料入口（SSG：在 build 時執行）。
 * - 開發模式且未設定 NOTION_TOKEN / NOTION_DATABASE_ID → 顯示範例資料
 * - build 時缺少設定或讀取 Notion 失敗 → 直接拋錯讓 build 失敗，Cloudflare 會繼續提供上一版網站
 */
export async function getNavData(): Promise<NavData> {
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    if (import.meta.env.DEV) return getDemoNavData()
    throw new Error(
      "缺少 NOTION_TOKEN 或 NOTION_DATABASE_ID，停止 build（網站會保留上一版）。"
    )
  }

  try {
    const { data, hostedIconLinkIds } = await fetchNotionNavData({
      token: NOTION_TOKEN,
      databaseId: NOTION_DATABASE_ID,
    })
    return await localizeNotionIcons(data, hostedIconLinkIds, downloadIcon)
  } catch (error) {
    throw new Error(
      `讀取 Notion 失敗，停止 build：${describeNotionError(error)}`,
      {
        cause: error,
      }
    )
  }
}
