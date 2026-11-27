<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import { initial, slashDate } from '$lib/community-format';
  import { profileHref } from '$lib/community-paths';
  import ResetHelp from '$lib/legal-reset-help.svelte';
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
  onMount(() => (hydrated = true));

  let schoolNames = $derived(Object.fromEntries(data.schools.map((school) => [school.slug, school.name])));
  let previewName = $derived(current.displayName.trim() || data.profile.username);
  let previewSchool = $derived(current.school ? (schoolNames[current.school] ?? '') : '');
  // One label for what the preview shows: the draft being typed, the version just saved, or the stored one.
  let version = $derived(dirty ? '含未儲存的變更（尚未公開）' : savedVisible ? '已儲存的版本（已公開）' : '與目前公開的相同');
  let joined = $derived(slashDate(data.profile.createdAt));
  let profile = $derived(profileHref(data.profile.username));

  const save: SubmitFunction = () => {
    saving = true;
    return async ({ update }) => {
      await update({ reset: false });
      saving = false;
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

{/snippet}

<div class="cm settings">
  <header class="cm-head">
    <h1>設定</h1>
    <p class="cm-dek">
      <span class="who-line mono">@{data.profile.username}</span>
      <!-- The header keeps the same links in every state, so saving never moves the page. -->
      <span class="sep dek-sep">·</span><a class="dek-link" href={profile}>查看已公開的個人頁 <span aria-hidden="true">→</span></a>
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
          <input id="displayName" class="cm-input" name="displayName" maxlength="50" readonly={saving} defaultValue={values.displayName}
            placeholder={data.profile.username} aria-describedby="displayName-hint" />
          <p id="displayName-hint" class="cm-hint">留空時顯示帳號 @{data.profile.username}。</p>
        </div>
        <div class="cm-field">
          <div class="cm-label">
            <label for="bio">自我介紹</label>
            <span class="cm-count" class:over={length(current.bio) > 500} aria-live="polite">{length(current.bio)} / 500</span>
          </div>
          <textarea id="bio" class="cm-input" name="bio" rows="3" maxlength="500" readonly={saving} defaultValue={values.bio}
            placeholder="例如：資工系大三，喜歡演算法與系統課。" aria-describedby="bio-hint"></textarea>
          <p id="bio-hint" class="cm-hint">只顯示在公開個人頁。</p>
        </div>
        <div class="cm-field">
          <div class="cm-label"><label for="school">所屬學校</label><span class="cm-hint">選填</span></div>
          <!-- A plain select: the list is short, and only a listed school can be saved.
               `selected` on the options keeps a choice made before hydration. -->
          <span class="select-wrap">
            <select id="school" class="cm-input" name="school" disabled={saving} aria-describedby="school-hint">
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
        <!-- Button and its state on one line: why it is greyed out, what is unsaved, or the saved result with
             the one link to the updated profile (the header link steps aside meanwhile). -->
        <div class="save-row">
          <button class="cm-btn" aria-busy={saving} disabled={saving || (hydrated && !dirty)}>{saving ? '儲存中…' : '儲存'}</button>
          <div class="status" role="status">
            {#if saving}<span class="cm-sr">儲存中…</span>
            {:else if savedVisible}
              <!-- One success message, then the updated page as its own full-size link. -->
              <span class="ok"><span aria-hidden="true">✓</span><span>已儲存，個人頁已更新</span></span>
              <a class="see" href={profile}>查看更新後的個人頁 <span aria-hidden="true">→</span></a>
            {:else if hydrated && dirty}<span class="pending">有 {changes} 項變更尚未儲存</span><span class="preview-note">預覽已即時更新</span>
            {:else if hydrated}<span class="idle">尚未變更，修改後才能儲存</span>{/if}
          </div>
        </div>
        <!-- Phones: the preview folds under the save line, its summary saying which version it shows. -->
        <details class="preview-fold">
          <summary>{dirty ? '預覽變更後的個人頁' : '預覽個人頁'} <span class="version" class:draft={dirty}>{version}</span><span class="chev" aria-hidden="true">▾</span></summary>
          {@render previewCard()}
        </details>
      </form>
    </section>

    <aside class="preview" aria-labelledby="preview-title">
      <div class="preview-heading">
        <h2 id="preview-title">個人頁預覽</h2>
        <span class="version" class:draft={dirty}>{version}</span>
      </div>
      {@render previewCard()}
    </aside>

    <section id="account" class="cm-panel" aria-labelledby="account-title" tabindex="-1">
      <h2 id="account-title">帳號</h2>
      <p class="lead">管理資訊僅自己可見，帳號名稱公開。</p>
      <!-- The facts first, then the two things to do (password help, sign out) side by side. -->
      <dl class="facts">
        <div><dt>帳號</dt><dd><span class="mono">@{data.profile.username}</span><span class="cm-hint fixed">建立後無法更改</span></dd></div>
        <div><dt>加入於</dt><dd class="num">{joined}</dd></div>
        {#if data.profile.isAdmin}<div><dt>權限</dt><dd>管理員</dd></div>{/if}
        <div class="account-action">
          <dt>工作階段</dt>
          <dd>
            <p class="cm-hint">只登出這個瀏覽器。</p>
            <form method="POST" action="/auth?/logout"><button class="cm-btn leave">登出</button></form>
          </dd>
        </div>
        <div class="reset-row">
          <dt>密碼</dt>
          <dd><ResetHelp summary="重設密碼：由維護者手動處理" id="settings-reset" align="start" /></dd>
        </div>
      </dl>
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
  .preview-fold summary { display: flex; gap: var(--space-1) var(--space-2); flex-wrap: wrap; align-items: center; min-block-size: var(--target-min); padding-block: var(--space-1); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .preview-fold .chev { margin-inline-start: auto; }
  .preview-fold summary::-webkit-details-marker { display: none; }
  .preview-fold[open] .chev { rotate: 180deg; }
  .preview-fold .preview-card { margin-block: var(--space-1) var(--space-2); }
  .layout { display: grid; grid-template-columns: minmax(0, 6fr) minmax(18rem, 5fr); grid-template-rows: auto 1fr; gap: var(--space-4); align-items: start; }
  #public { grid-column: 1; grid-row: 1 / span 2; }
  #account { grid-column: 2; grid-row: 2; }
  .cm-panel { min-inline-size: 0; scroll-margin-block-start: 5rem; }
  h2 { font-size: var(--t-lg) !important; }
  .lead { margin-block: var(--space-1) var(--space-4) !important; color: var(--muted); font-size: 0.8125rem; line-height: 1.6; }
  /* The select looks like the other inputs, with one chevron at its end. */
  .select-wrap { position: relative; display: block; }
  .select-wrap select { appearance: none; padding-inline-end: 2.5rem; cursor: pointer; }
  .select-wrap .chev { position: absolute; inset-block-start: 50%; inset-inline-end: var(--space-3); translate: 0 -50%; color: var(--ink-2); pointer-events: none; }
  .save-row { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }
  .save-row .cm-btn { min-inline-size: 6rem; }
  /* The status takes the rest of the button's row; a second item (the profile link) wraps inside it. */
  .status { display: flex; flex: 1 1 10rem; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; min-block-size: var(--target-min); font-size: 0.8125rem; }
  .ok { display: inline-flex; gap: 0.3em; align-items: center; padding: 0 var(--space-2); border-radius: var(--radius-pill); color: var(--up); background: color-mix(in srgb, var(--up) var(--status-tint), var(--panel-raised)); font-size: var(--t-base); font-weight: 650; line-height: 1.9; }
  .see { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); font-size: var(--t-base); font-weight: 600; }
  .preview-note { color: var(--ink-2); }
  @media (max-width: 56rem) { .preview-note { display: none; } }
  .pending { color: var(--warn); font-weight: 600; }
  .idle { color: var(--ink-2); }
  /* The character count sits at the field's right edge (label left, limit right), readable in both themes. */
  .settings .cm-label { justify-content: space-between; gap: 0 var(--space-3); }
  .settings .cm-count { color: var(--ink-2); font-size: 0.8125rem; font-variant-numeric: tabular-nums; }
  .settings .cm-field > .cm-hint { color: var(--ink-2); font-size: 0.8125rem; }
  .facts { display: grid; margin: 0; border-block-start: 1px solid var(--line); }
  .facts div { display: grid; grid-template-columns: 5rem minmax(0, 1fr); gap: var(--space-3); padding-block: var(--space-2); border-block-end: 1px solid var(--line); font-size: var(--t-base); }
  dt { color: var(--muted); }
  dd { margin: 0; }
  dd .cm-hint { display: block; }
  .account-action { align-items: baseline; }
  .account-action dd { display: flex; gap: var(--space-1) var(--space-3); flex-wrap: wrap; align-items: center; justify-content: space-between; }
  .reset-row { grid-template-columns: 5rem minmax(0, 1fr); }
  .reset-row dd { min-inline-size: 0; }
  .preview { grid-column: 2; grid-row: 1; display: grid; gap: var(--space-2); padding: var(--space-4) var(--space-5); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .preview .preview-card { background: var(--panel-raised); }
  .preview-heading { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: center; }
  .version { display: inline-block; padding: 0 6px; border-radius: var(--radius-pill); color: var(--ink-2); background: var(--chip); font-size: var(--t-sm); font-weight: 600; white-space: nowrap; }
  .version.draft { color: var(--warn); background: var(--warn-wash); }
  /* Saved: the preview keeps its ordinary frame; the one success signal is the status beside the button. */
  .preview-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .avatar { display: grid; place-items: center; inline-size: 3rem; block-size: 3rem; border-radius: 50%; color: var(--brand-ink); background: var(--brand-wash); font-size: 1.25rem; font-weight: 650; }
  .who { min-inline-size: 0; }
  .name { font-size: var(--t-lg); font-weight: 650; line-height: var(--leading-tight); overflow-wrap: anywhere; }
  .handle { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: var(--t-sm); }
  .bio { margin-block-start: var(--space-2) !important; color: var(--ink-2); font-size: var(--t-base); white-space: pre-wrap; overflow-wrap: anywhere; }
  .bio.empty { color: var(--muted); }

  @media (max-width: 56rem) {
    .layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    #public, #account { grid-column: 1; grid-row: auto; }
    .preview { display: none; }
    .preview-fold { display: block; min-inline-size: 0; margin-block-start: calc(-1 * var(--space-2)); border-block-start: 1px solid var(--line); }
    .jump-link { display: inline-flex; }
    .cm-panel { scroll-margin-block-start: 5rem; }
  }
  @media (max-width: 40rem) {
    .cm-dek .dek-sep { display: none; }
    /* The handle on its own line; the two links share the next one. */
    .who-line { flex-basis: 100%; }
    .cm-dek .dek-link { min-block-size: var(--target-min); margin-inline-end: var(--space-2); }
    /* Label left (small, muted), value right: four short rows instead of eight stacked lines. */
    .facts div { grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); align-items: center; }
    .facts dt { font-size: var(--t-sm); }
    .facts dd { text-align: end; }
    /* The fixed-name note goes under the handle, so a long handle keeps its line. */
    .facts dd .cm-hint.fixed { display: block; font-size: var(--t-sm); }
    .account-action dd { justify-content: end; }
    .account-action dd .cm-hint { display: none; }
    .facts .reset-row { grid-template-columns: minmax(0, 1fr); gap: 0; }
    .facts .reset-row dt { display: none; }
    .facts .reset-row dd { text-align: start; }
  }
</style>
