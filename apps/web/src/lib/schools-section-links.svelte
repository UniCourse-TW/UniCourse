<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  let { id, sections, children }: {
    id?: string;
    sections: { id: string; label: string; count?: string }[];
    children?: Snippet;
  } = $props();

  let nav: HTMLElement;
  let active = $state<string>();
  let refresh: (() => void) | undefined;

  onMount(() => {
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const edge = nav.getBoundingClientRect().bottom + 24;
        const headings = sections.flatMap(({ id }) => {
          const heading = document.getElementById(id);
          return heading ? [{ id, top: heading.getBoundingClientRect().top }] : [];
        }).sort((a, b) => a.top - b.top);
        const current = headings.findLast(({ top }) => top <= edge) ?? headings[0];
        const fragment = headings.find(({ id }) => location.hash === `#${id}`);
        active = fragment && current && Math.abs(fragment.top - current.top) < 2 ? fragment.id : current?.id;
      });
    }
    const observer = new ResizeObserver(update);
    if (nav.parentElement) observer.observe(nav.parentElement);
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    addEventListener('hashchange', update);
    refresh = update;
    update();
    return () => {
      observer.disconnect();
      removeEventListener('scroll', update);
      removeEventListener('resize', update);
      removeEventListener('hashchange', update);
      cancelAnimationFrame(frame);
    };
  });

  $effect(() => {
    // Query changes may reorder or replace the sections without scrolling.
    sections;
    refresh?.();
  });

  $effect(() => {
    if (!active) return;
    const link = nav.querySelector<HTMLElement>('[aria-current="location"]');
    if (!link) return;
    const bounds = nav.getBoundingClientRect();
    const target = link.getBoundingClientRect();
    if (target.right > bounds.right) nav.scrollLeft += target.right - bounds.right + 4;
    if (target.left < bounds.left) nav.scrollLeft -= bounds.left - target.left + 4;
  });
</script>

<nav class="section-jumps" {id} bind:this={nav} aria-label="跳至本頁章節">
  {#each sections as section (section.id)}
    <a href={'#' + section.id} aria-current={active === section.id ? 'location' : undefined}>
      {section.label}{#if section.count}<span>{section.count}</span>{/if}
    </a>
  {/each}
  {@render children?.()}
</nav>

<style>
  .section-jumps {
    position: sticky;
    inset-block-start: var(--section-jump-top, 3.8125rem);
    z-index: 5;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    overflow-x: auto;
    padding: var(--space-1);
    background: var(--bg);
    border-block-end: 1px solid var(--line);
    scrollbar-width: thin;
  }
  a {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-block-size: var(--target-min);
    min-inline-size: var(--target-min);
    padding-inline: var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--chip);
    color: var(--brand-ink);
    font-size: var(--t-base);
    font-weight: 650;
    text-decoration: none;
    white-space: nowrap;
  }
  a[aria-current] { background: var(--brand-wash); box-shadow: inset 0 -2px var(--brand); }
  a:hover { text-decoration: underline; }
  a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  a span { color: var(--muted); font-variant-numeric: tabular-nums; }
</style>
