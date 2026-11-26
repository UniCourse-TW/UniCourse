<script lang="ts">
  import { barPercent } from './chart-scale';
  import ChartValues from './ChartValues.svelte';
  import EmptyState from './EmptyState.svelte';
  import { displayValue } from './format';
  import type { BarItem, TableColumn } from './types';

  interface Props {
    label: string;
    items: readonly BarItem[];
    unit?: string;
    max?: number;
    ranked?: boolean;
    showValues?: boolean;
  }

  let { label, items, unit, max, ranked = false, showValues = true }: Props = $props();
  let rows = $derived(items.map((item, index) => ({
    ...item,
    index,
    value: item.value !== null && Number.isFinite(item.value) && item.value >= 0 ? item.value : null
  })));
  let ceiling = $derived(rows.reduce((highest, item) => Math.max(highest, item.value ?? 0), max ?? 0));
  let hasScale = $derived(ceiling > 0 && ((max ?? 0) > 0 || rows.filter((item) => item.value !== null).length > 1));
  let columns: TableColumn<(typeof rows)[number]>[] = $derived([
    { id: 'label', label: '項目', value: (row) => row.label },
    { id: 'value', label: unit ? `數值（${unit}）` : '數值', numeric: true, value: (row) => row.value }
  ]);
</script>

{#if rows.length}
  <svelte:element this={ranked ? 'ol' : 'ul'} role="list" aria-label={label}>
    {#each rows as item (item.index)}
      <li>
        <div class="bar-row" class:scaled={hasScale}>
          {#if item.href}<a href={item.href}>{item.label}</a>{:else}<span class="label">{item.label}</span>{/if}
          {#if hasScale && item.value !== null}
            <span class="track" aria-hidden="true"><span class="fill" class:muted={ranked && item.index >= 3} style:inline-size={`${barPercent(item.value, ceiling)}%`}></span></span>
          {/if}
          <span class="value ui-tabular" class:missing={item.value === null}>{item.value === null ? '未公布' : displayValue(item.value)}{#if item.value !== null && unit}{` ${unit}`}{/if}</span>
        </div>
      </li>
    {/each}
  </svelte:element>
  {#if showValues}<ChartValues {label} {columns} {rows} rowKey={(row) => row.index} />{/if}
{:else}
  <EmptyState />
{/if}

<style>
  :is(ol, ul) {
    display: grid;
    row-gap: var(--space-1);
    margin: 0;
    padding: 0;
    color: var(--ink);
    font: var(--t-base) / var(--leading-table) var(--font-sans);
  }
  ol { padding-inline-start: var(--space-6); }
  ol li::marker { color: var(--muted); font: var(--t-sm) var(--font-mono); }
  ul { list-style: none; }
  .bar-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
    gap: var(--space-2);
    align-items: center;
    min-block-size: 1.75rem;
  }
  .bar-row.scaled { grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) minmax(5.5rem, max-content); }
  a, .label { overflow-wrap: anywhere; }
  a {
    display: flex;
    align-items: center;
    min-inline-size: var(--target-min);
    min-block-size: var(--target-min);
    color: var(--brand-ink);
    text-underline-offset: 0.15em;
    touch-action: manipulation;
  }
  a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .value { grid-column: -2 / -1; text-align: end; overflow-wrap: anywhere; }
  .track { block-size: 10px; border-radius: var(--radius-pill); background: var(--line); }
  .fill { display: block; block-size: 100%; border-radius: inherit; background: var(--brand); }
  .muted { opacity: 0.6; }
  .missing { color: var(--muted); }

  @media (max-width: 32rem) {
    .bar-row, .bar-row.scaled { grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-1) var(--space-2); padding-block: var(--space-1); }
    .track { grid-row: 2; grid-column: 1 / -1; }
  }
</style>
