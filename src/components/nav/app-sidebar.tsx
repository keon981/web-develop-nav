import type * as React from "react"
import { CompassIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { CategoryIcon } from "@/components/nav/category-icon"
import { siteConfig } from "@/config/site"
import type { NavCategory } from "@/lib/nav-types"
import { cn } from "@/lib/utils"

/** 平滑捲動到分類；行動版會先關閉側邊欄（等動畫結束、解除捲動鎖定後再捲動） */
function useScrollToCategory(onSelect: (id: string) => void) {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()

  return (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    onSelect(id)
    const scroll = () => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })
      history.replaceState(null, "", `#${id}`)
    }
    if (isMobile && openMobile) {
      setOpenMobile(false)
      window.setTimeout(scroll, 300)
    } else {
      scroll()
    }
  }
}

export function AppSidebar({
  categories,
  counts,
  total,
  activeId,
  onSelect,
}: {
  categories: NavCategory[]
  /** 搜尋後各分類的結果數（key = 分類 id） */
  counts: Record<string, number>
  total: number
  activeId: string | null
  /** 點擊分類時通知 scroll spy 鎖定該分類 */
  onSelect: (id: string) => void
}) {
  const scrollToCategory = useScrollToCategory(onSelect)

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/" />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <CompassIcon className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">
                  {siteConfig.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  收錄 {total} 個網站
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup hidden={categories.length === 0}>
          <SidebarGroupLabel>分類</SidebarGroupLabel>
          <SidebarMenu>
            {categories.map((category) => {
              const count = counts[category.id] ?? 0
              const disabled = count === 0
              return (
                <SidebarMenuItem key={category.id}>
                  <SidebarMenuButton
                    isActive={activeId === category.id}
                    aria-disabled={disabled || undefined}
                    className={cn("pr-9", disabled && "opacity-40")}
                    render={
                      <a
                        href={`#${category.id}`}
                        tabIndex={disabled ? -1 : undefined}
                        onClick={(event) =>
                          disabled
                            ? event.preventDefault()
                            : scrollToCategory(event, category.id)
                        }
                      />
                    }
                  >
                    <CategoryIcon category={category} />
                    <span>{category.name}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-muted-foreground tabular-nums">
                    {count}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 text-xs leading-relaxed text-muted-foreground">
          資料由 Notion 同步更新
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
