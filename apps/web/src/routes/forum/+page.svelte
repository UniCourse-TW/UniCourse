<script lang="ts">
  import { page } from '$app/state';
  import '$lib/community-ui.css';
  import CommunityCompose from '$lib/community-compose.svelte';
  import CommunityPostList from '$lib/community-post-list.svelte';
  import { shortDateTime } from '$lib/community-format';
  import { forumHref, loginHref } from '$lib/community-paths';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let filters = $derived(data.filters);
  let schoolNames = $derived(Object.fromEntries(data.schools.map((school) => [school.slug, school.name])));
  let schoolOptions = $derived(data.schools.map((school) => ({ value: school.slug, label: school.name })));
  let total = $derived(data.posts.total);
  let pages = $derived(Math.max(1, Math.ceil(total / data.posts.pageSize)));
  let first = $derived((filters.page - 1) * data.posts.pageSize + 1);
  let last = $derived(first + data.posts.posts.length - 1);
  let filtered = $derived(Boolean(filters.type || filters.school || filters.q || filters.tag));
  let narrowed = $derived(Boolean(filters.school || filters.q || filters.tag));
  // `form` is a failed create (it carries `title`); course checks never land here.
  let created = $derived(form && 'title' in form && typeof form.title === 'string' ? form : undefined);
  let draft = $derived(
    created ?? {
      type: 'question',
      title: '',
      content: '',
      school: filters.school,
      courseCode: filters.courseCode,
      tags: filters.tag
    }
  );
  let composeOpen = $derived(data.compose || Boolean(created));
  let closeHref = $derived(forumHref(filters));
  let composeHref = $derived(`${forumHref(filters)}${forumHref(filters).includes('?') ? '&' : '?'}compose=1`);

  const fmt = new Intl.NumberFormat('zh-TW');
  const count = (value: number | null) => (value === null ? '' : fmt.format(value));
  const typeChips = [
    { type: '', label: '全部', key: 'all' },
    { type: 'question', label: '提問', key: 'question' },
    { type: 'article', label: '文章', key: 'article' },
    { type: 'announcement', label: '公告', key: 'announcement' }
  ] as const;
</script>

<svelte:head>
  <title>論壇｜UniCourse</title>
  <meta name="description" content="UniCourse 課程論壇：各校修課心得、選課提問與公告。" />
</svelte:head>

