<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount, tick } from 'svelte';
  import '$lib/community-ui.css';
  import { profileHref } from '$lib/community-paths';
  import ResetHelp from '$lib/legal-reset-help.svelte';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let mode = $derived(form?.mode ?? data.mode);
  let hydrated = $state(false);
  let showPassword = $state(false);
  // Register: the name is checked as it is typed (from the third character) and when a field loses focus,
  // so a format mistake shows before the round trip. Whether a name is free is only known to the server.
  let checked = $state<{ username?: string | null; password?: string | null }>({});
  const usernamePattern = /^[A-Za-z0-9_]{3,32}$/;
  function checkUsername(value: string, required = false) {
    if (!value) {
      checked.username = required ? '請輸入帳號名稱。' : undefined;
      return;
    }
    checked.username = usernamePattern.test(value) ? null : '帳號名稱需為 3–32 個英文字母、數字或底線（_）。';
  }
  function checkPassword(value: string, required = false) {
    const length = [...value].length;
    if (!length) {
      checked.password = required ? '請輸入密碼。' : undefined;
      return;
    }
    checked.password = length >= 8 ? null : `密碼需至少 8 個字元（目前 ${length} 個）。`;
  }
  // What is in the boxes right now (JavaScript only): drives the live length hint and the lockout
  // without another round trip.
  let typedUsername = $state('');
  let passwordLength = $state(0);
  let submitting = $state(false);
  // Keep a slow request and its exit visible without moving the submit button.
  let slow = $state(false);
  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  let activeRequest: AbortController | undefined;
  // Caps Lock while typing a password is the usual reason for a wrong one: say so beside the field.
  let capsLock = $state(false);
  const readCapsLock = (event: KeyboardEvent) => (capsLock = event.getModifierState?.('CapsLock') ?? false);
  onMount(() => {
    hydrated = true;
    typedUsername = (document.getElementById('username') as HTMLInputElement | null)?.value ?? '';
    // The nav's「登入」 is this page: mark it current for assistive tech (its look is set below).
    const navLogin = document.querySelector<HTMLAnchorElement>('.site-header a.login');
    navLogin?.setAttribute('aria-current', 'page');
    // 「忘記密碼？」 followed before hydration (or a shared #reset-help link) still opens the folded help.
    const openFromHash = () => { if (location.hash === '#reset-help') resetOpen = true; };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => {
      window.removeEventListener('hashchange', openFromHash);
      navLogin?.removeAttribute('aria-current');
      stopWaiting();
    };
  });
  // The reset steps are folded under the form (one entry point: the「忘記密碼？」link opens them), so the
  // card stays short; they are explained in full once opened.
  let resetOpen = $state(false);
  /** 「忘記密碼？」 beside the field (or in the lockout notice) opens the explainer under the form. */
  async function showReset(event: MouseEvent) {
    event.preventDefault();
    resetOpen = true;
    await tick();
    document.getElementById('reset-help')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    document.querySelector<HTMLElement>('#reset-help summary')?.focus({ preventScroll: true });
  }
  /** A few passwords every guesser tries first; long enough to pass the length rule, still weak. */
  const commonPasswords = new Set(['12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', 'password', 'password1', 'qwertyui', 'qwerty123', 'abcd1234', '1qaz2wsx', 'iloveyou', 'aaaaaaaa', 'abcdefgh', 'zaq12wsx', 'a1234567', 'asdfghjk']);
  let weakPassword = $state(false);
  function checkStrength(value: string) {
    const lower = value.toLowerCase();
    weakPassword = commonPasswords.has(lower) || /^(.)\1+$/u.test(value) || lower === typedUsername.trim().toLowerCase();
  }

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
  let browseHref = $derived(data.next.startsWith('/?') ? data.next : '/');

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
  let usernameError = $derived(errorAt === 'username' && (!hydrated || typedUsername.trim().toLowerCase() === form?.username?.toLowerCase()));
  let editedPassword = $state(false);
  let serverPasswordError = $derived(errorAt === 'password' && !editedPassword);
  let passwordInvalid = $derived(serverPasswordError || Boolean(checked.password));
  let checkedOnSubmit = $state(false);
  let multipleErrors = $derived((checkedOnSubmit || Boolean(form?.message)) && [
    usernameError || Boolean(checked.username), passwordInvalid, errorAt === 'displayName'
  ].filter(Boolean).length > 1);
  let chosenName = $state('');
  // Live format ticks for the register name (JavaScript only; without it the rule is plain text).
  let nameLength = $derived([...typedUsername].length);
  let nameLengthOk = $derived(hydrated && nameLength >= 3 && nameLength <= 32);
  let nameCharsOk = $derived(hydrated && nameLength > 0 && /^[A-Za-z0-9_]+$/.test(typedUsername));
  /** A server-side field error gets one summary at the top of the form, linked to the field. */
  let takenName = $derived(mode === 'register' && errorAt === 'username' && form?.message?.includes('已有人') ? (form?.username ?? '') : '');
  let fieldSummary = $derived(mode === 'register' && !multipleErrors && Boolean(form?.message) && !takenName && (usernameError || serverPasswordError || errorAt === 'displayName'));
  let summaryTarget = $derived(errorAt === 'password' ? 'password' : errorAt === 'displayName' ? 'displayName' : 'username');
  let credentialError = $derived(mode === 'login' && form?.message === '帳號或密碼錯誤。');
  let tooMany = $derived(Boolean(form && 'lockedAt' in form && form.lockedAt));
  let unavailable = $derived(form?.message?.startsWith('暫時無法') ?? false);
  /** Alert titles are headings, so they drop the sentence-final 。 the API message carries. */
  const asTitle = (message: string) => message.replace(/。$/, '');
  const describedBy = (...ids: (string | false | null | undefined)[]) => ids.filter(Boolean).join(' ') || undefined;

  // ---- Wrong-password count. The API allows 10 failures a minute per username and says nothing about
  // how many are used up, so this browser counts its own (JavaScript only). The number is only shown
  // once three or fewer are left: a first slip needs no warning.
  const ATTEMPTS_PER_MINUTE = 10;
  const WARN_FROM = 3;
  let failedAt = $state<number[]>([]);
  let attemptsLeft = $derived(Math.max(1, ATTEMPTS_PER_MINUTE - failedAt.filter((at) => at > Date.now() - 60_000).length));

  // ---- Lockout countdown. The API gives no Retry-After, so the clock starts when the refusal
  // reached this browser (not the server's clock) and the button comes back on its own.
  let lockedClientAt = $state<number | null>(null);
  let now = $state(Date.now());
  $effect(() => {
    const lock = form && 'lockedAt' in form ? form.lockedAt : undefined;
    if (!lock) {
      lockedClientAt = null;
      return;
    }
    now = lockedClientAt = Date.now();
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  let retryAfter = $derived(form && 'retryAfter' in form && typeof form.retryAfter === 'number' ? form.retryAfter : 60);
  let remaining = $derived(lockedClientAt === null ? 0 : Math.min(retryAfter, Math.max(0, Math.ceil((lockedClientAt + retryAfter * 1000 - now) / 1000))));
  let lockedName = $derived(tooMany ? (form?.username ?? '') : '');
  // Only the refused name is held back; typing another account's name frees the button at once.
  let locked = $derived(hydrated && tooMany && remaining > 0 && typedUsername.trim().toLowerCase() === lockedName.toLowerCase());
  let unlocked = $derived(hydrated && tooMany && lockedClientAt !== null && remaining === 0);
  /** Screen readers hear the wait every 10 seconds, not every tick. */
  let spokenWait = $derived(locked && remaining % 10 === 0 ? `還要等 ${remaining} 秒。` : '');

  // Register: a taken name gets two other names to try (one tap fills the box) and the way to sign in with it.
  let suggestions = $derived(takenName && form && 'suggestions' in form && Array.isArray(form.suggestions) ? form.suggestions : []);
  function useSuggestion(name: string) {
    const input = document.getElementById('username') as HTMLInputElement | null;
    if (!input) return;
    input.value = name;
    typedUsername = chosenName = name;
    checkUsername(name);
    input.focus();
  }

  /** Locked name: clear it so another account can sign in at once (the lock is per name). */
  function switchAccount() {
    const input = document.getElementById('username') as HTMLInputElement | null;
    if (!input) return;
    input.value = '';
    typedUsername = '';
    input.focus();
  }

  /** From the error summary: put the caret in the field the visitor chooses to fix. */
  function fixField(event: MouseEvent, id: 'username' | 'password') {
    event.preventDefault();
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }
  let signingOut = $state(false);
  /** The sign-in form with 「已登出」 confirmed on it (and the same `next`). */
  function signedOutHref() {
    const href = tabHref('login');
    return href.includes('?') ? href.replace('?', '?out=1&') : `${href}?out=1`;
  }

  function stopWaiting() {
    activeRequest?.abort();
    activeRequest = undefined;
    clearTimeout(slowTimer);
    submitting = false;
    slow = false;
  }

  const submit: SubmitFunction = async ({ formElement, formData, controller, cancel }) => {
    if (activeRequest) {
      cancel();
      return;
    }
    const wasLogin = formElement.action.endsWith('?/login');
    if (!wasLogin) {
      checkUsername(String(formData.get('username') ?? '').trim(), true);
      checkPassword(String(formData.get('password') ?? ''), true);
      checkedOnSubmit = true;
      if (multipleErrors) {
        cancel();
        await tick();
        formElement.querySelector<HTMLElement>('#registration-errors')?.focus();
        return;
      }
    }
    activeRequest = controller;
    submitting = true;
    showPassword = false;
    capsLock = false;
    slow = false;
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => (slow = true), 10_000);
    return async ({ result, update }) => {
      if (activeRequest !== controller) return;
      await update({ reset: false });
      if (activeRequest !== controller) return;
      stopWaiting();
      if (result.type !== 'failure') return;
      if (wasLogin && !result.data?.message?.startsWith('暫時無法')) {
        if (result.data?.message === '帳號或密碼錯誤。') failedAt = [...failedAt, Date.now()];
        // The old password is wrong (or refused): clear it and put the caret where the retry starts.
        const password = document.getElementById('password') as HTMLInputElement | null;
        if (password) password.value = '';
        // The server cannot tell which half was wrong: focus lands on the summary, whose two links let the
        // visitor choose the field to fix (the name is kept, the password cleared).
        await tick();
        if (!result.data?.lockedAt) document.getElementById('auth-error')?.focus();
      } else {
        editedPassword = false;
        await tick();
        const target = formElement.querySelector<HTMLElement>('#registration-errors')
          ?? formElement.querySelector<HTMLInputElement>('input[aria-invalid="true"]');
        target?.focus();
      }
    };
  };
</script>

<svelte:head>
  <title>{data.signedIn ? '已登入' : mode === 'register' ? '建立帳號' : '登入'}｜UniCourse</title>
</svelte:head>

{#snippet passwordToggle()}
  {#if hydrated}
    <!-- Stays in place (disabled) while the form is in flight, so the field does not change width. -->
    <button type="button" class="toggle" aria-pressed={showPassword} aria-controls="password" disabled={submitting}
      onclick={() => (showPassword = !showPassword)}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
        {#if showPassword}<path d="M4 4l16 16" />{/if}
      </svg>
      <span>{showPassword ? '隱藏密碼' : '顯示密碼'}</span>
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

<!-- Caps Lock warning: only while the key is on (JavaScript only). -->
{#snippet capsNote()}
  {#if capsLock}<p class="caps" role="status"><span aria-hidden="true">⇪</span> 大寫鎖定已開啟</p>{/if}
{/snippet}

{#snippet exitLine(label: string)}
  <div class="after">
    {#if submitting}
      <!-- Leaving stops waiting for the answer; it cannot promise the server did not finish, so it says "先". -->
      <a href={browseHref} onclick={stopWaiting}>不等了，先{browseHref === '/' ? '去查課' : '回搜尋結果'} <span aria-hidden="true">→</span></a>
    {:else}
      <a href={browseHref}>{label} <span aria-hidden="true">→</span></a>
    {/if}
  </div>
  {#if submitting && slow}<p class="request-note">若伺服器已收到請求，取消後仍可能完成{mode === 'login' ? '登入' : '建立'}。</p>{/if}
{/snippet}


<div class="cm auth">
  <div class="card">
    <div class="auth-heading">
      <img class="logo" src="/unicourse.png" alt="" width="36" height="36" />
      <h1>{data.signedIn ? '你已登入' : mode === 'register' ? '建立 UniCourse 帳號' : '登入 UniCourse'}</h1>
    </div>

    {#if data.signedIn}
      {@const profile = profileHref(data.signedIn.username)}
      <!-- Already signed in and here by hand: no form, just who you are and where to go. One solid button,
           the rest text links; signing out sits last under its own heading. -->
      <p class="identity">{#if data.signedIn.displayName}<strong>{data.signedIn.displayName}</strong>{/if}<span class="mono handle">@{data.signedIn.username}</span></p>
      <p class="why">現在可以評分、發文與回覆。</p>
      <a class="cm-btn block go-on" href={data.next}>{hasDestination ? `回到${returnTo}` : '開始查課'} <span aria-hidden="true">→</span></a>
      <!-- Account rows grouped under one heading; writing a post is a separate next step below them. -->
      <nav class="signed-in" aria-labelledby="account-rows">
        <h2 id="account-rows" class="rows-head">你的帳號</h2>
        <a href={profile}><span class="row-title">查看公開個人頁</span><span class="row-sub">{#if data.activity}<span class="num">{data.activity.ratings}</span> 則評價・<span class="num">{data.activity.posts}</span> 篇文章{:else}別人看到的評價與文章{/if}</span><span class="row-go" aria-hidden="true">→</span></a>
        <a href="/settings"><span class="row-title">編輯個人資料</span><span class="row-sub">顯示名稱、所屬學校與自我介紹</span><span class="row-go" aria-hidden="true">→</span></a>
      </nav>
      <a class="cm-btn block secondary compose" href="/forum?compose=1">到論壇發文 <span aria-hidden="true">✎</span></a>
      <form method="POST" action="?/logout" class="switch" use:enhance={() => { signingOut = true; return async ({ update }) => { await update(); signingOut = false; }; }}>
        <!-- Back to this form afterwards (it confirms the sign-out), so another account can sign in right away. -->
        <input type="hidden" name="next" value={signedOutHref()} />
        <button class="cm-btn leave-quiet" aria-busy={signingOut} disabled={signingOut}>{signingOut ? '登出中…' : '登出'}</button>
        <p>只登出這個瀏覽器</p>
      </form>
    {:else}
      <!-- One dek line: where the button leads (when a page sent the visitor here), then why an account. -->
      <p class="why">{#if hasDestination}<b class="return-to">{mode === 'register' ? '建立帳號' : '登入'}後回到{returnTo === '論壇發文' ? '你正要寫的文章' : returnTo}。</b>{/if}查課不用登入；評分、發文與回覆才需要帳號。</p>
      {#if data.signedOut}<p class="signed-out" role="status"><span aria-hidden="true">✓</span> 已登出這個瀏覽器，可以換帳號登入。</p>{/if}

      <nav class="tabs" class:busy={submitting} aria-label="表單切換">
        <a href={tabHref('login')} aria-current={mode === 'login' ? 'page' : undefined} aria-disabled={submitting && mode !== 'login' ? 'true' : undefined} tabindex={submitting && mode !== 'login' ? -1 : undefined} onclick={stopWaiting}>登入</a>
        <a href={tabHref('register')} aria-current={mode === 'register' ? 'page' : undefined} aria-disabled={submitting && mode !== 'register' ? 'true' : undefined} tabindex={submitting && mode !== 'register' ? -1 : undefined} onclick={stopWaiting}>建立帳號</a>
      </nav>

      {#if mode === 'login'}
        <form method="POST" action="?/login" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined} aria-busy={submitting}>
          <input type="hidden" name="next" value={data.next} />
          {#if errorAt === 'form' || credentialError}
            <!-- Three distinct failures, same place: wrong credentials, a locked username, a busy API.
                 A wait gets a clock and amber; a mistake gets a cross and red, so colour is never the only cue.
                 The alert says what happened and what to do next; other ways out stay under the form. -->
            <div id="auth-error" class="cm-alert form-alert" class:wait={tooMany || unavailable} role={tooMany ? undefined : 'alert'} tabindex="-1">
              <p class="alert-title" role={tooMany ? 'alert' : undefined}>
                {@render alertIcon(tooMany || unavailable ? 'wait' : 'error')}
                <span>{tooMany ? (unlocked ? '可以再登入了' : '登入失敗太多次，這個帳號暫停登入 1 分鐘') : asTitle(form?.message ?? '')}</span>
              </p>
              {#if credentialError}
                <!-- Which half is wrong is unknown: the summary offers both fixes (and the password help) as targets. -->
                <p class="alert-fix">
                  <a href="#password" onclick={(event) => fixField(event, 'password')}>重新輸入密碼</a>
                  <a href="#username" onclick={(event) => fixField(event, 'username')}>修改帳號</a>
                  <a href="#reset-help" onclick={showReset}>忘記密碼？</a>
                </p>
                {#if hydrated && attemptsLeft <= WARN_FROM}<p class="alert-note count">還可再試 <b class="num">{attemptsLeft}</b> 次，之後暫停一分鐘。</p>{/if}
              {:else if tooMany}
                <!-- The seconds live on the button only; the notice says what still works, as actions. -->
                <p class="alert-wait">{#if unlocked}按「登入」再試一次。{:else}其他帳號不受影響。{/if}</p>
                <p class="alert-fix">
                  {#if hydrated && !unlocked}<button type="button" class="cm-btn secondary" onclick={switchAccount}>改用其他帳號</button>{/if}
                  <a href="#reset-help" onclick={showReset}>忘記密碼？</a>
                </p>
              {:else if unavailable}<p class="alert-note">不是帳號或密碼的問題，稍後再按一次「登入」即可；查課不受影響。</p>{/if}
            </div>
            <p class="cm-sr" role="status">{unlocked ? '現在可以再按「登入」了。' : spokenWait}</p>
          {/if}
          <div class="cm-field">
            <!-- The kept name is an ordinary editable field; the hint beside it says what usually goes wrong. -->
            <div class="cm-label"><label for="username">帳號</label>{#if credentialError}<span class="cm-hint kept-neutral">已保留，可修改</span>{/if}</div>
            <!-- The server cannot tell which half of a wrong pair is wrong, so neither field is marked invalid;
                 the alert above carries the message and the password (cleared) takes the focus. -->
            <input id="username" class="cm-input" name="username" autocomplete="username" required maxlength="32"
              defaultValue={form?.username ?? data.prefill} autocapitalize="none" spellcheck="false" placeholder="你的帳號名稱"
              readonly={submitting}
              oninput={(event) => (typedUsername = event.currentTarget.value)}
              aria-describedby={describedBy((credentialError || tooMany) && 'auth-error')} />
          </div>
          <div class="cm-field">
            <!-- The one 「忘記密碼？」 entry: beside the field, or inside the error summary once there is one. -->
            <div class="cm-label"><label for="password">密碼</label>{#if !tooMany && !credentialError}<a class="field-action" class:idle={submitting} href="#reset-help" onclick={showReset} aria-hidden={submitting || undefined} tabindex={submitting ? -1 : undefined}>忘記密碼？</a>{/if}</div>
            <div class="password">
              <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="current-password"
                required maxlength="128" placeholder="輸入密碼"
                readonly={submitting}
                onkeydown={readCapsLock} onkeyup={readCapsLock} onblur={() => (capsLock = false)}
                aria-describedby={describedBy((credentialError || locked) && 'auth-error')} />
              {@render passwordToggle()}
            </div>
            {@render capsNote()}
          </div>
          <button class="cm-btn block" class:counting={locked} aria-busy={submitting} disabled={submitting || locked}>
            {#if submitting}{slow ? '連線較慢，仍在嘗試…' : '登入中…'}{:else if locked}<span><span class="num">{remaining}</span> 秒後可再登入</span>{:else if credentialError}重新登入{:else}登入{/if}
          </button>
          {#if submitting && slow}<button type="button" class="cm-btn quiet block" onclick={stopWaiting}>取消，回到表單重試</button>{/if}
          {@render exitLine('不登入，繼續查課')}
          <!-- Password help under the exit. With JavaScript it only appears once a 「忘記密碼？」 link opens it (one
               entry point); without it, the folded disclosure is the fallback the link jumps to. -->
          <div class="recover" class:hidden={hydrated && !resetOpen}><ResetHelp summary="重設密碼的方式" bind:open={resetOpen} quiet={submitting} /></div>
        </form>
      {:else}
        <form method="POST" action="?/register" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined} aria-busy={submitting}>
          <input type="hidden" name="next" value={data.next} />
          {#if multipleErrors}
            <p id="registration-errors" class="cm-alert form-alert" role="alert" tabindex="-1">有多個欄位需要修正。依欄位提示調整後，再建立帳號。</p>
          {/if}
          {#if fieldSummary}
            <p id="registration-errors" class="cm-alert form-alert summary" role="alert" tabindex="-1">{@render alertIcon('error')}<span>還沒建立帳號：<a href={`#${summaryTarget}`}>{takenName ? '帳號名稱已有人使用' : `${summaryTarget === 'password' ? '密碼' : summaryTarget === 'displayName' ? '顯示名稱' : '帳號'}欄需要修正`}</a></span></p>
          {/if}
          {#if errorAt === 'form'}
            <div id="auth-error" class="cm-alert form-alert" class:wait={unavailable} role="alert">
              <p class="alert-title">{@render alertIcon(unavailable ? 'wait' : 'error')}<span>{asTitle(form?.message ?? '')}</span></p>
              {#if unavailable}<p class="alert-note">你填的內容都還在，稍後再按一次「建立帳號」即可。</p>{/if}
            </div>
          {/if}
          <div class="cm-field">
            <!-- Beside the label: the one thing to decide before typing. Under the box: the format and where the name shows. -->
            <div class="cm-label near">
              <label for="username">帳號</label>
              <span class="fixed-badge">公開・建立後無法更改</span>
            </div>
            <input id="username" class="cm-input" name="username" autocomplete="username" required minlength="3" maxlength="32"
              pattern="[A-Za-z0-9_]+" defaultValue={form?.username ?? ''} autocapitalize="none" spellcheck="false" placeholder="例如 study_owl"
              readonly={submitting}
              onblur={(event) => checkUsername(event.currentTarget.value)}
              oninput={(event) => { typedUsername = event.currentTarget.value; chosenName = ''; checkUsername(typedUsername); }}
              aria-invalid={usernameError || Boolean(checked.username) || undefined}
              aria-describedby={describedBy('username-rule', (usernameError || checked.username) && 'username-error')} />
            <!-- The format rule stays under the box in every state (also after a taken-name error), each part
                 ticked live as the name is typed. -->
            <p id="username-rule" class="rule checklist">
              <span class="rule-key">格式</span>
              <span class:met={nameLengthOk} class:miss={hydrated && nameLength > 0 && !nameLengthOk}><span class="mark" aria-hidden="true">{nameLengthOk ? '✓' : hydrated && nameLength > 0 ? '✗' : '・'}</span>3–32 字元</span>
              <span class:met={nameCharsOk} class:miss={hydrated && nameLength > 0 && !nameCharsOk}><span class="mark" aria-hidden="true">{nameCharsOk ? '✓' : hydrated && nameLength > 0 ? '✗' : '・'}</span>英數與底線</span>
            </p>
            {#if usernameError && form?.message}
              <!-- The error, then the fixes in order: pick another name (fills the box), or sign in with this one. -->
              <p id="username-error" class="field-error" role={fieldSummary ? undefined : 'alert'}>{@render alertIcon('error')}{form.message}</p>
              {#if takenName && hydrated && suggestions.length}
                <!-- The server checked these names a moment ago: they are free. A chip fills the box; the chosen one is marked. -->
                <div class="taken-ways">
                  <span class="suggest-label" id="suggest-label">改用這些名稱（剛確認沒人用）：</span>
                  <span class="suggest-row">{#each suggestions as name (name)}<button type="button" class="suggest-chip" aria-pressed={chosenName === name} aria-label={`使用 ${name}（剛確認沒人使用）`} onclick={() => useSuggestion(name)}>{chosenName === name ? '已填入' : '使用'} <b>{name}</b></button>{/each}</span>
                </div>
              {/if}
            {:else if checked.username}<p id="username-error" class="field-error" role="alert">{@render alertIcon('error')}{checked.username}</p>{/if}
            {#if chosenName}<p class="rule" role="status">已填入 <b>{chosenName}</b>，按「建立帳號」即可。</p>{/if}
          </div>
          <div class="cm-field">
            <div class="cm-label near">
              <label for="password">密碼</label>
              {#if takenName && passwordLength >= 8}<span class="cm-hint kept"><span aria-hidden="true">✓</span> 已保留，不用重打</span>{/if}
            </div>
            <div class="password">
              <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password"
                required minlength="8" maxlength="128" placeholder="輸入密碼"
                readonly={submitting}
                onkeydown={readCapsLock} onkeyup={readCapsLock} onblur={() => (capsLock = false)}
                oninput={(event) => {
                  editedPassword = true;
                  passwordLength = [...event.currentTarget.value].length;
                  checkStrength(event.currentTarget.value);
                  if (checked.password) checkPassword(event.currentTarget.value);
                }}
                aria-invalid={passwordInvalid || undefined}
                aria-describedby={describedBy('password-rule', 'password-state', passwordInvalid && 'password-error')} />
              {@render passwordToggle()}
            </div>
            <!-- Two rules on two lines: the length (ticked live, with what is missing) and what is allowed. -->
            <p id="password-rule" class="rule checklist">
              <span class="rule-key">格式</span>
              <span class="len" class:met={passwordLength >= 8}><span class="mark" aria-hidden="true">{passwordLength >= 8 ? '✓' : '・'}</span><b>至少 8 字元</b>{#if hydrated && passwordLength > 0 && passwordLength < 8}<span class="short">（還差 {8 - passwordLength}）</span>{/if}</span>
              <span><span class="mark" aria-hidden="true">・</span>可用空格、分大小寫</span>
            </p>
            <div class="under">
              {@render capsNote()}
              <p id="password-state" class="rule state" aria-live="polite">{#if passwordLength >= 8 && weakPassword}<span class="weak"><span aria-hidden="true">!</span> 長度夠，但這是常見密碼（或與帳號相同），很容易被猜到</span>{/if}</p>
            </div>
            {#if serverPasswordError}{@render fieldError('password-error', 'password')}
            {:else if checked.password}<p id="password-error" class="field-error" role="alert">{checked.password}</p>{/if}
          </div>
          <!-- The optional field is a text disclosure (no frame: a frame reads as a drop zone or an empty chip). -->
          <details class="optional" open={Boolean(form && 'displayName' in form && form.displayName) || errorAt === 'displayName'}>
            <summary><span class="chev" aria-hidden="true"></span><span class="optional-label">顯示名稱（選填）</span><span class="optional-public">會公開</span></summary>
            <div class="cm-field">
              <div class="cm-label near"><label for="displayName">顯示名稱</label><span class="cm-hint">公開在個人頁、評價與文章；未填則以帳號署名，最多 50 字，之後可改</span></div>
              <input id="displayName" class="cm-input" name="displayName" maxlength="50" autocomplete="nickname" placeholder="例如 小蔡"
                readonly={submitting}
                defaultValue={form && 'displayName' in form ? form.displayName : ''} aria-invalid={errorAt === 'displayName' || undefined}
                aria-describedby={describedBy(errorAt === 'displayName' && 'display-error')} />
              {@render fieldError('display-error', 'displayName')}
            </div>
          </details>
          <!-- Two separate targets before the button, each a full-size link. -->
          <div class="terms"><span>建立帳號即表示同意</span><a href="/terms">使用條款</a><a href="/privacy">隱私權政策</a></div>
          <!-- While the refused name is still in the box the button says what to do first (and takes the visitor
               there); once the name changes it is「建立帳號」again. -->
          {#if hydrated && usernameError && takenName}
            <button type="button" class="cm-btn block secondary" onclick={(event) => fixField(event, 'username')}>先換一個帳號名稱</button>
          {:else}
            <button class="cm-btn block" aria-busy={submitting} disabled={submitting}>{submitting ? (slow ? '連線較慢，仍在嘗試…' : '建立中…') : '建立帳號'}</button>
          {/if}
          {#if takenName}<a class="use-login" href={tabHref('login', takenName)}>{takenName} 是你的帳號？改用它登入 <span aria-hidden="true">→</span></a>{/if}
          {@render exitLine('不建立帳號，繼續查課')}
        </form>
      {/if}
    {/if}
    <p class="cm-sr" role="status">
      {submitting ? slow ? '連線較慢，仍在嘗試。' : mode === 'login' ? '登入中…' : '建立帳號中…' : ''}
    </p>
  </div>
</div>

<style>
  /* Desktop: the card sits in the upper middle of the column, not against the top with 250 px of floor below. */
  /* Desktop: the card hangs a short way under the nav (not centred in a tall empty band). */
  .auth { display: grid; place-items: start center; padding-block: var(--space-2) var(--space-6); }
  .card {
    inline-size: min(100%, 27rem);
    padding: var(--space-6) var(--space-6) var(--space-5);
    border: 1px solid color-mix(in srgb, var(--control-line) 65%, var(--line));
    border-radius: var(--radius-panel);
    background: var(--panel);
  }
  .auth-heading { display: flex; gap: var(--space-3); align-items: center; margin-block-end: var(--space-2); }
  .logo { flex: none; border-radius: 8px; }
  /* One heading size on every viewport: a touch above h2, below the data pages' 24 px h1. */
  h1 { font-size: 1.375rem !important; }
  .why { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: 0.8125rem; line-height: 1.6; }
  .why { color: var(--ink-2); }
  .why .return-to { display: block; color: var(--brand-ink); font-weight: 650; }
  .signed-out { margin-block-start: var(--space-3) !important; padding: var(--space-2) var(--space-3); border-inline-start: 3px solid var(--up); border-radius: var(--radius-control); background: color-mix(in srgb, var(--up) var(--status-tint), var(--panel-raised)); color: var(--ink); font-size: var(--t-base); font-weight: 600; }
  /* Display name first, handle after, the same order as the profile page. */
  .identity { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-2); margin-block-start: var(--space-2) !important; font-size: var(--t-md); overflow-wrap: anywhere; }
  .identity strong { font-weight: 700; }
  .identity .handle { color: var(--ink-2); }
  .go-on { margin-block-start: var(--space-4); }
  .signed-in { display: grid; margin-block-start: var(--space-4); border-block-end: 1px solid var(--line); }
  .rows-head { padding-block-end: var(--space-1); border-block-end: 1px solid var(--line); color: var(--ink-2); font-size: 0.8125rem !important; font-weight: 650; }
  .compose { margin-block-start: var(--space-3); }
  .signed-in a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 var(--space-3); align-items: center; min-block-size: 3.5rem; padding: var(--space-2) var(--space-1); color: var(--ink); text-decoration: none; }
  .signed-in a + a { border-block-start: 1px solid var(--line); }
  .signed-in a:hover { background: var(--hover-row); }
  .signed-in a:hover .row-title { color: var(--brand-ink); text-decoration: underline; text-underline-offset: 0.15em; }
  .signed-in a:focus-visible { outline: var(--focus-ring); outline-offset: -2px; border-radius: var(--radius-control); }
  .row-title { grid-column: 1; color: var(--brand-ink); font-size: var(--t-base); font-weight: 650; }
  .row-sub { grid-column: 1; color: var(--ink-2); font-size: 0.8125rem; }
  .row-go { grid-column: 2; grid-row: 1 / span 2; color: var(--brand-ink); font-size: var(--t-lg); font-weight: 650; }

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
  /* While a request is in flight the other tab steps back, so the busy button is the one thing to watch. */
  .tabs.busy a:not([aria-current]) { color: var(--muted); font-weight: 500; cursor: not-allowed; pointer-events: none; }
  .tabs a[aria-current='page'] { color: var(--brand-ink); border-block-end-color: var(--brand); }
  .tabs a:focus-visible { outline: var(--focus-ring); outline-offset: calc(-1 * var(--focus-offset)); border-radius: var(--radius-control); }

  /* The toggle is a ghost button inside the field (one control, one border), 44 px tall. */
  .password { position: relative; display: flex; }
  .password .cm-input { padding-inline-end: 7.75rem; letter-spacing: normal; }
  .toggle {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
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
  /* A hairline separates the toggle from the typed text, so long passwords never run into it. */
  .toggle::before { content: ''; position: absolute; inset-block: 0; inset-inline-start: -1px; border-inline-start: 1px solid var(--control-line); }
  .toggle:hover { background: var(--brand-wash); }
  /* In flight the toggle reads as paused, not gone: label kept at AA contrast, a not-allowed cursor. */
  .toggle:disabled { color: var(--ink-2); cursor: not-allowed; background: color-mix(in srgb, var(--chip) 60%, transparent); }
  .toggle[aria-pressed='true'] { color: var(--ink-2); }
  .toggle:focus-visible { outline: var(--focus-ring); outline-offset: -2px; }
  /* Fields in flight use the shared read-only look from community-ui.css (muted fill, solid border). */
  .cm-input::placeholder { color: var(--muted); opacity: 1; }
  .auth .cm-hint { font-size: 0.8125rem; }
  /* A small text action at the end of a label row (忘記密碼？). */
  .field-action { display: inline-flex; align-items: center; min-block-size: var(--target-min); margin-block: calc(-1 * var(--space-2)); padding: 0 var(--space-1); border: 0; background: none; color: var(--brand-ink); font: 600 0.8125rem / 1 var(--font-sans); text-decoration: underline; text-underline-offset: 0.15em; cursor: pointer; }
  .cm-form[aria-busy='true'] .field-action { color: var(--ink-2); }
  .field-action:focus-visible { outline: var(--focus-ring); outline-offset: 2px; border-radius: 4px; }
  /* In flight the shortcut steps out of sight but keeps its place, so nothing moves. */
  .field-action.idle { visibility: hidden; }

  /* Register hints sit right after their label, not at the far edge; they wrap under it when tight. */
  .cm-label.near { justify-content: flex-start; gap: 0 var(--space-3); }
  .cm-label.near .cm-hint { font-size: 0.8125rem; }
  .rule { color: var(--ink-2); font-size: var(--t-base); line-height: 1.5; }
  .checklist { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: baseline; }
  .rule-key { color: var(--ink-2); font-size: 0.8125rem; font-weight: 650; }
  .checklist .len b { color: inherit; font-weight: 650; }
  .checklist .mark { display: inline-block; inline-size: 1.1em; color: var(--muted); font-weight: 700; }
  .checklist .met { color: var(--ink); }
  .checklist .met .mark { color: var(--up); }
  .checklist .miss { color: var(--ink); }
  .checklist .miss .mark { color: var(--down); }
  .checklist .short { color: var(--ink-2); }
  /* The one thing to decide before typing a name: a warn-tinted badge beside the label. */
  .fixed-badge { padding: 1px var(--space-2); border-radius: var(--radius-pill); background: var(--warn-wash); color: var(--ink); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--warn) 45%, transparent); font-size: var(--t-base); font-weight: 650; }
  .weak { color: var(--ink); font-weight: 600; }
  .weak > span { display: inline-grid; place-items: center; inline-size: 1.1em; block-size: 1.1em; margin-inline-end: 0.3em; border-radius: 50%; background: var(--warn); color: var(--on-brand); font-size: 0.75em; }
  .kept { color: var(--up) !important; font-weight: 600 !important; }
  /* Sign-in: the kept name is neutral (not a green「passed」mark beside a red error). */
  .kept-neutral { color: var(--ink-2) !important; }
  .rule.state:empty { display: none; }
  .rule b { color: var(--ink); font-weight: 650; }
  /* The row under a field: the Caps Lock note at the start, password help at the end; 44 px tall. */
  .under { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; justify-content: space-between; }
  .under > .rule { flex: 1 1 auto; }
  .caps { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: 2rem; color: var(--warn); font-size: 0.8125rem; font-weight: 650; }
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
  /* An invalid field keeps one ring only: red, focused or not. */
  .auth .cm-input[aria-invalid='true'] { border-color: var(--down); }
  .auth .cm-input[aria-invalid='true']:focus-visible { outline: 2px solid var(--down); outline-offset: 1px; box-shadow: none; }
  .field-error:has(.alert-icon) { display: flex; gap: var(--space-1); align-items: flex-start; padding: 0; border: 0; background: transparent; color: var(--down); }
  .taken-ways { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: center; font-size: 0.8125rem; color: var(--ink-2); }
  .suggest-label { font-weight: 600; }
  /* Suggestions stay one row (scrolling sideways on narrow phones), so the password field stays close. */
  .suggest-row { display: flex; flex-wrap: nowrap; gap: var(--space-2); max-inline-size: 100%; overflow-x: auto; scrollbar-width: none; }
  .taken-ways { min-inline-size: 0; }
  .suggest-chip b { margin-inline-start: 0.3em; font-family: var(--font-mono); font-weight: 650; }
  .suggest-chip[aria-pressed='true'] { border-color: var(--brand); background: var(--brand-wash); }
  .suggest-chip {
    display: inline-flex;
    align-items: center;
    min-block-size: var(--target-min);
    flex: none;
    padding: 0 var(--space-3);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-pill);
    color: var(--ink-2);
    background: var(--panel-raised);
    font: 600 var(--t-base) / 1 var(--font-sans);
    cursor: pointer;
    touch-action: manipulation;
  }
  .suggest-chip:hover { background: var(--brand-wash); border-color: var(--brand); }
  .suggest-chip b { color: var(--brand-ink); }
  .suggest-chip:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .use-login { display: inline-flex; gap: 0.3em; align-items: center; justify-self: center; min-block-size: var(--target-min); margin-block: calc(-1 * var(--space-2)); color: var(--ink-2); font-size: var(--t-base); font-weight: 600; }
  .form-alert { display: grid; gap: 2px; background: color-mix(in srgb, var(--down) 12%, var(--panel-raised)); }
  /* A wait (locked name, busy API) is not the visitor's mistake: amber and a clock, not red and a cross. */
  .form-alert.wait { border-color: var(--warn); background: var(--warn-wash); }
  .alert-title { display: flex; gap: var(--space-2); align-items: flex-start; font-size: var(--t-md); font-weight: 650; line-height: 1.45; }
  .alert-icon { flex: none; margin-block-start: 0.2em; color: var(--down); }
  .wait .alert-title, .wait .alert-icon { color: var(--warn); }
  /* The error summary's ways forward: full-size targets on one wrapping row. */
  .form-alert:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .alert-fix { display: flex; flex-wrap: wrap; gap: 0 var(--space-4); align-items: center; margin-block-start: 2px !important; }
  .alert-fix a { display: inline-flex; align-items: center; min-block-size: var(--target-min); font-size: var(--t-base); font-weight: 650; }
  .alert-fix .cm-btn { min-block-size: var(--target-min); }
  .alert-note, .alert-wait { margin-block-start: 2px !important; color: var(--ink-2); font-size: var(--t-base); line-height: 1.55; text-wrap: pretty; }
  .form-alert.summary { display: flex; gap: var(--space-2); align-items: flex-start; font-weight: 600; }
  .form-alert.summary .alert-icon { color: var(--down); }
  .alert-note b { color: var(--ink); font-weight: 700; }
  .alert-wait { color: var(--ink); }
  /* Links inside a tinted alert use the ink colour with an underline, which clears AA on both tints. */
  .form-alert a { color: var(--ink); text-decoration: underline; }
  .cm-form { margin-block-start: var(--space-1); }
  .cm-form .cm-btn { margin-block-start: var(--space-1); }
  .terms { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.5; }
  .terms span { flex: 1 1 100%; }
  .terms a { display: inline-flex; flex: 1 1 0; align-items: center; justify-content: center; min-block-size: var(--target-min); padding-inline: var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); font-size: var(--t-base); font-weight: 600; text-decoration: none; }
  .terms a:hover { background: var(--hover-row); }
  .after { display: flex; justify-content: center; margin-block-start: calc(-1 * var(--space-1)); text-align: center; color: var(--ink-2); font-size: 0.8125rem; }
  .after a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); color: var(--ink-2); font-weight: 600; }
  .after a:hover { color: var(--brand-ink); }
  .request-note { margin-block-start: calc(-1 * var(--space-2)) !important; text-align: center; color: var(--ink-2); font-size: 0.8125rem; }
  /* Password help: a disclosure under the exit, set off by a rule, explained in place. */
  .recover { margin-block-start: calc(-1 * var(--space-3)); padding-block-start: var(--space-1); border-block-start: 1px solid var(--line); }
  .recover.hidden { display: none; }
  /* Busy keeps the solid brand fill (it is still the main action, not disabled): spinner + label in on-brand. */
  .auth .cm-btn[aria-busy='true'] { color: var(--on-brand) !important; background: color-mix(in srgb, var(--brand) 82%, var(--panel)); border-color: transparent; }
  /* A thicker ring with a stronger track, so it reads on the softened fill in both themes. */
  .auth .cm-btn[aria-busy='true']::before { border-width: 3px; border-color: color-mix(in srgb, currentColor 40%, transparent); border-block-start-color: currentColor; }
  .auth .cm-btn.quiet { margin-block-start: calc(-1 * var(--space-2)); color: var(--brand-ink) !important; }
  /* The optional block is a text disclosure under the password field; opened, the field follows. */
  /* The whole row is the control, with a chevron at its end (not a bare 「＋」 before the text). */
  .optional summary { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; justify-content: flex-start; min-block-size: var(--target-min); padding: 0 var(--space-2); border-block: 1px solid var(--line); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .optional summary:hover { background: var(--hover-row); }
  /* The marker leads the label, like the site's other disclosures. */
  .optional .chev::before { content: '▸'; color: var(--brand-ink); }
  .optional[open] .chev::before { content: '▾'; }
  .optional-public { padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; }
  .optional summary:hover .optional-label { text-decoration: underline; text-underline-offset: 0.15em; }
  .optional summary::-webkit-details-marker { display: none; }
  .optional[open] summary .optional-label { color: var(--ink); }
  .optional summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .optional { margin-block: calc(-1 * var(--space-2)) calc(-1 * var(--space-3)); }
  .optional .cm-field { padding-block: var(--space-2) var(--space-1); }

  /* Signing out: a neutral secondary button with its one-line scope right beside it. */
  .switch { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; margin-block-start: var(--space-4); }
  .switch p { flex: 1 1 8rem; color: var(--ink-2); font-size: var(--t-base); line-height: 1.6; }
  .cm-btn.leave-quiet { color: var(--ink) !important; background: var(--panel-raised); border-color: var(--control-line); }
  .cm-btn.leave-quiet:hover { background: var(--hover-row); filter: none; }

  @media (max-width: 40rem) {
    .auth { padding-block: 0; }
    /* On phones the card is the page: no frame, but the same mark and heading as the desktop card. */
    .card { padding: 0; border: 0; background: transparent; }
    .cm-form:has(.optional) { gap: var(--space-2); }
    .optional { margin-block-end: calc(-1 * var(--space-2)); }
  }
</style>
