#!/usr/bin/env python3
"""Data-quality audit for crawler snapshots (see docs/data-quality.md).

Usage: python3 -I scripts/audit-snapshots.py snapshots/*-115-1.json snapshots/history/*.json [--json out.json]

Reads one file at a time (memory stays flat) and prints, per school, counts of:
  - `extra` keys that are raw ASCII field names or carry HTML / JSON / NBSP / null values,
  - department codes that map to several names within one term, names that look truncated or foreign,
  - capacity 0 with enrolment > 0, enrolment above capacity, absurd numbers,
  - mojibake / control characters / HTML entities in any string,
  - titles with a trailing course code or whitespace oddities, placeholder instructors.
Only the standard library is used.
"""
import collections
import json
import re
import sys

ASCII_KEY = re.compile(r'^[A-Za-z0-9_]+$')
HTML = re.compile(r'<\s*/?\s*(br|div|p|span|a|b|font|table|tr|td)\b[^>]*>', re.I)
ENTITY = re.compile(r'&(nbsp|amp|lt|gt|quot|#\d+|#x[0-9a-f]+);', re.I)
# Classic UTF-8-read-as-Latin-1/CP1252 sequences, U+FFFD, and private-use code points.
MOJIBAKE = re.compile(r'[�-]|Ã[\x80-\xbf]|â€|Â[\xa0-\xbf]|å[\x80-\xbf]|æ[\x80-\xbf]|ç[\x80-\xbf]')
CONTROL = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')
TRAILING_CODE = re.compile(r'[\s(（\[【-]*[A-Z]{2,}[A-Z0-9]*\d{3,}[)）\]】]?\s*$')
PLACEHOLDER_INSTRUCTOR = re.compile(r'^(待聘|未定|TBA|TBD|N/?A|無|-+|\d+)$', re.I)


def strings(value, path=''):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for key, item in value.items():
            yield from strings(item, f'{path}.{key}' if path else key)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item, path)


class SchoolStats:
    def __init__(self):
        self.files = 0
        self.offerings = 0
        self.counts = collections.Counter()
        self.examples = {}
        self.extra_keys = collections.Counter()
        self.extra_example = {}
        self.dept_names = collections.defaultdict(collections.Counter)
        self.multi_name_codes = collections.Counter()

    def hit(self, kind, example):
        self.counts[kind] += 1
        if kind not in self.examples:
            self.examples[kind] = example


