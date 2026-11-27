<script lang="ts">
  import { onMount } from 'svelte';
  import {
    categoryLabels, isOfficial, kindLabels, loginLabel, operatorLabels, sourceLabels, statusLabels, type Site
  } from '$lib/landscape-data';

  interface Props {
    /** Accessible name of the list, e.g. 國立臺灣大學的課程網站. */
    label: string;
    sites: readonly Site[];
    /** Show who runs each site (cross-school tables); per-school lists only show it for third parties. */
    showOperator?: boolean;
    /** Long lists show this many rows and fold the rest behind a disclosure (works without JavaScript). */
    collapseAfter?: number;
    /** A column header row on wide screens (the cross-school table, which has no section of its own). */
    header?: boolean;
  }

  let { label, sites, showOperator = false, collapseAfter, header = false }: Props = $props();
  let hydrated = $state(false);
  onMount(() => { hydrated = true; });
  let openBatches = $state<Record<string, boolean>>({});
  let head = $derived(collapseAfter && sites.length > collapseAfter ? sites.slice(0, collapseAfter) : sites);
  const batchSize = 10;
  let batches = $derived.by(() => {
    const sections: (readonly Site[])[] = [];
    for (let index = head.length; index < sites.length; index += batchSize) sections.push(sites.slice(index, index + batchSize));
    return sections;
  });

  let shown = $derived(head.length + batches.reduce((count, batch) => count + (openBatches[batch[0].url] ? batch.length : 0), 0));

  /** A click anywhere on a row with notes (not on a link or the disclosure itself) opens them. */
  function toggleRow(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('a, summary, dl')) return;
    const details = (event.currentTarget as HTMLElement).querySelector('details');
    if (details?.getClientRects().length) details.open = !details.open;
  }

  function host(url: string) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
</script>

