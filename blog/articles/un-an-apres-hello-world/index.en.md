---
title: "One Year After Hello World: The Train at Full Speed"
excerpt: "Two months after Hello World, everything has changed. Olympus abandoned, Claude Code alone, OpenClaw fading away. Things move fast. Very fast."
publishedAt: "2026-03-08"
draft: false
lang: en
private: true
passwordHash: "$2a$10$rpI8Eg912NE7ujSMZ/xPouaPAC/M7vFWTZVfLfBjILCiYT8bXYfi."
---

I wrote [Hello World](https://tomandrieu.com/blog/hello-world) in January 2026. I talked about my gradual discovery of AI in 2025. Cursor, Claude Code, the idea of Product Engineering.

We're in March 2026. Two months later. But what happened since feels more like two years than two months.

## The Olympus/Pantheon Experience — and the Drift to Claude Code

Between January and March, I built Olympus and Pantheon. The idea: orchestrate 7 specialized AI agents working autonomously on my projects.

**Olympus**: a task management dashboard to coordinate agents. REST API, PostgreSQL, React interface. A complete system for task management, prioritization, statuses, comments.

**Pantheon**: 7 specialized agents. Architecture (Daedalus), development (Hephaestus), QA (Hygieia), research (Atlas), writing (Homer). Each with its own expertise, workflow, memory.

The idea was appealing: a team of autonomous agents that collaborate, hand off tasks, iterate together.

**Reality was different.**

### It Was Too Complex

Managing 7 agents communicating with each other is a huge overhead. Difficult debugging: when something breaks, which agent messed up? Which interaction failed? Which context was poorly transmitted?

Productivity gains weren't clear. Worse: sometimes it was slower than a single well-piloted agent.

### Claude Code Alone Is Enough

While I was experimenting with Olympus/Pantheon, Claude Code kept evolving. Terminal-first. Remote-control. SSH. MCP (Model Context Protocol). Deep integration with daily tools.

**I realized something: one well-piloted agent does the job. No need for 7.**

The BMAD pattern I had formalized (Brief → Main → Agent → Deliver) works. But no need for an external orchestrator. Everything can be done within Claude Code.

### The Natural Drift

Little by little, I stopped using Olympus. Tasks were assigned less and less. Agents were sleeping. Claude Code became my only tool.

Why manage 7 agents when 1 is enough?

**Result**: Olympus/Pantheon, useful experience, but abandoned. Claude Code: my only dev tool now.

I learned a lot. About orchestration. About complexity. About what works and what doesn't. But the conclusion is clear: simplicity > complex orchestration.

## Why I Still Use OpenClaw (and Why That Will Change)

But then, why OpenClaw? If Claude Code is enough for dev, why another system?

### Long-Term Memory

Today, OpenClaw does something Claude Code doesn't do natively: **remember**.

**Knowledge Graph**: a tree of my life. Projects, decisions, preferences, conversations. All interconnected. I can ask "when did I say X about Y?" and OpenClaw finds it, contextualizes, reminds me why I said that.

**Life management**: precise contextual reminders. Not just "do X", but "do X because you said Y last week and Z depends on it".

**Writing articles**: it knows my style (tom-writing-style guide in the KG). It references my past articles. It knows what I hate (buzzwords, staccato phrases, dividers). It applies automatically.

**It knows me**: not just a tool, an assistant that grows with me.

This week, concrete example: OpenClaw analyzed my existing articles, extracted my style, created a complete guide (SKILL.md, style-guide.md, examples.md, checklist.md). Now it applies automatically when I write.

### But That Will Change

Anthropic isn't sleeping. Latest news:

**`/loop`**: persistent conversation mode. No need to ask for context again.

**`/voice`**: native voice interaction. More fluid than external wrappers.

**Memory improvements**: long-term memory being integrated. Claude natively remembering past conversations, preferences, decisions.

**My vision: OpenClaw will disappear.**

Why? Because Claude Code will integrate memory natively. No need for an external system. One Claude Code instance is enough.

### What Will Remain

- One Claude Code instance on my Mac Mini
- A connection to a chat app (Discord, Telegram, whatever)

Why an external chat app? Because chat apps are better than apps built by LLMs. We already use them daily. Integration into existing workflows is more natural.

OpenClaw becomes just a bridge between Claude and my daily tools. The real value will be in Claude Code + native memory. External systems like OpenClaw become obsolete.

**It's normal. It's evolution.**

I'm not nostalgic. It's exactly what should happen. Claude integrates what was missing. Wrapper layers disappear. We get closer to the essential.

## My Claude Code Experience — and What's Still Missing

Claude Code has become my main tool. But not just for autocompletion. For piloting entire projects.

### My Current Workflow

**Terminal-first**: everything in the terminal. Remote-control for remote servers. SSH for prod environments. MCP to connect tools (GitHub, Linear, databases).

**Spec-driven, test-driven**: I write the spec before the code. Tests first. Claude implements following the specs. Fast iteration based on tests passing or failing.

**Concrete results**:

- MVP BVN: 3 weeks
- scanr/autoscan: a few days
- Personal website: rebuilt from scratch
- Features in hours vs days before

### My Vision on the Dev World

I talked about it in [Dev Shift Vision](https://tomandrieu.com/blog/dev-shift-vision). The dev role is evolving. Not just execute — **pilot**. Not just code — **architect + deliver**.

Claude Code accelerates this evolution. But it doesn't change the fundamentals: **a good dev stays a good dev**. AI amplifies, it doesn't replace.

Specs matter more than ever. Architecture matters more than ever. Understanding the "why" behind the "how" matters more than ever.

Claude can code for me. But not architect for me. Not make critical technical decisions for me.

### What's Still Missing

**Instance monitoring**: I launch multiple Claude instances in parallel. But no overview.

What I want:
- **Dashboard**: "Feature X: 70% done"
- **Spec-driven tracking**: progress relative to specs I gave
- **Test-driven visibility**: "12/20 tests pass, here are the failing ones"
- **Drift value**: "you asked for A, but Claude did A' because B"

**Context management**: manage context between multiple features. "Feature X depends on Y, careful if you change Y." Auto-detect dependencies.

**Native IDE integration**: today it's terminal + remote-control. Tomorrow: deep integration into VSCode/Cursor. But without losing terminal power.

**What's coming**: MnM (project in progress). Monitoring dashboard for Claude instances. Spec-driven, test-driven, drift analysis. Not ready yet. But it's exactly what's missing.

## Keep Learning, Let's See Where We Go

One year after Hello World, here's where I am: on a train at full speed.

Olympus/Pantheon abandoned. Claude Code alone for dev. OpenClaw fading away in the coming months. New tools in progress (MnM).

**Things evolve fast. Very fast.**

I don't know where this is going. But I love this speed. I love this uncertainty. I love learning this fast.

**Keep learning. Let's see where we go. The train is running.**