<div class="cm forum">
  <header class="cm-head">
      <h1>論壇</h1>
      <p class="cm-dek">
        修課心得、選課提問與公告
        {#if data.counts.all !== null}<span class="sep">·</span>{narrowed || filters.courseCode ? '符合' : '共'} <span class="num">{fmt.format(data.counts.all)}</span> 篇{/if}
        {#if data.latest}<span class="sep">·</span>最新 <time class="num" datetime={data.latest}>{shortDateTime(data.latest)}</time>{/if}
        <span class="sep">·</span><a href="/terms">發文規則</a>
      </p>
    <div class="cm-actions">
      {#if data.user}
        <CommunityCompose
          open={composeOpen}
          {draft}
          schools={data.schools}
          isAdmin={data.user.isAdmin}
          {closeHref}
          message={created?.message}
        />
      {:else}
        <a class="cm-btn" href={loginHref('/forum?compose=1')}><span aria-hidden="true">＋</span> 發表文章</a>
      {/if}
    </div>
  </header>

  <form method="GET" action="/forum" class="toolbar" aria-label="篩選文章">
    <label class="search">
      <span class="cm-sr">關鍵字</span>
      <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
      <input name="q" type="search" maxlength="100" defaultValue={filters.q} placeholder="搜尋標題或內容" />
    </label>
    <FilterSelect name="school" label="學校" options={schoolOptions} value={filters.school} allLabel="全部學校" />
    {#if filters.type}<input type="hidden" name="type" value={filters.type} />{/if}
    {#if filters.courseCode}<input type="hidden" name="courseCode" value={filters.courseCode} />{/if}
    {#if filters.tag}<input type="hidden" name="tag" value={filters.tag} />{/if}
    <button class="cm-btn">套用</button>
    {#if filtered || filters.courseCode}<a class="clear" href="/forum">清除</a>{/if}
  </form>

  <div class="chip-bar">
    <nav class="cm-chips types" aria-label="文章分類">
      {#each typeChips as chip (chip.key)}
        <a class="cm-chip" href={forumHref({ ...filters, type: chip.type, page: 1 })}
          aria-current={filters.type === chip.type ? 'true' : undefined}>
          {chip.label}{#if data.counts[chip.key] !== null}<span class="n">{count(data.counts[chip.key])}</span>{/if}
        </a>
      {/each}
    </nav>
    {#if narrowed || filters.courseCode}
      <div class="cm-chips" role="group" aria-label="已套用的篩選">
        {#if filters.school}
          <a class="cm-chip remove" href={forumHref({ ...filters, school: '', courseCode: '', page: 1 })} aria-label="移除篩選：學校 {schoolNames[filters.school] ?? filters.school}">
            {schoolNames[filters.school] ?? filters.school}{#if filters.courseCode}&nbsp;<span class="mono">{filters.courseCode}</span>{/if} <span aria-hidden="true">×</span>
          </a>
        {/if}
        {#if filters.courseCode}
          <a class="cm-chip remove" href={forumHref({ ...filters, courseCode: '', page: 1 })} aria-label="移除篩選：課號 {filters.courseCode}">
            只看課號 <span class="mono">{filters.courseCode}</span> <span aria-hidden="true">×</span>
          </a>
        {/if}
        {#if filters.tag}
          <a class="cm-chip remove" href={forumHref({ ...filters, tag: '', page: 1 })} aria-label="移除篩選：標籤 {filters.tag}">#{filters.tag} <span aria-hidden="true">×</span></a>
        {/if}
        {#if filters.q}
          <a class="cm-chip remove" href={forumHref({ ...filters, q: '', page: 1 })} aria-label="移除篩選：關鍵字 {filters.q}">「{filters.q}」 <span aria-hidden="true">×</span></a>
        {/if}
      </div>
    {/if}
  </div>

  <section aria-labelledby="results" class="results">
    <h2 id="results" class="cm-sr">{filtered ? '符合的文章' : '最新文章'}（{total}）</h2>
    {#if data.posts.posts.length === 0}
      {#if filtered || filters.courseCode}
        <EmptyState title="沒有符合的文章" description={filters.courseCode ? `${schoolNames[filters.school] ?? filters.school} ${filters.courseCode} 還沒有人發文，你可以發表第一篇。` : '換個關鍵字或分類，或清除篩選看全部文章。'}>
          {#snippet action()}
            <div class="state-actions">
              {#if filters.courseCode}
                <a class="cm-btn" href={data.user ? composeHref : loginHref(composeHref)}>發表這門課的第一篇</a>
              {/if}
              <a class="cm-btn secondary" href="/forum">清除篩選</a>
            </div>
          {/snippet}
        </EmptyState>
      {:else}
        <EmptyState title="還沒有文章，來發表第一篇吧。" description="修課心得、選課提問都歡迎。">
          {#snippet action()}
            <a class="cm-btn secondary" href={data.user ? '/forum?compose=1' : loginHref('/forum?compose=1')}>發表文章</a>
          {/snippet}
        </EmptyState>
      {/if}
    {:else}
      <CommunityPostList posts={data.posts.posts} {schoolNames} label={filtered ? '符合的文章' : '最新文章'} />
      <footer class="pager">
        <p class="num">第 {fmt.format(first)}–{fmt.format(last)} 篇<span class="sep">·</span>共 {fmt.format(total)} 篇</p>
        <Pagination url={page.url} page={filters.page} totalPages={pages} label="文章分頁" />
      </footer>
    {/if}
  </section>
</div>

<style>
  .forum .sep { margin-inline: 0.35em; color: var(--axis); }
  .toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
  .search {
    position: relative;
    display: flex;
    flex: 1 1 16rem;
    min-inline-size: 0;
  }
  .search svg {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 0.75rem;
    inline-size: 1rem;
    block-size: 1rem;
    translate: 0 -50%;
    fill: none;
    stroke: var(--muted);
    stroke-width: 1.8;
    stroke-linecap: round;
    pointer-events: none;
  }
  .search input {
    inline-size: 100%;
    min-block-size: var(--target-min);
    padding: 0 0.75rem 0 2.25rem;
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    color: var(--ink);
    background: var(--panel-raised);
    color-scheme: var(--ui-color-scheme);
    font: var(--t-base) / 1.4 var(--font-sans);
  }
  .search input::placeholder { color: var(--muted); }
  .search input:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-color: var(--brand); }
  .toolbar :global(.field) { min-block-size: var(--target-min); }
  .clear {
    display: inline-flex;
    align-items: center;
    min-block-size: var(--target-min);
    padding-inline: var(--space-2);
    font-size: var(--t-base);
    font-weight: 600;
  }
  .chip-bar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    align-items: center;
    justify-content: space-between;
    margin-block: var(--space-3) var(--space-4);
  }
  .results { min-inline-size: 0; }
  .pager {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    align-items: center;
    justify-content: space-between;
    margin-block-start: var(--space-3);
    color: var(--muted);
    font-size: var(--t-base);
  }
  .pager p { min-block-size: var(--target-min); display: flex; align-items: center; }
  .state-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center; }

  @media (max-width: 40rem) {
    .search { flex-basis: 100%; }
    .toolbar :global(.field) { flex: 1 1 0; }
    .toolbar :global(.field select) { flex: 1; max-inline-size: none; }
    /* Category chips scroll sideways rather than wrapping into a tall block. */
    .types {
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
      margin-inline: calc(-1 * var(--space-4));
      padding-inline: var(--space-4);
      inline-size: calc(100% + 2 * var(--space-4));
    }
  }
</style>
