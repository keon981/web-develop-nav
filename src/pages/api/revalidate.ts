import type { APIContext, APIRoute } from "astro"
import { NOTION_WEBHOOK_SECRET, REVALIDATE_SECRET } from "astro:env/server"

import { NOTION_CACHE_TAG } from "@/config/site"
import {
  isAuthorizedRevalidation,
  parseVerificationToken,
} from "@/lib/revalidate-auth"

/**
 * 清除首頁快取，讓下一次請求重新向 Notion 取資料。
 *
 * - Notion webhook：POST，帶 `X-Notion-Signature`（需設定 NOTION_WEBHOOK_SECRET）
 * - 手動 / 排程：GET 或 POST，帶 `Authorization: Bearer <REVALIDATE_SECRET>` 或 `?secret=`
 */
export const prerender = false

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

async function handle(context: APIContext, body: string) {
  const authorized = await isAuthorizedRevalidation(
    context.request,
    context.url,
    body,
    {
      webhookSecret: NOTION_WEBHOOK_SECRET,
      revalidateSecret: REVALIDATE_SECRET,
    }
  )
  if (!authorized) return json({ ok: false, message: "Unauthorized" }, 401)

  await context.cache.invalidate({ tags: [NOTION_CACHE_TAG] })
  return json({ ok: true, revalidated: [NOTION_CACHE_TAG], now: Date.now() })
}

export const POST: APIRoute = async (context) => {
  const body = await context.request.text()

  // Notion webhook 訂閱的一次性驗證請求
  const verificationToken = context.request.headers.has("x-notion-signature")
    ? null
    : parseVerificationToken(body)
  if (verificationToken) {
    console.info(
      `[revalidate] 收到 Notion webhook verification_token：${verificationToken}\n` +
        "請貼回 Notion integration 的 Webhooks 頁面完成驗證，並設定為環境變數 NOTION_WEBHOOK_SECRET。"
    )
    return json({ ok: true, message: "verification_token received" })
  }

  return handle(context, body)
}

export const GET: APIRoute = (context) => handle(context, "")
