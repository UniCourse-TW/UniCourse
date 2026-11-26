<script lang="ts">
  import '$lib/overview-page.css';
  import OverviewOfferings from '$lib/overview-offerings.svelte';
  import { departmentHref, schoolHref } from '$lib/overview-paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let instructor = $derived(data.instructor);
  const number = new Intl.NumberFormat('zh-TW');
</script>

<svelte:head><title>{instructor.name}｜{instructor.schoolName}｜UniCourse</title></svelte:head>

<nav class="overview-breadcrumb" aria-label="所在位置">
  <a href="/">課程總覽</a> · <a href={schoolHref(instructor.school)}>{instructor.schoolName}</a>
</nav>
<header class="overview-header">
  <h1>{instructor.name}</h1>
  <dl class="overview-summary">
    <div><dt>開課班次</dt><dd>{number.format(instructor.summary.offerings)}</dd></div>
    <div><dt>課程</dt><dd>{number.format(instructor.summary.courses)}</dd></div>
    <div><dt>學期</dt><dd>{number.format(instructor.summary.terms.length)}</dd></div>
  </dl>
  <p class="overview-muted">授課學期：{instructor.summary.terms.join('、')}</p>
  {#if instructor.summary.departments.length}
    <p class="overview-muted">
      開課單位：{#each instructor.summary.departments as department, index (department)}{#if index > 0}、{/if}<a
          href={departmentHref(instructor.school, department)}>{department}</a>{/each}
    </p>
  {/if}
</header>

<section aria-labelledby="offerings">
  <h2 id="offerings">授課列表</h2>
  {#if instructor.summary.offerings > instructor.offerings.length}
    <p class="overview-muted">僅顯示最新的 {number.format(instructor.offerings.length)} 筆開課班次。</p>
  {/if}
  <OverviewOfferings offerings={instructor.offerings} groupByTerm />
</section>