{#snippet row(site: Site)}
  {@const official = isOfficial(site)}
  {@const hasNotes = Boolean(site.notes || site.repo || (site.operatorName && official && !showOperator))}
  {@const shortDescription = !hasNotes && Boolean(site.features && site.features.length <= 48)}
  {@const detail = hasNotes || Boolean(site.features)}
  <!-- The whole row is a pointer shortcut. The summary also works from the keyboard and without JavaScript. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions (the summary is the keyboard control) -->
  <li class:third={!official} class:expandable={detail} onclick={detail ? toggleRow : undefined}>
    <span class="kind">{kindLabels[official ? 'official' : 'third']}</span>
    <span class="name">
      <a href={site.url} rel="noopener external">{site.name}<span class="ext" aria-hidden="true"> ↗</span></a>
      <small class="host">{host(site.url)}{#if (showOperator || !official) && site.operatorName} · {site.operatorName}{/if}{#if site.sourceType !== 'web'}<span class="form">{sourceLabels[site.sourceType]}</span>{/if}</small>
    </span>
    <span class="cats">
      {#each site.category as category (category)}<span class="cat">{categoryLabels[category]}</span>{/each}
    </span>
    <span class="site-state">
      <span class="login">{loginLabel(site.loginRequired)}</span>
      <span class="status st {site.status}"><i aria-hidden="true"></i>{statusLabels[site.status]}</span>
    </span>
    <span class="features">
      {#if shortDescription}<span class="text">{site.features}</span>{/if}
      {#if detail}
        <details class="more" class:phone-only={shortDescription}>
          <summary><span class="text">{site.features ?? '說明與原始碼'}</span><span class="chev" aria-hidden="true"></span><span class="notes-label">查看網站說明</span></summary>
          {#if site.notes || site.repo || (site.operatorName && official && !showOperator)}<dl>
            {#if site.notes}<dt>說明</dt><dd>{site.notes}</dd>{/if}
            {#if site.operatorName && official && !showOperator}<dt>營運者</dt><dd>{operatorLabels[site.operator]}（{site.operatorName}）</dd>{/if}
            {#if site.repo}<dt>原始碼</dt><dd><a href={site.repo} rel="noopener external">{host(site.repo)}{site.repo.replace(/^https?:\/\/[^/]+/, '')}</a></dd>{/if}
          </dl>{/if}
        </details>
      {:else}
        <span class="text">{site.features ?? '—'}</span>
      {/if}
    </span>
  </li>
{/snippet}

<div class="sites-box">
  {#if header}
    <!-- Same order as the third-party table above: site, functions, login, status; then the notes. -->
    <div class="cols" aria-hidden="true"><span>類型</span><span>網站</span><span>功能</span><span>登入</span><span>狀態</span><span>說明</span></div>
  {/if}
  <ul class="sites" aria-label={label}>
    {#each head as site (site.url)}{@render row(site)}{/each}
  </ul>
  {#each batches as batch, index (batch[0].url)}
    {@const start = head.length + index * batchSize + 1}
    <details class="rest" ontoggle={(event) => (openBatches[batch[0].url] = event.currentTarget.open)}>
      <summary><span class="closed">再顯示 {batch.length} 個</span><span class="opened">收合第 {start}–{start + batch.length - 1} 個</span></summary>
      <ul class="sites" aria-label="{label}（第 {start}–{start + batch.length - 1} 個）">
        {#each batch as site (site.url)}{@render row(site)}{/each}
      </ul>
    </details>
  {/each}
  {#if batches.length && hydrated}<p class="shown-count" aria-live="polite">已列出 {shown}／{sites.length} 個</p>{/if}
</div>

<style>
  .sites-box {
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel-raised);
    color: var(--ink);
    font: var(--t-base) / var(--leading-table) var(--font-sans);
    overflow: hidden;
  }
  .sites { display: grid; margin: 0; padding: 0; list-style: none; }
  .rest > summary {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: var(--target-min);
    padding: 0 var(--space-3);
    border-block-start: 1px solid var(--line);
    color: var(--brand-ink);
    font-weight: 600;
    cursor: pointer;
    list-style: none;
  }
  .rest:not([open]) ~ .rest:not([open]), .rest[open] .closed, .rest:not([open]) .opened { display: none; }
  .rest > summary::-webkit-details-marker { display: none; }
  .rest > summary::before { content: '＋'; color: var(--muted); }
  .rest[open] > summary::before { content: '－'; }
  .rest[open] > summary { position: sticky; inset-block-start: 0; background: var(--panel-raised); }
  .rest .sites li:first-child { border-block-start: 1px solid var(--line); }
  li {
    display: grid;
    grid-template-columns: 3.5rem minmax(12rem, 1.3fr) minmax(7rem, 0.9fr) 5.5rem 4.75rem minmax(12rem, 2fr);
    gap: var(--space-1) var(--space-3);
    align-items: start;
    padding: var(--space-2) var(--space-3);
    border-block-start: 1px solid var(--line);
    min-inline-size: 0;
  }
  li:first-child { border-block-start: 0; }
  .cols {
    display: grid;
    grid-template-columns: 3.5rem minmax(12rem, 1.3fr) minmax(7rem, 0.9fr) 5.5rem 4.75rem minmax(12rem, 2fr);
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-block-end: 1px solid var(--line);
    background: var(--table-head);
    color: var(--muted);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  li:hover { background: var(--hover-row); }
  .kind { color: var(--muted); font-size: var(--t-sm); font-weight: 600; line-height: 1.5; }
  .third .kind { color: var(--series-2); }
  /* Name and host share a line when they fit, so most rows stay one line tall. */
  .name { display: flex; flex-wrap: wrap; column-gap: var(--space-2); align-items: baseline; min-inline-size: 0; }
  .name a { color: var(--brand-ink); font-weight: 600; text-underline-offset: 0.15em; text-decoration: none; overflow-wrap: anywhere; }
  .name a:hover { text-decoration: underline; }
  .name a:focus-visible, summary:focus-visible, dd a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: 2px; }
  .rest > summary:focus-visible { outline-offset: calc(-1 * var(--focus-offset)); }
  .ext { color: var(--muted); font-weight: 400; }
  .host { color: var(--muted); font-size: var(--t-xs); overflow-wrap: anywhere; }
  .cats { display: flex; flex-wrap: wrap; gap: 2px var(--space-1); min-inline-size: 0; }
  .cat {
    padding: 0 6px;
    border-radius: var(--radius-pill);
    background: var(--chip);
    color: var(--ink-2);
    font-size: var(--t-xs);
    line-height: 1.5;
    white-space: nowrap;
  }
  .login { color: var(--ink-2); white-space: nowrap; font-size: var(--t-sm); line-height: 1.5; }
  /* Status as a small dot and the word (same as the third-party table above), not a pill per row. */
  .site-state { display: contents; }
  .status { white-space: nowrap; }
  .st { display: inline-flex; gap: 0.4em; align-items: center; color: var(--ink-2); font-size: var(--t-sm); line-height: 1.5; }
  .st i { inline-size: 8px; block-size: 8px; border-radius: 50%; }
  .st.active { color: var(--ink); }
  .st.active i { background: var(--up); }
  .st.inactive i { background: var(--down); }
  .st.unknown i { border: 1.5px solid var(--muted); }
  .features { color: var(--ink-2); min-inline-size: 0; font-size: var(--t-sm); line-height: 1.5; overflow-wrap: anywhere; }
  .form { margin-inline-start: var(--space-1); padding: 0 5px; border: 1px solid var(--line); border-radius: var(--radius-pill); color: var(--ink-2); font-size: var(--t-xs); white-space: nowrap; }
  .notes-label { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .shown-count { margin: 0; padding: var(--space-2) var(--space-3); border-block-start: 1px solid var(--line); color: var(--muted); font-size: var(--t-sm); }
  li.expandable { cursor: pointer; }
  .more { display: block; }
  .more.phone-only { display: none; }
  .more > summary { display: flex; gap: var(--space-2); align-items: baseline; justify-content: space-between; border-radius: var(--radius-control); cursor: pointer; list-style: none; }
  .more > summary::-webkit-details-marker { display: none; }
  .text { min-inline-size: 0; color: var(--ink-2); }
  .more:not([open]) .text { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; }
  /* A quiet chevron instead of a repeated 「＋備註」 label on every row. */
  .chev { flex: none; inline-size: 1.25rem; color: var(--muted); text-align: center; }
  .chev::before { content: '▾'; }
  .more[open] .chev::before { content: '▴'; }
  li.expandable:hover .chev { color: var(--brand-ink); }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px var(--space-3); margin: var(--space-1) 0 0; padding: var(--space-2); border-radius: var(--radius-control); background: var(--chip); color: var(--ink-2); cursor: auto; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
  dd a { color: var(--brand-ink); }

  @media (max-width: 56rem) {
    .cols { display: none; }
    li {
      grid-template-columns: 3rem minmax(0, 1fr) auto;
      grid-template-areas: 'kind name status' 'kind cats login' 'kind features features';
      row-gap: 2px;
    }
    .kind { grid-area: kind; }
    .name { grid-area: name; }
    .status { grid-area: status; }
    .cats { grid-area: cats; }
    .login { grid-area: login; text-align: end; }
    .features { grid-area: features; }
  }
  @media (max-width: 40rem) {
    li {
      grid-template-columns: minmax(0, 1fr) max-content;
      grid-template-areas: 'name state' 'cats features';
      gap: 0 var(--space-2);
      align-items: center;
      padding-block: var(--space-1);
    }
    .site-state { grid-area: state; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-1); justify-content: end; }
    .kind { grid-area: cats; align-self: center; }
    .cats { margin-inline-start: 2.3rem; align-items: center; }
    .status { order: -1; }
    .name a { min-block-size: var(--target-min); align-content: center; }
    .host { display: none; }
    .login { text-align: start; }
    .features { inline-size: 100%; }
    .features > .text { display: none; }
    .more.phone-only { display: block; }
    .more:not([open]) .text { display: none; }
    .more > summary { min-block-size: var(--target-min); align-items: center; color: var(--brand-ink); }
    .notes-label { position: static; inline-size: auto; block-size: auto; clip-path: none; order: -1; }
    .more[open] > summary { flex-wrap: wrap; }
    .more[open] > summary .text { flex-basis: 100%; order: 1; }
    li:has(.more[open]) { grid-template-areas: 'name state' 'cats cats' 'features features'; }
  }
  @media (prefers-reduced-motion: no-preference) {
    li { transition: background-color 120ms; }
  }
</style>
