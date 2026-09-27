#!/usr/bin/env python3
"""
Generate career-hub data JSON from the two course extracts.

Sources:
  /home/hitesh/aws-restart-course.md     -> data/modules.json   (24 modules, 414 items)
  /home/hitesh/generation-course-full.md -> data/days.json      (60 program days)

Re-run:  python3 tools/build-data.py
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

AWS_MD = pathlib.Path("/home/hitesh/aws-restart-course.md")
GEN_MD = pathlib.Path("/home/hitesh/generation-course-full.md")

# ---------------------------------------------------------------- slug helper
def slugify(name: str) -> str:
    s = name.lower()
    s = s.replace("–", "-").replace("—", "-")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

# ------------------------------------------------------- module requirements
# Sourced from the AWS re/Start modules page. 'all' = Complete All Items,
# 'one' = Complete One Item, 'none' = no completion requirement.
REQUIREMENTS = {
    "agenda": "none",
    "start-here": "one",
    "professional-skills": "none",
    "sandbox-environment": "one",
    "cloud-foundations": "all",
    "linux": "all",
    "networking": "all",
    "security": "all",
    "python-programming": "all",
    "databases": "all",
    "aws-architecture": "none",
    "systems-operations": "all",
    "tooling-and-automation": "all",
    "servers": "all",
    "scaling-and-name-resolution": "all",
    "serverless-and-containers": "all",
    "aws-database-services": "all",
    "aws-networking-services": "all",
    "storage-and-archiving": "all",
    "monitoring-and-security": "all",
    "managing-resource-consumption": "all",
    "automated-and-repeatable-deployments": "all",
    "aws-machine-learning-and-generative-ai": "all",
    "exam-prep": "none",
}

# Modules the 60-day Generation schedule never assigns. Must be self-scheduled.
GAP_MODULES = {
    "monitoring-and-security",
    "managing-resource-consumption",
    "automated-and-repeatable-deployments",
    "aws-machine-learning-and-generative-ai",
    "exam-prep",
    "start-here",
    "sandbox-environment",
    "agenda",
}

# Target week (1-12) for each module.
WEEK_TARGET = {
    "agenda": 1, "start-here": 1, "sandbox-environment": 1,
    "cloud-foundations": 1,
    "linux": 3, "networking": 4, "security": 5,
    "python-programming": 7, "databases": 8,
    "aws-architecture": 9, "systems-operations": 9, "tooling-and-automation": 9,
    "servers": 10, "scaling-and-name-resolution": 11,
    "serverless-and-containers": 11, "aws-database-services": 11,
    "aws-networking-services": 12, "storage-and-archiving": 12,
    # gap blocks
    "exam-prep": 2, "monitoring-and-security": 4,
    "managing-resource-consumption": 6,
    "automated-and-repeatable-deployments": 8,
    "aws-machine-learning-and-generative-ai": 10,
    "professional-skills": 1,
}

# ------------------------------------------------- day -> AWS module targets
# Primary: the module that day's technical content belongs to.
# Gap: extra self-study module scheduled in that week.
DAY_TARGETS = {}


def _fill(ranges, slugs, gap=None):
    for a, b in ranges:
        for d in range(a, b + 1):
            DAY_TARGETS[d] = {"primary": slugs, "gap": gap}


_fill([(2, 6)], ["cloud-foundations"])
_fill([(7, 14)], ["linux"])
_fill([(15, 16)], ["networking"])
_fill([(17, 25)], ["security"])
_fill([(26, 33)], ["python-programming"])
_fill([(34, 40)], ["databases"])
_fill([(41, 42)], ["aws-architecture"])
_fill([(43, 44)], ["aws-architecture", "systems-operations"])
_fill([(45, 46)], ["systems-operations", "tooling-and-automation"])
_fill([(47, 48)], ["servers"])
_fill([(49, 51)], ["scaling-and-name-resolution"])
_fill([(52, 53)], ["serverless-and-containers"])
_fill([(54, 55)], ["aws-database-services"])
_fill([(56, 57)], ["aws-networking-services"])
_fill([(57, 60)], ["storage-and-archiving"])

# Day 1 = course setup
DAY_TARGETS[1] = {"primary": ["start-here", "sandbox-environment"], "gap": None}

# Gap blocks by program day (week -> days)
GAP_BLOCKS = {
    **{d: ["exam-prep"] for d in range(6, 11)},                 # week 2
    **{d: ["monitoring-and-security"] for d in range(16, 21)},  # week 4
    **{d: ["managing-resource-consumption"] for d in range(26, 31)},  # week 6
    **{d: ["automated-and-repeatable-deployments"] for d in range(36, 41)},  # week 8
    **{d: ["aws-machine-learning-and-generative-ai"] for d in range(46, 51)},  # week 10
    **{d: ["aws-machine-learning-and-generative-ai"] for d in range(51, 56)},  # week 11
}

# --------------------------------------------------------- item classification
RITUAL_PATTERNS = [
    (r"daily opening", "daily-opening"),
    (r"daily reflection", "daily-reflection"),
    (r"self-assessment with the generation scorecard", "scorecard"),
    (r"peer coaching", "peer-coaching"),
    (r"scorecard review", "scorecard-review"),
    (r"discussion forum", "discussion"),
    (r"session \d+ \(instructor-led\)|instructor-led\)|\(instructor-led\)", "instructor-led"),
    (r"instructor-led", "instructor-led"),
]


def classify(title: str) -> str:
    t = title.lower()
    for pat, kind in RITUAL_PATTERNS:
        if re.search(pat, t):
            return kind
    return "work"


def parse_sections(md_text):
    """Parse '## Name (N items)' + '- item' lines into [(name, count, items)]."""
    out = []
    cur = None
    for line in md_text.splitlines():
        m = re.match(r"^##\s+(.+?)\s*\((\d+)\s+items?\)\s*$", line.strip())
        if m:
            cur = {"name": m.group(1).strip(), "count": int(m.group(2)), "items": []}
            out.append(cur)
            continue
        m = re.match(r"^-\s+(.*)$", line.strip())
        if m and cur is not None:
            title = m.group(1).strip()
            if title == "Context Module Sub Header":
                continue
            cur["items"].append(title)
    return out


def parse_day_name(name):
    m = re.search(r"Day\s+(\d+)", name)
    day = int(m.group(1)) if m else None
    half = None
    if "1st Half" in name:
        half = "am"
    elif "2nd Half" in name:
        half = "pm"
    return day, half


def build_modules():
    sections = parse_sections(AWS_MD.read_text(encoding="utf-8"))
    mods = []
    for s in sections:
        slug = slugify(s["name"])
        req = REQUIREMENTS.get(slug)
        if req is None:
            print(f"  !! unknown module slug: {slug} ({s['name']})", file=sys.stderr)
            req = "none"
        items = [
            {
                "id": f"{slug}#{i}",
                "title": t,
                "kind": "work",
            }
            for i, t in enumerate(s["items"])
        ]
        mods.append({
            "slug": slug,
            "name": s["name"],
            "itemCount": len(items),
            "requirement": req,
            "requiredItems": len(items) if req == "all" else (1 if req == "one" else 0),
            "weekTarget": WEEK_TARGET.get(slug),
            "isGap": slug in GAP_MODULES,
            "items": items,
        })
    return mods


def build_days():
    sections = parse_sections(GEN_MD.read_text(encoding="utf-8"))
    by_day = {}
    orphans = []
    for s in sections:
        day, half = parse_day_name(s["name"])
        if day is None:
            orphans.append({"name": s["name"], "items": s["items"]})
            continue
        by_day.setdefault(day, {})[half or "extra"] = {
            "name": s["name"],
            "itemCount": s["count"],
            "items": [
                {"id": f"d{day}{half}{i}", "title": t, "kind": classify(t)}
                for i, t in enumerate(s["items"])
            ],
        }

    days = []
    for d in range(1, 61):
        halves = by_day.get(d, {})
        tgt = DAY_TARGETS.get(d, {"primary": [], "gap": None})
        gap = GAP_BLOCKS.get(d)
        days.append({
            "day": d,
            "week": (d - 1) // 5 + 1,
            "am": halves.get("am"),
            "pm": halves.get("pm"),
            "awsPrimary": tgt.get("primary", []),
            "awsGap": gap or [],
        })
    return days, orphans


def main():
    mods = build_modules()
    days, orphans = build_days()

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "modules.json").write_text(
        json.dumps({"course": "AWS re/Start INPUN97",
                    "url": "https://awsrestart.instructure.com/courses/4409/modules",
                    "modules": mods}, indent=1),
        encoding="utf-8")
    (DATA / "days.json").write_text(
        json.dumps({"course": "India_ AWS_IP_Organic_BOA_Pune_ILMTEC_05_INPUN97 - 2026",
                    "url": "https://generation.instructure.com/courses/4721/modules",
                    "days": days, "nonDayModules": orphans}, indent=1),
        encoding="utf-8")

    total_items = sum(m["itemCount"] for m in mods)
    required = sum(m["requiredItems"] for m in mods)
    day_items = sum(len(h["items"]) for d in days for h in (d["am"], d["pm"]) if h)
    print(f"modules.json : {len(mods)} modules, {total_items} items, {required} required")
    print(f"days.json    : {len(days)} days, {day_items} items, {len(orphans)} non-day modules")
    bundle()


def bundle():
    """Emit assets/data.js so index.html also works when opened via file://,
    where fetch('data/*.json') is blocked by CORS."""
    out = {"modules": json.loads((DATA / "modules.json").read_text(encoding="utf-8")),
           "days": json.loads((DATA / "days.json").read_text(encoding="utf-8")),
           "projects": json.loads((DATA / "projects.json").read_text(encoding="utf-8")),
           "linkedin": json.loads((DATA / "linkedin.json").read_text(encoding="utf-8")),
           "jobs": json.loads((DATA / "jobs.json").read_text(encoding="utf-8"))}
    (ROOT / "assets" / "data.js").write_text(
        "window.CAREER_HUB_DATA = " + json.dumps(out, ensure_ascii=False) + ";\n",
        encoding="utf-8")
    kb = (ROOT / "assets" / "data.js").stat().st_size / 1024
    print(f"assets/data.js: bundled {kb:.0f} KB")


if __name__ == "__main__":
    main()
