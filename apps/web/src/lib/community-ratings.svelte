<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { authorName, averageScore, shortDate } from '$lib/community-format';
  import Stars from '$lib/community-stars.svelte';
  import { loginHref, profileHref } from '$lib/community-paths';
  import type { CommunityUser, MyRating, Rating, RatingStats } from '$lib/community-types';
  import type { SubmitFunction } from '@sveltejs/kit';

  interface RatingForm {
    action?: string;
    message?: string;
    review?: string;
    saved?: boolean;
    removed?: boolean;
  }

  let {
    ratings,
    user,
    form,
    courseCode,
    firstDiscussionHref
  }: {
    ratings: { stats: RatingStats; list: Rating[]; mine: MyRating | null } | undefined;
    user: CommunityUser | null;
    form: RatingForm | null | undefined;
    courseCode: string;
    firstDiscussionHref?: string;
  } = $props();

  /** Reviews shown before「查看全部」. */
  const initialReviews = 4;
  /** Fewer ratings than this are called out as too few to lean on. */
  const sparseBelow = 3;

  let count = $derived(ratings?.stats.count ?? 0);
  let largest = $derived(Math.max(1, ...(ratings?.stats.histogram ?? [])));
  let review = $derived(form?.action === 'rate' && form.review != null ? form.review : (ratings?.mine?.review ?? ''));
  let reviewLength = $state<number | undefined>();
  // The editor starts open when there is nothing to edit yet, or right after a submission.
  let editorOpen = $derived(!ratings?.mine || Boolean(form?.action));
  let rounded = $derived(ratings?.stats.average == null ? 0 : Math.round(ratings.stats.average));

  /** Keeps the typed review after saving; deleting asks first (without JavaScript it deletes directly). */
  const submit: SubmitFunction = ({ action, cancel }) => {
    if (action.search.includes('unrate') && !confirm('確定要刪除你對這門課的評價嗎？刪除後無法復原。')) {
      cancel();
      return;
    }
    return async ({ update }) => update({ reset: false });
  };
</script>

