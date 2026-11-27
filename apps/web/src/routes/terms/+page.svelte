<script lang="ts">
  import { PRIVATE_REPORT_URL, PUBLIC_REPORT_URL } from '$lib/legal-contact';
  import LegalDoc, { type GistPoint } from '$lib/legal-doc.svelte';

  const UPDATED = '2026-11-27';
  const sections = [
    { id: 'data', title: '課程資料' },
    { id: 'sources', title: '資料來源與授權' },
    { id: 'account', title: '帳號與社群' },
    {
      id: 'reviews',
      title: '外部評論索引',
      children: [
        { id: 'reviews-kept', title: '保存內容' },
        { id: 'reviews-boards', title: '收錄看板' },
        { id: 'reviews-policy', title: '收錄原則' },
        { id: 'reviews-removal', title: '更新與移除' }
      ]
    },
    { id: 'removal', title: '聯絡與移除' },
    { id: 'changes', title: '條款變更' }
  ];
  const summary: GistPoint[] = [
    { lead: '課程資料', text: '來自各校公開系統，可能比校方晚更新；選課與上課以校方為準。' },
    { lead: '帳號', text: '查課不用登入；評分、發文與回覆需要帳號，內容會公開並可能被搜尋引擎索引。' },
    { lead: '外部評價', text: '只索引 PTT 四個課程板的公開文章標題與短摘要，不轉載全文；其他網站只給搜尋連結。' },
    { lead: '更正與移除', text: '一般錯誤公開回報；涉及個資或不想公開的，', link: { href: PRIVATE_REPORT_URL, label: '在 GitHub 私密回報', external: true } }
  ];
</script>

<svelte:head>
  <title>使用條款｜UniCourse</title>
  <meta name="description" content="UniCourse 的使用條款：課程資料的來源與限制、帳號與社群規範、PTT 課程板外部評論索引的收錄範圍、儲存欄位與移除方式。" />
</svelte:head>

