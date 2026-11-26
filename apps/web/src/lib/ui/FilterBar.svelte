<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    action: string;
    label?: string;
    applyLabel?: string;
    clearHref?: string;
    hidden?: Readonly<Record<string, string | readonly string[]>>;
    children: Snippet;
    chips?: Snippet;
  }

  let { action, label = '篩選', applyLabel = '套用', clearHref, hidden = {}, children, chips }: Props = $props();
</script>

<div class="filter-bar">
  <form {action} method="GET" aria-label={label}>
    {#each Object.entries(hidden) as [name, values] (name)}
      {#each typeof values === 'string' ? [values] : values as value}
        <input type="hidden" {name} {value} />
      {/each}
    {/each}
    {@render children()}
    <div class="actions">
      <button type="submit">{applyLabel}</button>
      {#if clearHref}<a href={clearHref}>清除篩選</a>{/if}
    </div>
  </form>
  {#if chips}<div class="chips" role="group" aria-label="已套用的篩選">{@render chips()}</div>{/if}
</div>

<style>
  .filter-bar { color: var(--ink); font: var(--t-base) / var(--leading-body) var(--font-sans); }
  form, .actions, .chips { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: end; }
  .chips { margin-block-start: var(--space-2); }
  .chips:empty { display: none; }
  button, a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: var(--target-min);
    min-inline-size: var(--target-min);
    padding: 0 var(--space-3);
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    font: inherit;
    font-weight: 600;
    touch-action: manipulation;
  }
  button { color: var(--on-brand); background: var(--brand); cursor: pointer; }
  a { color: var(--brand-ink); text-underline-offset: 0.15em; }
  button:hover { text-decoration: underline; }
  a:hover { background: var(--brand-wash); }
  :is(button, a):focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
</style>
