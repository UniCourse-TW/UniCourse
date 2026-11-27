<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import { initial, slashDate } from '$lib/community-format';
  import { profileHref } from '$lib/community-paths';
  import { PRIVATE_REPORT_URL } from '$lib/legal-contact';
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
  let changes = $derived(
    [current.displayName.trim() !== stored.displayName, current.bio.trim() !== stored.bio, current.school !== stored.school].filter(Boolean).length
  );
  let dirty = $derived(changes > 0);
  onMount(() => {
    hydrated = true;
    return () => clearTimeout(fadeTimer);
  });

  let schoolNames = $derived(Object.fromEntries(data.schools.map((school) => [school.slug, school.name])));
  let previewName = $derived(current.displayName.trim() || data.profile.username);
  let previewSchool = $derived(current.school ? (schoolNames[current.school] ?? '') : '');
  let joined = $derived(slashDate(data.profile.createdAt));
  let profile = $derived(profileHref(data.profile.username));

  let savedRecently = $state(false);
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  const save: SubmitFunction = () => {
    saving = true;
    savedRecently = false;
    clearTimeout(fadeTimer);
    return async ({ result, update }) => {
      await update({ reset: false });
      saving = false;
      if (result.type === 'success') {
        savedRecently = true;
        fadeTimer = setTimeout(() => (savedRecently = false), 2000);
      }
    };
  };

  function onInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (target.name in current) current = { ...current, [target.name]: target.value };
    savedVisible = false;
    savedRecently = false;
  }

  const length = (text: string) => [...text].length;
</script>

<svelte:head>
  <title>設定｜UniCourse</title>
</svelte:head>

