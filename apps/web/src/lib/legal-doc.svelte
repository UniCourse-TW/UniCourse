<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  export interface DocSection {
    id: string;
    title: string;
  }

  interface Props {
    title: string;
    /** ISO date the text was last changed; shown as 更新於. */
    updated: string;
    sections: readonly DocSection[];
    /** The sibling document (terms ↔ privacy). */
    sibling: { href: string; label: string };
    /** Plain-language points shown under the title, so readers get the gist before the full text. */
    summary?: readonly string[];
    children: Snippet;
  }

  let { title, updated, sections, sibling, summary = [], children }: Props = $props();
  let updatedLabel = $derived(updated.replaceAll('-', '/'));
  let contact = $derived(sections.find((section) => section.id === 'removal' || section.id === 'contact'));

  // Scroll-spy for the desktop table of contents: the section nearest the top is marked current.
  let currentId = $state('');
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
          // Nothing in the band: keep the last heading that scrolled above it.
          const above = headings.filter((heading) => heading.getBoundingClientRect().top < 120).at(-1);
          if (above) currentId = above.id;
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
      <span class="sep" aria-hidden="true">·</span><a href={sibling.href}>{sibling.label} <span aria-hidden="true">→</span></a>
    </p>
    {#if summary.length}
      <section class="gist" aria-labelledby="gist-title">
        <h2 id="gist-title">白話重點</h2>
        <ul>{#each summary as point, index (index)}<li>{point}</li>{/each}</ul>
      </section>
    {/if}
  </header>
  <div class="doc-layout">
    <nav class="doc-toc" id="toc" aria-label="目錄">
      <!-- Closed in the markup so phones start collapsed; desktop CSS keeps the list visible regardless. -->
      <details bind:this={tocDetails}>
        <summary>目錄<span class="toc-hint">：展開 {sections.length} 個章節</span></summary>
        <ol>
          {#each sections as section (section.id)}
            <li><a href={`#${section.id}`} aria-current={currentId === section.id ? 'true' : undefined}>{section.title}</a></li>
          {/each}
          <li class="sibling"><a href={sibling.href}>{sibling.label} <span aria-hidden="true">→</span></a></li>
        </ol>
      </details>
    </nav>
    <div class="prose">
      {@render children()}
      <p class="next">
        <a href="#toc" class="back" onclick={toToc}><span aria-hidden="true">↑</span> 回目錄</a>
        <a href={sibling.href}>另請參閱{sibling.label} <span aria-hidden="true">→</span></a>
      </p>
    </div>
  </div>
  <a class="toc-fab" class:shown={tocAway} href="#toc" onclick={toToc} aria-hidden={tocAway ? undefined : 'true'} tabindex={tocAway ? undefined : -1}><span aria-hidden="true">☰</span> 目錄</a>
</article>

<style>
  .doc { display: grid; gap: var(--space-5); min-inline-size: 0; color: var(--ink); font: var(--t-md) / var(--leading-body) var(--font-sans); }
  .doc-head { display: grid; gap: var(--space-1); }
  .gist { max-inline-size: 46em; margin-block-start: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .gist h2 { margin: 0 0 var(--space-1); font-size: var(--t-base); font-weight: 650; color: var(--ink-2); }
  .gist ul { margin: 0; padding-inline-start: 1.2em; color: var(--ink); font-size: var(--t-base); line-height: 1.7; }
  .toc-hint { display: none; font-weight: 500; }
  h1 { margin: 0; font-size: var(--t-2xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .meta { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .meta .sep { margin-inline: 0.4em; color: var(--axis); }
  .meta a, .doc-toc a, .next a, .prose :global(a) { color: var(--brand-ink); text-underline-offset: 0.15em; }
  :is(.meta, .doc-toc, .next, .prose) :global(a:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: 2px; }

  .doc-layout { display: grid; grid-template-columns: 14rem minmax(0, 1fr); gap: var(--space-8); align-items: start; }
  .doc-toc { position: sticky; inset-block-start: 5rem; font-size: var(--t-base); }
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

  /* Long-form text: 15 px on 1.8; running text keeps a 46 em measure, tables may use the full column. */
  .prose :global(:is(p, ul, ol, h2, h3)) { max-inline-size: 46em; }
  .prose { min-inline-size: 0; max-inline-size: 58em; font-size: var(--t-md); line-height: var(--leading-prose); overflow-wrap: anywhere; hanging-punctuation: none; }
  .prose :global(h2) { margin: var(--space-8) 0 var(--space-2); font-size: var(--t-xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); scroll-margin-block-start: var(--space-4); }
  .prose :global(section:first-of-type h2) { margin-block-start: 0; }
  .prose :global(h3) { margin: var(--space-5) 0 var(--space-1); font-size: var(--t-lg); font-weight: 650; line-height: var(--leading-tight); }
  .prose :global(p), .prose :global(ul), .prose :global(ol) { margin: 0 0 var(--space-3); }
  .prose :global(ul), .prose :global(ol) { padding-inline-start: 1.4em; }
  .prose :global(li) { margin-block-end: var(--space-1); }
  .prose :global(table) { inline-size: 100%; max-inline-size: 46em; margin: 0 0 var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); border-collapse: separate; border-spacing: 0; overflow: hidden; background: var(--panel-raised); font-size: var(--t-base); line-height: var(--leading-table); }
  .prose :global(th), .prose :global(td) { padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); text-align: start; vertical-align: top; }
  .prose :global(th) { background: var(--table-head); color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .prose :global(tr:last-child td) { border-block-end: 0; }
  .prose :global(code) { font-family: var(--font-mono); font-size: 0.9em; }
  .prose :global(.callout) { margin: 0 0 var(--space-3); padding: var(--space-3) var(--space-4); border-inline-start: 3px solid var(--brand); border-radius: var(--radius-control); background: var(--panel); color: var(--ink-2); }
  .prose :global(.callout .note) { display: block; margin-block-start: var(--space-2); color: var(--ink-2); font-size: var(--t-base); line-height: 1.65; }
  .prose :global(.contact-routes) { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); gap: var(--space-3); max-inline-size: 46em; margin: 0 0 var(--space-3); }
  .prose :global(.contact-routes > div) { display: grid; gap: var(--space-1); align-content: start; padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .prose :global(.contact-routes h3) { margin: 0; font-size: var(--t-md); }
  .prose :global(.contact-routes p) { margin: 0; color: var(--ink-2); font-size: var(--t-base); line-height: 1.65; }
  .prose :global(.contact-routes a.route) { display: inline-flex; align-items: center; min-block-size: var(--target-min); font-weight: 650; }
  .toc-fab { display: none; }
  .prose :global(.status.live) { background: color-mix(in srgb, var(--up) var(--status-tint), var(--panel-raised)); color: color-mix(in srgb, var(--up) 85%, var(--ink)); }
  .prose :global(.status) { display: inline-block; margin-inline-end: var(--space-1); padding: 0 7px; border-radius: var(--radius-pill); background: var(--warn-wash); color: var(--warn); font-size: var(--t-sm); font-weight: 600; line-height: 1.6; }
  .next { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin: var(--space-6) 0 0; padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); font-weight: 600; }
  .next a { display: inline-flex; align-items: center; min-block-size: var(--target-min); }
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
    .prose :global(td[data-label])::before { content: attr(data-label); display: block; color: var(--muted); font-size: var(--t-xs); font-weight: 600; }
    .prose :global(td:first-child) { font-weight: 600; }
    .prose :global(td:first-child)::before { display: none; }
  }
  @media (max-width: 56rem) {
    .doc-layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
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
    .toc-fab:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  }
</style>
