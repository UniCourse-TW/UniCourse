<script lang="ts">
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import CommunityPostList from '$lib/community-post-list.svelte';
  import { initial, oneLine, slashDate } from '$lib/community-format';
  import Stars from '$lib/community-stars.svelte';
  import { courseSearchHref } from '$lib/community-paths';
  import BarList from '$lib/ui/BarList.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
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
  /** Longer reviews have an explicit expand control. */
  const LONG_REVIEW = 72;

  let ratingCount = $derived(profile.ratings.length);
  let average = $derived(ratingCount ? profile.ratings.reduce((sum, rating) => sum + rating.score, 0) / ratingCount : null);
  let replies = $derived(profile.posts.reduce((sum, post) => sum + post.replyCount, 0));
  let histogram = $derived(
    [5, 4, 3, 2, 1].map((score) => ({ label: `${score} 分`, value: profile.ratings.filter((rating) => rating.score === score).length }))
  );
  let schoolCounts = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const rating of profile.ratings) counts.set(rating.school, (counts.get(rating.school) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  });
  /**
   * The school this person rates most often, only when one school clearly leads (at least 2 ratings and
   * more than any other school); a tie or a single rating is not a preference.
   */
  let topSchool = $derived.by(() => {
    const [best, second] = schoolCounts;
    if (!best || best[1] < 2 || (second && second[1] === best[1])) return null;
    return { name: data.schoolNames[best[0]] ?? best[0], count: best[1] };
  });
  let ratedSchool = $derived(schoolCounts.length === 1 ? data.schoolNames[schoolCounts[0][0]] ?? schoolCounts[0][0] : null);
  /** Fewer than this many ratings and posts: three tiles beside the name instead of four plus a chart. */
  const SPARSE = 5;
  const DISTRIBUTION_MIN = 3;
  let sparse = $derived(ratingCount < SPARSE && profile.posts.length < SPARSE);

  let hydrated = $state(false);
  let sort = $state<'recent' | 'score'>('recent');
  let expanded = $state<string[]>([]);
  onMount(() => (hydrated = true));
  let ratings = $derived(
    sort === 'score'
      ? [...profile.ratings].sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt))
      : profile.ratings
  );

  const key = (rating: (typeof profile.ratings)[number]) => `${rating.school}/${rating.courseCode}`;
  const courseHref = (rating: (typeof profile.ratings)[number]) =>
    rating.latestOfferingId ? `/courses/${rating.latestOfferingId}` : courseSearchHref(rating.school, rating.courseCode);
  function toggle(id: string) {
    expanded = expanded.includes(id) ? expanded.filter((other) => other !== id) : [...expanded, id];
  }
</script>

<svelte:head>
  <title>{name}（@{profile.username}）｜UniCourse</title>
  <meta name="description" content={`${name} 在 UniCourse 的 ${ratingCount} 則課程評價與 ${profile.posts.length} 篇文章。`} />
</svelte:head>

