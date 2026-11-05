# P05 AI 개편안: 수집(A·B)과 채팅(C·D)의 구조

작성 2026-11-03. `3.0/Main` `0e08f839` 기준. 입력은 `p05-ai-failure-analysis.md`(2026-11-02, 이하 "분석 문서")와 `검색 개선 단계 (0-2단계).md`(이하 "검색 단계 문서")입니다.

- **[확인]** 이번에 코드에서 직접 확인한 사실입니다.
- **[제안]** 이 문서가 고안한 방향입니다. 아직 아무것도 고치거나 재지 않았습니다.
- 숫자 효과는 모두 분석 문서의 [추정]을 그대로 가져왔습니다. 새 run은 돌리지 않았습니다.

## 0. 한 줄 요약

- **A·B:** 세션 하나에 "통과/불통과" 하나뿐인 문(`passed`)이 발행, Draft 채우기, 같은 행사 비교를 모두 막고 있습니다. **문을 셋으로 나누고**, 문을 지키는 검사 중 틀리게 막는 것(시각 파서, 캠퍼스 표시)을 고치고, 막아야 하는데 못 막는 것(글 안의 시각 충돌)을 새 검사로 더합니다.
- **C·D:** 모델이 검색 조건 정하기, 프롬프트 규칙 지키기, 후보 고르기를 한 루프에서 모두 합니다. 그런데 손에 쥔 것은 "확신하면 거르는 `board`"와 "순위만 매기는 `words`"뿐입니다. **확실한 규칙은 도구 안으로 옮기고**(의도별 도구), **검색은 서버가 넓게 모으고 판단 재료를 붙여 주고**, 프롬프트는 의도별 결정표로 줄입니다.

---

## 1. 지금 구조

### 1.1 수집: 글 → Judgement → 검사 → 같은 행사 → 발행

```
worker (snu_events, extra.snu 파서)
  └ POST events-collected → SourcePost + 회차별 Draft (규칙이 읽은 회차는 readByRules)
PublicationStepService.run(source)                          publication-step.service.ts
  1. 링크 규칙 attachLinked: 본문이 다른 글을 가리키면 번호순으로 붙이거나 hold   same-event.ts
  2. Judgement: 한 글에 모델 1회, 구조화 출력                 judgement-model.ts
       { announcesEvent, sessions[{start,end,place,overPeriod,lines{start,end,place}}] }
  3. checkedSessions: 12개 검사, 하나라도 false면 passed=false judgement-checks.ts
       linesInPost, dateAgrees, weekdayAgrees, timeAgrees, notApplicationPeriod,
       startBeforeEnd, hasTimeOfDay, length, placeInLines, placeMatches, newSession, announcesEvent
  4. same-event AI (후보가 남은 회차만)                        same-event-choice.ts
  5. settleJudged → settleJudgedSession                       session-settling.ts
       place === undefined 이면 아무것도 안 함  ← 여기
       compared(): 거절 규칙 → 제목·시작 동일 규칙 → AI 답 → attach / hold / publish
```

[확인] 핵심 사실 네 가지입니다.

1. **"모델은 아무것도 정하지 않는다"가 원칙입니다**(ADR 0008, `judgement-checks.ts` 머리 주석). 모델은 값과 그 값을 읽은 줄을 인용하고, 서버가 인용 줄을 다시 파싱해 값과 맞는지 봅니다. 이 원칙이 C2 0을 지켜 왔습니다.
2. **같은 행사 비교는 발행 검사를 통과하고 Place가 정해진 회차에서만 일어납니다.** `settleJudged`는 `places.get(session.placeId)`가 없으면 그 회차를 `written`에 넣기만 하고 `settleJudgedSession`을 부르지 않습니다. 분석 문서의 "B의 재현율은 A의 검사에 묶여 있다"는 이 한 줄 때문입니다.
3. **캠퍼스 가정은 Source 설정 하나(`buildingNumberIsGwanak`)와 정규식 하나(`BUILDING_NUMBER_ALONE`)뿐입니다.** 두 Source 모두 `true`인데, 건물 번호 + 층·호 말고는 쓰이지 않습니다. 이름이나 "번호 + 방 이름"은 `ON_CAMPUS`(서울대, SNU 등)가 글자로 있어야 합니다.
4. **worker의 extra.snu 파서는 회차 표 `#intlNsbjtLtrInfoList` 하나만 읽습니다.** 다른 표(a-065의 분반 표)는 본문으로도 들어가지 않습니다. Judgement에는 제목과 본문 글자만 가고 이미지는 가지 않습니다. 호출이 실패하면 오류 이름만 남습니다(`causeOf`).

### 1.2 채팅: 한 번의 `generateText` 루프

```
AssistantService.reply  → runFeature(model, chatAssistant, …)            adapter.ts
  system = chatRules(now) + FREE_TIME_RULES + LIBRARY_RULES + TUTORIAL_RULES
  tools  = 23개, 한 묶음                                                  chat-assistant.ts
     조회   searchGlobalEvents, searchRecruitingQuests, getMenus, getShuttle, findFreeTime*, findLibrary*, …
     해석   resolvePlace, resolveGlobalEvent, resolveFriend
     표시   showGlobalEvents, showQuests, showRestaurants, showOnMap, showLibrary*
     제안   proposeQuest, proposeLibrary*
  가드   FoundIds: 표시·제안 도구는 이번 메시지에서 조회·해석 도구가 돌려준 id만 받음
  제한   8 steps, 30 s, 단계당 출력 4,000, 재시도 0, 캐시 없음, 대화 20개
```

[확인] 검색 두 도구의 계약입니다.

