# AI chat 개선안

- 작성: 2026-10-20 21:11 (KST)
- 검토 반영: 2026-10-21 (요약의 형식과 신뢰, 1-5와 3-4 통합, 3-2 전제 수정, 3-5 방법 변경 등)
- 기준: `2.0/Main`, 커밋 `ef3101d` (P07-08 머지 직후)
- 상태: 제안. 아직 구현하지 않음. 3번은 2026-10-20 논의에서 받아들이기로 한 것
- 측정 방법: [평가 하네스 만들기](eval-harness-plan.md)

## 배경: 지금 구조에서 빠진 것

- **턴과 턴 사이에 툴 기록이 남지 않는다.** 서버는 대화를 저장하지 않고, 앱이 요청마다 최근 20개 메시지를 보낸다. LLM이 이전 턴에 대해 아는 것은 세 가지뿐이다.
  - 사용자 말과 자기 답장 텍스트
  - `[Cards shown: quest <id>, …]`: 보여 준 카드의 id만
  - `[Proposal shown: {…}]`: 마지막 제안의 값

  어떤 툴을 어떤 조건으로 불렀고 결과가 무엇이었는지는 다음 턴에 모른다.
- **로그에 실패 원인만 남는다.** `The Assistant did not answer: <원인>` 한 줄뿐이다. 성공한 턴이든 실패한 턴이든 어떤 툴을 불렀는지는 볼 수 없다.

1의 요약과 2의 로그는 **같은 실행 기록**에서 만든다. 그래서 2를 먼저 하면 기록 구조가 정해지고, 1의 효과도 로그로 확인할 수 있다. 3은 받아들이기로 한 개별 개선이고, 일부는 1에 기댄다.

---

## 1. 직전 턴의 툴 호출 요약을 다음 턴에 넘기기

### 문제

| 사용자의 후속 말 | 지금 일어나는 일 |
|---|---|
| "그중에 내일 거만" | 이전 검색 조건(게시판, 기간)을 모른다. 자기 답장 텍스트에서 추측해서 처음부터 다시 검색한다 |
| "두 번째 거" (resolver가 several을 돌려준 뒤) | 후보 목록이 없다. 자기가 쓴 문장에서 이름을 찾아 다시 resolve해야 한다 |
| 동명이인 친구 | 이름으로 다시 resolve하면 매번 several이 나와서 **확정할 방법이 없다** |
| "더 보여줘" | 이전 검색에 20개 넘게 있었다는 사실(`more`)을 모른다 |

### 제안

직전 답장에 **툴 호출 요약**을 붙여서 다음 요청에 함께 보낸다. 지금 `[Proposal shown]`을 돌려보내는 방식을 넓히는 것이다.

LLM이 읽는 줄은 아래와 같다. 이 줄은 **서버가 만든다**(동작 방식 3).

```
[Tools used:
 searchRecruitingQuests board=hobby from=2026-10-20 to=2026-10-26 → found 7 (more: no), shown 3
 resolveFriend "민수" → several: <data label="friend.name">이민수</data> f-1, <data label="friend.name">김민수</data> f-2]
```

**넣는 것**
- 툴 이름
- 검색 조건: 게시판, 기간, 단어, 장소
- 결과 종류: `found`, `none`, `one`, `several`, `refused`, `proposed`
- 개수와 `more`, 보여 준 카드의 **개수**
- resolver 후보의 이름과 id

**빼는 것**
- 카드 id: 이미 `[Cards shown]`에 있다.
- 파티·행사의 제목과 설명 같은 본문. 이유는 세 가지다.
  - 토큰이 많이 든다. 검색 결과 하나가 수천 토큰이다.
  - 데이터가 금방 낡는다. 모집 마감, 셔틀 위치 등.
  - 다른 사람이 쓴 글이 대화 기록에 쌓여 프롬프트 인젝션 위험이 커진다.

