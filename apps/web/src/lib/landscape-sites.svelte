<script lang="ts">
  import {
    categoryLabels, isOfficial, kindLabels, loginLabel, operatorLabels, sourceLabels, statusLabels, type Site
  } from '$lib/landscape-data';

  interface Props {
    /** Accessible name of the list, e.g. 國立臺灣大學的課程網站. */
    label: string;
    sites: readonly Site[];
    /** Show who runs each site (cross-school tables); per-school lists only show it for third parties. */
    showOperator?: boolean;
    /** A column header row on wide screens (the cross-school table, which has no section of its own). */
    header?: boolean;
  }

  let { label, sites, showOperator = false, header = false }: Props = $props();

  function purpose(features: string | null) {
    const firstClause = features?.split(/[：；。，,（(]/u, 1)[0]?.trim();
    return firstClause || features;
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
  {@const summary = purpose(site.features)}
  <li class:third={!official}>
    <span class="kind">{kindLabels[official ? 'official' : 'third']}</span>
    <div class="name">
      <div class="identity">
        <a href={site.url} rel="noopener external">{site.name}<span class="ext" aria-hidden="true">&nbsp;↗</span></a>
        <small class="host"><span>{host(site.url)}</span>{#if (showOperator || !official) && site.operatorName}<span>{site.operatorName}</span>{/if}{#if site.sourceType !== 'web'}<span class="form">{sourceLabels[site.sourceType]}</span>{/if}</small>
      </div>
    </div>
    <span class="cats">
      {#each site.category as category (category)}<span class="cat">{categoryLabels[category]}</span>{/each}
    </span>
    <span class="site-state">
      <span class="login">{loginLabel(site.loginRequired)}</span>
      <span class="status st {site.status}"><i aria-hidden="true"></i>{statusLabels[site.status]}</span>
    </span>
    <span class="features">{summary ?? '—'}</span>
    <details class="more">
      <summary aria-label={`${site.name}的網站查核明細`}><span class="notes-icon" aria-hidden="true">▾</span></summary>
      <dl>
        {#if site.features}<dt>用途</dt><dd>{site.features}</dd>{/if}
        <dt>營運者</dt><dd>{operatorLabels[site.operator]}{site.operatorName ? `（${site.operatorName}）` : ''}</dd>
        <dt>查核日期</dt><dd><time datetime={site.lastChecked}>{site.lastChecked.replaceAll('-', '/')}</time></dd>
        {#if site.notes}<dt>備註</dt><dd>{site.notes}</dd>{/if}
        {#if site.repo}<dt>原始碼</dt><dd><a href={site.repo} rel="noopener external">{host(site.repo)}{site.repo.replace(/^https?:\/\/[^/]+/, '')}</a></dd>{/if}
      </dl>
    </details>
  </li>
{/snippet}

<div class="sites-box">
  {#if header}
    <!-- Same order as the third-party table above: site, functions, login, status; then the notes. -->
    <div class="cols" aria-hidden="true"><span>類型</span><span>網站</span><span>功能</span><span>登入</span><span>狀態</span><span>用途</span><span class="check-heading">查核</span></div>
  {/if}
  <ul class="sites" aria-label={label}>
    {#each sites as site (site.url)}{@render row(site)}{/each}
  </ul>
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
  li, .cols {
    display: grid;
    grid-template-columns: 3.5rem minmax(10rem, 1.3fr) minmax(5rem, 0.9fr) 5.5rem 4.75rem minmax(8rem, 2fr) var(--target-min);
    column-gap: var(--space-2);
    align-items: center;
    padding: 0 var(--space-3);
    min-inline-size: 0;
  }
  li { border-block-start: 1px solid var(--line); }
  li:first-child { border-block-start: 0; }
  .cols {
    min-block-size: 2.25rem;
    border-block-end: 1px solid var(--line);
    background: var(--table-head);
    color: var(--muted);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .check-heading { text-align: center; }
  li:hover { background: var(--hover-row); }
  .kind { color: var(--muted); font-size: var(--t-sm); font-weight: 600; line-height: 1.5; }
  .third .kind { color: var(--ink-2); }
  .name { min-inline-size: 0; }
  .identity { display: flex; flex-wrap: wrap; column-gap: var(--space-2); align-items: baseline; min-inline-size: 0; }
  .name a { color: var(--brand-ink); font-weight: 600; text-underline-offset: 0.15em; text-decoration: none; overflow-wrap: anywhere; }
  .name a:hover { text-decoration: underline; }
  .name a:focus-visible, summary:focus-visible, dd a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: 2px; }
  .ext { color: var(--muted); font-weight: 400; }
  .host { display: flex; flex-wrap: wrap; gap: 0 var(--space-1); color: var(--muted); font-size: var(--t-xs); overflow-wrap: anywhere; }
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
  .st.inactive i { background: var(--muted); }
  .st.unknown i { border: 1.5px solid var(--muted); }
  .features { color: var(--ink-2); min-inline-size: 0; font-size: var(--t-sm); line-height: 1.5; overflow-wrap: anywhere; }
  .form { margin-inline-start: var(--space-1); padding: 0 5px; border: 1px solid var(--line); border-radius: var(--radius-pill); color: var(--ink-2); font-size: var(--t-xs); white-space: nowrap; }
  .more > summary {
    display: grid; place-items: center; inline-size: var(--target-min); min-block-size: var(--target-min);
    border-radius: var(--radius-control); color: var(--muted); cursor: pointer; list-style: none;
  }
  .more > summary::-webkit-details-marker { display: none; }
  .more[open] .notes-icon { rotate: 180deg; }
  .more > summary:hover { color: var(--brand-ink); background: var(--hover-row); }
  .more { display: contents; }
  .more[open] > summary { grid-column: -2; grid-row: 1; }
  .more[open] dl { grid-column: 1 / -1; }
  .more dl { margin-block-end: var(--space-2); }
  .more[open]::details-content { grid-column: 1 / -1; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px var(--space-3); margin: var(--space-1) 0 0; padding: var(--space-2); border-radius: var(--radius-control); background: var(--chip); color: var(--ink-2); cursor: auto; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
  dd a { color: var(--brand-ink); }

  @media (max-width: 56rem) {
    .cols { display: none; }
    li {
      grid-template-columns: minmax(0, 1fr) auto var(--target-min);
      grid-template-areas: 'name state more' 'cats cats cats' 'features features features';
      align-items: center;
      padding-block-end: var(--space-1);
    }
    .name { grid-area: name; }
    .site-state { grid-area: state; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-1); justify-content: end; }
    .status { order: -1; }
    .kind { grid-area: cats; align-self: center; }
    .cats { grid-area: cats; margin-inline-start: 2.3rem; align-items: center; }
    .features { grid-area: features; }
    .more > summary { grid-area: more; }
  }
  @media (max-width: 40rem) {
    li {
      grid-template-areas: 'name name more' 'cats state state';
      padding-inline: var(--space-2);
      gap: 0 var(--space-1);
    }
    .name a { min-block-size: var(--target-min); min-inline-size: var(--target-min); align-content: center; }
    .features, .host { display: none; }
    .more { font-size: var(--t-sm); }
    dd a { display: inline-flex; min-block-size: var(--target-min); align-items: center; }
  }
  @media (prefers-reduced-motion: no-preference) {
    li { transition: background-color 120ms; }
  }
</style>
