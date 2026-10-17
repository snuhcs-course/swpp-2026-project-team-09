# P07: AI activity chat (the Assistant)

Status: ready-for-agent

## Problem Statement

A User who wants to know something about campus, or to do something with other people, has to know which screen holds it. Today's menus, the shuttle, the Global Events and the recruiting Quests on the Boards each sit behind their own tab or layer. Finding "a Quest to go running with this evening" means opening every Board and reading every post. Making a Quest takes a form with many fields: title, public or private, Board, time, Place, related Global Event, Friends to invite, capacity. The main screen already shows an input bar, "무엇이든 부탁해 보세요", but pressing it only says the chat is not ready.

## Solution

Pressing the input bar opens a chat with the Assistant ("SNU Now AI") in a translucent sheet over the map, as the wireframe draws it. The User writes what they want in their own words. The Assistant answers in 해요체, in the User's language:

- It tells the menus of a day and where the shuttle is, from the collected data only, saying when the data was collected and saying plainly when there is none. A button shows the dining or shuttle layer on the map.
- It finds Global Events of the kind the User asks for, and recruiting Quests matching what the User describes, and lists them as the same cards the Events tab and the Boards show. A card opens its Global Event or its post, and its own buttons (join, recruit, match) work as they do there.
- It drafts a Quest from what the User wrote ("내일 점심 비공개로 민수랑 밥"), with the friend, the Place and the Global Event matched to real ones, and shows the draft as a card. 만들기 makes the Quest the way the party form makes it; 수정 opens the party form filled with the draft.
- It holds small talk, such as recommending a lunch from today's menus after asking what the User feels like, and politely declines long general work such as writing a report or fixing code.

The heart of the work is the layer between the User's free text and the data: tools that turn what a person wrote into precise, checked values, so that the model never invents an id, a date or a rule. Each later AI feature will get its own entry point, instructions and set of tools over the same model configuration (ADR 0005).

## User Stories

### Opening and using the chat

1. As a User, I want pressing the main screen's input bar to open the chat, so that I can ask for anything from where I already am.
2. As a User, I want the chat to open as a translucent sheet over the map with the bottom tabs still visible, so that I do not lose my place in the app.
3. As a User, I want the sheet's header to show "SNU Now AI" and a close button, so that I know whom I am talking to and how to leave.
4. As a User, I want an empty chat to greet me with "무엇을 도와드릴까요?" and three example buttons (식사 메뉴 추천, 현재 통학/순환 셔틀 위치, 파티 찾기), so that I can see what the Assistant can do.
5. As a User, I want an example button to send its words as my message, so that the Assistant answers it like anything I typed and the conversation carries on from there.
6. As a User, I want the input to grow with my text up to a limit and Enter to start a new line, so that I can write a longer request comfortably.
7. As a User, I want to send only with the send button, which is disabled while the input is empty, so that I do not send half a message.
8. As a User, I want my messages on the right and the Assistant's on the left, so that I can follow the conversation.
9. As a User, I want a "···" bubble while the Assistant is working, so that I know my message was received.
10. As a User, I want the conversation to stay when I close the sheet and open it again while the app runs, so that I can glance at the map and come back.
11. As a User, I want a 새 대화 button that discards the conversation, so that I can start over on another subject.
12. As a User, I want the conversation gone when the app is restarted, and never stored on the server, so that what I asked stays on my phone.
13. As a User, I want a failed answer to say "지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요" with a 다시 시도 button, so that a network or model failure does not leave me stuck.
14. As a User, I want the Assistant to answer in the language I wrote in and in 해요체 by default, so that it reads like the rest of the app.
15. As a User who writes in English, I want menus, events and posts shown as they were written, so that names match what I will see on campus.

### Campus services

