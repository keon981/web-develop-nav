import { CircleAlertIcon, InfoIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { NavData } from "@/lib/nav-types"

/** 顯示「範例資料」或「Notion 讀取失敗」的提示 */
export function DataNotice({ data }: { data: NavData }) {
  if (data.error) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>無法讀取 Notion 資料</AlertTitle>
        <AlertDescription>{data.error}</AlertDescription>
      </Alert>
    )
  }

  if (data.source === "demo") {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>目前顯示的是範例資料</AlertTitle>
        <AlertDescription>
          <p>
            在 <code className="font-mono">.env</code> 設定{" "}
            <code className="font-mono">NOTION_TOKEN</code> 與{" "}
            <code className="font-mono">NOTION_DATABASE_ID</code>{" "}
            後，就會改為讀取你的 Notion 資料庫（設定方式請見 README）。
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
