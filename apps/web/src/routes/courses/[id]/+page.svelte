<script lang="ts">
  import { onMount } from 'svelte';
  import CommunityPostList from '$lib/community-post-list.svelte';
  import CommunityRatings from '$lib/community-ratings.svelte';
  import { forumHref, loginHref } from '$lib/community-paths';
  import CourseExternalReviews from '$lib/course-external-reviews.svelte';
  import CourseHistory from '$lib/course-history.svelte';
  import { fillRatio, nearlyFull, publishedCapacity } from '$lib/course-history';
  import { averageScore, stars } from '$lib/community-format';
  import { labelledExtra } from '$lib/course-extra';
  import { importedAt, isHttpUrl, meeting, requirement } from '$lib/format';
  import { departmentHref, instructorHref, schoolHref } from '$lib/overview-paths';
  import Badge from '$lib/ui/Badge.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { displayValue } from '$lib/ui/format';
  import '$lib/community-ui.css';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let course = $derived(data.course);
  let history = $derived(data.history);
  let extra = $derived(labelledExtra(course.extra));
  let capacity = $derived(publishedCapacity(course.capacity));
  let ratio = $derived(fillRatio(course.enrolled, capacity));
  let full = $derived(ratio != null && ratio >= nearlyFull);
  let totals = $derived(history.totals);
  let stats = $derived(data.ratings?.stats);
  // Some schools list 必選修 per class and program (「資工系114BA 必修 …」); the tile shows the category
  // and the school's own wording goes to the facts panel.
  let requirementText = $derived(course.requirementText?.trim() || undefined);
  let requirementLabel = $derived(
    course.requirement ? requirement({ requirement: course.requirement, requirementText: null })
      : requirementText && requirementText.length <= 8 ? requirementText : undefined
  );
  let requirementDetail = $derived(requirementText && requirementText !== requirementLabel ? requirementText : undefined);
  let sourceLabel = $derived(course.isDemo ? '校方網站' : '校方課程頁');
  let syllabus = $derived(course.syllabusUrl && isHttpUrl(course.syllabusUrl) ? course.syllabusUrl : undefined);
  let forumList = $derived(forumHref({ school: course.school, courseCode: course.courseCode }));
  let composeHref = $derived(`${forumList}&compose=1`);
  let newer = $derived(!course.active && history.latestActiveOfferingId && history.latestActiveOfferingId !== course.id
    ? history.latestActiveOfferingId
    : undefined);
  let termRow = $derived(history.rows.find((row) => row.current));
  // A term total only adds information when the term has more than one section.
  let termTotal = $derived(termRow && termRow.offeringCount > 1 ? termRow : undefined);
  let ratingCount = $derived(stats?.count ?? 0);
  let span = $derived(history.rows.length > 1 ? `${history.rows.at(-1)?.term}–${history.rows[0]?.term}` : undefined);
  let hasAbout = $derived(Boolean(course.description || course.notes || extra.length));

  // Long text sits last and starts collapsed on phones; desktops keep it open (it is server-rendered open).
  let aboutOpen = $state(true);
  onMount(() => {
    if (window.matchMedia('(max-width: 40rem)').matches) aboutOpen = false;
  });

  function credits(value: number | null | undefined) {
    return value == null ? null : displayValue(value);
  }
</script>

<svelte:head>
  <title>{course.title} · {course.schoolName}｜UniCourse</title>
  <meta name="description" content={`${course.schoolName} ${course.term} ${course.title}（${course.courseCode}）的時間地點、修課人數、歷年開課與同學評價。`} />
</svelte:head>

