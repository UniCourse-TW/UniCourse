<script lang="ts">
  import CommunityPostList from '$lib/community-post-list.svelte';
  import { joinedAt, postedAt, stars } from '$lib/community-format';
  import { courseSearchHref } from '$lib/community-paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let profile = $derived(data.profile);
  let isMe = $derived(data.user?.username === profile.username);
</script>

<svelte:head>
  <title>{profile.displayName || profile.username}（@{profile.username}）｜UniCourse</title>
</svelte:head>

<section class="card head">
  <h1>{profile.displayName || profile.username}</h1>
  <p class="handle">@{profile.username}</p>
  <p class="meta">
    {#if profile.school}{data.schoolNames[profile.school] ?? profile.school} · {/if}
    <time datetime={profile.createdAt}>{joinedAt(profile.createdAt)}</time> 加入
    {#if isMe} · <a href="/settings">編輯個人資料</a>{/if}
  </p>
  {#if profile.bio}<p class="bio">{profile.bio}</p>{/if}
</section>

<section aria-labelledby="ratings">
  <h2 id="ratings">課程評價（{profile.ratings.length}）</h2>
  {#if profile.ratings.length === 0}
    <p class="empty">還沒有評價任何課程。</p>
  {:else}
    <ul class="ratings">
      {#each profile.ratings as rating (`${rating.school}/${rating.courseCode}`)}
        <li class="rating">
          <p class="course">
            <a href={rating.latestOfferingId ? `/courses/${rating.latestOfferingId}` : courseSearchHref(rating.school, rating.courseCode)}>{rating.title ?? rating.courseCode}</a>
            <span class="code">{data.schoolNames[rating.school] ?? rating.school} · {rating.courseCode}</span>
          </p>
          <p class="score"><span aria-hidden="true">{stars(rating.score)}</span> {rating.score} / 5 分</p>
          {#if rating.review}<p class="review">{rating.review}</p>{/if}
          <p class="when"><time datetime={rating.updatedAt}>{postedAt(rating.updatedAt)}</time></p>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section aria-labelledby="posts">
  <h2 id="posts">發表的文章（{profile.posts.length}）</h2>
  {#if profile.posts.length === 0}
    <p class="empty">還沒有發表文章。</p>
  {:else}
    <CommunityPostList posts={profile.posts} schoolNames={data.schoolNames} showAuthor={false} />
  {/if}
</section>

<style>
  .card { padding: clamp(1rem, 4vw, 1.75rem); background: white; border: 1px solid #e5dfef; border-radius: 1rem; }
  h1 { margin: 0; font-size: clamp(1.4rem, 5vw, 1.9rem); overflow-wrap: anywhere; }
  .handle { margin: 0; color: #594f69; overflow-wrap: anywhere; }
  .meta { margin: 0.5rem 0 0; color: #594f69; font-size: 0.925rem; }
  .bio { margin: 0.85rem 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  h2 { font-size: 1.1rem; margin: 1.75rem 0 0.6rem; }
  .empty { color: #594f69; }
  .ratings { display: grid; gap: 0.75rem; margin: 0; padding: 0; list-style: none; }
  .rating { padding: 0.9rem 1rem; background: white; border: 1px solid #e5dfef; border-radius: 0.85rem; min-width: 0; }
  .course { display: flex; flex-wrap: wrap; gap: 0.15rem 0.6rem; align-items: baseline; margin: 0; }
  .course a { font-weight: 650; overflow-wrap: anywhere; }
  .code { color: #594f69; font-size: 0.875rem; }
  .score { margin: 0.25rem 0 0; color: #7a4510; }
  .review { margin: 0.35rem 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .when { margin: 0.35rem 0 0; color: #594f69; font-size: 0.85rem; }
</style>
