import { describe, expect, it } from "vitest"

import { getFaviconUrl, getHostname, normalizeUrl } from "@/lib/url"

describe("normalizeUrl", () => {
  it("自動補上 https://", () => {
    expect(normalizeUrl("sass-lang.com/")).toBe("https://sass-lang.com/")
    expect(normalizeUrl("  example.com/docs?a=1 ")).toBe(
      "https://example.com/docs?a=1"
    )
    expect(normalizeUrl("//cdn.example.com/logo.png")).toBe(
      "https://cdn.example.com/logo.png"
    )
  })

  it("保留 http / https", () => {
    expect(normalizeUrl("http://localhost:3000")).toBe("http://localhost:3000/")
    expect(normalizeUrl("https://vite.dev")).toBe("https://vite.dev/")
  })

  it("拒絕空值與非 http(s) 協定", () => {
    expect(normalizeUrl("")).toBeNull()
    expect(normalizeUrl(null)).toBeNull()
    expect(normalizeUrl("javascript:alert(1)")).toBeNull()
    expect(normalizeUrl("mailto:me@example.com")).toBeNull()
  })
})

describe("getHostname / getFaviconUrl", () => {
  it("去掉 www. 並組出 favicon 網址", () => {
    expect(getHostname("https://www.typescriptlang.org/play")).toBe(
      "typescriptlang.org"
    )
    expect(getFaviconUrl("sass-lang.com")).toContain("sass-lang.com")
    expect(getFaviconUrl("")).toBeNull()
  })
})
