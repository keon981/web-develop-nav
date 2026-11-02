import { cn } from "@/lib/utils"

import { notionColorClasses } from "@/lib/colors"
import type { NavCategory } from "@/lib/nav-types"

/** 分類圖示：選項名稱開頭有 emoji 就顯示 emoji，否則顯示 Notion 選項顏色的圓點 */
export function CategoryIcon({
  category,
  className,
}: {
  category: Pick<NavCategory, "emoji" | "color">
  className?: string
}) {
  if (category.emoji) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center text-sm leading-none",
          className
        )}
      >
        {category.emoji}
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center",
        className
      )}
    >
      <span
        className={cn(
          "size-2.5 rounded-full ring-2 ring-background",
          notionColorClasses[category.color].dot
        )}
      />
    </span>
  )
}
