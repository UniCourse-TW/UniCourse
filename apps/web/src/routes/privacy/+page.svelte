<script lang="ts">
  import { PRIVATE_REPORT_URL, PUBLIC_REPORT_URL } from '$lib/legal-contact';
  import LegalDoc from '$lib/legal-doc.svelte';

  const UPDATED = '2026-11-27';
  const sections = [
    { id: 'browse', title: '查課與登入' },
    { id: 'account', title: '帳號資料' },
    { id: 'public', title: '公開內容' },
    { id: 'reviews', title: '外部評論索引儲存的資料' },
    { id: 'cookies', title: 'Cookie 與記錄' },
    { id: 'contact', title: '移除與聯絡' }
  ];
  const summary = [
    '查課不用帳號，本站不要求學號、姓名或電子郵件。',
    '註冊只存帳號名稱與雜湊後的密碼；顯示名稱、學校與自我介紹都是選填。',
    '評分、文章與回覆會公開，也可能被搜尋引擎索引；投票只顯示合計。',
    '外部評價只索引 PTT 課程板的公開文章（標題、日期、作者帳號與 120 字內摘要），不存全文。',
    '沒有廣告與第三方追蹤；Cookie 只用來維持登入和記住你選的深淺色。',
    '要刪除帳號或移除與你有關的索引：涉及個資的請私密聯絡維護者，一般資料錯誤可公開回報。'
  ];
</script>

<svelte:head>
  <title>隱私權政策｜UniCourse</title>
  <meta name="description" content="UniCourse 的隱私權政策：查課不需帳號、帳號儲存的資料、哪些內容會公開、外部評論索引儲存的欄位、Cookie 用途與移除請求方式。" />
</svelte:head>

