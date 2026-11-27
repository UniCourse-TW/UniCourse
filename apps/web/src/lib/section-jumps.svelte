<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  let { id, label, sections, children, trackCurrent = true, arrows = false }: {
    id?: string;
    label?: string;
    sections: { id: string; label: string; count?: string }[];
    children?: Snippet;
    trackCurrent?: boolean;
    arrows?: boolean;
  } = $props();

  let nav: HTMLElement;
  let links: HTMLDivElement;
  let cutStart = $state(false);
  let cutEnd = $state(false);
  function updateEdges() {
    cutStart = links.scrollLeft > 1;
    cutEnd = links.scrollWidth - links.clientWidth - links.scrollLeft > 1;
  }
  let active = $state<string>();
  let refresh: (() => void) | undefined;

  onMount(() => {
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        updateEdges();
        if (!trackCurrent) return;
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
    const link = links.querySelector<HTMLElement>('[aria-current="location"]');
    if (!link) return;
    const bounds = links.getBoundingClientRect();
    const target = link.getBoundingClientRect();
    if (target.right > bounds.right - 12) links.scrollLeft += target.right - bounds.right + 12;
    if (target.left < bounds.left + 12) links.scrollLeft -= bounds.left - target.left + 12;
  });
</script>

<nav class="section-jumps" {id} bind:this={nav} aria-label="跳至本頁章節">
  {#if label}<span class="jump-label" aria-hidden="true">{label}</span>{/if}
  <div class="jump-links" bind:this={links} class:cutStart class:cutEnd onscroll={updateEdges}>
    {#each sections as section (section.id)}
      <a href={'#' + section.id} aria-current={active === section.id ? 'location' : undefined}>
        {section.label}{#if section.count}<span>{section.count}</span>{/if}{#if arrows}<span aria-hidden="true">↓</span>{/if}
      </a>
    {/each}
    {@render children?.()}
  </div>
</nav>

<style>
  .section-jumps {
    position: sticky;
    inset-block-start: var(--section-jump-top, 3.8125rem);
    z-index: 5;
    display: flex;
    align-items: center;
    min-inline-size: 0;
    background: var(--bg);
    border-block-end: 1px solid var(--line);
  }
  .jump-label { flex: none; padding-inline-start: var(--space-1); color: var(--muted); font-size: var(--t-sm); }
  .jump-links {
    display: flex;
    gap: var(--space-1);
    min-inline-size: 0;
    overflow-x: auto;
    padding: var(--space-1);
    scroll-padding-inline: .75rem;
    scrollbar-width: thin;
    mask-image: linear-gradient(to right, var(--jump-start, #000) 0, #000 12px, #000 calc(100% - 12px), var(--jump-end, #000) 100%);
  }
  .cutStart { --jump-start: transparent; }
  .cutEnd { --jump-end: transparent; }
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
  a[aria-current] { background: var(--brand-wash); }
  a:hover { text-decoration: underline; }
  a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  a span { color: var(--muted); font-variant-numeric: tabular-nums; }
</style>
