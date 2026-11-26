<script lang="ts" generics="Row">
  import DataTable from './DataTable.svelte';
  import type { TableColumn } from './types';

  interface Props {
    label: string;
    columns: readonly TableColumn<Row>[];
    rows: readonly Row[];
    rowKey: (row: Row) => string | number;
    rowHref?: (row: Row) => string | undefined;
  }

  let { label, columns, rows, rowKey, rowHref }: Props = $props();
</script>

<details>
  <summary>查看數值表格</summary>
  <DataTable caption={`${label}：數值表格`} {columns} {rows} {rowKey} {rowHref} minWidth="0" maxHeight="none" scrollHint={false} />
</details>

<style>
  details { margin-block-start: var(--space-2); }
  summary {
    inline-size: fit-content;
    min-block-size: var(--target-min);
    min-inline-size: var(--target-min);
    padding: 0 var(--space-2);
    align-content: center;
    border-radius: var(--radius-control);
    color: var(--brand-ink);
    font: 600 var(--t-sm) / var(--leading-body) var(--font-sans);
    cursor: pointer;
    touch-action: manipulation;
  }
  summary:hover { text-decoration: underline; }
  summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
</style>
