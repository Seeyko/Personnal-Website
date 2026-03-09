---
title: "One year after Hello World: full speed"
excerpt: "Two months after Hello World, everything changed. Olympus abandoned, Claude Code alone, OpenClaw on borrowed time. Here's where I am."
publishedAt: "2026-03-08"
draft: false
lang: en
private: true
passwordHash: "$2a$10$rpI8Eg912NE7ujSMZ/xPouaPAC/M7vFWTZVfLfBjILCiYT8bXYfi."
---

I wrote [Hello World](https://tomandrieu.com/blog/hello-world) in January 2026. I talked about my progressive discovery of AI in 2025. Cursor, Claude Code, the idea of the Product Engineer. We're now in March 2026. Two months later. But what happened since feels more like two years than two months.

## Olympus, Pantheon, and why I stopped everything

Between January and March, I built Olympus and Pantheon. The idea: orchestrating 7 specialized AI agents working autonomously on my projects. Olympus was a task management dashboard for coordinating agents. REST API, PostgreSQL, React interface. Pantheon was 7 specialized agents. Architecture (Daedalus), development (Hephaestus), QA (Hygieia), research (Atlas), writing (Homer). Each with its own expertise, workflow, memory. The idea was appealing. An autonomous agent team that collaborates, hands off work, iterates together. Reality was different.

It was too complex. Managing 7 agents communicating with each other is enormous overhead. Debugging was hard. When something breaks, which agent messed up? Which interaction failed? Productivity gains weren't clear. Worse, sometimes it was slower than a single well-piloted agent. While I was experimenting with Olympus/Pantheon, Claude Code kept evolving. Terminal-first. Remote-control. SSH. MCP (Model Context Protocol). I realized that one well-piloted agent does the job. No need for 7.

The BMAD pattern I had formalized (Brief → Main → Agent → Deliver) works. But you don't need an external orchestrator. Everything can happen in Claude Code. Gradually, I stopped using Olympus. Tasks were assigned less and less. Agents were dormant. Claude Code became my only tool. Result: Olympus/Pantheon, useful experience, I learned a lot about orchestration and complexity, but abandoned. One well-piloted agent beats 7 poorly coordinated ones.

## OpenClaw, and why it'll probably disappear

So why OpenClaw? If Claude Code is enough for dev, why another system? Today, OpenClaw does something Claude Code doesn't do natively: remember. Knowledge Graph: a tree of my life. Projects, decisions, preferences, conversations. All interconnected. I can ask "when did I say X about Y?" and OpenClaw finds it, contextualizes, reminds me why I said that. It knows my writing style (complete guide in the KG). It references my past articles. It knows what I hate. It applies automatically. It knows me.

But Anthropic isn't sleeping. Latest news: `/loop` (persistent conversation mode), `/voice` (native voice interaction), and most importantly memory improvements, long-term memory being integrated. Claude remembering past conversations, preferences, decisions natively.

My vision is that OpenClaw will probably disappear. Claude Code will integrate memory natively. No need for an external system. What'll probably remain: a Claude Code instance on my Mac Mini and a connection to a chat app (Discord, Telegram, doesn't matter). Why an external chat app? Because chat apps are better than apps built by LLMs. We already use them daily. Integration into existing workflows is more natural. OpenClaw becomes just a bridge between Claude and my daily tools. That's normal. That's evolution. Wrapper layers disappear. We get closer to the essential.

## Claude Code daily, and what's still missing

Claude Code has become my main tool, not just for autocompletion but for piloting entire projects. My workflow is terminal-first, everything through the terminal with remote-control for servers, SSH for prod environments, MCP to connect tools. I write specs before code, tests first, Claude implements following the specs.

Results are concrete. MVP BVN in 3 weeks, scanr/autoscan in a few days, personal site rebuilt from scratch, features delivered in hours instead of days. I talked about this in [Dev Shift Vision](https://tomandrieu.com/blog/dev-shift-vision), the developer role is evolving toward something broader. Claude Code accelerates this evolution, but it doesn't change the fundamentals. Specs matter more than ever, architecture matters more than ever, understanding the "why" behind the "how" matters more than ever. Claude can code for me, but it can't architect for me or make the critical technical decisions for me.

What I'm still missing: instance monitoring (I run several Claude instances in parallel, but no overview), context management (managing dependencies between features), and native IDE integration. That's exactly what MnM, an ongoing project, is trying to solve. Spec-driven dashboard, test-driven, drift analysis. Not ready yet, but it's what's needed.

One year after Hello World, here's where I am. Olympus/Pantheon abandoned. Claude Code alone for dev. OpenClaw that'll probably disappear in the coming months. New tools in progress. Things are evolving very fast, and I don't know where it goes. But I love this speed and I love learning this fast.
