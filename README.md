# Career Hub

A self-hosted tracker for a 60-day AWS + AI plan: two Canvas courses, three
projects, a 36-post LinkedIn cadence, and a job pipeline.

**No build step. No dependencies. No framework.** Open `index.html` and it
works.

**Live:** <https://hitesh-k-s.github.io/career-hub/>

## Run it

```bash
# simplest - just open the file
xdg-open index.html

# or serve it, if you prefer http://
python3 -m http.server 8099
```

Then open <http://localhost:8099>.

## The five views

| View | What it is |
|---|---|
| **Today** | The day you are on. AWS re/Start target, Generation morning and afternoon, and the project milestone due that week. Arrow keys or `‹`/`›` to move days. |
| **Courses** | All 24 AWS re/Start modules and all 60 Generation days, filterable and searchable. |
| **Projects** | 25 milestones across 3 projects, with stack, week, and the interview question each one answers. |
| **LinkedIn** | 36 post ideas, 3 per week for 12 weeks. Project posts are tied to a milestone, so every post has a real artifact behind it. |
| **Jobs** | Target roles, an 8-step playbook, a question bank, and an application table. |

## Your progress

Saved to `localStorage` in this browser. Nothing is uploaded anywhere.

**Export** writes a JSON file. **Import** reads it back. Export at the end of
each week, keep the file somewhere you will actually find it, because
`localStorage` is cleared by "clear browsing data" and by some browser updates
on Linux profiles.

## Data

Everything lives in `data/`:

| File | Contents |
|---|---|
| `modules.json` | 24 AWS re/Start modules, 413 items, requirement rules, week targets |
| `days.json` | 60 Generation days, 905 items, each mapped to its AWS target |
| `projects.json` | 3 projects, 25 milestones, stacks, interview angles, cost ceiling |
| `linkedin.json` | 12 weeks x 3 posts, generated from the project milestones |
| `jobs.json` | Target roles, playbook, question bank |

`assets/data.js` is a generated bundle of all five, so the site works from
`file://` where `fetch` is blocked by CORS. **The site reads only
`window.CAREER_HUB_DATA`.** The JSON files are the source of truth.

## Regenerating

```bash
python3 tools/build-data.py     # modules.json, days.json  +  assets/data.js
python3 tools/build-linkedin.py # linkedin.json from projects.json
python3 tools/build-docs.py     # 12-week-plan.md, linkedin-calendar.md
```

`tools/build-data.py` reads the two course extracts:
`/home/hitesh/aws-restart-course.md` and
`/home/hitesh/generation-course-full.md`. The day-to-module mapping and the
requirement rules live at the top of that file as plain dictionaries - edit
them there.

## Docs

| Doc | Read it when |
|---|---|
| [docs/preflight.md](docs/preflight.md) | **Before touching any project.** Security findings, and the credentials you still need to rotate. |
| [docs/12-week-plan.md](docs/12-week-plan.md) | You want the whole arc on one page. |
| [docs/linkedin-calendar.md](docs/linkedin-calendar.md) | Sundays, when you batch the week's three posts. |
| [docs/job-playbook.md](docs/job-playbook.md) | You are about to apply, or you just had an interview. |
| [docs/project-specs/](docs/project-specs/) | You are starting a project. |

## Deploying

Static, so GitHub Pages works with no build step. `index.html` sits at the repo
root, so Jekyll is not involved.

This repo is already deployed: <https://hitesh-k-s.github.io/career-hub/>
(branch `main`, path `/`). Pushes to `main` redeploy automatically.
