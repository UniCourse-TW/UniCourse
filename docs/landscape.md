# 臺灣大專院校課程相關網站總覽

由 `scripts/build-landscape.py` 合併 `data/landscape/*.json` 產生；共 505 個系統，其中跨校/全國 47 個。學校依教育部學校代碼排序；標「跨校」者為多校平台在該校的對應。

## 跨校與全國平台

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [Awesome Taiwan Security Course](https://github.com/fei3363/Awesome-Taiwan-Security-Course) | 彙整、其他 | 社群（fei3363） | 免登入 | 停止 | 收集台灣各大學、社團與計畫的資安實務課程、簡報與連結（含臺大／臺科大／交大三校合開資安課） | 主題型跨校課程清單（208 stars）；最後 push 2023-09。 [repo](https://github.com/fei3363/Awesome-Taiwan-Security-Course) |
| [ColleGo! 大學選才與高中育才輔助系統](https://collego.edu.tw/) | 其他 | 政府（教育部） | 免登入 | 運作中 | 給高中生的學群、學類、學系探索平台，介紹各大學校系學習內容與選才方向 | 校系層級資訊，不是課程層級；列入作為升學端的全國平台參考。 |
| [Colorgy 各校課程爬蟲（crawler-*-course）](https://github.com/colorgy) | API、開放資料 | 公司（Colorgy） | 免登入 | 停止 | Colorgy 組織下約 81 個 course 相關 repo，各校一個課程爬蟲（台大、清大、交大、成大、政大、淡江、逢甲、輔仁…） | 多數最後更新 2015–2016，少數 2019–2021；另有教科書出版社爬蟲。可作為各校舊版課程網結構的歷史參考。 [repo](https://github.com/colorgy) |
| [Colorgy 課表](https://colorgy.io/) | 排課、彙整、討論 | 公司（Colorgy（台科大學生創業團隊）） | 需登入 | 停止 | 大學生課表 App，選校後自動匯入課程，曾宣稱收錄近 100（後稱 151）所大學課程資料，並有同課同學社交功能 | Crunchbase 標示永久關閉；約 2017–2020 間下架。colorgy.io 現在轉址到無關的博弈網站（guitartabs.co.in），不要連結。 [repo](https://github.com/colorgy) |
| [CrawlerMaster 臺灣大專院校課程爬蟲](https://github.com/Yukaii/CrawlerMaster) | API、開放資料 | 社群（Yukaii、Neson 等（Colorgy 貢獻者）） | 免登入 | 停止 | 整合台灣各校課程爬蟲的 Rails 專案，附「臺灣各校課程爬蟲列表」與爬蟲開發指南 | 最後 push 2016-09；授權 MIT（Copyright Colorgy）。 [repo](https://github.com/Yukaii/CrawlerMaster) |
| [Dcard 各校看板／#選課雷達](https://www.dcard.tw/) | 討論、評價 | 公司（狄卡科技（Dcard）） | 部分需登入 | 運作中 | 大學生匿名論壇，各校看板以 #選課雷達 標籤徵集課程評價（課名、年份、老師、好過指數、推薦指數） | 評價分散在各校看板，沒有統一資料庫；Dcard 對 curl 回 Cloudflare 403。淡江、成大、東華等校看板都有選課雷達活動。 |
| [OPT 歐趴糖](https://www.1111opt.com.tw/) | 評價、彙整、討論 | 公司（1111 人力銀行） | 部分需登入 | 運作中 | 全台大學課程評價查詢：課程內容、老師、評分方式、考試／報告／點名比重、甜涼度、考古題，另有各校選課懶人包 | 網站自稱約 56,015 篇課程評價、1,586 份考古題、114 所學校；選課懶人包涵蓋全台 50 所大學。與 TUN 大學網同屬 1111。 |
| [OpenEdu 中華開放教育平台](https://www.openedu.tw/) | LMS、彙整 | 官方（逢甲大學／中華開放教育聯盟） | 部分需登入 | 運作中 | 開放式線上課程平台，收錄教育部補助科技課程、大學程式設計、大學新鮮人、高中生等專區，約 500 門課 | 2022 年工作坊稱 ewant、OpenEdu、TaiwanLIFE 為三大平台。 |
| [PTT 批踢踢實業坊 各校課程板](https://www.ptt.cc/bbs/index.html) | 討論、評價 | 社群（批踢踢實業坊） | 免登入 | 運作中 | BBS 論壇，各校分類下有課程板（如 NTUcourse 用 [評價]/[通識] 標籤），是早期課程評價主要來源 | 多數第三方評價網（如想鑑你 NTU Rating、NCKU 相關工具）都曾爬 PTT 課程板。 |
| [ShareCourse 學聯網](https://www.sharecourse.net/) | LMS、彙整 | 公司（捷鎏科技（與國立清華大學合作）） | 部分需登入 | 運作中 | 2012 年成立的中文 MOOCs 平台，收錄多所大學開設的線上課程 | 首頁 200 但內容由 JS 渲染，未取得目前課程數。 |
| [TOCEC 台灣開放式課程暨教育聯盟](https://www.tocec.org.tw/) | 彙整、其他 | 社群（台灣開放式課程暨教育聯盟（各大學組成）） | 免登入 | 不明 | 台灣各大學開放式課程（OCW）與開放教育的聯盟入口 | 首頁可連（200），但頁面內容多由 JS 載入，未確認最近更新日期。 |
| [TUN 大學網 課程評價](https://university.1111.com.tw/index.asp) | 評價、討論、其他 | 公司（1111 人力銀行） | 部分需登入 | 運作中 | 大學生入口網，「我是大學生」區含課程評價、選課秘技、學長姐選課經驗分享 | 2025 年 9 月報導累積超過 52,922 筆課程評價，涵蓋全國大專院校。tun.com.tw 對 curl 回 Cloudflare 403，實際站在 university.1111.com.tw。 |
| [TaiwanLIFE 臺灣全民學習平臺](https://taiwanlife.org/) | LMS、彙整 | 官方（國立空中大學） | 部分需登入 | 運作中 | 2014 年上線的全民 MOOCs 平台，提供一般線上課程與非正規學分班，通過可取得學分證明 | 與 ewant 共享課程。 |
| [UrSchool](https://urschool.org/) | 評價、討論 | 公司（UrSchool 團隊） | 免登入 | 停止 | 大學校系與教授評價平台，以老師為單位列評價（甜度、涼度、教學方式），資料較多的是台大、清大、交大、成大、政大、台科大、台師大、輔仁、淡江 | 2026-11-27 首頁只剩 Apache「Index of /」；NCKU-Evaluator README（2026-11）說 urschool.org 已於 2026 年初停止服務，資料停在 2025-06。WHOIS 到期日 2026-08-30。 |
| [WZCR｜臺灣大學課程評分](https://github.com/csc20021001/wzcr) | 評價、課程查詢、彙整 | 學生（csc20021001（WZUNAA）） | 部分需登入 | 運作中 | 跨校課程查詢與五項 0–100 評分（學習收穫、作業量、考試難度、給分、點名），課程以「課程＋教師」為評分卡 | README：學校選單 42 所大學，39 所已載入官方課表，約 20 萬門課、42 萬筆授課紀錄，範圍 106–115 學年；臺藝大、空大、高餐未收。Next.js + Cloudflare D1，Google 登入。原站網址未在 repo 公開，未找到線上版。 [repo](https://github.com/csc20021001/wzcr) |
| [coding101-CozePlay-2025 課程推薦機器人](https://github.com/Kitty-Wu91/coding101-CozePlay-2025) | 開放資料、其他 | 學生（Kitty-Wu91） | 免登入 | 停止 | 用 Python 爬蟲整理台灣各大學公開課程資料，接 Coze 工作流做課程推薦聊天機器人 | README 幾乎是空的，涵蓋學校不明；homepage 指向 coze.com bot；最後 push 2025-03。 [repo](https://github.com/Kitty-Wu91/coding101-CozePlay-2025) |
| [edu磨課師+ 教育部線上學習平臺](https://moocs.moe.edu.tw/moocs/) | LMS、彙整 | 政府（教育部） | 部分需登入 | 運作中 | 教育部的線上課程（MOOCs）平台，彙集各校與機構開設的磨課師課程 | 瀏覽免登入，修課需註冊。 |
| [ewant 育網開放教育平台](https://www.ewant.org/) | LMS、彙整 | 官方（國立陽明交通大學 開放教育推動中心） | 部分需登入 | 運作中 | 2013 年成立的台灣第一個 MOOCs 平台（Moodle 架構），提供各校磨課師課程、微學程證書，部分課程可經實體考試抵學分 | 與 TaiwanLIFE 透過 Moodle 共享課程，兩平台合計曾與約 80 所大學簽約、400+ 門課。 |
| [不揪？- 儲存、分享課表](https://apps.apple.com/tw/app/id6740519975) | 排課 | 學生（HSIN-CHE CHUNG） | 需登入 | 運作中 | iOS 課表儲存與分享 App，加好友看彼此課表與目前是否有課，支援全台大學、科技大學的節次時間 | 手動輸入課表，不自動匯入課程資料；最初支援清交成政等 7 校，後擴充台大系統、中原與科大節次。 |
| [大學校院課程資源網](https://ucourse-tvc.yuntech.edu.tw/webu/index.aspx) | 課程查詢、教學大綱、彙整、開放資料 | 政府（教育部（委託國立雲林科技大學課程工作小組維運）） | 免登入 | 運作中 | 全國大學校院開課資料查詢：找課程、找科系、找通識、找學校、找主題、找活動，可依學年、學制、地區、課名、教師、課綱關鍵字檢索並合併查詢技專課程網 | 各校以填報程式上傳課程資料；學年選單涵蓋 86–115 學年（含暑期）。ucourse-tvc 主機從本機連線被 reset（ECONNRESET），但同一套 web_nu 頁面可經 course-tvc.yuntech.edu.tw/web_nu/ 存取。全國最完整的官方跨校課程資料源，UniCourse 可作為補漏或對照來源。 |
| [大專校院就業職能平台 UCAN](https://ucan.moe.edu.tw/) | 課程地圖、其他 | 政府（教育部） | 部分需登入 | 運作中 | 職涯興趣與職能診斷；提供「教學規劃發展」工具讓學校依職涯路徑與共通職能建置課程地圖 | 多校課程地圖系統以 UCAN 為資料來源，例如屏科大 ucancm.npust.edu.tw「課程地圖管理系統」頁尾標示 UCAN。 |
| [大專校院校務資訊公開平臺](https://udb.moe.edu.tw/) | 開放資料、其他 | 政府（教育部） | 免登入 | 運作中 | 全國大專校院校務統計與名錄；105 年起增列各校「課程資訊」連結，校14 表列出每校課程、採購及校務資訊公開網址 | 本身不存課程明細，只連到各校課程網；校14 表可作為 150 校官方課程網址的權威清單。 |
| [大專校院校園開放資料（試辦）蒐集平台](https://opendata.cc-isac.org/) | 開放資料 | 政府（教育部校務行政e化交流服務計畫（台灣學術網路危機處理中心 TACERT/ISAC）） | 部分需登入 | 不明 | 各校填報校園開放資料的管理系統；111 年蒐集項目含「課程表」，截至 110 年 10 月約 100 校參與 | 首頁是「開放資料管理系統」登入畫面（聯絡人 isac_jill@mail.isac.org.tw），未找到公開下載課程表的頁面；是否對外釋出待確認。 |
| [技職校院課程資源網](https://course-tvc.yuntech.edu.tw/web_nt/search_course.aspx) | 課程查詢、教學大綱、彙整 | 政府（教育部技職司（國立雲林科技大學維運）） | 免登入 | 運作中 | 科技大學、技術學院、專科學校課程查詢（含暑修課程），與大學校院課程資源網共用入口「大學暨技專校院．課程資源網」 | 入口 https://course-tvc.yuntech.edu.tw/ 標題為「大學暨技專校院．課程資源網」，頁面為 Big5 編碼。各校教務處常引導學生用此站找暑修課。 |
| [政府資料開放平臺：公立大專校院各校課程、採購及校務資訊公告網址](https://data.gov.tw/datasets/search?qs=8190) | 開放資料 | 政府（教育部高等教育司） | 免登入 | 運作中 | 開放資料集（CSV），欄位含學年度、學校代碼、學校名稱、課程資訊公開網址等；另有私立大專校院版本 | 只提供各校課程網址，不含課程明細。未能從搜尋結果取得資料集固定 ID，只確認出現在 data.gov.tw 搜尋列表；內容與 udb 校14 表同源。 |
| [臺灣通識網 General Education TW](http://get.aca.ntu.edu.tw/) | 課程查詢、教學大綱、彙整 | 政府（教育部高教司（國立臺灣大學承辦）） | 免登入 | 停止 | 97 年啟用的全國通識教育資源平台，含課程資料庫、教師資料庫、通識實務全景，可查各校通識課程與開放課程 | 2026-11-27 以 http 與 https 連線皆逾時（25 秒 timeout）；YouTube 頻道「臺灣通識網General Education TW-開放式課程GET」仍在。若要查全國通識課，現在可改用大學校院課程資源網「找通識」。 |
| [課務通 - AI匯入課表・行事曆・校園公告](https://apps.apple.com/tw/app/id6761055559) | 排課 | 學生（FENG-CHIANG CHANG） | 不明 | 運作中 | iOS 課表 App，用 AI 解析各校教務系統課表、可選已支援學校或自訂設定，含行事曆、校園公告、小工具 | 2026 年 9 月仍有更新（1.0.6）；支援學校清單只在 App 內，商店頁未列。 |
| [CrossLink 臺大、臺科大、臺師大選課模擬](https://www.crosslink.tw/) | 課程查詢、排課、彙整、討論 | 學生（YI FENG（前身 NTUST.CC 台科大選課模擬系統）） | 部分需登入 | 運作中 | 臺大系統三校課程合併查詢、選課模擬、找同修課同學、詢問課程 | 課程資料涵蓋 100-1 到 115-1，列表最後更新 2026/11/26；Facebook 登入後可模擬選課。是 UniCourse 最接近的跨校同類產品之一。 |
| [Moodle](https://moodle.org/) | LMS | 社群（Moodle HQ／開源社群） | 需登入 | 運作中 | 開源學習管理系統，台灣許多大學課程平台與 ewant、TaiwanLIFE 皆以 Moodle 架設 | moodle.org 對 curl 回 403「Moodle challenge」（防機器人頁），站點仍在。 [repo](https://github.com/moodle/moodle) |
| [NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api) | API、排課 | 學生（poterpan（北科盒子 NTUTBox）） | 免登入 | 運作中 | 公開 API 提供台灣各大學上課節次定義，供北科盒子課表 App 使用，歡迎 PR 新增學校 | https://api.ntutbox.com/schedule/templates 回傳 42 個模板（37 所學校）；北科盒子 App 本身是北科大專用（https://ntutbox.com）。 [repo](https://github.com/poterpan/ntutbox-template-api) |
| [TronClass 暢課](https://www.tronclass.com/) | LMS | 公司（台灣智園有限公司（WisdomGarden）） | 需登入 | 運作中 | 行動化數位學習平台：課程公告、教材、作業、測驗、點名、學習分析，可自校務系統自動匯入課程 | 淡江 2016 年導入、世新 113 學年導入、實踐兩校區、東海與靜宜皆使用；另有 iOS/Android App。 |
| [Tw-open-course-catcher](https://github.com/u-tung/Tw-open-course-catcher) | 開放資料 | 學生（u-tung） | 免登入 | 停止 | 爬取台灣各大學開放式課程（OCW）的 Python 爬蟲，含章節與影片連結 | 支援台大、清華、交大 OCW；最後 push 2023-03。 [repo](https://github.com/u-tung/Tw-open-course-catcher) |
| [UniCourse 查課](https://unicourse.observe.tw/) | 課程查詢、彙整、評價、討論、API | 社群（UniCourse-TW） | 部分需登入 | 運作中 | 跨校課程目錄（Rust + SvelteKit），以各校公開課程網爬蟲每晚更新，含課程評分與討論區 | 即本專案。2026-11-27 正式站涵蓋 9 校 × 113-1…115-1：臺大、清大、陽明交大、政大、臺師大、中興、中正、逢甲、北藝大；中央（robots 禁止）、臺藝大（需登入）、成大（CAPTCHA）未上線。 [repo](https://github.com/UniCourse-TW/UniCourse) |
| [UniCourse（舊版，unicourse.tw）](https://unicourse.tw/) | 課程查詢、討論、API | 學生（UniCourse-TW） | 不明 | 停止 | 開源課程平台，課程／教師／開課單位三維搜尋加論壇；最早以臺師大為主，曾爬技職課程資源網 | unicourse.tw 現在 DNS 解析失敗；舊前端 unicourse.pages.dev 仍回 200。相關 repo：Backend（2023-02）、API-Spec、NTNU-Course、course-tvc-crawler（爬 course-tvc.yuntech.edu.tw，2023-02）。 [repo](https://github.com/UniCourse-TW/realm) |
| [ee-class 易課學習管理系統](https://tw.formosasoft.com/p/ee-class) | LMS | 公司（台灣數位學習科技（Formosasoft），大塚資訊代理） | 需登入 | 運作中 | 以課程為基礎的翻轉教室／MOOC 學習管理系統（前身 iLMS），廠商稱為數十所大學採用 | 嶺東、建國、修平、屏東大學（2025-02 上線 eeclass.nptu.edu.tw）、高雄市立空大使用；各校網址多為 eeclass.<校>.edu.tw。 |
| [優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/) | 選課、課程查詢 | 官方（優久大學聯盟（大同大學架設）） | 部分需登入 | 運作中 | 優久聯盟校際選課平台：查詢各校開放課程、註冊校際選課帳號、網路加退選，每人每學期最多 2 門 | 已公布 115-1 日程（帳號註冊 115/08/10–08/26）；開學日列出大同、北醫、銘傳、逢甲、中原、世新、東吳、東海、淡江、輔仁、實踐、靜宜、文化 13 校。系統不檢查衝堂。 |
| [北區技專校院教學資源中心 聯合課程平台（跨校選課）](http://140.124.9.87/public/toElectCourseStep1.do) | 選課、課程查詢 | 官方（北區技專校院教學資源中心（國立臺北科技大學）） | 免登入 | 停止 | 北區 33 所技專校院的聯合課程平台，日間部學生跨校選修通識等課程免學分費、學分互認 | 2026-11-27 IP 位址網址連線逾時；更早的 www.ctle.ntut.edu.tw/trc/course_search.jsp 已無 DNS。資料多為 2007–2015 年。 |
| [北區跨校選課(ctle.ntut)](http://www.ctle.ntut.edu.tw/public/toElectCourseStep2.do?d-5487-p=1&showRight=false&showRight=false) | 選課 | 官方（國立臺北科技大學） | 不明 | 不明 | 北區大學校院跨校選課平台(北科大 ctle 維運) | 戲曲學院在校學生頁連結。 涵蓋技職校院(維運校代碼 0025)。2026-11-27 本機探測失敗:<urlopen error [Errno -2] Name or service not known> |
| [南區區域教學資源中心跨校課程公共平台](https://cross-school.nkust.edu.tw/) | 選課、課程查詢 | 官方（南區區域教學資源中心（國立高雄科技大學）） | 部分需登入 | 運作中 | 南區大學校院跨校課程與學分互認的公共平台 | 首頁可連；參與學校名單未在首頁列出。 |
| [台灣聯合大學系統（台聯大）](https://www.ust.edu.tw/) | 選課、其他 | 官方（台灣聯合大學系統辦公室） | 免登入 | 運作中 | 清大、陽明交大、中央、政大四校聯盟；相互承認學分與教師資格，提供跨校選課、經典通識系列講座、校車 | 每學年跨校選課約 1,700 人次，92 學年至 2023 年累計超過 3.4 萬人次。政大 110 學年起加入學期中跨校選課。跨校選課透過各校自己的系統與申請單，沒有獨立的全系統選課平台。 |
| [國立臺灣大學系統（臺大系統）](https://ntusystem.ntu.edu.tw/) | 選課、其他 | 官方（國立臺灣大學系統（臺大、臺師大、臺科大）） | 免登入 | 運作中 | 臺大、臺師大、臺科大三校系統；103 學年起校際選課，學生可直接在所屬學校選課系統選到三校開放課程，另有跨校輔系、雙主修 | ntusystem.ntu.edu.tw 目前是「境外招生資訊網」；跨校選課規定在各校教務處頁面。113 學年跨校選課 8,810 人次，十年累計 6.6 萬人次。 |
| [技職課程資源網](http://course-tvc.yuntech.edu.tw/Web/index.aspx) | 課程地圖、教學大綱 | 官方（國立雲林科技大學） | 不明 | 不明 | 教育部技職校院課程資源網(雲科大維運),供專科/技專校院課程資訊交換 | 多所專科(例:育英醫專)官網連到此站。 涵蓋技職校院(維運校代碼 0023)。2026-11-27 本機探測失敗:<urlopen error timed out> |
| [智慧大師 Wisdom Master 教學平台](https://www.sun.net.tw/) | LMS | 公司（旭聯科技（SUN NET Technologies）） | 需登入 | 運作中 | 大專校院常用的數位學習平台（WM3／Wisdom Master Pro），附「旭聯智慧大師 行動學習」App | 宣傳頁稱學校市佔率超過 70%（未註明年份，未證實）。空大、屏東大學、聯合大學仍推廣使用其 App。 |
| [臺北聯合大學系統（北聯大）臺北聯大課程](https://ustp.ntpu.edu.tw/info/8) | 選課、課程查詢、其他 | 官方（臺北聯合大學系統（國立臺北大學維運網站）） | 免登入 | 運作中 | 北科、北大、北醫、海大四校聯盟；課程頁整合四校課程查詢、外語授課課程與學生系統登入連結，另有學分學程／微學程 | 日間部互選免學分費；多數用紙本「臺北聯合大學系統校際選課申請表」，部分通識課線上選。 |
| [臺灣綜合大學系統（臺綜大）](https://www.tcus.edu.tw/) | 選課、其他 | 官方（臺灣綜合大學系統） | 免登入 | 運作中 | 成大、中興、中山、中正四校聯盟；100-2 學期起學士班跨校選課免學分費，另有跨校輔系雙主修與校際選課公告 | 首頁有 2026-11 最新消息與「踏溯台南」校際選課公告；選課走各校系統與紙本校際選課單。 |
| [課程資訊交換平台(tlrcct)](http://www.tlrcct.yuntech.edu.tw/ctlr_web/ciep/AnnounceList.aspx) | 其他 | 官方（國立雲林科技大學） | 不明 | 不明 | 技職校院課程資訊交換平台 | 仁德醫專官網連結。 涵蓋技職校院(維運校代碼 0023)。2026-11-27 本機探測失敗:<urlopen error timed out> |
| [跨校選課公共平台(高科大)](https://cross-school.nkust.edu.tw/course/course07m.aspx) | 選課 | 官方（國立高雄科技大學） | 不明 | 運作中 | 南部技專校院跨校選課公共平台 | 育英醫專、樹德科大等校網連結。 涵蓋技職校院(維運校代碼 0053)。2026-11-27 探測 HTTP 200 |

## 一般大學

### 國立政治大學（0001） · UniCourse slug `nccu`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [全校課程查詢系統](https://qrysub.nccu.edu.tw/) | 課程查詢、教學大綱、API | 官方（國立政治大學） | 免登入 | 運作中 | 依學期、開課單位與關鍵字查課，並連結公開教學大綱。 | 網站前端使用 JSON 查詢介面，非另有承諾的開放 API。 qrysub.nccu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 es.nccu.edu.tw 的 robots.txt 同樣回傳 HTTP 404；未取得規則。 |
| [全校課程清單（Excel）](https://newdoc.nccu.edu.tw/teaschm/CoursesList.xlsx) | 開放資料 | 官方（國立政治大學） | 免登入 | 運作中 | 下載全校開課清單 Excel。 | 整學期檔案，不是歷年封存目錄。 newdoc.nccu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [政大選課系統](https://selectcourse.nccu.edu.tw/regcourse/) | 選課 | 官方（國立政治大學） | 需登入 | 運作中 | 校內帳號登入後登記、加退選及查看結果。 | selectcourse.nccu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [課程地圖](https://cis.nccu.edu.tw/coursemap/students/index.aspx) | 課程地圖 | 官方（國立政治大學） | 不明 | 不明 | 提供修課規劃的學生課程地圖。 | 依教務處連結辨識，未登入測試個人化功能。 cis.nccu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [國立政治大學 Moodle 數位學習平台](https://moodle45.nccu.edu.tw/) | LMS | 官方（國立政治大學） | 需登入 | 運作中 | Moodle 4.5 提供校內課程教材、作業及評量。 | 舊 Moodle 網址導向本平台。 moodle45.nccu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /；另有其他規則。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NCCU Course Rate Tool](https://chromewebstore.google.com/detail/njgippngjeffflfigibgnibajdgbnhec) | 評價、排課 | 不明（unknown） | 免登入 | 停止 | 在 qrysub 課程查詢頁顯示 101-1 起同名同師課程評價、歷年通識初選排名與課表預覽 | v0.4.1、414 users、最後更新 2024-08-19（逾一年）。 |
| [政大開評器](https://chromewebstore.google.com/detail/penjfohglnhbiaigbmgaiaidhdaegpmi) | 評價 | 不明（unknown） | 免登入 | 停止 | 在政大課程查詢『相關資訊』頁一鍵搜尋並摘要 Dcard 課程評價 | v1.0.1、173 users、最後更新 2024-08-20；說明站 sites.google.com/view/nccu-opener 現需 Google 登入。 |
| [政大課程評價網](https://course-nccu.com/) | 評價 | 學生（2021 資料庫系統專題學生（HackMD wwwnnn）） | 需登入 | 停止 | 政大課程評價與課程資源分享，限 @g.nccu.edu.tw 帳號 | 目前 curl 陷入 302 無限轉址（→ /opennccu@gmail.com），服務疑似失效。 |
| [nccu-timetable](https://justin-code.io/timetab/) | 排課 | 學生（JustinHsu1019） | 免登入 | 停止 | 把政大課程查詢『我的追蹤清單』視覺化為課表 | 頁面可連線；repo 最後 push 2024-10-30。 [repo](https://github.com/JustinHsu1019/nccu-timetable) |
| [nccu-course-mcp](https://github.com/yyu0310/nccu-course-mcp) | API、課程查詢 | 學生（yyu0310） | 免登入 | 運作中 | MCP server：搜尋政大課程、檢查衝堂、讀取大綱 | 資料來源 qrysub.nccu.edu.tw；最後 push 2026-09-20。 [repo](https://github.com/yyu0310/nccu-course-mcp) |
| [NCCUCourse scripts](https://github.com/andyjjrt/NCCUCourse) | API、開放資料 | 學生（andyjjrt） | 免登入 | 停止 | 政大課程爬蟲腳本集 | 最後 push 2024-08-25。 [repo](https://github.com/andyjjrt/NCCUCourse) |

**跨校平台涵蓋**：[台灣聯合大學系統（台聯大）](https://www.ust.edu.tw/)、[UniCourse 查課](https://unicourse.observe.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立清華大學（0002） · UniCourse slug `nthu`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [各系開課／全校開課清單](https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.3/JH623001.php) | 課程查詢、教學大綱 | 官方（國立清華大學） | 免登入 | 運作中 | 公開依學期與系所查詢清大開課及課綱。 | 隸屬校務資訊系統的免登入查詢。 www.ccxp.nthu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /、Allow: /ccxp/INQUIRE/$。 例外僅為入口精確路徑，不涵蓋這個系所查詢子頁。 |
| [全校課程整合查詢](https://curricul.site.nthu.edu.tw/p/404-1208-318709.php?Lang=zh-tw) | 課程查詢 | 官方（國立清華大學） | 免登入 | 運作中 | 依關鍵字查找清大課程，整合官方開課資料。 | 與傳統依系所及全校清單並行；此頁是整合查詢的官方入口。 curricul.site.nthu.edu.tw：robots.txt 的 User-agent: * 規則包含 Allow: /。 |
| [校務資訊系統](https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/) | 選課 | 官方（國立清華大學） | 需登入 | 運作中 | 登入校務資訊系統辦理選課。 | 同站另有不需登入的課程查詢功能。 www.ccxp.nthu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /、Allow: /ccxp/INQUIRE/$。 |
| [國立清華大學 eeclass 數位學習平台](https://eeclass.nthu.edu.tw/) | LMS | 官方（國立清華大學） | 需登入 | 運作中 | ee-class 平台供師生使用課程教材與教學活動。 | eeclass.nthu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /media/s/、Disallow: /km/s/、Disallow: /*.mp4$。 |
| [eLearn 數位學習平台](https://elearn.nthu.edu.tw/) | LMS | 官方（國立清華大學） | 需登入 | 不明 | 校方列出的 eLearn 教學平台。 | 校方數位學習頁同時列出 eeclass，不能僅由並列判定遷移完成。 elearn.nthu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [課程開放資料](https://curricul.site.nthu.edu.tw/p/404-1208-111356.php?Lang=zh-tw#json) | 開放資料 | 官方（國立清華大學） | 免登入 | 運作中 | 課務組公布當期整學期 JSON 匯出與開放資料說明。 | 當期 JSON 為滾動更新，歷年課表另有 Excel 檔。 curricul.site.nthu.edu.tw：robots.txt 的 User-agent: * 規則包含 Allow: /。 |
| [課程地圖 Course map（學習科學與科技研究所）](https://lst.site.nthu.edu.tw/p/412-1369-3834.php?Lang=zh-tw) | 課程地圖 | 官方（國立清華大學） | 免登入 | 不明 | 研究所公開提供學習科學與科技課程地圖。 | 系所級示例，非全校地圖。 lst.site.nthu.edu.tw：robots.txt 對 User-agent: * 列出 Allow: /。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NTHUMods](https://nthumods.com/) | 課程查詢、排課、成績分布、評價 | 學生（nthumodifications（GitHub org，清大學生）） | 部分需登入 | 運作中 | 課程大綱與歷年評分查詢、課表規劃、畢業學分規劃、校車時刻 | repo 最後 push 2026-11-26（91★）；部分功能需登入。 [repo](https://github.com/nthumodifications/courseweb) |
| [清大選課助手 NTHU Course Selection Assistant](https://chromewebstore.google.com/detail/amljcdhkpahlpbfniijlgknmdecajoel) | 排課、評價 | 不明（unknown） | 需登入 | 運作中 | 視覺化時間篩選、即時選課人數、衝堂偵測、Dcard/NTHUMods/Opass 評價連結 | v1.3.0、83 users、2026-09-18 更新；聲明資料皆在瀏覽器端處理。 |
| [清大選課管家](https://chromewebstore.google.com/detail/nihfemnmeopfggpfdfjjfjclpimfchlk) | 排課、選課 | 學生（T & J（兩位清大資工學生）） | 需登入 | 停止 | 課程搜尋、清單一鍵送出選課、依修課紀錄推薦課程 | v0.98 最後更新 2018-08-21；商店頁現已無內容（疑似下架）。 |
| [清大簡易選課](https://nthu-courses.github.io/) | 排課 | 學生（pp253） | 免登入 | 停止 | 重新設計的清爽選課介面 | GitHub Pages 現 404；repo 最後 push 2023-01-03。 [repo](https://github.com/pp253/nthu-select-courses) |
| [NTHUcourse 清大課程](https://nthucourse.com/) | 成績分布、課程查詢 | 不明（unknown） | 免登入 | 停止 | 歷年課程平均 GPA／標準差、餘額與中籤機率 | DNS 無法解析；搜尋快照顯示資料停在 111 上。 |
| [NTHU_Course（henryyang42）](http://nthu-course.cf/) | 課程查詢 | 學生（henryyang42） | 免登入 | 停止 | 清大課程查詢網站 | 網域無法解析；repo 最後 push 2018-07-18。 [repo](https://github.com/henryyang42/NTHU_Course) |
| [nthu-course-grade-data-downloader](https://github.com/edge-runner913/nthu-course-grade-data-downloader) | 成績分布 | 學生（edge-runner913） | 需登入 | 運作中 | 下載校務系統歷年課程平均與標準差（無成績分布） | 最後 push 2026-10-09；需校務系統帳號。 [repo](https://github.com/edge-runner913/nthu-course-grade-data-downloader) |
| [PTT NTHU_Course 看板](https://www.ptt.cc/bbs/NTHU_Course/index.html) | 評價、討論 | 社群（PTT 批踢踢實業坊） | 免登入 | 運作中 | 清大選課心得與考古題分享看板 | 最新非置底文章 2025-11-07，發文量低。 |

**跨校平台涵蓋**：[ShareCourse 學聯網](https://www.sharecourse.net/)、[台灣聯合大學系統（台聯大）](https://www.ust.edu.tw/)、[UniCourse 查課](https://unicourse.observe.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)、[Tw-open-course-catcher](https://github.com/u-tung/Tw-open-course-catcher)

### 國立臺灣大學（0003） · UniCourse slug `ntu`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [臺大課程網](https://course.ntu.edu.tw/) | 課程查詢、教學大綱、排課 | 官方（國立臺灣大學） | 部分需登入 | 運作中 | 新版入口提供全校查課、課綱與預選課表。 | 首頁另連正式選課系統；公開查課與帳號功能不同。 course.ntu.edu.tw：robots.txt 的 User-agent: * 規則包含 Allow: /、Disallow: /api/、Disallow: /_next/。 |
| [NTU Online 臺大課程網（舊版查詢）](https://nol.ntu.edu.tw/nol/coursesearch/index.php) | 課程查詢、教學大綱 | 官方（國立臺灣大學） | 免登入 | 運作中 | 傳統課程查詢介面可按學期、系所及課名查找課程。 | 與 course.ntu.edu.tw 介面並存。 nol.ntu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [臺大選課系統](https://if177.aca.ntu.edu.tw/) | 選課 | 官方（國立臺灣大學） | 需登入 | 運作中 | 於公告的選課期間以校內帳號辦理選課。 | 非選課期間可能不開放選課功能。 if177.aca.ntu.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 announcement.aca.ntu.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 |
| [臺大課程地圖](https://coursemap.aca.ntu.edu.tw/course_map_all/) | 課程地圖 | 官方（國立臺灣大學） | 免登入 | 不明 | 透過各學院與系所查看修課規劃。 | 新版課程網仍有連結；未確認各系地圖的最近更新。 coursemap.aca.ntu.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 announcement.aca.ntu.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 |
| [NTU COOL 數位教學平臺](https://cool.ntu.edu.tw/) | LMS | 官方（國立臺灣大學） | 需登入 | 運作中 | Canvas 架構的數位教學平台，支援教材、作業與討論。 | 一般課程透過臺大帳號登入，公開頁面不代表所有課程開放。 cool.ntu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /page_views/。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NTUCourse Neo](https://ncn.pages.dev/) | 課程查詢、排課 | 學生（NTUCourse-Neo（GitHub org；jc-hiroto、swh00tw 等臺大學生）） | 免登入 | 停止 | 重新設計的臺大課程查詢與排課介面（Course Schedule – Re-imagined） | 前端 repo 最後 push 2022-12-23、landing 2023-07；原服務網址 course.myntu.me 現 TLS 失敗，ncn.pages.dev 僅剩 landing page。臺大官方新課程網（course.ntu.edu.tw）英文名亦稱 NTU Course NEO，兩者關係未經證實。 [repo](https://github.com/NTUCourse-Neo/ncn-frontend) |
| [想鑑你 NTU Rating](https://rating.myntu.me/) | 評價、討論、排課 | 學生（臺大資工、電機學生（開發者張維哲等）） | 部分需登入 | 運作中 | 臺大課程評價論壇：課程搜尋、四項指標評分、匿名評價、收藏與模擬排課 | 需 ntu mail 驗證才能發文；課程頁顯示 Last Offered Semester 115-1，2026-01 仍有新評價。Facebook：ntuRating。 |
| [NTU Sweety Course](https://ntusweety.herokuapp.com/) | 評價、排課、成績分布 | 學生（臺大資工學生（PTT ACEgolden，2014）） | 免登入 | 停止 | 拖曳空堂找課、一鍵匯入預選、自動搜尋 PTT 評價、歷年成績分布 | 2014 年上線；Heroku 網址現回 404 'No such app'；同名 Chrome 擴充（ljphfdooobennbjpbkfioadeeaajcioc）已下架（Extpose 標 delisted，最後更新 2017-04-08）。 |
| [PTT NTUcourse 看板](https://www.ptt.cc/bbs/NTUcourse/index.html) | 評價、討論 | 社群（PTT 批踢踢實業坊（板主為臺大學生）） | 免登入 | 運作中 | 臺大課程心得、評價與徵求筆記的 BBS 看板 | 最新非置底文章 2026-08-13。 |
| [台大課程評價小幫手](https://chromewebstore.google.com/detail/haencenjhfgkhnjhmjmlnmcongkgjapm) | 評價 | 學生（jschang19） | 免登入 | 停止 | 在臺大課程網課程頁一鍵彙整 PTT、Dcard、NTU Rating 評價 | Chrome 商店 v1.0.1、905 users、最後更新 2022-12-31；依賴作者後端 API ntucourse-api.jcshawn.com，未驗證是否仍運作。 [repo](https://github.com/jschang19/ntu-course-review-extension) |
| [NTU Grade Viewer（台大課程網成績分布插件）](https://github.com/weiiiii0622/NTU-Grade-Viewer) | 成績分布 | 學生（weiiiii0622） | 免登入 | 不明 | Chrome 插件，在臺大課程網顯示各課程歷年成績分布 | repo 最後 push 2025-05-23；成績資料為群眾填報。 [repo](https://github.com/weiiiii0622/NTU-Grade-Viewer) |
| [NTU_ScoreSharing（MINS）](https://chromewebstore.google.com/detail/ibpfdaflfpdimokpjfaknocbjfcobide) | 成績分布 | 學生（MINS（cin-yi-wei）） | 免登入 | 停止 | 在課程查詢頁加入歷年平均 GPA 欄位，交換條件為上傳自己的修課成績 | v2.1.0（2021-07-14）、259 users；商店頁現已無內容，疑似下架；GPLv3。 [repo](https://github.com/cin-yi-wei/mins) |
| [NTU課表轉桌布](https://chromewebstore.google.com/detail/ecgkdpafjhjamknmjemhghhgdopinmjc) | 其他 | 不明（unknown） | 需登入 | 運作中 | 讀取臺大課程網選課結果並轉成手機桌布 | v1.1.0、150 users、2026-09-15 更新；需登入臺大選課系統才讀得到課表。 |
| [Browser-NTU-course-search](https://github.com/CindyLinz/Browser-NTU-course-search) | 排課 | 學生（CindyLinz） | 需登入 | 不明 | 台大選課網站輔助工具：依已加入課表在搜尋頁標示已選或衝堂 | repo 最後 push 2025-08-21。 [repo](https://github.com/CindyLinz/Browser-NTU-course-search) |
| [khò-ji̍t 課日](https://github.com/bobby1030/khojit) | 其他 | 學生（bobby1030） | 免登入 | 停止 | 把臺大課程網預選清單轉成 .ics 匯入行事曆 | repo 最後 push 2022-02-13。 [repo](https://github.com/bobby1030/khojit) |
| [NTU Course Calendar](https://annie04082020.github.io/ntu-course-calendar/) | 其他 | 學生（Annie04082020） | 免登入 | 運作中 | 讀取臺大課程網資料匯出 .ics，並提供 iOS Scriptable／Android 桌面小工具 | repo 最後 push 2026-09-15。 [repo](https://github.com/Annie04082020/ntu-course-calendar) |
| [台大選課輔助程式](https://ntucourse.ericyu.org/) | 課程查詢、排課 | 學生（ericyu） | 免登入 | 停止 | 臺大課程查詢與排課輔助網頁 | 網站可連線，頁面僅見 108-2／110-1 學期字樣；repo 最後 push 2020-02-02，推定停更。 [repo](https://github.com/ericyu/ntucourse) |
| [NTU Course Bot 台大課程機器人](https://www.fb.com/ntucoursebot/) | 課程查詢 | 學生（alvinbhou / CryoliteZ） | 免登入 | 停止 | 跨平台聊天機器人（Messenger 等），依 GPA 排序課程並連結課程網，資料取自 NTU Sweety Course | repo 最後 push 2023-02-27；資料來源 NTU Sweety 已停止。 [repo](https://github.com/alvinbhou/NTU-Course-Bot) |
| [台大課程喵喵（NTUCourseCat）](https://hackmd.io/@ruby0322/rJCEPIUCF) | 課程查詢 | 學生（ruby0322） | 免登入 | 不明 | LINE bot 查詢臺大課程，後端利用課程網系所查詢頁 | 僅找到 HackMD 開發說明（標題 NTUCourseCat Repo），未找到可用的 bot 帳號或 repo。 |
| [NTU Unofficial App](https://apps.apple.com/us/app/ntu-unofficial-app/id6758853060) | 其他 | 學生（HSIN-CHE CHUNG） | 需登入 | 運作中 | iOS App：學期成績、課表、NTU COOL 作業截止追蹤、校園天氣 | 2026 年上架（v2.0 3/9）；Flutter 開發；需輸入臺大帳密（非 SSO），Dcard 有使用者提出帳密疑慮。 |

**跨校平台涵蓋**：[國立臺灣大學系統（臺大系統）](https://ntusystem.ntu.edu.tw/)、[CrossLink 臺大、臺科大、臺師大選課模擬](https://www.crosslink.tw/)、[UniCourse 查課](https://unicourse.observe.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)、[Tw-open-course-catcher](https://github.com/u-tung/Tw-open-course-catcher)

### 國立臺灣師範大學（0004） · UniCourse slug `ntnu`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課程查詢（日間學制）](https://courseap2.itc.ntnu.edu.tw/acadmOpenCourse/index.jsp) | 課程查詢、教學大綱 | 官方（國立臺灣師範大學） | 免登入 | 運作中 | 查日間班各學期開課與課程綱要。 | 在職專班與 EMBA 有獨立查詢入口。 courseap2.itc.ntnu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [課程查詢（在職專班暨 EMBA 班）](https://courseap2.itc.ntnu.edu.tw/acadmPOpenCourse/) | 課程查詢、教學大綱 | 官方（國立臺灣師範大學） | 免登入 | 運作中 | 查在職專班及 EMBA 開課。 | courseap2.itc.ntnu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [師大課程地圖](https://courseap.itc.ntnu.edu.tw/NtnuCurriculumMap/) | 課程地圖 | 官方（國立臺灣師範大學） | 不明 | 不明 | 師大修業課程地圖。 | courseap.itc.ntnu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [學生選課系統](https://cos1s.ntnu.edu.tw/AasEnrollStudent) | 選課 | 官方（國立臺灣師範大學） | 需登入 | 運作中 | 校內學生依年級、學制分流登入後選課。 | 本網址為大一入口；大二至大四、研究生及在職專班入口見在校生頁。 cos1s.ntnu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [Moodle 數位學習平台](https://moodle3.ntnu.edu.tw/) | LMS | 官方（國立臺灣師範大學） | 需登入 | 運作中 | 師大 Moodle 提供師生教材、作業等課堂資源。 | moodle3.ntnu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NTNUx 課程查詢系統](https://ntnux.org/) | 課程查詢、排課 | 學生（NTNUx（GitHub org）） | 免登入 | 運作中 | 更快、行動裝置友好的臺師大課程查詢，含選課時程與官方系統連結 | 頁面含 115-1 資料；repo 最後 push 2026-11-23。 [repo](https://github.com/NTNUx/NTNUx) |
| [師大好排課 NTNU Scheduler Pro](https://ntnu-scheduler-pro.pages.dev/) | 排課、評價、討論 | 不明（unknown） | 部分需登入 | 運作中 | 拖曳排課、衝堂偵測、課程論壇、學長姐甜涼評分與 AI 評價統整 | 需使用者自官方『開課資料匯出』匯入；評價來源含 FB 師大選課交流社團與 1111 歐趴糖。頁面含 111–113 學期字樣。 |
| [NTNU Course Planner（shiraga1094）](https://shiraga1094.github.io/NTNUCoursePlanner/) | 排課 | 學生（shiraga1094） | 免登入 | 運作中 | 臺師大課程排課系統 | repo 最後 push 2026-11-13；頁面見 113-1 字樣。 [repo](https://github.com/shiraga1094/NTNUCoursePlanner) |
| [師大課程排隊網站](https://github.com/aisu-programming/NTNU-Course-Queuing-Website) | 選課 | 學生（aisu-programming） | 免登入 | 停止 | 師大課程排隊（候補）網站前後端 | repo 最後 push 2022-10-07；未見線上服務。 [repo](https://github.com/aisu-programming/NTNU-Course-Queuing-Website) |

**跨校平台涵蓋**：[國立臺灣大學系統（臺大系統）](https://ntusystem.ntu.edu.tw/)、[CrossLink 臺大、臺科大、臺師大選課模擬](https://www.crosslink.tw/)、[UniCourse 查課](https://unicourse.observe.tw/)、[UniCourse（舊版，unicourse.tw）](https://unicourse.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立成功大學（0005） · UniCourse slug `ncku`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [成功大學課程資訊及選課系統](https://course.ncku.edu.tw/index.php?c=portal) | 課程查詢、教學大綱、選課 | 官方（國立成功大學） | 部分需登入 | 運作中 | 公開查詢開課與課綱，校內學生登入辦理選課。 | 歷年查詢有另一子網域；查詢可開啟不表示可自動擷取。 course.ncku.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [全校課程地圖](https://course-map.ncku.edu.tw/) | 課程地圖 | 官方（國立成功大學） | 部分需登入 | 不明 | 公開瀏覽成大課程地圖，個人化功能使用成功入口帳號。 | 舊課務組網址轉往專用課程地圖主機；未確認最近更新。 course-map.ncku.edu.tw：robots.txt 回傳 HTTP 404。 |
| [課程大綱上網](http://class-qry.acad.ncku.edu.tw/syllabus) | 教學大綱 | 官方（國立成功大學） | 需登入 | 停止 | 教務處另設的課綱上網入口。 | 教師維護端；學生公開閱讀走課程查詢，不是同一功能。 本次未能開啟此入口（HTTP 403），不代表官方已宣告停用。 class-qry.acad.ncku.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /syllabus/uploads、Disallow: /syllabus/download、Disallow: /syllabus/ext4.2、Disallow: /syllabus/log、Disallow: /syllabus/test。 |
| [成功大學數位學習平臺](https://moodle.ncku.edu.tw/) | LMS | 官方（國立成功大學） | 需登入 | 運作中 | NCKU Moodle 提供教材、點名、作業與線上評量。 | moodle.ncku.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [成功大學各學期課程](https://data.ncku.edu.tw/dataset/8d6462ee513f1c1a601506265cc9f674) | 開放資料 | 官方（國立成功大學） | 免登入 | 停止 | 校方開放資料平台提供 105-1 至 107-2 開課 CSV。 | 資料最後更新於 2019 年；資料集仍可瀏覽，但未持續更新。 data.ncku.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /dataset/rate/、Disallow: /revision/、Disallow: /dataset/*/history、Disallow: /api/、Crawl-Delay: 10。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NCKU HUB](https://nckuhub.com/) | 評價、排課 | 學生（成大學生（Nick Liao、Derek Chen、Davin Lin 等）） | 部分需登入 | 運作中 | 課程心得與評分（收穫、甜度、涼度）、模擬課表、餘額追蹤選課小幫手 | 瀏覽免登入，寫評價與小幫手需 Google 登入；2026-07 上線的 ncku.net 仍列為主要課程評價平台。 |
| [NCKU++ 成功大學課程資訊及選課系統](https://wavjaby.github.io/NCKUpp/) | 課程查詢、排課、選課 | 學生（WavJaby） | 部分需登入 | 運作中 | 整合成大課程查詢、NCKU HUB、UrSchool；課表、志願排序、成績查詢 | 現轉址 git.wavjaby.com/NCKUpp；repo 最後 push 2025-02-24（47★），登入後可連動選課。 [repo](https://github.com/WavJaby/NCKUpp) |
| [NCKU-Evaluator](https://github.com/ncchen99/NCKU-Evaluator) | 評價 | 學生（ncchen99） | 需登入 | 運作中 | Chrome 擴充：在成大選課系統注入 UrSchool 與 NCKU HUB 評價 | 需開發者模式載入；repo 最後 push 2026-11-18（37★）。UrSchool 本站目前已無法使用。 [repo](https://github.com/ncchen99/NCKU-Evaluator) |
| [NCKU 選課模擬器](https://vincent550102.github.io/NCKU-Classboard-Simulator/) | 排課 | 學生（Vincent550102） | 免登入 | 停止 | 成大課表模擬 | 頁面可連線；repo 最後 push 2022-07-24。 [repo](https://github.com/Vincent550102/NCKU-Classboard-Simulator) |
| [NCKU Course Extended](https://chromewebstore.google.com/detail/igimiakkkmfanmpcdocbikkkolgibcea) | 其他 | 學生（simba-fs） | 免登入 | 停止 | 成大選課系統擴充，目前僅記住篩選條件 | v1.1、6 users、2022-06-23 更新；repo 已封存。 [repo](https://github.com/simbafs/NCKU-Extended) |
| [ncku-course 共享成績分佈圖](https://github.com/simbafs/ncku-course) | 成績分布 | 學生（simbafs） | 免登入 | 停止 | 共享成大課程成績分布圖 | repo 最後 push 2023-08-03。 [repo](https://github.com/simbafs/ncku-course) |
| [成大選課小幫手（festime）](https://ncku-select-course-helper.herokuapp.com/) | 課程查詢 | 學生（festime） | 免登入 | 停止 | 抓取成大官方課程資料提供較易用的查詢 | Heroku 404；repo 最後 push 2015-08-28。 [repo](https://github.com/festime/NCKU-select-course-helper) |
| [ncku.net 成大學生資訊入口](https://ncku.net/) | 其他 | 不明（unknown） | 免登入 | 運作中 | 成大學生資訊入口：校園消息、常用平台連結（含 NCKU HUB）與新手指南 | 2026-07-21 上線。 |

**跨校平台涵蓋**：[臺灣綜合大學系統（臺綜大）](https://www.tcus.edu.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立中興大學（0006） · UniCourse slug `nchu`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中興大學課程查詢](https://onepiece.nchu.edu.tw/cofsys/plsql/crseqry_home) | 課程查詢、教學大綱 | 官方（國立中興大學） | 免登入 | 運作中 | 依系所及學期查詢歷年開課，並由結果查看課程大綱。 | 另有綜合查詢。 onepiece.nchu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [興大入口（教務系統）](https://portal.nchu.edu.tw/) | 選課 | 官方（國立中興大學） | 需登入 | 運作中 | 校園入口登入後進入教務系統辦理選課。 | portal.nchu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [iLearning3.0 數位教學平台](https://lms2020.nchu.edu.tw/) | LMS | 官方（國立中興大學） | 需登入 | 運作中 | 由教發中心維護的校內數位教學平台。 | lms2020.nchu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /media/s/、Disallow: /km/s/、Disallow: /*.mp4$。 |
| [課程地圖（智慧創意工程學士學位學程）](https://upice.nchu.edu.tw/course_map.php) | 課程地圖 | 官方（國立中興大學） | 免登入 | 不明 | 單一學程公開列出修課領域及地圖。 | 系所級示例，非全校地圖。 upice.nchu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中興大學選課小幫手（iach526526）](https://iach526526.github.io/NCHU_Course_Selector/) | 課程查詢、排課 | 學生（iach526526（fork 自 EricYang801）） | 免登入 | 運作中 | 關鍵字／系所／教師搜尋、即時衝堂課表；每日 06:00 GitHub Actions 爬取官方 JSON | 涵蓋學士、碩博、進修部、在職專班、通識體育；最後 push 2026-11-26。上游 EricYang801/NCHU_Course_Selector 最後 push 2026-01-06。 [repo](https://github.com/iach526526/NCHU_Course_Selector) |
| [中興選課小幫手（學生會）](http://course.nchusg.org/) | 排課、課程查詢 | 學生（中興大學學生會資訊部、資訊社） | 免登入 | 停止 | 雙主修介面、全學制選課模擬、課綱查詢、中籤率與剩餘名額 | course.nchusg.org 與 campass.com.tw 皆無法解析；repo 最後 push 2018-12-14。 [repo](https://github.com/david30907d/CoursePickingHelper) |
| [nchu-academic-navigator](https://github.com/yuanting0117a/nchu-academic-navigator) | 課程地圖、排課 | 學生（yuanting0117a） | 免登入 | 運作中 | 中興畢業學分與修課路徑規劃，可匯入官方課程查詢 Excel/CSV | 最後 push 2026-11-23；支援 114、115 學年入學。 [repo](https://github.com/yuanting0117a/nchu-academic-navigator) |

**跨校平台涵蓋**：[臺灣綜合大學系統（臺綜大）](https://www.tcus.edu.tw/)、[UniCourse 查課](https://unicourse.observe.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立陽明交通大學（0007） · UniCourse slug `nycu`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立陽明交通大學課程時間表](https://timetable.nycu.edu.tw/) | 課程查詢、教學大綱、API | 官方（國立陽明交通大學） | 免登入 | 運作中 | 依學期、開課單位或特定條件查課及大綱。 | 介面透過表單請求取得 JSON；非對外承諾的開放 API。 timetable.nycu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [陽明交通大學課程選課系統](https://cos.nycu.edu.tw/) | 選課 | 官方（國立陽明交通大學） | 需登入 | 運作中 | 學生選課及加退選的登入入口。 | cos.nycu.edu.tw：robots.txt 的 User-agent: * 未列非空的存取限制。 |
| [e3 數位學習平台](https://e3.nycu.edu.tw/) | LMS | 官方（國立陽明交通大學） | 需登入 | 停止 | 陽明交大 e3 課程與教學活動平台。 | 新生指引明列入口；未登入。 本次未能開啟此入口（timed out），不代表官方已宣告停用。 e3.nycu.edu.tw：robots.txt 無法取得（timed out），未判定規則。 |
| [課程地圖（管理科學系）](https://ms.nycu.edu.tw/zh_tw/download/map) | 課程地圖 | 官方（國立陽明交通大學） | 免登入 | 不明 | 管科系公開提供課程地圖。 | 系所級示例，非全校地圖。 ms.nycu.edu.tw：robots.txt 回傳 HTTP 200，未見可辨識的存取規則。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NYCU 課程探索 · Course Explorer（非官方）](https://timetable.nycu.tw/) | 課程查詢、排課 | 不明（unknown） | 免登入 | 運作中 | 依領域、教師、時間、校區與大綱篩選課程，收藏並以連結分享課表，顯示選課熱度與『寶藏課』 | 頁面含 1151（115-1）資料，資料整理自公開課表，聲明與學校無關。 |
| [交大課程助理](https://nctucourse.louisif.me/) | 排課、其他 | 學生（gamerslouis） | 部分需登入 | 運作中 | 選課模擬、課表匯出圖片、GPA 計算、依空堂搜尋通識 | NYCU OAuth 登入；repo 最後 push 2026-08-02（37★）。 [repo](https://github.com/gamerslouis/nctucourse) |
| [NYCU 選課助手](https://chromewebstore.google.com/detail/miaebenciplpjnmbfnhibkkgfeiciijn) | 排課、課程查詢 | 學生（nycu-portal（GitHub org）） | 需登入 | 運作中 | Chrome 擴充：AI 搜尋、課表建立與匯出、收藏管理 | v3.3.0、50 users、2026-06-16 更新。 [repo](https://github.com/nycu-portal/Course_Registration) |
| [NYCU 預排課程匯入](https://chromewebstore.google.com/detail/looiljidkdllkbabaiamgeblekkdgfef) | 選課、課程查詢 | 學生（engelyu） | 需登入 | 運作中 | 跨院系直接搜尋課程並一鍵加入預排／正式選課、我的課表 | v0.15.0、6 users、2026-10-04 更新。 [repo](https://github.com/engelyu/nycucourse-extension) |
| [NYCU Timetable 選課模擬系統](https://huskyee.github.io/NYCU_Timetable/) | 排課 | 學生（Huskyee） | 免登入 | 停止 | 搜尋課程、衝堂標色、加入課表並下載圖片 | 網站可連線，repo 最後 push 2023-02-14，資料學期未確認。 [repo](https://github.com/Huskyee/NYCU_Timetable) |
| [NCTU+](https://plus.nctu.edu.tw/) | 評價、排課、討論 | 學生（nctuplus（GitHub org，交大學生）） | 免登入 | 停止 | 交大課程評價（涼度、甜度、深度）、排課與考古題分享 | plus.nctu.edu.tw 與 nctuplus.hopto.org 皆 DNS 無法解析；主 repo 最後 push 2021-02-16（70★）。 [repo](https://github.com/nctuplus/nctuplus) |
| [NCTUwU 交大選課模擬器](http://uwu.nctu.moe/) | 排課 | 學生（splitline） | 免登入 | 停止 | 選課模擬、課表匯出圖片、分享匯入課表 | uwu.nctu.moe 現轉址到 nycu.moe（交大 VTuber 社），服務已不在；repo 最後 push 2020-09-07。 [repo](https://github.com/splitline/NCTUwU) |
| [NiceCourseToU 交大一站式選課](https://solrz.github.io/nice-course-to-u/) | 排課 | 學生（solrz） | 免登入 | 停止 | 交大選課助手網頁 | 頁面可連線；repo 最後 push 2020-09-10。 [repo](https://github.com/solrz/nice-course-to-u) |
| [交大預排課表小工具](https://lys0829.github.io/NCTUPreTimetable/) | 排課 | 學生（lys0829） | 免登入 | 運作中 | 預排課表工具 | repo 最後 push 2026-11-26。 [repo](https://github.com/lys0829/NCTUPreTimetable) |
| [NCTU Timetable+](https://timetable.csy54.tw/) | 課程查詢 | 不明（unknown） | 免登入 | 停止 | 交大課程時間表增強版 | DNS 無法解析；僅見於 awesome-nctu 清單。 |
| [交大個人助理](https://course.nctu.xyz/) | 排課 | 不明（unknown） | 免登入 | 停止 | 交大選課／個人助理 | DNS 無法解析；僅見於 awesome-nctu 清單。 |
| [PTT NCTU-Teacher 看板](https://www.ptt.cc/bbs/NCTU-Teacher/index.html) | 評價、討論 | 社群（PTT 批踢踢實業坊） | 免登入 | 運作中 | 交大教師與課程評價看板 | 最新非置底文章 2026-10-09。 |
| [awesome-nctu](https://github.com/Cycatz/awesome-nctu) | 其他 | 學生（Cycatz） | 免登入 | 運作中 | 交大相關網站與資源彙整清單（含排課選課工具） | 最後 push 2026-04-21；但其中多數選課工具連結已失效。 [repo](https://github.com/Cycatz/awesome-nctu) |

**跨校平台涵蓋**：[台灣聯合大學系統（台聯大）](https://www.ust.edu.tw/)、[UniCourse 查課](https://unicourse.observe.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)、[Tw-open-course-catcher](https://github.com/u-tung/Tw-open-course-catcher)

### 國立中央大學（0008） · UniCourse slug `ncu`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中央大學選課系統／課程查詢](https://cis.ncu.edu.tw/Course/main/query/byKeywords) | 課程查詢、教學大綱、選課 | 官方（國立中央大學） | 部分需登入 | 運作中 | 公開依關鍵字或開課單位查課表及詳細資料，學生登入後選課。 | 教務處列 /Course/ 為選課系統，與供管理者使用的 CourseMgr 不同。 cis.ncu.edu.tw：robots.txt 對 User-agent: * 列出 Disallow: / 及其他服務例外，未允許 /Course/。 |
| [課務資訊網課程地圖](https://course.ncu.edu.tw/p/412-1014-82.php?Lang=zh-tw) | 課程地圖 | 官方（國立中央大學） | 免登入 | 不明 | 中大課務資訊網集中呈現課程地圖資源。 | course.ncu.edu.tw：robots.txt 的 User-agent: * 規則包含 Allow: /。 |
| [國立中央大學「新 ee-class 系統」](https://ncueeclass.ncu.edu.tw/) | LMS | 官方（國立中央大學） | 需登入 | 運作中 | ee-class 平台支援校內課程與教學活動。 | ncueeclass.ncu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /media/s/、Disallow: /km/s/、Disallow: /*.mp4$。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NCU Course Finder](https://ncucf.zetaraku.dev/) | 課程查詢、排課 | 學生（zetaraku（Raku Zeta）） | 免登入 | 運作中 | 直覺易用的中央大學課程瀏覽與搜尋（Vue 3） | 最後 push 2026-08-24（27★）；資料抓取 NCU-Course-Finder-DataFetcher(-v2)。 [repo](https://github.com/zetaraku/NCU-Course-Finder-v6) |
| [NCU 智慧選課模擬](https://dr-xyz.github.io/ncu-course-helper/) | 排課 | 學生（Dr-XYZ） | 免登入 | 運作中 | 中央選課模擬：爬蟲、必修檢查、選課限制、課表匯出圖片 | 頁面含 114-2、115-1；最後 push 2026-11-26。 [repo](https://github.com/Dr-XYZ/ncu-course-helper) |
| [NCU-Plus course-fetcher](https://github.com/NCU-Plus/course-fetcher) | API、開放資料 | 學生（NCU-Plus（GitHub org）） | 免登入 | 停止 | 從中央排課系統抓課程並更新 open API 資料庫 | 最後 push 2023-08-30。 [repo](https://github.com/NCU-Plus/course-fetcher) |

**跨校平台涵蓋**：[台灣聯合大學系統（台聯大）](https://www.ust.edu.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立中山大學（0009）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立中山大學選課系統](http://selcrs.nsysu.edu.tw/) | 課程查詢、教學大綱、選課 | 官方（國立中山大學） | 部分需登入 | 運作中 | 校內登入選課，公開查當期及歷年課表。 | selcrs.nsysu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 selcrs.nsysu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [中山網路大學](https://elearn.nsysu.edu.tw/) | LMS | 官方（國立中山大學） | 需登入 | 運作中 | 中山校內數位課程與教學活動平台。 | 系統頁面標示 Moodle。 elearn.nsysu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /、Allow: /$。 |
| [課程結構圖](https://oaa.nsysu.edu.tw/p/412-1003-16338.php?Lang=zh-tw) | 課程地圖 | 官方（國立中山大學） | 免登入 | 不明 | 中山大學教務處公布的課程結構圖入口。 | 結構圖是修業規劃，不是逐班開課清單。 oaa.nsysu.edu.tw：robots.txt 對 User-agent: * 列出 Allow: /。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中山選課助手 V6](https://nsysu-opendev.github.io/NSYSUCourseSelectorV6/) | 課程查詢、排課 | 學生（NSYSU-OpenDev） | 免登入 | 運作中 | 快速查詢中山課程資訊與排課（第六代） | 最後 push 2026-11-24；舊版 NSYSUSelectorHelper 仍可連線。 [repo](https://github.com/NSYSU-OpenDev/NSYSUCourseSelectorV6) |
| [NSYSU Course API](https://nsysu-opendev.github.io/NSYSUCourseAPI/) | API、開放資料 | 學生（NSYSU-OpenDev） | 免登入 | 運作中 | 中山選課列表 API（含驗證碼辨識模型） | 最後 push 2026-11-26；另有 dennischu0116-boop/nsysu-course-api 提供 111下–115上歷史資料。 [repo](https://github.com/NSYSU-OpenDev/NSYSUCourseAPI) |

**跨校平台涵蓋**：[臺灣綜合大學系統（臺綜大）](https://www.tcus.edu.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立臺灣海洋大學（0012）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [各類課程資料查詢系統](https://academic.ntou.edu.tw/p/412-1005-1126-1.php) | 課程查詢、教學大綱 | 官方（國立臺灣海洋大學） | 免登入 | 運作中 | 教務處公開入口分列當學期及歷年課表查詢。 | 資料查詢實際進入 ais.ntou.edu.tw；課綱可用性依課程而異。 academic.ntou.edu.tw：robots.txt 的 User-agent: * 規則包含 Allow: /。 |
| [教務資訊系統 v4](https://academics.ntou.edu.tw/system/) | 選課 | 官方（國立臺灣海洋大學） | 需登入 | 運作中 | 校內登入後進入選課等教務作業。 | academics.ntou.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 |
| [學習 e-Go 課程地圖查詢系統](http://classmap.ntou.edu.tw/) | 課程地圖 | 官方（國立臺灣海洋大學） | 免登入 | 停止 | 海大校方學習入口連結全校課程地圖，對照課程、核心能力與職種。 | 學習 e-Go 確有列全校地圖入口，但本次開啟逾時，不代表官方已停用。 classmap.ntou.edu.tw：robots.txt 無法取得（逾時）。 |
| [TronClass 教學平台](https://tronclass.ntou.edu.tw/) | LMS | 官方（國立臺灣海洋大學） | 需登入 | 運作中 | TronClass 提供課程教材、互動和評量。 | tronclass.ntou.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /、Allow: /$。 |

**跨校平台涵蓋**：[臺北聯合大學系統（北聯大）臺北聯大課程](https://ustp.ntpu.edu.tw/info/8)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立中正大學（0013） · UniCourse slug `ccu`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [eCourse2 教學課程系統](https://ecourse2.ccu.edu.tw/local/syllabus/syllabus_dep.php) | LMS、課程查詢、教學大綱 | 官方（國立中正大學） | 部分需登入 | 運作中 | Moodle 架構的教學平台，另公開系所課程與教學大綱。 | 本網址是免登入的系所課綱，校內 Moodle 課室另需登入。 ecourse2.ccu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [選課系統 iCCU](https://www026220.ccu.edu.tw/) | 選課 | 官方（國立中正大學） | 需登入 | 運作中 | 中正學生登入查詢與辦理選課。 | www026220.ccu.edu.tw：robots.txt 的 User-agent: * 未列非空的存取限制。 |
| [課程地圖](http://coursemap.ccu.edu.tw/) | 課程地圖 | 官方（國立中正大學） | 不明 | 停止 | 中正大學課程地圖入口。 | 本次未能開啟此入口（timed out），不代表官方已宣告停用。 coursemap.ccu.edu.tw：robots.txt 無法取得（timed out），未判定規則。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [CCU Class](https://ccuclass.com/) | 排課、課程查詢 | 學生（中正傳播、資工學生） | 免登入 | 運作中 | 中正排課網站，支援拖曳時段搜尋與依教師搜尋 | Dcard 中正板約一個月前仍有人推薦；SPA 頁面無法讀出學期。 |
| [CCU PLUS](https://ccu.plus/) | 評價 | 學生（中正學生） | 免登入 | 不明 | 中正課程評價系統 | 可連線但為 SPA，無法確認更新時間。 |
| [TAT-CCU](https://github.com/KoukeNeko/TAT-CCU) | 其他 | 學生（KoukeNeko） | 需登入 | 運作中 | 中正非官方 App：課表、eCourse2 與校務系統（iOS/macOS/Android/Windows） | 最後 push 2026-11-24。 [repo](https://github.com/KoukeNeko/TAT-CCU) |
| [中正大學選課指北](https://hackmd.io/@9csp0i8WTXeQR0wGNdul9A/CCU_course) | 評價 | 社群（中正學生共筆） | 免登入 | 不明 | 中正課程心得共筆（甜度、點名等） | HackMD 共筆，更新時間未確認。 |

**跨校平台涵蓋**：[臺灣綜合大學系統（臺綜大）](https://www.tcus.edu.tw/)、[UniCourse 查課](https://unicourse.observe.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立高雄師範大學（0014）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課務查詢（網路選課）](https://sso.nknu.edu.tw/Staff/CourseEnrollInfo/CourseEnrollInfo.aspx) | 課程查詢、教學大綱 | 官方（國立高雄師範大學） | 部分需登入 | 運作中 | 高師大選課及開課資訊查詢頁。 | 公開頁與單一登入並存；未測需登入的詳細項目。 sso.nknu.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 |
| [網路選課系統](https://sso.nknu.edu.tw/AcademicAffairs/SelectCourse/default.aspx) | 選課 | 官方（國立高雄師範大學） | 需登入 | 運作中 | 高師大學生自單一登入網路資訊平台辦理選課。 | sso.nknu.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 |
| [課程核心能力一覽](https://sso.nknu.edu.tw/CourseMap/showList.aspx) | 課程地圖 | 官方（國立高雄師範大學） | 免登入 | 運作中 | 依學院系所查看課程及核心能力對應。 | sso.nknu.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 |
| [高師大數位學習專區](https://moocs.nknu.edu.tw/moodle/) | LMS | 官方（國立高雄師範大學） | 部分需登入 | 停止 | 高師大校首頁列出的 Moodle 數位學習站。 | 屬數位學習專區，未確認是否全校一般課程的主要 LMS。 本次未能開啟此入口（timed out），不代表官方已宣告停用。 moocs.nknu.edu.tw：robots.txt 無法取得（timed out），未判定規則。 |

### 國立彰化師範大學（0015）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [開課查詢](https://webap0.ncue.edu.tw/deanv2/other/ob010) | 課程查詢、教學大綱 | 官方（國立彰化師範大學） | 免登入 | 運作中 | 免登入按學年、學期查詢彰師大開課。 | webap0.ncue.edu.tw：robots.txt 無法取得（Exceeded maximum allowed redirects.），未判定規則。 |
| [彰師大教務系統](https://webap2s.ncue.edu.tw/curri/stuEntry.html) | 選課 | 官方（國立彰化師範大學） | 需登入 | 運作中 | 校內學籍及網路選課的學生入口。 | webap2s.ncue.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [新雲端學院](https://tronclass.ncue.edu.tw/) | LMS | 官方（國立彰化師範大學） | 需登入 | 運作中 | 彰師大 TronClass 教學平台。 | tronclass.ncue.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /、Allow: /$。 |
| [課程地圖（師資培育中心）](https://practiceweb.ncue.edu.tw/p/412-1007-675.php?Lang=zh-tw) | 課程地圖 | 官方（國立彰化師範大學） | 免登入 | 不明 | 依入學年度提供師資培育教育專業課程地圖。 | 師資培育中心服務，非全校所有系所；本頁所列地圖更新時間未達活動判定門檻。 practiceweb.ncue.edu.tw：robots.txt 對 User-agent: * 列出 Allow: /。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NCUE 課程查詢模擬選課](https://github.com/yoychen/ncue-curriculum-chrome-extension) | 排課 | 學生（yoychen） | 免登入 | 停止 | 彰師大課程查詢模擬選課 Chrome 擴充 | 最後 push 2016-06-26。 [repo](https://github.com/yoychen/ncue-curriculum-chrome-extension) |

### 國立臺北大學（0017）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課程查詢系統](http://sea.cc.ntpu.edu.tw/pls/dev_stud/course_query_all.chi_main) | 課程查詢、教學大綱 | 官方（國立臺北大學） | 免登入 | 運作中 | 免登入查詢臺北大學開課及課程大綱。 | 校方 HTTPS 連結交握失敗；改用同路徑 HTTP 可開啟。 sea.cc.ntpu.edu.tw：robots.txt 對 User-agent: * 列出 Disallow: /，例外 /index.html、/admin_new.htm、/courseQuery.html，不包括本筆 PLS 路徑。 |
| [課程地圖](http://sea.cc.ntpu.edu.tw/pls/eval/cmap_3sys.main) | 課程地圖 | 官方（國立臺北大學） | 免登入 | 運作中 | 公開依系所與學年度查閱修課規劃。 | 校方 HTTPS 連結交握失敗；改用同路徑 HTTP 可開啟。 sea.cc.ntpu.edu.tw：robots.txt 對 User-agent: * 列出 Disallow: /，例外 /index.html、/admin_new.htm、/courseQuery.html，不包括本筆 PLS 路徑。 |
| [國立臺北大學學生資訊系統](http://ohs01.ntpu.edu.tw/student_new.htm) | 選課 | 官方（國立臺北大學） | 需登入 | 運作中 | 學生登入後進入課務與選課服務。 | 實測 HTTP 可開啟；相同網址的 HTTPS 交握失敗。未登入。 ohs01.ntpu.edu.tw：robots.txt 對 User-agent: * 列出 Disallow: /。 |
| [數位學苑 3.0](https://lms3.ntpu.edu.tw/) | LMS | 官方（國立臺北大學） | 需登入 | 運作中 | 國立臺北大學校內教學、課程活動與測驗平台。 | 系統頁面標示 Moodle。 lms3.ntpu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺北大學選課大全 NTPU Course](https://no21.ntpu.org/) | 評價 | 學生（網遇北大、臺北大學學生會、臺北大學課程討論版） | 免登入 | 運作中 | 匿名課程心得，依課名、教師、流水號搜尋，難度與推薦星等 | 頁面見 115-2 等學期字樣，評價多集中在 2023–2024。 |
| [NTPU LINE Bot（ntpu-linebot-go）](https://ntpubot.garyellow.dev/) | 課程查詢 | 學生（garyellow） | 免登入 | 運作中 | LINE bot：查近期與歷年課程、以描述語意搜尋大綱、學程與聯絡資訊 | 最後 push 2026-11-25。 [repo](https://github.com/garyellow/ntpu-linebot-go) |

**跨校平台涵蓋**：[臺北聯合大學系統（北聯大）臺北聯大課程](https://ustp.ntpu.edu.tw/info/8)

### 國立嘉義大學（0018）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [全校課程查詢](https://web085003.adm.ncyu.edu.tw/pub_course.aspx) | 課程查詢、教學大綱 | 官方（國立嘉義大學） | 免登入 | 運作中 | 免登入查全校課程及課綱資料。 | web085003.adm.ncyu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /；另有其他規則。 |
| [校務行政系統](https://web085004.adm.ncyu.edu.tw/) | 選課 | 官方（國立嘉義大學） | 需登入 | 運作中 | 學生校務登入後辦理選課與教務。 | web085004.adm.ncyu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [課程地圖](https://web085004.adm.ncyu.edu.tw/webcourse/Map_School.aspx?MapYear=114) | 課程地圖 | 官方（國立嘉義大學） | 免登入 | 運作中 | 公開按學年與學系查閱課程規劃。 | 教務處本次列出 114 學年度地圖。 web085004.adm.ncyu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [學習地圖](https://guides.ncyu.edu.tw/Map_DeptList.aspx?year=112) | 課程地圖 | 官方（國立嘉義大學） | 免登入 | 停止 | 教務處另列的嘉大各系學習地圖。 | 校方連結以 112 學年度為參數，與校務系統課程地圖分開。 本次未能開啟此入口（HTTP 403），不代表官方已宣告停用。 guides.ncyu.edu.tw：robots.txt 回傳 HTTP 403；未取得規則。 |
| [輔助教學平台](https://ecourse.ncyu.edu.tw/) | LMS | 官方（國立嘉義大學） | 需登入 | 運作中 | 嘉大課堂教材與教學活動平台。 | 系統頁面標示 Moodle。 ecourse.ncyu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [嘉大選課輔助器](https://tony11306.github.io/Chiayi-university-course-selection-support/) | 排課 | 學生（tony11306） | 免登入 | 不明 | 衝堂鎖定、課表預覽、篩選、學分計算 | 可連線；作者另有嘉義大學課表產生器（repo 最後 push 2024-02）。 |

### 國立高雄大學（0019）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課程查詢系統](http://course.nuk.edu.tw/QueryCourse/QueryCourse.asp) | 課程查詢、教學大綱 | 官方（國立高雄大學） | 免登入 | 運作中 | 公開依學年、學期與單位查開課。 | course.nuk.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /。 course.nuk.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /。 |
| [學生選課系統](http://course.nuk.edu.tw/) | 選課 | 官方（國立高雄大學） | 需登入 | 運作中 | 高雄大學學生登入選課。 | course.nuk.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /。 course.nuk.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /。 |
| [NUK I-Course 智慧選課引導系統](https://icourse.nuk.edu.tw/auth/signIn) | 課程地圖、排課 | 官方（國立高雄大學） | 需登入 | 不明 | 校方列出的智慧選課引導服務。 | 需要登入；不是一般公開開課查詢。 icourse.nuk.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [Moodle 教學平台 4.0](https://elearningv4.nuk.edu.tw/) | LMS | 官方（國立高雄大學） | 需登入 | 運作中 | 高雄大學 Moodle 4 教學平台。 | elearningv4.nuk.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |

### 國立東華大學（0020）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [全校課程查詢](https://sys.ndhu.edu.tw/aa/class/course/Default.aspx) | 課程查詢、教學大綱 | 官方（國立東華大學） | 免登入 | 運作中 | 免登入依學期與開課學系查詢東華開課及課綱。 | sys.ndhu.edu.tw：robots.txt 有特定代理規則，未見 User-agent: *。 |
| [校務資訊系統學生單一登入](https://sys.ndhu.edu.tw/INC/SSO_RWD/Login.aspx?sel=st&lang=tw) | 選課 | 官方（國立東華大學） | 需登入 | 運作中 | 學生從單一登入進入網路選課。 | sys.ndhu.edu.tw：robots.txt 有特定代理規則，未見 User-agent: *。 |
| [學士班學程選課輔助及畢業初審系統](https://web.ndhu.edu.tw/aa/graduate/Login.aspx) | 課程地圖、排課 | 官方（國立東華大學） | 需登入 | 停止 | 協助東華學士班學生規劃學程選課與預查畢業條件。 | 個人化學程工具，非公開課程地圖。 本次未能開啟此入口（timed out），不代表官方已宣告停用。 web.ndhu.edu.tw：robots.txt 無法取得（timed out），未判定規則。 |
| [東華 e 學苑](https://elearn4.ndhu.edu.tw/moodle/) | LMS | 官方（國立東華大學） | 需登入 | 停止 | 東華大學 Moodle 課室。 | 本次未能開啟此入口（timed out），不代表官方已宣告停用。 elearn4.ndhu.edu.tw：robots.txt 無法取得（timed out），未判定規則。 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立暨南國際大學（0021）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [iNCNU 新世代校務系統](https://sis.ncnu.edu.tw/) | 選課 | 官方（國立暨南國際大學） | 需登入 | 運作中 | 暨大新世代校務登入入口，校內選課屬教務服務。 | 未登入核驗選課子頁或公開查課功能。 sis.ncnu.edu.tw：robots.txt 的 User-agent: * 未列非空的存取限制。 |
| [國立暨南國際大學課程資訊網](https://moodle.ncnu.edu.tw/) | LMS | 官方（國立暨南國際大學） | 部分需登入 | 運作中 | Moodle 課程資訊網公開列課，課程教學活動通常需登入。 | 首頁另指向 108–113 學年度的舊站；公開列課不等於完整教務課表。 moodle.ncnu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [校務系統學生及訪客專用簡易版](https://ccweb6.ncnu.edu.tw/student/aspmaker_course_opened_detail_viewsrch.php) | 課程查詢 | 官方（國立暨南國際大學） | 免登入 | 運作中 | 暨大舊版校務系統提供公開開課明細搜尋及本學期開課列表。 | 新世代校務登入與此訪客查詢是不同介面；未確認公開完整課綱。 ccweb6.ncnu.edu.tw：robots.txt 回傳 HTTP 404。 |
| [國立暨南國際大學課程資訊網（108–113 年）](https://moodle108-113.ncnu.edu.tw/) | LMS | 官方（國立暨南國際大學） | 部分需登入 | 停止 | 校方保留 108–113 學年度 Moodle 教學資料，當期課程已改在新版站。 | 可開啟的歷史平台，非目前課程維護入口。 moodle108-113.ncnu.edu.tw：robots.txt 回傳 HTTP 404。 |
| [學士班課程地圖（應用材料及光電工程學系）](https://amoe.ncnu.edu.tw/p/405-1021-35956,c2214.php?Lang=zh-tw) | 課程地圖 | 官方（國立暨南國際大學） | 免登入 | 運作中 | 公開暨大應材光電系學士班 115 學年度的修課地圖。 | 系所級示例，並非全校地圖。 amoe.ncnu.edu.tw：robots.txt 對 User-agent: * 列出 Allow: /。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [自己的課表自己排 2.0（KeBiau）](https://2yc.tw/KeBiau/) | 排課、評價 | 學生（x3388638） | 免登入 | 停止 | 暨大排課表、換課平台、課程評價平台 | 網站可連線；repo 最後 push 2023-03-02（23★）。 [repo](https://github.com/x3388638/KeBiau) |
| [暨大排課表](https://course.snsd0805.com/) | 排課、課程查詢 | 學生（snsd0805） | 免登入 | 運作中 | 暨大課程查詢、衝堂篩選、科系與通識分類 | 最後 push 2026-07-16（27★）。 [repo](https://github.com/snsd0805/NCNU_Course) |

### 國立臺北藝術大學（0028） · UniCourse slug `tnua`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課程暨課程大綱查詢](https://selcrs1.tnua.edu.tw/CourseSearch/HomeCatalogue.aspx) | 課程查詢、教學大綱 | 官方（國立臺北藝術大學） | 免登入 | 運作中 | 依學期、開課單位或進階條件查北藝大課程及大綱。 | selcrs1.tnua.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [教務系統](https://acad6.tnua.edu.tw/NEWB2K/B2KEIPPortal/) | 選課 | 官方（國立臺北藝術大學） | 需登入 | 運作中 | 校內登入辦理北藝大網路選課等教務作業。 | 入口路徑標示 NEWB2K，未由路徑推定廠商。 acad6.tnua.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [新藝學園－數位學習平臺](https://eclass.tnua.edu.tw/) | LMS | 官方（國立臺北藝術大學） | 需登入 | 運作中 | 北藝大校內課堂的數位學習入口。 | eclass.tnua.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /media/s/、Disallow: /km/s/、Disallow: /*.mp4$。 |
| [北藝大課程地圖](https://coursemap.tnua.edu.tw/) | 課程地圖 | 官方（國立臺北藝術大學） | 免登入 | 不明 | 公開瀏覽北藝大各類課程修業地圖。 | 站點可開啟，未確認最近更新。 coursemap.tnua.edu.tw：robots.txt 回傳 HTTP 404。 |

**跨校平台涵蓋**：[UniCourse 查課](https://unicourse.observe.tw/)

### 國立臺灣藝術大學（0029） · UniCourse slug `ntua`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [校務行政系統（選課及成績）](https://uaap.ntua.edu.tw/ntua/) | 課程查詢、選課 | 官方（國立臺灣藝術大學） | 需登入 | 運作中 | 登入後辦理選課及查全校課表、成績。 | 未確認普通學制全校免登入查課入口；與推廣學分班必須區分。 uaap.ntua.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /。 |
| [課程地圖](https://aca.ntua.edu.tw/catalog.aspx?ca=300) | 課程地圖 | 官方（國立臺灣藝術大學） | 免登入 | 不明 | 彙整臺藝大各系課程地圖及修業規劃連結。 | 不是逐學期的開課班次資料。 aca.ntua.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [推廣教育中心學分課程](https://eec.ntua.edu.tw/Course/Credit) | 課程查詢 | 官方（國立臺灣藝術大學） | 免登入 | 運作中 | 公開列出臺藝大推廣學士、碩士學分課程。 | 報名另需登入；本筆僅指查詢，不含普通學制或非學分班。 eec.ntua.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [台藝大網路學園](https://elearning.ntua.edu.tw/) | LMS | 官方（國立臺灣藝術大學） | 需登入 | 停止 | 臺藝大數位學習平台。 | 以校內平台名稱辨識，未登入。 本次未能開啟此入口（HTTP 403），不代表官方已宣告停用。 elearning.ntua.edu.tw：robots.txt 回傳 HTTP 403；未取得規則。 |

### 國立臺東大學（0030）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [臺東大學校務系統](https://infosys.nttu.edu.tw/) | 課程查詢、教學大綱、課程地圖、選課 | 官方（國立臺東大學） | 部分需登入 | 運作中 | 公開查課、週課表與課程地圖，學生登入辦理選課。 | 同一服務下的公開查課與選課入口合併列出。 infosys.nttu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [網路學園](https://eclass2.nttu.edu.tw/) | LMS | 官方（國立臺東大學） | 需登入 | 運作中 | 臺東大學的數位教學入口。 | 在校生頁也列 eclass 子網域別名。 eclass2.nttu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /media/s/、Disallow: /km/s/、Disallow: /*.mp4$。 |

### 國立宜蘭大學（0031）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NIU Course Search](https://academic.niu.edu.tw/p/412-1003-967.php) | 課程查詢、教學大綱 | 官方（國立宜蘭大學） | 免登入 | 運作中 | 教務處按學期列出課程查詢，涵蓋 115-1 及歷年。 | 各學期連至 acade.niu.edu.tw 的公開查課頁。 academic.niu.edu.tw：robots.txt 的 User-agent: * 規則包含 Allow: /。 |
| [課程地圖](https://academic.niu.edu.tw/var/file/3/1003/img/220/114166495.htm) | 課程地圖 | 官方（國立宜蘭大學） | 免登入 | 不明 | 宜蘭大學教務處提供各系課程地圖資源。 | academic.niu.edu.tw：robots.txt 的 User-agent: * 規則包含 Allow: /。 |
| [宜大校園單一入口（網路選課）](https://ccsys.niu.edu.tw/SSO/) | 選課 | 官方（國立宜蘭大學） | 需登入 | 運作中 | 校內學生從單一入口登入選課。 | ccsys.niu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /。 ccsys1.niu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [宜大 M 園區](https://euni.niu.edu.tw/) | LMS | 官方（國立宜蘭大學） | 部分需登入 | 運作中 | 宜大 Moodle 課程平台，訪客可見入口與學習指引，課堂活動須登入。 | 公開首頁有 115-1 公告。 euni.niu.edu.tw：robots.txt 回傳 HTTP 404。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [宜大 App（niu_app）](https://github.com/mpeilun/niu_app) | 其他 | 學生（mpeilun） | 需登入 | 停止 | 宜大學生 App：數位學習、分數、課表、畢業門檻、選課 | 最後 push 2023-09-20。 [repo](https://github.com/mpeilun/niu_app) |

### 國立聯合大學（0032）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立聯合大學校務資訊系統](https://eap10.nuu.edu.tw/Login.aspx?logintype=S) | 課程查詢、選課 | 官方（國立聯合大學） | 部分需登入 | 運作中 | 學生登入選課；訪客入口可不輸入帳密開啟課程檢索。 | 使用校方列出的外校身分入口，未輸入帳密即以訪客進入，可開啟課程檢索表單。 eap10.nuu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [聯合數位學園](https://elearning.nuu.edu.tw/) | LMS | 官方（國立聯合大學） | 不明 | 停止 | 國立聯合大學聯合數位學園的線上教學入口。 | 入口與課程探索此次均回傳 HTTP 403，未登入測試，不代表官方已宣告停用。 elearning.nuu.edu.tw：robots.txt 同樣回傳 HTTP 403。 |
| [課程地圖（通識教育中心）](https://tlc.nuu.edu.tw/p/403-1058-696-1.php?Lang=zh-tw) | 課程地圖 | 官方（國立聯合大學） | 免登入 | 不明 | 聯合大學通識教育中心的課程地圖頁。 | 通識範圍，非全校各系。 tlc.nuu.edu.tw：robots.txt 對 User-agent: * 列出 Allow: /。 |

**跨校平台涵蓋**：[智慧大師 Wisdom Master 教學平台](https://www.sun.net.tw/)

### 國立臺南藝術大學（0035）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課程資訊系統](https://ap.tnnua.edu.tw/CourseInfo/CourseList.aspx) | 課程查詢、教學大綱、課程地圖 | 官方（國立臺南藝術大學） | 免登入 | 運作中 | 南藝大公開按學期查課，並有同系統的課程地圖。 | ap.tnnua.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [學生資訊系統](https://ap.tnnua.edu.tw/StdInfo/) | 選課 | 官方（國立臺南藝術大學） | 需登入 | 運作中 | 學生登入南藝大學生資訊系統辦理網路選課。 | ap.tnnua.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [Moodle 數位學習平台](https://elearning.tnnua.edu.tw/) | LMS | 官方（國立臺南藝術大學） | 需登入 | 運作中 | 南藝大 Moodle 教學入口。 | elearning.tnnua.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |

### 國立臺南大學（0036）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺南大學課程網站 E-Course](https://ecourse.nutn.edu.tw/) | LMS、課程查詢、教學大綱 | 官方（國立臺南大學） | 部分需登入 | 運作中 | 臺南大學數位課程網站並提供全校公開課程大綱。 | 公開大綱目前可查 115-1，課程教學功能另需登入。 ecourse.nutn.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [課程地圖](https://newcoursemap.nutn.edu.tw/) | 課程地圖 | 官方（國立臺南大學） | 免登入 | 不明 | 臺南大學課程網站所連的課程地圖。 | newcoursemap.nutn.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [課程資訊與選課系統](https://academics.nutn.edu.tw/Course/) | 課程查詢、選課 | 官方（國立臺南大學） | 部分需登入 | 運作中 | 新版課程資訊入口提供免登入開課查詢，學生登入後辦理選課。 | 舊 /SelSys/ 回傳 HTTP 503 並指向新版入口。 academics.nutn.edu.tw：robots.txt 回傳 HTTP 404。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [TAINAN選｜南大選課評價](https://nutnselect.com/) | 評價、課程查詢 | 學生（NoZ915） | 免登入 | 運作中 | 臺南大學非官方選課評價系統 | 最後 push 2026-11-24。 [repo](https://github.com/NoZ915/tainan-select) |

### 國立臺北教育大學（0037）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [iNTUE 校務整合資訊系統](https://nsa.ntue.edu.tw/) | 課程查詢、教學大綱、選課 | 官方（國立臺北教育大學） | 部分需登入 | 運作中 | 提供免登入公開課表查詢，學生透過校園帳號進入網路選課。 | nsa.ntue.edu.tw：robots.txt 的 User-agent: * 未列非空的存取限制。 |
| [通識課程地圖](https://cge.ntue.edu.tw/p/412-1006-4730.php?Lang=zh-tw) | 課程地圖 | 官方（國立臺北教育大學） | 免登入 | 不明 | 公開呈現北教大通識課程的修課規劃。 | 通識教育中心地圖，非全校所有系所。 cge.ntue.edu.tw：robots.txt 的 User-agent: * 規則包含 Allow: /。 |
| [Moodle 教學平台](https://md.ntue.edu.tw/) | LMS | 官方（國立臺北教育大學） | 需登入 | 運作中 | 北教大 Moodle 教學平台。 | md.ntue.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [智慧大師教學平台](https://wm.ntue.edu.tw/) | LMS | 官方（國立臺北教育大學） | 需登入 | 停止 | 校方列出的智慧大師教學平台。 | 校方註明限校內瀏覽。 本次未能開啟此入口（[Errno -5] No address associated with hostname），不代表官方已宣告停用。 wm.ntue.edu.tw：robots.txt 無法取得（[Errno -5] No address associated with hostname），未判定規則。 |
| [教學魔法師教學平台](https://imagic.ntue.edu.tw/magic/) | LMS | 官方（國立臺北教育大學） | 需登入 | 停止 | 校方列出的教學魔法師教學平台。 | 校方註明限校內瀏覽。 本次未能開啟此入口（[Errno -2] Name or service not known），不代表官方已宣告停用。 imagic.ntue.edu.tw：robots.txt 無法取得（[Errno -2] Name or service not known），未判定規則。 |

### 國立臺中教育大學（0039）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [臺中教育大學教務系統](https://ecs.ntcu.edu.tw/) | 課程查詢、選課 | 官方（國立臺中教育大學） | 部分需登入 | 運作中 | 學生登入辦理選課等課務，並另提供免登入開課查詢。 | ecs.ntcu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [國立臺中教育大學課程地圖](https://careerweb.ntcu.edu.tw/CourseMap/Map/Index.aspx) | 課程地圖 | 官方（國立臺中教育大學） | 免登入 | 運作中 | 依系所瀏覽或下載中教大課程地圖。 | 另連至舊版課程地圖。 careerweb.ntcu.edu.tw：robots.txt 對 User-agent: * 列出 Disallow: /。 |
| [E 化教學系統](https://elearning.ntcu.edu.tw/) | LMS | 官方（國立臺中教育大學） | 不明 | 停止 | 中教大學生入口所列 E 化教學系統。 | 外部實測回傳 HTTP 403，未測登入、不代表官方已宣告停用。 elearning.ntcu.edu.tw：robots.txt 回傳 HTTP 403。 |

### 國立體育大學（0044）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國體大校園入口網](https://one.ntsu.edu.tw/portal/) | 課程查詢、選課 | 官方（國立體育大學） | 需登入 | 運作中 | 校方指引從校園入口網登入查課及選課。 | 校方同時另列課程大綱的校外入口。 one.ntsu.edu.tw：robots.txt 回傳 HTTP 500；未取得規則。 |
| [課程大綱](http://192.83.181.141/ntsu/outside.aspx?mainPage=QQBwAHAAbABpAGMAYQB0AGkAbwBuAC8AVABLAEUALwBQAFIARwAvAFAAUgBHADEAMQAwADAAXwAuAGEAcwBwAHgAPwBwAHIAbwBnAGMAZAA9AFAAUgBHADEAMQAwADAA) | 教學大綱 | 官方（國立體育大學） | 免登入 | 不明 | 國體大校方另列的公用課程大綱查詢。 | 校方連至 IP 的 HTTP 入口，未假定與校園入口網的權限相同。 192.83.181.141：robots.txt 回傳 HTTP 404；未取得規則。 |
| [eeclass 數位學習系統 3.0](https://eeclass2.ntsu.edu.tw/) | LMS | 官方（國立體育大學） | 需登入 | 運作中 | 國體大 ee-class 3.0 數位課堂。 | eeclass2.ntsu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /media/s/、Disallow: /km/s/、Disallow: /*.mp4$。 |
| [國體大教務處課程地圖](https://aca.ntsu.edu.tw/p/412-1004-3028.php?Lang=zh-tw) | 課程地圖 | 官方（國立體育大學） | 免登入 | 不明 | 國體大教務處的公開課程地圖資源。 | 未確認最近一年的地圖更新。 aca.ntsu.edu.tw：robots.txt 對 User-agent: * 列出 Allow: /。 |

### 國立金門大學（0048）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立金門大學校務系統](https://select.nqu.edu.tw/) | 課程查詢、課程地圖、選課 | 官方（國立金門大學） | 需登入 | 停止 | 學生登入選課；校方教務處另提供訪客登入查課及課程規劃。 | 訪客仍須登入，未登入查證；不列為完全免登入。 本次未能開啟此入口（[SSL: UNSAFE_LEGACY_RENEGOTIATION_DISABLED] unsafe legacy renegotiation disabled (_ssl.c:1082)），不代表官方已宣告停用。 select.nqu.edu.tw：robots.txt 無法取得（[SSL: UNSAFE_LEGACY_RENEGOTIATION_DISABLED] unsafe legacy renegotiation disabled (_ssl.c:1082)），未判定規則。 |
| [e-Campus 網路學習平台](https://ecampus.nqu.edu.tw/eCampus3P/Learn/LoginPage2/product_login.aspx) | LMS | 官方（國立金門大學） | 部分需登入 | 不明 | 金門大學 e-Campus 教學平台，手冊另說明訪客身分。 | 登入頁標示 inService；未確認最近一年的課程更新。 ecampus.nqu.edu.tw：robots.txt 回傳 HTML，未取得可辨識規則。 |

### 國立臺灣體育運動大學（0049）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [新一代校務系統（課程查詢）](https://school.ntus.edu.tw/ntupes/outside.aspx?mainPage=LwBBAHAAcABsAGkAYwBhAHQAaQBvAG4ALwBUAEsARQAvAFQASwBFADUAMAAvAFQASwBFADUAMAAxADAAXwAuAGEAcwBwAHgA) | 課程查詢、教學大綱 | 官方（國立臺灣體育運動大學） | 免登入 | 運作中 | 公開查詢臺灣體大開課資料。 | school.ntus.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [國立臺灣體育運動大學校園資訊入口網](https://portal.ntus.edu.tw/index.do) | 選課 | 官方（國立臺灣體育運動大學） | 需登入 | 運作中 | 學生從校園入口登入新一代校務系統辦理選課。 | portal.ntus.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [數位學習平台](https://el.ntus.edu.tw/) | LMS | 官方（國立臺灣體育運動大學） | 需登入 | 運作中 | 臺灣體大校方數位教學平台。 | 系統頁面標示 Moodle。 el.ntus.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [課程地圖（競技運動學院教學組）](https://cosp.ntus.edu.tw/index.php?code=list&ids=628) | 課程地圖 | 官方（國立臺灣體育運動大學） | 免登入 | 運作中 | 臺灣體大競技運動學院教學組公開 115 學年度等課程地圖。 | 此頁為指定單位範圍，不視為全校課程地圖。 cosp.ntus.edu.tw：robots.txt 對 User-agent: * 列出 Disallow: /，另允許首頁及 /index.php。 |

### 國立屏東大學（0052）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [校務行政系統](https://webap.nptu.edu.tw/Web/Secure/default.aspx?&SIndex=7) | 課程查詢、選課 | 官方（國立屏東大學） | 部分需登入 | 運作中 | 免登入可依學期查教室、班級及教師課表；網路選課由學生登入。 | 含 SIndex=7 的入口實測可直接進入 115-1 公開課表，不帶參數則進入校務登入頁；未確認公開課綱。 webap.nptu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [課程地圖（各系所）](https://cud.nptu.edu.tw/p/412-1065-5695.php?Lang=zh-tw) | 課程地圖 | 官方（國立屏東大學） | 免登入 | 運作中 | 屏大課務組公開彙整各院系課程地圖。 | 另有課程規劃及課程學習手冊。 cud.nptu.edu.tw：robots.txt 的 User-agent: * 規則包含 Allow: /。 |
| [國立屏東大學 ee-Class 數位學習平台](https://eeclass.nptu.edu.tw/) | LMS | 官方（國立屏東大學） | 需登入 | 運作中 | 供課堂教材、作業及其他教學活動使用的 ee-Class 平台。 | eeclass.nptu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /media/s/、Disallow: /km/s/、Disallow: /*.mp4$。 |

**跨校平台涵蓋**：[ee-class 易課學習管理系統](https://tw.formosasoft.com/p/ee-class)、[智慧大師 Wisdom Master 教學平台](https://www.sun.net.tw/)

### 東海大學（1001）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [東海大學課程資訊網](https://course.thu.edu.tw/home) | 課程查詢、教學大綱、排課 | 官方（東海大學） | 免登入 | 運作中 | 公開按開課單位或類別找課程、大綱，並可模擬課表。 | 首頁顯示 115-1，另有英語授課及 TAICA 等查詢。 course.thu.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 |
| [東海大學師生資訊系統](https://fsis.thu.edu.tw/wwwteac/pubsub/fsis.php) | 選課 | 官方（東海大學） | 需登入 | 運作中 | 學生透過師生資訊系統登入後辦理網路選課等教務作業。 | 學生登入連至 student.next.thu.edu.tw 的校方登入流程。 fsis.thu.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [iLearn 數位平台](https://ilearn.thu.edu.tw/) | LMS | 官方（東海大學） | 需登入 | 運作中 | 東海大學使用 Moodle 的 iLearn 數位教學平台。 | ilearn.thu.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /、Allow: /$。 |
| [課程地圖（電機工程學系）](https://ee.thu.edu.tw/front/Curriculum_and_/University/Course_map/pages.php?ID=dGh1X2VlJkNvdXJzZV9tYXA=) | 課程地圖 | 官方（東海大學） | 免登入 | 運作中 | 東海電機系公開課程地圖及下載檔。 | 系所級示例，非全校地圖；含 115 學年度地圖。 ee.thu.edu.tw：robots.txt 回傳 HTTP 404。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [東海選課模擬器（THC）](https://thc.ttymayor.com/) | 排課、課程查詢 | 學生（ttymayor） | 免登入 | 運作中 | 東海課程資訊與課表模擬，可分享課表 | Vercel 對 curl 回 429 安全檢查；repo 最後 push 2026-11-09（13★）。 [repo](https://github.com/ttymayor/thu-course-frontend) |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[TronClass 暢課](https://www.tronclass.com/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 輔仁大學（1002）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [開課資料查詢](https://sis.fju.edu.tw/#/couSearch/basicInfo) | 課程查詢 | 官方（輔仁大學） | 免登入 | 停止 | 公開查詢開課資料。 | 校方另列獨立大綱與選課入口。本次直連查詢入口及 robots.txt 皆為 TLS 憑證驗證失敗；未逐一驗證課程結果或爬蟲規則。 |
| [課程大綱查詢](https://outline.fju.edu.tw/#/outLineSearch/searchView) | 教學大綱 | 官方（輔仁大學） | 免登入 | 停止 | 查閱各學期、開課單位課程大綱。 | 與開課查詢不同主機。校方仍列為課程大綱查詢；本次直連 TLS 憑證驗證失敗，未驗證結果。 |
| [學生選課系統](https://signcourse.fju.edu.tw/) | 選課 | 官方（輔仁大學） | 需登入 | 停止 | 學生登入後辦理選課。 | 本次直連：TLS 憑證驗證失敗；不代表已永久停用。 |
| [TronClass 教學平台](https://elearn2.fju.edu.tw/) | LMS | 官方（輔仁大學） | 需登入 | 不明 | 提供校內線上教學、教材與作業。 | 產品：TronClass。 |
| [iCAN 教學平台](http://www.elearn.fju.edu.tw/) | LMS | 官方（輔仁大學） | 需登入 | 停止 | 校方列出的 iCAN 教學平台。 | 與 TronClass 並列，未確認是否仍承載新課程。 本次直連：連線或回應逾時；不代表已永久停用。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [ClassIn 輔大選課資訊交流平台](https://classin.info/) | 評價 | 學生（輔大學生（站長已畢業）） | 免登入 | 停止 | 輔大修課評價查詢與分享 | 站長已畢業不再維護，保留舊評價；最新學期字樣 112-2。 |
| [PTT FJU_class 看板](https://www.ptt.cc/bbs/FJU_class/index.html) | 評價、討論 | 社群（PTT 批踢踢實業坊） | 免登入 | 停止 | 輔大課程評價看板 | 最新非置底文章 2022-07-06。 |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 東吳大學（1003）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [東吳大學課表查詢網路](https://web.sys.scu.edu.tw/class40.asp?option=1) | 課程查詢、教學大綱 | 官方（東吳大學） | 免登入 | 不明 | 一般課表查詢可查開課與授課計畫。 | 舊式 ASP 框架；暑修另有入口。 |
| [校務行政資訊系統](https://web.sys.scu.edu.tw/) | 選課 | 官方（東吳大學） | 需登入 | 不明 | 校內學生經校務系統辦理選課。 | 舊式網頁框架；勿與公開課表入口混同。 |
| [課程地圖](http://cmap.curr.scu.edu.tw/) | 課程地圖 | 官方（東吳大學） | 不明 | 停止 | 課務組列出的課程地圖入口。 | 本次直連：連線或回應逾時；不代表已永久停用。 |
| [東吳大學 TronClass](https://tronclass.scu.edu.tw/) | LMS | 官方（東吳大學） | 部分需登入 | 不明 | 東吳大學數位教學平台，對外顯示課程清單和登入入口。 | 產品：TronClass；課內教材權限未驗證。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [東吳課程評價](https://scucourse.net/) | 評價 | 學生（東吳學生） | 免登入 | 不明 | 東吳課程評價網站 | 可連線（SPA），更新時間未知；另一站東吳歐趴指南 scupass.com 已無法解析。 |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)

### 中原大學（1004）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中原大學課程查詢](https://itouch.cycu.edu.tw/active_system/CourseQuerySystem/) | 課程查詢、教學大綱 | 官方（中原大學） | 免登入 | 不明 | 公開開課查詢和課程教學大綱。 | 根路徑以 HTML meta refresh 導往單頁應用 spa。 robots.txt 指令（最多列八行）：User-agent: *；Disallow:。 |
| [中原大學選課系統](https://myself.cycu.edu.tw/#/login) | 選課 | 官方（中原大學） | 需登入 | 不明 | 校內學生登入選課。 |  |
| [My Mentor 選課指導系統](https://acadm.cycu.edu.tw/相關平台/my-mentor選課指導系統/) | 課程地圖、排課 | 官方（中原大學） | 部分需登入 | 不明 | 以修課規劃與選課指導輔助學生。 | 這是官方說明入口；個人功能須校內登入，不是加退選網站。 |
| [i-learning 2.0](https://ilearning.cycu.edu.tw/) | LMS | 官方（中原大學） | 部分需登入 | 運作中 | 提供 Moodle 課程空間及可公開閱覽的操作說明。 | 平台首頁公告 i-learning 1.0 教材備份與運行事項。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中原大學選課大全（coursenote）](https://cycucoursewiki.info/) | 評價 | 學生（atitan） | 免登入 | 停止 | 中原課程評價（選課大全新版） | 網域無法解析；repo 已封存（2020-07）。 [repo](https://github.com/atitan/coursenote) |
| [中原選課小幫手](https://github.com/y252328/CYCU-Course-Selection-Helper) | 排課 | 學生（y252328） | 免登入 | 停止 | 中原選課輔助 | repo 已封存（2018-08）。 [repo](https://github.com/y252328/CYCU-Course-Selection-Helper) |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 淡江大學（1005）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [淡江大學課程查詢系統](https://esquery.tku.edu.tw/acad/) | 課程查詢、教學大綱 | 官方（淡江大學） | 免登入 | 不明 | 查閱各學期課表和授課資訊。 | 查閱 robots.txt：HTTP 404；無法據此判定爬取規則。 |
| [網路選課系統](https://www.ais.tku.edu.tw/elecos/) | 選課 | 官方（淡江大學） | 需登入 | 不明 | 校內線上選課及加退選。 |  |
| [大學學習課程查詢系統](https://luis.tku.edu.tw/) | 課程地圖 | 官方（淡江大學） | 部分需登入 | 不明 | 呈現大學學習及課程規劃資訊。 | 可開啟系統首頁，頁面另有登入。 |
| [iClass 學習平台](https://iclass.tku.edu.tw/) | LMS | 官方（淡江大學） | 需登入 | 不明 | 淡江師生使用的學習平台。 | 產品名稱 iClass。 |
| [Moodle 遠距教學平台](https://moodle.tku.edu.tw/) | LMS | 官方（淡江大學） | 需登入 | 停止 | 遠距教學 Moodle 平台。 | 與 iClass 並列。 本次直連：連線或回應逾時；不代表已永久停用。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [TKU Course Application（淡江選課驗證碼幫手）](https://tkucourseapplication.github.io/) | 選課 | 學生（tku.course.assistant） | 需登入 | 不明 | 淡江選課 Chrome 擴充：自動登入與依序加選 | 網站可連線，更新時間未知。 |
| [TKUschedule](https://github.com/CHANG-CHIH-SHU/TKUschedule) | 排課 | 學生（CHANG-CHIH-SHU） | 免登入 | 運作中 | 淡江課程排課工具 | 最後 push 2026-06-11。 [repo](https://github.com/CHANG-CHIH-SHU/TKUschedule) |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[TronClass 暢課](https://www.tronclass.com/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 中國文化大學（1006）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中國文化大學選課專用入口](https://mycourse.pccu.edu.tw/) | 選課 | 官方（中國文化大學） | 需登入 | 不明 | 學生進入文大網路選課。 |  |
| [課業輔導管理系統](https://teacher.pccu.edu.tw/) | LMS、教學大綱 | 官方（中國文化大學） | 需登入 | 停止 | 教師由教師專區維護課程介紹、進度和教材，學生利用校園資訊網閱覽。 | 記錄的是教師專區入口；未用校內帳號驗證。 本次直連：DNS 無法解析；不代表已永久停用。 |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 逢甲大學（1007） · UniCourse slug `fcu`

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課程檢索系統](https://coursesearch.fcu.edu.tw/) | 課程查詢、教學大綱 | 官方（逢甲大學） | 免登入 | 運作中 | 公開查詢各學期開課、課程詳細資訊及大綱。 | 校方同時連結 coursesearch01、coursesearch02；同一系統不重複算。 查閱 robots.txt：無法建立連線；無法據此判定爬取規則。 |
| [逢甲大學選課系統](https://course.fcu.edu.tw/) | 選課 | 官方（逢甲大學） | 需登入 | 不明 | 使用 NID 與驗證碼登入辦理選課。 | 登入頁另連公開課程檢索系統。 |
| [iLearn](https://ilearn.fcu.edu.tw/) | LMS | 官方（逢甲大學） | 部分需登入 | 不明 | 線上課程教材、教學活動與平台公告。 | 產品：Moodle；舊 ilearn2 主機轉址至本入口。 |
| [資工系課程地圖](https://www.iecs.fcu.edu.tw/about/course_plan/) | 課程地圖 | 官方（逢甲大學） | 免登入 | 運作中 | 公開資工系課程計畫與課程地圖下載。 | 僅資工系；包含 115 學年度課程地圖，不代表全校地圖系統。 |
| [逢甲大學資料開放平台](https://opendata.fcu.edu.tw/OpenData/Process) | 開放資料、API | 官方（逢甲大學） | 需登入 | 不明 | 提供校園資料 API 介接申請與審核說明。 | 限校內教職員生從 MyFCU 申請 API Key；公開可讀的是規範與介紹，未確認有可使用的全校開課資料 API。查閱 robots.txt：HTTP 404；無法據此判定爬取規則。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [FCU Course Search 逢甲大學課程檢索](https://fcu-course-search.yencheng.dev/) | 課程查詢 | 學生（ridemountainpig（YenCheng）） | 免登入 | 運作中 | 課程檢索、通識餘額查詢、追蹤課程 | 舊網址 fcu-course-search.zeabur.app 現 502；最後 push 2026-10-18（23★）；另有 App 版 repo fcu-course-search-app（2024-05）。 [repo](https://github.com/ridemountainpig/fcu-course-search) |
| [Course Search 選課小幫手（逢甲）](https://fcu-coursesearch.com/) | 排課、評價 | 不明（unknown） | 不明 | 不明 | 上傳課表 PDF 與目標學分，結合難度指標與 AI 產生推薦課表，可聊天調整 | 網站可連線，開發者與更新時間未知。 |
| [FCUCourse 逢甲課程評價查詢](https://github.com/fcu-d0588813/FCUCourse) | 評價 | 學生（fcu-d0588813） | 免登入 | 停止 | 逢甲課程評價查詢 | 最後 push 2019-10-31。 [repo](https://github.com/fcu-d0588813/FCUCourse) |

**跨校平台涵蓋**：[OpenEdu 中華開放教育平台](https://www.openedu.tw/)、[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[UniCourse 查課](https://unicourse.observe.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 靜宜大學（1008）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課程綱要查詢系統](https://alcat.pu.edu.tw/index_ToNewPlt.php?sysID=CourseCatalogSys) | 課程查詢、教學大綱 | 官方（靜宜大學） | 免登入 | 運作中 | 靜宜課程綱要查詢入口。 | ALCAT 以表單轉接 MyPU；115 學年度校方指南及公開操作說明明示為「公眾項目」。 |
| [靜宜大學課程地圖](https://alcat.pu.edu.tw/2009coursemap/) | 課程地圖 | 官方（靜宜大學） | 免登入 | 不明 | 按學系查看課程地圖。 | 獨立的舊課程地圖公開介面；未確認與 MyPU 版本同步。 |
| [外校生校際選課系統](https://alcat.pu.edu.tw/index_ToNewPlt.php?sysID=outside_choice2) | 選課 | 官方（靜宜大學） | 需登入 | 運作中 | 外校學生申辦校際選課的轉接入口。 | 轉接 MyPU；115-1 校方說明須先註冊再選課，不是本校生選課入口。 |
| [選課手冊暨課程綱要查詢（972以前）](https://alcat.pu.edu.tw/abstract_new/query_main.php) | 課程查詢、教學大綱 | 官方（靜宜大學） | 免登入 | 不明 | 查詢舊選課手冊及教學綱要。 | 官網明標 97-2 以前，保留作歷史來源。 |
| [玩課雲 WOW Class](https://tronclass.pu.edu.tw/) | LMS | 官方（靜宜大學） | 部分需登入 | 運作中 | 靜宜校內教學、教材與作業平台，首頁可查看公開課程清單。 | 產品：TronClass；自 112-1 全面取代舊網路學園，校方以校園帳號登入。 |
| [靜宜大學 e 校園服務網選課](https://alcat.pu.edu.tw/) | 選課 | 官方（靜宜大學） | 需登入 | 運作中 | 本校學生登入校園服務網辦理第一、二階段選課及加退選。 | 公開課程綱要與外校生校際選課另有專用入口。 |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[TronClass 暢課](https://www.tronclass.com/)

### 長庚大學（1009）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [開課與師資資訊](https://cgupublic.cgu.edu.tw/TeacherInfoAndOthers) | 課程查詢、課程地圖 | 官方（長庚大學） | 免登入 | 運作中 | 提供各系所課程地圖、課規、實際開課資料及師資連結。 | 官方資訊公開索引，不是單一互動式課表；資料分散到各系所。 |
| [icgu 校務資訊系統](https://i.cgu.edu.tw/) | 選課 | 官方（長庚大學） | 需登入 | 不明 | 長庚學生使用的校務入口，包括校內選課。 |  |
| [長庚大學數位學習](https://moocs.cgu.edu.tw/sso/cgu_o365login.php) | LMS | 官方（長庚大學） | 需登入 | 停止 | 透過 Microsoft 365 校園身分登入數位學習平台。 | 本次直連：HTTP 403；不代表已永久停用。 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 元智大學（1010）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課程資料及教學計畫書查詢](https://portal.yzu.edu.tw/cosSelect/Index.aspx) | 課程查詢、教學大綱 | 官方（元智大學） | 不明 | 停止 | 教學計畫書與課程資料查詢入口。 | 本次直連：連線或回應逾時；不代表已永久停用。 |
| [元智大學選課系統](https://isdna1.yzu.edu.tw/Cnstdsel/default.aspx) | 選課 | 官方（元智大學） | 需登入 | 不明 | 登入後選課；登入頁列出相關操作入口。 |  |
| [元智大學應用外語系課程地圖](https://fl.hs.yzu.edu.tw/tw/modules/news/article.php?storyid=363) | 課程地圖 | 官方（元智大學） | 免登入 | 運作中 | 公開應用外語系課程規劃與英語、日語、語言科技修課路徑。 | 系級地圖，不代表全校統一地圖。 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 中華大學（1011）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中華大學課程查詢](https://course.chu.edu.tw/) | 課程查詢、教學大綱 | 官方（中華大學） | 免登入 | 運作中 | 查詢學期課程、開課單位和課程資訊。 | 入口標示 115 學年度第 1 學期。 robots.txt 指令（最多列八行）：User-agent: *；Disallow: /。 |
| [CHUMoodle 數位學習平台入口網站](https://elearn.chu.edu.tw/) | LMS | 官方（中華大學） | 部分需登入 | 運作中 | 校內教學空間，首頁公布各學年度的課程平台。 | 產品：Moodle。 |
| [中華大學學生學習歷程資訊系統](https://sso.chu.edu.tw/) | 選課 | 官方（中華大學） | 需登入 | 運作中 | 學生登入 e-Portfolio 進入網路選課和查詢選課結果。 | 與免登入課程查詢、CHUMoodle 分開。 |

### 大葉大學（1012）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [大葉大學課程查詢](http://syl.dyu.edu.tw/) | 課程查詢、教學大綱 | 官方（大葉大學） | 免登入 | 不明 | 查閱開課清單、課程綱要及選課限制。 |  |
| [大葉大學學生資訊系統](https://sis.dyu.edu.tw/RWD/) | 選課 | 官方（大葉大學） | 需登入 | 不明 | 學生校務入口，選課等校內作業須登入。 |  |
| [大葉大學 TronClass](https://tronclass.dyu.edu.tw/) | LMS | 官方（大葉大學） | 需登入 | 不明 | 校內數位課程及教材平台。 | 產品：TronClass。 |
| [多媒體數位內容學程課程規劃](https://mdc.dyu.edu.tw/rwd/course.html) | 課程地圖、課程查詢 | 官方（大葉大學） | 免登入 | 運作中 | 公開系級課程地圖及歷年開課總表、班級和教師課表。 | 僅所屬系所；有 115-1 的 PDF 附件。 |

### 華梵大學（1013）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [華梵大學網路初選](http://mis1.cc.hfu.edu.tw/CS/) | 選課 | 官方（華梵大學） | 需登入 | 不明 | 校內學生登入辦理網路初選。 |  |
| [MyWay 我的模組課程學習地圖](https://myway.hfu.edu.tw/) | 課程地圖 | 官方（華梵大學） | 部分需登入 | 不明 | 提供課程模組總覽與個人模組選擇。 | 公開首頁和模組資訊；個人功能另設登入。 |
| [華梵大學數位學習網](https://m26.hfu.edu.tw/moodle/) | LMS | 官方（華梵大學） | 需登入 | 停止 | 校方連結的 Moodle 數位教學入口。 | 產品：Moodle。 本次直連：連線或回應逾時；不代表已永久停用。 |

### 義守大學（1014）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [義守大學課程大綱查詢](https://netreg.isu.edu.tw/wapp/wapp_sha/wap_s140000_bilingual.asp) | 課程查詢、教學大綱 | 官方（義守大學） | 免登入 | 不明 | 公開依學年學期、系所等條件查詢課程大綱。 | 與選課入口共用主機，但大綱查詢不要求校內身分。 |
| [義守大學網路註冊與選課](https://netreg.isu.edu.tw/) | 選課 | 官方（義守大學） | 需登入 | 不明 | 校內學生辦理網路選課。 | 同主機有公開課程大綱；本項指需登入的選課入口。 |
| [ISU Moodle 教學資源平台](https://moodle.isu.edu.tw/) | LMS | 官方（義守大學） | 部分需登入 | 不明 | 義守大學的數位教學資源及課程搜尋入口。 | 產品：Moodle；首頁另連 110–113 學年度平台。 |

### 世新大學（1015）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [學期開課一覽表](https://ap4.shu.edu.tw/stu1/stu1/sc01021.aspx) | 課程查詢、教學大綱 | 官方（世新大學） | 免登入 | 不明 | 免登入查全校各學期開課及課程資訊。 | 查閱 robots.txt：HTTP 404；無法據此判定爬取規則。 |
| [世新選課地圖查詢（訪客）](https://ap2.shu.edu.tw/stu1/stu1/SE0201.aspx) | 課程地圖 | 官方（世新大學） | 免登入 | 不明 | 提供訪客按學年度及學制、系級檢視課程規劃。 |  |
| [世新大學選課系統](https://aplb.shu.edu.tw/) | 選課 | 官方（世新大學） | 需登入 | 不明 | 學生登入進行選課。 | HTTP 轉址至 https://ap7.shu.edu.tw/stu2/login.aspx。 |
| [TronClass 教學平台](https://ap.shu.edu.tw/SSO/WebTrans.aspx?id=TronClass_Root) | LMS | 官方（世新大學） | 需登入 | 不明 | 使用世新 SSO 進入 TronClass 教學課程。 | 產品：TronClass。 |
| [eLearn 教學平台](https://ap.shu.edu.tw/sso/WebTrans.aspx?id=eLearn_Root) | LMS | 官方（世新大學） | 需登入 | 不明 | 使用世新 SSO 進入 eLearn。 | 與 TronClass 並列；未確認是否仍開設新課程。 |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[TronClass 暢課](https://www.tronclass.com/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 銘傳大學（1016）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [銘傳大學開課資料](https://stu.mcu.edu.tw/appx/qry/Qs01.aspx) | 課程查詢、教學大綱 | 官方（銘傳大學） | 免登入 | 不明 | 查詢各學期開課及課程資料。 | 舊開課資料入口以 JavaScript 轉址至本頁。 |
| [銘傳大學學生資訊系統](https://www.mcu.edu.tw/student/new-query/default.asp) | 選課 | 官方（銘傳大學） | 需登入 | 不明 | 學生校務入口，提供登入後選課及學籍功能。 |  |
| [銘傳大學數位學習網](https://moodle.mcu.edu.tw/) | LMS | 官方（銘傳大學） | 部分需登入 | 不明 | Moodle 數位課程及教學資源。 | 產品：Moodle。 |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)

### 實踐大學（1017）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [實踐大學臺北校務系統](https://ap.usc.edu.tw/sso/Login.aspx) | 課程查詢、選課 | 官方（實踐大學） | 部分需登入 | 停止 | 校方文件列出訪客查閱學期開課一覽及學生登入選課。 | 官方首頁入口；本次直連 HTTP 404。高雄校區另有可以開啟的入口。 |
| [實踐大學 TronClass](https://tronclass.usc.edu.tw/) | LMS | 官方（實踐大學） | 需登入 | 不明 | 實踐大學數位教學課程平台。 | 產品：TronClass。 |
| [實踐大學高雄校務系統](https://ap.kh.usc.edu.tw/sso/login.aspx) | 課程查詢、課程地圖、選課 | 官方（實踐大學） | 部分需登入 | 不明 | 高雄校區訪客可查課表及教室使用，新生可預覽課表。 | 登入表單和新生／訪客查詢入口並列；未以校內帳號驗證選課流程。 |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[TronClass 暢課](https://www.tronclass.com/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 高雄醫學大學（1019）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [高雄醫學大學 Web 資料庫](https://wac.kmu.edu.tw/) | 課程查詢、教學大綱、選課 | 官方（高雄醫學大學） | 部分需登入 | 不明 | 校方文件說明可在開放查詢查閱課程大綱與進度；學生登入辦理網路選課。 | 官方選課手冊列 Q.1.06 課程資料查詢；未登入學生系統。 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 南華大學（1020）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [南華校務行政系統](https://necis.nhu.edu.tw/nhu) | 選課 | 官方（南華大學） | 需登入 | 不明 | 學生登入辦理校務及選課。 |  |
| [南華大學數位學習網](https://moodle.nhu.edu.tw/) | LMS | 官方（南華大學） | 需登入 | 不明 | 校內課程教材和數位教學。 | 產品：Moodle。 |
| [南華大學課程資訊查詢](https://std.nhu.edu.tw/Academic/SelCourse/QueryCourses.aspx) | 課程查詢 | 官方（南華大學） | 免登入 | 不明 | 免登入以學期、系所、課程名稱與 SDGs 等條件查詢課程。 | 同一表單提供英文介面入口。 |

### 真理大學（1021）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [真理大學全校課表查詢](https://sso.au.edu.tw/AU/outside.aspx?mainPage=QQBwAHAAbABpAGMAYQB0AGkAbwBuAC8AVABLAEUALwBUAEsARQAyADIALwBUAEsARQAyADIAMQAwAF8AMAAxAC4AYQBzAHAAeAA=) | 課程查詢 | 官方（真理大學） | 免登入 | 停止 | 校務系統的對外全校課表查詢。 | 本次直連：TLS 連線失敗；不代表已永久停用。 |
| [真理大學課程地圖](https://registration.au.edu.tw/p/404-1024-101568.php?Lang=zh-tw) | 課程地圖 | 官方（真理大學） | 免登入 | 停止 | 註冊課務組彙整各系課程地圖。 | 系所連結彙編，不是互動式選課系統。 本次直連：TLS 連線失敗；不代表已永久停用。 |
| [真理大學校務資訊系統](https://sso.au.edu.tw/portal/) | 選課 | 官方（真理大學） | 需登入 | 不明 | 經校務入口登入後進行學生選課。 |  |
| [真理大學 TronClass](https://tronclass.au.edu.tw/#/) | LMS | 官方（真理大學） | 需登入 | 停止 | 校內數位課程與教材。 | 產品：TronClass。 本次直連：連線或回應逾時；不代表已永久停用。 |

### 大同大學（1022）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [本學期課程](https://couquery.ttu.edu.tw/main/ListClassCourse.php) | 課程查詢、教學大綱 | 官方（大同大學） | 免登入 | 不明 | 公開查詢本學期課堂與課程資訊。 |  |
| [系所歷年開課資料查詢系統](https://tchinfo.ttu.edu.tw/couquery/historysbj.php) | 課程查詢 | 官方（大同大學） | 免登入 | 不明 | 依系所和學年度查詢歷史開課資料。 | 與 couquery 本學期入口不同。 |
| [大同大學課程地圖](https://curri.ttu.edu.tw/p/412-1033-1193.php) | 課程地圖 | 官方（大同大學） | 免登入 | 不明 | 教務處公開各系課程地圖。 |  |
| [大同大學校務資訊系統](https://stucis.ttu.edu.tw/stucis.htm) | 選課 | 官方（大同大學） | 需登入 | 不明 | 學生透過校務資訊系統登入辦理選課。 | 框架式入口；未登入。 |
| [大同大學 iLearn](https://ilearn.ttu.edu.tw/) | LMS | 官方（大同大學） | 部分需登入 | 不明 | 數位教學平台，對外顯示課程清單與登入入口。 | 產品：TronClass；課內教材權限未驗證。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [大同課表轉換平台](https://rainyu.dev/ttu-timetable/) | 其他 | 學生（RainYu0510） | 免登入 | 運作中 | 大同大學 HTML 課表轉 ICS、課表編輯 | 最後 push 2026-11-12。 [repo](https://github.com/RainYu0510/ttu-timetable) |
| [大同大學課程評價網（TTUCourse）](https://github.com/TTUCourse/TTUCourse) | 評價 | 學生（TTUCourse（GitHub org）） | 免登入 | 停止 | 大同大學課程評價網 | 最後 push 2015-11-29。 [repo](https://github.com/TTUCourse/TTUCourse) |

**跨校平台涵蓋**：[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)

### 慈濟大學（1027）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [慈濟大學課程資訊系統](https://edurp.tcu.edu.tw/scaswebadmin/annoclaslist.aspx) | 課程查詢、教學大綱 | 官方（慈濟大學） | 免登入 | 不明 | 公開查詢各學期開課資訊。 | 使用 ASP.NET；官方入口可免登入。 查閱 robots.txt：HTTP 404；無法據此判定爬取規則。 |
| [新校務系統](https://admin.tcu.edu.tw/TCU/RWD/nlogin.php) | 選課 | 官方（慈濟大學） | 需登入 | 不明 | 校內選課及校務功能入口。 | 官網另並列舊校務系統。 |
| [TCU Moodle](https://moodle.tcu.edu.tw/) | LMS | 官方（慈濟大學） | 需登入 | 不明 | 慈濟大學 Moodle 數位學習入口。 | 直連導向 Moodle 登入頁。 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 臺北醫學大學（1028）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [學期課程／授課進度表查詢](https://newacademic.tmu.edu.tw/outside.aspx?mainPage=QQBwAHAAbAB%20pAGMAYQB0AGkAbwBuAC8AVABLAEUALwBUAEsARQA1ADAALwBUAEsAR%20QA1ADAAMQAwAF8ALgBhAHMAcAB4AA==&GUID=) | 課程查詢、教學大綱 | 官方（臺北醫學大學） | 免登入 | 不明 | 查詢學期課程及授課進度表。 | 使用校務系統 outside 入口，由新生入口與 LMS 同時連結。 |
| [北醫教務系統](https://newacademic.tmu.edu.tw/) | 選課 | 官方（臺北醫學大學） | 需登入 | 不明 | 學生登入辦理課程選課及加退選。 |  |
| [I'm@TMU 數位學習4.0](https://im.tmu.edu.tw/) | LMS | 官方（臺北醫學大學） | 部分需登入 | 不明 | 提供數位教學課程、資源及學生常用教務連結。 | 頁尾標示台灣數位學習科技 Formosasoft。 |

**跨校平台涵蓋**：[臺北聯合大學系統（北聯大）臺北聯大課程](https://ustp.ntpu.edu.tw/info/8)、[優久大學聯盟 校際教務系統（校際選課）](https://course.ttu.edu.tw/u9/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 中山醫學大學（1029）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中山醫學大學學生選課系統](https://stucs.csmu.edu.tw/) | 選課 | 官方（中山醫學大學） | 需登入 | 停止 | 中山醫學生登入後完成網路選課。 | 教務處有 115-1 選課公告。 本次直連：連線或回應逾時；不代表已永久停用。 |
| [中山醫學大學全校課程地圖](https://map.csmu.edu.tw/default.htm) | 課程地圖 | 官方（中山醫學大學） | 免登入 | 不明 | 分院系提供課程地圖。 | 框架式入口。 |
| [ee-class 數位學習系統](https://ee2.csmu.edu.tw/) | LMS | 官方（中山醫學大學） | 部分需登入 | 不明 | 教學空間與數位學習功能。 | 產品：ee-class。 |
| [中山醫學大學課表及課程綱要查詢](https://student.csmu.edu.tw/guest/wSco005Pub/wSco005Pub.aspx) | 課程查詢、教學大綱 | 官方（中山醫學大學） | 免登入 | 不明 | 免登入依學年度、學期、學制及系所查詢課表與課程綱要。 | 學生資訊系統的訪客區，不是登入選課入口。 |

### 長榮大學（1033）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [長榮大學課程查詢系統](https://eportal.cjcu.edu.tw/syllabus/home) | 課程查詢、教學大綱、課程地圖 | 官方（長榮大學） | 免登入 | 不明 | 查詢課程綱要與課程配當。 | 配當是在同一課程查詢系統的另一頁。 robots.txt 未回傳可識別的爬蟲指令。 |
| [長榮大學選課系統](https://csweb.cjcu.edu.tw/) | 選課 | 官方（長榮大學） | 需登入 | 不明 | 學生線上選課。 |  |
| [長榮大學 I-Learning](https://tronclass.cjcu.edu.tw/#/) | LMS | 官方（長榮大學） | 需登入 | 不明 | 長榮大學數位教學平台，首頁提供登入。 | 產品：TronClass；未驗證課內教材。 |

### 中國醫藥大學（1035）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中國醫藥大學選課系統](https://web1.cmu.edu.tw/) | 選課 | 官方（中國醫藥大學） | 需登入 | 不明 | 校內學生登入辦理線上初選及加退選。 | 首頁連結到獨立的公開課程查詢及課程地圖。 |
| [中國醫藥大學 Moodle 數位學習系統](https://moodle.cmu.edu.tw/) | LMS | 官方（中國醫藥大學） | 需登入 | 不明 | Moodle 校內教學與教材。 | 直連導向登入頁。 |
| [中國醫藥大學課程查詢系統](https://web1.cmu.edu.tw/courseinfo/) | 課程查詢、教學大綱 | 官方（中國醫藥大學） | 免登入 | 運作中 | 公開依學期、校區、教師、時段與授課類型查詢課程及教學進度。 | 提供 EMI、全英語、遠距、TAICA 等條件。 |
| [中國醫藥大學全校課程地圖](https://web1.cmu.edu.tw/cmap/index.asp) | 課程地圖 | 官方（中國醫藥大學） | 免登入 | 不明 | 依學院系所瀏覽學士、碩士和博士課程地圖。 | 與公開課程查詢為同主機的不同系統。 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 玄奘大學（1039）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [玄奘大學開課資訊查詢](https://tch.hcu.edu.tw/pub/HCUCur.asp) | 課程查詢 | 官方（玄奘大學） | 免登入 | 運作中 | 依學年度、學期與開課班級查閱各系所的開課資訊。 | 頁面載明 115-2 課程預定 2026 年 12 月 7 日開放查詢。 |
| [玄奘大學選課系統](https://csys.hcu.edu.tw/) | 選課 | 官方（玄奘大學） | 需登入 | 不明 | 學生登入後選課。 |  |
| [玄奘大學數位學習 I-learn 平台](https://ilearn.hcu.edu.tw/) | LMS | 官方（玄奘大學） | 部分需登入 | 不明 | 教學資訊、課程教材與 I-learn 操作教學。 | 產品：Moodle；校方使用 I-learn 品牌。 |

### 亞洲大學（1048）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [亞洲大學課程查詢系統](https://webs.asia.edu.tw/CourseInformationSystem/Home/Index) | 課程查詢、教學大綱 | 官方（亞洲大學） | 免登入 | 不明 | 免登入查學年度、學期及開課課程。 | 查閱 robots.txt：HTTP 404；無法據此判定爬取規則。 |
| [亞洲大學選課系統](https://cosselenter.asia.edu.tw/Chcourse/) | 選課 | 官方（亞洲大學） | 需登入 | 不明 | 登入後辦理學生選課。 |  |
| [亞洲大學 TronClass](https://tronclass.asia.edu.tw/) | LMS | 官方（亞洲大學） | 需登入 | 不明 | 亞洲大學數位教學平台，首頁提供登入。 | 產品：TronClass；與學生公開課程查詢不同主機。 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [亞洲大學課表下載工具 KoiLiSu](https://toka.dev/koilisu/kobeu) | 其他 | 學生（zisunny104） | 免登入 | 運作中 | 亞大學生課表 PDF／Excel 批次下載 | 最後 push 2026-11-02。 [repo](https://github.com/zisunny104/kobeu) |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 開南大學（1049）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [開南大學課程查詢](http://portal.knu.edu.tw/info/mainframe2.aspx) | 課程查詢 | 官方（開南大學） | 不明 | 不明 | 教務處列出的校務課程查詢介面。 |  |
| [開南大學教學計劃表](https://course.knu.edu.tw/p/412-1045-761.php?Lang=zh-tw) | 教學大綱 | 官方（開南大學） | 免登入 | 不明 | 註冊課務組公開教學計劃表。 | 教務網頁下載入口，不是獨立的動態查詢。 |
| [開南大學課程地圖](http://aol.knu.edu.tw/course_map/full_course_map.php) | 課程地圖 | 官方（開南大學） | 不明 | 停止 | 開南教務處列出的全校課程地圖。 | 本次直連：DNS 無法解析；不代表已永久停用。 |
| [開南大學數位學習網](http://elearning.knu.edu.tw/) | LMS | 官方（開南大學） | 不明 | 停止 | 教務處列出的數位學習入口。 | 本次直連：無法建立連線；不代表已永久停用。 |
| [開南大學跨平台校務行政資訊系統](https://sts2.knu.edu.tw/) | 選課 | 官方（開南大學） | 需登入 | 不明 | 校內學生登入教務系統進行加選、退選與微學分課程選課。 | 官方另列需舊瀏覽器的校務入口。 |

### 佛光大學（1050）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [佛光大學課程網](https://selcourse2.fgu.edu.tw/course_plan/cs_cont_menu.aspx) | 課程查詢、教學大綱、課程地圖 | 官方（佛光大學） | 免登入 | 不明 | 按學年度查詢課程規劃和課程資料。 |  |
| [佛光大學選課系統](https://courseapp.fgu.edu.tw/webcourse/mainpage.aspx) | 選課 | 官方（佛光大學） | 需登入 | 不明 | 學生登入辦理選課。 |  |
| [佛光大學 Moodle 學習平台](https://moodle.fgu.edu.tw/) | LMS | 官方（佛光大學） | 部分需登入 | 運作中 | 自 114-1 起使用的 Moodle 線上教學平台。 | 產品：Moodle；113-2 前另用舊平台。 |
| [佛光大學數位學習平台（113-2 前）](https://elearn.fgu.edu.tw/) | LMS | 官方（佛光大學） | 需登入 | 停止 | 提供 113-2 以前的數位課程。 | 校方已指向新 Moodle 平台；此筆標記舊平台，不代表歷史內容不可存取。 本次直連：HTTP 403。 |

### 康寧大學（1079）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [康寧大學課表查詢](https://ec.ukn.edu.tw/Schedule/queryschedule.aspx) | 課程查詢 | 官方（康寧大學） | 免登入 | 不明 | 獨立的課表查詢入口。 |  |
| [課程綱要與歷年教學計畫](http://203.71.63.13/academic/pubinfo/pubinfomain.asp) | 教學大綱 | 官方（康寧大學） | 不明 | 不明 | 查閱課程綱要及歷年教學計畫。 | 官方連結以 IP 和 HTTP 公布，非臆測網域。 |
| [康寧大學課程地圖系統](http://portfolio.knjc.edu.tw/coursemap/intro.html) | 課程地圖 | 官方（康寧大學） | 不明 | 停止 | 校方公開的課程地圖連結。 | 保留校方使用的舊網域。 本次直連：連線或回應逾時；不代表已永久停用。 |
| [康寧大學網路選課](http://talk.ukn.edu.tw/class_redi/class.php) | 選課 | 官方（康寧大學） | 需登入 | 不明 | 學生辦理網路選課。 |  |
| [Moodle 數位學習平台（專科部）](http://moodle2.ukn.edu.tw/) | LMS | 官方（康寧大學） | 需登入 | 不明 | 康寧專科部的 Moodle 教學平台。 | 專科部與大學部有不同主機。 |
| [Moodle 數位學習平台（大學部）](http://e-learning.ukn.edu.tw/) | LMS | 官方（康寧大學） | 需登入 | 不明 | 康寧大學部的 Moodle 教學平台。 | 專科部與大學部有不同主機。 |

### 馬偕醫學大學（1085）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [馬偕醫學大學課程資訊](https://academic.mmu.edu.tw/xmdoc/cont?xsmsid=0Q014344673447724351) | 課程查詢 | 官方（馬偕醫學大學） | 免登入 | 運作中 | 教務處公布全校課表、選課指引和課程資訊。 | 115-1 全校課表見教務處最新資訊；舊 coinfo.asp 入口回錯誤頁。 |
| [馬偕醫學大學選課系統](https://selcos.mmu.edu.tw/) | 選課 | 官方（馬偕醫學大學） | 需登入 | 運作中 | 本校學生登入辦理初選及加退選。 | 115-1 選課作業有官方公告。 |
| [馬偕醫學大學課程地圖](https://coursemap.mmu.edu.tw/) | 課程地圖 | 官方（馬偕醫學大學） | 部分需登入 | 不明 | 展示課程地圖，另外提供登入功能。 |  |
| [校際選課平台（外校生）](https://selcrosscos.mmu.edu.tw/) | 選課 | 官方（馬偕醫學大學） | 需登入 | 運作中 | 外校生經獨立校際選課平台送出申請。 | 教務處有平台啟用公告。 |
| [馬偕醫學大學數位學習平台](https://moodle.mmu.edu.tw/) | LMS | 官方（馬偕醫學大學） | 部分需登入 | 不明 | 數位教學和課程空間，首頁可見平台公告與登入。 | 產品：Moodle；另列 Teams 同步教室。 |
| [馬偕醫學大學全校課程查詢](https://portal.mmu.edu.tw/VC2/global_cos.aspx?Lang=EN) | 課程查詢、教學大綱 | 官方（馬偕醫學大學） | 免登入 | 不明 | 公開依系所、課程、教師、時間和大綱關鍵字查詢課程。 | 中英文入口；不是教務處學期課表附件索引。 |

### 中信金融管理學院（1125）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中信金融管理學院學生資訊系統](https://ap01.ctbc.edu.tw/) | 課程查詢、選課 | 官方（中信金融管理學院） | 需登入 | 運作中 | 登入學生資訊系統後查課、加退選及印選課確認單。 | 115-1 選課公告仍明列此入口。 |
| [中信金融管理學院全校課表](https://acad.ctbc.edu.tw/p/406-1002-46205%2Cr11.php?Lang=zh-tw) | 課程查詢 | 官方（中信金融管理學院） | 免登入 | 停止 | 教務處公開 115-1 各學制全校課表附件。 | 搜尋索引可見 115-1 全校課表；本次直連 TLS 憑證驗證失敗，未讀取附件。不代表永久停用。 |

### 法鼓文理學院（1196）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [DILA 教務系統](https://ecampus.dila.edu.tw/ddb/) | 課程查詢、選課 | 官方（法鼓文理學院） | 部分需登入 | 不明 | 全校課程查詢提供訪客登入；學生校務與選課功能須身分驗證。 | 登入頁明示可用 GUEST 帳號、無需密碼；未使用任何校內帳號。 |
| [法鼓文理學院數位學習系統](https://moodle2.dila.edu.tw/) | LMS | 官方（法鼓文理學院） | 需登入 | 不明 | 校內 Moodle 課程與數位教學資源。 | 產品：Moodle。 |

### 臺北市立大學（3002）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [課程快速查詢](http://shcourse.utaipei.edu.tw/utaipei/ag_pro/ag304_index.jsp) | 課程查詢、教學大綱 | 官方（臺北市立大學） | 免登入 | 運作中 | 臺北市立大學校首頁列出的公開查課入口。 | shcourse.utaipei.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /。 shcourse.utaipei.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /。 |
| [校務系統](https://my.utaipei.edu.tw/utaipei/index_sky.html) | 選課 | 官方（臺北市立大學） | 需登入 | 運作中 | 北市大學生登入後由校務系統選課。 | my.utaipei.edu.tw：robots.txt 回傳 HTML，未取得可辨識的規則。 |
| [臺北市立大學 ee-class 易課平台](https://eeclass.utaipei.edu.tw/) | LMS | 官方（臺北市立大學） | 需登入 | 運作中 | 學期課堂的數位教材與互動平台。 | eeclass.utaipei.edu.tw：robots.txt 的 User-agent: * 規則包含 Disallow: /media/s/、Disallow: /km/s/、Disallow: /*.mp4$。 |
| [自主學習平台 tms+](https://tms.utaipei.edu.tw/) | LMS | 官方（臺北市立大學） | 部分需登入 | 運作中 | 北市大另設 tms+ 自主學習平台。 | 與正規課堂使用的 ee-class 分列。 tms.utaipei.edu.tw：robots.txt 回傳 HTTP 404；未取得規則。 |
| [師資培育課程地圖](https://cte.utaipei.edu.tw/p/412-1013-6832.php?Lang=zh-tw) | 課程地圖 | 官方（臺北市立大學） | 免登入 | 不明 | 臺北市立大學師培中心公開的修課架構。 | 僅師資培育範圍，非全校課程地圖。 cte.utaipei.edu.tw：robots.txt 對 User-agent: * 列出 Allow: /。 |


## 技職校院

### 國立臺灣科技大學（0022）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺灣科技大學課程查詢](https://querycourse.ntust.edu.tw/querycourse/) | 課程查詢 | 官方（國立臺灣科技大學教務處） | 免登入 | 運作中 | 依學期/系所/課名/教師查詢開課資料,含課程大綱連結 | 公開免登入;與選課系統為同校自建系統(courseselection.ntust.edu.tw)。 2026-11-27 探測 HTTP 200 |
| [國立臺灣科技大學選課系統](https://courseselection.ntust.edu.tw/) | 選課 | 官方（國立臺灣科技大學教務處） | 需登入 | 運作中 | 學生網路選課(初選/加退選) | 另有校際選課(interuniversity.ntust.edu.tw)、交換生選課系統。 2026-11-27 探測 HTTP 200(轉址至 https://ssoam2.ntust.edu.tw/account/login?ReturnUrl=%2Fconnect%2Fauthorize%3Fclient_id%3DCourseSelection%26redirect_uri%3Dhttps%253A%252F%252Fcourseselection.ntust.edu.tw%252Fsignin-oidc%26response_type%3Dcode%26scope%3Dopenid%2520profile%2520email%26code_challenge%3Dbu3jAkgnVuI9ix4tWGzD7igvH03-GxAcg75uwMm_21c%26code_challenge_method%3DS256%26state%3DOpenIdConnect.AuthenticationProperties%253DeAlkrwlI2ARHM3P3iinHjo1WEqEm8HNMq95A0-PPc7uv1rSFuIeUNU_GtovwzyGHJKZzaFTuRt2BYF4mBQ0GY8lPvhW8_9ONTYo4ruCy0mhVsY-a8kIuWzV9Sd6FaC1TzhjFj2Lew97-ns6Aew7UZyvPsaInUyqEbUqwQE7Nr0TDz-J7W5J7-jPIpYt3zIPsHguf6vgKNMQnfpIoWwN2EuQDgXlhj96Fwpi-hnKBDNBco-T7tv5Xd4SjIcNORhpS1ncXpFW04EIj-6fmV07P9PY3953LCGDUUUx2qGw-Sf8OUG7DieZ4sujhuWioJIVR%26response_mode%3Dform_post%26nonce%3D639313140938493478.YzY4ODYzNmEtNGE5OS00Yjg1LThkOWUtNzY1Yzc2OTM3NjEzNjQxN2EwNDItODcwNi00MzY1LWJlM2QtYmNjY2Y3ZDY5YjY0%26x-client-SKU%3DID_NET451%26x-client-ver%3D5.3.0.0) |
| [國立臺灣科技大學大學部課程地圖與選課推薦系統](https://academicgaa.ntust.edu.tw/CourseMap/Index) | 課程地圖 | 官方（國立臺灣科技大學教務處） | 免登入 | 運作中 | 大學部課程地圖、選課推薦 | 2026-11-27 探測 HTTP 200 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [台科大 TAT](https://apps.apple.com/tw/app/id6479219269) | 其他 | 學生（morris13579） | 需登入 | 運作中 | 臺科學生 App：課表、成績等 | repo 最後 push 2026-09-14（27★）。 [repo](https://github.com/morris13579/tat_ntust) |
| [Taiwan-Tech-GPA-Saviour](https://github.com/splitline/Taiwan-Tech-GPA-Saviour) | 成績分布 | 學生（splitline） | 免登入 | 停止 | 快速查詢臺科歷年課程成績分布 | 原網址 ㎬.taiwan-te.ch 無法解析；最後 push 2023-02-02。 [repo](https://github.com/splitline/Taiwan-Tech-GPA-Saviour) |
| [NTUST-CourseHelper](https://github.com/splitline/NTUST-CourseHelper) | 排課 | 學生（splitline） | 免登入 | 停止 | 協助臺科學生選課的小工具 | 最後 push 2019-06-12。 [repo](https://github.com/splitline/NTUST-CourseHelper) |
| [course-compass](https://github.com/hezhen0816/course-compass) | 課程查詢、排課、課程地圖 | 學生（hezhen0816） | 免登入 | 運作中 | 臺科非官方修課規劃：課程查詢、排課與學分追蹤（Web + iOS） | 最後 push 2026-11-26。 [repo](https://github.com/hezhen0816/course-compass) |
| [臺科新生懶人包（選課篇）](https://rookie.ntust.org/article/course-select/) | 其他 | 學生（NTUST-OpenSource） | 免登入 | 運作中 | 學生共同維護的新生指南，整理 115-1 選課時程與工具（myNTUST 等） | 最後 push 2026-11-24。 [repo](https://github.com/NTUST-OpenSource/freshman) |

**跨校平台涵蓋**：[國立臺灣大學系統（臺大系統）](https://ntusystem.ntu.edu.tw/)、[CrossLink 臺大、臺科大、臺師大選課模擬](https://www.crosslink.tw/)、[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立雲林科技大學（0023）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立雲林科技大學課程查詢系統(WebNewCAS)](https://webapp.yuntech.edu.tw/WebNewCAS/Course/QueryCour.aspx) | 課程查詢、教學大綱 | 官方（國立雲林科技大學教務處） | 免登入 | 運作中 | 雲科大開課查詢,含教學大綱 | 雲科大同時營運全國「技職課程資源網」(course-tvc.yuntech.edu.tw)與課程資訊交換平台(tlrcct.yuntech.edu.tw),多所專科校網連到該處。 2026-11-27 探測 HTTP 200 |
| [國立雲林科技大學加退選課系統(AAXCCS)](https://webapp.yuntech.edu.tw/AAXCCS/Default.aspx) | 選課 | 官方（國立雲林科技大學教務處） | 需登入 | 運作中 | 學生加退選 | 2026-11-27 探測 HTTP 200 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立屏東科技大學（0024）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立屏東科技大學校務資訊服務系統(課務組)](https://course.npust.edu.tw/cnads/) | 課程查詢、教學大綱、選課 | 官方（國立屏東科技大學教務處課務組） | 部分需登入 | 運作中 | 開課資料、課程大綱、線上選課、教學評量入口;公開區有課程資料查詢 | 選課系統路徑為 course.npust.edu.tw/Course/(手冊 https://course.npust.edu.tw/Course/doc/manual.pdf 說明未登入可瀏覽基本畫面)。 2026-11-27 探測 HTTP 200 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立臺北科技大學（0025）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺北科技大學課程查詢系統](https://aps.ntut.edu.tw/course/tw/QueryCurrPage.jsp) | 課程查詢、教學大綱 | 官方（國立臺北科技大學教務處） | 免登入 | 不明 | 北科大課程/教學大綱與進度查詢(ShowSyllabus.jsp),含舊學期 | 本機對 www/aps.ntut.edu.tw 的 DNS 皆解析失敗,連結僅經 web search 與校方開課與師資資訊頁確認。另有英文版 aps.ntut.edu.tw/course/en/course.jsp、手機版 course/mobile/QueryCurrPage.jsp(Dcard 提到 2025 年系統更新)。第三方有「北科課程好朋友」。 2026-11-27 本機探測失敗:<urlopen error [Errno -2] Name or service not known>;無法從本機確認,可能為防火牆/舊 TLS/校內限定 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [北科課程好朋友](https://ntut-course.gnehs.net/) | 課程查詢、排課、課程地圖 | 學生（gnehs（勝勝）） | 免登入 | 運作中 | 課程搜尋、班級課表、我的課表衝堂檢查、課程標準、微學程、退選率、空教室、iOS widget | 顯示 115 上；資料可回溯 106 學年；爬蟲 gnehs/ntut-course-crawler-node 最後 push 2026-11-25。 [repo](https://github.com/gnehs/ntut-course-web) |
| [北科課程查詢（非官方，tntrock）](https://ntut-course.allenyen.net/) | 課程查詢、排課、API | 學生（tntrock（allenyen）） | 免登入 | 運作中 | 關鍵字、系所與時段交叉篩選、教學大綱、空教室、退選率、我的課表；資料每日更新，並提供靜態 API | 頁面含 115-1；靜態 API tntrock.github.io/ntut-course-crawler；最後 push 2026-11-26。 [repo](https://github.com/tntrock/ntut-course-web) |
| [TAT 北科生活](https://play.google.com/store/apps/details?id=club.ntut.npc.tat) | 其他 | 學生（NEO-TAT（北科程式設計研究社 NPC）） | 需登入 | 運作中 | 北科學生 App：課表、教室、成績、行事曆、免輸入登入 i 學園 | Android/iOS；repo 最後 push 2026-04-08（51★）。 [repo](https://github.com/NEO-TAT/tat_flutter) |
| [Project Tattoo 北科校園助手](https://ntut.app/) | 其他 | 學生（NTUT-NPC） | 需登入 | 運作中 | TAT 的現代化重寫：課表、成績查詢、i 學園掃碼登入 | 最後 push 2026-11-23。 [repo](https://github.com/NTUT-NPC/tattoo) |
| [北科盒子 排課系統](https://github.com/poterpan/ntutbox-course) | 課程查詢、排課 | 學生（poterpan） | 免登入 | 運作中 | 公開免登入課程查詢與排課規劃（資料管線） | 最後 push 2026-11-26；未找到公開網址。 [repo](https://github.com/poterpan/ntutbox-course) |
| [TaipeiTechApp](https://github.com/AlanChiou/TaipeiTechApp) | 其他 | 學生（AlanChiou） | 需登入 | 停止 | 北科課表、學分查詢 Android App | repo 已封存，最後 push 2017-02-27。 [repo](https://github.com/AlanChiou/TaipeiTechApp) |

**跨校平台涵蓋**：[臺北聯合大學系統（北聯大）臺北聯大課程](https://ustp.ntpu.edu.tw/info/8)

### 國立虎尾科技大學（0033）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立虎尾科技大學班級課表查詢](https://qry.nfu.edu.tw/class.php) | 課程查詢 | 官方（國立虎尾科技大學教務處） | 免登入 | 運作中 | 虎尾科大班級課表查詢 | 教務處課程資訊頁 https://oaa.nfu.edu.tw/zh_tw/teaching/courses 與選課專區 https://oaa.nfu.edu.tw/zh_tw/teaching/select 為入口;未找到公開教學大綱查詢系統。 2026-11-27 探測 HTTP 200 |

### 國立澎湖科技大學（0042）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立澎湖科技大學教務處選課/課程地圖頁](https://www.npu.edu.tw/sub/form/index.aspx?Parser=2,21,153,139) | 選課、課程地圖 | 官方（國立澎湖科技大學教務處） | 不明 | 運作中 | 澎科大教務處選課說明與課程地圖(Parser=1,21,156,139)頁面 | 僅找到說明頁,未找到公開開課查詢系統;澎科大網站為 content/index.aspx?Parser= 版型。 2026-11-27 探測 HTTP 200 |

### 國立勤益科技大學（0043）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立勤益科技大學校務行政入口頁](https://www.ncut.edu.tw/p/412-1000-737.php?Lang=zh-tw) | 其他、選課 | 官方（國立勤益科技大學） | 不明 | 運作中 | 勤益科大校務行政系統入口(教師篇 nmsd.ncut.edu.tw/teacher/、行政篇 msd.ncut.edu.tw) | 學生課程查詢/選課系統入口未能從公開頁確認,需再查。 2026-11-27 探測 HTTP 200 |

### 國立臺北護理健康大學（0046）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺北護理健康大學教務資訊系統(課程查詢系統)](https://system10.ntunhs.edu.tw/AcadInfoSystem/Modules/Main/Index.aspx) | 課程查詢、選課 | 官方（國立臺北護理健康大學教務處） | 部分需登入 | 運作中 | 課程查詢系統與課程科目表查詢系統;選課走 e-Portfolio | 教學計畫(教學大綱)以 PDF 放在 system8.ntunhs.edu.tw/TeachPlan/<學期>/…(例 https://system8.ntunhs.edu.tw/TeachPlan/1101/1101-0719-3151Q871-315211.pdf)。 2026-11-27 探測 HTTP 200 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [北護助手 NTUNHS-Assistant](https://github.com/Chinlinlee/NTUNHS-Assistant) | 成績分布、排課 | 學生（Chinlinlee） | 需登入 | 停止 | 北護課表、成績、成績分佈圖、課程查詢、模擬課表 | 最後 push 2024-03-08。 [repo](https://github.com/Chinlinlee/NTUNHS-Assistant) |

### 國立高雄餐旅大學（0047）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立高雄餐旅大學MyNKUHT 入口網](https://cip.nkuht.edu.tw/) | 其他、選課 | 官方（國立高雄餐旅大學） | 需登入 | 運作中 | 高餐大校園入口(單一登入),選課/課表經此 | 公開課程查詢頁未找到;校網版型為 /p/403-1000-x.php。 2026-11-27 探測 HTTP 200 |

### 國立臺中科技大學（0050）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺中科技大學課表查詢(日間部)](https://aisap.nutc.edu.tw/public/day/CourseMenu.aspx) | 課程查詢 | 官方（國立臺中科技大學教務處） | 免登入 | 運作中 | 中科大日間部公開課表查詢 | 校務/學生管理系統為資通電腦「各學制教務系統整合擴充案」;操作手冊 https://aca.nutc.edu.tw/var/file/15/1015/img/565/127578794.pdf (我的課表/課程查詢/課程標準)。 2026-11-27 探測 HTTP 200 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺中科技大學 課表](https://nutc.tershi.com/) | 課程查詢 | 學生（mmm25002500） | 免登入 | 停止 | 重視 UI/UX 的中科大課表查詢 | 網站可連線；repo 最後 push 2023-07-12。 [repo](https://github.com/mmm25002500/Nutc-class-timetable) |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立臺北商業大學（0051）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺北商業大學課程資訊查詢](https://ntcbadm.ntub.edu.tw/pub/TchSchedule_Search.aspx) | 課程查詢 | 官方（國立臺北商業大學） | 免登入 | 運作中 | 北商大公開課程資訊/班級課表/教師課表查詢 | 同網域 /pub/cur_class.aspx(班級課表)、/pub/Cur_Teachers.aspx(教師課表);學生資訊系統 ntcbadm1.ntub.edu.tw。 2026-11-27 探測 HTTP 200 |

### 國立高雄科技大學（0053）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立高雄科技大學線上選課系統(含課程查詢)](https://aais4.nkust.edu.tw/selcrs_std) | 課程查詢、選課 | 官方（國立高雄科技大學教務處） | 部分需登入 | 不明 | 高科大選課系統,可課程查詢並看課程大綱 | 校方建議 https://aais1.nkust.edu.tw/selcrs_dp(兩個網址本機探測皆 404,可能需經校首頁導向);並因網站更新建議從校首頁進入;另有跨校選課公共平台 cross-school.nkust.edu.tw。 2026-11-27 探測 HTTP 404;無法從本機確認,可能為防火牆/舊 TLS/校內限定 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [NKUST Course Radar](https://nkust.zeabur.app/) | 評價、課程查詢 | 學生（mlgzackfly） | 免登入 | 停止 | 高科大課程查詢與匿名評價 | 網站回 502；repo 最後 push 2026-03-16。 [repo](https://github.com/mlgzackfly/NKUST-Cource-radar) |
| [高科大課程課表檢視](https://github.com/JunTeng1113/nkust-course-timetable) | 排課 | 學生（JunTeng1113） | 需登入 | 運作中 | Chrome 外掛：把高科大『歷年課程查詢』結果排成週課表並依節次篩選 | 最後 push 2026-09-08。 [repo](https://github.com/JunTeng1113/nkust-course-timetable) |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 國立臺灣戲曲學院（0144）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺灣戲曲學院在校學生頁(教學務系統入口)](https://www.tcpa.edu.tw/p/426-1000-5.php?Lang=zh-tw) | 其他、選課 | 官方（國立臺灣戲曲學院） | 不明 | 運作中 | 戲曲學院教學務系統與選課分流入口、北區跨校選課連結 | 未找到公開課程查詢頁。 2026-11-27 探測 HTTP 200 |

### 國立臺南護理專科學校（0221）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺南護理專科學校單一登入入口網(教務學務系統)](https://sso-portal.ntin.edu.tw/SSO/) | 其他、選課 | 官方（國立臺南護理專科學校） | 需登入 | 不明 | 南護專單一登入,教務學務系統入口(舊入口 academy.ntin.edu.tw/ntin/) | 公開課程查詢未找到。 2026-11-27 本機探測失敗:<urlopen error [Errno -2] Name or service not known>;無法從本機確認,可能為防火牆/舊 TLS/校內限定 |

### 國立臺東專科學校（0222）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [國立臺東專科學校教務處(選課.成績.缺曠查詢)](https://acad.ntc.edu.tw/) | 其他、選課 | 官方（國立臺東專科學校教務處） | 不明 | 運作中 | 臺東專校教務處首頁;學生專區「選課.成績.缺曠查詢」(http://b001.ntc.edu.tw/p/426-1001-15.php?Lang=zh-tw) | portal.ntc.edu.tw 為校園入口網;公開課程查詢未找到。 2026-11-27 探測 HTTP 200 |

### 朝陽科技大學（1018）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [朝陽科技大學課程資訊查詢(CTS0006)](https://cts.cyut.edu.tw/CTS0006) | 課程查詢、教學大綱 | 官方（朝陽科技大學教務處） | 免登入 | 運作中 | 朝陽科大課程資訊總覽、全文檢索、學程查詢、選課手冊 | 舊版 admin.cyut.edu.tw/crsinfo/;選課系統另為 class.cyut.edu.tw。 2026-11-27 探測 HTTP 200 |
| [朝陽科技大學選課系統](https://class.cyut.edu.tw/) | 選課 | 官方（朝陽科技大學教務處） | 部分需登入 | 運作中 | 初選/加退選;公開頁有選課人數查詢 CED/CourseLimitDInfos、可選課程清單 CED/EtcCourseList | 2026-11-27 探測 HTTP 200 |

### 南臺科技大學（1023）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [南臺科技大學歷年課程資訊查詢](https://webap.stust.edu.tw/courinfo/) | 課程查詢、教學大綱 | 官方（南臺科技大學） | 免登入 | 運作中 | 南臺科大歷年課程資訊查詢 | 網路選課另為 http://course.stust.edu.tw/;校務系統列表 my.stust.edu.tw/site/weblist。 2026-11-27 探測 HTTP 200 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 崑山科技大學（1024）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [崑山科技大學課程教學大綱資訊網](https://syllabus.ksu.edu.tw/) | 課程查詢、教學大綱 | 官方（崑山科技大學教務處） | 免登入 | 運作中 | 崑山科大依學期/課名/班級/教師查課並看教學大綱(已有 115-1) | myKSU 入口 https://my.ksu.edu.tw/ 含日間部抽籤選課系統;有 syllabus.ahan.net 同介面站,疑為廠商(阿漢)平台。 2026-11-27 探測 HTTP 200 |

### 嘉南藥理大學（1025）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [嘉南藥理大學學生課程導航GPS系統](https://ais.cnu.edu.tw) | 課程地圖、課程查詢 | 官方（嘉南藥理大學） | 不明 | 運作中 | 嘉藥課程導航、課程地圖 | 全校課程地圖(日間部) https://exam.cnu.edu.tw/Dsbc/ 、(進修部) /Nsbc/;學生資訊行動化平台 st.cnu.edu.tw;網路大學(舊版) ecourse.cnu.edu.tw。 2026-11-27 探測 HTTP 200 |

### 樹德科技大學（1026）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [樹德科技大學課程查詢系統](https://info.stu.edu.tw/ACA/student/QueryAGECourse/index.asp) | 課程查詢、教學大綱 | 官方（樹德科技大學教務處） | 免登入 | 運作中 | 樹德科大當期開課查詢,點課程代碼看教學大綱;大綱歷年查詢 info.stu.edu.tw/ACA/teacher/Syllabus/CourseQuery.asp | 校務資訊系統(info.stu.edu.tw)含課程地圖、選課;教務處 aca2.wp.stu.edu.tw。 2026-11-27 探測 HTTP 200 |

### 龍華科技大學（1030）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [龍華科技大學開放式課程查詢系統](https://sys.lhu.edu.tw/oapx/lhuplan/Query/course_qry.aspx) | 課程查詢 | 官方（龍華科技大學） | 免登入 | 運作中 | 龍華科大開放式課程查詢 | 網路選課 https://sys.lhu.edu.tw/CourseAp/SGLogin.aspx;課程地圖 https://sys.lhu.edu.tw/oapx/lhuplan/Course/SCourse_Qry.aspx;校園入口網 eportal.lhu.edu.tw。 2026-11-27 探測 HTTP 200 |

### 輔英科技大學（1031）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [輔英科技大學輔英資訊服務(課程)](https://cos.fy.edu.tw/) | 課程查詢、教學大綱、選課 | 官方（輔英科技大學） | 不明 | 運作中 | 課程計畫(yco_1112.asp)、科目表/課程概述/開課科目/教室時間/全校課程地圖查詢;選課日程 | 選課路徑:學生專區→資訊系統→學期選課系統入口;選課日程 PDF 在 cos.fy.edu.tw/Cos/<學期>選課日程.pdf。 2026-11-27 探測 HTTP 200 |

### 明新科技大學（1032）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [明新科技大學開課資訊查詢服務](https://sss.must.edu.tw/RWD_CosInfo/) | 課程查詢 | 官方（明新科技大學） | 免登入 | 運作中 | 明新科大開課資訊查詢 | 學生資訊服務系統 sss.must.edu.tw;校務學生資訊系統 mustwebsystem.must.edu.tw。 2026-11-27 探測 HTTP 200 |

### 弘光科技大學（1034）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [弘光科技大學課程資訊查詢(HK_Y01)](http://course.hk.edu.tw/hktea/HK_Y01/Y01_login_cus.aspx) | 課程查詢 | 官方（弘光科技大學教務處） | 免登入 | 不明 | 弘光科大課程資訊查詢(訪客) | 課程大綱 https://course.hk.edu.tw/hktea/HK_A02/A020A20.aspx;選課分流六站 cou01~cou06.hk.edu.tw/hk_a03/;97 學年前大綱舊站為內網 IP。 2026-11-27 本機探測失敗:<urlopen error timed out>;無法從本機確認,可能為防火牆/舊 TLS/校內限定 |

### 健行科技大學（1036）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [健行科技大學課程資訊(cos.uch)](https://cos.uch.edu.tw/course_info/index.html) | 課程查詢、教學大綱 | 官方（健行科技大學教務處） | 免登入 | 運作中 | 健行科大課程資訊查詢 | 選課系統 日間部 https://cosop.uch.edu.tw/stdsel/system_D/std_web/sel_index.asp、進修部 …/system_N/…;「stdsel」路徑與育達科大 cur.ydu.edu.tw/stdsel 相同,疑同一套 ASP 選課系統。 2026-11-27 探測 HTTP 200 |

### 正修科技大學（1037）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [正修科技大學課表查詢服務](https://csweb4.csu.edu.tw/) | 課程查詢 | 官方（正修科技大學圖書資訊處） | 免登入 | 運作中 | 正修科大課表查詢 | 網路選課 https://csweb.csu.edu.tw/;說明頁 https://www.csu.edu.tw/p/450-1000-12506,c0.php?Lang=zh-tw;開課與師資資訊 https://info.csu.edu.tw/p/412-1091-825.php?Lang=zh-tw。 2026-11-27 探測 HTTP 200 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 萬能科技大學（1038）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [萬能科技大學學生網路選課系統(ezpick)](http://ezpick.vnu.edu.tw/elective.aspx) | 選課 | 官方（萬能科技大學教務處） | 需登入 | 運作中 | 萬能科大第一階段選課;第二階段後查詢在學生資訊系統 weboffice.vnu.edu.tw/web_stu/ | 未找到全校公開課程查詢,僅通識中心/各系提供課程綱要下載;選課說明 https://administration.vnu.edu.tw/oaa/3077?n=47050。 2026-11-27 探測 HTTP 200 |

### 建國科技大學（1040）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [建國科技大學課程大綱、進度表及課表查詢](https://db.ctu.edu.tw/db_subject/index.aspx) | 課程查詢、教學大綱 | 官方（建國科技大學） | 免登入 | 運作中 | 建國科大教學大綱/進度表、班級課表查詢 | 選課系統 http://db.ctu.edu.tw/student/login.aspx;延修生 db.ctu.edu.tw/student_ex/login.aspx;資訊入口網 portal2.ctu.edu.tw。 2026-11-27 探測 HTTP 200 |

**跨校平台涵蓋**：[ee-class 易課學習管理系統](https://tw.formosasoft.com/p/ee-class)

### 明志科技大學（1041）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [明志科技大學網路選課系統(日間部)](http://day.course.mcut.edu.tw/) | 選課 | 官方（明志科技大學教務處） | 需登入 | 運作中 | 明志科大日間部選課;進修部 http://course.mcut.edu.tw/ | 校園入口網 portal.mcut.edu.tw;教務處 aca.mcut.edu.tw。 2026-11-27 探測 HTTP 200 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [明志科技大學選課小幫手](https://mcut-course.com/) | 課程查詢、排課、課程地圖 | 學生（itshenrywu） | 免登入 | 運作中 | 全校課表查詢、預排與衝堂檢查、畢業學分門檻 | v2 最後 push 2026-11-23。 [repo](https://github.com/itshenrywu/mcut-course-v2) |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 台鋼科技大學（1042）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [台鋼科技大學課程查詢](https://stuinfo.tsust.edu.tw/course.htm) | 課程查詢 | 官方（台鋼科技大學） | 不明 | 運作中 | 台鋼科大課程查詢 | 前身高苑科大;網路選課 https://webinfo2.tsust.edu.tw/SL_Publicationsystem/;單一登入 portal.tsust.edu.tw。 2026-11-27 探測 HTTP 200 |

### 大仁科技大學（1043）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [大仁科技大學大仁選課系統](https://web95.tajen.edu.tw/PHP/index_stu.html) | 選課、課程查詢 | 官方（大仁科技大學） | 不明 | 運作中 | 大仁科大選課 | 校務平台 cli.tajen.edu.tw/studentcutclass/。 2026-11-27 探測 HTTP 200 |

### 聖約翰科技大學（1044）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [聖約翰科技大學課程資訊網(Sjucourse)](https://sjuportal.sju.edu.tw/Sjucourse/) | 課程查詢 | 官方（聖約翰科技大學） | 不明 | 運作中 | 聖約翰科大課程資訊 | 學生入口網 sjusip.sju.edu.tw;教師入口 epteacher.sju.edu.tw。 2026-11-27 探測 HTTP 200 |

### 嶺東科技大學（1045）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [嶺東科技大學選課系統(含課程資訊/課程綱要)](https://course.ltu.edu.tw/StudySelect.aspx) | 課程查詢、教學大綱、選課 | 官方（嶺東科技大學） | 部分需登入 | 運作中 | 嶺東科大課程資訊、課程綱要(StSyView.aspx)、選課 FAQ | 課程地圖 https://aisweb.ltu.edu.tw/ltucmap/ 與 http://cmap.ltu.edu.tw。 2026-11-27 探測 HTTP 200 |

**跨校平台涵蓋**：[ee-class 易課學習管理系統](https://tw.formosasoft.com/p/ee-class)

### 中國科技大學（1046）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中國科技大學學生選課系統](https://sas1.cute.edu.tw/student_portal/index.htm) | 選課 | 官方（中國科技大學） | 需登入 | 運作中 | 中國科大學生選課系統(另有內網 IP 備用) | 單一入口 iq.cute.edu.tw;進修部時程 PDF 在 even.cute.edu.tw。 2026-11-27 探測 HTTP 200 |

### 中臺科技大學（1047）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中臺科技大學課程資訊・開課清單](https://aca.ctust.edu.tw/p/412-1021-6142.php?Lang=zh-tw) | 課程查詢 | 官方（中臺科技大學教務處） | 不明 | 運作中 | 中臺科大開課清單、選課公告 | 2026-11-27 探測 HTTP 200 |

### 台南應用科技大學（1051）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [台南應用科技大學開課課程查詢(sc2008)](https://stu95.tut.edu.tw/sc2008/default(tutst).asp) | 課程查詢 | 官方（台南應用科技大學） | 不明 | 運作中 | 台南應大開課課程查詢 | 路徑「/sc2008」與慈惠醫專學生資訊網(163.24.235.235/sc2008)相同,疑同一套學生資訊系統;課程地圖 https://coursemap.tut.edu.tw/;南應入口 portal.tut.edu.tw。 2026-11-27 探測 HTTP 200 |

### 中信科技大學（1052）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中信科技大學課程資訊查詢平台(CourseQuery)](https://web.isic.ctbctech.edu.tw/CourseQuery) | 課程查詢 | 官方（中信科技大學） | 免登入 | 運作中 | 中信科大課程資訊查詢(班級/教師/教室課表) | /CourseQuery 路徑與致理科大 coursequery.chihlee.edu.tw/CourseQuery/ 相同,疑同一廠商模板;網路選課 https://web6.isic.ctbctech.edu.tw/webselect/login.asp(日)、websel.isic.ctbctech.edu.tw/webselect_n/(夜)。 2026-11-27 探測 HTTP 200 |

### 元培醫事科技大學（1053）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [元培醫事科技大學校務系統(選課/課程大綱)](https://is.ypu.edu.tw/) | 課程查詢、教學大綱、選課 | 官方（元培醫事科技大學） | 部分需登入 | 運作中 | 元培醫事科大校務系統;訪客帳號可查全校課表與課程大綱,學生入口選課 | 查詢方式與訪客帳號公布於 https://edu.ypu.edu.tw/p/412-1011-5926.php;選課專區 https://edu.ypu.edu.tw/p/404-1011-54789.php。 2026-11-27 探測 HTTP 200 |

### 景文科技大學（1054）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [景文科技大學網路選課系統(GCourse)](http://aisvm7.just.edu.tw/GCourse/) | 選課 | 官方（景文科技大學） | 需登入 | 運作中 | 景文科大選課;通識/體育志願選課 deans.just.edu.tw/RedirectPECourse/ | 搜尋結果顯示頁面為 109 學年舊畫面;課表查詢由 CIP 入口雲(jwcip.just.edu.tw)提供。 2026-11-27 探測 HTTP 200 |

### 中華醫事科技大學（1055）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中華醫事科技大學科目名稱暨課程大綱查詢](https://mys.hwai.edu.tw/hwai-m/AA/Sel0405/Sel0405) | 課程查詢、教學大綱 | 官方（中華醫事科技大學） | 免登入 | 運作中 | 中華醫大課程大綱、班級/教師/教室課表查詢(Sel0401~0405) | 選課系統 https://course.hwai.edu.tw/hwai-m/S 與 course2.hwai.edu.tw。 2026-11-27 探測 HTTP 200 |

### 東南科技大學（1056）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [東南科技大學在校學生頁(課程/授課大綱查詢)](https://index.tnu.edu.tw/page/student) | 課程查詢、教學大綱 | 官方（東南科技大學） | 不明 | 不明 | 東南科大班級開課表、課程/授課大綱、教室課表、教師課表、學習地圖查詢入口 | 資訊公開頁 https://web.tnu.edu.tw/campusdata/?p=216 列同樣連結;新一代校務系統/Info 為選課入口。 2026-11-27 本機探測失敗:<urlopen error [Errno -2] Name or service not known>;無法從本機確認,可能為防火牆/舊 TLS/校內限定 |

### 德明財經科技大學（1057）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [德明財經科技大學課程地圖(CourseMap)](http://ep-s.takming.edu.tw/CourseMap/) | 課程地圖、教學大綱 | 官方（德明財經科技大學教務處） | 不明 | 運作中 | 德明財大課程地圖與課程大綱 | TIP 資訊網提供班級(個人)課表查詢與網路選課;各學院課程資訊手冊 PDF 在 www.takming.edu.tw/course/newstud/。 2026-11-27 探測 HTTP 200 |

**第三方服務**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [德明課程評價論壇（takming-forum）](https://takming-forum.sao-x.com/) | 評價、討論 | 學生（sao-coding） | 免登入 | 停止 | 課程評價與二手書交流 | 網站回 402（託管欠費）；repo 最後 push 2025-05-31。 [repo](https://github.com/sao-coding/takming-forum-web) |

### 南開科技大學（1060）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [南開科技大學選課專區(教務處)](https://nkaao.nkut.edu.tw/front/curriculum/course/news.php?ID=bmt1dF9hYW8mY291cnNl) | 選課 | 官方（南開科技大學教務處） | 不明 | 運作中 | 南開科大學生選課專區 | 校務資訊系統 https://app2.nkut.edu.tw/nkc/。 2026-11-27 探測 HTTP 200 |

### 中華科技大學（1061）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中華科技大學公開課表/課程查詢系統(PubCsSearch)](http://ap26.cust.edu.tw:8080/pis/PubCsSearch) | 課程查詢 | 官方（中華科技大學教務處） | 不明 | 運作中 | 中華科大公開課程查詢 | 本機對 cust.edu.tw 的 TLS 握手失敗(legacy renegotiation),僅能經搜尋結果(教務處 FAQ http://aca.cust.edu.tw/aca/fqa.html)確認;課程規劃表 https://aca.cust.edu.tw/curicul/course.html;舊資訊查詢系統 http://www.cust.edu.tw/www/info/intro_s.php 為 99 學年頁面。 2026-11-27 探測 HTTP 200 |

### 僑光科技大學（1062）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [僑光科技大學開課排課、各類課表查詢](https://www.ocu.edu.tw/p/404-1000-42863.php?Lang=zh-tw) | 課程查詢 | 官方（僑光科技大學） | 不明 | 運作中 | 僑光科大開課/課表查詢入口 | 選課資訊專區 https://rcs.ocu.edu.tw/p/412-1024-2619.php?Lang=zh-tw;學生資訊系統 ccap.ocu.edu.tw/newsys。 2026-11-27 探測 HTTP 200 |

### 育達科技大學（1063）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [育達科技大學開課資料查詢](http://course.ydu.edu.tw/LP/) | 課程查詢 | 官方（育達科技大學教務處） | 免登入 | 運作中 | 育達科大開課資料查詢 | 選課系統 http://cur.ydu.edu.tw/stdsel/signform.asp;資訊入口 portal.ydu.edu.tw。 2026-11-27 探測 HTTP 200 |

### 美和科技大學（1064）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [美和科技大學課程地圖資訊系統](https://coursemap.meiho.edu.tw/) | 課程地圖 | 官方（美和科技大學） | 不明 | 運作中 | 美和科大課程地圖 | 校務行政系統入口 https://www.meiho.edu.tw/p/404-1000-13542.php。 2026-11-27 探測 HTTP 200 |

### 吳鳳科技大學（1065）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [吳鳳科技大學學生校務行政系統](https://ccam.cc.wfu.edu.tw/) | 其他、選課 | 官方（吳鳳科技大學） | 需登入 | 運作中 | 吳鳳科大學生校務行政系統 | 公開課程查詢未找到;家長入口 sais1.wfu.edu.tw/guardPortal。 2026-11-27 探測 HTTP 200 |

### 修平科技大學（1069）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [修平科技大學開課科目查詢](http://pisj.hust.edu.tw/jack2005/DataQuery/QueryOpenCourse.jsp) | 課程查詢 | 官方（修平科技大學教務處） | 不明 | 運作中 | 修平科大開課科目/班級/教師/教室課表查詢(DataQuery) | 課程地圖 https://cmap.hust.edu.tw/;課表查詢頁 https://academic.hust.edu.tw/curriculum?item=12&custom=880&type=detail&isEn=0;網路選課 http://163.17.65.120/jack/Select3/assign.jsp(IP)。 2026-11-27 探測 HTTP 200 |

**跨校平台涵蓋**：[ee-class 易課學習管理系統](https://tw.formosasoft.com/p/ee-class)

### 長庚科技大學（1070）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [長庚科技大學學年度開課暨課程資料查詢](https://webmis.cgust.edu.tw/course/coursequery.asp) | 課程查詢、教學大綱 | 官方（長庚科技大學） | 免登入 | 運作中 | 長庚科大開課、課程規範大綱、進度表 | 校務資訊系統 webmis.cgust.edu.tw 含學生線上選課;選課說明 https://acad.cgust.edu.tw/p/412-1008-2578.php。 2026-11-27 探測 HTTP 200 |

### 臺北城市科技大學（1071）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [臺北城市科技大學全校/班級/教師課表查詢(tsint)](https://siw.tpcu.edu.tw/tsint/) | 課程查詢 | 官方（臺北城市科技大學教務處） | 部分需登入 | 運作中 | 城市科大課表查詢;選課 http://siw72.tpcu.edu.tw/tsint/ | 課程資訊查詢說明頁 https://aao.tpcu.edu.tw/p/412-1016-638.php?Lang=zh-tw。 2026-11-27 探測 HTTP 200 |

### 敏實科技大學（1072）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [敏實科技大學課程/書單/教學大綱查詢(訪客)](https://ccourse.mitust.edu.tw/score/crs_info/crs_guest_rwd.aspx) | 課程查詢、教學大綱 | 官方（敏實科技大學教務處） | 免登入 | 運作中 | 敏實科大訪客課程、書單、教學大綱查詢 | 另有課表查詢 https://regist.mitust.edu.tw/register/shwCourseTable.ASP;115 學年起大綱 https://regist.mitust.edu.tw/mgtstock/cp_public/course_progress_public_search.asp;學生資訊系統 ccourse.mitust.edu.tw/score。 2026-11-27 探測 HTTP 200 |

### 醒吾科技大學（1073）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [醒吾科技大學選課系統](https://choice.hwu.edu.tw/choice/course.html) | 選課 | 官方（醒吾科技大學教務處） | 需登入 | 運作中 | 醒吾科大選課 | 校務系統 https://campus.hwu.edu.tw/hwc/index.html;科目與教師開課資料查詢教學 https://b001.hwu.edu.tw/Post?PId=4796。 2026-11-27 探測 HTTP 200 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 文藻外語大學（1075）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [文藻外語大學選課專區(教務處)](http://d002.wzu.edu.tw/category/136230) | 選課、課程查詢 | 官方（文藻外語大學教務處） | 不明 | 運作中 | 文藻外語大學選課專區(全校開課清單) | 課程地圖 https://webnet.wzu.edu.tw/wzuEc/index.aspx;資訊服務入口網 sso.wzu.edu.tw;教學綱要需登入校務資訊系統查詢。 2026-11-27 探測 HTTP 200 |

### 華夏科技大學（1076）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [華夏科技大學學生暨家長查詢服務系統(課表)](https://student.hwh.edu.tw/student/Q/Q01/CourseTable) | 課程查詢 | 官方（華夏科技大學） | 不明 | 運作中 | 華夏科大各班課表查詢 | 舊課程計畫表 http://campus.hwh.edu.tw/public/CourseComment.aspx(100 學年範例)。 2026-11-27 探測 HTTP 200 |

### 致理科技大學（1078）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [致理科技大學課程資訊系統(CourseQuery)](http://coursequery.chihlee.edu.tw/CourseQuery/) | 課程查詢 | 官方（致理科技大學） | 免登入 | 運作中 | 致理科大課表查詢 | 學生選課 http://csportal.chihlee.edu.tw;學生資訊系統 sis.chihlee.edu.tw/SISystem/;路徑與中信科大相同。 2026-11-27 探測 HTTP 200 |

**跨校平台涵蓋**：[NTUTBox Template API（各大學課程節次模板）](https://github.com/poterpan/ntutbox-template-api)

### 宏國德霖科技大學（1080）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [宏國德霖科技大學課程資訊查詢(課程大綱)](http://infosys.hdut.edu.tw/ALLTOP/module_dli_acad/A4/A4936_CusOutlineRep.php) | 課程查詢、教學大綱 | 官方（宏國德霖科技大學） | 不明 | 運作中 | 宏國德霖科大課程大綱查詢 | 「ALLTOP」為廠商模組路徑;選課操作 https://academicaffairs.hdut.edu.tw/p/404-1002-11756.php。 2026-11-27 探測 HTTP 200 |

### 崇右影藝科技大學（1082）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [崇右影藝科技大學網路選課](http://course.cufa.edu.tw/) | 選課 | 官方（崇右影藝科技大學） | 需登入 | 不明 | 崇右影藝科大網路選課 | 學生資訊服務系統 schinfo.cufa.edu.tw。 2026-11-27 本機探測失敗:<urlopen error timed out>;無法從本機確認,可能為防火牆/舊 TLS/校內限定 |

### 台北海洋科技大學（1083）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [台北海洋科技大學課程查詢系統(系級頁)](https://dgad.tumt.edu.tw/p/412-1016-4487.php?Lang=zh-tw) | 課程查詢 | 官方（台北海洋科技大學電競數位遊戲與動畫設計系） | 不明 | 運作中 | 海洋科大電競數位遊戲與動畫設計系課程查詢(教室課表/班級課表) | 未找到全校公開課程查詢;各系自有頁(航海系/觀光系課程規劃頁)。 2026-11-27 探測 HTTP 200 |

### 亞東科技大學（1084）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [亞東科技大學課程查詢系統](https://portal.aeust.edu.tw/index.php?sid=CosQuery&mode=Query) | 課程查詢 | 官方（亞東科技大學） | 免登入 | 運作中 | 亞東科大課程查詢 | 學生選課 https://s.aeust.edu.tw/;課程地圖 http://www.cmap.aeust.edu.tw/;個人入口 portal.aeust.edu.tw。 2026-11-27 探測 HTTP 200 |

### 南亞技術學院（1168）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [南亞技術學院課表/教學大綱查詢](https://web.nanya.edu.tw/school_service/student/stdcourse/class_d.htm) | 課程查詢、教學大綱 | 官方（南亞技術學院） | 不明 | 運作中 | 南亞技術學院教學大綱(class_d)、課表(class_t)、選課(select_class) | 2026-11-27 探測 HTTP 200 |

### 黎明技術學院（1183）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [黎明技術學院選課相關(教務處)](https://www.lit.edu.tw/academic/4032/) | 選課 | 官方（黎明技術學院教務處） | 需登入 | 運作中 | 黎明技術學院選課事務;網路選課走 sso.lit.edu.tw | 公開課程查詢未找到。 2026-11-27 探測 HTTP 200 |

### 德育護理健康學院（1185）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [德育護理健康學院選課專區(教務處)](https://aca.dyhu.edu.tw/p/412-1022-37.php?Lang=zh-tw) | 選課 | 官方（德育護理健康學院教務處） | 不明 | 運作中 | 德育護理健康學院選課專區 | 2026-11-27 探測 HTTP 200 |

### 馬偕醫護管理專科學校（1282）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [馬偕醫護管理專科學校快速選課網址(course.mkc)](https://cas.mkc.edu.tw/cas/login?service=https://course.mkc.edu.tw/index_cas.php) | 選課 | 官方（馬偕醫護管理專科學校） | 需登入 | 運作中 | 馬偕醫專選課(CAS 單一登入) | 數位學習為 TronClass(tronclass.mkc.edu.tw,Keycloak SSO identity.mkc.edu.tw)。 2026-11-27 探測 HTTP 200 |

### 仁德醫護管理專科學校（1283）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [仁德醫護管理專科學校網路選課系統](http://webservice2.jente.edu.tw/school/students/) | 選課 | 官方（仁德醫護管理專科學校） | 需登入 | 不明 | 仁德醫專網路選課;夜間輔導選課 webservice.jente.edu.tw/nightclass/ | 課程地圖 http://ep.jente.edu.tw/LearningMap/CurriculumAndVocation.aspx;重補修課程查詢 webservice2.jente.edu.tw/repairs/classinfo.php;網站為 oljtwww.jente.edu.tw (Joomla)。 2026-11-27 本機探測失敗:<urlopen error [Errno -2] Name or service not known>;無法從本機確認,可能為防火牆/舊 TLS/校內限定 |

### 樹人醫護管理專科學校（1284）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [樹人醫護管理專科學校選課系統](https://course.szmc.edu.tw/szmc_all/sel/login) | 選課 | 官方（樹人醫護管理專科學校） | 需登入 | 運作中 | 樹人醫專選課 | 學生資訊網 https://sdnews.szmc.edu.tw/szmc_all/Home/Login。 2026-11-27 探測 HTTP 200 |

### 慈惠醫護管理專科學校（1285）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [慈惠醫護管理專科學校學生資訊網(sc2008)](http://163.24.235.235/sc2008) | 其他、課程查詢 | 官方（慈惠醫護管理專科學校） | 不明 | 運作中 | 慈惠醫專學生資訊網(IP 位址入口) | 路徑 /sc2008 與台南應大 stu95.tut.edu.tw/sc2008 相同;校網 https://www.tzuhui.edu.tw/home?cid=122 為校務資訊系統頁。 2026-11-27 探測 HTTP 200 |

### 耕莘健康管理專科學校（1286）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [耕莘健康管理專科學校新版校務行政系統(SAIS)](https://sais-main.ctcn.edu.tw/CTCN/Home/landing) | 其他、選課、課程查詢 | 官方（耕莘健康管理專科學校） | 需登入 | 運作中 | 耕莘健專新版校務行政系統 | 「SAIS」疑為廠商校務系統產品名;說明 https://www.ctcn.edu.tw/Link_q.aspx?q=LS;吳鳳科大亦有 sais1.wfu.edu.tw。 2026-11-27 探測 HTTP 200 |

### 敏惠醫護管理專科學校（1287）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [敏惠醫護管理專科學校開課資訊(teacher_qry)](http://school.mhchcm.edu.tw/minhwei_webmis/teacher_qry_techguidtop.asp) | 課程查詢 | 官方（敏惠醫護管理專科學校） | 不明 | 不明 | 敏惠醫專開課資訊 | 校務資訊說明 https://c025.mhchcm.edu.tw/p/412-1025-83.php?Lang=zh-tw。 2026-11-27 本機探測失敗:<urlopen error timed out>;無法從本機確認,可能為防火牆/舊 TLS/校內限定 |

### 育英醫護管理專科學校（1289）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [育英醫護管理專科學校課表查詢專區(教務行政組)](https://www.yuhing.edu.tw/ischool/publish_page/11?cid=178) | 課程查詢、課程地圖 | 官方（育英醫護管理專科學校教務處） | 不明 | 運作中 | 育英醫專課表查詢、課程地圖 https://lms.yuhing.edu.tw/cmap/、開課師資統計 | 教學計畫 PDF 直接放在官網(例 …/ischool/wr/file/1/551/…pdf);頁面為 ischool 版型(與慈惠醫專相同 /ischool/publish_page/)。 2026-11-27 探測 HTTP 200 |

### 聖母醫護管理專科學校（1291）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [聖母醫護管理專科學校聖母醫專網站(教務/課程)](https://www.smc.edu.tw/nss/p/index) | 其他 | 官方（聖母醫護管理專科學校） | 不明 | 運作中 | 聖母醫專官網;校內選課/成績查詢系統入口未能確認 | 公開課程查詢系統未找到;僅有課程規劃表 PDF(例 https://www.smc.edu.tw/uploads/1657079974902sN7pIvW1.pdf)。 2026-11-27 探測 HTTP 200 |

### 新生醫護管理專科學校（1292）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [新生醫護管理專科學校教務處選課公告(新生e日遊)](https://aa.hsc.edu.tw/p/404-1001-48950.php) | 選課 | 官方（新生醫護管理專科學校教務處） | 需登入 | 運作中 | 新生醫專選課流程:經「新生e日遊」專科系統→教務系統→選課(加退選) | portal.hsc.edu.tw 從本機 DNS 解析失敗;首頁有「課程查詢」連結(web.hsc.edu.tw)。 2026-11-27 探測 HTTP 200 |

### 崇仁醫護管理專科學校（1293）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [崇仁醫護管理專科學校全校課程地圖](https://coursemap.cjc.edu.tw/coursemap) | 課程地圖、課程查詢 | 官方（崇仁醫護管理專科學校） | 部分需登入 | 運作中 | 崇仁醫專全校課程地圖,同平台含學輔、實習管理 | 2026-11-27 探測 HTTP 200 |


## 宗教研修學院

### 基督教台灣浸會神學院（1R02）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [開設課表與課程內容](https://alumnus.tbts.edu.tw/info/class.php) | 課程查詢、教學大綱 | 官方（基督教台灣浸會神學院） | 免登入 | 不明 | 校務資訊公開專區按學年度列出課表與課程內容。 | 文件型公開資料，非即時查詢；索引可讀。 |

### 臺北基督學院（1R03）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [臺北基督學院開課與師資資訊](https://www.cct.edu.tw/SF/sf.html) | 課程查詢、課程地圖 | 官方（臺北基督學院） | 免登入 | 停止 | 公開近四年課程規劃表、歷年實際開課一覽及師資資訊。 | 搜尋索引含 114-2 開課一覽；直連 HTTP 500，未驗證附件。不代表永久停用。 |
| [臺北基督學院課程說明](https://www.cct.edu.tw/Administration/aao/course_elec/課程說明.pdf) | 教學大綱 | 官方（臺北基督學院） | 免登入 | 停止 | 雙語 PDF 列出課程編碼、名稱、學分及大綱。 | 搜尋索引有雙語課程說明；直連 HTTP 500，未讀取完整 PDF。 |
| [臺北基督學院 TronClass 數位學習平台](https://cct.tronclass.com/) | LMS | 官方（臺北基督學院） | 需登入 | 不明 | 校方連結至託管的 TronClass 數位教學。 | 產品：TronClass，校方專屬子網域。 |

### 一貫道天皇學院（1R04）

尚未盤點到任何網站。

### 台灣神學研究學院（1R05）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [台灣神學研究學院課程時間表](https://www.tgst.edu.tw/p/406-1001-8723,r40.php?Lang=zh-tw) | 課程查詢 | 官方（台灣神學研究學院） | 免登入 | 運作中 | 教務處公告神學碩士班 115-1 時間表；另有神學研道學碩士班課表。 | 文件型學期課表，未見全校動態查課入口。 |
| [台灣神學研究學院數位學習平台](https://learning.tgst.edu.tw/) | LMS | 官方（台灣神學研究學院） | 部分需登入 | 不明 | 對外提供部分課程目錄及登入入口，校內使用 Moodle 教學空間。 | 產品：Moodle。moodle.tgst.edu.tw 另顯示同校登入畫面；未確認是否為不同實例，暫不重複計數。 |

### 一貫道崇德學院（1R06）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [一貫道崇德學院課程規劃](https://www.iktcds.edu.tw/Chong-De-School/course-planning.htm) | 課程地圖 | 官方（一貫道崇德學院） | 免登入 | 不明 | 依入學年度公開研究所課程規劃表。 | PDF 與 XLS 檔案索引，頁面可見 114 級。 |
| [一貫道崇德學院課表及教學大綱](https://www.iktcds.edu.tw/Chong-De-School/curriculum.htm) | 課程查詢、教學大綱 | 官方（一貫道崇德學院） | 免登入 | 不明 | 官方教務處目錄公開學期課表，另設教學大綱分頁。 | 課表與大綱為同一網站的並列靜態目錄，未見動態查詢。 |
| [一貫道崇德學院網路選課單](https://www.iktcds.edu.tw/Chong-De-School/online-course-selection-list.htm) | 選課 | 官方（一貫道崇德學院） | 不明 | 不明 | 官方按年級發布網路選課表單。 | 教務處列出的部分選課單由 Google Forms 託管；未送出選課。 |

### 台灣基督長老教會南神神學院（1R07）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [南神神學院課程資訊](https://www.ttcs.edu.tw/data.php?id=969&tpl=5) | 課程查詢、教學大綱、課程地圖 | 官方（台灣基督長老教會南神神學院） | 免登入 | 不明 | 教務處課程資訊、課程規劃與學期課表。 | 公開文件，無須登入該頁。 |
| [南神神學院校務系統（TTC）](https://www.ttcs-sso.org.tw/TTC/) | 選課 | 官方（台灣基督長老教會南神神學院） | 需登入 | 不明 | 南神神學院的校務系統入口。 | 官方入口區分 TTC、FTTC、FTTCS、TTCS；此筆只收錄 TTC。 |

### 中華福音神學研究學院（1R08）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [中華福音神學研究學院課務註冊](https://www.ces.edu.tw/教務處/課務註冊/) | 課程查詢 | 官方（中華福音神學研究學院） | 免登入 | 不明 | 公布學期課務資訊與選課連結。 | 網站同時服務華神不同學制；此筆只計研究學院。 |
| [華神學生選課系統](https://portal.ces.edu.tw/ASIS/B2KPortal/Default.aspx) | 選課 | 官方（中華福音神學研究學院） | 需登入 | 不明 | 學生登入辦理選課。 | 系統登入畫面；未接觸學生資料。 |

### 唯心聖教學院（1R09）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [唯心聖教學院課表及課綱](https://www.wxsjc.edu.tw/page/1141101) | 課程查詢、教學大綱 | 官方（唯心聖教學院） | 免登入 | 不明 | 公開學年學期的課表及教學大綱。 |  |
| [唯心聖教學院課程規劃](https://www.wxsjc.edu.tw/page/3-1-5-1) | 課程地圖 | 官方（唯心聖教學院） | 免登入 | 不明 | 官網公開研究課程規劃。 | 靜態頁，不是互動式修課地圖。 |

### 福智佛教學院（1R10）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [福智佛教學院課程表與課程大綱](https://www.bwbc.edu.tw/iad/course-description/curriculum/) | 課程查詢、教學大綱 | 官方（福智佛教學院） | 免登入 | 不明 | 教務處提供課程表及教學大綱分類。 | 靜態頁，課表及大綱是同一網站的並列頁。 |
| [福智佛教學院課程藍圖](https://www.bwbc.edu.tw/iad/course/) | 課程地圖 | 官方（福智佛教學院） | 免登入 | 不明 | 教務處公開課程藍圖及課程規劃。 |  |


## 空中大學

### 國立空中大學（0A01）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [全校課程查詢系統](https://coursemap.nou.edu.tw/mp.asp?mp=1) | 課程查詢、課程地圖 | 官方（國立空中大學） | 免登入 | 運作中 | 查詢學期開課及各系全校課程地圖。 | 官方學生入口同時以「開課課程查詢」與「全校課程地圖」連到同一系統。 查閱 robots.txt：HTTP 404；無法據此判定爬取規則。 |
| [教務行政資訊系統](https://noustud.nou.edu.tw/home/home00/self_login) | 選課 | 官方（國立空中大學） | 需登入 | 不明 | 學生登入後選課、查成績與學籍。 |  |
| [國立空中大學數位學習平臺暨課程博覽](https://uu.nou.edu.tw/) | LMS | 官方（國立空中大學） | 部分需登入 | 停止 | 數位教學、線上課程、作業繳交及課程博覽。 | 校方另提供直接登入路徑。 本次直連：HTTP 403；不代表已永久停用。 |

**跨校平台涵蓋**：[TaiwanLIFE 臺灣全民學習平臺](https://taiwanlife.org/)、[智慧大師 Wisdom Master 教學平台](https://www.sun.net.tw/)

### 高雄市立空中大學（3A01）

**校方系統**

| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| [高雄市立空中大學授課大綱](https://sas.ouk.edu.tw/Scheme/index.aspx) | 課程查詢、教學大綱 | 官方（高雄市立空中大學） | 免登入 | 不明 | 對外查詢課程名稱及授課大綱。 | robots.txt 未回傳可識別的爬蟲指令。 |
| [高雄市立空中大學選課系統](https://select.ouk.edu.tw/) | 選課 | 官方（高雄市立空中大學） | 需登入 | 不明 | 需登入的空大網路選課。 |  |
| [高雄市立空中大學數位學習平台 3.0](https://eeclass3.ouk.edu.tw/) | LMS | 官方（高雄市立空中大學） | 部分需登入 | 運作中 | 提供教學空間及線上學習，首頁公開部分資源。 | 產品：ee-class；學校標示 111-2 啟用。 |

**跨校平台涵蓋**：[ee-class 易課學習管理系統](https://tw.formosasoft.com/p/ee-class)

