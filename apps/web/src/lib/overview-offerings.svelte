<script lang="ts">
  import type { Offering } from '@unicourse/api-client';
  import { credits, meeting, requirement } from '$lib/format';
  import { instructorHref } from '$lib/overview-paths';

  let { offerings, groupByTerm = false }: { offerings: Offering[]; groupByTerm?: boolean } = $props();

  let groups = $derived.by(() => {
    if (!groupByTerm) return [];
    const terms = new Map<string, Offering[]>();
    for (const offering of offerings) {
      const term = terms.get(offering.term);
      if (term) term.push(offering);
      else terms.set(offering.term, [offering]);
    }
    return [...terms];
  });

  function details(course: Offering) {
    return [
      course.department,
      credits(course.credits),
      requirement(course),
      course.scheduleText ?? course.schedule?.map(meeting).join('；')
    ].filter(Boolean).join(' · ');
  }
</script>

{#snippet list(courses: Offering[])}
  <ul role="list">
    {#each courses as course (course.id)}
      {@const description = details(course)}
      <li>
        <a class="title" href={`/courses/${course.id}`}>{course.title}</a>
        <div class="meta">
          {[course.schoolName, course.term, course.courseCode, course.classCode && `班次 ${course.classCode}`]
            .filter(Boolean)
            .join(' · ')}
          {#if course.isDemo}<span class="badge">示範</span>{/if}
        </div>
        {#if description || course.instructors.length}
          <div class="meta">
            {description}{#if description && course.instructors.length}{' · '}{/if}
            {#each course.instructors as name, index}
              {#if index > 0}、{/if}<a href={instructorHref(course.school, name)}>{name}</a>
            {/each}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{#if offerings.some((course) => course.isDemo)}
  <p class="note">標示「示範」的課程不是校方實際開課資料。</p>
{/if}

{#if groupByTerm}
  {#each groups as [term, courses] (term)}
    <div class="term-group">
      <h3>{term} 學期</h3>
      {@render list(courses)}
    </div>
  {/each}
{:else}
  {@render list(offerings)}
{/if}

<style>
  ul { list-style: none; padding: 0; display: grid; gap: 0.65rem; }
  li { padding: 0.9rem 1rem; background: white; border: 1px solid #e5dfef; border-radius: 0.65rem; }
  h3 { margin: 0 0 0.6rem; }
  .term-group { margin-block: 1.3rem; }
  .term-group :global(ul) { margin-block: 0; }
  .title { font-size: 1.15rem; font-weight: 700; overflow-wrap: anywhere; }
  .meta { margin-top: 0.25rem; font-size: 0.9rem; color: #594f69; overflow-wrap: anywhere; }
  .badge, .note { color: #694217; }
  .badge { background: #fff1d8; padding: 0.08rem 0.38rem; border-radius: 0.3rem; }
</style>
