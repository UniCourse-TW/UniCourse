<script lang="ts" generics="Row">
  import { onMount, type Snippet } from 'svelte';
  import { displayValue } from './format';
  import type { TableColumn, TableValue } from './types';

  interface Props {
    caption: string;
    columns: readonly TableColumn<Row>[];
    rows: readonly Row[];
    rowKey: (row: Row) => string | number;
    rowHref?: (row: Row) => string | null | undefined;
    groupLabel?: (row: Row) => string | undefined;
    rowHeaderColumn?: string;
    stickyColumn?: string;
    clientSort?: boolean;
    order?: { column: string; direction: 'ascending' | 'descending' };
    minWidth?: string;
    maxHeight?: string;
    scrollHint?: boolean;
    cell?: Snippet<[Row, TableColumn<Row>]>;
    empty?: Snippet;
  }

  let {
    caption, columns, rows, rowKey, rowHref, groupLabel, rowHeaderColumn, stickyColumn, clientSort = false, order,
    minWidth = '38rem', maxHeight = '30rem', scrollHint = true, cell, empty
  }: Props = $props();

  const collator = new Intl.Collator('zh-TW', { numeric: true });
  const hintId = $props.id();
  let ready = $state(false);
  let sort = $state<{ column: string; direction: 'ascending' | 'descending' }>();
  let stickyId = $derived(stickyColumn ?? columns[0]?.id);
  let activeColumn = $derived(clientSort && columns.find((column) => column.sortable && column.id === sort?.column));
  let activeOrder = $derived(activeColumn ? sort : order);
  onMount(() => { ready = true; });
  let shownRows = $derived.by(() => {
    if (!sort || !activeColumn) return rows;
    const value = activeColumn.sortValue ?? activeColumn.value;
    if (!value) return rows;
    const direction = sort.direction === 'ascending' ? 1 : -1;
    return rows.map((row) => ({ row, value: value(row) })).sort((left, right) => {
      if (isMissing(left.value)) return isMissing(right.value) ? 0 : 1;
      if (isMissing(right.value)) return -1;
      const comparison = typeof left.value === 'number' && typeof right.value === 'number'
        ? left.value - right.value
        : collator.compare(String(left.value), String(right.value));
      return direction * comparison;
    }).map(({ row }) => row);
  });

  function isMissing(value: TableValue): boolean {
    return value == null || (typeof value === 'number' && !Number.isFinite(value));
  }

  function toggleSort(column: TableColumn<Row>) {
    const firstDirection = column.numeric ? 'descending' : 'ascending';
    sort = {
      column: column.id,
      direction: sort?.column === column.id && sort.direction === firstDirection
        ? (firstDirection === 'descending' ? 'ascending' : 'descending')
        : firstDirection
    };
  }
</script>

