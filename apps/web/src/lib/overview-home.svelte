<script lang="ts">
  import type { PageData } from '../routes/$types';

  let { schools, overview }: {
    schools: PageData['schools'];
    overview: Extract<PageData['content'], { kind: 'overview' }>;
  } = $props();

  const number = new Intl.NumberFormat('zh-TW');
</script>

<section aria-labelledby="ranking">
  <div class="rank-header">
    <div>
      <h2 id="ranking">歷史累計修課人數排行</h2>
      <p class="muted">統計已匯入的學期，最多列出前 20 門課程。</p>
    </div>
    <form method="GET" action="/" aria-label="排行篩選">
      <label>
        排行範圍
        <select name="rank_school">
          <option value="" selected={!overview.rankSchool}>所有學校</option>
          {#if overview.rankSchool && !schools.some((school) => school.slug === overview.rankSchool)}
            <option value={overview.rankSchool} selected>未收錄的學校</option>
          {/if}
          {#each schools as school (school.slug)}
            <option value={school.slug} selected={school.slug === overview.rankSchool}>{school.name}</option>
          {/each}
        </select>
      </label>
      <button>套用</button>
    </form>
  </div>
  <p class="footnote">若校方未公布修課人數，則以累計名額替代。標示「示範」的課程不是校方實際開課資料。</p>
  {#if overview.rankings.length}
    <ol>
      {#each overview.rankings as course (course.latestOfferingId)}
        <li>
          <div class="rank-row">
            <div class="course">
              <a href={`/courses/${course.latestOfferingId}`}>{course.title}</a>
              {#if course.titleEn}<small lang="en">{course.titleEn}</small>{/if}
              <div class="metadata">
                {course.schoolName} · {course.courseCode}
                {#if course.isDemo}<span class="badge">示範</span>{/if}
              </div>
            </div>
            <div class="term-count">開課學期數 {number.format(course.terms)}</div>
            <div class="metric" class:unknown={course.enrolledTotal == null && course.capacityTotal == null}>
              {#if course.enrolledTotal != null}
                累計修課人數 <strong>{number.format(course.enrolledTotal)}</strong>
              {:else if course.capacityTotal != null}
                累計名額 <strong>{number.format(course.capacityTotal)}</strong>
              {:else}
                人數與名額未公布
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ol>
  {:else}
    <p>目前沒有可顯示的課程排行。</p>
  {/if}
  <p class="coverage">
    目前收錄 {number.format(overview.coverage.schools)} 校、{number.format(overview.coverage.terms)} 個學期 ·
    <a href="/schools">查看各校收錄狀態</a>
  </p>
</section>

<style>
  h2 { margin: 0; font-size: clamp(1.3rem, 4vw, 1.55rem); }
  .rank-header { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 0.65rem 1rem; }
  .muted { margin: 0.25rem 0 0; color: #594f69; font-size: 0.9rem; }
  form { display: flex; align-items: end; gap: 0.5rem; max-width: 100%; }
  label { display: grid; gap: 0.2rem; min-width: 0; font-size: 0.875rem; font-weight: 650; }
  select, button {
    min-height: 2.75rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid #aca0bc;
    border-radius: 0.45rem;
    background: white;
    color: inherit;
    font: inherit;
  }
  select { width: 100%; font-size: 1rem; }
  button { border-color: #5630a5; color: #5630a5; font-weight: 650; white-space: nowrap; cursor: pointer; }
  .footnote { margin: 0.85rem 0; padding-inline-start: 0.65rem; border-inline-start: 2px solid #ccbdea; color: #594f69; font-size: 0.875rem; }
  ol { margin: 0; padding: 0 0.85rem 0 2.45rem; border: 1px solid #e5dfef; border-radius: 0.8rem; background: white; }
  li { padding: 0.7rem 0 0.7rem 0.2rem; border-top: 1px solid #ece7f3; }
  li:first-child { border-top: 0; }
  li::marker { color: #594f69; font-weight: 700; font-variant-numeric: tabular-nums; }
  li:nth-child(-n + 3)::marker { color: #5630a5; }
  .rank-row { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; justify-items: start; gap: 0.35rem 0.65rem; }
  .course { grid-column: 1 / -1; min-width: 0; overflow-wrap: anywhere; }
  .course a { font-size: 1.05rem; font-weight: 700; }
  .course small { display: block; }
  .course small, .metadata, .term-count { color: #594f69; font-size: 0.85rem; }
  .term-count { font-variant-numeric: tabular-nums; }
  .badge { background: #fff1d8; color: #694217; padding: 0.08rem 0.38rem; border-radius: 0.3rem; white-space: nowrap; }
  .metric { padding: 0.15rem 0.45rem; border-radius: 0.35rem; background: #f0eafa; color: #472485; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
  .unknown { background: #f5f1f9; color: #594f69; }
  .coverage { margin: 0.85rem 0 0; color: #594f69; font-size: 0.9rem; }
  @media (min-width: 38rem) {
    .rank-row { grid-template-columns: minmax(0, 1fr) 7rem minmax(10rem, max-content); row-gap: 0; }
    .course { grid-column: auto; }
    .metric { justify-self: end; }
  }
</style>
