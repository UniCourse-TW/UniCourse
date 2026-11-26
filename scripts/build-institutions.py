#!/usr/bin/env python3
"""Rebuild data/institutions.json from Ministry of Education open data (see data/institutions.README.md).

Usage: python3 -I scripts/build-institutions.py [--from DIR] [--out data/institutions.json]

Without --from, the three CSV files are downloaded from stats.moe.gov.tw. With --from, they are read
from DIR (u1_new.csv, higherr.csv, highera1.csv), e.g. a copy saved by an earlier run.
Standard library only.
"""

import argparse
import csv
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

SOURCES = {
    # data.gov.tw 6091 大專校院名錄 (A09000000E-000006): the master list of universities, colleges
    # and junior colleges, one row per school and academic year.
    "u1_new.csv": "https://stats.moe.gov.tw/files/opendata/u1_new.csv",
    # data.gov.tw 6236 宗教研修學院概況－按校別分 (A09000000E-000023).
    "higherr.csv": "https://stats.moe.gov.tw/files/opendata/higherr.csv",
    # data.gov.tw 6237 空大及大專進修學校概況 (A09000000E-000024).
    "highera1.csv": "https://stats.moe.gov.tw/files/opendata/highera1.csv",
}

# Slugs and English names of the schools with a dedicated crawler (crawlers/<slug>), matched by the
# exact MOE school name. These never change.
SLUGS = {
    "國立臺灣大學": ("ntu", "National Taiwan University"),
    "國立臺灣師範大學": ("ntnu", "National Taiwan Normal University"),
    "國立陽明交通大學": ("nycu", "National Yang Ming Chiao Tung University"),
    "國立清華大學": ("nthu", "National Tsing Hua University"),
    "國立成功大學": ("ncku", "National Cheng Kung University"),
    "國立政治大學": ("nccu", "National Chengchi University"),
    "國立中興大學": ("nchu", "National Chung Hsing University"),
    "國立中正大學": ("ccu", "National Chung Cheng University"),
    "國立中央大學": ("ncu", "National Central University"),
    "逢甲大學": ("fcu", "Feng Chia University"),
    "國立臺北藝術大學": ("tnua", "Taipei National University of the Arts"),
    "國立臺灣藝術大學": ("ntua", "National Taiwan University of Arts"),
}

# Explicit slug overrides by MOE code, for institutions whose 網址 is missing from the MOE files or
# does not end in .edu.tw. Each value is the school's own .edu.tw domain label (see
# data/course-sites.json for the official sites they were taken from).
SLUG_OVERRIDES = {
    "0A01": "nou",  # 國立空中大學, nou.edu.tw
    "3A01": "ouk",  # 高雄市立空中大學, ouk.edu.tw
    "1R02": "tbts",  # 基督教台灣浸會神學院, tbts.edu.tw
    "1R03": "cct",  # 臺北基督學院, cct.edu.tw
    "1R04": "iktc",  # 一貫道天皇學院, iktc.edu.tw
    "1R05": "tgst",  # 台灣神學研究學院, tgst.edu.tw
    "1R06": "iktcds",  # 一貫道崇德學院, iktcds.edu.tw
    "1R07": "ttcs",  # 台灣基督長老教會南神神學院, ttcs.edu.tw
    "1R08": "ces",  # 中華福音神學研究學院, ces.edu.tw
    "1R09": "wxsjc",  # 唯心聖教學院, wxsjc.edu.tw
    "1R10": "bwbc",  # 福智佛教學院, bwbc.edu.tw
}

SLUG = re.compile(r"^[a-z][a-z0-9]{1,15}$")

# 體系別 in 大專校院名錄. MOE statistics count 師範 (teacher-education) universities among the
# general universities, so they map to `general`.
SYSTEMS = {"一般": "general", "師範": "general", "技職": "technical"}

CODE = re.compile(r"^[0-9A-Z]{4}$")


def read(name, directory):
    if directory:
        data = (Path(directory) / name).read_bytes()
    else:
        request = urllib.request.Request(SOURCES[name], headers={"User-Agent": "UniCourseBot"})
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read()
    return list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"))))


def latest(rows):
    """Rows of the newest academic year; schools missing from it are closed or merged."""
    year = max(int(row["學年度"]) for row in rows)
    return year, [row for row in rows if int(row["學年度"]) == year]


