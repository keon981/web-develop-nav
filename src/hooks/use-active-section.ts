import * as React from "react"

/**
 * Scroll spy：回傳目前捲動到的區塊 id，以及「手動指定」的函式。
 * 點擊側邊欄時先鎖定為點擊的分類，等平滑捲動結束後才恢復自動偵測，
 * 避免捲到頁尾時被判定成最後一個分類。
 *
 * @param ids 依畫面順序排列的區塊 id（請傳入穩定的陣列，例如 useMemo 的結果）
 * @param offset 視為「已進入」的頂部距離（需大於 sticky header 高度）
 */
export function useActiveSection(ids: string[], offset = 96) {
  const [activeId, setActiveId] = React.useState<string | null>(ids[0] ?? null)
  const lockUntil = React.useRef(0)

  React.useEffect(() => {
    if (ids.length === 0) return

    let frame = 0
    const update = () => {
      frame = 0
      const doc = document.documentElement
      const scrollable = doc.scrollHeight > window.innerHeight + 2
      const atBottom =
        scrollable &&
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= doc.scrollHeight - 2

      let current = ids[0]
      if (atBottom) {
        current = ids[ids.length - 1]
      } else {
        for (const id of ids) {
          const top = document.getElementById(id)?.getBoundingClientRect().top
          if (top !== undefined && top - offset <= 0) current = id
        }
      }
      setActiveId(current)
    }
    const schedule = () => {
      // 鎖定期間的捲動（平滑捲動中）只延長鎖定，不更新
      if (Date.now() < lockUntil.current) {
        lockUntil.current = Date.now() + 200
        return
      }
      if (!frame) frame = requestAnimationFrame(update)
    }

    schedule()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [ids, offset])

  const selectSection = React.useCallback((id: string) => {
    lockUntil.current = Date.now() + 1000
    setActiveId(id)
  }, [])

  return [activeId, selectSection] as const
}