16. As a User, I want to ask what is on the menu today and get the actual menus, so that I can decide where to eat.
17. As a User, I want to ask about a given day or meal ("내일 저녁 학식") and get that day's and that meal's menus only, so that I am not shown today's menus as tomorrow's.
18. As a User, I want to be told plainly when there is no menu for the day I asked about, so that I am never shown an invented menu.
19. As a User, I want the Assistant to say when the menus were collected, so that I know how fresh they are.
20. As a User, I want to ask where the shuttle is and get the vehicles the operator reports now, so that I know whether to hurry.
21. As a User, I want to be told when the shuttle is not running, so that I do not wait for nothing.
22. As a User, I want a 지도에서 식당 보기 or 지도에서 셔틀 보기 button under such an answer, which closes the sheet and turns that layer on, so that I can see it on the map.
23. As a User, I want to be told that study spaces are not supported yet when I ask about them, so that I am not misled.

### Finding Global Events

24. As a User, I want to ask for a kind of Global Event ("이번 주 공연 있어?") and get the published Global Events that match, so that I find events without scrolling the Events tab.
25. As a User, I want the matching Global Events shown as the same cards as in the Events tab, so that I recognise them and can act on them.
26. As a User, I want pressing a Global Event card to open the Events tab at that event, so that I can read it in full.
27. As a User, I want an event card's recruit and match buttons to work as in the Events tab, so that I can act without leaving the chat first.
28. As a User, I want time words such as "이번 주", "내일" and "주말" understood against today's date, so that I get events of the right days.
29. As a User, I want to be told when no Global Event matches, so that I know rather than guess.

### Finding recruiting Quests

30. As a User, I want to describe a Quest freely ("오늘 저녁 같이 운동할 파티") and get the recruiting Quests that match, so that I find company without reading every Board.
31. As a User, I want matching Quests shown as the same cards as the Boards show, so that I can compare them as I usually do.
32. As a User, I want pressing a Quest card to open its post, so that I can read the details.
33. As a User, I want a Quest card's join button to work as on the Board, through the same confirmation, so that I can join from the chat.
34. As a User, I want "파티 찾아줘" with no condition to show a few recruiting Quests that start soon and invite me to narrow down, so that the example button gives a useful answer at once.
35. As a User, I want only Quests I could see on the Boards, so that the chat does not show me Closed Quests or anything hidden.
36. As a User, I want to be told when no recruiting Quest matches, so that I can make one instead.

### Drafting a Quest

37. As a User, I want to describe a Quest in a sentence and get a draft, so that I do not fill in the form field by field.
38. As a User, I want the draft card to show its title, public or private, Board, when, where, related Global Event, Friends to invite and capacity, so that I can check every field before anything is made.
39. As a User, I want 만들기 on the draft to make the Quest the way the party form does, invitations and related Global Event included, so that a Quest made from the chat is no different.
40. As a User, I want 수정 on the draft to open the party form filled with the draft, so that I can change a field the Assistant got wrong.
41. As a User, I want nothing made until I press 만들기, so that a misunderstanding never creates a Quest.
42. As a User, I want "민수 태그해줘" to find my Friend named 민수, so that I can invite by name.
43. As a User, I want to be asked which one when two Friends match the name, and told when none does, so that the wrong person is never invited.
44. As a User, I want only my Friends to be invitable, so that the Assistant cannot invite strangers.
45. As a User, I want "301동에서" to become that Place, and to be asked when the words match several Places or none, so that the Quest is where I meant.
46. As a User, I want "축제 관련으로" to link the Global Event I meant, and to be asked when several match, so that the Quest points at the right event.
47. As a User, I want "비공개로" to make the draft private with no Board, and a public draft to have a Board, so that the draft follows the same rules as the form.
48. As a User, I want the Assistant to ask for what is missing, such as the Board of a public Quest, so that the draft is complete before I see it.
49. As a User, I want "내일 점심" to become tomorrow at 12:00 (breakfast 08:00, lunch 12:00, dinner 18:00 when no time is given), so that vague times become concrete ones I can check.
50. As a User, I want a time in the past refused, so that I do not draft a Quest that already happened.
51. As a User, I want a draft linked to a Global Event to start at the event's start unless I gave a meeting time before it, so that it matches what the form does.
52. As a User, I want the capacity to stay within the app's limits, so that the draft can actually be made.