<LegalDoc title="使用條款" updated={UPDATED} {sections} {summary} sibling={{ href: '/privacy', label: '隱私權政策' }}>
  <section aria-labelledby="data">
    <div class="h2-row"><h2 id="data">課程資料</h2></div>
    <p>UniCourse 彙整各校公開系統的課程資料，方便跨校查詢與比較歷年修課人數。資料可能晚於校方更新，實際選課、上課時間、名額與成績規定請以校方系統為準。</p>
    <p>標示「示範」的課程不是實際開課紀錄；各校的收錄進度與未收錄原因列在<a href="/schools">各校收錄狀態</a>。</p>
  </section>

  <section aria-labelledby="sources">
    <div class="h2-row"><h2 id="sources">資料來源與授權</h2></div>
    <p>本站的資料有三種來源，每一筆課程都保留原始連結，可回到校方頁面核對：</p>
    <details class="doc-fold">
      <summary>查看 3 類資料的來源與授權</summary>
      <table role="table" class="sources stacked">
        <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">資料</th><th role="columnheader" scope="col">來源</th><th role="columnheader" scope="col">授權與使用方式</th></tr></thead>
        <tbody role="rowgroup">
          <tr role="row"><td role="cell" data-label="資料">學校名錄</td><td role="cell" data-label="來源">教育部大專校院名錄等開放資料</td><td role="cell" data-label="授權與使用">政府資料開放授權條款；依原始檔重新產生，不手動修改。</td></tr>
          <tr role="row"><td role="cell" data-label="資料">課程與修課人數</td><td role="cell" data-label="來源">各校公開課程查詢系統、教育部課程資源網</td><td role="cell" data-label="授權與使用">只抓取無需登入的公開頁面，遵守各站 robots 規則，夜間低頻更新。</td></tr>
          <tr role="row"><td role="cell" data-label="資料">課程網站總覽</td><td role="cell" data-label="來源">UniCourse 逐校盤點</td><td role="cell" data-label="授權與使用"><span>列在<a href="/landscape">課程網站總覽</a>，資料檔隨原始碼公開。</span></td></tr>
        </tbody>
      </table>
      <p>遇到登入、驗證碼或禁止抓取的校方系統，本站不會從該系統取用資料。若教育部提供該校的課程資料，本站仍可能收錄。實際進度見<a href="/schools">各校收錄狀態</a>。本站的程式碼與資料檔以開源方式公開於 GitHub。</p>
    </details>
  </section>

  <section aria-labelledby="account">
    <div class="h2-row"><h2 id="account">帳號與社群</h2></div>
    <p>查課不用登入；評分、發文、回覆與投票需要帳號。請妥善保管登入資訊，一個人只用一個帳號。</p>
    <ul>
      <li>尊重其他使用者：不冒用身分、不騷擾、不公開他人的個人資料。</li>
      <li>評分與心得請以自己的修課經驗為限，不代替他人評論，也不張貼廣告或與課程無關的內容。</li>
      <li>違反上述規範的內容可能被移除；情節嚴重時會停用帳號。</li>
    </ul>
    <p>你送出的公開內容會以帳號名稱顯示，並可能被搜尋引擎索引；細節見<a href="/privacy#public">隱私權政策的公開內容</a>。</p>
  </section>

  <section aria-labelledby="reviews">
    <div class="h2-row"><h2 id="reviews">外部評論索引</h2></div>
    <!-- One paragraph answers the two questions readers come with; the lists below hold the detail. -->
    <p class="lead"><strong>收什麼：</strong>PTT 四個課程板 2016 年起的公開文章。本站只做搜尋索引、不轉載全文，課程頁顯示標題、日期與開頭摘要，點標題回到原網站。<strong>怎麼移除：</strong>到<a href="#removal">聯絡與移除</a>私密告訴維護者即可，不必公開提出。</p>
    <details class="doc-fold">
      <summary id="reviews-kept">會保存、不會保存什麼</summary>
      <ul>
        <li><strong>會保存：</strong>連結、標題、發文日期、作者帳號（PTT ID，不含暱稱）、看板、推文數、內文開頭不超過 120 字的摘要，以及從標題比對出的學期、課程與教師。</li>
        <li><strong>不會保存：</strong>全文、推文內容與圖片。索引只用於搜尋與連結，不用於訓練模型，也不提供給第三方。</li>
        <li>顯示摘要時會去掉評價範本的欄位提示（例如「哪一學年度修課」），只留作者寫的內容；剩下的太少時只顯示標題。比對以標題中的課名與教師名為準，可能有錯配或漏配；課程頁會把本班教師的文章排在前面並標示出來。</li>
      </ul>
    </details>
    <details class="doc-fold">
      <summary id="reviews-boards">查看目前收錄的 4 個看板</summary>
      <p>只收錄 PTT（批踢踢實業坊）上專門討論課程的四個看板，從 2016 年起的文章。</p>
      <table role="table" class="boards stacked">
        <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">看板</th><th role="columnheader" scope="col">對應學校</th><th role="columnheader" scope="col">備註</th></tr></thead>
        <tbody role="rowgroup">
          <tr role="row"><td role="cell" data-label="看板">NTUcourse</td><td role="cell" data-label="對應學校">國立臺灣大學</td><td role="cell" data-label="備註" title="作者在評價範本中選「否」（不同意轉載）的文章不存摘要，只列標題。">不同意轉載的文章只列標題</td></tr>
          <tr role="row"><td role="cell" data-label="看板">NTHU_Course</td><td role="cell" data-label="對應學校">國立清華大學</td><td role="cell" data-label="備註" title="2017 年看板搬遷時轉錄的舊文，日期是轉錄日。">2017 年轉錄的舊文以轉錄日為準</td></tr>
          <tr role="row"><td role="cell" data-label="看板">NCTU-Teacher</td><td role="cell" data-label="對應學校">國立陽明交通大學</td><td role="cell" data-label="備註" title="2016 年看板搬遷時轉錄的舊文，日期是轉錄日。">2016 年轉錄的舊文以轉錄日為準</td></tr>
          <tr role="row"><td role="cell" data-label="看板">NCHU-Courses</td><td role="cell" data-label="對應學校">國立中興大學</td><td role="cell" data-label="備註">文章較少</td></tr>
        </tbody>
      </table>
    </details>
    <details class="doc-fold">
      <summary id="reviews-policy">哪些網站可以收錄？</summary>
      <p>PTT 明確允許建立搜尋索引，其他課程評論網站目前只提供搜尋連結。</p>
      <ul>
        <li>只索引 robots 檔以 <code>Content-Signal: search=yes</code> 明確允許搜尋的網站。PTT 同時標明 <code>ai-train=no</code>。</li>
        <li>歐趴糖、Dcard、想鑑你 NTU Rating 等網站的處理方式列在<a href="/landscape#third-party">課程網站總覽</a>。</li>
      </ul>
    </details>
    <details class="doc-fold">
      <summary id="reviews-removal">更新與移除</summary>
      <p class="update-note">索引由維護者定期重新抓取並匯入，不是每晚自動更新，新文章會晚一段時間才出現。原文在 PTT 刪除後，本站不會自動得知；<a class="private" href={PRIVATE_REPORT_URL} rel="noopener external">私密聯絡維護者<span aria-hidden="true"> ↗</span></a>或用下方<a href="#removal">聯絡與移除</a>的任一管道告訴我們，該筆索引會被移除。</p>
    </details>
  </section>

  <section aria-labelledby="removal">
    <div class="h2-row"><h2 id="removal">聯絡與移除</h2></div>
    <p>先選管道：<strong>涉及個資、帳號或不想公開的請求走私密聯絡</strong>，一般的資料錯誤可以公開回報。</p>
    <div class="contact-routes">
      <div>
        <p class="route-kind">私密聯絡</p>
        <h3>含個資或不想公開的請求</h3>
        <p>移除與你有關的索引或處理帳號問題。文章作者、被提及的教師或當事人都可以提出。</p>
        <a class="route" href={PRIVATE_REPORT_URL} rel="noopener external">在 GitHub 私密回報 <span aria-hidden="true">↗</span></a>
        <p class="route-access">需 GitHub 帳號 · 僅維護者可見</p>
        <ul class="route-meta"><li>附上相關頁面連結</li><li>通常七天內在同一則回報回覆</li></ul>
      </div>
      <div>
        <p class="route-kind">公開回報</p>
        <h3>可公開的資料錯誤</h3>
        <p>回報錯配的外部文章或其他資料錯誤。請勿附上個資。</p>
        <a class="route" href={PUBLIC_REPORT_URL} rel="noopener external">在 GitHub 公開回報 <span aria-hidden="true">↗</span></a>
        <p class="route-access">需 GitHub 帳號 · 所有人可見</p>
        <ul class="route-meta"><li>附上相關頁面連結</li><li>通常七天內在同一則 issue 回覆</li></ul>
      </div>
    </div>
    <p>移除索引不影響原網站上的文章；要刪除原文請聯絡該網站。</p>
  </section>

  <section aria-labelledby="changes">
    <div class="h2-row"><h2 id="changes">條款變更</h2></div>
    <p>條款有實質更動時會更新頁首的日期；重大變更會在首頁公告。繼續使用本站即表示你同意更新後的條款。</p>
  </section>
</LegalDoc>
