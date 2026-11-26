# crawler-tvc: 大學校院 / 技職校院課程資源網

One crawler for the Ministry of Education's national course platforms, which every institution fills
in with the 教育部 填報程式 (course upload tool). It writes **one snapshot per school per term**,
`snapshots/tvc/<slug>-<term>.json`, for every school that has no crawler of its own.

| | 大學校院課程資源網 | 技職校院課程資源網 |
| --- | --- | --- |
| Entry | <https://course-tvc.yuntech.edu.tw/web_nu/search_course.aspx> | <https://course-tvc.yuntech.edu.tw/web_nt/search_course.aspx> |
| Schools | universities and colleges of the general system | 科技大學, 技術學院, 專科學校 |
| Operator | 教育部 (高教司), run by 國立雲林科技大學課程工作小組 (ddpc@yuntech.edu.tw, 05-537-2747) | 教育部技職司, same team |

Both are the same ASP.NET WebForms application, Big5 pages. `https://ucourse-tvc.yuntech.edu.tw/webu/`
(the URL search engines show) resets connections from here; the same pages answer on
`course-tvc.yuntech.edu.tw`.

## Access check (2026-11-27)

- `https://course-tvc.yuntech.edu.tw/robots.txt` → 404 (no robots rules). No terms of use or
  anti-automation notice on the site (checked 首頁, 常見問題, 下載專區, 網站導覽). Login-free.
- `https://course-tvc.yuntech.edu.tw/web_nu/` → **403** `您沒有檢視此目錄或網頁的權限。` for every
  User-Agent, including a browser one: it is IIS refusing a directory listing (no default
  document), not a bot block. `web_nu/index.aspx` does not exist (302 to `FileNotFound.htm`); the
  pages live at `web_nu/search_*.aspx`, linked from `webU/index.aspx`.
- The crawler identifies as `UniCourseBot/0.1 (+https://unicourse.observe.tw; …)` (kit default)
  and never received a 403/429 during the crawls below.
- There is no bulk download or open-data file (下載專區 only has the upload tool). The page's own
  匯出 button (Excel / Csv / Ods) exports the full result of a query, which is what this crawler uses.
  The **CSV export is malformed** (fields with commas are not quoted), so the crawler takes **XLSX**.

## How a school/term is fetched

Per school and term, in one WebForms session (cookie jar per session):

1. `GET search_course.aspx` (hidden `__VIEWSTATE`, `__EVENTVALIDATION`, `ctl00$hfCSRFToken`).
2. `POST` the search: 學年度 `YearDDL`, 學期 `TermDDL` (1 上, 2 下, 3 暑期, 9 其他), 學校名稱
   `SBI5$TB` = MOE school name (Big5 form encoding), `__EVENTTARGET=…$SubmitQueryBtn`. The 總計 row
   gives 課程數 / 系所數 / 校數; 0 means the school has nothing on this platform.
3. `POST` `ExportBtn` with 匯出格式 `xlsx`: starts a server-side job.
4. `POST` the job's `Progress_Timer` every 3 s until 進度 reads 處理完畢 (usually 5–8 polls).
5. `POST` `DownFileBtn` → the `.xlsx` (sheet 1 totals, sheet 2 one row per course).

Partial rendering is disabled on the site, so every postback returns the full ~550 KB page:
about **11 requests, 6 MB and 30 s per school** (median; up to 23 requests, 14 MB, 71 s). Technical schools are searched on
`web_nt` first, others on `web_nu`; if the first finds nothing the other is tried (2 more requests).
Limits: one request at a time per session, ≥ 1 s apart (`HTTP_OPTIONS`), at most two sessions in
parallel (`--workers`, default and maximum 2), kit retries with back-off on 429/5xx.

```sh
just crawl-tvc --term 115-1                     # every eligible school -> snapshots/tvc/
just crawl-tvc --term 115-1,114-2 --school nsysu,tku --report /path/report.json
corepack pnpm --filter @unicourse/crawler-tvc crawl -- --term 115-1 --school nsysu --limit 20 --out-dir /tmp/x  # preview
cargo run -p unicourse-ingest -- snapshots/tvc
```