| | `searchGlobalEvents` | `searchRecruitingQuests` |
|---|---|---|
| 거르기 (SQL) | 발행됨, 안 끝남, 창 겹침, `place` ILIKE | 들어갈 수 있음(자리, 이미 신청, Shared Quest, 시작 전), 창, `board`, `globalEventId`, `capacity`, `minPlacesLeft`, `placeId` 반경 |
| 순위 | `words` 중 제목·본문에 든 개수 → 시작 순 | 같음 |
| 결과 | 30개 + `more`, 설명 150자 | 30개 + `more`, `joinPolicy`, `placesLeft`, `holderCount` |
| 다음 페이지 | 없음 | 없음 |

- 판단 규칙은 대부분 `chatRules`의 문장입니다. "먼저 찾기"의 (i)–(viii), 게시판 확신, 관대한 고르기, 행사 질문은 둘 다 찾기 같은 것들입니다. 도구가 강제하는 것은 id 가드와 `proposeQuest`의 필드 검사뿐입니다.
- `proposeQuest`의 거절 문구가 다음 행동을 지시합니다. 게시판이 없으면 `'Missing: a 공개 파티 is posted on a Board. Ask the User which.'`입니다. **`join-36`이 게시판을 사용자에게 되물은 것은 이 문구대로 한 것입니다.**
- R1 작은 세계는 300실행에 입력 15.7M 토큰, 실행당 약 52K입니다. 23개 도구 정의와 4개 규칙 묶음이 매 단계 다시 갑니다. 캐시 읽기는 0입니다(A01이 해결할 몫).

---

## 2. 구조적 원인 (분석 문서의 원인을 구조로 묶으면)

| 구조 문제 | 드러난 실패 (분석 문서) | 고칠 곳 |
|---|---|---|
| **S1. 문이 하나** | A 원인 3·4, B 원인 1 (D3 8/32, 25쌍이 비교 전에 사라짐) | 검사 결과의 소비자 |
| **S2. 검사가 틀리게 막음** | A 원인 1 (a-058, a-064, a-029), 원인 3 | `judgement-time.ts`, `named-place.ts`, `judgement-checks.ts` |
| **S3. 검사가 막아야 할 것을 못 봄** | A 원인 4 (표와 본문의 시각 차이) | 새 검사 |
| **S4. 입력 손실** | A 원인 5 (분반 표, 이미지), 원인 6 (실패 원문 없음) | worker 파서, Judgement 입력, 실패 기록 |
| **S5. 시리즈가 없음** | B 원인 2 (D5 0/5) | 같은 행사 AI 입력·답 |
| **C1. 규칙이 프롬프트에만 있음** | C 원인 2·5·7 (J10, G1, `join-36`, `join-31`) | 도구 계약 |
| **C2. 검색의 막다른 길** | C 원인 1 (E9, `more: true` 141건) | 검색 서비스와 결과 형태 |
| **C3. 고르기의 재료 부족** | C 원인 3 (E4, E7, `large-v-*`, `search-h-*`) | 검색 결과 필드, 표시 도구 |
| **C4. 답 문구를 데이터가 받치지 않음** | C 원인 4 (J9 2/21) | 결과 필드 또는 서버 문장 |

---

## 3. A·B 개편안 (수집)

### 3.1 [제안] 문을 셋으로 나눈다: `SessionVerdict`

지금은 `passed` 하나가 발행 여부이고, 발행되지 않은 회차는 비교도, Draft 값 채우기도 되지 않습니다. 검사 목록은 그대로 두고, **검사 결과를 읽는 쪽에 세 가지 판정**을 만듭니다.

```ts
// judgement-checks.ts 옆, 새 파일 session-verdict.ts
interface SessionVerdict {
  // 사람 없이 발행: 지금의 passed와 같다. 새 검사(3.3)가 하나 더 붙는다.
  publishable: boolean;
  // 같은 행사 후보와 비교: 시작이 믿을 만하면 된다. 장소는 글자만 있어도 된다.
  comparable: boolean;
  // Draft에 값을 채워 관리자에게: 시작이나 장소 중 하나라도 검사를 통과했다.
  draftable: boolean;
  // 왜 발행되지 않았는지, 관리자 화면과 평가 리포트용
  blockedBy: JudgementCheck[];
}
```

| 판정 | 필요한 검사 |
|---|---|
| `comparable` | `announcesEvent`, `linesInPost`, `dateAgrees`, `weekdayAgrees`, `timeAgrees`, `notApplicationPeriod`, `startBeforeEnd`, `hasTimeOfDay`, `newSession` (**장소 검사와 `length`는 빠짐**) |
| `publishable` | 위 전부 + `length` + `placeInLines` + `placeMatches` + `timesConsistent`(3.3) |
| `draftable` | `linesInPost` + (시각 묶음 또는 장소 묶음 중 하나) |

**바뀌는 흐름 (`settleJudged`)**

```
for session:
  if publishable           → 지금처럼 compared() → attach / hold / publish
  else if comparable       → compared(), 단 결과가 attach가 아니면 publish 대신 Draft에 hold
                             (place가 없으면 AI에게 place 글자를 그대로 넘김)
  else if draftable        → Draft에 읽은 값을 채움 (sessions의 globalEventId 연결)
  else                     → 지금처럼 written만
```

- **D1 보호:** `comparable`만 된 회차의 자동 attach는 **두 조건이 모두 맞을 때만** 합니다. ① 제목·시작 동일 규칙(`matchAmong`)이나 AI `same`이고, ② 시작이 분까지 같습니다. 나머지는 `hold`로 큐에 보냅니다. 붙여서 생기는 일은 "이 글이 기존 행사 뒤로 숨는다"뿐이고, 새로 발행되는 것은 없으므로 C2와 C3에는 영향이 없습니다. [제안]
- **관악 밖 행사(`b-096`)도 비교됩니다.** 발행은 여전히 거절되고(`isElsewhere`), 비교만 합니다. 분석 문서의 "같은 행사 판별에는 시각만 믿을 수 있으면 충분할 수 있다"를 구조로 옮긴 것입니다.
- **기대 효과:** 분석 문서는 `placeMatches`만 없으면 후보가 되는 쌍을 최대 17/25로 셌습니다. 이 개편은 S2(캠퍼스 가정)를 고치지 않아도 그 17쌍을 비교 단계로 보냅니다. D2와 D3이 오르고, 늘어난 hold만큼 D4도 오를 수 있습니다. 분석 문서가 권한 대로 D4는 이 변경 뒤에 튜닝합니다.
- **평가 B 러너(`eval/collection/same-event-step.ts`)도** 같은 판정을 써야 B가 이 변경을 잽니다. 러너가 `passed`를 직접 읽는지 확인해야 합니다.

