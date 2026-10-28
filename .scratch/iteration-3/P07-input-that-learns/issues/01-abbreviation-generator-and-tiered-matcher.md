# 01: Abbreviation generator and tiered Place matcher

Parent: P07, chat input that learns from use. Plan: [scenario-4-plan.md](../../scenario-4-plan.md) §3.1, on research notes [08](../../research/08-korean-abbreviation-and-matching.md) and [09](../../research/09-assistant-code-map-for-learning.md).
Status: ready-for-agent
Blocked by: None

## What to build

The first of the plan's four pieces: the deterministic layer that reads campus short forms before anyone has taught the server a word. A pure generator makes the forms students shorten a Place name to (학생회관 → 학관, ㅎㄱ) from the catalog name alone, and a tiered matcher behind the Assistant's `resolvePlace` tool answers the first tier that has hits: the exact name or building number, then aliases, then generated forms and 초성, then a syllable subsequence anchored at the first syllable, then a jamo edit distance of one. Tiers never mix, and a collision still answers `several`: the model keeps choosing only among the candidates shown, and every candidate is a real catalog Place, so the `FoundIds` gate in `proposeQuest` covers them as before. No model call is added.

## Acceptance criteria

- [ ] `abbreviations(name)` in `main-server/src/places/abbreviations.ts` is a pure function with no I/O: normalisation (brackets kept as a second variant, a leading 제N and trailing numbers dropped, a Latin prefix such as SK dropped when more than a head remains), the first syllable of each chunk (R1) and the first two of them (R1′), the first and last syllables (R2), the first chunk alone (R3), a tail such as 관·동·센터 dropped (R6), each word of a multi-word name, and the 초성 key of the name and of every form through es-hangul. R4 and R5 only if the seed shows they earn their collisions; the ticket's comments say which rules are in and why.
- [ ] Forms are computed when the catalog loads, never written by hand.
- [ ] Unit tests on note 08's examples: 학관, 중도, 관정, 농생대, 학식 and 체육 are generated from their Places, 배민, 코노 and 밥약 from their words, and 보겜, 알바 and 스카 are expected misses.
- [ ] A small hand-written group table (공대, 자연대, 윗공대, 인문대, 사회대, 사범대, 농생대 → buildings) answers `several`. Its building lists are marked TODO for the team to confirm with students, and its entries carry a `source` that keeps them apart from anything learned later.
- [ ] The matcher sits inside `resolvePlace`'s `run`, before `resolved()`, so that `found.add` covers its ids. Tier 2 is a seam for learned aliases (personal, then global), with no learned implementation yet. 초성 matching applies only when the input is all consonants; a mixed form such as ㅎ관 is compared position by position.
- [ ] `GET /places/search` keeps today's substring behaviour for the app's pickers.
- [ ] The tests that encoded today's behaviour are changed on purpose: `test/eval-cases.integration.test.ts` (the 학관 known-failure rule and the world fact that 학관 lacks 학생회관), `test/assistant-resolvers.integration.test.ts` (the candidate shapes) and `eval/cases/making-parties.yaml` (the 학관 case expects the Assistant to ask among candidates that include 학생회관).
- [ ] 학관 and ㅎㄱ resolve to candidate lists that include 학생회관, ㅎㄱ as `several`.
- [ ] Unit and integration tests of the touched files and the lint pass. The paid eval harness is not run.
- [ ] The comments hold the measured counts on the seed: forms per name, the collision rate of generated forms, the share of 초성 keys shared by several names.

## Comments

### Built (2026-10-26)

On the worktree branch `claude/clever-shamir-5a088e`, from `3.0/Main` at `6d1f6a2f`.

- `src/places/abbreviations.ts`: the pure generator. `nameVariants` normalises (brackets as a second name, 제N and a trailing number or Roman numeral dropped, 및 read as a space, a Latin prefix dropped when more than a head is left), `chunksOf` cuts a word into a head from a list of 32 heads and, before it, morphemes from a list of 47 campus proper nouns and loanwords, pairs of syllables otherwise, a lone syllable joining the chunk before it. The rules in: R1 and R1′ (a one-syllable head gives no initial, so 관정관 is not 관관), R2 only for a unit of four syllables or more (체육관 is not 체관), R3, R4, R6 only on a single word, each word of a multi-word name, and R7, the word without its first chunk when it has three or more (두산인문관 is an 인문관, 호암교수회관 a 교수회관), which note 08 does not list. R5 is out.
- `src/places/place-aliases.ts`: tier 2's seam, `PlaceAliases.lookup(query, userId)` answering `{ placeId, source }` with `source` one of personal, global or curated. `src/places/place-groups.ts`: the curated group table (`PLACE_GROUPS`, numbers per group, marked unverified) and `CuratedGroups`, the only alias source today, which resolves numbers to ids at load and drops numbers the catalog lacks.
- `src/places/place-index.ts`: `PlaceIndex`, the tiers over `PlaceDto[]` and the alias sources. `src/places/place-matcher.ts`: the Nest provider that builds the index from the Place table once at start, as `PlaceLookup` does. `resolvePlace` takes the matcher; its tool description and `none` reason mention short forms. `PlacesService.search` and `GET /places/search` are unchanged: sharing the deterministic part would have changed the pickers' results (학관 would stop listing 공학관).
- `byNumber` in `places.service.ts` now takes any `{ number, name }`, so that it sorts DTOs too.
- es-hangul 2.4.0 added for `getChoseong`, `canBeChoseong` and `disassemble`.

