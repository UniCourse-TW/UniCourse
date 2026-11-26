# observe.tw 家族設計語言與 UniCourse 的採用方式

研究對象：tag.analysis.tw（新文易數，Next.js，`~/Projects/tag.analysis.tw/web`）、youtube.observe.tw（有影儀表板，`~/Projects/youtube-board/platform/web`）、site.observe.tw（網站雷達，`~/Projects/traffic.observe.tw/src/style.css`）、puma-academic.observe.tw（署名地圖，`~/Projects/puma-academic/src/*.css`）、live.observe.tw（入口）。線上截圖在 `docs/ui-climb/reference/`（tag.observe.tw 對機器人回 403，改截母站 tag.analysis.tw）。

## 1. 什麼讓它們是一家人

| 面向 | 家族共通做法 | 來源 |
| --- | --- | --- |
| 版面骨架 | 固定寬度置中欄（1152–1280 px），16–24 px 側邊 gutter；頂部 60 px 白色（深色為 zinc-950）導覽列，左 wordmark、中間一排文字分頁、右側搜尋框 + 主題切換 + 登入 | tag `SiteHeader.tsx`、yt `globals.css`、site `.site-inner` |
| 頁首 | 每頁一個 `h1`（24–34 px）+ 一行 `dek` 說明（13–14 px muted）+ 右側動作（下載 CSV、資料來源與計算方式），其下一列篩選工具列 | site `.page-head`、yt `.page-heading` |
| 色彩 | 中性色全部用 zinc（白／#0a0a0a 頁面、zinc-50/900 面板、zinc-200/800 線），一個品牌色做強調：tag 橘 `orange-600`、yt 紅 `#ff0000`、site 橘 `#c2410c`/`#fb923c`、puma 赭 `#c2541d`。語意色不與品牌色相撞（site 的藍綠留給陣營、puma 的青綠留給密度） | tag/yt `@theme inline`、site `:root` |
| 主題 | `data-theme="light|dark"` 掛在 `<html>`，paint 前由 inline script 決定；深色不是反相而是重新選色（強調色提亮、面板 zinc-900）。site 預設深色，其餘預設淺色 | tag `ThemeSync.tsx`、site `:root[data-theme="light"]` |
| 字體 | `"PingFang TC","Noto Sans TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui`；數字一律 `tabular-nums`；排名與 ID 用 `ui-monospace` | 四站 `--font-sans`、yt `.rank` |
| 密度 | 表格 14 px／行高 20 px、cell padding 5–8 px × 10–12 px；表頭 12 px muted 500；數字右對齊；首欄 sticky；手機首欄壓到 9.5 rem、橫向捲動後再縮到 5.5 rem | site `table`、tag `table-styles.ts` + `globals.css` |
| 大資料集的篩選 | 一列工具列：搜尋框（有放大鏡 icon）+ 幾個 `select-field`（標籤在框內、12 px muted）+ 套用／清除；可切換的 chip 列（`全部來源` 高亮、每個 chip 後帶數量）；結果計數行「已收錄 30 個網站・2026 年 10 月」 | site 首頁、yt `/channels` |
| 排行榜 | `#` 欄 40 px 置中 muted、主體欄有 favicon/頭像 + 名稱 + 次要資訊（網域／分類）、指標欄右對齊、區間變化 sparkline（64×24）+ 上下色 delta（`--up` 綠、`--down` 玫紅）。首頁排行只放前 10 並附「完整排行 →」 | site `.ranking-table`、tag 首頁、yt 首頁 |
| 圖表 | 無依賴的 inline SVG sparkline（`viewBox 0 0 96 32`、`preserveAspectRatio=none`、線 1.5 px、底下 12% 透明度填色、斷點斷線）；完整圖表才用 ECharts；長條圖用 flex + `height: var(--value)`，缺值畫虛線、部分資料半透明；每張圖下面有「查看數值表格」`<details>` | tag `Sparkline.tsx`、yt `Charts.tsx`、puma `traffic-chart.css` |
| 卡片 vs 表格 | 數字就用表格；敘述型內容（文章、議題）才用卡片。手機上「多數值欄的表格」保留橫向捲動 + sticky 首欄，「兩三欄的文字表」改 stack（`td[data-label]::before` 印出欄名） | tag `table-styles.ts` 註解、yt `cross-site-consistency.md` |
| 統計磚 | `.stats`/`.metrics`：面板底、1 px 線、12 px radius、label 12 px muted、數字 24–28 px 600 tabular、單位 11–13 px 跟在後面 | site `.stats`、yt `.metric` |
| 狀態 | 空狀態置中（粗體一句 + 13 px 說明 + 動作）、載入狀態是一顆強調色圓點 + 文字、「資料暫時無法取得」永遠和 0 分開顯示；導覽列下方 2 px 進度條表示換頁中 | site `.empty`、yt `ReportUI.tsx`、tag `NavPending.tsx` |
| 透明度 | 每頁有「本頁的資料來源與計算方式 ⓘ」、更新時間（台北時間）、資料範圍；footer 有資料與透明度、開發與聯絡兩欄 | yt 頁首、tag `SiteFooter.tsx` |
| 微文案 | 短、具體、台灣用語：「已收錄」「更新於」「套用」「清除」「下載 CSV」「本頁的資料來源與計算方式」「暫時無法取得」「目前頁面沒有資料」「← 上一頁／下一頁 →」 | 各站 |
| 觸控 | 工具列控制 38–44 px 高、`touch-action: manipulation`、`:focus-visible` 2–3 px 強調色外框 offset 2–4 px | yt `globals.css`、puma `style.css` |

