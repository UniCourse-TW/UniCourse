<script lang="ts">
  import { navigating } from '$app/state';
  import type { School } from '@unicourse/api-client';
  import { searchSorts, type OverviewSearchFilters } from './overview-paths';
  import FilterSelect from './ui/FilterSelect.svelte';

  let { schools, terms, filters, departments = null, externalSort = false, empty = false, compact = false, keywordHint }: {
    schools: School[];
    terms: string[];
    filters?: OverviewSearchFilters;
    departments?: string[] | null;
    externalSort?: boolean;
    empty?: boolean;
    compact?: boolean;
    keywordHint?: string;
  } = $props();

  const departmentOptions = $props.id();
  const hintId = `${departmentOptions}-hint`;
  let selectedSchool = $derived(filters?.school ?? '');
  let selectedTerm = $derived(filters?.term ?? terms[0] ?? 'all');
  let schoolOptions = $derived([
    ...(selectedSchool && !schools.some(({ slug }) => slug === selectedSchool) ? [{ value: selectedSchool, label: selectedSchool }] : []),
    ...schools.map(({ slug, name }) => ({ value: slug, label: name }))
  ]);
  let termOptions = $derived([{ value: 'all', label: '全部學期' }, ...terms.map((term) => ({ value: term, label: term }))]);
  let advancedCount = $derived(Number(Boolean(filters?.department && !selectedSchool)) + Number(Boolean(filters && filters.sort !== 'relevance')));
  let loading = $derived(navigating.to?.url.pathname === '/' && navigating.to.url.searchParams.has('term'));

  let keyword = $state<HTMLInputElement>();
  let ready = $state(false);
  $effect(() => { ready = true; });

  function clearKeyword() {
    if (!keyword) return;
    keyword.value = '';
    keyword.focus();
  }

  function changeFilter({ currentTarget: select }: Event & { currentTarget: HTMLSelectElement }) {
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

  <form id="course-search" action="/" method="GET" role="search" aria-label="課程搜尋" class:result-filters={filters && !empty} class:has-department={filters && selectedSchool && !empty} class:empty class:compact>
    <div class="keyword">
      <label for="course-keyword" class="keyword-label">關鍵字</label>
      <div class="search-input">
        <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.75" /><path d="m15 15 4 4" /></svg>
        {#key filters?.query ?? ''}
          <input id="course-keyword" name="q" type="search" bind:this={keyword} defaultValue={filters?.query ?? ''} maxlength="100" placeholder="課名、教師或課號" aria-describedby={keywordHint ? hintId : undefined} />
        {/key}
        {#if empty && ready && filters?.query}
          <button type="button" class="clear-keyword" onclick={clearKeyword} aria-label="清除關鍵字" title="清除關鍵字">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button>
        {/if}
      </div>
    </div>
    <div class="school-field"><FilterSelect name="school" label="學校" allLabel="所有學校" options={schoolOptions} value={selectedSchool} onchange={changeFilter} /></div>
    <div class="term-field"><FilterSelect name="term" label="學期" allLabel={null} options={termOptions} value={selectedTerm} onchange={changeFilter} /></div>
    <button type="submit" aria-busy={loading}>{loading ? '搜尋中…' : empty ? '重新搜尋' : '搜尋'}</button>
    {#if keywordHint}<p class="keyword-hint" id={hintId}>{keywordHint}</p>{/if}
    {#if filters && empty}
      {#if filters.department}{@render departmentField(filters.department)}{/if}
      <input type="hidden" name="sort" value={filters.sort} />
      {#if filters.group}<input type="hidden" name="group" value={filters.group} />{/if}
    {/if}
    {#if filters && !empty}
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
  .keyword { min-width: 0; display: grid; gap: var(--space-1); }
  .keyword-hint { grid-column: 1 / -1; margin: 0; color: var(--ink-2); font-size: var(--t-sm); text-wrap: pretty; }
  .search-input { position: relative; display: flex; }
  .school-field, .term-field { display: grid; min-width: 0; }
  .empty input::-webkit-search-cancel-button { display: none; }
  .search-input .clear-keyword { position: absolute; inset: 0 1px 0 auto; display: grid; place-items: center; width: var(--target-min); padding: 0; background: transparent; color: var(--brand-ink); }
  .clear-keyword:hover { background: var(--brand-wash); }
  .search-icon { position: absolute; left: var(--space-3); top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
  .search-input input { padding-inline: 2.35rem var(--space-2); font-size: 1rem; }
  .search-input:has(.clear-keyword) input { padding-inline-end: var(--target-min); }
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
  .empty > .department-field { grid-column: 1 / -1; }
  @media (min-width: 54rem) {
    .result-filters:not(.has-department):has(> .advanced:not([open])) { grid-template-columns: minmax(0, 1fr) minmax(0, 12rem) minmax(0, 8.5rem) auto auto; }
    .result-filters:not(.has-department) > .advanced:not([open]) { grid-column: auto; }
  }
  @media (max-width: 37rem) {
    .compact { grid-template-columns: repeat(2, minmax(0, 1fr)) auto; align-items: stretch; }
    .compact > .keyword { grid-column: 1 / 3; }
    .compact > button { grid-area: 1 / 3; padding-inline: var(--space-2); }
    .compact > .school-field { grid-column: 1; }
    .compact > .term-field { grid-column: 2 / 4; }
    .compact .keyword-label { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); }
    form, .result-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .keyword, form > button { grid-column: 1 / -1; }
    .empty > .keyword { grid-column: 1 / -1; }
    .empty > button { grid-column: 1 / -1; }
    .empty .keyword-hint { grid-row: 2; }
    .result-filters .keyword-label { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); }
    .result-filters :is(.school-field, .term-field) :global(select) { padding-inline: 0 .125rem; font-size: .8125rem; }
    .result-filters { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .result-filters > :is(.school-field, .term-field, .department-field) { grid-column: span 2; }
    .result-filters .keyword { grid-column: 1 / 4; }
    .result-filters > button { grid-area: 1 / 4; padding-inline: var(--space-1); }
    .result-filters:not(.has-department) { grid-template-columns: repeat(2, minmax(0, 1fr)) auto; }
    .result-filters:not(.has-department) > :is(.school-field, .term-field) { grid-column: span 1; }
    .result-filters:not(.has-department) > .keyword { grid-column: 1 / 3; }
    .result-filters:not(.has-department) > button { grid-area: 1 / 3; padding-inline: var(--space-2); }
    .result-filters:not(.has-department) .advanced:not([open]) { grid-column: 3; }
    .result-filters:not(.has-department) .advanced:not([open]) summary { padding-inline: var(--space-1); white-space: nowrap; }
    .result-filters:not(.has-department) .advanced:not([open]) summary span { display: none; }
    .advanced-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    select { text-overflow: ellipsis; }
  }
</style>
