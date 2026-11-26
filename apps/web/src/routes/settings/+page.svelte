<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import { initial, joinedMonth, slashDate } from '$lib/community-format';
  import { profileHref } from '$lib/community-paths';
  import { ISSUES_URL } from '$lib/institutions';
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

  let schoolNames = $derived(Object.fromEntries(data.schools.map((school) => [school.slug, school.name])));
  let previewName = $derived(current.displayName.trim() || data.profile.username);

  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  const save: SubmitFunction = () => {
    saving = true;
    clearTimeout(fadeTimer);
    return async ({ result, update }) => {
      await update({ reset: false });
      saving = false;
      if (result.type === 'success') fadeTimer = setTimeout(() => (savedVisible = false), 4000);
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
    <nav class="cm-actions sections" aria-label="設定項目">
      <a class="cm-chip" href="#public">公開資料</a>
      <a class="cm-chip" href="#account">帳號與登出</a>
    </nav>
  </header>

  <div class="layout">
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
          <!-- Without JavaScript the button is always the solid primary; with it, it only lights up once something changed. -->
          <div class="save-row">
            <button class="cm-btn" class:secondary={hydrated && !dirty && !saving} aria-busy={saving} disabled={saving}>{saving ? '儲存中…' : '儲存'}</button>
            <p class="status" role="status">
              {#if savedVisible}<span class="ok"><span aria-hidden="true">✓</span> 已儲存</span>
              {:else if hydrated && dirty}<span class="pending">有尚未儲存的變更</span>
              {:else if hydrated}<span class="idle">尚未變更</span>{/if}
            </p>
          </div>
        </form>
      </section>

      <section id="account" class="cm-panel" aria-labelledby="account-title">
        <h2 id="account-title">帳號</h2>
        <p class="lead">只有你能開啟這個管理區；帳號名稱本身仍會公開顯示。</p>
        <dl class="facts">
          <div><dt>帳號</dt><dd><span class="mono">@{data.profile.username}</span> <span class="cm-hint">建立後無法更改</span></dd></div>
          <div><dt>加入於</dt><dd class="num">{slashDate(data.profile.createdAt)}</dd></div>
          <div><dt>密碼</dt><dd>目前無法在這裡變更密碼。<span class="cm-hint">需要協助請到 <a href={ISSUES_URL} rel="noopener external">GitHub issues</a>（不要附上密碼）。</span></dd></div>
          {#if data.profile.isAdmin}<div><dt>權限</dt><dd>管理員</dd></div>{/if}
        </dl>
        <form method="POST" action="/auth?/logout" class="logout">
          <span class="cm-hint">登出只影響這個瀏覽器。</span>
          <button class="cm-btn neutral">登出</button>
        </form>
      </section>
    </div>

    <!-- Live preview of the public identity block, so the effect of each field is visible before saving. -->
    <aside class="preview" aria-labelledby="preview-title">
      <h2 id="preview-title" class="eyebrow">個人頁預覽</h2>
      <div class="preview-card">
        <span class="avatar" aria-hidden="true">{initial(previewName)}</span>
        <div class="who">
          <p class="name">{previewName}</p>
          <p class="handle">
            <span class="mono">@{data.profile.username}</span>
            {#if current.school && schoolNames[current.school]}<span class="sep">·</span>{schoolNames[current.school]}{/if}
            <span class="sep">·</span>{joinedMonth(data.profile.createdAt)}加入
          </p>
          {#if current.bio.trim()}<p class="bio">{current.bio.trim()}</p>{:else}<p class="bio empty">（沒有自我介紹）</p>{/if}
        </div>
      </div>
      <p class="preview-note">{hydrated ? '預覽會隨輸入即時更新；按「儲存」才會生效。' : '這是目前公開頁上的樣子。'}</p>
    </aside>
  </div>
</div>

<style>
  .settings .sep { margin-inline: 0.4em; color: var(--axis); }
  .sections .cm-chip { min-block-size: 2.25rem; }
  .layout { display: grid; grid-template-columns: minmax(0, 42rem) minmax(16rem, 20rem); gap: var(--space-6); align-items: start; }
  .panels { display: grid; gap: var(--space-4); min-inline-size: 0; }
  .cm-panel { scroll-margin-block-start: 5rem; }
  h2 { font-size: var(--t-lg) !important; }
  .lead { margin-block: var(--space-1) var(--space-4) !important; color: var(--muted); font-size: 0.8125rem; }
  .save-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
  .status { font-size: var(--t-base); }
  .ok { color: var(--up); font-weight: 600; }
  .pending { color: var(--warn); font-weight: 600; }
  .idle { color: var(--muted); }
  .facts { display: grid; margin: 0 0 var(--space-4); border-block-start: 1px solid var(--line); }
  .facts div { display: grid; grid-template-columns: 6rem minmax(0, 1fr); gap: var(--space-3); padding-block: var(--space-2); border-block-end: 1px solid var(--line); font-size: var(--t-base); }
  dt { color: var(--muted); }
  dd { margin: 0; }
  dd .cm-hint { display: block; }
  .logout { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; justify-content: space-between; }
  .cm-btn.neutral { color: var(--ink-2) !important; background: var(--panel-raised); border-color: var(--control-line); }
  .cm-btn.neutral:hover { background: var(--hover-row); filter: none; }

  .preview { position: sticky; inset-block-start: 5rem; display: grid; gap: var(--space-2); }
  .eyebrow { color: var(--muted) !important; font-size: var(--t-sm) !important; letter-spacing: 0 !important; }
  .preview-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .avatar { display: grid; place-items: center; inline-size: 3rem; block-size: 3rem; border-radius: 50%; color: var(--brand-ink); background: var(--brand-wash); font-size: 1.25rem; font-weight: 650; }
  .who { min-inline-size: 0; }
  .name { font-size: var(--t-lg); font-weight: 650; line-height: var(--leading-tight); overflow-wrap: anywhere; }
  .handle { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: var(--t-sm); }
  .bio { margin-block-start: var(--space-2) !important; color: var(--ink-2); font-size: var(--t-base); white-space: pre-wrap; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .bio.empty { color: var(--muted); }
  .preview-note { color: var(--muted); font-size: var(--t-sm); }

  @media (max-width: 56rem) {
    .layout { grid-template-columns: minmax(0, 1fr); }
    .preview { display: none; }
  }
  @media (max-width: 40rem) {
    .save-row .cm-btn { flex: 1 1 100%; }
    .facts div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
    .logout .cm-btn { flex: 1 1 100%; }
  }
</style>
