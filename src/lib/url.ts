import { siteConfig } from "@/config/site"

/**
 * 正規化使用者在 Notion 填的網址：
 * - 自動補上 https://（例如 `sass-lang.com/`）
 * - 只允許 http / https，避免 `javascript:` 之類的連結
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null

  const withProtocol = /^[a-z][a-z\d+\-.]*:/i.test(value)
    ? value
    : `https://${value.replace(/^\/+/, "")}`

  try {
    const url = new URL(withProtocol)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.href
  } catch {
    return null
  }
}

/** 取得網域（去掉 www.），用於顯示與 favicon */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

export function getFaviconUrl(hostname: string): string | null {
  if (!hostname) return null
  return siteConfig.faviconService.replace(
    "{hostname}",
    encodeURIComponent(hostname)
  )
}
