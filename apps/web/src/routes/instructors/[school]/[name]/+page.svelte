<script lang="ts">
  import { page } from '$app/state';
  import { importedAt, shortImportedAt } from '$lib/format';
  import { departmentHref, instructorHref, schoolHref } from '$lib/overview-paths';
  import { meanRating, publishedEnrollment } from '$lib/schools-offerings';
  import SchoolsOfferingTable from '$lib/schools-offering-table.svelte';
  import SchoolsInstructorDiscussions from '$lib/schools-instructor-discussions.svelte';
  import SchoolsTeachingHistory from '$lib/schools-teaching-history.svelte';
  import SchoolsSectionLinks from '$lib/schools-section-links.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import FilterBar from '$lib/ui/FilterBar.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import { displayValue } from '$lib/ui/format';
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
  let checkedCourses = $derived([...data.summaryRatings.values()].filter((value) => value !== null).length);
  let ratingNote = $derived(checkedCourses
    ? `${displayValue(checkedCourses)} 門中，${displayValue(data.ratedCourses.length)} 門有評價`
    : '暫未取得課評');
  const sortOptions = [{ value: 'newest', label: '新學期優先' }, { value: 'oldest', label: '舊學期優先' }];
  let span = $derived(summary.terms.length > 1 ? `${summary.terms.at(-1)} 至 ${summary.terms[0]}` : summary.terms[0]);
  let termOptions = $derived([...new Set([...data.listedTerms, ...(data.term ? [data.term] : [])])].map((value) => ({ value, label: value })));
  let courseOptions = $derived(data.courseCode && !data.courses.some(({ value }) => value === data.courseCode)
    ? [...data.courses, { value: data.courseCode, label: data.courseCode }]
    : data.courses);
  let ratedCourses = $state<HTMLDetailsElement>();
  const ratedCourseHref = (code: string) => `${base}?${new URLSearchParams({ course: code })}#offerings`;
</script>

<svelte:head><title>{instructor.name} · {instructor.schoolName}｜UniCourse</title></svelte:head>

