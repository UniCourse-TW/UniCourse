<script lang="ts">
  import { changeQuery, displayValue } from './format';

  interface Props {
    url: URL;
    page: number;
    totalPages: number;
    parameter?: string;
    label?: string;
  }

  let { url, page, totalPages, parameter = 'page', label = '分頁' }: Props = $props();

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
    <span class="ui-tabular" aria-current="page">第 {displayValue(page)} 頁，共 {displayValue(totalPages)} 頁</span>
    {#if page < totalPages}<a href={pageHref(page + 1)} rel="next">下一頁<span aria-hidden="true"> →</span></a>{/if}
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
  a {
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
  a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
</style>
