import * as React from "react"
import { SearchXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/nav/app-sidebar"
import { CategorySection } from "@/components/nav/category-section"
import { DataNotice } from "@/components/nav/data-notice"
import { SiteFooter } from "@/components/nav/site-footer"
import { SiteHeader } from "@/components/nav/site-header"
import { useActiveSection } from "@/hooks/use-active-section"
import type { NavData } from "@/lib/nav-types"
import { countUniqueLinks, filterCategories } from "@/lib/search"

export function NavApp({ data }: { data: NavData }) {
  const [query, setQuery] = React.useState("")
  const deferredQuery = React.useDeferredValue(query)

  const categories = React.useMemo(
    () => filterCategories(data.categories, deferredQuery),
    [data.categories, deferredQuery]
  )
  const counts = React.useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.links.length])),
    [categories]
  )
  const sectionIds = React.useMemo(
    () => categories.map((c) => c.id),
    [categories]
  )
  const [activeId, selectSection] = useActiveSection(sectionIds)

  const isSearching = deferredQuery.trim().length > 0
  const resultCount = React.useMemo(
    () => (isSearching ? countUniqueLinks(categories) : data.total),
    [isSearching, categories, data.total]
  )

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          categories={data.categories}
          counts={counts}
          total={data.total}
          activeId={activeId}
          onSelect={selectSection}
        />
        <SidebarInset className="min-w-0">
          <SiteHeader query={query} onQueryChange={setQuery} />

          <div className="flex flex-1 flex-col gap-10 px-4 py-6 md:px-6 lg:px-8">
            <DataNotice data={data} />

            {isSearching && categories.length > 0 && (
              <p
                className="-mb-4 text-sm text-muted-foreground"
                aria-live="polite"
              >
                搜尋「{deferredQuery.trim()}」：找到 {resultCount} 個網站
              </p>
            )}

            {categories.map((category) => (
              <CategorySection key={category.id} category={category} />
            ))}

            {categories.length === 0 && !data.error && (
              <Empty className="flex-none border border-dashed py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchXIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    {isSearching ? "找不到符合的網站" : "還沒有任何網站"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {isSearching
                      ? `沒有網站符合「${deferredQuery.trim()}」，換個關鍵字試試看。`
                      : "在 Notion 資料庫新增資料後，這裡就會自動更新。"}
                  </EmptyDescription>
                </EmptyHeader>
                {isSearching && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery("")}
                    >
                      清除搜尋
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            )}
          </div>

          <SiteFooter data={data} />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
