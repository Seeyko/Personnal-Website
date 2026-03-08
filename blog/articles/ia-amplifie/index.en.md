---
title: "AI Amplifies What Already Existed"
excerpt: "Two weeks building with AI agents. And the confirmation that everything I've been pushing in my teams for years — specs, docs, rigor — wasn't perfectionism. It was anticipation."
publishedAt: "2026-02-15"
draft: false
lang: en
private: false
---

I spent the last two weeks building with AI agents. Not just using Claude to debug code, but actually building a system where agents architect, develop, coordinate with each other through a task dashboard I coded.

And here's what it confirmed for me: everything I've been pushing in my teams for years — docs, clear specs, rigor on context — wasn't useless perfectionism. It was anticipation.

Because AI doesn't create anything. It amplifies what already exists. Your good practices as well as your bad habits. And these two weeks proved me right on pretty much everything I've been defending for a long time, sometimes against popular opinion.

## What I really discovered these two weeks

I spent these two weeks digging into how multi-agent systems really work. Not just using agents, but understanding their internal mechanisms.

BMAD (Brief, Mission, Architecture, Development) — a spec-driven work pattern where each step produces formalized specs before moving to the next. Atlas does the brief and research. Daedalus designs the architecture. Hephaestus develops. Hygieia tests. Each agent produces a documented deliverable that the next one consumes. No guessing. No implicit assumptions.

I also dug into how Claude Code works internally. Skills — encapsulated modules that the agent can invoke. The agent team — multiple specialized agents collaborating. Agentic Development Environment (ADE) — structured environments where agents evolve with formalized context.

These concepts click. They're not just "best practices". They're architectural constraints that force rigor. If you don't formalize your specs, BMAD can't function. If you don't structure your environment, the ADE has no context and the agent guesses. If you don't document your conventions, skills don't apply consistently.

And that's where everything connects with what I've been defending for years. These systems only work if the process is solid. AI doesn't compensate for a fuzzy process. It exposes it.

## Why I ask questions when specs aren't clear

For years, I've asked questions when a PO shows up with vague user stories. "As a user, I want to manage my documents." OK, but what does "manage" mean? Upload? Download? Versioning? Permissions? Sharing? And "documents", what's that? PDF only? All formats? What max size?

I try to understand why the specs are vague. And I try to explain why it's better with clear specs. Because there are two viable options: either we have precise specs and the dev executes, or we don't have specs and we give the dev freedom to decide.

The worst scenario is mixing both. No clear specs AND no freedom. The dev who thinks product and wants to do something proper gets told "no, don't do what you wanted to do, we'll do an evolution later". That's heading straight into the wall. We finish the sprint with a feature that doesn't match what the PM wanted, because the PO didn't ask the right questions and the dev didn't have the freedom to decide.

With AI, this problem is multiplied by ten. If I give it "make me a document management system", it will guess. And its guesses will be as random as mine. Maybe worse, because it doesn't have the business context I've accumulated working on the project for six months.

But if I give it clear specs — user scenarios, technical constraints, edge cases, product objective — it will code exactly what's needed. Fast. Clean. With docs. With tests. Often better than what I would have done myself, because it doesn't take shortcuts out of laziness.

These two weeks proved what I've been saying for a long time: vague specs aren't a time saver. They're debt that explodes at implementation time. With AI, that explosion just happens faster.

## The tension between ship fast and ship smart

Another thing I've been pushing for years: I ask PMs for data before coding a feature. How many users will use it? How often? What are the success metrics? What do we measure to know if it works?

Often, the answer is "we'll see after launch". Except after launch, nobody measures anything. The feature exists, we move to the next one, and six months later we realize nobody uses it. PostHog wrote about this: [The Hidden Danger of Shipping Fast](https://posthog.com/newsletter/hidden-danger-of-shipping-fast). Shipping for the sake of shipping creates product debt.

But there's the other side. Peter Steinberger writes about [Shipping at Inference Speed](https://steipete.me/posts/2025/shipping-at-inference-speed) — with AI, velocity changes everything. You can test hypotheses in days instead of weeks. Iterate faster. Learn faster.

I appreciate both visions. And I try to get something from each.

AI amplifies velocity. That's clear. But it doesn't amplify discernment. If you don't know what matters, you'll just produce faster things that don't matter. However, if you have a clear hypothesis and defined metrics, you can ship fast, measure, learn, kill or iterate.

These two weeks confirmed that you need to slow down upstream to accelerate downstream. Ask the right questions. Define what you measure. Understand the real user need, not the fantasized one. And then, let AI execute at inference speed.

## Tribal knowledge, this plague I've been trying to eliminate forever

A long-standing battle in my teams: document. Everything. Not because it's pretty. Because tribal knowledge — all the business logic living in three people's heads — breaks when someone leaves, when someone joins, when the project grows.

I've seen too many projects where half the architecture decisions aren't written anywhere. "Ask Julien, he'll know." Except Julien is on vacation. Or Julien quit. Or Julien doesn't remember why he made that choice two years ago.

So I push docs. ADRs (Architecture Decision Records). Code conventions. Onboarding guides. Everything that allows someone to understand the project without having to interrogate the old-timers.

With AI, it's even more obvious. AI doesn't have access to my head. It can't guess why I chose this stack, why this logic exists, why this convention applies. If it's not written, it guesses. And its guesses are random.

These two weeks proved me right on a simple point: if your system requires tribal knowledge to be understood, it can't be amplified by AI. It can just be broken faster.

## What it changes for me (and why it fascinates me)

Honestly, I'm not discovering anything. I'm confirming. Everything I've been defending for years — clear specs, complete docs, data before features, explicit context — was already the right approach. AI just makes the consequences of not doing it much more visible, much faster.

What fascinates me is something else. It's that AI compresses the production chain. Before, you needed a PM to define the need, a PO to write user stories, a lead to validate architecture, a dev to code, QA to test. Each step was a handoff. Each handoff, information loss.

Now, I can cover this chain almost alone. Because AI accelerates execution. But it only works if I know how to do everyone's job. Understand user needs like a PM. Formalize specs like a PO. Architect like a lead. And let AI code.

There's an asymmetry here. A dev learning to think product is accessible. They already have analytical rigor. They understand technical constraints. They know what's feasible. A PM learning to code with AI is harder. Because prototyping an app in 15 minutes, anyone can do. But putting it in production with security, scaling, observability, that's another level.

I think technical profiles have a structural advantage. As long as they don't remain "just coders".

## My conclusion (for now)

Two weeks is short. I don't claim to have understood everything. But here's what I take away.

AI didn't teach me anything new about how to work. It just confirmed that what I was already doing was the right direction. Clear specs. Complete docs. Data before features. Explicit context. All that was already important before. It's just become critical now.

Because AI amplifies. If your practices are solid, it multiplies them. If they're vague, it multiplies chaos.

And maybe that's why I'll always ask questions when specs aren't clear. Not out of perfectionism. Out of pragmatism. Because I know that sooner or later, vagueness has a cost. With or without AI.
