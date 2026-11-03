/**
 * Notion webhook 接收邏輯（由 Cloudflare Pages Function `functions/api/notion-webhook.ts` 呼叫）。
 *
 * 流程：Notion webhook → 驗證 X-Notion-Signature → 觸發 GitHub Actions workflow
 * → workflow 等 10 分鐘（期間有新通知就重新計時）→ 呼叫 Cloudflare Pages deploy hook 重新 build。
 *
 * 只使用 Web 標準 API（fetch / Web Crypto），可在 Cloudflare Workers 執行，也方便在 Node 測試。
 */

export interface NotionWebhookEnv {
  /** Notion webhook 的 verification_token（驗證簽章用） */
  NOTION_WEBHOOK_SECRET?: string
  /** 具備此 repo「Actions: Read and write」權限的 GitHub token */
  GITHUB_DISPATCH_TOKEN?: string
  /** 例如 keon981/web-develop-nav */
  GITHUB_DISPATCH_REPO?: string
  /** 執行 workflow 的分支，預設 main（workflow 檔必須在預設分支上） */
  GITHUB_DISPATCH_REF?: string
}

/** 與 .github/workflows/notion-rebuild.yml 對應 */
export const REBUILD_WORKFLOW_FILE = "notion-rebuild.yml"

const encoder = new TextEncoder()

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("")
}

/** 固定時間比較，避免 timing attack */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** X-Notion-Signature = "sha256=" + HMAC-SHA256(原始 body, verification_token) */
export async function verifyNotionSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature?.startsWith("sha256=")) return false
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
  return constantTimeEqual(`sha256=${toHex(mac)}`, signature)
}

/**
 * Notion 建立 webhook 訂閱時，會先送一次沒有簽章的 `{ "verification_token": "..." }`，
 * 要把這個 token 貼回 Notion 完成驗證，並設為 NOTION_WEBHOOK_SECRET。
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

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

/** 觸發 GitHub Actions 的 notion-rebuild workflow（workflow_dispatch） */
export async function dispatchRebuild(
  env: NotionWebhookEnv,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const response = await fetchImpl(
    `https://api.github.com/repos/${env.GITHUB_DISPATCH_REPO}/actions/workflows/${REBUILD_WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "web-develop-nav-notion-webhook",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      body: JSON.stringify({ ref: env.GITHUB_DISPATCH_REF || "main" }),
    }
  )
  return response
}

export async function handleNotionWebhook(
  request: Request,
  env: NotionWebhookEnv,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const body = await request.text()
  const signature = request.headers.get("x-notion-signature")

  // 1. 訂閱驗證：只記錄 token，不做其他事
  if (!signature) {
    const token = parseVerificationToken(body)
    if (!token) return json({ ok: false, message: "Unauthorized" }, 401)
    console.log(
      `[notion-webhook] 收到 Notion verification_token：${token}\n` +
        "請貼回 Notion integration 的 Webhooks 頁面完成驗證，並設為環境變數 NOTION_WEBHOOK_SECRET。"
    )
    return json({ ok: true, message: "verification_token received" }, 200)
  }

  // 2. 一般事件：驗證簽章
  if (
    !env.NOTION_WEBHOOK_SECRET ||
    !(await verifyNotionSignature(body, signature, env.NOTION_WEBHOOK_SECRET))
  ) {
    return json({ ok: false, message: "Unauthorized" }, 401)
  }

  if (!env.GITHUB_DISPATCH_TOKEN || !env.GITHUB_DISPATCH_REPO) {
    console.error(
      "[notion-webhook] 缺少 GITHUB_DISPATCH_TOKEN 或 GITHUB_DISPATCH_REPO，無法觸發重新 build"
    )
    return json({ ok: false, message: "Server misconfigured" }, 500)
  }

  // 3. 觸發 GitHub Actions（等 10 分鐘的計時在 workflow 裡）
  const response = await dispatchRebuild(env, fetchImpl)
  if (!response.ok) {
    console.error(
      `[notion-webhook] 觸發 GitHub workflow 失敗：${response.status} ${await response.text()}`
    )
    // 回傳 5xx 讓 Notion 之後重試
    return json({ ok: false, message: "Failed to schedule rebuild" }, 502)
  }

  return json({ ok: true, message: "rebuild scheduled" }, 202)
}
