<script lang="ts">
  import { PRIVATE_REPORT_URL, PUBLIC_REPORT_URL } from '$lib/legal-contact';
  import LegalDoc, { type GistPoint } from '$lib/legal-doc.svelte';

  const UPDATED = '2026-11-27';
  const sections = [
    { id: 'browse', title: '查課與登入' },
    { id: 'account', title: '帳號資料' },
    { id: 'public', title: '公開內容' },
    { id: 'reviews', title: '外部評論索引' },
    { id: 'cookies', title: 'Cookie 與記錄' },
    { id: 'contact', title: '聯絡與移除' }
  ];
  // Five points, each lead jumping to the section with the detail; required and optional data are told apart.
  const summary: GistPoint[] = [
    { lead: '查課與註冊', href: '#browse', text: '查課不用帳號；註冊只要帳號名稱與密碼，密碼以無法還原的形式保存，連維護者也看不到。' },
    { lead: '公開什麼', href: '#account', text: '帳號名稱、評分與文章公開；顯示名稱、學校、自我介紹選填，填了才公開。' },
    { lead: '外部評價', href: '#reviews', text: '只索引 PTT 課程板的標題與短摘要，不存全文。' },
    { lead: '保存期限', href: '#cookies', text: 'Cookie：登入 30 天、主題偏好一年；伺服器記錄只留到排除故障為止。' },
    { lead: '刪除帳號', href: '#contact', text: '要刪除帳號、移除與你有關的索引或個資，私密聯絡維護者：', link: { href: PRIVATE_REPORT_URL, label: '私密申請刪除（GitHub）', external: true } }
  ];
</script>

<svelte:head>
  <title>隱私權政策｜UniCourse</title>
  <meta name="description" content="UniCourse 的隱私權政策：查課不需帳號、帳號儲存的資料、哪些內容會公開、外部評論索引儲存的欄位、Cookie 用途與移除請求方式。" />
</svelte:head>

