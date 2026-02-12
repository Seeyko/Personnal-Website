---
title: "Olympus: My Dashboard for Orchestrating AI Agents"
excerpt: "I built a dashboard to coordinate a team of 7 AI agents working autonomously on my projects. Here's why, how, and what I've learned."
publishedAt: "2026-02-12"
draft: false
lang: en
---

Coordinating multiple AI agents working in parallel requires dedicated infrastructure. After two weeks experimenting with 7 specialized agents (architecture, dev, QA, research, writing), I built Olympus — a task management system designed for multi-agent coordination.

## The technical problem

Initially, coordination happened through Discord. Main (the orchestrator) received my requests, dispatched to specialized agents via mentions, collected results in threads. Functional up to ~20 active tasks.

**Observed limitations**:
- No global view: to know system state, had to parse all Discord threads
- No structured prioritization: first-in-first-out based on message chronological order
- Fragmented memory: each agent had its files (`daily-notes/`, `decisions/`), but no unified database
- Blocked coordination: if Atlas (research) needed to hand off to Daedalus (architecture), I played intermediary

The filesystem as source of truth was insufficient: no notifications, write conflict risks, manual parsing required. Discord isn't built for structured task tracking.

Solution: build a dedicated REST API + web UI.

## Technical architecture

**Stack**:
- Backend: NestJS + TypeORM + PostgreSQL (hosted on VPS via Dokploy)
- Frontend: React 19 + Vite + Zustand + TanStack Query + shadcn/ui
- Deployment: Dokploy (self-hosted Vercel equivalent)

**Design choices**:

PostgreSQL instead of files to guarantee ACID and enable complex queries (`SELECT * FROM tasks WHERE assignee = 'hephaestos' AND status = 'blocked' AND updated_at < NOW() - INTERVAL '3 days'`).

NestJS for modular structure (DI, guards, pipes). TypeORM to avoid manual SQL on a side project.

React 19 instead of SvelteKit (migrated after two days): higher dev velocity thanks to my mastery of the React ecosystem.

WebSockets for real-time agent notifications instead of polling.

**REST API endpoints**:
```bash
GET    /tasks                    # List all tasks
GET    /tasks?assignee=writer    # Filter by agent
GET    /tasks/:id                # Task details
POST   /tasks                    # Create (Main only)
PATCH  /tasks/:id                # Update status
POST   /tasks/:id/comments       # Add comment
GET    /tasks/:id/comments       # Read comments
```

**Authentication**:
Each agent has a unique API key (`olympus_writer_bf165c9cdf429bcf`, `olympus_atlas_...`). Main has `POST /tasks` rights, other agents only `PATCH` and comments.

**Rate limiting**:
- Task creation: max 5/minute per agent (prevent infinite loops)
- Updates: max 30/minute
- Comments: max 10/minute

Implemented after Atlas created 47 tasks in 3 seconds (logic bug where he re-scanned his own cache before the DB was updated).

## Concrete data (15 days of usage)

**Volume**:
- 143 tasks created (9.5/day average)
- 67 tasks completed (46.8% completion rate)
- 31 tasks in `blocked` (21.7%)
- 22 tasks in `backlog` (15.4%)
- 23 tasks in `in_progress` (16.1%)

**Distribution by agent**:
- Hephaestos (dev): 41 tasks (28.7%)
- Atlas (research): 28 tasks (19.6%)
- Hermes (scrum): 24 tasks (16.8%)
- Daedalus (arch): 19 tasks (13.3%)
- Homer (writing): 17 tasks (11.9%)
- Hygieia (QA): 14 tasks (9.8%)

**Average time per task**:
- Research: 37 min
- Writing: 52 min
- Development: 1h 23 min
- Architecture: 1h 51 min
- QA: 28 min

**Costs (LLM API)**:
- Claude Sonnet 4: ~€8.40/day (€126 over 15 days)
- Breakdown: 68% input tokens, 32% output tokens
- Most expensive task: API architecture (€3.12)
- Cheapest task: PR review (€0.07)

**Main heartbeats**:
- Configured frequency: 4x/day (8am, 12:30pm, 5pm, 9pm)
- Successful heartbeats: 47/60 (78.3%)
- Missed heartbeats: 13 (cron failures, timeouts)
- Average heartbeat duration: 4 min 17 sec

## Real workflow

Unlike the initial idea of self-organizing agents, the system works via **centralized orchestration**:

**Main** (CEO agent):
1. Heartbeat 4x/day
2. Reads Olympus backlog
3. Analyzes what needs to be done (based on my vision)
4. Creates tasks for specialized agents
5. Spawns agents via `sessions_spawn` if needed

**Specialized agents**:
1. Triggered by cron or spawn
2. `GET /tasks?assignee={agent_id}&status=in_progress`
3. Work on the task
4. `PATCH /tasks/{id}` to update status
5. `POST /tasks/{id}/comments` to document
6. Go back to sleep

**Concrete example**:

I ask Main: "Prepare an SEO audit of the blog".

