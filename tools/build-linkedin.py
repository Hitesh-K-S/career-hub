#!/usr/bin/env python3
"""
Generate data/linkedin.json: a 12-week x 3-posts/week calendar.

Project posts are pulled from the `post` field of each milestone in
projects.json, so every post you publish is tied to an artifact you
actually built. Any slot without a milestone gets a course-learning
post scoped to that week's AWS re/Start modules.

Re-run:  python3 tools/build-linkedin.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

SLUG_NAMES = {}


def load():
    p = json.loads((DATA / "projects.json").read_text(encoding="utf-8"))
    m = json.loads((DATA / "modules.json").read_text(encoding="utf-8"))
    for mod in m["modules"]:
        SLUG_NAMES[mod["slug"]] = mod["name"]
    return p


# One learning-post template per week, keyed by the modules studied that week.
LEARNING = {
    1: ("I got my AWS account the way most people do: 12 services blinking at me. "
        "So I spent day one turning all of it off.",
        "The mistake new AWS learners make is starting with services. Start with IAM, "
        "budgets, regions, and MFA. Everything else is optional.",
        "Zero services deployed. Four guardrails in place. Day one of 60."),
    2: ("The AWS bill is the thing nobody warns you about.",
        "Budget alarms are not a nice-to-have. My first bill would have been INR 4000 "
        "for a test that stayed on for a weekend. Here is the alarm setup.",
        "Set the alarm before the first EC2 instance. Not after."),
    3: ("Six shell commands and I suddenly understood what a Linux server actually is.",
        "file permissions, processes, ports, systemd, and why 'command not found' is "
        "usually a PATH problem. Concise notes from week three.",
        "Everything in AWS is a Linux process pretending to be a product."),
    4: ("Networking stopped being scary when I stopped memorising and started tracing packets.",
        "VPC, subnet, route table, security group, NACL - drawn as one flow, not five "
        "bullet points. This is the diagram that finally made it click.",
        "One diagram beats twenty definitions."),
    5: ("Security is not a module. It is a default you choose at every step.",
        "IAM policies, least privilege, MFA, encryption at rest and in transit. "
        "Real examples from a project I am deploying.",
        "The question is never 'is this secure' but 'how would an attacker walk in'."),
    6: ("Wrote my first real automation and immediately deleted something by accident.",
        "Python + boto3, then the cost-control module. Cost is a design constraint, "
        "not an afterthought.",
        "The bug taught me more than the working script did."),
    7: ("I used AI to write code for four months before I understood what it was doing.",
        "Python programming module + first AI engineering reading. The gap between "
        "writing code and understanding it is exactly where interviews live.",
        "Fluency is not the same as comprehension. Closing that gap now."),
    8: ("Data modelling taught me more about system design than any diagram did.",
        "Normalisation, indexes, transactions, and when to stop using a relational DB.",
        "Every 'scale it up' problem I have had turned out to be a data modelling problem."),
    9: ("AWS Well-Architected Framework is the most useful page on the internet for "
        "an AWS interview.",
        "Six pillars, applied to one real project instead of read as theory. Plus my "
        "first IaC template.",
        "Read the framework, then argue with it in a real architecture."),
    10: ("The 3am lesson: monitoring is not a dashboard, it is a page someone gets.",
        "Systems operations, tooling, automation, and my AWS ML + Generative AI "
        "module. Alert fatigue is a design failure.",
        "If nobody gets paged, the alert is not working."),
    11: ("Scaled from one server to many, and learned exactly which part was hard.",
        "Load balancing, autoscaling, DNS, caching, serverless and containers. What "
        "broke under load that did not break in testing.",
        "Scaling is mostly finding the bottleneck you already knew about."),
    12: ("60 days, two courses, and the projects they produced.",
        "Storage and archiving to finish the AWS module, exam prep, and a look back "
        "at everything I built and what it cost.",
        "Write it down. The recap is what makes the next interview easier."),
}


def build(projects):
    # milestone posts by week
    by_week = {w: [] for w in range(1, 13)}
    for proj in projects["projects"]:
        for m in proj["milestones"]:
            if not m.get("post"):
                continue
            by_week.setdefault(m["week"], []).append({
                "hook": m["post"],
                "source": f"project:{proj['id']}#{m['id']}",
                "type": "project",
                "evidence": m["title"],
            })

    weeks = []
    n = 0
    for w in range(1, 13):
        posts = by_week[w][:3]
        hooks = LEARNING[w]
        k = 0
        while len(posts) < 3:
            posts.append({
                "hook": hooks[k % len(hooks)],
                "source": "course",
                "type": "learning",
                "evidence": "AWS re/Start week " + str(w),
            })
            k += 1
        for i, p in enumerate(posts, start=1):
            n += 1
            p.update({
                "id": f"post-{n:02d}",
                "week": w,
                "slot": i,
                "status": "idea",
                "publishedUrl": None,
                "notes": "",
            })
        weeks.append({"week": w, "posts": posts})

    return {
        "cadence": "3 posts per week for 12 weeks = 36 posts",
        "rules": [
            "One artifact per post. Screenshot, diagram, code block, or live link.",
            "Never post a post without a link or an image. It is a portfolio piece, not a status update.",
            "Batch-draft all three on Sunday, publish Mon/Wed/Fri around 09:00 or 18:00 IST.",
            "Reply to every comment within 2 hours. The first hour decides reach.",
            "Repurpose: a good post becomes a README section, then a resume bullet.",
        ],
        "format": ["Hook line 1: the specific number, mistake, or result.",
                   "What I built / learned, in plain language.",
                   "The technical detail, 3-6 bullets.",
                   "One lesson, stated as a rule.",
                   "Question at the end that invites a real answer."],
        "weeks": weeks,
    }


def main():
    projects = load()
    data = build(projects)
    (DATA / "linkedin.json").write_text(
        json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    total = sum(len(w["posts"]) for w in data["weeks"])
    proj = sum(1 for w in data["weeks"] for p in w["posts"] if p["type"] == "project")
    print(f"linkedin.json : {len(data['weeks'])} weeks, {total} posts ({proj} project, {total-proj} course)")


if __name__ == "__main__":
    main()
