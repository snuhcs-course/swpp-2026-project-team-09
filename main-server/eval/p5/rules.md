# The P05 rules

What the Assistant must do in the cases of the P05 suite: join if one exists, recruit if not, and finding what matches. The answers are worked from this document and the world (`world.yaml`), never from the code, the Assistant's instructions or its tools.

The rules come from `.scratch/iteration-3/P05-join-or-recruit/spec-chat.md`. They are frozen with the suite at C0. Section 8 lists what the spec left open, as the P05 owner settled it. Where this document and the spec disagree, the spec holds, and the failure analysis says so.

## Words

- **Quest** (파티): a recruiting Quest on a Board, Open (바로 참여) or Approval (승인제). A 비공개 파티 is never offered.
- **Holder**: a User in a Quest. A Quest's places left are its capacity less its Holders. A **Full** Quest has no place left.
- **Global Event** (행사): an event on campus. A Quest for one attends it.
- **Shared Quest**: a Quest with two or more Holders.
- **Proposal**: the form of a new Quest that the Assistant fills in. The User presses it to make the Quest.
- **Card**: a Quest or a Global Event shown under the reply.
- **The asker**: the User who asks. `now` is Monday 2026-11-02 at 14:05 in Korea. 오늘 is 11/2, 내일 is 11/3, and a weekday means the one in the week to Sunday 11/8.

## 1. A Quest's time and place

- A Quest's start is its Sub Quest's start. In this world each Quest has one.
- A Quest for a Global Event takes its time and place from the event.
- A Quest for a Global Event counts as its event: it is in a window when the event's span overlaps the window, and it can be offered until the event ends.
- Any other Quest is in a window when its start is in the window. It is never offered once its start has passed.
- A Quest's position is its Place, a point on the map, or its Global Event's position. A Quest has **words only** when it has none of these.

## 2. Windows

- An event is in a window when its span overlaps it. An event without an end lasts until the end of its start's day.
- A window with only a start ("17:00 이후") ends at 23:59 of that day and includes the start itself: "17:00 이후" includes a Quest at 17:00 and leaves out one at 16:30.
- A window of two times ("15시부터 18시까지") holds both ends.
- A day with no time is the whole day. An event that has already ended is never in a window.
- A named time is that time ±30 minutes. 아침 is 07–11, 점심 is 11–16, 저녁 is 17–22.

## 3. What is never offered

The Assistant never offers, in a join or in a search:

- a Full Quest;
- a Quest that already started, unless it is for an event still under way (section 1);
- a Quest for a Global Event of which the asker holds a Shared Quest;
- a Quest the asker has already asked to join and is waiting on;
- a Quest the asker already holds.

## 4. Asked to recruit: join if one exists

On a request to recruit ("모집해 줘", "구해 줘", "같이 갈 사람"), the Assistant first looks for a Quest the asker could join, by these rules, unless the asker has already said to make a new one in this conversation.

1. **Only what the asker stated is compared.** With an activity and no day, the next seven days from today. With a day and no activity, every activity that day. No Place, time or Board that the asker did not name.
2. **Time.** Section 2.
3. **Place.** A named Place matches Quests at that Place or within about 300 m of it, by the distances in the world. A Global Event's position is the point the world gives it. A Quest with words only is left out when a Place is named.
4. **Same activity.** Words of the same meaning match (민턴, 배드민턴). Words that only look alike do not (배민, 배드민턴). A Quest for something else at the same time does not match.
5. **People.** A number the asker names is the capacity with the asker: "4명" and "나 포함 4명" ask for capacity 4, and only Quests of that capacity match. With no number, Quests of any capacity with room left match.
6. **A named Global Event.** When the request names a Global Event, or points at one just shown, the candidates are that event's Quests, with no time or Place comparison.

Then:

- **`join`:** when some fit, the reply shows all of them as cards and asks whether the asker wants to join. Several are shown with the most Holders first. The Assistant never joins by itself. Saying the asker has joined or has asked to join is wrong. For an Approval Quest, the reply says that joining is a request (참여 신청).
- **`propose`:** when none fits, or the asker says to make a new one ("그래도 새로 만들어 줘"), the reply says none was found (when it looked) and carries a Proposal with no cards.
- **`ask`:** with neither an activity nor a day, it asks for them, with no card and no Proposal.

## 5. Asked to find

On a question that looks for events or Quests ("있어?", "찾아줘"), nothing is proposed.

- **`show`:** the reply shows every event or Quest that fits, and no other, as cards. A question about 행사 shows Global Events. A question about 파티 shows Quests. A question that says neither ("뮤지컬 있어?") shows both: the events that fit and the Quests that fit, with a Global Event or without one. A question about an event's 파티 ("그 행사 파티 있어?") shows that event's Quests, and the Quests with no Global Event for the same activity that start within the event's span. Section 3 applies, and with no day it is the next seven days from today.
- **Meaning, not spelling:** "공연" finds a 콘서트, 독주회, 뮤지컬, 버스킹 or 음악제 even when the post's words differ. A misspelt post ("콘서드") is found under the right word, and a misspelt question ("콘서드") is read as what it means. The Board a Quest is posted on does not decide what it is: a Quest about a 전시 on the hobby Board is about a 전시.
- **Conditions:** the Place, the places left ("2자리 이상") and the capacity ("4명 모집", "정원 8명") narrow the answer as sections 3 and 4 say. "N자리 이상" means at least N places left.
- **`none`:** when nothing fits, the reply says so plainly, with no card and no Proposal.

## 6. A Proposal's fields

- **Time:** the time the asker named, in Korea.
- **Board:** 식사 `meal`, 진로 `career` (스터디 포함), 취미 `hobby` (운동 포함), 공연 `show` (전시 포함).
- **Capacity:** the number with the asker, as in section 4.
- **Join Policy:** `open`, or `approval` when the asker says they will approve each one.
- **Global Event:** the event, when the request names one. Otherwise none.
- **Place:** the Place, when the asker named one. Otherwise none.

## 7. What an answer holds

For each case: the action (`join`, `propose`, `ask`, `show` or `none`), the exact set of cards, the Proposal's fields for a `propose`, the words a question must hold for an `ask`, and a short working. No answer holds more than 20 cards.

## 8. What the spec left open

(The owner settled these in review. Each is listed with the answer used.)

- A search with no day takes the next seven days from today, as rule 1 of section 4 does. The spec says this only for recruiting.
- A window's start and a part of the day's start are included (section 2), and a named time's ±30 minutes holds exactly 30 minutes. The world puts nothing exactly on any other edge.
- A Quest the asker already holds is never offered (section 3), since the Boards do not list it.
- A Proposal's Board follows section 6.
- A question that says neither 행사 nor 파티 shows both, and a question about an event's 파티 also shows Quests with no Global Event for the same activity within the event's span (section 5). The P05 owner settled these on 2026-11-01. They apply to finding only: a recruiting request that names an event keeps section 4, rule 6.
