import { NOTION_DATABASE_ID, NOTION_TOKEN } from "astro:env/server"

import { getDemoNavData } from "@/lib/demo-data"
import type { NavData } from "@/lib/nav-types"
import { describeNotionError, fetchNotionNavData } from "@/lib/notion"

/**
 * 頁面資料入口：
 * - 未設定 NOTION_TOKEN / NOTION_DATABASE_ID → 顯示範例資料
 * - 讀取失敗 → 回傳 error（頁面會顯示錯誤提示且不快取）
 */
export async function getNavData(): Promise<NavData> {
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) return getDemoNavData()

  try {
    return await fetchNotionNavData({
      token: NOTION_TOKEN,
      databaseId: NOTION_DATABASE_ID,
    })
  } catch (error) {
    console.error("[notion] 讀取導航資料失敗", error)
    return {
      categories: [],
      total: 0,
      source: "notion",
      updatedAt: new Date().toISOString(),
      error: describeNotionError(error),
    }
  }
}
