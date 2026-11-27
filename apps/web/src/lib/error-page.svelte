<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * The shared error view (states.md §3–4): a human title first, the HTTP status demoted to an
   * eyebrow, and at least two ways out. Route-level `+error.svelte` files pass their own copy.
   */
  interface Action {
    href: string;
    label: string;
  }

  interface Props {
    status: number;
    /** The message from `error(status, message)`; shown when it adds to the title. */
    message?: string | null;
    title?: string;
    description?: string;
    primary?: Action;
    secondary?: Action;
    /** Extra links after 你也可以. */
    also?: readonly Action[];
    /** Show a course search box (course and unknown-page 404s). */
    search?: boolean;
    /** Prefilled search text, e.g. a course code or name taken from the address. */
    query?: string;
    crossTerm?: boolean;
    context?: string;
    /** Current path, for the retry link on server errors. */
    retryHref?: string;
  }

  let { status, message, title, description, primary, secondary, also = [], search = false, query = '', crossTerm = false, context, retryHref }: Props = $props();

  /** Fixed example searches that find courses at most schools (not a popularity list), offered when the
      address gave no clue about the course; three, so they stay on one row at 390 px. */
  const examples = ['微積分', '普通心理學', '計算機概論'];

  let notFound = $derived(status === 404);
  let heading = $derived(title ?? (notFound ? '找不到這個頁面' : '暫時無法顯示'));
  let detail = $derived(
    description ?? (notFound ? '網址可能有誤，或這個頁面已被移除。' : (message ?? '請稍後再試；查課以外的頁面不受影響。'))
  );
  let first = $derived(primary ?? (notFound ? { href: '/', label: '回首頁' } : { href: retryHref ?? '/', label: '重試' }));
  let second = $derived(secondary ?? (notFound ? { href: '/schools', label: '看各校收錄狀態' } : { href: '/', label: '回首頁' }));

  // When the visitor came from a search on this site, offer that exact search back (with its filters)
  // and start the box with the same words, so nothing has to be typed twice.
  let back = $state<{ href: string; label: string } | null>(null);
  let searchInput: HTMLInputElement | undefined = $state();
  onMount(() => {
    try {
      const from = document.referrer ? new URL(document.referrer) : null;
      if (!from || from.origin !== location.origin || from.href === location.href) return;
      if (from.pathname === '/' && from.searchParams.get('q')) {
        const q = from.searchParams.get('q') ?? '';
        back = { href: from.pathname + from.search, label: `回到「${q}」的搜尋結果` };
        // Only fill an untouched box: text typed before hydration must survive.
        if (searchInput && !searchInput.value) searchInput.value = q;
      } else if (from.pathname.startsWith('/schools') || from.pathname.startsWith('/forum') || from.pathname.startsWith('/instructors')) {
        back = { href: from.pathname + from.search, label: '回上一頁' };
      }
    } catch {
      /* no referrer, or an opaque one: nothing to offer */
    }
  });
</script>

<svelte:head>
  <title>{heading}｜UniCourse</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="error-wrap">
