---
title: "AI Amplifies What Was Already There"
excerpt: "Two weeks building with AI agents. Confirmation: specs, documentation, rigor. Not perfectionism. Anticipation."
publishedAt: "2026-02-15"
draft: false
lang: en
private: false
---

Two weeks digging into how multi-agent systems actually work. Not just using Claude to debug, but really building: architecture, development, coordination via a task dashboard I coded.

Result: AI doesn't create anything. It amplifies. Your good practices as much as your bad habits.

## BMAD, skills, ADE

BMAD (Brief, Mission, Architecture, Development). A spec-driven pattern where each step produces formalized specs before the next. Atlas does the brief. Daedalus the architecture. Hephaestos the code. Hygieia the tests. Each agent consumes a documented deliverable. No guessing.

Claude Code internals: **skills** (encapsulated modules the agent invokes), **agent team** (multiple specialized agents collaborate), **ADE** (Agentic Development Environment, formalized context for the agent).

These concepts aren't "best practices". **They're architectural constraints that force rigor.** If you don't formalize your specs, BMAD can't function. If you don't structure your environment, the ADE guesses. If you don't document your conventions, skills don't apply consistently.

AI doesn't compensate for a vague process. It exposes it.

## Vague specs, vague results

Classic example: a PO shows up with "As a user, I want to manage my documents."

OK. But what does "manage" mean? Upload? Download? Versioning? Permissions? Sharing? And "documents", what's that? PDF only? All formats? Max size?

Two viable options: **precise specs** (dev executes) or **no specs** (dev has the freedom to decide).

The worst scenario: **no clear specs AND no freedom**. The dev who thinks product and wants to build something proper gets told "no, don't do what you wanted, we'll do an evolution later". We finish the sprint with a feature that doesn't match what the PM wanted, because the PO didn't ask the right questions and the dev didn't have the freedom to decide.

With AI, this problem is multiplied by ten. You give it "build me a document management system", it guesses. Its guesses are as random as mine. Maybe worse, because it doesn't have the business context accumulated over six months.

But you give it clear specs (user scenarios, technical constraints, edge cases, product objective), it codes exactly what's needed. Fast. Clean. With doc. With tests.

**Vague specs aren't a time saver.** They're debt that explodes at implementation. With AI, this explosion just happens faster.

## Ship fast vs ship smart

PostHog wrote about [The Hidden Danger of Shipping Fast](https://posthog.com/newsletter/hidden-danger-of-shipping-fast). Shipping for shipping's sake creates product debt. But Peter Steinberger talks about [Shipping at Inference Speed](https://steipete.me/posts/2025/shipping-at-inference-speed): with AI, velocity changes everything. You can test hypotheses in days instead of weeks.

Both visions are true. AI amplifies velocity. But it doesn't amplify discernment.

If you don't know what matters, you'll just produce faster things that don't matter. But if you have a clear hypothesis and defined metrics, you can ship fast, measure, learn, kill or iterate.

You need to slow down upstream to accelerate downstream. Ask the right questions. Define what you measure. Understand the real user need. And then, let AI execute at inference speed.

## Documentation: tribal knowledge, that plague

Tribal knowledge: all the business logic living in three people's heads. It breaks when someone leaves, when someone joins, when the project grows.

I've seen too many projects where half the architecture decisions aren't written anywhere. "Ask Julien, he'll know." Except Julien is on vacation. Or Julien quit. Or Julien doesn't remember why he made that choice two years ago.

ADR (Architecture Decision Records). Code conventions. Onboarding guides. Everything that allows someone to understand the project without interrogating the elders.

AI doesn't have access to my head. It can't guess why I chose this stack, why this logic exists, why this convention applies. If it's not written, it guesses. And its guesses are random.

**If your system requires tribal knowledge to be understood, it can't be amplified by AI.** It can just be broken faster.

## The dev/PM asymmetry

AI compresses the production chain. Before: a PM to define the need, a PO to write user stories, a lead to validate architecture, a dev to code, a QA to test. Each step was a handoff. Each handoff, information loss.

Now, I can cover this chain almost alone. Because AI accelerates execution. But it only works if I know how to do everyone's job. Understand the user need like a PM. Formalize specs like a PO. Architect like a lead. And let AI code.

There's an asymmetry. A dev learning to think product is accessible. They already have analytical rigor. They understand technical constraints. They know what's feasible. A PM learning to code with AI is harder. Because prototyping an app in 15 minutes, everyone can do it. But putting it in production with security, scaling, observability, that's another level.

Technical profiles have a structural advantage. As long as they don't stay "just coders".

## Conclusion

AI didn't teach me anything new about how to work. It confirmed that clear specs, complete documentation, data before features, explicit context, was already the right direction. It just became critical now.

Because AI amplifies. If your practices are solid, it multiplies them. If they're vague, it multiplies the chaos.
