/**
 * NCU's only public course query system (cis.ncu.edu.tw/Course) is disallowed for all user agents by
 * https://cis.ncu.edu.tw/robots.txt, so this package contains no course parser yet. It only evaluates
 * robots.txt so the crawler can refuse to run (and start working the day the school allows it).
 */

export const ROBOTS_URL = 'https://cis.ncu.edu.tw/robots.txt';
/** Paths the crawler would need: keyword/department query pages and the per-流水號 detail page. */
export const COURSE_PATHS = [
  '/Course/main/query/byKeywords',
  '/Course/main/query/byDepartment',
  '/Course/main/support/courseDetail.html'
];

interface Rule {
  allow: boolean;
  pattern: string;
}

/** Rules of the group that applies to `agent` (falls back to `*`), per RFC 9309. */
function rulesFor(robots: string, agent: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | undefined;
  let lastWasAgent = false;
  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      lastWasAgent = false;
      if (value) current.rules.push({ allow: key === 'allow', pattern: value });
    } else {
      lastWasAgent = false;
    }
  }
  const token = agent.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && token.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  return chosen.flatMap((g) => g.rules);
}

function patternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regex = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${regex}${anchored ? '$' : ''}`).test(path);
}

/** Longest matching rule wins; on a tie `Allow` wins; no match means allowed. */
export function robotsAllows(robots: string, agent: string, path: string): boolean {
  let best: Rule | undefined;
  for (const rule of rulesFor(robots, agent)) {
    if (!patternMatches(rule.pattern, path)) continue;
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}
