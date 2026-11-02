import { ArrowUpRightIcon } from "lucide-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SiteIcon } from "@/components/nav/site-icon"
import type { NavLink } from "@/lib/nav-types"

export function LinkCard({ link }: { link: NavLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.description || link.title}
      className="group/link block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card
        size="sm"
        className="h-full transition-all duration-200 group-hover/link:-translate-y-0.5 group-hover/link:shadow-md group-hover/link:ring-primary/40 motion-reduce:transition-none motion-reduce:group-hover/link:translate-y-0"
      >
        <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0">
          <SiteIcon link={link} />
          <div className="min-w-0">
            <CardTitle className="truncate font-semibold">
              {link.title}
            </CardTitle>
            <p className="truncate text-xs text-muted-foreground">
              {link.hostname}
            </p>
          </div>
          <ArrowUpRightIcon
            aria-hidden="true"
            className="size-4 self-start text-muted-foreground opacity-0 transition-opacity group-hover/link:opacity-100 group-focus-visible/link:opacity-100"
          />
          <CardDescription className="col-span-3 mt-3 line-clamp-2 leading-relaxed sm:min-h-[2lh]">
            {link.description || "—"}
          </CardDescription>
        </CardHeader>
      </Card>
      <span className="sr-only">（另開新視窗）</span>
    </a>
  )
}
