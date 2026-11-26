# Snapshot data quality (2026-11-27)

Audit of every snapshot that feeds production: `snapshots/<slug>-115-1.json` plus `snapshots/history/<slug>-*.json`
(105-1 … 114-2, NTHU also 104) for the nine production schools — 189 files, 710,254 offerings. NCU, NTUA and
NCKU are not in production and were not audited.

Reproduce with `python3 -I scripts/audit-snapshots.py snapshots/*-115-1.json snapshots/history/*.json` (stdlib only,
one file in memory at a time, ~20 s). Triggered by the UI judges' round 2 (`docs/ui-climb/scores/r2/opus.json`,
`sol.json`): the course page showed `unt_ls 4906`, and an FCU 班級活動 showed 開課單位
「美國加州舊金山州立大學資訊」.

## Findings and fixes

Counts are offerings (or, for `extra` keys, key occurrences) across all 189 files **before** this pass, and
**after** re-parsing history through the new cleanup and re-crawling 115-1. "—" means the check found nothing.

| School | Finding | Before | After | Fix |
| --- | --- | ---: | ---: | --- |
| FCU | `extra.unt_ls` (internal 系所 sequence number, `8888` = 共同科目) | 80,183 | 0 | dropped |
| FCU | 系所 name cut at 13 characters (`美國加州舊金山州立大學資訊`, `智能製造與工程管理碩士在職`, …) | 1,888 | 0 | full names (see below) |
| FCU | no `department` (`XC07` 通識選修, some 專班) | 2,444 | 0 | offering college (`通識中心`, …) |
| FCU | `capacity` 0 with students | 1,321 | 0 | 開放名額 is not a capacity (see below) |
| FCU | enrolled > capacity (any margin) | 13,436 | 0 | same |
| NCCU | raw API keys in `extra` (`core`, `emiType`, `gdeTpe`, `tranTpe`, `subOdr`, …) | 512,350 | 0 | Chinese UI labels, `subOdr` dropped |
| NCCU | DEL byte in `notes` | 8 | 0 | stripped |
| NYCU | raw timetable columns in `extra` (`dep_limit`, `degree`, `depType`, `cos_type_e`, …) | 678,796 | 0 | labels or dropped |
| NYCU | JSON blobs in `extra` (`costype`, `brief`) | 38,959 | 0 | `課程類別` / `通識向度` lists |
| NYCU | `null` in `extra` (`crsoutline_type`, `dep_ename`) | 12,323 | 0 | dropped |
| NYCU | HTML entities / DEL in titles (`Mentor&#39;s Hours`, `Experimental Brain Science\x7f`) | 104 | 0 | decoded / stripped |
| NYCU | `capacity` 0 with students | 889 | 0 | omitted |
| NYCU | doubled spaces in titles | 4 | 0 | collapsed |
| NTHU | HTML in `extra.擋修說明` | 333 | 0 | plain text lines |
| NTHU | tabs in `extra.第一二專長對應` | 202 | 0 | `、`-joined |
| NTHU | `capacity` (人限) 0 with students | 2,994 | 0 | omitted |
| NCHU | NBSP padding in `extra.選課系所` | 88,244 | 0 | collapsed |
| NCHU | doubled spaces in titles | 148 | 0 | collapsed |
| NCHU | 開課人數 9999 (操行) and the derived `enrolled` 9999 | 20 | 0 | both omitted |
| TNUA | `&amp;` and trailing commas in `extra.領域` | 447 | 0 | decoded, `、`-joined |
| TNUA | `capacity` (選課上限) 0 with students | 1,707 | 0 | omitted |
| NTNU | `capacity` (限修人數) 0 with students | 18 | 0 | omitted |
| NTU | `extra.加選方式` as `1`/`2`/`3` | 196,111 | 0 | legend text |
| NTU | `extra.授課對象代碼` (dpt codes) | 1,973 in 115-1 | 0 | dropped (授課對象 has the names) |
| CCU, NTNU, NTU, NYCU, NTHU | placeholder instructors (`未定`, `待聘`, bare staff numbers like `589142538`) | 22 | 0 | dropped |

Not changed (source data; listed so UI/API rules can handle them):