### 3.2 [제안] 틀리게 막는 검사 고치기 (S2)

분석 문서 우선순위 1번입니다. 구조는 그대로 두고 단위 테스트로 고정합니다.

| 고칠 곳 | 바꾸는 것 | 테스트 예 |
|---|---|---|
| `judgement-time.ts` `DAY` | 줄 앞 목록 번호 `^\s*\d{1,2}\.\s+`를 날짜의 연·월로 읽지 않음 | `1. 11월 2일(월) 오후 4–6시` → 11/2 하나 |
| `judgement-time.ts` `isWrittenClock` | `오전/오후 N[–~-]M시`의 N을 오전·오후가 붙은 시각으로 인정 | 같은 줄, 16:00 true |
| `judgement-checks.ts` `normalised` | `U+00AD`, `U+200B`(폭 없는 공백), `U+FEFF` 제거 | a-029 회차 2 |
| `named-place.ts` + `post-sources.ts` | Source 설정을 `buildingNumberIsGwanak: boolean`에서 **`campusDefault: 'gwanak' \| null`** 로 바꾸고, `namedPlace`에 `onCampus` 기본값으로 넘김 | 아래 표 |

**캠퍼스 가정을 어디까지 넓힐지 (P05 결정 3).** [제안] 두 단계로 나눕니다.

| 표기 | 예 | 1단계 (권장) | 2단계 |
|---|---|---|---|
| 번호로 시작 | `906동 3층 세미나실`, `222동 B102호 최병오홀` | 가정함 | 가정함 |
| 고유한 이름 | `행정관 앞 잔디광장`, `중앙도서관 관정관 3층` | 가정함 | 가정함 |
| **흔한 이름만** | `체육관`, `미술관`, `도서관`, `학생회관` | **가정 안 함** | 앞에 다른 고유명사가 없을 때만 |

- 흔한 이름은 `GENERIC_PLACE_NAMES` 목록으로 둡니다. 티켓 09의 `금나래문화체육센터 2층 체육관` → `71 체육관` 위험이 정확히 이 줄입니다. 지금 `wordPattern`은 앞뒤가 글자가 아니어야 맞으므로, `금나래문화체육센터 2층 체육관`의 `체육관`은 단어로 잡힙니다. [확인]
- C3 = 0을 지키는 시험 세 개를 먼저 씁니다. `금나래문화체육센터 2층 체육관` → null, `서울대학교 체육관` → 71동, `906동 3층` → 906동입니다.
- **3.3과 반드시 같이 넣습니다.** 분석 문서가 이미 쟀듯이 캠퍼스만 넓히면 a-015와 a-053이 시각 때문에 C2 바닥을 넘습니다.

### 3.3 [제안] 새 검사 `timesConsistent` (S3)

모델이 인용한 줄만 보는 지금의 검사는, 같은 글의 **다른 줄**이 다른 시각을 적어도 알지 못합니다. 서버가 글 전체를 훑습니다.

```
timesConsistent(session, lines):
  날짜 = session.start의 날짜
  그 날짜를 적은 모든 줄 (writtenDays로 찾음) 에서 시각 범위를 읽는다 (rangesIn, 새 함수)
  하나라도 session의 시작이나 끝과 다르면 false
  날짜만 있고 시각이 없는 줄은 무시
```

- a-053(표 17:00, 본문 19:00), a-015 회차 2(22:00과 21:00), a-017(19:00과 18:20)이 Draft로 남습니다. C2가 최우선이므로 기본은 "다르면 Draft"이고, 어느 쪽을 믿을지(P05 결정 4)는 정답을 확인한 뒤 정합니다.
- **표 줄 `[n회차] 기간: …`은 worker가 만든 줄입니다.** 여러 회차의 날짜가 같으면 다른 회차의 줄과 비교하게 될 수 있으므로, 회차 번호가 붙은 줄은 그 회차와만 비교합니다.
- `comparable`에는 넣지 않습니다. 시작 시각이 몇 시간 달라도 같은 행사 후보(±1일)는 같기 때문입니다.

### 3.4 [제안] 입력과 진단 (S4)

| 할 일 | 내용 | 비고 |
|---|---|---|
| 분반 표 | `parseExtraSnuPage`가 `#intlNsbjtLtrInfoList` 밖의 표도 `표: 머리 \| 값` 줄로 본문에 넣음 | 저장된 posts에서 손실 글 수를 먼저 셉니다 |
| 실패 원문 | `AI_NoObjectGeneratedError`의 `text`를 **평가 러너에서만** 저장 | 운영 로그에는 원칙대로 남기지 않습니다 |
| 이미지 | 제품 결정(P05 결정 2). 보내기로 하면 "본문에 시각 줄이 하나도 없는 글"에만 첫 이미지를 보내 비용 상한을 둠 | 보내지 않으면 C1 상한으로 기록 |
| 행사 정의 | 프롬프트와 GUIDE 중 하나로 맞춤(P05 결정 1). GUIDE를 따르면 `A contest, a call for applicants or members … does not`를 `A call for participants in a program people attend together is an event; a contest, a scholarship, a call for staff or members, or a notice with no gathering is not`로 | C6 최대 77/85 |

### 3.5 [제안] 시리즈 (S5)

