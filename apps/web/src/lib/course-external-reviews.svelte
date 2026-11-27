<script lang="ts">
  import type { ExternalReview, ExternalReviews } from '@unicourse/api-client';
  import { onMount } from 'svelte';
  import { slashDate } from '$lib/community-format';
  import {
    displayAuthor,
    endsSentence,
    excerptParts,
    postKind,
    postKindLabels,
    pushLabel,
    type PostKind
  } from '$lib/course-external-text';
  import { compareTerms } from '$lib/course-history';
  import { isHttpUrl } from '$lib/format';
  import Badge from '$lib/ui/Badge.svelte';
  import { displayValue } from '$lib/ui/format';

  interface Props {
    school: string;
    courseCode: string;
    /** Teachers of the offering this page shows; their posts come first. */
    instructors?: string[];
    /** `/api/courses/{school}/{courseCode}/external-reviews`; `undefined` when it could not be loaded. */
    reviews: ExternalReviews | undefined;
  }

  let { school, courseCode, instructors = [], reviews }: Props = $props();

  /** Posts listed before「再顯示」. */
  const initialPosts = 6;
  /** Posts each「再顯示」adds. */
  const stepPosts = 10;
  /** Teachers listed in the summary before「其他 N 位」. */
  const initialTeachers = 6;

  type Sort = 'relevant' | 'newest' | 'push';
  const sortLabels: Record<Sort, string> = { relevant: '本班教師在前・心得優先', newest: '最新發文', push: '推文最多' };
  const kinds: PostKind[] = ['review', 'question', 'other'];
  const noTerm = '__none__';

  interface Row {
    post: ExternalReview;
    key: string;
    teachers: string[];
    mine: boolean;
    kind: PostKind;
    author: string | undefined;
    parts: ReturnType<typeof excerptParts>;
    time: number;
  }

  let total = $derived(reviews?.sources.reduce((sum, source) => sum + source.count, 0) ?? 0);
  let links = $derived(reviews?.linkOnly.filter((link) => isHttpUrl(link.url)) ?? []);
  let own = $derived(new Set(instructors));
  let rows = $derived<Row[]>(
    (reviews?.posts ?? [])
      .filter((post) => isHttpUrl(post.url))
      .map((post) => {
        const teachers = [...new Set([...(post.match?.instructor ? [post.match.instructor] : []), ...post.teachers])];
        return {
          post,
          key: post.url,
          teachers,
          mine: teachers.some((name) => own.has(name)),
          kind: postKind(post.tag),
          author: displayAuthor(post.author),
          parts: excerptParts(post.excerpt),
          time: post.postedAt ? Date.parse(post.postedAt) : 0
        };
      })
  );
  let boards = $derived([...new Set(rows.map((row) => row.post.board))]);
  let sourceLabels = $derived([...new Set(rows.map((row) => row.post.sourceLabel))]);
  let years = $derived(rows.filter((row) => row.time).map((row) => new Date(row.time).getFullYear()));
  let firstYear = $derived(years.length ? Math.min(...years) : undefined);
  let lastYear = $derived(years.length ? Math.max(...years) : undefined);
  let mineCount = $derived(rows.filter((row) => row.mine).length);
  let mineReviews = $derived(rows.filter((row) => row.mine && row.kind === 'review').length);
  let kindCounts = $derived(Object.fromEntries(kinds.map((kind) => [kind, rows.filter((row) => row.kind === kind).length])) as Record<PostKind, number>);

  /** Teachers named in the posts, this offering's first, then by post count. */
  let teacherCounts = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const row of rows) for (const name of row.teachers) counts.set(name, (counts.get(name) ?? 0) + 1);
    for (const name of instructors) if (!counts.has(name)) counts.set(name, 0);
    return [...counts]
      .map(([name, count]) => ({ name, count, mine: own.has(name) }))
      .sort((a, b) => Number(b.mine) - Number(a.mine) || b.count - a.count || a.name.localeCompare(b.name, 'zh-Hant'));
  });
  let teacherMax = $derived(Math.max(1, ...teacherCounts.map((teacher) => teacher.count)));
  let untagged = $derived(rows.filter((row) => row.teachers.length === 0).length);

  /** Terms named in the titles, newest first. */
  let terms = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const row of rows) if (row.post.term) counts.set(row.post.term, (counts.get(row.post.term) ?? 0) + 1);
    return [...counts].sort((a, b) => compareTerms(b[0], a[0]));
  });
  let termless = $derived(rows.filter((row) => !row.post.term).length);

  /** Posts per calendar year of posting, gaps included, for the small column chart. */
  let perYear = $derived.by(() => {
    if (firstYear === undefined || lastYear === undefined) return [];
    const out: { year: number; count: number }[] = [];
    for (let year = firstYear; year <= lastYear; year += 1) out.push({ year, count: years.filter((value) => value === year).length });
    return out;
  });
  let yearMax = $derived(Math.max(1, ...perYear.map((entry) => entry.count)));

  // Filters work after hydration; without JavaScript the default order and「顯示全部」still do.
  let ready = $state(false);
  onMount(() => (ready = true));
  let filtersOpen = $state(false);
  let teacher = $state<string>('');
  /** Only posts naming this offering's teachers (any of them). */
  let mineOnly = $state(false);
  /** Posts shown per list after hydration, keyed by list id; grows by `stepPosts`. */
  let limits = $state<Record<string, number>>({});
  let term = $state<string>('');
  let kind = $state<PostKind | ''>('');
  let sort = $state<Sort>('relevant');

  let filtered = $derived(
    rows.filter(
      (row) =>
        (!teacher || row.teachers.includes(teacher)) &&
        (!mineOnly || row.mine) &&
        (!term || (term === noTerm ? !row.post.term : row.post.term === term)) &&
        (!kind || row.kind === kind)
    )
  );
  const kindRank: Record<PostKind, number> = { review: 0, question: 1, other: 2 };
  let ordered = $derived(
    [...filtered].sort((a, b) => {
      if (sort === 'push') return (b.post.pushScore ?? 0) - (a.post.pushScore ?? 0) || b.time - a.time;
      if (sort === 'relevant') return Number(b.mine) - Number(a.mine) || kindRank[a.kind] - kindRank[b.kind] || b.time - a.time;
      return b.time - a.time;
    })
  );
  let filtering = $derived(Boolean(teacher || term || kind || mineOnly));
  let activeFilters = $derived([teacher, term, kind].filter(Boolean).length + Number(mineOnly));
  /**
   * The default view lists this offering's teacher in a group of its own, so a lone question by that
   * teacher is not mistaken for the top review; everyone else follows, reviews first.
   */
  let grouped = $derived(sort === 'relevant' && !filtering && mineCount > 0 && mineCount < rows.length);
  let mineRows = $derived(ordered.filter((row) => row.mine));
  let otherRows = $derived(ordered.filter((row) => !row.mine));
  let shown = $derived(grouped ? Math.min(mineRows.length, initialPosts) + Math.min(otherRows.length, initialPosts) : Math.min(ordered.length, initialPosts));
  let mineLine = $derived.by(() => {
    const names = instructors.join('、');
    if (mineReviews === mineRows.length) return `本班教師 ${names}・${mineRows.length} 篇心得評價`;
    if (mineReviews === 0) return `本班教師 ${names}・還沒有心得評價`;
    return `本班教師 ${names}・${mineRows.length} 篇（心得評價 ${mineReviews} 篇在前）`;
  });

  function pickTeacher(name: string) {
    teacher = teacher === name ? '' : name;
  }

  function clearFilters() {
    mineOnly = false;
    teacher = '';
    term = '';
    kind = '';
  }

  function teacherLabel(name: string) {
    return own.has(name) ? `${name}（本班）` : name;
  }

  /** Two-digit year for the column chart axis (16); the caption carries the full range. */
  function shortYear(year: number) {
    return String(year).slice(-2);
  }
