import { ArrowUpRightIcon } from "lucide-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SiteIcon } from "@/components/nav/site-icon"
import type { NavLink } from "@/lib/nav-types"
import { cn } from "@/lib/utils"

function CardBody({ link }: { link: NavLink }) {
  const clickable = Boolean(link.url)
  return (
    <Card
      size="sm"
      className={cn(
        "h-full",
        clickable &&
          "transition-all duration-200 group-hover/link:-translate-y-0.5 group-hover/link:shadow-md group-hover/link:ring-primary/40 motion-reduce:transition-none motion-reduce:group-hover/link:translate-y-0"
      )}
    >
      <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0">
        <SiteIcon link={link} />
        <div className="min-w-0">
          <CardTitle className="truncate font-semibold">{link.title}</CardTitle>
          {link.hostname && (
            <p className="truncate text-xs text-muted-foreground">
              {link.hostname}
            </p>
          )}
        </div>
        {clickable && (
          <ArrowUpRightIcon
            aria-hidden="true"
            className="size-4 self-start text-muted-foreground opacity-0 transition-opacity group-hover/link:opacity-100 group-focus-visible/link:opacity-100"
          />
        )}
        {link.description && (
          <CardDescription className="col-span-3 mt-3 line-clamp-2 leading-relaxed">
            {link.description}
          </CardDescription>
        )}
      </CardHeader>
    </Card>
  )
}

/** 有連結：整張卡片可點（另開新視窗）；沒有連結：照樣顯示，但不可點 */
export function LinkCard({ link }: { link: NavLink }) {
  if (!link.url) {
    return (
      <div title={link.description || link.title}>
        <CardBody link={link} />
      </div>
    )
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.description || link.title}
      className="group/link block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <CardBody link={link} />
      <span className="sr-only">（另開新視窗）</span>
    </a>
  )
}
