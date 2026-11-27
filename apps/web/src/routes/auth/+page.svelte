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
  // Register: the name is checked as it is typed (from the third character) and when a field loses focus,
  // so a format mistake shows before the round trip. Whether a name is free is only known to the server.
  let checked = $state<{ username?: string | null; password?: string | null }>({});
  const usernamePattern = /^[A-Za-z0-9_]{3,32}$/;
  function checkUsername(value: string) {
    checked.username = !value ? undefined : usernamePattern.test(value) ? null : '帳號名稱需為 3–32 個英文字母、數字或底線（_）。';
  }
  function checkPassword(value: string) {
    checked.password = !value ? undefined : value.length >= 8 ? null : `密碼需至少 8 個字元（目前 ${value.length} 個）。`;
  }
  // What is in the boxes right now (JavaScript only): drives the live length hint and the lockout
  // without another round trip.
  let typedUsername = $state('');
  let passwordLength = $state(0);
  let submitting = $state(false);
  // A sign-in that takes longer than usual says so under the button, with the way on (retry) spelled out.
  let slow = $state(false);
  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  // Caps Lock while typing a password is the usual reason for a wrong one: say so beside the field.
  let capsLock = $state(false);
  const readCapsLock = (event: KeyboardEvent) => (capsLock = event.getModifierState?.('CapsLock') ?? false);
  onMount(() => {
    hydrated = true;
    typedUsername = (document.getElementById('username') as HTMLInputElement | null)?.value ?? '';
    return () => clearTimeout(slowTimer);
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
  let usernameError = $derived(errorAt === 'username' && (!hydrated || typedUsername.trim().toLowerCase() === form?.username?.toLowerCase()));
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

  const submit: SubmitFunction = ({ formElement }) => {
    submitting = true;
    showPassword = false;
    capsLock = false;
    slow = false;
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => (slow = true), 6000);
    const wasLogin = formElement.action.endsWith('?/login');
    return async ({ result, update }) => {
      await update({ reset: false });
      submitting = false;
      slow = false;
      clearTimeout(slowTimer);
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
    <button type="button" class="toggle" aria-pressed={showPassword} aria-controls="password" disabled={submitting || locked}
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

<!-- Caps Lock warning: only while the key is on (JavaScript only). -->
{#snippet capsNote()}
  {#if capsLock}<p class="caps" role="status"><span aria-hidden="true">⇪</span> 大寫鎖定已開啟</p>{/if}
{/snippet}

<!-- Where the visitor lands afterwards, said once under the title (not in small print under the button). -->
{#snippet returnLine(verb: string)}
  <p class="return">{verb}後會回到：{#if hasDestination}<a href={data.next}>{returnTo}</a>{:else}首頁{/if}</p>
{/snippet}

<div class="cm auth">
  <div class="card">
    <div class="auth-heading">
      <img class="logo" src="/unicourse.png" alt="" width="36" height="36" />
      <h1>{data.signedIn ? '你已登入' : mode === 'register' ? '建立帳號' : '登入 UniCourse'}</h1>
    </div>

    {#if data.signedIn}
      {@const profile = profileHref(data.signedIn.username)}
      <!-- Already signed in and here by hand: no form, just who you are and where to go. One solid button,
           the rest text links; signing out sits last under its own heading. -->
      <p class="identity">{#if data.signedIn.displayName}<strong>{data.signedIn.displayName}</strong>{/if}<span class="mono handle">@{data.signedIn.username}</span></p>
      <p class="why">現在可以評分、發文與回覆。</p>
      <a class="cm-btn block go-on" href={data.next}>{hasDestination ? `回到${returnTo}` : '回首頁，繼續查課'} <span aria-hidden="true">→</span></a>
      <nav class="signed-in" aria-label="帳號快捷操作">
        <div class="account-links">
          <a class="cm-btn secondary" href={profile}>公開個人頁</a>
          <a class="cm-btn secondary" href="/settings">編輯個人資料</a>
        </div>
        {#if data.activity}
          <div class="counts">
            <a href="{profile}#ratings"><b class="num">{data.activity.ratings}</b> 則評價</a>
            <a href="{profile}#posts"><b class="num">{data.activity.posts}</b> 篇文章</a>
          </div>
        {/if}
        {#if data.next !== '/forum?compose=1'}<a href="/forum?compose=1">去論壇發文 <span aria-hidden="true">→</span></a>{/if}
      </nav>
      <form method="POST" action="?/logout" class="switch">
        <!-- Back to this form afterwards, so the other account can sign in right away. -->
        <input type="hidden" name="next" value={tabHref('login')} />
        <p class="switch-title">登出或切換帳號</p>
        <p>只登出這個瀏覽器，並回到登入頁。</p>
        <button class="cm-btn leave">登出</button>
      </form>
    {:else}
      <p class="why">查課不用登入；評分、發文與回覆才需要帳號。</p>
      {@render returnLine(mode === 'register' ? '建立' : '登入')}

      <!-- Underline tabs, the same mark as the site navigation; the one way between the two forms.
           While a form is on its way the tabs are inert, so nothing switches mid-flight. -->
      <nav class="tabs" aria-label="表單切換" inert={submitting}>
        <a href={tabHref('login')} aria-current={mode === 'login' ? 'page' : undefined}>登入</a>
        <a href={tabHref('register')} aria-current={mode === 'register' ? 'page' : undefined}>建立帳號</a>
      </nav>

      {#if mode === 'login'}
        <form method="POST" action="?/login" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined} aria-busy={submitting}>
          <input type="hidden" name="next" value={data.next} />
          {#if errorAt === 'form' || credentialError}
            <!-- Three distinct failures, same place: wrong credentials, a locked username, a busy API.
                 A wait gets a clock and amber; a mistake gets a cross and red, so colour is never the only cue.
                 The alert says what happened and what to do next; other ways out stay under the form. -->
            <div id="auth-error" class="cm-alert form-alert" class:wait={tooMany || unavailable} role="alert">
              <p class="alert-title">{@render alertIcon(tooMany || unavailable ? 'wait' : 'error')}<span>{tooMany ? '登入失敗太多次，暫停登入' : asTitle(form?.message ?? '')}</span></p>
              {#if credentialError}
                <p class="alert-note">已保留帳號。確認拼字後，再輸入密碼。</p>
                {#if hydrated && attemptsLeft <= WARN_FROM}<p class="alert-note count">還可再試 <b class="num">{attemptsLeft}</b> 次，之後會暫停登入一分鐘。</p>{/if}
              {:else if tooMany}
                <p class="alert-wait">{!hydrated ? '約一分鐘後可在原頁再試，帳號已保留。' : unlocked ? '現在可以再按「登入」了。' : locked ? '帳號已保留，等待結束後可在原頁再試。' : '可改用其他帳號登入。'}</p>
                <p class="alert-exit"><a href={data.next}>不登入，繼續查課 <span aria-hidden="true">→</span></a></p>
              {:else if unavailable}<p class="alert-note">不是帳號或密碼的問題，稍後再按一次「登入」即可；查課不受影響。</p>{/if}
            </div>
            <p class="cm-sr" role="status">{unlocked ? '現在可以再按「登入」了。' : ''}</p>
          {/if}
          <div class="cm-field">
            <div class="cm-label"><label for="username">帳號</label></div>
            <!-- The server cannot tell which half of a wrong pair is wrong, so neither field is marked invalid;
                 the alert above carries the message and the password (cleared) takes the focus. -->
            <input id="username" class="cm-input" name="username" autocomplete="username" required maxlength="32"
              defaultValue={form?.username ?? data.prefill} autocapitalize="none" spellcheck="false" placeholder="你的帳號名稱"
              readonly={submitting}
              oninput={(event) => (typedUsername = event.currentTarget.value)}
              aria-describedby={describedBy((credentialError || tooMany) && 'auth-error')} />
          </div>
          <div class="cm-field">
            <div class="cm-label"><label for="password">{credentialError ? '重新輸入密碼' : '密碼'}</label></div>
            <div class="password">
              <!-- During the lockout the field is read-only too, so what the button says and what the box does agree. -->
              <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="current-password"
                required maxlength="128" placeholder="輸入密碼"
                readonly={submitting || locked}
                onkeydown={readCapsLock} onkeyup={readCapsLock} onblur={() => (capsLock = false)}
                aria-describedby={describedBy((credentialError || locked) && 'auth-error')} />
              {@render passwordToggle()}
            </div>
            <!-- Under the field, on its own 44 px row: the Caps Lock note (when on) and password help.
                 There is no self-service reset, so the help says who does it instead of promising a mail. -->
            <div class="under">
              {@render capsNote()}
              <details class="recover" id="recover" inert={submitting}>
                <summary><span class="recover-link">忘記密碼？</span> <span class="recover-note">聯絡維護者需 GitHub 帳號</span></summary>
                <p>目前沒有自助重設。<a href={PRIVATE_REPORT_URL} rel="noopener external">在 GitHub 私密回報<span aria-hidden="true"> ↗</span></a>給維護者（表單只有維護者看得到，需要免費的 GitHub 帳號），只寫帳號名稱，不要附上密碼。</p>
              </details>
            </div>
          </div>
          <button class="cm-btn block" aria-busy={submitting} disabled={submitting || locked}>
            {#if submitting}登入中…{:else if locked}<span class="num">{remaining}</span> 秒後可再試{:else if credentialError}重新登入{:else}登入{/if}
          </button>
          {#if !tooMany}
            <p class="after"><a href={data.next}>不登入，繼續查課 <span aria-hidden="true">→</span></a></p>
          {/if}
        </form>
      {:else}
        <form method="POST" action="?/register" class="cm-form" use:enhance={submit} novalidate={hydrated || undefined} aria-busy={submitting}>
          <input type="hidden" name="next" value={data.next} />
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
              aria-describedby={describedBy('username-rule', (usernameError || checked.username) && 'username-error')} />
            <p id="username-rule" class="rule">3–32 個英文字母、數字或底線（_）。{#if checked.username === null && !usernameError}<span class="ok"><span aria-hidden="true">✓</span> {chosenName ? '已填入，送出時確認能否使用' : '格式符合'}</span>{/if}</p>
            {#if usernameError && form?.message}
              <p id="username-error" class="field-error" role="alert">{@render alertIcon('error')}{form.message}</p>
              {#if takenName}
                <!-- Two ways on: another name (one tap fills the box; whether it is free is checked on sending)
                     or signing in with this one. The button stays live, so a new name can be sent at once. -->
                <div class="taken-ways">
                  {#if hydrated}
                    <span class="suggest-label">點選填入其他名稱</span>
                    <span class="suggest-row">{#each suggestions as name (name)}<button type="button" class="suggest-chip" onclick={() => useSuggestion(name)}><span class="mono">{name}</span></button>{/each}</span>
                  {/if}
                  {#if passwordLength >= 8}<p class="rule">密碼已保留，改好帳號就能再送出。</p>{/if}
                  <a class="use-login" href={tabHref('login', takenName)}>這是你的帳號？用它登入 <span aria-hidden="true">→</span></a>
                </div>
              {/if}
            {:else if checked.username}<p id="username-error" class="field-error" role="alert">{@render alertIcon('error')}{checked.username}</p>{/if}
          </div>
          <div class="cm-field">
            <div class="cm-label near">
              <label for="password">密碼</label>
            </div>
            <div class="password">
              <input id="password" class="cm-input" name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password"
                required minlength="8" maxlength="128" placeholder="輸入密碼"
                readonly={submitting}
                onkeydown={readCapsLock} onkeyup={readCapsLock} onblur={(event) => { capsLock = false; checkPassword(event.currentTarget.value); }}
                oninput={(event) => { passwordLength = event.currentTarget.value.length; if (checked.password) checkPassword(event.currentTarget.value); }}
                aria-invalid={errorAt === 'password' || Boolean(checked.password) || undefined}
                aria-describedby={describedBy('password-rule', 'password-state', (errorAt === 'password' || checked.password) && 'password-error')} />
              {@render passwordToggle()}
            </div>
            <p id="password-rule" class="rule">8–128 字元，可用空格，區分大小寫。</p>
            <!-- Live feedback under the box (never beside the rule, where it wrapped onto the next line on phones). -->
            <div class="under">
              {@render capsNote()}
              <p id="password-state" class="rule state" aria-live="polite">
                {#if hydrated && passwordLength > 0 && passwordLength < 8}目前 <b class="num">{passwordLength}</b> 字，還差 {8 - passwordLength} 字
                {:else if checked.password === null || passwordLength >= 8}<span class="ok"><span aria-hidden="true">✓</span> 符合長度要求</span>{/if}
              </p>
            </div>
            {#if errorAt === 'password' && form?.message}{@render fieldError('password-error', 'password')}
            {:else if checked.password}<p id="password-error" class="field-error" role="alert">{checked.password}</p>{/if}
          </div>
          <!-- The optional field is a text disclosure (no frame: a frame reads as a drop zone or an empty chip). -->
          <details class="optional" open={Boolean(form && 'displayName' in form && form.displayName) || errorAt === 'displayName'}>
            <summary><span class="plus" aria-hidden="true"></span><span class="optional-label">加上顯示名稱（選填）</span></summary>
            <div class="cm-field">
              <div class="cm-label near"><label for="displayName">顯示名稱</label><span class="cm-hint">最多 50 字，之後可在設定改</span></div>
              <input id="displayName" class="cm-input" name="displayName" maxlength="50" autocomplete="nickname" placeholder="例如 小蔡"
                readonly={submitting}
                defaultValue={form && 'displayName' in form ? form.displayName : ''} aria-invalid={errorAt === 'displayName' || undefined}
                aria-describedby={describedBy(errorAt === 'displayName' && 'display-error')} />
              <p class="rule">未填時顯示帳號。</p>
              {@render fieldError('display-error', 'displayName')}
            </div>
          </details>
          <p class="terms">按下「建立帳號」即表示你同意<a href="/terms">使用條款</a>及<a href="/privacy">隱私權政策</a>。</p>
          <button class="cm-btn block" aria-busy={submitting} disabled={submitting}>{submitting ? '建立中…' : '建立帳號'}</button>
          <p class="after"><a href={data.next}>不建立帳號，繼續查課 <span aria-hidden="true">→</span></a></p>
        </form>
      {/if}
    {/if}
    <p class="pending-note" role="status" class:cm-sr={!slow}>
      {submitting ? slow ? '伺服器回應較慢，可以繼續等候或選擇繼續查課。' : mode === 'login' ? '登入中…' : '建立帳號中…' : ''}
    </p>
  </div>
</div>

<style>
  /* Desktop: the card sits in the upper middle of the column, not against the top with 250 px of floor below. */
  .auth { display: grid; place-items: center; min-block-size: min(62vh, 36rem); padding-block: clamp(0rem, 3vh, 1.5rem); }
  .card {
    inline-size: min(100%, 27rem);
    padding: var(--space-6) var(--space-6) var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel);
  }
  .auth-heading { display: flex; gap: var(--space-3); align-items: center; margin-block-end: var(--space-2); }
  .logo { flex: none; border-radius: 8px; }
  /* One heading size on every viewport: a touch above h2, below the data pages' 24 px h1. */
  h1 { font-size: 1.375rem !important; }
  .why { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: 0.8125rem; line-height: 1.6; }
  .return { margin-block-start: 2px !important; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  .return a { font-weight: 600; }
  /* Display name first, handle after, the same order as the profile page. */
  .identity { display: grid; gap: 2px; margin-block-start: var(--space-2) !important; font-size: var(--t-md); overflow-wrap: anywhere; }
  .identity strong { font-weight: 700; }
  .identity .handle { color: var(--ink-2); }
  .go-on { margin-block-start: var(--space-4); }
  .signed-in { display: grid; justify-items: start; gap: var(--space-1); margin-block-start: var(--space-3); }
  .account-links, .counts { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); }
  .signed-in a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); font-weight: 600; }
  .signed-in .counts { color: var(--ink-2); font-size: var(--t-base); }
  .signed-in .counts b { color: var(--ink); font-weight: 650; }

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
  /* While a form is on its way the other tab is not a way out: dimmed and inert. */
  .tabs[inert] a:not([aria-current]) { opacity: 0.5; }

  /* The toggle is a ghost button inside the field (one control, one border), 44 px tall. */
  .password { position: relative; display: flex; }
  .password .cm-input { padding-inline-end: 5.75rem; letter-spacing: normal; min-block-size: calc(var(--target-min) + 6px); }
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
  .toggle:disabled { color: var(--muted); cursor: default; }
  /* Fields in flight keep their text but read as settled, not editable. */
  .cm-input:read-only:not(select) { color: var(--ink-2); background: var(--panel); border-color: var(--line); }

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
  .field-error:has(.alert-icon) { display: flex; gap: var(--space-1); align-items: flex-start; padding: 0; border: 0; background: transparent; color: var(--down); }
  /* After a taken name: two suggestion chips in one row, the sign-in link on its own line (never broken mid-word). */
  .taken-ways { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: center; margin-block-start: var(--space-1); font-size: 0.8125rem; color: var(--ink-2); }
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
  .suggest-chip .mono { font-size: 1em; }
  .suggest-chip:hover { background: var(--brand-wash); border-color: var(--brand); }
  .suggest-chip:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .use-login { display: inline-flex; gap: 0.3em; align-items: center; flex-basis: 100%; min-block-size: var(--target-min); font-weight: 650; white-space: nowrap; }
  .form-alert { display: grid; gap: 2px; background: color-mix(in srgb, var(--down) 24%, var(--panel-raised)); }
  /* A wait (locked name, busy API) is not the visitor's mistake: amber and a clock, not red and a cross. */
  .form-alert.wait { border-color: var(--warn); border-inline-start-width: 4px; background: color-mix(in srgb, var(--warn) 24%, var(--panel-raised)); }
  .alert-title { display: flex; gap: var(--space-2); align-items: flex-start; font-size: var(--t-md); font-weight: 650; line-height: 1.45; }
  .alert-icon { flex: none; margin-block-start: 0.2em; color: var(--down); }
  .wait .alert-icon { color: var(--warn); }
  .alert-note, .alert-wait { margin-block-start: 2px !important; color: var(--ink-2); font-size: var(--t-base); line-height: 1.55; }
  .alert-note b { color: var(--ink); font-weight: 700; }
  .alert-wait { color: var(--ink); }
  .alert-exit { margin-block-start: var(--space-1) !important; font-size: 0.8125rem; }
  .alert-exit a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); font-weight: 650; }
  /* Links inside a tinted alert use the ink colour with an underline, which clears AA on both tints. */
  .form-alert a { color: var(--ink); text-decoration: underline; }
  .cm-form { margin-block-start: var(--space-1); }
  .cm-form .cm-btn { margin-block-start: var(--space-1); }
  .terms { margin-block-start: var(--space-1) !important; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  /* Each policy link has its own padded target. */
  .terms a { display: inline-flex; align-items: center; min-block-size: var(--target-min); padding-inline: var(--space-1); font-weight: 600; }
  .terms + .cm-btn { margin-block-start: var(--space-2); }
  .after { display: flex; justify-content: center; margin-block-start: calc(-1 * var(--space-1)) !important; text-align: center; color: var(--ink-2); font-size: 0.8125rem; }
  .after a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); color: var(--ink-2); font-weight: 600; }
  .after a:hover { color: var(--brand-ink); }
  .pending-note { margin-block-start: var(--space-1) !important; text-align: center; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.5; }
  .pending-note:empty { display: none; }
  /* 忘記密碼？ with a short note on what help means; open, the full note takes the row under it. */
  .recover { font-weight: 400; }
  .recover summary { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; min-block-size: 2rem; margin-inline-start: calc(-1 * var(--space-1)); padding-inline: var(--space-1); border-radius: var(--radius-control); font-size: 0.8125rem; list-style: none; cursor: pointer; }
  .recover-link { color: var(--brand-ink); font-weight: 600; text-decoration: underline; text-underline-offset: 0.15em; }
  .recover-note { color: var(--muted); }
  .recover[inert] .recover-link { color: var(--muted); }
  .recover summary::-webkit-details-marker { display: none; }
  .recover summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .recover[open] { flex-basis: 100%; }
  .recover[open] .recover-link { text-decoration: none; }
  .recover p { padding: var(--space-1) var(--space-1) var(--space-2); color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  .recover p a { font-weight: 600; }
  .ok { margin-inline-start: 0.4em; color: var(--up); font-weight: 700; }
  .rule.state .ok { margin-inline-start: 0; }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  /* The optional block is a text disclosure under the password field; opened, the field follows. */
  .optional summary { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; min-block-size: var(--target-min); margin-inline-start: calc(-1 * var(--space-2)); padding: 0 var(--space-2); border-radius: var(--radius-control); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .optional summary:hover { background: var(--hover-row); }
  .optional summary::-webkit-details-marker { display: none; }
  .optional .plus { display: inline-grid; place-items: center; inline-size: 1rem; margin-inline-end: 0.1rem; }
  .optional .plus::before { content: '＋'; }
  .optional[open] .plus::before { content: '－'; }
  .optional[open] summary .optional-label { color: var(--ink); }
  .optional summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .optional .cm-field { padding-block: var(--space-2) var(--space-1); }

  /* Signing out ends the session: its own small heading and explanation, then the quiet red button. */
  .switch { display: grid; gap: var(--space-1); justify-items: start; margin-block-start: var(--space-4); padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .switch-title { color: var(--ink-2); font-size: var(--t-base); font-weight: 650; }
  .switch p:not(.switch-title) { color: var(--muted); font-size: 0.8125rem; line-height: 1.6; }
  .switch .cm-btn { margin-block-start: var(--space-1); }

  @media (max-width: 40rem) {
    .auth { min-block-size: 0; padding-block: 0; }
    /* On phones the card is the page: no frame, but the same mark and heading as the desktop card. */
    .card { padding: 0; border: 0; background: transparent; }
    .recover summary { min-block-size: var(--target-min); }
    .cm-form:has(.optional) { gap: var(--space-2); }
  }
</style>