### Small talk and limits

53. As a User, I want to chat casually and get natural answers, so that the Assistant feels pleasant to use.
54. As a User, I want "점메추" to ask what I feel like (한식, 일식, 양식 …) and then recommend from today's actual menus, so that the recommendation is something I can eat today.
55. As a User, I want long general work (a report, an essay, code) declined politely with a pointer to what the Assistant can do, so that the shared budget serves campus life.
56. As a User asking where a Friend is, I want to be pointed to the map, so that locations are never handed to the AI.
57. As a User, I want answers kept short, so that they read well on a phone.

### Operating it

58. As a developer, I want the model chosen by configuration, so that we can switch models on OpenRouter without code changes.
59. As a developer, I want the number of tool calls per message and the time per message capped, so that a loop or a slow model cannot burn the budget or hang the chat.
60. As a developer, I want only the latest 20 messages, as text and card references, sent to the model, so that long conversations do not grow the cost of every message.
61. As a developer, I want the Assistant unavailable, not crashing, when no OpenRouter key is configured, so that the rest of the main server runs without it.
62. As a developer, I want model failures and exhausted credit logged on the server and shown to the User as the ordinary error, so that we can tell what happened without exposing it.
63. As a developer adding a later AI feature, I want to give it its own entry point, instructions and tools over the same model configuration, so that features do not see each other's tools or data.

## Implementation Decisions

### Shape (ADR 0005)

- The Assistant is a new module of the main server. It calls the model through OpenRouter with the Vercel AI SDK. No LangChain or LangGraph, and no new service.
- The module has four parts:
  - **Model port.** The one place that talks to the model. Production binds it to OpenRouter through the AI SDK. Tests bind a scripted fake.
  - **Tools.** Each is a zod input schema plus a plain function calling the main server's existing services as the signed-in User. A tool does not import the AI SDK.
  - **Feature definitions.** A feature is an entry point with its own system prompt and its own set of tools. P07 builds one feature, the chat Assistant.
  - **Adapter.** One thin adapter registers a feature's tools with the SDK and runs the loop.
- Every later AI feature (managing a Quest, AI matching, scheduling a private Quest between Friends) is a new feature definition reusing tools, never more tools on the chat Assistant. The model configuration is shared; tools and permissions are not.
- Configuration: the OpenRouter key and the model name come from the environment. With no key, the assistant endpoint answers that the Assistant is unavailable.
- Limits per message: at most 8 model steps, 30 seconds overall, and a cap on output tokens. These are starting values, tuned after the first tickets.

### The refining tools: the core of P07

Free text becomes checked values in three kinds of tools. The rule throughout: **the model passes the User's words; the server decides what they refer to.** The model never supplies an id, a rule outcome or a date range it was not given.

- **Resolvers** turn words into one real thing. Each returns its candidates, never a guess: none, one, or several. With one, the model uses its id. With none or several, the model asks the User (listing the names when several).
  - `resolveFriend(words)`: among the User's Friends only, matched by name, ignoring spaces.
  - `resolvePlace(words)`: among the Places, by name or building number ("301동", "제1공학관").
  - `resolveGlobalEvent(words, optional period)`: among published Global Events.
- **Lookups** take structured conditions and return only data matching them, each with when it was collected. When nothing matches they return an explicit "none" with the reason (no menu collected for that date, shuttle not running, no matching event), and the system prompt forbids answering from anything else.
  - `getMenus(date, optional meal, optional restaurant)`
  - `getShuttle()`
  - `searchGlobalEvents(period, optional Place, optional words)`
  - `searchRecruitingQuests(optional Board, optional period, optional Global Event)`

  Search narrows by these conditions and returns compact candidates (id plus the few fields the model needs to judge). The model then picks which match the User's meaning. There are no embeddings.
