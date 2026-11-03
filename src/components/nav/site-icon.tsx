import * as React from "react"
import { cn } from "@/lib/utils"

import { colorFromText, notionColorClasses } from "@/lib/colors"
import type { NavLink } from "@/lib/nav-types"
import { getFaviconUrl } from "@/lib/url"

/**
 * 網站圖示，依序嘗試：icon link / Notion 頁面圖片 → Notion emoji → favicon → 首字頭像
 */
export function SiteIcon({
  link,
  className,
}: {
  link: Pick<NavLink, "title" | "hostname" | "icon" | "emoji">
  className?: string
}) {
  const sources = React.useMemo(() => {
    const favicon = getFaviconUrl(link.hostname)
    if (link.icon) return [link.icon, favicon].filter(Boolean) as string[]
    return link.emoji || !favicon ? [] : [favicon]
  }, [link.icon, link.emoji, link.hostname])

  const [failed, setFailed] = React.useState(0)
  const imgRef = React.useRef<HTMLImageElement>(null)
  const src = sources[failed]

  // SSR 輸出的 <img> 可能在 hydrate 前就載入失敗（React 收不到 onError），
  // 重新設定一次 src 讓 error 事件再觸發，交給 onError 切換到下一個來源
  React.useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth === 0) {
      img.setAttribute("src", img.getAttribute("src") ?? "")
    }
  }, [])

  const frame = cn(
    "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/5",
    className
  )

  if (src) {
    return (
      <span className={cn(frame, "bg-white p-1.5 dark:bg-white/90")}>
        <img
          ref={imgRef}
          src={src}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-contain"
          onError={() => setFailed((n) => n + 1)}
        />
      </span>
    )
  }

  if (link.emoji && !link.icon) {
    return (
      <span className={cn(frame, "text-xl")} aria-hidden="true">
        {link.emoji}
      </span>
    )
  }

  const color = notionColorClasses[colorFromText(link.title)].soft
  return (
    <span
      className={cn(frame, color, "text-base font-semibold")}
      aria-hidden="true"
    >
      {Array.from(link.title.trim())[0]?.toUpperCase() ?? "?"}
    </span>
  )
}
