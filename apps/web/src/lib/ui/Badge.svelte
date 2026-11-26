<script lang="ts">
  import type { BadgeTone } from './types';

  interface Props {
    label: string;
    tone?: BadgeTone;
    dot?: boolean;
  }

  let { label, tone = 'none', dot = false }: Props = $props();
</script>

<span class="badge" data-tone={tone}>{#if dot}<span class="dot" aria-hidden="true"></span>{/if}{label}</span>

<style>
  .badge {
    --tone: var(--muted);
    display: inline-block;
    max-inline-size: 100%;
    padding: 1px 7px;
    border-radius: var(--radius-pill);
    color: color-mix(in srgb, var(--tone) 85%, var(--ink));
    background: color-mix(in srgb, var(--tone) var(--status-tint), var(--panel-raised));
    font: 600 var(--t-sm) / 1.5 var(--font-sans);
    overflow-wrap: anywhere;
  }
  [data-tone='live'] { --tone: var(--up); }
  [data-tone='partial'], [data-tone='demo'] { --tone: var(--warn); }
  [data-tone='demo'] { background: var(--warn-wash); }
  [data-tone='blocked'] { --tone: var(--down); }
  [data-tone='planned'] { --tone: var(--info); }
  [data-tone='inactive'] { --tone: var(--ink-2); background: var(--chip); }
  .dot {
    display: inline-block;
    inline-size: 6px;
    block-size: 6px;
    margin-inline-end: var(--space-1);
    border-radius: 50%;
    background: currentColor;
    vertical-align: 0.1em;
  }
</style>
