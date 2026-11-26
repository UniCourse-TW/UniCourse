# Course-system landscape (research dataset)

Goal: one list of every website/system related to university courses in Taiwan, per school and
cross-school: official systems (course query, syllabus, course map, enrollment, LMS) and third-party
services (course reviews/ratings, course maps, selection helpers, apps, open-source projects), plus
aggregators that cover several schools like UniCourse itself.

Each research agent writes `data/landscape/<part>.json` (UTF-8, 2-space indent) as an array of entries:

```
{
  "name": "台大課程網",                      // display name as the site calls itself
  "url": "https://nol.ntu.edu.tw/",          // canonical entry URL (https preferred)
  "schools": ["0001"],                       // MOE 學校代碼 from data/institutions.json; [] = cross-school
  "scope": "school" | "multi_school" | "national",
  "operator": "official" | "student" | "company" | "government" | "community" | "unknown",
  "operatorName": "國立臺灣大學教務處",       // who runs it, when known
  "category": ["course_query","syllabus","course_map","enrollment","lms","review","schedule_planner",
               "aggregator","open_data","grade_distribution","forum","api","other"],
  "features": "一句話說明主要功能",
  "loginRequired": true | false | "partial" | "unknown",
  "status": "active" | "inactive" | "unknown",   // active = reachable and updated within ~1 year
  "lastChecked": "2026-11-27",
  "sourceType": "web" | "app_ios" | "app_android" | "browser_extension" | "github" | "line_bot" | "discord",
  "repo": "https://github.com/...",            // for open-source projects, else null
  "notes": "額外說明：涵蓋學期、資料來源、是否停更等",
  "evidence": ["https://... (how you verified)"]
}
```

Rules: only record what you actually visited or found in a cited page; mark unreachable sites
`inactive` with the error in `notes`; no guessing of URLs. Prefer Chinese names as shown on the site.
School codes come from `data/institutions.json` (150 schools; look names up there).
`scripts/build-landscape.py` merges the parts into `docs/landscape.md` (grouped by school, then
cross-school) and `data/course-sites.json`.
