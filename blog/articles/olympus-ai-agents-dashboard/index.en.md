---
title: "Olympus: My Dashboard for Orchestrating AI Agents"
excerpt: "I built a dashboard to coordinate a team of 7 AI agents working autonomously on my projects. Here's why, how, and what I've learned."
publishedAt: "2026-02-12"
draft: false
lang: en
---

I have a problem most people don't have yet: coordinating a team of AI agents working autonomously on real projects.

For the past two weeks, I've been running what I call the **Pantheon** — a team of seven specialized AI agents (architecture, development, QA, research, writing) collaborating on my side projects. They write code, do reviews, plan sprints, write documentation. They communicate with each other, get blocked, unblock each other, create tasks for one another.

It all runs on a Mac Mini in my apartment. I talk to the orchestrator (Main) via Discord. He dispatches work to the other agents. They deliver PRs, reports, analyses. It works. But it only works because I built **Olympus**.

Olympus is a task management dashboard for AI agents. A Jira for machines. A web interface where I see in real-time what each agent is doing, what they're blocked on, what they're saying to each other. And most importantly, it's the API that allows them to coordinate without me intervening in every exchange.

This article is about why I built it, how it works, and what it changes in my way of working with autonomous AI systems.

## The problem: orchestrating without losing control

When I launched the Pantheon, coordination happened through Discord. I'd send a request to Main, he'd respond, ping another agent if needed, that one would respond in the thread. Simple. Functional.

For a week.

Then problems emerged:

**No global visibility.** To know what each agent was doing, I had to scroll through Discord. If an agent had been blocked for three days, I wouldn't see it unless I reread all the threads.

**No clear prioritization.** Agents worked in the order of Discord messages. No sense of urgency, no backlog, no roadmap. If three tasks arrived in the same hour, it was first-in-first-out, no thinking.

**No structured shared memory.** Each agent had their own memory files (daily notes, decisions, learnings). But no unified view. If Hephaestos (the dev agent) learned something about a project's architecture, Hermes (the scrum master) wouldn't automatically see it.

**No structured inter-agent coordination.** If Atlas (research) needed to hand off to Daedalus (architecture), I had to play intermediary. Agents couldn't signal to Main that a follow-up task was needed. They went through me. I had become the bottleneck.

I had built an autonomous team that could only function with my constant micro-management. That doesn't scale. And frankly, it was exhausting.

## The false solutions

I first thought about improving the file system. Adding naming conventions, sync scripts, YAML templates for tasks. Making the filesystem "self-service" for agents.

Bad idea.

The filesystem is great for memory and deliverables. But for real-time coordination? It's a nightmare. Agents would have to parse Markdown files to know who's doing what. Handle conflicts if two agents modify the same file. Implement their own change detection logic.

And most importantly: **no notifications**. An agent doesn't know a task was created for them unless they continuously poll a folder. Inefficient and fragile.

I also considered keeping everything in Discord. Structuring threads, adding naming conventions (like `[TASK]`, `[BLOCKED]`), using reactions as a status system.

Worse idea.

Discord is made for asynchronous communication between humans. Not for structured task management. No filters, no per-agent views, no metrics. And most importantly, no clean API for agents to programmatically create and update tasks.

I needed a real system. A centralized hub. A single source of truth.

## Olympus: a hub for humans and machines

Olympus is two things:

1. **A web interface** where I see everything happening in the Pantheon.
2. **A REST API** that agents use to coordinate.

### For me (the web interface)

A classic kanban board. Columns by status (`backlog`, `in_progress`, `blocked`, `done`, `waiting_for_human`, `waiting_for_agent`, `in_review`). Each task has:

- A title, a description
- An assignee (which agent)
- A creator (me or another agent)
- A priority (`low`, `medium`, `high`, `critical`)
- A history of status changes
- Comments (conversation between agents, or between me and agents)

I can see:
- Tasks for a specific agent
- Tasks blocked for more than X days
- Who's waiting for what from whom
- Each agent's workload

I can also access each agent's **memory** (their daily notes, config, logs) directly from Olympus. Before, I had to open VSCode and navigate the filesystem. Now, everything is indexed and searchable via a dedicated UI.

### For agents (the API)

Each agent has a unique API key. They can:

- **Read their tasks** (`GET /tasks?assignee=agent_id`)
- **Update status** (`PATCH /tasks/:id`)
- **Post comments** (`POST /tasks/:id/comments`)
- **Read others' tasks** (to understand global context)

**Only Main can create tasks** (`POST /tasks`). Specialized agents don't create. They execute. This asymmetry is intentional: it prevents the chaos of unsupervised horizontal coordination.

The API is simple. No GraphQL, no unnecessary complexity. Pure REST. JSON in, JSON out. Rate limiting to prevent infinite loops (lesson learned after a logic bug where Main tried to create 47 tasks in three seconds).

