<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    description?: string;
    action?: Snippet;
    tone?: 'neutral' | 'error';
  }

  let { title = '目前沒有資料', description, action, tone = 'neutral' }: Props = $props();
</script>

<div class="state" class:error={tone === 'error'}>
  <div role={tone === 'error' ? 'alert' : undefined}>
    <p class="title">{title}</p>
    {#if description}<p class="description">{description}</p>{/if}
  </div>
  {#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
  .state {
    padding: var(--space-12) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    color: var(--ink);
    background: var(--panel);
    font: var(--t-base) / var(--leading-body) var(--font-sans);
    text-align: center;
    overflow-wrap: anywhere;
  }
  .error { background: color-mix(in srgb, var(--down) var(--status-tint), var(--panel-raised)); }
  .error .title { color: var(--down); }
  p { max-inline-size: 52em; margin: 0 auto; }
  .title { color: var(--ink-2); font-size: 1rem; font-weight: 600; }
  .description { margin-block-start: var(--space-1); color: var(--muted); font-size: 0.8125rem; }
  .action { margin-block-start: var(--space-2); }
</style>