- **Drafter.** `draftQuest` takes only resolved ids and concrete values: title, description, public or private, join policy for a public Quest, Board, capacity, start time, Place, Global Event, Friends to invite.
  - It checks the draft against the same rules as the party form: a public Quest has a Board and a private one none; capacity 2 to 8 (a private Quest takes 8); a start in the past is refused; every id must exist and be visible to the User; invitees must be Friends.
  - A failed check returns what is missing or wrong, field by field, so the model can ask the User. A passing draft becomes the draft card.
  - It creates nothing.
- **Presenters** put real data in the answer. `showGlobalEvents(ids)`, `showQuests(ids)` and `showOnMap(dining | shuttle)` attach cards and map buttons to the reply.
  - An id is accepted only if a lookup or resolver returned it in this message. Any other id goes back to the model as an error, so a hallucinated id never reaches the screen.
- **Time.** Every request's system prompt carries the current date, weekday and time in Korea. The model converts relative times itself ("내일 점심" → tomorrow 12:00, with defaults of 08:00, 12:00 and 18:00 for 아침, 점심 and 저녁), and the tools check the result (not in the past, a real date).
- **Visibility.** Lookups see what the User would see on the existing screens: recruiting Quests as on the Boards (Open and Approval only), and published Global Events only (no Drafts, no Private Events). Friends are passed by name and id only, never with locations.

### System prompt of the chat Assistant

It states:
- the role, in 해요체, answering in the User's language
- the current time in Korea
- to answer facts only from tool results and to say plainly when a tool returned "none"
- to ask when a resolver returns none or several
- to keep answers short
- to decline long general work politely and keep small talk short
- to point to the map for a Friend's location
- that study spaces are not supported yet

Data written by other Users (Quest titles and descriptions) is treated as data. Its risk is limited because cards come from real data and nothing is made without the User's 만들기.

### API contract

- One endpoint for signed-in Users: post a message with the conversation so far, receive the Assistant's reply.
- **Request:** the latest messages (at most 20, oldest dropped). Each is the User's text, or the Assistant's text with the card references it showed (kind and id). Tool results of earlier turns are not sent. The model calls a tool again when it needs data, which also keeps the data fresh.
- **Reply:**
  - The Assistant's text.
  - Its cards in the order shown:
    - Quest cards in the same shape as the recruiting list the Boards use
    - Global Event cards in the same shape as the published list the Events tab uses
    - at most one draft card in the shape the party form fills from
  - Map buttons.

  The server fills cards from the database, so the app draws them without further requests.
- **Errors:** a failure (model error, timeout, step cap reached without an answer, exhausted credit, no key) is one error reply the app shows as the ordinary failure with 다시 시도. The cause is logged on the server only.
- No conversation is stored on the server.

### App

- The input bar becomes a real field. Focusing it opens the sheet. The sheet, header, empty state, bubbles and "···" follow the wireframe (MainChat in the design canvas).
- The three example buttons are 식사 메뉴 추천, 현재 통학/순환 셔틀 위치 and 파티 찾기, replacing the wireframe's library seats. Each sends its words as a User message.
- The conversation lives in memory while the app runs. Closing the sheet keeps it, 새 대화 discards it, and restarting the app loses it.
- **Cards reuse the existing components**: the Board's post card with its join button and confirmation, and the Events tab's event item with its recruit and match buttons. Pressing a Quest card opens its post. Pressing a Global Event card opens the Events tab focused on it.
- The **draft card** lists the draft's fields as rows (the wireframe's item rows) with 만들기 (primary) and 수정 (secondary).
  - 만들기 runs the party form's existing making sequence: with a Global Event, attend it, apply the settings, add the meeting step when the time moved earlier, then invite. Without one, make the Quest, then invite.
  - 수정 opens the party form filled with the draft.
