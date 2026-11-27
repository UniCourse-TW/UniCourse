<script lang="ts">
  import { barPercent } from './chart-scale';
  import { displayValue } from './format';

  interface Props {
    value: number | null;
    max: number;
    unit?: string;
    emphasis?: boolean;
  }

  let { value, max, unit, emphasis = true }: Props = $props();
  let valid = $derived(value !== null && Number.isFinite(value) && value >= 0 ? value : null);
  let hasScale = $derived(valid !== null && Number.isFinite(max) && max > 0);
</script>

<span class="bar-cell">
  {#if hasScale && valid !== null}
    <span class="track" aria-hidden="true"><span class="fill" class:emphasis style:inline-size={`${barPercent(valid, max)}%`}></span></span>
  {/if}
  <span class="ui-tabular" title={valid === null ? '未公布' : undefined}>{displayValue(valid)}{#if valid !== null && unit}{` ${unit}`}{/if}</span>
</span>

<style>
  .bar-cell { display: flex; gap: var(--space-2); align-items: center; }
  .track { flex: 0 0 var(--bar-cell-track-size, 5rem); block-size: 10px; border-radius: var(--radius-pill); background: var(--line); }
  .ui-tabular { margin-inline-start: auto; }
  .fill { display: block; block-size: 100%; border-radius: inherit; background: var(--brand); opacity: 0.6; }
  .emphasis { opacity: 1; }
</style>