{#snippet content(row: Row, column: TableColumn<Row>)}
  {#if cell}{@render cell(row, column)}{:else}{displayValue(column.value?.(row))}{/if}
{/snippet}

<div class="frame">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users must be able to scroll this named region.) -->
  <div class="scroll" role="region" aria-label={`${caption}（表格）`} aria-describedby={scrollHint ? hintId : undefined}
    tabindex="0" style:max-block-size={maxHeight}>
    <table style:min-inline-size={minWidth}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {#each columns as column (column.id)}
            {@const direction = activeOrder?.column === column.id ? activeOrder.direction : undefined}
            <th scope="col" class:numeric={column.numeric} class:sticky={stickyId === column.id}
              class:sortable={clientSort && column.sortable} data-align={column.align} style:inline-size={column.width}
              aria-sort={direction}>
              {#if ready && clientSort && column.sortable && (column.value || column.sortValue)}
                <button type="button" onclick={() => toggleSort(column)}>
                  {column.label}
                  <span aria-hidden="true">{direction ? (direction === 'ascending' ? '↑' : '↓') : '↕'}</span>
                </button>
              {:else}
                {column.label}{#if direction} <span aria-hidden="true">{direction === 'ascending' ? '↑' : '↓'}</span>{/if}
              {/if}
              {#if column.headerNote}<small class="column-note">{column.headerNote}</small>{/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each shownRows as row (rowKey(row))}
          {@const label = groupLabel?.(row)}
          {#if label}<tr class="row-group"><td colspan={columns.length}>{label}</td></tr>{/if}
          <tr>
            {#each columns as column, index (column.id)}
              {#if rowHeaderColumn === column.id || (rowHeaderColumn === undefined && index === 0)}
                {@const href = rowHref?.(row)}
                <th scope="row" class:numeric={column.numeric} class:sticky={stickyId === column.id} data-align={column.align}>
                  {#if href}<a class="row-link" {href}>{@render content(row, column)}</a>{:else}{@render content(row, column)}{/if}
                </th>
              {:else}
                <td class:numeric={column.numeric} class:sticky={stickyId === column.id} data-align={column.align}>{@render content(row, column)}</td>
              {/if}
            {/each}
          </tr>
        {:else}
          <tr><td class="empty" colspan={columns.length}>
            {#if empty}{@render empty()}{:else}目前沒有資料。{/if}
          </td></tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if scrollHint}<p class="hint" id={hintId}>左右捲動表格可查看其餘欄位。</p>{/if}
</div>

<style>
  .column-note { display: block; color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  .frame {
    min-inline-size: 0;
    max-inline-size: 100%;
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    color: var(--ink);
    background: var(--panel-raised);
    font: var(--t-base) / var(--leading-table) var(--font-sans);
  }
  .scroll {
    position: relative;
    overflow: auto;
    scrollbar-width: thin;
    color-scheme: var(--ui-color-scheme);
    border-radius: inherit;
    scroll-padding-block-start: var(--target-min);
  }
  .scroll:focus-visible, button:focus-visible, .row-link:focus-visible {
    outline: var(--focus-ring);
    outline-offset: calc(-1 * var(--focus-offset));
  }
  table { inline-size: 100%; border-collapse: separate; border-spacing: 0; text-align: start; }
  caption { padding: var(--space-2) var(--space-3); text-align: start; color: var(--muted); font-size: var(--t-sm); }
  th, td { padding: var(--table-pad-block, 0.375rem) 0.625rem; border-block-end: 1px solid var(--line); text-align: start; }
  .row-group td { padding-block: var(--space-1); background: var(--table-head); color: var(--ink-2); font-weight: 650; font-size: var(--t-sm); }
  thead th {
    position: sticky;
    inset-block-start: 0;
    z-index: 2;
    color: var(--muted);
    background: var(--table-head);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  th[aria-sort] { color: var(--brand-ink); }
  .sortable { block-size: calc(var(--target-min) + 1px); }
  th:has(> button), th:has(> .row-link) { padding-block: 0; }
  button, .row-link {
    display: inline-flex;
    gap: var(--space-1);
    align-items: center;
    min-block-size: var(--target-min);
    min-inline-size: var(--target-min);
    max-inline-size: 100%;
    border-radius: var(--radius-control);
    touch-action: manipulation;
  }
  button {
    border: 0;
    padding: 0;
    color: inherit;
    background: transparent;
    font: inherit;
    text-align: inherit;
    cursor: pointer;
  }
  button:hover, .row-link:hover { text-decoration: underline; }
  .row-link { color: var(--brand-ink); font-weight: 600; text-underline-offset: 0.15em; }
  tbody th { font-weight: 600; }
  tbody tr { --row-bg: var(--panel-raised); }
  tbody tr:hover, tbody tr:focus-within { --row-bg: var(--hover-row); }
  tbody :is(th, td) { background: var(--row-bg); }
  tbody tr:last-child :is(th, td) { border-block-end: 0; }
  .numeric { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
  [data-align='start'] { text-align: start; }
  [data-align='center'] { text-align: center; }
  [data-align='end'] { text-align: end; }
  .numeric:not([data-align='start']) > :is(button, .row-link), [data-align='end'] > :is(button, .row-link) { justify-content: end; }
  [data-align='center'] > :is(button, .row-link) { justify-content: center; }
  .empty { padding: var(--space-4); text-align: center; color: var(--muted); }
  .hint { display: none; margin: 0; color: var(--muted); font-size: var(--t-sm); }

  @media (max-width: 40rem) {
    th, td { padding-inline: var(--space-2); }
    .sticky {
      position: sticky;
      inset-inline-start: 0;
      max-inline-size: 9.5rem;
      overflow-wrap: anywhere;
      box-shadow: var(--sticky-shadow);
    }
    thead .sticky { z-index: 3; }
    tbody .sticky { z-index: 1; }
    .hint { display: block; padding: var(--space-2); border-block-start: 1px solid var(--line); }
  }
</style>
