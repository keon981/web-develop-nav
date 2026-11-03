import type { NavCategory, NavLink, NotionColor } from "@/lib/nav-types"

const LEADING_EMOJI =
  /^(\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*)\s*/u

/** 「🎨 CSS相關」→ { emoji: "🎨", name: "CSS相關" } */
export function splitLeadingEmoji(raw: string): {
  emoji: string | null
  name: string
} {
  const text = raw.trim()
  const match = text.match(LEADING_EMOJI)
  if (!match || match[0].length === text.length)
    return { emoji: null, name: text }
  return { emoji: match[1], name: text.slice(match[0].length).trim() }
}

/** 產生可用於 #hash 的錨點 id，並確保不重複 */
export function createAnchorIdFactory() {
  const used = new Set<string>()
  return (name: string) => {
    const base = name.trim().replace(/[\s#]+/g, "-") || "category"
    let id = base
    for (let i = 2; used.has(id); i++) id = `${base}-${i}`
    used.add(id)
    return id
  }
}

export interface CategoryInput {
  name: string
  color: NotionColor
}

export const UNCATEGORIZED: CategoryInput = { name: "未分類", color: "default" }

/**
 * 依「分類選項順序」把連結分組；一個連結有多個分類時會出現在每個分類中。
 * 空分類會被移除，未分類的連結放在最後。
 */
export function groupLinksByCategory(
  options: CategoryInput[],
  entries: { link: NavLink; categories: string[] }[]
): NavCategory[] {
  const ordered = new Map<string, CategoryInput & { links: NavLink[] }>()
  for (const option of options) {
    if (!ordered.has(option.name))
      ordered.set(option.name, { ...option, links: [] })
  }

  for (const { link, categories } of entries) {
    const names = categories.length > 0 ? categories : [UNCATEGORIZED.name]
    for (const name of names) {
      let group = ordered.get(name)
      if (!group) {
        // 選項不在 schema 中（理論上不會發生）或未分類
        group = {
          ...(name === UNCATEGORIZED.name
            ? UNCATEGORIZED
            : { name, color: "default" }),
          links: [],
        }
        ordered.set(name, group)
      }
      group.links.push(link)
    }
  }

  // 讓「未分類」永遠排在最後
  const uncategorized = ordered.get(UNCATEGORIZED.name)
  if (uncategorized && !options.some((o) => o.name === UNCATEGORIZED.name)) {
    ordered.delete(UNCATEGORIZED.name)
    ordered.set(UNCATEGORIZED.name, uncategorized)
  }

  const toAnchorId = createAnchorIdFactory()
  return [...ordered.values()]
    .filter((group) => group.links.length > 0)
    .map((group) => {
      const { emoji, name } = splitLeadingEmoji(group.name)
      return {
        id: toAnchorId(name),
        name,
        emoji,
        color: group.color,
        links: group.links,
      }
    })
}
