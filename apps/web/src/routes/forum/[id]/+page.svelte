<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { authorName, postTypeLabels, postedAt } from '$lib/community-format';
  import { courseSearchHref, forumHref, loginHref, profileHref } from '$lib/community-paths';
  import type { Author } from '$lib/community-types';
  import type { PageProps } from './$types';

  interface Item {
    id: number;
    title?: string;
    content: string;
    author: Author;
    score: number;
    myVote: number;
    createdAt: string;
    updatedAt: string;
  }

  let { data, form }: PageProps = $props();
  let post = $derived(data.post);
  let user = $derived(data.user);
  let here = $derived(page.url.pathname);
  let replyDraft = $derived(form?.action === 'reply' && 'content' in form ? form.content : '');

  const keepValues = () => async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) =>
    update({ reset: false });
  const messageFor = (id: number) =>
    form && 'target' in form && form.target === id && 'message' in form ? form.message : undefined;
  const editDraft = (item: Item) =>
    form?.action === 'edit' && 'content' in form && form.target === item.id
      ? { title: form.title ?? item.title, content: form.content }
      : { title: item.title, content: item.content };
</script>

<svelte:head>
  <title>{post.title}｜UniCourse 論壇</title>
</svelte:head>

{#snippet controls(item: Item, kind: string)}
  {@const isAuthor = user?.username === item.author.username}
  <div class="controls">
    {#if user}
      <form method="POST" action="?/vote" class="vote" use:enhance={keepValues}>
        <input type="hidden" name="target" value={item.id} />
        <button name="value" value={item.myVote === 1 ? 0 : 1} aria-pressed={item.myVote === 1} title="推">
          <span aria-hidden="true">▲</span> 推
        </button>
        <span class="score" aria-label="{kind}分數">{item.score}</span>
        <button name="value" value={item.myVote === -1 ? 0 : -1} aria-pressed={item.myVote === -1} title="噓">
          <span aria-hidden="true">▼</span> 噓
        </button>
      </form>
    {:else}
      <p class="vote"><span class="score" aria-label="{kind}分數">{item.score}</span> 分</p>
    {/if}
    {#if isAuthor || user?.isAdmin}
      <!-- Re-created after each save so the panels close again. -->
      {#key `${item.updatedAt}|${item.title}|${item.content}`}
        {#if isAuthor}
          {@const draft = editDraft(item)}
          <details class="panel" open={form?.action === 'edit' && form.target === item.id && 'message' in form}>
            <summary>編輯</summary>
            <form method="POST" action="?/edit" use:enhance={keepValues}>
              <input type="hidden" name="target" value={item.id} />
              {#if item.title !== undefined}
                <label>標題<input name="title" required maxlength="200" defaultValue={draft.title} /></label>
              {/if}
              <label>內容<textarea name="content" required rows="6" maxlength="20000" defaultValue={draft.content}></textarea></label>
              <button>儲存修改</button>
            </form>
          </details>
        {/if}
        <details class="panel danger">
          <summary>刪除</summary>
          <form method="POST" action="?/delete" use:enhance>
            <input type="hidden" name="target" value={item.id} />
            <p>確定要刪除這{kind === '文章' ? '篇文章？整串討論都會一併隱藏' : '則回覆'}，且無法復原。</p>
            <button>確定刪除</button>
          </form>
        </details>
      {/key}
    {/if}
  </div>
  {#if messageFor(item.id)}<p class="error" role="alert">{messageFor(item.id)}</p>{/if}
{/snippet}

<a href="/forum">← 回論壇</a>

<article class="thread" aria-labelledby="post-title">
  <p class="kicker">
    <span class="type type-{post.type}">{postTypeLabels[post.type]}</span>
    {#if post.school}
      <a href={forumHref({ school: post.school, courseCode: post.courseCode ?? undefined })}>
        {data.schoolNames[post.school] ?? post.school}{#if post.courseCode}&nbsp;{post.courseCode}{/if} 的討論
      </a>
      {#if post.courseCode}<a href={courseSearchHref(post.school, post.courseCode)}>查看課程</a>{/if}
    {/if}
  </p>
  <h1 id="post-title">{post.title}</h1>
  <p class="meta">
    <a href={profileHref(post.author.username)}>{authorName(post.author)}</a>
    · <time datetime={post.createdAt}>{postedAt(post.createdAt)}</time>
    {#if post.updatedAt !== post.createdAt}· 已編輯{/if}
  </p>
  <div class="content">{post.content}</div>
  {#if post.tags.length}
    <p class="tags">{#each post.tags as tag (tag)}<a href={forumHref({ tag })}>#{tag}</a>{/each}</p>
  {/if}
  {@render controls(post, '文章')}
</article>

<section class="replies" aria-labelledby="replies-title">
  <h2 id="replies-title">回覆（{post.replies.length}）</h2>
  {#if post.replies.length === 0}
    <p class="empty">還沒有回覆。</p>
  {:else}
    <ol>
      {#each post.replies as reply (reply.id)}
        <li id="reply-{reply.id}">
          <article class="reply" aria-label="{authorName(reply.author)} 的回覆">
            <p class="meta">
              <a href={profileHref(reply.author.username)}>{authorName(reply.author)}</a>
              · <time datetime={reply.createdAt}>{postedAt(reply.createdAt)}</time>
              {#if reply.updatedAt !== reply.createdAt}· 已編輯{/if}
            </p>
            <div class="content">{reply.content}</div>
            {@render controls(reply, '回覆')}
          </article>
        </li>
      {/each}
    </ol>
  {/if}

  {#if user}
    <form method="POST" action="?/reply" class="reply-form" use:enhance>
      <label>
        我要回覆
        <textarea name="content" required rows="5" maxlength="20000" defaultValue={replyDraft}></textarea>
      </label>
      {#if form?.action === 'reply' && 'message' in form}<p class="error" role="alert">{form.message}</p>{/if}
      <button>送出回覆</button>
    </form>
  {:else}
    <p class="login"><a href={loginHref(here)}>登入</a>後即可回覆與投票。</p>
  {/if}
</section>

<style>
  .thread, .replies { margin-top: 1rem; padding: clamp(1rem, 4vw, 2rem); background: white; border: 1px solid #e5dfef; border-radius: 1rem; }
  .kicker { display: flex; flex-wrap: wrap; gap: 0.35rem 0.75rem; align-items: center; margin: 0; font-size: 0.875rem; }
  .type { padding: 0.05rem 0.5rem; border-radius: 999px; background: #f1ecfb; color: #5630a5; font-weight: 650; }
  .type-question { background: #e8f1fb; color: #1d4f8a; }
  .type-announcement { background: #fdf1e3; color: #7a4510; }
  h1 { margin: 0.4rem 0 0; font-size: clamp(1.35rem, 5vw, 1.9rem); line-height: 1.25; overflow-wrap: anywhere; }
  h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
  .meta { margin: 0.35rem 0 0; color: #594f69; font-size: 0.9rem; overflow-wrap: anywhere; }
  /* User text is plain text: escaped by Svelte, line breaks preserved. */
  .content { margin: 0.85rem 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .tags { display: flex; flex-wrap: wrap; gap: 0.25rem 0.6rem; margin: 0.75rem 0 0; font-size: 0.9rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-start; margin-top: 0.85rem; }
  .vote { display: flex; align-items: center; gap: 0.35rem; margin: 0; }
  .vote button {
    min-height: 2.5rem;
    padding: 0.3rem 0.7rem;
    border: 1px solid #aca0bc;
    border-radius: 999px;
    background: white;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .vote button[aria-pressed='true'] { border-color: #5630a5; background: #5630a5; color: white; }
  .score { min-width: 1.75rem; text-align: center; font-weight: 700; }
  .panel { flex: 1 1 100%; }
  .panel summary { display: inline-flex; align-items: center; min-height: 2.5rem; padding: 0 0.5rem; color: #5630a5; cursor: pointer; font-weight: 600; }
  .panel.danger summary { color: #8a1c1c; }
  .panel form { display: grid; gap: 0.6rem; margin-top: 0.4rem; }
  .panel p { margin: 0; }
  label { display: grid; gap: 0.25rem; font-weight: 650; }
  input, textarea, .panel button, .reply-form button {
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
  .panel button, .reply-form button { border-color: #5630a5; background: #5630a5; color: white; font-weight: 650; cursor: pointer; }
  .panel.danger button { border-color: #8a1c1c; background: #8a1c1c; }
  .replies ol { margin: 0; padding: 0; list-style: none; }
  .reply { padding: 0.85rem 0; border-top: 1px solid #e5dfef; }
  .reply .content { margin-top: 0.4rem; }
  .empty { color: #594f69; }
  .reply-form { display: grid; gap: 0.6rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5dfef; }
  .login { margin: 1rem 0 0; }
  .error { margin: 0.5rem 0 0; padding: 0.6rem 0.75rem; border-radius: 0.45rem; background: #fdecec; color: #8a1c1c; }
</style>
