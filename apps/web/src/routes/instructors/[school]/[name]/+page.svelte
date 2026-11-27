<script lang="ts">
  import { page } from '$app/state';
  import { importedAt, shortImportedAt } from '$lib/format';
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
  let ratingNote = $derived(`已查詢 ${displayValue(checkedCourses)} 門課`);
  const sortOptions = [{ value: 'newest', label: '學期由新到舊' }, { value: 'oldest', label: '學期由舊到新' }];
  let span = $derived(summary.terms.length > 1 ? `${summary.terms.at(-1)} 至 ${summary.terms[0]}` : summary.terms[0]);
  let termOptions = $derived([...new Set([...data.listedTerms, ...(data.term ? [data.term] : [])])].map((value) => ({ value, label: value })));
  let courseOptions = $derived(data.courseCode && !data.courses.some(({ value }) => value === data.courseCode)
    ? [...data.courses, { value: data.courseCode, label: data.courseCode }]
    : data.courses);

</script>

<svelte:head><title>{instructor.name} · {instructor.schoolName}｜UniCourse</title></svelte:head>

<div class="browse-page instructor-page">
  <nav class="browse-crumbs" aria-label="所在位置">
    <a href="/">查課</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><a href={schoolHref(instructor.school)}>{instructor.schoolName}</a><span aria-hidden="true">/</span><span aria-current="page">{instructor.name}</span>
  </nav>
  <header class="browse-head">
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
    <div class="browse-actions">
      <a class="browse-button" href="#offerings">看開課列表 ↓</a>
      <a class="browse-button" href="#discussions">{data.externalReviews?.posts.length ? '看網路討論' : '到其他網站搜尋'} ↓</a>
    </div>
  </header>

  <div class="browse-compact-stats instructor-stats"><StatRow label="歷年授課統計">
    <StatTile label="歷年開課班次" value={summary.offerings} unit="班" note={truncated ? `列表含最近 ${displayValue(data.listed)} 班` : undefined} />
    <StatTile label="歷年授課課程" value={summary.courses} unit="門" note={truncated ? `列表含 ${displayValue(data.courses.length)} 門` : undefined} />
    <StatTile label="授課學期" value={summary.terms.length} unit="期" />
    <StatTile label="累計修課" value={enrollment} unit="人次" note={enrollment !== null ? '僅計已公布' : data.trends === null ? '暫未取得' : '未公布人數'} />
  </StatRow></div>
  {#if rating.count}
    <div class="rating-summary">
      <div>
        <p><strong>{displayValue(rating.count)} 則課程評價</strong> · ★ {rating.mean} 分{#if rating.count < 3} · 樣本少{/if}</p>
        <p class="browse-note">評價以課程為單位。{ratingNote}。</p>
      </div>
      {#if data.ratedCourses.length === 1}<a href={`/courses/${data.ratedCourses[0].id}#ratings`}>看{data.ratedCourses[0].title}的課程評價 →</a>
      {:else}<details><summary>看各課程評價</summary><ul>{#each data.ratedCourses as course (course.id)}
        <li><a href={`/courses/${course.id}#ratings`}>{course.title} · {course.average.toFixed(1)} 分／{displayValue(course.count)} 則 →</a></li>
      {/each}</ul></details>{/if}
    </div>
  {:else}
    <p class="browse-note rating-summary">{checkedCourses ? `${ratingNote}，目前尚無課程評價。` : '暫時無法取得課程評價。'}</p>
  {/if}

  <section class="browse-stack" aria-labelledby="history">
    <SectionHeader title="歷年授課" id="history" description="每格為該學年已公布的修課人次，連往標示學期的最新班次。" />
    {#if truncated}<p class="browse-note">各課程的學年統計僅計入最近 {displayValue(data.listed)} 班；下方可查看完整的各學期總數。</p>{/if}
    <SchoolsTeachingHistory periods={data.matrix.periods} rows={data.matrix.rows} trends={data.trends} />
  </section>

  <section class="browse-stack" aria-labelledby="offerings">
    <SectionHeader title={`開課列表（${displayValue(data.listed)} 班）`} id="offerings" />
    {@render offeringFilters()}
    {#if truncated}<p class="browse-note">這裡可篩選最近 {displayValue(data.listed)} 班（共 {displayValue(summary.offerings)} 班）。<a href={`/?${new URLSearchParams({ school: instructor.school, term: 'all', q: instructor.name })}`}>按教師姓名查找較早班次</a></p>{/if}
    {#if data.rows.length}
      {#if data.totalPages > 1 || filtered}<p class="browse-note">{displayValue(data.firstRow)}–{displayValue(data.firstRow + data.rows.length - 1)}／{displayValue(data.matched)} 班</p>{/if}
      <SchoolsOfferingTable offerings={data.rows} groupTerms={data.termsByCourse} ratings={data.summaryRatings} mode="instructor" caption="授課班次" showTerm />
      <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="授課班次分頁" />
    {:else}
      <EmptyState title="沒有符合條件的開課班次" description={truncated ? '這個條件在已列出的班次中沒有結果。' : '試試其他學期或課程。'}>
        {#snippet action()}<a href={base}>清除篩選</a>{/snippet}
      </EmptyState>
    {/if}
  </section>

  <SchoolsInstructorDiscussions reviews={data.externalReviews} courseReviews={data.courseReviews} retryHref={`${page.url.pathname}${page.url.search}#discussions`} />
</div>

{#snippet offeringFilters()}
  <div class="instructor-filters">
    <FilterBar action={`${base}#offerings`} label="開課列表篩選" clearHref={filtered || data.oldestFirst ? `${base}#offerings` : undefined}>
      <FilterSelect name="term" label="學期" value={data.term} options={termOptions} />
      <FilterSelect name="course" label="課程" value={data.courseCode} options={courseOptions} />
      <FilterSelect name="sort" label="排序" allLabel={null} value={data.oldestFirst ? 'oldest' : 'newest'} options={sortOptions} />
    </FilterBar>
  </div>
{/snippet}

<style>
  .instructor-page { gap: var(--space-3); margin-block-start: calc(-1 * var(--space-3)); }
  .browse-head .browse-stack { gap: var(--space-1); }
  .identity { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-3); }
  .identity:has(details[open]) { display: block; }
  .instructor-stats :global(.tile) { padding-block: var(--space-2); }
  .rating-summary { display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--space-3); }
  .instructor-page .browse-crumbs + .browse-head { margin-block-start: calc(-1 * var(--space-2)); }
  .instructor-page :global(:is(#history, #offerings)) { scroll-margin-block-start: 4.5rem; }
  .instructor-units summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand-ink); font-size: var(--t-base); }
  .instructor-units a { display: inline-grid; align-items: center; min-block-size: var(--target-min); }
  .identity-note { color: var(--ink-2); }
  .rating-summary { border-inline-start: 3px solid var(--brand-ring); padding-inline-start: var(--space-2); }
  .rating-summary strong { font-size: var(--t-md); font-weight: 750; }
  .rating-summary summary { min-block-size: var(--target-min); align-content: center; cursor: pointer; color: var(--ink-2); }
  .rating-summary a { display: inline-flex; align-items: center; min-block-size: var(--target-min); }
  .rating-summary ul { margin-block: 0; padding-inline-start: var(--space-5); }
  .instructor-filters :global(.field) { flex: 0 1 auto; }
  .instructor-filters :global(select[name='course']) { min-inline-size: 0; max-inline-size: min(50vw, 17rem); }
  @media (max-width: 40rem) {
    .instructor-stats :global(.stat-row) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .instructor-filters :global(form) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
    .instructor-filters :global(.field) { min-inline-size: 0; }
    .instructor-filters :global(.field select) { min-inline-size: 0; max-inline-size: calc(100% - 2rem); }
    .instructor-filters :global(.actions:has(a)) { display: contents; }
    .instructor-filters :global(.actions a) { grid-column: 1 / -1; justify-self: start; }
  }
</style>