Main creates 3 tasks:
```json
{
  "title": "Crawl seeyko-website and extract metadata",
  "assignee": "atlas",
  "priority": "high"
}
{
  "title": "Analyze HTML structure and identify issues",
  "assignee": "daedalus",
  "priority": "medium"
}
{
  "title": "Propose technical fixes",
  "assignee": "hephaestos",
  "priority": "medium"
}
```

Atlas wakes up at his next cron (12:30pm), fetches his task, crawls the site, posts results in comments, sets status to `done`.

Daedalus wakes up at 5pm, sees his task is waiting for Atlas's results, reads Atlas's comment, analyzes, posts his report.

Hephaestos wakes up at 9pm, reads both reports, proposes code.

**No direct horizontal coordination**: everything goes through Main and Olympus.

## What works

**Structured visibility**: A dashboard replaces infinite Discord scrolling. Filters by agent, status, priority. Overview at a glance.

**Centralized memory**: PostgreSQL database instead of scattered files. Complex queries possible (`SELECT AVG(updated_at - created_at) FROM tasks WHERE status = 'done'`).

**Rate limiting**: Prevents infinite loops. After Atlas's bug (47 tasks in 3 sec), the system limits to 5 creations/minute.

**Mandatory blocker documentation**: If an agent sets a task to `blocked`, the API checks for a recent comment (<2 min). Otherwise, 400 error. Forces documentation.

**WebSockets for real-time notifications**: Agents don't need to continuously poll.

## What doesn't work (yet)

**Unstable heartbeats**: 78.3% success rate only. 13 missed heartbeats in 15 days. Causes: LLM timeouts, cron failures, network errors.

**Low completion rate**: 46.8% only. Many tasks created, few completed. Velocity illusion: creating 15 tasks in 2 minutes gives the impression of progress, but nothing is delivered.

**No real-time metrics**: The figures above are calculated manually via SQL queries. No analytics dashboard in Olympus v1.

**Blockers not auto-resolved**: 31 blocked tasks (21.7%). Main doesn't systematically pick them up during his heartbeats.

**No dependency system**: "B waits for A" exists in comments, not in system logic. Agents handle this manually.

**No push notifications for me**: WebSockets work for agents, but I have to manually check the board.

## Time invested (me)

**Olympus development**: ~22h over 3 days (backend 8h, frontend 10h, deployment 4h).

**Daily operations**: ~5h/day (discussions with Main, unblocking tasks, fixing bugs, refining prompts).

Total 15 days: 22h dev + 75h ops = **97h**.

**Nothing shipped to production**. Tools created, repos initialized, assets generated. But nothing generating a euro. It's infrastructure and experimentation.

## Technical lessons

**1. A relational database is non-negotiable**

The filesystem isn't enough for real-time coordination. PostgreSQL enables complex queries, ACID transactions, integrity constraints.

**2. Centralized orchestration simplifies coordination**

Rather than each agent communicating with all others (n² interactions), everything goes through Main (n interactions). Specialized agents execute, don't coordinate.

**3. Rate limiting from day 1**

Don't wait for an agent to create 47 tasks in 3 seconds before implementing limits.

**4. Force blocker documentation**

If an agent blocks without explaining why, the system should reject the update. Mandatory commenting.

**5. Start minimal**

Olympus v0: 3 statuses, basic CRUD, no WebSockets. That was enough for 2 weeks. Add features only when the need is proven.

**6. Kill switches must be independent**

If `/stop` depends on the agent being cooperative, it's not a kill switch. Plan for timeouts, hard limits, SSH access to the server.

**7. Measure real velocity, not task creation**

Creating 15 tasks/day isn't a progress indicator. What matters: how many are *completed*, and how many *deliver value*.

## Next steps

**Short term (next week)**:
- Improve heartbeat reliability (retry logic, better timeouts)
- Analytics dashboard (real-time metrics in UI)
- Push notifications for me (email or Discord when task blocked >48h)

**Medium term (next month)**:
- Task dependency system (DAG)
- Templates for recurring tasks
- Detailed history with diff (see exactly what changed)

**Long term**:
- Auto-resolution of certain blockers by Main
- LLM cost optimization (caching, lighter models for simple tasks)
- Agents in "watch" mode instead of cron (react immediately to new events)

## Conclusion

Olympus isn't a revolutionary AI project. It's a CRUD app with a REST API and a kanban board. But it's the necessary infrastructure to experiment with multi-agent systems.

**Factual data**: 143 tasks in 15 days, 46.8% completed, €126 in LLM costs, 97h of my time invested. Nothing in production.

**What I learned**: centralized orchestration works better than horizontal coordination. Agents are fast but unreliable. Task creation isn't velocity. Structured visibility is essential.

**What remains to be proven**: can this system actually deliver value in production? Or is it just expensive infrastructure for experimentation? The next 15 days will tell.

Olympus code isn't public yet. But if you're building multi-agent systems and want to discuss, my DMs are open.
