<script lang="ts">
  import { page } from '$app/state';
  import { importedAt } from '$lib/format';
  import { departmentHref, instructorHref, schoolHref } from '$lib/overview-paths';
  import { meanRating, publishedEnrollment } from '$lib/schools-offerings';
  import SchoolsOfferingTable from '$lib/SchoolsOfferingTable.svelte';
  import DotMatrix from '$lib/ui/DotMatrix.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import FilterBar from '$lib/ui/FilterBar.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import TrendChart from '$lib/ui/TrendChart.svelte';
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
  let ratingNote = $derived(rating.count ? `${displayValue(rating.count)} 則 · 課程評價` : [...data.summaryRatings.values()].some((value) => value !== null) ? '所查課程尚無評價' : '暫未取得評價');
  let span = $derived(summary.terms.length > 1 ? `${summary.terms.at(-1)} 至 ${summary.terms[0]}` : summary.terms[0]);
  let externalQuery = $derived(`${instructor.name} ${instructor.schoolName}`);
  let termOptions = $derived([...new Set([...summary.terms, ...(data.term ? [data.term] : [])])].map((value) => ({ value, label: value })));
  let courseOptions = $derived(data.courseCode && !data.courses.some(({ value }) => value === data.courseCode)
    ? [...data.courses, { value: data.courseCode, label: data.courseCode }]
    : data.courses);

  function externalSearch(query: string) {
    return `https://www.google.com/search?${new URLSearchParams({ q: query })}`;
  }
</script>

<svelte:head><title>{instructor.name} · {instructor.schoolName}｜UniCourse</title></svelte:head>

<div class="browse-page">
  <nav class="browse-crumbs" aria-label="所在位置">
    <a href="/schools">學校</a><span aria-hidden="true">/</span><a href={schoolHref(instructor.school)}>{instructor.schoolName}</a><span aria-hidden="true">/</span><span aria-current="page">教師</span>
  </nav>
  <header class="browse-head">
    <div class="browse-stack">
      <h1>{instructor.name}</h1>
      <p class="browse-dek"><span>{instructor.schoolName}課程資料</span>{#if span}<span>授課學期 {span}</span>{/if}
        {#if data.updatedAt}<span>列表更新於 <time datetime={data.updatedAt}>{importedAt(data.updatedAt)}</time></span>{/if}</p>
      {#if summary.departments.length}
        <p class="browse-inline browse-note">開課單位：{#each summary.departments as department (department)}<a href={departmentHref(instructor.school, department)}>{department}</a>{/each}</p>
      {/if}
      <p class="browse-note">同校同名教師會合併顯示。評價屬於課程，不代表對單一教師的評價。</p>
    </div>
    <div class="browse-actions"><a class="browse-button browse-primary" href="#offerings">看開課列表 ↓</a></div>
  </header>

  <div class="browse-compact-stats"><StatRow label="歷年授課統計">
    <StatTile label="開課班次" value={summary.offerings} unit="班" />
    <StatTile label="授課課程" value={summary.courses} unit="門" />
    <StatTile label="授課學期" value={summary.terms.length} unit="期" />
    <StatTile label="累計修課" value={enrollment} unit="人次" note={enrollment !== null ? '只加總已公布人數' : data.trends === null ? '統計暫未取得' : '未公布人數'} />
    <StatTile label="課程平均評價" value={rating.mean} unit="分" note={ratingNote} />
  </StatRow></div>

  <section class="browse-stack" aria-labelledby="history">
    <SectionHeader title="歷年授課" id="history" description="每列是一門課；圓點越大，該學年已公布的修課人數越多。點選可查看該學年最新一班。" />
    {#if truncated}<p class="browse-note">點陣僅使用最近 {displayValue(data.listed)} 班次。完整的各期班次數可展開查看。</p>{/if}
    <DotMatrix label="課程與學年點陣" periods={data.matrix.periods} rows={data.matrix.rows} periodLabel="學年" />
    <details class="trend-details">
      <summary>查看各學期的完整班次數</summary>
      {#if data.trends === null}
        <ErrorState title="暫時無法取得歷年班次數" retryHref={page.url.pathname + page.url.search} />
      {:else}
        <TrendChart label="各學期班次" unit="班" points={[...data.trends].reverse().map(({ term, offerings }) => ({ term, value: offerings }))} />
      {/if}
    </details>
  </section>

  <section class="browse-stack" aria-labelledby="offerings">
    <SectionHeader title={`開課列表（${displayValue(summary.offerings)}）`} id="offerings" />
    {#if truncated}<p class="browse-note">列表與篩選只涵蓋最近 {displayValue(data.listed)} 班次。<a href={`/?${new URLSearchParams({ school: instructor.school, term: 'all', q: instructor.name })}`}>用教師名搜尋更多課程</a></p>{/if}
    <FilterBar action={base} label="開課列表篩選" clearHref={filtered ? base : undefined}>
      <FilterSelect name="term" label="學期" value={data.term} options={termOptions} />
      <FilterSelect name="course" label="課程" value={data.courseCode} options={courseOptions} />
    </FilterBar>
    {#if data.rows.length}
      <SchoolsOfferingTable offerings={data.rows} ratings={data.ratings} mode="instructor" caption="授課班次" showTerm />
      <p class="browse-note">{filtered ? '符合條件 ' : '已列出 '}{displayValue(data.matched)} 班次 · 評價採同校同課號，最多查詢每次列表的前 10 門課。</p>
      <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="授課班次分頁" />
    {:else}
      <EmptyState title="沒有符合條件的開課班次" description={truncated ? '這個條件在已列出的班次中沒有結果。' : '試試其他學期或課程。'}>
        {#snippet action()}<a href={base}>清除篩選</a>{/snippet}
      </EmptyState>
    {/if}
  </section>

  <section class="browse-stack" aria-labelledby="discussions">
    <SectionHeader title="網路上的討論" id="discussions" description="目前本站未提供按教師比對的公開文章摘要。可用教師姓名和學校到其他網站搜尋。" />
    <div class="browse-actions">
      <a class="browse-button" href={externalSearch(`site:ptt.cc/bbs/ ${externalQuery}`)} rel="external">搜尋 PTT ↗</a>
      <a class="browse-button" href={externalSearch(`歐趴糖 ${externalQuery}`)} rel="external">搜尋歐趴糖 ↗</a>
    </div>
  </section>
</div>

<style>
  .trend-details summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand); font-weight: 650; }
</style>
