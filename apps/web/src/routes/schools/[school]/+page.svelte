<script lang="ts">
  import { page } from '$app/state';
  import type { CourseRanking } from '@unicourse/api-client';
  import { importedAt, isHttpUrl } from '$lib/format';
  import { kindLabel } from '$lib/institutions';
  import { departmentHref, schoolHref } from '$lib/overview-paths';
  import Badge from '$lib/ui/Badge.svelte';
  import BarCell from '$lib/ui/BarCell.svelte';
  import BarList from '$lib/ui/BarList.svelte';
  import DataTable from '$lib/ui/DataTable.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import FilterBar from '$lib/ui/FilterBar.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import Sparkline from '$lib/ui/Sparkline.svelte';
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import StatusPill from '$lib/ui/StatusPill.svelte';
  import TrendChart from '$lib/ui/TrendChart.svelte';
  import { displayValue } from '$lib/ui/format';
  import type { TableColumn } from '$lib/ui/types';
  import '$lib/schools-browse.css';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let school = $derived(data.school);
  let institution = $derived(data.institution);
  let units = $derived(data.units);
  let searchHref = $derived(`/?${new URLSearchParams({ school: school.slug, term: 'all' })}`);
  let terms = $derived([...new Set([...school.terms, ...(data.trends ?? []).map(({ term }) => term)])].sort());
  let trendsByTerm = $derived(new Map(data.trends?.map((row) => [row.term, row])));
  let enrollmentTerms = $derived((data.trends ?? []).filter(({ enrolled }) => enrolled != null));
  let ranked = $derived((data.rankings ?? []).filter((row) => row.enrolledTotal != null));
  let capacities = $derived((data.rankings ?? []).filter((row) => row.enrolledTotal == null && row.capacityTotal != null));
  let trendTerms = $derived(terms.slice(-10));
  let maxEnrolled = $derived(Math.max(1, ...ranked.map((row) => row.enrolledTotal ?? 0)));
  let maxTrend = $derived(Math.max(1, ...ranked.flatMap((row) => row.trend.filter(({ term }) => trendTerms.includes(term)).map(({ enrolled }) => enrolled ?? 0))));

  const unitColumns: TableColumn<(typeof units.rows)[number]>[] = [
    { id: 'unit', label: '開課單位', value: (row) => row.name },
    { id: 'offerings', label: '班次 ↓', numeric: true, value: (row) => row.offerings, width: '7rem' },
    { id: 'courses', label: '課程', numeric: true, value: (row) => row.courses, width: '4rem' }
  ];
  const rankColumns: TableColumn<CourseRanking>[] = [
    { id: 'course', label: '課程', value: (row) => row.title },
    { id: 'terms', label: '學期', numeric: true, value: (row) => row.terms },
    { id: 'enrolled', label: '累計人次', numeric: true, width: '6rem' },
    { id: 'trend', label: '近期走勢', width: '5.5rem' }
  ];
  const courseHref = (row: CourseRanking) => `/courses/${row.latestActiveOfferingId ?? row.latestOfferingId}`;
</script>

<svelte:head><title>{school.name}｜UniCourse</title></svelte:head>

