# Web Develop Nav

以 **Notion 資料庫當後台**的前端工具導航站。在 Notion 新增、修改網站資料後，網站會自動同步更新。

- 框架：Astro 7 + React 19 + Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com)（base-nova / Base UI）
- 版面參考：[WebNav](https://webnav.codefe.top/)（側邊分類 + 卡片網格）、[M-Nav](https://nav.busyhe.com/)（Notion 資料來源）

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshot-dark.png" />
  <img alt="Web Develop Nav 截圖" src="docs/screenshot-light.png" />
</picture>

## 功能

- 📚 **Notion 即後台**：使用官方 Notion API 讀取資料庫，支援單選 / 多選分類
- 🔄 **自動同步**：頁面快取 + stale-while-revalidate，並可用 Notion webhook 即時更新
- 🧭 **分類側邊欄**：順序與顏色跟 Notion 選項一致，捲動時自動標示目前分類；手機版為抽屜選單
- 🔍 **即時搜尋**：比對名稱、描述、網域與分類；按 `/` 或 `Ctrl / ⌘ + K` 聚焦
- 🖼️ **自動圖示**：`icon link` → Notion 頁面圖示 → 網站 favicon → 文字頭像，依序備援
- 🌗 深色模式（淺色 / 深色 / 跟隨系統）、RWD、無障礙標記

## Notion 資料庫欄位

| 欄位        | Notion 類型   | 必填 | 說明                                                                  |
| ----------- | ------------- | ---- | --------------------------------------------------------------------- |
| `Name`      | 標題（Title） | ✅   | 網站名稱（標題欄位名稱不限）                                          |
| `link`      | URL           | ✅   | 網站連結，可省略 `https://`                                           |
| `Desc`      | 文字          |      | 網站描述                                                              |
| `Type`      | 多選 / 單選   |      | 分類。側邊欄順序 = 選項排列順序；選項名稱開頭加 emoji（如 `🎨 CSS相關`）會當成分類圖示 |
| `icon link` | URL           |      | 自訂圖示網址；留空會自動抓 favicon                                    |
| `Sort`      | 數字          |      | （選填）同分類內排序，數字小的在前；沒有此欄位時依建立時間排序        |

> 欄位名稱不分大小寫，也可以在 [`src/config/site.ts`](src/config/site.ts) 的 `notionPropertyAliases` 加入自己的欄位名稱。

## 快速開始

### 1. 建立 Notion integration 並分享資料庫

1. 到 [Notion Integrations](https://www.notion.so/profile/integrations) 建立 **Internal integration**，複製 **Internal Integration Secret**（即 `NOTION_TOKEN`）。
2. 打開你的資料庫 → 右上角 **⋯ → Connections** → 加入剛建立的 integration。
3. 複製資料庫網址（`https://www.notion.so/<workspace>/<資料庫ID>?v=...`），整串貼到 `NOTION_DATABASE_ID` 即可。

### 2. 本機開發

需求：Node.js ≥ 22、pnpm 10。

```bash
pnpm install
cp .env.example .env   # 填入 NOTION_TOKEN 與 NOTION_DATABASE_ID
pnpm dev               # http://localhost:4321
```

> 沒有設定 Notion 時會顯示範例資料，方便先調整畫面。

## 環境變數

所有變數都列在 [`.env.example`](.env.example)，皆於**執行階段**讀取（不會打包進前端）。

| 變數                    | 說明                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `NOTION_TOKEN`          | Notion integration secret                                             |
| `NOTION_DATABASE_ID`    | 資料庫 ID 或網址（也接受 data source ID）                             |
| `CACHE_MAX_AGE`         | 頁面快取秒數，預設 `300`；Notion 修改後最慢約這段時間反映。`0` = 不快取 |
| `NOTION_WEBHOOK_SECRET` | （選填）Notion webhook 的 verification token，設定後可即時更新        |
| `REVALIDATE_SECRET`     | （選填）手動觸發更新 `/api/revalidate` 用的密鑰                       |

## Notion 更新如何同步到網站

```mermaid
flowchart LR
  N[(Notion 資料庫)] -- 1. 讀取 --> P["/ 首頁（SSR）"]
  P -- 2. 快取 CACHE_MAX_AGE 秒<br/>過期後背景重新抓取 --> C[(頁面快取)]
  N -. 3. 資料變更 webhook .-> R["/api/revalidate"]
  R -- 4. 驗證簽章後清除快取 --> C
```

1. 首頁在伺服器端讀取 Notion，並以 [Astro route caching](https://docs.astro.build/en/guides/caching/) 快取 `CACHE_MAX_AGE` 秒。
2. 快取過期後採 stale-while-revalidate：先回應舊頁面、背景重新讀取 Notion，訪客不會等待。
3. **即時更新（選用）**：設定 Notion webhook，資料一變更就清除快取。
4. 讀取 Notion 失敗時頁面會顯示錯誤提示（HTTP 503），且不會被快取。

### 設定 Notion webhook（即時更新）

1. 先完成部署，確定 `https://你的網域/api/revalidate` 可以連線。
2. Notion integration 設定頁 → **Webhooks** → **Create a subscription**：
   - URL：`https://你的網域/api/revalidate`
   - 事件：勾選 `Page`（created / properties updated / deleted / undeleted）與 `Data source` 的 schema updated（調整分類選項時）。
3. Notion 會送出一次驗證請求，到伺服器 log（Vercel：Project → Logs）找到
   `收到 Notion webhook verification_token：secret_xxx`，把 token 貼回 Notion 按 **Verify**。
4. 將同一個 token 設為環境變數 `NOTION_WEBHOOK_SECRET` 並重新部署。之後的事件都會驗證 `X-Notion-Signature` 簽章。

### 手動觸發更新

設定 `REVALIDATE_SECRET` 後，可從 CI、排程或 Notion 自動化（Send webhook）呼叫：

```bash
curl -X POST -H "Authorization: Bearer <REVALIDATE_SECRET>" https://你的網域/api/revalidate
```

## 部署

建置時會自動選擇 adapter（見 [`astro.config.mjs`](astro.config.mjs)）：

| 環境                       | Adapter                 | 快取                                     |
| -------------------------- | ----------------------- | ---------------------------------------- |
| Vercel（偵測到 `VERCEL`）  | `@astrojs/vercel`       | Vercel CDN（`Vercel-Cache-Tag`）         |
| 其他（本機 / Docker / VPS）| `@astrojs/node` standalone | 記憶體快取（單一程序內有效）          |

### Vercel（推薦）

1. 在 Vercel 匯入此 repo（Framework 會自動偵測為 Astro）。
2. 於 **Settings → Environment Variables** 設定 `NOTION_TOKEN`、`NOTION_DATABASE_ID`（以及選填變數）。
3. 部署完成後，依上方步驟設定 Notion webhook。

### Node（自架）

```bash
pnpm build
HOST=0.0.0.0 PORT=4321 NOTION_TOKEN=... NOTION_DATABASE_ID=... node ./dist/server/entry.mjs
```

> 記憶體快取只在單一程序內有效，若開多個實例，`/api/revalidate` 只會清除收到請求的那一個。

## 指令

| 指令             | 說明                          |
| ---------------- | ----------------------------- |
| `pnpm dev`       | 開發伺服器                    |
| `pnpm build`     | 正式建置                      |
| `pnpm preview`   | 預覽建置結果（Node adapter）  |
| `pnpm test`      | 單元測試（Vitest）            |
| `pnpm lint`      | ESLint                        |
| `pnpm typecheck` | `astro check` 型別檢查        |
| `pnpm format`    | Prettier 格式化               |

## 專案結構

```text
src/
├── config/site.ts          # 網站名稱、連結、favicon 服務、Notion 欄位對應
├── pages/
│   ├── index.astro         # 首頁：讀取資料 + 設定快取
│   └── api/revalidate.ts   # 清除快取（Notion webhook / 手動）
├── lib/
│   ├── notion.ts           # Notion API → 導航資料（欄位對應、排序、icon）
│   ├── nav-data.ts         # 讀取入口（未設定時使用 demo-data.ts）
│   ├── revalidate-auth.ts  # webhook 簽章 / 密鑰驗證
│   └── search.ts、url.ts、category.ts …
├── components/
│   ├── nav/                # 版面：側邊欄、header、搜尋、卡片、主題切換
│   └── ui/                 # shadcn/ui 元件
└── hooks/                  # use-theme、use-active-section（scroll spy）、use-mobile
```

## 新增 shadcn 元件

```bash
npx shadcn@latest add <component>
```
