# 北藝大課程爬蟲 (`tnua`)

## 來源與存取

- 官方「[課程暨課程大綱查詢](https://academic.tnua.edu.tw/index.php/zh/all-student-campus-learning/business-team/member-item-2/grade-inquiry-5)」連到[課程查詢首頁](https://selcrs1.tnua.edu.tw/CourseSearch/HomeCatalogue.aspx)。使用[進階查詢](https://selcrs1.tnua.edu.tw/CourseSearch/AdvancedSearch.aspx)提供的學期、開課單位選項，以及頁面本身呼叫的 `POST AdvancedSearch.aspx/SearchClass` JSON；不自行查詢介面未開放的不限條件模式。
- 不需登入、驗證碼、憑證或 WebForms postback 欄位；HTML/JSON 為 UTF-8。`https://selcrs1.tnua.edu.tw/robots.txt` 回傳 HTTP 404；課程首頁及進階查詢未見專屬使用條款。以上於 2026-11-27 查核。
- 預設逐一查詢該頁公布的開課單位，再使用頁面提供的全英語篩選器標註授課語言；串行、至少 400 ms 間隔。另外固定補查 `CA071`（見下方「十年回填」）；全英語結果若出現下拉選單以外的單位代碼，亦以 `CA<DepName>` 補查。`115-1` 有 47 個單位篩選值，合計 50 次邏輯請求、約 1,790 筆，約 20 秒；`--limit 20` 為 3～4 次請求、約 1 秒。不含重試。
- `114-2`、`114-1`、`113-2`、`113-1` 均可透過官方學期下拉選單查詢。每筆課程會核對回傳的學年、學期及課程編號前綴。

## 十年回填（105-1 ～ 114-2）

- 官方學期下拉選單最舊到 `100-1`（亦有 `114-暑修`），`105-1`～`112-2` 全數可查，與新學期同一個端點與格式，不需要另一套解析。於 2026-11-27 以 `105-1`～`112-2` 逐期爬取，每期 50 次邏輯請求、約 20 秒，16 期全數成功（`100-1`～`104-2` 官網亦有，但不在回填目標內，尚未爬取）。
- 課程數 1,502（106-2）～1,766（111-1）；每一筆皆有 `enrolled`（官網 `SumSelected`）。時段代號沿用同一組（`1`–`13`、`M`、`N`），舊學期未見其他節次代碼；`109-1`、`110-1` 因剛好沒有 `M` 節課而缺 `M`，非格式差異。
- **下拉選單缺漏的單位**：單位代碼 `071`（查詢參數 `CA071`，官網未公布單位名稱，故 `department` 省略，只填 `departmentCode`）在 `105-1`～`109-2` 開有課（每期 8–25 筆，例如「專業實習」「爵士大樂團」），但不在單位下拉選單中，一般以單位逐一查詢會漏掉；最初 `108-1`、`109-1`、`109-2` 的全英語篩選結果就出現這些課，導致「全英語課程不在單位結果中」而失敗。現在 `crawler.ts` 固定補查 `supplementalUnits`（`CA071`；`110-1` 起查無資料，不影響結果）並動態補查全英語結果中出現的其他單位代碼。若還有「既不在下拉選單、又沒有全英語課程」的單位，則無法從公開介面發現，屬已知缺口。
- 不限單位的查詢（`Colnum` 空白）伺服器回傳錯誤，因此無法用來交叉比對總筆數。
- 其他注意：單位名稱一律取自現行下拉選單，不另外還原舊學期的單位名稱；各期有課的單位數由 39（105-1）增至 42–46（110-1 起）。

## 欄位對應

| 官方欄位／介面 | 快照欄位 | 轉換方式 |
| --- | --- | --- |
| 課程編號 `CourseID` | `sourceId`, `courseCode` | 保留完整當期編號（如 `1151-1110001`）。未公開可驗證的跨學期科目代碼，同一編號尾碼在不同學期可指不同科目，不用尾碼合併。 |
| 科目名稱 `CourseName` | `title`, `titleEn` | 按來源的 `&nbsp` 分開；未刊登英文名稱便省略。 |
| 授課教師 `Teacher` | `instructors` | 按清單分隔符拆分，保留名字內的空格。 |
| 開課單位下拉選項 | `department`, `departmentCode` | 採用網站公開的單位名稱及篩選代碼，例如 `CA111`。 |
| 學分 `Credit`、必選修 `Type` | `credits`, `requirement`, `requirementText` | 保留小數學分及原始必選修文字。 |
| 時段 `Sect`、教室 `Room` | `schedule`, `scheduleText` | 原文分隔存入 `scheduleText`；可解析時保留星期與校方節次（含 `N`）。「師生商定」不編造時間，多個教室未明示配對時不填 `location`。 |
| 選課上限 `UpLimit` | `capacity` | 數字照錄（含 0）；但上限 0 而已有選課人數（室內樂、主修、獨立研究等由系所加選）時不視為名額而省略；`無` 等文字保留於 `extra.上限`。 |
| 已選 `SumSelected` | `enrolled` | 照錄官網已選人數（含 0）；無有效數值則省略，與選課上限無關。 |
| 「全英語授課」搜尋結果 | `language` | 僅標註公開篩選結果確認的 `全英語授課`，不推定其他課程的授課語言。 |
| 備註 `Remark` | `notes` | 保留文字；移除電子郵件及手機號碼。 |
| `Field`、`Target` | `extra` | `領域`、`選課對象`、`學期別`。`領域` 解碼 HTML 實體（`&amp;`）、去重並以 `、` 連接。 |
| 大綱彈窗 `PageGetIntroduction` | `description` | 僅擷取可辨識的課程簡介；`UNICOURSE_TNUA_DETAILS=1` 才逐門查詢，每門增加一次請求。 |
| 進階查詢頁 | `sourceUrl` | 彈窗沒有可分享的大綱網址，故 `syllabusUrl` 不填。 |

缺少獨立班次、年級、校區及穩定跨期科目代碼。不要對全學期排程開啟 `UNICOURSE_TNUA_DETAILS`；`115-1` 會額外產生 1,791 次請求。未發現本機網路遇到封鎖；未測試資料中心 IP。若學期不在官方選項中，指令明確失敗，不會以他期資料覆寫。

```sh
corepack pnpm --filter @unicourse/crawler-tnua crawl -- --term 115-1 --out "$PWD/snapshots/tnua-115-1.json"
corepack pnpm --filter @unicourse/crawler-tnua test
corepack pnpm --filter @unicourse/crawler-tnua check
```
