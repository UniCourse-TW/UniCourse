<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount, tick } from 'svelte';
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
  onMount(() => (hydrated = true));

  let schoolNames = $derived(Object.fromEntries(data.schools.map((school) => [school.slug, school.name])));
  let previewName = $derived(current.displayName.trim() || data.profile.username);
  let joined = $derived(slashDate(data.profile.createdAt));

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

  // ---- School: one combobox over 147 schools (name, short form 清大 → 國立清華大學, English name, slug).
  // Without JavaScript the native <select> below does the same job.
  type SchoolRow = { name: string; nameEn?: string | null; slug: string };
  const NO_SCHOOL: SchoolRow = { slug: '', name: '不顯示學校' };
  const SHOWN = 8;
  let schoolQuery = $state('');
  let listOpen = $state(false);
  let activeIndex = $state(-1);
  let combo = $state<HTMLInputElement>();
  function matches(school: SchoolRow, query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (school.slug.includes(q) || (school.nameEn ?? '').toLowerCase().includes(q)) return true;
    // Characters in order, so 清大 and 臺科 match the full Chinese name.
    let at = 0;
    for (const char of school.name) if (char === q[at]) at += 1;
    return at === q.length;
  }
  let hits = $derived(data.schools.filter((school) => matches(school, schoolQuery)));
  // The empty query lists 不顯示學校 first; a typed query lists schools only.
  let options = $derived<SchoolRow[]>(schoolQuery.trim() ? hits.slice(0, SHOWN) : [NO_SCHOOL, ...hits.slice(0, SHOWN - 1)]);
  let selectedName = $derived(current.school ? (schoolNames[current.school] ?? current.school) : '');
  // The tick and × show only while the box still reads the chosen school's name.
  let showsChoice = $derived(Boolean(current.school) && schoolQuery === selectedName);
  // The box shows the chosen school until the visitor starts typing again.
  onMount(() => {
    schoolQuery = selectedName;
  });
  function openList() {
    listOpen = true;
    activeIndex = -1;
  }
  function closeList() {
    listOpen = false;
    activeIndex = -1;
  }
  function toggleList() {
    if (listOpen) closeList();
    else openList();
    combo?.focus();
  }
  function choose(school: SchoolRow) {
    current = { ...current, school: school.slug };
    schoolQuery = school.slug ? school.name : '';
    savedVisible = false;
    closeList();
  }
  function clearSchool() {
    choose(NO_SCHOOL);
    combo?.focus();
  }
  function onComboInput(event: Event) {
    event.stopPropagation();
    openList();
    // Typing only searches; the chosen school stays until a new one is picked or the box is emptied.
    if (current.school && !schoolQuery.trim()) {
      current = { ...current, school: '' };
      savedVisible = false;
    }
  }
  function onComboBlur(event: FocusEvent) {
    const next = event.relatedTarget as HTMLElement | null;
    if (next?.closest('.school-list, .combo-toggle')) return;
    closeList();
    // Leaving without picking: the box goes back to what is actually chosen (or stays empty).
    if (!schoolQuery.trim()) {
      if (current.school) current = { ...current, school: '' };
      schoolQuery = '';
    } else if (schoolQuery !== selectedName) {
      schoolQuery = selectedName;
    }
  }
  async function onComboKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (listOpen) event.preventDefault();
      schoolQuery = selectedName;
      closeList();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!listOpen) openList();
      await tick();
      const count = options.length;
      if (!count) return;
      activeIndex = event.key === 'ArrowDown' ? (activeIndex + 1) % count : (activeIndex - 1 + count) % count;
      return;
    }
    if (event.key === 'Enter') {
      if (!listOpen) return;
      event.preventDefault();
      const pick = options[activeIndex] ?? (options.length === 1 ? options[0] : null);
      if (pick) choose(pick);
    }
  }
</script>

<svelte:head>
  <title>設定｜UniCourse</title>
</svelte:head>

