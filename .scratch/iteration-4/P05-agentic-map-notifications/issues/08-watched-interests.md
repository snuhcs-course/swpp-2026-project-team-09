# 08: The Assistant watches an interest, and tells when something matches

Parent: [P05 spec](../spec.md) ("Part 2", "Watched interests")
Status: ready-for-agent
Blocked by: 05 (a Notification sent at its time). Its migration is made after ticket 05's has merged.
Native files: no

## What to build

A User says "채용 관련 행사 뜨면 알려 줘", and from then on a job fair, a career talk, or a company's session that is published is on the User's map with "!", and the phone rings once when it is published and once on its day at the last time the User can still go. 내 정보 → 관심사 lists what is watched and removes it.

## Behaviour

- **Kept.** A table of watched interests: the User, the words as said, and the topics the Assistant read them as (one to three Korean words). A User keeps at most 20.
- **Two tools of the chat**: one keeps an interest (the model gives the words and the topics), one removes it. The rules say what is not watched, in the wireframe's words: "지켜봐 드리는 것은 행사와 모집뿐이에요" for a shuttle, a free seat, or a Friend's Class, and a question back for words too vague to match.
- **Topics of what is published.** A Global Event when it is published, and a Quest when it is posted for recruiting, gets up to five topic words from one call of the language model over its title and description. A failed call leaves it without topics and is tried once more at the next publication step. The call's prompt lists the topics already in use, so that the same meaning gets the same word.
- **A match**: a shared topic, compared without case and spaces, between the event's or the Quest's topics and the User's interests (the profile's hashtags and the watched interests' topics).
- **Read by the app**: `GET /interests` (the watched interests) and `DELETE /interests/:id`; the list of published Global Events and the recruiting list each gain, for the asking User, whether it matches and whether the match is a watched interest.
- **The everyday map is not changed by this ticket.** Its pins follow P06's rule (new events, Favorite Events, and events held today). The matches are in the lists' answers for the one function that decides the pins; how the design's rule and P06's become one is settled with P06's owner first.
- **Notifications**, for watched interests only: "<title>이 떴어요" (or "…모집이 떴어요") when a match is published, with the line "<time> <Place>"; and on the event's day, "<title>이 <HH:MM>에 끝나요" at the last time the User can go and still stay 30 minutes, worked out from the User's Classes that day and the walk. Each opens the event's or the Quest's card.
- **The interests screen** in 내 정보: the profile's hashtags, the watched interests with a remove button, and one line that says what is watched.

## Acceptance criteria

- [x] Keeping, listing, and removing a watched interest through the tools and the routes; the 21st is refused in words.
- [x] A published Global Event gets topics from the scripted model; a failed call leaves none and the next step tries once more.
- [x] A User watching "채용" matches an event whose topics hold "채용", and not one whose topics do not; a hashtag matches without a Notification.
- [x] A match published after the interest was kept gives one Notification that rings; one published before gives none.
- [ ] The last-chance Notification's time for the design's Friday example: the job fair ends at 17:00, the User's Class is 15:30 to 16:45 in 301동, and the walk from 24동 is 4 minutes, so the time is 13:50 and the words say 78 minutes.
- [ ] The published events' list and the recruiting list answer `matches` and `watched` for the asking User.
- [x] The interests screen removes a watched interest.
- [x] No test calls the language model; nothing under `main-server/eval/` changes.

## Comments

### Decisions, app (2026-11-15)

Details the ticket left to the implementation, listed so that any of them can be vetoed.

1. **The app's part merges before the main server's.** A main server without `/interests` answers 404: the app then
   shows the profile's hashtags and an empty list, 내 정보's row shows no number, and the first run passes over the
   interests card.
2. **내 정보 → 관심사** lists the profile's hashtags, the watched interests each with a remove button and its topics under
   it, and the line that says what is watched; with none, "맡겨 둔 관심이 없어요". A removal shows "관심을 지웠어요".
3. **The 21st interest** is refused with 409 `INTERESTS_FULL`, and the same words again answer the interest already
   kept, as the main server does.
4. **"알림"** shows `interest-new` on the navy round, with the calendar for an event's address and the people for a
   party's.

### Agent usage, app (2026-11-15)

One implementing subagent (Opus 5.5) built this app part and ticket 09; its totals are given here once.

- Agent time: about 108 minutes, an estimate from the transcript's timestamps; much of it was waiting for the shared
  test lock.
- Tokens: output 179,091; input 83,314,165, of which 82,874,166 were cache reads, 439,473 cache writes, and 526
  uncached. Without cache reads: 619,090.

### Decisions, main server (2026-11-15)

Details the ticket left to the implementation, listed so that any of them can be vetoed.

1. **Topics are read by a step**, every `TOPICS_TICK_SECONDS` (60 by default, 0 in tests; an empty value is refused),
   not at publication: the publication and posting code is unchanged. A step reads at most 10 events and 10 recruiting
   Quests, one model call at a time, and counts each try before it asks, so that two pods never ask about the same
   one; a text is asked about at most twice.
2. **The model's answer** is `{ "topics": [...] }`: one to five Korean words of 1 to 20 characters without spaces, or
   the whole answer counts as none. Topics are stored normalised and without repeats. The call uses the Assistant's
   time and token limits, no retries, and the Judgement's provider options.
3. **A watched interest** keeps the User's words, trimmed, and the topics the model read them as; words the model gives
   no topics for keep their normalised words as the one topic. A User keeps at most 20 (409 `INTERESTS_FULL`); the
   same words again answer the interest already kept.
4. **The matches** are served by `GET /interests/matches` (each event's and recruiting Quest's id, and whether a
   watched interest matched, not only a hashtag); the events' list and the recruiting list are unchanged, and so is
   the map, whose pins follow P06's rule until the two rules are made one.
5. **A new match** is told only for a watched interest kept before the match was read, never for a hashtag, and never
   to the Quest's own Holders. It rings once: the title "<title>이 떴어요" or "<title> 모집이 떴어요", the line
   "<HH:MM> <Place>", and the body the line as a sentence ("14:00 학생회관이에요.", or "맡겨 둔 관심에 맞아요." when
   neither is known). It opens the event's or the party's card.
6. **The tools** `watchInterest` and `unwatchInterest` and their rules are the answer-drawing chats' only; the text
   chat's prompt and tools are unchanged. `unwatchInterest` removes every interest whose words match.
7. **Not built in this ticket**: the last-chance Notification on the event's day, which needs the User's Classes and
   the walk at that day; it is left for a later ticket.

### Agent usage, main server (2026-11-15)

Two implementing subagents (Opus 5.5): one built the part on the earlier base, one brought it onto the iteration's
Main after the notifications table.

- Agent time: about 32 and 12 minutes, an estimate from the transcripts' timestamps.
- Tokens: output 101,408 and 49,992; input 29,212,210 and 16,458,739, of which 28,938,978 and 16,263,361 were cache
  reads, 272,958 and 195,186 cache writes, and 274 and 192 uncached. Without cache reads: 374,640 and 245,370.
