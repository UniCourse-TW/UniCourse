<script lang="ts">
  import { deserialize, enhance } from '$app/forms';
  import { parseTags } from '$lib/community-format';
  import type { School } from '$lib/community-types';
  import { onMount, tick } from 'svelte';

  interface Draft {
    type: string;
    title: string;
    content: string;
    school: string;
    courseCode: string;
    tags: string;
  }

  interface Props {
    draft: Draft;
    schools: School[];
    isAdmin: boolean;
    open: boolean;
    /** Where 取消 and the backdrop go without JavaScript (the forum without `compose=1`). */
    closeHref: string;
    message?: string;
  }

  let { draft, schools, isAdmin, open: initiallyOpen, closeHref, message }: Props = $props();

  const MAX_TAGS = 5;
  const id = $props.id();
  let open = $derived(initiallyOpen);
  let hydrated = $state(false);
  let details: HTMLDetailsElement | undefined = $state();
  let titleInput: HTMLInputElement | undefined = $state();
  let submitting = $state(false);

  // Live state, seeded from the draft (a failed submission keeps what was typed). Writable
  // deriveds so SSR renders the seeded values too.
  let contentLength = $derived([...draft.content].length);
  let school = $derived(draft.school);
  let courseCode = $derived(draft.courseCode);
  let tags = $derived(parseTags(draft.tags).slice(0, MAX_TAGS));
  let tagText = $state('');
  let course = $state<{ status: 'idle' | 'checking' | 'found' | 'missing' | 'unavailable'; title?: string }>({ status: 'idle' });

  onMount(() => {
    hydrated = true;
    if (open) void focusTitle();
    if (courseCode) check();
  });

  async function focusTitle() {
    await tick();
    titleInput?.focus();
  }

  function close(event?: Event) {
    event?.preventDefault();
    open = false;
  }

  function onToggle() {
    open = details?.open ?? false;
    if (open) void focusTitle();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) close(event);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  function scheduleCheck() {
    clearTimeout(timer);
    course = { status: 'idle' };
    if (school && courseCode.trim()) timer = setTimeout(check, 350);
  }

  async function check() {
    const body = new FormData();
    body.set('school', school);
    body.set('courseCode', courseCode.trim());
    if (!school || !courseCode.trim()) return;
    course = { status: 'checking' };
    try {
      const response = await fetch('/forum?/checkCourse', { method: 'POST', body, headers: { 'x-sveltejs-action': 'true' } });
      const result = deserialize(await response.text());
      if (result.type !== 'success' || !result.data) throw new Error('unavailable');
      const found = result.data.found as { title: string } | false | null;
      if (result.data.unavailable) course = { status: 'unavailable' };
      else if (found) course = { status: 'found', title: found.title };
      else if (found === false) course = { status: 'missing' };
      else course = { status: 'idle' };
    } catch {
      course = { status: 'unavailable' };
    }
  }

  function addTag() {
    const next = parseTags(tagText);
    if (!next.length) return;
    tags = [...new Set([...tags, ...next])].slice(0, MAX_TAGS);
    tagText = '';
  }

  function onTagKey(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
      event.preventDefault();
      addTag();
    } else if (event.key === 'Backspace' && !tagText && tags.length) {
      tags = tags.slice(0, -1);
    }
  }

  // Typed-but-not-added text still counts, so 送出 never drops a tag.
  let tagValue = $derived([...tags, ...parseTags(tagText)].join(', '));
  let tagCount = $derived(parseTags(tagValue).length);
</script>

<svelte:window onkeydown={onKeydown} />

