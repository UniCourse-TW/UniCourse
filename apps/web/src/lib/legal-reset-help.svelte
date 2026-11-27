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
  }

  let { summary = '忘記密碼？重設方式', id = 'reset-help', open = $bindable(false), quiet = false, align = 'center' }: Props = $props();
</script>

<!-- Password help, said in full before anyone leaves the site: there is no e-mail reset, so a maintainer
     resets it by hand from a private report; what to send, what never to send, how long it takes, and what
     to do without a GitHub account. No contact address is invented here. -->
<details class="reset-help" class:quiet class:start={align === 'start'} {id} bind:open>
  <summary><span class="label">{summary}</span><span class="chev" aria-hidden="true"></span></summary>
  <div class="body">
    <p class="lead">本站不收 email，沒有自動重設；由維護者手動處理：</p>
    <ol>
      <li><b>私密回報</b>（只有維護者看得到）。表單在 GitHub，免費註冊即可，不需要會寫程式。</li>
      <li><b>寫明</b>帳號名稱、大約何時註冊、發過的一則評價或文章（若有）。<b>不要寫密碼。</b></li>
      <li><b>等候回覆</b>：通常七天內在同一則回報說明下一步。</li>
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
  .start summary { justify-content: space-between; }
  .body { display: grid; gap: var(--space-1); padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel-raised); font-size: 0.8125rem; }
  .body p, .body ol { margin: 0; }
  .lead { color: var(--ink); font-weight: 600; text-wrap: pretty; }
  ol { display: grid; gap: var(--space-1); padding-inline-start: 1.25rem; }
  li { text-wrap: pretty; }
  li b { color: var(--ink); font-weight: 650; }
  .go { display: inline-flex; gap: 0.25em; align-items: center; justify-self: start; min-block-size: var(--target-min); font-size: var(--t-base); color: var(--brand-ink); font-weight: 650; text-underline-offset: 0.15em; }
  .go:focus-visible { outline: var(--focus-ring); outline-offset: 2px; border-radius: 4px; }
  .alt { color: var(--ink-2); font-size: 0.8125rem; text-wrap: pretty; }
  .sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
