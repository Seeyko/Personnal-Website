---
title: "An AI hackathon with 15 people"
excerpt: "We did an AI hackathon at work. 15 people, one week, production code. What it confirmed about coordination, processes, and what changes when AI accelerates everything."
publishedAt: "2026-03-16"
draft: false
lang: en
private: true
passwordHash: "$2a$10$rpI8Eg912NE7ujSMZ/xPouaPAC/M7vFWTZVfLfBjILCiYT8bXYfi."
---

We did an AI hackathon at work last week. 15 people in a room, one week, goal: test what AI concretely changes in how we work. Not a hackathon for fun. A real full-scale test on production code.

The raw results are impressive. Legacy modules we estimated at weeks of refactoring were migrated in a few days. Features took shape in one day where the usual process would have required weeks of specs then implementation. On some tasks we were at over 200% productivity gains.

But honestly that's not what struck me most. This hackathon didn't teach me anything fundamentally new about AI or the tech. What I was already seeing using Claude Code on my side projects and small multi-dev projects was confirmed at the scale of a 15-person team. Working with multiple people is more complex than working alone. And AI amplifies that complexity as much as it amplifies productivity.

## Coordination, not tools

The first three days were rough. We had the tools, [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [BMAD](https://github.com/bmad-method/BMAD-METHOD) to structure specs, agents coding autonomously. But the process wasn't adapted. POs were writing stories the way they usually do: they propose, we adjust during grooming. That works in a classic sprint. But with agents, stories arrived without consulting design or dev. Agents ended up with specs saying one thing, architecture files saying the opposite, and a design that hadn't been consulted. Result: code with invented technical details and a wonky UX. It's not the POs' fault. They were discovering BMAD, applying their usual way of working to a context that no longer supports it. [AI doesn't fix dysfunctions, it makes them more visible and faster.](https://tomandrieu.com/blog/ia-amplifie)

The last two days, we just iterated on existing stories giving the dev a bit more freedom, and being side by side with the PO and designer. That's it. The dev has a UX question, they turn their head and ask. The PO sees something weird in the demo, they say it on the spot. The feedback loop goes from days to minutes. And the result is so much better.

But I also had the counter-example. I wanted to improve a UX I thought was bad, thinking it was an oversight from the PO's agent that had gone from epic to story without fully reviewing everything. A simple adjustment. The next day the PO explains that this UX had been chosen upstream between PM, PO and UX designer. They had already decided. And I had changed it without asking. It shows both sides. On one hand, being side by side and giving freedom accelerates everything. On the other, sometimes other people's perspective lets you better see and understand choices you wouldn't have made alone.

In the future, we'll need to reduce this friction between roles. Either by going toward something more vertical like [the product engineer](https://tomandrieu.com/blog/dev-shift-vision). Or by making specs more robust. But I find that alienating, both for the PO and the dev. Gabriel, a colleague I work with a lot on these topics, likes to say that code will become a flow. I buy into this vision. It's fine if the dev makes the wrong call once, if the other ten times it pays off. The cost of modification becomes so low that mistakes are no longer a drama, they're an iteration.

Some people remain reluctant. Not to AI itself, but to changing tools, to the terminal, to git. I understand them. But I really think these people will transform too. Like I transformed when I discovered BMAD on my own and realized you could iterate and structure without breaking everything, when you take the time to not try to one-shot it all.

## What it makes possible

Projects we'd been putting off for years became viable overnight. Legacy code that everyone knows needs to be redone but nobody tackles. Extracting functionality hidden in old code, reverse engineering business rules buried in if/else statements built up over 15 years. With AI, that ant's work is divided by 5 or 10. Projects that were in the "someday maybe" box move to "we could start next month."

And despite all the hiccups at the start, by iterating day after day, we shipped a good result. It was our first try, without preparation, discovering the tools. Taking the time to properly set up processes, the potential is enormous.

And something I realized stepping back: it's been weeks, maybe months, since I've written almost any line of code. Not just during the hackathon. On my personal projects too. I design, coordinate, validate, iterate with agents. The code doesn't always come out right on the first try, but that's not what we iterate on anymore. It's the direction, the specs, understanding the need. The code itself has become a byproduct. And I think it won't happen again, coding manually. It feels weird to put it in writing but I really think it. And what that implies for the job, for roles, for what we become when code is no longer the work, I haven't finished thinking about it.
