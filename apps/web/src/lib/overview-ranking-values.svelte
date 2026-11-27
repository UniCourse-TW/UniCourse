<script lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import ChartValues from './ui/ChartValues.svelte';
  import { displayValue } from './ui/format';
  import { partialTerms } from './ui/partial-terms';
  import type { TableColumn } from './ui/types';

  let { courses, terms }: { courses: CourseRanking[]; terms: string[] } = $props();
  let rows = $derived(courses.map((course) => ({
    course,
    byTerm: new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])),
    partial: partialTerms(Object.entries(course.sectionsByTerm)),
    lastPublished: course.trend.filter(({ enrolled, term }) => enrolled != null && term < terms[0]).sort((left, right) => right.term.localeCompare(left.term))[0]
  })));
  let columns = $derived<TableColumn<(typeof rows)[number]>[]>([
    { id: 'course', label: '課程', value: ({ course }) => `${course.title} · ${course.courseCode}` },
    ...terms.map((term) => ({
      id: term, label: term, align: 'end' as const,
      value: ({ byTerm, partial }: (typeof rows)[number]) => `${displayValue(byTerm.get(term))}${partial.has(term) && byTerm.get(term) != null ? '＊' : ''}`
    })),
    {
      id: 'last', label: '較早的公布值', value: ({ lastPublished }) =>
        lastPublished ? `${lastPublished.term} · ${displayValue(lastPublished.enrolled)}` : null
    }
  ]);
</script>

{#if courses.length && terms.length}
  <ChartValues label="各學期修課人數（人）" summary="查看各期修課人數" {columns} {rows}
    rowKey={({ course }) => course.latestOfferingId} minWidth={`${12 + terms.length * 3.5}rem`} />
{/if}