<!-- The identity block exactly as the public profile draws it: no school line when none is chosen. -->
{#snippet previewCard()}
  <div class="preview-card">
    <span class="avatar" aria-hidden="true">{initial(previewName)}</span>
    <div class="who">
      <p class="name">{previewName}</p>
      <p class="handle"><span class="mono">@{data.profile.username}</span>{#if previewSchool}<span class="sep">·</span>{previewSchool}{/if}</p>
      {#if current.bio.trim()}<p class="bio">{current.bio.trim()}</p>{:else}<p class="bio empty">（沒有自我介紹）</p>{/if}
    </div>
  </div>
  <p class="preview-note">
    {#if hydrated && dirty}<span class="unsaved">未儲存</span> 含你剛改的內容，按「儲存」後才會公開。
    {:else if savedVisible}<span class="published">✓ 已更新</span> 目前公開版本。
    {:else}目前公開版本。{/if}
  </p>
{/snippet}

<div class="cm settings">
  <header class="cm-head">
    <h1>設定</h1>
    <p class="cm-dek">
      <span class="who-line mono">@{data.profile.username}</span><span class="sep dek-sep">·</span><a class="dek-link" href={profile}>查看已公開的個人頁 <span aria-hidden="true">→</span></a>
      <!-- Phones stack the panels; this in-page jump (muted, unlike the link beside it) goes to the account panel. -->
      <a class="dek-link jump-link" href="#account">帳號與登出 <span aria-hidden="true">↓</span></a>
    </p>
  </header>

  <div class="layout">
    <section id="public" class="cm-panel" aria-labelledby="public-title" tabindex="-1">
      <h2 id="public-title">公開資料</h2>
      <p class="lead">顯示名稱用於<a href={profile}>公開個人頁</a>與社群署名。</p>
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
            placeholder="例如：資工系大三，喜歡演算法與系統課。" aria-describedby="bio-hint"></textarea>
          <p id="bio-hint" class="cm-hint">只顯示在公開個人頁。</p>
        </div>
        <div class="cm-field">
          <div class="cm-label"><label for="school">所屬學校</label><span class="cm-hint">選填</span></div>
          <!-- A plain select: the list is short, and only a listed school can be saved.
               `selected` on the options keeps a choice made before hydration. -->
          <span class="select-wrap">
            <select id="school" class="cm-input" name="school" aria-describedby="school-hint">
              <option value="" selected={!values.school}>不顯示學校</option>
              {#each data.schools as school (school.slug)}
                <option value={school.slug} selected={school.slug === values.school}>{school.name}</option>
              {/each}
            </select>
            <span class="chev" aria-hidden="true">▾</span>
          </span>
          <p id="school-hint" class="cm-hint">只顯示在個人頁，不會出現在評價或文章旁。</p>
        </div>
        {#if form && 'message' in form}<p class="cm-alert" role="alert">{form.message}</p>{/if}
        <!-- Keep feedback below the save button as it changes from draft to published. -->
        <div class="save-row">
          <button class="cm-btn" aria-busy={saving} disabled={saving || (hydrated && !dirty)}>{saving ? '儲存中…' : savedRecently ? '已儲存 ✓' : '儲存'}</button>
          <p class="status" role="status">
            {#if saving}<span class="idle">儲存中…</span>
            {:else if savedVisible}<span class="ok"><span aria-hidden="true">✓</span> 已儲存，個人頁已更新</span> <a class="status-link" href={profile}>開啟公開頁 <span aria-hidden="true">→</span></a>
            {:else if hydrated && dirty}<span class="pending">有 {changes} 項變更尚未儲存</span>
            {:else if hydrated}<span class="idle">尚未變更，修改後才能儲存</span>{/if}
          </p>
        </div>
      </form>
    </section>

    <details class="preview-fold">
      <summary>{hydrated && dirty ? '展開草稿預覽' : '展開個人頁預覽'} <span class="chev" aria-hidden="true">▾</span></summary>
      {@render previewCard()}
    </details>

    <aside class="preview" aria-labelledby="preview-title">
      <h2 id="preview-title" class="eyebrow">個人頁預覽</h2>
      {@render previewCard()}
    </aside>

    <section id="account" class="cm-panel" aria-labelledby="account-title" tabindex="-1">
      <h2 id="account-title">帳號</h2>
      <p class="lead">只有你能開啟這個管理區；帳號名稱本身仍會公開顯示。</p>
      <!-- The facts first, then the two things to do (password help, sign out) side by side. -->
      <dl class="facts">
        <div><dt>帳號</dt><dd><span class="mono">@{data.profile.username}</span> <span class="cm-hint">建立後無法更改</span></dd></div>
        <div><dt>加入於</dt><dd class="num">{joined}</dd></div>
        {#if data.profile.isAdmin}<div><dt>權限</dt><dd>管理員</dd></div>{/if}
      </dl>
      <div class="acts">
        <div class="act">
          <p class="act-title">重設密碼</p>
          <p class="cm-hint">目前由維護者協助重設，私密聯絡需免費的 GitHub 帳號。</p>
          <a class="cm-btn neutral" href={PRIVATE_REPORT_URL} rel="noopener external">到 GitHub 私密聯絡 <span aria-hidden="true">↗</span><span class="cm-sr">（外部網站）</span></a>
        </div>
        <form method="POST" action="/auth?/logout" class="act logout">
          <p class="act-title">登出</p>
          <p class="cm-hint">只登出這個瀏覽器。</p>
          <button class="cm-btn leave">登出</button>
        </form>
      </div>
    </section>
  </div>
</div>

<style>
  .settings .sep { margin-inline: 0.4em; color: var(--axis); }
  .cm-dek { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-3); }
  .dek-link { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: 2rem; }
  .jump-link { display: none; color: var(--ink-2) !important; font-weight: 600; }
  .cm-panel:focus { outline: none; }
  .cm-panel:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .preview-fold { display: none; }
  .preview-fold summary { display: inline-flex; gap: var(--space-1); align-items: center; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .preview-fold summary::-webkit-details-marker { display: none; }
  .preview-fold[open] .chev { rotate: 180deg; }
  .preview-fold[open] { display: grid; gap: var(--space-2); }
  .layout { display: grid; grid-template-columns: minmax(0, 34rem) minmax(18rem, 30rem); grid-template-rows: auto 1fr; gap: var(--space-4); align-items: start; }
  #public { grid-column: 1; grid-row: 1 / span 2; }
  #account { grid-column: 2; grid-row: 2; }
  .cm-panel { min-inline-size: 0; scroll-margin-block-start: 5rem; }
  h2 { font-size: var(--t-lg) !important; }
  .lead { margin-block: var(--space-1) var(--space-4) !important; color: var(--muted); font-size: 0.8125rem; line-height: 1.6; }
  /* The select looks like the other inputs, with one chevron at its end. */
  .select-wrap { position: relative; display: block; }
  .select-wrap select { appearance: none; padding-inline-end: 2.5rem; cursor: pointer; }
  .select-wrap .chev { position: absolute; inset-block-start: 50%; inset-inline-end: var(--space-3); translate: 0 -50%; color: var(--ink-2); pointer-events: none; }
  .save-row { display: grid; gap: var(--space-1); justify-items: start; }
  .save-row .cm-btn { min-inline-size: 7.5rem; }
  .save-row .cm-btn:disabled:not([aria-busy='true']) { background: transparent; border-color: var(--control-line); }
  .status { display: flex; flex-wrap: wrap; min-block-size: var(--target-min); gap: var(--space-1) var(--space-2); align-items: center; font-size: var(--t-base); }
  .ok { display: inline-flex; gap: 0.3em; align-items: center; padding: 0 var(--space-2); border-radius: var(--radius-pill); color: var(--up); background: color-mix(in srgb, var(--up) var(--status-tint), var(--panel-raised)); font-weight: 600; line-height: 1.9; }
  .status-link { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); font-weight: 600; }
  .pending { color: var(--warn); font-weight: 600; }
  .idle { color: var(--ink-2); }
  .facts { display: grid; margin: 0 0 var(--space-4); border-block-start: 1px solid var(--line); }
  .facts div { display: grid; grid-template-columns: 5rem minmax(0, 1fr); gap: var(--space-3); padding-block: var(--space-2); border-block-end: 1px solid var(--line); font-size: var(--t-base); }
  dt { color: var(--muted); }
  dd { margin: 0; }
  dd .cm-hint { display: block; }
  .acts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: var(--space-3); }
  .act { display: grid; gap: var(--space-1); align-content: start; justify-items: start; padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); }
  .act-title { color: var(--ink); font-size: var(--t-base); font-weight: 650; }
  .act .cm-hint { line-height: 1.55; }
  .act .cm-btn { margin-block-start: auto; padding-block-start: 0; }
  .act .cm-hint + .cm-btn { margin-block-start: var(--space-1); }
  .cm-btn.neutral { color: var(--ink-2) !important; background: var(--panel-raised); border-color: var(--control-line); }
  .cm-btn.neutral:hover { background: var(--hover-row); filter: none; }

  .preview { grid-column: 2; grid-row: 1; display: grid; gap: var(--space-2); padding: var(--space-4) var(--space-5); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .preview .preview-card { background: var(--panel-raised); }
  .eyebrow { color: var(--muted) !important; font-size: var(--t-sm) !important; letter-spacing: 0 !important; }
  .preview-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .avatar { display: grid; place-items: center; inline-size: 3rem; block-size: 3rem; border-radius: 50%; color: var(--brand-ink); background: var(--brand-wash); font-size: 1.25rem; font-weight: 650; }
  .who { min-inline-size: 0; }
  .name { font-size: var(--t-lg); font-weight: 650; line-height: var(--leading-tight); overflow-wrap: anywhere; }
  .handle { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: var(--t-sm); }
  .bio { margin-block-start: var(--space-2) !important; color: var(--ink-2); font-size: var(--t-base); white-space: pre-wrap; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .bio.empty { color: var(--muted); }
  .preview-note { color: var(--ink-2); font-size: var(--t-sm); line-height: 1.5; }
  .published { color: var(--up); font-weight: 600; }
  .unsaved { display: inline-block; padding: 0 6px; border-radius: var(--radius-pill); color: var(--warn); background: var(--warn-wash); font-weight: 600; }

  @media (max-width: 56rem) {
    .layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    #public, #account { grid-column: 1; grid-row: auto; }
    .preview { display: none; }
    .preview-fold { display: block; }
    .preview-fold[open] { display: grid; }
    .jump-link { display: inline-flex; }
    .cm-panel { scroll-margin-block-start: var(--space-4); }
  }
  @media (max-width: 40rem) {
    .cm-dek .dek-sep { display: none; }
    /* The handle on its own line; the two links share the next one. */
    .who-line { flex-basis: 100%; }
    .cm-dek .dek-link { min-block-size: var(--target-min); margin-inline-end: var(--space-2); }
    .facts div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
    .act .cm-btn { justify-self: stretch; }
  }
</style>
