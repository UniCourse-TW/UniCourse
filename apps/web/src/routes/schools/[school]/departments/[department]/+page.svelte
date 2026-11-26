<script lang="ts">
  import '$lib/overview-page.css';
  import OverviewOfferings from '$lib/overview-offerings.svelte';
  import { schoolHref } from '$lib/overview-paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let department = $derived(data.department);
  const number = new Intl.NumberFormat('zh-TW');
</script>

<svelte:head><title>{department.department}｜{department.schoolName}｜UniCourse</title></svelte:head>

<nav class="overview-breadcrumb" aria-label="所在位置">
  <a href="/">課程總覽</a> · <a href={schoolHref(department.school)}>{department.schoolName}</a>
</nav>
<header class="overview-header">
  <h1>{department.department}</h1>
  <p class="overview-muted">共 {number.format(department.total)} 個開課班次</p>
</header>

<section aria-labelledby="offerings">
  <h2 id="offerings">開課列表</h2>
  {#if department.total > department.offerings.length}
    <p class="overview-muted">僅顯示最新的 {number.format(department.offerings.length)} 筆開課班次。</p>
  {/if}
  <OverviewOfferings offerings={department.offerings} groupByTerm />
</section>
