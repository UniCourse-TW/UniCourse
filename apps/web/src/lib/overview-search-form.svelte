<script lang="ts">
  import { navigating } from '$app/state';
  import type { School } from '@unicourse/api-client';
  import { searchSorts, type OverviewSearchFilters } from './overview-paths';

  let { schools, terms, filters, departments = null, externalSort = false, empty = false }: {
    schools: School[];
    terms: string[];
    filters?: OverviewSearchFilters;
    departments?: string[] | null;
    externalSort?: boolean;
    empty?: boolean;
  } = $props();

  const departmentOptions = $props.id();
  let selectedSchool = $derived(filters?.school ?? '');
  let selectedTerm = $derived(filters?.term ?? terms[0] ?? 'all');
  let advancedCount = $derived(Number(Boolean(filters?.department && !selectedSchool)) + Number(Boolean(filters && filters.sort !== 'relevance')));
  let loading = $derived(navigating.to?.url.pathname === '/' && navigating.to.url.searchParams.has('term'));

  function changeFilter(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    if (!filters || !select.form) return;
    if (select.name === 'school') {
      const unit = select.form.elements.namedItem('department');
      if (unit instanceof HTMLSelectElement || unit instanceof HTMLInputElement) unit.value = '';
    }
    select.form.requestSubmit();
  }
</script>

