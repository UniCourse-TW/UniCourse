<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount, tick } from 'svelte';
  import '$lib/community-ui.css';
  import { profileHref } from '$lib/community-paths';
  import { PRIVATE_REPORT_URL } from '$lib/legal-contact';
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
    return stopWaiting;
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

  // Register: a taken name gets two other names to try (one tap fills the box) and the way to sign in with it.
  let takenName = $derived(mode === 'register' && errorAt === 'username' && form?.message?.includes('已有人') ? (form?.username ?? '') : '');
  let suggestions = $derived(takenName ? [`${takenName}2`, `${takenName}_${new Date().getFullYear() - 1911}`].filter((name) => name.length <= 32) : []);
  function useSuggestion(name: string) {
    const input = document.getElementById('username') as HTMLInputElement | null;
    if (!input) return;
    input.value = name;
    typedUsername = chosenName = name;
    checkUsername(name);
    input.focus();
  }

  /** Wrong pair: put the caret in the kept username, selected, so it can be retyped. */
  function editUsername() {
    const input = document.getElementById('username') as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }

  /** Locked name: clear it so another account can sign in at once (the lock is per name). */
  function switchAccount() {
    const input = document.getElementById('username') as HTMLInputElement | null;
    if (!input) return;
    input.value = '';
    typedUsername = '';
    input.focus();
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
        if (password) {
          password.value = '';
          if (!result.data?.lockedAt) password.focus();
        }
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
  {#if hydrated && !submitting}
    <button type="button" class="toggle" aria-pressed={showPassword} aria-controls="password"
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
      <a href={browseHref} onclick={stopWaiting}>取消，繼續查課 <span aria-hidden="true">→</span></a>
    {:else}
      <a href={browseHref}>{label} <span aria-hidden="true">→</span></a>
    {/if}
  </div>
  {#if submitting && slow}<p class="request-note">若伺服器已收到請求，取消後仍可能完成{mode === 'login' ? '登入' : '建立'}。</p>{/if}
{/snippet}

<!-- Where the visitor lands afterwards, said once under the title when another page sent them here; the
     home page needs no line of its own (the exit link under the button already says 繼續查課). -->
{#snippet returnLine(verb: string)}
  {#if hasDestination}
    <p class="return">{#if returnTo === '論壇發文'}{verb}後繼續發文{:else}{verb}後回到{returnTo}{/if}</p>
  {/if}
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
      <a class="cm-btn block go-on" href={data.next}>{hasDestination ? `回到${returnTo}` : '回首頁查課'} <span aria-hidden="true">→</span></a>
      <!-- Two account actions, one full-width row each; the activity counts are the profile row's sub-line. -->
      <nav class="signed-in" aria-label="帳號快捷操作">
        <a href={profile}><span class="row-title">查看公開個人頁</span><span class="row-sub">{#if data.activity}<span class="num">{data.activity.ratings}</span> 則評價・<span class="num">{data.activity.posts}</span> 篇文章{:else}別人看到的評價與文章{/if}</span><span class="row-go" aria-hidden="true">→</span></a>
        <a href="/settings"><span class="row-title">編輯個人資料</span><span class="row-sub">顯示名稱與自我介紹</span><span class="row-go" aria-hidden="true">→</span></a>
      </nav>
      <form method="POST" action="?/logout" class="switch">
        <!-- Back to this form afterwards, so the other account can sign in right away. -->
        <input type="hidden" name="next" value={tabHref('login')} />
        <button class="cm-btn leave-quiet">登出</button>
        <p>只登出這個瀏覽器，之後可在登入頁改用其他帳號。</p>
      </form>
    {:else}
      <p class="why">查課不用登入。評分、發文與回覆才需要帳號。</p>
      {@render returnLine(mode === 'register' ? '建立帳號' : '登入')}

      <nav class="tabs" aria-label="表單切換">
        <a href={tabHref('login')} aria-current={mode === 'login' ? 'page' : undefined} onclick={stopWaiting}>登入</a>
        <a href={tabHref('register')} aria-current={mode === 'register' ? 'page' : undefined} onclick={stopWaiting}>建立帳號</a>
      </nav>

      {#if mode === 'login'}
        <form method="POST" action="?/login" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined} aria-busy={submitting}>
          <input type="hidden" name="next" value={data.next} />
          {#if errorAt === 'form' || credentialError}
            <!-- Three distinct failures, same place: wrong credentials, a locked username, a busy API.
                 A wait gets a clock and amber; a mistake gets a cross and red, so colour is never the only cue.
                 The alert says what happened and what to do next; other ways out stay under the form. -->
            <div id="auth-error" class="cm-alert form-alert" class:wait={tooMany || unavailable} role={tooMany ? undefined : 'alert'}>
              <p class="alert-title" role={tooMany ? 'alert' : undefined}>
                {@render alertIcon(tooMany || unavailable ? 'wait' : 'error')}
                <span>{tooMany ? '登入失敗太多次，暫停登入' : asTitle(form?.message ?? '')}</span>
                {#if tooMany}<span class="cm-sr">約一分鐘後可再試。</span>{/if}
              </p>
              {#if credentialError}
                <p class="alert-note">帳號已保留，請再輸入一次密碼；帳號有大小寫之分，打錯可在下方修改。</p>
                {#if hydrated && attemptsLeft <= WARN_FROM}<p class="alert-note count">還可再試 <b class="num">{attemptsLeft}</b> 次，之後會暫停登入一分鐘。</p>{/if}
              {:else if tooMany}
                <p class="alert-wait">
                  {#if unlocked}現在可以再按「登入」了。
                  {:else if locked || !hydrated}
                    <strong class="num">{locked ? remaining : retryAfter}</strong> 秒後可在這裡重試，按鈕會自動恢復。可先輸入密碼。
                  {:else}可改用其他帳號登入。{/if}
                </p>
                <p class="alert-ways">
                  {#if hydrated && locked}<button type="button" class="alert-link" onclick={switchAccount}>改用其他帳號</button>{/if}
                  <a href={PRIVATE_REPORT_URL} rel="noopener external">忘記密碼？聯絡維護者重設 <span aria-hidden="true">↗</span></a>
                </p>
              {:else if unavailable}<p class="alert-note">不是帳號或密碼的問題，稍後再按一次「登入」即可；查課不受影響。</p>{/if}
            </div>
            <p class="cm-sr" role="status">{unlocked ? '現在可以再按「登入」了。' : ''}</p>
          {/if}
          <div class="cm-field">
            <div class="cm-label"><label for="username">帳號</label>{#if credentialError && hydrated}<button type="button" class="field-action" onclick={editUsername}>修改帳號</button>{/if}</div>
            <!-- The server cannot tell which half of a wrong pair is wrong, so neither field is marked invalid;
                 the alert above carries the message and the password (cleared) takes the focus. -->
            <input id="username" class="cm-input" name="username" autocomplete="username" required maxlength="32"
              defaultValue={form?.username ?? data.prefill} autocapitalize="none" spellcheck="false" placeholder="你的帳號名稱"
              readonly={submitting}
              oninput={(event) => (typedUsername = event.currentTarget.value)}
              aria-describedby={describedBy((credentialError || tooMany) && 'auth-error')} />
          </div>
          <div class="cm-field">
            <div class="cm-label"><label for="password">密碼</label></div>
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
          <button class="cm-btn block" aria-busy={submitting} disabled={submitting || locked}>
            {#if submitting}{slow ? '連線較慢，仍在嘗試…' : '登入中…'}{:else if locked}<span>等待重試（<span class="num">{remaining}</span> 秒）</span>{:else if credentialError}重新登入{:else}登入{/if}
          </button>
          {#if submitting && slow}<button type="button" class="cm-btn quiet block" onclick={stopWaiting}>取消，回到表單重試</button>{/if}
          {@render exitLine('不登入，繼續查課')}
          <!-- Secondary rescue under the exit, so a filled-in form goes straight to the button. -->
          {#if !tooMany}
            <p class="recover" class:quiet={submitting}>
              <a href={PRIVATE_REPORT_URL} rel="noopener external">忘記密碼？聯絡維護者重設 <span aria-hidden="true">↗</span></a>
              <span class="recover-note">以 GitHub 帳號私密聯絡</span>
            </p>
          {/if}
        </form>
      {:else}
        <form method="POST" action="?/register" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined} aria-busy={submitting}>
          <input type="hidden" name="next" value={data.next} />
          {#if multipleErrors}
            <p id="registration-errors" class="cm-alert form-alert" role="alert" tabindex="-1">有多個欄位需要修正。依欄位提示調整後，再建立帳號。</p>
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
              <span class="cm-hint">公開，建立後無法更改</span>
            </div>
            <input id="username" class="cm-input" name="username" autocomplete="username" required minlength="3" maxlength="32"
              pattern="[A-Za-z0-9_]+" defaultValue={form?.username ?? ''} autocapitalize="none" spellcheck="false" placeholder="例如 ntu_cs_115"
              readonly={submitting}
              onblur={(event) => checkUsername(event.currentTarget.value)}
              oninput={(event) => { typedUsername = event.currentTarget.value; chosenName = ''; checkUsername(typedUsername); }}
              aria-invalid={usernameError || Boolean(checked.username) || undefined}
              aria-describedby={describedBy(!usernameError && 'username-rule', (usernameError || checked.username) && 'username-error')} />
            {#if usernameError && form?.message}
              <!-- The error, then the fixes in order: pick another name (fills the box), or sign in with this one. -->
              <p id="username-error" class="field-error" role="alert">{@render alertIcon('error')}{form.message}</p>
              {#if takenName && hydrated && suggestions.length}
                <div class="taken-ways">
                  <span class="suggest-label" id="suggest-label">點一個填入帳號欄：</span>
                  <span class="suggest-row">{#each suggestions as name (name)}<button type="button" class="suggest-chip" aria-label={`以 ${name} 填入帳號欄`} onclick={() => useSuggestion(name)}>{name}</button>{/each}</span>
                </div>
              {/if}
              {#if takenName}
                <a class="use-login" href={tabHref('login', takenName)}>這是你的帳號？改用它登入 <span aria-hidden="true">→</span></a>
              {/if}
            {:else if checked.username}<p id="username-error" class="field-error" role="alert">{@render alertIcon('error')}{checked.username}</p>{/if}
            {#if !usernameError}
              <p id="username-rule" class="rule">3–32 個字元，可用英文字母、數字和底線。{#if checked.username === null && !chosenName}<span class="ok"><span aria-hidden="true">✓</span> 格式符合</span>{/if}</p>
              {#if chosenName}<p class="rule" role="status">已填入 <b>{chosenName}</b>，按「建立帳號」時才會確認能否使用。</p>{/if}
            {/if}
          </div>
          <div class="cm-field">
            <div class="cm-label near">
              <label for="password">密碼</label>
            </div>
            <div class="password">
              <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password"
                required minlength="8" maxlength="128" placeholder="輸入密碼"
                readonly={submitting}
                onkeydown={readCapsLock} onkeyup={readCapsLock} onblur={() => (capsLock = false)}
                oninput={(event) => {
                  editedPassword = true;
                  passwordLength = [...event.currentTarget.value].length;
                  if (checked.password) checkPassword(event.currentTarget.value);
                }}
                aria-invalid={passwordInvalid || undefined}
                aria-describedby={describedBy('password-rule', 'password-state', passwordInvalid && 'password-error')} />
              {@render passwordToggle()}
            </div>
            <p id="password-rule" class="rule">8–128 個字元，可用空格，區分大小寫。</p>
            <!-- Live feedback under the box (never beside the rule, where it wrapped onto the next line on phones). -->
            <div class="under">
              {@render capsNote()}
              <p id="password-state" class="rule state" aria-live="polite">
                {#if hydrated && passwordLength > 0 && passwordLength < 8}目前 <b class="num">{passwordLength}</b> 字，還差 {8 - passwordLength} 字
                {:else if passwordLength >= 8}<span class="ok"><span aria-hidden="true">✓</span> 符合長度要求</span>{#if takenName} · 密碼已保留{/if}{/if}
              </p>
            </div>
            {#if serverPasswordError}{@render fieldError('password-error', 'password')}
            {:else if checked.password}<p id="password-error" class="field-error" role="alert">{checked.password}</p>{/if}
          </div>
          <!-- The optional field is a text disclosure (no frame: a frame reads as a drop zone or an empty chip). -->
          <details class="optional" open={Boolean(form && 'displayName' in form && form.displayName) || errorAt === 'displayName'}>
            <summary><span class="plus" aria-hidden="true"></span><span class="optional-label">顯示名稱（選填） <span class="cm-hint">未填則以帳號署名</span></span></summary>
            <div class="cm-field">
              <div class="cm-label near"><label for="displayName">顯示名稱</label><span class="cm-hint">最多 50 字，之後可在設定改</span></div>
              <input id="displayName" class="cm-input" name="displayName" maxlength="50" autocomplete="nickname" placeholder="例如 小蔡"
                readonly={submitting}
                defaultValue={form && 'displayName' in form ? form.displayName : ''} aria-invalid={errorAt === 'displayName' || undefined}
                aria-describedby={describedBy(errorAt === 'displayName' && 'display-error')} />
              {@render fieldError('display-error', 'displayName')}
            </div>
          </details>
          <p class="terms">按下「建立帳號」即表示你同意<a href="/terms">使用條款</a>及<a href="/privacy">隱私權政策</a>。</p>
          <button class="cm-btn block" aria-busy={submitting} disabled={submitting}>{submitting ? (slow ? '連線較慢，仍在嘗試…' : '建立中…') : '建立帳號'}</button>
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
  /* The site nav's「登入」 duplicates this page's own form: on /auth it reads as the current place
     (brand text, no button frame) instead of a second call to action. */
  :global(body:has(.cm.auth) .site-header a.login[aria-label='登入／註冊']) { border-color: transparent; background: transparent; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 0.4em; pointer-events: none; }
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
  .return { margin-block-start: 2px !important; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  /* Display name first, handle after, the same order as the profile page. */
  .identity { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-2); margin-block-start: var(--space-2) !important; font-size: var(--t-md); overflow-wrap: anywhere; }
  .identity strong { font-weight: 700; }
  .identity .handle { color: var(--ink-2); }
  .go-on { margin-block-start: var(--space-4); }
  .signed-in { display: grid; margin-block-start: var(--space-3); border-block: 1px solid var(--line); }
  .signed-in a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 var(--space-3); align-items: center; min-block-size: 3.5rem; padding: var(--space-2) var(--space-1); color: var(--ink); text-decoration: none; }
  .signed-in a + a { border-block-start: 1px solid var(--line); }
  .signed-in a:hover { background: var(--hover-row); }
  .signed-in a:hover .row-title { color: var(--brand-ink); text-decoration: underline; text-underline-offset: 0.15em; }
  .signed-in a:focus-visible { outline: var(--focus-ring); outline-offset: -2px; border-radius: var(--radius-control); }
  .row-title { grid-column: 1; font-size: var(--t-base); font-weight: 650; }
  .row-sub { grid-column: 1; color: var(--ink-2); font-size: 0.8125rem; }
  .row-go { grid-column: 2; grid-row: 1 / span 2; color: var(--muted); }

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
  .password .cm-input { padding-inline-end: 7.25rem; letter-spacing: normal; }
  .toggle {
    position: absolute;
    inset-block: 0;
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
  /* Fields in flight keep their text at full contrast; a dashed edge says they are held, not editable. */
  .cm-input:read-only:not(select) { color: var(--ink); background: var(--panel); border-style: dashed; border-color: var(--control-line); }
  .cm-input::placeholder { color: var(--muted); opacity: 1; }
  .auth .cm-hint { font-size: 0.8125rem; }
  /* A small text action at the end of a label row (修改帳號). */
  .field-action { min-block-size: 2rem; padding: 0 var(--space-1); border: 0; background: none; color: var(--brand-ink); font: 600 0.8125rem / 1 var(--font-sans); text-decoration: underline; text-underline-offset: 0.15em; cursor: pointer; }
  .field-action:focus-visible { outline: var(--focus-ring); outline-offset: 2px; border-radius: 4px; }

  /* Register hints sit right after their label, not at the far edge; they wrap under it when tight. */
  .cm-label.near { justify-content: flex-start; gap: 0 var(--space-3); }
  .cm-label.near .cm-hint { font-size: 0.8125rem; }
  .rule { color: var(--ink-2); font-size: 0.8125rem; line-height: 1.5; }
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
    font: 600 0.8125rem / 1 var(--font-sans);
    cursor: pointer;
    touch-action: manipulation;
  }
  .suggest-chip:hover { background: var(--brand-wash); border-color: var(--brand); }
  .suggest-chip:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .use-login { display: inline-flex; gap: 0.3em; align-items: center; justify-self: start; min-block-size: var(--target-min); font-size: var(--t-base); font-weight: 600; }
  .form-alert { display: grid; gap: 2px; background: color-mix(in srgb, var(--down) 12%, var(--panel-raised)); }
  /* A wait (locked name, busy API) is not the visitor's mistake: amber and a clock, not red and a cross. */
  .form-alert.wait { border-color: var(--warn); background: var(--warn-wash); }
  .alert-title { display: flex; gap: var(--space-2); align-items: flex-start; font-size: var(--t-md); font-weight: 650; line-height: 1.45; }
  .alert-icon { flex: none; margin-block-start: 0.2em; color: var(--down); }
  .wait .alert-title, .wait .alert-icon { color: var(--warn); }
  /* The ways out of a lockout sit inside the warning: another account, or a password reset. */
  .alert-ways { display: flex; flex-wrap: wrap; gap: 0 var(--space-4); align-items: center; margin-block-start: var(--space-1) !important; }
  .alert-ways a, .alert-link { display: inline-flex; gap: 0.25em; align-items: center; min-block-size: var(--target-min); padding: 0; border: 0; background: none; color: var(--ink) !important; font: 650 var(--t-base) / 1.3 var(--font-sans); text-decoration: underline; text-underline-offset: 0.15em; cursor: pointer; }
  .alert-link:focus-visible { outline: var(--focus-ring); outline-offset: 2px; border-radius: 4px; }
  .alert-note, .alert-wait { margin-block-start: 2px !important; color: var(--ink-2); font-size: var(--t-base); line-height: 1.55; }
  .alert-note b { color: var(--ink); font-weight: 700; }
  .alert-wait { color: var(--ink); }
  /* Links inside a tinted alert use the ink colour with an underline, which clears AA on both tints. */
  .form-alert a { color: var(--ink); text-decoration: underline; }
  .cm-form { margin-block-start: var(--space-1); }
  .cm-form .cm-btn { margin-block-start: var(--space-1); }
  .terms { color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  .terms a { display: inline-flex; align-items: center; min-block-size: var(--target-min); padding-inline-start: var(--space-1); font-weight: 600; }
  .after { display: flex; justify-content: center; margin-block-start: calc(-1 * var(--space-1)); text-align: center; color: var(--ink-2); font-size: 0.8125rem; }
  .after a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); color: var(--ink-2); font-weight: 600; }
  .after a:hover { color: var(--brand-ink); }
  .request-note { margin-block-start: calc(-1 * var(--space-2)) !important; text-align: center; color: var(--ink-2); font-size: 0.8125rem; }
  /* Password rescue: one centred line under the exit, below the main path. */
  .recover { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; justify-content: center; margin-block-start: calc(-1 * var(--space-3)) !important; padding-block-start: var(--space-2); border-block-start: 1px solid var(--line); text-align: center; }
  .recover a { display: inline-flex; gap: 0.25em; align-items: center; min-block-size: var(--target-min); font-size: var(--t-base); font-weight: 600; }
  .recover-note { color: var(--ink-2); font-size: 0.8125rem; }
  .recover.quiet a { color: var(--ink-2); }
  /* Busy keeps the solid brand fill (it is still the main action, not disabled): spinner + label in on-brand. */
  .auth .cm-btn[aria-busy='true'] { color: var(--on-brand) !important; background: var(--brand); border-color: var(--brand); }
  .auth .cm-btn.quiet { margin-block-start: calc(-1 * var(--space-2)); color: var(--brand-ink) !important; }
  .ok { margin-inline-start: 0.4em; color: var(--up); font-weight: 700; }
  .rule.state .ok { margin-inline-start: 0; }
  /* The optional block is a text disclosure under the password field; opened, the field follows. */
  .optional summary { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; min-block-size: var(--target-min); padding: 0; border-radius: var(--radius-control); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .optional summary:hover .optional-label { text-decoration: underline; text-underline-offset: 0.15em; }
  .optional summary .cm-hint { color: var(--ink-2); }
  .optional summary::-webkit-details-marker { display: none; }
  .optional .plus { display: inline-grid; place-items: center; inline-size: 1rem; margin-inline-end: 0.1rem; }
  .optional .plus::before { content: '＋'; }
  .optional[open] .plus::before { content: '－'; }
  .optional[open] summary .optional-label { color: var(--ink); }
  .optional summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .optional { margin-block: calc(-1 * var(--space-2)) calc(-1 * var(--space-3)); }
  .optional .cm-field { padding-block: var(--space-2) var(--space-1); }

  /* Signing out: a neutral secondary button with its one-line scope right beside it. */
  .switch { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; margin-block-start: var(--space-4); }
  .switch p { flex: 1 1 12rem; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
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