<div class="course-page">
  <nav class="crumbs" aria-label="所在位置">
    <a href="/">查課</a><span aria-hidden="true">/</span><a href={schoolHref(course.school)}>{course.schoolName}</a>
    {#if course.department}<span aria-hidden="true">/</span><a href={departmentHref(course.school, course.department)}>{course.department}</a>{/if}
  </nav>

  <header class="head">
    <div class="title">
      <h1>{course.title}</h1>
      {#if course.titleEn}<p class="en" lang="en">{course.titleEn}</p>{/if}
      <p class="dek">
        <span class="item mono">{course.term}</span>
        <span class="item mono">{course.courseCode}{#if course.classCode}-{course.classCode}{/if}</span>
        {#if course.instructors.length}
          <span class="item">{#each course.instructors as name, index (name)}{#if index > 0}、{/if}<a href={instructorHref(course.school, name)}>{name}</a>{/each}</span>
        {/if}
      </p>
      <p class="meta">
        {#if course.isDemo}<Badge label="示範" tone="demo" />{/if}
        {#if !course.active}<Badge label="已下架" tone="inactive" />{/if}
        <span class="fact">{#if course.credits != null}<b class="num">{credits(course.credits)}</b> 學分{:else}學分未公布{/if}</span>
        <span class="fact">{#if requirementLabel}<b>{requirementLabel}</b>{#if requirementDetail}<a class="detail" href="#requirement-detail">校方原文</a>{/if}{:else}必選修未公布{/if}</span>
        <span>{course.schoolName} · 更新於 <time datetime={course.importedAt}>{importedAt(course.importedAt)}</time>（臺北時間）</span>
      </p>
    </div>
    <div class="actions">
      {#if isHttpUrl(course.sourceUrl)}
        <a class="button primary" href={course.sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel}<span aria-hidden="true"> ↗</span><span class="sr-only">（外部網站）</span></a>
      {/if}
      {#if syllabus}
        <a class="button" href={syllabus} target="_blank" rel="noopener noreferrer">課綱<span aria-hidden="true"> ↗</span><span class="sr-only">（外部網站）</span></a>
      {/if}
    </div>
  </header>

  {#if course.isDemo || !course.active || (!isHttpUrl(course.sourceUrl) && course.sourceUrl) || (course.syllabusUrl && !syllabus)}
    <div class="notices">
      {#if course.isDemo}<p class="notice demo">示範資料，非校方實際開課紀錄。</p>{/if}
      {#if !course.active}
        <p class="notice">已下架：校方最新的課程資料已不再列出這個班次，此頁保留歷史開課資訊。{#if newer}<a href={`/courses/${newer}`}>看最新開課的班次 →</a>{/if}</p>
      {/if}
      {#if !isHttpUrl(course.sourceUrl) && course.sourceUrl}<p class="notice">{sourceLabel}：{course.sourceUrl}</p>{/if}
      {#if course.syllabusUrl && !syllabus}<p class="notice">課綱：{course.syllabusUrl}</p>{/if}
    </div>
  {/if}

  <div role="group" aria-label="課程重點"><dl class="tiles" class:three={!termTotal}>
    <div class="tile seats" class:full>
      <dt>本班修課人數／名額</dt>
      {#if course.enrolled != null}
        <dd><span class="value num">{displayValue(course.enrolled)}</span><small>/ {capacity != null ? `${displayValue(capacity)} 人` : '名額未公布'}</small></dd>
      {:else if capacity != null}
        <dd><span class="value num">—</span><small>/ {displayValue(capacity)} 人</small></dd>
      {:else}
        <dd><span class="value">—</span></dd>
      {/if}
      {#if ratio != null}
        <dd class="meter" aria-hidden="true"><span style:width={`${Math.min(100, ratio * 100)}%`}></span></dd>
        <dd class="note">{ratio > 1 ? `超過名額 ${Math.round((ratio - 1) * 100)}%` : `已選 ${Math.round(ratio * 100)}%`}{#if full && ratio <= 1}，接近額滿{/if}</dd>
      {:else}
        <dd class="note">{course.enrolled == null && capacity != null ? '未公布修課人數' : capacity == null && course.enrolled != null ? '校方未公布名額' : '人數與名額未公布'}</dd>
      {/if}
    </div>
    {#if termTotal}
      <div class="tile">
        <dt>本學期全班次（{termTotal.term}）</dt>
        {#if termTotal.enrolled != null}
          <dd><span class="value num">{displayValue(termTotal.enrolled)}</span><small>/ {termTotal.capacity != null ? `${displayValue(termTotal.capacity)} 人` : '名額未公布'}</small></dd>
        {:else}
          <dd><span class="value">—</span><small>人數未公布</small></dd>
        {/if}
        <dd class="note"><a href="#history">{displayValue(termTotal.offeringCount)} 個班次合計 ↓</a></dd>
      </div>
    {/if}
    <div class="tile">
      <dt>歷年累計</dt>
      {#if totals?.enrolledTotal != null}
        <dd><span class="value num">{displayValue(totals.enrolledTotal)}</span><small>人次</small></dd>
        <dd class="note"><a href="#history">{displayValue(totals.terms)} 個學期 · {displayValue(totals.offerings)} 班 ↓</a></dd>
      {:else if totals}
        <dd><span class="value num">{displayValue(totals.terms)}</span><small>個學期</small></dd>
        <dd class="note"><a href="#history">未公布人數 · {displayValue(totals.offerings)} 班 ↓</a></dd>
      {:else}
        <dd><span class="value">—</span></dd>
        <dd class="note">暫時無法取得</dd>
      {/if}
    </div>
    <div class="tile">
      <dt>同學評價</dt>
      {#if stats && ratingCount > 0}
        <dd><span class="value num">{averageScore(stats.average)}</span><small class="stars" aria-hidden="true">{stars(Math.round(stats.average ?? 0))}</small></dd>
        <dd class="note" class:sparse={ratingCount < 3}><a href="#ratings">{ratingCount < 3 ? `目前僅 ${ratingCount} 則評價，僅供參考 ↓` : `${displayValue(ratingCount)} 則評價 ↓`}</a></dd>
      {:else if stats}
        <dd><span class="value small-value">尚無評價</span></dd>
        <dd class="note"><a href="#ratings">修過這門課？成為第一個評分 ↓</a></dd>
      {:else}
        <dd><span class="value">—</span></dd>
        <dd class="note">暫時無法取得</dd>
      {/if}
    </div>
  </dl></div>

  <div class="overview">
    <section class="panel facts" aria-labelledby="schedule-title">
      <div class="when-where">
      <h2 id="schedule-title">時間地點</h2>
      {#if course.schedule?.length}
        <ul class="schedule">
          {#each course.schedule as slot, index (index)}
            <li><span class="when">{meeting(slot)}</span>{#if slot.location}<span class="where">{` · ${slot.location}`}</span>{/if}</li>
          {/each}
        </ul>
      {:else if course.scheduleText}
        <p class="schedule-text">{course.scheduleText}</p>
      {:else}
        <p class="muted">校方未公布上課時間。</p>
      {/if}
      </div>
      <dl class="facts-list">
        <div><dt>授課教師</dt><dd>{#each course.instructors as name, index (name)}{#if index > 0}、{/if}<a href={instructorHref(course.school, name)}>{name}</a>{:else}<span class="muted">未公布</span>{/each}</dd></div>
        {#if course.department}
          <div><dt>開課單位</dt><dd><a href={departmentHref(course.school, course.department)}>{course.department}</a>{#if course.departmentCode}&nbsp;<span class="muted mono">{course.departmentCode}</span>{/if}</dd></div>
        {/if}
        <div><dt>課號</dt><dd class="mono">{course.courseCode}{#if course.classCode}{` · 班次 ${course.classCode}`}{/if}</dd></div>
        {#if requirementDetail}<div class="wide" id="requirement-detail"><dt>必選修（校方原文）</dt><dd>{requirementDetail}</dd></div>{/if}
        {#if course.language}<div><dt>授課語言</dt><dd>{course.language}</dd></div>{/if}
        {#if course.campus}<div><dt>校區</dt><dd>{course.campus}</dd></div>{/if}
        {#if course.grade}<div><dt>年級</dt><dd>{course.grade}</dd></div>{/if}
      </dl>
    </section>

    <section class="history" aria-labelledby="history">
      <div class="section-head">
        <h2 id="history">這門課的歷年開課</h2>
        <p class="sub">同校同課號 <span class="mono">{course.courseCode}</span> 的每個學期{#if span}（{span}）{/if}；多班次的學期為各班加總。</p>
      </div>
      {#if !history.available}
        <p class="notice">歷年開課暫時無法取得，先列出本學期。</p>
      {/if}
      <CourseHistory rows={history.rows} currentId={course.id} school={course.school} courseCode={course.courseCode} />
      {#if history.available && history.rows.length === 1}
        <p class="muted small">目前只收錄到這一期，之後匯入其他學期後會在這裡畫出歷年修課人數。</p>
      {/if}
    </section>
  </div>

  <div class="community">
    <CommunityRatings ratings={data.ratings} user={data.user} {form} courseCode={course.courseCode} />
    <div class="external-slot"><CourseExternalReviews school={course.school} courseCode={course.courseCode} reviews={data.externalReviews} /></div>
  </div>

  <section class="forum" aria-labelledby="forum-title">
    <div class="section-head row">
      <div>
        <h2 id="forum-title">站內討論{#if data.posts}（{displayValue(data.posts.total)}）{/if}</h2>
        <p class="sub">UniCourse 論壇裡標記這門課的文章。</p>
      </div>
      <div class="actions">
        <a class="button primary" href={data.user ? composeHref : loginHref(composeHref)}>發表關於這門課的文章</a>
        <a class="button" href={forumList}>在論壇查看</a>
      </div>
    </div>
    {#if !data.posts}
      <EmptyState title="站內討論暫時無法取得" description="課程資料不受影響，請稍後再試。" tone="error" />
    {:else if data.posts.posts.length}
      <div class="cm"><CommunityPostList posts={data.posts.posts} schoolNames={{ [course.school]: course.schoolName }} label="這門課的站內討論" /></div>
      {#if data.posts.total > data.posts.posts.length}
        <p class="small"><a href={forumList}>查看全部 {displayValue(data.posts.total)} 篇 →</a></p>
      {/if}
    {:else}
      <EmptyState title="還沒有人討論這門課" description="問問修過的同學作業量、給分或考古題。" />
    {/if}
  </section>

  {#if hasAbout}
    <section class="about" aria-labelledby="about-title">
      <h2 id="about-title">課程說明與校方欄位</h2>
      {#if course.description}
        <details open={aboutOpen}>
          <summary><h3 id="description">課程概述</h3></summary>
          <p class="prose">{course.description}</p>
        </details>
      {/if}
      {#if course.notes}
        <details open={aboutOpen}>
          <summary><h3 id="notes">備註</h3></summary>
          <p class="prose">{course.notes}</p>
        </details>
      {/if}
      {#if extra.length}
        <details open={aboutOpen}>
          <summary><h3 id="extra">其他校方欄位（{extra.length}）</h3></summary>
          <dl class="extra">
            {#each extra as field (field.key)}
              <div><dt>{field.label}</dt><dd>{field.value}</dd></div>
            {/each}
          </dl>
        </details>
      {/if}
    </section>
  {/if}

  <p class="source">
    資料來源：{course.schoolName}{course.isDemo ? '（示範資料）' : '課程查詢系統'} · 最近匯入 <time datetime={course.importedAt}>{importedAt(course.importedAt)}</time>（臺北時間）
  </p>
</div>

<style>
  .course-page { display: grid; gap: var(--space-6); min-inline-size: 0; color: var(--ink); font-family: var(--font-sans); }
  .course-page > * { min-inline-size: 0; }
  .course-page :is(h1, h2, h3, p) { margin: 0; }
  .course-page :is(h1, h2, h3) { font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .course-page a { color: var(--brand-ink); text-underline-offset: 0.18em; }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .num { font-variant-numeric: tabular-nums; }
  .muted { color: var(--muted); }
  .small { font-size: var(--t-sm); }

  .crumbs { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; margin-block-end: calc(-1 * var(--space-5)); color: var(--muted); font-size: var(--t-base); }
  .crumbs a { display: inline-flex; align-items: center; min-block-size: var(--target-min); color: var(--ink-2); }

  .head { display: flex; flex-wrap: wrap; gap: var(--space-3) var(--space-6); align-items: start; justify-content: space-between; }
  .title { flex: 1 1 28rem; display: grid; gap: var(--space-1); min-inline-size: 0; }
  h1 { font-size: var(--t-2xl); overflow-wrap: anywhere; }
  .en { color: var(--ink-2); font-size: var(--t-md); overflow-wrap: anywhere; }
  .dek { display: flex; flex-wrap: wrap; gap: 0.125rem var(--space-3); align-items: center; margin-block-start: var(--space-1) !important; color: var(--muted); font-size: var(--t-base); }
  .meta { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); align-items: center; color: var(--muted); font-size: var(--t-sm); }
  .meta .fact { display: inline-flex; gap: var(--space-1); align-items: baseline; padding: 0 var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-pill); background: var(--panel); color: var(--ink-2); white-space: nowrap; }
  .meta .fact b { color: var(--ink); font-weight: 650; }
  .meta .detail { font-size: var(--t-xs); }
  .dek .item + .item::before { content: '·'; margin-inline-end: var(--space-3); color: var(--muted); }
  .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .button { display: inline-flex; align-items: center; justify-content: center; min-block-size: var(--target-min); padding: 0 var(--space-4); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink) !important; font-size: var(--t-base); font-weight: 650; text-decoration: none; white-space: nowrap; touch-action: manipulation; }
  .button:hover { background: var(--hover-row); }
  .button.primary { border-color: var(--brand); background: var(--brand); color: var(--on-brand) !important; }
  .button.primary:hover { border-color: var(--brand-ink); background: var(--brand-ink); }
  .course-page :focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }

  .notices { display: grid; gap: var(--space-2); margin-block-start: calc(-1 * var(--space-3)); }
  .notice { padding: var(--space-2) var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel); color: var(--ink-2); font-size: var(--t-base); overflow-wrap: anywhere; }
  .notice.demo { border-color: color-mix(in srgb, var(--warn) 40%, var(--line)); background: var(--warn-wash); color: var(--ink); }
  .notice a { margin-inline-start: var(--space-2); font-weight: 600; }

  .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); margin: 0; }
  .tiles.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .tile { display: grid; align-content: start; gap: var(--space-1); min-inline-size: 0; padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .tile dt { color: var(--muted); font-size: var(--t-sm); font-weight: 500; }
  .tile dd { display: flex; flex-wrap: wrap; gap: 0 var(--space-1); align-items: baseline; margin: 0; min-inline-size: 0; }
  .tile .value { font-size: var(--t-3xl); font-weight: 600; line-height: var(--leading-tight); overflow-wrap: anywhere; }
  .tile small { color: var(--muted); font-size: var(--t-sm); font-weight: 500; }
  .tile small.stars { color: var(--warn); font-size: var(--t-base); letter-spacing: 0.04em; }
  .tile .note { color: var(--muted); font-size: var(--t-sm); }
  .tile .note a { color: var(--ink-2); text-decoration: none; }
  .tile .value.small-value { font-size: var(--t-xl); }
  .tile .note.sparse a { color: var(--ink); font-weight: 600; }
  .tile .note a:hover { color: var(--brand-ink); text-decoration: underline; }
  .meter { display: block !important; block-size: 10px; margin-block: var(--space-1) 0 !important; border-radius: var(--radius-pill); background: var(--chip); overflow: hidden; }
  .meter span { display: block; block-size: 100%; border-radius: inherit; background: var(--brand); }
  .seats.full .meter span { background: var(--warn); }
  .seats.full .note { color: var(--warn); font-weight: 600; }

  .overview { display: grid; gap: var(--space-6); }
  .panel { padding: var(--space-4) var(--space-5); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  /* Time and place sit in one full-width strip, so the history below gets the whole column. */
  .facts { display: grid; grid-template-columns: minmax(14rem, 1fr) minmax(0, 2fr); gap: var(--space-3) var(--space-6); align-items: start; }
  .when-where { display: grid; gap: var(--space-2); min-inline-size: 0; }
  .facts h2, .section-head h2 { font-size: var(--t-xl); }
  .schedule { display: grid; gap: var(--space-1); margin: 0; padding: 0; list-style: none; font-size: var(--t-md); }
  .schedule .when { font-weight: 600; }
  .schedule .where { color: var(--ink-2); }
  .schedule-text { font-weight: 600; overflow-wrap: anywhere; }
  .facts-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr)); gap: var(--space-3) var(--space-4); margin: 0; padding-inline-start: var(--space-6); border-inline-start: 1px solid var(--line); font-size: var(--t-base); }
  .facts-list div { min-inline-size: 0; }
  .facts-list .wide { grid-column: 1 / -1; }
  .facts-list dt { color: var(--muted); font-size: var(--t-sm); }
  .facts-list dd { margin: 0; overflow-wrap: anywhere; }

  .history, .forum { display: grid; gap: var(--space-3); align-content: start; min-inline-size: 0; }
  .section-head { display: grid; gap: var(--space-1); }
  .section-head.row { display: flex; flex-wrap: wrap; gap: var(--space-3) var(--space-4); align-items: end; justify-content: space-between; }
  .sub { color: var(--muted); font-size: var(--t-base); overflow-wrap: anywhere; }

  .community { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-6); align-items: start; }
  /* Until the external reviews section exists, the ratings take the full width. */
  .community:has(> .external-slot:empty) { grid-template-columns: minmax(0, 1fr); }
  .external-slot:empty { display: none; }
  .external-slot > :global(section) { margin-block-start: 0; }

  .about { display: grid; gap: var(--space-2); max-inline-size: 52rem; }
  .about h2 { margin-block-end: var(--space-1) !important; font-size: var(--t-xl); }
  .about details { border-block-start: 1px solid var(--line); }
  .about summary { display: flex; align-items: center; justify-content: space-between; min-block-size: var(--target-min); list-style: none; cursor: pointer; }
  .about summary::-webkit-details-marker { display: none; }
  .about summary::after { content: '▾'; color: var(--muted); }
  .about details[open] summary::after { content: '▴'; }
  .about h3 { font-size: var(--t-lg); }
  .prose { padding-block-end: var(--space-4); color: var(--ink-2); font-size: var(--t-md); line-height: var(--leading-prose); white-space: pre-line; overflow-wrap: anywhere; }
  .extra { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: var(--space-3) var(--space-6); margin: 0; padding-block-end: var(--space-4); font-size: var(--t-base); }
  .extra div { min-inline-size: 0; }
  .extra dt { color: var(--muted); font-size: var(--t-sm); }
  .extra dd { margin: 0; overflow-wrap: anywhere; }
  .source { padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); color: var(--muted); font-size: var(--t-sm); }

  @media (max-width: 64rem) {
    .tiles, .tiles.three { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tiles.three .tile:last-child { grid-column: 1 / -1; }
    .facts { grid-template-columns: minmax(0, 1fr); }
    .facts-list { padding-inline-start: 0; padding-block-start: var(--space-3); border-inline-start: 0; border-block-start: 1px solid var(--line); }
    .community { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 40rem) {
    .course-page { gap: var(--space-5); }
    .crumbs { margin-block-end: calc(-1 * var(--space-4)); }
    .actions .button { flex: 1 1 auto; }
    .tiles { gap: var(--space-2); }
    .tile { padding: var(--space-3); }
    .tile .value { font-size: var(--t-2xl); }
    .panel { padding: var(--space-4); }
  }
</style>
