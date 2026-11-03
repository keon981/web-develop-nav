/**
 * Cloudflare Pages Function：POST /api/notion-webhook
 * 接收 Notion webhook，驗證簽章後觸發 GitHub Actions（等 10 分鐘再重新 build）。
 * 環境變數在 Cloudflare Pages 專案設定：NOTION_WEBHOOK_SECRET、GITHUB_DISPATCH_TOKEN、
 * GITHUB_DISPATCH_REPO、GITHUB_DISPATCH_REF（選填，預設 main）。
 */
import {
  handleNotionWebhook,
  type NotionWebhookEnv,
} from "../../src/lib/notion-webhook"

interface PagesContext {
  request: Request
  env: NotionWebhookEnv
}

export const onRequestPost = ({ request, env }: PagesContext) =>
  handleNotionWebhook(request, env)