puma-academic 補充了「視覺化資料」那一端：紙感底色（`--paper #f5f1e8`）、五階順序色（`--bin-0..4`）給縣市著色、圖例寫明統計口徑、地圖旁固定 16 px 側欄裝 4 格統計磚 + 文字說明 + 迷你長條圖。它證明家族允許暖色底，但其中性灰階、12 px 圖例字、`tabular-nums` 和「每張圖都有口徑說明」的規矩不變。

## 2. UniCourse 要採用的 token

品牌：保留 logo（`apps/web/static/unicourse.png`，紫色書本）與紫色 `#5630a5`。紫色在家族裡還沒人用，和 tag 橘、yt 紅、site 橘並排辨識度高。淺色底從現在的淡紫 `#f9f8fd` 改為家族的純白／zinc，紫色只留給連結、主要按鈕、選中狀態與圖表主序列，不再做整頁的紫色洗底。

### 2.1 色彩（`:root` 定義，`[data-theme="dark"]` 覆寫；對應 `@media (prefers-color-scheme: dark)` 時用 `:root:not([data-theme="light"])`）

| token | light | dark | 用途 |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | `#0a0a0a` | 頁面底 |
| `--panel` | `#fafafa` (zinc-50) | `#18181b` (zinc-900) | 面板、表格、統計磚 |
| `--panel-raised` | `#ffffff` | `#1f1f23` | 表頭、卡片 hover |
| `--line` | `#e4e4e7` (zinc-200) | `#27272a` (zinc-800) | 邊線、格線 |
| `--axis` | `#a1a1aa` (zinc-400) | `#3f3f46` (zinc-700) | 輸入框邊、軸線 |
| `--ink` | `#18181b` | `#ededed` | 主文字 |
| `--ink-2` | `#3f3f46` | `#d4d4d8` | 次文字 |
| `--muted` | `#62626c` | `#a1a1aa` | 標籤、表頭、註腳（淺色 ≥ 4.6:1 對白） |
| `--brand` | `#5630a5` | `#b79cf0` | 連結、主按鈕、選中、圖表主序列 |
| `--brand-ink` | `#472485` | `#c9b5f5` | 深色文字版強調（小字） |
| `--brand-wash` | `#efe9fb` | `#2b2440` | chip 選中底、hover 列、sparkline 填色 |
| `--brand-ring` | `#8a66d9` | `#9f82e6` | focus ring |
| `--up` | `#15803d` | `#4ade80` | 增加、已收錄 |
| `--down` | `#be123c` | `#fb7185` | 減少、受阻、刪除 |
| `--warn` | `#b45309` | `#f0b36b` | 部分、示範資料、名額替代 |
| `--warn-wash` | `#fef3c7` | `#3a2a16` | 示範 badge 底 |
| `--info` | `#1d4ed8` | `#93c5fd` | 規劃中、提問類型 |
| `--chip` | `#f4f4f5` | `#27272a` | 未選 chip、標籤 |
| `--table-head` | `#fafafa` | `#09090b` | 表頭底（不透明，sticky 時不透出） |
| `--hover-row` | `#f4f4f5` | `#1f1f23` | 列 hover |
| `--series-1..4` | `#5630a5` `#0e7490` `#b45309` `#be185d` | `#b79cf0` `#67e8f9` `#fbbf24` `#f9a8d4` | 多序列圖（學校比較）|
| `--seq-0..4` | `#f1ede3` `#d9d0f0` `#b39ae3` `#8160cf` `#5630a5` | `#27313a` `#3a2f55` `#5b4790` `#8a6ad0` `#b79cf0` | 順序色（覆蓋熱度條、系所規模）|

