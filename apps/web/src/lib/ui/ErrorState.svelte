<script lang="ts">
  import type { Snippet } from 'svelte';
  import EmptyState from './EmptyState.svelte';

  interface Props {
    title?: string;
    description?: string;
    retryHref?: string;
    action?: Snippet;
  }

  let { title = '資料暫時無法取得', description, retryHref, action }: Props = $props();
</script>

{#snippet retry()}
  {#if retryHref}<a href={retryHref} data-sveltekit-reload>再試一次</a>{/if}
{/snippet}

<EmptyState {title} {description} tone="error" action={action ?? (retryHref ? retry : undefined)} />

<style>
  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: var(--target-min);
    min-block-size: var(--target-min);
    padding-inline: var(--space-2);
    color: var(--brand-ink);
    font-weight: 600;
    text-underline-offset: 0.15em;
    touch-action: manipulation;
  }
  a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
</style>
