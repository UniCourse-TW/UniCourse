<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status === 404 ? '找不到使用者' : '發生錯誤'}｜UniCourse</title>
</svelte:head>

<section class="card">
  <h1>{page.status === 404 ? '找不到這位使用者' : '暫時無法顯示'}</h1>
  <p>{page.error?.message}</p>
  <a href="/forum">逛逛論壇</a>
</section>

<style>
  .card { padding: clamp(1rem, 4vw, 2rem); background: white; border: 1px solid #e5dfef; border-radius: 1rem; }
  h1 { margin: 0; font-size: 1.35rem; }
</style>
