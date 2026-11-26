<script lang="ts">
  import { ISSUES_URL } from '$lib/institutions';
  import LegalDoc from '$lib/legal-doc.svelte';

  const UPDATED = '2026-11-27';
  const sections = [
    { id: 'data', title: '課程資料' },
    { id: 'sources', title: '資料來源與授權' },
    { id: 'account', title: '帳號與社群' },
    { id: 'reviews', title: '外部評論索引' },
    { id: 'removal', title: '聯絡與移除' },
    { id: 'changes', title: '條款變更' }
  ];
</script>

<svelte:head>
  <title>使用條款｜UniCourse</title>
  <meta name="description" content="UniCourse 的使用條款：課程資料的來源與限制、帳號與社群規範、外部評論索引的收錄原則與移除方式。" />
</svelte:head>

<LegalDoc title="使用條款" updated={UPDATED} {sections} sibling={{ href: '/privacy', label: '隱私權政策' }}>
  <section aria-labelledby="data">
    <h2 id="data">課程資料</h2>
    <p>UniCourse 彙整各校公開系統的課程資料，方便跨校查詢與比較歷年修課人數。資料可能晚於校方更新，實際選課、上課時間、名額與成績規定請以校方系統為準。</p>
    <p>標示「示範」的課程不是實際開課紀錄；各校的收錄進度與未收錄原因列在<a href="/schools">各校收錄狀態</a>。</p>
  </section>

  <section aria-labelledby="sources">
    <h2 id="sources">資料來源與授權</h2>
    <p>本站的資料有三種來源，每一筆課程都保留原始連結，可回到校方頁面核對：</p>
    <table role="table">
      <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">資料</th><th role="columnheader" scope="col">來源</th><th role="columnheader" scope="col">授權與使用方式</th></tr></thead>
      <tbody role="rowgroup">
        <tr role="row"><td role="cell" data-label="資料">學校名錄</td><td role="cell" data-label="來源">教育部大專校院名錄等開放資料</td><td role="cell" data-label="授權與使用方式">政府資料開放授權條款；依原始檔重新產生，不手動修改。</td></tr>
        <tr role="row"><td role="cell" data-label="資料">課程與修課人數</td><td role="cell" data-label="來源">各校公開課程查詢系統、教育部課程資源網</td><td role="cell" data-label="授權與使用方式">只抓取無需登入的公開頁面，遵守各站 robots 規則，夜間低頻更新。</td></tr>
        <tr role="row"><td role="cell" data-label="資料">課程網站總覽</td><td role="cell" data-label="來源">UniCourse 逐校盤點</td><td role="cell" data-label="授權與使用方式">列在<a href="/landscape">課程網站總覽</a>，資料檔隨原始碼公開。</td></tr>
      </tbody>
    </table>
    <p>校方系統要求登入、使用驗證碼或以 robots 規則拒絕抓取時，本站不會收錄該校資料，並在各校收錄狀態頁標示「受阻」。本站的程式碼與資料檔以開源方式公開於 GitHub。</p>
  </section>

  <section aria-labelledby="account">
    <h2 id="account">帳號與社群</h2>
    <p>查課不用登入；評分、發文、回覆與投票需要帳號。請妥善保管登入資訊，一個人只用一個帳號。</p>
    <ul>
      <li>尊重其他使用者：不冒用身分、不騷擾、不公開他人的個人資料。</li>
      <li>評分與心得請以自己的修課經驗為限，不代替他人評論，也不張貼廣告或與課程無關的內容。</li>
      <li>違反上述規範的內容可能被移除；情節嚴重時會停用帳號。</li>
    </ul>
    <p>你送出的公開內容會以帳號名稱顯示，並可能被搜尋引擎索引；細節見<a href="/privacy#public">隱私權政策的公開內容</a>。</p>
  </section>

  <section aria-labelledby="reviews">
    <h2 id="reviews">外部評論索引</h2>
    <p><span class="status">目前狀態</span>課程頁的「網路上的討論」區目前只提供站外搜尋連結，索引功能尚未上線，也還沒有儲存任何外站內容。下面是功能上線後會遵守的收錄原則：</p>
    <p>上線後，課程頁會列出其他網站上與該課程相關的公開文章，例如 PTT 各校課程板。本站只做搜尋索引，不轉載全文：</p>
    <ul>
      <li>只儲存連結、標題、發文日期、作者帳號（handle）與不超過 120 字的摘要，以及比對出的學校、課程與教師。</li>
      <li>只收錄明確允許搜尋索引的網站，依站方 robots 檔的 <code>Content-Signal</code> 判斷；未明確允許的網站（例如歐趴糖、NCKU HUB、NTU Rating）只提供外部連結，不複製任何內容。</li>
      <li>索引內容只用於搜尋與連結，不用於訓練模型，也不提供給第三方。</li>
      <li>原文被刪除或站方規則改變時，索引會在下次更新時一併移除。</li>
    </ul>
    <p>各站的處理方式列在<a href="/landscape#third-party">課程網站總覽的第三方查課網站</a>。</p>
  </section>

  <section aria-labelledby="removal">
    <h2 id="removal">聯絡與移除</h2>
    <p>若你是文章作者、被提及的教師或當事人，想移除外部索引中的某一筆，或認為課程資料、評分與文章有誤，請附上該頁面的連結，用下面任一方式告訴我們：</p>
    <p class="callout">
      <a href={ISSUES_URL} rel="noopener external">在 GitHub 建立移除或更正請求（UniCourse-TW/UniCourse issues） <span aria-hidden="true">↗</span></a>
      <span class="note">issue 是公開頁面，請不要在裡面張貼學號、聯絡方式等個人資料。不方便公開時，可改用 GitHub 的私密回報（Security advisory）或<a href="https://github.com/UniCourse-TW" rel="noopener external">UniCourse-TW 組織頁</a>上列出的維護者信箱，私下聯絡。</span>
      <span class="note">請求通常在七天內處理；處理結果會回覆在同一則 issue 或原信件。</span>
    </p>
    <p>移除索引不影響原網站上的文章；要刪除原文請聯絡該網站。</p>
  </section>

  <section aria-labelledby="changes">
    <h2 id="changes">條款變更</h2>
    <p>條款有實質更動時會更新頁首的日期；重大變更會在首頁公告。繼續使用本站即表示你同意更新後的條款。</p>
  </section>
</LegalDoc>