**크기**: 한 줄에 20–60 토큰이다. **직전 답장 하나에만** 붙이면 요청당 수십 토큰이 늘어난다. 20개 메시지 전부에 붙이면 최대 수백 토큰이 늘어나므로, 직전 하나로 시작한다.

### 동작 방식

1. **서버 → 앱**: 응답에 요약 필드(`toolSummary` 등)를 추가한다. 요약은 **문자열이 아니라 구조**다.
   ```
   toolSummary: [
     { tool: "searchRecruitingQuests", conditions: { board: "hobby", from: "2026-10-20", to: "2026-10-26" },
       result: "found", count: 7, more: false, shown: 3 },
     { tool: "resolveFriend", words: "민수", result: "several",
       candidates: [{ kind: "friend", id: "f-1", name: "이민수" }, { kind: "friend", id: "f-2", name: "김민수" }] }
   ]
   ```
   서버는 저장하지 않으므로, 앱이 들고 있다가 돌려보내야 한다. 앱은 이 값을 화면에 그리지 않는다.
2. **앱**: 답장 말풍선에 요약을 보관한다. 다음 요청 때 **가장 최근의 성공한 답장**의 요약만 실어 보낸다. 실패 말풍선(503, 429)은 요약이 없으므로 건너뛴다. 지금 마지막 Proposal을 보내는 방식과 같다.
3. **서버**: 요청 스키마(zod)로 요약의 크기와 형태를 검사한다. 그 뒤 `contentOf`에서 `[Tools used: …]` 줄을 **직접 렌더링**하고, 다른 사람이 쓴 이름은 `othersText`로 감싼다. `[Proposal shown]`이 `proposalForModel`을 거치는 것과 같다.
   - **앱이 보낸 문자열을 그대로 LLM에게 넘기지 않는다.** 클라이언트가 delimiter나 지시문을 위조할 수 있기 때문이다.
   - 앱이 보낸 이름은 표시용으로만 쓴다. id를 받을 때(5번)는 DB에서 다시 읽은 이름으로 바꾼다.
4. **system prompt**에 규칙을 추가한다.
   - "그중에, 두 번째, 더" 같은 후속 말은 `[Tools used]`의 조건과 후보를 참고한다.
   - 데이터는 낡을 수 있으니, 카드를 보여 줄 때는 툴을 다시 부른다.
   - `[Cards shown]`, `[Proposal shown]`, `[Tools used]` 줄은 앱이 붙인 것이니 **답장에 직접 쓰지 않는다.** 모델은 이전 assistant 메시지의 형식을 흉내 내기 쉽다. 서버도 답장 텍스트에서 이런 줄을 지운다.
5. **id를 받을지 말지** (FoundIds 규칙). 이 규칙은 **여기 한 곳에서 정한다.** 3-4는 이 규칙을 쓴다.
   - **이번 턴의 `several` 후보 id는 FoundIds에 넣지 않는다.** LLM이 되묻지 않고 하나를 골라 `proposeQuest`에 넣으면 서버가 거부한다. "대신 고르지 않기"가 prompt 부탁에서 서버 강제로 바뀐다. 검색 조건으로 쓰는 경우는 예외다(3-7의 장소).
   - **직전 턴에 `one`으로 확정된 resolver id**(친구, 장소, 행사)는 `proposeQuest`가 다시 resolve하지 않고 받는다. 지금 `[Proposal shown]`의 id를 받는 것과 같은 방식이다.
   - **직전 턴의 `several` 후보 id**도 다음 턴에 받는다. 직전 턴에 이미 되물었고, 사용자가 이번 턴에 골랐기 때문이다("이민수", "두 번째"). 동명이인도 후보 순서나 구분 정보로 고를 수 있다.
   - 받은 id는 DB에서 다시 확인한다(존재하는지, 게시 중인지, 아직 친구인지). 앱이 보낸 요약은 위조될 수 있으므로, 이 확인이 받는 조건이다.
   - **카드 id**(파티, 행사)는 presenter가 받지 않는다. 카드는 이번 턴에 다시 검색해서 최신 상태로 보여 준다.
