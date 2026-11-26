<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import CommunityPostList from '$lib/community-post-list.svelte';
  import { forumHref, loginHref } from '$lib/community-paths';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let filters = $derived(data.filters);
  let schoolNames = $derived(Object.fromEntries(data.schools.map((school) => [school.slug, school.name])));
  let pages = $derived(Math.max(1, Math.ceil(data.posts.total / data.posts.pageSize)));
  let draft = $derived(
    form ?? {
      type: 'question',
      title: '',
      content: '',
      school: filters.school,
      courseCode: filters.courseCode,
      tags: filters.tag
    }
  );
  let filtered = $derived(Boolean(filters.type || filters.school || filters.q || filters.tag));
</script>

<svelte:head>
  <title>論壇｜UniCourse</title>
  <meta name="description" content="UniCourse 課程論壇：修課心得、選課提問與公告。" />
</svelte:head>

<section class="intro">
  <h1>論壇</h1>
  <p>分享修課心得、提出選課問題。內容以純文字顯示。</p>
</section>

<form method="GET" class="filters" aria-label="篩選文章">
  <label>
    分類
    <select name="type">
      <option value="" selected={!filters.type}>全部分類</option>
      <option value="question" selected={filters.type === 'question'}>提問</option>
      <option value="article" selected={filters.type === 'article'}>文章</option>
      <option value="announcement" selected={filters.type === 'announcement'}>公告</option>
    </select>
  </label>
  <label>
    學校
    <select name="school">
      <option value="" selected={!filters.school}>所有學校</option>
      {#each data.schools as school (school.slug)}
        <option value={school.slug} selected={school.slug === filters.school}>{school.name}</option>
      {/each}
    </select>
  </label>
  <label class="keyword">
    關鍵字
    <input name="q" type="search" maxlength="100" defaultValue={filters.q} placeholder="標題或內容" />
  </label>
  {#if filters.courseCode}<input type="hidden" name="courseCode" value={filters.courseCode} />{/if}
  {#if filters.tag}<input type="hidden" name="tag" value={filters.tag} />{/if}
  <button>篩選</button>
  {#if filters.courseCode || filters.tag}
    <p class="chips">
      {#if filters.courseCode}
        <span>只看課號 {filters.courseCode}（{schoolNames[filters.school] ?? filters.school}） · <a href={forumHref({ ...filters, courseCode: '', page: 1 })}>清除</a></span>
      {/if}
      {#if filters.tag}
        <span>標籤 #{filters.tag} · <a href={forumHref({ ...filters, tag: '', page: 1 })}>清除</a></span>
      {/if}
    </p>
  {/if}
</form>

{#if data.user}
  <details class="compose" open={Boolean(form) || Boolean(filters.courseCode)}>
    <summary>發表文章</summary>
    <form method="POST" action="?/create" use:enhance>
      <label>
        文章類型
        <select name="type">
          <option value="question" selected={draft.type === 'question'}>提問</option>
          <option value="article" selected={draft.type === 'article'}>文章</option>
          {#if data.user.isAdmin}
            <option value="announcement" selected={draft.type === 'announcement'}>公告</option>
          {/if}
        </select>
      </label>
      <label>
        標題
        <input name="title" required maxlength="200" defaultValue={draft.title} />
      </label>
      <label>
        內容
        <textarea name="content" required rows="8" maxlength="20000" defaultValue={draft.content}></textarea>
      </label>
      <div class="pair">
        <label>
          相關學校（選填）
          <select name="school">
            <option value="" selected={!draft.school}>不指定</option>
            {#each data.schools as school (school.slug)}
              <option value={school.slug} selected={school.slug === draft.school}>{school.name}</option>
            {/each}
          </select>
        </label>
        <label>
          相關課號（選填）
          <input name="courseCode" maxlength="100" defaultValue={draft.courseCode} autocapitalize="characters" spellcheck="false" />
        </label>
      </div>
      <label>
        標籤（選填，以逗號分隔，最多 5 個）
        <input name="tags" maxlength="200" defaultValue={draft.tags} placeholder="例如：期中考, 作業" />
      </label>
      {#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
      <button>發表</button>
    </form>
  </details>
{:else}
  <p class="compose-login"><a href={loginHref(page.url.pathname + page.url.search)}>登入</a>後即可發文與回覆。</p>
{/if}

<section aria-labelledby="results">
  <h2 id="results">{filtered ? '符合的文章' : '最新文章'}（{data.posts.total}）</h2>
  {#if data.posts.posts.length === 0}
    <p class="empty">{filtered || filters.courseCode ? '沒有符合的文章。' : '還沒有文章，來發表第一篇吧。'}</p>
  {:else}
    <CommunityPostList posts={data.posts.posts} {schoolNames} />
  {/if}
  {#if pages > 1}
    <nav class="pager" aria-label="分頁">
      {#if filters.page > 1}<a href={forumHref({ ...filters, page: filters.page - 1 })} rel="prev">上一頁</a>{/if}
      <span>第 {filters.page} / {pages} 頁</span>
      {#if filters.page < pages}<a href={forumHref({ ...filters, page: filters.page + 1 })} rel="next">下一頁</a>{/if}
    </nav>
  {/if}
</section>

<style>
  .intro h1 { font-size: clamp(1.65rem, 5vw, 2.4rem); line-height: 1.15; margin: 0; }
  .intro p { margin: 0.35rem 0 0; color: #594f69; }
  .filters {
    display: grid;
    grid-template-columns: minmax(7rem, 0.4fr) minmax(9rem, 0.6fr) minmax(10rem, 1fr) auto;
    align-items: end;
    gap: 0.65rem;
    padding: 0.85rem;
    margin: 0.85rem 0 1rem;
    border: 1px solid #e5dfef;
    border-radius: 0.85rem;
    background: white;
  }
  label { display: grid; gap: 0.25rem; min-width: 0; font-weight: 650; }
  input, select, textarea, button {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid #aca0bc;
    border-radius: 0.45rem;
    background: white;
    color: inherit;
    font: inherit;
  }
  textarea { resize: vertical; font-weight: 400; }
  button { border-color: #5630a5; background: #5630a5; color: white; font-weight: 650; cursor: pointer; }
  .chips { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; margin: 0; color: #594f69; overflow-wrap: anywhere; }
  .compose { margin: 0 0 1.25rem; padding: 0.85rem; border: 1px solid #e5dfef; border-radius: 0.85rem; background: white; }
  .compose summary { font-weight: 700; cursor: pointer; color: #5630a5; min-height: 1.75rem; }
  .compose form { display: grid; gap: 0.75rem; margin-top: 0.75rem; }
  .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
  .compose-login { margin: 0 0 1.25rem; }
  h2 { font-size: 1.1rem; margin: 0 0 0.6rem; }
  .empty { color: #594f69; }
  .pager { display: flex; gap: 1rem; justify-content: center; align-items: center; margin: 1rem 0 0; }
  .error { margin: 0; padding: 0.6rem 0.75rem; border-radius: 0.45rem; background: #fdecec; color: #8a1c1c; }
  @media (max-width: 38rem) {
    .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .keyword, .filters button { grid-column: 1 / -1; }
    .pair { grid-template-columns: 1fr; }
  }
</style>
