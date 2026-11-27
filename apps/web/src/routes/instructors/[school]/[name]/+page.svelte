<script lang="ts">
  import { page } from '$app/state';
  import { importedAt } from '$lib/format';
  import { departmentHref, instructorHref, schoolHref } from '$lib/overview-paths';
  import { meanRating, publishedEnrollment } from '$lib/schools-offerings';
  import SchoolsOfferingTable from '$lib/SchoolsOfferingTable.svelte';
  import SchoolsInstructorDiscussions from '$lib/schools-instructor-discussions.svelte';
  import SchoolsTeachingHistory from '$lib/schools-teaching-history.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import FilterBar from '$lib/ui/FilterBar.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import '$lib/schools-browse.css';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let instructor = $derived(data.instructor);
  let summary = $derived(instructor.summary);
  let base = $derived(instructorHref(instructor.school, instructor.name));
  let filtered = $derived(Boolean(data.term || data.courseCode));
  let truncated = $derived(data.listed < summary.offerings);
  let enrollment = $derived(publishedEnrollment(data.trends));
  let rating = $derived(meanRating(data.summaryRatings));
  let ratedSample = $derived([...data.summaryRatings.values()].filter((value) => value !== null).length);
  let ratingNote = $derived(`已查詢 ${displayValue(ratedSample)} 門課的評價`);
  let sortHref = $derived(changeQuery(new URL('#offerings', page.url), (params) => {
    params.delete('page');
    if (data.oldestFirst) params.delete('sort');
    else params.set('sort', 'oldest');
  }));
  let span = $derived(summary.terms.length > 1 ? `${summary.terms.at(-1)} 至 ${summary.terms[0]}` : summary.terms[0]);
  let termOptions = $derived([...new Set([...data.listedTerms, ...(data.term ? [data.term] : [])])].map((value) => ({ value, label: value })));
  let courseOptions = $derived(data.courseCode && !data.courses.some(({ value }) => value === data.courseCode)
    ? [...data.courses, { value: data.courseCode, label: data.courseCode }]
    : data.courses);

</script>

<svelte:head><title>{instructor.name} · {instructor.schoolName}｜UniCourse</title></svelte:head>