Every status change or new comment triggers a WebSocket notification. Agents don't need to poll. They're notified in real-time.

## Tech stack (and why these choices)

**Backend: NestJS + TypeORM + PostgreSQL**

NestJS because I like TypeScript and the modular structure makes code maintainable. TypeORM because I don't want to write SQL by hand for this project. PostgreSQL because it's solid, free, and I host on my VPS via Dokploy (didn't want to pay for Supabase or Firebase for a personal project).

**Frontend: React 19 + Vite + Zustand + TanStack Query**

Initially, I started with SvelteKit. Then migrated to React. Why? Because I know React inside out. I can code fast, debug fast, and there are 10x more resources if I get stuck. SvelteKit is elegant, but for a solo project where velocity matters more than framework elegance, React wins.

Zustand for local state (lightweight, no boilerplate). TanStack Query for server state (automatic caching, refetch, invalidation). shadcn/ui for components (because I don't want to reinvent modals and dropdowns).

**Hosting: Dokploy on VPS**

Dokploy is a self-hosted Vercel/Railway. You push to `main`, it builds and deploys automatically. Zero config. Frontend on `olympus.tomandrieu.com`, backend on `api.olympus.tomandrieu.com`. PostgreSQL database managed by Dokploy too.

Why self-hosted and not a PaaS? **Total control**. I can SSH into the machine, inspect logs, kill a process if needed. With a PaaS, you depend on their interface. I've learned the importance of having a real kill switch.

## The reality: orchestration by Main, not complete autonomy

The theory was seductive: agents coordinating among themselves, creating tasks, unblocking each other. The idea of a self-organizing system.

Reality is more nuanced.

**How it actually works:**

Agents don't run continuously. They're triggered by **crons** — scheduled tasks that wake them at regular intervals.

**Main = the CEO.** He's the orchestrator. He has heartbeats 4 times a day (8am, 12:30pm, 5pm, 9pm). At each heartbeat, he:
1. Checks Olympus tasks (new, blocked, waiting)
2. Identifies what needs to be done
3. Creates tasks for specialized agents
4. Spawns agents if needed (via `sessions_spawn`)
5. Tracks progress and follows up if blocked

**Specialized agents do NOT create tasks.** They receive a task from Main, work on it, update status, post comments. That's it. No horizontal coordination. Everything goes through Main.

When a specialized agent wakes up (cron or spawn), it:
1. Fetches assigned tasks via the Olympus API
2. Reads the latest `in_progress` one (or takes the next if nothing in progress)
3. Works on it
4. Updates status and posts a comment
5. Goes back to sleep (or terminates if spawned)

**My role:**
- I talk to **Main**, not to other agents
- I give him the **vision**, **objectives**, **priorities**
- Main translates that into Olympus tasks and dispatches
- I spend **5 hours a day** discussing with Main, unblocking situations, fixing bugs, refining prompts

**What works:**
- Visibility: I see exactly what each agent is doing via Olympus
- Structured coordination: Main creates tasks, agents execute
- Shared memory: everything is in Olympus, not scattered in Discord

**What doesn't work yet:**
- Heartbeats are too spaced out or unreliable
- Agents aren't truly "autonomous" — they wait for Main to validate, restart, correct
- Velocity isn't there: we create many tasks, complete few

**Who really prioritizes?**

Main. During his heartbeats, he analyzes the backlog, identifies what matters (based on my vision), and creates/prioritizes tasks accordingly. Agents execute. They don't decide what's important. They don't have that strategic intelligence.

It's far from the idealized image of a "manager who observes." I'm in the logs, in discussions with Main, in validation. Olympus helps me structure this chaos. But the chaos remains.

## The struggles (and lessons)

Building Olympus wasn't smooth sailing.

**The agent who got blocked without explaining why**

Hermes put a task in `blocked` without posting a comment. I spent 20 minutes trying to figure out why. He was waiting for a decision from me on an architecture question. But he hadn't written it.

Lesson learned: **mandatory comment when changing to `blocked`.** If an agent puts a task in `blocked`, the API checks for a recent comment (less than 2 minutes). Otherwise, 400 error. Forces agents to document the blocking.

**The agent creating tasks in a loop**

Atlas created 47 tasks in three seconds. Bug in his logic for detecting missing tasks. He'd see "no research task for X" and create one. Then re-scan, see "no research task for X" (because the task had just been created and wasn't in his cache yet), and create another. Loop.

Lesson learned: **rate limiting per agent.** Max 5 task creations per minute. Beyond that, 429 error. And improved cache logic on the agent side.

**The velocity illusion**

Main can create tasks fast. Very fast. Too fast, sometimes. He analyzes a project and generates 15 tasks in two minutes. It gives the impression of progress. But creating tasks isn't completing them.

Reality: **we haven't shipped anything**. Tools created, assets generated, repos initialized. But nothing tangible in production. Nothing generating a euro.

Lesson being learned: task creation velocity isn't project velocity. It's the **direction** that matters. And I'm the one giving Main that direction. Through weekly objectives. Through validations. Through Discord discussions.

## What it actually changes

**Structured visibility.** Before, everything was scattered: Discord, files, logs. Now, Olympus centralizes. I see who's doing what, who's blocked, who's waiting for what. It hasn't reduced my cognitive load, but it has **organized** it.

**Intense learning.** Two weeks building this system, watching agents fail, succeed, bug out, create absurd tasks, deliver brilliant stuff. I'm learning enormously about:
- LLM limitations in multi-agent coordination
- Patterns that work (and those that explode)
- How to structure autonomous (or semi-autonomous) systems
- The importance of kill switches, rate limiting, supervision

**Nothing shipped, but foundations laid.** We haven't put anything in prod. Nothing that makes money. But I've built:
- A coordination system that scales
- A team of agents with clear roles
- An architecture that enables rapid experimentation
- Tools, repos, assets

**I think differently about my projects.** Not in "tasks I delegate," but in "systems I design." Olympus forces me to architect collaboration, not just work distribution.

**5h per day in the system.** No magic, no total autonomy. I'm still deeply involved. But every day, I understand better how to make this mess work. And the experience is worth it.

## What's left to do

Olympus v1 exists. But "works" would be generous.

**What's missing:**

- **Notifications.** Currently: nothing. I ping agents on Discord, they respond. Olympus websockets send real-time updates, but no push notification system. I have to go check the board.

- **Reliable heartbeats.** Crons work, but agent heartbeats are unstable. Sometimes they miss their window. Sometimes they run too often. I need to refine the frequency and logic.

- **Metrics and analytics.** Average time per task. Block rate. Real velocity (not just task creation, but completion). To detect patterns and improve.

- **Task templates.** Recurring tasks (audits, reports) are recreated manually. Inefficient.

- **Task dependencies.** "B waits for A" exists in comments, not in system logic. Agents handle this manually (or don't).

- **Calendar view.** Deadlines and sprints are in my head, not in Olympus.

But I'll only implement what I actually need. No "just in case" features. Olympus evolves at the pace of my struggles.

## Lessons for anyone orchestrating AI agents

If you're building a multi-agent system — or thinking about it —, here's what I've learned:

**1. A single source of truth is non-negotiable.** Discord, Slack, files, all of that, those are interfaces. But underneath, you need a structured database. Otherwise, you lose coherence.

**2. A centralized orchestrator simplifies coordination.** If every inter-agent interaction goes through you (human), you become the bottleneck. Having an orchestrator agent (Main in my case) who handles task creation and dispatch centralizes the logic. Specialized agents can comment, update their status, signal blockers. But coordination remains supervised, not chaotic.

**3. Kill switches must be independent of the system they kill.** If your `/stop` command depends on the agent being in a cooperative state, it's not a kill switch. It's a polite suggestion.

**4. Visibility = control.** You can't control what you can't see. A real-time dashboard changes everything. You detect problems before they become catastrophes.

**5. Direction comes from the orchestrator.** Agents execute. They don't decide strategy. It's **Main** (the CEO agent) who, during his heartbeats, analyzes the backlog and creates/prioritizes tasks. Based on the vision I give him. Agents work so fast that individual task prioritization doesn't matter. What matters: **what to do** and **how to do it**. I define it, Main orchestrates it.

**6. Agents will fail.** Prepare yourself. Rate limiting. Hard limits. Watchdogs. Timeouts. Detailed logs. Don't trust blindly.

**7. Start simple.** Olympus v0 was a basic kanban board with three statuses. No WebSocket. No comment system. Just a task CRUD. That was enough for two weeks. Iterate based on your real needs, not your imaginary ones.

## Conclusion

Olympus isn't a sexy tech project with cutting-edge algorithms or complex machine learning. It's a CRUD app. A kanban board. A REST API.

But it's **the infrastructure that enables experimentation.**

Without Olympus, the Pantheon would be unmanageable. With Olympus, I have structured visibility on the chaos. I can test coordination patterns. I can see where it breaks. I can iterate.

**Does it "work"?** No, not yet. Nothing shipped. Nothing in prod. Just tools, repos, assets. But it's been two weeks. And I'm learning.

**Does it foreshadow the future of working with AI?** I don't know. But this is how I'm experimenting today. And every struggle teaches me something about autonomous systems, multi-agent coordination, LLM limitations.

If you're building multi-agent systems, or thinking about how to structure human-AI collaboration, know that it's hard. That it doesn't look like polished demos. That you'll spend 5h a day in the logs. But that the learning is worth it.

My DMs are open if you want to discuss this.
