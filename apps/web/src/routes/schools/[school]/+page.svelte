<script lang="ts">
  import '$lib/overview-page.css';
  import { departmentHref } from '$lib/overview-paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let school = $derived(data.school);
  let schoolSearch = $derived(`/?${new URLSearchParams({ school: school.slug, term: 'all' })}`);
  const number = new Intl.NumberFormat('zh-TW');
</script>

<svelte:head><title>{school.name}｜UniCourse</title></svelte:head>

<nav class="overview-breadcrumb" aria-label="所在位置"><a href="/">課程總覽</a></nav>
<header class="overview-header">
  <h1>{school.name}</h1>
  {#if school.nameEn}<p class="overview-muted" lang="en">{school.nameEn}</p>{/if}
  <dl class="overview-summary">
    <div><dt>開課班次</dt><dd>{number.format(school.offerings)}</dd></div>
    <div><dt>課程</dt><dd>{number.format(school.courses)}</dd></div>
    <div><dt>學期</dt><dd>{number.format(school.terms.length)}</dd></div>
  </dl>
  <p class="overview-muted">已匯入學期：{school.terms.join('、') || '尚未匯入'}</p>
  <p><a href={schoolSearch}>搜尋這所學校的課程</a></p>
</header>

<section aria-labelledby="departments">
  <h2 id="departments">開課單位</h2>
  {#if school.departments.length}
    <ul role="list">
      {#each school.departments as department (department.name)}
        <li>
          <a href={departmentHref(school.slug, department.name)}>{department.name}</a>
          <p class="overview-muted">{number.format(department.offerings)} 班次 · {number.format(department.courses)} 門課程</p>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="overview-muted">目前沒有可顯示的開課單位。</p>
  {/if}
</section>

<style>
  h2 { margin: 0 0 0.65rem; }
  ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); gap: 0.65rem; margin: 0; padding: 0; list-style: none; }
  li { padding: 0.85rem 1rem; border: 1px solid #e5dfef; border-radius: 0.65rem; background: #fff; overflow-wrap: anywhere; }
  li a { font-size: 1.05rem; font-weight: 700; }
  li p { margin: 0.25rem 0 0; font-size: 0.9rem; }
</style>
