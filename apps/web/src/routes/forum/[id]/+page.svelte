<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { onMount, tick } from 'svelte';
  import '$lib/community-ui.css';
  import { authorName, dateTime, postTypeLabels, scoreSign, shortDateTime, signed } from '$lib/community-format';
  import { courseSearchHref, forumHref, loginHref, postHref, profileHref } from '$lib/community-paths';
  import type { Author } from '$lib/community-types';
  import Badge from '$lib/ui/Badge.svelte';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageProps } from './$types';

  interface Item {
    id: number;
    title?: string;
    content: string;
    author: Author;
    score: number;
    myVote: number;
    createdAt: string;
    updatedAt: string;
  }

  let { data, form }: PageProps = $props();
  let post = $derived(data.post);
  let user = $derived(data.user);
  let course = $derived(data.course);
  let here = $derived(page.url.pathname);
  let schoolName = $derived(post.school ? (data.schoolNames[post.school] ?? post.school) : '');
  let replyDraft = $derived(form?.action === 'reply' && 'content' in form ? (form.content ?? '') : '');
  let replyLength = $derived([...replyDraft].length);
  let pendingVotes = $state<number[]>([]);
  let replying = $state(false);
  let announcement = $state('');
  let hydrated = $state(false);
  onMount(() => (hydrated = true));

  const fmt = new Intl.NumberFormat('zh-TW');

  const keepValues = () => async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) =>
    update({ reset: false });

  const voting = (id: number): SubmitFunction => () => {
    pendingVotes = [...pendingVotes, id];
    return async ({ update }) => {
      await update({ reset: false });
      pendingVotes = pendingVotes.filter((other) => other !== id);
    };
  };

  const submitReply: SubmitFunction = () => {
    replying = true;
    announcement = '';
    return async ({ result, update }) => {
      await update();
      replying = false;
      if (result.type === 'success' && result.data?.replied) {
        replyLength = 0;
        announcement = '已送出回覆。';
        await tick();
        document.getElementById(`reply-${result.data.replied}`)?.scrollIntoView({ block: 'center' });
      }
    };
  };

  const messageFor = (id: number) =>
    form && 'target' in form && form.target === id && 'message' in form ? form.message : undefined;
  const editDraft = (item: Item) =>
    form?.action === 'edit' && 'content' in form && form.target === item.id
      ? { title: form.title ?? item.title, content: form.content ?? item.content }
      : { title: item.title, content: item.content };
  const edited = (item: Item) => item.updatedAt !== item.createdAt;
  /** Blank lines (any number of them) separate paragraphs; single line breaks stay inside one. */
  const paragraphs = (text: string) => text.trim().split(/\n[ \t]*\n\s*/);
</script>

<svelte:head>
  <title>{post.title}｜UniCourse 論壇</title>
  <meta name="description" content={`${postTypeLabels[post.type]}${schoolName ? `・${schoolName}` : ''}${post.courseCode ? ` ${post.courseCode}` : ''}：${post.title}`} />
</svelte:head>

