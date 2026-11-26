<script lang="ts">
  import Badge from './Badge.svelte';
  import type { BadgeTone } from './types';

  interface Props {
    status: BadgeTone;
    label?: string;
  }

  let { status, label }: Props = $props();

  const labels: Record<BadgeTone, string> = {
    live: '已收錄',
    partial: '部分',
    blocked: '受阻',
    planned: '規劃中',
    none: '尚未開始',
    demo: '示範資料',
    inactive: '已停辦'
  };
</script>

<Badge tone={status} label={label ?? labels[status]} dot />
