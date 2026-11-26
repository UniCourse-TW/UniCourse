#!/usr/bin/env python3
"""Merge data/landscape/*.json into data/course-sites.json and docs/landscape.md.

Usage: python3 -I scripts/build-landscape.py
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTS = sorted((ROOT / "data" / "landscape").glob("*.json"))
INSTITUTIONS = json.loads((ROOT / "data" / "institutions.json").read_text("utf-8"))
BY_CODE = {x["code"]: x for x in INSTITUTIONS}
SYSTEM_LABEL = {"general": "一般大學", "technical": "技職校院", "religious": "宗教研修學院",
                "open": "空中大學", "military_police": "軍警校院"}
OPERATOR = {"official": "官方", "student": "學生", "company": "公司", "government": "政府",
            "community": "社群", "unknown": "不明"}
STATUS = {"active": "運作中", "inactive": "停止", "unknown": "不明"}
CATEGORY = {"course_query": "課程查詢", "syllabus": "教學大綱", "course_map": "課程地圖",
            "enrollment": "選課", "lms": "LMS", "review": "評價", "schedule_planner": "排課",
            "aggregator": "彙整", "open_data": "開放資料", "grade_distribution": "成績分布",
            "forum": "討論", "api": "API", "other": "其他"}

entries, seen, problems = [], {}, []
for part in PARTS:
    for i, e in enumerate(json.loads(part.read_text("utf-8"))):
        e = dict(e)
        e["_part"] = part.stem
        for code in e.get("schools") or []:
            if code not in BY_CODE:
                problems.append(f"{part.name}[{i}] unknown school code {code}")
        key = e["url"].rstrip("/").lower()
        if key in seen:
            prev = seen[key]
            merged = sorted(set(prev.get("schools") or []) | set(e.get("schools") or []))
            prev["schools"] = merged
            continue
        seen[key] = e
        entries.append(e)

def md_escape(s):
    return str(s).replace("|", "\\|").replace("\n", " ")

def row(e):
    cats = "、".join(CATEGORY.get(c, c) for c in e.get("category") or [])
    op = OPERATOR.get(e.get("operator"), e.get("operator"))
    if e.get("operatorName"):
        op += f"（{md_escape(e['operatorName'])}）"
    login = {True: "需登入", False: "免登入", "partial": "部分需登入"}.get(e.get("loginRequired"), "不明")
    notes = md_escape(e.get("notes") or "")
    if e.get("repo"):
        notes = (notes + " " if notes else "") + f"[repo]({e['repo']})"
    return (f"| [{md_escape(e['name'])}]({e['url']}) | {cats} | {op} | {login} | "
            f"{STATUS.get(e.get('status'), e.get('status'))} | {md_escape(e.get('features') or '')} | {notes} |")

HEADER = "| 名稱 | 類別 | 營運者 | 登入 | 狀態 | 功能 | 備註 |\n| --- | --- | --- | --- | --- | --- | --- |"

per_school = defaultdict(list)
cross = []
for e in entries:
    schools = e.get("schools") or []
    if e.get("scope") == "school" and len(schools) == 1:
        per_school[schools[0]].append(e)
    else:
        cross.append(e)
        for code in schools:
            per_school[code].append({**e, "_via": True})

out = ["# 臺灣大專院校課程相關網站總覽", "",
       f"由 `scripts/build-landscape.py` 合併 `data/landscape/*.json` 產生；共 {len(entries)} 個系統，"
       f"其中跨校/全國 {len(cross)} 個。學校依教育部學校代碼排序；標「跨校」者為多校平台在該校的對應。", "",
       "## 跨校與全國平台", "", HEADER]
out += [row(e) for e in sorted(cross, key=lambda e: (e.get("scope") != "national", e["name"]))]

for system in ["general", "technical", "religious", "open", "military_police"]:
    schools = [x for x in INSTITUTIONS if x["system"] == system]
    if not schools:
        continue
    out += ["", f"## {SYSTEM_LABEL[system]}", ""]
    for inst in sorted(schools, key=lambda x: x["code"]):
        items = per_school.get(inst["code"], [])
        own = [e for e in items if not e.get("_via")]
        via = [e for e in items if e.get("_via")]
        slug = f" · UniCourse slug `{inst['slug']}`" if inst.get("slug") else ""
        out += [f"### {inst['name']}（{inst['code']}）{slug}", ""]
        if not items:
            out += ["尚未盤點到任何網站。", ""]
            continue
        official = [e for e in own if e.get("operator") in ("official", "government")]
        third = [e for e in own if e not in official]
        if official:
            out += ["**校方系統**", "", HEADER] + [row(e) for e in official] + [""]
        if third:
            out += ["**第三方服務**", "", HEADER] + [row(e) for e in third] + [""]
        if via:
            out += ["**跨校平台涵蓋**：" + "、".join(f"[{md_escape(e['name'])}]({e['url']})" for e in via), ""]

(ROOT / "docs" / "landscape.md").write_text("\n".join(out) + "\n", "utf-8")
clean = [{k: v for k, v in e.items() if not k.startswith("_")} for e in entries]
(ROOT / "data" / "course-sites.json").write_text(json.dumps(clean, ensure_ascii=False, indent=2) + "\n", "utf-8")
covered = sum(1 for x in INSTITUTIONS if per_school.get(x["code"]))
print(f"{len(entries)} entries from {len(PARTS)} parts; {covered}/{len(INSTITUTIONS)} schools have at least one site")
for p in problems:
    print("WARN", p, file=sys.stderr)