狀態色對 `/schools`：live→`--up`、partial→`--warn`、blocked→`--down`、planned→`--info`、none→`--muted`，底色用各色 12% 透明（深色 22%）。

### 2.2 字體與尺度

- `--font-sans: "PingFang TC","Noto Sans TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif`；`--font-mono: ui-monospace,"IBM Plex Mono",Menlo,monospace`（課號、排名、學期代碼）。
- 基準 15 px／行高 1.65（CJK 需要 ≥ 1.6）；表格 14 px／20 px；長文 15 px／1.8，寬度 ≤ 52 em。
- 尺度：`--t-xs 11px`（表格註、單位）、`--t-sm 12px`（表頭、label、chip）、`--t-base 14px`（表格、工具列）、`--t-md 15px`（正文）、`--t-lg 17px`（區塊標題 h3）、`--t-xl 20px`（h2）、`--t-2xl 24px`（頁首 h1）、`--t-3xl 28px`（統計磚數字）、`--t-hero 34px`（只在首頁 h1）。標題 `letter-spacing: -0.025em`、`text-wrap: balance`。
- 數字一律 `font-variant-numeric: tabular-nums`；千分位用 `Intl.NumberFormat('zh-TW')`。

### 2.3 間距、圓角、陰影

- 間距階：4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 px。頁面 gutter 16 px（手機）→ 24 px（≥ 640）；區塊間 24–32 px；表格 cell 6 × 10 px（手機 6 × 8）。
- 圓角：輸入與按鈕 8 px、chip 999、表格框與面板 12 px、統計磚 12 px、卡片 9 px。
- 陰影幾乎不用；只有 sticky 首欄被捲動時 `6px 0 8px -6px rgb(0 0 0/.25)`、帳號選單 `0 10px 24px rgb(0 0 0/.2)`。
- 內容欄 `max-width: 72rem`（1152 px）；首頁排行與 `/schools` 表格可用到 80 rem。

### 2.4 元件規格

**導覽列**：60 px、`position: sticky`、`bg/80 + backdrop-blur`；左 logo 28 px + 「UniCourse」wordmark（750 字重）；分頁「查課、學校、論壇」用底線 2 px 強調色標示現在頁；右側：全站搜尋框（桌機常駐 176 px、手機收成 icon）、主題切換（太陽／月亮）、登入或頭像選單。換頁時導覽列下緣 2 px 紫色進度條。

**頁首**：`h1` 24 px 600 + 同一行右側動作；下一行 `dek` 13 px muted，內含「更新於 11/27 04:00・台北時間・本頁的資料來源與計算方式 ⓘ」。

**工具列**：`display:flex; gap:10px; flex-wrap`；搜尋框 `flex:1 1 260px` 有放大鏡；`select-field` 把標籤放進框內（「學期 115-1 ▾」）；主要按鈕「套用」實心紫 38 px，旁邊文字連結「清除」。手機上超過兩個 select 時收進 `<details>`「篩選與排序 +」。

