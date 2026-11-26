import { compact, loadHtml, type Meeting, type Offering } from '@unicourse/crawler-kit';

export const creditUrl = 'https://eec.ntua.edu.tw/Course/Credit';
export const archiveUrl = 'https://eec.ntua.edu.tw/PastCourse/Search';

interface Stage {
  id: string;
  name: string;
  term: string;
  archived?: boolean;
}

function stageTerm(name: string): string | undefined {
  return name.match(/^(\d{3}-(?:[123]|暑))(?:\s|$)/)?.[1].replace(/暑$/, '3');
}

export function parseStages(html: string): Stage[] {
  const $ = loadHtml(html);
  const stages = $('#stageList option').toArray().flatMap((option) => {
    const id = $(option).attr('value')?.trim();
    const name = $(option).text().trim();
    const term = stageTerm(name);
    return id && /^\d+$/.test(id) && term ? [{ id, name, term }] : [];
  });
  if (!stages.length) throw new Error('NTUA: no published stages in extension credit catalog');
  return stages;
}

export function parseArchiveStages(html: string): Stage[] {
  const $ = loadHtml(html);
  const entries = $('#stageContainer > .row > div > .row > div').toArray();
  if (!entries.length) throw new Error('NTUA: missing archive stage index');
  const stages: Stage[] = [];
  let credit = false;
  for (const entry of entries) {
    const heading = $(entry).find('h4').text().trim();
    if (heading) credit = /^(學士課程|碩士課程)$/.test(heading);
    if (!credit) continue;
    const link = $(entry).find('a.courseType-btn');
    const id = link.attr('href')?.match(/^\/PastCourse\?stageId=(\d+)$/)?.[1];
    const name = link.text().trim();
    const term = stageTerm(name);
    if (id && term) stages.push({ id, name, term, archived: true });
  }
  return stages;
}

function clean(text: string): string {
  return text.trim().replace(/[\t ]+/g, ' ');
}

function meetings(time: string, room: string): Meeting[] {
  const normalized = time.normalize('NFKC');
  const clock = '\\d{1,2}:\\d{2}\\s*[-–~]\\s*\\d{1,2}:\\d{2}';
  const pattern = new RegExp(`\\(([一二三四五六日])\\)\\s*(${clock}(?:\\s*,\\s*${clock})*)`, 'g');
  if (normalized.replace(pattern, '').replace(/[\s,、;]+/g, '')) return [];
  const matches = [...normalized.matchAll(pattern)];
  const location = room && !/另定|未定/.test(room) && (matches.length === 1 || !/[,、;；\n]/.test(room)) ? room : undefined;
  return matches.map((match) => compact({
    day: '一二三四五六日'.indexOf(match[1]) + 1,
    periods: match[2].replace(/\s+/g, '').split(','),
    location
  }));
}

export function parseCreditPage(html: string, stage: Stage) {
  const $ = loadHtml(html);
  const matchesStage = stage.archived
    ? $('#courseContainer .breadcrumb-item.active').first().text().trim() === stage.name
    : $('#stageList option[selected]').attr('value') === stage.id;
  if (!matchesStage) {
    throw new Error(`NTUA: missing or mismatched stage ${stage.id}`);
  }
  const headings = $('#courselist ' + (stage.archived ? 'div.course-list > small' : '[role="columnheader"]'))
    .map((_, cell) => clean($(cell).text())).get();
  const offerings: Offering[] = [];
  for (const row of $('#courselist a.course-list').toArray()) {
    const href = $(row).attr('href');
    const sourceId = href?.match(/^\/Course\/Detail\/(\d+)$/)?.[1];
    const title = clean($(row).find('h4').text());
    const cells = $(row).children('div').toArray();
    if (!href || !sourceId || !title || !headings.includes('課程時間') || cells.length !== headings.length) {
      throw new Error(`NTUA: unexpected course row in stage ${stage.id}`);
    }
    const values = Object.fromEntries(cells.map((cell, index) => {
      const content = $(cell).clone();
      content.find('.d-lg-none').remove();
      return [headings[index], clean(content.text())];
    }));
    const time = values.課程時間 ?? '';
    const room = values.上課教室 ?? '';
    const extra = compact({
      資料範圍: '推廣教育學分班（非全校課表）',
      期別: stage.name,
      課程狀態: $(cells[0]).find('h4 + span').text(),
      課程日期: values.課程日期,
      課程費用: values.課程費用
    });
    offerings.push(compact({
      sourceId,
      courseCode: sourceId,
      title,
      instructors: (values.授課老師 ?? '').split(/[,，、;；\r\n]+/).map(clean).filter(Boolean),
      department: values.開課單位,
      schedule: meetings(time, room),
      scheduleText: [time, room].filter(Boolean).join(' / '),
      sourceUrl: new URL(stage.archived ? `/PastCourse/Detail/${sourceId}` : href, creditUrl).href,
      extra
    }));
  }
  if (!offerings.length && !$('#courselist h5').toArray().some((heading) => clean($(heading).text()) === '暫無課程資訊')) {
    throw new Error(`NTUA: no course rows for stage ${stage.id}; check catalog markup`);
  }

  const pages = new Set<number>();
  for (const link of $('#courseContainer .pagination a[href]').toArray()) {
    const url = new URL($(link).attr('href')!, creditUrl);
    const page = url.searchParams.get('page');
    if (url.origin === new URL(creditUrl).origin && url.pathname === (stage.archived ? '/PastCourse' : '/Course/Credit') &&
        url.searchParams.get('stageId') === stage.id && page && /^[1-9]\d*$/.test(page)) {
      pages.add(Number(page));
    }
  }
  return { offerings, pages: [...pages].sort((left, right) => left - right) };
}

export function parseDetail(html: string, offering: Offering): Offering {
  const $ = loadHtml(html);
  const canonical = $('link[rel="canonical"]').attr('href');
  if (!canonical || new URL(canonical, creditUrl).pathname !== new URL(offering.sourceUrl).pathname || !$('main h2.h1').length) {
    throw new Error(`NTUA: unexpected detail page for ${offering.sourceId}`);
  }
  const fields = new Map<string, string>();
  for (const label of $('main .item-title').toArray()) {
    fields.set(clean($(label).text()), clean($(label).next().text()));
  }
  const capacity = fields.get('招生名額')?.match(/^(\d+)\s*位?$/)?.[1];
  const [credit, hours] = (fields.get('學分/時數') ?? '').split('/').map(clean);
  const descriptionBlock = $('main h4').filter((_, heading) => clean($(heading).text()) === '課程概要').first().next('.wysiwyg');
  descriptionBlock.find('script, style').remove();
  descriptionBlock.find('br').replaceWith('\n');
  const description = descriptionBlock.text().split(/\r?\n/).map(clean).filter(Boolean).join('\n')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Z]{2,}/gi, '[電子郵件略]')
    .replace(/(?<!\d)(?:\+886[ -]?9\d|09\d{2})[ -]?\d{3}[ -]?\d{3}(?!\d)/g, '[手機號碼略]');
  const hasSyllabus = $('main h4').toArray().some((heading) => /^(課程概要|教學目標|課程內容與進度)$/.test(clean($(heading).text())));

  return compact({
    ...offering,
    credits: /^\d+(?:\.\d+)?$/.test(credit) ? Number(credit) : undefined,
    capacity: capacity === undefined ? undefined : Number(capacity),
    description,
    syllabusUrl: hasSyllabus ? offering.sourceUrl : undefined,
    extra: compact({ ...offering.extra, 時數: hours, '學年/學期': fields.get('學年/學期') ?? '' })
  });
}
