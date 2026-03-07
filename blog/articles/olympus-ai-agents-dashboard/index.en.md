---
title: "Olympus: My Dashboard for Orchestrating AI Agents"
excerpt: "I built a dashboard to coordinate a team of 7 AI agents working autonomously on my projects. Here's why, how, and what I've learned."
publishedAt: "2026-02-12"
draft: false
lang: en
---

Coordinating multiple AI agents working in parallel requires dedicated infrastructure. After a few weeks of experimenting with 7 specialized agents (architecture, dev, QA, research, writing), I built Olympus, a task management system designed for multi-agent coordination.

The technical problem

Initially, coordination happened through Discord. Main (the orchestrator) received my requests, dispatched to specialized agents via mentions, collected results in threads. Functional at first.

Observed limitations:
- No global view: to know system state, had to parse all Discord threads
- No structured prioritization: first-in-first-out based on message chronology
- Fragmented memory: each agent had their files (`daily-notes/`, `decisions/`), but no unified database
- Blocked coordination: if Atlas (research) needed to hand off to Daedalus (architecture), I played intermediary

The filesystem as source of truth was insufficient: no notifications, write conflict risks, manual parsing required. Discord isn't built for structured task tracking.

Solution: build a dedicated REST API + web UI.

Technical architecture

Stack:
- Backend: NestJS + TypeORM + PostgreSQL (hosted on VPS via Dokploy)
- Frontend: React 19 + Vite + Zustand + TanStack Query + shadcn/ui
- Deployment: Dokploy (self-hosted Vercel equivalent)

Design choices:

PostgreSQL over files to guarantee ACID and enable complex queries.

NestJS for modular structure (DI, guards, pipes). TypeORM to avoid manual SQL on a side project.

React 19 over SvelteKit (migrated after a few days): faster dev velocity thanks to my React ecosystem mastery.

WebSockets for real-time agent notifications rather than polling.

REST API endpoints:
GET /tasks # List all tasks
GET /tasks?assignee=writer # Filter by agent
GET /tasks/:id # Task details
POST /tasks # Create (Main only)
PATCH /tasks/:id # Update status
POST /tasks/:id/comments # Add comment

Authentication:
Each agent has a unique API key. Main has `POST /tasks` rights, other agents only `PATCH` and comments.

Rate limiting:
Implemented after Atlas created dozens of tasks in seconds (logic bug where he re-scanned his own cache before DB was updated).

Real workflow

Contrary to the initial idea of self-organizing agents, the system works via centralized orchestration:

Main (CEO agent):
1. Heartbeat several times daily
2. Reads Olympus backlog
3. Analyzes what needs to be done (based on my vision)
4. Creates tasks for specialized agents
5. Spawns agents via `sessions_spawn` if needed

Specialized agents:
1. Triggered by cron or spawn
2. Fetch assigned tasks via API
3. Work on the task
4. Update status and post comments
5. Go back to sleep

No direct horizontal coordination: everything goes through Main and Olympus.

What works

Structured visibility: A dashboard replaces infinite Discord scrolling. Filters by agent, status, priority. Overview at a glance.

Centralized memory: PostgreSQL database rather than scattered files. Complex queries possible.

Rate limiting: Prevents infinite loops.

Mandatory blocking documentation: If an agent puts a task in `blocked`, API checks for recent comment. Forces documentation.

WebSockets for real-time notifications: Agents don't need to poll continuously.

What doesn't work (yet)

Unstable heartbeats: Some heartbeats missed (cron failures, timeouts).

Many tasks created, fewer completed: Velocity illusion. Creating tasks quickly gives the impression of progress, but what matters is what gets delivered.

No integrated metrics: No analytics dashboard in Olympus v1.

Blockages not auto-resolved: Main doesn't systematically pick up blocked tasks.

No dependency system: "B waits for A" exists in comments, not in system logic.

Technical lessons

1. A relational database is non-negotiable

The filesystem isn't enough for real-time coordination.

2. Centralized orchestration simplifies coordination

Rather than each agent communicating with all others (n² interactions), everything goes through Main (n interactions).

3. Rate limiting from day 1

Don't wait for an agent to create dozens of tasks in a loop before implementing limits.

4. Force blocking documentation

If an agent blocks without explaining why, the system should reject the update.

5. Start minimal

Olympus v0: a few statuses, basic CRUD, no WebSockets. Add features only when need is proven.

6. Kill switches must be independent

If `/stop` depends on the agent being cooperative, it's not a kill switch.

7. Measure real velocity, not task creation

What matters: how many are *completed*, and how many *deliver value*.

Conclusion

Olympus isn't a revolutionary AI project. It's a CRUD app with a REST API and a kanban board. But it's the infrastructure needed to experiment with multi-agent systems.

What I learned: centralized orchestration works better than horizontal coordination. Agents are fast but unreliable. Task creation isn't velocity. Structured visibility is essential.

What remains to prove: can this system actually deliver value in production?

Olympus code isn't public yet. But if you're building multi-agent systems and want to discuss, my DMs are open.