{#snippet departmentField(value: string)}
  <label class="department-field">
    <span>開課單位</span>
    {#key `${selectedSchool}|${value}`}
      <input name="department" list={departments?.length ? departmentOptions : undefined} defaultValue={value}
        placeholder={departments?.length ? '輸入簡稱或選擇單位' : '輸入開課單位名稱'} maxlength="100" />
    {/key}
  </label>
  {#if departments?.length}
    <datalist id={departmentOptions}>
      {#each departments as unit (unit)}<option value={unit}></option>{/each}
    </datalist>
  {/if}
{/snippet}

{#snippet schoolField()}
  <label>
    <span>學校</span>
    <select name="school" onchange={changeFilter}>
      <option value="" selected={!selectedSchool}>所有學校</option>
      {#if selectedSchool && !schools.some((school) => school.slug === selectedSchool)}<option value={selectedSchool} selected>{selectedSchool}</option>{/if}
      {#each schools as school (school.slug)}<option value={school.slug} selected={school.slug === selectedSchool}>{school.name}</option>{/each}
    </select>
  </label>
{/snippet}

{#snippet termField()}
  <label>
    <span>學期</span>
    <select name="term" onchange={changeFilter}>
      <option value="all" selected={selectedTerm === 'all'}>全部學期</option>
      {#each terms as term (term)}<option value={term} selected={term === selectedTerm}>{term}</option>{/each}
    </select>
  </label>
{/snippet}

  <form id="course-search" action="/" method="GET" role="search" aria-label="課程搜尋" class:result-filters={filters && !empty} class:has-department={filters && selectedSchool && !empty} class:empty>
    <label class="keyword">
      <span>關鍵字</span>
      <span class="search-input">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.75" /><path d="m15 15 4 4" /></svg>
        {#key filters?.query ?? ''}
          <input id="course-keyword" name="q" type="search" defaultValue={filters?.query ?? ''} maxlength="100" placeholder="課名、教師或課號" />
        {/key}
      </span>
    </label>
    {#if !empty}{@render schoolField()}{@render termField()}{/if}
    <button type="submit" aria-busy={loading}>{loading ? '搜尋中…' : empty ? '重新搜尋' : '搜尋'}</button>
    {#if filters && empty}
      <input type="hidden" name="sort" value={filters.sort} />
      <details class="advanced">
        <summary>{filters.school || filters.department || filters.term !== 'all' ? '調整學校、學期等條件' : '選擇特定學校或學期'}</summary>
        <div class="advanced-fields">
          {@render schoolField()}{@render termField()}{@render departmentField(filters.department)}
          <button type="submit" class="advanced-apply">套用篩選</button>
        </div>
      </details>
    {:else if filters}
      {#if selectedSchool}{@render departmentField(filters.department)}{/if}
      {#if !externalSort || !selectedSchool}
      <details class="advanced">
        <summary>{selectedSchool ? '排序選項' : '更多篩選'}{#if advancedCount} <span>（已套用 {advancedCount} 項）</span>{/if}</summary>
        <div class="advanced-fields">
          {#if !selectedSchool}{@render departmentField(filters.department)}{/if}
          {#if !externalSort}<label>
            <span>排序</span>
            <select name="sort" onchange={changeFilter}>
              {#each searchSorts as option (option.value)}
                <option value={option.value} selected={option.value === filters.sort}>{option.label}</option>
              {/each}
            </select>
          </label>{/if}
          <button type="submit" class="advanced-apply">套用進階條件</button>
        </div>
      </details>
      {/if}
    {/if}
  </form>

<style>
  form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 12rem) minmax(0, 8.5rem) auto; gap: var(--space-2); align-items: end; }
  label { min-width: 0; display: grid; gap: var(--space-1); color: var(--ink-2); font-size: var(--t-sm); font-weight: 680; }
  input, select, button { width: 100%; min-height: var(--target-min); padding: 0 var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font: var(--t-base) / var(--leading-table) var(--font-sans); }
  input::placeholder { color: var(--muted); }
  .search-input { position: relative; }
  .search-input svg { position: absolute; left: var(--space-3); top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
  .search-input input { padding-inline: 2.35rem var(--space-2); font-size: 1rem; }
  button { padding-inline: var(--space-4); border-color: transparent; background: var(--brand); color: var(--on-brand); font-weight: 650; cursor: pointer; }
  button:hover { text-decoration: underline; }
  .advanced { grid-column: 1 / -1; min-width: 0; }
  .has-department > .department-field { grid-column: 1 / 3; }
  .has-department > .advanced { grid-column: 3 / -1; }
  summary { width: fit-content; min-height: var(--target-min); padding-inline: var(--space-2); align-content: center; border-radius: var(--radius-control); color: var(--brand-ink); font-size: var(--t-base); font-weight: 650; cursor: pointer; }
  summary:hover { background: var(--brand-wash); }
  summary span { color: var(--muted); font-weight: 500; }
  .advanced-fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 12rem); gap: var(--space-2); max-width: 35rem; padding-block-end: var(--space-2); }
  .advanced-apply { grid-column: 1 / -1; width: fit-content; border: 1px solid var(--control-line); background: var(--panel-raised); color: var(--brand-ink); }
  .empty { grid-template-columns: minmax(0, 1fr) auto; }
  @media (min-width: 54rem) {
    .result-filters:not(.has-department):has(> .advanced:not([open])) { grid-template-columns: minmax(0, 1fr) minmax(0, 12rem) minmax(0, 8.5rem) auto auto; }
    .result-filters:not(.has-department) > .advanced:not([open]) { grid-column: auto; }
  }
  @media (max-width: 37rem) {
    form, .result-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .keyword, form > button { grid-column: 1 / -1; }
    .empty > :is(.keyword, button) { grid-column: auto; }
    .result-filters { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .result-filters label { grid-column: span 2; }
    .result-filters .keyword { grid-column: 1 / 4; }
    .result-filters > button { grid-area: 1 / 4; padding-inline: var(--space-1); }
    .result-filters:not(.has-department) { grid-template-columns: repeat(2, minmax(0, 1fr)) auto; }
    .result-filters:not(.has-department) > label { grid-column: span 1; }
    .result-filters:not(.has-department) > .keyword { grid-column: 1 / 3; }
    .result-filters:not(.has-department) > button { grid-area: 1 / 3; padding-inline: var(--space-2); }
    .result-filters:not(.has-department) .advanced:not([open]) { grid-column: 3; }
    .result-filters:not(.has-department) .advanced:not([open]) summary { padding-inline: var(--space-1); white-space: nowrap; }
    .result-filters:not(.has-department) .advanced:not([open]) summary span { display: none; }
    .advanced-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    select { text-overflow: ellipsis; }
  }
</style>