<LegalDoc title="隱私權政策" updated={UPDATED} {sections} {summary} contactLabel="怎麼刪除帳號或移除資料" sibling={{ href: '/terms', label: '使用條款' }}>
  <section aria-labelledby="browse">
    <div class="h2-row"><h2 id="browse">查課與登入</h2></div>
    <p>查詢各校公開課程不需要帳號，本站不會要求你提供學號、姓名或電子郵件。課程資料可能未即時更新，請以校方公開系統為準。</p>
    <p>評分、發文、回覆與投票需要登入。登入狀態以 Cookie 維持。</p>
  </section>

  <section aria-labelledby="account">
    <div class="h2-row"><h2 id="account">帳號資料</h2></div>
    <p>註冊時只儲存你選的帳號名稱與經雜湊處理的密碼；本站不會儲存明文密碼。選填資料可隨時在<a href="/settings">帳號設定</a>新增或清空。</p>
    <table role="table" class="account-data stacked">
      <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">資料</th><th role="columnheader" scope="col">是否公開</th><th role="columnheader" scope="col">用途</th></tr></thead>
      <tbody role="rowgroup">
        <tr role="row"><td role="cell">帳號名稱</td><td role="cell" data-label="公開範圍"><span class="scope public">公開</span></td><td role="cell" data-label="用途">登入與署名</td></tr>
        <tr role="row"><td role="cell">密碼（無法還原的雜湊）</td><td role="cell" data-label="公開範圍"><span class="scope private">不公開</span></td><td role="cell" data-label="用途">驗證登入</td></tr>
        <tr role="row"><td role="cell">顯示名稱<span class="opt">選填</span></td><td role="cell" data-label="公開範圍"><span class="scope public">公開</span></td><td role="cell" data-label="用途">個人頁與社群署名</td></tr>
        <tr role="row"><td role="cell">學校、自我介紹<span class="opt">選填</span></td><td role="cell" data-label="公開範圍"><span class="scope public">公開</span></td><td role="cell" data-label="用途">個人頁面</td></tr>
        <tr role="row"><td role="cell">評分、心得、文章與回覆</td><td role="cell" data-label="公開範圍"><span class="scope public">公開</span></td><td role="cell" data-label="用途">社群內容</td></tr>
        <tr role="row"><td role="cell">個人投票</td><td role="cell" data-label="公開範圍"><span class="scope private">公開總分</span></td><td role="cell" data-label="用途">計算分數</td></tr>
      </tbody>
    </table>
  </section>

  <section aria-labelledby="public">
    <div class="h2-row"><h2 id="public">公開內容</h2></div>
    <p>帳號名稱、你填寫的公開個人資料，以及送出的課程評分、心得、文章與回覆都會公開顯示，也可能被搜尋引擎索引。請勿在公開內容中填寫學號、聯絡方式等不想公開的資料。</p>
    <p>你可以自行修改或刪除自己的評分與文章；刪除後不再顯示於站內，但已被搜尋引擎或他人保存的副本不在本站控制範圍。</p>
  </section>

  <section aria-labelledby="reviews">
    <div class="h2-row"><h2 id="reviews">外部評論索引儲存的資料</h2></div>
    <!-- What a reader finds first; what is stored and the technical rules fold below. -->
    <p>課程頁會列出 PTT 四個課程看板 2016 年起、提到該課的公開文章：標題、日期與 120 字內的開頭摘要，點標題回到原文。索引不用於訓練模型，也不提供給第三方。</p>
    <details class="doc-fold">
      <summary>查看索引儲存的 5 類資料</summary>
      <table role="table" class="review-data stacked">
        <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">欄位</th><th role="columnheader" scope="col">說明</th></tr></thead>
        <tbody role="rowgroup">
          <tr role="row"><td role="cell">連結</td><td role="cell">原文網址，點擊後回到原網站。</td></tr>
          <tr role="row"><td role="cell">標題與日期</td><td role="cell">原文標題與發文日期。</td></tr>
          <tr role="row"><td role="cell">作者帳號</td><td role="cell">PTT ID（不含暱稱），不另外比對真實身分。</td></tr>
          <tr role="row"><td role="cell">摘要</td><td role="cell">不超過 120 字，取自公開內文開頭；NTUcourse 作者選擇不同意轉載的文章不存摘要。</td></tr>
          <tr role="row"><td role="cell">比對結果</td><td role="cell">對應的學校、課程與教師，以及看板與推文數。</td></tr>
        </tbody>
      </table>
    </details>
    <details class="doc-fold">
      <summary>查看哪些網站會被索引</summary>
      <p>只收錄站方 robots 檔以 <code>Content-Signal</code> 明確允許搜尋的網站；歐趴糖、Dcard 等其他網站只提供搜尋連結，不抓取任何內容。收錄範圍詳見<a href="/terms#reviews">使用條款</a>。</p>
    </details>
    <p>索引不會自動得知原文已刪除；要移除某一筆，請用下方<a href="#contact">聯絡與移除</a>的管道。</p>
  </section>

  <section aria-labelledby="cookies">
    <div class="h2-row"><h2 id="cookies">Cookie 與記錄</h2></div>
    <ul class="cookie-facts">
      <li><strong>登入：</strong>Cookie 維持 30 天，登出時結束。</li>
      <li><strong>主題偏好：</strong>Cookie 保存一年。</li>
      <li><strong>伺服器記錄：</strong>保留到排除故障與防止濫用所需為止。</li>
    </ul>
    <details class="doc-fold">
      <summary>查看 Cookie 名稱與記錄欄位</summary>
      <p>本站沒有第三方追蹤或廣告程式碼。</p>
      <ul>
        <li>登入 Cookie（<code>uc_session</code>）：維持登入 30 天，登出時結束目前的登入。</li>
        <li>主題 Cookie（<code>uc_theme</code>）：只在你按下深淺色切換時設定，內容只有 light 或 dark，保存一年，讓頁面一開始就用你選的主題。沒有登入也沒有切換主題時，本站不設定任何 Cookie。</li>
        <li>伺服器記錄：請求時間、路徑與來源 IP，不用於廣告，也不與第三方分享。</li>
      </ul>
    </details>
  </section>

  <section aria-labelledby="contact">
    <div class="h2-row"><h2 id="contact">聯絡與移除</h2></div>
    <p>先選管道：<strong>刪除帳號、涉及個資或不想公開的請求走私密聯絡</strong>，一般的資料處理問題可以公開回報。請附上相關頁面連結，維護者通常在七天內回覆。</p>
    <div class="contact-routes">
      <div>
        <p class="route-kind private">私密聯絡</p>
        <h3>刪除帳號或移除個資</h3>
        <p>也可申請移除與你有關的索引。</p>
        <p class="route-needs">請寫明：帳號名稱或相關頁面、希望刪除或移除什麼。不要寫密碼。</p>
        <a class="route" href={PRIVATE_REPORT_URL} rel="noopener external"><span>私密申請刪除或移除<span aria-hidden="true">&nbsp;↗</span></span><span class="route-access"><span class="who-sees">僅維護者可見</span><span>需 GitHub 帳號</span></span></a>
      </div>
      <div>
        <p class="route-kind public">公開回報</p>
        <h3>可公開的資料錯誤</h3>
        <p>回報錯配的外部文章或其他資料錯誤，請勿附上個資。</p>
        <a class="route" href={PUBLIC_REPORT_URL} rel="noopener external"><span>在 GitHub 公開回報錯誤<span aria-hidden="true">&nbsp;↗</span></span><span class="route-access"><span class="who-sees">所有人可見</span><span>需 GitHub 帳號</span></span></a>
      </div>
    </div>
  </section>
</LegalDoc>
