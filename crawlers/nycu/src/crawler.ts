import { defineCrawler } from '@unicourse/crawler-kit';
import { parseDescription, parseOfferings, preferredCourse, sourceUrl, type CourseCandidate } from './parse.ts';

type Form = Record<string, string>;
type Post = (route: string, form?: Form) => Promise<unknown>;
type Department = { uid: string; option?: string };

function optionKeys(payload: unknown, route: string): string[] {
  if (Array.isArray(payload) && !payload.length) return [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`NYCU: invalid ${route} response`);
  }
  return Object.entries(payload).filter(([key, label]) => key.trim() && typeof label === 'string')
    .map(([key]) => key);
}

async function* departments(post: Post, termCode: string): AsyncGenerator<Department> {
  const termForm = { acysem: termCode, acysemend: termCode, flang: 'zh-tw' };
  const types = await post('get_type', termForm);
  if (!Array.isArray(types) || !types.length) throw new Error('NYCU: department types not found');
  for (const item of types) {
    if (!item || typeof item.uid !== 'string' || typeof item.type !== 'string') {
      throw new Error('NYCU: invalid department type');
    }
    const form = { ...termForm, ftype: item.uid };
    const collegeScoped = item.type === '1' || item.type === '2';
    const categories = collegeScoped || item.type === '3'
      ? optionKeys(await post('get_category', form), 'category') : ['**'];
    for (const fcategory of categories) {
      const categoryForm = { ...form, fcategory };
      const colleges = collegeScoped
        ? optionKeys(await post('get_college', categoryForm), 'college') : ['*'];
      for (const fcollege of colleges) {
        const uids = optionKeys(await post('get_dep', { ...categoryForm, fcollege }), 'department');
        for (const uid of uids) {
          if (uid === '0U5*') yield { uid, option: 'dep_approved_General' };
          else if (fcategory === '0U') yield { uid, option: 'approved_General' };
          else yield { uid };
        }
      }
    }
  }
}

export const crawler = defineCrawler({
  school: 'nycu',
  source: { name: '國立陽明交通大學 課程時間表', url: sourceUrl },
  async crawl({ http, term, year, semester, limit, log }) {
    const details = process.env.UNICOURSE_NYCU_FETCH_DESCRIPTIONS === '1';
    if (details && (limit === undefined || !Number.isInteger(limit) || limit < 1 || limit > 20)) {
      throw new Error('NYCU: description enrichment requires --limit between 1 and 20');
    }
    const semesterCode = semester === 3 ? 'X' : String(semester);
    const termCode = `${year}${semesterCode}`;
    let requests = 0;
    const post: Post = (route, form = {}) => {
      requests += 1;
      return http.json(`${sourceUrl}?r=main/${route}`, { method: 'POST', body: new URLSearchParams(form) });
    };

    const terms = await post('get_acysem');
    if (!Array.isArray(terms) || !terms.length || !terms.every((entry) => typeof entry?.T === 'string')) {
      throw new Error('NYCU: term menu not found');
    }
    if (!terms.some(({ T }) => T === termCode)) {
      throw new Error(`NYCU: term ${term} not published; latest listed term is ${terms[0].T}`);
    }

    const courses = new Map<string, CourseCandidate>();
    const visited = new Set<string>();
    let rows = 0;
    for await (const { uid, option = '**' } of departments(post, termCode)) {
      const query = `${uid}/${option}`;
      if (visited.has(query)) continue;
      visited.add(query);
      const payload = await post('get_cos_list', {
        m_acy: String(year), m_sem: semesterCode, m_acyend: String(year), m_semend: semesterCode,
        m_dep_uid: uid, m_group: '**', m_grade: '**', m_class: '**', m_option: option,
        m_crsname: '**', m_teaname: '**', m_cos_id: '**', m_cos_code: '**', m_crstime: '**',
        m_crsoutline: '**', m_costype: '**', m_selcampus: '**'
      });
      for (const candidate of parseOfferings(payload, String(year), semesterCode)) {
        rows += 1;
        const id = candidate.offering.sourceId;
        courses.set(id, preferredCourse(courses.get(id), candidate));
      }
      if (limit && courses.size >= limit) break;
    }
    if (!courses.size) throw new Error(`NYCU: no public offerings found in ${term}`);
    const offerings = [...courses.values()].map(({ offering }) => offering);
    const selected = limit === undefined ? offerings : offerings.slice(0, limit);
    if (details) {
      for (const offering of selected) {
        if (offering.extra?.crsoutline_type !== 'data') continue;
        const payload = await post('getCrsOutlineDescription', {
          acy: String(year), sem: semesterCode, cos_id: offering.sourceId, user: '', _token: ''
        });
        const description = parseDescription(payload);
        if (description) offering.description = description;
      }
    }
    log(`read ${rows} rows from ${visited.size} department queries; ${courses.size} unique offerings in ${requests} requests before retries`);
    return selected;
  }
});