{#snippet controls(item: Item, kind: '文章' | '回覆')}
  {@const isAuthor = user?.username === item.author.username}
  {@const pending = pendingVotes.includes(item.id)}
  <div class="controls">
    {#if user}
      <form method="POST" action="?/vote" class="vote" use:enhance={voting(item.id)} aria-busy={pending}>
        <input type="hidden" name="target" value={item.id} />
        <button name="value" value={item.myVote === 1 ? 0 : 1} aria-pressed={item.myVote === 1} disabled={pending}>
          <span aria-hidden="true">▲</span> 推
        </button>
        <span class="cm-score" data-sign={scoreSign(item.score)} aria-label="{kind}分數" aria-live="polite">{signed(item.score)}</span>
        <button name="value" value={item.myVote === -1 ? 0 : -1} aria-pressed={item.myVote === -1} disabled={pending}>
          <span aria-hidden="true">▼</span> 噓
        </button>
      </form>
    {:else}
      <p class="vote static">
        <span class="label">分數</span>
        <span class="cm-score" data-sign={scoreSign(item.score)} aria-label="{kind}分數">{signed(item.score)}</span>
      </p>
    {/if}
    {#if kind === '文章'}
      <a class="action reply-link" href="#reply-form">回覆</a>
    {/if}
    {#if isAuthor || user?.isAdmin}
      <!-- Author tools are one outlined group at the far end, so a thumb aimed at 推 never lands on 刪除. -->
      <div class="manage" role="group" aria-label="作者操作">
      <!-- Re-created after each save so the panels close again. -->
      {#key `${item.updatedAt}|${item.title}|${item.content}`}
        {#if isAuthor}
          {@const draft = editDraft(item)}
          <details class="panel" open={form?.action === 'edit' && form.target === item.id && 'message' in form}>
            <summary class="action">編輯</summary>
            <form method="POST" action="?/edit" class="cm-form" use:enhance={keepValues}>
              <input type="hidden" name="target" value={item.id} />
              {#if item.title !== undefined}
                <div class="cm-field">
                  <div class="cm-label"><label for="edit-title-{item.id}">標題</label></div>
                  <input id="edit-title-{item.id}" class="cm-input" name="title" required maxlength="200" defaultValue={draft.title} />
                </div>
              {/if}
              <div class="cm-field">
                <div class="cm-label"><label for="edit-content-{item.id}">內容</label><span class="cm-hint">純文字，保留換行</span></div>
                <textarea id="edit-content-{item.id}" class="cm-input" name="content" required rows="6" maxlength="20000" defaultValue={draft.content}></textarea>
              </div>
              <div class="row"><button class="cm-btn">儲存修改</button></div>
            </form>
          </details>
        {/if}
        <details class="panel danger">
          <summary class="action">刪除…</summary>
          <form method="POST" action="?/delete" class="confirm" use:enhance>
            <input type="hidden" name="target" value={item.id} />
            <p>{kind === '文章' ? '刪除後整串討論（含所有回覆）都會隱藏，無法復原。' : '刪除這則回覆後無法復原。'}</p>
            <button class="cm-btn danger">確定刪除</button>
          </form>
        </details>
      {/key}
      </div>
    {/if}
  </div>
  {#if messageFor(item.id)}<p class="cm-alert" role="alert">{messageFor(item.id)}</p>{/if}
{/snippet}

<div class="cm thread-page">
  <!-- Same trail on every device: 論壇 / 學校的討論 / 課號（課程頁或這門課的討論）. -->
  <nav class="crumbs" aria-label="麵包屑">
    <a href="/forum">論壇</a>
    {#if post.school}
      <span class="sep" aria-hidden="true">/</span>
      <a href={forumHref({ school: post.school })}>{schoolName}</a>
      {#if post.courseCode}
        <span class="sep" aria-hidden="true">/</span>
        {#if course?.summary}
          <a class="mono" href="/courses/{course.summary.id}" title="{course.summary.title} 課程頁">{post.courseCode}</a>
        {:else}
          <a class="mono" href={forumHref({ school: post.school, courseCode: post.courseCode })}>{post.courseCode}</a>
        {/if}
      {/if}
    {/if}
  </nav>

  <div class="layout" class:with-aside={course}>
    <article class="post" aria-labelledby="post-title">
      <p class="kicker">
        <span class="cm-type" data-type={post.type}>{postTypeLabels[post.type]}</span>
        {#each post.tags as tag (tag)}<a href={forumHref({ tag })}>#{tag}</a>{/each}
      </p>
      <h1 id="post-title">{post.title}</h1>
      <p class="meta">
        <a href={profileHref(post.author.username)}>{authorName(post.author)}</a>
        {#if post.author.displayName}<span class="handle">@{post.author.username}</span>{/if}
        <span class="sep">·</span><time class="num" datetime={post.createdAt}>{dateTime(post.createdAt)}</time>
        {#if edited(post)}<span class="sep">·</span><span title="最後編輯 {dateTime(post.updatedAt)}">已編輯</span>{/if}
      </p>
      <!-- User text is plain text: escaped by Svelte, line breaks preserved. -->
      <div class="content">{#each paragraphs(post.content) as paragraph, index (index)}<p>{paragraph}</p>{/each}</div>
      {@render controls(post, '文章')}
    </article>

    {#if course}
      <aside class="course" aria-labelledby="course-card-title">
        <h2 id="course-card-title" class="eyebrow">這門課</h2>
        {#if course.summary}
          {@const summary = course.summary}
          <p class="course-title">
            <a href="/courses/{summary.id}">{summary.title}</a>
            <span class="mono code">{summary.courseCode}</span>
            {#if summary.isDemo}<Badge label="示範" tone="demo" />{/if}
          </p>
          <p class="sub">{[summary.schoolName, summary.department].filter(Boolean).join(' · ')}</p>
          <!-- Phones fold the numbers so the first reply follows the question; desktop CSS keeps them open. -->
          <details class="facts-box">
            <summary class="facts-title"><span>收錄學期、修課人數與評價</span></summary>
          <dl class="facts">
            <div>
              <dt>收錄學期</dt>
              <dd class="num">{summary.terms} 個學期{#if summary.terms > 1}<small>{summary.firstTerm}–{summary.latestTerm}</small>{/if}</dd>
            </div>
            <div>
              <dt>歷年修課</dt>
              <dd class="num">{#if summary.enrolledTotal != null}{fmt.format(summary.enrolledTotal)} <small>人次</small>{:else}<span title="校方未公布修課人數">—</span>{/if}</dd>
            </div>
            <div>
              <dt>{summary.latestTerm} 修課／名額</dt>
              <dd class="num">
                <span class="nowrap">{#if summary.latestEnrolled != null}{fmt.format(summary.latestEnrolled)}{:else}<span title="校方未公布修課人數">—</span>{/if}
                / {#if summary.latestCapacity != null}{fmt.format(summary.latestCapacity)}{:else}<span title="校方未公布名額">—</span>{/if}</span>
                <small>{summary.latestSections > 1 ? `${summary.latestSections} 個班次合計` : '1 個班次'}</small>
              </dd>
            </div>
            <div>
              <dt>同學評價</dt>
              <dd class="num">
                {#if course.rating && course.rating.count > 0}<span class="star" aria-hidden="true">★</span> {course.rating.average?.toFixed(1)}
                  <small>{course.rating.count < 3 ? `目前僅 ${course.rating.count} 則` : `${course.rating.count} 則`}</small>{:else}尚無評價{/if}
              </dd>
            </div>
          </dl>
          {#if summary.instructors.length}
            <p class="sub teachers">{summary.latestTerm} 授課：{summary.instructors.join('、')}{#if summary.instructorCount > summary.instructors.length}<span class="nowrap"> 等 {summary.instructorCount} 位</span>{/if}</p>
          {/if}
          </details>
          <a class="cm-btn secondary block" href="/courses/{summary.id}">查看課程 <span aria-hidden="true">→</span></a>
        {:else}
          <p class="sub">
            {schoolName} <span class="mono">{post.courseCode}</span> 不在目前收錄的課程中。
            <a href={courseSearchHref(post.school ?? '', post.courseCode ?? '')}>搜尋這個課號</a>
          </p>
        {/if}
        <!-- Open on desktop by CSS; phones collapse the list so the first reply stays in reach. -->
        {#if course.otherCount === 0}
          {@const another = `${forumHref({ school: post.school ?? '', courseCode: post.courseCode ?? '' })}&compose=1`}
          <div class="others-empty">
            <p class="sub none">這門課目前只有這一篇討論。</p>
            <a class="new-post" href={user ? another : loginHref(another)}><span aria-hidden="true">＋</span> 新增這門課的討論</a>
          </div>
        {:else}
        <details class="others-box">
          <summary class="eyebrow others-title">其他討論（{course.otherCount}）</summary>
          {#if course.others.length}
            <ul class="others">
              {#each course.others as other (other.id)}
                <li>
                  <a href={postHref(other.id)}>{other.title}</a>
                  <span class="n num">{postTypeLabels[other.type]} · {other.replyCount} 回覆</span>
                </li>
              {/each}
            </ul>
            {#if course.otherCount > course.others.length}
              <a class="all" href={forumHref({ school: post.school ?? '', courseCode: post.courseCode ?? '' })}>看全部 {course.otherCount} 篇 →</a>
            {/if}
          {/if}
        </details>
        {/if}
      </aside>
    {/if}

    <section class="replies" aria-labelledby="replies-title">
      <h2 id="replies-title">回覆（{post.replies.length}）</h2>
      {#if post.replies.length === 0}
        <p class="empty">還沒有回覆，說點什麼？</p>
      {:else}
        <ol>
          {#each post.replies as reply (reply.id)}
            <li id="reply-{reply.id}">
              <article class="reply" aria-label="{authorName(reply.author)} 的回覆">
                <p class="meta">
                  <a href={profileHref(reply.author.username)}>{authorName(reply.author)}</a>
                  {#if reply.author.username === post.author.username}<span class="op">原 PO</span>{/if}
                  <span class="sep">·</span><time class="num" datetime={reply.createdAt}>{shortDateTime(reply.createdAt)}</time>
                  {#if edited(reply)}<span class="sep">·</span>已編輯{/if}
                </p>
                <div class="content">{#each paragraphs(reply.content) as paragraph, index (index)}<p>{paragraph}</p>{/each}</div>
                {@render controls(reply, '回覆')}
              </article>
            </li>
          {/each}
        </ol>
      {/if}
      {#if user}
        <form method="POST" action="?/reply" class="reply-form cm-form" id="reply-form" use:enhance={submitReply}>
          <div class="cm-field">
            <div class="cm-label"><label for="reply-content">我要回覆</label></div>
            <textarea id="reply-content" class="cm-input" name="content" required rows="4" maxlength="20000" defaultValue={replyDraft}
              placeholder="分享你的經驗或回答問題。" aria-describedby="reply-hint"
              oninput={(event) => (replyLength = [...event.currentTarget.value].length)}></textarea>
          </div>
          {#if form?.action === 'reply' && 'message' in form}<p class="cm-alert" role="alert">{form.message}</p>{/if}
          <div class="row submit-row">
            <p class="status" role="status">
              {#if announcement}<span class="ok"><span aria-hidden="true">✓</span> {announcement}</span>
              {:else if replying}<span class="hint">送出中，請稍候…</span>
              {:else}<span class="hint" id="reply-hint">純文字，保留換行{#if hydrated && replyLength === 0}；輸入內容後才能送出{/if}</span>{/if}
            </p>
            <span class="cm-count" aria-live="polite">{fmt.format(replyLength)} / 20,000</span>
            <!-- Without JavaScript the button is always live; with it, an empty box cannot be sent. -->
            <button class="cm-btn" class:secondary={hydrated && replyLength === 0 && !replying} aria-busy={replying} disabled={replying || (hydrated && replyLength === 0)}>{replying ? '送出中…' : '送出回覆'}</button>
          </div>
        </form>
      {:else}
        <div class="login" id="reply-form">
          <p>登入後即可回覆與投票。</p>
          <a class="cm-btn" href={loginHref(here)}>登入</a>
          <a class="cm-btn quiet" href={loginHref(here, 'register')}>建立帳號</a>
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .thread-page .sep { margin-inline: 0.4em; color: var(--axis); }
  .crumbs { display: flex; flex-wrap: wrap; align-items: center; margin-block-end: var(--space-3); color: var(--muted); font-size: var(--t-base); }
  .crumbs a { display: inline-flex; align-items: center; min-block-size: var(--target-min); color: var(--ink-2); text-decoration: none; font-weight: 600; }
  .crumbs a:hover { color: var(--brand-ink); text-decoration: underline; }
  .crumbs a.mono { color: var(--brand-ink); }

  .layout { display: grid; gap: var(--space-6); grid-template-columns: minmax(0, 1fr); }
  .layout.with-aside { grid-template-columns: minmax(0, 1fr) 18.5rem; column-gap: var(--space-8); }
  .with-aside .post { grid-column: 1; grid-row: 1; }
  .with-aside .replies { grid-column: 1; grid-row: 2; }
  .with-aside .course { grid-column: 2; grid-row: 1 / span 2; align-self: start; position: sticky; inset-block-start: 5rem; }

  .post { min-inline-size: 0; padding-block-end: var(--space-5); border-block-end: 1px solid var(--line); }
  .kicker { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: center; font-size: var(--t-sm); }
  .kicker a { color: var(--muted); text-decoration: none; font-weight: 600; }
  .kicker a:hover { color: var(--brand-ink); text-decoration: underline; }
  h1 { margin-block-start: var(--space-2) !important; font-size: clamp(1.375rem, 3.5vw, 1.625rem) !important; }
  .meta { display: flex; flex-wrap: wrap; align-items: baseline; margin-block-start: var(--space-2) !important; color: var(--muted); font-size: 0.8125rem; }
  .meta a { color: var(--ink-2); font-weight: 600; text-decoration: none; }
  .meta a:hover { color: var(--brand-ink); text-decoration: underline; }
  .handle { margin-inline-start: 0.35em; }
  .op { margin-inline-start: 0.4em; padding: 0 6px; border-radius: var(--radius-pill); color: var(--brand-ink); background: var(--brand-wash); font-size: var(--t-xs); font-weight: 600; }
  .content {
    max-inline-size: 52em;
    margin-block-start: var(--space-4);
    font-size: var(--t-md);
    line-height: var(--leading-prose);
    overflow-wrap: anywhere;
  }
  .content p { margin: 0; white-space: pre-wrap; }
  .content p + p { margin-block-start: 0.75em; }

  .controls { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-1); align-items: center; margin-block-start: var(--space-4); }
  /* Author tools: one outlined 44 px group at the far end; delete is muted until hovered. */
  .manage { display: inline-flex; gap: 2px; align-items: center; margin-inline-start: auto; padding: 2px; border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel-raised); }
  .manage .action { min-block-size: calc(var(--target-min) - 6px); border-radius: calc(var(--radius-control) - 2px); }
  .reply-link { padding-inline: var(--space-3) !important; border: 1px solid var(--control-line); color: var(--brand-ink) !important; background: var(--panel-raised); }
  .reply-link:hover { background: var(--brand-wash) !important; }
  .vote {
    display: inline-flex;
    align-items: center;
    margin: 0 var(--space-2) 0 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
  }
  .vote button {
    display: inline-flex;
    gap: 0.25em;
    align-items: center;
    justify-content: center;
    min-block-size: var(--target-min);
    min-inline-size: var(--target-min);
    padding: 0 var(--space-3);
    border: 0;
    border-radius: calc(var(--radius-control) - 1px);
    color: var(--ink-2);
    background: transparent;
    font: 600 var(--t-base) / 1 var(--font-sans);
    cursor: pointer;
    touch-action: manipulation;
  }
  .vote button:hover { background: var(--hover-row); }
  /* A cast vote is solid and ticked, so it reads as 'on' without relying on a pale tint. */
  .vote button[aria-pressed='true'] { color: var(--on-brand); background: var(--brand); }
  .vote button[aria-pressed='true']::after { content: '✓' / ''; font-size: 0.85em; }
  .vote button[aria-pressed='true']:last-of-type { color: #fff; background: var(--down); }
  .vote button:disabled { opacity: 0.6; cursor: progress; }
  .vote[aria-busy='true'] .cm-score { opacity: 0.5; }
  /* The score is its own segment, so ▲ 推 · 0 · ▼ 噓 read as three parts even before a vote. */
  .vote .cm-score { min-inline-size: 2.75rem; padding-inline: var(--space-1); border-inline: 1px solid var(--line); text-align: center; font-size: var(--t-base); line-height: calc(var(--target-min) - 2px); }
  .vote .cm-score[data-sign='zero'] { color: var(--ink-2); }
  .vote.static { gap: var(--space-1); padding: 0 var(--space-2) 0 0; min-block-size: var(--target-min); border-color: transparent; background: transparent; }
  .vote.static .label { color: var(--muted); font-size: var(--t-sm); }
  .vote.static .cm-score { min-inline-size: 0; }

  .action {
    display: inline-flex;
    align-items: center;
    min-block-size: var(--target-min);
    padding: 0 var(--space-2);
    border-radius: var(--radius-control);
    color: var(--muted) !important;
    font-size: var(--t-base);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    list-style: none;
  }
  .action::-webkit-details-marker { display: none; }
  .action:hover { color: var(--brand-ink) !important; background: var(--hover-row); }
  .danger > .action:hover, .danger > .action:focus-visible { color: var(--down) !important; background: color-mix(in srgb, var(--down) var(--status-tint), var(--panel-raised)); }
  /* An open panel leaves the group and takes the full row, right where the row was. */
  .manage:has(.panel[open]) { display: contents; }
  .panel[open] { flex-basis: 100%; order: 10; padding: var(--space-3) var(--space-4) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .panel[open] > .action { margin-inline-start: calc(-1 * var(--space-2)); color: var(--ink) !important; }
  .panel.danger[open] > .action { color: var(--down) !important; }
  .panel.danger[open] { border-color: color-mix(in srgb, var(--down) 45%, var(--line)); }
  .confirm { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }
  .confirm p { flex: 1 1 16rem; color: var(--ink-2); font-size: var(--t-base); }
  .row { display: flex; gap: var(--space-2); }
  .submit-row { flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--space-3); }
  .submit-row .status { flex: 1 1 10rem; margin: 0 !important; font-size: var(--t-base); }
  .submit-row .ok { color: var(--up); font-weight: 600; }
  .submit-row .hint { color: var(--muted); font-size: var(--t-sm); }

  .course {
    min-inline-size: 0;
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel);
    font-size: var(--t-base);
  }
  .eyebrow { color: var(--muted) !important; font-size: var(--t-sm) !important; font-weight: 600 !important; letter-spacing: 0 !important; }
  .course-title { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: baseline; margin-block-start: var(--space-2) !important; }
  .course-title a { font-size: var(--t-lg); font-weight: 650; }
  .code { color: var(--muted); }
  .sub { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: 0.8125rem; }
  .others-box { margin-block-start: var(--space-4); padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .others-box > summary { list-style: none; cursor: default; pointer-events: none; }
  .others-box > summary::-webkit-details-marker { display: none; }
  .others-box::details-content { display: block; content-visibility: visible; }
  .new-post { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); font-weight: 600; text-decoration: none; }
  .new-post:hover { text-decoration: underline; }
  .facts-box > summary { list-style: none; pointer-events: none; }
  .facts-box > summary::-webkit-details-marker { display: none; }
  .facts-box > summary span { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .facts-box::details-content { display: block; content-visibility: visible; }
  .facts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin: var(--space-3) 0 var(--space-2); }
  .teachers { margin-block-end: var(--space-3) !important; }
  .nowrap { white-space: nowrap; }
  .others-empty { display: grid; margin-block-start: var(--space-4); padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .facts div { padding: var(--space-2); border-radius: var(--radius-control); background: var(--panel-raised); border: 1px solid var(--line); }
  dt { color: var(--muted); font-size: var(--t-xs); }
  dd { margin: 0; font-weight: 600; }
  dd small { display: block; color: var(--muted); font-weight: 400; font-size: var(--t-xs); }
  .star { color: var(--warn); }
  .others { display: grid; gap: var(--space-2); margin: var(--space-2) 0 0; padding: 0; list-style: none; }
  .others a { display: block; font-weight: 600; line-height: 1.45; text-decoration: none; }
  .others a:hover { text-decoration: underline; }
  .others .n { color: var(--muted); font-size: var(--t-xs); }
  .all { display: inline-flex; align-items: center; min-block-size: var(--target-min); font-weight: 600; }

  .replies { min-inline-size: 0; }
  .replies h2 { font-size: var(--t-lg) !important; }
  .replies ol { margin: var(--space-2) 0 0; padding: 0; list-style: none; }
  .replies li + li .reply { border-block-start: 1px solid var(--line); }
  .reply { padding-block: var(--space-3); }
  .reply .meta { margin-block-start: 0 !important; }
  .reply .content { margin-block-start: var(--space-1); }
  .reply .controls { margin-block-start: var(--space-2); }
  .empty { margin-block-start: var(--space-2) !important; padding: var(--space-4); border: 1px dashed var(--line); border-radius: var(--radius-panel); color: var(--muted); text-align: center; font-size: var(--t-base); }
  .reply-form, .login { margin-block-start: var(--space-4); padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); scroll-margin-block-start: 5rem; }
  .login { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }
  .login p { flex: 1 1 100%; color: var(--ink-2); }

  @media (max-width: 56rem) {
    .layout.with-aside { grid-template-columns: minmax(0, 1fr); }
    .with-aside .post, .with-aside .replies, .with-aside .course { grid-column: 1; grid-row: auto; position: static; }
  }
  @media (max-width: 56rem) {
    /* Phone card: course name, school and the link; the four numbers open on demand so the first
       reply follows the question. */
    .course { padding: var(--space-3) var(--space-4); }
    .facts { margin-block: var(--space-2) var(--space-1); }
    .teachers { margin-block-end: var(--space-2) !important; }
    .facts-box { margin-block-start: var(--space-2); }
    .facts-box > summary { display: flex; align-items: center; justify-content: space-between; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; cursor: pointer; pointer-events: auto; }
    .facts-box > summary span { position: static; inline-size: auto; block-size: auto; clip: auto; }
    .facts-box > summary::after { content: '▾'; color: var(--muted); }
    .facts-box[open] > summary::after { content: '▴'; }
    .facts-box::details-content { content-visibility: auto; }
    .facts-box:not([open])::details-content { content-visibility: hidden; }
    .course .cm-btn.block { inline-size: auto; min-inline-size: 10rem; margin-block-start: var(--space-2); }
    .others-box { margin-block-start: var(--space-3); padding-block-start: var(--space-2); }
    .others-box > summary { display: flex; align-items: center; justify-content: space-between; min-block-size: var(--target-min); cursor: pointer; pointer-events: auto; }
    .others-box > summary::after { content: '▾'; color: var(--muted); }
    .others-box[open] > summary::after { content: '▴'; }
    .others-box::details-content { content-visibility: auto; }
    .others-box:not([open])::details-content { content-visibility: hidden; }
  }
  @media (max-width: 40rem) {
    .crumbs { margin-block-end: var(--space-1); }
    .vote button { min-block-size: var(--target-min); }
    /* Six controls do not fit one 390 px row: the author group takes its own line, right-aligned. */
    .manage { flex-basis: 100%; justify-content: flex-end; margin-inline-start: 0; border: 0; padding: 0; background: transparent; }
    .manage .action { min-block-size: var(--target-min); border: 1px solid var(--line); background: var(--panel-raised); }
    .manage .panel[open] > .action { border: 0; background: transparent; }
    .submit-row .cm-btn { flex: 1 1 100%; }
    .submit-row .status:empty { display: none; }
    .submit-row .status { flex-basis: auto; }
  }
</style>
