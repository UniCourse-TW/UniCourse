<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import { initial } from '$lib/community-format';
  import { loginHref, profileHref } from '$lib/community-paths';
  import '$lib/ui/tokens.css';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();
  let pathname = $derived(page.url.pathname);
  let here = $derived(pathname + page.url.search);
  let onSearch = $derived(page.status < 400 && pathname === '/' && page.data.content?.kind === 'search' && (page.data.content.result?.total ?? 0) > 0);
  let hasPageSearch = $derived(['/', '/schools', '/forum', '/landscape'].includes(pathname) || pathname.startsWith('/schools/') || page.status === 404);
  let searchTarget = $derived(pathname === '/' ? '#course-keyword' : '/#course-keyword');
  let accountOpen = $state(false);

  afterNavigate(() => { accountOpen = false; });

  const tabs = [
    { href: '/', label: '查課' },
    { href: '/schools', label: '學校' },
    { href: '/forum', label: '論壇' },
    { href: '/landscape', label: '網站總覽' }
  ];

  function currentTab(href: string) {
    if (page.status >= 400) return undefined;
    if (pathname === href) return 'page';
    if (pathname.startsWith(href === '/' ? '/courses/' : `${href}/`)) return 'location';
    return undefined;
  }
</script>

{#snippet searchIcon()}
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="5.75" /><path d="m15 15 4 4" />
  </svg>
{/snippet}

<a class="skip" href="#main-content">跳至主要內容</a>
<header class="site-header" data-shell-theme={data.theme}>
  <nav class="bar" aria-label="主要導覽">
    <a href="/" class="wordmark" aria-label="UniCourse 首頁">
      <img src="/unicourse.png" alt="" width="28" height="28" />
      UniCourse
    </a>

    <div class="tabs">
      {#each tabs as tab (tab.href)}
        <a href={tab.href} aria-current={currentTab(tab.href)}>{tab.label}</a>
      {/each}
    </div>

    <div class="tools">
      {#if !hasPageSearch}<form method="GET" action="/" role="search" aria-label="全站查課" class="nav-search">
        <input type="search" name="q" maxlength="100" placeholder="課名、教師或課號" aria-label="全站搜尋關鍵字" />
        <button aria-label="全站搜尋">{@render searchIcon()}</button>
      </form>{/if}
      <a href={searchTarget} class="mobile-search icon-action" class:page-search={hasPageSearch} aria-label="前往查課" aria-current={onSearch ? 'location' : undefined}>{@render searchIcon()}</a>
      <form method="POST" action="/?/theme" class="theme-form">
        <input type="hidden" name="returnTo" value={here} />
        {#if data.theme !== 'dark'}
          <button name="theme" value="dark" class="icon-action set-dark" aria-label="切換為深色主題" title="切換為深色主題">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14a8.25 8.25 0 0 1-10.45-10.5A8.5 8.5 0 1 0 20.5 14Z" /></svg>
          </button>
        {/if}
        {#if data.theme !== 'light'}
          <button name="theme" value="light" class="icon-action set-light" aria-label="切換為淺色主題" title="切換為淺色主題">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
          </button>
        {/if}
      </form>
      {#if data.user}
        <details class="account" bind:open={accountOpen}>
          <summary aria-label="帳號選單"><span class="initial" aria-hidden="true">{initial(data.user.displayName || data.user.username)}</span><span class="handle">@{data.user.username}</span><span aria-hidden="true">▾</span></summary>
          <div class="account-links">
            <p class="menu-who">@{data.user.username}</p>
            <a href={profileHref(data.user.username)}>個人頁面</a>
            <a href="/settings">設定</a>
            <form method="POST" action="/auth?/logout"><button>登出</button></form>
          </div>
        </details>
      {:else}
        <a href={pathname === '/auth' ? here : loginHref(here)} class="login" aria-label="登入／註冊">登入</a>
      {/if}
    </div>
  </nav>
  {#if navigating.to && !navigating.willUnload}<div class="progress" aria-hidden="true"></div>{/if}
</header>

<main class="page" id="main-content" tabindex="-1">
  {@render children()}
</main>

<footer class="site-footer">
  <div class="footer-inner">
    <div><a href="/" class="footer-mark">UniCourse</a><p>跨校查課，看十年修課人數。</p></div>
    <nav aria-label="頁尾導覽">
      <div class="footer-group">
        <span>資料與透明度</span>
        <a href="/#coverage">資料來源</a>
        <a href="/schools">收錄狀態</a>
      </div>
      <div class="footer-group">
        <span>站務</span>
        <a href="/terms">使用條款</a>
        <a href="/privacy">隱私權政策</a>
      </div>
    </nav>
  </div>
</footer>

<style>
  :global(*) { box-sizing: border-box; }
  :global(html) { scroll-padding-top: 8rem; color-scheme: var(--ui-color-scheme); }
  :global(body) { display: flex; flex-direction: column; min-height: 100vh; margin: 0; background: var(--bg); color: var(--ink); font: var(--t-md) / var(--leading-body) var(--font-sans); }
  :global(a) { color: var(--brand-ink); text-underline-offset: 0.18em; }
  :global(:is(a, button, input, select, summary):focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .skip { position: fixed; z-index: 12; top: var(--space-2); left: var(--space-2); padding: var(--space-2) var(--space-4); background: var(--bg); transform: translateY(-150%); }
  .skip:focus { transform: none; }
  .site-header { position: sticky; inset-block-start: 0; z-index: 10; border-block-end: 1px solid var(--line); background: var(--bg); }
  .bar, .page, .footer-inner { width: min(100% - 2 * clamp(1rem, 3vw, 2.5rem), 73rem); margin-inline: auto; }
  .bar, .tools, .tabs, .wordmark { display: flex; align-items: center; }
  .bar { gap: clamp(0.75rem, 2vw, 2rem); min-block-size: 3.75rem; }
  .wordmark { gap: var(--space-2); min-block-size: var(--target-min); font-size: var(--t-lg); font-weight: 750; letter-spacing: -0.025em; color: var(--ink); text-decoration: none; }
  .wordmark img { flex: none; }
  .tabs { align-self: stretch; gap: var(--space-2); }
  .tabs a { display: flex; align-items: center; min-block-size: var(--target-min); padding: 0 var(--space-2); border-block-end: 2px solid transparent; color: var(--ink-2); font-weight: 650; white-space: nowrap; text-decoration: none; }
  .tabs a[aria-current] { border-block-end-color: var(--brand); color: var(--brand-ink); }
  .tools { min-width: 0; gap: var(--space-1); margin-inline-start: auto; }
  .nav-search { display: flex; min-width: 0; align-items: center; padding-inline-start: var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel); }
  .nav-search:focus-within { border-color: var(--brand-ring); }
  .nav-search input { min-width: 0; width: clamp(7.25rem, 14vw, 11rem); min-height: 2.625rem; border: 0; background: transparent; color: var(--ink); font: inherit; font-size: var(--t-base); }
  .nav-search input::placeholder { color: var(--muted); }
  .nav-search button, .icon-action, .account summary { display: inline-grid; place-items: center; min-width: var(--target-min); min-height: var(--target-min); padding: 0; border: 0; border-radius: var(--radius-control); background: transparent; color: var(--ink-2); cursor: pointer; }
  .nav-search button { min-height: 2.625rem; }
  .mobile-search, .set-light { display: none; }
  .page-search { display: inline-grid; }
  .mobile-search[aria-current] { background: var(--brand-wash); color: var(--brand-ink); }
  [data-shell-theme='dark'] .set-light { display: inline-grid; }
  @media (prefers-color-scheme: dark) {
    .site-header:not([data-shell-theme]) .set-dark { display: none; }
    .site-header:not([data-shell-theme]) .set-light { display: inline-grid; }
  }
  .login { display: inline-flex; align-items: center; justify-content: center; min-height: var(--target-min); min-width: var(--target-min); padding-inline: var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--brand-ink); font-size: var(--t-base); font-weight: 650; white-space: nowrap; text-decoration: none; }
  .login:hover { border-color: var(--brand-ring); }
  .account { position: relative; }
  .account summary { display: flex; gap: var(--space-1); padding-inline: var(--space-2); list-style: none; font-weight: 650; }
  .account summary::-webkit-details-marker { display: none; }
  .account summary .handle { max-width: clamp(5rem, 12vw, 9rem); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Phones show an initial instead of a clipped @handle; the menu still names the account. */
  .account summary .initial { display: none; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; background: var(--brand-wash); color: var(--brand-ink); font-size: var(--t-base); }
  .account-links { position: absolute; inset-inline-end: 0; margin-top: var(--space-1); min-width: 9rem; padding: var(--space-1); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel-raised); box-shadow: 0 5px 16px rgb(0 0 0 / 0.12); }
  .menu-who { margin: 0; padding: var(--space-1) var(--space-3) var(--space-2); border-bottom: 1px solid var(--line); color: var(--muted); font-size: var(--t-sm); overflow-wrap: anywhere; }
  .account-links :is(a, button) { display: flex; align-items: center; width: 100%; min-height: var(--target-min); padding: 0 var(--space-3); border: 0; border-radius: var(--radius-control); background: transparent; color: var(--ink); font: inherit; text-decoration: none; cursor: pointer; }
  .tools :is(a, button, summary):hover { background: var(--hover-row); }
  .progress { position: absolute; z-index: 1; inset-block-end: -1px; inset-inline-start: 0; height: 2px; width: 35%; background: var(--brand); pointer-events: none; animation: progress 1s ease-in-out infinite alternate; }
  @keyframes progress { from { transform: translateX(0); } to { transform: translateX(185%); } }
  @media (prefers-reduced-motion: reduce) { .progress { width: 100%; animation: none; } }
  .page { flex: 1; padding-block: clamp(1.5rem, 4vw, 3rem) var(--space-12); }
  .site-footer { border-block-start: 1px solid var(--line); color: var(--muted); background: var(--panel); font-size: var(--t-base); }
  .footer-inner { display: flex; justify-content: space-between; flex-wrap: wrap; align-items: start; gap: var(--space-4) var(--space-6); padding-block: var(--space-5); }
  .footer-inner p { margin: 0; }
  .footer-mark { font-weight: 750; color: var(--ink); text-decoration: none; }
  .footer-inner nav { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); }
  .footer-group { display: grid; grid-template-columns: repeat(2, max-content); column-gap: var(--space-3); }
  .footer-group > span { grid-column: 1 / -1; color: var(--ink); font-weight: 650; }
  .footer-inner nav a { display: grid; align-items: center; min-height: var(--target-min); color: var(--ink-2); }
  @media (max-width: 55rem) { .nav-search { display: none; } .mobile-search { display: inline-grid; } }
  @media (max-width: 39rem) {
    .account summary .handle { display: none; }
    .account summary .initial { display: grid; }
    .bar { flex-wrap: wrap; gap: 0; padding-block-start: var(--space-1); }
    .tabs { order: 1; flex: 1 0 100%; }
    .tabs a { padding-inline: var(--space-2); }
  }
</style>