</script>

{#snippet postList(items: Row[], labelledby: string | undefined, listId: string)}
  {@const limit = limits[listId] ?? initialPosts}
  <!-- Without JavaScript every post is rendered and CSS folds the rest behind「顯示全部」; with it, the
       list grows in steps of ten so a long list does not jump from 6 to 43 at once. -->
  <ol class="list" class:collapsible={!ready && items.length > initialPosts} aria-label={labelledby ? undefined : '外部文章'} aria-labelledby={labelledby}>
    {#each ready ? items.slice(0, limit) : items as row, index (row.key)}
      <li class:extra={index >= initialPosts} class:mine={row.mine}>
        <article>
          <h3 class="title">
            <a href={row.post.url} target="_blank" rel="noopener noreferrer nofollow">{row.post.title}<span class="out" aria-hidden="true">↗</span><span class="sr-only">（開啟 {row.post.sourceLabel} 原文）</span></a>
          </h3>
          <p class="meta">
            {#if row.mine}<span class="badge-mine">本班教師</span>{/if}
            {#if row.post.isDemo}<Badge label="示範資料" tone="demo" />{/if}
            {#if row.post.postedAt}<time class="num" datetime={row.post.postedAt}>{slashDate(row.post.postedAt)}</time>{/if}
            {#if row.post.term}<span class="mono">{row.post.term}</span>{/if}
            {#if row.teachers.length}<span>{row.teachers.join('、')}</span>{/if}
            {#if boards.length > 1}<span>{row.post.board}</span>{/if}
            {#if row.author}<span class="author">{row.author}</span>{/if}
            {#if row.post.pushScore}<span class="push num" class:down={row.post.pushScore < 0}>推 {pushLabel(row.post.pushScore)}</span>{/if}
            {#if !row.parts.length}<span class="title-only" title="這篇的開頭沒有可摘錄的心得文字，請點標題看原文">只收錄標題</span>{/if}
          </p>
          {#if row.parts.length}
            <p class="excerpt">
              {#each row.parts as part, i (i)}{#if part.label}<span class="label">{part.label}</span>{/if}{part.text}{#if i < row.parts.length - 1}<span class="sep" aria-hidden="true"> ・ </span>{/if}{/each}{#if !endsSentence(row.parts)}…{/if}
            </p>
          {/if}
        </article>
      </li>
    {/each}
  </ol>
  {#if ready && items.length > limit}
    <p class="grow">
      <span class="num">已列 {limit} / {items.length} 篇</span>
      <button type="button" class="grow-btn" onclick={() => (limits[listId] = limit + stepPosts)}>再顯示 {Math.min(stepPosts, items.length - limit)} 篇 ▾</button>
      {#if items.length - limit > stepPosts}<button type="button" class="clear" onclick={() => (limits[listId] = items.length)}>全部顯示</button>{/if}
    </p>
  {:else if ready && limit > initialPosts}
    <p class="grow"><button type="button" class="clear" onclick={() => (limits[listId] = initialPosts)}>收合為前 {initialPosts} 篇 ▴</button></p>
  {:else if !ready && items.length > initialPosts}
    <details class="more">
      <summary><span class="closed">顯示全部 {items.length} 篇 ▾</span><span class="opened">收合為前 {initialPosts} 篇 ▴</span></summary>
    </details>
  {/if}
{/snippet}

<section class="external" class:compact={!reviews || total === 0} id="external-reviews" aria-labelledby="external-title" data-school={school} data-course={courseCode}>
  {#if !reviews || total === 0}
    <!-- Nothing indexed (or the index is down): one line, so the sections below move up. -->
    <div class="strip">
      <h2 id="external-title">外部評價</h2>
      <p class="strip-text" role={reviews ? undefined : 'alert'}>
        {reviews ? '還沒有收錄到這門課的外站文章。' : '外部評價暫時無法載入，請稍後再試。'}
      </p>
      {#if links.length}
        <ul class="links" aria-label="到其他網站搜尋">
          {#each links as link (link.source)}
            <li><a href={link.url} target="_blank" rel="noopener noreferrer nofollow">在 {link.label} 搜尋<span aria-hidden="true"> ↗</span><span class="sr-only">（開啟外部網站）</span></a></li>
          {/each}
        </ul>
      {/if}
    </div>
  {:else}
    <header class="head">
      <div class="head-text">
        <h2 id="external-title">外部評價 <span class="head-count num">{displayValue(total)} 篇</span></h2>
        <ul class="dek">
          <li>來源：{sourceLabels.join('、')}{#if boards.length}・{boards.join('、')} 板{/if}{#if firstYear !== undefined}・發文 {firstYear}{#if lastYear !== firstYear}–{lastYear}{/if} 年{/if}</li>
          {#if kindCounts.question || kindCounts.other}<li>心得評價與提問混在一起，依標題的〔評價〕〔問題〕等分類</li>{/if}
          <li>只存標題、日期、作者帳號與開頭摘要；全文請點標題到原站</li>
        </ul>
      </div>
    </header>
    {#if links.length}
      <div class="elsewhere">
        <p class="elsewhere-label">沒有收錄的網站，可以直接到站上搜尋這門課：</p>
        <ul class="links" aria-label="到其他網站搜尋">
          {#each links as link (link.source)}
            <li><a href={link.url} target="_blank" rel="noopener noreferrer nofollow">在 {link.label} 搜尋<span aria-hidden="true"> ↗</span><span class="sr-only">（開啟外部網站）</span></a></li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="layout">
      <aside class="summary" aria-label="外部文章摘要">
        <!-- The three counts double as filters (phones too, where the teacher list is hidden). -->
        <div class="figures" role="group" aria-label="快速篩選">
          <button type="button" class="figure" aria-pressed={mineOnly} disabled={!ready || mineCount === 0} onclick={() => (mineOnly = !mineOnly)}>
            <span class="fig-label">本班教師</span><span><b class="num">{displayValue(mineCount)}</b> 篇</span>
          </button>
          <button type="button" class="figure" aria-pressed={kind === 'review'} disabled={!ready || kindCounts.review === 0} onclick={() => (kind = kind === 'review' ? '' : 'review')}>
            <span class="fig-label">心得評價</span><span><b class="num">{displayValue(kindCounts.review)}</b> 篇</span>
          </button>
          <button type="button" class="figure" aria-pressed={kind === 'question'} disabled={!ready || kindCounts.question === 0} onclick={() => (kind = kind === 'question' ? '' : 'question')}>
            <span class="fig-label">提問</span><span><b class="num">{displayValue(kindCounts.question)}</b> 篇</span>
          </button>
        </div>

        <div class="block by-teacher">
          <h3 id="external-teachers">依教師篩選 <span class="hint">點一下只看該教師</span></h3>
          <ul class="teachers" class:collapsible={teacherCounts.length > initialTeachers} aria-labelledby="external-teachers">
            {#each teacherCounts as entry, index (entry.name)}
              <li class:extra={index >= initialTeachers}>
                <button
                  type="button"
                  class="teacher"
                  class:mine={entry.mine}
                  aria-pressed={teacher === entry.name}
                  disabled={!ready || entry.count === 0}
                  onclick={() => pickTeacher(entry.name)}
                >
                  <span class="name">{entry.name}{#if entry.mine}<span class="here">本班</span>{/if}</span>
                  <span class="bar" aria-hidden="true"><span style:width={`${(entry.count / teacherMax) * 100}%`}></span></span>
                  <span class="num n">{entry.count}</span>
                </button>
              </li>
            {/each}
          </ul>
          {#if teacherCounts.length > initialTeachers}
            <details class="more-teachers">
              <summary><span class="closed">其他 {teacherCounts.length - initialTeachers} 位教師 ▾</span><span class="opened">收合 ▴</span></summary>
            </details>
          {/if}
          {#if untagged}<p class="note">另有 {untagged} 篇標題沒有寫教師。</p>{/if}
        </div>

        {#if perYear.length > 1}
          <figure class="block years">
            <figcaption>每年發文數 <span class="cap-range num">{perYear[0].year}–{perYear.at(-1)?.year}</span></figcaption>
            <div class="columns" role="img" aria-label={`每年發文數：${perYear.map((entry) => `${entry.year} 年 ${entry.count} 篇`).join('、')}`}>
              {#each perYear as entry (entry.year)}
                <span class="column" title={`${entry.year} 年 ${entry.count} 篇`}>
                  <span class="value num" class:zero={entry.count === 0}>{entry.count}</span>
                  <span class="fill" class:zero={entry.count === 0} style:height={`${(entry.count / yearMax) * 100}%`}></span>
                </span>
              {/each}
            </div>
            <div class="axis num" aria-hidden="true">{#each perYear as entry (entry.year)}<span>{shortYear(entry.year)}</span>{/each}</div>
          </figure>
        {/if}
      </aside>

      <div class="posts">
        <div class="list-bar">
          <p class="status" role="status" aria-live="polite">
            {#if filtering}
              符合條件 <b class="num">{ordered.length}</b> 篇{#if mineOnly}・本班教師{/if}{#if teacher}・教師 {teacherLabel(teacher)}{/if}{#if term}・{term === noTerm ? '標題沒寫學期' : term}{/if}{#if kind}・{postKindLabels[kind]}{/if}
              <button type="button" class="clear" onclick={clearFilters}>清除篩選</button>
            {:else if instructors.length && mineCount === 0}
              沒有找到本班教師 {instructors.join('、')} 的文章；下面是其他教師開這門課的文章，心得評價在前。
            {:else}
              共 <b class="num">{displayValue(rows.length)}</b> 篇{#if shown < rows.length}・先列 {shown} 篇{/if}{#if total > rows.length}（另有 {displayValue(total - rows.length)} 篇較舊的未列出）{/if}<span class="sort-note">・{sortLabels[sort]}</span>
            {/if}
          </p>
          <button
            type="button"
            class="filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls="external-toolbar"
            disabled={!ready}
            onclick={() => (filtersOpen = !filtersOpen)}
          >篩選與排序{#if activeFilters}<span class="active num">{activeFilters}</span>{/if}<span aria-hidden="true">{filtersOpen ? ' ▴' : ' ▾'}</span></button>
        </div>

        <div class="toolbar" class:open={filtersOpen} id="external-toolbar" role="group" aria-label="篩選與排序外部文章">
          <div class="kinds" role="group" aria-label="文章類型">
            <button type="button" class="chip" aria-pressed={kind === ''} disabled={!ready} onclick={() => (kind = '')}>全部 <span class="num">{rows.length}</span></button>
            {#each kinds as value (value)}
              {#if kindCounts[value]}
                <button type="button" class="chip" aria-pressed={kind === value} disabled={!ready} onclick={() => (kind = kind === value ? '' : value)}>{postKindLabels[value]} <span class="num">{kindCounts[value]}</span></button>
              {/if}
            {/each}
          </div>
          <div class="selects">
            <label class="teacher-select">
              <span>教師</span>
              <select bind:value={teacher} disabled={!ready}>
                <option value="">全部教師</option>
                {#each teacherCounts.filter((entry) => entry.count > 0) as entry (entry.name)}<option value={entry.name}>{teacherLabel(entry.name)}（{entry.count}）</option>{/each}
              </select>
            </label>
            {#if terms.length}
              <label>
                <span>修課學期</span>
                <select bind:value={term} disabled={!ready}>
                  <option value="">全部學期</option>
                  {#each terms as [value, count] (value)}<option {value}>{value}（{count}）</option>{/each}
                  {#if termless}<option value={noTerm}>標題沒寫學期（{termless}）</option>{/if}
                </select>
              </label>
            {/if}
            <label>
              <span>排序</span>
              <select bind:value={sort} disabled={!ready}>
                {#each Object.entries(sortLabels) as [value, label] (value)}<option {value}>{label}</option>{/each}
              </select>
            </label>
          </div>
        </div>

        {#if grouped}
          <!-- This offering's teacher gets a box of its own, so a lone question is never read as the top review. -->
          <div class="mine-box" class:empty={mineReviews === 0}>
            <h3 class="group-head" id="external-mine">{mineLine}</h3>
            {#if mineReviews === 0}<p class="mine-empty">只找到 {mineRows.length} 篇提問或討論（如下）。再往下是其他教師開同一門課的文章，內容不一定適用本班。</p>{/if}
            {@render postList(mineRows, 'external-mine', 'mine')}
          </div>
          <h3 class="group-head others" id="external-others">其他教師與標題沒寫教師・<span class="num">{otherRows.length}</span> 篇・心得評價在前</h3>
          {@render postList(otherRows, 'external-others', 'others')}
        {:else if ordered.length}
          {@render postList(ordered, undefined, `all-${teacher}-${term}-${kind}-${mineOnly}-${sort}`)}
        {:else}
          <p class="none">沒有符合條件的文章。<button type="button" class="clear" onclick={clearFilters}>清除篩選</button></p>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .external { display: grid; gap: var(--space-4); min-inline-size: 0; padding: var(--space-4) var(--space-5); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); color: var(--ink); font: var(--t-base) / var(--leading-body) var(--font-sans); }
  .external :is(h2, h3, p, ol, ul, figure) { margin: 0; }
  .external a { color: var(--brand-ink); text-underline-offset: 0.18em; }
  .external :is(a, button, select, summary):focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .num { font-variant-numeric: tabular-nums; }
  .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  h2 { font-size: var(--t-xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); }
  h3 { font-size: var(--t-sm); font-weight: 650; color: var(--ink-2); }
  button { font: inherit; cursor: pointer; touch-action: manipulation; }
  button:disabled { cursor: default; }

  /* Compact state: heading, one sentence and the search links on one wrapped line. */
  .compact { padding-block: var(--space-3); }
  .strip { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: center; }
  .strip h2 { font-size: var(--t-lg); }
  .strip-text { color: var(--ink-2); }
  .links { display: flex; flex-wrap: wrap; gap: var(--space-2); padding: 0; list-style: none; }
  .links a { display: inline-flex; align-items: center; min-block-size: var(--target-min); padding: 0 var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink) !important; font-size: var(--t-sm); font-weight: 600; text-decoration: none; white-space: nowrap; }
  .links a:hover { background: var(--hover-row); }

  /* Desktop: text and search links side by side above the summary and list; phones put the links last. */
  /* Indexed posts first; the search links for sites UniCourse does not index form their own strip last. */
  .external:not(.compact) { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'head' 'layout' 'elsewhere'; }
  .head { grid-area: head; display: grid; min-inline-size: 0; }
  .head-text { display: grid; gap: var(--space-1); min-inline-size: 0; }
  .elsewhere { grid-area: elsewhere; display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .elsewhere-label { color: var(--ink-2); font-size: var(--t-sm); }
  .layout { grid-area: layout; }
  .teacher-select { display: none !important; }
  .head-count { margin-inline-start: var(--space-2); color: var(--muted); font-size: var(--t-md); font-weight: 600; }
  .dek { display: grid; gap: 1px; padding: 0; list-style: none; color: var(--muted); font-size: var(--t-sm); overflow-wrap: anywhere; }
  .dek li::before { content: '・'; color: var(--axis); }

  .layout { display: grid; grid-template-columns: minmax(15rem, 19rem) minmax(0, 1fr); gap: var(--space-6); align-items: start; }
  .summary { display: grid; gap: var(--space-4); min-inline-size: 0; }
  .figures { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); }
  .figure { display: grid; align-content: start; justify-items: start; gap: 0.125rem; min-inline-size: 0; padding: var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--muted); font-size: var(--t-sm); text-align: start; }
  .figure:not(:disabled):hover { border-color: var(--brand); background: var(--hover-row); }
  .figure[aria-pressed='true'] { border-color: var(--brand); background: var(--brand-wash); box-shadow: inset 3px 0 0 var(--brand); }
  .figure:disabled { border-color: var(--line); }
  .fig-label { color: var(--ink-2); font-size: var(--t-xs); font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
  .figure b { color: var(--ink); font-size: var(--t-xl); font-weight: 650; }
  .block { display: grid; gap: var(--space-2); }
  .teachers { display: grid; gap: 3px; padding: 0; list-style: none; }
  .teachers.collapsible:not(:has(+ .more-teachers[open])) li.extra { display: none; }
  /* Each teacher is a visible button row: outlined, hover tint, and a brand bar on the left when chosen. */
  .teacher { display: grid; grid-template-columns: minmax(0, 7.5rem) minmax(0, 1fr) 2rem; gap: var(--space-2); align-items: center; inline-size: 100%; min-block-size: 2.25rem; padding: 0 var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font-size: var(--t-sm); text-align: start; }
  .teacher:not(:disabled):hover { border-color: var(--control-line); background: var(--hover-row); }
  .teacher[aria-pressed='true'] { border-color: var(--brand); background: var(--brand-wash); box-shadow: inset 3px 0 0 var(--brand); }
  .teacher:disabled { background: transparent; }
  .by-teacher .hint { color: var(--muted); font-size: var(--t-xs); font-weight: 500; }
  .teacher:disabled { color: var(--ink-2); }
  .teacher .name { display: inline-flex; gap: var(--space-1); align-items: center; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .here, .badge-mine { flex: none; padding: 0 6px; border-radius: var(--radius-pill); background: var(--brand-wash); color: var(--brand-ink); font-size: var(--t-xs); font-weight: 650; line-height: 1.6; }
  .teacher .bar { display: block; block-size: 8px; border-radius: var(--radius-pill); background: var(--chip); overflow: hidden; }
  .teacher .bar span { display: block; block-size: 100%; border-radius: inherit; background: color-mix(in srgb, var(--brand) 60%, var(--panel)); }
  .teacher.mine .bar span, .teacher[aria-pressed='true'] .bar span { background: var(--brand); }
  .teacher .n { color: var(--ink-2); text-align: end; }
  .more-teachers summary, .more summary { display: flex; align-items: center; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-sm); font-weight: 600; list-style: none; cursor: pointer; }
  .more-teachers summary::-webkit-details-marker, .more summary::-webkit-details-marker { display: none; }
  :is(.more-teachers, .more)[open] .closed, :is(.more-teachers, .more):not([open]) .opened { display: none; }
  .note { color: var(--muted); font-size: var(--t-xs); }

  .years figcaption { color: var(--ink-2); font-size: var(--t-sm); font-weight: 650; }
  .columns { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 3px; align-items: end; block-size: 4.5rem; padding-block-start: 1rem; border-block-end: 1px solid var(--control-line); }
  .column { position: relative; display: flex; flex-direction: column; justify-content: end; align-items: stretch; block-size: 100%; }
  .column .fill { display: block; min-block-size: 2px; border-radius: 2px 2px 0 0; background: color-mix(in srgb, var(--brand) 70%, var(--panel)); }
  .column .fill.zero { min-block-size: 0; block-size: 0; border-block-start: 2px dashed var(--control-line); border-radius: 0; background: none; }
  .column .value { position: absolute; inset-block-start: -1rem; inset-inline: 0; color: var(--muted); font-size: 0.625rem; line-height: 1rem; text-align: center; }
  .column .value.zero { color: var(--muted); opacity: 0.8; }
  .axis { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 3px; margin-block-start: 2px; color: var(--muted); font-size: 0.625rem; text-align: center; }
  .cap-range { margin-inline-start: var(--space-1); color: var(--muted); font-weight: 500; }

  .posts { display: grid; gap: var(--space-2); min-inline-size: 0; }
  .posts > .toolbar { order: -1; }
  .toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: end; justify-content: space-between; }
  .kinds { display: flex; flex-wrap: wrap; gap: var(--space-1); }
  .chip { display: inline-flex; gap: 0.35em; align-items: center; min-block-size: 2.25rem; padding: 0 var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-pill); background: var(--panel-raised); color: var(--ink-2); font-size: var(--t-sm); font-weight: 600; }
  .chip .num { color: var(--muted); font-weight: 500; }
  .chip:not(:disabled):hover { background: var(--hover-row); }
  .chip[aria-pressed='true'] { border-color: var(--brand); background: var(--brand); color: var(--on-brand); }
  .chip[aria-pressed='true'] .num { color: var(--on-brand); }
  .selects { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .selects label { display: grid; gap: 2px; color: var(--muted); font-size: var(--t-xs); font-weight: 600; }
  select { min-block-size: 2.25rem; max-inline-size: 13rem; padding: 0 var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font: 500 var(--t-sm) / 1.2 var(--font-sans); }
  .list-bar { display: flex; gap: var(--space-2); align-items: center; justify-content: space-between; }
  .status { min-block-size: 1.5rem; color: var(--muted); font-size: var(--t-sm); }
  .filter-toggle { display: none; flex: none; gap: var(--space-1); align-items: center; min-block-size: var(--target-min); padding: 0 var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font-size: var(--t-sm); font-weight: 600; }
  .filter-toggle[aria-expanded='true'] { border-color: var(--brand); }
  .filter-toggle .active { display: inline-grid; place-items: center; min-inline-size: 1.25rem; block-size: 1.25rem; padding: 0 4px; border-radius: var(--radius-pill); background: var(--brand); color: var(--on-brand); font-size: var(--t-xs); }
  .group-head { color: var(--ink-2); font-size: var(--t-sm); font-weight: 650; }
  .group-head.others { margin-block-start: var(--space-3); }
  .mine-box { display: grid; gap: var(--space-2); padding: var(--space-3); border: 1px solid color-mix(in srgb, var(--brand) 35%, var(--line)); border-radius: var(--radius-panel); background: color-mix(in srgb, var(--brand) 5%, var(--panel-raised)); }
  .mine-box .group-head { color: var(--ink); font-size: var(--t-base); }
  .mine-empty { color: var(--ink-2); font-size: var(--t-sm); }
  .mine-box .list { border-block-start: 1px solid var(--line); }
  .mine-box .list li:last-child { border-block-end: 0; }
  .grow { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: center; justify-content: center; color: var(--muted); font-size: var(--t-sm); }
  .grow-btn { min-block-size: var(--target-min); padding: 0 var(--space-4); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; }
  .grow-btn:hover { background: var(--hover-row); }
  .grow .clear { min-block-size: var(--target-min); margin: 0; }
  .title-only { padding: 0 6px; border: 1px dashed var(--control-line); border-radius: var(--radius-pill); color: var(--muted); font-size: var(--t-xs); }
  .status b { color: var(--ink); }
  .clear { margin-inline-start: var(--space-2); padding: 0; border: 0; background: none; color: var(--brand-ink); font-size: var(--t-sm); font-weight: 600; text-decoration: underline; text-underline-offset: 0.15em; }
  .none { padding: var(--space-4) 0; color: var(--ink-2); }

  .list { display: grid; padding: 0; list-style: none; border-block-start: 1px solid var(--line); }
  .list.collapsible:not(:has(+ .more[open])) li.extra { display: none; }
  .list li { border-block-end: 1px solid var(--line); }
  .list li.mine { box-shadow: inset 3px 0 0 var(--brand); }
  article { position: relative; display: grid; gap: 2px; padding: var(--space-2) var(--space-2) var(--space-3) var(--space-3); }
  .list li:hover { background: var(--hover-row); }
  .title { color: inherit; font-size: var(--t-md); font-weight: 650; line-height: 1.45; overflow-wrap: anywhere; }
  .title a { text-decoration: none; }
  .title a::after { content: ''; position: absolute; inset: 0; }
  .title a:hover { text-decoration: underline; }
  .title a:focus-visible { outline: none; }
  article:has(a:focus-visible) { outline: var(--focus-ring); outline-offset: -2px; border-radius: var(--radius-control); }
  .out { margin-inline-start: 0.25em; color: var(--muted); font-size: 0.85em; font-weight: 500; }
  .meta { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; color: var(--muted); font-size: var(--t-sm); }
  .meta .push { color: var(--up); font-weight: 650; }
  .meta .push.down { color: var(--down); }
  .excerpt { display: -webkit-box; color: var(--ink-2); font-size: var(--t-sm); line-height: 1.6; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow-wrap: anywhere; }
  .excerpt .label { margin-inline-end: 0.35em; padding: 0 4px; border-radius: 3px; background: var(--chip); color: var(--muted); font-size: var(--t-xs); font-weight: 650; }
  .excerpt .sep { color: var(--muted); }
  .more { border-block-start: 0; }
  .more summary { justify-content: center; font-size: var(--t-base); }
  .more summary:hover { background: var(--hover-row); }

  @media (max-width: 64rem) {
    .external:not(.compact) { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'head' 'layout' 'elsewhere'; }
    .layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .summary { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
    .figures { grid-column: 1 / -1; }
  }
  @media (max-width: 40rem) {
    .external { padding: var(--space-4); }
    .summary { grid-template-columns: minmax(0, 1fr); }
    .years, .by-teacher { display: none; }
    /* Phones: the three figures become one line and the filters fold behind one button, so the first
       posts follow the heading directly. */
    /* Phones: the three counts are one row of filter chips right under the heading. */
    .figures { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-1); }
    .figure { display: flex; flex-wrap: wrap; gap: 0 var(--space-1); align-items: baseline; justify-content: center; min-block-size: var(--target-min); padding: var(--space-1) var(--space-2); border-radius: var(--radius-pill); }
    .fig-label { font-size: var(--t-sm); }
    .figure b { font-size: var(--t-md); }
    .posts > .toolbar { order: 0; }
    .toolbar:not(.open) { display: none; }
    .toolbar { padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel-raised); }
    .filter-toggle { display: inline-flex; }
    .sort-note { display: none; }
    .selects label:last-child { grid-column: 1 / -1; }
    .teacher-select { display: grid !important; }
    .selects { display: grid; grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr)); }
    .chip { padding-inline: var(--space-2); }
    .toolbar { align-items: stretch; }
    .selects { flex: 1 1 100%; }
    select { inline-size: 100%; max-inline-size: none; min-block-size: var(--target-min); }
    .chip { min-block-size: var(--target-min); }
    .teacher { min-block-size: var(--target-min); }
    .links { inline-size: 100%; }
    .links li { flex: 1 1 auto; }
    .links a { inline-size: 100%; justify-content: center; }
    .title { font-size: var(--t-base); }
  }
</style>
