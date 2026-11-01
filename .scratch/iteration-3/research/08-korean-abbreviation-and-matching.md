# Korean abbreviations: deterministic generation and matching for campus names

Research note, 2026-10-26. Question: how students shorten campus Place names and activity words (학관, 중도, 윗공, 관정, 배민, ㅎㄱ), which rules produce those forms from a catalog name without learning, how a typed form is matched to the catalog, how to evaluate that, and which layer to build first. Jamo arithmetic, 초성 keys and es-hangul basics are in [note 03 section 4](03-grounding-retrieval-safety.md#4-korean-matching-jamo-and-초성) and are not repeated. Learning from user choices is in [note 05](05-self-improving-assistant.md).

## How to read this note

- Ten web searches or fetches were allowed and all ten were used: five searches (three for abbreviation literature, one for a JS segmenter, one for public data) and five fetches (one a redirect). Each claim cites a source id. **(inference)** marks our reasoning. **unverified** marks what was not confirmed in an opened source. Ids marked "snippet" were seen only as a search-result summary, never opened; treat them as leads.
- The local evidence (L2) is a Python run of the rules in section 2 over the 250 rows of the seed catalog (L1). The script lived in the session scratchpad and was not kept; section 2 lists every rule, so it can be rewritten in TypeScript as the first test of the real generator.

## Sources

| Id | Source | Read | Supports |
|---|---|---|---|
| L1 | `main-server/seed/campus-map-places.json` (exported from map.snu.ac.kr on 2026-10-02, 250 rows, 236 distinct names) `main-server/src/assistant/tools/resolve-place.ts` and `main-server/src/places/places.service.ts` | Local | Catalog names and numbers; today's `search` filters the whole list in memory by lower-cased substring of the name or by building number (a trailing 동 removed) |
| L2 | Python run of the section 2 rules over L1, 2026-10-26 | Local | Candidate counts, collisions, 초성 ambiguity, coverage of examples, scan time |
| K1 | Kim Hae-yeon (김해연), "한국어 줄임말의 사회언어학적 고찰 / A Sociolinguistic Analysis of Abbreviations in Korean", 사회언어학 16(2), 2008, pp. 169–192: https://cau.scholarworks.kr/handle/2019.sw.cau/31529?mode=full | English abstract | Abbreviation types in Korean; which type dominates; conditions of use |
| K2 | 국립국어원, 2002 article on 줄인 말 in 통신 언어: https://korean.go.kr/nkview/nknews/200201/42_5.html | Snippet | General-language pairs: 알바, 정모, 강퇴, 야자, 공구 |
| K3 | 국립국어원 20-year history page: https://korean.go.kr/niklintro2/20years05_03_02.jsp | Snippet | Yearly 신어 survey reports and their word counts |
| K4 | Gorman et al., "Structured abbreviation expansion in context", Findings of EMNLP 2021, pp. 995–1005, arXiv 2110.01140 | Snippet | The closest abbreviation-expansion dataset found, which is English |
| K5 | Kiwi analyser paper, 한국디지털인문학 v.1: https://accesson.kr/kjdh/v.1/1/109/43508 | Snippet | Kiwi's reported disambiguation accuracy |
| K6 | wikidocs page on Kiwi: https://wikidocs.net/381154 | Snippet | npm package `kiwi-nlp` exists, version 0.19.0 |
| J1 | es-hangul type declarations, `https://unpkg.com/es-hangul/dist/index.d.ts` (latest on unpkg on 2026-10-26; the file states no version) | Full file | Exported API |
| J2 | Hangul.js README: https://raw.githubusercontent.com/e-/Hangul.js/master/README.md | Full page | `search`, `Searcher`, `rangeSearch`; maintenance status |
| P1 | PostgreSQL 18 docs, F.35 pg_trgm: https://www.postgresql.org/docs/current/pgtrgm.html | Full page | Trigram extraction, thresholds, operators, index support |

Searched and **not found**: a Korean NLP paper on abbreviation generation or expansion with reported rule coverage, and a downloadable Korean abbreviation–full form dataset. Leads from memory, **unverified**: Chinese abbreviation prediction treats each character of the full form as keep or skip (Sun, Okazaki and Tsujii, ACL 2009; Zhang and Sun's dataset with negative full forms, 2018). Chinese characters behave like Sino-Korean syllables, so those papers are the nearest method. Check them before citing.

## 1. How Korean words are shortened

**What the literature found**
- K1 starts from the four English types: initialism, acronym, clipping and blending. It finds that "the distinction between initialism and acronym does not hold" in Korean, because the script is syllabic. A Korean acronym keeps whole syllables, and the acronym is the most widely used type.
- K1 names two motives, economy and distinctiveness. It says use depends on knowledge of the referent shared by speakers and on meanings exclusive to a speech community. The abstract gives no formation rules, counts or examples.
- **(inference)** "Shared within a community" is why 학관 and 윗공 exist only at SNU. A general Korean lexicon will not contain them, and they have to be generated from the catalog or learned from SNU users.
- K2 lists general-language pairs (snippet): 알바 (아르바이트), 정모 (정기 모임), 강퇴 (강제 퇴장), 야자 (야간 자율 학습) and 공구 (공동 구매).
- **(inference)** Four of these five take the first syllable of each word, and 야자 also drops the third word. 알바 is a contraction (아르 → 알), not a selection of syllables.
- No paper with a measured share per rule was found (see Sources), so **no coverage number can be given**. The coverage figures in section 2 are our own small checks on hand-picked examples.

**Types we must handle (inference, examples from the brief and L1)**

| Type | Example | Rule | Needs word boundaries? |
|---|---|---|---|
| Initial syllable of each word | 중앙·도서관 → 중도; 정기·모임 → 정모; 코인·노래·방 → 코노 | First syllable of each morpheme, often only the first two | Yes |
| Initial plus head | 학생회관 → 학관; 학생·식당 → 학식 | First syllable plus the last (head) syllable or the head's first | Partly |
| Clipping to one word | (중앙도서관) 관정관 → 관정; 자하연식당 → 자하연 | Keep one word, drop the head | Yes, or spaces |
| Dropping a suffix | 체육관 → 체육 | Remove 관, 동, 센터 and similar | No |
| Contraction | 보드게임 → 보겜; 아르바이트 → 알바 | Syllables merge phonologically | Not generable by selection |
| 초성 typing | ㅎㄱ for 학관 | Initial consonants of an abbreviation | No |
| Mixed forms | ㅎ관 | Each position is a full syllable or its 초성 | No |
| Group names | 공대, 자연대, 윗공(대) | Name a group of buildings, not one row | Not in L1 at all |
| Numbers | 301동, 301 | Building number | No; `number` column (L1) |

## 2. Generating candidates from a catalog name

**Rule set used in L2**
1. Normalise the name:
   - Remove `(…)` and `[…]`, and the prefix `관악 N동`. If nothing is left, use the bracket text: `관악 300동[유회진 학술정보관]` becomes 유회진 학술정보관.
   - Remove a leading ordinal `제N` and trailing digits or Roman numerals: 제1공학관 → 공학관, 자연과학관4 → 자연과학관.
   - Split on spaces into words and keep only Hangul words.
2. Segment each word into chunks without a segmenter:
   - Strip a known head from the end. The longest heads are tried first: 학술정보관, 도서관, 연구소, 연구동, 연구원, 대학원, 생활관, 기념관, 실험동, 강의동, 교육관, 회관, 센터, 식당, 대학, 창고, 관, 동, 원, 소, 실, 장.
   - Cut the rest into two-syllable chunks from the left. Sino-Korean morphemes are mostly two syllables (inference).
3. Generate, for the whole name and, when it has several words, for each word on its own:
   - **R1**: the first syllable of each chunk.
   - **R1′**: the first two of those syllables.
   - **R2**: the first syllable plus the last syllable.
   - **R3**: the first chunk alone.
   - **R4**: two initials plus the last syllable, and two initials plus the head's first syllable.
   - **R5**: the first chunk plus the head's first syllable.
   - **R6**: the name with one suffix dropped (관, 동, 센터, 원, 소).
   - Keep forms of at least two syllables, and drop a form that equals the full name.
4. Store each form's 초성 key (`getChoseong`, J1).

**Results on the catalog [L2]**
- Candidates per name: mean 5.29, median 6, 90th percentile 8, maximum 19. The maximum comes from multi-word names such as 유회진 학술정보관.
- Collisions:
  - 236 names give 1,249 (name, form) pairs and 891 distinct forms. When the numbered siblings that share one normalised base (자연과학관1…10) are merged, 169 bases remain.
  - 785 of the 891 forms (88.1%) name exactly one base, and 106 (11.9%) name two or more.
  - The worst are 자연 (6 bases), 호암 (5), and 사범, 사관, 반도, 반체 and 공대 (4 each). 학관 names three bases: 학생회관, (관악사) 학부 생활관 and 유회진 학술정보관.
- 초성 keys are far more ambiguous:
  - There are 509 keys, and 170 of them (33.4%) belong to more than one name.
  - ㅎㄱ, the 초성 of a generated form, matches 15 of the 169 bases. Two consonants are too few to single out a Place.
- 13 names generate nothing:
  - Names with a Latin prefix: SK경영관, IBK커뮤니케이션센터, CJ어학관 and similar.
  - Names with digits inside: 근대법학교육100주년기념관.
  - The two-syllable 공관.
  - 제4식당(서당골), whose everyday name is in the parentheses step 1 removes.
- **(inference)** Brackets often hold the name students use: 서당골, (관악사), (음대), (미대). Generate from the bracket text as a second variant rather than dropping it.

**Coverage of the examples (hand-picked, so illustrative and not an estimate) [L2]**
- Places generated:
  - 학관 → 학생회관
  - 중도 → 중앙도서관 본관 (and 관정관)
  - 관정 → 중앙도서관 관정관
  - 농생대 → 농업생명과학대학
  - 학식 → 제3학생식당
  - 체육 → 체육관
- Places not generated: 자연대, 공대 and 윗공. Each is a group name with no single row in L1.
- Activities and general words: 14 pairs were tried (학식 is counted with the Places), and 11 were generated.
  - Generated: 배민 (배드민턴), 코노, 방탈, 밥약, 술약, 동방, 과스, 정모, 강퇴, 야자 and 공구.
  - 보겜 and 알바 were missed. They are contractions.
  - 스카 (스터디카페) was missed because 스터디 has three syllables and the cut fell inside it.

**Segmenter or syllables? (inference unless cited)**
- Syllables alone are enough for R2, R6, 초성 keys, numbers and clipping at spaces.
- R1, R1′, R3, R4 and R5 need morpheme boundaries. The two-syllable cut gets Sino-Korean compounds right but splits three-syllable proper nouns and loanwords wrongly: 자하연식당 gives 자하·연, and 스터디카페 loses 스카.
- A JS segmenter exists: the npm package `kiwi-nlp`, version 0.19.0 (K6, snippet). Its analyser reports about 86.7% disambiguation accuracy (K5, snippet).
- Whether `kiwi-nlp` is a WebAssembly build, how large it is and what its API looks like are **unverified**.
- Generation runs once per catalog change, not per query. A hand-kept head list plus a `segments` override for the few proper nouns (자하연, 관정, 버들골, 서당골) is cheaper than adding an analyser to the server. If an analyser is used at all, run it at build time.

## 3. Matching a typed form to the catalog

**Libraries**
- **es-hangul (J1)** exports these decomposition helpers: `getChoseong(word, { keepNonHangul })`, `disassemble`, `disassembleToGroups`, `assemble`, `combineCharacter`, `canBeChoseong`, `removeLastCharacter` and `hasBatchim`. It also exports other helpers: `josa`, `romanize`, `standardizePronunciation`, number readers, and QWERTY↔Hangul conversion.
- es-hangul exports no search, includes, match or distance function. The matching logic is ours to write.
- `convertQwertyToHangul` (J1) can repair a query typed with the keyboard left in English (gkrrhks → 학관), which is cheap to try when a query has no Hangul (inference).
- **Hangul.js (J2)** has `Hangul.search(a, b)`, which uses a keystroke model and so matches unfinished syllables: `Hangul.search('도우미','도움')` returns 0. It also has `Searcher`, which decomposes the query once for many targets, and `rangeSearch` for highlighting.
- Hangul.js has no 초성 search, and the README says it is in low maintenance and recommends es-hangul (J2).
- **(inference)** Use es-hangul for decomposition and write the matchers below, about 100 lines with tests.

**Matchers, cheapest first [L2 measurements on 169 bases]**

| Matcher | 학관 | 관정 | ㅎㄱ | Note |
|---|---|---|---|---|
| Substring (today, L1) | 0 | 0 | 0 | Misses every abbreviation |
| Generated form, exact | 3 | 1 | — | High precision; collisions as in section 2 |
| 초성 of generated forms | — | — | 15 | Right recall; needs ranking |
| 초성 prefix of the name | — | — | 3 | Misses 학생회관 |
| 초성 subsequence of the name | — | — | 61 | Unusable |
| Syllable subsequence anchored at the first syllable | 2 | 0 | — | Misses clipped later words |
| Syllable subsequence anywhere | 18 | 1 | — | Too loose |

- **Mixed forms (ㅎ관, 학ㄱ).** Compare position by position against the generated forms of the same length. A consonant jamo matches any syllable with that 초성, and a full syllable must be equal. A last syllable still being typed (하 on the way to 학) is a prefix match on `disassemble` strings, which is what J2's keystroke model does (inference).
- **Typos.** Levenshtein distance over `disassemble` output separates 학곤 from 학관 by one jamo. Neither library provides a distance function (J1, J2). Allow a distance of at most 1 for two- or three-syllable queries and use it only as the last tier (inference).
- **Postgres pg_trgm (P1).** It drops non-alphanumeric characters and pads each word with two spaces before and one after. The default thresholds are 0.3 for `%`, 0.6 for word similarity and 0.5 for strict word similarity. GiST indexes support `ORDER BY <->`, and GIN indexes do not. The page does not say how non-ASCII letters are classed (P1), so whether Hangul counts as alphanumeric under our database locale is **unverified**.
  - Even if Hangul counts, the padding rule gives 학관 the trigrams {"  학", " 학관", "학관 "} and 학생회관 the trigrams {"  학", " 학생", "학생회", "생회관", "회관 "}. One trigram is shared, so the similarity is 1/7 ≈ 0.14, below the 0.3 default (inference from P1's definition).
  - Trigrams measure overlapping strings, which suits typos and partial words. Abbreviations select syllables and leave most trigrams behind. Doing the same over `disassemble`d jamo raises the overlap but does not make it aware of abbreviations (inference).
- **Cost.** 169 bases and 1,249 forms fit in a `Map` in each server, so exact and 초성 lookups take O(1). A scan over all names is O(N·L) with L ≤ about 15 syllables. In Python the anchored-subsequence scan took 0.62 ms per query [L2], and TypeScript should be in the same range or faster (inference). `PlacesService.search` already filters the whole list in memory (L1). So keep the Places and learned aliases in Postgres, rebuild the generated forms in memory from the table, and use no pg_trgm index.

**Ranking (inference)**
- Return the first tier that is not empty, and do not mix tiers:
  1. exact name or building number;
  2. learned alias, personal first and then global (note 05);
  3. generated form, exact;
  4. 초성 or mixed match on generated forms;
  5. anchored syllable subsequence on the name;
  6. jamo edit distance ≤ 1.
- Within a tier, order by the learned choice counts (note 05), then by fewer syllables skipped, then by shorter name.
- One hit returns `one` and several return `several`, which keeps the resolver's "never guesses" contract (note 05, `resolved.ts`).
- Not mixing tiers keeps a single generated hit (관정 → 관정관) from being outvoted by loose subsequence hits.

## 4. Evaluation

**Public data**
- No downloadable Korean dataset of abbreviation–full form pairs was found.
- The nearest expansion dataset is English, ad hoc abbreviations built from Wikipedia (K4, snippet).
- 국립국어원 published yearly 신어 reports, with 2,947 words in 2000 and 2,884 in 2001 (K3, snippet). Whether they are released as pairs is **unverified**, and they are not about the campus.
- K2's general pairs can serve as a sanity test of R1. They cannot measure campus coverage, because campus forms belong to the SNU community (K1).

**Building a gold set (inference)**
1. **Items.** Each item is (typed form, set of acceptable catalog ids, or `none`). Aim for at least 100 forms over at least 60 targets, mixing popular Places (학생회관, 중앙도서관, 301동) with rare ones, plus the activity words of the Quest form. Allow several acceptable ids where students really mean several: 중도 may mean the 본관 or the 관정관.
2. **Collection without priming.** First ask 10–20 students to write, as they would in KakaoTalk, where they went or would meet this week, without showing full names. Then show full names and ask for their short forms. Showing names first biases toward forms that can be derived from them. Record the collector, the date and the prompt type.
3. **`none` items.** Add 15–20 forms that name nothing in L1: group names before a group table exists, off-campus places such as 샤로수길, and random syllables. These measure false links.
4. **Splits by date.** Use the first wave as the development set, where heads, rules and bracket handling are tuned. The second wave, at least a week later, is the frozen test set. Later, in-app `resolution_events` (note 05) become a third, time-split set.
5. **Labels.** Two people label each item's targets on their own, and their agreement is reported.

**Metrics, per tier and per stage**
- Top-1 accuracy: the gold set holds the first candidate.
- Recall@k for the candidates shown on `several`.
- Resolution rate: the share answered `one` with no clarifying question.
- Precision of `one`: a wrong confident link costs more than a question (note 03).
- The `none` rate and the false-`none` rate.
- Mean candidates shown.
- Collision rate of the generated forms: 11.9% on L1 [L2].
- Report n and Wilson intervals, since n is about 100. Attribute each resolved item to the tier that answered it.

## 5. Judgement

**Build first (minimal deterministic layer)**
- **`abbreviations(name): string[]`**, a pure function with unit tests on the examples above. Rules:
  - Step 1's normalisation, with the bracket text kept as a second variant.
  - The head list with two-syllable chunks, and a small `segments` override for proper nouns.
  - R1, R1′, R2, R3 and R6, applied to the whole name and to each word.
  - R4 and R5 only if the development set shows they earn their collisions.
  - Forms are computed when the catalog loads, not stored by hand.
- **The 초성 key** of every name and generated form, from `getChoseong` (J1), queried only when the input is all consonants. The mixed-form matcher compares position by position.
- **The tiered matcher** from section 3, behind the existing `resolvePlace` contract.
  - Substring and number matching stay as tier 1.
  - Learned aliases plug in as tier 2 when note 05's work lands.
  - Today `resolvePlace` returns `none` for 학관 and ㅎㄱ (note 05), so the gain is visible on the first day.
- **A small hand-written group table** for 공대, 자연대, 윗공대, 인문대, 사회대, 사범대, 농생대 and similar, each mapped to its buildings.
  - No rule can derive a group from single rows [L2], and a group legitimately answers `several`.
  - Which buildings 윗공대 covers is **unverified** and must come from students.
  - Count these seeded entries separately from learned aliases in every metric (note 05).

**Leave to learning (note 05)**
- Ordering collisions: 학관 between 학생회관, 학부 생활관 and 유회진 학술정보관, and ㅎㄱ across 15 bases [L2].
- Contractions (보겜, 알바) and coinages no rule reaches.
- Personal nicknames.
- Proper-noun splits the heads miss, until someone adds them to the override.

**Why this strengthens the technical-depth claim (inference)**
- Without generation, an unseen abbreviation returns `none`. Learning then has to discover the mapping, for example from a User who types 학관, fails, and retypes 학생회관 (the reformulation mining in note 05).
- With generation, the same input returns a short `several` list on the first day with no users. One tap is a labelled choice among candidates the rules proposed, so learning only orders known candidates. That needs fewer events and is harder to poison, because a learned alias can only promote a candidate the rules or the catalog already produced.
- The measurable before/after uses the dated test set:
  - **A**: today's substring and number matcher.
  - **B**: A plus generated forms, 초성 and the group table.
  - **C**: B plus aliases learned from the earlier-dated items only.
- Report resolution rate, precision of `one`, recall@k and top-1 for each stage, with n and intervals.
  - The expected shape is that A is near zero on abbreviations, B raises recall but answers `several` often (11.9% of forms collide and 33.4% of 초성 keys are shared [L2]), and C turns those `several` answers into correct `one` answers.
  - That curve, with the split by date, is the evidence for "it gets smarter from use". The rules alone supply the baseline that a reviewer would otherwise call trivial.
