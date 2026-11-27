<script lang="ts">
  /**
   * 1–5 stars in the brand colour with outlined empty stars (never the warning orange), plus the score
   * as text for assistive technology unless `decorative`.
   */
  let { score, decorative = false, size = 'base' }: { score: number; decorative?: boolean; size?: 'sm' | 'base' | 'md' } = $props();
  let filled = $derived(Math.max(0, Math.min(5, Math.round(score))));
</script>

<span class="stars {size}" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `${filled} 分（滿分 5 分）`} aria-hidden={decorative || undefined}
  ><span class="on">{'★'.repeat(filled)}</span><span class="off">{'☆'.repeat(5 - filled)}</span></span>

<style>
  .stars { letter-spacing: 0.04em; white-space: nowrap; line-height: 1; }
  .on { color: var(--brand); }
  .off { color: var(--muted); }
  .sm { font-size: var(--t-sm); }
  .base { font-size: var(--t-base); }
  .md { font-size: var(--t-md); }
</style>