6. **범위**: 요약은 직전 답장 하나에만 있다. 사이에 다른 질문이 끼면 사라진다. 예: 1턴 several → 2턴 메뉴 질문 → 3턴 "이민수". 이 경우는 다시 resolve하면 되고, 요약을 여러 턴에 걸쳐 들고 다니지 않는다.

### 고칠 곳

- 서버
  - `main-server/src/assistant/feature.ts`: 실행 중 툴 기록 보관(2번과 같은 기록)
  - `adapter.ts`: 요약 생성, `contentOf`에서 줄 렌더링, 답장 텍스트에서 `[…]` 줄 지우기
  - `dto/assistant-messages.dto.ts`: 요청·응답 스키마, 길이 상한
  - `tools/resolved.ts`, `resolve-*.ts`: several은 이번 턴 FoundIds에 넣지 않기
  - `tools/propose-quest.ts`: 직전 요약의 id 받기, DB 확인
  - `chat/chat-assistant.ts`: system prompt
- 앱
  - `mobile/src/api/assistant-types.ts`, `api/server/assistant-client.ts`: 응답 필드와 검사
  - `features/assistant/use-chat.ts`: 말풍선에 보관, `messagesToSend`에 싣기

### 확인 방법

- **e2e** (스크립트대로 움직이는 가짜 모델)
  - 요약이 응답에 담기는지
  - 다음 요청에서 모델이 `[Tools used]`를 받는지, 이름이 delimiter로 감싸져 있는지
  - 이번 턴의 several 후보 id로 `proposeQuest`가 거부되는지
  - 직전 요약의 후보 id로 `proposeQuest`가 통과하는지
  - 요약에 위조된 id(친구가 아닌 사람, 없는 장소)를 넣으면 거부되는지
  - 너무 긴 요약, 형태가 틀린 요약이 거부되는지
  - 답장 텍스트의 `[Tools used: …]` 줄이 지워지는지
- **실제 효과**: 실제 모델로 후속 질문 평가 세트를 돌려 비교해야 확정된다(P19 AI metric). 가짜 모델로는 정확도가 올라가는지 알 수 없다.

---

## 2. 툴 이름과 결과 종류를 로그로 보기

### 제안

턴마다 한 줄씩, 어떤 툴을 어떤 순서로 불렀고 결과가 무엇이었는지 찍는다. **성공한 턴과 실패한 턴 모두** 찍는다.

```
[AssistantService] run: 3 steps · resolveFriend→one, resolvePlace→one | proposeQuest→proposed | answered · tokens in 4120 (cache read 3500, write 0) / out 180
[AssistantService] run: 8 steps · searchRecruitingQuests→none | searchRecruitingQuests→none | … | failed: NoAnswerError
[AssistantService] run: 2 steps · searchRecruitingQuests→found | answered · no cards shown after a search · tokens …
```

`|`는 step 경계, `,`는 한 step 안에서 동시에 부른 툴이다.

### 두 단계

| | 찍는 것 | 언제 |
|---|---|---|
| 기본 | step 수, 툴 이름, 결과 종류(`found`/`none`/`one`/`several`/`refused`/`proposed`/`shown`/에러 이름), 후보 개수, 끝난 방식(답변/실패 원인), 이상 패턴, 입력·출력 토큰 수와 cache read·write 토큰 수 | 항상 (Dev Server 포함) |
| 디버그 | 기본 + **툴 입력값** (`resolveFriend("민수")`, 검색 조건, 날짜, 제안 필드) | `ASSISTANT_LOG_TOOL_INPUTS=true`일 때만. 기본값 `false`. 로컬에서만 켠다 |

**기본 단계에 입력값을 넣지 않는 이유**: 툴 입력에는 사용자가 쓴 말이 그대로 들어간다(`resolveFriend("민수")`, 제안 제목 등). P07은 "서버 로그에 사용자가 쓴 말을 남기지 않는다"를 원칙으로 정했고, e2e 테스트도 이를 확인한다. 기본 단계는 이 원칙을 지키고, 원칙을 벗어나는 건 명시적으로 켠 디버그 환경에서만 허용한다.

