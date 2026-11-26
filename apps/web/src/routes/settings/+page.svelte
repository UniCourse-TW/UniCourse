<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import { slashDate } from '$lib/community-format';
  import { profileHref } from '$lib/community-paths';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let stored = $derived({
    displayName: data.profile.displayName ?? '',
    bio: data.profile.bio ?? '',
    school: data.profile.school ?? ''
  });
  // After a failed save keep what was typed; otherwise show the stored profile.
  let values = $derived(
    form && 'message' in form
      ? { displayName: form.displayName ?? '', bio: form.bio ?? '', school: form.school ?? '' }
      : stored
  );

  let hydrated = $state(false);
  let saving = $state(false);
  let current = $derived({ ...values });
  let savedVisible = $derived(Boolean(form && 'saved' in form));
  let dirty = $derived(
    current.displayName.trim() !== stored.displayName || current.bio.trim() !== stored.bio || current.school !== stored.school
  );
  onMount(() => (hydrated = true));

  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  const save: SubmitFunction = () => {
    saving = true;
    clearTimeout(fadeTimer);
    return async ({ result, update }) => {
      await update({ reset: false });
      saving = false;
      if (result.type === 'success') fadeTimer = setTimeout(() => (savedVisible = false), 3000);
    };
  };

  function onInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (target.name in current) current = { ...current, [target.name]: target.value };
    savedVisible = false;
  }

  const length = (text: string) => [...text].length;
</script>

<svelte:head>
  <title>設定｜UniCourse</title>
</svelte:head>

<div class="cm settings">
  <header class="cm-head">
    <h1>設定</h1>
    <p class="cm-dek">
      <span class="mono">@{data.profile.username}</span><span class="sep">·</span><time datetime={data.profile.createdAt}>{slashDate(data.profile.createdAt)}</time> 加入<span class="sep">·</span><a href={profileHref(data.profile.username)}>查看公開個人頁 →</a>
    </p>
  </header>

  <div class="layout">
    <nav class="side" aria-label="設定項目">
      <a href="#public">公開資料</a>
      <a href="#account">帳號</a>
    </nav>

    <div class="panels">
      <section id="public" class="cm-panel" aria-labelledby="public-title">
        <h2 id="public-title">公開資料</h2>
        <p class="lead">這些資料會顯示在你的<a href={profileHref(data.profile.username)}>個人頁</a>，以及你的評價、文章與回覆旁。</p>
        <form method="POST" class="cm-form" use:enhance={save} oninput={onInput} onchange={onInput}>
          <div class="cm-field">
            <div class="cm-label">
              <label for="displayName">顯示名稱</label>
              <span class="cm-count" aria-live="polite">{length(current.displayName)} / 50</span>
            </div>
            <input id="displayName" class="cm-input" name="displayName" maxlength="50" defaultValue={values.displayName}
              placeholder={data.profile.username} aria-describedby="displayName-hint" />
            <p id="displayName-hint" class="cm-hint">留空時顯示帳號 @{data.profile.username}。</p>
          </div>
          <div class="cm-field">
            <div class="cm-label">
              <label for="bio">自我介紹</label>
              <span class="cm-count" class:over={length(current.bio) > 500} aria-live="polite">{length(current.bio)} / 500</span>
            </div>
            <textarea id="bio" class="cm-input" name="bio" rows="3" maxlength="500" defaultValue={values.bio}
              placeholder="例如：資工系大三，喜歡演算法與系統課。"></textarea>
          </div>
          <!-- `selected` on options keeps a choice made before hydration; `value` on the select would reset it. -->
          <div class="cm-field">
            <div class="cm-label"><label for="school">所屬學校</label><span class="cm-hint">選填</span></div>
            <select id="school" class="cm-input" name="school">
              <option value="" selected={!values.school}>不顯示學校</option>
              {#each data.schools as school (school.slug)}
                <option value={school.slug} selected={school.slug === values.school}>{school.name}</option>
              {/each}
            </select>
          </div>
          {#if form && 'message' in form}<p class="cm-alert" role="alert">{form.message}</p>{/if}
          <div class="save-row">
            <button class="cm-btn" aria-busy={saving} disabled={saving || (hydrated && !dirty)}>{saving ? '儲存中…' : '儲存'}</button>
            <p class="status" role="status">
              {#if savedVisible}<span class="ok"><span aria-hidden="true">✓</span> 已儲存</span>
              {:else if hydrated && dirty}<span class="pending">有尚未儲存的變更</span>{/if}
            </p>
          </div>
        </form>
      </section>

      <section id="account" class="cm-panel" aria-labelledby="account-title">
        <h2 id="account-title">帳號</h2>
        <p class="lead">只有你看得到這一區。</p>
        <dl class="facts">
          <div><dt>帳號</dt><dd><span class="mono">@{data.profile.username}</span> <span class="cm-hint">無法更改</span></dd></div>
          <div><dt>加入於</dt><dd class="num">{slashDate(data.profile.createdAt)}</dd></div>
          <div><dt>密碼</dt><dd><span class="cm-hint">變更密碼功能尚未提供</span></dd></div>
          {#if data.profile.isAdmin}<div><dt>權限</dt><dd>管理員</dd></div>{/if}
        </dl>
        <form method="POST" action="/auth?/logout" class="logout">
          <button class="cm-btn secondary">登出</button>
          <span class="cm-hint">登出這個瀏覽器。</span>
        </form>
      </section>
    </div>
  </div>
</div>

<style>
  .settings .sep { margin-inline: 0.4em; color: var(--axis); }
  .layout { display: grid; grid-template-columns: 11rem minmax(0, 42rem); gap: var(--space-6); align-items: start; }
  .side { position: sticky; inset-block-start: 5rem; display: grid; gap: 2px; }
  .side a {
    display: flex;
    align-items: center;
    min-block-size: 2.5rem;
    padding: 0 var(--space-3);
    border-radius: var(--radius-control);
    color: var(--ink-2);
    font-size: var(--t-base);
    font-weight: 600;
    text-decoration: none;
  }
  .side a:first-child { color: var(--brand-ink); background: var(--brand-wash); }
  .side a:hover { background: var(--hover-row); }
  .panels { display: grid; gap: var(--space-4); }
  .cm-panel { scroll-margin-block-start: 5rem; }
  h2 { font-size: var(--t-lg) !important; }
  .lead { margin-block: var(--space-1) var(--space-4) !important; color: var(--muted); font-size: 0.8125rem; }
  .save-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
  .status { font-size: var(--t-base); }
  .ok { color: var(--up); font-weight: 600; }
  .pending { color: var(--warn); font-size: var(--t-sm); }
  .facts { display: grid; margin: 0 0 var(--space-4); border-block-start: 1px solid var(--line); }
  .facts div { display: grid; grid-template-columns: 6rem minmax(0, 1fr); gap: var(--space-3); padding-block: var(--space-2); border-block-end: 1px solid var(--line); font-size: var(--t-base); }
  dt { color: var(--muted); }
  dd { margin: 0; }
  .logout { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }

  @media (max-width: 48rem) {
    .layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-3); }
    .side { position: static; display: flex; gap: var(--space-2); }
    .side a { min-block-size: var(--target-min); border: 1px solid var(--line); }
  }
  @media (max-width: 40rem) {
    .side { display: none; }
    .save-row .cm-btn { flex: 1 1 100%; }
  }
</style>
