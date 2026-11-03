import { CompassIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GitHubIcon } from "@/components/icons"
import { SearchBox } from "@/components/nav/search-box"
import { ThemeToggle } from "@/components/nav/theme-toggle"
import { siteConfig } from "@/config/site"

export function SiteHeader({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (value: string) => void
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md md:px-6">
      <SidebarTrigger aria-label="開關側邊欄" />
      <Separator
        orientation="vertical"
        className="mx-1 hidden md:block data-vertical:h-4 data-vertical:self-center"
      />
      <a
        href="/"
        aria-label={siteConfig.name}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden"
      >
        <CompassIcon className="size-4" />
      </a>

      <SearchBox
        value={query}
        onChange={onQueryChange}
        className="min-w-0 flex-1 md:max-w-sm"
      />

      <div className="ml-auto flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            />
          }
        >
          <GitHubIcon />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
