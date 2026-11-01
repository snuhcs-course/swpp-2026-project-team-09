# Notes on the P4 label draft

40 cases answered, 7 marked `open: true`. The labels come only from `rules.md`, `world.yaml`, `travel-fixture.json` and `questions.yaml`.

## Cases marked open

| Case                             | Why                                                                                                                        | What the draft does                                                                                                                                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parties-over-twenty-narrowed`   | Meaning label: which Friday candidates are 운동. The rule names only board games as dropping out.                          | 7 sports hobby Quests and 총장배 풋살 대회. 뜨개질 모임, 사진 출사 모임, 보드게임 오후반 and 가을 독서 토크 drop. The wider reading keeps 뜨개질 and 사진 출사. Section 12 also does not say whether a narrowed reply counts the cards (8) or the tool's candidates (12); the draft says 8. |
| `meals-no-noodles`               | Meaning label: which dishes are noodles.                                                                                   | 칼국수, 비빔냉면 and 잔치국수 are noodles, so 자하연식당 3층 drops and 학생회관식당 stays through 제육볶음.                                                                                                                                                                                 |
| `parties-what-is-on-meal-search` | Meaning label: whether a cafe meeting on the meal Board is a party to eat with.                                            | Keeps 동원관 앞 카페 모임 with 샤로수길 맛집 탐방. `board` is not in `args`, as the rules do not require it.                                                                                                                                                                                |
| `meals-friend-off-campus-item`   | Section 8 says a Friend with an unplaced item is "judged on time only". It does not say whether the 1-minute margin stays. | Keeps the margin: 한도윤's leave-by is 13:44. Without it, the first four Restaurants show 60, 50, 45, 45 instead of 59, 49, 44, 44. Starts and order do not change.                                                                                                                         |
| `parties-abbreviated-gap-begun`  | Section 12 asks for when the previous item ends (12:15). Section 6 answers the gap's start (12:40).                        | The mention accepts either.                                                                                                                                                                                                                                                                 |
| `common-choice-clock-fits`       | The same point for a clock window: 13:30 and 15:50 against 14:00 and 15:30.                                                | The mentions accept either.                                                                                                                                                                                                                                                                 |
| `meals-soup-wanted`              | Section 12's "ordered by the longest Travel Time" says nothing with one card.                                              | That sentence is not asserted. The shared time stays in the mentions.                                                                                                                                                                                                                       |

## Contradictions between the documents

1. **The asker's items.** The header of `questions.yaml` lists the asker's items and leaves out the Shared Quest for 과학기술 토크콘서트, Tuesday 18:00–20:00. `world.yaml` (`sharedQuest`) and `rules.md` section 2 make it an item. This changes `meals-who-dinner-tomorrow`: by the rules the asker is free 17:00–18:00, and 이민수 and 오지호 are not free. By the header's list the asker is free 17:00–19:30 and both are. The draft follows the rules. The header also gives this item no seed name, though no answer needs one.
2. **What reaches the model.** The header says earlier assistant turns come "as the app sends it back", then says the last user turn "is the only turn sent to the model". Taken literally, 운동만, 면 빼고, 국밥 먹고 싶어, 여기로 하자, 낙성대역에서 출발해 and 서울대 정문으로 들어가 cannot be answered. The draft assumes the history reaches the model as context and only the last turn is answered.
3. **`getMyDay` allowed or required.** Section 6 takes item ids, and section 11 makes `getMyDay` their only source, so a named-Class case needs it. The header says a case that needs a tool requires it, yet its own example has it under `allowed`. The draft keeps it `allowed`, with `from` and `to` in `args`, which gives the same check. It is `required` only in `parties-ambiguous-class` and `common-no-timetable-named-classes`, where seeing the day is the point.

## History that disagrees with the rules

- `meals-here-after-cards`, the last assistant turn: "소고기국밥은 3식당에 있어요." holds neither the shared time nor the order, which section 12 requires of a reply with Friends. It is fixed history and changes no answer, but it is the same reply `meals-soup-wanted` labels with the shared time, so a person may want the two to agree.

All other fixed history agrees with the rules: the 25 candidates and 20 cards of `parties-over-twenty-narrowed`, the shared time and card order of the `meals-*` follow-ups, and the questions asked in the off-campus cases.

## Readings worth a look

Not open, since the rules decide them, but a reviewer may want to check.

- `parties-held-quests-busy`: all three gaps are in the mentions, the third (16:20–17:00) too, although nothing fits in it. Section 12 says the gap found.
- `parties-ambiguous-class`: 컴퓨터구조 has already ended at `now`, but the rules give nothing that picks 컴퓨터그래픽스, so the case asks.
- `meals-breakfast`: the rules give the words, not the kind of action, so `CHAT`, `REFUSE` and `ASK` are all accepted.
- `meals-no-shared-time`: 오지호 is in `absent`, following the header's example of Friends who are not free. In `meals-no-restaurant-fits`, 강민재 is not, because he counts as free.
- `common-no-timetable-named-classes`: `findFreeTimeEvents` is forbidden, as there is no item id to pass.
