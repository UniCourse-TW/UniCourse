<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { authorName, averageScore, postedAt, stars } from '$lib/community-format';
  import { loginHref, profileHref } from '$lib/community-paths';
  import type { CommunityUser, MyRating, Rating, RatingStats } from '$lib/community-types';

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
    courseCode
  }: {
    ratings: { stats: RatingStats; list: Rating[]; mine: MyRating | null } | undefined;
    user: CommunityUser | null;
    form: RatingForm | null | undefined;
    courseCode: string;
  } = $props();

  let largest = $derived(Math.max(1, ...(ratings?.stats.histogram ?? [])));
  let review = $derived(form?.action === 'rate' && form.review != null ? form.review : (ratings?.mine?.review ?? ''));
  let reviewLength = $state<number | undefined>();
  const keepValues = () => async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) =>
    update({ reset: false });
</script>

<section class="ratings" id="ratings" aria-labelledby="ratings-title">
  <h2 id="ratings-title">課程評價</h2>
  <p class="scope">評價以課號 {courseCode} 跨學期累計，不分班次。</p>

  {#if !ratings}
    <p class="error" role="alert">評價暫時無法載入，請稍後再試。</p>
  {:else}
    <div class="summary">
      <p class="average">
        <strong>{averageScore(ratings.stats.average)}</strong>
        <span>平均分數 · {ratings.stats.count} 則評價</span>
      </p>
      <!-- Histogram from 5 stars down to 1 star. -->
      <div class="histogram" role="group" aria-label="評分分布">
        {#each [5, 4, 3, 2, 1] as score (score)}
          {@const count = ratings.stats.histogram[score - 1] ?? 0}
          <div class="bar-row">
            <span class="bar-label">{score} 星</span>
            <span class="bar"><span style:width="{(count / largest) * 100}%"></span></span>
            <span class="bar-count">{count}</span>
          </div>
        {/each}
      </div>
    </div>

    {#if user}
      <form method="POST" action="?/rate" class="rate" use:enhance={keepValues}>
        <fieldset>
          <legend>{ratings.mine ? '更新我的評分' : '我的評分'}</legend>
          <div class="scores">
            {#each [1, 2, 3, 4, 5] as score (score)}
              <label class="score">
                <input type="radio" name="score" value={score} required defaultChecked={ratings.mine?.score === score} />
                <span>{score} 分</span>
              </label>
            {/each}
          </div>
        </fieldset>
        <label class="review">
          評論（選填）
          <textarea
            name="review"
            rows="4"
            maxlength="2000"
            placeholder="上課方式、作業量、給分……"
            defaultValue={review}
            oninput={(event) => (reviewLength = event.currentTarget.value.length)}
          ></textarea>
        </label>
        <p class="hint">{reviewLength ?? review.length} / 2000 字</p>
        {#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
        {#if form?.saved}<p class="saved" role="status">已儲存你的評價。</p>{/if}
        {#if form?.removed}<p class="saved" role="status">已刪除你的評價。</p>{/if}
        <button>{ratings.mine ? '更新評價' : '送出評價'}</button>
      </form>
      {#if ratings.mine}
        <form method="POST" action="?/unrate" class="unrate" use:enhance={keepValues}>
          <button class="secondary">刪除我的評價</button>
        </form>
      {/if}
    {:else}
      <p class="login"><a href={loginHref(`${page.url.pathname}#ratings`)}>登入</a>後即可評分與撰寫評論。</p>
    {/if}

    {#if ratings.list.length === 0}
      <p class="empty">還沒有人評價這門課。</p>
    {:else}
      <ul class="list">
        {#each ratings.list as rating (rating.username)}
          <li>
            <p class="who">
              <a href={profileHref(rating.username)}>{authorName(rating)}</a>
              <span class="stars" role="img" aria-label="{rating.score} 分">{stars(rating.score)}</span>
            </p>
            {#if rating.review}<p class="text">{rating.review}</p>{/if}
            <p class="when"><time datetime={rating.updatedAt}>{postedAt(rating.updatedAt)}</time></p>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<style>
  .ratings { margin-top: 1rem; padding: clamp(1rem, 4vw, 2.5rem); background: white; border: 1px solid #e5dfef; border-radius: 1rem; }
  h2 { margin: 0; font-size: 1.2rem; }
  .scope { margin: 0.2rem 0 1rem; color: #594f69; font-size: 0.9rem; overflow-wrap: anywhere; }
  .summary { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 1.25rem; align-items: center; }
  .average { display: grid; margin: 0; text-align: center; }
  .average strong { font-size: 2.4rem; line-height: 1.1; color: #5630a5; }
  .average span { color: #594f69; font-size: 0.85rem; }
  .histogram { display: grid; gap: 0.25rem; }
  .bar-row { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr) 2rem; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
  .bar { height: 0.6rem; border-radius: 999px; background: #f1ecfb; overflow: hidden; }
  .bar span { display: block; height: 100%; background: #7c55cf; border-radius: inherit; }
  .bar-count { text-align: right; color: #594f69; }
  .rate { display: grid; gap: 0.6rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #e5dfef; }
  fieldset { margin: 0; padding: 0; border: 0; }
  legend { padding: 0; font-weight: 650; }
  .scores { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.35rem; margin-top: 0.35rem; }
  .score { position: relative; }
  .score input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
  .score span {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    border: 1px solid #aca0bc;
    border-radius: 0.45rem;
    font-weight: 650;
  }
  .score input:checked + span { border-color: #5630a5; background: #5630a5; color: white; }
  .score input:focus-visible + span { outline: 2px solid #5630a5; outline-offset: 2px; }
  .review { display: grid; gap: 0.25rem; font-weight: 650; }
  textarea, button {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid #aca0bc;
    border-radius: 0.45rem;
    background: white;
    color: inherit;
    font: inherit;
  }
  textarea { resize: vertical; font-weight: 400; }
  button { border-color: #5630a5; background: #5630a5; color: white; font-weight: 650; cursor: pointer; }
  button.secondary { background: white; color: #8a1c1c; border-color: #d9b3b3; }
  .unrate { margin-top: 0.5rem; }
  .hint { margin: -0.35rem 0 0; color: #594f69; font-size: 0.85rem; text-align: right; }
  .login { margin: 1.25rem 0 0; padding-top: 1rem; border-top: 1px solid #e5dfef; }
  .empty { color: #594f69; margin: 1.25rem 0 0; }
  .list { display: grid; gap: 0; margin: 1.25rem 0 0; padding: 0; list-style: none; }
  .list li { padding: 0.75rem 0; border-top: 1px solid #e5dfef; }
  .who { display: flex; flex-wrap: wrap; gap: 0.15rem 0.75rem; align-items: baseline; margin: 0; }
  .who a { font-weight: 650; overflow-wrap: anywhere; }
  .stars { color: #b46a12; letter-spacing: 0.05em; }
  .text { margin: 0.3rem 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .when { margin: 0.25rem 0 0; color: #594f69; font-size: 0.85rem; }
  .error { margin: 0; padding: 0.6rem 0.75rem; border-radius: 0.45rem; background: #fdecec; color: #8a1c1c; }
  .saved { margin: 0; padding: 0.6rem 0.75rem; border-radius: 0.45rem; background: #eaf6ee; color: #1d5a32; }
  @media (max-width: 24rem) { .summary { grid-template-columns: 1fr; } }
</style>
