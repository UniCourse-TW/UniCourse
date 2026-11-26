import { compact, loadHtml, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';

export const sourceUrl = 'https://onepiece.nchu.edu.tw/cofsys/plsql/crseqry_all';

const periodOrder = '123456789ABCD';
const days = '一二三四五六日';

function lines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function number(raw?: string) {
  return raw && /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : undefined;
}

function withoutContactInfo(text: string) {
  return (text.match(/[^。；;\n]+[。；;\n]?/g) ?? []).filter((clause) =>
    !/[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+886[- ]?)?\(?0\d{1,3}\)?[-－ ]?\d{6,8}\b/i.test(clause)).join('').trim();
}

export function parseSchedule(time: string[], rooms: string[]): Meeting[] {
  const blocks = time.flatMap((line) => {
    if (/[(（]/.test(line)) return line.split(/\s*[,、;；]?\s*(?=[(（])/).filter(Boolean);
    return line.split(/[,，、;；\s]+/).filter(Boolean);
  });
  return blocks.flatMap((block, index) => {
    const parts = /^(?:([1-7])|[(（]([一二三四五六日天])[)）])\s*([1-9A-D,，、\s-]+)$/iu.exec(block);
    if (!parts) return [];
    const day = parts[1] ? Number(parts[1]) : days.indexOf(parts[2].replace('天', '日')) + 1;
    const tokens = parts[3].trim().toUpperCase().split(/[,，、\s]+/);
    const periods = tokens.flatMap((token) => {
      if (!token.includes('-')) return [...token];
      const [first, last] = token.split('-');
      if (!/^[1-9A-D]-[1-9A-D]$/.test(token)) return [];
      return [...periodOrder.slice(periodOrder.indexOf(first), periodOrder.indexOf(last) + 1)];
    });
    if (periods.length === 0 || tokens.some((token) => !/^(?:[1-9A-D]+|[1-9A-D]-[1-9A-D])$/.test(token))) return [];
    const location = rooms.length === 1 ? rooms[0] : rooms.length === blocks.length ? rooms[index] : undefined;
    return [compact({ day, periods: [...new Set(periods)], location: location === '*' ? undefined : location })];
  });
}

export function parseList(html: string, yearTerm: string): Offering[] {
  const $ = loadHtml(html);
  if ($('select[name="p_year"] option[selected]').val() !== yearTerm) {
    throw new Error(`NCHU did not return the requested term ${yearTerm}`);
  }

  const offerings = new Map<string, Offering>();
  for (const table of $('table[name="mytable"]')) {
    const headers = $(table).children('thead').find('th').map((_, header) =>
      $(header).clone().find('font').remove().end().text().replace(/\s+/g, '')).get();
    const group = $(table).prevAll('strong').first().text().trim();
    const context = /^選課系所[:：](.*?)\s*年級[:：]\s*(\d+)\s*班別[:：]\s*(.*)$/u.exec(group);
    const rows = $(table).children('tbody').children('tr.trall');
    for (const row of rows) {
      const cells = $(row).children('td');
      if (cells.length !== headers.length || !headers.includes('選課號碼') || !headers.includes('科目名稱')) {
        throw new Error('Unexpected NCHU course table layout');
      }
      const cell = (name: string) => {
        const index = headers.indexOf(name);
        return index < 0 ? $([]) : cells.eq(index);
      };
      const cellLines = (name: string) => lines(cell(name).clone().find('br').replaceWith('\n').end().text());
      const text = (name: string) => cellLines(name).join('\n');
      const selectionNumber = text('選課號碼');
      const href = cell('選課號碼').find('a').attr('href');
      const detail = href ? new URL(href, sourceUrl) : undefined;
      const sourceId = detail?.searchParams.get('v_class_nbr');
      const [title, ...english] = cellLines('科目名稱');
      if (!sourceId || !/^\d+$/.test(sourceId) || !selectionNumber || !title ||
          detail?.origin !== new URL(sourceUrl).origin ||
          !/\/syllabus_main$/i.test(detail.pathname) || detail.searchParams.get('v_strm') !== yearTerm) {
        throw new Error(`Invalid NCHU course row for selection number ${selectionNumber}`);
      }
      const courseCode = `${selectionNumber}@${yearTerm}`;
      const previous = offerings.get(sourceId);
      if (previous) {
        if (previous.title !== title || previous.courseCode !== courseCode) {
          throw new Error(`Conflicting NCHU course rows for class ${sourceId}`);
        }
        const prerequisites = text('先修科目');
        if (prerequisites.length > String(previous.extra?.['先修科目'] ?? '').length) {
          previous.extra = { ...previous.extra, 先修科目: prerequisites };
        }
        continue;
      }

      const instructorText = cell('上課教師').attr('title')?.trim() || text('上課教師');
      const labInstructors = cell('實習教師').attr('title')?.trim() || text('實習教師');
      const instructors = [...new Set([instructorText, labInstructors].flatMap((raw) =>
        raw.split(/[,，、;；\n]+/).map((entry) => entry.replace(/\s+等$/, '').trim())
          .filter((entry) => entry && !/^(?:\*|--?|待定|待聘|未定|未指定|無)$/.test(entry))))];
      const lectureTimes = cellLines('上課時間');
      const lectureRooms = cellLines('上課教室');
      const labTimes = cellLines('實習時間');
      const labRooms = cellLines('實習教室');
      const schedule = [...new Map([...parseSchedule(lectureTimes, lectureRooms), ...parseSchedule(labTimes, labRooms)]
        .map((meeting) => [JSON.stringify(meeting), meeting])).values()];
      const requirementText = text('必選別');
      const extra = compact({
        選課號碼: selectionNumber,
        選課系所: context?.[1] ?? '',
        先修科目: text('先修科目'),
        '全/半年': text('全/半年'),
        上課時數: text('上課時數'),
        實習時數: text('實習時數'),
        實習教師: labInstructors,
        外系人數: text('外系人數'),
        可加選餘額: text('可加選餘額')
      });
      const capacityText = text('開課人數');
      const balanceText = text('可加選餘額');
      const capacity = /^\d+$/.test(capacityText) && Number(capacityText) <= 2_147_483_647
        ? Number(capacityText) : undefined;
      const balance = /^\d+$/.test(balanceText) ? Number(balanceText) : undefined;
      const enrolled = capacity !== undefined && balance !== undefined && balance <= capacity ? capacity - balance : undefined;
      offerings.set(sourceId, compact({
        sourceId,
        courseCode,
        classCode: context?.[3],
        title,
        titleEn: english.join(' '),
        instructors,
        department: text('開課單位'),
        grade: context?.[2] === '0' ? undefined : context?.[2],
        credits: number(text('學分數')),
        requirement: requirementFromText(requirementText),
        requirementText,
        schedule,
        scheduleText: [...lectureTimes, ...lectureRooms, ...labTimes, ...labRooms].join('\n'),
        capacity,
        enrolled,
        language: text('授課語言'),
        sourceUrl: detail.href,
        syllabusUrl: detail.href,
        notes: withoutContactInfo(text('備註')),
        extra
      }));
    }
  }
  return [...offerings.values()];
}

export function parseDescription(html: string) {
  const $ = loadHtml(html);
  const label = $('td').filter((_, cell) => $(cell).text().trim() === '課程簡述').first();
  return withoutContactInfo(lines(label.next('td').clone().find('br').replaceWith('\n').end().text()).join('\n')) || undefined;
}

export function parseSyllabusOffering(html: string, url: URL, selectionNumber: string): Offering {
  const $ = loadHtml(html);
  const cell = (label: string) => $('td').filter((_, entry) => $(entry).text().trim() === label).first();
  const read = (label: string) => cell(label).next('td').text().trim();
  const courseName = cell('課程名稱');
  const title = courseName.next('td').text().trim();
  const titleSuffix = `(${selectionNumber})`;
  const yearTerm = url.searchParams.get('v_strm');
  const sourceId = url.searchParams.get('v_class_nbr');
  if (!yearTerm || !sourceId || read('開課學期') !== yearTerm ||
      $('input[name="v_class_nbr"]').val() !== sourceId || !title.endsWith(titleSuffix)) {
    throw new Error(`NCHU: syllabus does not identify class ${sourceId} / ${selectionNumber} in ${yearTerm}`);
  }
  const requirementText = read('課程類別');
  return compact({
    sourceId,
    courseCode: `${selectionNumber}@${yearTerm}`,
    title: title.slice(0, -titleSuffix.length).replace(/^\(中\)\s*/, '').trim(),
    titleEn: courseName.parent().next('tr').text().trim().replace(/^\(Eng\.\)\s*/, ''),
    instructors: read('授課教師').replace(/\s+等$/, '').split(/[,，、]/).map((name) => name.trim()).filter(Boolean),
    department: read('開課單位'),
    credits: number(read('學分')),
    requirementText,
    requirement: requirementFromText(requirementText),
    language: read('授課使用語言'),
    syllabusUrl: url.href,
    sourceUrl: url.href,
    extra: { 選課號碼: selectionNumber }
  });
}
