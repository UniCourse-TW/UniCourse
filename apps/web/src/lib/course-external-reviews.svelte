<script lang="ts">
  import type { ExternalReviews } from '@unicourse/api-client';
  import { joinedAt } from '$lib/community-format';
  import { isHttpUrl } from '$lib/format';
  import Badge from '$lib/ui/Badge.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';

  interface Props {
    school: string;
    courseCode: string;
    /** `/api/courses/{school}/{courseCode}/external-reviews`; `undefined` when it could not be loaded. */
    reviews: ExternalReviews | undefined;
  }

  let { school, courseCode, reviews }: Props = $props();

  let total = $derived(reviews?.sources.reduce((sum, source) => sum + source.count, 0) ?? 0);
  let posts = $derived(reviews?.posts.filter((post) => isHttpUrl(post.url)) ?? []);
  let links = $derived(reviews?.linkOnly.filter((link) => isHttpUrl(link.url)) ?? []);

  /** PTT shows ±100 as 爆 / XX. */
  function push(score: number) {
    if (score >= 100) return '爆';
    if (score <= -100) return 'XX';
    return score > 0 ? `+${score}` : `${score}`;
  }
</script>

<section class="external" id="external-reviews" aria-labelledby="external-title" data-school={school} data-course={courseCode}>
  <SectionHeader
    id="external-title"
    title="外部評價"
    description="其他網站的公開文章與搜尋連結，點開會前往原網站；UniCourse 只保留標題、日期與開頭摘要。"
  />

  {#if !reviews}
    <ErrorState title="外部評價暫時無法載入" description="請稍後再試。" />
  {:else}
    {#if total > 0}
      <ul class="counts" aria-label="各來源文章數">
        {#each reviews.sources as source (source.source)}
          <li><Badge label={source.sourceLabel} /> <span class="count">{source.count}</span> 篇</li>
        {/each}
      </ul>
      <ol class="list">
        {#each posts as post (post.url)}
          <li>
            <p class="meta">
              <Badge label={post.sourceLabel} />
              <span>{post.board}</span>
              {#if post.postedAt}<time datetime={post.postedAt}>{joinedAt(post.postedAt)}</time>{/if}
              {#if post.pushScore != null && post.pushScore !== 0}
                <span class="push" class:down={post.pushScore < 0}>推 {push(post.pushScore)}</span>
              {/if}
              {#if post.isDemo}<Badge label="示範資料" tone="demo" />{/if}
            </p>
            <p class="title">
              <a href={post.url} target="_blank" rel="noopener noreferrer nofollow">{post.title}<span class="visually-hidden">（開啟原網站）</span></a>
            </p>
            {#if post.excerpt}<p class="excerpt">{post.excerpt}…</p>{/if}
            {#if post.author}<p class="author">作者 {post.author}</p>{/if}
          </li>
        {/each}
      </ol>
      {#if total > posts.length}<p class="more">只列出最新 {posts.length} 篇，共 {total} 篇。</p>{/if}
    {:else}
      <EmptyState title="還沒有收錄到這門課的外部文章" description="可以用下方的連結到其他網站搜尋。" />
    {/if}

    {#if links.length}
      <div class="search">
        <h3>到其他網站搜尋</h3>
        <ul class="links">
          {#each links as link (link.source)}
            <li><a class="button" href={link.url} target="_blank" rel="noopener noreferrer nofollow">在 {link.label} 搜尋 ↗</a></li>
          {/each}
        </ul>
        <p class="hint">這些是外部網站的搜尋連結，內容由該網站提供，UniCourse 不收錄。</p>
      </div>
    {/if}
  {/if}
</section>

<style>
  .external {
    display: grid;
    gap: var(--space-4);
    margin-top: var(--space-4);
    padding: clamp(var(--space-4), 4vw, var(--space-8));
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel-raised);
    color: var(--ink);
    font: var(--t-base) / var(--leading-body) var(--font-sans);
  }
  p, ol, ul, h3 { margin: 0; }
  h3 { margin-bottom: var(--space-2); font-size: var(--t-md); }
  .counts { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); padding: 0; list-style: none; }
  .count, .push { font-variant-numeric: tabular-nums; }
  .list { display: grid; padding: 0; list-style: none; }
  .list li { display: grid; gap: var(--space-1); padding: var(--space-3) 0; border-top: 1px solid var(--line); }
  .meta { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); align-items: center; color: var(--muted); font-size: var(--t-sm); }
  .push { color: var(--up); font-weight: 600; }
  .push.down { color: var(--down); }
  .title { font-weight: 600; overflow-wrap: anywhere; }
  .title a { color: var(--brand-ink); }
  .excerpt { color: var(--ink-2); overflow-wrap: anywhere; }
  .author, .more, .hint { color: var(--muted); font-size: var(--t-sm); overflow-wrap: anywhere; }
  .search { padding-top: var(--space-4); border-top: 1px solid var(--line); }
  .links { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: var(--space-2); margin-bottom: var(--space-2); padding: 0; list-style: none; }
  .button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--brand);
    border-radius: var(--radius-control);
    color: var(--brand-ink);
    font-weight: 600;
    text-align: center;
    text-decoration: none;
  }
  .button:hover { background: var(--brand-wash); }
  .button:focus-visible, .title a:focus-visible { outline: 2px solid var(--brand-ring); outline-offset: 2px; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
