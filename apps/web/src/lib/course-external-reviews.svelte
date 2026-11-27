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
  import { searchLinks } from '$lib/course-external-links';
  import { compareTerms } from '$lib/course-history';
  import { isHttpUrl } from '$lib/format';
  import Badge from '$lib/ui/Badge.svelte';
  import { displayValue } from '$lib/ui/format';

  interface Props {
    school: string;
    courseCode: string;
    /** Teachers of the offering this page shows; their posts come first. */
    instructors?: string[];
    /** Course title, so outbound searches name this offering's teacher. */
    title?: string;
    /** `/api/courses/{school}/{courseCode}/external-reviews`; `undefined` when it could not be loaded. */
    reviews: ExternalReviews | undefined;
  }

  let { school, courseCode, instructors = [], title, reviews }: Props = $props();

  /** Posts listed before「再顯示」: eight on wide screens, five on phones (set after hydration). */
  let initialPosts = $state(8);
  /** Posts each「再顯示」adds. */
  const stepPosts = 5;
  /** Teachers listed in the summary before「其他 N 位」. */
  const initialTeachers = 8;

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
  let links = $derived(searchLinks(reviews?.linkOnly.filter((link) => isHttpUrl(link.url)) ?? [], title, instructors));
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
  /** 「PTT」 for one source (its 批踢踢 suffix dropped), otherwise 外站. */
  let sourceName = $derived(sourceLabels.length === 1 ? sourceLabels[0].replace(/\s*批踢踢$/u, '') : '外站');
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
  /** The busiest year, named under the chart so the counts have an anchor without a y axis. */
  let peakYear = $derived(perYear.reduce<{ year: number; count: number } | undefined>((best, entry) => (entry.count > (best?.count ?? 0) ? entry : best), undefined));

  // Filters work after hydration; without JavaScript the default order and「顯示全部」still do.
  let ready = $state(false);
  onMount(() => {
    if (window.matchMedia('(max-width: 40rem)').matches) {
      initialPosts = 5;
      yearsOpen = false;
    }
    ready = true;
  });
  let filtersOpen = $state(false);
  let yearsOpen = $state(true);
  let teacher = $state<string>('');
  /** Only posts naming this offering's teachers (`mine`), or only everyone else's (`others`). */
  let scope = $state<'' | 'mine' | 'others'>('');
  /** Posts shown per list after hydration, keyed by list id; grows by `stepPosts`. */
  let limits = $state<Record<string, number>>({});
  let term = $state<string>('');
  let kind = $state<PostKind | ''>('');
  let sort = $state<Sort>('relevant');

  let filtered = $derived(
    rows.filter(
      (row) =>
        (!teacher || row.teachers.includes(teacher)) &&
        (!scope || row.mine === (scope === 'mine')) &&
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
  let filtering = $derived(Boolean(teacher || term || kind || scope));
  let activeFilters = $derived([teacher, term, kind, scope, sort !== 'relevant'].filter(Boolean).length);
  /**
   * The default view lists this offering's teacher in a group of its own, so a lone question by that
   * teacher is not mistaken for the top review; everyone else follows, reviews first.
   */
  let grouped = $derived(sort === 'relevant' && !filtering && mineCount > 0 && mineCount < rows.length);
  let mineRows = $derived(ordered.filter((row) => row.mine));
  let otherRows = $derived(ordered.filter((row) => !row.mine));
  let mineLine = $derived.by(() => {
    const names = instructors.join('、');
    if (mineReviews === mineRows.length) return `本班教師 ${names} 的心得評價`;
    if (mineReviews === 0) return `本班教師 ${names}：0 篇心得、${mineRows.length} 篇提問或討論`;
    return `本班教師 ${names} 的文章`;
  });

  function pickTeacher(name: string) {
    teacher = teacher === name ? '' : name;
  }

  function clearFilters() {
    scope = '';
    sort = 'relevant';
    teacher = '';
    term = '';
    kind = '';
  }

  function teacherLabel(name: string) {
    return own.has(name) ? `${name}（本班）` : name;
  }

  /** Axis label: the first and last year in full (2016), the ones between as two digits in the muted axis
      colour, so they are not read as post counts (those sit bold on the bars). */
  function shortYear(year: number, index: number) {
    return index === 0 || index === perYear.length - 1 ? String(year) : String(year).slice(-2);
  }
</script>

{#snippet linkText(link: { label: string; query: string | undefined })}
  <span class="site"><span class="site-in">在&nbsp;</span><b>{link.label}</b>&nbsp;搜尋</span>{#if link.query}<span class="query">「{link.query}」</span>{/if}<span class="out" aria-hidden="true">↗</span><span class="sr-only">（開啟外部網站）</span>
{/snippet}

{#snippet postList(items: Row[], labelledby: string | undefined, listId: string)}
  {@const preview = listId === 'others' ? Math.max(1, initialPosts - mineRows.length) : initialPosts}
  {@const limit = limits[listId] ?? preview}
  <!-- Without JavaScript every post is rendered and CSS folds the rest behind「顯示全部」; with it, the
       list grows in small batches. -->
  <ol class="list" class:collapsible={!ready && items.length > preview} aria-label={labelledby ? undefined : '外部文章'} aria-labelledby={labelledby}>
    {#each ready ? items.slice(0, limit) : items as row, index (row.key)}
      <li class:extra={index >= preview} class:mine={row.mine}>
        <article>
          <h3 class="title" title={row.post.title}>
            <a href={row.post.url} target="_blank" rel="noopener noreferrer nofollow">{row.post.title}<span class="out" aria-hidden="true">↗</span><span class="sr-only">（開啟 {row.post.sourceLabel} 原文）</span></a>
            <!-- Phones show the push count on the title line, so the meta line has room and the excerpt gets two lines. -->
            {#if row.post.pushScore}<span class="push title-push num" class:down={row.post.pushScore < 0} aria-hidden="true">推 {pushLabel(row.post.pushScore)}</span>{/if}
          </h3>
          <!-- Every post says whose class it is about: this class's teacher, another named teacher, or no teacher in the title. -->
          <p class="meta">
            {#if row.mine}<span class="badge-mine">本班教師</span>
            {:else if row.teachers.length}{#if !grouped}<span class="scope-tag">其他教師</span>{/if}<span class="post-teacher">{row.teachers.join('、')}</span>
            {:else}<span class="scope-tag unknown" title="標題沒有寫教師，無法判斷是哪一班">未標教師</span>{/if}
            {#if row.post.isDemo}<Badge label="示範資料" tone="demo" />{/if}
            {#if row.post.postedAt}<time class="num" datetime={row.post.postedAt}>{slashDate(row.post.postedAt)}</time>{/if}
            {#if row.post.term}<span class="mono">{row.post.term}</span>{/if}
            {#if boards.length > 1}<span class="board">{row.post.board}</span>{/if}
            {#if row.author}<span class="author">{row.author}</span>{/if}
            {#if !row.parts.length}
              <!-- No excerpt: a small tag on the meta line instead of a line of its own. -->
              <span class="title-only" title="這篇的開頭沒有可摘錄的心得文字，請點標題看原文">只收錄標題</span>
            {/if}
          </p>
          <!-- Wide screens: the push count is a fixed column at the right edge, so every row scans the same way. -->
          <span class="push side-push num" class:down={(row.post.pushScore ?? 0) < 0}>{#if row.post.pushScore}推 {pushLabel(row.post.pushScore)}{/if}</span>
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
  {:else if ready && limit > preview}
    <p class="grow"><button type="button" class="clear" onclick={() => (limits[listId] = preview)}>收合為前 {preview} 篇 ▴</button></p>
  {:else if !ready && items.length > preview}
    <details class="more">
      <summary><span class="closed">顯示全部 {items.length} 篇 ▾</span><span class="opened">收合為前 {preview} 篇 ▴</span></summary>
    </details>
  {/if}
{/snippet}

<section class="external" class:compact={!reviews || total === 0} id="external-reviews" aria-labelledby="external-title" data-school={school} data-course={courseCode}>
  {#if !reviews || total === 0}
    <!-- Nothing indexed (or the index is down): one line, so the sections below move up. -->
    <div class="strip">
      <div class="strip-text">
        <h2 id="external-title">外站討論</h2>
        <p class="strip-lead" role={reviews ? undefined : 'alert'}><b>{reviews ? '還沒有收錄到這門課的外站文章' : '外站討論暫時無法載入，請稍後再試'}</b></p>
      </div>
      {#if links.length}
        <ul class="links" aria-label="到其他網站搜尋">
          {#each links as link (link.source)}
            <li><a href={link.url} target="_blank" rel="noopener noreferrer nofollow">{@render linkText(link)}</a></li>
          {/each}
        </ul>
      {/if}
    </div>
  {:else}
    <header class="head">
      <div class="head-text">
        <h2 id="external-title">外站討論（{sourceName}）<span class="head-count num">{displayValue(total)} 篇{#if instructors.length && total === rows.length && mineCount < total}中，本班教師 {displayValue(mineCount)} 篇{/if}</span></h2>
        <!-- One line of provenance; how posts are sorted and what is stored sits behind ⓘ, so the first post comes up. -->
        <div class="dek">
          <p>{#if boards.length}{boards.join('、')} 板{:else}{sourceLabels.join('、')}{/if}{#if firstYear !== undefined}・發文 {firstYear}{#if lastYear !== firstYear}–{lastYear}{/if} 年{/if}</p>
          <details class="how">
            <summary><span aria-hidden="true">ⓘ</span> 收錄方式</summary>
            <ul>
              {#if kindCounts.question || kindCounts.other}<li>心得評價與提問混在一起，依標題的〔評價〕〔問題〕等分類</li>{/if}
              <li>只存標題、日期、作者帳號與開頭摘要；全文請點標題到原站</li>
            </ul>
          </details>
        </div>
      </div>
    </header>
    {#if links.length}
      <div class="elsewhere">
        <p class="elsewhere-label">沒有收錄的網站，可以直接到站上搜尋這門課：</p>
        <ul class="links" aria-label="到其他網站搜尋">
          {#each links as link (link.source)}
            <li><a href={link.url} target="_blank" rel="noopener noreferrer nofollow">{@render linkText(link)}</a></li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="layout">
      <aside class="summary" aria-label="外部文章摘要">
        <h3 class="col-head">找文章：依教師、類型篩選</h3>
        <!-- Two different filters, kept apart so nobody adds them up: this offering's teacher (a match on
             the title), then the post types (which add up to the total). -->
        <!-- This offering's teacher vs everyone else: two toggles that split the total, so a reader can go
             straight to either group. -->
        <div class="figures" role="group" aria-label="快速篩選">
          <button type="button" class="figure mine-toggle" aria-pressed={scope === 'mine'} disabled={!ready || mineCount === 0} onclick={() => (scope = scope === 'mine' ? '' : 'mine')}>
            <span class="fig-label">本班教師{#if instructors.length} {instructors.join('、')}{/if}</span>
            <span class="fig-value"><b class="num">{displayValue(mineCount)}</b><span class="fig-unit">篇</span></span>
            {#if mineCount > 0 && mineCount < rows.length}<span class="fig-act" aria-hidden="true">{scope === 'mine' ? '顯示全部' : '只看這組'}</span>{/if}
          </button>
          <button type="button" class="figure" aria-pressed={scope === 'others'} disabled={!ready || mineCount === rows.length} onclick={() => (scope = scope === 'others' ? '' : 'others')}>
            <span class="fig-label">其他教師與未標教師</span>
            <span class="fig-value"><b class="num">{displayValue(rows.length - mineCount)}</b><span class="fig-unit">篇</span></span>
            {#if mineCount > 0 && mineCount < rows.length}<span class="fig-act" aria-hidden="true">{scope === 'others' ? '顯示全部' : '只看這組'}</span>{/if}
          </button>
        </div>
        <div class="kinds" role="group" aria-label="文章類型">
          <button type="button" class="chip" aria-pressed={kind === ''} disabled={!ready} onclick={() => (kind = '')}>全部類型</button>
          {#each kinds as value (value)}
            {#if kindCounts[value]}
              <button type="button" class="chip" aria-pressed={kind === value} disabled={!ready} onclick={() => (kind = kind === value ? '' : value)}>{postKindLabels[value]} <span class="num">{kindCounts[value]}</span></button>
            {/if}
          {/each}
        </div>

        <div class="block by-teacher">
          <h3 id="external-teachers">依教師篩選 <span class="hint">點一下只看該教師</span></h3>
          <ul class="teachers" class:collapsible={teacherCounts.length > initialTeachers} aria-labelledby="external-teachers">
            {#each teacherCounts as entry, index (entry.name)}
              {@const percentage = rows.length ? (entry.count / rows.length) * 100 : 0}
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
                  <span class="bar" aria-hidden="true"><span style:width={`${percentage}%`}></span></span>
                  <span class="num n" title={`佔 ${Math.round(percentage)}%`}><b>{entry.count}</b> 篇</span>
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

      </aside>

      <div class="posts">
        <h3 class="col-head">讀文章：標題與開頭摘要，點標題看原文</h3>
        <div class="list-bar">
          <p class="status" role="status" aria-live="polite">
            {#if activeFilters}
              符合條件 <b class="num">{ordered.length}</b> 篇{#if scope === 'mine'}・本班教師{:else if scope === 'others'}・其他教師與未標教師{/if}{#if teacher}・教師 {teacherLabel(teacher)}{/if}{#if term}・{term === noTerm ? '標題沒寫學期' : term}{/if}{#if kind}・{postKindLabels[kind]}{/if}{#if sort !== 'relevant'}・{sortLabels[sort]}{/if}
              <button type="button" class="clear" onclick={clearFilters}>清除篩選</button>
            {:else if instructors.length && mineCount === 0}
              沒有找到本班教師 {instructors.join('、')} 的文章；下面是其他教師開這門課的文章，心得評價在前。
            {:else if total > rows.length}
              此處列出最近 {displayValue(rows.length)} 篇
            {:else}
              全部 <b class="num">{displayValue(rows.length)}</b> 篇・{sort === 'relevant' && mineCount ? '本班教師在前' : sortLabels[sort]}
            {/if}
          </p>
          <button
            type="button"
            class="filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls="external-toolbar"
            disabled={!ready}
            onclick={() => (filtersOpen = !filtersOpen)}
          >教師、學期與排序{#if activeFilters}<span class="active num">{activeFilters}</span>{/if}<span aria-hidden="true">{filtersOpen ? ' ▴' : ' ▾'}</span></button>
        </div>

        <div class="toolbar" class:open={filtersOpen} id="external-toolbar" role="group" aria-label="篩選與排序外部文章">
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

        {#if perYear.length > 1}
          <!-- Posts per year: a short strip above the list on wide screens; phones fold it after the list. -->
          <details class="years-box" bind:open={yearsOpen}>
            <summary>每年發文數 <span class="cap-range num">{perYear[0].year}–{perYear.at(-1)?.year}・最多 {peakYear?.count} 篇</span></summary>
            <figure class="years">
              <figcaption>每年發文數（篇）{#if peakYear}<span class="cap-range num">最多 {peakYear.count} 篇（{peakYear.year}）</span>{/if}</figcaption>
              <div class="columns" role="img" aria-label={`每年發文數：${perYear.map((entry) => `${entry.year} 年 ${entry.count} 篇`).join('、')}`}>
                {#each perYear as entry (entry.year)}
                  <!-- A year without indexed posts says 0 on the baseline, so it is not read as missing data. -->
                  <span class="column" class:zero={!entry.count} title={`${entry.year} 年 ${entry.count} 篇`}>
                    {#if entry.count}
                      <span class="value num" style:inset-block-end={`${(entry.count / yearMax) * 100}%`}>{entry.count}</span>
                      <span class="fill" style:height={`max(3px, ${(entry.count / yearMax) * 100}%)`}></span>
                    {:else}<span class="value num">0</span>{/if}
                  </span>
                {/each}
              </div>
              <div class="axis num" aria-hidden="true">{#each perYear as entry, index (entry.year)}<span>{shortYear(entry.year, index)}</span>{/each}</div>
            </figure>
          </details>
        {/if}

        {#if grouped}
          <!-- This offering's teacher gets a box of its own, so a lone question is never read as the top review. -->
          <div class="mine-box" class:empty={mineReviews === 0}>
            <h3 class="group-head" id="external-mine">{mineLine}</h3>
            {#if mineReviews === 0}<p class="mine-empty">以下其他教師的文章，不一定適用本班。</p>{/if}
            {@render postList(mineRows, 'external-mine', 'mine')}
          </div>
          <h3 class="group-head others" id="external-others">其他教師與標題沒寫教師・心得評價在前</h3>
          {@render postList(otherRows, 'external-others', 'others')}
        {:else if ordered.length}
          {@render postList(ordered, undefined, `all-${teacher}-${term}-${kind}-${scope}-${sort}`)}
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
  h3 { font-size: 0.8125rem; font-weight: 650; color: var(--ink-2); }
  button { font: inherit; cursor: pointer; touch-action: manipulation; }
  button:disabled { cursor: default; }

  /* Compact state: heading, one sentence and the search links on one wrapped line. */
  .compact { padding-block: var(--space-3); }
  /* Empty state (states.md): heading, one bold sentence, a line of explanation, then the search buttons. */
  .strip { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-4); }
  .strip h2 { font-size: var(--t-lg); }
  .strip-text { display: grid; gap: var(--space-1); flex: 1 1 20rem; }
  .strip-lead { color: var(--ink); font-size: var(--t-md); }
  .strip-lead b { font-weight: 650; }
  .links { display: flex; flex-wrap: wrap; gap: var(--space-2); padding: 0; list-style: none; }
  /* Labels may wrap inside their own box (the site name never breaks), so a long one cannot spill out. */
  .links a { display: inline-flex; flex-wrap: wrap; gap: 0 0.25em; align-items: center; min-block-size: var(--target-min); padding: var(--space-1) var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink) !important; font-size: 0.8125rem; font-weight: 500; line-height: 1.35; text-decoration: none; overflow-wrap: anywhere; }
  .links li { min-inline-size: 0; }
  .links .site { min-inline-size: 0; }
  .links .site b { font-weight: 650; }
  .links .out { color: var(--muted); }
  .links a:hover { background: var(--hover-row); }

  /* Desktop: text and search links side by side above the summary and list; phones put the links last. */
  /* Indexed posts first; the search links for sites UniCourse does not index form their own strip last. */
  .external:not(.compact) { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'head' 'layout' 'elsewhere'; }
  .head { grid-area: head; display: grid; min-inline-size: 0; }
  .head-text { display: grid; gap: var(--space-1); min-inline-size: 0; }
  .elsewhere { grid-area: elsewhere; display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .elsewhere-label { color: var(--ink-2); font-size: 0.8125rem; }
  .layout { grid-area: layout; }
  .teacher-select { display: none !important; }
  .head-count { margin-inline-start: var(--space-2); color: var(--muted); font-size: var(--t-md); font-weight: 600; }
  .dek { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: baseline; color: var(--ink-2); font-size: 0.8125rem; overflow-wrap: anywhere; }
  .how summary { display: inline-flex; gap: 0.25em; align-items: center; min-block-size: var(--target-min); color: var(--ink-2); font-weight: 600; list-style: none; cursor: pointer; }
  .how summary::-webkit-details-marker { display: none; }
  .how summary:hover { color: var(--brand-ink); }
  .how ul { padding: 0; list-style: none; }
  .how li::before { content: '・'; color: var(--axis); }
  .how[open] { flex-basis: 100%; }
  .query { font-weight: 500; }

  .layout { display: grid; grid-template-columns: minmax(15rem, 19rem) minmax(0, 1fr); gap: var(--space-6); align-items: start; }
  /* Finding (filters, left) and reading (posts, right) are two columns with their own heads and a rule between. */
  .layout > .posts { padding-inline-start: var(--space-6); border-inline-start: 1px solid var(--line); }
  /* The summary column follows the reader down the long post list instead of ending in blank space. */
  .layout > .summary { position: sticky; inset-block-start: 4.75rem; }
  .summary { display: grid; gap: var(--space-4); min-inline-size: 0; }
  .figures { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-2); }
  .figure { display: grid; align-content: start; justify-items: start; gap: 0.125rem; min-inline-size: 0; padding: var(--space-2) var(--space-3); border: 1px solid color-mix(in srgb, var(--brand) 35%, var(--line)); border-radius: var(--radius-control); background: color-mix(in srgb, var(--brand) 5%, var(--panel-raised)); color: var(--ink-2); font-size: 0.8125rem; text-align: start; }
  .fig-value { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-1); align-items: baseline; }
  .figure:not(:disabled):hover { border-color: var(--brand); background: var(--hover-row); }
  .figure[aria-pressed='true'] { border-color: var(--brand); background: var(--brand-wash); box-shadow: inset 3px 0 0 var(--brand); }
  .figure:disabled { border-color: var(--line); }
  .fig-label { color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
  .figure b { color: var(--ink); font-size: var(--t-xl); font-weight: 650; }
  .fig-unit { margin-inline-start: 0.25em; }
  .fig-act { color: var(--brand-ink); font-size: 0.8125rem; font-weight: 600; }
  .col-head { color: var(--ink); font-size: var(--t-base); font-weight: 650; }
  .title-push { display: none; margin-inline-start: var(--space-2); font-size: 0.8125rem; white-space: nowrap; }
  .block { display: grid; gap: var(--space-2); }
  .teachers { display: grid; gap: 3px; padding: 0; list-style: none; }
  .teachers.collapsible:not(:has(+ .more-teachers[open])) li.extra { display: none; }
  /* Each teacher is a visible button row: outlined, hover tint, and a brand bar on the left when chosen. */
  .teacher { display: grid; grid-template-columns: minmax(0, 7rem) minmax(0, 1fr) 3.25rem; gap: var(--space-2); align-items: center; inline-size: 100%; min-block-size: 2.25rem; padding: 0 var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font-size: 0.8125rem; text-align: start; }
  .teacher:not(:disabled):hover { border-color: var(--control-line); background: var(--hover-row); }
  .teacher[aria-pressed='true'] { border-color: var(--brand); background: var(--brand-wash); box-shadow: inset 3px 0 0 var(--brand); }
  .teacher:disabled { background: transparent; }
  .by-teacher .hint { color: var(--muted); font-size: 0.8125rem; font-weight: 500; }
  .teacher:disabled { color: var(--ink-2); }
  .teacher .name { display: inline-flex; gap: var(--space-1); align-items: center; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .here, .badge-mine, .scope-tag { flex: none; padding: 0 6px; border-radius: var(--radius-pill); background: var(--brand-wash); color: var(--brand-ink); font-size: 0.8125rem; font-weight: 650; line-height: 1.6; }
  .scope-tag { background: var(--chip); color: var(--ink-2); font-weight: 600; }
  .scope-tag.unknown { background: none; box-shadow: inset 0 0 0 1px var(--control-line); }
  .teacher .bar { display: block; block-size: 8px; border-radius: var(--radius-pill); background: var(--chip); overflow: hidden; }
  .teacher .bar span { display: block; min-inline-size: 4px; block-size: 100%; border-radius: inherit; background: color-mix(in srgb, var(--brand) 60%, var(--panel)); }
  .teacher.mine .bar span, .teacher[aria-pressed='true'] .bar span { background: var(--brand); }
  .teacher .n { color: var(--ink-2); font-size: var(--t-base); text-align: end; white-space: nowrap; }
  .teacher .n b { color: var(--ink); font-size: var(--t-md); font-weight: 650; }
  .more-teachers summary, .more summary { display: flex; align-items: center; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .more-teachers summary::-webkit-details-marker, .more summary::-webkit-details-marker { display: none; }
  :is(.more-teachers, .more)[open] .closed, :is(.more-teachers, .more):not([open]) .opened { display: none; }
  .note { color: var(--ink-2); font-size: 0.8125rem; }

  /* Wide screens: the per-year strip sits open above the list (its summary hidden), 64 px of bars. */
  .years-box > summary { display: none; }
  .years-box { padding-block-end: var(--space-2); border-block-end: 1px solid var(--line); }
  .years { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0 var(--space-4); align-items: end; }
  .years > .columns, .years > .axis { grid-column: 2; }
  .years figcaption { grid-row: 1 / span 2; align-self: center; display: grid; color: var(--ink-2); font-size: 0.8125rem; font-weight: 650; }
  .columns { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 3px; align-items: end; block-size: 4rem; padding-block-start: 1rem; border-block-end: 1px solid var(--control-line); }
  .column { position: relative; display: flex; flex-direction: column; justify-content: end; align-items: stretch; block-size: 100%; }
  .column .fill { display: block; min-block-size: 2px; border-radius: 2px 2px 0 0; background: color-mix(in srgb, var(--brand) 70%, var(--panel)); }
  .column .value { position: absolute; inset-inline: 0; color: var(--ink); font-size: 0.8125rem; font-weight: 600; line-height: 1rem; text-align: center; }
  .column.zero .value { inset-block-end: 2px; color: var(--muted); font-weight: 500; }
  .axis { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 3px; margin-block-start: 2px; color: var(--ink-2); font-size: var(--t-sm); text-align: center; white-space: nowrap; }
  .axis span:first-child { text-align: start; }
  .axis span:last-child { text-align: end; }
  .cap-range { margin-inline-start: var(--space-1); color: var(--ink-2); font-weight: 500; }

  .posts { display: grid; gap: var(--space-2); min-inline-size: 0; }
  .posts > .toolbar { order: -1; }
  .posts > .years-box { order: -1; }
  .posts > .col-head { order: -2; }
  .toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: end; justify-content: space-between; }
  .kinds { display: flex; flex-wrap: wrap; gap: var(--space-1); }
  .summary > .kinds { margin-block-start: calc(-1 * var(--space-2)); }
  .chip { display: inline-flex; gap: 0.35em; align-items: center; min-block-size: 2.25rem; padding: 0 var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-pill); background: var(--panel-raised); color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; }
  .chip .num { color: var(--ink-2); font-weight: 500; }
  .chip:not(:disabled):hover { background: var(--hover-row); }
  .chip[aria-pressed='true'] { border-color: var(--brand); background: var(--brand); color: var(--on-brand); }
  .chip[aria-pressed='true'] .num { color: var(--on-brand); }
  .selects { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .selects label { display: grid; gap: 2px; color: var(--ink-2); font-size: 0.8125rem; font-weight: 600; }
  select { min-block-size: 2.25rem; max-inline-size: 13rem; padding: 0 var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font: 500 0.8125rem / 1.2 var(--font-sans); }
  .list-bar { display: flex; gap: var(--space-2); align-items: center; justify-content: space-between; }
  .status { min-block-size: 1.5rem; color: var(--ink-2); font-size: 0.8125rem; }
  .filter-toggle { display: none; flex: none; gap: var(--space-1); align-items: center; min-block-size: var(--target-min); padding: 0 var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font-size: 0.8125rem; font-weight: 600; }
  .filter-toggle[aria-expanded='true'] { border-color: var(--brand); }
  .filter-toggle .active { display: inline-grid; place-items: center; min-inline-size: 1.25rem; block-size: 1.25rem; padding: 0 4px; border-radius: var(--radius-pill); background: var(--brand); color: var(--on-brand); font-size: 0.8125rem; }
  .group-head { color: var(--ink-2); font-size: 0.8125rem; font-weight: 650; }
  .group-head.others { margin-block-start: var(--space-3); }
  .mine-box { display: grid; gap: var(--space-2); padding: var(--space-3); border: 1px solid color-mix(in srgb, var(--brand) 35%, var(--line)); border-radius: var(--radius-panel); background: color-mix(in srgb, var(--brand) 5%, var(--panel-raised)); }
  .mine-box .group-head { color: var(--ink); font-size: var(--t-base); }
  .mine-empty { color: var(--ink-2); font-size: 0.8125rem; }
  .mine-box .list { border-block-start: 1px solid var(--line); }
  .mine-box .list li:last-child { border-block-end: 0; }
  .grow { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: center; justify-content: center; color: var(--ink-2); font-size: 0.8125rem; }
  .grow-btn { min-block-size: var(--target-min); padding: 0 var(--space-4); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; }
  .grow-btn:hover { background: var(--hover-row); }
  .grow .clear { min-block-size: var(--target-min); margin: 0; }
  .meta .title-only { padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: 0.8125rem; line-height: 1.5; }
  /* Another teacher's post names that teacher in ink, so the list can be scanned by teacher. */
  .meta .post-teacher { color: var(--ink); font-weight: 600; }
  .status b { color: var(--ink); }
  .clear { margin-inline-start: var(--space-2); padding: 0 var(--space-1); min-block-size: var(--target-min); border: 0; background: none; color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; text-decoration: underline; text-underline-offset: 0.15em; }
  .none { padding: var(--space-4) 0; color: var(--ink-2); }

  .list { display: grid; padding: 0; list-style: none; border-block-start: 1px solid var(--line); }
  .list.collapsible:not(:has(+ .more[open])) li.extra { display: none; }
  .list li { border-block-end: 1px solid var(--line); }
  .list li.mine { box-shadow: inset 3px 0 0 var(--brand); }
  article { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 4rem; gap: 2px var(--space-3); padding: var(--space-2) var(--space-2) var(--space-3) var(--space-3); }
  article > :not(.side-push) { grid-column: 1; }
  .side-push { grid-column: 2; grid-row: 1 / span 3; align-self: start; padding-block-start: 0.2rem; font-size: var(--t-base); text-align: end; white-space: nowrap; }
  .list li:hover { background: var(--hover-row); }
  .title { color: inherit; font-size: var(--t-md); font-weight: 650; line-height: 1.45; overflow-wrap: anywhere; }
  .title a { text-decoration: none; }
  .title a::after { content: ''; position: absolute; inset: 0; }
  .title a:hover { text-decoration: underline; }
  .title a:focus-visible { outline: none; }
  article:has(a:focus-visible) { outline: var(--focus-ring); outline-offset: -2px; border-radius: var(--radius-control); }
  .out { margin-inline-start: 0.25em; color: var(--ink-2); font-weight: 500; }
  .meta { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; color: var(--ink-2); font-size: var(--t-base); }
  .meta .author { color: var(--ink-2); }
  .push { color: var(--up); font-weight: 650; }
  .push.down { color: var(--down); }
  .excerpt { display: -webkit-box; color: var(--ink-2); font-size: var(--t-base); line-height: 1.6; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow-wrap: anywhere; }
  .excerpt .label { margin-inline-end: 0.35em; padding: 0 4px; border-radius: 3px; background: var(--chip); color: var(--ink-2); font-size: 0.8125rem; font-weight: 650; }
  .excerpt .sep { color: var(--muted); }
  .more { border-block-start: 0; }
  .more summary { justify-content: center; font-size: var(--t-base); }
  .more summary:hover { background: var(--hover-row); }

  @media (max-width: 64rem) {
    .external:not(.compact) { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'head' 'layout' 'elsewhere'; }
    .layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .layout > .summary { position: static; }
    .layout > .posts { padding-inline-start: 0; border-inline-start: 0; }
    .col-head { grid-column: 1 / -1; }
    .summary { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
    .figures { grid-column: 1 / -1; }
  }
  @media (max-width: 39rem) {
    .list-bar { --external-header-height: calc(2 * var(--target-min) + var(--space-1) + 1px); }
  }
  @media (max-width: 40rem) {
    .external { padding: var(--space-3); gap: var(--space-3); }
    .summary { grid-template-columns: minmax(0, 1fr); }
    /* Phones keep the teacher toggle, the type chips and the per-year chart; the teacher list is the
       select under 「教師、學期與排序」. */
    .by-teacher { display: none; }
    .figure { min-block-size: var(--target-min); }
    .figure b { font-size: var(--t-lg); }
    .columns { block-size: 3.5rem; }
    /* Phones: the per-year chart folds after the list behind a named summary. */
    .posts > .years-box { order: 3; }
    .elsewhere .links { flex: 1 1 100%; }
    .years-box { padding-block: 0; border-block: 1px solid var(--line); }
    .years-box > summary { display: flex; gap: var(--space-2); align-items: center; justify-content: space-between; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
    .years-box > summary::-webkit-details-marker { display: none; }
    .years-box > summary::after { content: '▾'; }
    .years-box[open] > summary::after { content: '▴'; }
    .years-box > summary .cap-range { margin-inline-end: auto; font-size: 0.8125rem; }
    .years { display: block; padding-block-end: var(--space-2); }
    .years figcaption { display: none; }
    .posts > .toolbar { order: 0; }
    /* The page's jump chips already stick under the header, so the list bar stays in flow. */
    .list-bar { padding-block: var(--space-1); }
    .list-bar .status { flex: 1 1 8rem; }
    .list-bar:has(.filter-toggle[aria-expanded='true']) { position: static; }
    .meta :is(.author, .board, .title-only) { display: none; }
    .meta { gap: 0 var(--space-2); }
    .meta .post-teacher { max-inline-size: 8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    article { padding-block: var(--space-2); }
    .excerpt { -webkit-line-clamp: 2; line-clamp: 2; }
    .side-push { display: none; }
    article { grid-template-columns: minmax(0, 1fr); }
    .title-push { display: inline; }
    .col-head { display: none; }
    .toolbar:not(.open) { display: none; }
    .toolbar { padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel-raised); }
    .filter-toggle { display: inline-flex; }
    .selects label:last-child { grid-column: 1 / -1; }
    .teacher-select { display: grid !important; }
    .selects { display: grid; grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr)); }
    .chip { padding-inline: var(--space-2); }
    .toolbar { align-items: stretch; }
    .selects { flex: 1 1 100%; }
    select { inline-size: 100%; max-inline-size: none; min-block-size: var(--target-min); }
    .chip { min-block-size: var(--target-min); }
    .teacher { min-block-size: var(--target-min); }
    /* The other sites as one compact row of equal buttons (site name only; the query is in the link). */
    .links { display: grid; grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr)); }
    .links a { justify-content: center; max-inline-size: 100%; padding-inline: var(--space-2); text-align: center; }
    .links .query { display: none; }
    /* 「在」 stays in the accessible name; only its pixels go on phones. */
    .links .site-in { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .strip .links { flex: 1 1 100%; }
    /* The post list comes before the per-year chart; the type chips and the two scope toggles stay on top. */
    .summary { display: contents; }
    .layout { display: flex; flex-direction: column; align-items: stretch; }
    .posts { order: 1; }
    .figures { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .title { font-size: var(--t-base); }
  }
</style>
