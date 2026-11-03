import type { NavCategory } from "@/lib/nav-types"

/** 將搜尋字串切成關鍵字（空白分隔，全部符合才算命中） */
export function toSearchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

/** 依關鍵字過濾：比對網站名稱、描述、網域與分類名稱 */
export function filterCategories(
  categories: NavCategory[],
  query: string
): NavCategory[] {
  const terms = toSearchTerms(query)
  if (terms.length === 0) return categories

  return categories
    .map((category) => ({
      ...category,
      links: category.links.filter((link) => {
        const haystack =
          `${link.title}\n${link.description}\n${link.hostname}\n${category.name}`.toLowerCase()
        return terms.every((term) => haystack.includes(term))
      }),
    }))
    .filter((category) => category.links.length > 0)
}

/** 計算不重複的網站數（同一網站可能屬於多個分類） */
export function countUniqueLinks(categories: NavCategory[]): number {
  return new Set(categories.flatMap((c) => c.links.map((l) => l.id))).size
}