- 같은 행사 AI의 후보에 `sessions: n`(그 후보 글의 회차 수)과 `overPeriod`를 더합니다.
- 답에 `answer: "same_session"` + `candidateSession: k`를 더하지는 **않습니다.** D1 위험에 비해 표본이 5쌍뿐입니다. 대신 후보가 시리즈 소개 페이지이고 AI가 `unsure`이면, hold 사유를 `series_hub`로 따로 남겨 관리자 큐에서 한 번에 처리하게 합니다. 지금의 "모르면 사람에게"를 유지하면서 D4 분석을 쉽게 합니다.

### 3.6 A·B 순서

1. **3.2의 파서 세 줄**: 저장 답 재생으로 확인합니다(무료). C1 +8회차 [추정].
2. **3.1 문 나누기**: 평가 B를 다시 돌립니다. D3과 D2가 움직이는지 봅니다.
3. **3.2 캠퍼스 1단계 + 3.3 `timesConsistent`를 같은 PR로**: 평가 A와 B를 다시 돌립니다. C2와 C3가 0인지 먼저 봅니다.
4. 3.4 행사 정의와 분반 표: 결정 1이 나면 평가 A를 돌립니다.
5. 3.5: D4를 본 뒤에 합니다.

1–3은 A01 기준선과 무관하게 할 수 있습니다. 모델 호출이 바뀌지 않기 때문입니다. 다만 2와 3의 run은 A01 머지 전후 중 어디서 돌렸는지 기록에 적습니다.

---

## 4. C·D 개편안 (채팅)

### 4.1 원칙

검색 단계 문서의 Onyx 원칙을 도구 계약 전체로 넓힙니다.

1. **확실한 규칙은 코드가 지킵니다.** "먼저 찾기", "말한 조건만", "비공개 요청은 찾지 않는다"는 문장으로 남겨 둘 것이 아니라 도구 입력의 모양으로 강제합니다.
2. **후보는 서버가 넓게 모으고, 모델은 작은 묶음에서 고릅니다.** 서버는 왜 걸렸는지(맞은 단어, 창과의 관계)를 같이 줍니다.
3. **모델의 결정은 단계마다 하나로 줄입니다.** "어떤 의도인가 → 어떤 도구인가 → 무엇을 고르나"를 프롬프트의 결정표로 둡니다.

### 4.2 [제안] 의도별 도구: `findPartiesToJoin`

지금 모집 요청의 흐름은 이렇습니다. 프롬프트 규칙 (i)–(viii)을 읽고 → `searchRecruitingQuests`의 인자 10개를 스스로 채우고 → 고르고 → 없으면 `proposeQuest`를 부릅니다. J10(말하지 않은 게시판), `join-31`(placeId 누락), `join-35`(globalEventId 누락), `ask-which-festival-event`(비공개인데 찾음)는 모두 **인자를 잘못 채운** 실패입니다.

모집 요청 전용 도구를 둡니다. 입력은 **사용자가 말한 것**만 받고, 규칙은 서버가 적용합니다.

```ts
findPartiesToJoin({
  activityWords?: string[],     // 사용자가 말한 활동과 그 비슷한 말. 없으면 모든 활동
  day?: 'YYYY-MM-DD',           // 말한 날. 없으면 서버가 오늘부터 7일
  time?: 'HH:MM' | '아침' | '점심' | '저녁',   // 서버가 ±30분이나 고정 창으로 바꿈
  placeWords?: string,          // 말한 장소. 서버가 resolvePlace와 같은 매처로 풀고 300 m
  people?: number,              // N명 → capacity N
  globalEventId?: string,       // resolveGlobalEvent나 [Cards shown]의 id. 주면 시각·장소·단어는 무시
  inviteeWords?: string[],      // 지명한 친구가 있으면 서버가 'closed'로 보고 찾지 않음
})
→ { result: 'found', quests: [...] }      // highest holderCount first, approval 표시
 | { result: 'none', reason, proposeNext: true }
 | { result: 'skip', reason: '비공개 파티라 찾지 않았어요' }
 | { result: 'ask', missing: ['activity', 'day'] }   // 둘 다 없을 때
 | { result: 'several', field: 'place', candidates }  // 장소가 여럿일 때
```

- **게시판 입력이 없습니다.** 활동 단어는 순위에만 쓰이므로, 말하지 않은 게시판으로 거르는 일이 구조상 생기지 않습니다(분석 문서의 게시판 수정 후보 1을 도구로 강제).
- **요일·시각 계산과 ±30분이 서버 코드가 됩니다.** 단위 테스트로 고정되고 프롬프트에서 다섯 줄이 빠집니다.
- **`proposeQuest`는 그대로 둡니다.** 다만 이번 메시지에서 `findPartiesToJoin`이 `found`나 `none`을 돌려준 뒤에만, 또는 사용자가 "새로"라고 했을 때만 받게 할지는 선택입니다. 서버가 "새로" 여부를 알 수 없으므로 `proposeQuest`에 `afterSearch: boolean`이 아니라 `newOnRequest: true`를 두고, 그것도 없이 검색 없이 부르면 `refused`와 "먼저 findPartiesToJoin"을 돌려줍니다. J1과 J7에 직접 닿습니다. [제안]
- **비용:** 도구가 하나 늘지만, 모집 흐름에서 `resolvePlace`와 `searchRecruitingQuests`를 따로 부르던 단계가 하나로 줄어 8단계 제한에 여유가 생깁니다.
- **P19 영향:** 찾기 질문(`finding-parties-exercise` 등)은 지금처럼 `searchRecruitingQuests`에 `board`를 쓰므로 그대로입니다. 모집 요청 케이스의 인자 기대(`searchRecruitingQuests` 호출)는 대체 목록(`revises:`)이 필요합니다. 영향받는 케이스는 PR 전에 찾아 같이 올립니다.

### 4.3 [제안] 검색 결과의 형태: 막다른 길 없애기와 판단 재료

**(a) `more: true` 대신 묶음 수를 줍니다.**

