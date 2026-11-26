<script lang="ts">
  import { changeQuery } from './format';

  interface Props {
    url: URL;
    name: string;
    label: string;
    value?: string;
  }

  let { url, name, label, value }: Props = $props();
  let href = $derived(changeQuery(url, (params) => params.delete(name, value)));
</script>

<a {href} aria-label={`移除篩選：${label}`}>{label} <span aria-hidden="true">×</span></a>

<style>
  a {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    min-inline-size: var(--target-min);
    min-block-size: var(--target-min);
    max-inline-size: 100%;
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);
    color: var(--brand-ink);
    background: var(--brand-wash);
    font: 600 var(--t-sm) / var(--leading-tight) var(--font-sans);
    text-decoration: none;
    overflow-wrap: anywhere;
    touch-action: manipulation;
  }
  span { font-size: var(--t-md); }
  a:hover { text-decoration: underline; }
  a:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
</style>
