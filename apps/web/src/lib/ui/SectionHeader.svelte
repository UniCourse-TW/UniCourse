<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    id?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    description?: string;
    actions?: Snippet;
  }

  let { title, id, level = 2, description, actions }: Props = $props();
</script>

<div class="section-header">
  <div class="copy">
    <svelte:element this={`h${level}`} {id} data-level={level}>{title}</svelte:element>
    {#if description}<p>{description}</p>{/if}
  </div>
  {#if actions}<div class="actions">{@render actions()}</div>{/if}
</div>

<style>
  .section-header {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    align-items: start;
    justify-content: space-between;
    color: var(--ink);
    font: var(--t-base) / var(--leading-body) var(--font-sans);
  }
  .copy { flex: 1 1 15rem; min-inline-size: 0; overflow-wrap: anywhere; }
  [data-level] {
    margin: 0;
    font-size: var(--t-lg);
    font-weight: 650;
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-heading);
    text-wrap: balance;
  }
  [data-level='1'] { font-size: var(--t-2xl); }
  [data-level='2'] { font-size: var(--t-xl); }
  p { margin: var(--space-1) 0 0; color: var(--muted); }
  .actions { display: flex; max-inline-size: 100%; flex-wrap: wrap; gap: var(--space-2); }
</style>
