<script lang="ts">
  import type { Snippet } from 'svelte';
  import { displayValue } from './format';

  interface Props {
    label: string;
    value: string | number | null;
    unit?: string;
    note?: string;
    detail?: Snippet;
  }

  let { label, value, unit, note, detail }: Props = $props();
</script>

<div class="tile">
  <dl>
    <dt>{label}</dt>
    <dd><span class="ui-tabular">{displayValue(value)}</span>{#if value !== null && unit} <small>{unit}</small>{/if}{#if detail}<span class="detail">{@render detail()}</span>{/if}</dd>
  </dl>
  {#if note}<p>{note}</p>{/if}
</div>

<style>
  .tile {
    min-inline-size: 0;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    color: var(--ink);
    background: var(--panel);
    font: var(--t-base) / var(--leading-body) var(--font-sans);
    overflow-wrap: anywhere;
  }
  dl, dd, p { margin: 0; }
  dt, p { color: var(--muted); font-size: var(--t-sm); }
  dd { margin-block-start: var(--space-1); font-size: var(--t-3xl); font-weight: 600; line-height: var(--leading-tight); }
  small { margin-inline-start: var(--space-1); color: var(--muted); font-size: var(--t-sm); font-weight: 500; }
  .detail { display: inline-block; margin-inline-start: var(--space-2); color: var(--muted); font-size: var(--t-sm); font-weight: 500; vertical-align: middle; }
  p { margin-block-start: var(--space-1); }
</style>
