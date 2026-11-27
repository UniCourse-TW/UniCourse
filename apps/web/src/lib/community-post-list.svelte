<script lang="ts">
  import { authorName, dateTime, oneLine, postTypeLabels, scoreSign, shortDateTime, signed } from '$lib/community-format';
  import { forumHref, postHref, profileHref } from '$lib/community-paths';
  import type { PostSummary } from '$lib/community-types';

  let {
    posts,
    schoolNames = {},
    showAuthor = true,
    label = '文章列表',
    dense = false
  }: {
    posts: PostSummary[];
    schoolNames?: Record<string, string>;
    showAuthor?: boolean;
    label?: string;
    /** Compact rows: category, course and title on one line, then a one-line summary, then author and tags. */
    dense?: boolean;
  } = $props();
  const id = $props.id();
</script>

<!--
  A compact list in the tag.analysis.tw style: type badge, course context and title on the left,
  replies / score / date in aligned columns on the right (inline under the title on phones).
  The whole row is clickable through the title link; context, author and tag links sit above it.
-->
<div class="post-list" class:dense>
  <div class="cols" aria-hidden="true">
    <span>文章</span><span>回覆</span><span>分數</span><span>時間</span>
  </div>
  <ol aria-label={label}>
    {#each posts as post (post.id)}
      <li>
        <article aria-labelledby="{id}-{post.id}">
          <div class="main">
            <p class="kicker">
              <span class="cm-type" data-type={post.type}>{postTypeLabels[post.type]}</span>
              {#if post.school}
                <a class="over" href={forumHref({ school: post.school, courseCode: post.courseCode ?? undefined })}>
                  {schoolNames[post.school] ?? post.school}{#if post.courseCode}&nbsp;<span class="mono">{post.courseCode}</span>{/if}
                </a>
              {/if}
            </p>
            <h3 id="{id}-{post.id}"><a class="title" href={postHref(post.id)}>{post.title}</a></h3>
            {#if dense}
              {#if post.excerpt.trim()}<p class="excerpt">{oneLine(post.excerpt)}</p>{/if}
              {#if showAuthor || post.tags.length}
                <p class="by line">
                  {#if showAuthor}<a class="over author" href={profileHref(post.author.username)}>{authorName(post.author)}</a>{/if}
                  {#each post.tags as tag (tag)}<a class="over tag" href={forumHref({ tag })}>#{tag}</a>{/each}
                </p>
              {/if}
            {:else}
              {#if post.excerpt.trim()}<p class="excerpt">{oneLine(post.excerpt)}</p>{/if}
              {#if showAuthor || post.tags.length}
                <!-- Author and tags come after the summary, so the category and course lead the row. -->
                <p class="by">
                  {#if showAuthor}<a class="over author" href={profileHref(post.author.username)}>{authorName(post.author)}</a>{/if}
                  {#each post.tags as tag (tag)}<a class="over tag" href={forumHref({ tag })}>#{tag}</a>{/each}
                </p>
              {/if}
            {/if}
          </div>
          <dl class="stats">
            <div class="replies"><dt>回覆</dt><dd class="num">{post.replyCount}</dd></div>
            <div><dt>分數</dt><dd class="cm-score" data-sign={scoreSign(post.score)}>{signed(post.score)}</dd></div>
            <div class="when"><dt>發表於</dt><dd class="num"><time datetime={post.createdAt} title={dateTime(post.createdAt)}>{shortDateTime(post.createdAt)}</time></dd></div>
          </dl>
        </article>
      </li>
    {/each}
  </ol>
</div>

<style>
  .post-list {
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel-raised);
    overflow: hidden;
  }
  .cols, article {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 4rem 4rem 8rem;
    gap: 0 var(--space-2);
    padding-inline: var(--space-4);
  }
  .cols {
    padding-block: var(--space-2);
    border-block-end: 1px solid var(--line);
    color: var(--muted);
    background: var(--table-head);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .cols span:not(:first-child) { text-align: end; }
  ol { margin: 0; padding: 0; list-style: none; }
  li + li { border-block-start: 1px solid var(--line); }
  article { position: relative; align-items: center; padding-block: var(--space-3); }
  article:hover, article:focus-within { background: var(--hover-row); }
  .main { min-inline-size: 0; }
  .kicker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.125rem var(--space-2);
    align-items: center;
    color: var(--muted);
    font-size: var(--t-sm);
    line-height: 1.5;
  }
  .kicker a { color: var(--ink-2); text-decoration: none; }
  .kicker a:hover { color: var(--brand-ink); text-decoration: underline; }
  /* Author and tags share one muted line under the summary; spacing, not bullet characters, separates them. */
  .by { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; margin-block-start: 0.125rem !important; font-size: var(--t-sm); line-height: 1.5; }
  .by a { color: var(--muted); text-decoration: none; }
  .by a:hover { color: var(--brand-ink); text-decoration: underline; }
  .by .author { color: var(--ink-2); }
  .by .author::before { content: '@'; color: var(--muted); }
  /* Tags are small chips, so they never read as part of the summary. */
  .by .tag { padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: var(--t-xs); line-height: 1.6; }
  /* Links above the stretched title link stay clickable on their own. */
  .over { position: relative; z-index: 1; }
  h3 { margin-block: 0.125rem 0 !important; font-size: var(--t-md) !important; font-weight: 600 !important; letter-spacing: 0 !important; line-height: 1.45 !important; }
  /* Titles read as links: brand colour, underline on hover, a full-row focus ring. */
  .title { color: var(--brand-ink) !important; text-decoration: none; }
  .title::after { content: ''; position: absolute; inset: 0; z-index: 0; }
  .title:hover { text-decoration: underline; text-decoration-thickness: 2px; }
  .title:focus-visible { outline: none !important; }
  .title:focus-visible::after { outline: var(--focus-ring); outline-offset: -3px; border-radius: var(--radius-control); }
  .excerpt {
    margin-block-start: 0.125rem !important;
    color: var(--ink-2);
    font-size: 0.8125rem;
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* Dense rows: the title starts every row (desktop and phone alike); the summary follows, then one
     muted line with category, course, author and tags. */
  .dense .main { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; }
  .dense h3 { order: 0; flex-basis: 100%; min-inline-size: 0; margin: 0 !important; }
  .dense .excerpt { order: 1; flex-basis: 100%; min-inline-size: 0; }
  .dense .kicker { order: 2; flex: none; margin-block-start: 0.125rem !important; }
  .dense .by.line { order: 3; flex: 1 1 auto; min-inline-size: 0; gap: 0 var(--space-2); }
  .dense article { padding-block: var(--space-2); }
  .stats { display: contents; }
  .stats div { text-align: end; }
  dt { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  dd { margin: 0; color: var(--ink-2); font-size: var(--t-base); font-variant-numeric: tabular-nums; }
  .when dd { color: var(--muted); }

  @media (max-width: 40rem) {
    .cols { display: none; }
    article { grid-template-columns: minmax(0, 1fr); padding: var(--space-3); }
    .excerpt { -webkit-line-clamp: 2; line-clamp: 2; }
    .stats { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); margin: var(--space-1) 0 0; }
    .stats div { display: flex; gap: 0.25em; align-items: baseline; text-align: start; }
    dt { position: static; inline-size: auto; block-size: auto; overflow: visible; clip: auto; color: var(--muted); font-size: var(--t-sm); }
    dd { font-size: var(--t-sm); }
    .when { order: -1; }
    .when dt { display: none; }
  }
</style>