<details class="compose" bind:this={details} {open} ontoggle={onToggle}>
  <summary class="cm-btn"><span aria-hidden="true">＋</span> 發表文章</summary>
  <a class="backdrop" href={closeHref} onclick={close} tabindex="-1" aria-hidden="true"></a>
  <section class="drawer" aria-labelledby="{id}-title">
    <header>
      <h2 id="{id}-title">發表文章</h2>
      <a class="close" href={closeHref} onclick={close} aria-label="關閉發文表單">×</a>
    </header>
    <p class="note">純文字，保留換行。發表後會顯示你的顯示名稱與帳號。</p>
    <form
      method="POST"
      action="/forum?/create"
      class="cm-form"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update({ reset: false });
          submitting = false;
        };
      }}
    >
      <fieldset class="types">
        <legend class="cm-label">類型</legend>
        <div class="segmented">
          <label><input type="radio" name="type" value="question" checked={draft.type !== 'article' && draft.type !== 'announcement'} /> 提問</label>
          <label><input type="radio" name="type" value="article" checked={draft.type === 'article'} /> 文章</label>
          {#if isAdmin}
            <label><input type="radio" name="type" value="announcement" checked={draft.type === 'announcement'} /> 公告</label>
          {/if}
        </div>
      </fieldset>

      <div class="cm-field">
        <div class="cm-label"><label for="{id}-t">標題</label><span class="cm-hint">最多 200 字</span></div>
        <input id="{id}-t" class="cm-input" name="title" required maxlength="200" defaultValue={draft.title} bind:this={titleInput}
          placeholder="例如：資料結構作業量和給分如何？" />
      </div>

      <div class="cm-field">
        <div class="cm-label">
          <label for="{id}-c">內容</label>
          <span class="cm-count" aria-live="polite">{contentLength.toLocaleString('zh-TW')} / 20,000</span>
        </div>
        <textarea id="{id}-c" class="cm-input" name="content" required rows="7" maxlength="20000" defaultValue={draft.content}
          oninput={(event) => (contentLength = [...event.currentTarget.value].length)}
          placeholder="想問什麼、修課心得或整理的資料都可以寫在這裡。"></textarea>
      </div>

      <div class="pair">
        <div class="cm-field">
          <div class="cm-label"><label for="{id}-s">相關學校</label><span class="cm-hint">選填</span></div>
          <select id="{id}-s" class="cm-input" name="school" onchange={(event) => { school = event.currentTarget.value; scheduleCheck(); }}>
            <option value="" selected={!draft.school}>不指定</option>
            {#each schools as option (option.slug)}
              <option value={option.slug} selected={option.slug === draft.school}>{option.name}</option>
            {/each}
          </select>
        </div>
        <div class="cm-field">
          <div class="cm-label"><label for="{id}-k">相關課號</label><span class="cm-hint">選填，需先選學校</span></div>
          <input id="{id}-k" class="cm-input mono-input" name="courseCode" maxlength="100" defaultValue={draft.courseCode}
            autocapitalize="characters" spellcheck="false" aria-describedby="{id}-kc"
            oninput={(event) => { courseCode = event.currentTarget.value; scheduleCheck(); }} />
          <p id="{id}-kc" class="course-check" data-status={course.status} aria-live="polite">
            {#if course.status === 'checking'}查詢課號中…
            {:else if course.status === 'found'}<span aria-hidden="true">✓</span> {course.title}
            {:else if course.status === 'missing'}這所學校查不到這個課號，送出時會再確認。
            {:else if course.status === 'unavailable'}暫時無法查詢課號，送出時會再確認。
            {/if}
          </p>
        </div>
      </div>

      <div class="cm-field">
        <div class="cm-label">
          <label for="{id}-g">標籤</label>
          <span class="cm-count" class:over={tagCount > MAX_TAGS}>{#if hydrated}{tagCount} / {MAX_TAGS}{:else}以逗號分隔，最多 {MAX_TAGS} 個{/if}</span>
        </div>
        {#if hydrated}
          <div class="tag-input cm-input">
            {#each tags as tag (tag)}
              <span class="tag-chip">#{tag}<button type="button" onclick={() => (tags = tags.filter((other) => other !== tag))} aria-label="移除標籤 {tag}">×</button></span>
            {/each}
            <input id="{id}-g" bind:value={tagText} onkeydown={onTagKey} onblur={addTag} maxlength="30"
              placeholder={tags.length ? '' : '輸入後按 Enter，例如：作業'} disabled={tags.length >= MAX_TAGS} />
          </div>
          <input type="hidden" name="tags" value={tagValue} />
        {:else}
          <input id="{id}-g" class="cm-input" name="tags" maxlength="200" defaultValue={draft.tags} placeholder="例如：期中考, 作業" />
        {/if}
      </div>

      {#if message}<p class="cm-alert" role="alert">{message}</p>{/if}
      <div class="submit">
        <button class="cm-btn" aria-busy={submitting} disabled={submitting}>{submitting ? '發表中…' : '發表'}</button>
        <a class="cm-btn quiet" href={closeHref} onclick={close}>取消</a>
      </div>
    </form>
  </section>
</details>

<style>
  .compose > summary { list-style: none; }
  .compose > summary::-webkit-details-marker { display: none; }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgb(0 0 0 / 0.4);
  }
  .drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    z-index: 61;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    inline-size: min(32rem, 100%);
    padding: var(--space-5) var(--space-6) var(--space-8);
    overflow-y: auto;
    overscroll-behavior: contain;
    border-inline-start: 1px solid var(--line);
    color: var(--ink);
    background: var(--bg);
    box-shadow: -10px 0 24px rgb(0 0 0 / 0.2);
  }
  header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--target-min);
    block-size: var(--target-min);
    margin-inline-end: calc(-1 * var(--space-2));
    border-radius: var(--radius-control);
    color: var(--ink-2) !important;
    font-size: 1.5rem;
    text-decoration: none;
  }
  .close:hover { background: var(--hover-row); }
  .note { color: var(--muted); font-size: 0.8125rem; }
  fieldset { margin: 0; padding: 0; border: 0; min-inline-size: 0; }
  legend { padding: 0; margin-block-end: var(--space-1); }
  .segmented {
    display: inline-flex;
    padding: 3px;
    border: 1px solid var(--line);
    border-radius: calc(var(--radius-control) + 3px);
    background: var(--panel);
  }
  .segmented label {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-block-size: calc(var(--target-min) - 8px);
    padding: 0 var(--space-4);
    border-radius: var(--radius-control);
    color: var(--ink-2);
    font-size: var(--t-base);
    font-weight: 600;
    cursor: pointer;
  }
  .segmented input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
  .segmented label:has(input:checked) { color: var(--on-brand); background: var(--brand); }
  .segmented label:has(input:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
  .mono-input { font-family: var(--font-mono); }
  .drawer :global(.cm-input::placeholder) { opacity: 1; }
  .drawer :global(:is(.cm-hint, .cm-count)), .course-check, .tag-chip { font-size: max(0.8125rem, var(--t-sm)); }
  .course-check { min-block-size: 1.25rem; color: var(--muted); }
  .course-check[data-status='found'] { color: var(--up); font-weight: 600; }
  .course-check[data-status='missing'], .course-check[data-status='unavailable'] { color: var(--warn); }
  .tag-input { display: flex; flex-wrap: wrap; gap: var(--space-1); align-items: center; padding-block: 0.375rem; }
  .tag-input:focus-within { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .tag-input input {
    flex: 1 1 8rem;
    min-inline-size: 6rem;
    min-block-size: 1.75rem;
    padding: 0;
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
    outline: none !important;
  }
  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding-inline-start: var(--space-2);
    border-radius: var(--radius-pill);
    color: var(--brand-ink);
    background: var(--brand-wash);
    font-weight: 600;
  }
  .tag-chip button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 1.75rem;
    block-size: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    color: inherit;
    background: transparent;
    font-size: 1rem;
    cursor: pointer;
  }
  .submit { display: flex; gap: var(--space-2); align-items: center; padding-block-start: var(--space-1); }

  @media (max-width: 40rem) {
    .drawer { padding: var(--space-4) var(--space-4) var(--space-8); border: 0; box-shadow: none; }
    .pair { grid-template-columns: 1fr; }
    .segmented label, .tag-input input { min-block-size: var(--target-min); }
    .tag-chip button { inline-size: var(--target-min); block-size: var(--target-min); }
    .submit .cm-btn:first-child { flex: 1; }
  }
</style>