**이상 패턴** (3-6): 아래처럼 고정 규칙으로 판단할 수 있는 것만 기록한다. 기록만 하고, LLM에게 다시 시키지 않는다.
- 검색이 `found`였는데 카드를 보여 주지 않고 끝난 턴
- 같은 툴을 같은 결과로 연달아 부른 턴
- 스키마에 맞지 않는 툴 입력(아래 구현 메모)

### 비용

- **토큰: 0.** 서버가 직접 실행한 툴의 기록을 서버 로그에 찍는 것이라, LLM에게 보내는 내용은 그대로다.
- **로그 용량**: 턴당 200–300바이트다. Dev Server는 서비스마다 로그 상한이 30MB(10MB × 3)라 공간 문제는 없다. 다만 상한을 다른 로그와 나눠 쓰므로, 오래된 줄은 그만큼 빨리 밀려난다.

### 구현 메모

- 툴 기록은 `toolSetOf`의 `execute`를 감싸서 실행 중에 `ToolContext`에 쌓는다. 실행이 끝난 뒤 `generateText`가 돌려주는 `steps`만 쓰면, 시간 초과처럼 예외로 끝난 턴에서는 기록을 잃는다. 실패한 턴의 기록이 오히려 가장 필요하다.
- **툴 입력이 zod 스키마에 맞지 않으면** AI SDK가 `execute`를 부르기 전에 tool-error로 돌려보낸다. 그래서 `execute` 래퍼로는 이 실패가 잡히지 않는다. `onStepFinish`에서 tool-error도 기록에 더한다. LLM의 잘못된 입력은 로그에서 꼭 보고 싶은 실패다.
- 토큰 수는 `generateText`의 `usage`에서 얻는다. 실패한 턴에서도 얻으려면 `onStepFinish`로 step마다 더한다. cache read·write 토큰은 3-2의 캐시가 실제로 걸리는지 확인하는 데 쓴다.
- 1의 툴 호출 요약도 같은 기록에서 만든다. 기록을 한 번 쌓아서 로그와 요약 양쪽에 쓴다.

### 고칠 곳

- `main-server/src/assistant/adapter.ts`: 기록 쌓기, tool-error 기록, 토큰 합산
- `assistant.service.ts`: 로그 한 줄 출력
- `main-server/src/common/settings.ts`, `.env.example`: `ASSISTANT_LOG_TOOL_INPUTS`

### 확인 방법

- 기존 "로그에 사용자 텍스트 없음" e2e가 기본 단계에서 계속 통과해야 한다.
- 성공한 턴과 실패한 턴(step 소진, 시간 초과, 스키마에 맞지 않는 입력)에서 기록 줄이 찍히는지 확인하는 e2e를 추가한다.
- 디버그 플래그를 켰을 때만 입력값이 찍히는지 확인하는 e2e를 추가한다.

---

## 3. 받아들이기로 한 개선 (2026-10-20 논의)

### 3-1. 의도가 모호하면: 한쪽을 보여 주고 다른 쪽을 되묻기

**예**: "내일 학관에서 점심"은 메뉴가 궁금한 것일 수도, 약속을 잡아 달라는 것일 수도 있다.

**정한 방식**: 바로 쓸모 있는 쪽(조회)을 보여 주고, 다른 해석을 한 줄로 되묻는다.

> (내일 학생회관 점심 메뉴) … 혹시 내일 점심 약속을 잡아 드릴까요? 같이 갈 친구를 알려 주세요.

사용자가 그렇다고 하면 다음 턴에 파티 만들기로 이어진다(멀티턴).

