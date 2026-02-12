---
title: "The Developer Role Shift"
excerpt: "Between execution and product vision, the senior developer role is evolving. Reflections on what's changing, what's missing, and what could be better."
publishedAt: "2026-02-12"
draft: false
lang: en
---

The developer role is changing. AI is accelerating everything, of course, but the shift runs deeper — it's about **role**, **responsibility**, and **meaning**.

After a few years observing (and living) the dynamics of development teams, I've started to see patterns. Things that work, things that don't. Models that liberate teams, and others that trap them in an endless cycle of sprints and frustration.

This article is **my vision** of where the role could — and should, in my view — evolve. It's not an absolute truth, and I know not every developer will want to take this path. But it's what I observe, what I experiment with, and what seems like the most interesting direction for building better products.

## The observation: we execute, but we don't really build

Developing today, in many organizations, looks like this:
1. You get a user story
2. You estimate it
3. You develop it
4. You test (if you have time)
5. You push to prod
6. Repeat

The problem is that **you don't know why you're doing what you're doing.** The decision was made elsewhere, in another room, by other people. You execute. And if the feature doesn't work, if nobody uses it, if it solves the wrong problem — that's not your problem. You delivered 100% of the sprint, mission accomplished.

Except that delivering 100% of sprints isn't the same as having **real impact** on users. When you code for months without ever seeing that impact, without ever talking to the people who use what you build, it becomes hollow. It becomes just another job.

## The silo problem

Many organizations operate with well-defined silos:
- **Product Owners / Product Managers** → Define the "what"
- **Designers** → Define the "how" (UX/UI)
- **Developers** → Build what they're given

In theory, it's clean — everyone has their domain. In practice, it's **absurd**.

Developers often have technical understanding that could drastically improve the product, but they're never asked for input before everything's already decided. PMs/POs sometimes have brilliant ideas, but disconnected from technical reality, and it ends in sterile negotiations or features that are too complex for what they deliver.

The real problem: **nobody is truly responsible for the final result.** The PM says "I defined the need." The dev says "I delivered the feature." But if it doesn't work? Who's responsible? Nobody. Or everybody. Which amounts to the same thing.

The best teams I know (or whose post-mortems I've read, or newsletters I've followed) break down this barrier. At PostHog, Linear, or other modern startups, engineers are **product engineers**: they talk to users, they do support, they recruit testers, they analyze data, they develop opinions about what should exist — and they act with urgency to make it happen.

The "problem → fix" cycle is direct, with no telephone game between four departments.

## What a senior dev actually wants

I've realized that what motivates me — and what motivates many senior developers I know — isn't just coding. It's having:

### Ownership
Being **responsible** for a piece of the product. Being responsible for the **user outcome**, not just the code. If it works, it's because of me. If it doesn't, it's on me to fix it.

### Impact
Knowing that what I build **actually changes** something for the people who use it. Real game-changers, not marketing features just to say we shipped something.

### Autonomy
Having the freedom to **decide how** to solve a problem, instead of just implementing a solution already chosen by someone else. Defining my quarterly objectives, my priorities, my methods.

### Vision
Understanding **where we're going** and why we're doing what we're doing. Seeing how it fits into a clear and coherent roadmap, without direction changes every two weeks.

Many organizations aren't structured to offer this. They're structured to **control**: sprints, story points, velocity, daily stand-ups, burn-down charts. Metrics that measure activity, never impact.

## AI's impact on the role

AI is changing everything, and it's happening now.

With Cursor, Windsurf, v0, Bolt, Claude Sonnet 4.5, and the dozens of other tools coming out every week, writing code is becoming a fraction of the work. What really matters is:
- **Architecture**: having a clear vision of how everything fits together
- **Specs**: knowing exactly what you want to build and why
- **Context**: understanding users, their needs, their problems
- **Decisions**: choosing the right abstractions, the right trade-offs

The code itself? Increasingly generated, assisted, automated. And that's a good thing, because it frees up time for what really matters: **thinking**.

**Does every developer want this shift?** No. Some want to stay executors. Others want to become ultra-specialized experts in a specific technology. And there's still room for these roles — at least today.

But as AI evolves, I think these roles will become less important. Pure stack expertise becomes commoditized when AI can generate quality code in any technology. Pure execution becomes automated when AI can take specs and produce functional code.

What remains — and what's becoming increasingly critical — is the ability to:
- Understand users and their real problems
- Make informed decisions based on data
- Architect solutions that scale (technically AND organizationally)
- Iterate quickly based on real feedback

That's why I believe in the **product engineer** model: it's the one that will best survive AI's evolution.

