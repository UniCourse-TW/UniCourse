<script lang="ts">
  import { PRIVATE_REPORT_URL } from '$lib/legal-contact';

  interface Props {
    /** Disclosure title; the sign-in page asks a question, settings names the task. */
    summary?: string;
    /** Element id, so a「忘記密碼？」link elsewhere on the page can open and scroll to it. */
    id?: string;
    open?: boolean;
    /** Quieter summary while a sign-in is in flight. */
    quiet?: boolean;
    /** Centred under a form (sign-in), or flush left in a list (settings). */
    align?: 'center' | 'start';
    /** Plain text before the summary link (settings: what happens), so the row is not a bold purple action. */
    note?: string;
  }

  let { summary = '忘記密碼？重設方式', id = 'reset-help', open = $bindable(false), quiet = false, align = 'center', note }: Props = $props();
</script>

<!-- Password help, said in full before anyone leaves the site: there is no e-mail reset, so a maintainer
     resets it by hand from a private report; what to send, what never to send, how long it takes, and what
     to do without a GitHub account. No contact address is invented here. -->
<details class="reset-help" class:quiet class:start={align === 'start'} {id} bind:open>
  <summary>{#if note}<span class="note">{note}</span>{/if}<span class="label">{summary}</span><span class="chev" aria-hidden="true"></span></summary>
  <div class="body">
    <!-- The answer first (who resets it, how long), then the steps; what to write is a list of its own. -->
    <p class="lead">沒有 email 自動重設：維護者手動處理，通常七天內回覆。</p>
    <ol>
      <li><b>開私密回報</b>：只有維護者看得到。表單在 GitHub，免費註冊即可。</li>
      <li><b>寫明</b>（<b>不要寫密碼</b>）：
        <ul class="give">
          <li>帳號名稱</li>
          <li>大約何時註冊</li>
          <li>發過的一則評價或文章（若有）</li>
        </ul>
      </li>
      <li><b>等回覆</b>：在同一則回報說明下一步。</li>
    </ol>
    <a class="go" href={PRIVATE_REPORT_URL} rel="noopener external">開啟私密回報表單 <span aria-hidden="true">↗</span><span class="sr">（GitHub，外部網站）</span></a>
    <p class="alt">不想用 GitHub：可先建立新帳號繼續使用，舊帳號的評價與文章會留在原處。</p>
  </div>
</details>

<style>
  .reset-help { color: var(--ink-2); font-size: var(--t-base); line-height: 1.6; text-align: start; }
  summary { display: flex; gap: var(--space-2); align-items: center; justify-content: center; min-block-size: var(--target-min); color: var(--brand-ink); font-weight: 600; list-style: none; cursor: pointer; }
  summary::-webkit-details-marker { display: none; }
  summary:hover .label { text-decoration: underline; text-underline-offset: 0.15em; }
  summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: var(--radius-control); }
  .chev::before { content: '▾'; color: var(--muted); }
  details[open] .chev::before { content: '▴'; }
  .quiet summary { color: var(--ink-2); }
  .start summary { justify-content: flex-start; flex-wrap: wrap; gap: 0 var(--space-2); }
  .note { color: var(--ink); font-weight: 400; }
  .start .label { text-decoration: underline; text-underline-offset: 0.15em; }
  .body { display: grid; gap: var(--space-1); padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel-raised); font-size: 0.8125rem; }
  .body p, .body ol { margin: 0; }
  .lead { color: var(--ink); font-weight: 600; text-wrap: pretty; }
  ol { display: grid; gap: var(--space-1); padding-inline-start: 1.25rem; }
  li { text-wrap: pretty; }
  li b { color: var(--ink); font-weight: 650; }
  .give { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); margin: 0; padding: 0; list-style: none; }
  .give li::before { content: '・'; color: var(--muted); }
  .go { display: inline-flex; gap: 0.25em; align-items: center; justify-self: start; min-block-size: var(--target-min); font-size: var(--t-base); color: var(--brand-ink); font-weight: 650; text-underline-offset: 0.15em; }
  .go:focus-visible { outline: var(--focus-ring); outline-offset: 2px; border-radius: 4px; }
  .alt { color: var(--ink-2); font-size: 0.8125rem; text-wrap: pretty; }
  .sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
