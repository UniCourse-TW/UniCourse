<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let mode = $derived(form?.mode ?? data.mode);
  let tabHref = (target: 'login' | 'register') => {
    const params = new URLSearchParams();
    if (target === 'register') params.set('mode', 'register');
    if (data.next !== '/') params.set('next', data.next);
    const query = params.toString();
    return query ? `/auth?${query}` : '/auth';
  };
</script>

<svelte:head>
  <title>{mode === 'register' ? '註冊' : '登入'}｜UniCourse</title>
</svelte:head>

<section class="card">
  <nav class="tabs" aria-label="登入或註冊">
    <a href={tabHref('login')} aria-current={mode === 'login' ? 'page' : undefined}>登入</a>
    <a href={tabHref('register')} aria-current={mode === 'register' ? 'page' : undefined}>註冊</a>
  </nav>

  {#if mode === 'login'}
    <h1>登入 UniCourse</h1>
    <form method="POST" action="?/login" use:enhance>
      <input type="hidden" name="next" value={data.next} />
      <label>
        帳號
        <input name="username" autocomplete="username" required maxlength="32" defaultValue={form?.username ?? ''} autocapitalize="none" spellcheck="false" />
      </label>
      <label>
        密碼
        <input name="password" type="password" autocomplete="current-password" required maxlength="128" />
      </label>
      {#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
      <button>登入</button>
    </form>
    <p class="switch">還沒有帳號？<a href={tabHref('register')}>建立帳號</a></p>
  {:else}
    <h1>建立帳號</h1>
    <form method="POST" action="?/register" use:enhance>
      <input type="hidden" name="next" value={data.next} />
      <label>
        帳號
        <input
          name="username"
          autocomplete="username"
          required
          minlength="3"
          maxlength="32"
          pattern="[A-Za-z0-9_]+"
          defaultValue={form?.username ?? ''}
          autocapitalize="none"
          spellcheck="false"
          aria-describedby="username-hint"
        />
      </label>
      <p id="username-hint" class="hint">3–32 個英文字母、數字或底線，不分大小寫，之後無法更改。</p>
      <label>
        密碼
        <input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128" aria-describedby="password-hint" />
      </label>
      <p id="password-hint" class="hint">至少 8 個字元。</p>
      <label>
        顯示名稱（選填）
        <input name="displayName" maxlength="50" autocomplete="nickname" defaultValue={form && 'displayName' in form ? form.displayName : ''} />
      </label>
      {#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
      <button>註冊</button>
    </form>
    <p class="switch">已經有帳號？<a href={tabHref('login')}>直接登入</a></p>
    <p class="hint">註冊即表示同意<a href="/terms">使用條款</a>與<a href="/privacy">隱私權政策</a>。</p>
  {/if}
</section>

<style>
  .card {
    max-width: 26rem;
    margin: 0 auto;
    padding: clamp(1rem, 5vw, 2rem);
    background: white;
    border: 1px solid #e5dfef;
    border-radius: 1rem;
  }
  .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; padding: 0.25rem; border-radius: 0.6rem; background: #f1ecfb; }
  .tabs a { padding: 0.55rem; border-radius: 0.45rem; text-align: center; text-decoration: none; font-weight: 650; color: #594f69; }
  .tabs a[aria-current='page'] { background: white; color: #5630a5; box-shadow: 0 1px 2px #0001; }
  h1 { font-size: 1.35rem; margin: 1.25rem 0 0.75rem; }
  form { display: grid; gap: 0.75rem; }
  label { display: grid; gap: 0.25rem; font-weight: 650; }
  input, button {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid #aca0bc;
    border-radius: 0.45rem;
    background: white;
    color: inherit;
    font: inherit;
  }
  button { border-color: #5630a5; background: #5630a5; color: white; font-weight: 650; cursor: pointer; }
  .hint { margin: -0.5rem 0 0; color: #594f69; font-size: 0.9rem; }
  .switch { margin: 1rem 0 0; }
  .error { margin: 0; padding: 0.6rem 0.75rem; border-radius: 0.45rem; background: #fdecec; color: #8a1c1c; }
  .card > .hint { margin-top: 0.5rem; }
</style>
