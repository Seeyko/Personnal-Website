---
title: "AI Amplifies What Was Already There"
excerpt: "Two weeks building with AI agents. And the confirmation that my vision — specs, documentation, rigor — is refining in the right direction."
publishedAt: "2026-02-15"
draft: false
lang: en
private: false
---

I spent the last two weeks building with AI agents. Not at work, on my personal time. Evenings after coming home, about 6 hours a day, from 7 PM to 2-3 AM. Not just using Claude to debug code, but really building a system where agents architect, develop, and coordinate with each other through [a task dashboard](https://tomandrieu.com/blog/olympus-ai-agents-dashboard) I coded. And honestly, what I discovered is that AI didn't teach me anything radically new. It confirmed that the vision I've been defending for a few years is refining in the right direction.

Because AI doesn't solve everything miraculously. It amplifies. My good practices as much as my bad habits. If my process is solid, it multiplies it. If my process is vague, it multiplies the chaos. These two weeks validated several intuitions I'd had for a while, and it makes me think about where all this is leading us.

## What I really discovered

Digging into the inner workings of Claude Code and multi-agent systems, I discovered the BMAD method (Breakthrough Method for Agile AI Driven Development). A workflow where each step produces formalized specs before moving to the next. Brief → PRD (Product Requirements Document) → Architecture → Development. Each phase produces a documented deliverable that the next consumes. No guessing. No implicit assumptions. Everything is written. In my system, Atlas does the brief and research. Daedalus designs the architecture. Hephaestos develops. Hygieia tests.

I also explored skills, these encapsulated modules the agent can invoke, the agent team where multiple specialized agents collaborate, and Agentic Development Environments, structured environments where agents evolve with formalized context. And what struck me is that these aren't just "best practices". They're architectural constraints that force rigor. If I don't formalize my specs, the BMAD method can't function. If I don't structure my environment, the ADE has no context and the agent guesses. If I don't document my conventions, skills don't apply consistently.

And that's where everything connects with what I've been defending for a few years. These systems only work if the process is solid. AI doesn't compensate for a vague process. It exposes it. Brutally.

## Why I always ask questions when specs aren't clear

For a few years now, I've been asking questions when a PO shows up with vague user stories. "As a user, I want to manage my documents." OK, but what does "manage" mean? Upload? Download? Versioning? Permissions? Sharing? And "documents", what's that? PDF only? All formats? Max size? I don't do this to annoy people. I do it because I've learned the hard way that vague specs always bite you at implementation time.

There are two viable options: either we have precise specs and I execute them, or we don't have specs and I'm given the freedom to decide. The worst scenario is a mix of both. No clear specs AND no freedom. I think product, I want to build something proper, and I'm told "no, don't do what you wanted, we'll do an evolution later". We finish the sprint with a feature that doesn't match what the PM wanted, because the PO didn't ask the right questions and I didn't have the freedom to decide.

With AI, this problem gets amplified. That's my feeling based on these two weeks. We talk a lot about "10x engineers" thanks to AI, even transforming 10x into 1000x. But if we don't adapt structures and keep the same org and communication problems, AI will multiply these problems the same way it multiplies productivity. If I give it "build me a document management system", it will guess. Its guesses will be as random as mine. Maybe worse, because it doesn't have the business context I've accumulated working on the project for six months. But if I give it clear specs, user scenarios, technical constraints, edge cases, a product objective, it will code exactly what's needed. Fast. Clean. With documentation. With tests.

In one-shot, AI produces code at junior+ level (2-3 years of experience according to several studies). But with multiple passes, guiding it with my experience, using code review skills, security analysis, the final result is often better than what I would have done "quickly" for a really reduced time. Because it doesn't take shortcuts out of laziness like I sometimes would.

Vague specs aren't a time saver. They're debt that explodes at implementation. With AI, this explosion just happens faster.

## The tension between shipping fast and shipping smart

I read a lot about these two approaches. PostHog wrote about [The Hidden Danger of Shipping Fast](https://posthog.com/newsletter/hidden-danger-of-shipping-fast). Shipping for shipping's sake, without measuring, without knowing if it's actually useful, creates product debt. Features nobody uses but you still have to maintain. Peter Steinberger, on the other hand, talks about [Shipping at Inference Speed](https://steipete.me/posts/2025/shipping-at-inference-speed). With AI, velocity changes everything. You can test hypotheses in days instead of weeks. Iterate faster. Learn faster.

I appreciate both visions. Both are true. AI amplifies velocity, but it doesn't amplify discernment. If I don't know what matters, I'll just produce faster things that don't matter. But if I have a clear hypothesis, defined metrics, I can ship fast, measure, learn, kill or iterate. I think you need to slow down upstream to accelerate downstream. Ask the right questions. Define what you measure. Understand the real user need, not the fantasized one. And then, let AI execute at inference speed.

## Tribal knowledge, this plague I try to eliminate

Over time, I try more and more to document. Everything. Not because it's pretty. Because tribal knowledge, all the business logic living in three people's heads, it breaks when someone leaves, when someone joins, when the project grows. I've seen too many projects where half the architecture decisions aren't written anywhere. "Ask Julien, he'll know." Except Julien is on vacation. Or Julien quit. Or Julien doesn't remember why he made that choice two years ago.

So I push for documentation. ADRs (Architecture Decision Records). Code conventions. Onboarding guides. Everything that allows someone to understand the project without having to interrogate the elders. With AI, it's even more obvious. AI doesn't have access to my head. It can't guess why I chose this stack, why this logic exists, why this convention applies. If it's not written, it guesses. And its guesses are random.

If my system requires tribal knowledge to be understood, it can't be amplified by AI. It can just be broken faster.

## The asymmetry between dev and PM

What fascinates me is that AI compresses the production chain. Before, you needed a PM to define the need, a PO to write user stories, a lead to validate architecture, a dev to code, a QA to test. Each step was a handoff. Each handoff, information loss. Now, I can cover this chain almost alone. Because AI accelerates execution. But it only works if I know how to do everyone's job. Understand the user need like a PM. Formalize specs like a PO. Architect like a lead. And let AI code.

There's an asymmetry here. A dev learning to think product is accessible. I already have analytical rigor. I understand technical constraints. I know what's feasible. A PM without technical background learning to code with AI is more complex. Because prototyping an app in 15 minutes, everyone can do it. But putting it in production with security, scaling, observability, that's another level. PMs can train, of course, and many do. But I think leads and architects who evolve toward product have a structural advantage: they already combine technical depth with product intelligence.

The stats/metrics PMs rely on to move forward are things easily automated and measurable via AI. Making good decisions that at minimum don't hurt projects, and at best please users, is more accessible than not introducing regressions, security flaws, or knowing how to scale a project for millions of users. A lead/architect knows how to guide AI on these critical technical aspects.

## My conclusion (for now)

Two weeks is short. I don't claim to have understood everything. But here's what I take away. AI didn't teach me anything radically new about how to work. It confirmed that the vision I've been defending for a few years is refining in the right direction. Clear specs. Complete documentation. Data before features. Explicit context. All of this was already important before. It just became critical now.

Because AI amplifies everything. If my practices are solid, it multiplies them. If they're vague, it multiplies the chaos. And maybe that's why I'm increasingly trying to refine my vision and share it with people around me. Not because it's THE right vision, but because by discussing both weaknesses and strengths, if people adhere, it guides them naturally. Rather than leading nobody anywhere for fear of not going in the right direction.
