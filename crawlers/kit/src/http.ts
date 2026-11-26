import iconvLite from 'iconv-lite';

// iconv-lite ships CommonJS with a `declare namespace` typing that hides `decode` under NodeNext.
const iconv = iconvLite as unknown as { decode(buffer: Buffer, encoding: string): string };

export interface HttpOptions {
  /** Max concurrent requests per client (default 2). */
  concurrency?: number;
  /** Minimum delay between request starts in ms (default 400). */
  delayMs?: number;
  /** Retries on network error / 429 / 5xx (default 3). */
  retries?: number;
  /** Per-request timeout in ms (default 30000). */
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: string | URLSearchParams | FormData;
  headers?: Record<string, string>;
  /** Force a charset such as 'big5' when the server does not declare one. */
  charset?: string;
}

export const USER_AGENT = 'UniCourseBot/0.1 (+https://unicourse.observe.tw; course catalog indexer)';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Small polite HTTP client: rate limited, retrying, charset aware. */
export class HttpClient {
  private active = 0;
  private lastStart = 0;
  private queue: (() => void)[] = [];
  private readonly options: Required<Omit<HttpOptions, 'headers'>> & { headers: Record<string, string> };
  readonly cookies = new Map<string, string>();

  constructor(options: HttpOptions = {}) {
    this.options = {
      concurrency: options.concurrency ?? 2,
      delayMs: options.delayMs ?? 400,
      retries: options.retries ?? 3,
      timeoutMs: options.timeoutMs ?? 30_000,
      headers: options.headers ?? {}
    };
  }

  private async acquire() {
    if (this.active >= this.options.concurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active += 1;
    const wait = this.lastStart + this.options.delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastStart = Date.now();
  }

  private release() {
    this.active -= 1;
    this.queue.shift()?.();
  }

  async fetch(url: string, request: RequestOptions = {}): Promise<Response> {
    await this.acquire();
    try {
      let attempt = 0;
      for (;;) {
        attempt += 1;
        try {
          const headers: Record<string, string> = {
            'user-agent': USER_AGENT,
            accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
            'accept-language': 'zh-TW,zh;q=0.9,en;q=0.5',
            ...this.options.headers,
            ...request.headers
          };
          if (this.cookies.size && !headers.cookie) {
            headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
          }
          const response = await fetch(url, {
            method: request.method ?? 'GET',
            body: request.body,
            headers,
            redirect: 'follow',
            signal: AbortSignal.timeout(this.options.timeoutMs)
          });
          for (const cookie of response.headers.getSetCookie?.() ?? []) {
            const [pair] = cookie.split(';');
            const eq = pair.indexOf('=');
            if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
          }
          if ((response.status === 429 || response.status >= 500) && attempt <= this.options.retries) {
            await sleep(1000 * 2 ** attempt);
            continue;
          }
          return response;
        } catch (error) {
          if (attempt > this.options.retries) throw error;
          await sleep(1000 * 2 ** attempt);
        }
      }
    } finally {
      this.release();
    }
  }

  /** Fetch and decode text, honoring the declared charset (Big5 pages are common). */
  async text(url: string, request: RequestOptions = {}): Promise<string> {
    const response = await this.fetch(url, request);
    if (!response.ok) throw new Error(`${request.method ?? 'GET'} ${url} -> HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const declared = /charset=([\w-]+)/i.exec(response.headers.get('content-type') ?? '')?.[1];
    const sniffed = /<meta[^>]+charset=["']?([\w-]+)/i.exec(buffer.subarray(0, 4096).toString('latin1'))?.[1];
    const charset = (request.charset ?? declared ?? sniffed ?? 'utf-8').toLowerCase();
    if (charset === 'utf-8' || charset === 'utf8') return buffer.toString('utf8');
    return iconv.decode(buffer, charset === 'big5' ? 'big5-hkscs' : charset);
  }

  async json<T = unknown>(url: string, request: RequestOptions = {}): Promise<T> {
    const response = await this.fetch(url, request);
    if (!response.ok) throw new Error(`${request.method ?? 'GET'} ${url} -> HTTP ${response.status}`);
    return (await response.json()) as T;
  }
}
