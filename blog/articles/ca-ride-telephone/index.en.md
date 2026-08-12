---
title: "I shipped « Ça ride » from my phone"
excerpt: "A migration in the car, a holiday I would have cancelled, then the maternity ward. How AI let me keep RideMyPark moving without choosing between the product and the people I live with."
publishedAt: "2026-08-12"
lang: en
draft: false
private: true
visibility: password
passwordHash: "$2a$10$ETbH0aLpwd92h1XAxzRJjex87i/.iOQDYKPHAEU4LKkmZjJ153mX2"
coverImage: "cover.png"
---

On July 25, we packed the car and left for our holiday. My partner was 34 weeks pregnant, and RideMyPark was still running through my head. The migration from the old WordPress site to the new one had been ready for a while: the plan was written, the scripts were done, and all it really needed was a window when I could watch production closely. We moved our departure forward, so that window had effectively disappeared. I launched the migration anyway, just before we hit the road.

## On the highway

I wasn't the one watching the screens in the car. My partner was following the agents and the site's status from her phone: maintenance mode went up, came back down, and the new site went live. I asked her to open the mobile app and check that the spots still appeared and that nothing obvious was broken. For the most part, everything held up—except the reviews were missing. Under normal circumstances, that kind of irritating detail would have kept me at a computer for at least two hours while I investigated, patched, redeployed, and tested again.

Instead, I described the symptom to an agent. It fixed the issue, we tested again, and that was it. Nothing spectacular, but exactly the kind of small problem that would once have swallowed the start of the holiday—or made me hesitate to leave at all.

## A week in the Pyrenees

We were staying in a family house. There was a pool, there were people around, and I wasn't putting a laptop on the table to “just finish one thing.” I used my phone in the car, late at night when everyone was asleep, or in the quiet gaps between everything else. This wasn't a disguised workday. They were short windows: start a cloud session, review the result, put the phone away.

There is a real question here about whether that counts as switching off, and I want to write about it properly in another article rather than bury it in a footnote. What I can say is that, without AI, I probably would have cancelled this holiday. I was too close to finishing a redesign I had dragged behind me for five years without ever getting it over the line, and the release could not wait any longer. AI helped compress that redesign into a month, which meant I could still go—not disconnecting 100%, but perhaps 80%. That is infinitely better than staying home to finish the migration while everyone else is away.

In one of those quiet gaps, I also let myself return to something I had postponed for years: sessions. Not a big public event, just a simple “let's meet at the spot” between riders, either right now or two weeks from now because people have jobs. The old WordPress setup never gave us solid ground for it. Now that the new site was live, I started by shaping the product with Claude Code—what are we actually trying to make, spontaneous or planned, who is it for, and where does V1 stop?—instead of asking AI to generate the whole feature in one shot. Within a day or two, we had settled on “Ça ride.” More importantly, I could work on it while the energy was there instead of waiting for some imaginary sprint after the holiday.

## At the hospital, without turning it into a manifesto

Then nothing went to plan: contractions, the maternity ward, our daughter being born on August 2, and then the neonatal unit. Most of the time, we fed her, slept, and started over. I am not telling this story to frame “shipping from the hospital” as some kind of achievement. I worked when everyone else was asleep, in the same quiet windows when many people would doomscroll or put on a show. In those moments, I enjoy prototyping and moving RideMyPark forward. It is not morally better or worse; it is simply what I do.

In the past, I would have felt guilty. I would have been anxious about choosing between my daughter and work—and however obvious the choice looks on paper, my brain does not always process it that neatly. Now I no longer have to make that choice in quite the same way. I can work for an hour across an entire day, split into ten tiny sessions, and the product moves as though I had spent a week at a computer, while I still care for my family, exercise, and stay present the rest of the time.

Of course, it is less relaxing than dropping everything. But there are moments when fully dropping everything is not a luxury you have. AI gave me a middle ground that is far better for the people close to me than being the person who brings a laptop on holiday—or to the hospital—and never really joins them.

My colleagues tested the feature on staging. There was not a huge amount of feedback, so I released it to production with the feature enabled only for them at first, giving us a chance to see whether it held together before exposing it to everyone. I am still in the polish loop today—the timer for an upcoming session, for example, the kind of detail that changes how a product feels. I take their feedback from Discord, give it to Claude Code, iterate, and test again as I go.

## What this changes for me

Taken together, these steps are not a method anyone should copy. They are a series of moments when execution stopped requiring me to be tied to a desk.

The migration held while we were on the road, and the mobile bug was fixed without stealing the day. The holiday happened when I would otherwise have cancelled it, because a five-year redesign had finally been compressed into a month. The sessions feature took shape in the margins rather than inside an ideal schedule. And during the busiest period of all, I did not have to turn every spare hour into guilt: one fragmented hour across the day was enough to move the product forward without making it the center of everything.

In [Identity shift](https://tomandrieu.com/blog/identity-shift), I wrote that coding is no longer the hard part. I did not yet have this proof in my hands. Now I do: judgment can fit in a pocket, and execution no longer needs me to sacrifice the people around me in order to make progress.
