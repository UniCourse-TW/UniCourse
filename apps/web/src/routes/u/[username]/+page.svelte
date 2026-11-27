<script lang="ts">
  import { onMount } from 'svelte';
  import '$lib/community-ui.css';
  import CommunityPostList from '$lib/community-post-list.svelte';
  import { dateTime, initial, oneLine, slashDate } from '$lib/community-format';
  import Stars from '$lib/community-stars.svelte';
  import { courseSearchHref } from '$lib/community-paths';
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
  let limitedRatings = $derived(ratingCount > 0 && ratingCount < DISTRIBUTION_MIN);
  const ratingThreshold = `未滿 ${DISTRIBUTION_MIN} 則，暫無平均與分布`;
  let averageShown = $derived(average !== null && ratingCount >= DISTRIBUTION_MIN ? average.toFixed(1) : null);
  /** Which schools the ratings cover, said next to the rating count (not as the person's own school). */
  let coverage = $derived(
    schoolCounts.length === 0 ? undefined : ratedSchool ? `評過${ratedSchool}的課程` : `評過 ${schoolCounts.length} 所學校的課程`
  );

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

{#snippet jumpTile(section: 'ratings' | 'posts', label: string, value: number, unit: string, note?: string)}
  <a class="tile-link" href="#{section}" aria-label="查看{section === 'ratings' ? '評價' : '文章'}，共 {value} {unit}">
    <StatTile {label} {value} {unit} {note} />
  </a>
{/snippet}

<div class="cm profile">
  <header class="identity" class:with-stats={sparse}>
    <div class="person">
      <span class="avatar" aria-hidden="true">{initial(name)}</span>
      <div class="who">
        <h1>{name}</h1>
        <p class="handle">
          <span class="mono">@{profile.username}</span>
          {#if schoolName}<span>{schoolName}</span>{/if}
          <span><time datetime={profile.createdAt}>{slashDate(profile.createdAt)}</time> 加入</span>
        </p>
      </div>
      <!-- Bio and edit button start at the avatar's left edge, in line with the tiles below on phones. -->
      {#if profile.bio}<p class="bio">{profile.bio}</p>
      {:else if isMe}<p class="bio empty">還沒有自我介紹・<a href="/settings">到設定新增</a>（只有你看得到這行）</p>{/if}
      {#if isMe}<a class="cm-btn secondary edit" href="/settings">編輯個人資料</a>{/if}
    </div>

    {#if sparse}
      <section class="stats-side" aria-label="活動摘要">
        <!-- The activity counts link directly to their lists. -->
        <StatRow label="活動統計">
          {@render jumpTile('ratings', '課程評價', ratingCount, '則', limitedRatings ? ratingThreshold : coverage ?? '還沒有評價')}
          {@render jumpTile('posts', '文章', profile.posts.length, '篇', profile.posts.length ? `收到 ${replies} 則回覆` : '還沒有文章')}
          {#if averageShown}<StatTile label="平均給分" value={averageShown} unit="/ 5" note={`${ratingCount} 則評價`} />{/if}
        </StatRow>
      </section>
    {/if}
  </header>


  {#if !sparse}
  <section class="summary" aria-label="活動摘要">
    <StatRow label="活動統計">
      {@render jumpTile('ratings', '課程評價', ratingCount, '則', ratingCount >= RATING_CAP ? `顯示最近 ${RATING_CAP} 則` : averageShown ? `平均給分 ${averageShown} / 5` : limitedRatings ? ratingThreshold : undefined)}
      {@render jumpTile('posts', '文章', profile.posts.length, '篇', profile.posts.length >= POST_CAP ? `顯示最近 ${POST_CAP} 篇` : undefined)}
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
      <div class="rating-heading">
        <h2 id="ratings">課程評價（{ratingCount}）</h2>
        {#if limitedRatings && coverage}<p class="rating-context">{coverage}</p>{/if}
      </div>
      {#if hydrated && ratingCount > 1}
        <div class="sort-tools" role="group" aria-labelledby="rating-sort">
          <span id="rating-sort">評價排序</span>
          <div class="sort">
            <button type="button" aria-pressed={sort === 'recent'} onclick={() => (sort = 'recent')}>最新</button>
            <button type="button" aria-pressed={sort === 'score'} onclick={() => (sort = 'score')}>給分高</button>
          </div>
        </div>
      {/if}
    </div>
    {#if ratingCount >= DISTRIBUTION_MIN && average !== null}
      <div class="dist">
        <h3 class="eyebrow">給分分布・平均給分 <span class="num avg">{average.toFixed(1)}</span> / 5</h3>
        <dl class="distribution" aria-label="各分數的評價則數">
          {#each histogram as { label, value } (label)}
            <div><dt>{label}</dt><dd class="num">{value} 則</dd></div>
          {/each}
        </dl>
      </div>
    {/if}
    {#if ratingCount === 0}
      <EmptyState title={isMe ? '你還沒有評價任何課程' : `${name} 還沒有評價任何課程`}
        description={isMe ? '找一門修過的課，在課程頁給分並寫幾句心得。' : '有評價後會列在這裡，平均給分也會一起出現。'}>
        {#snippet action()}
          <a class="cm-btn secondary" href="/">{isMe ? '去找一門修過的課 →' : '回到查課 →'}</a>
        {/snippet}
      </EmptyState>
    {:else}
      <div class="table-frame" class:compact={limitedRatings}>
        <table>
          <caption class="cm-sr">{name} 的課程評價</caption>
          <thead>
            <tr><th scope="col" class="c-course">課程</th><th scope="col" class="c-score">給分</th><th scope="col" class="c-when">時間</th><th scope="col">評論</th></tr>
          </thead>
          <tbody>
            {#each ratings as rating (key(rating))}
              {@const id = key(rating)}
              {@const long = (rating.review?.length ?? 0) > LONG_REVIEW}
              <tr>
                <th scope="row">
                  <a class="row-link" href={courseHref(rating)}>{rating.title ?? rating.courseCode}</a>
                  <span class="course-meta"><span>{data.schoolNames[rating.school] ?? rating.school}</span><span class="mono">{rating.courseCode}</span></span>
                </th>
                <td class="score-cell">
                  <span class="stars"><Stars score={rating.score} size="sm" decorative /></span>
                  <span class="num score">{rating.score} / 5</span>
                </td>
                <td class="num when"><time datetime={rating.updatedAt} title={dateTime(rating.updatedAt)}>{slashDate(rating.updatedAt)}</time></td>
                <td class="review">
                  {#if rating.review}
                    <span class="text" class:clamp={long && !expanded.includes(id)} title={long && !expanded.includes(id) ? rating.review : undefined}>{expanded.includes(id) ? rating.review : oneLine(rating.review)}</span>
                    {#if hydrated && long}
                      <button type="button" class="more" aria-expanded={expanded.includes(id)} onclick={() => toggle(id)}>{expanded.includes(id) ? '收合' : '展開全文'}</button>
                    {/if}
                  {:else}<span class="none">—</span>{/if}
                </td>
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
  .identity { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); align-items: start; }
  /* Wide screens: the person on the left, the three activity tiles filling the right. */
  .identity.with-stats { grid-template-columns: minmax(0, 1fr) minmax(0, 1.45fr); }
  .person { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0 var(--space-4); align-items: center; }
  .person > .bio, .person > .edit { grid-column: 1 / -1; }
  .edit { justify-self: start; margin-block-start: var(--space-3); }
  /* The full tile is a jump link with a visible hover and focus treatment. */
  .tile-link { display: block; min-inline-size: var(--target-min); min-block-size: var(--target-min); border-radius: var(--radius-panel); color: inherit !important; text-decoration: none; }
  .tile-link :global(.tile) { block-size: 100%; transition: border-color 0.15s, background-color 0.15s; }
  .tile-link :global(dt) { color: var(--brand-ink); font-weight: 650; }
  .tile-link :global(dt)::after { content: '↓' / ''; margin-inline-start: 0.35em; }
  .tile-link:is(:hover, :focus-visible) :global(.tile) { border-color: var(--brand); background: var(--brand-wash); }
  .tile-link:hover :global(dt) { text-decoration: underline; }
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
  .handle { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); overflow-wrap: anywhere; margin-block-start: var(--space-1) !important; color: var(--muted); font-size: 0.8125rem; }
  .bio { max-inline-size: 52em; margin-block-start: var(--space-3) !important; color: var(--ink-2); white-space: pre-wrap; overflow-wrap: anywhere; }
  .summary { margin-block-start: var(--space-4); }
  .summary :global(.stat-row) { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  /* The fourth tile may hold a school name, not a count: keep it readable but smaller than the numbers. */
  .summary :global(.stat-row > :nth-child(4) dd) { font-size: var(--t-xl); line-height: 1.3; min-block-size: 2.1rem; display: flex; align-items: center; }
  .bio.empty { color: var(--muted); font-size: var(--t-sm); }
  .rating-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-3); }
  .rating-context { color: var(--muted); font-size: var(--t-base); }
  .dist { max-inline-size: 55rem; }
  .dist { margin-block-end: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .eyebrow { display: flex; flex-wrap: wrap; align-items: baseline; margin-block-end: var(--space-2) !important; color: var(--ink-2) !important; font-size: max(0.8125rem, var(--t-sm)) !important; letter-spacing: 0 !important; }
  .eyebrow .avg { margin-inline-start: 0.3em; font-size: var(--t-lg); font-weight: 650; color: var(--ink); }
  .distribution { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0; font-size: 0.8125rem; }
  .distribution div + div { border-inline-start: 1px solid var(--line); padding-inline-start: var(--space-2); }
  .distribution dt { color: var(--ink-2); }
  .distribution dd { margin: 0; font-weight: 650; }
  .profile :is(.handle .mono, .course-meta, .course-meta .mono, .when, .sort-tools, .sort button, .more, thead th, .eyebrow) {
    font-size: max(0.8125rem, var(--t-sm));
  }
  .profile :global(.tile :is(dt, small, p)) { font-size: max(0.8125rem, var(--t-sm)); }
  .block { margin-block-start: var(--space-6); scroll-margin-block-start: 5rem; }
  .block-head { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; justify-content: space-between; margin-block-end: var(--space-3); }
  .block-head h2 { font-size: var(--t-lg) !important; scroll-margin-block-start: 5rem; }
  .sort-tools { display: flex; align-items: center; gap: var(--space-2); color: var(--muted); font-size: var(--t-sm); }
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
  table { inline-size: 100%; table-layout: fixed; border-collapse: collapse; font-size: var(--t-base); line-height: var(--leading-table); }
  /* Same frame, header and 16 px outer padding as the post list below, so both tables share one width and edge. */
  thead th { padding: var(--space-2) 0.625rem; color: var(--muted); background: var(--table-head); font-size: var(--t-sm); font-weight: 600; text-align: start; border-block-end: 1px solid var(--line); }
  tbody :is(th, td) { padding: 0.5rem 0.625rem; border-block-end: 1px solid var(--line); text-align: start; vertical-align: top; font-weight: 400; }
  tbody tr:last-child :is(th, td) { border-block-end: 0; }
  :is(thead, tbody) tr > :first-child { padding-inline-start: var(--space-4); }
  :is(thead, tbody) tr > :last-child { padding-inline-end: var(--space-4); }
  tbody tr:hover { background: var(--hover-row); }
  /* Fixed column shares, so the review gets the remaining width and the date sits right next to the score. */
  .c-course { inline-size: 25%; }
  .c-score { inline-size: 9rem; }
  .c-when { inline-size: 7.5rem; }
  tbody th a { font-weight: 600; text-decoration: none; }
  tbody th a:hover { text-decoration: underline; }
  tbody tr:focus-within { background: var(--hover-row); }
  tbody tr { position: relative; }
  .row-link::after { content: ''; position: absolute; inset: 0; }
  .row-link:focus-visible::after { outline: var(--focus-ring); outline-offset: -3px; border-radius: var(--radius-control); }
  .course-meta { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); color: var(--ink-2); font-size: var(--t-sm); overflow-wrap: anywhere; }
  .score { display: inline-block; color: var(--ink); font-weight: 650; }
  .stars { display: inline-block; margin-inline-end: var(--space-1); }
  .review .text { display: block; color: var(--ink-2); white-space: pre-wrap; overflow-wrap: anywhere; }
  .review .clamp { display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; }
  .review .none { color: var(--muted); }
  .more { position: relative; z-index: 1; min-inline-size: var(--target-min); margin-block-start: 2px; padding: 0; border: 0; background: none; color: var(--brand-ink); font: 600 var(--t-sm) / 1.5 var(--font-sans); cursor: pointer; min-block-size: 1.75rem; }
  .more:hover { text-decoration: underline; }
  .score-cell { white-space: nowrap; }
  .when { color: var(--muted); white-space: nowrap; }

  /* A small sample reads as cards with score and date beside the course and the review below. */
  @media (min-width: 40.001rem) {
    .compact thead { display: none; }
    .compact :is(table, tbody) { display: block; }
    .compact tr {
      display: grid;
      grid-template-columns: fit-content(18rem) auto minmax(0, 1fr);
      grid-template-areas: 'course score when' 'review review review';
      gap: 0 var(--space-3);
      padding: var(--space-2) var(--space-4);
      align-items: baseline;
    }
    .compact tr + tr { border-block-start: 1px solid var(--line); }
    .compact tr > :is(th, td):nth-child(n) { padding: 0; border: 0; }
    .compact th { grid-area: course; }
    .compact .review { grid-area: review; max-inline-size: 52ic; }
    .compact .score-cell { grid-area: score; }
    .compact .when { grid-area: when; }
  }
  @media (max-width: 56rem) {
    .identity.with-stats { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
  }
  @media (max-width: 48rem) {
    .summary :global(.stat-row) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 40rem) {
    .person { gap: var(--space-3); }
    .avatar { inline-size: 3.25rem; block-size: 3.25rem; font-size: 1.375rem; }
    /* Three compact tiles in one row: label, number, then a short note. */
    .stats-side :global(.stat-row) { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); }
    .stats-side :global(.tile) { padding: var(--space-2) var(--space-3); }
    .stats-side :global(.tile dd) { font-size: var(--t-2xl); }
    .stats-side :global(.tile p) { line-height: 1.4; text-wrap: balance; }
    /* Stack the review below the course and score. */
    thead { display: none; }
    table, tbody, tr, tbody :is(th, td) { display: block; }
    tbody tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-1) var(--space-3); padding: var(--space-3); border-block-end: 1px solid var(--line); }
    tbody tr:last-child { border-block-end: 0; }
    tbody tr > :is(th, td):nth-child(n) { padding: 0; border: 0 !important; inline-size: auto; }
    tbody th { grid-column: 1; grid-row: 1 / span 2; }
    .score-cell { grid-column: 2; grid-row: 1; text-align: end; }
    .when { grid-column: 2; grid-row: 2; align-self: center; text-align: end; color: var(--ink-2); font-size: var(--t-sm); }
    .review { grid-column: 1 / -1; grid-row: 3; inline-size: auto; }
    .sort button, .more { min-block-size: var(--target-min); }
  }
</style>