`--report` writes per-school results (offerings, platform course count, requests, bytes, seconds,
errors) as JSON. The process exits 1 when any school failed; the other snapshots are still written.

## Which schools

`src/schools.ts` `eligibleSchools()`: every institution in `data/institutions.json` whose
`crawlers/status.json` entry is missing or has `"source": "tvc"`. Schools crawled by their own package
(an entry without `source`, e.g. `ntu`, `nthu`, `ntua`) are never written, so **the dedicated crawler
always wins** and a national snapshot can never overwrite a direct one. NCKU (CAPTCHA) and NCU
(robots.txt on the school's own system) keep their blocked packages but are marked `source: "tvc"`.

Rows are kept only when 校名 equals the MOE name after normalisation (台→臺, and a
`…學校財團法人` foundation prefix dropped, e.g. `淡江大學學校財團法人淡江大學`). `FORMER_NAMES` lists
earlier names of renamed schools (unverified hints, searched only when the current name finds nothing)
for crawling past years.

## Years

The 學年度 menu covers **86–115** on both platforms, with 上學期, 下學期, 暑期 and 其他. Checked: 國立中山大學
105-1 returns 2,146 courses, so history back to 105 is available. 115-2 will appear once schools
upload it (the 115-1 data was uploaded in October 2026).

## Field mapping

Platform column (XLSX header) → snapshot field.

| platform | snapshot | notes |
| --- | --- | --- |
| 課號 | `courseCode`, `sourceId` | The school's own code. Repeated codes (sections) become `<code>#1…n`, ordered by department, grade, instructors, title, 系統序號. Without a 課號: `<department>/<title>`. |
| 課程名稱 | `title` | No English title in the export. |
| 開課老師 | `instructors` | Split on `,，、;；/`; placeholders (無, 0, 待聘, …) dropped. |
| 系所名稱 (大學) / 科系 (技職) | `department` | No department code. |
| 學分數 | `credits` | |
| 必選修_ | `requirementText`; `requirement` | `general` when 科目類別 contains 通識. |
| 總修課人數 | `enrolled` | Students enrolled when the school uploaded (usually after add/drop). |
| _授課語言 | `language` | |
| 年級 | `grade` | `0` (不分年級) omitted. |
| 課程大綱 | `description` | Placeholders such as 依規定免登, 詳參課程連結 omitted. |
| 課程連結 | `syllabusUrl` | Only when an http(s) URL; other text goes to `extra.課程連結`. |
| 備註 | `notes` | |
| 學院名稱, 系所/科系英文名稱, 學程, 部別, 學制 / 學制學程, 部校訂, 半全年, 科目類別, 教學型態, 全英語教學, 跨校選修, 系科屬性, 遠距教學提供字幕, 男/女/其他學生修課人數, 系統序號 | `extra` | Original names without the export's `_` markers. |
| — | `sourceUrl` | The platform's search page (results have no per-course URL; details open by postback). |

`source.name` is 大學校院課程資源網 or 技職校院課程資源網, so provenance is visible on every snapshot.

## Known gaps (compared with a school's own crawler)

- **No meeting times or rooms** (`schedule` / `scheduleText`), **no capacity**, no English title,
  no department code, no campus.
- The data is a periodic upload: a school's numbers are those of its upload date (see 建立時間), not
  live; schools that have not uploaded a term are missing for that term.
- `sourceUrl` is the search page, not a course page.
- Courses without a 課號 get a synthetic code from department and title, so cross-term grouping is
  weaker for those schools.

## Crawl results (2026-11-27)

All 140 eligible schools, two sessions in parallel, from this machine:

| term | snapshots | offerings | requests | transferred | wall time |
| --- | ---: | ---: | ---: | ---: | ---: |
| 115-1 | 137 | 191,907 | 1,566 | 855 MB | 38.5 min |
| 114-2 | 137 | 189,016 | 1,535 | 834 MB | ~38 min |
| 114-1 | 137 | 196,957 | 1,537 | 836 MB | ~38 min |

Per school and term: 4–23 requests (median 11), 2.1–13.6 MB (median 5.9), 16–71 s (median 31). No school failed
and no response was a 403 (the kit retries 429/5xx without logging them, so silent retries are not
counted). Three institutions have nothing on either platform in any of these terms and get no
snapshot: 國立空中大學 `nou`, 高雄市立空中大學 `ouk` (the open universities do not report there) and
一貫道天皇學院 `iktc` (closed August 2025). Importing a term (137 snapshots) takes about 10–15 min.

Field coverage across the three terms:

| field | share of offerings |
| --- | --- |
| 課號 | 100% |
| enrolled | 100% |
| requirement | 100% |
| credits | 100% |
| instructors | 100% |
| description | 100% |
| language | 73% |
| syllabusUrl | 61% |

Total 577880 offerings.

| code | school | slug | platform | 115-1 | 114-2 | 114-1 |
| --- | --- | --- | --- | ---: | ---: | ---: |
| 0005 | 國立成功大學 | `ncku` | 大學 | 4,556 | 4,156 | 4,568 |
| 0008 | 國立中央大學 | `ncu` | 大學 | 2,099 | 2,013 | 2,089 |
| 0009 | 國立中山大學 | `nsysu` | 大學 | 2,526 | 2,449 | 2,543 |
| 0012 | 國立臺灣海洋大學 | `ntou` | 大學 | 1,309 | 1,972 | 2,446 |
| 0014 | 國立高雄師範大學 | `nknu` | 大學 | 2,012 | 2,001 | 2,011 |
| 0015 | 國立彰化師範大學 | `ncue` | 大學 | 1,683 | 1,647 | 1,698 |
| 0017 | 國立臺北大學 | `ntpu` | 大學 | 3,880 | 3,803 | 3,433 |
| 0018 | 國立嘉義大學 | `ncyu` | 大學 | 2,656 | 2,493 | 2,675 |
| 0019 | 國立高雄大學 | `nuk` | 大學 | 1,269 | 1,235 | 1,266 |
| 0020 | 國立東華大學 | `ndhu` | 大學 | 1,992 | 1,906 | 2,028 |
| 0021 | 國立暨南國際大學 | `ncnu` | 大學 | 1,284 | 1,241 | 1,341 |
| 0022 | 國立臺灣科技大學 | `ntust` | 技職 | 2,014 | 1,945 | 1,948 |
| 0023 | 國立雲林科技大學 | `yuntech` | 技職 | 1,768 | 1,649 | 1,761 |
| 0024 | 國立屏東科技大學 | `npust` | 技職 | 2,888 | 2,684 | 2,899 |
| 0025 | 國立臺北科技大學 | `ntut` | 技職 | 2,419 | 2,506 | 2,514 |
| 0030 | 國立臺東大學 | `nttu` | 大學 | 1,292 | 1,258 | 1,264 |
| 0031 | 國立宜蘭大學 | `niu` | 大學 | 1,136 | 1,073 | 1,139 |
| 0032 | 國立聯合大學 | `nuu` | 大學 | 1,779 | 1,710 | 1,868 |
| 0033 | 國立虎尾科技大學 | `nfu` | 技職 | 2,267 | 2,161 | 2,290 |
| 0035 | 國立臺南藝術大學 | `tnnua` | 大學 | 621 | 650 | 665 |
| 0036 | 國立臺南大學 | `nutn` | 大學 | 1,153 | 1,147 | 1,183 |
| 0037 | 國立臺北教育大學 | `ntue` | 大學 | 1,430 | 1,395 | 1,450 |
| 0039 | 國立臺中教育大學 | `ntcu` | 大學 | 1,380 | 1,418 | 1,411 |
| 0042 | 國立澎湖科技大學 | `npu` | 技職 | 556 | 537 | 851 |
| 0043 | 國立勤益科技大學 | `ncut` | 技職 | 2,530 | 2,480 | 2,606 |
| 0044 | 國立體育大學 | `ntsu` | 大學 | 592 | 587 | 599 |
| 0046 | 國立臺北護理健康大學 | `ntunhs` | 技職 | 1,240 | 1,002 | 1,217 |
| 0047 | 國立高雄餐旅大學 | `nkuht` | 技職 | 972 | 1,121 | 1,148 |
| 0048 | 國立金門大學 | `nqu` | 大學 | 902 | 879 | 894 |
| 0049 | 國立臺灣體育運動大學 | `ntus` | 大學 | 866 | 829 | 872 |
| 0050 | 國立臺中科技大學 | `nutc` | 技職 | 2,949 | 3,137 | 3,146 |
| 0051 | 國立臺北商業大學 | `ntub` | 技職 | 2,371 | 2,365 | 2,186 |
| 0052 | 國立屏東大學 | `nptu` | 大學 | 2,066 | 1,997 | 2,055 |
| 0053 | 國立高雄科技大學 | `nkust` | 技職 | 4,973 | 4,913 | 5,117 |
| 0144 | 國立臺灣戲曲學院 | `tcpa` | 技職 | 189 | 195 | 184 |
| 0221 | 國立臺南護理專科學校 | `ntin` | 技職 | 512 | 489 | 506 |
| 0222 | 國立臺東專科學校 | `ntc` | 技職 | 221 | 215 | 198 |
| 1001 | 東海大學 | `thu` | 大學 | 2,798 | 2,776 | 2,826 |
| 1002 | 輔仁大學 | `fju` | 大學 | 5,317 | 5,297 | 5,375 |
| 1003 | 東吳大學 | `scu` | 大學 | 2,704 | 2,638 | 2,759 |
| 1004 | 中原大學 | `cycu` | 大學 | 2,947 | 2,882 | 2,943 |
| 1005 | 淡江大學 | `tku` | 大學 | 3,831 | 3,760 | 3,997 |
| 1006 | 中國文化大學 | `pccu` | 大學 | 3,563 | 3,720 | 3,819 |
| 1008 | 靜宜大學 | `pu` | 大學 | 1,872 | 1,769 | 1,799 |
| 1009 | 長庚大學 | `cgu` | 大學 | 1,851 | 1,735 | 1,886 |
| 1010 | 元智大學 | `yzu` | 大學 | 1,551 | 1,493 | 1,582 |
| 1011 | 中華大學 | `chu` | 大學 | 495 | 599 | 621 |
| 1012 | 大葉大學 | `dyu` | 大學 | 954 | 949 | 996 |
| 1013 | 華梵大學 | `hfu` | 大學 | 303 | 334 | 296 |
| 1014 | 義守大學 | `isu` | 大學 | 1,955 | 2,002 | 2,102 |
| 1015 | 世新大學 | `shu` | 大學 | 1,788 | 1,749 | 1,820 |
| 1016 | 銘傳大學 | `mcu` | 大學 | 2,929 | 2,943 | 2,981 |
| 1017 | 實踐大學 | `usc` | 大學 | 2,172 | 2,166 | 2,274 |
| 1018 | 朝陽科技大學 | `cyut` | 技職 | 2,264 | 2,158 | 2,256 |
| 1019 | 高雄醫學大學 | `kmu` | 大學 | 1,457 | 1,398 | 1,464 |
| 1020 | 南華大學 | `nhu` | 大學 | 1,001 | 977 | 1,053 |
| 1021 | 真理大學 | `au` | 大學 | 642 | 742 | 739 |
| 1022 | 大同大學 | `ttu` | 大學 | 781 | 771 | 804 |
| 1023 | 南臺科技大學 | `stust` | 技職 | 2,470 | 2,560 | 2,649 |
| 1024 | 崑山科技大學 | `ksu` | 技職 | 2,075 | 2,088 | 2,182 |
| 1025 | 嘉南藥理大學 | `cnu` | 技職 | 2,161 | 2,141 | 2,146 |
| 1026 | 樹德科技大學 | `stu` | 技職 | 1,917 | 2,006 | 2,088 |
| 1027 | 慈濟大學 | `tcu` | 大學 | 1,466 | 1,495 | 1,540 |
| 1028 | 臺北醫學大學 | `tmu` | 大學 | 1,596 | 1,425 | 1,562 |
| 1029 | 中山醫學大學 | `csmu` | 大學 | 1,517 | 1,457 | 1,509 |
| 1030 | 龍華科技大學 | `lhu` | 技職 | 2,047 | 1,894 | 2,142 |
| 1031 | 輔英科技大學 | `fy` | 技職 | 1,684 | 1,686 | 1,658 |
| 1032 | 明新科技大學 | `must` | 技職 | 1,819 | 1,786 | 1,932 |
| 1033 | 長榮大學 | `cjcu` | 大學 | 1,019 | 1,010 | 1,107 |
| 1034 | 弘光科技大學 | `hk` | 技職 | 2,359 | 2,132 | 2,371 |
| 1035 | 中國醫藥大學 | `cmu` | 大學 | 1,653 | 1,602 | 1,644 |
| 1036 | 健行科技大學 | `uch` | 技職 | 1,348 | 1,391 | 1,469 |
| 1037 | 正修科技大學 | `csu` | 技職 | 3,242 | 3,229 | 3,196 |
| 1038 | 萬能科技大學 | `vnu` | 技職 | 1,841 | 1,508 | 1,591 |
| 1039 | 玄奘大學 | `hcu` | 大學 | 387 | 369 | 384 |
| 1040 | 建國科技大學 | `ctu` | 技職 | 762 | 812 | 815 |
| 1041 | 明志科技大學 | `mcut` | 技職 | 1,166 | 1,038 | 1,138 |
| 1042 | 台鋼科技大學 | `kyu` | 技職 | 503 | 499 | 516 |
| 1043 | 大仁科技大學 | `tajen` | 技職 | 1,006 | 886 | 890 |
| 1044 | 聖約翰科技大學 | `sju` | 技職 | 248 | 210 | 246 |
| 1045 | 嶺東科技大學 | `ltu` | 技職 | 1,757 | 1,532 | 2,111 |
| 1046 | 中國科技大學 | `cute` | 技職 | 1,399 | 1,472 | 1,456 |
| 1047 | 中臺科技大學 | `ctust` | 技職 | 1,270 | 1,140 | 1,275 |
| 1048 | 亞洲大學 | `asia` | 大學 | 2,006 | 1,850 | 2,002 |
| 1049 | 開南大學 | `knu` | 大學 | 1,010 | 993 | 980 |
| 1050 | 佛光大學 | `fgu` | 大學 | 577 | 591 | 609 |
| 1051 | 台南應用科技大學 | `tut` | 技職 | 2,313 | 2,364 | 2,438 |
| 1052 | 中信科技大學 | `feu` | 技職 | 589 | 585 | 606 |
| 1053 | 元培醫事科技大學 | `ypu` | 技職 | 1,179 | 1,023 | 1,041 |
| 1054 | 景文科技大學 | `just` | 技職 | 794 | 827 | 838 |
| 1055 | 中華醫事科技大學 | `hwai` | 技職 | 1,434 | 1,415 | 1,430 |
| 1056 | 東南科技大學 | `tnu` | 技職 | 735 | 740 | 708 |
| 1057 | 德明財經科技大學 | `takming` | 技職 | 945 | 1,017 | 1,077 |
| 1060 | 南開科技大學 | `nkut` | 技職 | 700 | 634 | 676 |
| 1061 | 中華科技大學 | `cust` | 技職 | 769 | 780 | 788 |
| 1062 | 僑光科技大學 | `ocu` | 技職 | 1,387 | 1,345 | 1,366 |
| 1063 | 育達科技大學 | `ydu` | 技職 | 636 | 700 | 684 |
| 1064 | 美和科技大學 | `meiho` | 技職 | 912 | 920 | 978 |
| 1065 | 吳鳳科技大學 | `wfu` | 技職 | 1,014 | 1,040 | 1,192 |
| 1069 | 修平科技大學 | `hust` | 技職 | 462 | 600 | 628 |
| 1070 | 長庚科技大學 | `cgust` | 技職 | 1,236 | 1,039 | 1,220 |
| 1071 | 臺北城市科技大學 | `tpcu` | 技職 | 1,338 | 1,777 | 1,468 |
| 1072 | 敏實科技大學 | `mitust` | 技職 | 329 | 298 | 281 |
| 1073 | 醒吾科技大學 | `hwu` | 技職 | 1,050 | 1,094 | 1,104 |
| 1075 | 文藻外語大學 | `wzu` | 技職 | 1,517 | 1,496 | 1,500 |
| 1076 | 華夏科技大學 | `hwh` | 技職 | 23 | 141 | 139 |
| 1078 | 致理科技大學 | `chihlee` | 技職 | 1,746 | 1,636 | 1,805 |
| 1079 | 康寧大學 | `ukn` | 大學 | 1,075 | 1,060 | 1,095 |
| 1080 | 宏國德霖科技大學 | `hdut` | 技職 | 1,091 | 1,098 | 1,120 |
| 1082 | 崇右影藝科技大學 | `cufa` | 技職 | 234 | 256 | 265 |
| 1083 | 台北海洋科技大學 | `tumt` | 技職 | 1,000 | 976 | 1,028 |
| 1084 | 亞東科技大學 | `aeust` | 技職 | 984 | 857 | 927 |
| 1085 | 馬偕醫學大學 | `mmc` | 大學 | 356 | 358 | 338 |
| 1125 | 中信金融管理學院 | `ctbc` | 大學 | 331 | 266 | 271 |
| 1168 | 南亞技術學院 | `nanya` | 技職 | 376 | 349 | 363 |
| 1183 | 黎明技術學院 | `lit` | 技職 | 1,147 | 1,015 | 1,072 |
| 1185 | 德育護理健康學院 | `dyhu` | 技職 | 705 | 710 | 719 |
| 1196 | 法鼓文理學院 | `dila` | 大學 | 138 | 129 | 145 |
| 1282 | 馬偕醫護管理專科學校 | `mkc` | 技職 | 1,169 | 1,124 | 1,178 |
| 1283 | 仁德醫護管理專科學校 | `jente` | 技職 | 1,399 | 1,343 | 1,454 |
| 1284 | 樹人醫護管理專科學校 | `szmc` | 技職 | 1,421 | 1,485 | 1,511 |
| 1285 | 慈惠醫護管理專科學校 | `tzuhui` | 技職 | 407 | 438 | 400 |
| 1286 | 耕莘健康管理專科學校 | `ctcn` | 技職 | 741 | 709 | 772 |
| 1287 | 敏惠醫護管理專科學校 | `mhchcm` | 技職 | 636 | 634 | 709 |
| 1289 | 育英醫護管理專科學校 | `yuhing` | 技職 | 252 | 262 | 268 |
| 1291 | 聖母醫護管理專科學校 | `smc` | 技職 | 404 | 413 | 394 |
| 1292 | 新生醫護管理專科學校 | `hsc` | 技職 | 1,466 | 1,476 | 1,522 |
| 1293 | 崇仁醫護管理專科學校 | `cjc` | 技職 | 600 | 608 | 655 |
| 1R02 | 基督教台灣浸會神學院 | `tbts` | 大學 | 35 | 35 | 33 |
| 1R03 | 臺北基督學院 | `cct` | 大學 | 68 | 63 | 68 |
| 1R05 | 台灣神學研究學院 | `tgst` | 大學 | 79 | 73 | 85 |
| 1R06 | 一貫道崇德學院 | `iktcds` | 大學 | 17 | 14 | 16 |
| 1R07 | 台灣基督長老教會南神神學院 | `ttcs` | 大學 | 43 | 43 | 46 |
| 1R08 | 中華福音神學研究學院 | `ces` | 大學 | 43 | 46 | 44 |
| 1R09 | 唯心聖教學院 | `wxsjc` | 大學 | 17 | 37 | 17 |
| 1R10 | 福智佛教學院 | `bwbc` | 大學 | 12 | 12 | 13 |
| 3002 | 臺北市立大學 | `utaipei` | 大學 | 2,721 | 2,738 | 2,793 |
| | **total (137 schools)** | | | **191,907** | **189,016** | **196,957** |