**"모호하다"를 판단하는 기준**: "애매하면"이라는 말 자체가 애매하므로, prompt에는 아래처럼 구체적으로 쓴다.
- 한 문장이 **두 기능의 요청으로 모두 읽히고**, 그중 하나가 **조회**(메뉴, 셔틀, 행사, 파티 찾기)라면: 조회를 먼저 하고, 다른 해석은 한 줄로 되묻는다.
- 가능한 해석이 **모두 사용자에게 더 물어야 하는 것**이라면(예: 파티를 찾을지 만들지): 조회 없이 바로 되묻는다.
- 한쪽 해석이 분명하면 되묻지 않는다. 예: "내일 학관 메뉴"는 조회만, "내일 학관에서 민수랑 점심"은 제안만.

**고칠 곳**: `chat/chat-assistant.ts`의 system prompt에 규칙과 예시 한두 개를 넣는다. 평가 문항의 "의도 모호" 유형은 이 규칙을 정답으로 채점한다.

### 3-2. prompt caching: 캐시를 걸고, 현재 시각을 system prompt 뒤로 옮기기

- **문제**
  - 지금 `adapter.ts`는 캐시 옵션을 주지 않는다. 캐시가 걸리고 있는지부터 알 수 없다. 이것이 첫 번째 문제다.
  - system prompt 두 번째 줄에 현재 시각(분 단위)이 있다. 캐시는 **앞에서부터 똑같은 부분**만 재사용하고, Anthropic 모델의 prefix 순서는 **tools → system → messages**다. 그래서 시각이 막는 것은 **system의 나머지와 messages**의 캐시다. 툴 정의는 system보다 앞이라 영향을 받지 않는다.
  - 같은 턴 안의 step끼리는 시각이 같다. 캐시만 걸리면 step 사이에서는 지금도 재사용된다. 시각을 옮기는 효과는 **요청 사이**(분이 바뀐 뒤, 다른 사용자)에서 난다.
- **방법**
  1. OpenRouter와 AI SDK 경로에서 Anthropic 모델에 `cache_control`이 붙는지 확인한다. 자동이 아니면 AI SDK의 provider 옵션으로 고정 부분 끝에 breakpoint를 둔다.
  2. 고정된 규칙을 앞에 두고, 현재 시각은 **system prompt 맨 끝**(또는 첫 메시지 앞의 별도 줄)으로 옮긴다.
  3. 최소 캐시 길이를 확인한다. Anthropic 문서 기준 Haiku 5.5는 512토큰이라 길이 문제는 없어 보이지만, OpenRouter를 거칠 때도 같은지 확인한다.
- **검증**: 2번 로그의 cache read 토큰이 0보다 큰지 본다. 0이면 어딘가에서 prefix가 바뀌고 있는 것이다.
- **효과**: 입력 비용과 지연이 줄어들고, 평가 하네스 비용도 같이 줄어든다.
- **고칠 곳**: `chat/chat-assistant.ts`(prompt 순서), `adapter.ts`(캐시 옵션).

### 3-3. 지도 버튼은 서버가 자동으로 붙이기

- `getMenus`가 `found`를 돌려주면 서버가 `dining` 버튼을, `getShuttle`이 `found`를 돌려주면 `shuttle` 버튼을 답장에 직접 붙인다.
- `showOnMap` 툴과 system prompt의 "메뉴 답변 뒤엔 showOnMap" 규칙은 없앤다. 툴은 10개가 된다.
- 예외 없는 규칙을 LLM에게 맡길 이유가 없고, step이 하나 줄어든다.
- **고칠 곳**: `tools/get-menus.ts`, `tools/get-shuttle.ts`(버튼 추가), `tools/show-on-map.ts` 삭제, `chat/chat-assistant.ts`(툴 목록, prompt).

### 3-4. several은 되묻고, 확정된 것은 다음 턴에 그대로 쓰기

규칙은 **1번 동작 방식 5**에서 정한다. 여기서는 효과만 적는다.

