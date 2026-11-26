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
</script>

<span class="bar-cell">
  <span class="track" aria-hidden="true">
    {#if valid !== null}<span class="fill" class:emphasis style:inline-size={`${barPercent(valid, max)}%`}></span>{/if}
  </span>
  <span class="ui-tabular">{displayValue(valid)}{#if valid !== null && unit} {unit}{/if}</span>
</span>

<style>
  .bar-cell { display: flex; gap: var(--space-2); align-items: center; }
  .track { flex: 0 0 var(--bar-cell-track-size, 5rem); block-size: 10px; border-radius: var(--radius-pill); background: var(--line); }
  .ui-tabular { margin-inline-start: auto; }
  .fill { display: block; block-size: 100%; border-radius: inherit; background: var(--brand); opacity: 0.6; }
  .emphasis { opacity: 1; }
</style>