| School | Finding | Count | Note |
| --- | --- | ---: | --- |
| NTU | private-use code points in names/notes (`吳冠`) | 1,481 | Big5 造字 (school-defined glyphs); no public mapping. Also NTNU 740, TNUA 65, NTHU 24, NYCU 9, NCHU 5. |
| NTU | no `department` | 10,704 | 共同/通識/體育 rows whose dpt code is in no department list (`0000`, `T010`, `S010`); `extra.授課對象` names the audience. |
| NTU | `K010 國立臺灣師範大學` (18,549), `K020 國立臺灣科技大學` (8,035) as department | 26,584 | 臺大系統 校際課程 listed in NTU's catalogue; the name is what NOL publishes, the course belongs to the partner school. |
| NTU | dpt code `0000` with many names in one term | 21 terms | `department` falls back to the first 授課對象 for code `0000`. Departments are grouped by name in the catalog, so this is cosmetic. |
| NYCU | one dept code with several names in one term (`701`: 運輸與物流管理學系 / …交通運輸碩博士班) | 101 | genuine sub-units under one code; grouped by name. |
| NTHU | department names with codes (`學科所(106起查KLST)`) | 845 | the school's own name for a renamed unit. |
| NTHU, NTNU, NYCU, TNUA | enrolled > capacity | 3.5k–6.9k per school | normal 加簽/授權碼 overflow; ≥ 2× + 10 only 24–92 per school. |
| NTNU | 服務學習（一） 105-1: 1,323 enrolled, capacity 50 | 4 | school-wide course counted in one row. |
| NTU | credits > 12 (臨床實習 20) | 39 | real 學分. |
| NTU, NCHU | capacity ≥ 1000 (NTU 1500) | 2 | NCHU 9999 handled above; NTU values are real large lectures. |

## FCU details

**Department truncation.** `GetUnitList` returns 系所 names from a 13-character column, so the 國際科技與管理學院 2+2
programs come back as `美國加州舊金山州立大學資訊` (NM07). The SFSU 班級活動 the judges saw *is* that program's course,
so the code mapping was right and only the name was cut. `crawlers/fcu/src/tidy.ts` maps every cut name seen in
105-1 … 115-1 to its full name: the 2+2 programs from FCU's 115 學年度國際科技與管理學院雙學士學位學程單獨招生簡章
(program index), the rest by completing the suffix as confirmed by the English unit names (`lang: 'en'`). A new cut
name that is not in the map is shown with a trailing `…` instead of looking whole. Names of 13 characters with a
complete ending (`合作經濟暨社會事業經營學系`) are left alone.

**開放名額 is not capacity.** `scr_precnt` is the number of seats opened in online selection. Students the department
pre-registers into 必修 (帶入) are not counted, so 必修 sections show 0 or a small number next to 60+ students
(`微積分(一)實習` 5 / 63, NM07 `C結構化程式設計` 0 / 41). The crawler now uses it as `capacity` only when it is at least
`scr_acptcnt` (實收名額); otherwise the raw value moves to `extra.開放名額` and `capacity` is omitted. FCU `enrolled`
is unchanged and published for every offering.

## How the history was regenerated

The crawlers keep no raw responses, so re-parsing means running the saved snapshots through the same cleanup the
parsers now apply. Each affected crawler has `src/tidy.ts` (`tidyOffering`, idempotent, unit tested with real
samples) called at the end of its parser, and `src/retidy.ts`, which rewrites snapshot files in place through
`retidySnapshots` (`crawlers/kit/src/tidy.ts`): every file is validated with the kit `Snapshot` schema before it is
written, and `source.fetchedAt` is kept. 115-1 was re-crawled for all nine schools.

## Rules for the UI / API

- **A missing `capacity` is normal**: FCU (開放名額 below enrolment), NTHU/NYCU/TNUA/NTNU (limit 0 with students,
  i.e. added by the department), NCHU 9999 (unlimited), NTU/CCU/NCCU (not published). Show 選課人數 alone; never
  draw a fill bar without a capacity.
- **enrolled > capacity** remains common (加簽, 授權碼). Do not draw it as an error; cap the bar at 100 % and show
  the number (the judges flagged `62 / 5`, which was the FCU 開放名額 case and is gone now).
- **`extra` keys are display labels.** All production crawlers now emit Chinese labels (NYCU also drops any
  unknown ASCII-named column). A defensive UI rule is still cheap: hide `extra` keys matching `^[A-Za-z0-9_]+$`
  other than `EMI` / `URL`, and render values that start with `http` as links.
- **Private-use characters** (Big5 造字) appear in ~2,300 offerings, mostly instructor names. Render them as is
  (they show as tofu) or substitute `〓`; do not use them in search tokenisation.
- **NTU 校際課程** (`K010`/`K020`): consider a 「校際」 badge so a 臺師大/臺科大 course listed by NTU is not read as
  an NTU department.
