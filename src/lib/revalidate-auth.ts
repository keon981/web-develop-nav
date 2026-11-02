import { createHash, timingSafeEqual } from "node:crypto"

import { verifyWebhookSignature } from "@notionhq/client"

/** 固定長度比較，避免 timing attack */
export function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(digest(a), digest(b))
}

/**
 * Notion 建立 webhook 訂閱時，會先送一次 `{ "verification_token": "..." }`（沒有簽章），
 * 需要把這個 token 貼回 Notion 完成驗證，之後的事件都會用它簽章。
 */
export function parseVerificationToken(body: string): string | null {
  try {
    const payload: unknown = JSON.parse(body)
    if (
      payload &&
      typeof payload === "object" &&
      "verification_token" in payload &&
      typeof payload.verification_token === "string" &&
      /^[\w-]{8,256}$/.test(payload.verification_token)
    ) {
      return payload.verification_token
    }
  } catch {
    // 不是 JSON，忽略
  }
  return null
}

/** 從 `Authorization: Bearer xxx`、`x-revalidate-secret` 或 `?secret=` 取出密鑰 */
export function readProvidedSecret(request: Request, url: URL): string | null {
  const auth = request.headers.get("authorization")
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim()
  return (
    request.headers.get("x-revalidate-secret") ?? url.searchParams.get("secret")
  )
}

export interface RevalidateSecrets {
  /** Notion webhook 的 verification_token */
  webhookSecret?: string
  /** 手動 / 排程呼叫用的密鑰 */
  revalidateSecret?: string
}

export async function isAuthorizedRevalidation(
  request: Request,
  url: URL,
  body: string,
  { webhookSecret, revalidateSecret }: RevalidateSecrets
): Promise<boolean> {
  const signature = request.headers.get("x-notion-signature")
  if (signature && webhookSecret) {
    return verifyWebhookSignature({
      body,
      signature,
      verificationToken: webhookSecret,
    })
  }

  const provided = readProvidedSecret(request, url)
  return Boolean(
    provided && revalidateSecret && safeEqual(provided, revalidateSecret)
  )
}
