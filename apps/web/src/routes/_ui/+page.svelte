<script lang="ts">
  import { page } from '$app/state';
  import Badge from '$lib/ui/Badge.svelte';
  import BarCell from '$lib/ui/BarCell.svelte';
  import BarList from '$lib/ui/BarList.svelte';
  import DataTable from '$lib/ui/DataTable.svelte';
  import DotMatrix from '$lib/ui/DotMatrix.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import FilterBar from '$lib/ui/FilterBar.svelte';
  import FilterChip from '$lib/ui/FilterChip.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Heatstrip from '$lib/ui/Heatstrip.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import Skeleton from '$lib/ui/Skeleton.svelte';
  import Sparkline from '$lib/ui/Sparkline.svelte';
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import StatusPill from '$lib/ui/StatusPill.svelte';
  import TrendChart from '$lib/ui/TrendChart.svelte';
  import { displayValue } from '$lib/ui/format';
  import {
    coverage, departments, matrixPeriods, matrixRows, ranking, rankingColumns,
    schools, statusColumns, statusRows, termOptions, trend
  } from './examples';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let matches = $derived(ranking.filter((row) => (!data.school || row.school === data.school)
    && (!data.term || row.terms.includes(data.term))));
  const ceiling = Math.max(...ranking.map((row) => row.total ?? 0));
</script>

