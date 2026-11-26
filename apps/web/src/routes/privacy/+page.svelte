<script lang="ts">
  import { ISSUES_URL } from '$lib/institutions';
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
</script>

<svelte:head>
  <title>隱私權政策｜UniCourse</title>
  <meta name="description" content="UniCourse 的隱私權政策：查課不需帳號、帳號儲存的資料、哪些內容會公開、外部評論索引儲存的欄位、Cookie 用途與移除請求方式。" />
</svelte:head>

<LegalDoc title="隱私權政策" updated={UPDATED} {sections} sibling={{ href: '/terms', label: '使用條款' }}>
  <section aria-labelledby="browse">
    <h2 id="browse">查課與登入</h2>
    <p>查詢各校公開課程不需要帳號，本站不會要求你提供學號、姓名或電子郵件。課程資料可能未即時更新，請以校方公開系統為準。</p>
    <p>只有評分、發文、回覆與投票需要登入。登入後瀏覽器會儲存一個用於維持登入狀態的 Cookie；登出即結束目前的登入。</p>
  </section>

  <section aria-labelledby="account">
    <h2 id="account">帳號資料</h2>
    <p>註冊時只儲存你選的帳號名稱與經雜湊處理的密碼；本站不會儲存明文密碼。你可以在<a href="/settings">帳號設定</a>填寫顯示名稱、就讀學校與自我介紹，這些欄位都是選填，也可以隨時清空。</p>
    <table>
      <thead><tr><th>資料</th><th>用途</th><th>是否公開</th></tr></thead>
      <tbody>
        <tr><td>帳號名稱</td><td>登入與署名</td><td>公開</td></tr>
        <tr><td>密碼雜湊</td><td>驗證登入</td><td>不公開</td></tr>
        <tr><td>顯示名稱、學校、自我介紹</td><td>個人頁面</td><td>公開（選填）</td></tr>
        <tr><td>評分、心得、文章、回覆、投票</td><td>社群功能</td><td>內容公開；投票只顯示合計</td></tr>
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
    <p>為了在課程頁列出其他網站上的相關討論，本站為允許搜尋索引的公開看板建立索引。每一筆只儲存下列欄位，不儲存全文，也不儲存任何未公開的資料：</p>
    <table>
      <thead><tr><th>欄位</th><th>說明</th></tr></thead>
      <tbody>
        <tr><td>連結</td><td>原文網址，點擊後回到原網站。</td></tr>
        <tr><td>標題與日期</td><td>原文標題與發文日期。</td></tr>
        <tr><td>作者帳號</td><td>原站顯示的帳號（handle），不另外比對真實身分。</td></tr>
        <tr><td>摘要</td><td>不超過 120 字，取自公開內文開頭。</td></tr>
        <tr><td>比對結果</td><td>對應的學校、課程與教師，以及看板與推文數。</td></tr>
      </tbody>
    </table>
    <p>只收錄站方 robots 檔以 <code>Content-Signal</code> 明確允許搜尋的網站；其他網站只提供連結。索引內容不用於訓練模型，不提供給第三方；原文被刪除時會在下次更新時移除。收錄原則詳見<a href="/terms#reviews">使用條款</a>。</p>
  </section>

  <section aria-labelledby="cookies">
    <h2 id="cookies">Cookie 與記錄</h2>
    <ul>
      <li>登入 Cookie：維持登入狀態，登出或過期後失效。未登入不會設定任何 Cookie。</li>
      <li>主題偏好：深淺色設定只存在你的瀏覽器（localStorage），不會傳回伺服器。</li>
      <li>伺服器記錄：為了排除故障與防止濫用，會短期保留請求時間、路徑與來源 IP，不用於廣告，也不與第三方分享。</li>
      <li>本站沒有第三方追蹤或廣告程式碼。</li>
    </ul>
  </section>

  <section aria-labelledby="contact">
    <h2 id="contact">移除與聯絡</h2>
    <p>想刪除帳號、移除外部索引中的某一筆，或對資料處理有疑問，請到 GitHub 建立 issue，並附上相關頁面的連結；不要在 issue 中張貼密碼或其他不想公開的資料。</p>
    <p class="callout"><a href={ISSUES_URL} rel="noopener external">UniCourse-TW/UniCourse issues <span aria-hidden="true">↗</span></a><br />請求通常在七天內處理；處理結果會回覆在同一則 issue。</p>
  </section>
</LegalDoc>