<LegalDoc title="隱私權政策" updated={UPDATED} {sections} {summary} sibling={{ href: '/terms', label: '使用條款' }}>
  <section aria-labelledby="browse">
    <h2 id="browse">查課與登入</h2>
    <p>查詢各校公開課程不需要帳號，本站不會要求你提供學號、姓名或電子郵件。課程資料可能未即時更新，請以校方公開系統為準。</p>
    <p>只有評分、發文、回覆與投票需要登入。登入後瀏覽器會儲存一個用於維持登入狀態的 Cookie；登出即結束目前的登入。</p>
  </section>

  <section aria-labelledby="account">
    <h2 id="account">帳號資料</h2>
    <p>註冊時只儲存你選的帳號名稱與經雜湊處理的密碼；本站不會儲存明文密碼。你可以在<a href="/settings">帳號設定</a>填寫顯示名稱、就讀學校與自我介紹，這些欄位都是選填，也可以隨時清空。</p>
    <table role="table">
      <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">資料</th><th role="columnheader" scope="col">用途</th><th role="columnheader" scope="col">是否公開</th></tr></thead>
      <tbody role="rowgroup">
        <tr role="row"><td role="cell" data-label="資料">帳號名稱</td><td role="cell" data-label="用途">登入與署名</td><td role="cell" data-label="是否公開">公開</td></tr>
        <tr role="row"><td role="cell" data-label="資料">密碼雜湊</td><td role="cell" data-label="用途">驗證登入</td><td role="cell" data-label="是否公開">不公開</td></tr>
        <tr role="row"><td role="cell" data-label="資料">顯示名稱、學校、自我介紹</td><td role="cell" data-label="用途">個人頁面</td><td role="cell" data-label="是否公開">公開（選填）</td></tr>
        <tr role="row"><td role="cell" data-label="資料">評分、心得、文章、回覆、投票</td><td role="cell" data-label="用途">社群功能</td><td role="cell" data-label="是否公開">內容公開；投票只顯示合計</td></tr>
      </tbody>
    </table>
  </section>

  <section aria-labelledby="public">
    <h2 id="public">公開內容</h2>
    <p>帳號名稱、你填寫的公開個人資料，以及送出的課程評分、心得、文章與回覆都會公開顯示，也可能被搜尋引擎索引。請勿在公開內容中填寫學號、聯絡方式等不想公開的資料。</p>
    <p>你可以自行修改或刪除自己的評分與文章；刪除後不再顯示於站內，但已被搜尋引擎或他人保存的副本不在本站控制範圍。</p>
  </section>

  <section aria-labelledby="reviews">
    <h2 id="reviews">外部評論索引儲存的資料</h2>
    <p><span class="status live">已上線</span>為了在課程頁列出其他網站上的相關討論，本站為 PTT 的四個課程看板（NTUcourse、NTHU_Course、NCTU-Teacher、NCHU-Courses）2016 年起的公開文章建立了搜尋索引。每一筆只儲存下列欄位，不儲存全文、推文內容或圖片，也不儲存任何未公開的資料：</p>
    <table role="table">
      <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">欄位</th><th role="columnheader" scope="col">說明</th></tr></thead>
      <tbody role="rowgroup">
        <tr role="row"><td role="cell" data-label="欄位">連結</td><td role="cell" data-label="說明">原文網址，點擊後回到原網站。</td></tr>
        <tr role="row"><td role="cell" data-label="欄位">標題與日期</td><td role="cell" data-label="說明">原文標題與發文日期。</td></tr>
        <tr role="row"><td role="cell" data-label="欄位">作者帳號</td><td role="cell" data-label="說明">PTT ID（不含暱稱），不另外比對真實身分。</td></tr>
        <tr role="row"><td role="cell" data-label="欄位">摘要</td><td role="cell" data-label="說明">不超過 120 字，取自公開內文開頭；NTUcourse 作者選擇不同意轉載的文章不存摘要。</td></tr>
        <tr role="row"><td role="cell" data-label="欄位">比對結果</td><td role="cell" data-label="說明">對應的學校、課程與教師，以及看板與推文數。</td></tr>
      </tbody>
    </table>
    <p>只收錄站方 robots 檔以 <code>Content-Signal</code> 明確允許搜尋的網站；歐趴糖、Dcard 等其他網站只提供搜尋連結，不抓取任何內容。索引內容不用於訓練模型，也不提供給第三方。索引不會自動得知原文已刪除；要移除某一筆，請用下方<a href="#contact">移除與聯絡</a>的管道。收錄範圍詳見<a href="/terms#reviews">使用條款</a>。</p>
  </section>

  <section aria-labelledby="cookies">
    <h2 id="cookies">Cookie 與記錄</h2>
    <ul>
      <li>登入 Cookie：維持登入狀態，登出或過期後失效。</li>
      <li>主題 Cookie（<code>uc_theme</code>）：只在你按下深淺色切換時設定，內容只有 light 或 dark，保存一年，讓頁面一開始就用你選的主題。沒有登入也沒有切換主題時，本站不設定任何 Cookie。</li>
      <li>伺服器記錄：為了排除故障與防止濫用，會短期保留請求時間、路徑與來源 IP，不用於廣告，也不與第三方分享。</li>
      <li>本站沒有第三方追蹤或廣告程式碼。</li>
    </ul>
  </section>

  <section aria-labelledby="contact">
    <h2 id="contact">移除與聯絡</h2>
    <p>先選管道：<strong>刪除帳號、涉及個人資料或不想公開的請求，請走私密聯絡</strong>；一般的資料處理問題或移除外部索引中錯配的文章，可以公開回報。</p>
    <div class="contact-routes">
      <div>
        <p class="route-kind">公開回報</p>
        <h3>可公開的資料錯誤</h3>
        <p>一般的資料處理問題、錯配的外部文章，結果大家都看得到。請不要附上學號、聯絡方式等個人資料。</p>
        <a class="route" href={PUBLIC_REPORT_URL} rel="noopener external">在 GitHub 建立 issue <span aria-hidden="true">↗</span></a>
      </div>
      <div>
        <p class="route-kind">私密聯絡</p>
        <h3>含個資或不想公開的請求</h3>
        <p>刪除帳號、移除與你有關的索引，或任何不想公開提出的請求。用 GitHub 的私密回報表單送出，只有維護者看得到。</p>
        <a class="route" href={PRIVATE_REPORT_URL} rel="noopener external">私密回報給維護者 <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <p>請附上相關頁面的連結。請求通常在七天內處理，結果會回覆在同一則 issue 或私密回報中。</p>
  </section>
</LegalDoc>