- **이번 턴**: several 후보 id는 FoundIds에 들어가지 않으므로, LLM이 대신 고르면 `proposeQuest`가 거부한다.
- **다음 턴**: 직전 요약의 id를 받는다. `one`으로 확정된 것은 다시 resolve하지 않고, several 후보는 사용자가 고른 것을 쓴다.
- **효과**: "내일 학생회관에서 민수랑 점심" → (민수가 several이라 되물음) → "이민수"의 2턴에서, 지금은 `resolvePlace("학생회관")`과 `resolveFriend("이민수")`를 다시 부른다. 바꾸면 2턴은 `proposeQuest` 한 번으로 끝난다.

### 3-5. 시간 계산을 서버가 하기

- **문제**: 지금은 LLM이 "내일 점심"을 ISO 시각으로 바꾸고, 서버는 과거인지와 형식만 본다. 하루나 요일을 잘못 계산해도 잡지 못한다.
- **방법**: LLM은 날짜를 계산하지 않고 **구조화된 값**으로 분류만 한다. 서버가 고정 규칙으로 날짜와 시각을 계산한다.
  ```
  when: {
    day: "today" | "tomorrow" | "dayAfterTomorrow"
       | { weekday: "mon" … "sun", week: "this" | "next" }
       | { date: "YYYY-MM-DD" },
    time?: "HH:MM" | "breakfast" | "lunch" | "dinner"   // 08:00 / 12:00 / 18:00
  }
  ```
  - 기간 필드(검색 툴, 3-8의 `getMenus`)는 `from`/`to`에 같은 `day` 형식을 받고, 범위 이름(`thisWeek`, `nextWeek`, `weekend`)도 받는다.
  - "오후 3시 반" 같은 시각은 LLM이 `15:30`으로 바꾼다. 하루 안의 변환이라 틀릴 여지가 적다.
  - 서버는 계산 결과를 **요일과 함께** 돌려준다(`2026-10-22 (목) 12:00`). LLM은 답장에서 이 값을 쓰고, 사용자는 맞는지 바로 볼 수 있다.
  - 결과가 과거면 지금처럼 `refused`와 이유를 돌려준다.
- **자유 문장을 받는 `resolveTime(words)` 툴은 두지 않는다.**
  - 한국어 상대 시각 표현("다다음 주 화요일 저녁 7시 반쯤")은 끝이 없어서, 서버 파서가 계속 커진다.
  - 별도 툴이면 제안할 때마다 step이 하나 늘어난다. 3-3에서 줄인 step을 여기서 도로 쓰게 된다.
- **더 싼 첫 단계(대안)**: system prompt 끝, 현재 시각 옆에 앞으로 14일의 날짜·요일 표를 넣는다. 약 150토큰이고 step이 늘지 않는다. P19 평가로 날짜 오류율을 먼저 재고, 표로 충분하면 구조화 입력은 미룬다.
- **적용 범위**: `proposeQuest.startsAt`, `searchRecruitingQuests`·`searchGlobalEvents`의 기간, `getMenus`(3-8). 공통 타입 하나를 쓴다.
- spec의 "시간 변환은 모델이 한다"는 결정을 바꾸는 것이라, spec도 함께 고친다.
- **고칠 곳**: `korea-time.ts`(계산 규칙) 또는 새 파일, 위의 툴들, `chat/chat-assistant.ts`.

### 3-6. 실패하면 "다시 시키기"가 아니라 되묻기나 정해진 답

- `proposeQuest`가 거부하면 바로 사용자에게 되묻는 지금 구조를 유지한다. 새로 만들 것은 없다.
- 이상 패턴은 2번의 로그에 **기록만** 한다(2번 "이상 패턴"). LLM에게 고쳐서 다시 하라고 시키는 단계는 넣지 않는다.
- **근거**: Calibration 논문(arXiv 2609.00949)에서 부당한 호출을 감지한 뒤 모델에게 다시 묻는 방식(CRI-retry)은 정확도를 낮췄고, 정해진 답으로 바꾸는 방식(CRI-bypass)은 유지하거나 개선했다. **출처 확인 필요**: 2026-10-21 검토 때 논문 번호와 내용을 확인하지 못했다. spec이나 티켓에 옮기기 전에 확인한다.

