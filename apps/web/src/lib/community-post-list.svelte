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
    /** Kept for callers; every list now uses the compact rows (title, summary, one context line). */
    dense?: boolean;
    /** False on a course's own page, where every row is about that course: the kicker keeps only the type. */
    showCourse?: boolean;
  } = $props();
  const id = $props.id();
</script>

<!--
  A compact list in the tag.analysis.tw style. Desktop: title, a one-line summary, then one muted line with
  category, course, author and tags; replies / score / date in aligned columns on the right. Phones: title,
  summary, category and course, then「author · time」with replies and score at a fixed right-hand spot, and
  the tags on their own line. The whole row is clickable through the title link; the other links sit above it.
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
            <h3 id="{id}-{post.id}"><a class="title" href={postHref(post.id)} title={courseTitle && titleWithoutCourse(post.title, courseTitle) !== post.title ? post.title : undefined}>{titleWithoutCourse(post.title, courseTitle)}</a></h3>
            {#if post.excerpt.trim()}<p class="excerpt">{oneLine(post.excerpt)}</p>{/if}
            <p class="kicker" class:solo={!(post.school && showCourse)}>
              <span class="cm-type" data-type={post.type}>{postTypeLabels[post.type]}</span>
              {#if post.school && showCourse}
                <a class="over ctx" href={forumHref({ school: post.school, courseCode: post.courseCode ?? undefined })}>
                  <!-- School, course and code are separate parts (each kept whole) with a visible divider. -->
                  <span class="part">{schoolNames[post.school] ?? post.school}</span>{#if courseTitle}<span class="divider">·</span><span class="part course">{courseTitle}</span>{/if}{#if post.courseCode}{' '}<span class="part mono code">{post.courseCode}</span>{/if}
                </a>
              {/if}
            </p>
            {#if showAuthor}<span class="who"><a class="over ctx author" href={profileHref(post.author.username)} title={authorName(post.author)}>{authorName(post.author)}</a></span>{/if}
            {#if post.tags.length || !(post.school && showCourse)}
              <!-- Without a course to name, phones show the type badge at the head of the tag line (the kicker
                   above would be a line holding one badge). -->
              <span class="tags">{#if !(post.school && showCourse)}<span class="cm-type tag-type" data-type={post.type}>{postTypeLabels[post.type]}</span>{/if}{#each post.tags as tag (tag)}<a class="over tag" href={forumHref({ tag })}>#{tag}</a>{/each}</span>
            {/if}
          </div>
          <!-- Time first in the markup, so the phone line reads「11/27 13:04 … 回覆 0 · 分數 0」; desktop
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
  article { position: relative; align-items: center; padding-block: var(--space-2); }
  article:hover, article:focus-within { background: var(--hover-row); }
  /* Title, summary, then one muted line: category and course, author, tags (clipped, never a 4th line). */
  .main { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; min-inline-size: 0; grid-row: 1; grid-column: 1; }
  h3 { flex-basis: 100%; min-inline-size: 0; margin: 0 !important; font-size: var(--t-md) !important; font-weight: 600 !important; letter-spacing: 0 !important; line-height: 1.5 !important; }
  .excerpt {
    flex-basis: 100%;
    min-inline-size: 0;
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
  .kicker, .who, .tags { margin-block-start: 0.25rem !important; font-size: 0.8125rem; line-height: 1.5; }
  .kicker {
    display: flex;
    flex: 0 1 auto;
    min-inline-size: 0;
    flex-wrap: wrap;
    gap: 0.125rem var(--space-2);
    align-items: center;
    color: var(--muted);
  }
  .kicker .cm-type { font-size: 0.8125rem; }
  .kicker .part { white-space: nowrap; }
  .kicker .divider { margin-inline: 0.35em; color: var(--axis); }
  .kicker .code { color: var(--muted); }
  .kicker .course { font-weight: 600; }
  .kicker .cm-type[data-type='article'] { color: var(--brand-ink); background: var(--brand-wash); }
  /* Every secondary link in a row (course, author) has the same cue: ink text with a thin muted underline;
     the brand colour is kept for the title, the row's main link. Tags are the only chips. */
  .ctx { color: var(--ink-2) !important; text-decoration: none; }
  /* The underline sits under the words only, never under the divider between school and course. */
  .ctx .part, .author { text-decoration: underline; text-decoration-color: var(--axis); text-decoration-thickness: 1px; text-underline-offset: 0.2em; }
  .ctx:hover { color: var(--brand-ink) !important; }
  .ctx:hover :is(.part), .author:hover { text-decoration-color: currentColor; }
  .who { flex: none; min-inline-size: 0; }
  .author::before { content: '@'; }
  .tags { display: flex; flex: 1 1 0; flex-wrap: nowrap; gap: 0 var(--space-2); min-inline-size: 0; overflow: hidden; white-space: nowrap; }
  .tag { flex: none; padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2) !important; font-size: 0.8125rem; line-height: 1.6; text-decoration: none; }
  .tag:hover { color: var(--brand-ink) !important; text-decoration: underline; }
  .tag-type { display: none; flex: none; font-size: 0.8125rem; }
  .tag-type[data-type='article'] { color: var(--brand-ink); background: var(--brand-wash); }
  /* Links above the stretched title link stay clickable on their own. */
  .over { position: relative; z-index: 1; }
  /* Titles read as links: brand colour, underline on hover, a full-row focus ring. */
  .title { color: var(--brand-ink) !important; text-decoration: none; }
  .title::after { content: ''; position: absolute; inset: 0; z-index: 0; }
  .title:hover { text-decoration: underline; text-decoration-thickness: 2px; }
  .title:focus-visible { outline: none !important; }
  .title:focus-visible::after { outline: var(--focus-ring); outline-offset: -3px; border-radius: var(--radius-control); }
  .stats { display: contents; }
  .stats div { grid-row: 1; text-align: end; }
  .stats .replies { grid-column: 2; }
  .stats .score { grid-column: 3; }
  .stats .when { grid-column: 4; }
  dt { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  dd { margin: 0; color: var(--ink-2); font-size: var(--t-base); font-variant-numeric: tabular-nums; }
  .when dd { color: var(--muted); }
  /* Replies and score in one weight; only the sign carries colour (green up, red down, grey zero). */
  dd.cm-score { font-weight: 400; }
  dd.cm-score[data-sign='zero'] { color: var(--muted); }

  @media (max-width: 40rem) {
    .cols { display: none; }
    /* Phones: title, summary, category and course; then「author · time」with replies and score held at the
       right end of the same line (one fixed spot on every row); tags last, on their own line. */
    article { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: baseline; padding: var(--space-3); }
    .main { display: contents; }
    h3 { order: 0; }
    .excerpt { order: 1; -webkit-line-clamp: 2; line-clamp: 2; }
    .kicker { order: 2; flex-basis: 100%; margin-block-start: var(--space-2) !important; }
    .who { order: 3; display: flex; max-inline-size: 8.5em; margin-block-start: var(--space-1) !important; }
    .author { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .who::after { content: '·'; margin-inline-start: var(--space-2); color: var(--muted); }
    .stats { order: 4; display: flex; flex: 1 1 auto; gap: 0; margin: var(--space-1) 0 0; font-size: var(--t-sm); }
    .stats div { display: flex; gap: 0.25em; align-items: baseline; text-align: start; }
    .stats .replies { margin-inline-start: auto; padding-inline-start: var(--space-3); }
    .stats .score::before { content: '·'; margin-inline: 0.5em; color: var(--muted); }
    .tags { order: 5; flex: 1 1 100%; flex-wrap: wrap; row-gap: var(--space-1); margin-block-start: var(--space-2) !important; }
    /* No course to name (a course's own page): the type badge leads the tag line instead of taking a line. */
    .kicker.solo { display: none; }
    .tags .tag-type { display: inline-block; }
    dt { position: static; inline-size: auto; block-size: auto; overflow: visible; clip: auto; color: var(--muted); font-size: var(--t-sm); }
    dd { font-size: var(--t-sm); }
    .when dt { display: none; }
  }
</style>