<div class="browse-page">
  <nav class="browse-crumbs" aria-label="所在位置"><a href="/">首頁</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><span aria-current="page">{school.name}</span></nav>
  <header class="browse-head">
    <div class="browse-stack">
      <h1>{school.name}</h1>
      <p class="browse-dek">
        {#if school.nameEn}<span lang="en">{school.nameEn}</span>{/if}
        {#if institution?.city}<span>{institution.city} · {kindLabel(institution)}</span>{:else if institution}<span>{kindLabel(institution)}</span>{/if}
        {#if institution}<StatusPill status={institution.status} />{/if}
        <span>校方課程資料{#if institution?.latestImportedAt} · 更新於 <time datetime={institution.latestImportedAt}>{importedAt(institution.latestImportedAt)}</time>{/if}</span>
      </p>
      {#if institution?.note}<p class="browse-note">{institution.note}</p>{/if}
    </div>
    <div class="browse-actions">
      <a class="browse-button browse-primary" href={searchHref}>搜尋這所學校的課程</a>
      {#if institution?.website && isHttpUrl(institution.website)}<a class="browse-button" href={institution.website} rel="external">官網 ↗</a>{/if}
    </div>
  </header>

  <div class="browse-compact-stats"><StatRow label="收錄概況">
    <StatTile label="開課班次" value={school.offerings} unit="班" />
    <StatTile label="課程" value={school.courses} unit="門" />
    <StatTile label="已匯入學期" value={school.terms.length} unit="期" />
    <StatTile label="開課單位" value={units.total} unit="個" />
    <StatTile label="累計修課" value={enrollmentTerms.length ? enrollmentTerms.reduce((sum, term) => sum + (term.enrolled ?? 0), 0) : null}
      unit="人次" note={enrollmentTerms.length ? '只加總已公布人數' : data.trends === null ? '統計暫未取得' : '未公布人數'} />
  </StatRow></div>

  <section class="browse-stack" aria-labelledby="term-history">
    <SectionHeader title="歷年收錄" id="term-history" />
    {#if data.trends === null}
      <ErrorState title="暫時無法取得班次走勢" retryHref={page.url.pathname + page.url.search} />
    {:else if data.trends.length}
      <TrendChart label="每學期開課班次" points={terms.map((term) => ({ term, value: trendsByTerm.get(term)?.offerings ?? (school.terms.includes(term) ? 0 : null) }))} unit="班" />
    {:else}
      <EmptyState title="目前沒有班次走勢" description="待有開課班次後，這裡會顯示各學期的變化。" />
    {/if}
    <p class="browse-note">已匯入學期：{school.terms.join('、') || '尚未匯入'}</p>
  </section>

  <div class="browse-columns">
    <section class="browse-stack" aria-labelledby="departments">
      <SectionHeader title="開課單位（{displayValue(units.total)}）" id="departments" description="依開課班次排序，橫條使用全校同一尺度。" />
      {#if units.total}
        <FilterBar action={schoolHref(school.slug)} label="搜尋開課單位" clearHref={units.query ? schoolHref(school.slug) : undefined}>
          <label class="browse-field">搜尋系所<input name="unit" type="search" value={units.query} maxlength="100" placeholder="輸入開課單位名稱" /></label>
        </FilterBar>
      {/if}
      {#if units.rows.length}
        <DataTable caption="開課單位與班次" columns={unitColumns} rows={units.rows} rowKey={(row) => row.name} rowHref={(row) => departmentHref(school.slug, row.name)} minWidth="100%" scrollHint={false}>
          {#snippet cell(row, column)}
            {#if column.id === 'offerings'}<BarCell value={row.offerings} max={units.max} />{:else}{displayValue(column.value?.(row))}{/if}
          {/snippet}
        </DataTable>
        <p class="browse-note">共 {displayValue(units.matched)} 個單位{units.totalPages > 1 ? ` · 第 ${units.page} 頁` : ''}</p>
        <Pagination url={page.url} page={units.page} totalPages={units.totalPages} label="開課單位分頁" />
      {:else}
        <EmptyState title={units.query ? '沒有符合條件的開課單位' : '目前沒有開課單位'} description={units.query ? '換個關鍵字試試。' : '待資料匯入後，這裡會顯示各單位。'} />
      {/if}
    </section>

    <section class="browse-stack" aria-labelledby="ranking">
      <SectionHeader title="歷年最多人修的課" id="ranking" description="前 10 門，只排名有公布修課人數的課。走勢按學期排列，缺值不補零。" />
      {#if data.rankings === null}
        <ErrorState title="暫時無法取得校內排行" retryHref={page.url.pathname + page.url.search} />
      {:else}
        {#if ranked.length}
          <DataTable caption="校內累計修課人次排行" columns={rankColumns} rows={ranked} rowKey={(row) => row.courseCode} rowHref={courseHref} stickyColumn="course" minWidth="20rem">
            {#snippet cell(row, column)}
              {#if column.id === 'course'}
                <span class="browse-course-cell">
                  <span>{ranked.indexOf(row) + 1}. {row.title}</span><span class="browse-code">{row.courseCode}</span>
                  {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
                </span>
              {:else if column.id === 'enrolled'}
                <BarCell value={row.enrolledTotal ?? null} max={maxEnrolled} />
              {:else if column.id === 'trend'}
                {@const byTerm = new Map(row.trend.map(({ term, enrolled }) => [term, enrolled]))}
                {@const labels = trendTerms.flatMap((term) => byTerm.get(term) == null ? [] : [`${term}：${displayValue(byTerm.get(term))} 人`])}
                <Sparkline values={trendTerms.map((term) => byTerm.get(term) ?? null)} labels={trendTerms} label={[`${row.title}各期修課人數`, ...labels].join('；')} min={0} max={maxTrend} />
              {:else}{displayValue(column.value?.(row))}{/if}
            {/snippet}
          </DataTable>
        {:else}
          <EmptyState title="尚無可排名的修課人數" description="未公布的人數不列入排行，也不視為 0。" />
        {/if}
        {#if capacities.length}
          <div class="browse-stack">
            <h3>另有公布名額的課</h3>
            <BarList label="累計名額（不列入人次排行）" unit="名" items={capacities.map((row) => ({ label: row.title, value: row.capacityTotal ?? null, href: courseHref(row) }))} />
          </div>
        {/if}
        <a class="browse-button" href={`/?${new URLSearchParams({ rank_school: school.slug })}`}>查看全站排行 →</a>
      {/if}
    </section>
  </div>
</div>

<style>
  .browse-columns { --bar-cell-track-size: 2.4rem; }
  h3 { margin: 0; font-size: var(--t-md); }
  .browse-button { justify-self: start; }
</style>
