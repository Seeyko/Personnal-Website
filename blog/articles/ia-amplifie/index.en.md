---
title: "AI Amplifies What Already Existed"
excerpt: "Two weeks building with AI agents. And the confirmation that everything I've been pushing in my teams for years — specs, docs, rigor — wasn't perfectionism. It was anticipation."
publishedAt: "2026-02-15"
draft: false
lang: en
private: true
passwordHash: "$2b$10$Gcd/rVDo9AKWCKFFWrMniuBI69zciDjaQHGjXKPaMxByO49jf6dZ."
---

I spent the last two weeks building with AI agents. Not just using Claude to debug code, but actually building a system where agents architect, develop, coordinate with each other through a task dashboard I coded.

And here's what it confirmed for me: everything I've been pushing in my teams for years — docs, clear specs, rigor on context — wasn't useless perfectionism. It was anticipation.

Because AI doesn't create anything. It amplifies what already exists. Your good practices as well as your bad habits. And these two weeks proved me right on pretty much everything I've been defending for a long time, sometimes against popular opinion.

## What I built

I set up what I call the Pantheon. Seven specialized agents collaborating through Olympus, a Jira-like task system I developed to orchestrate them. An orchestrator agent (Main), an architect (Daedalus), a dev (Hephaestus), QA (Hygieia), a researcher (Atlas), a scrum master (Hermes), a writer (Homer).

On some tasks, it's magic. A complete project scaffold in 15 minutes. Documented architecture in 10 minutes. Technical specs generated from a conversation. The kind of velocity you never achieve with a human team.

On others, it's total chaos. The agent that generates 200 Discord messages in 13 minutes because it's stuck in a generative loop. The architect who proposes a stack I have to correct three times. The dev who codes for 20 minutes in the wrong direction because the specs weren't precise enough.

The difference between the two? It's not the AI. It's my process. When I took time to formalize context, document conventions, write clear specs, AI shined. When I was vague, it amplified the vagueness.

## Why I annoy POs who show up without specs

For years, I've annoyed POs who show up with vague user stories. "As a user, I want to manage my documents." OK, but what does "manage" mean? Upload? Download? Versioning? Permissions? Sharing? And "documents", what's that? PDF only? All formats? What max size?

People tell me I'm a pain. That I slow down the sprint. That "we'll figure it out while developing". Except we never figure it out. We finish the sprint with a feature that doesn't match what the PM wanted, because the PO didn't ask the right questions, and the dev (me) had to guess.

With AI, this problem is multiplied by ten. If I give it "make me a document management system", it will guess. And its guesses will be as random as mine. Maybe worse, because it doesn't have the business context I've accumulated working on the project for six months.

But if I give it clear specs — user scenarios, technical constraints, edge cases, product objective — it will code exactly what's needed. Fast. Clean. With docs. With tests. Often better than what I would have done myself, because it doesn't take shortcuts out of laziness.

These two weeks proved what I've been saying for a long time: vague specs aren't a time saver. They're debt that explodes at implementation time. With AI, that explosion just happens faster.

## Why I ask PMs for data

Another thing I've been pushing for years that's earned me side-eyes: I ask PMs for data before coding a feature. How many users will use it? How often? What are the success metrics? What do we measure to know if it works?

Often, the answer is "we'll see after launch". Except after launch, nobody measures anything. The feature exists, we move to the next one, and six months later we realize nobody uses it.

With AI, this question becomes even more critical. Because AI can generate features very fast. Too fast. If we don't know what we're measuring, we'll end up with a product full of features nobody uses, coded in three days instead of three weeks.

AI amplifies velocity. But it doesn't amplify discernment. If you don't know what matters, you'll just produce faster things that don't matter.

These two weeks confirmed that you need to slow down upstream to accelerate downstream. Ask the right questions. Define the metrics. Understand the real user need, not the fantasized one. And then, let AI execute.

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

And maybe that's why I'll always annoy POs who show up without specs. Not out of perfectionism. Out of pragmatism. Because I know that sooner or later, vagueness has a cost. With or without AI.

---

*Tom Andrieu — Vaucluse, February 2026*
