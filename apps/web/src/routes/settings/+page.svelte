<script lang="ts">
  import { enhance } from '$app/forms';
  import { profileHref } from '$lib/community-paths';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  // After a failed save keep what was typed; otherwise show the stored profile.
  let values = $derived(
    form && 'message' in form
      ? form
      : { displayName: data.profile.displayName ?? '', bio: data.profile.bio ?? '', school: data.profile.school ?? '' }
  );
</script>

<svelte:head>
  <title>個人設定｜UniCourse</title>
</svelte:head>

<section class="card">
  <h1>個人設定</h1>
  <p class="meta">帳號 @{data.profile.username} · <a href={profileHref(data.profile.username)}>查看公開個人頁</a></p>
  <form method="POST" use:enhance={() => async ({ update }) => update({ reset: false })}>
    <label>
      顯示名稱
      <input name="displayName" maxlength="50" defaultValue={values.displayName} placeholder={data.profile.username} />
    </label>
    <label>
      自我介紹
      <textarea name="bio" rows="5" maxlength="500" defaultValue={values.bio}></textarea>
    </label>
    <!-- `selected` on options keeps a choice made before hydration; `value` on the select would reset it. -->
    <label>
      所屬學校
      <select name="school">
        <option value="" selected={!values.school}>不公開</option>
        {#each data.schools as school (school.slug)}
          <option value={school.slug} selected={school.slug === values.school}>{school.name}</option>
        {/each}
      </select>
    </label>
    {#if form && 'message' in form}<p class="error" role="alert">{form.message}</p>{/if}
    {#if form && 'saved' in form}<p class="saved" role="status">已儲存。</p>{/if}
    <button>儲存</button>
  </form>
</section>

<style>
  .card { max-width: 34rem; margin: 0 auto; padding: clamp(1rem, 5vw, 2rem); background: white; border: 1px solid #e5dfef; border-radius: 1rem; }
  h1 { margin: 0; font-size: 1.4rem; }
  .meta { margin: 0.25rem 0 1.25rem; color: #594f69; overflow-wrap: anywhere; }
  form { display: grid; gap: 0.85rem; }
  label { display: grid; gap: 0.25rem; font-weight: 650; }
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
  textarea { resize: vertical; }
  button { border-color: #5630a5; background: #5630a5; color: white; font-weight: 650; cursor: pointer; }
  .error { margin: 0; padding: 0.6rem 0.75rem; border-radius: 0.45rem; background: #fdecec; color: #8a1c1c; }
  .saved { margin: 0; padding: 0.6rem 0.75rem; border-radius: 0.45rem; background: #eaf6ee; color: #1d5a32; }
</style>
