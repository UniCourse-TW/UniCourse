<script module lang="ts">
  export interface DocSection {
    id: string;
    title: string;
    /** Sub-headings (h3 ids) of a long section, listed indented under it in the contents. */
    children?: readonly DocSection[];
  }

  /** One plain-language point: a bold lead, the sentence, and optionally a link that ends it. */
  export interface GistPoint {
    lead: string;
    /** In-page section the lead jumps to. */
    href?: string;
    text: string;
    link?: { href: string; label: string; external?: boolean };
    /** Short facts on lines of their own under the sentence (e.g. one retention period per line). */
    lines?: readonly string[];
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
    /** The header's shortcut to the contact section, named as the action readers come for. */
    contactLabel?: string;
    children: Snippet;
  }

  let { title, updated, sections, sibling, summary = [], contactLabel, children }: Props = $props();
  let updatedLabel = $derived(updated.replaceAll('-', '/'));
  let contact = $derived(sections.find((section) => section.id === 'removal' || section.id === 'contact'));

  // Scroll-spy for the desktop table of contents: the section nearest the top is marked current.
  let currentId = $state('');
  // Before the observer has spoken (and without JavaScript) the first section is the current one.
  let shownId = $derived(currentId || sections[0]?.id);
  // Phones: the contents are one sticky row of chips; keep the current chip in view as the reader scrolls.
  let chipRow = $state<HTMLOListElement>();
  /** Phones: 「全部章節」 wraps the chip row into a full list, so every section is one tap away. */
  let listAll = $state(false);
  let hydrated = $state(false);
  /** The row fades at the side that still has chips beyond it. */
  let fadeEnd = $state(true);
  let fadeStart = $state(false);
  function readScroll() {
    if (!chipRow) return;
    const max = chipRow.scrollWidth - chipRow.clientWidth;
    fadeStart = chipRow.scrollLeft > 4;
    fadeEnd = max > 4 && chipRow.scrollLeft < max - 4;
  }
  $effect(() => {
    const id = shownId;
    if (!chipRow || chipRow.scrollWidth <= chipRow.clientWidth) return;
    const chip = chipRow.querySelector<HTMLElement>(`a[href="#${id}"]`);
    if (chip) chipRow.scrollTo({ left: chip.offsetLeft - chipRow.clientWidth / 2 + chip.offsetWidth / 2, behavior: 'smooth' });
  });

  onMount(() => {
    hydrated = true;
    readScroll();
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
      <span class="updated">更新於 <time datetime={updated}>{updatedLabel}</time></span>
      {#if contact}<span class="sep" aria-hidden="true">·</span><a class="contact-link arrow-link" href={`#${contact.id}`}><span>{contactLabel ?? contact.title}</span><span aria-hidden="true">↓</span></a>{/if}
      <span class="sep" aria-hidden="true">·</span><a class="arrow-link" href={sibling.href}><span>{sibling.label}</span><span aria-hidden="true">→</span></a>
    </p>
  </header>
  <div class="doc-layout" class:has-gist={summary.length > 0}>
    {#if summary.length}
      <section class="gist" aria-labelledby="gist-title">
        <h2 id="gist-title">白話重點</h2>
        <ul>
          {#each summary as point, index (index)}
            <li><strong>{#if point.href}<a class="lead-link" href={point.href}>{point.lead}</a>{:else}{point.lead}{/if}</strong>{point.text}{#if point.link}<a href={point.link.href} rel={point.link.external ? 'noopener external' : undefined}>{point.link.label}{#if point.link.external}<span aria-hidden="true"> ↗</span>{/if}</a>。{/if}{#if point.lines?.length}<span class="gist-lines">{#each point.lines as line (line)}<span>{line}</span>{/each}</span>{/if}</li>
          {/each}
        </ul>
      </section>
    {/if}
    <nav class="doc-toc" id="toc" aria-label="目錄" class:all={listAll}>
      <!-- Phones only: the sticky chip row can open into the full list of sections. -->
      {#if hydrated}<button type="button" class="toc-all" aria-expanded={listAll} aria-controls="toc-list" onclick={() => { listAll = !listAll; }}>{listAll ? '收合' : '全部章節'}<span aria-hidden="true">{listAll ? ' ▴' : ' ▾'}</span></button>{/if}
      <!-- Open in the markup: desktop shows the sticky list, phones show the sections as a row of chips near the
           top (the jump list), which the reader can still fold away. -->
      <details open>
        <summary>目錄</summary>
        <ol bind:this={chipRow} id="toc-list" class:fade-end={fadeEnd && !listAll} class:fade-start={fadeStart && !listAll} onscroll={readScroll}>
          {#each sections as section (section.id)}
            <li>
              <a href={`#${section.id}`} aria-current={shownId === section.id ? 'location' : undefined} onclick={() => (listAll = false)}>{section.title}</a>
              {#if section.children?.length}
                <ol class="sub">
                  {#each section.children as child (child.id)}<li><a href={`#${child.id}`} onclick={() => (listAll = false)}>{child.title}</a></li>{/each}
                </ol>
              {/if}
            </li>
          {/each}
          <li class="sibling"><a class="arrow-link" href={sibling.href}><span>{sibling.label}</span><span aria-hidden="true">→</span></a></li>
        </ol>
      </details>
    </nav>
    <div class="prose">
      {@render children()}
      <p class="next">
        <a href="#top-of-doc" class="back"><span aria-hidden="true">↑</span><span>回到頂端</span></a>
        <a href={sibling.href}><span>另請參閱{sibling.label}</span><span aria-hidden="true">→</span></a>
      </p>
    </div>
  </div>
</article>

<style>
  /* The document is centred at its natural width (contents + 52 em measure) instead of hugging the left edge. */
  .doc { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); max-inline-size: 66rem; min-inline-size: 0; margin-inline: auto; color: var(--ink); font: var(--t-md) / var(--leading-body) var(--font-sans); }
  .arrow-link { display: inline-flex; gap: 0.3em; align-items: center; }
  .doc-head { display: grid; gap: var(--space-1); }
  /* The gist shares the prose column: same left edge as the first h2 and the same 52 em measure. */
  .gist { grid-column: 2; max-inline-size: 52em; padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-inline-start: 3px solid var(--brand); border-radius: var(--radius-panel); background: var(--panel); }
  .gist h2 { margin: 0 0 var(--space-1); font-size: var(--t-base); font-weight: 650; color: var(--ink-2); }
  .gist ul { display: grid; gap: var(--space-1); margin: 0; padding-inline-start: 1.2em; color: var(--ink); font-size: var(--t-md); line-height: 1.75; }
  .gist li strong { margin-inline-end: 0.35em; color: var(--ink); font-weight: 650; }
  .gist li strong::after { content: '：'; }
  .gist-lines { display: grid; margin-block-start: 2px; color: var(--ink-2); font-size: var(--t-base); line-height: 1.6; }
  .gist-lines span::before { content: '・'; color: var(--muted); }
  .gist a { font-weight: 600; }
  /* The lead words are jump links: invisible padding makes 44 px targets without moving the text. */
  /* Bold leads without an underline (they read as labels); hover and focus show they jump to the section. */
  .gist .lead-link { padding: 0.75rem 0.5rem; margin-inline: -0.5rem; color: var(--ink); text-decoration: none; }
  .gist .lead-link:hover { color: var(--brand-ink); text-decoration: underline; text-underline-offset: 0.2em; }
  h1 { margin: 0; font-size: var(--t-2xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .meta { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .meta .sep { margin-inline: 0.4em; color: var(--muted); }
  .meta a, .doc-toc a, .next a, .prose :global(a) { color: var(--brand-ink); text-underline-offset: 0.15em; }
  :is(.meta, .doc-toc, .next, .prose) :global(a:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: 2px; }

  .doc-layout { display: grid; grid-template-columns: 13.5rem minmax(0, 1fr); gap: var(--space-5) var(--space-8); align-items: start; }
  .doc-toc { grid-column: 1; grid-row: 1; align-self: start; position: sticky; inset-block-start: 4.75rem; font-size: var(--t-md); }
  .has-gist .doc-toc { grid-row: 1 / span 2; }
  .prose { grid-column: 2; }
  /* The first h2 sits as far below the gist as every h2 sits below the previous section. */
  .has-gist .prose { padding-block-start: var(--space-4); }
  .doc-toc details { border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .doc-toc summary { padding: var(--space-2) var(--space-3); color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; list-style: none; pointer-events: none; }
  .doc-toc summary::-webkit-details-marker { display: none; }
  .doc-toc details::details-content { display: block; content-visibility: visible; }
  .doc-toc ol { display: grid; margin: 0; padding: 0 var(--space-2) var(--space-2); list-style: none; }
  .doc-toc li a { display: flex; align-items: center; min-block-size: 2.25rem; padding: 0 var(--space-2); border-inline-start: 2px solid transparent; border-radius: 0 var(--radius-control) var(--radius-control) 0; color: var(--ink-2); text-decoration: none; }
  .doc-toc li a:hover { background: var(--brand-wash); color: var(--brand-ink); }
  .doc-toc li a[aria-current] { border-inline-start-color: var(--brand); color: var(--brand-ink); font-weight: 600; background: var(--brand-wash); }
  /* Sub-sections hang off a rule under their parent, so they never read as siblings of it. */
  .doc-toc .sub { display: grid; margin: 0 0 var(--space-1) var(--space-5); padding: 0; border-inline-start: 1px solid var(--control-line); list-style: none; }
  .doc-toc .sub a { min-block-size: 2rem; color: var(--ink-2); font-size: 0.8125rem; }
  .doc-toc .sub a::before { content: '–'; margin-inline-end: var(--space-1); color: var(--muted); }
  .doc-toc .sibling { margin-block-start: var(--space-1); padding-block-start: var(--space-1); border-block-start: 1px solid var(--line); }
  .doc-toc .sibling a { color: var(--brand-ink); font-weight: 600; }
  .toc-all { display: none; }

  /* Long-form text: 15 px on 1.85 (storyboard). One measure for text and tables alike: each section is
     52 em at the prose size and tables fill it. */
  .prose :global(section) { max-inline-size: 52em; }
  .prose { min-inline-size: 0; font-size: 0.9375rem; line-height: 1.85; overflow-wrap: anywhere; hanging-punctuation: none; }
  /* No orphan characters at the end of a paragraph (「覆。」 alone on a line), on phones or desktop. */
  .prose :global(:is(p, li, td, h3)), .gist li { text-wrap: pretty; }
  .prose :global(h2) { margin: var(--space-8) 0 var(--space-2); font-size: var(--t-xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); scroll-margin-block-start: 4.75rem; }
  .prose :global(h3) { margin: var(--space-6) 0 var(--space-1); font-size: var(--t-lg); font-weight: 650; line-height: var(--leading-tight); scroll-margin-block-start: 4.75rem; }
  .prose :global(p), .prose :global(ul), .prose :global(ol) { margin: 0 0 var(--space-3); }
  .prose :global(ul), .prose :global(ol) { padding-inline-start: 1.4em; }
  .prose :global(li) { margin-block-end: 6px; }
  .prose :global(li:last-child) { margin-block-end: 0; }
  .prose :global(table) { inline-size: 100%; margin: 0 0 var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); border-collapse: separate; border-spacing: 0; overflow: hidden; background: var(--panel-raised); font-size: var(--t-base); line-height: var(--leading-table); }
  .prose :global(th), .prose :global(td) { padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); text-align: start; vertical-align: top; }
  .prose :global(th) { background: var(--table-head); color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; }
  .prose :global(tr:last-child td) { border-block-end: 0; }
  /* Code inside CJK sentences sits on a chip that moves to the next line whole; it never breaks mid-word. */
  .prose :global(code) { padding: 1px 5px; border-radius: 4px; background: var(--chip); color: var(--ink); font-family: var(--font-mono); font-size: 0.88em; white-space: nowrap; }
  /* Identifier columns (board names) never break mid-word; the remarks column takes the wrapping. */
  /* Boards: the table fills the measure; name and school take their content width, remarks the rest. */
  .prose :global(table.boards) { inline-size: 100%; }
  .prose :global(table.boards :is(td, th):is(:first-child, :nth-child(2))) { inline-size: 1%; }
  .prose :global(table.boards td:first-child), .prose :global(table.boards th:first-child) { white-space: nowrap; font-family: var(--font-mono); }
  .prose :global(table.boards td:nth-child(2)) { white-space: nowrap; }
  /* The data-kind column of the sources table reads as one unit (課程與修課人數 never breaks before its last word). */
  .prose :global(table.sources th:first-child), .prose :global(table.sources td:first-child) { inline-size: 9.5rem; white-space: nowrap; }
  .prose :global(.contact-routes .route-meta) { display: grid; gap: 2px; margin: 0; padding-inline-start: 1.2em; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  .prose :global(.contact-routes .route-meta li) { margin: 0; }
  .prose :global(p.update-note a.private) { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: 2rem; font-weight: 600; }
  .prose :global(.callout) { margin: 0 0 var(--space-3); padding: var(--space-3) var(--space-4); border-inline-start: 3px solid var(--brand); border-radius: var(--radius-control); background: var(--panel); color: var(--ink-2); }
  .prose :global(.callout .note) { display: block; margin-block-start: var(--space-2); color: var(--ink-2); font-size: var(--t-base); line-height: 1.65; }
  .prose :global(.contact-routes) { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); gap: var(--space-3); margin: 0 0 var(--space-3); }
  .prose :global(.h2-row) { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); align-items: baseline; margin: var(--space-8) 0 var(--space-2); }
  .prose :global(section:first-of-type .h2-row) { margin-block-start: 0; }
  .prose :global(.h2-row h2) { margin: 0; }
  /* A section's one-paragraph answer before the detail: what, and what to do. */
  .prose :global(p.lead) { padding: var(--space-2) var(--space-3); border: 1px solid var(--line); border-inline-start: 3px solid var(--brand); border-radius: var(--radius-control); background: var(--panel); color: var(--ink-2); font-size: inherit; line-height: inherit; }
  .prose :global(p.lead strong) { color: var(--ink); }
  .prose :global(.contact-routes > div) { display: grid; gap: var(--space-1); align-content: start; padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  /* The private route is the one most readers come for: brand edge and tint; the public one stays plain. */
  .prose :global(.contact-routes > div:has(.route-kind.private)) { border-color: color-mix(in srgb, var(--brand) 45%, var(--line)); border-inline-start: 3px solid var(--brand); background: color-mix(in srgb, var(--brand) 5%, var(--panel)); }
  .prose :global(.contact-routes h3) { margin: 0; font-size: var(--t-md); }
  .prose :global(.contact-routes .route-kind) { justify-self: start; margin: 0; padding: 0 var(--space-2); border-radius: var(--radius-pill); background: var(--brand-wash); color: var(--brand-ink); font-size: 0.8125rem; font-weight: 650; line-height: 1.7; }
  .prose :global(.contact-routes .route-kind.public) { background: var(--chip); color: var(--ink-2); }
  /* Who will see it sits inside the link, so the button names its purpose and its audience together. */
  .prose :global(.contact-routes a.route) { flex-wrap: wrap; }
  .prose :global(.contact-routes .who-sees) { padding: 0 var(--space-2); border-radius: var(--radius-pill); background: var(--chip); color: var(--ink); font-size: 0.8125rem; font-weight: 600; line-height: 1.7; }
  .prose :global(td .opt) { margin-inline-start: var(--space-2); padding: 0 6px; border-radius: var(--radius-pill); box-shadow: inset 0 0 0 1px var(--control-line); color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; white-space: nowrap; }
  .prose :global(.contact-routes p) { margin: 0; color: var(--ink-2); font-size: var(--t-base); line-height: 1.65; }
  .prose :global(.contact-routes a.route) { display: inline-flex; align-items: center; gap: var(--space-1); justify-self: start; min-block-size: var(--target-min); font-weight: 650; }
  /* Who can read it and what it needs, said before the button. */
  .prose :global(.contact-routes .route-access) { margin-block-start: var(--space-1) !important; color: var(--ink); font-size: var(--t-base); font-weight: 650; }
  /* Name, then who sees it right beside the name, then what it is for. */
  .prose :global(.account-data th:first-child) { inline-size: 40%; }
  .prose :global(.account-data :is(td, th):nth-child(2)) { inline-size: 1%; white-space: nowrap; }
  /* Who can see a piece of data, as one badge kind per answer (公開 / 選填公開 / 不公開 / 只公開合計). */
  .prose :global(.scope) { display: inline-block; padding: 0 var(--space-2); border-radius: var(--radius-pill); font-size: 0.8125rem; font-weight: 650; line-height: 1.7; white-space: nowrap; }
  /* Public is filled brand with an open-eye dot; not public is an outlined grey badge with a bar, so the two
     differ by shape and fill, not only by one character. */
  .prose :global(.scope::before) { margin-inline-end: 0.3em; }
  .prose :global(.scope.public) { background: var(--brand-wash); color: var(--brand-ink); }
  .prose :global(.scope.public::before) { content: '●'; font-size: 0.75em; vertical-align: 0.1em; }
  .prose :global(.scope.optional) { background: var(--brand-wash); color: var(--brand-ink); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand) 40%, transparent); }
  .prose :global(.scope.private) { background: transparent; color: var(--ink-2); box-shadow: inset 0 0 0 1px var(--control-line); }
  .prose :global(.scope.private::before) { content: '—'; color: var(--muted); }
  .prose :global(.review-data td:first-child) { inline-size: 8rem; }
  .prose :global(.doc-fold) { margin-block-end: var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel); }
  .prose :global(.doc-fold summary) { min-block-size: var(--target-min); padding: var(--space-2) var(--space-3); scroll-margin-block-start: 5rem; color: var(--brand-ink); font-weight: 650; cursor: pointer; }
  .prose :global(.doc-fold summary:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: var(--radius-control); }
  .prose :global(.doc-fold > :not(summary)) { inline-size: calc(100% - 2 * var(--space-3)); margin-inline: var(--space-3); }
  /* Shared conditions for both contact routes, said once before the two cards. */
  .prose :global(.routes-shared) { color: var(--ink-2); font-size: var(--t-base); }
  .prose :global(.contact-routes .route-needs) { color: var(--ink-2); font-size: var(--t-base); }
  .next { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin: var(--space-6) 0 0; padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); font-size: var(--t-base); font-weight: 500; }
  .next a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); }
  .next .back { color: var(--ink-2); }
  .next .back:hover { color: var(--brand-ink); }

  /* Two- and three-column text tables stack on phones; the column name comes from data-label. */
  @media (max-width: 40rem) {
    .prose :global(table.stacked), .prose :global(.stacked tbody), .prose :global(.stacked tr), .prose :global(.stacked td) { display: block; }
    /* The header row stays in the accessibility tree; only its pixels go. */
    .prose :global(.stacked thead) { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .prose :global(.stacked tr) { padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); }
    .prose :global(.stacked tr:last-child) { border-block-end: 0; }
    .prose :global(.stacked td) { padding: 2px 0; border: 0; }
    /* Each cell is one row: the column name in a 5.5 rem label column, the value beside it. */
    .prose :global(.stacked td[data-label]) { display: grid; grid-template-columns: 5.5rem minmax(0, 1fr); gap: var(--space-2); }
    .prose :global(.stacked td[data-label])::before { content: attr(data-label); color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; line-height: inherit; }
    .prose :global(.stacked td:first-child) { display: block; padding-block-end: var(--space-1); font-weight: 600; }
    .prose :global(.stacked td:first-child)::before { display: none; }
    /* Boards read top to bottom: board name, then its school, then the remark. */
    /* Boards: one line per board (name・school), the remark under it with its short label. */
    .prose :global(.stacked.boards tr) { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: baseline; }
    .prose :global(.stacked.boards td[data-label]) { display: block; inline-size: auto; padding: 0; white-space: normal; }
    .prose :global(.stacked.boards td:first-child) { white-space: nowrap; }
    .prose :global(.stacked.boards td:nth-child(2))::before { display: none; }
    .prose :global(.stacked.boards td:nth-child(2)) { color: var(--ink-2); font-size: var(--t-base); }
    .prose :global(.stacked.boards td:first-child) { padding-block-end: 0; }
    .prose :global(.stacked.boards td:last-child) { flex-basis: 100%; color: var(--ink-2); font-size: 0.8125rem; }
    .prose :global(.stacked.boards td:last-child)::before { content: '備註　'; display: inline; color: var(--ink-2); font-weight: 650; }
    /* Account data: the name with its public status beside it, the purpose on the line below. */
    .prose :global(.stacked.account-data tr) { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 var(--space-2); align-items: baseline; }
    .prose :global(.stacked.account-data td:first-child) { grid-row: 1; grid-column: 1; padding: 0; }
    .prose :global(.stacked.account-data td:nth-child(2)) { grid-row: 1; grid-column: 2; display: block; padding: 0; white-space: nowrap; }
    .prose :global(.stacked.account-data td:nth-child(2))::before { display: none; }
    .prose :global(.stacked.account-data td:last-child) { grid-row: 2; grid-column: 1 / -1; display: block; color: var(--ink-2); font-size: 0.8125rem; }
    .prose :global(.stacked.account-data td:last-child)::before { display: none; }
    .prose :global(.review-data td:first-child) { inline-size: auto; }
    .prose :global(table.sources th:first-child), .prose :global(table.sources td:first-child) { inline-size: auto; white-space: normal; }
  }
  @media (max-width: 56rem) {
    .doc-layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    /* The date on its own line, the two links together on the next (no link left alone on a third). */
    .meta { display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--space-3); }
    .meta .updated { flex-basis: 100%; }
    .meta .sep { display: none; }
    .meta a { display: inline-flex; align-items: center; min-block-size: var(--target-min); }
    /* Phones: the contents first, as one sticky row of section chips under the site header (the same row
       as the course page), the section in view filled; then the gist and the text. No per-section
       「回目錄」 links: the row is always there. */
    .gist, .doc-toc, .has-gist .doc-toc, .prose { grid-column: 1; grid-row: auto; }
    .doc-toc { order: 0; }
    .gist { order: 1; }
    .prose { order: 2; }
    /* Under the one-row site header (two rows below 39 rem, see the rule after this block). */
    .doc-toc { position: sticky; inset-block-start: calc(3.75rem + 1px); z-index: 5; margin-inline: calc(-1 * clamp(1rem, 3vw, 2.5rem)); margin-block: calc(-1 * var(--space-2)) 0; background: var(--bg); border-block-end: 1px solid var(--line); }
    .doc-toc { display: flex; align-items: center; }
    .doc-toc details { flex: 1 1 auto; min-inline-size: 0; border: 0; border-radius: 0; background: none; }
    /* 「全部章節」 leads the row (never scrolls away); opened, the chips wrap into the full list. */
    .toc-all { display: inline-flex; flex: none; align-items: center; min-block-size: var(--target-min); margin-inline-start: clamp(1rem, 3vw, 2.5rem); padding: 0 var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--brand-ink); font: 650 var(--t-base) / 1 var(--font-sans); cursor: pointer; touch-action: manipulation; }
    .toc-all:focus-visible { outline: var(--focus-ring); outline-offset: -2px; }
    .doc-toc.all { align-items: flex-start; padding-block: var(--space-1); }
    .doc-toc.all ol { flex-wrap: wrap; overflow: visible; padding-block: 0; }
    .doc-toc:has(.toc-all) ol { padding-inline-start: var(--space-2); }
    /* A fade on the cut side says the row scrolls. */
    .doc-toc ol.fade-end { mask-image: linear-gradient(to right, #000 calc(100% - 2.5rem), transparent); }
    .doc-toc ol.fade-start { mask-image: linear-gradient(to right, transparent, #000 2.5rem); }
    .doc-toc ol.fade-start.fade-end { mask-image: linear-gradient(to right, transparent, #000 2.5rem, #000 calc(100% - 2.5rem), transparent); }
    .doc-toc summary { display: none; }
    .doc-toc ol { display: flex; flex-wrap: nowrap; gap: var(--space-2); padding: var(--space-1) clamp(1rem, 3vw, 2.5rem); overflow-x: auto; scrollbar-width: none; }
    .doc-toc ol::-webkit-scrollbar { display: none; }
    .doc-toc li, .doc-toc .sub { display: contents; }
    .doc-toc li a { flex: none; min-block-size: var(--target-min); padding: 0 var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-pill); background: var(--panel-raised); color: var(--ink-2); font-size: var(--t-base); font-weight: 650; white-space: nowrap; }
    .doc-toc .sub a { color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; }
    .doc-toc .sub a::before { content: '└'; margin-inline-end: var(--space-1); color: var(--ink-2); }
    .doc-toc li a[aria-current] { border-color: var(--brand); background: var(--brand); color: var(--on-brand); font-weight: 650; }
    .doc-toc .sibling { display: none; }
    .prose :global(h2), .prose :global(h3), .prose :global(.doc-fold summary) { scroll-margin-block-start: 9.75rem; }
    .prose :global(section + section .h2-row) { margin-block-start: var(--space-5); }
  }
  @media (max-width: 39rem) {
    .doc-toc { inset-block-start: calc(2 * var(--target-min) + var(--space-1) + 1px); }
  }
</style>
