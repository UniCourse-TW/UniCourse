<script lang="ts">
  import type { ExternalReviews } from '@unicourse/api-client';
  import { joinedAt } from './community-format';
  import { isHttpUrl } from './format';
  import Badge from './ui/Badge.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import SectionHeader from './ui/SectionHeader.svelte';
  import { displayValue } from './ui/format';

  let { reviews, courseReviews, searchQuery, retryHref }: {
    reviews: ExternalReviews | null;
    courseReviews: { id: string; title: string; count: number }[];
    searchQuery: string;
    retryHref: string;
  } = $props();
  const previewSize = 3;
  let pttSearch = $derived(`https://www.google.com/search?${new URLSearchParams({ q: `site:ptt.cc/bbs ${searchQuery}` })}`);
  let total = $derived(reviews?.sources.reduce((sum, source) => sum + source.count, 0) ?? 0);
  let posts = $derived(reviews?.posts.filter((post) => isHttpUrl(post.url)) ?? []);
  let links = $derived(reviews?.linkOnly.filter((link) => isHttpUrl(link.url)) ?? []);
</script>

{#snippet postList(items: ExternalReviews['posts'])}
  <ul class="article-list">
    {#each items as post (post.url)}
      <li>
        <p class="post-meta">
          <Badge label={post.sourceLabel} /> <span>{post.board}</span>
          {#if post.postedAt}<time datetime={post.postedAt}>{joinedAt(post.postedAt)}</time>{/if}
          {#if post.pushScore != null}<span class="ui-tabular">推 {displayValue(post.pushScore)}</span>{/if}
          {#if post.isDemo}<Badge label="示範資料" tone="demo" />{/if}
        </p>
        <a href={post.url} target="_blank" rel="noopener noreferrer nofollow">{post.title} <span aria-hidden="true">↗</span></a>
        {#if post.excerpt}<p class="excerpt">{post.excerpt}</p>{/if}
      </li>
    {/each}
  </ul>
{/snippet}

<section class="browse-stack" aria-labelledby="discussions">
  <SectionHeader title="網路上的討論" id="discussions" description={posts.length ? "索引顯示公開文章的標題、日期與短摘錄。同名教師可能是不同人，可到原站核對。" : undefined} />
  {#if !reviews}
    <ErrorState title="暫時無法取得討論索引" {retryHref} />
  {:else}
    {#if posts.length}
      <div class="index-panel">
        <p class="index-count"><strong>已索引 {displayValue(total)} 篇</strong><span>由新到舊{posts.length > previewSize ? `，先列最新 ${previewSize} 篇` : ''}</span></p>
        {@render postList(posts.slice(0, previewSize))}
        {#if posts.length > previewSize}
          <details>
            <summary>{posts.length === total ? `顯示全部（${displayValue(posts.length)} 篇）` : `展開其餘 ${displayValue(posts.length - previewSize)} 篇`}</summary>
            {@render postList(posts.slice(previewSize))}
          </details>
        {/if}
        {#if total > posts.length}<p class="browse-note">此處最多列出索引中最新 {displayValue(posts.length)} 篇。</p>{/if}
      </div>
    {:else}
      <p class="index-count">
        <span>{total ? '暫無可開啟的索引連結' : 'PTT 索引未找到提及這位教師的文章'}</span>
        <a class="ptt-search" href={pttSearch} target="_blank" rel="noopener noreferrer" aria-label="透過 Google 搜尋 PTT（另開分頁）">搜尋 PTT ↗</a>
      </p>
      {#if courseReviews.length}
        <details>
          <summary>相關課程的文章索引（{displayValue(courseReviews.length)} 門）</summary>
          <p class="browse-note">文章可能未提及這位教師。</p>
          <ul class="course-review-list" role="list">
            {#each courseReviews as course (course.id)}<li><a href={`/courses/${course.id}#external-reviews`}>{course.title} · {displayValue(course.count)} 篇</a></li>{/each}
          </ul>
        </details>
      {/if}
    {/if}
    {#if links.length}
      <div class="outbound">
        <h3>到其他網站搜尋</h3>
        <p class="browse-note">以下網站僅提供搜尋連結。</p>
        <div class="browse-actions">
          {#each links as link (link.url)}<a class="browse-button" href={link.url} target="_blank" rel="noopener noreferrer nofollow">搜尋 {link.label} ↗</a>{/each}
        </div>
      </div>
    {/if}
  {/if}
</section>

<style>
  .index-panel { padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .index-count, .post-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-2); }
  .index-count .ptt-search { display: inline-grid; align-items: center; min-block-size: var(--target-min); font-size: var(--t-base); }
  .index-count span, .post-meta { color: var(--muted); font-size: var(--t-sm); }
  .article-list { list-style: none; margin: var(--space-2) 0 0; padding: 0; }
  .course-review-list { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); margin: 0; padding: 0; list-style: none; }
  .course-review-list a { display: inline-flex; align-items: center; min-block-size: var(--target-min); }
  .article-list li { padding-block: var(--space-2); border-block-start: 1px solid var(--line); overflow-wrap: anywhere; }
  .article-list a, summary { display: block; width: fit-content; min-block-size: var(--target-min); align-content: center; font-weight: 650; }
  summary { display: list-item; color: var(--brand-ink); cursor: pointer; }
  .outbound { display: grid; gap: var(--space-1); }
  .excerpt { margin: 0; color: var(--ink-2); font-size: var(--t-base); }
  h3, p { margin: 0; }
  h3 { font-size: var(--t-md); }
</style>
