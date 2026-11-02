import { siteConfig } from "@/config/site"
import type { NavData } from "@/lib/nav-types"

const formatter = new Intl.DateTimeFormat(siteConfig.locale, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: siteConfig.timeZone,
})

export function SiteFooter({ data }: { data: NavData }) {
  const updatedAt = new Date(data.updatedAt)

  return (
    <footer className="mt-auto border-t px-4 py-6 text-xs text-muted-foreground md:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          共 {data.total} 個網站 · 資料來源：
          {data.source === "notion" ? "Notion" : "範例資料"} · 更新於{" "}
          <time dateTime={data.updatedAt}>{formatter.format(updatedAt)}</time>
        </p>
        <p>
          Built with{" "}
          <a
            href="https://astro.build"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Astro
          </a>{" "}
          &{" "}
          <a
            href="https://ui.shadcn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            shadcn/ui
          </a>
        </p>
      </div>
    </footer>
  )
}
