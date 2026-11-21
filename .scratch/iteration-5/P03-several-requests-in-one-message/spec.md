# P03: Every request of one message, in time order

Status: ready-for-agent

## Problem Statement

A tester's feedback of 2026-11-21, under the heading "두 가지 이상의 요청을 하면 맨 마지막 카드만 줌" (ask for two or more things and only the last card comes back): asked to plan a 관정도서관 seat from 16:00 and dinner at about 19:00, the Assistant answered only the dinner. Its route also set out from the building of the tester's last Class, not from 관정, where the tester would be by then.

The message was "내일 16시에 관정 갔다가 19시 저녁쯤 먹고 싶은데 7층 예약하고 스케줄 짜줘". The answer showed only a dinner at 901동 at 19:00, with the chip "220동에서", the line "아워홈(901동) · 14:00 도착", and nothing about 관정 or a seat.

A run of the message through the real model on `5.0/Main` (85b26ea1), in the P4 world asked from an app that draws answers, showed where the first request was lost:

- The model called every tool: `findLibrarySpace`, `proposeLibraryBooking` and `planMeal`, two of them together in its first step. No request was dropped by the model.
- A seat is booked for the same day only, so a seat asked for 내일 is refused. The refusal's reason reached only the model's text, and the app hides that text whenever an answer is drawn on the map. So the seat vanished without a word.
- `planMeal` planned the dinner on its own. It knew nothing of the seat, so it set out from the building of the last Class.
- The reply holds one answer drawn on the map and the cards beside it. Nothing said that the seat came first and dinner second.
- "14:00 도착" was a second defect: the line about a nearer Restaurant that closes first gave the earliest the User could reach the pick, not the start of the meal the User asked for.

## Solution

- A reply that answers two or more requests carries its steps, in time order: each one's kind, what it is, its place, where it sets out from, its times, whether it was done and, when it was not, why. A reply to one request carries none and stays as it was.
- A meal planned after another step sets out from that step's place, free from when the step ends, unless the User named where they set out from. The start is the answer's origin chip ("62-1동에서"), which the User can change as before, and it is kept in the conditions a recalculation sends back. The server decides it: `planMeal` plans from the steps shown before it, and a meal planned before or together with the step it follows is planned again once every tool has run.
- A booking a library tool refused is a step that was not done, with the refusal's reasons. The other steps are still done.
- The model's instructions say to do every request, in time order, each with its own tools, and never to work out a later step's start.
- The app shows the steps, numbered, in the answer card it has now. Each step is visible: its book card below the plan, or its reason when it was not done.
- The line about a nearer Restaurant that closes first gives the meal's start.

Tickets:

- [01 — Steps on the server](issues/01-steps-on-the-server.md)
- [02 — Steps on the answer card](issues/02-steps-on-the-answer-card.md)

## Out of Scope

- The new answer layout (a time bar at the top, details on the map). The steps are a part of the contract of their own, so that layout can draw them without another change on the server.
- Chaining other kinds of steps than a meal after a seat or a room: an event, a meet or a Party after a booking, or a booking after a meal.
- Booking a seat for another day: the library books seats for the same day only.

## What the new layout needs from the contract

For a plan of several steps, the layout being designed (one time bar under the question, details on the map objects) reads `steps` alone: each step's `startAt` and `endAt` for its stretch on the time bar, `place` for a numbered flag on the map, `from` and the next step's `place` for the route between them, `status` and `reason` for a step drawn faded with its reason, and `shows` to open that step's card or plan when its flag is pressed. The contract has no field for the walk between two steps; the meal's own route (`scene.routes`) already draws the walk from the earlier step's place.