**chip 列**：`全部學校 9`、`已收錄 9`、`部分 1`…；選中為實心 brand，未選 `--chip` 底；可同時當篩選與統計。

**表格**：`table-frame`（1 px 線、12 px 圓角、`overflow:hidden`、面板底）+ 內層 `.scroll`（`overflow-x:auto; scrollbar-width:thin`）；`thead th` 不透明、sticky top 下拉跟隨；`#` 欄 40 px；首欄 sticky；數字欄右對齊；列 hover 換底；可排序欄表頭是 button + `↕/↓` 箭頭；手機顯示「左右捲動表格可查看其餘欄位。」一行。兩三欄文字表用 `table-stack`。

**統計磚**：`repeat(auto-fit, minmax(170px, 1fr))`；數字 28 px 600、單位 13 px muted、標籤 12 px muted 在上。

**sparkline**：inline SVG 96×32、`preserveAspectRatio="none"`、`aria-hidden`、線 1.5 px brand、底填 brand 12%、缺值斷線、單點畫圓點；旁邊一定有數字與 delta（圖只是輔助）。

**長條／排行條**：在數字欄左側畫 `height: 10px; width: calc(value/max*100%)` 的圓角條（brand，第 1–3 名實心、其餘 brand 60%）；條以同一尺度繪製，條後接數字。

**badge**：`padding 1px 7px; radius 999; font 12px/18px 600`；示範資料用 `--warn`。

**表單**：label 12 px muted 在上、輸入 38–44 px、radius 8、邊 `--axis`、focus 2 px brand ring；錯誤訊息紅底 `role="alert"`，成功綠底 `role="status"`；按鈕主要實心紫、次要白底紫框、危險白底紅字。

**空／載入／錯誤**：見 `storyboards/states.md`。

### 2.5 不要做的事

- 不用整頁紫色漸層（舊 realm 的 `bg-uni`），不用 daisyUI 風格膠囊按鈕。
- 不用卡片堆疊顯示數字型清單（課程列表要變表格）。
- 不在手機上隱藏數據；用 sticky 首欄 + 橫捲，或 stack。
- 不把「沒有資料」畫成 0；缺值一律 `—` 加說明。

## 3. UniCourse 的品牌記號

- 紫色 `#5630a5`：連結、主按鈕、chip 選中、排行條、sparkline、進度條、`aria-current` 底線。深色用 `#b79cf0`。
- logo：28 px 在導覽列，首頁 masthead 放 56 px 版本；主題切換時不換圖（logo 本身是紫色書本，兩種底都可讀）。
- 一句品牌說明用在首頁 masthead 與 footer：「跨校查課，看十年修課人數。」
- 語氣：和家族一樣是「觀測站」口吻（已收錄、更新於、口徑說明），不是校務系統口吻（請、務必、注意）。

## 4. 實作切入點（給設計系統 pass）

1. `apps/web/src/app.html` 加入 paint 前主題腳本（讀 `localStorage.theme` 否則 `prefers-color-scheme`）並設 `data-theme`。
2. 新增 `apps/web/src/lib/tokens.css`（上表 token）與 `apps/web/src/lib/ui.css`（nav、page-head、toolbar、chips、table-frame、stats、badge、form、states 類別），`+layout.svelte` 匯入；逐頁移除寫死的 `#5630a5`、`#e5dfef`、`#594f69`。
3. 新元件：`Sparkline.svelte`（純 SVG）、`BarCell.svelte`、`DataTable.svelte`（frame + scroll + sticky 首欄 + 手機提示）、`StatTiles.svelte`、`PageHead.svelte`、`Toolbar.svelte`、`ThemeToggle.svelte`、`EmptyState.svelte`。
4. `static/landscape.html` 已經用了同一套 token 名稱（`--bg/--surface/--fg/--muted/--line/--accent`），把它的值對齊上表即可。