<section class="error-page" class:outage={!notFound} aria-labelledby="error-title">
  <p class="eyebrow"><span class="ui-tabular code">{status}</span>{#if context}<span>{context}</span>{:else if !notFound}暫時無法取得{#if message && message !== detail} · {message}{/if}{/if}</p>
  <h1 id="error-title">{heading}</h1>
  <p class="detail">{detail}</p>
  {#if search}
    <!-- The scope select precedes the words in the markup (so the query string reads term, q) and
         follows them on screen. -->
    <form class="search" method="GET" action="/" role="search" aria-label="搜尋課程">
      <label class="scope-field">
        <span class="field-label">學期</span>
        <span class="select-wrap">
          <select name="term">
            <option value="all" selected>全部學期</option>
            <option value="">本學期</option>
          </select>
          <span class="chev" aria-hidden="true">▾</span>
        </span>
      </label>
      <label class="search-field">
        <span class="field-label">原課號、課名或教師</span>
        <span class="input-wrap">
          <svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input bind:this={searchInput} type="search" name="q" defaultValue={query} placeholder="例如 微積分、CS2001" maxlength="100" autocomplete="off" />
        </span>
      </label>
      <button type="submit">搜尋課程</button>
    </form>
    <!-- The address names no course, so these are fixed examples (labelled as such), not this course's school. -->
    {#if crossTerm}
      <a class="chip" href={`/?${new URLSearchParams({ term: 'all', q: query })}`}>查「{query}」的其他學期 <span aria-hidden="true">→</span></a>
    {:else if !query && !back}
      <nav class="examples" aria-label="試試這些課名">
        <span class="examples-label">試試這些課名</span>
        <ul>{#each examples as example (example)}<li><a class="chip" href={`/?${new URLSearchParams({ term: 'all', q: example })}`}>{example}</a></li>{/each}</ul>
      </nav>
    {/if}
  {/if}
  <!-- With a search box the form's button is the one primary action; the other ways out are all text links below. -->
  {#if !search || back}
    <div class="actions">
      {#if !search}
        <a class="primary" href={first.href} data-sveltekit-reload={!notFound && first.href === retryHref ? '' : undefined}>{first.label}</a>
      {/if}
      {#if back}<a class="secondary" href={back.href}>{back.label}</a>{/if}
      {#if !search}<a class="secondary" href={second.href}>{second.label}</a>{/if}
    </div>
  {/if}
  {#if also.length || search}
    <nav class="also" aria-label="其他出路">
      <span class="also-label">你也可以</span>
      <ul>
        {#if search}<li><a class="lead-out" href={second.href}><span>{second.label}</span><span aria-hidden="true">→</span></a></li>{/if}
        {#each also as link (link.href)}<li><a href={link.href}><span>{link.label}</span><span aria-hidden="true">→</span></a></li>{/each}
      </ul>
    </nav>
  {/if}
</section>
</div>

<style>
  /* Desktop: the card sits in the upper middle of the main column instead of hugging the top. */
  .error-wrap { display: grid; align-content: center; min-block-size: min(60vh, 36rem); }
  .error-page {
    display: grid;
    gap: var(--space-2);
    justify-items: start;
    inline-size: min(100%, 48rem);
    margin: var(--space-4) auto;
    padding: var(--space-6) var(--space-6);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel);
    color: var(--ink);
    font: var(--t-md) / var(--leading-body) var(--font-sans);
    overflow-wrap: anywhere;
  }
  .outage { border-inline-start: 3px solid var(--down); }
  .eyebrow { display: flex; gap: var(--space-2); align-items: center; margin: 0; color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .code { padding: 0 6px; border: 1px solid var(--line); border-radius: var(--radius-pill); background: var(--panel-raised); font-family: var(--font-mono); font-weight: 500; }
  h1 { margin: 0; font-size: var(--t-2xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .detail { margin: 0; color: var(--ink-2); }
  /* Toolbar row: words (with the family's search icon), scope, button. */
  .search { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: end; inline-size: 100%; margin-block-start: var(--space-2); }
  .search-field { display: grid; flex: 1 1 14rem; order: 0; gap: var(--space-1); }
  .scope-field { display: grid; flex: 0 0 auto; order: 1; gap: var(--space-1); }
  .search button { order: 2; }
  .field-label { color: var(--ink-2); font-size: var(--t-sm); font-weight: 600; }
  .input-wrap, .select-wrap { position: relative; display: block; }
  .input-wrap .icon { position: absolute; inset-block-start: 50%; inset-inline-start: var(--space-3); translate: 0 -50%; color: var(--muted); pointer-events: none; }
  .search input[type='search'], .search select {
    inline-size: 100%;
    min-inline-size: 0;
    min-block-size: var(--target-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
    color: var(--ink);
    color-scheme: var(--ui-color-scheme);
    font: var(--t-base) / var(--leading-table) var(--font-sans);
  }
  .search input[type='search'] { padding-inline-start: calc(var(--space-3) + 1.6rem); }
  .search select { min-inline-size: 10rem; appearance: none; padding-inline-end: 2rem; font-weight: 600; cursor: pointer; }
  .select-wrap .chev { position: absolute; inset-block-start: 50%; inset-inline-end: var(--space-3); translate: 0 -50%; color: var(--muted); pointer-events: none; }
  .search input::placeholder { color: var(--muted); }
  .search input[type='search']:focus-visible, .search select:focus-visible, button:focus-visible, .actions a:focus-visible, .also a:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
  .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-2); }
  button, .actions a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: var(--target-min);
    min-inline-size: 7rem;
    padding: 0 var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    font: inherit;
    font-size: var(--t-base);
    font-weight: 600;
    text-decoration: none;
    touch-action: manipulation;
    cursor: pointer;
  }
  button, .primary { color: var(--on-brand); background: var(--brand); border-color: var(--brand); }
  .actions .secondary { border-color: var(--brand); color: var(--brand-ink); background: var(--panel-raised); }
  .actions .secondary:hover { background: var(--brand-wash); }
  /* Example searches are chips (36 px, 44 px on phones) that wrap, not a run of small links. */
  .examples { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin: 0; }
  .examples-label { color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .examples ul { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
  .chip { display: inline-flex; align-items: center; justify-content: center; min-block-size: 2.25rem; padding: 0 var(--space-3); border-radius: var(--radius-pill); color: var(--ink-2); background: var(--chip); font-size: var(--t-sm); font-weight: 600; text-decoration: none; white-space: nowrap; touch-action: manipulation; }
  .chip:hover { color: var(--brand-ink); background: var(--brand-wash); }
  .chip:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .also { display: grid; gap: var(--space-1); inline-size: 100%; margin-block-start: var(--space-4); padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .also-label { color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .also ul { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); margin: 0; padding: 0; list-style: none; }
  .also a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); color: var(--ink-2); font-size: var(--t-base); font-weight: 600; text-underline-offset: 0.15em; }
  /* The first way out (the data route: 各校收錄狀態) leads; the rest are plain links. */
  .also a.lead-out { color: var(--brand-ink); font-weight: 650; }
  .also a[href='/forum'] { color: var(--muted); font-weight: 500; }
  .also a:hover { color: var(--brand-ink); }

  @media (max-width: 40rem) {
    .error-wrap { min-block-size: 0; }
    .error-page { padding: var(--space-5) var(--space-4); margin-block-start: 0; }
    /* Words first and full width; scope and the button share the next row. */
    .search-field { flex-basis: 100%; }
    .scope-field { flex: 1 1 8rem; }
    .search button { flex: 1 1 8rem; }
    .actions { inline-size: 100%; }
    .actions .primary { flex: 1 1 100%; }
    .actions .secondary { flex: 1 1 10rem; }
    /* The label on its own line, then one wrapping row of 40 px chips (no grid, so no ragged columns). */
    .examples { display: grid; gap: var(--space-2); inline-size: 100%; }
    .examples ul { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .chip { min-block-size: var(--target-min); }
    /* The ways out share wrapping 44 px rows (two per line) instead of one tall row each. */
    .also ul { gap: 0 var(--space-4); }
  }
</style>