<section class="ratings" class:combined={firstDiscussionHref} id="ratings" aria-labelledby="ratings-title">
  <header class="head">
    <h2 id="ratings-title">{firstDiscussionHref ? '站內評價與討論' : '課程評價'}</h2>
    {#if !firstDiscussionHref}<p class="scope">以課號 <span class="mono">{courseCode}</span> 跨學期累計，不分班次。</p>{/if}
  </header>

  {#if !ratings}
    <p class="error" role="alert">評價暫時無法載入，請稍後再試。課程資料不受影響。</p>
  {:else}
    {#if firstDiscussionHref}
      <!-- Both empty: one sentence and two separate, full-size actions (rate, write), never two empty cards. -->
      <div class="first-actions">
        <p id="forum-title">還沒有同學在 UniCourse 評價或討論這門課<span class="counts">（0 則評價・0 篇討論）</span></p>
        <div class="first-buttons">
          {#if !user}<a class="cta-button" href={loginHref(`${page.url.pathname}#ratings`)}>登入後評分</a>{:else if !ratings.mine}<a class="cta-button" href="#rate-form">給這門課評分 ↓</a>{/if}
          <a class="cta-button" href={firstDiscussionHref}>發表第一篇文章</a>
        </div>
      </div>
    {:else}
      <!-- One or two ratings get the average and the count in one line, not a five-row histogram of zeros. -->
      <div class="summary" class:empty={count === 0} class:few={count > 0 && count < sparseBelow}>
        {#if count > 0}
          <p class="average">
            <strong class="num">{averageScore(ratings.stats.average)}</strong>
            <Stars score={rounded} decorative size="md" />
            <span class="count" class:sparse={count < sparseBelow}>{count < sparseBelow ? `僅 ${count} 則評價` : `${count} 則評價`}</span>
          </p>
        {/if}
        {#if count >= sparseBelow}
          <!-- Histogram from 5 stars down to 1 star, on one shared scale. -->
          <dl class="histogram" aria-label="評分分布">
            {#each [5, 4, 3, 2, 1] as score (score)}
              {@const n = ratings.stats.histogram[score - 1] ?? 0}
              <div class="bar-row">
                <dt>{score} 星</dt>
                <dd>
                  <span class="bar" aria-hidden="true"><span style:width="{(n / largest) * 100}%"></span></span>
                  <span class="num bar-count">{n}</span>
                </dd>
              </div>
            {/each}
          </dl>
        {:else if count === 0}
          <div class="first">
            <p class="lead">尚無評價</p>
            <p>還沒有人評價這門課。修過的話，給個 1–5 分、寫兩句上課方式或作業量，就能幫到下一位同學。</p>
            {#if !user}<p><a class="cta" href={loginHref(`${page.url.pathname}#ratings`)}>登入後成為第一個評分 →</a></p>{/if}
          </div>
        {/if}
      </div>
    {/if}
    {#if count > 0 && count < sparseBelow}
      <p class="sparse-note">評價還很少，平均分容易被單一意見左右，僅供參考。{#if user && !ratings.mine}修過這門課？<a href="#rate-form">加上你的評分 ↓</a>{:else if !user}修過這門課？<a href={loginHref(`${page.url.pathname}#ratings`)}>登入後加上你的評分</a>{/if}</p>
    {/if}

    {#if ratings.list.length}
      <ul class="list" class:collapsible={ratings.list.length > initialReviews} aria-label="同學評價">
        {#each ratings.list as rating, index (rating.username)}
          <li class:extra={index >= initialReviews}>
            <p class="who">
              <a href={profileHref(rating.username)}>{authorName(rating)}</a>
              <Stars score={rating.score} />
              <time class="when num" datetime={rating.updatedAt}>{shortDate(rating.updatedAt)}</time>
            </p>
            {#if rating.review}<p class="text">{rating.review}</p>{/if}
          </li>
        {/each}
      </ul>
      {#if ratings.list.length > initialReviews}
        <details class="more">
          <summary><span class="closed">查看全部 {ratings.list.length} 則評論 ▾</span><span class="opened">收合 ▴</span></summary>
        </details>
      {/if}
    {/if}

    {#if user}
      <details class="mine" id="rate-form" open={editorOpen}>
        <summary>
          {#if ratings.mine}
            <span>我的評價 <Stars score={ratings.mine.score} decorative /> {ratings.mine.score} 分</span><span class="edit">編輯評價<span class="caret" aria-hidden="true"></span></span>
          {:else}
            <span>我要評分</span><span class="edit"><span class="caret" aria-hidden="true"></span></span>
          {/if}
        </summary>
        <form method="POST" action="?/rate" class="rate" use:enhance={submit}>
          <fieldset>
            <legend>{ratings.mine ? '更新我的評分' : '我的評分'}</legend>
            <div class="scores">
              {#each [1, 2, 3, 4, 5] as score (score)}
                <label class="score">
                  <input type="radio" name="score" value={score} required defaultChecked={ratings.mine?.score === score} />
                  <span><b>{score} 分</b><i aria-hidden="true">{'★'.repeat(score)}</i></span>
                </label>
              {/each}
            </div>
          </fieldset>
          <label class="review">
            <span>評論（選填）</span>
            <textarea
              name="review"
              rows="3"
              maxlength="2000"
              placeholder="上課方式、作業量、給分……"
              defaultValue={review}
              oninput={(event) => (reviewLength = event.currentTarget.value.length)}
            ></textarea>
          </label>
          <p class="hint num">{reviewLength ?? review.length} / 2000 字</p>
          {#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
          {#if form?.saved}<p class="saved" role="status">已儲存你的評價。</p>{/if}
          {#if form?.removed}<p class="saved" role="status">已刪除你的評價。</p>{/if}
          <div class="actions">
            <button class="primary">{ratings.mine ? '更新評價' : '送出評價'}</button>
            {#if ratings.mine}
              <button class="danger" formaction="?/unrate" formnovalidate>刪除我的評價</button>
            {/if}
          </div>
        </form>
      </details>
    {:else if count >= sparseBelow}
      <!-- With no or few ratings the summary above already carries the one sign-in link. -->
      <p class="login"><a href={loginHref(`${page.url.pathname}#ratings`)}>登入</a>後即可評分與撰寫評論。</p>
    {/if}
  {/if}
</section>

<style>
  .ratings { display: grid; align-content: start; gap: var(--space-4); min-inline-size: 0; padding: var(--space-4) var(--space-5); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); color: var(--ink); font: var(--t-md) / var(--leading-body) var(--font-sans); }
  /* Both sections empty: heading and sentence on the left, two actions on the right (stacked on phones). */
  .ratings.combined { grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-1) var(--space-4); align-items: center; padding-block: var(--space-3); }
  .ratings.combined > .head { grid-column: 1; }
  .ratings.combined > .first-actions { display: contents; }
  .ratings.combined > :not(.head, .first-actions) { grid-column: 1 / -1; }
  .first-actions > p { scroll-margin-block-start: 7.5rem; grid-column: 1; color: var(--ink-2); font-size: var(--t-base); }
  .first-actions .counts { color: var(--muted); }
  .first-buttons { grid-column: 2; grid-row: 1 / span 2; display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .cta-button { display: inline-flex; align-items: center; justify-content: center; min-block-size: var(--target-min); padding: 0 var(--space-4); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink) !important; font-size: var(--t-base); font-weight: 650; text-decoration: none; white-space: nowrap; }
  .cta-button:hover { background: var(--hover-row); }
  .ratings :is(h2, p) { margin: 0; }
  .ratings a { color: var(--brand-ink); text-underline-offset: 0.15em; }
  .ratings :is(a, button, input, textarea, summary):focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .num, .mono { font-variant-numeric: tabular-nums; }
  .mono { font-family: var(--font-mono); font-size: max(0.95em, 0.8125rem); }
  h2 { font-size: var(--t-xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); }
  .scope { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: 0.8125rem; overflow-wrap: anywhere; }

  .summary { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-5); align-items: center; max-inline-size: 34rem; }
  .average { display: grid; justify-items: start; gap: 0.125rem; }
  .average strong { font-size: 2.25rem; font-weight: 650; line-height: 1.05; }
  .average .count { color: var(--muted); font-size: 0.8125rem; }
  .histogram { display: grid; gap: 0.3rem; margin: 0; }
  .bar-row { display: grid; grid-template-columns: 2.25rem minmax(0, 1fr); gap: var(--space-2); align-items: center; font-size: 0.8125rem; }
  .bar-row dt { color: var(--muted); }
  .bar-row dd { display: grid; grid-template-columns: minmax(0, 1fr) 2.25rem; gap: var(--space-2); align-items: center; margin: 0; }
  .bar { display: block; block-size: 10px; border-radius: var(--radius-pill); background: var(--chip); overflow: hidden; }
  .bar span { display: block; block-size: 100%; border-radius: inherit; background: var(--brand); }
  .bar-count { color: var(--ink-2); text-align: end; }
  .summary.empty { grid-template-columns: minmax(0, 1fr); }
  .average .count.sparse { color: var(--ink); font-weight: 600; }
  .summary.few { grid-template-columns: minmax(0, 1fr); }
  .summary.few .average { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); align-items: baseline; }
  .first { display: grid; gap: var(--space-1); color: var(--ink-2); font-size: var(--t-base); }
  .first .lead { color: var(--ink); font-size: var(--t-lg); font-weight: 650; }
  .first .cta { font-weight: 650; }
  .sparse-note { margin-block-start: calc(-1 * var(--space-2)) !important; padding: var(--space-2) var(--space-3); border-inline-start: 3px solid var(--warn); background: var(--warn-wash); color: var(--ink); font-size: 0.8125rem; }
  .sparse-note a { margin-inline-start: var(--space-1); font-weight: 650; }

  .list { display: grid; margin: 0; padding: 0; list-style: none; border-block-start: 1px solid var(--line); }
  .list li { padding-block: var(--space-3); border-block-end: 1px solid var(--line); }
  .list.collapsible:not(:has(+ .more[open])) li.extra { display: none; }
  /* A 44 px tall target that does not change the line height. */
  .who a { padding-block: 0.75rem; margin-block: -0.75rem; }
  .who { display: flex; flex-wrap: wrap; gap: 0.125rem var(--space-3); align-items: baseline; font-size: var(--t-base); }
  .who a { font-weight: 650; overflow-wrap: anywhere; }
  .when { margin-inline-start: auto; color: var(--muted); font-size: 0.8125rem; }
  .text { margin-block-start: var(--space-1) !important; color: var(--ink-2); font-size: var(--t-base); white-space: pre-wrap; overflow-wrap: anywhere; }
  .more summary { display: flex; align-items: center; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .more summary::-webkit-details-marker, .mine summary::-webkit-details-marker { display: none; }
  .more[open] .closed, .more:not([open]) .opened { display: none; }
  .list + .more { margin-block-start: calc(-1 * var(--space-3)); }

  .mine { border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel-raised); }
  .mine summary { display: flex; gap: var(--space-3); align-items: center; justify-content: space-between; min-block-size: var(--target-min); padding-inline: var(--space-3); font-size: var(--t-base); font-weight: 650; list-style: none; cursor: pointer; }
  /* One control: 「編輯評價 ▾」 reads as a single button-like label on the right. */
  .mine .edit { display: inline-flex; gap: 0.3em; align-items: center; margin-inline-start: auto; color: var(--brand-ink); font-weight: 600; white-space: nowrap; }
  .mine .caret::before { content: '▾'; }
  .mine[open] .caret::before { content: '▴'; }
  .mine summary:hover .edit { text-decoration: underline; text-underline-offset: 0.15em; }
  .rate { display: grid; gap: var(--space-3); padding: var(--space-1) var(--space-3) var(--space-3); }
  fieldset { min-inline-size: 0; margin: 0; padding: 0; border: 0; }
  legend { padding: 0; color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; }
  .scores { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-1); margin-block-start: var(--space-1); }
  .score { position: relative; }
  .score input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
  .score > span { display: grid; place-items: center; gap: 0; min-block-size: 3rem; padding-block: 0.25rem; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); line-height: 1.2; }
  .score b { font-size: var(--t-base); font-weight: 650; }
  .score i { color: var(--warn); font-size: 0.8125rem; font-style: normal; letter-spacing: 0.02em; }
  .score input:hover + span { background: var(--hover-row); }
  .score input:checked + span { border-color: var(--brand); background: var(--brand); color: var(--on-brand); }
  .score input:checked + span i { color: var(--on-brand); }
  .score input:focus-visible + span { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .review { display: grid; gap: var(--space-1); color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; }
  textarea { inline-size: 100%; min-block-size: 5.5rem; padding: 0.5rem 0.75rem; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--bg); color: var(--ink); font: 400 1rem / 1.6 var(--font-sans); resize: vertical; }
  textarea::placeholder { color: var(--muted); }
  .hint { margin-block-start: calc(-1 * var(--space-2)) !important; color: var(--muted); font-size: 0.8125rem; text-align: end; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: center; }
  button { min-block-size: var(--target-min); font: inherit; font-size: var(--t-base); font-weight: 650; cursor: pointer; touch-action: manipulation; }
  .primary { padding: 0 var(--space-5); border: 1px solid var(--brand); border-radius: var(--radius-control); background: var(--brand); color: var(--on-brand); }
  .primary:hover { background: var(--brand-ink); border-color: var(--brand-ink); }
  .danger { margin-inline-start: auto; padding: 0 var(--space-2); border: 0; background: transparent; color: var(--down); text-decoration: underline; text-underline-offset: 0.15em; }
  .login { padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); color: var(--ink-2); font-size: var(--t-base); }
  .login a { font-weight: 650; }
  .error { padding: var(--space-2) var(--space-3); border: 1px solid var(--down); border-radius: var(--radius-control); background: color-mix(in srgb, var(--down) var(--status-tint), var(--panel-raised)); color: var(--ink); font-size: var(--t-base); }
  .saved { padding: var(--space-2) var(--space-3); border: 1px solid var(--up); border-radius: var(--radius-control); background: color-mix(in srgb, var(--up) var(--status-tint), var(--panel-raised)); color: var(--ink); font-size: var(--t-base); }

  @media (max-width: 40rem) {
    .ratings { padding: var(--space-4); }
    .ratings.combined { grid-template-columns: minmax(0, 1fr); }
    .first-buttons { grid-column: 1; grid-row: auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); margin-block-start: var(--space-2); }
    .summary { gap: var(--space-4); }
    .average strong { font-size: 2rem; }
  }
</style>
