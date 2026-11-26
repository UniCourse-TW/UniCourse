<script lang="ts">
  import { page } from '$app/state';
  import { loginHref, profileHref } from '$lib/community-paths';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();
  let here = $derived(page.url.pathname + page.url.search);
</script>

<header class="site-header">
  <div class="bar">
    <a href="/" class="wordmark">
      <img src="/unicourse.png" alt="" width="40" height="40" />
      UniCourse
    </a>
    <!-- Plain links (no list items) so page-level list and text queries stay unambiguous. -->
    <nav class="site-nav" aria-label="主要導覽">
      <a href="/" aria-current={page.url.pathname === '/' ? 'page' : undefined}>首頁</a>
      <a href="/schools" aria-current={page.url.pathname === '/schools' ? 'page' : undefined}>學校</a>
      <a href="/forum"aria-current={page.url.pathname.startsWith('/forum') ? 'page' : undefined}>論壇</a>
      {#if data.user}
        <a href={profileHref(data.user.username)} class="me">@{data.user.username}</a>
        <a href="/settings" aria-current={page.url.pathname === '/settings' ? 'page' : undefined}>設定</a>
        <form method="POST" action="/auth?/logout" class="logout">
          <button>登出</button>
        </form>
      {:else}
        <a href={loginHref(here)} class="login">登入／註冊</a>
      {/if}
    </nav>
  </div>
</header>

<main class="page">
  {@render children()}
</main>

<footer class="site-footer">
  <a href="/terms">使用條款</a>
  <a href="/privacy">隱私權政策</a>
</footer>

<style>
  :global(*) { box-sizing: border-box; }
  :global(body) {
    margin: 0;
    background: #f9f8fd;
    color: #211b32;
    font-family: system-ui, sans-serif;
    line-height: 1.55;
  }
  :global(a) { color: #5630a5; }
  .site-header { border-bottom: 1px solid #e5dfef; background: white; }
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    align-items: center;
    justify-content: space-between;
    max-width: 66rem;
    margin: auto;
    padding: 0.6rem 1.25rem;
  }
  .wordmark {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    padding: 0.2rem 0;
    text-decoration: none;
    color: #211b32;
    font-weight: 750;
    font-size: 1.125rem;
  }
  .site-nav { display: flex; flex-wrap: wrap; gap: 0.15rem 0.35rem; align-items: center; }
  .site-nav a, .logout button {
    display: inline-flex;
    align-items: center;
    min-height: 2.5rem;
    padding: 0.3rem 0.55rem;
    border-radius: 0.45rem;
    color: #3b3150;
    text-decoration: none;
    font: inherit;
    font-weight: 600;
  }
  .site-nav a[aria-current='page'] { color: #5630a5; background: #f1ecfb; }
  .site-nav .me { max-width: 11rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; line-height: 1.9rem; }
  .site-nav .login { border: 1px solid #5630a5; color: #5630a5; }
  .logout { margin: 0; }
  .logout button { border: 1px solid #d8d0e6; background: white; cursor: pointer; }
  .page { max-width: 66rem; margin: auto; padding: clamp(1rem, 4vw, 3rem) 1.25rem; }
  .site-footer {
    display: flex;
    gap: 1.25rem;
    justify-content: center;
    padding: 1.5rem 1.25rem 2rem;
    color: #594f69;
    font-size: 0.9rem;
  }
</style>
