---
title: "The Developer Role is Shifting"
excerpt: "Between execution and product vision, the senior developer role is evolving. Reflections on what's changing, what's missing, and what could be better."
publishedAt: "2026-02-12"
draft: false
lang: en
---

The developer role is changing. Not just because of AI — though that's accelerating everything. It's deeper than that. It's about **role**, **responsibility**, and **meaning**.

After a few years observing (and living through) software team dynamics, I've started seeing patterns. Things that work. Things that don't. Models that empower teams, and others that trap them in an endless cycle of sprints and frustration.

This article is **my vision** of where the role could — and should, in my opinion — evolve. Not an absolute truth. Not what all developers want or should want. Just what I observe, what I experiment with, and what seems to me the most interesting path for building better products.

## The reality: we execute, but we don't really build

In many organizations today, development looks like this:
1. You get a user story
2. You estimate it
3. You develop it
4. You test it (if you have time)
5. You push to prod
6. Repeat

The problem? **You don't know why you're doing what you're doing.** The decision was made elsewhere, in another room, by other people. You just execute. And if the feature doesn't work, if nobody uses it, if it solves the wrong problem — that's not your problem. You delivered 100% of the sprint, mission accomplished.

Except no. Because delivering 100% of sprints isn't the same as having **real impact** on users. And when you code for months without ever seeing that impact, without ever talking to the people who use what you build, it becomes hollow. It becomes just another job.

## The silo problem

Many organizations operate with well-defined silos:
- **Product Owners / Product Managers** → Define the "what"
- **Designers** → Define the "how" (UX/UI)
- **Developers** → Build what they're given

In theory, it's clean. Everyone has their domain. In practice, it's **absurd**.

Because developers often have technical insights that could drastically improve the product — but they're never asked before everything is already decided. PMs/POs sometimes have brilliant ideas — but disconnected from technical reality, and it ends in sterile negotiations or features too complex for what they deliver.

And most importantly: **nobody is truly responsible for the final result.** The PM says "I defined the requirement". The dev says "I delivered the feature". But if it doesn't work? Who's responsible? Nobody. Or everyone. Which amounts to the same thing.