### 3-7. 파티 검색에 키워드·장소 조건, `more` 안내

**질문: 서버가 키워드로 거르면, 정확히 같은 단어가 아닌 비슷한 말은 빠지지 않나?**

맞다. 행사 검색의 `words`도 **부분 문자열 일치**라서(`global-events.service.ts`의 `searched`), "러닝"으로 찾으면 "달리기" 모집글은 빠진다. 그래서 키워드를 **걸러내는 조건이 아니라 우선순위**로 쓴다.

- **키워드(`words`)**
  - LLM이 동의어까지 최대 5개 넘긴다(예: 러닝, 달리기, 조깅). prompt와 툴 설명에 "비슷한 말을 함께 넣어라"를 적는다.
  - 서버는 키워드에 맞는 파티를 **먼저**, 나머지를 그 뒤에 시작 시각 순으로 채워 최대 20개를 돌려준다. 후보마다 `matched: true/false`를 붙인다.
  - 맞는 게 21번째 이후에 묻혀서 안 보이는 문제가 풀리고, 단어가 달라도 빠지지 않는다. 최종 판단은 지금처럼 LLM이 제목과 설명을 읽고 한다.
- **장소**: 텍스트로 비교하지 않는다. `resolvePlace`로 장소 id를 먼저 얻고, 그 id로 다음 모임 장소가 같은 파티를 거른다. 정확히 일치하므로 비슷한 말 문제가 없다.
  - 검색은 `placeIds` **배열**을 받는다. `resolvePlace`가 `several`을 돌려줘도 되묻지 않고 후보 전부로 거른다. 검색은 제안과 달리 넓게 찾아도 피해가 없고, 대화가 한 턴 줄어든다.
  - 그래서 several 후보 id는 **검색에서는 받고 `proposeQuest`에서는 거부한다**(1번 동작 방식 5). FoundIds가 "several에서 나온 id"를 따로 표시해야 한다.
- **인원**: 후보에 **정원**(`capacity`)을 추가하고, 선택 조건으로 `minPlacesLeft`(최소 남은 자리)를 둔다. 숫자 비교라 정확하다.
- **`more: true`일 때**: prompt에 규칙을 추가한다. "조건에 맞는 파티가 더 있다고 알리고, 시간대, 게시판, 키워드처럼 조건을 좁혀 달라고 권한다."
- 멤버로 찾기("민수 있는 파티")는 넣지 않는다. 멤버 정보를 AI에 넘기는 일이라 개인정보 범위를 먼저 정해야 한다.
- **고칠 곳**: `tools/search-recruiting-quests.ts`, `quests/recruiting.service.ts`(정렬과 장소 조건), `found-ids.ts`(several 표시), `chat/chat-assistant.ts`.

### 3-8. getMenus가 날짜 범위도 받기

- 입력을 둘 중 하나로 받는다.
  - **하루**: `date` 하나("오늘", "내일", "모레", "금요일"). 그날 메뉴만 돌려준다.
  - **범위**: `from`과 `to`("이번 주", "주말", "월요일부터 수요일까지"). 범위 안의 날짜별 메뉴를 날짜 순으로 돌려준다.
- 범위는 최대 7일로 제한한다. 메뉴가 없는 날은 날짜별로 "없음"을 표시한다.
- 끼니와 식당 조건은 지금처럼 둘 다에 적용한다.
- 날짜는 3-5의 `day` 형식과 범위 이름으로 받는다. 3-5를 표(대안)로만 한다면 지금처럼 `YYYY-MM-DD`로 받는다.
- **효과**: "이번 주 학식"에 `getMenus`를 7번 부르다 8 step을 넘기던 문제가 없어진다.
- **고칠 곳**: `tools/get-menus.ts`, `menus/menus.service.ts`(범위 조회).
