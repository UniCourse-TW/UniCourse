<script lang="ts">
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import CommunityPostList from '$lib/community-post-list.svelte';
  import { initial, joinedMonth, oneLine, shortDate } from '$lib/community-format';
  import { courseSearchHref } from '$lib/community-paths';
  import BarList from '$lib/ui/BarList.svelte';
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let profile = $derived(data.profile);
  let isMe = $derived(data.user?.username === profile.username);
  let name = $derived(profile.displayName || profile.username);
  let schoolName = $derived(profile.school ? (data.schoolNames[profile.school] ?? profile.school) : '');

  // The API returns at most this many of each, newest first.
  const RATING_CAP = 100;
  const POST_CAP = 50;

  let ratingCount = $derived(profile.ratings.length);
  let average = $derived(ratingCount ? profile.ratings.reduce((sum, rating) => sum + rating.score, 0) / ratingCount : null);
  let replies = $derived(profile.posts.reduce((sum, post) => sum + post.replyCount, 0));
  let histogram = $derived(
    [5, 4, 3, 2, 1].map((score) => ({ label: `${score} 分`, value: profile.ratings.filter((rating) => rating.score === score).length }))
  );

  let hydrated = $state(false);
  let sort = $state<'recent' | 'score'>('recent');
  onMount(() => (hydrated = true));
  let ratings = $derived(
    sort === 'score'
      ? [...profile.ratings].sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt))
      : profile.ratings
  );

  const courseHref = (rating: (typeof profile.ratings)[number]) =>
    rating.latestOfferingId ? `/courses/${rating.latestOfferingId}` : courseSearchHref(rating.school, rating.courseCode);
</script>

<svelte:head>
  <title>{name}（@{profile.username}）｜UniCourse</title>
  <meta name="description" content={`${name} 在 UniCourse 的 ${ratingCount} 則課程評價與 ${profile.posts.length} 篇文章。`} />
</svelte:head>

