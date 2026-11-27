<script module lang="ts">
  export interface DocSection {
    id: string;
    title: string;
  }

  /** One plain-language point: a bold lead, the sentence, and optionally a link that ends it. */
  export interface GistPoint {
    lead: string;
    text: string;
    link?: { href: string; label: string; external?: boolean };
  }
</script>

<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  interface Props {
    title: string;
    /** ISO date the text was last changed; shown as 更新於. */
    updated: string;
    sections: readonly DocSection[];
    /** The sibling document (terms ↔ privacy). */
    sibling: { href: string; label: string };
    /** Plain-language points shown under the title, so readers get the gist before the full text. */
    summary?: readonly GistPoint[];
    children: Snippet;
  }

  let { title, updated, sections, sibling, summary = [], children }: Props = $props();
  let updatedLabel = $derived(updated.replaceAll('-', '/'));
  let contact = $derived(sections.find((section) => section.id === 'removal' || section.id === 'contact'));

  // Scroll-spy for the desktop table of contents: the section nearest the top is marked current.
  let currentId = $state('');
  // Before the observer has spoken (and without JavaScript) the first section is the current one.
  let shownId = $derived(currentId || sections[0]?.id);
  // Phones: one floating「目錄」button once the contents have scrolled away (replaces a link per section).
  let tocAway = $state(false);
  let tocDetails = $state<HTMLDetailsElement>();
  onMount(() => {
    const toc = document.getElementById('toc');
    if (!toc || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      tocAway = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    });
    observer.observe(toc);
    return () => observer.disconnect();
  });

  // Phones: every h2 carries a 「目錄 ↑」 link (the pages mark them `.to-toc`); they open the contents too.
  onMount(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return;
    const onClick = (event: Event) => {
      if ((event.target as HTMLElement).closest('a.to-toc')) toToc(event as MouseEvent);
    };
    prose.addEventListener('click', onClick);
    return () => prose.removeEventListener('click', onClick);
  });

  /** Opens the collapsed phone contents and moves focus there, not just the scroll position. */
  function toToc(event: MouseEvent) {
    if (!tocDetails) return;
    event.preventDefault();
    tocDetails.open = true;
    const toc = document.getElementById('toc');
    toc?.scrollIntoView({ block: 'start' });
    tocDetails.querySelector('summary')?.focus({ preventScroll: true });
  }

  onMount(() => {
    const headings = sections.map((section) => document.getElementById(section.id)).filter((node): node is HTMLElement => Boolean(node));
    if (!headings.length || !('IntersectionObserver' in window)) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        const [first] = [...visible.entries()].sort((a, b) => a[1] - b[1]);
        if (first) currentId = first[0];
        else {
          // Nothing in the band: the last heading that scrolled above it, or the first one at the top.
          const above = headings.filter((heading) => heading.getBoundingClientRect().top < 120).at(-1);
          currentId = above ? above.id : headings[0].id;
        }
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 }
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  });
</script>

