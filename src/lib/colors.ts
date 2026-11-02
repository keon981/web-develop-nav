import type { NotionColor } from "@/lib/nav-types"

/** Notion 選項顏色 → Tailwind class（需寫完整字串，Tailwind 才掃描得到） */
export const notionColorClasses: Record<
  NotionColor,
  { dot: string; soft: string }
> = {
  default: {
    dot: "bg-neutral-400",
    soft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  },
  gray: {
    dot: "bg-slate-400",
    soft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  brown: {
    dot: "bg-amber-700",
    soft: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  },
  orange: {
    dot: "bg-orange-500",
    soft: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200",
  },
  yellow: {
    dot: "bg-yellow-400",
    soft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  },
  green: {
    dot: "bg-emerald-500",
    soft: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  },
  blue: {
    dot: "bg-blue-500",
    soft: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  },
  purple: {
    dot: "bg-violet-500",
    soft: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
  },
  pink: {
    dot: "bg-pink-500",
    soft: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-200",
  },
  red: {
    dot: "bg-red-500",
    soft: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
  },
}

const palette = Object.keys(notionColorClasses) as NotionColor[]

/** 依文字產生穩定的顏色（用於沒有 icon 時的文字頭像） */
export function colorFromText(text: string): NotionColor {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.codePointAt(0)!) | 0
  // 跳過 default / gray，讓文字頭像比較有辨識度
  return palette[2 + (Math.abs(hash) % (palette.length - 2))]
}
