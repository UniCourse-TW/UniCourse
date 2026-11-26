<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import { ISSUES_URL } from '$lib/institutions';
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
      onclick={() => (showPassword = !showPassword)}>{showPassword ? '隱藏密碼' : '顯示密碼'}</button>
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
              required maxlength="128" aria-invalid={credentialError || undefined} aria-describedby={describedBy(credentialError && 'auth-error')} />
            {@render passwordToggle()}
          </div>
        </div>
        <button class="cm-btn block" aria-busy={submitting} disabled={submitting}>{submitting ? '登入中…' : '登入'}</button>
        <p class="recover">忘記密碼？目前無法自行重設，請到 <a href={ISSUES_URL} rel="noopener external">GitHub issues</a> 留下帳號名稱（不要附密碼），由維護者協助。</p>
      </form>
    {:else}
      <form method="POST" action="?/register" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined}>
        <input type="hidden" name="next" value={data.next} />
        {#if errorAt === 'form'}<p id="auth-error" class="cm-alert" role="alert">{form?.message}</p>{/if}
        <div class="cm-field">
          <div class="cm-label"><label for="username">帳號</label></div>
          <input id="username" class="cm-input" name="username" autocomplete="username" required minlength="3" maxlength="32"
            pattern="[A-Za-z0-9_]+" defaultValue={form?.username ?? ''} autocapitalize="none" spellcheck="false" placeholder="例如 tsai_cs"
            aria-invalid={errorAt === 'username' || undefined} aria-describedby={describedBy('username-hint', errorAt === 'username' && 'username-error')} />
          {@render fieldError('username-error', 'username')}
          <p id="username-hint" class="rule">3–32 個英文字母、數字或底線。<strong>建立後無法更改</strong>，會顯示在你的評價與文章旁。</p>
        </div>
        <div class="cm-field">
          <div class="cm-label"><label for="password">密碼</label></div>
          <div class="password">
            <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password"
              required minlength="8" maxlength="128" aria-invalid={errorAt === 'password' || undefined}
              aria-describedby={describedBy('password-hint', errorAt === 'password' && 'password-error')} />
            {@render passwordToggle()}
          </div>
          {@render fieldError('password-error', 'password')}
          <p id="password-hint" class="rule">至少 8 個字元；可以用空格，例如三四個常用字組成的句子。</p>
        </div>
        <div class="cm-field">
          <div class="cm-label"><label for="displayName">顯示名稱</label><span class="cm-hint">選填，之後可改</span></div>
          <input id="displayName" class="cm-input" name="displayName" maxlength="50" autocomplete="nickname" placeholder="例如 小蔡"
            defaultValue={form && 'displayName' in form ? form.displayName : ''} aria-invalid={errorAt === 'displayName' || undefined}
            aria-describedby={describedBy('display-hint', errorAt === 'displayName' && 'display-error')} />
          {@render fieldError('display-error', 'displayName')}
          <p id="display-hint" class="rule">最多 50 字。留空時以帳號名稱顯示；填了會出現在個人頁與你的評價、文章旁。</p>
        </div>
        <p class="terms">按下「註冊」即表示你同意<a href="/terms">使用條款</a>與<a href="/privacy">隱私權政策</a>。</p>
        <button class="cm-btn block" aria-busy={submitting} disabled={submitting}>{submitting ? '建立中…' : '註冊'}</button>
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
    min-block-size: 2.5rem;
    border-radius: var(--radius-control);
    color: var(--muted);
    font-size: var(--t-base);
    font-weight: 600;
    text-decoration: none;
  }
  .tabs a:hover { color: var(--ink); }
  .tabs a[aria-current='page'] { color: var(--brand-ink); background: var(--panel-raised); box-shadow: 0 1px 2px rgb(0 0 0 / 0.12), inset 0 0 0 1px var(--axis); }

  /* The toggle lives inside the field: a 44 px target that does not stretch the label row. */
  .password { position: relative; display: flex; }
  .password .cm-input { padding-inline-end: 6rem; }
  .toggle {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    min-inline-size: var(--target-min);
    padding: 0 var(--space-3);
    border: 0;
    border-start-end-radius: var(--radius-control);
    border-end-end-radius: var(--radius-control);
    color: var(--brand-ink);
    background: transparent;
    font: 600 var(--t-sm) / 1 var(--font-sans);
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
  .terms, .recover { color: var(--muted); font-size: var(--t-sm); line-height: 1.5; }
  .recover { margin-block-start: var(--space-1) !important; }
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
