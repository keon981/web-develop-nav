import * as React from "react"

export type Theme = "light" | "dark" | "system"

/** 與 layouts/main.astro 內的 inline script 使用同一個 key */
const STORAGE_KEY = "theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"
const listeners = new Set<() => void>()

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === "light" || value === "dark") return value
  } catch {
    // localStorage 可能被瀏覽器封鎖
  }
  return "system"
}

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia(DARK_QUERY).matches)
  const root = document.documentElement
  root.classList.toggle("dark", dark)
  root.style.colorScheme = dark ? "dark" : "light"
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

export function useTheme() {
  const theme = React.useSyncExternalStore(
    subscribe,
    readTheme,
    () => "system" as const
  )

  // 「跟隨系統」時，系統深淺色切換要即時反應
  React.useEffect(() => {
    if (theme !== "system") return
    const mql = window.matchMedia(DARK_QUERY)
    const onChange = () => applyTheme("system")
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [theme])

  const setTheme = React.useCallback((next: Theme) => {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 忽略無法寫入的情況，仍套用到當前頁面
    }
    applyTheme(next)
    listeners.forEach((listener) => listener())
  }, [])

  return { theme, setTheme }
}