<div class="cm profile">
  <header class="identity">
    <span class="avatar" aria-hidden="true">{initial(name)}</span>
    <div class="who">
      <h1>{name}</h1>
      <p class="handle">
        <span class="mono">@{profile.username}</span>
        {#if schoolName}<span class="sep">·</span>{schoolName}{/if}
        <span class="sep">·</span><time datetime={profile.createdAt}>{joinedMonth(profile.createdAt)}</time>加入
      </p>
      {#if profile.bio}<p class="bio">{profile.bio}</p>{/if}
    </div>
    {#if isMe}<a class="cm-btn secondary edit" href="/settings">編輯個人資料</a>{/if}
  </header>

  <section class="summary" aria-label="活動摘要">
    <StatRow label="活動統計">
      <StatTile label="課程評價" value={ratingCount} unit="則" note={ratingCount >= RATING_CAP ? `顯示最近 ${RATING_CAP} 則` : undefined} />
      <StatTile label="平均給分" value={average === null ? null : average.toFixed(1)} unit={average === null ? undefined : '/ 5'}
        note={average === null ? '還沒有評價' : undefined} />
      <StatTile label="發表文章" value={profile.posts.length} unit="篇" note={profile.posts.length >= POST_CAP ? `顯示最近 ${POST_CAP} 篇` : undefined} />
      <StatTile label="文章收到的回覆" value={replies} unit="則" />
    </StatRow>
    {#if ratingCount}
      <div class="dist">
        <h2 class="eyebrow" id="dist-title">給分分布<span class="cm-hint">（{ratingCount} 則評價，1–5 分）</span></h2>
        <BarList label="給分分布" items={histogram} unit="則" showValues={false} />
      </div>
    {/if}
  </section>

  <nav class="jump" aria-label="本頁段落">
    <a class="cm-chip" href="#ratings">課程評價<span class="n">{ratingCount}</span></a>
    <a class="cm-chip" href="#posts">發表的文章<span class="n">{profile.posts.length}</span></a>
  </nav>

  <section class="block" aria-labelledby="ratings">
    <div class="block-head">
      <h2 id="ratings">課程評價（{ratingCount}）</h2>
      {#if hydrated && ratingCount > 1}
        <div class="sort" role="group" aria-label="評價排序">
          <button type="button" aria-pressed={sort === 'recent'} onclick={() => (sort = 'recent')}>最新</button>
          <button type="button" aria-pressed={sort === 'score'} onclick={() => (sort = 'score')}>給分高</button>
        </div>
      {/if}
    </div>
    {#if ratingCount === 0}
      <p class="empty">{isMe ? '你還沒有評價任何課程。到課程頁就能給分與寫評論。' : '還沒有評價任何課程。'}</p>
    {:else}
      <div class="table-frame">
        <table>
          <caption class="cm-sr">{name} 的課程評價</caption>
          <thead>
            <tr><th scope="col">課程</th><th scope="col">學校</th><th scope="col" class="n">給分</th><th scope="col">評論</th><th scope="col" class="n">更新</th></tr>
          </thead>
          <tbody>
            {#each ratings as rating (`${rating.school}/${rating.courseCode}`)}
              <tr>
                <th scope="row" data-label="課程">
                  <a href={courseHref(rating)}>{rating.title ?? rating.courseCode}</a>
                  <span class="mono code">{rating.courseCode}</span>
                </th>
                <td data-label="學校" class="school">{data.schoolNames[rating.school] ?? rating.school}</td>
                <td data-label="給分" class="n">
                  <span class="stars" role="img" aria-label="{rating.score} 分（滿分 5 分）">
                    {#each [1, 2, 3, 4, 5] as step (step)}<span class:on={step <= rating.score} aria-hidden="true">★</span>{/each}
                  </span>
                  <span class="num score" aria-hidden="true">{rating.score}</span>
                </td>
                <td data-label="評論" class="review">{#if rating.review}<span>{oneLine(rating.review)}</span>{:else}<span class="none">—</span>{/if}</td>
                <td data-label="更新" class="n num when"><time datetime={rating.updatedAt}>{shortDate(rating.updatedAt)}</time></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section class="block" aria-labelledby="posts">
    <div class="block-head"><h2 id="posts">發表的文章（{profile.posts.length}）</h2></div>
    {#if profile.posts.length === 0}
      <p class="empty">{isMe ? '你還沒有發表文章。' : '還沒有發表文章。'}{#if isMe}<a href="/forum?compose=1">到論壇發表第一篇 →</a>{/if}</p>
    {:else}
      <CommunityPostList posts={profile.posts} schoolNames={data.schoolNames} showAuthor={false} label="{name} 發表的文章" />
    {/if}
  </section>
</div>

<style>
  .profile .sep { margin-inline: 0.4em; color: var(--axis); }
  .identity { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--space-4); align-items: start; }
  .avatar {
    display: grid;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    border-radius: 50%;
    color: var(--brand-ink);
    background: var(--brand-wash);
    font-size: 1.625rem;
    font-weight: 650;
  }
  .who { min-inline-size: 0; padding-block-start: var(--space-1); }
  .handle { margin-block-start: var(--space-1) !important; color: var(--muted); font-size: 0.8125rem; }
  .bio { max-inline-size: 52em; margin-block-start: var(--space-2) !important; color: var(--ink-2); white-space: pre-wrap; overflow-wrap: anywhere; }
  .summary {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: var(--space-4);
    align-items: start;
    margin-block-start: var(--space-6);
  }
  .summary:not(:has(.dist)) { grid-template-columns: minmax(0, 1fr); }
  .summary :global(.stat-row) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dist { padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .eyebrow { margin-block-end: var(--space-2) !important; color: var(--ink-2) !important; font-size: var(--t-sm) !important; letter-spacing: 0 !important; }
  .eyebrow .cm-hint { margin-inline-start: var(--space-1); }
  .dist :global(.bar-row) { grid-template-columns: 2.5rem minmax(0, 1fr) 3rem; min-block-size: 1.625rem; padding-block: 0; }
  .dist :global(.track) { grid-row: auto; grid-column: auto; }
  .jump { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-4); }
  .block { margin-block-start: var(--space-8); scroll-margin-block-start: 5rem; }
  .block-head { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; justify-content: space-between; margin-block-end: var(--space-3); }
  .block-head h2 { font-size: var(--t-lg) !important; scroll-margin-block-start: 5rem; }
  .sort { display: inline-flex; padding: 2px; border: 1px solid var(--line); border-radius: calc(var(--radius-control) + 2px); background: var(--panel); }
  .sort button {
    min-block-size: 2.25rem;
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-control);
    color: var(--muted);
    background: transparent;
    font: 600 var(--t-sm) / 1 var(--font-sans);
    cursor: pointer;
  }
  .sort button[aria-pressed='true'] { color: var(--brand-ink); background: var(--panel-raised); box-shadow: inset 0 0 0 1px var(--line); }
  .empty { padding: var(--space-5) var(--space-4); border: 1px dashed var(--line); border-radius: var(--radius-panel); color: var(--muted); text-align: center; font-size: var(--t-base); }
  .empty a { margin-inline-start: var(--space-2); font-weight: 600; }

  .table-frame { border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); overflow: hidden; }
  table { inline-size: 100%; border-collapse: collapse; font-size: var(--t-base); line-height: var(--leading-table); }
  thead th { padding: var(--space-2) 0.625rem; color: var(--muted); background: var(--table-head); font-size: var(--t-sm); font-weight: 600; text-align: start; border-block-end: 1px solid var(--line); }
  tbody :is(th, td) { padding: 0.5rem 0.625rem; border-block-end: 1px solid var(--line); text-align: start; vertical-align: top; font-weight: 400; }
  tbody tr:last-child :is(th, td) { border-block-end: 0; }
  tbody tr:hover { background: var(--hover-row); }
  .n { text-align: end !important; white-space: nowrap; }
  tbody th { inline-size: 28%; }
  tbody th a { font-weight: 600; text-decoration: none; }
  tbody th a:hover { text-decoration: underline; }
  .code { display: block; color: var(--muted); font-size: var(--t-xs); }
  .school { color: var(--ink-2); inline-size: 16%; }
  .stars { color: var(--axis); letter-spacing: 1px; }
  .stars .on { color: var(--warn); }
  .score { display: inline-block; min-inline-size: 1ch; margin-inline-start: var(--space-1); font-weight: 600; }
  .review span { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--ink-2); }
  .review .none { color: var(--muted); }
  .when { color: var(--muted); }

  @media (max-width: 48rem) {
    .summary { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 40rem) {
    .identity { grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); }
    .avatar { inline-size: 3.25rem; block-size: 3.25rem; font-size: 1.375rem; }
    .edit { grid-column: 1 / -1; }
    .summary :global(.stat-row) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    /* Stack: each rating becomes a short card-like row; column names come from data-label. */
    thead { display: none; }
    table, tbody, tr, tbody :is(th, td) { display: block; }
    tbody tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-1) var(--space-3); padding: var(--space-3); border-block-end: 1px solid var(--line); }
    tbody tr:last-child { border-block-end: 0; }
    tbody :is(th, td) { padding: 0; border: 0 !important; inline-size: auto; }
    tbody th { grid-column: 1; }
    tbody td[data-label='給分'] { grid-column: 2; grid-row: 1; }
    .school { grid-column: 1 / -1; inline-size: auto; font-size: var(--t-sm); color: var(--muted); }
    .review { grid-column: 1 / -1; }
    .when { grid-column: 1 / -1; text-align: start !important; font-size: var(--t-sm); }
    .code { display: inline; margin-inline-start: var(--space-1); }
  }
</style>
