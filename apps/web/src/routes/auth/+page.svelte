<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let mode = $derived(form?.mode ?? data.mode);
  let hydrated = $state(false);
  let showPassword = $state(false);
  let submitting = $state(false);
  onMount(() => (hydrated = true));

  let tabHref = (target: 'login' | 'register') => {
    const params = new URLSearchParams();
    if (target === 'register') params.set('mode', 'register');
    if (data.next !== '/') params.set('next', data.next);
    const query = params.toString();
    return query ? `/auth?${query}` : '/auth';
  };

  /** A short name for where `next` leads, or null for the home page. */
  function destination(next: string) {
    const url = new URL(next, 'http://unicourse.invalid');
    const path = url.pathname;
    if (path.startsWith('/courses/')) return '課程頁';
    if (/^\/forum\/\d+/.test(path)) return '討論串';
    if (path === '/forum') return url.searchParams.get('compose') === '1' ? '論壇發文' : '論壇';
    if (path === '/settings') return '設定';
    if (path.startsWith('/u/')) return '個人頁';
    if (path.startsWith('/instructors/')) return '教師頁';
    if (path.startsWith('/schools')) return '學校頁';
    if (path === '/' && url.searchParams.get('q')) return `「${url.searchParams.get('q')}」的搜尋結果`;
    return null;
  }
  let returnTo = $derived(destination(data.next));

  // Credential errors point at the fields; a busy API or bad network does not.
  let fieldError = $derived(Boolean(form?.message) && form?.message !== '暫時無法完成，請稍後再試。');

  const submit: SubmitFunction = () => {
    submitting = true;
    return async ({ update }) => {
      await update({ reset: false });
      submitting = false;
    };
  };
</script>

<svelte:head>
  <title>{mode === 'register' ? '建立帳號' : '登入'}｜UniCourse</title>
</svelte:head>

