<script lang="ts">
  import CommunityRatings from '$lib/community-ratings.svelte';
  import { departmentHref, forumHref, instructorHref } from '$lib/community-paths';
  import { credits, extraValue, importedAt, isHttpUrl, meeting, requirement } from '$lib/format';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let course = $derived(data.course);
  let extra = $derived(Object.entries(course.extra ?? {}));
  let departmentSearch = $derived.by(() => {
    if (!course.department) return undefined;
    const params = new URLSearchParams({ school: course.school, term: course.term, department: course.department });
    return `/?${params}`;
  });
</script>

<svelte:head>
  <title>{course.title} · {course.schoolName}｜UniCourse</title>
</svelte:head>

<a href="/">← 回課程搜尋</a>
<article>
  <h1>{course.title}</h1>
  {#if course.titleEn}<p class="subtitle" lang="en">{course.titleEn}</p>{/if}
  {#if course.isDemo}<p class="note">示範資料，非校方實際開課紀錄。</p>{/if}
  <dl>
    <dt>學校</dt><dd>{course.schoolName}</dd>
    <dt>學期</dt><dd>{course.term}</dd>
    {#if course.department}
      <dt>開課單位</dt>
      <dd>
        <a href={departmentSearch}>{course.department}</a>{#if course.departmentCode}（{course.departmentCode}）{/if}
        · <a href={departmentHref(course.school, course.department)}>系所總覽</a>
      </dd>
    {/if}
    {#if course.classCode}
      <dt>課號／班次</dt><dd>{course.courseCode} · {course.classCode}</dd>
    {:else}
      <dt>課號</dt><dd>{course.courseCode}</dd>
    {/if}
    {#if course.credits != null}<dt>學分</dt><dd>{credits(course.credits)}</dd>{/if}
    {#if requirement(course)}<dt>必選修</dt><dd>{requirement(course)}</dd>{/if}
    <dt>授課教師</dt>
    <dd>
      {#each course.instructors as name, index (index)}{#if index > 0}、{/if}<a href={instructorHref(course.school, name)}>{name}</a>{:else}未提供{/each}
    </dd>
    {#if course.schedule?.length}
      <dt>時間地點</dt>
      <dd>
        <ul class="schedule">
          {#each course.schedule as slot, index (index)}
            <li>{[meeting(slot), slot.location].filter(Boolean).join(' · ')}</li>
          {/each}
        </ul>
      </dd>
    {:else if course.scheduleText}
      <dt>時間地點</dt><dd>{course.scheduleText}</dd>
    {/if}
    {#if course.capacity != null}<dt>人數上限</dt><dd>{course.capacity} 人</dd>{/if}
    {#if course.language}<dt>授課語言</dt><dd>{course.language}</dd>{/if}
    {#if course.campus}<dt>校區</dt><dd>{course.campus}</dd>{/if}
    {#if course.grade}<dt>年級</dt><dd>{course.grade}</dd>{/if}
  </dl>

  {#if course.description}
    <section aria-labelledby="description">
      <h2 id="description">課程概述</h2>
      <p class="text">{course.description}</p>
    </section>
  {/if}
  {#if course.notes}
    <section aria-labelledby="notes">
      <h2 id="notes">備註</h2>
      <p class="text">{course.notes}</p>
    </section>
  {/if}
  {#if extra.length}
    <section aria-labelledby="extra">
      <h2 id="extra">其他校方欄位</h2>
      <table>
        <tbody>
          {#each extra as [key, value] (key)}
            <tr><th scope="row">{key}</th><td>{extraValue(value)}</td></tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}

  <p class="links">
    {#if isHttpUrl(course.sourceUrl)}
      <a href={course.sourceUrl}>{course.isDemo ? '校方網站' : '校方課程頁'}</a>
    {:else}
      <span>{course.isDemo ? '校方網站' : '校方課程頁'}：{course.sourceUrl}</span>
    {/if}
    {#if course.syllabusUrl && isHttpUrl(course.syllabusUrl)}
      <a href={course.syllabusUrl}>課綱</a>
    {:else if course.syllabusUrl}
      <span>課綱：{course.syllabusUrl}</span>
    {/if}
    <a href={forumHref({ school: course.school, courseCode: course.courseCode })}>相關討論</a>
  </p>
  <p class="imported">最近匯入：<time datetime={course.importedAt}>{importedAt(course.importedAt)}</time></p>
</article>

<CommunityRatings ratings={data.ratings} user={data.user} {form} courseCode={course.courseCode} />

<style>
  article { margin-top: 1rem; padding: clamp(1rem, 4vw, 2.5rem); background: white; border: 1px solid #e5dfef; border-radius: 1rem; }
  h1 { margin: 0; overflow-wrap: anywhere; }
  h2 { font-size: 1.05rem; margin: 1.5rem 0 0.4rem; }
  .subtitle { margin: 0.2rem 0 0; color: #594f69; }
  .note { color: #694217; }
  dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.6rem 1rem; margin: 1.25rem 0 0; }
  dt { font-weight: 650; }
  dd { margin: 0; overflow-wrap: anywhere; }
  .schedule { margin: 0; padding: 0; list-style: none; }
  .text { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
  table { border-collapse: collapse; width: 100%; font-size: 0.95rem; }
  th, td { padding: 0.35rem 0.5rem; border-top: 1px solid #e5dfef; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  th { font-weight: 650; width: 40%; }
  .links { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; margin: 1.5rem 0 0; overflow-wrap: anywhere; }
  .imported { margin: 0.75rem 0 0; color: #594f69; font-size: 0.9rem; }
</style>
