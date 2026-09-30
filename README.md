# PJM Dashboard — Public Demo

A working demo of a project-management dashboard that assembles a PM's whole picture — sprints, workload, releases, meetings, action items — into one place, from tools that don't talk to each other.

**Every person, project, ticket, meeting and number in this build is fictional.** It's a POC to play with, not a real team's data.

## Try it

Open `index.html` — or the GitHub Pages URL if this repo has Pages enabled.

It's plain HTML. No build step, no install, no dependencies. Clone it and double-click, or serve the folder:

```
python3 -m http.server 8000
```

Serving over `http://` rather than opening the file directly is worth doing — a couple of modules read JSON from `data/`, which browsers block on `file://`.

## What's in it

| Module | What it shows |
|---|---|
| Overview | Aggregated KPIs across every other module |
| Projects | Live board state per project — status split, milestones, leads |
| Resources | Team workload and bandwidth grid |
| Sprint Plans | Plan per sprint with an in-page live editor |
| Sprint Review | Completion %, velocity and rollover by project |
| Releases | Planned and shipped releases |
| Priorities / Deliverables / Roadmap | Strategic views by quarter |
| PR Dashboard | Pull request pipeline and review state |
| Action Items | Tasks pulled together from across sources |
| Meetings | Calendar, notes and recordings |
| Standup Brief | On-demand pre-standup briefing |
| Sprint Planning | Planning workspace and sprint history |

## How it's built

Three ideas carry the whole thing:

**1. One HTML file per module.** No framework, no bundler, no `node_modules`. Each page is self-contained and opens on its own. You can edit one tab without breaking the others — which is the only reason a dashboard like this survives a year of changes.

**2. The browser never holds credentials.** In the real version, an assistant with access to the source tools (Linear, JIRA, Calendar, Slack, GitHub) does the fetching and writes plain JSON to disk. The pages only ever read JSON. No API keys in the page, no CORS, no OAuth plumbing in the frontend. In this demo build the JSON is bundled and all outbound API calls are blocked outright.

**3. A shared layer holds it together.**

```
shared/pjm.css       design tokens + every shared component
shared/pjm-nav.js    the sidebar each page injects
shared/pjm-sync.js   freshness registry — per-module staleness, read by nav and Overview
```

Each module writes its sync state to `pjm-sync.js`; the sidebar renders a fresh/stale/error dot from it, and Overview aggregates the summaries. Adding a module means registering it in `MODULE_META`, `MODULE_ORDER` and `THRESHOLDS` — forget that and the page works but the dot stays grey.

## What's different in this demo build

- All data is generated and fictional
- No credentials ship with it — none are needed
- `fetch` and `XMLHttpRequest` are patched to block calls to third-party APIs, so the page can't phone home even if you click something that tries
- A banner on every page says so, so no one mistakes the numbers for real

## Licence

Shared as a portfolio/reference POC. Take the architecture and do what you like with it.
