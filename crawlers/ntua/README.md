# 臺藝大推廣教育學分班爬蟲 (`ntua`)

**這是公開招生的學分班子集（含部分隨班附讀），不是臺藝大全校課表。不要加入全校權威匯入或正式排程，也不要用 `snapshots/*.json` 將它與完整快照一起匯入。** 匯入器會停用本次快照未列出的課程。資料範圍已標註於 `source.name` 和每筆 `extra.資料範圍`。

## 來源及存取

- 使用[推廣教育中心「學分課程」](https://eec.ntua.edu.tw/Course/Credit)及[前期課程查詢](https://eec.ntua.edu.tw/PastCourse/Search)發布的公開學士、碩士學分期別；不收錄非學分推廣或短期研修。按網站標示期別歸學期（例如官網將 7–10 月的暑期學士學分班標為 `115-1`）。兩區均可免登入以 UTF-8 HTML 查詢，只有報名需要帳號。該主機 `robots.txt` 回傳 HTTP 404；查核[相關法規](https://eec.ntua.edu.tw/Regulations)，其中的辦法與招生、修課及收退費有關，未見另列網站存取條款。查核日期：2026-11-27。
- [教務處「選課及成績系統」](https://aca.ntua.edu.tw/article.aspx?ca=32&id=32)轉至 `https://uaap.ntua.edu.tw/ntua/`。教務處[選課說明](https://aca.ntua.edu.tw/upload/file/202606080354423D.pdf)的登入流程將「全校課表」列在登入後的校務行政系統；`https://uaap.ntua.edu.tw/robots.txt` 明列 `User-agent: *`、`Disallow: /`。未登入，也未爬取此系統。
- [教務處「課程地圖」](https://aca.ntua.edu.tw/catalog.aspx?ca=300)和[課程科目學分表](https://aca.ntua.edu.tw/catalog.aspx?ca=209)是各系修業規劃，不是有當期班次的全校課表；[選課規定及流程](https://aca.ntua.edu.tw/article.aspx?ca=232&id=172)及其 PDF 也是流程說明而不是完整開課一覽。`https://ap.ntua.edu.tw/` 回傳「Request Rejected」，`web.ntua.edu.tw` 無法解析；未找到可用的全校免登入資料。
- 一次串行請求、至少 400 ms 間隔。`115-1` 公開子集是六個現行期別與一個已歸檔期別，共 156 筆（含 4 筆歸檔）。完整版 175 次邏輯請求（2 次索引、17 次清單分頁、156 次詳情），約 76 秒；`--limit 20` 為 26 次請求、約 12 秒。不含重試。`UNICOURSE_NTUA_LIST_ONLY=1` 或結果超過 250 筆時略過詳情。未發現本機網路遇到封鎖；未測試資料中心 IP。

## 欄位對應

| 官方欄位／介面 | 快照欄位 | 轉換方式 |
| --- | --- | --- |
| 課程詳情頁網址數字 | `sourceId`, `courseCode`, `sourceUrl` | 使用官方報名班次 ID；未公布可驗證的跨期科目代碼。現行及歸檔各用對應的詳情頁。 |
| 課程名稱 | `title` | 包含官方標記（如 `[隨]`），不混入報名狀態。 |
| 授課老師、開課系所／開課單位 | `instructors`, `department` | 拆分多位教師；未公開教師留空陣列。 |
| 課程時間、上課教室 | `schedule`, `scheduleText` | 原文另存；星期搭配公開的時鐘區間（如 `14:10-17:00`），不臆造節次。 |
| 招生名額、學分/時數 | `capacity`, `credits`, `extra.時數` | 從詳情讀取，使用該班次的推廣招生名額，非大學部選課名額。 |
| — | `enrolled`（省略） | 推廣課程詳情未刊登實際報名／修課人數；招生名額及報名狀態不是人數。未查詢受限制的全校系統。 |
| 課程概要、大綱段落 | `description`, `syllabusUrl` | 取可見課程概要為純文字、不收錄師資履歷；有大綱段落時連到同一詳情頁。 |
| 課程日期、課程費用、報名狀態、期別、學年/學期 | `extra` | 保留網站欄位及文字，另以 `資料範圍` 標明僅推廣學分班。 |

本來源未發布獨立跨學期科目代碼、英文名稱、系所代碼、年級、必選修類別、授課語言、校區、正式班次代碼或備註欄。僅抓取官方公開索引所列的期別；找不到所指定的期別時明確失敗，不以其他學期代替。

`114-2`、`114-1`、`113-2`、`113-1` 不補抓：本來源僅是推廣學分班子集，無法作為全校歷史快照。

```sh
corepack pnpm --filter @unicourse/crawler-ntua crawl -- --term 115-1 --out "$PWD/snapshots/ntua-115-1.json"
corepack pnpm --filter @unicourse/crawler-ntua test
corepack pnpm --filter @unicourse/crawler-ntua check
```