The best teams I know (or whose post-mortems I've read, or newsletters I follow) break down this barrier. At PostHog, Linear, or other modern startups, engineers are **product engineers**: they talk to users, they do support, they recruit testers, they analyze data, they develop opinions on what should exist — and they act with urgency to make it happen.

The "problem → fix" cycle is direct. No telephone game between 4 departments.

## What senior developers really want

I've realized that what motivates me — and what motivates many senior developers I know — isn't just coding. It's:

### Ownership
Being **responsible** for a piece of product. Not just responsible for the code, but for the **user outcome**. If it works, it's because of me. If it doesn't work, it's on me to fix it. No "not my problem".

### Impact
Knowing that what I build **actually changes** something for the people who use it. Not marketing features just to say we did something. Real game-changers.

### Autonomy
Having the freedom to **decide how** to solve a problem. Not just implementing a solution already chosen by someone else. Defining my quarterly objectives, my priorities, my methods.

### Vision
Understanding **where we're going**. Why we're doing what we're doing. How it fits into a clear and coherent roadmap. Not direction changes every two weeks.

The problem? Many organizations aren't structured to offer this. They're structured to **control**: sprints, story points, velocity, daily stand-ups, burn-down charts. Metrics that measure activity, not impact.

## AI's impact on the job

AI is changing everything. Not tomorrow — **now**.

With Cursor, Windsurf, v0, Bolt, Claude Sonnet 4.5, and the dozens of other tools coming out every week, writing code is becoming a fraction of the work. What really matters is:
- **Architecture**: having a clear vision of how everything fits together
- **Specs**: knowing exactly what we want to build and why
- **Context**: understanding users, their needs, their problems
- **Decisions**: choosing the right abstractions, the right trade-offs

The code itself? Increasingly generated, assisted, automated. And that's a good thing. Because it frees up time for what really matters: **thinking**.

**Do all developers want this shift?** No. Some want to remain executors. Others want to become ultra-specialized experts in a specific technology. And there's still room for these roles — at least today.

But as AI evolves, I believe these roles will become less and less important. Not because they're not useful, but because the value is shifting. Pure expertise in a stack becomes commodified when AI can generate quality code in any technology. Pure execution becomes automated when AI can take specs and produce functional code.

What remains — and becomes increasingly critical — is the ability to:
- Understand users and their real problems
- Make informed decisions based on data
- Architect solutions that scale (technically AND humanly)
- Iterate rapidly based on real feedback

That's why I believe in the **product engineer** model. Not because it's the only valid model, but because it's the one that will best survive AI's evolution.

## The deadline doom loop

A pattern I see recurring in many organizations:

1. We **estimate** a feature (often poorly, because we don't have all the info)
2. We **promise** a deadline based on that estimate
3. **Reality hits**: it's more complex than expected, specs change, there's technical debt
4. We **crunch** to meet the deadline
5. The feature ships, but it's **disappointing** (bugs, rushed UX, cut features)
6. We **blame the process**: "we lack planning, tests, documentation"
7. We **add more process**: more meetings, more reviews, more validation
8. We become **even slower**
9. Back to step 1

It's a vicious cycle. And the real cause isn't lack of process — it's **lack of trust**.

When we don't trust developers to deliver, we add control. When we add control, we slow down. When we slow down, we crunch to catch up. When we crunch, quality drops. When quality drops, we lose even more trust. Loop.

## Trust and feedback over process

The solution I see in teams that work really well: **trust by default**.

Trust that developers will make the right choice. Trust that if you give them a clear objective and autonomy, they'll find the best solution. Trust that if they screw up, they'll learn and improve.

But trust without feedback is neglect. So you need **constant feedback**:
- Are users actually using the feature?
- Does it solve their problem?
- What bugs are being reported?
- What could be improved?

And most importantly: **developers must see this feedback directly**. Not filtered through a PM. Not summarized in a report. Directly. Because that's how you learn. That's how you develop product intuition.

## The shift toward product engineer

All of this makes me think that the senior developer role — at least, the one I'm interested in — isn't really "developer" anymore. It's **product engineer**.

What does that mean?
- Writing code, yes, but it's only **part** of the work
- Talking to users, understanding their problems
- Designing solutions (not just implementing them)
- Defining KPIs, analyzing data, iterating
- Making decisions about what should exist in the product
- Being **responsible for the outcome**, not just the output

### Why not the reverse? (PMs coding with AI)

A legitimate question: if AI makes code more accessible, why not have **PMs who code** rather than **developers who do product**?

Because **the learning asymmetry** doesn't work the same way.

For a PM: learning to code with AI is learning to use tools. But without deep understanding of architecture, technical debt, system trade-offs — it produces code that *works* but doesn't *scale*. It's like learning to fly with an assistant that corrects all your mistakes: you can take off, but you don't really know how to fly.

For an engineer: learning to understand users is learning to **observe**, **listen**, **analyze**. It's reading data, doing support, recruiting testers, asking the right questions. These are human skills built through experience, not through a tool. And once acquired, they're **complementary** to existing technical expertise.

**An engineer who learns product becomes a better engineer.** They code with a clear vision of the *why*. They make better architecture decisions because they understand user context. They iterate faster because they don't wait for a PM to tell them what to do.

**A PM who learns to code with AI becomes... a PM who codes sometimes.** But without technical depth, they remain dependent on AI for complex decisions. And when AI fails (and it does), they don't know how to debug.

That's why I believe more in engineers evolving toward product than PMs evolving toward code. Technical foundation + product intelligence = a multiplier. Product foundation + some AI-assisted code = a PM who can prototype quickly, but not build sustainable systems.

Some organizations get it. Others are still in the "waterfall disguised as agile" model: decisions happen at the top, developers execute at the bottom, and everyone pretends it's collaborative because there are daily stand-ups.

## What could be better

I don't claim to have all the answers. But here's what I'd like to see evolve in the industry:

### Clear objectives, not filled sprints
Give me a quarterly objective, a problem to solve, and let me figure out how. Not 15 user stories sliced to the millimeter with story points and a target velocity.

### Transparency by default
Public roadmap (at least internally). Documented decisions. Accessible data. No "decisions falling from the sky" without understanding the why.

### Time to understand, not just to produce
The time we save with AI shouldn't be used to produce even more features. It should be used to **better understand users** and build the right things.

### POCs before big projects
Test an idea with minimal effort. Build an MVP. See if someone actually needs it **before** mobilizing a team for 6 months.

### Trust
Stop micro-managing sprints, story points, hours. Give ownership, responsibility, and feedback. Trust. Learn together.

## Conclusion

The developer role is evolving. We're no longer just "coders". We're becoming **solution architects**, **product engineers**, **problem solvers** who use code as one tool among many.

But it will only work if organizations evolve too. If we break down silos. If we trust. If we give ownership and responsibility.

Some companies get it. Others will come around. Or not. But I know which model I want to move toward.

What about you?

---

*This article reflects my personal observations after a few years in development. It doesn't target any organization in particular — just patterns I've seen repeat. If this resonates with you, or if you think I'm completely wrong, feel free to tell me. I'm still learning.*
