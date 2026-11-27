<script lang="ts">
  import { page } from '$app/state';

  let { sections }: { sections: { id: string; label: string }[] } = $props();
  let nav = $state<HTMLElement>();
  let strip = $state<HTMLDivElement>();
  let current = $state<string>();
  let top = $state<number>();
  let clippedStart = $state(false);
  let clippedEnd = $state(false);

  function updateEdges() {
    if (!strip) return;
    clippedStart = strip.scrollLeft > 1;
    clippedEnd = strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 1;
  }

  $effect(() => {
    const header = document.querySelector('.site-header');
    if (!nav || !strip || !header) return;
    const siteHeader = header;
    const links = nav;
    const anchors = sections.map(({ id }) => document.getElementById(id));
    const initial = page.url.hash.slice(1);

    function update() {
      const edge = siteHeader.getBoundingClientRect().bottom + links.offsetHeight;
      let active = sections.find(({ id }) => id === initial)?.id ?? sections[0]?.id;
      if (links.getBoundingClientRect().top > edge) active = sections[0]?.id;
      for (const [index, anchor] of anchors.entries()) {
        if (anchor && anchor.getBoundingClientRect().top <= edge + 24) active = sections[index].id;
      }
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        active = sections.at(-1)?.id ?? active;
      }
      current = active;
    }

    const observer = new ResizeObserver(() => {
      top = header.getBoundingClientRect().height;
      update();
      updateEdges();
    });
    observer.observe(header);
    observer.observe(links.parentElement!);
    observer.observe(strip);
    window.addEventListener('scroll', update, { passive: true });
    update();
    updateEdges();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
    };
  });
</script>

<nav aria-label="本頁段落" bind:this={nav} class:clippedStart class:clippedEnd style:--header-height={top === undefined ? undefined : `${top}px`}>
  <div class="strip" bind:this={strip} onscroll={updateEdges}>
    {#each sections as { id, label }, index (id)}
      <a href={`#${id}`} aria-current={(current ? current === id : index === 0) ? 'location' : undefined}>
        {label} ↓
      </a>
    {/each}
  </div>
</nav>

<style>
  .strip { display: flex; align-items: center; gap: var(--space-1); }
  a {
    display: inline-flex;
    align-items: center;
    gap: .25em;
    min-block-size: var(--target-min);
    min-inline-size: var(--target-min);
    padding-inline: var(--space-2);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
    color: var(--brand-ink);
    font-size: var(--t-base);
    font-weight: 650;
    text-decoration: none;
    white-space: nowrap;
  }
  a[aria-current], a:hover { border-color: var(--brand); background: var(--brand-wash); }
  a[aria-current] { box-shadow: inset 0 -2px var(--brand); }
  @media (min-width: 40.0625rem) { nav { grid-area: links; align-self: start; justify-self: end; } }
  @media (max-width: 40rem) {
    nav {
      position: sticky;
      inset-block-start: var(--header-height, var(--default-header-height, 6.1rem));
      z-index: 5;
      margin: -4px;
      background: var(--bg);
    }
    .strip { overflow-x: auto; scrollbar-width: thin; padding: 4px; }
    nav.clippedStart::before, nav.clippedEnd::after { content: ''; position: absolute; inset-block: 0; inline-size: 1rem; pointer-events: none; }
    nav.clippedStart::before { inset-inline-start: 0; background: linear-gradient(to right, var(--bg), transparent); }
    nav.clippedEnd::after { inset-inline-end: 0; background: linear-gradient(to left, var(--bg), transparent); }
    a { flex: none; }
  }
  @media (39rem < width <= 40rem) { nav { --default-header-height: 3.8rem; } }
</style>
