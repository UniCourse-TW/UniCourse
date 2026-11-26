<script lang="ts">
  import Badge from '$lib/ui/Badge.svelte';
  import type { BadgeTone } from '$lib/ui/types';
  import {
    categoryLabels, isOfficial, kindLabels, loginLabel, operatorLabels, sourceLabels, statusLabels, type Site
  } from '$lib/landscape-data';

  interface Props {
    /** Accessible name of the list, e.g. 國立臺灣大學的課程網站. */
    label: string;
    sites: readonly Site[];
    /** Show who runs each site (cross-school tables); per-school lists only show it for third parties. */
    showOperator?: boolean;
  }

  let { label, sites, showOperator = false }: Props = $props();

  const tones: Record<Site['status'], BadgeTone> = { active: 'live', inactive: 'blocked', unknown: 'none' };

  function host(url: string) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
</script>

<ul class="sites" aria-label={label}>
  {#each sites as site (site.url)}
    {@const official = isOfficial(site)}
    {@const extra = site.notes || site.repo || site.sourceType !== 'web'}
    <li class:third={!official}>
      <span class="kind">{kindLabels[official ? 'official' : 'third']}</span>
      <span class="name">
        <a href={site.url} rel="noopener external">{site.name}<span class="ext" aria-hidden="true"> ↗</span></a>
        <small class="host">{host(site.url)}{#if (showOperator || !official) && site.operatorName} · {site.operatorName}{/if}</small>
      </span>
      <span class="cats">
        {#each site.category as category (category)}<span class="cat">{categoryLabels[category]}</span>{/each}
      </span>
      <span class="login">{loginLabel(site.loginRequired)}</span>
      <span class="status"><Badge tone={tones[site.status]} label={statusLabels[site.status]} dot /></span>
      <span class="features">
        {site.features}
        {#if extra}
          <details class="more">
            <summary>備註</summary>
            <dl>
              {#if site.notes}<dt>說明</dt><dd>{site.notes}</dd>{/if}
              <dt>營運者</dt><dd>{operatorLabels[site.operator]}{#if site.operatorName}（{site.operatorName}）{/if}</dd>
              <dt>形式</dt><dd>{sourceLabels[site.sourceType]}</dd>
              {#if site.repo}<dt>原始碼</dt><dd><a href={site.repo} rel="noopener external">{host(site.repo)}{site.repo.replace(/^https?:\/\/[^/]+/, '')}</a></dd>{/if}
              <dt>查核</dt><dd>{site.lastChecked}</dd>
            </dl>
          </details>
        {/if}
      </span>
    </li>
  {/each}
</ul>

<style>
  .sites {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel-raised);
    color: var(--ink);
    font: var(--t-base) / var(--leading-table) var(--font-sans);
    overflow: hidden;
  }
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
  li:hover { background: var(--hover-row); }
  .kind { color: var(--muted); font-size: var(--t-sm); font-weight: 600; line-height: 1.5; }
  .third .kind { color: var(--series-2); }
  /* Name and host share a line when they fit, so most rows stay one line tall. */
  .name { display: flex; flex-wrap: wrap; column-gap: var(--space-2); align-items: baseline; min-inline-size: 0; }
  .name a { color: var(--brand-ink); font-weight: 600; text-underline-offset: 0.15em; overflow-wrap: anywhere; }
  .name a:focus-visible, summary:focus-visible, dd a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: 2px; }
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
  .status { white-space: nowrap; }
  .features { color: var(--ink-2); min-inline-size: 0; font-size: var(--t-sm); line-height: 1.5; overflow-wrap: anywhere; }
  /* 備註 sits at the end of the features line until opened, so a closed row stays two lines tall. */
  .more { display: inline; color: var(--muted); font-size: var(--t-sm); }
  .more[open] { display: block; margin-block-start: 2px; }
  summary {
    display: inline-block;
    min-block-size: 1.5rem;
    padding: 0 var(--space-1);
    border-radius: var(--radius-control);
    color: var(--brand-ink);
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: '+ '; }
  .more[open] summary::before { content: '− '; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px var(--space-3); margin: var(--space-1) 0 0; color: var(--ink-2); }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
  dd a { color: var(--brand-ink); }

  @media (max-width: 56rem) {
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
  @media (prefers-reduced-motion: no-preference) {
    li { transition: background-color 120ms; }
  }
</style>
