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
    /** Current path, for the retry link on server errors. */
    retryHref?: string;
  }

  let { status, message, title, description, primary, secondary, also = [], search = false, query = '', retryHref }: Props = $props();

  /** Searches that find courses at most schools, as a starting point when the address gave no clue. */
  const examples = ['微積分', '普通心理學', '經濟學原理', '計算機概論'];

  let notFound = $derived(status === 404);
  let heading = $derived(title ?? (notFound ? '找不到這個頁面' : '暫時無法顯示'));
  let detail = $derived(
    description ?? (notFound ? '網址可能有誤，或這個頁面已被移除。' : (message ?? '請稍後再試；查課以外的頁面不受影響。'))
  );
  let first = $derived(primary ?? (notFound ? { href: '/', label: '回首頁' } : { href: retryHref ?? '/', label: '重試' }));
  let second = $derived(secondary ?? (notFound ? { href: '/schools', label: '看各校收錄狀態' } : { href: '/', label: '回首頁' }));

  // When the visitor came from a search on this site, offer that exact search back (with its filters).
  let back = $state<{ href: string; label: string } | null>(null);
  onMount(() => {
    try {
      const from = document.referrer ? new URL(document.referrer) : null;
      if (!from || from.origin !== location.origin || from.href === location.href) return;
      if (from.pathname === '/' && from.searchParams.get('q')) {
        back = { href: from.pathname + from.search, label: `回到「${from.searchParams.get('q')}」的搜尋結果` };
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

<section class="error-page" class:outage={!notFound} aria-labelledby="error-title">
  <p class="eyebrow"><span class="ui-tabular code">{status}</span>{#if !notFound}暫時無法取得{#if message && message !== detail} · {message}{/if}{/if}</p>
  <h1 id="error-title">{heading}</h1>
  <p class="detail">{detail}</p>
  {#if search}
    <form class="search" method="GET" action="/" role="search" aria-label="搜尋課程">
      <input type="hidden" name="term" value="all" />
      <label class="search-field">
        <span class="field-label">課名、課號或教師</span>
        <input type="search" name="q" defaultValue={query} placeholder="例如 微積分、CS2001" maxlength="100" autocomplete="off" />
      </label>
      <button type="submit">搜尋課程</button>
    </form>
    <p class="examples">常見搜尋：{#each examples as example, index (example)}{index ? '・' : ''}<a href={`/?${new URLSearchParams({ q: example, term: 'all' })}`}>{example}</a>{/each}</p>
  {/if}
  <div class="actions">
    <!-- The search form's submit button is the primary action when a search box is shown. -->
    {#if !search}
      <a class="primary" href={first.href} data-sveltekit-reload={!notFound && first.href === retryHref ? '' : undefined}>{first.label}</a>
    {/if}
    {#if back}<a class="secondary" href={back.href}>{back.label}</a>{/if}
    <a class="secondary" href={second.href}>{second.label}</a>
  </div>
  {#if also.length}
    <nav class="also" aria-label="其他出路">
      <span class="also-label">你也可以</span>
      <ul>{#each also as link (link.href)}<li><a href={link.href}>{link.label} <span aria-hidden="true">→</span></a></li>{/each}</ul>
    </nav>
  {/if}
</section>

<style>
  .error-page {
    display: grid;
    gap: var(--space-2);
    justify-items: start;
    inline-size: min(100%, 42rem);
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
  .search { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: end; inline-size: 100%; margin-block-start: var(--space-2); }
  .search-field { display: grid; flex: 1 1 14rem; gap: var(--space-1); }
  .field-label { color: var(--ink-2); font-size: var(--t-sm); font-weight: 600; }
  .search input[type='search'] {
    inline-size: 100%;
    min-inline-size: 0;
    min-block-size: var(--target-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
    color: var(--ink);
    font: var(--t-base) / var(--leading-table) var(--font-sans);
  }
  .search input::placeholder { color: var(--muted); }
  .search input[type='search']:focus-visible, button:focus-visible, .actions a:focus-visible, .also a:focus-visible {
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
  .examples { margin: 0; color: var(--muted); font-size: var(--t-sm); }
  .examples a { display: inline-flex; align-items: center; min-block-size: 2rem; color: var(--brand-ink); text-underline-offset: 0.15em; }
  .also { display: grid; gap: var(--space-1); inline-size: 100%; margin-block-start: var(--space-2); padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .also-label { color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .also ul { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); margin: 0; padding: 0; list-style: none; }
  .also a { display: inline-flex; align-items: center; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; text-underline-offset: 0.15em; }

  @media (max-width: 40rem) {
    .error-page { padding: var(--space-5) var(--space-4); margin-block-start: 0; }
    /* Search first and full width; the ways out share one row below it. */
    .search-field { flex-basis: 100%; }
    .search button { flex: 1 1 100%; }
    .actions { inline-size: 100%; }
    .actions .primary { flex: 1 1 100%; }
    .actions .secondary { flex: 1 1 10rem; }
    .also ul { display: grid; gap: 0; }
    .also li + li { border-block-start: 1px solid var(--line); }
  }
</style>