<div class="browse-page instructor-page">
  <nav class="browse-crumbs" aria-label="所在位置">
    <a href="/">首頁</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><a href={schoolHref(instructor.school)}>{instructor.schoolName}</a><span aria-hidden="true">/</span><span aria-current="page">{instructor.name}</span>
  </nav>
  <header class="browse-head">
    <div class="browse-stack">
      <h1>{instructor.name}</h1>
      <p class="browse-dek"><span>{instructor.schoolName}課程資料</span>{#if span}<span>授課學期 {span}</span>{/if}
        {#if data.updatedAt}<span>列表更新於 <time datetime={data.updatedAt}>{importedAt(data.updatedAt)}</time>（臺北時間）</span>{/if}</p>
      <details class="instructor-units">
        <summary>{#if summary.departments.length}{displayValue(summary.departments.length)} 個開課單位 · {/if}統計口徑</summary>
        {#if summary.departments.length}<p class="browse-inline browse-note">{#each summary.departments as department (department)}<a href={departmentHref(instructor.school, department)}>{department}</a>{/each}</p>{/if}
        <p class="browse-note">同校同名教師會合併顯示。評價屬於課程，不代表對單一教師的評價。</p>
      </details>
    </div>
    <div class="browse-actions">
      <a class="browse-button browse-primary" href="#offerings">看開課列表 ↓</a>
      <a class="browse-button" href="#discussions">看網路討論 ↓</a>
    </div>
  </header>

  <div class="browse-compact-stats instructor-stats"><StatRow label="歷年授課統計">
    <StatTile label="歷年開課班次" value={summary.offerings} unit="班" note={truncated ? `列表含最近 ${displayValue(data.listed)} 班` : undefined} />
    <StatTile label="歷年授課課程" value={summary.courses} unit="門" note={truncated ? `列表含 ${displayValue(data.courses.length)} 門` : undefined} />
    <StatTile label="授課學期" value={summary.terms.length} unit="期" />
    <StatTile label="累計修課" value={enrollment} unit="人次" note={enrollment !== null ? '僅計已公布' : data.trends === null ? '暫未取得' : '未公布人數'} />
    {#if rating.count}<div class="instructor-rating"><StatTile label="課程平均評價（非教師評分）" value={rating.mean} unit={`分 · ${rating.count === 1 ? '僅 1' : displayValue(rating.count)} 則`} note={ratingNote} /></div>{/if}
  </StatRow></div>

  <section class="browse-stack" aria-labelledby="history">
    <SectionHeader title="歷年授課" id="history" description="按學年比較已公布的修課人次，點選數值可查看該學年最新一班。" />
    {#if truncated}<p class="browse-note">各課程的學年統計僅計入最近 {displayValue(data.listed)} 班；完整的各學期總數列於展開區。</p>{/if}
    <SchoolsTeachingHistory periods={data.matrix.periods} rows={data.matrix.rows} trends={data.trends} />
  </section>

  <section class="browse-stack" aria-labelledby="offerings">
    <SectionHeader title={`開課列表（${displayValue(data.listed)} 班）`} id="offerings" />
    {#if truncated}<p class="browse-note">這裡可篩選最近 {displayValue(data.listed)} 班（共 {displayValue(summary.offerings)} 班）。<a href={`/?${new URLSearchParams({ school: instructor.school, term: 'all', q: instructor.name })}`}>按教師姓名查找較早班次</a></p>{/if}
    <div class="instructor-filters">
      <FilterBar action={`${base}#offerings`} label="開課列表篩選" clearHref={filtered ? `${base}#offerings` : undefined} hidden={data.oldestFirst ? { sort: 'oldest' } : {}}>
        <FilterSelect name="term" label="學期" value={data.term} options={termOptions} />
        <FilterSelect name="course" label="課程" value={data.courseCode} options={courseOptions} />
      </FilterBar>
    </div>
    {#if data.rows.length}
      <div class="offering-meta"><p class="browse-note">{displayValue(data.firstRow)}–{displayValue(data.firstRow + data.rows.length - 1)}／{displayValue(data.matched)} 班</p>
      <a class="offer-sort" href={sortHref} aria-label={`目前排序：學期由${data.oldestFirst ? '舊到新，改為由新到舊' : '新到舊，改為由舊到新'}`}>學期由{data.oldestFirst ? '舊到新 ↑' : '新到舊 ↓'}</a>
      <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="授課班次上方分頁" /></div>
      <SchoolsOfferingTable offerings={data.rows} ratings={data.summaryRatings} mode="instructor" caption="授課班次" showTerm />
      {#if !rating.count}<p class="browse-note">{ratingNote}{ratedSample ? '，目前尚無評價。' : '；目前無法取得課程評價。'}</p>{/if}
      <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="授課班次分頁" />
    {:else}
      <EmptyState title="沒有符合條件的開課班次" description={truncated ? '這個條件在已列出的班次中沒有結果。' : '試試其他學期或課程。'}>
        {#snippet action()}<a href={base}>清除篩選</a>{/snippet}
      </EmptyState>
    {/if}
  </section>

  <SchoolsInstructorDiscussions reviews={data.externalReviews} courseReviews={data.courseReviews} retryHref={`${page.url.pathname}${page.url.search}#discussions`} />
</div>

<style>
  .instructor-page { gap: var(--space-3); }
  .instructor-page .browse-crumbs + .browse-head { margin-block-start: calc(-1 * var(--space-2)); }
  .instructor-units summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand-ink); font-size: var(--t-base); }
  .instructor-units a { display: inline-grid; align-items: center; min-block-size: var(--target-min); }
  .instructor-rating :global(.tile) { height: 100%; }
  .offering-meta { display: flex; align-items: center; justify-content: space-between; gap: 0 var(--space-2); flex-wrap: wrap; }
  .offer-sort { display: inline-flex; align-items: center; min-block-size: var(--target-min); font-size: var(--t-sm); }
  .instructor-filters :global(.field) { flex: 0 1 auto; }
  .instructor-filters :global(select[name='course']) { min-inline-size: 0; max-inline-size: min(50vw, 17rem); }
  @media (max-width: 40rem) {
    .instructor-stats :global(.stat-row) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .instructor-rating { grid-column: 1 / -1; }
    .instructor-filters :global(form) { display: grid; grid-template-columns: minmax(5rem, auto) minmax(0, 1fr) auto; align-items: start; }
    .instructor-filters :global(.field) { min-inline-size: 0; }
    .instructor-filters :global(.field select) { min-inline-size: 0; max-inline-size: calc(100% - 2rem); }
    .instructor-filters :global(.actions:has(a)) { display: contents; }
    .instructor-filters :global(.actions a) { grid-column: 1 / -1; justify-self: start; }
  }
</style>
