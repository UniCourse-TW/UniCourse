<script lang="ts">
  import type { FilterOption } from './types';

  interface Props {
    name: string;
    label: string;
    options: readonly FilterOption[];
    value?: string | null;
    allLabel?: string | null;
    disabled?: boolean;
  }

  let { name, label, options, value, allLabel = '全部', disabled = false }: Props = $props();
  const id = $props.id();
  let match = $derived(options.some((option) => option.value === value));
</script>

<div class="field">
  <label for={id}>{label}</label>
  <select {id} {name} {disabled}>
    {#if allLabel !== null}<option value="" selected={!match}>{allLabel}</option>{/if}
    {#each options as option, index (option.value)}
      <option value={option.value} disabled={option.disabled}
        selected={match ? value === option.value : allLabel === null && index === 0}>{option.label}</option>
    {/each}
  </select>
</div>

<style>
  .field {
    display: inline-flex;
    align-items: center;
    min-inline-size: 0;
    max-inline-size: 100%;
    background: var(--panel-raised);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    color: var(--muted);
    font: 600 var(--t-sm) / var(--leading-tight) var(--font-sans);
  }
  label { padding-inline-start: var(--space-2); }
  select {
    min-inline-size: var(--target-min);
    min-block-size: var(--target-min);
    max-inline-size: calc(100% - 2rem);
    padding: var(--space-1) var(--space-2);
    color-scheme: var(--ui-color-scheme);
    color: var(--ink);
    background: transparent;
    border: 0;
    border-radius: var(--radius-control);
    font: var(--t-base) / var(--leading-table) var(--font-sans);
    touch-action: manipulation;
  }
  .field:has(select:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .field:has(select:focus-visible) select { outline: none; }
  .field:has(select:disabled) { background: var(--inactive-fill); border-color: var(--inactive-line); }
  select:disabled { background: transparent; color: var(--ink-2); opacity: 1; cursor: not-allowed; }
</style>
