<script lang="ts">
  import { changeQuery, displayValue } from './format';

  interface Props {
    url: URL;
    page: number;
    totalPages: number;
    parameter?: string;
    label?: string;
    numbered?: boolean;
    jump?: boolean;
  }

  let { url, page, totalPages, parameter = 'page', label = '分頁', numbered = false, jump = false }: Props = $props();
  let pages = $derived(numbered && totalPages <= 7 ? Array.from({ length: totalPages }, (_, index) => index + 1) : []);

  function pageHref(next: number) {
    return changeQuery(url, (params) => {
      if (next === 1) params.delete(parameter);
      else params.set(parameter, String(next));
    });
  }
</script>

{#if totalPages > 1}
  <nav aria-label={label}>
    {#if page > 1}<a href={pageHref(page - 1)} rel="prev"><span aria-hidden="true">← </span>上一頁</a>{/if}
    {#if pages.length}
      {#each pages as position (position)}
        {#if position === page}<span class="ui-tabular page-number" aria-current="page" aria-label={`第 ${position} 頁`}>{position}</span>
        {:else}<a class="ui-tabular page-number" href={pageHref(position)} aria-label={`第 ${position} 頁`}>{position}</a>{/if}
      {/each}
    {:else}<span class="ui-tabular" aria-current="page">第 {displayValue(page)} 頁，共 {displayValue(totalPages)} 頁</span>{/if}
    {#if page < totalPages}<a href={pageHref(page + 1)} rel="next">下一頁<span aria-hidden="true"> →</span></a>{/if}
    {#if jump && !pages.length}
      <form method="GET" action={url.pathname + url.hash} aria-label="跳至頁碼">
        {#each [...url.searchParams].filter(([name]) => name !== parameter) as [name, value]}
          <input type="hidden" {name} {value} />
        {/each}
        <label>跳至 {#key page}<input type="number" name={parameter} min={1} max={totalPages} defaultValue={page} required aria-label="頁碼" />{/key}</label>
        <button>前往</button>
      </form>
    {/if}
  </nav>
{/if}

<style>
  nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--muted);
    font: var(--t-base) / var(--leading-body) var(--font-sans);
  }
  a, button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-inline-size: var(--target-min);
    min-block-size: var(--target-min);
    padding: 0 var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    color: var(--brand-ink);
    background: var(--panel-raised);
    font-weight: 600;
    text-decoration: none;
    touch-action: manipulation;
  }
  a:hover { background: var(--brand-wash); text-decoration: underline; }
  .page-number[aria-current] { display: inline-grid; place-items: center; min-inline-size: var(--target-min); min-block-size: var(--target-min); border-radius: var(--radius-control); background: var(--brand-wash); color: var(--brand-ink); font-weight: 650; }
  a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  form, label { display: inline-flex; align-items: center; gap: var(--space-1); }
  input[type='number'] { box-sizing: border-box; width: 5ch; min-height: var(--target-min); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font: inherit; text-align: center; }
  button { font: inherit; cursor: pointer; }
</style>
