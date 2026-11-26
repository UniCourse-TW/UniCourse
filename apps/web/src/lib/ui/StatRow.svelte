<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label?: string;
    children: Snippet;
  }

  let { label, children }: Props = $props();
</script>

<div class="stat-row" role={label ? 'group' : undefined} aria-label={label}>
  {@render children()}
</div>

<style>
  .stat-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10.625rem), 1fr));
    gap: var(--space-3);
  }
  @media (max-width: 40rem) {
    .stat-row { grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.75rem), 1fr)); gap: var(--space-2); }
  }
</style>