<article class="doc" id="top-of-doc">
  <header class="doc-head">
    <h1>{title}</h1>
    <p class="meta">
      更新於 <time datetime={updated}>{updatedLabel}</time>
      {#if contact}<span class="sep" aria-hidden="true">·</span><a href={`#${contact.id}`}>{contact.title}</a>{/if}
      <span class="sep" aria-hidden="true">·</span><a class="arrow-link" href={sibling.href}><span>{sibling.label}</span><span aria-hidden="true">→</span></a>
    </p>
  </header>
  <div class="doc-layout" class:has-gist={summary.length > 0}>
    {#if summary.length}
      <section class="gist" aria-labelledby="gist-title">
        <h2 id="gist-title">白話重點</h2>
        <ul>
          {#each summary as point, index (index)}
            <li><strong>{point.lead}</strong>{point.text}{#if point.link}<a href={point.link.href} rel={point.link.external ? 'noopener external' : undefined}>{point.link.label}{#if point.link.external}<span aria-hidden="true"> ↗</span>{/if}</a>。{/if}</li>
          {/each}
        </ul>
      </section>
    {/if}
    <nav class="doc-toc" id="toc" aria-label="目錄">
      <!-- Closed in the markup so phones start collapsed; desktop CSS keeps the list visible regardless. -->
      <details bind:this={tocDetails}>
        <summary>目錄<span class="toc-hint">：展開 {sections.length} 個章節</span></summary>
        <ol>
          {#each sections as section (section.id)}
            <li><a href={`#${section.id}`} aria-current={shownId === section.id ? 'true' : undefined}>{section.title}</a></li>
          {/each}
          <li class="sibling"><a class="arrow-link" href={sibling.href}><span>{sibling.label}</span><span aria-hidden="true">→</span></a></li>
        </ol>
      </details>
    </nav>
    <div class="prose">
      {@render children()}
      <p class="next">
        <a href="#toc" class="back" onclick={toToc}><span aria-hidden="true">↑</span><span>回目錄</span></a>
        <a href={sibling.href}><span>另請參閱{sibling.label}</span><span aria-hidden="true">→</span></a>
      </p>
    </div>
  </div>
  <a class="toc-fab" class:shown={tocAway} href="#toc" onclick={toToc} aria-hidden={tocAway ? undefined : 'true'} tabindex={tocAway ? undefined : -1}><span aria-hidden="true">☰</span> 目錄</a>
</article>

<style>
  /* The document is centred at its natural width (contents + 52 em measure) instead of hugging the left edge. */
  .doc { display: grid; gap: var(--space-5); max-inline-size: 66rem; min-inline-size: 0; margin-inline: auto; color: var(--ink); font: var(--t-md) / var(--leading-body) var(--font-sans); }
  .arrow-link { display: inline-flex; gap: 0.3em; align-items: center; }
  .doc-head { display: grid; gap: var(--space-1); }
  /* The gist shares the prose column: same left edge as the first h2 and the same 52 em measure. */
  .gist { grid-column: 2; max-inline-size: 52em; padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-inline-start: 3px solid var(--brand); border-radius: var(--radius-panel); background: var(--panel); }
  .gist h2 { margin: 0 0 var(--space-1); font-size: var(--t-base); font-weight: 650; color: var(--ink-2); }
  .gist ul { display: grid; gap: var(--space-1); margin: 0; padding-inline-start: 1.2em; color: var(--ink); font-size: var(--t-md); line-height: 1.75; }
  .gist li strong { margin-inline-end: 0.35em; color: var(--ink); font-weight: 650; }
  .gist li strong::after { content: '：'; }
  .gist a { font-weight: 600; }
  .toc-hint { display: none; font-weight: 500; }
  h1 { margin: 0; font-size: var(--t-2xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .meta { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .meta .sep { margin-inline: 0.4em; color: var(--axis); }
  .meta a, .doc-toc a, .next a, .prose :global(a) { color: var(--brand-ink); text-underline-offset: 0.15em; }
  :is(.meta, .doc-toc, .next, .prose) :global(a:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: 2px; }

  .doc-layout { display: grid; grid-template-columns: 13.5rem minmax(0, 1fr); gap: var(--space-5) var(--space-8); align-items: start; }
  .doc-toc { grid-column: 1; grid-row: 1; position: sticky; inset-block-start: 5rem; font-size: var(--t-md); }
  .has-gist .doc-toc { grid-row: 1 / span 2; }
  .prose { grid-column: 2; }
  .doc-toc details { border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .doc-toc summary { padding: var(--space-2) var(--space-3); color: var(--muted); font-size: var(--t-sm); font-weight: 600; list-style: none; pointer-events: none; }
  .doc-toc summary::-webkit-details-marker { display: none; }
  .doc-toc details::details-content { display: block; content-visibility: visible; }
  .doc-toc ol { display: grid; margin: 0; padding: 0 var(--space-2) var(--space-2); list-style: none; }
  .doc-toc li a { display: flex; align-items: center; min-block-size: 2.25rem; padding: 0 var(--space-2); border-inline-start: 2px solid transparent; border-radius: 0 var(--radius-control) var(--radius-control) 0; color: var(--ink-2); text-decoration: none; }
  .doc-toc li a:hover { background: var(--brand-wash); color: var(--brand-ink); }
  .doc-toc li a[aria-current='true'] { border-inline-start-color: var(--brand); color: var(--brand-ink); font-weight: 600; background: var(--brand-wash); }
  .doc-toc .sibling { margin-block-start: var(--space-1); padding-block-start: var(--space-1); border-block-start: 1px solid var(--line); }
  .doc-toc .sibling a { color: var(--brand-ink); font-weight: 600; }

  /* Long-form text: 15 px on 1.85 (storyboard). One measure for text and tables alike: each section is
     52 em at the prose size and tables fill it. */
  .prose :global(section) { max-inline-size: 52em; }
  .prose { min-inline-size: 0; font-size: var(--t-md); line-height: 1.85; overflow-wrap: anywhere; hanging-punctuation: none; }
  .prose :global(h2) { margin: var(--space-8) 0 var(--space-2); font-size: var(--t-xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); scroll-margin-block-start: var(--space-4); }
  .prose :global(h3) { margin: var(--space-5) 0 var(--space-1); font-size: var(--t-lg); font-weight: 650; line-height: var(--leading-tight); }
  .prose :global(p), .prose :global(ul), .prose :global(ol) { margin: 0 0 var(--space-3); }
  .prose :global(ul), .prose :global(ol) { padding-inline-start: 1.4em; }
  .prose :global(li) { margin-block-end: 6px; }
  .prose :global(li:last-child) { margin-block-end: 0; }
  .prose :global(table) { inline-size: 100%; margin: 0 0 var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); border-collapse: separate; border-spacing: 0; overflow: hidden; background: var(--panel-raised); font-size: var(--t-base); line-height: var(--leading-table); }
  .prose :global(th), .prose :global(td) { padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); text-align: start; vertical-align: top; }
  .prose :global(th) { background: var(--table-head); color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .prose :global(tr:last-child td) { border-block-end: 0; }
  /* Code inside CJK sentences sits on a chip that moves to the next line whole; it never breaks mid-word. */
  .prose :global(code) { padding: 1px 5px; border-radius: 4px; background: var(--chip); color: var(--ink); font-family: var(--font-mono); font-size: 0.88em; white-space: nowrap; }
  /* Identifier columns (board names) never break mid-word; the remarks column takes the wrapping. */
  .prose :global(table.boards td:first-child), .prose :global(table.boards th:first-child) { white-space: nowrap; font-family: var(--font-mono); font-size: 0.92em; }
  .prose :global(table.boards td:nth-child(2)) { white-space: nowrap; }
  /* The data-kind column of the sources table reads as one unit (課程與修課人數 never breaks before its last word). */
  .prose :global(table.sources th:first-child), .prose :global(table.sources td:first-child) { inline-size: 9.5rem; white-space: nowrap; }
  /* Desktop shows a folded block open; phones get a real disclosure (summary styled below). */
  .prose :global(details.phone-fold > summary) { list-style: none; pointer-events: none; color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .prose :global(details.phone-fold > summary::-webkit-details-marker) { display: none; }
  .prose :global(details.phone-fold::details-content) { display: block; content-visibility: visible; }
  .prose :global(details.phone-fold > summary .fold-count) { display: none; }
  .prose :global(p.update-note a.private) { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: 2rem; font-weight: 600; }
  .prose :global(.callout) { margin: 0 0 var(--space-3); padding: var(--space-3) var(--space-4); border-inline-start: 3px solid var(--brand); border-radius: var(--radius-control); background: var(--panel); color: var(--ink-2); }
  .prose :global(.callout .note) { display: block; margin-block-start: var(--space-2); color: var(--ink-2); font-size: var(--t-base); line-height: 1.65; }
  .prose :global(.contact-routes) { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); gap: var(--space-3); margin: 0 0 var(--space-3); }
  .prose :global(.contact-routes .route-row) { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: center; }
  .prose :global(.contact-routes .route-tag) { display: inline-block; padding: 0 7px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: var(--t-xs); font-weight: 600; line-height: 1.7; }
  .prose :global(.contact-routes .route-tag.private) { background: var(--brand-wash); color: var(--brand-ink); }
  /* A section heading row: the h2, an optional status badge beside it, and (phones only) 「目錄 ↑」. */
  .prose :global(.h2-row) { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); align-items: baseline; margin: var(--space-8) 0 var(--space-2); }
  .prose :global(section:first-of-type .h2-row) { margin-block-start: 0; }
  .has-gist .prose :global(section:first-of-type .h2-row) { margin-block-start: var(--space-6); }
  .prose :global(.h2-row h2) { margin: 0; }
  .prose :global(.h2-row .status) { margin: 0; align-self: center; }
  .prose :global(.h2-row .to-toc) { display: none; }
  /* A section's one-paragraph answer before the detail: what, and what to do. */
  .prose :global(p.lead) { padding: var(--space-2) var(--space-3); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink-2); font-size: var(--t-base); line-height: 1.7; }
  .prose :global(p.lead strong) { color: var(--ink); }
  .prose :global(.contact-routes > div) { display: grid; gap: var(--space-1); align-content: start; padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .prose :global(.contact-routes h3) { margin: 0; font-size: var(--t-md); }
  .prose :global(.contact-routes .route-kind) { margin: 0; color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .prose :global(.contact-routes p) { margin: 0; color: var(--ink-2); font-size: var(--t-base); line-height: 1.65; }
  .prose :global(.contact-routes a.route) { display: inline-flex; align-items: center; min-block-size: var(--target-min); font-weight: 650; }
  .toc-fab { display: none; }
  .prose :global(.status.live) { background: color-mix(in srgb, var(--up) var(--status-tint), var(--panel-raised)); color: color-mix(in srgb, var(--up) 85%, var(--ink)); }
  .prose :global(.status) { display: inline-block; margin-inline-end: var(--space-1); padding: 0 7px; border-radius: var(--radius-pill); background: var(--warn-wash); color: var(--warn); font-size: var(--t-sm); font-weight: 600; line-height: 1.6; }
  .next { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin: var(--space-6) 0 0; padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); font-size: var(--t-base); font-weight: 500; }
  .next a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); }
  .next .back { color: var(--ink-2); }
  .next .back:hover { color: var(--brand-ink); }

  /* Two- and three-column text tables stack on phones; the column name comes from data-label. */
  @media (max-width: 40rem) {
    .prose :global(table), .prose :global(tbody), .prose :global(tr), .prose :global(td) { display: block; }
    /* The header row stays in the accessibility tree; only its pixels go. */
    .prose :global(thead) { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .prose :global(tr) { padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); }
    .prose :global(tr:last-child) { border-block-end: 0; }
    .prose :global(td) { padding: 2px 0; border: 0; }
    /* Each cell is one row: the column name in a 5.5 rem label column, the value beside it. */
    .prose :global(td[data-label]) { display: grid; grid-template-columns: 5.5rem minmax(0, 1fr); gap: var(--space-2); }
    .prose :global(td[data-label])::before { content: attr(data-label); color: var(--muted); font-size: var(--t-sm); font-weight: 600; line-height: inherit; }
    .prose :global(td:first-child) { display: block; padding-block-end: var(--space-1); font-weight: 600; }
    .prose :global(td:first-child)::before { display: none; }
    .prose :global(table.sources th:first-child), .prose :global(table.sources td:first-child) { inline-size: auto; white-space: normal; }
  }
  @media (max-width: 56rem) {
    .doc-layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    /* Phones: the folded contents right under the date, then the gist, then the text. */
    .gist, .doc-toc, .has-gist .doc-toc, .prose { grid-column: 1; grid-row: auto; }
    .doc-toc { order: 0; }
    .gist { order: 1; }
    .prose { order: 2; }
    .doc-toc { position: static; }
    .doc-toc details::details-content { content-visibility: auto; }
    .doc-toc details:not([open])::details-content { content-visibility: hidden; }
    .doc-toc summary { display: flex; align-items: center; justify-content: space-between; min-block-size: var(--target-min); padding-inline: var(--space-3); color: var(--ink-2); font-size: var(--t-base); cursor: pointer; pointer-events: auto; }
    .doc-toc summary::after { content: '▾'; color: var(--muted); }
    .doc-toc details[open] summary::after { content: '▴'; }
    .doc-toc summary:focus-visible { outline: var(--focus-ring); outline-offset: calc(-1 * var(--focus-offset)); border-radius: var(--radius-panel); }
    .doc-toc li a { min-block-size: var(--target-min); }
    .toc-hint { display: inline; }
    .doc-toc summary { justify-content: flex-start; }
    .doc-toc summary::after { margin-inline-start: auto; }
    /* Phones: one floating way back to the contents once it has scrolled out of view. */
    .toc-fab { position: fixed; inset-block-end: calc(var(--space-4) + env(safe-area-inset-bottom, 0px)); inset-inline-end: var(--space-4); z-index: 20; display: inline-flex; gap: var(--space-1); align-items: center; min-block-size: var(--target-min); padding: 0 var(--space-4); border: 1px solid var(--control-line); border-radius: var(--radius-pill); background: var(--panel-raised); box-shadow: 0 4px 14px color-mix(in srgb, var(--ink) 18%, transparent); color: var(--ink); font-size: var(--t-base); font-weight: 650; text-decoration: none; opacity: 0; pointer-events: none; transition: opacity 150ms; }
    .toc-fab.shown { opacity: 1; pointer-events: auto; }
    .prose :global(details.phone-fold) { margin: 0 0 var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
    .prose :global(details.phone-fold > summary) { display: flex; align-items: center; gap: 0; min-block-size: var(--target-min); padding-inline: var(--space-3); color: var(--brand-ink); font-size: var(--t-base); cursor: pointer; pointer-events: auto; }
    .prose :global(details.phone-fold > summary .fold-count) { display: inline; color: var(--muted); font-weight: 500; }
    .prose :global(details.phone-fold > summary::after) { content: '▾'; margin-inline-start: auto; color: var(--muted); }
    .prose :global(details.phone-fold[open] > summary::after) { content: '▴'; }
    .prose :global(details.phone-fold::details-content) { content-visibility: auto; }
    .prose :global(details.phone-fold:not([open])::details-content) { content-visibility: hidden; }
    .prose :global(details.phone-fold table) { margin: 0; border: 0; border-radius: 0; border-block-start: 1px solid var(--line); }
    .toc-fab:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
    /* Phones: a way back to the contents at every section heading, not only at the end of the text. */
    .prose :global(.h2-row) { align-items: center; justify-content: space-between; }
    .prose :global(.h2-row .to-toc) { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); margin-inline-end: calc(-1 * var(--space-2)); padding-inline: var(--space-2); border-radius: var(--radius-control); color: var(--muted); font-size: var(--t-sm); font-weight: 600; text-decoration: none; }
    .prose :global(.h2-row .to-toc:hover) { color: var(--brand-ink); background: var(--hover-row); }
  }
</style>