{#snippet passwordToggle()}
  {#if hydrated}
    <button type="button" class="toggle" aria-pressed={showPassword} aria-controls="password"
      onclick={() => (showPassword = !showPassword)}>{showPassword ? '隱藏' : '顯示'}</button>
  {/if}
{/snippet}

<div class="cm auth">
  <div class="card">
    <img class="logo" src="/unicourse.png" alt="" width="40" height="40" />
    <h1 id="auth-title">{mode === 'register' ? '建立帳號' : '登入 UniCourse'}</h1>
    <p class="why">查課不用登入；評分、發文與回覆才需要帳號。</p>

    <nav class="tabs" aria-label="登入或註冊">
      <a href={tabHref('login')} aria-current={mode === 'login' ? 'page' : undefined}>登入</a>
      <a href={tabHref('register')} aria-current={mode === 'register' ? 'page' : undefined}>註冊</a>
    </nav>

    {#if mode === 'login'}
      <form method="POST" action="?/login" class="cm-form" use:enhance={submit}>
        <input type="hidden" name="next" value={data.next} />
        <div class="cm-field">
          <div class="cm-label"><label for="username">帳號</label></div>
          <input id="username" class="cm-input" name="username" autocomplete="username" required maxlength="32"
            defaultValue={form?.username ?? ''} autocapitalize="none" spellcheck="false" placeholder="例如 tsai_cs"
            aria-invalid={fieldError || undefined} aria-describedby={form?.message ? 'auth-error' : undefined} />
        </div>
        <div class="cm-field">
          <div class="cm-label"><label for="password">密碼</label>{@render passwordToggle()}</div>
          <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="current-password"
            required maxlength="128" aria-invalid={fieldError || undefined} aria-describedby={form?.message ? 'auth-error' : undefined} />
        </div>
        {#if form?.message}<p id="auth-error" class="cm-alert" role="alert">{form.message}</p>{/if}
        <button class="cm-btn block" aria-busy={submitting} disabled={submitting}>{submitting ? '登入中…' : '登入'}</button>
      </form>
    {:else}
      <form method="POST" action="?/register" class="cm-form" use:enhance={submit}>
        <input type="hidden" name="next" value={data.next} />
        <div class="cm-field">
          <div class="cm-label"><label for="username">帳號</label><span class="cm-hint" id="username-hint">3–32 字，英數與底線，之後無法更改</span></div>
          <input id="username" class="cm-input" name="username" autocomplete="username" required minlength="3" maxlength="32"
            pattern="[A-Za-z0-9_]+" defaultValue={form?.username ?? ''} autocapitalize="none" spellcheck="false" placeholder="例如 tsai_cs"
            aria-invalid={fieldError || undefined} aria-describedby="username-hint{form?.message ? ' auth-error' : ''}" />
        </div>
        <div class="cm-field">
          <div class="cm-label">
            <label for="password">密碼</label>
            <span class="hint-row"><span class="cm-hint" id="password-hint">至少 8 個字元</span>{@render passwordToggle()}</span>
          </div>
          <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password"
            required minlength="8" maxlength="128" aria-describedby="password-hint" />
        </div>
        <div class="cm-field">
          <div class="cm-label"><label for="displayName">顯示名稱（選填）</label><span class="cm-hint" id="display-hint">最多 50 字，之後可改</span></div>
          <input id="displayName" class="cm-input" name="displayName" maxlength="50" autocomplete="nickname" placeholder="例如 小蔡"
            defaultValue={form && 'displayName' in form ? form.displayName : ''} aria-describedby="display-hint" />
        </div>
        {#if form?.message}<p id="auth-error" class="cm-alert" role="alert">{form.message}</p>{/if}
        <button class="cm-btn block" aria-busy={submitting} disabled={submitting}>{submitting ? '建立中…' : '註冊'}</button>
        <p class="terms">註冊即表示同意<a href="/terms">使用條款</a>與<a href="/privacy">隱私權政策</a>。</p>
      </form>
    {/if}

    <p class="after">
      {#if returnTo}
        {mode === 'register' ? '註冊' : '登入'}後會回到：<a href={data.next}>{returnTo}</a>
      {:else}
        不登入也能查課：<a href="/">回首頁搜尋課程 →</a>
      {/if}
    </p>
  </div>
</div>

<style>
  .auth { display: grid; place-items: start center; padding-block: clamp(0rem, 4vh, 2.5rem); }
  .card {
    inline-size: min(100%, 26rem);
    padding: var(--space-6) var(--space-6) var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel);
  }
  .logo { display: block; margin-block-end: var(--space-3); border-radius: 8px; }
  h1 { font-size: var(--t-xl) !important; }
  .why { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: 0.8125rem; }
  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    margin-block: var(--space-4);
    padding: 3px;
    border: 1px solid var(--line);
    border-radius: calc(var(--radius-control) + 3px);
    background: var(--chip);
  }
  .tabs a {
    display: flex;
    align-items: center;
    justify-content: center;
    min-block-size: 2.5rem;
    border-radius: var(--radius-control);
    color: var(--muted);
    font-size: var(--t-base);
    font-weight: 600;
    text-decoration: none;
  }
  .tabs a:hover { color: var(--ink); }
  .tabs a[aria-current='page'] { color: var(--brand-ink); background: var(--panel-raised); box-shadow: 0 1px 2px rgb(0 0 0 / 0.12), inset 0 0 0 1px var(--axis); }
  .hint-row { display: inline-flex; gap: var(--space-2); align-items: center; }
  .toggle {
    min-block-size: 1.75rem;
    padding: 0 var(--space-2);
    margin-block: -0.25rem;
    border: 0;
    border-radius: var(--radius-control);
    color: var(--brand-ink);
    background: transparent;
    font: 600 var(--t-sm) / 1 var(--font-sans);
    cursor: pointer;
    position: relative;
  }
  /* 44 px touch target without growing the label row. */
  .toggle::after { content: ''; position: absolute; inset: -0.5rem -0.25rem; }
  .toggle:hover { background: var(--brand-wash); }
  .cm-form { margin-block-start: var(--space-1); }
  .cm-form .cm-btn { margin-block-start: var(--space-1); }
  .terms { color: var(--muted); font-size: var(--t-sm); text-align: center; }
  .after {
    margin-block-start: var(--space-4) !important;
    padding-block-start: var(--space-3);
    border-block-start: 1px solid var(--line);
    color: var(--muted);
    font-size: 0.8125rem;
  }
  .after a { font-weight: 600; }

  @media (max-width: 40rem) {
    .auth { padding-block: 0; }
    /* On phones the card is the page: no frame drawn inside the page gutter. */
    .card { padding: 0; border: 0; background: transparent; }
    .logo { display: none; }
  }
</style>
