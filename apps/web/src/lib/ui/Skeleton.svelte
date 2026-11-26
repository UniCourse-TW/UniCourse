<script lang="ts">
  interface Props {
    label?: string;
    lines?: number;
    minHeight?: string;
  }

  let { label = '載入中…', lines = 0, minHeight = '8rem' }: Props = $props();
</script>

<div class="skeleton" role="status" style:min-block-size={minHeight}>
  <p><span aria-hidden="true"></span>{label}</p>
  {#if lines > 0}
    <div class="lines" aria-hidden="true">
      {#each { length: lines } as _}
        <div class="line"></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .skeleton {
    display: grid;
    align-content: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    color: var(--muted);
    background: var(--panel);
    font: var(--t-base) / var(--leading-body) var(--font-sans);
  }
  p { display: flex; justify-content: center; align-items: center; gap: var(--space-2); margin: 0; }
  p span { inline-size: var(--space-2); block-size: var(--space-2); border-radius: 100%; background: var(--brand); }
  .lines { display: grid; gap: var(--space-2); }
  .line { block-size: var(--t-base); border-radius: var(--radius-pill); background: var(--line); }
  .line:nth-child(3n + 2) { inline-size: 85%; }
  .line:nth-child(3n) { inline-size: 65%; }
  @media (prefers-reduced-motion: no-preference) {
    .lines { animation: pulse 1.5s ease-in-out 3; }
    @keyframes pulse { 50% { opacity: 0.45; } }
  }
</style>