<div class="cm profile">
  <header class="identity" class:with-stats={sparse}>
    <div class="person">
      <span class="avatar" aria-hidden="true">{initial(name)}</span>
      <div class="who">
        <h1>{name}</h1>
        <p class="handle">
          <span class="mono">@{profile.username}</span>
          {#if schoolName}<span class="sep">·</span>{schoolName}{/if}
          <span class="sep">·</span><time datetime={profile.createdAt}>{slashDate(profile.createdAt)}</time> 加入
        </p>
        {#if profile.bio}<p class="bio">{profile.bio}</p>
        {:else if isMe}<p class="bio empty">還沒有自我介紹・<a href="/settings">到設定新增</a>（只有你看得到這行）</p>{/if}
        {#if isMe}<a class="cm-btn secondary edit" href="/settings">編輯個人資料</a>{/if}
      </div>
    </div>

    {#if sparse}
      <section class="stats-side" aria-label="活動摘要">
        <StatRow label="活動統計">
          <StatTile label="課程評價" value={ratingCount} unit="則" />
          <StatTile label="發表文章" value={profile.posts.length} unit="篇" />
          {#if average !== null}
            <StatTile label="此帳號的平均給分" value={ratingCount === 1 ? average : average.toFixed(1)} unit="/ 5 分" />
          {/if}
        </StatRow>
      </section>
    {/if}
  </header>

  <nav class="jump" aria-label="本頁段落">
    <a href="#ratings">看評價 <span aria-hidden="true">↓</span></a>
    <a href="#posts">看文章 <span aria-hidden="true">↓</span></a>
  </nav>


  {#if !sparse}
  <section class="summary" aria-label="活動摘要">
    <StatRow label="活動統計">
      <StatTile label="課程評價" value={ratingCount} unit="則" note={ratingCount >= RATING_CAP ? `顯示最近 ${RATING_CAP} 則` : undefined} />
      <StatTile label="發表文章" value={profile.posts.length} unit="篇" note={profile.posts.length >= POST_CAP ? `顯示最近 ${POST_CAP} 篇` : undefined} />
      <StatTile label="文章收到的回覆" value={replies} unit="則" />
      {#if topSchool}
        <StatTile label="最常評的學校" value={topSchool.name} note={`${topSchool.count} 則評價`} />
      {:else}
        <StatTile label="評價過的學校" value={schoolCounts.length} unit="所" note="沒有特別偏重哪一所" />
      {/if}
    </StatRow>
  </section>
  {/if}

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
    {#if ratingCount}
      <p class="rating-context">評過 {ratedSchool ?? `${schoolCounts.length} 所學校`}的課{#if ratingCount === 1}・只有 1 則，還看不出給分習慣{/if}</p>
    {/if}
    {#if ratingCount >= DISTRIBUTION_MIN && average !== null}
      <div class="dist">
        <h3 class="eyebrow">給分分布・此帳號的平均給分 <span class="num avg">{average.toFixed(1)}</span> / 5</h3>
        <BarList label="給分分布" items={histogram} unit="則" />
      </div>
    {:else}
      <p class="distribution-note">給分分布將在累積 {DISTRIBUTION_MIN} 則評價後顯示。</p>
    {/if}
    {#if ratingCount === 0}
      <EmptyState title={isMe ? '你還沒有評價任何課程' : `${name} 還沒有評價任何課程`}
        description={isMe ? '找一門修過的課，在課程頁給分並寫幾句心得。' : '有評價後會列在這裡，平均給分也會一起出現。'}>
        {#snippet action()}
          <a class="cm-btn secondary" href="/">{isMe ? '去找一門修過的課 →' : '回到查課 →'}</a>
        {/snippet}
      </EmptyState>
    {:else}
      <div class="table-frame">
        <table>
          <caption class="cm-sr">{name} 的課程評價</caption>
          <thead>
            <tr><th scope="col">課程</th><th scope="col">學校</th><th scope="col" class="n">給分</th><th scope="col">評論</th><th scope="col" class="n">更新</th></tr>
          </thead>
          <tbody>
            {#each ratings as rating (key(rating))}
              {@const id = key(rating)}
              {@const long = (rating.review?.length ?? 0) > LONG_REVIEW}
              <tr>
                <th scope="row" data-label="課程">
                  <a href={courseHref(rating)}>{rating.title ?? rating.courseCode}</a>
                  <span class="mono code">{rating.courseCode}</span>
                </th>
                <td data-label="學校" class="school">{data.schoolNames[rating.school] ?? rating.school}</td>
                <td data-label="給分" class="n">
                  <span class="num score">{rating.score} / 5</span>
                  <span class="stars" aria-hidden="true"><Stars score={rating.score} /></span>
                </td>
                <td data-label="評論" class="review">
                  {#if rating.review}
                    <span class="text" class:clamp={long && !expanded.includes(id)} title={long && !expanded.includes(id) ? rating.review : undefined}>{expanded.includes(id) ? rating.review : oneLine(rating.review)}</span>
                    {#if hydrated && long}
                      <button type="button" class="more" aria-expanded={expanded.includes(id)} onclick={() => toggle(id)}>{expanded.includes(id) ? '收合' : '展開全文'}</button>
                    {/if}
                  {:else}<span class="none">—</span>{/if}
                </td>
                <td data-label="更新" class="n num when"><time datetime={rating.updatedAt}>{slashDate(rating.updatedAt)}</time></td>
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
      <EmptyState title={isMe ? '你還沒有發表文章' : `${name} 還沒有發表文章`}
        description={isMe ? '修課心得或選課提問都可以；從課程頁的「相關討論」進去會自動帶上課號。' : '發表的文章與提問會列在這裡。'}>
        {#snippet action()}
          <a class="cm-btn secondary" href={isMe ? '/forum?compose=1' : '/forum'}>{isMe ? '到論壇發表第一篇 →' : '逛逛論壇 →'}</a>
        {/snippet}
      </EmptyState>
    {:else}
      <CommunityPostList posts={profile.posts} schoolNames={data.schoolNames} courseTitles={data.courseTitles} showAuthor={false} dense label="{name} 發表的文章" />
    {/if}
  </section>
</div>

<style>
  .profile .sep { margin-inline: 0.4em; color: var(--axis); }
  .identity { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); align-items: start; }
  /* Wide screens: the person on the left, the three activity tiles filling the right. */
  .identity.with-stats { grid-template-columns: minmax(0, 1fr) minmax(0, 1.45fr); }
  .person { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-4); align-items: start; }
  .edit { justify-self: start; margin-block-start: var(--space-3); }
  .stats-side { min-inline-size: 0; }
  .stats-side :global(.stat-row) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .stats-side :global(.stat-row:has(> :nth-child(2):last-child)) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
  .jump { display: flex; flex-wrap: wrap; gap: 0 var(--space-4); margin-block-start: var(--space-1); font-size: var(--t-base); }
  .jump a { display: inline-flex; align-items: center; gap: 0.3em; min-block-size: var(--target-min); font-weight: 600; text-decoration: none; }
  .jump a:hover { text-decoration: underline; }
  .summary { margin-block-start: var(--space-4); }
  .summary :global(.stat-row) { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  /* The fourth tile may hold a school name, not a count: keep it readable but smaller than the numbers. */
  .summary :global(.stat-row > :nth-child(4) dd) { font-size: var(--t-xl); line-height: 1.3; min-block-size: 2.1rem; display: flex; align-items: center; }
  .bio.empty { color: var(--muted); font-size: var(--t-sm); }
  .rating-context, .distribution-note { color: var(--ink-2); font-size: var(--t-base); margin-block-end: var(--space-2) !important; }
  .dist, .table-frame { max-inline-size: 55rem; }
  .dist { margin-block-end: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .eyebrow { display: flex; flex-wrap: wrap; align-items: baseline; margin-block-end: var(--space-2) !important; color: var(--ink-2) !important; font-size: var(--t-sm) !important; letter-spacing: 0 !important; }
  .eyebrow .avg { margin-inline-start: 0.3em; font-size: var(--t-lg); font-weight: 650; color: var(--ink); }
  .dist :global(.bar-row) { grid-template-columns: 2.5rem minmax(0, 1fr) 3rem; min-block-size: 1.625rem; padding-block: 0; }
  .dist :global(.track) { grid-row: auto; grid-column: auto; }
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

  .table-frame { border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); overflow: hidden; }
  table { inline-size: 100%; border-collapse: collapse; font-size: var(--t-base); line-height: var(--leading-table); }
  thead th { padding: var(--space-2) 0.625rem; color: var(--muted); background: var(--table-head); font-size: var(--t-sm); font-weight: 600; text-align: start; border-block-end: 1px solid var(--line); }
  tbody :is(th, td) { padding: 0.5rem 0.625rem; border-block-end: 1px solid var(--line); text-align: start; vertical-align: top; font-weight: 400; }
  tbody tr:last-child :is(th, td) { border-block-end: 0; }
  tbody tr:hover { background: var(--hover-row); }
  .n { text-align: end !important; white-space: nowrap; }
  tbody th { inline-size: 24%; }
  tbody th a { font-weight: 600; text-decoration: none; }
  tbody th a:hover { text-decoration: underline; }
  .code { display: block; color: var(--muted); font-size: var(--t-xs); }
  .school { color: var(--ink-2); inline-size: 1%; white-space: nowrap; }
  .score { display: inline-block; color: var(--ink); font-weight: 650; }
  .stars { display: inline-block; margin-inline-start: var(--space-1); }
  td.n:has(.score) { inline-size: 1%; }
  .review { inline-size: 32%; }
  .review .text { display: block; color: var(--ink-2); white-space: pre-wrap; overflow-wrap: anywhere; }
  .review .clamp { display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; }
  .review .none { color: var(--muted); }
  .more { margin-block-start: 2px; padding: 0; border: 0; background: none; color: var(--brand-ink); font: 600 var(--t-sm) / 1.5 var(--font-sans); cursor: pointer; min-block-size: 1.75rem; }
  .more:hover { text-decoration: underline; }
  .when { color: var(--ink-2); inline-size: 1%; }

  @media (max-width: 56rem) {
    .identity.with-stats { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
  }
  @media (max-width: 48rem) {
    .summary :global(.stat-row) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 40rem) {
    .person { gap: var(--space-3); }
    .avatar { inline-size: 3.25rem; block-size: 3.25rem; font-size: 1.375rem; }
    .stats-side :global(.stat-row) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
    .stats-side :global(.tile) { padding: var(--space-2) var(--space-3); }
    .stats-side :global(.tile:nth-child(3)) { grid-column: 1 / -1; }
    .stats-side :global(.tile dd) { font-size: var(--t-2xl); }
    /* Stack: each rating becomes a short card-like row; column names come from data-label. */
    thead { display: none; }
    table, tbody, tr, tbody :is(th, td) { display: block; }
    tbody tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-1) var(--space-3); padding: var(--space-3); border-block-end: 1px solid var(--line); }
    tbody tr:last-child { border-block-end: 0; }
    tbody :is(th, td) { padding: 0; border: 0 !important; inline-size: auto; }
    tbody th { grid-column: 1; }
    tbody td[data-label='給分'] { grid-column: 2; grid-row: 1; }
    /* The date stays at the row's end as on desktop: right of the school line. */
    .school { grid-column: 1; grid-row: 2; inline-size: auto; font-size: var(--t-sm); color: var(--ink-2); }
    .when { grid-column: 2; grid-row: 2; font-size: var(--t-sm); }
    .review { grid-column: 1 / -1; inline-size: auto; }
    .code { font-size: var(--t-sm); overflow-wrap: anywhere; }
    .stars { display: block; margin: 0; }
  }
</style>
