<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { onMount, tick } from 'svelte';
  import '$lib/community-ui.css';
  import { authorName, dateTime, postTypeLabels, scoreSign, signed } from '$lib/community-format';
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
  let replyText = $derived(replyDraft);
  let replyLength = $derived([...replyText].length);
  let replyEmpty = $derived(!replyText.trim());
  let pendingVotes = $state<number[]>([]);
  let replying = $state(false);
  let announcement = $state('');
  let hydrated = $state(false);
  onMount(() => (hydrated = true));

  // Replies read oldest first; long threads can flip to newest first (a plain link, so it works without JS).
  const SORT_TOGGLE_AT = 5;
  let newestFirst = $derived(page.url.searchParams.get('sort') === 'newest');
  let replies = $derived(newestFirst ? [...post.replies].reverse() : post.replies);
  const sortHref = (sort: 'oldest' | 'newest') => `${here}${sort === 'newest' ? '?sort=newest' : ''}#replies-title`;

  const fmt = new Intl.NumberFormat('zh-TW');
  let summary = $derived(course?.summary ?? null);
  let rating = $derived(course?.rating && course.rating.count > 0 ? course.rating : null);
  let signedOutHref = $derived(loginHref(`${here}${page.url.search}`));
  let replyLoginHref = $derived(loginHref(`${here}${page.url.search}#reply-form`));
  let registerHref = $derived(loginHref(`${here}${page.url.search}#reply-form`, 'register'));
  const replyPrompts = {
    question: '分享你的經驗，或直接回答作者的問題。',
    article: '回應作者的邀請，或分享你的經驗與建議。',
    announcement: '對公告內容有疑問嗎？可以在這裡提問。'
  };
  let replyLabel = $derived(post.replies.length ? '寫回覆' : '寫第一則回覆');
  let replyPrompt = $derived(post.type === 'reply' ? undefined : replyPrompts[post.type]);

  /** The box grows with the text (JavaScript only), so a long answer never scrolls inside a 3-row frame. */
  function autogrow(box: HTMLTextAreaElement) {
    box.style.blockSize = 'auto';
    box.style.blockSize = `${box.scrollHeight + 2}px`;
  }

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
        replyText = '';
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
  {@const pending = pendingVotes.includes(item.id)}
  {@const isReply = kind === '回覆'}
  {#snippet tally()}
    <span class="tally">
      {#if isReply}<span class="label">此回覆</span>{/if}
      <span class="cm-score" data-sign={scoreSign(item.score)} aria-label="{kind}分數" aria-live={user ? 'polite' : undefined}>{signed(item.score)}</span>
      <span class="label">分</span>
    </span>
  {/snippet}
  <div class="controls">
    {#if user}
      <form method="POST" action="?/vote" class="vote" aria-label={isReply ? `投票：${authorName(item.author)} 的回覆` : '本文投票'} use:enhance={voting(item.id)} aria-busy={pending}>
        <input type="hidden" name="target" value={item.id} />
        <button name="value" value={item.myVote === 1 ? 0 : 1} aria-pressed={item.myVote === 1} aria-label={isReply ? '推這則回覆' : '推這篇文章'} disabled={pending}>
          <span aria-hidden="true">▲</span><span>推</span>
        </button>
        {@render tally()}
        <button name="value" value={item.myVote === -1 ? 0 : -1} aria-pressed={item.myVote === -1} aria-label={isReply ? '噓這則回覆' : '噓這篇文章'} disabled={pending}>
          <span aria-hidden="true">▼</span><span>噓</span>
        </button>
      </form>
      {#if !isReply}
        <a class="action reply-link" href="#reply-content">{replyLabel} <span aria-hidden="true">↓</span></a>
      {/if}
    {:else}
      {@render tally()}
      <a class="action reply-link" href={signedOutHref}>{isReply ? '登入後可投票' : '登入後可推噓與回覆'} <span aria-hidden="true">→</span></a>
    {/if}
  </div>
  {#if messageFor(item.id)}<p class="cm-alert" role="alert">{messageFor(item.id)}</p>{/if}
{/snippet}

{#snippet manage(item: Item, kind: '文章' | '回覆')}
  {@const isAuthor = user?.username === item.author.username}
  {#if isAuthor || user?.isAdmin}
    <!-- Author tools expand beside the author or inline when a form is open. -->
    <details class="more" open={form?.action === 'edit' && form.target === item.id && 'message' in form}>
      <summary class="more-btn" title={isAuthor ? `編輯或刪除這則${kind}` : '管理員選項'}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
        <span class="more-label">{isAuthor ? `管理${kind}` : '管理員'}</span><span class="more-caret" aria-hidden="true">▾</span>
      </summary>
      <div class="manage" role="group" aria-label="這則{kind}的管理選項">
      <p class="manage-note">{isAuthor ? '只有你看得到這些選項。作者可編輯，作者與管理員可刪除。' : '僅管理員可使用此選項。'}</p>
      <!-- Re-created after each save so the panels close again. -->
      {#key `${item.updatedAt}|${item.title}|${item.content}`}
        {#if isAuthor}
          {@const draft = editDraft(item)}
          <details class="panel" open={form?.action === 'edit' && form.target === item.id && 'message' in form}>
            <summary class="action">編輯<span class="cm-sr">這則{kind}</span></summary>
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
          <summary class="action delete">刪除<span class="cm-sr">這則{kind}</span></summary>
          <form method="POST" action="?/delete" class="confirm" use:enhance>
            <input type="hidden" name="target" value={item.id} />
            <p>{kind === '文章' ? '刪除後整串討論（含所有回覆）都會隱藏，無法復原。' : '刪除這則回覆後無法復原。'}</p>
            <button class="cm-btn danger">確定刪除</button>
          </form>
        </details>
      {/key}
      </div>
    </details>
  {/if}
{/snippet}

{#snippet byline(item: Item, kind: '文章' | '回覆')}
  <div class="meta">
    <span class="person">
      <a class="author" href={profileHref(item.author.username)}>{authorName(item.author)}</a>
      {#if kind === '回覆' && item.author.username === post.author.username}<span class="op">原 PO</span>{/if}
      {#if item.author.displayName}<span class="handle">@{item.author.username}</span>{/if}
    </span>
    {@render manage(item, kind)}
    <span class="timestamp">
      <time class="num" datetime={item.createdAt}>{dateTime(item.createdAt)}</time>
      {#if edited(item)}<span class="sep" aria-hidden="true">·</span><span title="最後編輯 {dateTime(item.updatedAt)}">已編輯</span>{/if}
    </span>
  </div>
{/snippet}

<div class="cm thread-page">
  <!-- The last crumb opens the course page when an offering is available. -->
  <nav class="crumbs" aria-label="麵包屑">
    <a href="/forum">論壇</a>
    {#if post.school}
      <span class="sep" aria-hidden="true">/</span>
      <a href={forumHref({ school: post.school })}>{schoolName}</a>
      {#if post.courseCode}
        <span class="sep" aria-hidden="true">/</span>
        {#if course?.summary}
          <a href="/courses/{course.summary.id}" title="{course.summary.title} 課程頁">{course.summary.title}</a>
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
      {@render byline(post, '文章')}
      <!-- User text is plain text: escaped by Svelte, line breaks preserved. -->
      <div class="content">{#each paragraphs(post.content) as paragraph, index (index)}<p>{paragraph}</p>{/each}</div>
      {@render controls(post, '文章')}
    </article>

    {#if course}
      <aside class="course" aria-label="這門課">
        {#if summary}
          <h2 class="eyebrow course-heading">這門課</h2>
          <p class="course-title">
            <a href="/courses/{summary.id}">{summary.title}<span class="history-link" aria-hidden="true"> 看歷年資料 <span aria-hidden="true">→</span></span></a>
            <span class="mono code">{summary.courseCode}</span>
            {#if summary.isDemo}<Badge label="示範" tone="demo" />{/if}
          </p>
        {/if}
        {#if summary}
          <p class="sub teachers">
            <span class="num">{summary.latestTerm} · {summary.partial ? '僅收錄' : '收錄'} {summary.latestSections} 班</span>
            {#if summary.instructors.length} · {summary.instructors.join('、')}{#if summary.instructorCount > summary.instructors.length}<span class="nowrap"> 等 {summary.instructorCount} 位</span>{/if}{/if}
          </p>
        {/if}
        <details class="course-details">
          <summary>查看收錄資訊與討論 <span class="inline-n">（另有 {course.otherCount} 篇）</span></summary>
          {#if summary}
            <p class="sub course-school">{[summary.schoolName, summary.department].filter(Boolean).join(' · ')}</p>
            <dl class="facts">
              <div>
                <dt>收錄學期</dt>
                <dd class="num">{summary.terms} 個學期{#if summary.terms > 1}<small>{summary.firstTerm}–{summary.latestTerm}</small>{/if}</dd>
              </div>
              <div>
                <dt>歷史修課／名額</dt>
                <dd class="num">
                  <span class="nowrap">{#if summary.latestEnrolled != null}{fmt.format(summary.latestEnrolled)}{:else}<span title="校方未公布修課人數">—</span>{/if}
                  / {#if summary.latestCapacity != null}{fmt.format(summary.latestCapacity)}{:else}<span title="校方未公布名額">—</span>{/if}</span>
                </dd>
              </div>
              <div>
                <dt>同學評價</dt>
                <dd class="num">
                  {#if rating}<span class="star" aria-hidden="true">★</span> {rating.average?.toFixed(1)}<span class="inline-n">（{rating.count} 則）</span>{:else}尚無評價{/if}
                </dd>
              </div>
            </dl>
          {:else}
            <p class="sub">
              {schoolName} <span class="mono">{post.courseCode}</span> 不在目前收錄的課程中。
              <a href={courseSearchHref(post.school ?? '', post.courseCode ?? '')}>搜尋這個課號</a>
            </p>
          {/if}
          {#if course.otherCount === 0}
            {@const another = `${forumHref({ school: post.school ?? '', courseCode: post.courseCode ?? '' })}&compose=1`}
            <div class="others-empty">
              <p class="sub none">這門課目前只有這一篇討論。</p>
              <a class="new-post" href={user ? another : loginHref(another)}><span aria-hidden="true">＋</span> 新增這門課的討論</a>
            </div>
          {:else}
            <div class="others-box">
              <h3 class="eyebrow others-title">其他討論（{course.otherCount}）</h3>
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
            </div>
          {/if}
        </details>
      </aside>
    {/if}

    <section class="replies" aria-labelledby="replies-title">
      <div class="replies-head">
        <h2 id="replies-title">{post.replies.length ? `回覆（${post.replies.length}）` : '還沒有回覆'}</h2>
        {#if post.replies.length >= SORT_TOGGLE_AT}
          <nav class="sort" aria-label="回覆排序">
            <a href={sortHref('oldest')} aria-current={newestFirst ? undefined : 'true'}>最早</a>
            <a href={sortHref('newest')} aria-current={newestFirst ? 'true' : undefined}>最新</a>
          </nav>
        {/if}
      </div>
      {#if post.replies.length > 0}
        <ol>
          {#each replies as reply (reply.id)}
            <li id="reply-{reply.id}">
              <article class="reply" aria-label="{authorName(reply.author)} 的回覆">
                {@render byline(reply, '回覆')}
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
            <div class="cm-label"><label for="reply-content">{replyLabel}</label><span class="cm-hint">以 {user.displayName || `@${user.username}`} 的身分</span></div>
            <textarea id="reply-content" class="cm-input" name="content" required rows="2" maxlength="20000" defaultValue={replyDraft}
              placeholder={post.replies.length ? replyPrompt : '在此輸入你的回覆'} aria-describedby={!post.replies.length && replyPrompt ? 'reply-guide reply-status' : 'reply-status'}
              oninput={(event) => { replyText = event.currentTarget.value; autogrow(event.currentTarget); }}></textarea>
          </div>
          {#if form?.action === 'reply' && 'message' in form}<p class="cm-alert" role="alert">{form.message}</p>{/if}
          <!-- Under the box: the condition / status on the left, the count on the right, then the button. -->
          <div class="row submit-row">
            <p class="status" id="reply-status" role="status">
              {#if announcement}<span class="ok"><span aria-hidden="true">✓</span> {announcement}</span>
              {:else if replying}<span class="hint">送出中，請稍候…</span>
              {:else}<span class="hint">{hydrated && replyEmpty ? '輸入內容後才能送出' : '純文字，保留換行'}</span>{/if}
            </p>
            <span class="cm-count" aria-live="polite">{fmt.format(replyLength)} / 20,000 字</span>
            {#if !post.replies.length && replyPrompt}<p class="reply-guide" id="reply-guide">{replyPrompt}</p>{/if}
            <!-- Without JavaScript the button is always live; with it, an empty box cannot be sent. -->
            <button class="cm-btn send" aria-busy={replying} aria-disabled={hydrated && replyEmpty || undefined} disabled={replying || (hydrated && replyEmpty)}>{replying ? '送出中…' : '送出回覆'}</button>
          </div>
        </form>
      {:else}
        <div class="login" id="reply-form" tabindex="-1">
          <h3>參與討論</h3>
          <div class="login-actions">
            <a class="cm-btn" href={replyLoginHref}>登入並回到這篇討論</a>
            <a class="cm-btn secondary" href={registerHref}>建立帳號並返回</a>
          </div>
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .thread-page .sep { margin-inline: 0.4em; color: var(--axis); }
  .crumbs { display: flex; flex-wrap: wrap; align-items: center; margin-block-end: var(--space-3); color: var(--muted); font-size: var(--t-base); }
  .crumbs a { display: inline-flex; align-items: center; justify-content: center; min-inline-size: var(--target-min); min-block-size: var(--target-min); color: var(--brand-ink); font-weight: 600; text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--brand-ink) 45%, transparent); }
  .crumbs a:hover { text-decoration-color: currentColor; }

  .layout { display: grid; row-gap: var(--space-6); grid-template-columns: minmax(0, 1fr); }
  .layout.with-aside { grid-template-columns: minmax(0, 1fr) 18.5rem; column-gap: var(--space-8); }
  .with-aside .post { grid-column: 1; grid-row: 1; }
  .with-aside .replies { grid-column: 1; grid-row: 2; }
  .with-aside .course { grid-column: 2; grid-row: 1 / span 2; align-self: start; position: sticky; inset-block-start: 5rem; }

  .post { min-inline-size: 0; padding-block-end: var(--space-3); border-block-end: 1px solid var(--line); }
  .kicker { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: center; font-size: var(--t-sm); }
  .kicker a { display: inline-flex; align-items: center; justify-content: center; padding-inline: var(--space-2); border-radius: var(--radius-control); color: var(--ink-2); background: var(--chip); text-decoration: none; font-weight: 600; }
  .kicker a:hover { color: var(--brand-ink); text-decoration: underline; }
  h1 { margin-block-start: var(--space-2) !important; font-size: clamp(1.375rem, 3.5vw, 1.625rem) !important; }
  .meta { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; margin-block-start: var(--space-1); color: var(--muted); font-size: 0.8125rem; line-height: 1.5; }
  .person { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; min-inline-size: 0; }
  .meta .author { color: var(--ink); font-size: var(--t-md); font-weight: 650; text-decoration: underline; text-decoration-color: var(--control-line); }
  .meta .author:hover { color: var(--brand-ink); text-decoration-color: currentColor; }
  .timestamp { color: var(--ink-2); }
  .op { padding: 0 6px; border-radius: var(--radius-pill); color: var(--brand-ink); background: var(--brand-wash); font-weight: 600; }
  .thread-page :is(.mono, .kicker, .kicker .cm-type, .manage-note, .eyebrow, .inline-n, .facts dt, .facts small, .others .n, .cm-hint, .cm-count, .sort) {
    font-size: max(0.8125rem, var(--t-sm));
  }
  .content {
    max-inline-size: 52ic;
    margin-block-start: var(--space-3);
    font-size: var(--t-md);
    line-height: var(--leading-prose);
    overflow-wrap: anywhere;
  }
  .content p { margin: 0; white-space: pre-wrap; }
  .content p + p { margin-block-start: 0.75em; }

  .controls { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: center; margin-block-start: var(--space-3); }
  .more { position: relative; display: inline-flex; align-items: center; }
  .more > summary { list-style: none; }
  .more > summary::-webkit-details-marker { display: none; }
  .more-btn {
    display: inline-flex;
    gap: 0.3em;
    align-items: center;
    min-block-size: var(--target-min);
    padding: 0 var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    color: var(--ink-2);
    background: var(--panel-raised);
    font-size: var(--t-base);
    font-weight: 600;
    cursor: pointer;
  }
  .more-caret { color: var(--muted); }
  .more[open] .more-caret { rotate: 180deg; }
  .more-btn:hover, .more[open] > .more-btn { color: var(--brand-ink); border-color: var(--brand); background: var(--brand-wash); }
  /* No content-visibility here: its paint containment would clip the dropdown to a zero-size box. */
  .more:not([open])::details-content { display: none; }
  .manage { position: absolute; inset-block-start: calc(100% + 4px); inset-inline-end: 0; z-index: 5; display: grid; gap: 0; min-inline-size: 14rem; max-inline-size: min(20rem, 88vw); padding: var(--space-1); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); box-shadow: 0 8px 20px color-mix(in srgb, var(--ink) 18%, transparent); }
  .manage-note { padding: var(--space-2) var(--space-3); color: var(--muted); font-size: var(--t-sm); }
  .manage .action { min-block-size: var(--target-min); padding-inline: var(--space-3); color: var(--ink) !important; }
  .more:has(.panel[open]) .manage { max-inline-size: none; position: static; inline-size: 100%; border: 0; padding: 0; background: transparent; box-shadow: none; }
  .more:has(.panel[open]) > .more-btn { display: none; }
  .more:has(.panel[open]) { display: block; }
  .vote { display: inline-flex; gap: var(--space-2); align-items: center; }
  .tally { display: inline-flex; gap: 0.3em; align-items: baseline; }
  .tally .label { color: var(--muted); font-size: 0.8125rem; font-weight: 600; }
  .tally .cm-score { font-size: var(--t-lg); font-weight: 650; }
  .tally .cm-score[data-sign='zero'] { color: var(--ink-2); }
  .vote button {
    display: inline-flex;
    gap: 0.25em;
    align-items: center;
    justify-content: center;
    min-block-size: var(--target-min);
    min-inline-size: 3.5rem;
    padding: 0 var(--space-3);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-pill);
    color: var(--ink-2);
    background: var(--panel-raised);
    font: 600 var(--t-base) / 1 var(--font-sans);
    cursor: pointer;
    touch-action: manipulation;
  }
  .vote button:hover { color: var(--brand-ink); border-color: var(--brand); background: var(--brand-wash); }
  /* A cast vote is solid and ticked, so it reads as 'on' without relying on a pale tint. */
  .vote button[aria-pressed='true'] { color: var(--on-brand); border-color: var(--brand); background: var(--brand); }
  .vote button[aria-pressed='true']::after { content: '✓' / ''; font-size: 0.85em; }
  .vote button[aria-pressed='true']:last-of-type { color: var(--down); border-color: var(--down); background: color-mix(in srgb, var(--down) var(--status-tint), var(--panel-raised)); }
  .vote button:disabled { cursor: progress; }

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
  .reply-link { color: var(--brand-ink) !important; gap: 0.3em; }
  /* Delete is the one destructive tool, so it carries the danger colour even before it is opened. */
  .action.delete { color: var(--down) !important; }
  .danger > .action:hover, .danger > .action:focus-visible { color: var(--down) !important; background: color-mix(in srgb, var(--down) var(--status-tint), var(--panel-raised)); }
  /* An open panel takes the full row right under the byline; the other tool follows it as a line. */
  .more:has(.panel[open]) { flex-basis: 100%; order: 10; margin: var(--space-2) 0 0; }
  .manage:has(.panel[open]) { display: grid; }
  .panel[open] { padding: var(--space-3) var(--space-4) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .panel[open] > .action { margin-inline-start: calc(-1 * var(--space-2)); color: var(--ink) !important; }
  .panel.danger[open] > .action { color: var(--down) !important; }
  .panel.danger[open] { border-color: color-mix(in srgb, var(--down) 45%, var(--line)); }
  .manage:has(.panel[open]) > .panel:not([open]) > .action { justify-self: start; }
  .confirm { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }
  .confirm p { flex: 1 1 16rem; color: var(--ink-2); font-size: var(--t-base); }
  .row { display: flex; gap: var(--space-2); }
  .submit-row { flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
  .submit-row .status { flex: 1 1 auto; margin: 0 !important; font-size: var(--t-base); }
  .submit-row .ok { color: var(--up); font-weight: 600; }
  .submit-row .hint, .submit-row .cm-count, .reply-guide { color: var(--ink-2); font-size: 0.8125rem; }
  .reply-guide { order: 1; flex-basis: 100%; }
  .reply-form textarea {
    scroll-margin-block-start: 8.5rem;
    border-color: color-mix(in srgb, var(--ink-2) 65%, var(--control-line));
  }
  .reply-form textarea::placeholder { color: var(--muted); opacity: 1; }
  .login-actions { display: flex; flex-wrap: wrap; width: 100%; gap: var(--space-2); align-items: center; }

  .course {
    position: relative;
    min-inline-size: 0;
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel);
    font-size: var(--t-base);
  }
  .eyebrow { color: var(--ink-2) !important; font-size: max(0.8125rem, var(--t-sm)) !important; font-weight: 600 !important; letter-spacing: 0 !important; }
  .history-link { display: none; }
  .course-details > summary {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: var(--target-min);
    color: var(--ink-2);
    font-size: var(--t-base);
    font-weight: 600;
    list-style: none;
    cursor: pointer;
  }
  .course-details > summary::-webkit-details-marker { display: none; }
  .course-details > summary::after { content: '▾' / ''; }
  .course-details[open] > summary::after { content: '▴' / ''; }
  @media (min-width: 56.001rem) {
    @supports selector(::details-content) {
      .course-details > summary { display: none; }
      .course-details::details-content { display: contents; content-visibility: visible; }
    }
  }
  .inline-n { color: var(--muted); font-weight: 400; font-size: var(--t-sm); }
  .course-title { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: baseline; margin-block-start: var(--space-2) !important; }
  .course-title a { font-size: var(--t-lg); font-weight: 650; }
  .code { color: var(--muted); }
  .sub { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: 0.8125rem; }
  .others-box { margin-block-start: var(--space-3); padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .others-title { margin: 0; }
  .new-post { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); font-weight: 600; text-decoration: none; }
  .new-post:hover { text-decoration: underline; }
  /* Four facts as compact rows (label left, value right) rather than four tiles with one number each. */
  .facts { display: grid; margin: var(--space-2) 0; border-block-start: 1px solid var(--line); }
  .facts > div { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: baseline; justify-content: space-between; padding-block: var(--space-2); border-block-end: 1px solid var(--line); }
  .facts dt { color: var(--muted); font-size: var(--t-sm); }
  .facts dd { margin: 0; font-weight: 600; text-align: end; }
  .facts dd small { display: block; color: var(--muted); font-weight: 400; font-size: var(--t-sm); }
  .teachers { margin-block-end: var(--space-2) !important; }
  .nowrap { white-space: nowrap; }
  .others-empty { display: grid; margin-block-start: var(--space-3); padding-block-start: var(--space-2); border-block-start: 1px solid var(--line); }
  .star { color: var(--warn); }
  .others { display: grid; gap: var(--space-1); margin: var(--space-2) 0 0; padding: 0; list-style: none; }
  .others a { display: block; font-weight: 600; line-height: 1.45; text-decoration: none; }
  .others a:hover { text-decoration: underline; }
  .others .n { color: var(--muted); font-size: var(--t-sm); }
  .all { display: inline-flex; align-items: center; min-block-size: var(--target-min); font-weight: 600; }

  .replies { min-inline-size: 0; }
  .replies-head { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: baseline; justify-content: space-between; }
  .replies h2 { font-size: var(--t-xl) !important; }
  .sort { display: inline-flex; gap: 2px; padding: 2px; border-radius: var(--radius-pill); background: var(--chip); font-size: var(--t-sm); }
  .sort a { display: inline-flex; align-items: center; min-block-size: var(--target-min); padding: 0 var(--space-3); border-radius: var(--radius-pill); color: var(--ink-2); font-weight: 600; text-decoration: none; }
  .sort a[aria-current='true'] { color: var(--ink); background: var(--panel-raised); box-shadow: inset 0 0 0 1px var(--line); }
  .replies ol { margin: var(--space-2) 0 0; padding: 0; list-style: none; }
  /* Each reply hangs off a left rule, so its votes and tools visibly belong to it, not to the post above. */
  .replies li + li { margin-block-start: var(--space-3); }
  .reply { padding: var(--space-1) 0 var(--space-1) var(--space-4); border-inline-start: 2px solid var(--line); }
  .reply .meta { gap: 0 var(--space-2); margin-block-start: 0 !important; }
  .reply .content { margin-block-start: var(--space-1); }
  .reply .controls { margin-block-start: var(--space-2); }
  .reply-form, .login { scroll-margin-block-start: 7rem; margin-block-start: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .reply-form .cm-label { justify-content: flex-start; gap: 0 var(--space-3); }
  .reply-form .cm-hint { color: var(--ink-2); }
  .login { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }
  .login h3 { flex-basis: 100%; }

  @media (max-width: 56rem) {
    .layout.with-aside { grid-template-columns: minmax(0, 1fr); }
    .with-aside :is(.post, .replies, .course) { grid-column: 1; grid-row: auto; position: static; }
    .course-heading, .course-title .code { display: none !important; }
    .course { padding-block: 0; }
    .course-title { margin-block-start: 0 !important; }
    .course-title a { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 0 var(--space-2); min-block-size: var(--target-min); }
    .history-link { display: inline; font-size: 0.8125rem; font-weight: 600; }
    .course-details[open] { padding-block-end: var(--space-3); }
    .teachers + .course-details { border-block-start: 1px solid var(--line); }
    .others li a { display: flex; align-items: center; min-block-size: var(--target-min); }
  }
  @media (max-width: 40rem) {
    .layout { row-gap: var(--space-3); }
    .crumbs { margin-block-end: 0; }
    .kicker a, .author { min-inline-size: var(--target-min); min-block-size: var(--target-min); }
    .author { display: inline-flex; align-items: center; }
    .author, .more-btn { margin-block: -0.375rem; }
    .kicker a { background: transparent; }
    .kicker a:hover { background: var(--chip); }
    h1 { margin-block-start: 0 !important; }
    .meta { gap: 0 var(--space-2); }
    .meta { position: relative; }
    .more { position: static; }
    .manage { inset-inline: 0 auto; max-inline-size: 100%; }
    .timestamp { flex-basis: 100%; }
    .content { margin-block-start: var(--space-2); }
    .content p + p { margin-block-start: 0.5em; }
    .controls, .reply .controls { margin-block-start: var(--space-1); }
    .reply { padding-inline-start: var(--space-3); }
    .submit-row { gap: var(--space-1) var(--space-2); }
    .submit-row .status:empty { display: none; }
    .submit-row .send { order: 2; flex-basis: 100%; }
    .login, .reply-form { padding: var(--space-3); }
    .login-actions .cm-btn { padding-inline: var(--space-2); }
  }
</style>
