---
title: "A year after Hello World: full speed train"
excerpt: "Two months after Hello World, everything has changed. Olympus abandoned, Claude Code alone, OpenClaw about to disappear. Things are moving fast. Very fast."
publishedAt: "2026-03-08"
draft: false
lang: en
private: true
passwordHash: "$2a$10$rpI8Eg912NE7ujSMZ/xPouaPAC/M7vFWTZVfLfBjILCiYT8bXYfi."
---

I wrote [Hello World](https://tomandrieu.com/blog/hello-world) in January 2026. I talked about my gradual discovery of AI in 2025. Cursor, Claude Code, the Product Engineer idea. We're in March 2026. Two months later. But what's happened since feels more like two years than two months.

## The Olympus/Pantheon experience — and the drift toward Claude Code

Between January and March, I built Olympus and Pantheon. The idea: orchestrate 7 specialized AI agents working autonomously on my projects. Olympus was a task management dashboard to coordinate agents. REST API, PostgreSQL, React interface. A complete task management system, prioritization, statuses, comments. Pantheon was 7 specialized agents. Architecture (Daedalus), development (Hephaestos), QA (Hygieia), research (Atlas), writing (Homer). Each with its own expertise, workflow, memory. The idea was appealing. A team of autonomous agents collaborating, handing off work, iterating together. Reality was different.

It was too complex. Managing 7 agents communicating with each other is enormous overhead. Difficult debugging. When something doesn't work, which agent messed up? Which interaction failed? Which context was poorly transmitted? Productivity gains weren't clear. Worse, sometimes it was slower than a single well-piloted agent. While I was experimenting with Olympus/Pantheon, Claude Code kept evolving. Terminal-first. Remote-control. SSH. MCP (Model Context Protocol). Deep integration with daily tools. I realized something. A well-piloted agent does the job. Don't need 7.

The BMAD pattern I had formalized (Brief → Main → Agent → Deliver) works. But don't need an external orchestrator. Everything can be done in Claude Code. Little by little, I stopped using Olympus. Tasks were less and less assigned. Agents slept. Claude Code became my unique tool. Why manage 7 agents when 1 is enough? Result: Olympus/Pantheon, useful experience, but abandoned. Claude Code: my only dev tool now. I learned a lot. About orchestration. About complexity. About what works and what doesn't. But the conclusion is clear. Simplicity > complex orchestration.

## Why I still use OpenClaw (and why it will change)

But then, why OpenClaw? If Claude Code is enough for dev, why another system? Today, OpenClaw does something Claude Code doesn't do natively: remember. Knowledge Graph: a tree of my life. Projects, decisions, preferences, conversations. All interconnected. I can ask "when was it again that I said X about Y?" and OpenClaw finds it, contextualizes, reminds me why I said that. Life management: precise contextual reminders. Not just "do X", but "do X because you said Y last week and Z depends on that". Article writing: it knows my style (tom-writing-style guide in the KG). It references my past articles. It knows what I hate (buzzwords, staccato phrases, dividers). It applies automatically. It knows me. Not just a tool, an assistant that grows with me.

This week, concrete example. OpenClaw analyzed my existing articles, extracted my style, created a complete guide (SKILL.md, style-guide.md, examples.md, checklist.md). Now, it applies it automatically when I write. But it will probably change. Anthropic isn't sleeping. Latest news: `/loop` (persistent conversation mode, no need to ask for context again), `/voice` (native voice interaction, more fluid than external wrappers), memory improvements (long-term memory being integrated, Claude natively remembering past conversations, preferences, decisions).

My vision: OpenClaw will probably disappear. Why? Because in my opinion, Claude Code will integrate memory natively. No need for an external system. One Claude Code instance will be enough. What will probably remain: one Claude Code instance on my Mac Mini, a connection to a chat app (Discord, Telegram, whatever). Why an external chat app? Because chat apps are better than apps built by LLMs. We already use them daily. Integration into existing workflows is more natural. OpenClaw becomes just a bridge between Claude and my daily tools. The real value will be in Claude Code + native memory. External systems like OpenClaw will probably become obsolete. It's normal. It's evolution. I'm not nostalgic. It's exactly what should happen. Claude integrates what was missing. Wrapper layers disappear. We get closer to the essential.

## My Claude Code experience — and what's still missing

Claude Code has become my main tool, but not just for autocomplete. I use it to pilot entire projects. My current workflow is terminal-first, everything goes through the terminal with remote-control for remote servers, SSH for prod environments, and MCP to connect tools like GitHub, Linear, and databases. I write the spec before code, tests first, and Claude implements following specs with rapid iterations based on passing or failing tests.

The results are concrete. MVP BVN in 3 weeks, scanr/autoscan in a few days, personal site rebuilt from scratch, features delivered in hours instead of days. I talked about it in [Dev Shift Vision](https://tomandrieu.com/blog/dev-shift-vision), the dev role is evolving toward something broader. We're not just executing anymore, we're piloting. We're not just coding, we're architecting and delivering. Claude Code accelerates this evolution, but it doesn't change the core. A good dev stays a good dev, AI amplifies but doesn't replace.

Specs matter more than ever, architecture matters more than ever, understanding the "why" behind the "how" matters more than ever. Claude can code for me, but he can't architect for me or make critical technical decisions for me.

What I'm still missing: instance monitoring. I launch multiple Claude instances in parallel. But no overview. What I want: dashboard ("Feature X: 70% complete"), spec-driven tracking (progress against specs I gave), test-driven visibility ("12/20 tests pass, here are the failures"), drift value ("you asked for A, but Claude did A' because B"). Context management: manage context between multiple features. "Feature X depends on Y, careful if you change Y." Auto-detect dependencies. Native IDE integration: today it's terminal + remote-control. Tomorrow: deep integration in VSCode/Cursor. But without losing terminal power.

What's coming: MnM (project in progress). Monitoring dashboard for Claude instances. Spec-driven, test-driven, drift analysis. Not ready yet. But it's exactly what's missing.

## Keep learning, we'll see where it goes

A year after Hello World, here's where I am. On a full-speed train, with Olympus/Pantheon abandoned, Claude Code alone for dev, OpenClaw probably about to disappear in the coming months, and new tools in progress like MnM. Things are evolving very fast, and I don't know where it's going. But I love this speed, I love this uncertainty, I love learning this fast. Keep learning, we'll see where it goes.
