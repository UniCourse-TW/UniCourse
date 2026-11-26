<script lang="ts">
  import type { Snippet } from 'svelte';

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
    children: Snippet;
  }

  let { title, updated, sections, sibling, children }: Props = $props();
  let updatedLabel = $derived(updated.replaceAll('-', '/'));
</script>

<article class="doc">
  <header class="doc-head">
    <h1>{title}</h1>
    <p class="meta">更新於 <time datetime={updated}>{updatedLabel}</time> · 另請參閱 <a href={sibling.href}>{sibling.label}</a></p>
  </header>
  <div class="doc-layout">
    <nav class="doc-toc" aria-label="目錄">
      <!-- Closed in the markup so phones start collapsed; desktop CSS keeps the list visible regardless. -->
      <details>
        <summary>目錄</summary>
        <ol>
          {#each sections as section (section.id)}
            <li><a href={`#${section.id}`}>{section.title}</a></li>
          {/each}
          <li class="sibling"><a href={sibling.href}>{sibling.label} <span aria-hidden="true">→</span></a></li>
        </ol>
      </details>
    </nav>
    <div class="prose">
      {@render children()}
      <p class="next"><a href={sibling.href}>另請參閱{sibling.label} <span aria-hidden="true">→</span></a></p>
    </div>
  </div>
</article>

<style>
  .doc { display: grid; gap: var(--space-5); min-inline-size: 0; color: var(--ink); font: var(--t-md) / var(--leading-body) var(--font-sans); }
  .doc-head { display: grid; gap: var(--space-1); }
  h1 { margin: 0; font-size: var(--t-2xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .meta { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .meta a, .doc-toc a, .next a, .prose :global(a) { color: var(--brand-ink); text-underline-offset: 0.15em; }
  :is(.meta, .doc-toc, .next, .prose) :global(a:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: 2px; }

  .doc-layout { display: grid; grid-template-columns: 14rem minmax(0, 52em); gap: var(--space-8); align-items: start; }
  .doc-toc { position: sticky; inset-block-start: var(--space-4); font-size: var(--t-base); }
  .doc-toc details { border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .doc-toc summary { padding: var(--space-2) var(--space-3); color: var(--muted); font-size: var(--t-sm); font-weight: 600; list-style: none; pointer-events: none; }
  .doc-toc summary::-webkit-details-marker { display: none; }
  .doc-toc details::details-content { display: block; content-visibility: visible; }
  .doc-toc ol { display: grid; margin: 0; padding: 0 var(--space-2) var(--space-2); list-style: none; }
  .doc-toc li a { display: flex; align-items: center; min-block-size: 2.25rem; padding: 0 var(--space-2); border-radius: var(--radius-control); color: var(--ink-2); text-decoration: none; }
  .doc-toc li a:hover { background: var(--brand-wash); color: var(--brand-ink); }
  .doc-toc .sibling { margin-block-start: var(--space-1); padding-block-start: var(--space-1); border-block-start: 1px solid var(--line); }
  .doc-toc .sibling a { color: var(--brand-ink); font-weight: 600; }

  /* Long-form text: 15 px on 1.8, 52 em measure, h2 20 px with 28 px above. */
  .prose { min-inline-size: 0; font-size: var(--t-md); line-height: var(--leading-prose); overflow-wrap: anywhere; hanging-punctuation: none; }
  .prose :global(h2) { margin: var(--space-8) 0 var(--space-2); font-size: var(--t-xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); scroll-margin-block-start: var(--space-4); }
  .prose :global(section:first-of-type h2) { margin-block-start: 0; }
  .prose :global(h3) { margin: var(--space-5) 0 var(--space-1); font-size: var(--t-lg); font-weight: 650; line-height: var(--leading-tight); }
  .prose :global(p), .prose :global(ul), .prose :global(ol) { margin: 0 0 var(--space-3); }
  .prose :global(ul), .prose :global(ol) { padding-inline-start: 1.4em; }
  .prose :global(li) { margin-block-end: var(--space-1); }
  .prose :global(table) { inline-size: 100%; margin: 0 0 var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); border-collapse: separate; border-spacing: 0; overflow: hidden; background: var(--panel-raised); font-size: var(--t-base); line-height: var(--leading-table); }
  .prose :global(th), .prose :global(td) { padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); text-align: start; vertical-align: top; }
  .prose :global(th) { background: var(--table-head); color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .prose :global(tr:last-child td) { border-block-end: 0; }
  .prose :global(code) { font-family: var(--font-mono); font-size: 0.9em; }
  .prose :global(.callout) { margin: 0 0 var(--space-3); padding: var(--space-3) var(--space-4); border-inline-start: 3px solid var(--brand); border-radius: var(--radius-control); background: var(--panel); color: var(--ink-2); }
  .next { margin: var(--space-6) 0 0; padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); font-weight: 600; }
  .next a { display: inline-flex; align-items: center; min-block-size: var(--target-min); }

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
  }
</style>