<svelte:head>
  <title>共用元件展示｜UniCourse</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="gallery">
  <SectionHeader title="共用元件展示" level={1} description="僅供開發與測試使用。下列數字為示範資料，不代表各校實際收錄情形。">
    {#snippet actions()}<a class="action" href="#states">查看狀態範例</a>{/snippet}
  </SectionHeader>

  <StatRow label="課程資料總覽">
    <StatTile label="已收錄班次" value={123941} unit="班" />
    <StatTile label="跨學期課程" value={28412} unit="門" />
    <StatTile label="已收錄學校" value="9 / 150" unit="校" />
    <StatTile label="已收錄學期" value={20} unit="期" note="最新學期：115-1" />
  </StatRow>

  <section aria-labelledby="rankings">
    <SectionHeader id="rankings" title="歷年累計修課人數排行" description="將相同課號跨學期加總；未公布的人數以「—」表示。" />
    <FilterBar action="/_ui" label="篩選課程排行" clearHref={data.school || data.term ? '/_ui' : undefined}>
      <FilterSelect name="school" label="學校" options={schools} value={data.school} allLabel="所有學校" />
      <FilterSelect name="term" label="學期" options={termOptions} value={data.term} allLabel="所有學期" />
      {#snippet chips()}
        {#if data.school}<FilterChip url={page.url} name="school" label={schools.find(({ value }) => value === data.school)?.label ?? '學校'} />{/if}
        {#if data.term}<FilterChip url={page.url} name="term" label={data.term} />{/if}
      {/snippet}
    </FilterBar>

    <DataTable caption="課程修課人數排行" columns={rankingColumns} rows={matches} rowKey={(row) => row.code}
      rowHeaderColumn="course" stickyColumn="course" rowHref={() => '#trend'} clientSort>
      {#snippet cell(row, column)}
        {#if column.id === 'course'}
          <span>{row.title}<small class="code">{row.code}</small></span>
        {:else if column.id === 'rank'}
          <span class="rank">{row.rank}</span>
        {:else if column.id === 'total'}
          <BarCell value={row.total} max={ceiling} emphasis={row.rank <= 3} />
        {:else if column.id === 'trend'}
          {#if row.trend.length}
            <div class="trend-cell">
              <Sparkline values={row.trend} label={`${row.title}近期修課人數走勢`} min={0} />
              {#if row.delta !== null}
                <span class="delta ui-tabular" class:increase={row.delta > 0} class:decrease={row.delta < 0}>
                  <span class="sr-only">較前一期：</span>{row.delta > 0 ? '+' : ''}{displayValue(row.delta)}
                </span>
              {/if}
            </div>
          {:else}
            <span class="quiet">—</span>
          {/if}
        {:else}
          {displayValue(column.value?.(row))}
        {/if}
      {/snippet}
      {#snippet empty()}
        <EmptyState title="沒有符合條件的課程" description="可改選其他學校或學期。">
          {#snippet action()}<a class="action" href="/_ui">清除篩選</a>{/snippet}
        </EmptyState>
      {/snippet}
    </DataTable>
    <Pagination url={page.url} page={data.page} totalPages={3} label="課程排行分頁" />
  </section>

  <section aria-labelledby="trend">
    <SectionHeader id="trend" title="歷年修課人數" description="未公布的學期留白，實際為 0 人時以基準線上的短線標示。" />
    <TrendChart label="資料結構：歷年修課人數" points={trend} unit="人" />
    <div class="spark-example">
      <p>迷你走勢圖：同一組資料的簡版</p>
      <Sparkline label="資料結構：迷你走勢圖" values={trend.map(({ value }) => value)} labels={trend.map(({ term }) => term)} min={0} showValues />
    </div>
  </section>

  <section aria-labelledby="departments">
    <SectionHeader id="departments" title="開課單位規模" description="同一校各開課單位的收錄班次，以相同尺度比較。" />
    <BarList label="各系所班次" items={departments} unit="班" ranked />
  </section>

  <section aria-labelledby="coverage">
    <SectionHeader id="coverage" title="各校收錄狀態" description="106 至 115 學年，每格代表一個學年；色階依收錄的學期數而定。" />
    <div class="coverage-key">
      <Heatstrip cells={[{ period: '一', value: 0 }, { period: '二', value: 1 }, { period: '三', value: 2 }]} label="色階：未收錄、部分收錄、完整收錄" />
      <span>由左至右：未收錄、一學期、兩學期</span>
    </div>
    <DataTable caption="大專校院收錄狀態" columns={statusColumns} rows={statusRows} rowKey={(row) => row.label} rowHref={(row) => row.href}>
      {#snippet cell(row, column)}
        {#if column.id === 'status'}
          <StatusPill status={row.status} />
        {:else if column.id === 'coverage' && row.years.length}
          <Heatstrip cells={coverage(row.years)} label={`${row.label}收錄範圍`} />
        {:else}
          {displayValue(column.value?.(row))}
        {/if}
      {/snippet}
    </DataTable>
    <div class="coverage-example">
      <p>國立清華大學的學年覆蓋</p>
      <Heatstrip cells={coverage(statusRows[0].years)} label="國立清華大學：各學年收錄學期" showValues />
    </div>
  </section>

  <section aria-labelledby="matrix">
    <SectionHeader id="matrix" title="教師開課紀錄" description="圓點表示該學期有開課，大小反映修課人數；空白代表無開課紀錄。" />
    <DotMatrix label="課程 × 學期開課紀錄" periods={matrixPeriods} rows={matrixRows} initialRows={2} />
  </section>

  <section aria-labelledby="states">
    <SectionHeader id="states" title="載入、空白與錯誤" />
    <div class="badges"><Badge label="示範資料" tone="demo" /><Badge label="已停辦" tone="inactive" /></div>
    <Skeleton label="載入課程資料…" />
    <EmptyState title="目前沒有修課人數" description="請改查有公布人數的其他學期。">
      {#snippet action()}<a class="action" href="#rankings">返回課程排行</a>{/snippet}
    </EmptyState>
    <ErrorState description="請稍後重新整理；重新整理後會保留目前的篩選條件。" retryHref={`${page.url.pathname}${page.url.search}#states`} />
  </section>
</div>

<style>
  .gallery {
    display: grid;
    gap: var(--space-8);
    min-inline-size: 0;
    padding: clamp(var(--space-3), 3vw, var(--space-6));
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    color: var(--ink);
    background: var(--bg);
    color-scheme: var(--ui-color-scheme);
    font: var(--t-md) / var(--leading-body) var(--font-sans);
  }
  section { display: grid; gap: var(--space-3); min-inline-size: 0; }
  .code { display: block; color: var(--muted); font: var(--t-xs) var(--font-mono); }
  .rank { color: var(--muted); font-family: var(--font-mono); }
  .trend-cell, .badges, .coverage-key { display: flex; align-items: center; gap: var(--space-2); }
  .trend-cell { min-inline-size: 6.25rem; }
  .delta, .quiet, .coverage-key, .spark-example p, .coverage-example p { color: var(--muted); font-size: var(--t-sm); }
  .spark-example p, .coverage-example p { margin: 0 0 var(--space-2); }
  .increase { color: var(--up); }
  .decrease { color: var(--down); }
  .action {
    display: inline-flex;
    align-items: center;
    min-inline-size: var(--target-min);
    min-block-size: var(--target-min);
    padding: 0 var(--space-2);
    border-radius: var(--radius-control);
    color: var(--brand-ink);
    font-size: var(--t-base);
    font-weight: 600;
    text-underline-offset: 0.15em;
  }
  .action:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