{#snippet previewCard()}
  <div class="preview-card">
    <span class="avatar" aria-hidden="true">{initial(previewName)}</span>
    <div class="who">
      <p class="name">{previewName}</p>
      <p class="handle">
        <span class="mono">@{data.profile.username}</span>
        {#if current.school && schoolNames[current.school]}<span class="sep">·</span>{schoolNames[current.school]}{/if}
        <span class="sep">·</span><span class="num">{joined}</span> 加入
      </p>
      {#if current.bio.trim()}<p class="bio">{current.bio.trim()}</p>{:else}<p class="bio empty">（沒有自我介紹）</p>{/if}
    </div>
  </div>
  <p class="preview-note">
    {#if hydrated && dirty}<span class="unsaved">未儲存</span> 預覽含你剛改的內容，按「儲存」後才會公開。
    {:else}與目前公開的個人頁相同{#if hydrated}；修改欄位時這裡會先變{/if}。{/if}
  </p>
{/snippet}

<div class="cm settings">
  <header class="cm-head">
    <h1>設定</h1>
    <p class="cm-dek">
      <span class="who-line"><span class="mono">@{data.profile.username}</span><span class="sep">·</span><time class="num" datetime={data.profile.createdAt}>{joined}</time> 加入</span><span class="sep dek-sep">·</span><a class="dek-link" href={profileHref(data.profile.username)}>查看已公開的個人頁 <span aria-hidden="true">→</span></a>
    </p>
  </header>

  <div class="layout">
    <section id="public" class="cm-panel" aria-labelledby="public-title" tabindex="-1">
      <div class="panel-head">
        <h2 id="public-title">公開資料</h2>
        <!-- Phones stack the two panels; this takes you straight to the second one. -->
        <a class="jump-link" href="#account">帳號與登出 <span aria-hidden="true">↓</span></a>
      </div>
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
        <div class="cm-field">
          <div class="cm-label"><label for="school">所屬學校</label><span class="cm-hint">選填 · 從清單選取</span></div>
          {#if hydrated}
            <!-- A searchable list, not a free text box: the chevron opens it and only a picked row is saved. -->
            <div class="combo" class:chosen={showsChoice}>
              <input bind:this={combo} id="school" class="cm-input" type="text" role="combobox" autocomplete="off" spellcheck="false"
                placeholder="搜尋並選取學校，例如 清大" aria-expanded={listOpen} aria-controls="school-list" aria-autocomplete="list"
                aria-activedescendant={listOpen && activeIndex >= 0 ? `school-opt-${activeIndex}` : undefined}
                aria-describedby="school-hint" bind:value={schoolQuery}
                onfocus={openList} onclick={openList} oninput={onComboInput} onblur={onComboBlur} onkeydown={onComboKey} />
              {#if showsChoice}
                <span class="tick" aria-hidden="true">✓</span>
                <button type="button" class="clear" aria-label="清除學校，改為不顯示" onclick={clearSchool}><span aria-hidden="true">×</span></button>
              {/if}
              <button type="button" class="combo-toggle" aria-label={listOpen ? '收合學校清單' : '展開學校清單'} aria-expanded={listOpen} aria-controls="school-list" tabindex="-1" onmousedown={(event) => event.preventDefault()} onclick={toggleList}><span class="chev" aria-hidden="true">▾</span></button>
              <input type="hidden" name="school" value={current.school} />
              <ul id="school-list" class="school-list" role="listbox" aria-label="符合的學校" hidden={!listOpen}>
                {#each options as school, index (school.slug)}
                  <!-- Keyboard choice happens on the combobox input (arrows + Enter), as the ARIA pattern prescribes. -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <li id="school-opt-{index}" role="option" aria-selected={school.slug === current.school} class:active={index === activeIndex} class:none-row={!school.slug}
                    onmousedown={(event) => event.preventDefault()} onclick={() => choose(school)}>
                    <span class="opt-name">{school.name}</span>
                    {#if school.nameEn}<span class="opt-en">{school.nameEn}</span>{/if}
                  </li>
                {/each}
                {#if schoolQuery.trim() && hits.length === 0}
                  <li class="note" role="presentation">找不到符合的學校。清空後可選「不顯示學校」，或改用英文名、簡稱再試。</li>
                {:else if hits.length > (schoolQuery.trim() ? SHOWN : SHOWN - 1)}
                  <li class="note" role="presentation">還有 {hits.length - (schoolQuery.trim() ? SHOWN : SHOWN - 1)} 所；繼續輸入可縮小範圍。</li>
                {/if}
              </ul>
            </div>
            <p id="school-hint" class="cm-hint" aria-live="polite">
              {#if showsChoice}已選 {selectedName}；按 × 可改為不顯示。{:else if current.school}目前仍是 {selectedName}；從清單選另一所才會更換，清空則不顯示。{:else}輸入校名、簡稱或英文名後從清單選一所；留空則不顯示學校。{/if}
            </p>
          {:else}
            <!-- `selected` on options keeps a choice made before hydration; `value` on the select would reset it. -->
            <select id="school" class="cm-input" name="school">
              <option value="" selected={!values.school}>不顯示學校</option>
              {#each data.schools as school (school.slug)}
                <option value={school.slug} selected={school.slug === values.school}>{school.name}</option>
              {/each}
            </select>
          {/if}
        </div>
        {#if form && 'message' in form}<p class="cm-alert" role="alert">{form.message}</p>{/if}
        <!-- Phones have no side column: the same preview folds open here, next to the button that publishes it. -->
        <details class="preview-fold">
          <summary>{hydrated && dirty ? '預覽未儲存的變更' : '預覽個人頁'} <span class="chev" aria-hidden="true">▾</span></summary>
          {@render previewCard()}
        </details>
        <!-- One status line for every outcome, beside the button it describes. Without JavaScript the
             button is always the solid primary; with it, it only lights up once something changed. -->
        <div class="save-row">
          <button class="cm-btn" aria-busy={saving} disabled={saving || (hydrated && !dirty)}>{saving ? '儲存中…' : '儲存'}</button>
          <p class="status" role="status">
            {#if saving}<span class="idle">儲存中…</span>
            {:else if savedVisible}<span class="ok"><span aria-hidden="true">✓</span> 已儲存，個人頁已更新</span>
            {:else if hydrated && dirty}<span class="pending">有 {changes} 項變更尚未儲存</span>
            {:else if hydrated}<span class="idle">尚未變更，修改後才能儲存</span>{/if}
          </p>
        </div>
      </form>
    </section>

    <div class="side">
      <!-- Live preview of the public identity block, so the effect of each field is visible before saving. -->
      <aside class="preview" aria-labelledby="preview-title">
        <h2 id="preview-title" class="eyebrow">個人頁預覽</h2>
        {@render previewCard()}
      </aside>

      <section id="account" class="cm-panel" aria-labelledby="account-title" tabindex="-1">
        <h2 id="account-title">帳號</h2>
        <p class="lead">只有你能開啟這個管理區；帳號名稱本身仍會公開顯示。</p>
        <dl class="facts">
          <div><dt>帳號</dt><dd><span class="mono">@{data.profile.username}</span> <span class="cm-hint">建立後無法更改</span></dd></div>
          <div><dt>加入於</dt><dd class="num">{joined}</dd></div>
          <div>
            <dt>密碼</dt>
            <dd>尚未提供自行變更。<span class="cm-hint">需要重設時，<a href={PRIVATE_REPORT_URL} rel="noopener external">私密回報給維護者<span aria-hidden="true"> ↗</span></a>，只寫帳號名稱。</span></dd>
          </div>
          {#if data.profile.isAdmin}<div><dt>權限</dt><dd>管理員</dd></div>{/if}
        </dl>
        <form method="POST" action="/auth?/logout" class="logout">
          <span class="cm-hint">登出只影響這個瀏覽器。</span>
          <button class="cm-btn neutral">登出</button>
        </form>
      </section>
    </div>
  </div>
</div>

<style>
  .settings .sep { margin-inline: 0.4em; color: var(--axis); }
  .cm-dek { display: flex; flex-wrap: wrap; align-items: center; }
  .dek-link { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: 2rem; }
  .cm-panel:focus { outline: none; }
  .cm-panel:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .panel-head { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: baseline; justify-content: space-between; }
  .jump-link { display: none; gap: 0.3em; align-items: center; min-block-size: 2rem; font-size: var(--t-sm); font-weight: 600; }
  .preview-fold { display: none; }
  .preview-fold summary { display: inline-flex; gap: var(--space-1); align-items: center; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .preview-fold summary::-webkit-details-marker { display: none; }
  .preview-fold[open] .chev { rotate: 180deg; }
  .preview-fold[open] { display: grid; gap: var(--space-2); }
  .layout { display: grid; grid-template-columns: minmax(0, 42rem) minmax(18rem, 1fr); gap: var(--space-5); align-items: start; }
  .side { display: grid; gap: var(--space-5); min-inline-size: 0; }
  .cm-panel { min-inline-size: 0; scroll-margin-block-start: 5rem; }
  h2 { font-size: var(--t-lg) !important; }
  .lead { margin-block: var(--space-1) var(--space-4) !important; color: var(--muted); font-size: 0.8125rem; }
  .save-row { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }
  .status { font-size: var(--t-sm); }
  .ok { color: var(--up); font-weight: 600; }
  .pending { color: var(--warn); font-weight: 600; }
  .idle { color: var(--muted); }
  .facts { display: grid; margin: 0 0 var(--space-4); border-block-start: 1px solid var(--line); }
  .facts div { display: grid; grid-template-columns: 5rem minmax(0, 1fr); gap: var(--space-3); padding-block: var(--space-2); border-block-end: 1px solid var(--line); font-size: var(--t-base); }
  dt { color: var(--muted); }
  dd { margin: 0; }
  dd .cm-hint { display: block; }
  dd .cm-hint a { font-weight: 600; }
  .logout { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; justify-content: space-between; }
  .cm-btn.neutral { color: var(--ink-2) !important; background: var(--panel-raised); border-color: var(--control-line); }
  .cm-btn.neutral:hover { background: var(--hover-row); filter: none; }

  /* School combobox: the text box searches, the chevron opens the list, and only a picked row is saved. */
  .combo { position: relative; }
  .combo .cm-input { padding-inline-end: 3.25rem; }
  .combo.chosen .cm-input { padding-inline-end: 7.25rem; border-color: color-mix(in srgb, var(--up) 55%, var(--control-line)); }
  .tick { position: absolute; inset-block-start: 50%; inset-inline-end: 5.6rem; translate: 0 -50%; color: var(--up); font-weight: 700; }
  .clear, .combo-toggle { position: absolute; inset-block: 0; display: grid; place-items: center; inline-size: var(--target-min); border: 0; color: var(--ink-2); background: transparent; cursor: pointer; touch-action: manipulation; }
  .clear { inset-inline-end: var(--target-min); border-inline-start: 1px solid var(--line); font-size: 1.25rem; }
  .clear:hover { color: var(--down); background: var(--hover-row); }
  .combo-toggle { inset-inline-end: 0; border-inline-start: 1px solid var(--line); border-start-end-radius: var(--radius-control); border-end-end-radius: var(--radius-control); }
  .combo-toggle:hover { color: var(--brand-ink); background: var(--brand-wash); }
  .combo-toggle[aria-expanded='true'] .chev { rotate: 180deg; }
  .combo-toggle .chev { font-size: 1rem; }
  .school-list { position: absolute; inset-inline: 0; inset-block-start: calc(100% + 4px); z-index: 5; max-block-size: 20rem; margin: 0; padding: var(--space-1); overflow-y: auto; list-style: none; border: 1px solid var(--control-line); border-radius: var(--radius-panel); background: var(--panel-raised); box-shadow: 0 10px 24px color-mix(in srgb, var(--ink) 16%, transparent); }
  .school-list[hidden] { display: none; }
  .school-list [role='option'] { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: baseline; min-block-size: var(--target-min); padding: var(--space-1) var(--space-3); border-radius: var(--radius-control); color: var(--ink); font-size: var(--t-base); cursor: pointer; }
  .school-list [role='option']:hover, .school-list .active { background: var(--brand-wash); color: var(--brand-ink); }
  .school-list [aria-selected='true'] { font-weight: 650; }
  .school-list [aria-selected='true'] .opt-name::after { content: ' ✓'; color: var(--up); }
  .school-list .none-row { color: var(--ink-2); }
  .opt-en { color: var(--muted); font-size: var(--t-sm); }
  .school-list .note { padding: var(--space-2) var(--space-3); color: var(--muted); font-size: var(--t-sm); line-height: 1.5; }

  /* The preview column is a panel of its own, so its top lines up with the form card beside it. */
  .preview { display: grid; gap: var(--space-2); padding: var(--space-4) var(--space-5); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .preview .preview-card { background: var(--panel-raised); }
  .eyebrow { color: var(--muted) !important; font-size: var(--t-sm) !important; letter-spacing: 0 !important; }
  .preview-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .avatar { display: grid; place-items: center; inline-size: 3rem; block-size: 3rem; border-radius: 50%; color: var(--brand-ink); background: var(--brand-wash); font-size: 1.25rem; font-weight: 650; }
  .who { min-inline-size: 0; }
  .name { font-size: var(--t-lg); font-weight: 650; line-height: var(--leading-tight); overflow-wrap: anywhere; }
  .handle { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: var(--t-sm); }
  .bio { margin-block-start: var(--space-2) !important; color: var(--ink-2); font-size: var(--t-base); white-space: pre-wrap; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .bio.empty { color: var(--muted); }
  .preview-note { color: var(--muted); font-size: var(--t-sm); line-height: 1.5; }
  .unsaved { display: inline-block; padding: 0 6px; border-radius: var(--radius-pill); color: var(--warn); background: var(--warn-wash); font-weight: 600; }

  @media (max-width: 56rem) {
    .layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .side { gap: var(--space-4); }
    .preview { display: none; }
    .preview-fold { display: block; }
    .preview-fold[open] { display: grid; }
    .jump-link { display: inline-flex; }
    .cm-panel { scroll-margin-block-start: var(--space-4); }
  }
  @media (max-width: 40rem) {
    .cm-dek .dek-sep { display: none; }
    .who-line, .dek-link { flex-basis: 100%; }
    .save-row .status { flex: 1 1 8rem; }
    .facts div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
    .logout .cm-btn { flex: 1 1 100%; }
  }
</style>