<div class="browse-page instructor-page">
  <nav class="browse-crumbs" aria-label="所在位置">
    <a href="/">查課</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><a href={schoolHref(instructor.school)}>{instructor.schoolName}</a><span aria-hidden="true">/</span><span aria-current="page">{instructor.name}</span>
  </nav>
  <header class="browse-head" id="instructor-top" tabindex="-1">
    <div class="browse-stack">
      <h1>{instructor.name}</h1>
      <p class="browse-dek"><span>{instructor.schoolName}課程資料</span>{#if span}<span>授課學期 {span}</span>{/if}
        {#if data.updatedAt}<span>列表更新於 <time datetime={data.updatedAt} title={importedAt(data.updatedAt)}>{shortImportedAt(data.updatedAt)}</time>・臺北時間</span>{/if}</p>
      <div class="identity">
        <p class="browse-note identity-note">同校同名教師合併顯示。</p>
        {#if summary.departments.length}
          <details class="instructor-units">
            <summary>{displayValue(summary.departments.length)} 個開課單位</summary>
            <p class="browse-inline browse-note">{#each summary.departments as department (department)}<a href={departmentHref(instructor.school, department)}>{department}</a>{/each}</p>
          </details>
        {/if}
      </div>
    </div>
  </header>
  <SchoolsSectionLinks sections={[
    { id: 'history', label: '歷年授課' },
    { id: 'offerings', label: '開課列表' },
    { id: 'discussions', label: data.externalReviews?.posts.length ? '看網路討論' : '外站搜尋' }
  ]} />

  <div class="browse-compact-stats instructor-stats"><StatRow label="歷年授課與課程評價">
    <StatTile label="歷年開課" value={summary.offerings} unit="班">
      {#snippet detail()}<span class="course-count">{displayValue(summary.courses)} 門課</span>{/snippet}
    </StatTile>
    <StatTile label="授課學期" value={summary.terms.length} unit="期" />
    <StatTile label="累計修課" value={enrollment} unit="人次" note={enrollment !== null ? '僅計已公布' : data.trends === null ? '暫未取得' : '未公布人數'} />
    {#if data.ratedCourses.length === 1}
      {@const course = data.ratedCourses[0]}
      <a class="rating-tile" href={ratedCourseHref(course.courseCode)} title={`查看「${course.title}」班次與課程評價`}>
        {@render ratingTile()}
      </a>
    {:else if data.ratedCourses.length > 1}
      <a class="rating-tile" href="#rated-courses" onclick={() => { if (ratedCourses) ratedCourses.open = true; }}>
        {@render ratingTile()}
      </a>
    {:else}
      {@render ratingTile()}
    {/if}
  </StatRow></div>
  <section class="browse-stack instructor-section history-section" aria-labelledby="history">
    <SectionHeader title="歷年授課" id="history" />
    {#if truncated}<p class="browse-note">各課程的學年統計僅計入最近 {displayValue(data.listed)} 班；下方可查看完整的各學期總數。</p>{/if}
    <SchoolsTeachingHistory periods={data.matrix.periods} rows={data.matrix.rows} trends={data.trends} />
  </section>

  <section class="browse-stack instructor-section offering-section" aria-labelledby="offerings">
    <SectionHeader title={`開課列表（${displayValue(data.listed)} 班）`} id="offerings" />
    {@render offeringFilters()}
    {#if data.ratedCourses.length > 1}
      <details class="rating-courses" id="rated-courses" bind:this={ratedCourses}>
        <summary>查看有評價的課程</summary>
        <ul>{#each data.ratedCourses as course (course.id)}
          <li><a href={ratedCourseHref(course.courseCode)}>{course.title} · {course.average.toFixed(1)} 分／{displayValue(course.count)} 則 →</a></li>
        {/each}</ul>
      </details>
    {/if}
    {#if truncated}<p class="browse-note">這裡可篩選最近 {displayValue(data.listed)} 班（共 {displayValue(summary.offerings)} 班）。<a href={`/?${new URLSearchParams({ school: instructor.school, term: 'all', q: instructor.name })}`}>按教師姓名查找較早班次</a></p>{/if}
    {#if data.rows.length}
      {#if data.totalPages > 1 || filtered}<p class="browse-note">{displayValue(data.firstRow)}–{displayValue(data.firstRow + data.rows.length - 1)}／{displayValue(data.matched)} 班</p>{/if}
      <SchoolsOfferingTable offerings={data.rows} groupTerms={data.termsByCourse} ratings={data.summaryRatings} mode="instructor" caption="授課班次" oldestFirst={data.oldestFirst} showTerm />
      <Pagination url={new URL('#offerings', page.url)} page={data.page} totalPages={data.totalPages} label="授課班次分頁" />
    {:else}
      <EmptyState title="沒有符合條件的開課班次" description={truncated ? '這個條件在已列出的班次中沒有結果。' : '試試其他學期或課程。'}>
        {#snippet action()}<a href={base}>清除篩選</a>{/snippet}
      </EmptyState>
    {/if}
  </section>

  <div class="instructor-section discussion-section">
    <SchoolsInstructorDiscussions reviews={data.externalReviews} courseReviews={data.courseReviews} searchQuery={`${instructor.name} ${instructor.schoolName}`} retryHref={`${page.url.pathname}${page.url.search}#discussions`} />
  </div>
  <a class="back-to-top" href="#instructor-top">↑ 回到頂端</a>
</div>

{#snippet ratingTile()}
  <StatTile label={data.ratedCourses.length ? '課程評價（跨班） →' : '課程評價（跨班）'} value={checkedCourses ? rating.count : null} unit="則"
    note={rating.count === 0 && checkedCourses ? `已查 ${displayValue(checkedCourses)} 門課` : ratingNote}>
    {#snippet detail()}
      {#if rating.count}<span class="rating-value">★ {rating.mean} 分{#if rating.count < 3} · 樣本少{/if}</span>{/if}
    {/snippet}
  </StatTile>
{/snippet}

{#snippet offeringFilters()}
  <div class="instructor-filters">
    <FilterBar action={`${base}#offerings`} label="開課列表篩選" clearHref={filtered || data.oldestFirst ? `${base}#offerings` : undefined}>
      <FilterSelect name="term" label="學期" value={data.term} options={termOptions} />
      <FilterSelect name="course" label="課程" value={data.courseCode} options={courseOptions} />
      <FilterSelect name="sort" label="分組排序" allLabel={null} value={data.oldestFirst ? 'oldest' : 'newest'} options={sortOptions} />
    </FilterBar>
  </div>
{/snippet}

<style>
  .instructor-page { --t-sm: max(13px, .75rem); --t-xs: max(13px, .6875rem); gap: var(--space-3); margin-block-start: calc(-1 * var(--space-3)); }
  .browse-head .browse-stack { gap: var(--space-1); }
  .identity { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-3); }
  .identity:has(details[open]) { display: block; }
  .instructor-stats :global(.tile) { min-block-size: 100%; padding-block: var(--space-2); }
  .rating-tile { display: grid; color: inherit; text-decoration: none; border-radius: var(--radius-panel); }
  .rating-tile :global(dt) { color: var(--brand-ink); }
  .rating-tile:is(:hover, :focus-visible) :global(.tile) { border-color: var(--brand); }
  .course-count, .rating-value { color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .rating-value { white-space: normal; }
  .rating-courses summary, .rating-courses a { min-block-size: var(--target-min); align-content: center; color: var(--brand-ink); }
  .rating-courses summary { width: fit-content; cursor: pointer; }
  .rating-courses a { display: inline-grid; }
  .rating-courses ul { margin: 0; padding-inline-start: var(--space-5); }
  .instructor-page .browse-crumbs + .browse-head { margin-block-start: calc(-1 * var(--space-2)); }
  .instructor-page :global(:is(#instructor-top, #history, #offerings, #discussions, #rated-courses)) { scroll-margin-block-start: 4.5rem; }
  .instructor-section { margin-block-start: var(--space-3); padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); }
  .instructor-page :global(.browse-note) { text-wrap: pretty; }
  .instructor-page :global(.state .action a) { display: inline-flex; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); }
  .instructor-page :global(.section-header p) { text-wrap: balance; }
  .back-to-top { display: inline-grid; align-items: center; justify-self: start; min-block-size: var(--target-min); }
  .instructor-units summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand-ink); font-size: var(--t-base); }
  .instructor-units a { display: inline-grid; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); }
  .identity-note { color: var(--ink-2); }
  .instructor-filters :global(.field) { flex: 0 1 auto; }
  .instructor-filters :global(select[name='course']) { min-inline-size: 0; max-inline-size: min(50vw, 17rem); }
  @media (min-width: 40.0625rem) {
    .instructor-page { grid-template-areas: 'crumbs crumbs' 'heading links' 'stats stats' 'history history' 'offerings offerings' 'discussions discussions' 'top top'; grid-template-columns: minmax(0, 1fr) auto; }
    .browse-crumbs { grid-area: crumbs; }
    .browse-head { grid-area: heading; }
    .instructor-stats { grid-area: stats; }
    .instructor-section { margin-block-start: var(--space-1); }
    .history-section { grid-area: history; }
    .offering-section { grid-area: offerings; }
    .discussion-section { grid-area: discussions; }
    .back-to-top { grid-area: top; }
  }
  @media (max-width: 40rem) {
    .browse-crumbs a { min-inline-size: var(--target-min); justify-content: center; }
    .browse-head { gap: var(--space-1); }
    .instructor-stats :global(.stat-row) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .instructor-stats :global(.detail) { margin-inline-start: 0; }
    .instructor-filters :global(form) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
    .instructor-filters :global(.field) { min-inline-size: 0; }
    .instructor-filters :global(.field select) { min-inline-size: 0; max-inline-size: 100%; }
    .instructor-filters :global(.actions:has(a)) { display: contents; }
    .instructor-filters :global(.actions a) { grid-column: 1 / -1; justify-self: start; }
  }
  @media (max-width: 39rem) {
    .instructor-page :global(:is(#instructor-top, #history, #offerings, #discussions, #rated-courses)) { scroll-margin-block-start: 3rem; }
  }
  @media (39rem < width <= 40rem) {
    .instructor-page :global(:is(#instructor-top, #history, #offerings, #discussions, #rated-courses)) { scroll-margin-block-start: 7.5rem; }
  }
</style>