Measured on the seed's 255 rows (240 distinct names, 185 bases once numbered siblings such as 자연과학관1…10 are one), with the rules above:

| | Forms per name | (name, form) pairs | Distinct forms | Forms naming 2+ bases | 초성 keys shared by 2+ bases |
|---|---|---|---|---|---|
| Rules as built | mean 5.04, median 5, p90 8, max 21 | 1,210 | 860 | 107 (12.4%) | 137 of 748 (18.3%) |
| Without R4 | mean 4.35 | 1,045 | 720 | 98 (13.6%) | 111 of 664 (16.7%) |
| Without R7 | mean 4.52 | 1,084 | 768 | 91 (11.8%) | 120 of 679 (17.7%) |
| With R5 | mean 5.38 | 1,291 | 927 | 110 (11.9%) | 153 of 801 (19.1%) |

- R4 stays: 농생대 and 생과대 need it, and its forms are mostly unique, so the collision rate falls with it. R7 stays: its 12 added collisions are the ones wanted, 인문관 naming 두산인문관 and the corridor beside the 인문관 buildings, 공학연구소 naming two, which turn false `one` answers into `several`. R5 stays out: no example needs it and it raises the share of shared 초성 keys most.
- Seven names give no form: 근대법학교육100주년기념관 (digits inside), 웅진R&D센터 (Latin inside), LG연구동 (a head after the prefix), 공관, 자하연, 학군단 (nothing shorter than two syllables) and 901. Each still matches by its exact name or number.
- ㅎㄱ names 13 bases (note 08 measured 15 with its looser chunking). The worst colliders are 공대, 관악사, 반도체, 공학연구소 and 국제, each naming four bases.
- The examples: 학관 → 학생회관, (관악사)학부 생활관 and 유회진 학술정보관, 학생회관 first; 중도 → 중앙도서관 본관 and 관정관; 관정 → 관정관 alone; 농생대, 학식 and 체육 as expected (체육 also names 체육문화교육연구동); 배민, 코노 and 밥약 generated; 보겜, 알바 and 스카 not. Eight 공학관 numbered rows and 제1·제2공학관 answer 공학관 as ten candidates; 해동첨단공학관 shortens to 첨단공학관, not 공학관.
- Known limits: a sponsor-like prefix of one chunk is the only prefix dropped, so 국제관 names 대림국제관 and BK국제관 but a longer qualifier is kept; a name with digits or Latin letters inside gives no form; the subsequence tier is anchored at the first syllable, so a later word alone (정보관 for 유회진 학술정보관) is found only as a generated word form.

Tests: `test/abbreviations.unit.test.ts` and `test/place-matcher.unit.test.ts` (the index over the campus map's seed names, each tier, the group table dropping an unknown number); `test/assistant-resolvers.integration.test.ts` now expects 공학관 as ten candidates with no more, 학관 as 학생회관 first with the two others, ㅎㄱ as ten of more with 학생회관 among them, and 공대 from the group; `test/eval-cases.integration.test.ts` requires 학관 in exactly the two abbreviation cases, the making-parties one expecting ASK naming 학생회관 and the menus one still a known failure (getMenus's restaurant filter is untouched), and its world facts expect 학생회관 in the answers to 학관 and ㅎㄱ and no 공학관 for 학관. `eval/cases/making-parties.yaml`: the 학관 case expects ASK with 학생회관 mentioned. The paid eval harness was not run.

### Agent usage (2026-10-26)

- Agent time: about 25 minutes (estimate), one session in its worktree, no subagents.
- Tokens (estimate): about 7.6M input, of which about 7.3M cache reads, 309k cache writes and 870 uncached, and about 116k output. With cache reads excluded, about 426k.

### For the team to decide

- **수의대 misses 수의과대학** (live run of 2026-10-29, ticket 05, Comments). The generated tier answers 수의대 with the two Places whose names start with it, 수의대부속동물병원 (80동) and 수의대시약보관창고 (85-1동), and never 수의과대학 (85동), so the right Place is not among the chips and cannot be taught by a tap. 생과대 → 생활과학대학 and 농생대 → 농업생명과학대학 work, so the gap is the form X과대학 → X대 (수의과대학 → 수의대, 자연과학대학 → 자연대, 사회과학대학 → 사회대). A rule for it is small; run `pnpm eval:replay --development` before and after, since the development gold holds those words. 경영대 (SK경영관, LG경영관) and 대운동장 (종합운동장) stay `none` for the rules and can only come from the curated groups or from learned aliases, which ticket 03 says they cannot be taught either.
