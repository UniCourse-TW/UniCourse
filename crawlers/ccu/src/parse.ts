import { compact, loadHtml, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';

export const sourceUrl = 'https://ecourse2.ccu.edu.tw/local/syllabus/syllabus_dep.php';

const days = '一二三四五六日';

export function parseSchedule(raw: string): Meeting[] {
  const blocks = raw.matchAll(/(?:週|周|星期)?([一二三四五六日天])\s+((?:\d{1,2}|[A-Z])(?:\s*[,，、]\s*(?:\d{1,2}|[A-Z]))*)(?=\s*(?:[&,，、;；/]|(?:週|周|星期)?[一二三四五六日天]|$))/giu);
  return [...blocks].map(([, day, periods]) => ({
    day: days.indexOf(day.replace('天', '日')) + 1,
    periods: periods.split(/\s*[,，、]\s*/)
  }));
}

export function parseDepartments(html: string) {
  const $ = loadHtml(html);
  const departments = new Map<string, URL>();
  for (const anchor of $('#region-main a[href*="syllabus_dep.php?cd="]')) {
    const href = $(anchor).attr('href');
    if (!href) continue;
    const url = new URL(href, sourceUrl);
    const code = url.searchParams.get('cd');
    if (!code || !/^[\dA-Z]+$/.test(code) || `${url.origin}${url.pathname}` !== sourceUrl) continue;
    departments.set(code, url);
  }
  if (departments.size === 0) throw new Error('CCU public syllabus catalog did not contain any department links');
  return [...departments.values()];
}

export function parseDepartment(html: string, listUrl: URL, year: number, semester: number): Offering[] {
  const $ = loadHtml(html);
  const term = `${year}_${semester}`;
  const options = $('select[name="yearterm"] option');
  const selectedTerm = options.filter('[selected]').val();
  const departmentCode = $('input[name="cd"]').val();
  const table = $('#region-main .department table');
  const bodies = table.children('tbody');
  if (departmentCode === listUrl.searchParams.get('cd') && $('select[name="yearterm"]').length &&
      !options.toArray().some((option) => $(option).val() === term) && bodies.is('.empty') && !bodies.not('.empty').length) {
    return [];
  }
  if (selectedTerm !== term || !departmentCode || departmentCode !== listUrl.searchParams.get('cd')) {
    throw new Error(`CCU department ${listUrl.searchParams.get('cd')} did not return the requested term ${year}-${semester}`);
  }

  const headers = table.children('thead').find('th').map((_, header) => $(header).text().trim()).get();
  if (!headers.includes('課程代碼') || !headers.includes('課程名稱及介紹') || !headers.includes('開課學年度')) {
    throw new Error(`Unexpected CCU course table layout for ${departmentCode}`);
  }
  return bodies.not('.empty').children('tr').map((_, row) => {
    const cells = $(row).children('td');
    const cell = (name: string) => cells.eq(headers.indexOf(name));
    const rawText = (name: string) => !headers.includes(name) ? '' : cell(name).clone()
      .find('br').replaceWith('\n').end().text().split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join('\n');
    const sourceId = rawText('課程代碼');
    const [courseCode, classCode] = sourceId.split('_');
    const title = rawText('課程名稱及介紹');
    const rowTerm = rawText('開課學年度');
    if (cells.length !== headers.length || !/^[\dA-Z]+_[\dA-Z]+$/.test(sourceId) || !title || rowTerm !== `第${year}學年度第${semester}學期`) {
      throw new Error(`Invalid CCU course row in ${departmentCode}: ${sourceId}`);
    }
    const href = cell('課程名稱及介紹').find('a').attr('href');
    const detail = href ? new URL(href, sourceUrl) : undefined;
    if (detail && (detail.origin !== listUrl.origin || !detail.pathname.endsWith('/syllabus.php') ||
        detail.searchParams.get('course_no') !== sourceId || detail.searchParams.get('year') !== String(year) ||
        detail.searchParams.get('term') !== String(semester))) {
      throw new Error(`Unexpected CCU syllabus link for ${sourceId}`);
    }
    const instructors = [...new Set(rawText('授課教師').split(/[,，、;；\n]+/).map((name) => name.trim())
      .filter((name) => name && !/^(?:\*|--?|待定|未定|未指定|無)$/.test(name)))];
    const creditsText = rawText('學分數');
    const requirementText = rawText('必/選修');
    const scheduleText = rawText('上課時間');
    const extra = compact({
      遠距教學: rawText('遠距教學'),
      核心能力: headers.includes('核心能力') ? cell('核心能力').find('a').attr('href') ?? '' : ''
    });
    return compact({
      sourceId,
      courseCode,
      classCode,
      title,
      instructors,
      department: rawText('開課單位'),
      departmentCode,
      credits: /^\d+(\.\d+)?$/.test(creditsText) ? Number(creditsText) : undefined,
      requirement: requirementFromText(requirementText),
      requirementText,
      schedule: parseSchedule(scheduleText),
      scheduleText,
      syllabusUrl: detail?.href,
      sourceUrl: detail?.href ?? listUrl.href,
      extra: Object.keys(extra).length ? extra : undefined
    });
  }).get();
}

export function parseSyllabus(html: string) {
  const $ = loadHtml(html);
  const description = $('td').filter((_, cell) => /^(?:一、)?課程概述$/.test($(cell).text().trim())).first()
    .next('td').clone().find('br').replaceWith('\n').end().text().trim();
  const titleEn = $('span.multilang[lang="en"]').first().text().trim();
  return compact({ description, titleEn });
}
