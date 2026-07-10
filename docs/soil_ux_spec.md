# Soil-Balance UX update — scannability, interaction, attention, motion

PO requirements for the Soil-Balance page UX update (set 2026-07-09). Complements `soil_balance_spec.md`; where the two conflict on UI/UX, this file is the intent to satisfy.

## Goal

Improved and holistic scannability, interaction, visual attention, and motion, for the page.

## Requirements

1. Each day shows the four numbers that explain the tank — level, rain, watering, ET loss — in whole mm, as net tank effect.
2. Every value has a fixed, predictable place: a given metric is always found in the same position on every day, so one metric can be scanned vertically across days without reading labels or hunting.
3. Today is identifiable at a glance, in both the graph and the numbers, without comparing against other days.
4. The first needed watering day stands out and acting on it is obvious.
5. When the user acts, the causal link between the action and the resulting number change is visible: the number is seen to change, not discovered changed afterwards. (Illustrative only, example: press → drop → splash → level rises → number ticks up.)
6. Watering is the page's primary interaction and must look like it: wherever it lives, it unmistakably signals "interact here to add watering."
7. Motion makes cause-and-effect legible — action received, effect shown — never decoration; judged by what the person perceives and can tell apart.
   - **Received**: a pressed control is felt before its effect appears (cause before effect).
   - **Revealed**: a changed value is witnessed moving, its driver sensed — rain, watering, loss — without re-reading the table.
   - **Attention tracks importance**: watering is primary and may pull the eye, so adding water feels like the main event; the first day needing water and any threshold the level crosses pull equally; controls and time-paging stay quiet; removing watering sits between.
8. The visual language stays coherent by reusing existing font sizes, styles, and color tokens, as much as possible — every one-off dilutes the signals that mean something. New tokens only with PO approval and a stated reason.
9. Numbers are right-aligned: units digits stack, so a metric scans as a straight column across days without jitter from signs or digit count.

## Anti-patterns

Sentences giving advice or explaining interaction · many different things signalling the same thing in different ways · new font sizes/styles/colors for no specific reason · motions not aligned, sequenced, tuned to each other, or dosed in balance · if the UI becomes a fair where disco lights and traffic lights can't be told apart — or the traffic lights start flashing and switching all the time — something went wrong.

## Appendix — the first-use story (PO)

From the PO's review of a first implementation attempt — what fails, and how the page should actually unfold. Any implementation is judged by whether it lets this story land.

> Can't find it, doesn't say watering, how it doesn't let the visual story land.
>
> User opens page, first things they see are traffic light color bar percentage (instant clear if there's urgent problem or not), graph with dead plants (instant clear when the problem will be and when not, lets user get introduced and familiarize themselves with graph, x axis being time is intuitive, each day being column is intuitive, looks sort of like weather forecast with sun glyph every day, sun intensity and rain lets the anchor and trust graph and is intuitive, it's hot currently and past days, sun is reflecting this), water tank and line as soil is intuitive too, plants need water, if there's no or low water reaching root it's bad. That's a lot of stuff we get for free, despite the graph being quite dense.
>
> Next in flow/story is seeing when watering is logically needed, we already get half from water line dropping, but user needs to see when the right water moment would be — is it half tank or completely empty.
>
> Next or at same time, they should see how do I solve this problem I see, how/where to add water, even if they don't fully grasp it yet, interacting with it helps understanding. When they add the water, things in their head should be starting to click: "if I click here, which was hard to miss/ignore, it responds, it shows I'm adding water here for the plants, shows water level and number rising, (partially) fixes the problem, now I can try do the same for another day and play around."
>
> When during those tries they wonder — hey, why isn't this solving it, or hey, why is this not going fully as I expected — they should have seen the numbers already as the right place to get those answers.