def strip_code(value):
    """`[38]臺北市` -> `臺北市`; `30 臺北市` -> `臺北市`."""
    return re.sub(r"^(\[\d+\]|\d+\s+)", "", value.strip()) or None


def kind(name):
    if name.endswith("專科學校"):
        return "junior_college"
    if name.endswith("學院"):
        return "college"
    if name.endswith("大學"):
        return "university"
    raise ValueError(f"cannot classify {name!r}")


def derive_slug(code, name, website):
    """Stable snapshot slug: crawler slug, explicit override, else the label before `.edu.tw` in 網址.

    `http://www.nsysu.edu.tw` -> `nsysu`, `http://new.ntpu.edu.tw/` -> `ntpu`,
    `http://www2.kmu.edu.tw` -> `kmu`. Lowercase ASCII; uniqueness is checked in build().
    """
    if name in SLUGS:
        return SLUGS[name][0]
    if code in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[code]
    host = re.sub(r"^https?://", "", (website or "").strip().lower()).split("/")[0].split(":")[0]
    match = re.search(r"(?:^|\.)([a-z0-9-]+)\.edu\.tw$", host)
    if not match:
        raise ValueError(f"{code} {name}: no .edu.tw website; add it to SLUG_OVERRIDES")
    return match.group(1)


def institution(code, name, ownership, city, website, system):
    name_en = SLUGS.get(name, (None, None))[1]
    slug = derive_slug(code, name, website)
    return {
        "code": code,
        "name": name,
        "nameEn": name_en,
        "slug": slug,
        "kind": kind(name),
        "ownership": ownership,
        "city": city,
        "website": website,
        "system": system,
    }


def build(directory):
    year, rows = latest(read("u1_new.csv", directory))
    institutions = [
        institution(
            row["代碼"].strip(),
            row["學校名稱"].strip(),
            {"公立": "public", "私立": "private"}[row["公/私立"].strip()],
            strip_code(row["縣市名稱"]),
            row["網址"].strip() or None,
            SYSTEMS[strip_code(row["體系別"])],
        )
        for row in rows
    ]
    religious_year, religious = latest(read("higherr.csv", directory))
    institutions += [
        institution(
            row["學校代碼"].strip(),
            row["學校名稱"].strip(),
            "private",
            strip_code(row["縣市別"]),
            None,
            "religious",
        )
        for row in religious
    ]
    # Only the open universities themselves; the 附設進修學院 / 空中進修學院 rows are continuing-
    # education divisions of schools already in the master list.
    open_year, open_rows = latest(read("highera1.csv", directory))
    institutions += [
        institution(
            row["學校代碼"].strip(),
            row["學校名稱"].strip(),
            "public",
            None,
            None,
            "open",
        )
        for row in open_rows
        if row["學校名稱"].strip().endswith("空中大學")
    ]
    institutions.sort(key=lambda item: item["code"])

    codes = [item["code"] for item in institutions]
    assert all(CODE.match(code) for code in codes), "unexpected school code"
    assert len(codes) == len(set(codes)), "duplicate school code"
    slugs = [item["slug"] for item in institutions]
    bad = [slug for slug in slugs if not SLUG.match(slug)]
    assert not bad, f"slugs must be lowercase ASCII (2-16 chars): {bad}"
    assert len(slugs) == len(set(slugs)), "duplicate slug; add an entry to SLUG_OVERRIDES"
    unused = set(SLUG_OVERRIDES) - set(codes)
    assert not unused, f"SLUG_OVERRIDES codes without an MOE row: {sorted(unused)}"
    matched = set(slugs)
    missing = {slug for slug, _ in SLUGS.values()} - matched
    assert not missing, f"crawler slugs without an MOE row: {sorted(missing)}"
    years = {"u1_new.csv": year, "higherr.csv": religious_year, "highera1.csv": open_year}
    return institutions, years


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from", dest="directory")
    parser.add_argument("--out", default="data/institutions.json")
    arguments = parser.parse_args()
    institutions, years = build(arguments.directory)
    text = json.dumps(institutions, ensure_ascii=False, indent=2) + "\n"
    Path(arguments.out).write_text(text, encoding="utf-8")
    print(f"wrote {len(institutions)} institutions to {arguments.out}; academic years {years}",
          file=sys.stderr)


if __name__ == "__main__":
    main()
