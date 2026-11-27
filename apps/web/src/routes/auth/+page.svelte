<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import { PRIVATE_REPORT_URL } from '$lib/legal-contact';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let mode = $derived(form?.mode ?? data.mode);
  let hydrated = $state(false);
  let showPassword = $state(false);
  // Register: rules are checked when a field loses focus, so mistakes show before the round trip.
  let checked = $state<{ username?: string | null; password?: string | null }>({});
  const usernamePattern = /^[A-Za-z0-9_]{3,32}$/;
  function checkUsername(value: string) {
    checked.username = !value ? undefined : usernamePattern.test(value) ? null : '帳號名稱需為 3–32 個英文字母、數字或底線。';
  }
  function checkPassword(value: string) {
    checked.password = !value ? undefined : value.length >= 8 ? null : `密碼需至少 8 個字元（目前 ${value.length} 個）。`;
  }
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

  /**
   * Which field an error belongs to. Field errors show under that field and mark it invalid;
   * anything else (busy API, too many attempts) shows as a form-level alert.
   */
  type ErrorField = 'username' | 'password' | 'displayName' | 'form';
  function errorField(message: string | undefined): ErrorField | null {
    if (!message) return null;
    if (message.startsWith('帳號名稱')) return 'username';
    if (message.startsWith('密碼需')) return 'password';
    if (message.startsWith('顯示名稱')) return 'displayName';
    return 'form';
  }
  let errorAt = $derived(errorField(form?.message));
  let credentialError = $derived(mode === 'login' && form?.message === '帳號或密碼錯誤。');
  let tooMany = $derived(form?.message?.startsWith('登入失敗次數過多') ?? false);
  const describedBy = (...ids: (string | false | null | undefined)[]) => ids.filter(Boolean).join(' ') || undefined;

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
      onclick={() => (showPassword = !showPassword)}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
        {#if showPassword}<path d="M4 4l16 16" />{/if}
      </svg>
      <span>顯示</span><span class="sr-only">密碼</span>
    </button>
  {/if}
{/snippet}

{#snippet fieldError(id: string, field: ErrorField)}
  {#if errorAt === field && form?.message}<p id={id} class="field-error" role="alert">{form.message}</p>{/if}
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
      <form method="POST" action="?/login" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined}>
        <input type="hidden" name="next" value={data.next} />
        {#if errorAt === 'form' || credentialError}
          <p id="auth-error" class="cm-alert" role="alert">
            {form?.message}
            {#if tooMany}<br /><span class="alert-note">密碼正確也會被暫時擋下，請稍等再試。</span>{/if}
          </p>
        {/if}
        <div class="cm-field">
          <div class="cm-label"><label for="username">帳號</label></div>
          <input id="username" class="cm-input" name="username" autocomplete="username" required maxlength="32"
            defaultValue={form?.username ?? ''} autocapitalize="none" spellcheck="false" placeholder="例如 tsai_cs"
            aria-invalid={credentialError || undefined} aria-describedby={describedBy(credentialError && 'auth-error')} />
        </div>
        <div class="cm-field">
          <div class="cm-label"><label for="password">密碼</label></div>
          <div class="password">
            <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="current-password"
              required maxlength="128" placeholder="輸入密碼" aria-invalid={credentialError || undefined} aria-describedby={describedBy(credentialError && 'auth-error')} />
            {@render passwordToggle()}
          </div>
        </div>
        <button class="cm-btn block" aria-busy={submitting} disabled={submitting}>{submitting ? '登入中…' : '登入'}</button>
        {#if returnTo}<p class="return">登入後會回到：<a href={data.next}>{returnTo}</a></p>{/if}
        <div class="recover">
          <a href={PRIVATE_REPORT_URL} rel="noopener external">忘記密碼？私密聯絡維護者<span aria-hidden="true"> ↗</span><span class="sr-only">（前往 GitHub）</span></a>
          <p>目前沒有自助重設。回報時只寫帳號名稱，不要附上密碼。</p>
        </div>
      </form>
    {:else}
      <form method="POST" action="?/register" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined}>
        <input type="hidden" name="next" value={data.next} />
        {#if errorAt === 'form'}<p id="auth-error" class="cm-alert" role="alert">{form?.message}</p>{/if}
        <div class="cm-field">
          <div class="cm-label"><label for="username">帳號</label><span class="cm-hint" id="username-rule">3–32 字元：英文字母、數字、底線{#if checked.username === null}<span class="ok" aria-hidden="true"> ✓</span>{/if}</span></div>
          <input id="username" class="cm-input" name="username" autocomplete="username" required minlength="3" maxlength="32"
            pattern="[A-Za-z0-9_]+" defaultValue={form?.username ?? ''} autocapitalize="none" spellcheck="false" placeholder="例如 tsai_cs"
            onblur={(event) => checkUsername(event.currentTarget.value)}
            oninput={(event) => { if (checked.username) checkUsername(event.currentTarget.value); }}
            aria-invalid={errorAt === 'username' || Boolean(checked.username) || undefined}
            aria-describedby={describedBy('username-rule', 'username-hint', (errorAt === 'username' || checked.username) && 'username-error')} />
          {#if errorAt === 'username' && form?.message}{@render fieldError('username-error', 'username')}
          {:else if checked.username}<p id="username-error" class="field-error" role="alert">{checked.username}</p>{/if}
          <p id="username-hint" class="rule">公開顯示在你的評價與文章旁，<strong>建立後無法更改</strong>。</p>
        </div>
        <div class="cm-field">
          <div class="cm-label"><label for="password">密碼</label><span class="cm-hint" id="password-rule">至少 8 字元，可用空格{#if checked.password === null}<span class="ok" aria-hidden="true"> ✓</span>{/if}</span></div>
          <div class="password">
            <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password"
              required minlength="8" maxlength="128" placeholder="至少 8 個字元"
              onblur={(event) => checkPassword(event.currentTarget.value)}
              oninput={(event) => { if (checked.password) checkPassword(event.currentTarget.value); }}
              aria-invalid={errorAt === 'password' || Boolean(checked.password) || undefined}
              aria-describedby={describedBy('password-rule', (errorAt === 'password' || checked.password) && 'password-error')} />
            {@render passwordToggle()}
          </div>
          {#if errorAt === 'password' && form?.message}{@render fieldError('password-error', 'password')}
          {:else if checked.password}<p id="password-error" class="field-error" role="alert">{checked.password}</p>{/if}
        </div>
        <details class="optional" open={Boolean(form && 'displayName' in form && form.displayName) || errorAt === 'displayName'}>
          <summary>加上顯示名稱<span class="cm-hint">選填，之後可在設定改</span></summary>
          <div class="cm-field">
            <div class="cm-label"><label for="displayName">顯示名稱</label><span class="cm-hint">最多 50 字</span></div>
            <input id="displayName" class="cm-input" name="displayName" maxlength="50" autocomplete="nickname" placeholder="例如 小蔡"
              defaultValue={form && 'displayName' in form ? form.displayName : ''} aria-invalid={errorAt === 'displayName' || undefined}
              aria-describedby={describedBy('display-hint', errorAt === 'displayName' && 'display-error')} />
            {@render fieldError('display-error', 'displayName')}
            <p id="display-hint" class="rule">留空時以帳號名稱顯示。</p>
          </div>
        </details>
        <p class="terms">按下「註冊」即表示你同意 <a href="/terms">使用條款</a> 及 <a href="/privacy">隱私權政策</a>。</p>
        <button class="cm-btn block" aria-busy={submitting} disabled={submitting}>{submitting ? '建立中…' : '註冊'}</button>
        {#if returnTo}<p class="return">註冊後會回到：<a href={data.next}>{returnTo}</a></p>{/if}
      </form>
    {/if}

    <p class="after"><a href="/">不登入，繼續查課 →</a></p>
  </div>
</div>

<style>
  .auth { display: grid; place-items: start center; padding-block: clamp(0rem, 4vh, 2.5rem); }
  .card {
    inline-size: min(100%, 27rem);
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
    min-block-size: var(--target-min);
    border-radius: var(--radius-control);
    color: var(--muted);
    font-size: var(--t-base);
    font-weight: 600;
    text-decoration: none;
  }
  .tabs a:hover { color: var(--ink); }
  /* The current tab is filled with the brand wash and underlined in brand, so it reads in both themes. */
  .tabs a[aria-current='page'] { color: var(--brand-ink); background: var(--brand-wash); box-shadow: inset 0 -3px 0 var(--brand), inset 0 0 0 1px color-mix(in srgb, var(--brand) 35%, transparent); }
  .tabs a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }

  /* The toggle lives inside the field: a 44 px target that does not stretch the label row. */
  .password { position: relative; display: flex; }
  .password .cm-input { padding-inline-end: 6rem; }
  .toggle {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    min-inline-size: 4.75rem;
    justify-content: center;
    padding: 0 var(--space-3);
    border: 0;
    border-inline-start: 1px solid var(--line);
    border-start-end-radius: var(--radius-control);
    border-end-end-radius: var(--radius-control);
    color: var(--brand-ink);
    background: transparent;
    font: 600 var(--t-base) / 1 var(--font-sans);
    cursor: pointer;
    touch-action: manipulation;
  }
  .toggle:hover { background: var(--brand-wash); }
  .toggle[aria-pressed='true'] { color: var(--ink-2); background: var(--chip); }
  .toggle:focus-visible { outline-offset: calc(-1 * var(--focus-offset)); }

  .rule { color: var(--muted); font-size: var(--t-sm); line-height: 1.5; }
  .rule strong { color: var(--ink-2); font-weight: 600; }
  .field-error {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-control);
    border-inline-start: 3px solid var(--down);
    color: var(--ink);
    background: color-mix(in srgb, var(--down) var(--status-tint), var(--panel-raised));
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .alert-note { font-weight: 400; font-size: var(--t-sm); }
  .cm-form { margin-block-start: var(--space-1); }
  .cm-form .cm-btn { margin-block-start: var(--space-1); }
  .terms { margin-block-start: var(--space-1) !important; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  .terms a { display: inline-block; padding-block: 0.25rem; font-weight: 600; }
  .terms + .cm-btn { margin-block-start: var(--space-3); }
  .return { color: var(--ink-2); font-size: var(--t-sm); text-align: center; }
  .return a { font-weight: 650; }
  .recover { display: grid; gap: 0.125rem; margin-block-start: var(--space-1); }
  .recover a { display: inline-flex; align-items: center; min-block-size: var(--target-min); justify-self: start; font-size: var(--t-base); font-weight: 650; }
  .recover p { color: var(--muted); font-size: var(--t-sm); line-height: 1.5; }
  .ok { color: var(--up); font-weight: 700; }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .optional { border-block: 1px solid var(--line); }
  .optional summary { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; min-block-size: var(--target-min); color: var(--ink-2); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .optional summary::-webkit-details-marker { display: none; }
  .optional summary::before { content: '＋'; color: var(--brand-ink); }
  .optional[open] summary::before { content: '－'; }
  .optional summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .optional .cm-field { padding-block-end: var(--space-3); }
  .after {
    margin-block-start: var(--space-4) !important;
    padding-block-start: var(--space-3);
    border-block-start: 1px solid var(--line);
    color: var(--muted);
    font-size: 0.8125rem;
  }
  .after a { display: inline-flex; align-items: center; min-block-size: var(--target-min); font-weight: 600; }

  @media (max-width: 40rem) {
    .auth { padding-block: 0; }
    /* On phones the card is the page: no frame drawn inside the page gutter. */
    .card { padding: 0; border: 0; background: transparent; }
  }
</style>