def audit_file(path, schools):
    with open(path, encoding='utf-8') as handle:
        snapshot = json.load(handle)
    school = snapshot['school']
    term = snapshot['term']
    stats = schools.setdefault(school, SchoolStats())
    stats.files += 1
    term_names = collections.defaultdict(set)
    for offering in snapshot['offerings']:
        stats.offerings += 1
        ref = f"{term} {offering['sourceId']}"
        extra = offering.get('extra') or {}
        for key, value in extra.items():
            stats.extra_keys[key] += 1
            stats.extra_example.setdefault(key, value)
            if ASCII_KEY.match(key) and key not in ('URL', 'EMI'):
                stats.hit('extra: ASCII field-name key', f'{ref} {key}={str(value)[:40]!r}')
            if value is None:
                stats.hit('extra: null value', f'{ref} {key}')
            elif isinstance(value, str):
                if HTML.search(value):
                    stats.hit('extra: HTML markup in value', f'{ref} {key}={value[:60]!r}')
                if value.lstrip()[:1] in '{[' and value.strip()[-1:] in '}]':
                    stats.hit('extra: JSON blob value', f'{ref} {key}={value[:60]!r}')
                if '\xa0' in value or '\t' in value:
                    stats.hit('extra: NBSP/tab in value', f'{ref} {key}={value[:60]!r}')

        department = offering.get('department')
        code = offering.get('departmentCode')
        if department:
            stats.dept_names[code][department] += 1
            term_names[code].add(department)
            if code and department == code:
                stats.hit('department equals its code', f'{ref} {code}')
            if re.search(r'[A-Za-z]{2,}\d|\d{3,}', department):
                stats.hit('department contains a code', f'{ref} {department!r}')
            if '\xa0' in department or department != department.strip():
                stats.hit('department has NBSP/padding', f'{ref} {department!r}')
        else:
            stats.hit('department missing', f"{ref} {offering['title']}")

        capacity = offering.get('capacity')
        enrolled = offering.get('enrolled')
        if capacity == 0 and enrolled:
            stats.hit('capacity 0 with enrolled > 0', f'{ref} 0/{enrolled}')
        elif capacity is not None and enrolled is not None and capacity > 0 and enrolled > capacity:
            stats.hit('enrolled > capacity', f'{ref} {enrolled}/{capacity}')
            if enrolled >= 2 * capacity + 10:
                stats.hit('enrolled > 2x capacity + 10', f"{ref} {enrolled}/{capacity} {offering['title']}")
        if capacity is not None and capacity >= 1000:
            stats.hit('capacity >= 1000', f'{ref} {capacity}')
        if enrolled is not None and enrolled >= 1000:
            stats.hit('enrolled >= 1000', f'{ref} {enrolled}')
        credits = offering.get('credits')
        if credits is not None and credits > 12:
            stats.hit('credits > 12', f"{ref} {credits} {offering['title']}")

        title = offering['title']
        if TRAILING_CODE.search(title):
            stats.hit('title ends with a code', f'{ref} {title!r}')
        if re.search(r'\s{2,}', title):
            stats.hit('title has repeated whitespace', f'{ref} {title!r}')
        title_en = offering.get('titleEn')
        if title_en and not re.search(r'[A-Za-z]', title_en):
            stats.hit('titleEn has no Latin letters', f'{ref} {title_en!r}')
        for name in offering.get('instructors') or []:
            if PLACEHOLDER_INSTRUCTOR.match(name):
                stats.hit('placeholder instructor', f'{ref} {name!r}')

        for field, value in strings({k: v for k, v in offering.items() if k not in ('sourceUrl', 'syllabusUrl')}):
            if MOJIBAKE.search(value):
                stats.hit('mojibake / U+FFFD / private-use', f'{ref} {field}={value[:60]!r}')
            if CONTROL.search(value):
                stats.hit('control character', f'{ref} {field}={value[:60]!r}')
            if ENTITY.search(value):
                stats.hit('HTML entity', f'{ref} {field}={value[:60]!r}')
    for code, names in term_names.items():
        if code and len(names) > 1:
            stats.multi_name_codes[code] += 1
            stats.hit('department code with several names in one term', f"{term} {code}: {' | '.join(sorted(names))[:120]}")


def main(argv):
    out = None
    if '--json' in argv:
        index = argv.index('--json')
        out = argv[index + 1]
        argv = argv[:index] + argv[index + 2:]
    schools = {}
    for path in argv:
        audit_file(path, schools)
    report = {}
    for school in sorted(schools):
        stats = schools[school]
        print(f'== {school}: {stats.files} files, {stats.offerings} offerings')
        for kind, count in sorted(stats.counts.items()):
            print(f'  {count:8d}  {kind}   e.g. {stats.examples[kind]}')
        ascii_keys = {k: v for k, v in stats.extra_keys.items() if ASCII_KEY.match(k)}
        if ascii_keys:
            print('  ASCII extra keys:', ', '.join(f'{k}({v})' for k, v in sorted(ascii_keys.items())))
        report[school] = {
            'files': stats.files,
            'offerings': stats.offerings,
            'counts': dict(stats.counts),
            'examples': stats.examples,
            'extraKeys': dict(stats.extra_keys),
            'extraExamples': {k: v if not isinstance(v, str) else v[:80] for k, v in stats.extra_example.items()},
            'departments': {str(code): dict(names) for code, names in stats.dept_names.items()},
        }
    if out:
        with open(out, 'w', encoding='utf-8') as handle:
            json.dump(report, handle, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
