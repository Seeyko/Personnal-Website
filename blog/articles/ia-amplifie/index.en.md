---
title: "AI Amplifies What Already Existed"
excerpt: "Two weeks building with AI agents. What I learned about my own processes — and why my problems didn't wait for ChatGPT."
publishedAt: "2026-02-15"
draft: false
lang: en
private: true
passwordHash: "$2b$10$Gcd/rVDo9AKWCKFFWrMniuBI69zciDjaQHGjXKPaMxByO49jf6dZ."
---

I spent the last two weeks building with AI agents. Not just using Claude to debug code — really building with them. Agents that architect. That develop. That coordinate with each other through a task system I built.

**And here's what I learned: AI doesn't create my problems. It exposes them.**

When the agent struggles to understand what I want, it's not because it's incompetent. It's because I wasn't clear. When it generates code going in the wrong direction, it's because my specs were vague. When it gets lost in my codebase, it's because my business logic isn't written anywhere.

**AI amplifies.** The good and the bad. And these two weeks forced me to face what was already broken in how I work.

## What I saw these two weeks

I built a system I call the Pantheon. Seven specialized agents: an orchestrator (Main), an architect (Daedalus), a dev (Hephaestus), QA (Hygieia), a researcher (Atlas), a scrum master (Hermes), a writer (Homer). They collaborate through Olympus, a task dashboard I coded to coordinate them.

**Result?** On some tasks, it's magic. A complete project scaffold in 15 minutes. Documented architecture in 10 minutes. Technical specs generated from a conversation.

On others? Total mess. The agent that generates 200 Discord messages in 13 minutes because it's stuck in a loop. The architect who proposes a stack I have to correct 3 times because the context wasn't clear. The dev who codes for 20 minutes only to realize he doesn't have the right specs.

**The difference between the two?** Not the AI. My process.

## The tribal knowledge I have in my head

For years, I've coded keeping everything in my head. "I know what I want to do, no need to write specs." "It's obvious, no need to document." "I remember why I did it like that."

It worked. Until now.

Because AI doesn't have access to my head. It can't guess that when I say "payment system", I'm thinking Stripe with webhooks + subscription management + retry logic on failed payments. For it, "payment system" could be anything.

**And suddenly, I realize: this was already a problem before.**

When a new dev joined one of my projects, they struggled. Because half the business logic was "in my head". They had to ask me. Exactly like the AI has to ask me now.

The difference? The AI asks me 50 times a day. It makes the problem impossible to ignore.

## Solid process = magic AI. Fuzzy process = amplified chaos.

I noticed a pattern.

**When I took time to formalize:**
- Clear specs ("here are the user scenarios, here's the architecture, here are the constraints")
- Documented conventions ("we use Drizzle, not TypeORM, here's why")
- Explicit context ("this project is an MVP, no over-engineering")

→ AI shines. It codes fast, cleanly, in the right direction. It documents. It tests. The code it produces is often better than what I would have written myself.

**When I was vague:**
- "Make me something to manage team capacity"
- "Use a modern stack"
- "You'll see, it's obvious"

→ Chaos. AI goes in all directions. It proposes a stack I never use. It codes features I don't want. It generates technical debt because it guesses my intentions.

**The formula is simple: Solid process + AI = acceleration. Fuzzy process + AI = chaos x10.**

And it's exactly the same without AI. A new dev with vague specs produces vague code. The difference is AI does it 10x faster.

## What it taught me about myself

I thought I knew how to specify. That I was rigorous. That I had good practices.

**These two weeks showed me I didn't.**

I realized I was taking shortcuts. Skipping steps. Considering specs as "optional" if I already knew what I wanted in my head.

**The problem?** My head isn't accessible. Not to AI, not to the dev arriving in 6 months, not even to myself when I reread my code a year later.

I learned I need to write. Everything. Before coding.

Not because it's a "best practice". Because if I don't, AI forces me to do it after — by asking me 50 questions, generating off-target code, wasting my time.

**Writing specs before code is faster than correcting AI after.**

## The seniors who make me think

I noticed something in my teams.

The seniors who struggle with AI are those who "code fast". Who type code without thinking. Who never document. Who keep everything in their head.

The seniors who excel with AI are those who formalize. Who write technical specs by reflex. Who ask the right questions before coding. Who live in the product, not just in the code.

**And I asked myself: which category am I in?**

Honestly? Between the two. I have the formalization reflexes, but I often short-circuit them. "No need, it's simple." "I know what I want." "It'll be faster if I code directly."

These two weeks forced me to slow down. To write. To structure my thinking before executing.

And paradoxically, **it's faster.**

## What's changing (and it fascinates me)

An observation that's been on my mind.

The dev job used to be: PM → specs → dev → code. Separate steps. Distinct roles.

With AI, **this chain compresses.**

I can now cover from user need to code in production. Alone. In a few days. Because AI accelerates execution.

**But it only works if I can do the PM's job too.**

Understand user needs. Formalize the problem. Define scenarios. Prioritize. Validate with data.

If I only know how to "code", AI replaces me. If I know how to "think the problem AND code the solution", AI multiplies me.

**And there's an asymmetry here.**

A dev learning to think product is accessible. They already have analytical rigor. They understand technical constraints. They know what's feasible.

A PM learning to code with AI is... harder. Because prototyping an app in 15 minutes with AI, anyone can do it. But putting it in production? With security, scaling, observability? That's another level.

**I think technical profiles have a structural advantage.** As long as they don't remain "just coders".

## My conclusion (for now)

Two weeks is short. I don't claim to have understood everything.

But here's what I take away:

**AI reveals my flaws.** My vague specs. My tribal knowledge. My shortcuts. It forces me to be rigorous. And that's good.

**Code is no longer the main artifact.** It's the spec. The code, AI can generate. The clear spec, no. That's where I need to invest my energy.

**The job is changing.** Not tomorrow. Now. I'm no longer "just a dev". I need to think product. Understand users. Formalize problems. And use AI as one tool among others to execute.

Do I know exactly where this is going? No.

Does it scare me a bit? Yes.

Is it fascinating? Absolutely.

---

*Tom Andrieu — Vaucluse, February 2026*

**Resources that helped me think:**
- Gabriel Desbouis' LinkedIn posts on tribal knowledge
- PostHog's blog on product engineering
- Steve Yegge's newsletters on agentic engineering
- My own struggles these past two weeks
