# 北藝大課程爬蟲 (`tnua`)

## 來源與存取

- 官方「[課程暨課程大綱查詢](https://academic.tnua.edu.tw/index.php/zh/all-student-campus-learning/business-team/member-item-2/grade-inquiry-5)」連到[課程查詢首頁](https://selcrs1.tnua.edu.tw/CourseSearch/HomeCatalogue.aspx)。使用[進階查詢](https://selcrs1.tnua.edu.tw/CourseSearch/AdvancedSearch.aspx)提供的學期、開課單位選項，以及頁面本身呼叫的 `POST AdvancedSearch.aspx/SearchClass` JSON；不自行查詢介面未開放的不限條件模式。
- 不需登入、驗證碼、憑證或 WebForms postback 欄位；HTML/JSON 為 UTF-8。`https://selcrs1.tnua.edu.tw/robots.txt` 回傳 HTTP 404；課程首頁及進階查詢未見專屬使用條款。以上於 2026-11-27 查核。
- 預設逐一查詢該頁公布的開課單位，再使用頁面提供的全英語篩選器標註授課語言；串行、至少 400 ms 間隔。`115-1` 有 47 個單位篩選值，合計 49 次邏輯請求、1,791 筆，約 19 秒；`--limit 20` 為 3 次請求、約 1 秒。不含重試。
- `114-2`、`114-1`、`113-2`、`113-1` 均可透過官方學期下拉選單查詢。每筆課程會核對回傳的學年、學期及課程編號前綴。

## 欄位對應

| 官方欄位／介面 | 快照欄位 | 轉換方式 |
| --- | --- | --- |
| 課程編號 `CourseID` | `sourceId`, `courseCode` | 保留完整當期編號（如 `1151-1110001`）。未公開可驗證的跨學期科目代碼，同一編號尾碼在不同學期可指不同科目，不用尾碼合併。 |
| 科目名稱 `CourseName` | `title`, `titleEn` | 按來源的 `&nbsp` 分開；未刊登英文名稱便省略。 |
| 授課教師 `Teacher` | `instructors` | 按清單分隔符拆分，保留名字內的空格。 |
| 開課單位下拉選項 | `department`, `departmentCode` | 採用網站公開的單位名稱及篩選代碼，例如 `CA111`。 |
| 學分 `Credit`、必選修 `Type` | `credits`, `requirement`, `requirementText` | 保留小數學分及原始必選修文字。 |
| 時段 `Sect`、教室 `Room` | `schedule`, `scheduleText` | 原文分隔存入 `scheduleText`；可解析時保留星期與校方節次（含 `N`）。「師生商定」不編造時間，多個教室未明示配對時不填 `location`。 |
| 選課上限 `UpLimit` | `capacity` | 數字照錄（含 0）；`無` 等文字保留於 `extra.上限`。 |
| 已選 `SumSelected` | `enrolled` | 照錄官網已選人數（含 0）；無有效數值則省略，與選課上限無關。 |
| 「全英語授課」搜尋結果 | `language` | 僅標註公開篩選結果確認的 `全英語授課`，不推定其他課程的授課語言。 |
| 備註 `Remark` | `notes` | 保留文字；移除電子郵件及手機號碼。 |
| `Field`、`Target` | `extra` | `領域`、`選課對象`、`學期別`。 |
| 大綱彈窗 `PageGetIntroduction` | `description` | 僅擷取可辨識的課程簡介；`UNICOURSE_TNUA_DETAILS=1` 才逐門查詢，每門增加一次請求。 |
| 進階查詢頁 | `sourceUrl` | 彈窗沒有可分享的大綱網址，故 `syllabusUrl` 不填。 |

缺少獨立班次、年級、校區及穩定跨期科目代碼。不要對全學期排程開啟 `UNICOURSE_TNUA_DETAILS`；`115-1` 會額外產生 1,791 次請求。未發現本機網路遇到封鎖；未測試資料中心 IP。若學期不在官方選項中，指令明確失敗，不會以他期資料覆寫。

```sh
corepack pnpm --filter @unicourse/crawler-tnua crawl -- --term 115-1 --out "$PWD/snapshots/tnua-115-1.json"
corepack pnpm --filter @unicourse/crawler-tnua test
corepack pnpm --filter @unicourse/crawler-tnua check
```
