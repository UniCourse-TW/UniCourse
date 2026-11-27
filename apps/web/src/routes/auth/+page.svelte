<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import { profileHref } from '$lib/community-paths';
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
    checked.username = !value ? undefined : usernamePattern.test(value) ? null : '帳號名稱需為 3–32 個英文字母、數字或底線（_）。';
  }
  function checkPassword(value: string) {
    checked.password = !value ? undefined : value.length >= 8 ? null : `密碼需至少 8 個字元（目前 ${value.length} 個）。`;
  }
  // What is in the boxes right now (JavaScript only): drives the live length hint, the lockout and
  // the 「請先換個帳號」 state without another round trip.
  let typedUsername = $state('');
  let passwordLength = $state(0);
  let submitting = $state(false);
  let recover = $state<HTMLDetailsElement>();
  onMount(() => {
    hydrated = true;
    typedUsername = (document.getElementById('username') as HTMLInputElement | null)?.value ?? '';
  });

  let tabHref = (target: 'login' | 'register', username = '') => {
    const params = new URLSearchParams();
    if (target === 'register') params.set('mode', 'register');
    if (data.next !== '/') params.set('next', data.next);
    if (username) params.set('username', username);
    const query = params.toString();
    return query ? `/auth?${query}` : '/auth';
  };

  /** A short name for where `next` leads; the home page when nothing sent the visitor here. */
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
    return '首頁';
  }
  let returnTo = $derived(destination(data.next));
  let hasDestination = $derived(data.next !== '/');

  /**
   * Which field an error belongs to. Field errors show under that field and mark it invalid;
   * anything else (busy API, too many attempts) shows as a form-level alert.
   */
  type ErrorField = 'username' | 'password' | 'displayName' | 'form';
  function errorField(message: string | undefined): ErrorField | null {
    if (!message) return null;
    if (message.startsWith('帳號名稱') || message.includes('帳號名稱已有人')) return 'username';
    if (message.startsWith('密碼需')) return 'password';
    if (message.startsWith('顯示名稱')) return 'displayName';
    return 'form';
  }
  let errorAt = $derived(errorField(form?.message));
  let credentialError = $derived(mode === 'login' && form?.message === '帳號或密碼錯誤。');
  let tooMany = $derived(Boolean(form && 'lockedAt' in form && form.lockedAt));
  let unavailable = $derived(form?.message?.startsWith('暫時無法') ?? false);
  /** Alert titles are headings, so they drop the sentence-final 。 the API message carries. */
  const asTitle = (message: string) => message.replace(/。$/, '');
  const describedBy = (...ids: (string | false | null | undefined)[]) => ids.filter(Boolean).join(' ') || undefined;

  // ---- Wrong-password count. The API allows 10 failures a minute per username and says nothing about
  // how many are used up, so this browser counts its own (JavaScript only; the plain page states the rule).
  const ATTEMPTS_PER_MINUTE = 10;
  let failedAt = $state<number[]>([]);
  let attemptsLeft = $derived(Math.max(1, ATTEMPTS_PER_MINUTE - failedAt.filter((at) => at > Date.now() - 60_000).length));

  // ---- Lockout countdown. The API gives no Retry-After, so the clock starts when the refusal
  // reached this browser (not the server's clock) and the button comes back on its own.
  let lockedClientAt = $state<number | null>(null);
  let now = $state(Date.now());
  $effect(() => {
    lockedClientAt = tooMany ? Date.now() : null;
  });
  $effect(() => {
    if (lockedClientAt === null) return;
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  let retryAfter = $derived(form && 'retryAfter' in form && typeof form.retryAfter === 'number' ? form.retryAfter : 60);
  let remaining = $derived(lockedClientAt === null ? 0 : Math.min(retryAfter, Math.max(0, Math.ceil((lockedClientAt + retryAfter * 1000 - now) / 1000))));
  let lockedName = $derived(tooMany ? (form?.username ?? '') : '');
  // Only the refused name is held back; typing another account's name frees the button at once.
  let locked = $derived(hydrated && tooMany && remaining > 0 && typedUsername.trim().toLowerCase() === lockedName.toLowerCase());
  // Screen readers hear the wait three times (30 s, 10 s, ready), not once a second.
  let spoken = $derived(!hydrated || !tooMany ? '' : remaining === 0 ? '現在可以再按「登入」了。' : remaining <= 10 ? '再 10 秒可以再試。' : remaining <= 30 ? '再 30 秒可以再試。' : '');

  // Register: a taken name blocks the button until the name is changed.
  let takenName = $derived(mode === 'register' && errorAt === 'username' && form?.message?.includes('已有人') ? (form?.username ?? '') : '');
  let stillTaken = $derived(hydrated && Boolean(takenName) && typedUsername.trim() === takenName);
  let suggestions = $derived(takenName ? [`${takenName}2`, `${takenName}_tw`, `${takenName}_${new Date().getFullYear() - 1911}`].filter((name) => name.length <= 32) : []);
  function useSuggestion(name: string) {
    const input = document.getElementById('username') as HTMLInputElement | null;
    if (!input) return;
    input.value = name;
    typedUsername = name;
    checkUsername(name);
    input.focus();
  }

  function openRecover(event: MouseEvent) {
    if (!recover) return;
    event.preventDefault();
    recover.open = true;
    recover.querySelector('a')?.focus();
  }

  const submit: SubmitFunction = ({ formElement }) => {
    submitting = true;
    const wasLogin = formElement.action.endsWith('?/login');
    return async ({ result, update }) => {
      await update({ reset: false });
      submitting = false;
      if (result.type !== 'failure') return;
      if (wasLogin) {
        if (result.data?.message === '帳號或密碼錯誤。') failedAt = [...failedAt, Date.now()];
        // The old password is wrong (or refused): clear it and put the caret where the retry starts.
        const password = document.getElementById('password') as HTMLInputElement | null;
        if (password) {
          password.value = '';
          if (!result.data?.lockedAt) password.focus();
        }
      } else {
        const invalid = formElement.querySelector<HTMLInputElement>('input[aria-invalid="true"]');
        invalid?.focus();
      }
    };
  };
</script>

<svelte:head>
  <title>{data.signedIn ? '已登入' : mode === 'register' ? '建立帳號' : '登入'}｜UniCourse</title>
</svelte:head>

{#snippet passwordToggle()}
  {#if hydrated}
    <button type="button" class="toggle" aria-pressed={showPassword} aria-controls="password"
      onclick={() => (showPassword = !showPassword)}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
        {#if showPassword}<path d="M4 4l16 16" />{/if}
      </svg>
      <span>{showPassword ? '隱藏' : '顯示'}</span><span class="sr-only">密碼</span>
    </button>
  {/if}
{/snippet}

{#snippet alertIcon(kind: 'wait' | 'error')}
  <svg class="alert-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    {#if kind === 'wait'}<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    {:else}<circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" />{/if}
  </svg>
{/snippet}

{#snippet fieldError(id: string, field: ErrorField)}
  {#if errorAt === field && form?.message}<p id={id} class="field-error" role="alert">{form.message}</p>{/if}
{/snippet}

<!-- Where the visitor lands afterwards, said once under the title (not in small print under the button). -->
{#snippet returnLine(verb: string)}
  <p class="return">{verb}後會回到：{#if hasDestination}<a href={data.next}>{returnTo}</a>{:else}首頁{/if}</p>
{/snippet}

<div class="cm auth">
  <div class="card">
    <img class="logo" src="/unicourse.png" alt="" width="40" height="40" />

    {#if data.signedIn}
      <!-- Already signed in and here by hand: no form, just who you are and where to go. -->
      <h1 id="auth-title">你已登入</h1>
      <p class="identity"><strong class="mono">@{data.signedIn.username}</strong>{#if data.signedIn.displayName}<span class="display-name">（{data.signedIn.displayName}）</span>{/if}</p>
      <p class="why">評分、發文與回覆都可以直接使用。</p>
      {#if data.activity}
        <p class="activity">
          目前有 <b class="num">{data.activity.ratings}</b> 則評價、<b class="num">{data.activity.posts}</b> 篇文章，都列在你的個人頁。
          <a href="/forum?compose=1">去論壇發文 <span aria-hidden="true">→</span></a>
        </p>
      {/if}
      <ul class="signed-in" aria-label="接下來">
        <li><a class="cm-btn block" href={data.next}>{hasDestination ? `回到${returnTo}` : '回首頁，繼續查課'} <span aria-hidden="true">→</span></a></li>
        <li class="pair">
          <a class="cm-btn secondary" href={profileHref(data.signedIn.username)}>查看公開個人頁</a>
          <a class="cm-btn secondary" href="/settings">編輯個人資料</a>
        </li>
      </ul>
      <form method="POST" action="?/logout" class="switch">
        <!-- Back to this form afterwards, so the other account can sign in right away. -->
        <input type="hidden" name="next" value={tabHref('login')} />
        <p>要用別的帳號？登出後回到登入表單；只影響這個瀏覽器。</p>
        <button class="cm-btn leave">登出</button>
      </form>
    {:else}
      <h1 id="auth-title">{mode === 'register' ? '建立帳號' : '登入 UniCourse'}</h1>
      <p class="why">查課不用登入；評分、發文與回覆才需要帳號。</p>
      {@render returnLine(mode === 'register' ? '建立' : '登入')}

      <!-- Underline tabs, the same mark as the site navigation; works in both themes without a tinted pill. -->
      <nav class="tabs" aria-label="登入或註冊">
        <a href={tabHref('login')} aria-current={mode === 'login' ? 'page' : undefined}>登入</a>
        <a href={tabHref('register')} aria-current={mode === 'register' ? 'page' : undefined}>註冊</a>
      </nav>

      {#if mode === 'login'}
        <form method="POST" action="?/login" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined}>
          <input type="hidden" name="next" value={data.next} />
          {#if errorAt === 'form' || credentialError}
            <!-- Three distinct failures, same place: wrong credentials, a locked username, a busy API.
                 A wait gets a clock and amber; a mistake gets a cross and red, so colour is never the only cue.
                 The alert says what happened and what to do next; other ways out stay under the form. -->
            <div id="auth-error" class="cm-alert form-alert" class:wait={tooMany || unavailable} role="alert">
              <p class="alert-title">{@render alertIcon(tooMany || unavailable ? 'wait' : 'error')}<span>{tooMany ? '登入失敗太多次，暫停登入' : asTitle(form?.message ?? '')}</span></p>
              {#if credentialError}
                <p class="alert-note">請確認帳號拼字與密碼大小寫後再試；{#if hydrated}再錯 <b class="num">{attemptsLeft}</b> 次會暫停登入一分鐘{:else}一分鐘內錯 10 次會暫停登入{/if}。</p>
              {:else if tooMany}
                <!-- The countdown lives here in full-contrast text; the button repeats the same number. -->
                {#if !hydrated}<p class="alert-wait">約 1 分鐘後可再按「登入」；帳號已留著，不必重填。</p>
                {:else if remaining === 0}<p class="alert-wait">現在可以再按「登入」了。</p>
                {:else}<p class="alert-wait">最快 <b class="num">{remaining}</b> 秒後可再試；帳號已留著，不必重填。</p>{/if}
                <p class="alert-exit"><a href={data.next}>不登入，繼續查課 <span aria-hidden="true">→</span></a></p>
              {:else if unavailable}<p class="alert-note">不是帳號或密碼的問題，稍後再按一次「登入」即可；查課不受影響。</p>{/if}
            </div>
            {#if tooMany}<p class="sr-only" role="status" aria-live="polite">{spoken}</p>{/if}
          {/if}
          <div class="cm-field">
            <div class="cm-label"><label for="username">帳號</label></div>
            <input id="username" class="cm-input" name="username" autocomplete="username" required maxlength="32"
              defaultValue={form?.username ?? data.prefill} autocapitalize="none" spellcheck="false" placeholder="例如 tsai_cs"
              oninput={(event) => (typedUsername = event.currentTarget.value)}
              aria-invalid={credentialError || undefined}
              aria-describedby={describedBy((credentialError || tooMany) && 'auth-error')} />
          </div>
          <div class="cm-field">
            <div class="cm-label">
              <label for="password">密碼</label>
              <!-- Password help beside the label. There is no self-service reset, so the link says
                   「看協助方式」 rather than promising one; opened, the note takes the row under it. -->
              <details class="recover" id="recover" bind:this={recover}>
                <summary>{tooMany ? '需要協助？' : '忘記密碼？看協助方式'}</summary>
                <p>目前沒有自助重設，由維護者協助處理：<a href={PRIVATE_REPORT_URL} rel="noopener external">在 GitHub 私密回報<span aria-hidden="true"> ↗</span></a>（表單只有維護者看得到，需要 GitHub 帳號；沒有的話先免費註冊一個）。只寫帳號名稱，不要附上密碼。</p>
              </details>
            </div>
            <div class="password">
              <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="current-password"
                required maxlength="128" placeholder="輸入密碼" aria-invalid={credentialError || undefined}
                aria-describedby={describedBy(credentialError && 'auth-error', locked && 'password-wait')} />
              {@render passwordToggle()}
            </div>
            {#if locked}<p id="password-wait" class="cm-hint">倒數結束後再輸入密碼；帳號會留著。</p>{/if}
          </div>
          <button class="cm-btn block" aria-busy={submitting} disabled={submitting || locked}>
            {#if submitting}登入中…{:else if locked}<span class="num">{remaining}</span> 秒後可再試{:else}登入{/if}
          </button>
          <p class="after">
            <span>還沒有帳號？<a class="inline" href={tabHref('register', credentialError ? form?.username : '')}>建立帳號</a></span>
            <a href={data.next}>不登入，繼續查課 <span aria-hidden="true">→</span></a>
          </p>
        </form>
      {:else}
        <form method="POST" action="?/register" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined}>
          <input type="hidden" name="next" value={data.next} />
          {#if errorAt === 'form'}
            <div id="auth-error" class="cm-alert form-alert" class:wait={unavailable} role="alert">
              <p class="alert-title">{@render alertIcon(unavailable ? 'wait' : 'error')}<span>{asTitle(form?.message ?? '')}</span></p>
              {#if unavailable}<p class="alert-note">你填的內容都還在，稍後再按一次「建立帳號」即可。</p>{/if}
            </div>
          {/if}
          <div class="cm-field">
            <div class="cm-label near">
              <label for="username">帳號</label>
              <span class="cm-hint" id="username-rule">3–32 字元，英數與底線（_）{#if checked.username === null && errorAt !== 'username'}<span class="ok"><span aria-hidden="true">✓</span> 符合</span>{/if}</span>
            </div>
            <p id="username-hint" class="rule">公開顯示在你的評價與文章旁，<strong>建立後無法更改</strong>。</p>
            <input id="username" class="cm-input" name="username" autocomplete="username" required minlength="3" maxlength="32"
              pattern="[A-Za-z0-9_]+" defaultValue={form?.username ?? ''} autocapitalize="none" spellcheck="false" placeholder="例如 tsai_cs"
              onblur={(event) => checkUsername(event.currentTarget.value)}
              oninput={(event) => { typedUsername = event.currentTarget.value; if (checked.username) checkUsername(event.currentTarget.value); }}
              aria-invalid={errorAt === 'username' || Boolean(checked.username) || undefined}
              aria-describedby={describedBy('username-rule', 'username-hint', (errorAt === 'username' || checked.username) && 'username-error')} />
            {#if errorAt === 'username' && form?.message}
              <!-- One statement of the problem, with both ways on; the button below simply stays off until the name changes. -->
              <p id="username-error" class="field-error" role="alert">{form.message}{#if takenName} 換一個，或<a href={tabHref('login', takenName)}>這是你的帳號？用它登入</a>。{/if}</p>
              {#if takenName && hydrated}
                <div class="suggest">
                  <span class="suggest-label">點一下帶入：</span>
                  <span class="suggest-row">{#each suggestions as name (name)}<button type="button" class="suggest-chip" onclick={() => useSuggestion(name)}><span class="mono">{name}</span></button>{/each}</span>
                </div>
              {/if}
            {:else if checked.username}<p id="username-error" class="field-error" role="alert">{checked.username}</p>{/if}
          </div>
          <div class="cm-field">
            <div class="cm-label near">
              <label for="password">密碼</label>
              <span class="cm-hint" id="password-rule">8–128 字元，可用空格，區分大小寫{#if hydrated && passwordLength > 0 && passwordLength < 8}<span class="count">，目前 {passwordLength} 字</span>{:else if checked.password === null || passwordLength >= 8}<span class="ok"><span aria-hidden="true">✓</span> 長度符合</span>{/if}</span>
            </div>
            <div class="password">
              <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password"
                required minlength="8" maxlength="128" placeholder="輸入密碼"
                onblur={(event) => checkPassword(event.currentTarget.value)}
                oninput={(event) => { passwordLength = event.currentTarget.value.length; if (checked.password) checkPassword(event.currentTarget.value); }}
                aria-invalid={errorAt === 'password' || Boolean(checked.password) || undefined}
                aria-describedby={describedBy('password-rule', (errorAt === 'password' || checked.password) && 'password-error')} />
              {@render passwordToggle()}
            </div>
            {#if errorAt === 'password' && form?.message}{@render fieldError('password-error', 'password')}
            {:else if checked.password}<p id="password-error" class="field-error" role="alert">{checked.password}</p>{/if}
          </div>
          <!-- The optional field is a text disclosure (no frame: a frame reads as a drop zone or an empty chip). -->
          <details class="optional" open={Boolean(form && 'displayName' in form && form.displayName) || errorAt === 'displayName'}>
            <summary><span class="plus" aria-hidden="true"></span><span class="optional-label">加上顯示名稱</span><span class="cm-hint">選填；未填時顯示帳號</span></summary>
            <div class="cm-field">
              <div class="cm-label near"><label for="displayName">顯示名稱</label><span class="cm-hint">最多 50 字，之後可在設定改</span></div>
              <input id="displayName" class="cm-input" name="displayName" maxlength="50" autocomplete="nickname" placeholder="例如 小蔡"
                defaultValue={form && 'displayName' in form ? form.displayName : ''} aria-invalid={errorAt === 'displayName' || undefined}
                aria-describedby={describedBy(errorAt === 'displayName' && 'display-error')} />
              {@render fieldError('display-error', 'displayName')}
            </div>
          </details>
          <p class="terms">按下「建立帳號」即表示你同意 <a href="/terms">使用條款</a> 及 <a href="/privacy">隱私權政策</a>。</p>
          <button class="cm-btn block" aria-busy={submitting} disabled={submitting || stillTaken}>{submitting ? '建立中…' : '建立帳號'}</button>
          <p class="after"><a href={data.next}>不建立帳號，繼續查課 <span aria-hidden="true">→</span></a></p>
        </form>
      {/if}
    {/if}
  </div>
</div>

<style>
  .auth { display: grid; place-items: start center; padding-block: clamp(0rem, 3vh, 1.5rem); }
  .card {
    inline-size: min(100%, 27rem);
    padding: var(--space-6) var(--space-6) var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel);
  }
  .logo { display: block; margin-block-end: var(--space-3); border-radius: 8px; }
  /* One heading size on every viewport: a touch above h2, below the data pages' 24 px h1. */
  h1 { font-size: 1.375rem !important; }
  .why { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: 0.8125rem; line-height: 1.6; }
  .return { margin-block-start: 2px !important; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  .return a { font-weight: 600; }
  .identity { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-1); margin-block-start: var(--space-2) !important; font-size: var(--t-md); overflow-wrap: anywhere; }
  .identity strong { font-weight: 700; }
  .display-name { color: var(--ink-2); }
  .activity { margin-block-start: var(--space-2) !important; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  .activity b { color: var(--ink); font-weight: 650; }
  .activity a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: 2rem; font-weight: 600; white-space: nowrap; }

  /* Two tabs under a hairline; the current one carries the brand underline, the same mark as the site nav. */
  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-block: var(--space-3) var(--space-4);
    border-block-end: 1px solid var(--line);
  }
  .tabs a {
    display: flex;
    align-items: center;
    justify-content: center;
    min-block-size: var(--target-min);
    margin-block-end: -1px;
    border-block-end: 2px solid transparent;
    color: var(--ink-2);
    font-size: var(--t-base);
    font-weight: 600;
    text-decoration: none;
  }
  .tabs a:hover { color: var(--brand-ink); background: var(--hover-row); }
  .tabs a[aria-current='page'] { color: var(--brand-ink); border-block-end-color: var(--brand); }
  .tabs a:focus-visible { outline: var(--focus-ring); outline-offset: calc(-1 * var(--focus-offset)); border-radius: var(--radius-control); }

  /* The toggle is a ghost button inside the field (one control, one border), 44 px tall. */
  .password { position: relative; display: flex; }
  .password .cm-input { padding-inline-end: 5.75rem; }
  .toggle {
    position: absolute;
    inset-block: 3px;
    inset-inline-end: 3px;
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    justify-content: center;
    min-inline-size: 4.5rem;
    padding: 0 var(--space-2);
    border: 0;
    border-radius: calc(var(--radius-control) - 2px);
    color: var(--brand-ink);
    background: transparent;
    font: 600 var(--t-base) / 1 var(--font-sans);
    cursor: pointer;
    touch-action: manipulation;
  }
  .toggle:hover { background: var(--brand-wash); }
  .toggle[aria-pressed='true'] { color: var(--ink-2); }
  .toggle:focus-visible { outline: var(--focus-ring); outline-offset: 0; }

  /* Register hints sit right after their label, not at the far edge; they wrap under it when tight. */
  .cm-label.near { justify-content: flex-start; gap: 0 var(--space-3); }
  .cm-label.near .cm-hint { font-size: 0.8125rem; }
  .cm-label.near .cm-hint .count { color: var(--ink-2); }
  .rule { color: var(--ink-2); font-size: 0.8125rem; line-height: 1.5; }
  .rule strong { color: var(--ink); font-weight: 600; }
  .field-error {
    margin-block-start: 2px;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-control);
    border-inline-start: 3px solid var(--down);
    color: var(--ink);
    background: color-mix(in srgb, var(--down) var(--status-tint), var(--panel-raised));
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.5;
  }
  .field-error a { font-weight: 650; }
  /* Suggested names are buttons: a label that says so, an outline, a hand cursor and a focus ring. */
  .suggest { display: grid; gap: var(--space-1); margin-block-start: var(--space-2); font-size: var(--t-sm); color: var(--ink-2); }
  .suggest-label { font-weight: 600; }
  .suggest-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .suggest-chip {
    display: inline-flex;
    align-items: center;
    min-block-size: var(--target-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-pill);
    color: var(--brand-ink);
    background: var(--panel-raised);
    font: 600 var(--t-sm) / 1 var(--font-sans);
    cursor: pointer;
    touch-action: manipulation;
  }
  .suggest-chip:hover { background: var(--brand-wash); border-color: var(--brand); }
  .suggest-chip:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .form-alert { display: grid; gap: 2px; }
  /* A wait (locked name, busy API) is not the visitor's mistake: amber and a clock, not red and a cross. */
  .form-alert.wait { border-color: var(--warn); border-inline-start-width: 4px; background: color-mix(in srgb, var(--warn) var(--status-tint), var(--panel-raised)); }
  .alert-title { display: flex; gap: var(--space-2); align-items: flex-start; font-weight: 650; }
  .alert-icon { flex: none; margin-block-start: 0.2em; color: var(--down); }
  .wait .alert-icon { color: var(--warn); }
  .alert-note, .alert-wait { color: var(--ink-2); font-size: 0.8125rem; line-height: 1.55; }
  .alert-note b, .alert-wait b { color: var(--ink); font-weight: 700; }
  .alert-wait { font-weight: 600; color: var(--ink); }
  .alert-exit { margin-block-start: var(--space-1) !important; font-size: 0.8125rem; }
  .alert-exit a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: 2rem; font-weight: 650; }
  /* Links inside a tinted alert use the ink colour with an underline, which clears AA on both tints. */
  .form-alert a { color: var(--ink); text-decoration: underline; }
  .cm-form { margin-block-start: var(--space-1); }
  .cm-form .cm-btn { margin-block-start: var(--space-1); }
  .terms { margin-block-start: var(--space-1) !important; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  /* Two adjacent links each get their own 32 px tall, padded target. */
  .terms a { display: inline-block; padding: 0.3rem 0.25rem; font-weight: 600; }
  .terms + .cm-btn { margin-block-start: var(--space-2); }
  .after { display: flex; flex-wrap: wrap; gap: 0 var(--space-4); align-items: center; justify-content: center; margin-block-start: calc(-1 * var(--space-1)) !important; text-align: center; color: var(--ink-2); font-size: 0.8125rem; }
  .after > span { display: inline-flex; align-items: center; min-block-size: var(--target-min); }
  .after a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); color: var(--ink-2); font-weight: 600; }
  .after a.inline { min-block-size: 0; padding-inline: 0.2em; color: var(--brand-ink); }
  .after a:hover { color: var(--brand-ink); }
  /* 忘記密碼 beside the password label, a 44 px target; open, the note takes the whole row above the field. */
  .cm-label:has(.recover) { align-items: center; }
  .recover { margin-inline-start: auto; font-weight: 400; }
  .recover summary { display: inline-flex; align-items: center; min-block-size: var(--target-min); margin-block: calc(-1 * var(--space-2)); padding-inline: var(--space-1); border-radius: var(--radius-control); color: var(--brand-ink); font-size: 0.8125rem; font-weight: 600; list-style: none; cursor: pointer; text-decoration: underline; text-underline-offset: 0.15em; }
  .recover summary::-webkit-details-marker { display: none; }
  .recover summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .recover[open] { flex-basis: 100%; margin-inline-start: 0; }
  .recover[open] summary { text-decoration: none; }
  .recover p { padding: var(--space-1) var(--space-2) var(--space-2); color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  .recover p a { font-weight: 600; }
  .ok { margin-inline-start: 0.4em; color: var(--up); font-weight: 700; }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  /* The optional block is a text disclosure under the password field; opened, the field follows. */
  .optional summary { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; min-block-size: var(--target-min); margin-inline-start: calc(-1 * var(--space-2)); padding: 0 var(--space-2); border-radius: var(--radius-control); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .optional summary:hover { background: var(--hover-row); }
  .optional summary::-webkit-details-marker { display: none; }
  .optional .plus { display: inline-grid; place-items: center; inline-size: 1.25rem; margin-inline-end: 0.2rem; }
  .optional .plus::before { content: '＋'; }
  .optional[open] .plus::before { content: '－'; }
  .optional[open] summary .optional-label { color: var(--ink); }
  .optional summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .optional .cm-field { padding-block: var(--space-2) var(--space-1); }

  .signed-in { display: grid; gap: var(--space-2); margin: var(--space-4) 0 0; padding: 0; list-style: none; }
  .signed-in .pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
  .signed-in .pair .cm-btn { padding-inline: var(--space-2); white-space: normal; text-align: center; }
  /* Signing out ends the session: the explanation takes its own line, the button is the quiet red kind. */
  .switch { display: grid; gap: var(--space-2); justify-items: start; margin-block-start: var(--space-4); padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .switch p { color: var(--muted); font-size: 0.8125rem; line-height: 1.6; }
  .cm-btn.leave { color: var(--down) !important; background: var(--panel-raised); border-color: color-mix(in srgb, var(--down) 60%, var(--line)); }
  .cm-btn.leave:hover { background: color-mix(in srgb, var(--down) var(--status-tint), var(--panel-raised)); filter: none; }

  @media (max-width: 40rem) {
    .auth { padding-block: 0; }
    /* On phones the card is the page: no frame, and the nav already shows the mark, so no second one. */
    .card { padding: 0; border: 0; background: transparent; }
    .logo { display: none; }
    .switch .cm-btn { justify-self: stretch; }
    .after { flex-direction: column; gap: 0; }
    .after > span { min-block-size: 2.5rem; }
  }
</style>
