<script lang="ts">
  import { authorName, courseKey, dateTime, oneLine, postTypeLabels, scoreSign, shortDateTime, signed, titleWithoutCourse } from '$lib/community-format';
  import { forumHref, postHref, profileHref } from '$lib/community-paths';
  import type { PostSummary } from '$lib/community-types';

  let {
    posts,
    schoolNames = {},
    showAuthor = true,
    label = '文章列表',
    dense = false,
    courseTitles = {},
    showCourse = true
  }: {
    posts: PostSummary[];
    schoolNames?: Record<string, string>;
    /** Course titles keyed `school/courseCode`: the row names the course once and the title drops it. */
    courseTitles?: Record<string, string>;
    showAuthor?: boolean;
    label?: string;
    /** Compact rows: category, course and title on one line, then a one-line summary, then author and tags. */
    dense?: boolean;
    /** False on a course's own page, where every row is about that course: the kicker keeps only the type. */
    showCourse?: boolean;
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
      {@const courseTitle = post.school && post.courseCode ? courseTitles[courseKey(post.school, post.courseCode)] : undefined}
      <li>
        <article aria-labelledby="{id}-{post.id}">
          <div class="main">
            <p class="kicker">
              <span class="cm-type" data-type={post.type}>{postTypeLabels[post.type]}</span>
              {#if post.school && showCourse}
                <a class="over" href={forumHref({ school: post.school, courseCode: post.courseCode ?? undefined })}>
                  <!-- School, course and code are separate parts (each kept whole) with a visible divider. -->
                  <span class="part">{schoolNames[post.school] ?? post.school}</span>{#if courseTitle}<span class="divider">·</span><span class="part course">{courseTitle}</span>{/if}{#if post.courseCode}{' '}<span class="part mono code">{post.courseCode}</span>{/if}
                </a>
              {/if}
            </p>
            <h3 id="{id}-{post.id}"><a class="title" href={postHref(post.id)} title={courseTitle && titleWithoutCourse(post.title, courseTitle) !== post.title ? post.title : undefined}>{titleWithoutCourse(post.title, courseTitle)}</a></h3>
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
          <!-- Time first in the markup, so the phone line reads「11/27 13:04 · 回覆 0 · 分數 0」; desktop
               places each value in its own column. -->
          <dl class="stats">
            <div class="when"><dt>發表於</dt><dd class="num"><time datetime={post.createdAt} title={dateTime(post.createdAt)}>{shortDateTime(post.createdAt)}</time></dd></div>
            <div class="replies"><dt>回覆</dt><dd class="num">{post.replyCount}</dd></div>
            <div class="score"><dt>分數</dt><dd class="cm-score" data-sign={scoreSign(post.score)}>{signed(post.score)}</dd></div>
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
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .kicker .cm-type { font-size: 0.8125rem; }
  .kicker .part { white-space: nowrap; }
  .kicker .divider { margin-inline: 0.35em; color: var(--axis); }
  .kicker .code { color: var(--muted); }
  .kicker .cm-type[data-type='article'] { color: var(--brand-ink); background: var(--brand-wash); }
  .kicker a { color: var(--ink-2); text-decoration: none; }
  .kicker a:hover { color: var(--brand-ink); text-decoration: underline; }
  /* Author and tags share one muted line under the summary; spacing, not bullet characters, separates them. */
  .by { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; margin-block-start: 0.125rem !important; font-size: 0.8125rem; line-height: 1.5; }
  .by a { color: var(--muted); text-decoration: none; }
  .by a:hover { color: var(--brand-ink); text-decoration: underline; }
  .by .author { color: var(--ink-2); }
  .by .author::before { content: '@'; color: var(--muted); }
  /* Tags are small chips, so they never read as part of the summary. */
  .by .tag { padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: 0.8125rem; line-height: 1.6; }
  /* Links above the stretched title link stay clickable on their own. */
  .over { position: relative; z-index: 1; }
  h3 { margin-block: 0.125rem 0 !important; font-size: var(--t-md) !important; font-weight: 600 !important; letter-spacing: 0 !important; line-height: 1.5 !important; }
  /* Titles read as links: brand colour, underline on hover, a full-row focus ring. */
  .title { color: var(--brand-ink) !important; text-decoration: none; }
  .title::after { content: ''; position: absolute; inset: 0; z-index: 0; }
  .title:hover { text-decoration: underline; text-decoration-thickness: 2px; }
  .title:focus-visible { outline: none !important; }
  .title:focus-visible::after { outline: var(--focus-ring); outline-offset: -3px; border-radius: var(--radius-control); }
  .excerpt {
    margin-block-start: var(--space-1) !important;
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
  /* One line, always: extra tags are clipped rather than wrapping the row to a fourth line. */
  .dense .by.line { order: 3; flex: 1 1 0; flex-wrap: nowrap; min-inline-size: 0; gap: 0 var(--space-2); overflow: hidden; white-space: nowrap; }
  .dense .by.line a { flex: none; }
  .dense article { padding-block: var(--space-2); }
  .stats { display: contents; }
  .stats div { grid-row: 1; text-align: end; }
  .main { grid-row: 1; grid-column: 1; }
  .stats .replies { grid-column: 2; }
  .stats .score { grid-column: 3; }
  .stats .when { grid-column: 4; }
  dt { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  dd { margin: 0; color: var(--ink-2); font-size: var(--t-base); font-variant-numeric: tabular-nums; }
  .when dd { color: var(--muted); }
  /* Replies and score in one weight; only the sign carries colour (green up, red down, grey zero). */
  dd.cm-score { font-weight: 400; }
  dd.cm-score[data-sign='zero'] { color: var(--muted); }
  .kicker .course { color: var(--ink); font-weight: 600; }

  @media (max-width: 40rem) {
    .cols { display: none; }
    /* Phones: title, summary, then one fixed line of time · replies · score; course, author and tags last. */
    article { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); padding: var(--space-3); }
    .main, .dense .main { display: contents; }
    h3, .dense h3 { order: 0; flex-basis: 100%; }
    .excerpt, .dense .excerpt { order: 1; flex-basis: 100%; -webkit-line-clamp: 2; line-clamp: 2; }
    .stats { order: 2; display: flex; flex-basis: 100%; flex-wrap: wrap; gap: 0; margin: var(--space-1) 0 0; }
    .stats div { display: flex; gap: 0.25em; align-items: baseline; text-align: start; }
    .stats div + div::before { content: '·'; margin-inline: 0.5em; color: var(--muted); }
    .kicker, .dense .kicker { order: 3; margin-block-start: var(--space-1) !important; }
    .by, .dense .by.line { order: 4; flex: 1 1 auto; margin-block-start: var(--space-1) !important; }
    dt { position: static; inline-size: auto; block-size: auto; overflow: visible; clip: auto; color: var(--muted); font-size: var(--t-sm); }
    dd { font-size: var(--t-sm); }
    .when dt { display: none; }
  }
</style>
