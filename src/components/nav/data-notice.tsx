import { InfoIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { NavData } from "@/lib/nav-types"

/** 開發模式未設定 Notion 時，提示目前顯示的是範例資料 */
export function DataNotice({ data }: { data: NavData }) {
  if (data.source !== "demo") return null

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