- Map buttons close the sheet and turn the dining or shuttle layer on, using the existing layers.
- The reply is shown whole, not streamed.

## Testing Decisions

- **What a good test is.** It drives the feature from outside and checks what a User or a client sees: an HTTP request and its reply on the server, a press and what the screen shows in the app. It does not check internal calls, prompt wording or the model's prose.
- **Server: one new seam, the model port.**
  - Tests run the assistant endpoint end to end against a real database, as the main server's existing end-to-end specs do (own Quests, recruiting, Matching).
  - The model is a scripted fake: each step says which tool to call with which arguments, or what text to answer. It records what it received: the system prompt's time, the trimmed history, each tool result.
  - The refining tools are tested through this endpoint, not on their own. Every case is a script plus seeded data:
    - resolvers returning none, one, several
    - lookups matching the date or returning "none"
    - drafts refused for each rule and accepted when complete
    - presenters refusing ids that no tool returned this message
  - Loop safety is tested the same way: the step cap, the timeout as the error reply, history trimmed to 20.
- **App: the existing fake server.** Screen tests answer the assistant endpoint with canned replies, as the existing tab and form tests do. They cover:
  - opening the sheet and sending
  - the example buttons
  - cards and where pressing them leads
  - 만들기 and 수정 on a draft
  - map buttons
  - 새 대화
  - 다시 시도
- **Budget.** Implementation outweighs tests. Each ticket tests only the cases of the tools or screens it adds, a few per tool, concentrated on the refining tools. There are no tests of look or style, and none that call the real model. Measuring the Assistant's accuracy against the real model belongs to another task.

## Out of Scope

- **Handing Friends' locations to the AI.** It would send the most sensitive data to an outside provider and would need Location Sharing, the Master Switch, Private Zones and the Campus Boundary enforced on the AI path. The Assistant gets Friends' names and ids only.
- Study spaces (not built yet; a tool will be added when they are).
- Opening or managing a Party, and managing an existing Quest (adding or removing Sub Quests, passing on the Leader).
- AI matching, and scheduling a private Quest between Friends.
- Using the timetable or the User's position in recommendations.
- Storing conversations on the server.
- Streaming replies.
- A limit on messages per User. It is easy to add later as a counter in Redis before the loop.
- Measuring accuracy with an evaluation set against the real model.
- Choosing the demo model (configuration, decided later).
- Removing Meetup from the glossary, or sending Meetup's entry to private Quests.

## Further Notes

- **Ticket order.** First a skeleton through every layer: input bar → sheet → endpoint → model → `getMenus` and small talk. Then one ticket per tool or card kind, roughly: shuttle and map buttons, Global Event search and cards, recruiting Quest search and cards, resolvers, the draft card with 만들기 and 수정. Each ticket leaves a working Assistant.
- **Budget.** OpenRouter credit is $100 from the course and will not be topped up. Set a credit limit on each key in the OpenRouter dashboard, and keep separate keys for development and the demo. Develop on a cheap model.
- **Later scheduling between Friends (not built here).** Meetup is to be replaced by private Quests with invited Friends. An open-ended promise ("언제 밥 한번 먹자") exists only as an idea, with no table. The plan is:
  1. Each side's conditions are parsed into structured availability, kept private to that side.
  2. The server computes the overlapping times.
  3. Both see only candidate times.
  4. When both accept, a private Quest is made with the other invited, reusing `draftQuest` and the making sequence.

  Agents negotiating in free text were rejected because the exchange itself would leak what each side wrote.
- **Description of a public Quest.** The party form requires one for a public Quest. When the User gave none, the Assistant may propose a short one from the request. The User sees it on the draft card before 만들기.
- The decision record of this spec, as questions and answers, is kept outside the repository in the author's notes.
