<script lang="ts">
  import OverviewHome from '$lib/overview-home.svelte';
  import OverviewOfferings from '$lib/overview-offerings.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  let clearDepartment = $derived.by(() => {
    const params = new URLSearchParams();
    if (data.query) params.set('q', data.query);
    if (data.school) params.set('school', data.school);
    params.set('term', data.term || 'all');
    return `/?${params}`;
  });
</script>

<svelte:head>
  <title>查課｜UniCourse</title>
  <meta name="description" content="跨校搜尋大學課程，依課名、教師或課號查詢。" />
</svelte:head>

<section class="intro">
  <h1>大學課程搜尋</h1>
</section>

<form method="GET" class="search" aria-label="課程搜尋">
  <label class="keyword">
    關鍵字
    <input name="q" type="search" value={data.query} maxlength="100" placeholder="例如：資料結構" />
  </label>
  <!-- `selected` on options keeps a choice made before hydration; `value` on the select would reset it. -->
  <label>
    學校
    <select name="school">
      <option value="">所有學校</option>
      {#each data.schools as school (school.slug)}
        <option value={school.slug} selected={school.slug === data.school}>{school.name}</option>
      {/each}
    </select>
  </label>
  <label>
    學期
    <select name="term">
      {#each data.terms as term (term)}
        <option value={term} selected={term === data.term}>{term}</option>
      {/each}
      <option value="all" selected={data.term === ''}>全部學期</option>
    </select>
  </label>
  {#if data.department}<input type="hidden" name="department" value={data.department} />{/if}
  <button>搜尋</button>
  {#if data.department}
    <p class="filter">只看開課單位「{data.department}」 · <a href={clearDepartment}>清除</a></p>
  {/if}
</form>

{#if data.content.kind === 'search'}
  <section aria-labelledby="results">
    <h2 id="results">搜尋結果</h2>
    {#if data.content.courses.length === 0}
      <p>沒有符合的課程，可以換一個關鍵字、學校或學期試試。</p>
    {:else}
      <OverviewOfferings offerings={data.content.courses} />
      {#if data.content.courses.length === 50}<p>最多顯示 50 筆，請縮小搜尋範圍。</p>{/if}
    {/if}
    <a href="/">返回課程總覽</a>
  </section>
{:else}
  <OverviewHome schools={data.schools} overview={data.content} />
{/if}

<style>
  .intro h1 { font-size: clamp(1.65rem, 5vw, 2.4rem); line-height: 1.15; margin: 0; }
  .search {
    display: grid;
    grid-template-columns: minmax(10rem, 1fr) minmax(9rem, 0.6fr) minmax(7rem, 0.35fr) auto;
    align-items: end;
    gap: 0.65rem;
    padding: 0.85rem;
    margin: 0.85rem 0 1.75rem;
    border: 1px solid #e5dfef;
    border-radius: 0.85rem;
    background: white;
  }
  label { display: grid; gap: 0.25rem; min-width: 0; font-weight: 650; }
  input, select, button {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid #aca0bc;
    border-radius: 0.45rem;
    background: white;
    color: inherit;
    font: inherit;
  }
  button { border-color: #5630a5; background: #5630a5; color: white; cursor: pointer; }
  .filter { grid-column: 1 / -1; margin: 0; color: #594f69; }
  @media (max-width: 38rem) {
    .search { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .keyword, button { grid-column: 1 / -1; }
  }
</style>