```json
{
  "result": "found",
  "more": true,
  "total": 141,
  "narrowBy": {
    "board": { "hobby": 58, "meal": 41, "show": 30, "career": 12 },
    "day":   { "2026-11-03": 37, "2026-11-04": 29 },
    "matched": { "게임": 4, "롤": 2 }
  },
  "quests": [ … 30 … ]
}
```

- 모델이 `more: true`에서 할 수 있는 일이 생깁니다. 그 단어가 걸린 수가 2라면 그 단어로 다시 찾을 필요가 없고, 게시판이나 날로 나눠 다시 찾을 수 있습니다. 집계는 같은 WHERE 절에 `GROUP BY`를 두 번 더하는 것이라 SQL 비용이 작습니다.
- 페이지 인자(`page`)는 넣지 않기를 권합니다. 30개를 더 읽는 것은 입력 토큰이 늘고 고르기는 더 어려워집니다. 집계가 있으면 좁히는 쪽이 낫습니다.

**(b) 후보마다 판단 재료를 붙입니다.**

| 필드 | 뜻 | 겨냥한 실패 |
|---|---|---|
| `matched: ['롤']` | 제목·설명에 든 검색 단어 | `search-t1-01` 7장, `large-n-02` 19장 (단어가 하나도 안 맞은 후보를 구분) |
| `window: 'starts' \| 'underWay'` | 창 안에서 시작하는지, 이미 진행 중이고 창과 겹치는지 | `search-h-*`의 사진전·판화전 (진행 중인 행사의 파티를 빼는 실패) |
| `join: 'open' \| 'askToJoin'` | `joinPolicy`를 답에 쓸 말로 | J9 |

- 단어 일치 개수는 SQL의 `moreWordsFirst`가 이미 계산하고 버립니다. 그 식을 SELECT에도 넣어 돌려주면 됩니다. [확인]

**(c) 단어 → 활동 별칭 사전 (검색 1단계 앞의 0.5단계).**

E9의 실패 단어(`롤`, `배그`, `코노`, `요아정`, `치맥`, `두쫀쿠`)는 오타가 아니라 줄임말과 은어입니다. 검색 단계 문서의 표대로 `pg_trgm`은 이것을 잡지 못하고, 임베딩은 8–12 h가 듭니다. 그 사이에 **서버 쪽 확장 사전**을 둡니다.

```yaml
# main-server/src/quests/activity-aliases.yaml (예)
게임: [롤, 리그오브레전드, 배그, 배틀그라운드, 발로, 오버워치, 플스, 스팀]
노래방: [코노, 코인노래방, 노래연습장]
디저트: [요아정, 두쫀쿠, 빙수, 케이크, 마카롱]
술: [치맥, 맥주, 소주, 포차, 이자카야, 술자리]
```

- 서버가 `words`의 각 단어를 사전으로 넓힌 뒤 순위를 매깁니다. 묶음 단위로 세므로 `게임`과 `롤`이 같이 맞아도 1로 칩니다(검색 단계 문서의 "흔한 단어가 점수를 독차지" 문제).
- **P07 별칭 기반(`3.0/P07-03-personal-and-global-aliases`)과 겹치는지 먼저 봅니다.** 장소 별칭 구조를 활동에 재사용할 수 있으면 두 사전을 하나로 둡니다.
- **held-out 오염:** 사전에 평가 케이스의 단어를 그대로 넣으면 E9가 의미 없어집니다. 사전은 실제 게시판 제목이나 일반 은어 목록에서 만들고, E9는 새 표현으로 만든 추가 세트로 함께 잽니다.

### 4.4 [제안] 고르기: 포함을 기본으로

`leave out only those that are clearly different`는 결과가 넓을 때 너무 많이 고르게 하고, 결과에 진행 중인 행사가 섞이면 너무 적게 고르게 합니다(분석 문서 C 원인 3). 문장 하나로 양쪽을 잡지 말고, **질문의 모양별 규칙**으로 나눕니다.

| 질문의 모양 | 규칙 | 근거 필드 |
|---|---|---|
| 시각·장소만 (활동 없음) | **결과 전부**, 20장까지 | 거를 근거가 없음 |
| 활동 있음 | `matched`가 있는 것 + 없더라도 제목이 같은 활동인 것 | `matched` |
| 이름을 댄 행사 | 그 `globalEventId`의 파티 전부 | — |

- 첫 줄은 표시 도구의 입력으로 강제할 수 있습니다. `showQuests({ fromLastSearch: true, except?: [...] })`를 두면, 모델은 넣을 것이 아니라 뺄 것을 적습니다. `large-v-03`처럼 11건 중 1건만 보이는 실패가 구조상 어려워집니다. [제안]
- E1(정밀도)과 함께 봐야 합니다. 활동이 있는 질문에서 `matched`가 없는 후보를 넣는 비율이 E1을 떨어뜨리는지, `--case`로 따로 읽습니다.

### 4.5 [제안] 답 문구를 서버가 받치기 (J9)

두 길이 있습니다. P05 결정 6입니다.

1. **서버 문장:** 보인 카드에 승인제 파티가 있으면 `FIXED_SENTENCE`처럼 서버가 한 줄을 붙입니다. "승인제 파티는 참여 신청 후 방장이 수락하면 참여돼요." J9는 결정적으로 통과하고, 모델 루프는 그대로입니다. 다만 모델이 이미 같은 말을 했으면 두 번 말하게 되므로, 답 글에 `승인`과 `신청`이 둘 다 있으면 붙이지 않습니다.
2. **프롬프트 규칙 + 결과 필드:** 4.3(b)의 `join: 'askToJoin'`과 "있으면 한 문장으로 말한다"는 규칙입니다. 분석 문서대로 어휘만으로는 11/21이라, 언급 자체를 하게 해야 합니다.

권장은 1입니다. 카드에 이미 참여 방식이 있고, 문구는 "말하지 않으면 실패"인 지표라 결정적으로 만드는 편이 싸고 확실합니다.

