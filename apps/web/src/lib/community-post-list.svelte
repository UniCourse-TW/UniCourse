<script lang="ts">
  import { authorName, postTypeLabels, postedAt } from '$lib/community-format';
  import { forumHref, postHref, profileHref } from '$lib/community-paths';
  import type { PostSummary } from '$lib/community-types';

  let {
    posts,
    schoolNames = {},
    showAuthor = true
  }: { posts: PostSummary[]; schoolNames?: Record<string, string>; showAuthor?: boolean } = $props();
</script>

<ol class="posts">
  {#each posts as post (post.id)}
    <li class="post">
      <p class="kicker">
        <span class="type type-{post.type}">{postTypeLabels[post.type]}</span>
        {#if post.school}
          <a href={forumHref({ school: post.school, courseCode: post.courseCode ?? undefined })}>
            {schoolNames[post.school] ?? post.school}{#if post.courseCode}&nbsp;{post.courseCode}{/if}
          </a>
        {/if}
      </p>
      <h3><a href={postHref(post.id)}>{post.title}</a></h3>
      <p class="excerpt">{post.excerpt}</p>
      <p class="meta">
        {#if showAuthor}<a href={profileHref(post.author.username)}>{authorName(post.author)}</a> · {/if}
        <time datetime={post.createdAt}>{postedAt(post.createdAt)}</time>
        · {post.replyCount} 則回覆 · {post.score} 分
      </p>
      {#if post.tags.length}
        <p class="tags">
          {#each post.tags as tag (tag)}<a href={forumHref({ tag })}>#{tag}</a>{/each}
        </p>
      {/if}
    </li>
  {/each}
</ol>

<style>
  .posts { display: grid; gap: 0.75rem; margin: 0; padding: 0; list-style: none; }
  .post { padding: 0.9rem 1rem; background: white; border: 1px solid #e5dfef; border-radius: 0.85rem; min-width: 0; }
  .kicker { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin: 0; font-size: 0.85rem; }
  .type { padding: 0.05rem 0.5rem; border-radius: 999px; background: #f1ecfb; color: #5630a5; font-weight: 650; }
  .type-question { background: #e8f1fb; color: #1d4f8a; }
  .type-announcement { background: #fdf1e3; color: #7a4510; }
  h3 { margin: 0.35rem 0 0.2rem; font-size: 1.05rem; overflow-wrap: anywhere; }
  .excerpt { margin: 0; color: #3b3150; white-space: pre-wrap; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .meta { margin: 0.4rem 0 0; color: #594f69; font-size: 0.875rem; overflow-wrap: anywhere; }
  .tags { display: flex; flex-wrap: wrap; gap: 0.25rem 0.6rem; margin: 0.35rem 0 0; font-size: 0.875rem; }
</style>
