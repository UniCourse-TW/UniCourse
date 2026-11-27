<script lang="ts">
  import { onMount } from 'svelte';
  import CommunityPostList from '$lib/community-post-list.svelte';
  import CommunityRatings from '$lib/community-ratings.svelte';
  import { forumHref, loginHref } from '$lib/community-paths';
  import CourseExternalReviews from '$lib/course-external-reviews.svelte';
  import CourseHistory from '$lib/course-history.svelte';
  import { fillRatio, nearlyFull, publishedCapacity } from '$lib/course-history';
  import { averageScore, courseKey } from '$lib/community-format';
  import { labelledExtra } from '$lib/course-extra';
  import { englishTitle } from '$lib/course-title';
  import { shortDateTime } from '$lib/community-format';
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
  let hasAbout = $derived(Boolean(course.description || course.notes || extra.length || requirementDetail));
  // When and where is what a student checks first: the head lists every slot, once, on the page.
  let slots = $derived(course.schedule ?? []);
  let scheduleText = $derived(slots.length ? undefined : course.scheduleText?.trim() || undefined);
  // A term of the current academic year (August to July) is still running: its numbers are a snapshot of
  // the last import. Anything older is a finished class whose numbers are its final selection result,
  // even when it is the newest term UniCourse has for this school.
  let latestTerm = $derived.by(() => {
    const year = Number(course.term.split('-')[0]);
    const now = new Date();
    const academic = now.getFullYear() - 1911 - (now.getMonth() < 7 ? 1 : 0);
    return Number.isFinite(year) && year >= academic && history.rows[0]?.term === course.term;
  });
  let titleEn = $derived(englishTitle(course.titleEn));
  let externalTotal = $derived(data.externalReviews?.sources.reduce((sum, source) => sum + source.count, 0) ?? 0);
  /** Indexed posts naming this offering's teacher, when every post is listed (same rule as the section). */
  let externalMine = $derived.by(() => {
    const posts = data.externalReviews?.posts ?? [];
    if (!course.instructors.length || posts.length !== externalTotal) return undefined;
    const own = new Set(course.instructors);
    return posts.filter((post) => (post.match?.instructor && own.has(post.match.instructor)) || post.teachers.some((name) => own.has(name))).length;
  });
  // Indexed posts move above the site's own sections while those are both still empty, so the page's
  // most useful signal is not below two empty states.
  let communityEmpty = $derived(stats != null && ratingCount === 0 && data.posts?.total === 0);
  let externalFirst = $derived(externalTotal > 0 && communityEmpty);
  let discussionHref = $derived(data.user ? composeHref : loginHref(composeHref));
  // With no site ratings yet, the fourth tile shows the indexed posts instead of a second empty state.
  let externalTile = $derived(externalTotal > 0 && stats != null && ratingCount === 0);
  let updated = $derived(shortDateTime(course.importedAt));
  let importDay = $derived(updated.split(' ')[0]);
  let externalLabel = $derived(
    data.externalReviews?.sources.length === 1 ? data.externalReviews.sources[0].sourceLabel.replace(/\s*批踢踢$/u, '') : '外站'
  );
  let aboutOpen = $state(true);
  onMount(() => {
    if (window.matchMedia('(max-width: 40rem)').matches) aboutOpen = false;
  });


  /** A field whose whole value is one web address. */
  function fieldUrl(value: string) {
    const trimmed = value.trim();
    return isHttpUrl(trimmed) && !/\s/u.test(trimmed) ? trimmed : undefined;
  }

  function urlHost(url: string) {
    try {
      return new URL(url).host.replace(/^www\./u, '');
    } catch {
      return url;
    }
  }

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
      {#if titleEn}<p class="en" lang="en">{titleEn}</p>{/if}
      <!-- Every meeting slot, once on the page: day, periods and room lead the head. -->
      <p class="when-line" aria-label="上課時間地點">
        {#each slots as slot, index (index)}
          <span class="slot"><b>{meeting(slot)}</b>{#if slot.location}<span class="room">{slot.location}</span>{/if}</span>
        {:else}
          {#if scheduleText}<span class="slot"><b>{scheduleText}</b></span>{:else}<span class="slot muted">校方未公布上課時間</span>{/if}
        {/each}
      </p>
      <p class="meta">
        {#if course.isDemo}<Badge label="示範" tone="demo" />{/if}
        {#if !course.active}<Badge label="已下架" tone="inactive" />{/if}
        <span class="item mono">{course.term}</span>
        <span class="item mono">{course.courseCode}{#if course.classCode}-{course.classCode}{/if}</span>
        {#if course.instructors.length}
          <span class="item people">{#each course.instructors as name, index (name)}{#if index > 0}、{/if}<a href={instructorHref(course.school, name)}>{name}</a>{/each}</span>
        {:else}<span class="item muted">教師未公布</span>{/if}
        {#if course.language}<span class="item">{course.language}授課</span>{/if}
        {#if course.campus}<span class="item">{course.campus}</span>{/if}
        {#if course.grade}<span class="item">{course.grade}</span>{/if}
      </p>
      <p class="headline-facts" aria-label="學分與必選修">
        <span class="item">{#if course.credits != null}<b class="num">{credits(course.credits)}</b> 學分{:else}學分未公布{/if}</span>
        <span class="item">{#if requirementLabel}<b>{requirementLabel}</b>{#if requirementDetail}<a class="detail" href="#requirement-detail" title={`校方原文：「${requirementDetail}」`} aria-label="必選修的校方原文">ⓘ</a>{/if}{:else}必選修未公布{/if}</span>
      </p>
    </div>
    <div class="actions">
      {#if isHttpUrl(course.sourceUrl)}
        <a class="button primary" href={course.sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel}<span aria-hidden="true"> ↗</span><span class="sr-only">（外部網站）</span></a>
      {/if}
      {#if syllabus}
        <a class="button" href={syllabus} target="_blank" rel="noopener noreferrer">課綱<span aria-hidden="true"> ↗</span><span class="sr-only">（外部網站）</span></a>
      {/if}
      <p class="actions-note">更新於 <time datetime={course.importedAt} title={importedAt(course.importedAt)}>{updated}</time>・臺北時間{#if isHttpUrl(course.sourceUrl)}；即時名額以校方為準{/if}</p>
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

  <!-- Four numbers, each with the scope in its label (本班 / 該學期全部班次 / 歷年) and a link down. -->
  <div role="group" aria-label="課程重點"><dl class="tiles" class:three={!termTotal}>
    <div class="tile seats" class:full>
      {#if course.enrolled == null && capacity != null}
        <!-- Only 名額 was published: the tile leads with it instead of a dash. -->
        <dt>本班名額</dt>
        <dd><span class="value num">{displayValue(capacity)}</span><small>人</small></dd>
        <dd class="note">校方未公布修課人數</dd>
      {:else}
        <dt>本班修課人數／名額</dt>
        {#if course.enrolled != null}
          <dd><span class="value num">{displayValue(course.enrolled)}</span><small>/ {capacity != null ? `${displayValue(capacity)} 人` : '名額未公布'}</small></dd>
        {:else}
          <dd><span class="value">—</span></dd>
        {/if}
        {#if ratio != null}
          {@const share = Math.round(ratio * 100)}
          <dd class="meter" aria-hidden="true"><span style:width={`${Math.min(100, ratio * 100)}%`}></span></dd>
          {#if latestTerm}
            <!-- The term is in the sentence, so an older term's snapshot is not read as today's seats. -->
            <dd class="note" title="UniCourse 匯入校方資料當時的快照，即時名額以校方為準">{course.term} {ratio > 1 ? `超額，名額的 ${share}%` : `已選 ${share}%`}{#if full && ratio <= 1}，接近額滿{/if}・<span class="nowrap">{importDay} 匯入</span></dd>
          {:else}
            <!-- A finished class: its final result, said as history so it is not read as today's seats. -->
            <dd class="note"><span class="past">{course.term} 歷史班次</span>{ratio > 1 ? `最終超額 ${share}%` : `最終選課 ${share}%`}</dd>
          {/if}
        {:else}
          <dd class="note">{capacity == null && course.enrolled != null ? '校方未公布名額' : '人數與名額未公布'}</dd>
        {/if}
      {/if}
    </div>
    {#if termTotal}
      <div class="tile" class:partial={termTotal.partial}>
        <!-- Short label (one line on phones); the term and how many sections it covers go in the sub-line. -->
        <dt>同學期各班合計</dt>
        {#if termTotal.enrolled == null && termTotal.capacity != null}
          <dd><span class="value num">{displayValue(termTotal.capacity)}</span><small>名額</small></dd>
        {:else if termTotal.enrolled != null}
          <dd><span class="value num">{displayValue(termTotal.enrolled)}</span><small>/ {termTotal.capacity != null ? `${displayValue(termTotal.capacity)} 人` : '名額未公布'}</small></dd>
        {:else}
          <dd><span class="value">—</span><small>人數未公布</small></dd>
        {/if}
        <dd class="note"><a href="#history"><span class="mono">{termTotal.term}</span>・{#if termTotal.partial}<span title={termTotal.usualSections ? `其他學期通常約 ${displayValue(termTotal.usualSections)} 班` : undefined}>只收錄 {displayValue(termTotal.offeringCount)} 班</span>{:else}{displayValue(termTotal.offeringCount)} 班{/if}&nbsp;↓</a></dd>
      </div>
    {/if}
    <div class="tile">
      {#if totals?.enrolledTotal != null}
        <dt>跨學期累計修課人次</dt>
        <dd><span class="value num">{displayValue(totals.enrolledTotal)}</span><small>人次</small></dd>
        <dd class="note"><a href="#history">{displayValue(totals.terms)} 期・{displayValue(totals.offerings)} 班&nbsp;↓</a></dd>
      {:else if totals?.capacityTotal != null}
        <!-- No published enrolment: the running total is of 名額, said in the label. -->
        <dt>歷年名額合計</dt>
        <dd><span class="value num">{displayValue(totals.capacityTotal)}</span><small>名額</small></dd>
        <dd class="note"><a href="#history">{displayValue(totals.terms)} 期・{displayValue(totals.offerings)} 班&nbsp;↓</a></dd>
      {:else if totals}
        <dt>歷年開課</dt>
        <dd><span class="value num">{displayValue(totals.terms)}</span><small>期</small></dd>
        <dd class="note"><a href="#history">{displayValue(totals.offerings)} 班・未公布人數&nbsp;↓</a></dd>
      {:else}
        <dt>跨學期累計修課人次</dt>
        <dd><span class="value">—</span></dd>
        <dd class="note">暫時無法取得</dd>
      {/if}
    </div>
    <div class="tile">
      {#if externalTile}
        <dt>外站討論（{externalLabel}）</dt>
        <dd><span class="value num">{displayValue(externalTotal)}</span><small>篇</small></dd>
        <dd class="note"><a href="#external-reviews">看索引與來源 ↓</a></dd>
      {:else}
        <dt>同學評價</dt>
        {#if stats && ratingCount > 0}
          <!-- The sample size sits with the average, so 4.0 from one person never reads like a consensus. -->
          <dd class:thin={ratingCount < 3}><span class="value num">{averageScore(stats.average)}</span><small class="out-of">/ 5</small><small class="sample" class:sparse={ratingCount < 3}>{ratingCount < 3 ? `僅 ${ratingCount} 則` : `${displayValue(ratingCount)} 則`}</small></dd>
        {:else if stats}
          <dd><span class="value small-value">尚無評價</span></dd>
        {:else}
          <dd><span class="value">—</span></dd>
        {/if}
        {#if !stats}<dd class="note">評價暫時無法取得</dd>{/if}
      {/if}
    </div>
  </dl></div>

  <!-- Jump links in page order; indexed posts lead (with their count) when they come first on the page. -->
  {#snippet externalLink()}
    <a href="#external-reviews" class:lead={externalFirst}>外站討論{#if externalTotal} <span class="num">{displayValue(externalTotal)}</span> 篇{#if externalMine != null && externalMine < externalTotal}<span class="sub-count">（本班教師 <span class="num">{displayValue(externalMine)}</span>）</span>{/if}{/if} ↓</a>
  {/snippet}
  <nav class="section-links" aria-label="本頁段落">
    {#if externalFirst}{@render externalLink()}{/if}
    {#if communityEmpty}
      <a href="#ratings">站內評價與討論 <span class="num">0</span> ↓</a>
    {:else}
      <a href="#ratings">站內評價{#if stats} <span class="num">{displayValue(ratingCount)}</span>{/if} ↓</a>
      <a href="#forum-title">站內討論{#if data.posts} <span class="num">{displayValue(data.posts.total)}</span>{/if} ↓</a>
    {/if}
    {#if !externalFirst}{@render externalLink()}{/if}
    {#if hasAbout}<a href="#about-title">課程說明 ↓</a>{/if}
  </nav>

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

  {#if externalFirst}
    <CourseExternalReviews school={course.school} courseCode={course.courseCode} title={course.title} instructors={course.instructors} reviews={data.externalReviews} />
  {/if}

  <!-- Site ratings and site threads side by side; indexed posts from other sites get the full width below. -->
  <div class="community" class:combined={communityEmpty}>
    <CommunityRatings ratings={data.ratings} user={data.user} {form} courseCode={course.courseCode}
      firstDiscussionHref={communityEmpty ? discussionHref : undefined} />

    {#if !communityEmpty}
      <section class="forum" aria-labelledby="forum-title">
        <div class="section-head row">
          <div>
            <h2 id="forum-title">站內討論{#if data.posts}（{displayValue(data.posts.total)}）{/if}</h2>
            <p class="sub">UniCourse 論壇裡標記這門課的文章。</p>
          </div>
          <div class="actions">
            <a class="button primary" href={discussionHref}>發表關於這門課的文章</a>
            <a class="button" href={forumList}>在論壇查看</a>
          </div>
        </div>
        {#if !data.posts}
          <EmptyState title="站內討論暫時無法取得" description="課程資料不受影響，請稍後再試。" tone="error" />
        {:else if data.posts.posts.length}
          <div class="cm"><CommunityPostList posts={data.posts.posts} schoolNames={{ [course.school]: course.schoolName }} courseTitles={{ [courseKey(course.school, course.courseCode)]: course.title }} showCourse={false} dense label="這門課的站內討論" /></div>
          {#if data.posts.total > data.posts.posts.length}
            <p class="small"><a href={forumList}>查看全部 {displayValue(data.posts.total)} 篇 →</a></p>
          {/if}
        {:else}
          <EmptyState title="還沒有人討論這門課" description="問問修過的同學作業量、給分或考古題。" />
        {/if}
      </section>
    {/if}
  </div>

  {#if !externalFirst}
    <CourseExternalReviews school={course.school} courseCode={course.courseCode} title={course.title} instructors={course.instructors} reviews={data.externalReviews} />
  {/if}

  {#if hasAbout}
    <section class="about" aria-labelledby="about-title">
      <h2 id="about-title">課程說明與校方欄位</h2>
      {#if requirementDetail}
        <dl class="extra lead-facts">
          {#if requirementDetail}<div id="requirement-detail"><dt>必選修（校方原文）</dt><dd>「{requirementDetail}」{#if requirementLabel}<span class="muted small">・UniCourse 歸為「{requirementLabel}」</span>{/if}</dd></div>{/if}
        </dl>
      {/if}
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
              {@const url = fieldUrl(field.value)}
              <!-- A bare URL is a link named after its host (「ceiba.ntu.edu.tw 的頁面 ↗」), never a raw address broken mid-line. -->
              <div><dt>{field.label}</dt><dd>{#if url}<a href={url} target="_blank" rel="noopener noreferrer nofollow">{urlHost(url)} 的頁面<span aria-hidden="true"> ↗</span><span class="sr-only">（外部網站）</span></a>{:else}{field.value}{/if}</dd></div>
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
  /* The schedule leads: bold day and periods, the room beside them; several slots wrap as a list. */
  .when-line { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-5); margin-block-start: var(--space-2) !important; font-size: var(--t-lg); }
  .when-line .slot { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: baseline; }
  .when-line b { font-weight: 650; }
  .when-line .room { color: var(--ink-2); }
  .when-line .slot { gap: 0; }
  .when-line .room::before { content: '·'; margin-inline: var(--space-2); color: var(--muted); }
  /* Everything else about the class on one wrapping line: term, code, teachers, credits, 必選修, language. */
  /* Each item carries its dot in the gap before it; the row clips anything left of its edge, so a wrapped
     line never starts with a stray「・」. */
  .meta { display: flex; flex-wrap: wrap; gap: 0.125rem 1.5em; align-items: center; color: var(--ink-2); font-size: var(--t-md); overflow: clip; overflow-clip-margin: 4px; }
  .meta .item { position: relative; white-space: nowrap; }
  .meta .item.people { white-space: normal; }
  .meta .item::before { content: '·'; position: absolute; inset-inline-start: -1.5em; inline-size: 1.5em; color: var(--muted); text-align: center; }
  .headline-facts { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: baseline; margin-block-start: var(--space-1) !important; color: var(--ink-2); font-size: var(--t-md); }
  .headline-facts .item { padding: 1px var(--space-2); border-radius: var(--radius-pill); background: var(--chip); }
  .headline-facts b { color: var(--ink); font-weight: 650; }
  .headline-facts .detail { margin-inline-start: 2px; color: var(--muted); font-size: var(--t-sm); text-decoration: none; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: end; }
  .actions-note { flex-basis: 100%; color: var(--muted); font-size: var(--t-xs); text-align: end; }
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
  .tile dt { color: var(--ink-2); font-size: var(--t-base); font-weight: 650; }
  .tile dd { display: flex; flex-wrap: wrap; gap: 0 var(--space-1); align-items: baseline; margin: 0; min-inline-size: 0; }
  .tile .value { font-size: var(--t-3xl); font-weight: 600; line-height: var(--leading-tight); overflow-wrap: anywhere; }
  .tile small { color: var(--muted); font-size: var(--t-sm); font-weight: 500; }
  .tile .note { color: var(--ink-2); font-size: 0.8125rem; }
  .tile .note a { color: var(--ink-2); text-decoration: none; }
  .tile .value.small-value { font-size: var(--t-xl); }
  .tile .thin .value { font-size: var(--t-2xl); }
  .tile.partial .value { color: var(--ink-2); }
  .tile .note a:hover { color: var(--brand-ink); text-decoration: underline; }
  .tile .sample { margin-inline-start: var(--space-1); color: var(--ink-2); font-weight: 600; white-space: nowrap; }
  .tile .sample.sparse { padding: 0 6px; border-radius: var(--radius-pill); background: var(--warn-wash); color: var(--ink); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--warn) 40%, transparent); }
  .nowrap { white-space: nowrap; }
  .tile .past { margin-inline-end: 0.4em; padding: 0 5px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: 0.8125rem; font-weight: 650; white-space: nowrap; }
  .lead-facts { padding-block: var(--space-2) var(--space-4); }
  .meter { display: block !important; block-size: 10px; margin-block: var(--space-1) 0 !important; border-radius: var(--radius-pill); background: var(--chip); overflow: hidden; }
  .meter span { display: block; block-size: 100%; border-radius: inherit; background: var(--brand); }
  .seats.full .meter span { background: var(--warn); }
  .seats.full .note { color: var(--warn); font-weight: 600; }


  .history, .forum { display: grid; gap: var(--space-3); align-content: start; min-inline-size: 0; }
  .section-head { display: grid; gap: var(--space-1); }
  .section-head h2 { font-size: var(--t-xl); }
  .section-head.row { display: flex; flex-wrap: wrap; gap: var(--space-3) var(--space-4); align-items: end; justify-content: space-between; }
  .sub { color: var(--muted); font-size: var(--t-base); overflow-wrap: anywhere; }

  .section-links { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); align-items: center; margin-block: calc(-1 * var(--space-3)); font-size: var(--t-base); }
  .section-links a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: var(--target-min); font-weight: 650; }
  .section-links .sub-count { color: var(--ink-2); font-weight: 500; }
  /* When indexed posts come before the site's (empty) sections, their link is the outlined lead. */
  .section-links a.lead { padding-inline: var(--space-3); border: 1px solid color-mix(in srgb, var(--brand) 55%, var(--line)); border-radius: var(--radius-control); background: var(--brand-wash); text-decoration: none; }
  .section-links a.lead:hover { border-color: var(--brand); }
  .course-page :is(#history, #forum-title, #about-title), .course-page :global(:is(#ratings, #external-reviews)) { scroll-margin-block-start: 7.5rem; }
  .community { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-6); align-items: start; }
  .community.combined { grid-template-columns: minmax(0, 1fr); }

  .about { display: grid; gap: var(--space-2); }
  .about details > p { max-inline-size: 52rem; }
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
    .actions { justify-content: start; }
    .community { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 40rem) {
    .course-page { gap: var(--space-5); }
    .crumbs { margin-block-end: calc(-1 * var(--space-4)); }
    .actions .button { flex: 1 1 auto; }
    .actions-note { text-align: start; }
    .when-line { font-size: var(--t-md); }
    .tiles { gap: var(--space-2); }
    .tile { padding: var(--space-3); }
    .tile .value { font-size: var(--t-2xl); }
  }
</style>