### 4.6 [제안] 작은 계약 수정

| 대상 | 지금 | 바꾸는 것 | 케이스 |
|---|---|---|---|
| `proposeQuest` 거절 문구 (`unready`) | `Missing: … Ask the User which.` | `Missing: choose meal, career, hobby or show from the activity; ask only when the activity fits none.` | `join-36` |
| `resolvePlace` | 여러 개면 `several` | 이름이 정확히 같은 Place가 하나면 `one` (#169의 단계별 매처가 머지되면 그쪽 규칙을 따름) | `search-r-04`, `large-r-04` |
| `searchRecruitingQuests` 설명 | `placeId`는 선택 | `resolvePlace`가 `one`을 돌려준 뒤 `placeId` 없이 부르면 결과에 `"note": "placeId was not given"`을 붙임 | `join-31` |
| 행사 파티의 `started` | 행사가 끝날 때까지 남김 | 서버 규칙과 케이스 중 어느 쪽이 맞는지 결정 (P05 결정 8) | `large-o-05` |

### 4.7 [제안] 시스템 프롬프트의 구조

지금 `chatRules`는 23줄 남짓의 규칙 목록이고, 찾기·모집·제안 규칙이 섞여 있습니다. 4.2–4.6을 넣으면 많은 규칙이 도구로 빠지므로, 남는 것을 **의도별 결정표**로 다시 씁니다. 다음은 찾기와 모집 부분의 골격입니다(영어는 지금 프롬프트와 같은 이유로 둡니다).

```
## What the User wants, and the first tool

| The User…                                  | First call                  | Then                         |
|--------------------------------------------|-----------------------------|------------------------------|
| asks what events there are                 | searchGlobalEvents          | showGlobalEvents             |
| asks for 파티 to join                       | searchRecruitingQuests      | showQuests                   |
| names neither 행사 nor 파티 ("오페라 있어?") | both searches               | both presenters              |
| asks to make or recruit a 파티              | findPartiesToJoin           | showQuests, or proposeQuest on none |
| asks for a 파티 with named Friends          | resolveFriend               | proposeQuest (closed)        |
| said to make a new one without looking     | proposeQuest (newOnRequest) | —                            |

Never call proposeQuest for a question that only asks what there is.

## Searching
- Board: give one only when the User named it (운동, 식사…). Otherwise search without one.
- Words: the User's activity and its related words; correct a typo. Never change a proper name.
- When the result says more, narrow by narrowBy (a Board or a day), not by guessing new words.

## Picking (see the result's matched and window)
- No activity asked: show all, up to 20.
- An activity asked: show those whose matched is not empty, and those whose title is plainly that activity.
- A 파티 underWay for a period event is in the window.
```

- **프롬프트 캐시와 함께 봅니다.** A01은 시스템 프롬프트 끝에 캐시 경계를 두고, 지금 시각이 시스템 프롬프트에 있어 운영에서는 메시지마다 캐시가 깨진다고 적었습니다(A01 Further Notes). 프롬프트를 다시 쓰는 김에 **지금 시각을 마지막 사용자 메시지 앞으로 옮기는 것**을 같은 run에서 잽니다. 행동이 바뀔 수 있으므로 별도 변경으로 기록합니다.
- 도구 23개를 메시지마다 모두 보내는 것은 그대로 둡니다. 도구 라우팅(의도별로 도구 묶음을 고르는 앞단 호출)은 30초 제한과 단계 수를 생각하면 지금 규모에서 이득이 불분명합니다.

### 4.8 C·D 순서

A01 기준선(티켓 03)이 나온 뒤 그 기준선과 비교합니다(분석 문서 6절). 변경은 **run 하나에 하나**를 지킵니다. 적어도 `--case`는 따로 돌립니다.

| 순서 | 변경 | 겨냥 | 위험 | run |
|---|---|---|---|---|
| 1 | 4.6 거절 문구, 4.5 서버 문장 | `join-36`, J9 | 낮음 | C `--case` 후 C 전체 |
| 2 | 4.3(b) `matched`, `window`, `join` 필드 | E4, E7, J9 | 낮음, 결과 토큰 조금 늘어남 | D 전체 |
| 3 | 4.3(a) `narrowBy` | E9, `more: true` 실행 | 낮음 | D 큰 세계 |
| 4 | 4.2 `findPartiesToJoin` + 4.7 결정표 | J10, G1, J1, J2 | 중간, P19 대체 목록 필요 | C 전체, P19 3번 |
| 5 | 4.4 `showQuests` `fromLastSearch` | E4, `large-v-*` | 중간, E1 확인 | D 전체 |
| 6 | 4.3(c) 별칭 사전 | E9 | 중간, held-out 오염 주의 | D + 추가 세트 |
| 7 | 검색 1단계 (`pg_trgm`, 키워드 묶음, RRF) | 오타, 후보 순위 | 중간 | D 전체 |
| 8 | 검색 2단계 (임베딩) | 뜻만 같은 말 | 높음, 인프라 | D 전체 |

---

## 5. 평가 구조에 더할 것

- **서버 재현율을 CI로:** 검색 단계 문서 6.1을 4.2·4.3에 맞춥니다. `findPartiesToJoin`의 창 계산, 별칭 확장, `narrowBy` 집계, "조건을 더하면 결과는 부분집합"을 단위·통합 테스트로 둡니다. D의 실패를 "서버가 안 줌"과 "모델이 안 고름"으로 가를 수 있습니다.
- **행동한 실행 기준 함께 보고:** J4, J8, J10은 행동하지 않으면 통과합니다(분석 문서 4.3). 리포트에 "해당 도구를 부른 실행" 분모를 더합니다.
- **A·B 리포트에 `blockedBy` 집계:** 3.1의 `blockedBy`를 회차별로 세면, 원인 표를 손으로 다시 만들지 않아도 run마다 나옵니다.
- **새 표현 세트:** 이 문서와 분석 문서 모두 held-out을 읽고 썼습니다. 별칭 사전(4.3c)과 행사 정의(3.4)는 특히 오염되기 쉬우므로, 고친 뒤에는 새 글과 새 표현으로 만든 추가 세트를 같이 잽니다.

## 6. P05 담당이 정할 것

분석 문서 5절의 8개에 이 문서가 더하는 것입니다.

1. 문 나누기(3.1)에서 `comparable`만 된 회차를 자동으로 붙여도 되는지, 아니면 전부 큐로 보낼지
2. 흔한 장소 이름 목록(3.2)을 누가 만들고 어디에 둘지
3. 모집 전용 도구(4.2)를 도입할지, 아니면 프롬프트 수정(분석 문서의 게시판 수정 후보 1)으로 갈지
4. J9를 서버 문장(4.5의 1)으로 받칠지
5. 별칭 사전(4.3c)을 P07의 별칭 기반과 합칠지
6. 지금 시각을 시스템 프롬프트 밖으로 옮기는 변경을 A01 뒤 첫 run에 넣을지

## 7. 읽은 것

- 수집: `publication-step.service.ts`, `judgements.service.ts`, `judgement-model.ts`, `judgement-answer.ts`, `judgement-checks.ts`, `judgement-time.ts`, `named-place.ts`, `post-sources.ts`, `same-event.ts`, `same-event-choice.ts`, `session-settling.ts`(`settleJudgedSession`), `same-event-choices.service.ts`(일부), worker `extra-snu-page.parser.ts`
- 채팅: `adapter.ts`, `feature.ts`, `assistant.service.ts`, `chat-assistant.ts`, `found-ids.ts`, `tools/search-*.ts`, `tools/resolve-*.ts`, `tools/show-*.ts`, `tools/propose-quest.ts`, `global-events/ranked-search.ts`, `common/search-sql.ts`, `quests/recruiting-search.ts`(`recruitingSearchIds`)
- 문서: 분석 문서, 검색 단계 문서, `iter3-p5 메트릭.md`(지표 표), A01 스펙, `eval/p5/r1.md`(앞부분)
- 읽지 않은 것: 평가 러너의 채점 코드, P07 별칭 브랜치, #169의 코드. 4.2의 P19 영향 케이스 수는 세지 않았습니다.

---

## 부록: P12 결정 (그릴링, 2026-11-05)

P05의 개선 작업은 **P12**이고, 스펙은 `.scratch/iteration-3/P12-<slug>/spec.md` 하나에 두 갈래(수집 A·B, 채팅 C·D)로 씁니다. 개선 전후 표는 하나이고, P20에 넣습니다. 담당은 Jaehyun0320입니다. 마감은 정해 두지 않았습니다(사용자가 일정을 조정하고, 마감 때문에 범위나 검증을 깎지 않음).

### 범위 ('중간')

| 작업 | 내용 | 겨냥 |
|---|---|---|
| AB-1 | 시각 파서: 줄 앞 목록 번호를 날짜로 읽지 않음, `오전/오후 N–M시`의 N을 시작으로 인정, `normalised`에서 `U+00AD`, `U+200B`, `U+FEFF` 제거 | C1 (a-058, a-064, a-029) |
| AB-2 | 평가 러너에서만 스키마 실패 응답 원문 저장. 운영 로그에는 남기지 않음 | C4 진단 (a-005, b-082) |
| AB-3 | 판정 셋(발행 가능, 비교 가능, Draft 채우기 가능)과 `blockedBy`. `settleJudged`가 비교 가능한 회차도 같은 행사 비교로 보냄. 평가 B 러너도 같은 판정 함수를 씀 | D2, D3 |
| AB-4 | 캠퍼스 가정 확대 + `timesConsistent`. 쪼개더라도 한 PR로 머지 | C1 목표, C2·C3 = 0 유지 |
| CD-1 | `proposeQuest` 게시판 누락 거절 문구를 "활동에서 고르라"로, `resolvePlace` 뒤 `placeId` 없이 검색하면 결과에 알림 줄 | `join-36`, `join-31` |
| CD-2 | 승인제 카드가 보이면 서버가 안내 한 줄을 붙임 | J9 |
| CD-3 | 검색 후보에 `matched`, `window`(시작함 또는 진행 중), `join` 필드 + 고르기 규칙 두 줄 | E4, E7, E1 |
| CD-4 | `more`일 때 게시판별·날짜별·단어별 개수(`narrowBy`) | E9, `more: true` 실행 |

뺀 것: `follow-up-yes-after-menus`(김태현 님 담당, #204), `findPartiesToJoin`(CD-5), 프롬프트 결정표(CD-6), 별칭 사전, 검색 1·2단계, 행사 정의(AB-5), 분반 표(AB-6), 시리즈(AB-7).

**우선순위** (시간이 모자라면 뒤에서부터 뺌): AB-1 → CD-1 → CD-2 → AB-3 → AB-4 → CD-3 → CD-4 → AB-2. 실제 티켓은 `/to-tickets`에서 다시 자르며, 이 8개와 1:1이 아닐 수 있음.

### 결정

1. **자동 붙이기 (가') 중간:** 비교만 가능한 회차는 ① 다듬은 제목(`normalisedTitle`: NFKC, 소문자, 괄호 부분 제거, 공백·문장부호 제거)과 시작이 같으면 붙이고, ② AI가 `same`이라고 답하고 시작이 분까지 같고 다듬은 제목 한쪽이 다른 쪽을 포함할 때만 붙입니다. 나머지는 같은 행사 큐로 갑니다. 발행은 하지 않습니다. **ADR 0014**(`docs/adr/0014-a-session-whose-place-fails-is-still-compared-as-the-same-event.md`)에 기록했고, 0013은 A01이 예약한 번호입니다.
2. **캠퍼스 범위:** `ELSEWHERE`(연건, 시흥, 서울대(학교)병원, 의과대학, 다른 대학교, 다른 구·시도, 아파트 등) 표시가 없으면 관악으로 봅니다. Source 설정 `buildingNumberIsGwanak`을 `campusDefault: 'gwanak' | null`로 바꿉니다. 흔한 이름(`GENERIC_PLACE_NAMES`: 체육관, 미술관, 도서관 등. 목록은 저장된 글의 장소 표기에서 뽑아 PR에 같이 올림) **앞에 다른 시설 이름이 붙으면** 거절합니다. `체육관`이나 `체육관 2층`만 단독으로 있으면 71동입니다. 먼저 고정할 시험은 `금나래문화체육센터 2층 체육관` → null, `체육관` → 71동, `906동 3층 세미나실` → 906동입니다.
3. **시각 충돌 (`timesConsistent`):** 날짜와 시각이 같이 적힌 줄끼리만 비교합니다. 시각만 있는 프로그램 순서표 줄은 비교하지 않습니다. 회차 번호가 붙은 worker 줄(`[n회차] 기간: …`)은 그 회차와만 비교합니다. **시작이나 끝이 다르면 Draft**입니다. 시작만 있는 줄 vs 시작–끝이 있는 줄, 표기만 다른 경우(`오후 2시` vs `14:00`)는 충돌이 아니며, 끝은 있는 쪽 값을 씁니다. 발행 가능 판정에만 넣고 비교 가능 판정에는 넣지 않습니다. 관리자에게 따로 알리는 기능은 만들지 않습니다. admin은 검사를 main server가 준 이름 그대로 보여 주므로(`admin/README.md:122`) 새 검사 이름이 자동으로 나타납니다.
4. **J9 서버 문장:** 보인 카드에 승인제 파티가 있고, 답 글에 "승인", "수락", "신청" 중 둘 이상이 없을 때만 한 줄을 붙입니다. 마지막 사용자 메시지에 한글이 없으면 영어로 붙입니다. P05 밖의 기능(공강 등)에도 붙으므로 P4 suite로 영향을 확인합니다.
5. **용어:** 새 용어는 만들지 않습니다. 용어집의 **Judgement** 항목("검사를 통과한 회차는 발행하고 나머지는 Draft")은 AB-3에서 동작과 함께 고칩니다.

### 측정

- **X(시작점):** `3.0/Main`에 `3.0/P11-04-chat`(#204, 끝 `4b2097cb`)를 로컬에서 merge한 커밋입니다. 티켓 브랜치는 X 위에 쌓습니다. #204가 머지되면 각 브랜치에 Main을 merge합니다(리베이스와 force push 없음). X 이후 Main에 들어오는 A01과 P07은 개선 후 세트를 마칠 때까지 들이지 않습니다. #204가 리뷰로 바뀌면 그 차이를 기록합니다. #204 머지 전에 PR을 올리면 본문에 P11 커밋 포함 사실을 적습니다.
- **개선 전:** 채팅만 X에서 새로 돌립니다(C·D 작은 세계, 큰 세계, P19 3번, 약 USD 4.3, 약 1시간 10분). 수집은 `464ea9c5` 이후 판단 코드가 바뀌지 않았으므로(그 뒤 커밋은 #168 채팅 검색과 #184 `places.exists()`뿐) 기존 `collection-held-out-*-464ea9c5` 결과를 씁니다.
- **개선 후:** **모든 티켓을 마친 뒤 한 번** 잽니다. 개선 전 세트와 같은 묶음에 평가 A·B, P4 suite(CD-2 영향)를 더합니다. AB-1만 저장된 답 재생(무료)으로 따로 잽니다.
- **영향 분석:** 각 티켓에 구현 **전에** "겨냥한 케이스와 예상 결과"를 적습니다. 마지막 run 뒤, 에이전트가 겨냥한 케이스의 trace로 "예상대로 / 다르게 / 판단 불가"를 판정합니다. 겨냥하지 않은 케이스가 움직인 것은 묶음 효과로 둡니다. 메트릭 4.4절("run마다 하나")을 어긴 것은 기록 맨 앞에 적습니다.
- **예산:** 개선 전과 후를 합쳐 약 USD 9입니다. 비용 승인은 run 전에 다시 여쭙니다. 무거운 작업(빌드, 테스트, run)은 한 번에 하나만 돌립니다.

### 그릴링 중 확인한 사실

- 평가 B 러너는 운영 로직을 복사해 두었습니다. `eval/collection/same-event-step.ts:54`가 `passed && number !== null && start !== null`로 비교할 회차를 고릅니다.
- `settleJudged`는 `placeId`로 Place를 못 찾은 회차에 `settleJudgedSession`을 부르지 않습니다. 그래서 장소 검사 실패가 곧 비교 제외입니다.
- 같은 행사 판별 순서(`compared()`): ±1일 후보 → 제목·시작 동일 규칙이 하나면 AI 없이 붙임 → 거절 규칙(같은 날 다른 시각, 회차, 대면/비대면, 역할)에 걸린 후보는 빼고 남은 것만 AI에게 물음. 남은 것이 없으면 AI를 부르지 않습니다. 지난 평가 B에서 **거절 규칙 때문에 놓친 진짜 쌍은 0개**였습니다(D3 = D2 = 8/32). 놓친 24쌍은 모두 비교 전 단계에서 빠졌습니다. AB-3 뒤에는 거절 규칙을 만나는 회차가 늘어나므로, 개선 후 run에서 같은 날 다른 시각으로 거절된 진짜 쌍이 있는지 봅니다.
- J9는 태그가 붙은 케이스 단위로 통과를 셉니다(`eval/p5/report.ts:258`, `tagPassed('J9')`). 카드와 답 문구 검사를 모두 통과해야 합니다.
- A01은 스펙만 머지됐습니다(#186). 모델 이전 PR은 아직 없습니다.
