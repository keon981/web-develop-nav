import { signWebhookPayload } from "@notionhq/client"
import { describe, expect, it } from "vitest"

import {
  isAuthorizedRevalidation,
  parseVerificationToken,
} from "@/lib/revalidate-auth"

const secrets = {
  webhookSecret: "secret_webhook_token",
  revalidateSecret: "manual-secret",
}
const endpoint = "https://nav.example.com/api/revalidate"

function request(headers: Record<string, string> = {}, query = "") {
  const url = new URL(endpoint + query)
  return { req: new Request(url, { method: "POST", headers }), url }
}

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

describe("isAuthorizedRevalidation", () => {
  const body = JSON.stringify({ type: "page.properties_updated" })

  it("接受正確的 Notion webhook 簽章", async () => {
    const signature = await signWebhookPayload({
      body,
      verificationToken: secrets.webhookSecret,
    })
    const { req, url } = request({ "x-notion-signature": signature })
    expect(await isAuthorizedRevalidation(req, url, body, secrets)).toBe(true)
  })

  it("拒絕錯誤簽章或被竄改的內容", async () => {
    const signature = await signWebhookPayload({
      body,
      verificationToken: secrets.webhookSecret,
    })
    const tampered = request({ "x-notion-signature": signature })
    expect(
      await isAuthorizedRevalidation(
        tampered.req,
        tampered.url,
        body + " ",
        secrets
      )
    ).toBe(false)

    const wrong = request({ "x-notion-signature": "sha256=deadbeef" })
    expect(
      await isAuthorizedRevalidation(wrong.req, wrong.url, body, secrets)
    ).toBe(false)
  })

  it("接受 Bearer token、x-revalidate-secret 或 ?secret=", async () => {
    for (const { req, url } of [
      request({ authorization: "Bearer manual-secret" }),
      request({ "x-revalidate-secret": "manual-secret" }),
      request({}, "?secret=manual-secret"),
    ]) {
      expect(await isAuthorizedRevalidation(req, url, "", secrets)).toBe(true)
    }
  })

  it("沒有設定密鑰或密鑰錯誤時拒絕", async () => {
    const { req, url } = request({ authorization: "Bearer manual-secret" })
    expect(await isAuthorizedRevalidation(req, url, "", {})).toBe(false)

    const wrong = request({ authorization: "Bearer nope" })
    expect(
      await isAuthorizedRevalidation(wrong.req, wrong.url, "", secrets)
    ).toBe(false)
  })
})