## The "deadline doom loop"

A pattern I see recurring in many organizations:

1. You **estimate** a feature (often poorly, because you don't have all the info)
2. You **promise** a deadline based on that estimate
3. **Reality hits**: it's more complex than expected, specs change, there's tech debt
4. You **crunch** to meet the deadline
5. The feature ships, but it's **disappointing** (bugs, rushed UX, cut features)
6. You **blame the process**: "we need more planning, tests, documentation"
7. You **add process**: more meetings, more reviews, more validation
8. You become **even slower**
9. Back to step 1

It's a vicious cycle, and the real cause isn't lack of process — it's **lack of trust**.

When you don't trust devs to deliver, you add control. When you add control, you slow down. When you slow down, you crunch to catch up. When you crunch, quality drops. When quality drops, you lose even more trust. And the loop continues.

## Trust and feedback over process

The solution I see in teams that really work well: **trust by default**.

Trust that developers will make the right choices. Trust that if you give them a clear objective and autonomy, they'll find the best solution. Trust that if they make mistakes, they'll learn and improve.

But trust without feedback is negligence. Feedback must be constant:
- Are users using the feature?
- Does it solve their problem?
- What bugs are being reported?
- What could be improved?

And most importantly, **developers must see this feedback directly** — not filtered by a PM, not summarized in a report. Directly. That's how you learn, that's how you develop product intuition.

## The shift to product engineer

All of this makes me think that the senior developer role — at least the one that interests me — isn't really "developer" anymore. It's **product engineer**.

What does that mean?
- Writing code, yes, but code is just **one part** of the work
- Talking to users, understanding their problems
- Designing solutions (not just implementing them)
- Defining KPIs, analyzing data, iterating
- Making decisions about what should exist in the product
- Being **responsible for the outcome**, not just the output

### Why not the reverse? (PM who codes with AI)

A legitimate question: if AI makes code more accessible, why not have **PMs who code** rather than **devs who do product**?

Because the **learning asymmetry** doesn't work the same way.

For a PM, learning to code with AI means learning to use tools. But without deep understanding of architecture, tech debt, and system trade-offs, it produces code that *works* but doesn't *scale*. It's like learning to fly with an autopilot that corrects all your mistakes: you can take off, but you don't really know how to fly.

For an engineer, learning to understand users means learning to **observe**, **listen**, **analyze**. It's reading data, doing support, recruiting testers, asking the right questions. These are human skills built through experience, not through a tool. And once acquired, they're **complementary** to existing technical expertise.

**An engineer who learns product becomes a better engineer.** They code with a clear vision of the *why*. They make better architecture decisions because they understand the user context. They iterate faster because they're not waiting for a PM to tell them what to do.

**A PM who learns to code with AI remains a PM who sometimes codes.** Without technical depth, they stay dependent on AI for complex decisions. And when AI fails (and it does fail), they don't know how to debug.

That's why I believe more in engineers evolving toward product than PMs evolving toward code. Technical foundation combined with product intelligence is a multiplier. Product foundation plus some AI-assisted code is a PM who can prototype fast, but can't build durable systems.

Some organizations have figured this out. Others are still in the "waterfall disguised as agile" model: decisions are made at the top, devs execute at the bottom, and everyone pretends it's collaborative because there are daily stand-ups.

## What could be better

I don't claim to have all the answers. But here's what I'd like to see evolve in the industry:

### Clear objectives, not filled sprints
Give me a quarterly objective, a problem to solve, and let me figure out how. I don't need 15 user stories sliced to the millimeter with story points and a target velocity.

### Transparency by default
Public roadmap (at least internally). Documented decisions. Accessible data. Decisions should never fall from the sky without understanding the why.

### Time to understand, not just to produce
The time we save with AI shouldn't be used to produce even more features. It should be used to **better understand users** and build the right things.

### POCs before big projects
Test an idea with minimal effort. Build an MVP. See if someone actually needs it **before** mobilizing a team for 6 months.

### Trust
Stop micro-managing sprints, story points, hours. Give ownership, responsibility, and feedback. Trust. Learn together.

## Conclusion

The developer role is evolving. We're no longer just "coders" — we're becoming **solution architects**, **product engineers**, **problem solvers** who use code as one tool among many.

But this will only work if organizations evolve too. It will take breaking down silos, building trust, giving ownership and responsibility.

Some companies have figured this out. Others will get there. Or not. But I know which model I want to pursue.

How about you?

*This article reflects my personal observations after a few years in development. It doesn't target any organization in particular — just patterns I've seen repeat. If this resonates with you, or if you think I'm completely wrong, let me know. I'm still learning.*
