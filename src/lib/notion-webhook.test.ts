import { signWebhookPayload } from "@notionhq/client"
import { describe, expect, it, vi } from "vitest"

import {
  handleNotionWebhook,
  parseVerificationToken,
  verifyNotionSignature,
  type NotionWebhookEnv,
} from "@/lib/notion-webhook"

const env: NotionWebhookEnv = {
  NOTION_WEBHOOK_SECRET: "secret_webhook_token",
  GITHUB_DISPATCH_TOKEN: "github_pat_test",
  GITHUB_DISPATCH_REPO: "keon981/web-develop-nav",
}
const body = JSON.stringify({ type: "page.properties_updated" })

function post(payload: string, headers: Record<string, string> = {}) {
  return new Request("https://nav.example.com/api/notion-webhook", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: payload,
  })
}

const sign = (
  payload: string,
  verificationToken = env.NOTION_WEBHOOK_SECRET!
) => signWebhookPayload({ body: payload, verificationToken })

describe("verifyNotionSignature", () => {
  it("與 Notion 官方 SDK 的簽章演算法一致", async () => {
    const signature = await sign(body)
    expect(
      await verifyNotionSignature(body, signature, env.NOTION_WEBHOOK_SECRET!)
    ).toBe(true)
  })

  it("拒絕錯誤簽章、被竄改的內容與缺少簽章", async () => {
    const signature = await sign(body)
    const secret = env.NOTION_WEBHOOK_SECRET!
    expect(await verifyNotionSignature(body + " ", signature, secret)).toBe(
      false
    )
    expect(await verifyNotionSignature(body, "sha256=deadbeef", secret)).toBe(
      false
    )
    expect(await verifyNotionSignature(body, null, secret)).toBe(false)
  })
})

describe("parseVerificationToken", () => {
  it("只接受 Notion 的 verification 請求格式", () => {
    expect(
      parseVerificationToken('{"verification_token":"secret_abc123"}')
    ).toBe("secret_abc123")
    expect(parseVerificationToken('{"type":"page.created"}')).toBeNull()
    expect(
      parseVerificationToken('{"verification_token":"<script>"}')
    ).toBeNull()
    expect(parseVerificationToken("not json")).toBeNull()
  })
})

describe("handleNotionWebhook", () => {
  it("訂閱驗證請求：記錄 token、回 200，不觸發 build", async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const log = vi.spyOn(console, "log").mockImplementation(() => {})

    const res = await handleNotionWebhook(
      post('{"verification_token":"secret_abc123"}'),
      {},
      fetchMock
    )

    expect(res.status).toBe(200)
    expect(log).toHaveBeenCalledWith(expect.stringContaining("secret_abc123"))
    expect(fetchMock).not.toHaveBeenCalled()
    log.mockRestore()
  })

  it("簽章正確：觸發 GitHub workflow_dispatch，回 202", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 204 })
    )

    const res = await handleNotionWebhook(
      post(body, { "x-notion-signature": await sign(body) }),
      env,
      fetchMock
    )

    expect(res.status).toBe(202)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      "https://api.github.com/repos/keon981/web-develop-nav/actions/workflows/notion-rebuild.yml/dispatches"
    )
    expect(init?.method).toBe("POST")
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer github_pat_test"
    )
    expect(JSON.parse(String(init?.body))).toEqual({ ref: "main" })
  })

  it("可用 GITHUB_DISPATCH_REF 指定分支", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 204 })
    )
    await handleNotionWebhook(
      post(body, { "x-notion-signature": await sign(body) }),
      { ...env, GITHUB_DISPATCH_REF: "develop" },
      fetchMock
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      ref: "develop",
    })
  })

  it("簽章錯誤或未設定 NOTION_WEBHOOK_SECRET：回 401，不觸發 build", async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const bad = await handleNotionWebhook(
      post(body, { "x-notion-signature": "sha256=deadbeef" }),
      env,
      fetchMock
    )
    const noSecret = await handleNotionWebhook(
      post(body, { "x-notion-signature": await sign(body) }),
      { ...env, NOTION_WEBHOOK_SECRET: undefined },
      fetchMock
    )
    const unsigned = await handleNotionWebhook(post(body), env, fetchMock)

    expect([bad.status, noSecret.status, unsigned.status]).toEqual([
      401, 401, 401,
    ])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("GitHub 回傳錯誤：回 502 讓 Notion 之後重試", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response("Bad credentials", { status: 401 })
    )

    const res = await handleNotionWebhook(
      post(body, { "x-notion-signature": await sign(body) }),
      env,
      fetchMock
    )

    expect(res.status).toBe(502)
    error.mockRestore()
  })

  it("缺少 GitHub 設定：回 500，不呼叫 GitHub", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const fetchMock = vi.fn<typeof fetch>()

    const res = await handleNotionWebhook(
      post(body, { "x-notion-signature": await sign(body) }),
      { NOTION_WEBHOOK_SECRET: env.NOTION_WEBHOOK_SECRET },
      fetchMock
    )

    expect(res.status).toBe(500)
    expect(fetchMock).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
