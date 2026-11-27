<script lang="ts">
  import { partialTermLabel } from './partial-terms';
</script>

<span class="partial-key"><i aria-hidden="true"></i>{partialTermLabel}</span>

<style>
  .partial-key { display: inline-flex; align-items: center; gap: var(--space-1); color: var(--muted); font-size: var(--t-sm); }
  i { inline-size: 1em; block-size: .65em; border-radius: 2px; background: var(--partial-fill); }
</style>
