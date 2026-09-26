# 위치 공개·실시간 전달·동시성 보충 조사

확인일: 2026-09-26. 기존 [백엔드 조사](backend-feasibility.md), [모바일 조사](mobile-feasibility.md)의 후속이다. 공식 문서의 사실과 애플리케이션 설계 권고를 구분한다. 구현·동시성 시험은 수행하지 않았다. 아래 값과 구조는 설계 제안이다.

## 공식 문서에서 확인한 사실

- Socket.IO는 도착한 메시지의 순서를 보장하지만 기본 전달은 at-most-once다. 끊긴 수신자에게 서버가 보낸 이벤트는 기본적으로 재접속 후 복원되지 않는다. ACK·재시도·DB 이벤트 저장은 추가 전달 정책을 구성하는 요소다. [Delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/)
- Connection-state recovery는 세션의 room·data와 놓친 packet을 복원할 수 있지만 성공이 보장되지 않는다. `skipMiddlewares: true`이면 복구 중 인증 middleware를 건너뛰며, 공식 문서는 끊긴 사이 차단된 사용자의 재접속을 예로 경고한다. [Connection state recovery](https://socket.io/docs/v4/connection-state-recovery/)
- PostgreSQL `SELECT ... FOR UPDATE`는 같은 행을 수정하거나 충돌하는 행 잠금을 획득하려는 트랜잭션을 기다리게 한다. 일반 SELECT까지 차단하는 잠금은 아니다. 여러 대상을 잠그면 모든 경로에서 같은 순서를 사용해야 교착 가능성을 줄일 수 있다. Advisory lock은 모든 참여 코드가 같은 규약을 따라야 효과가 있으며 transaction-level lock은 트랜잭션 종료 시 풀린다. [Explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- 복합 UNIQUE와 NOT NULL은 도메인의 중복 키를 DB에서 제한할 수 있다. `INSERT ... ON CONFLICT DO NOTHING RETURNING ...`은 새로 삽입한 행을 구별하는 데 사용할 수 있다. `DO UPDATE ... WHERE`는 조건을 만족한 경우만 갱신한다. [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- Android는 location foreground service로 화면이 보이지 않을 때도 위치 접근을 이어가는 경로를 제공한다. background에서 이 서비스를 새로 시작하는 행위에는 제약이 있다. 앱 화면에서 공유를 켜면서 서비스를 시작하는 설계가 적합하다. 선택한 Expo API의 추가 권한 요구는 기존 모바일 조사와 실제 기기 시험으로 확인한다. [Location permissions](https://developer.android.com/develop/sensors-and-location/location/permissions), [Foreground-service restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start), [Location service type](https://developer.android.com/develop/background-work/services/fgs/service-types#location)

## 공개 권한: 친구와 파티를 독립적으로 계산

설계 권고: `canViewLocation(owner, viewer, now)`를 HTTP 조회·socket 구독·재동기화·실제 송신이 공유한다.

```text
activeSharingSession(owner, now)
AND freshVisiblePoint(owner, now)
AND NOT blockedEitherDirection(owner, viewer)
AND (
  acceptedFriendship(owner, viewer) AND activeFriendGrant(owner, viewer, now)
  OR
  exists party: bothActiveMembers(owner, viewer, party)
               AND activePartyGrant(owner, party, now)
)
```

교외·비공개 구역·정확도 부족 상태는 `freshVisiblePoint`에서 제외한다. 파티 탈퇴는 그 파티를 통한 공개만 제거하며, 별도로 허용된 친구 공유는 이 계산 결과에 따라 유지한다. 차단은 두 경로보다 우선한다. room에 들어 있다는 사실을 현재 공개 권한으로 사용하지 않는다. 수신자별 판정 후 인증된 사용자 socket들에 직접 보낸다.

## 철회와 송신의 경쟁을 막는 최소 구현

**단일 Nest API 프로세스를 유지하는 MVP 권고:** singleton `LocationDisclosureCoordinator`에 하나의 비동기 mutex/직렬 실행 큐를 둔다. 위치 공개 요청, 친구 공유 변경, 차단, 파티 합류·탈퇴·종료, 공유 OFF, 비공개 구역 변경이 모두 이 coordinator를 통과한다. 소규모 시작에서는 하나의 짧은 전역 임계 구역이 여러 대상을 잠그는 방식보다 검증하기 쉽다. LLM 호출·외부 API·클라이언트 ACK 대기는 이 구역에 넣지 않는다.

1. 공개 처리: coordinator 진입 → DB에서 현재 권한·최신 위치 읽기 → 시각·TTL 최종 검사 → 수신자별 이벤트를 로컬 전송 계층에 등록 → coordinator 해제. 권한을 미리 검사한 객체를 큐에 보관하지 말고 실행 시 다시 검사한다. HTTP snapshot의 응답 등록도 같은 경계를 따른다.
2. 철회 처리: coordinator 진입 → 트랜잭션으로 권한/구성원 변경과 revision 증가 → **commit 성공** → 영향받은 수신자의 공개 가능 여부 재계산 → 필요하면 좌표 없는 숨김/갱신 이벤트 등록·구독 정리 → 철회 요청자에게 성공 응답 등록 → coordinator 해제.
3. 이 성공 응답은 **철회가 저장되었고 이후 서버가 해당 권한으로 새로운 위치 이벤트를 등록하지 않는다는 뜻**이다. `emit()` 성공은 상대방 수신 확인이 아니다. 철회 전에 이미 전송 계층에 들어간 packet은 뒤늦게 도착할 수 있고 이미 받은 좌표는 회수할 수 없다. 따라서 실제 단말에서 영구적으로 지워졌다는 보장으로 표현하지 않는다.
4. 숨김 이벤트를 못 받은 단말도 위치 TTL 만료 시 마커를 지운다. 재연결 때 전체 가시 상태를 다시 받아 권한을 잃은 마커를 제거한다. 공유 OFF를 누른 본인 단말은 서버 응답을 기다리지 않고 수집·업로드를 멈추며, 서버 철회 요청 실패는 재시도한다.

이 설계의 전제는 **권한 DB를 변경하거나 위치를 공개하는 경로가 전부 하나의 coordinator에 들어간다는 것**이다. Worker가 관련 테이블을 직접 수정하거나 API를 여러 인스턴스로 실행하면 이 보장은 성립하지 않는다. 만료 작업은 보조 정리이며 현재 시각 검사가 정합성 기준이다. 여러 인스턴스 전환 시 공유 직렬 dispatcher 또는 DB advisory lock과 같은 공통 직렬화 구조를 먼저 설계해야 한다. DB transaction lock을 commit 때 해제한 뒤 잠금 밖에서 emit하면 철회 경쟁이 다시 생긴다. 단순 Redis adapter 추가만으로 이 문제가 해결되지는 않는다.

## 오래된 위치·공유 재시작·재접속

제안 데이터:

```text
sharing_session(owner_id, generation, device_id, state, expires_at)
latest_location(owner_id, generation, seq, captured_at, received_at,
                expires_at, point?, accuracy_m, visibility_state, revision)
```

- 서버가 공유 시작 때 새 `generation`을 발급한다. 최초 MVP는 한 사용자의 한 기기만 활성 송신자로 둔다. 기기를 바꾸거나 재시작하면 이전 generation을 폐기한다.
- 단말은 generation 안에서 증가하는 `seq`를 보낸다. 서버는 인증 사용자·활성 generation을 확인한 다음 기존보다 큰 seq만 수락한다. **다른 generation을 크기 비교로 허용하지 않는다.** 단절 후 도착한 구세션 업로드와 순서가 뒤집힌 좌표가 새 상태를 덮지 못하게 한다.
- `captured_at`은 단말 주장 값이고 `received_at`은 서버 기록이다. 촬영 시각이 허용 지연보다 오래됐거나 시계 오차가 과도하면 공개하지 않는다. 수신 시각만으로 freshness를 계산하면 오래 보관된 좌표가 갱신된 것처럼 보인다. TTL은 예를 들어 90초에서 실험하되 측정 시각과 수신 시각 모두에 제한을 두고 실제 기기 측정으로 조정한다.
- 조회 시 `expires_at > now`를 필수 검사한다. 만료 행 삭제 주기와 관계없이 노출을 중단한다. 단말도 전달받은 잔여 TTL로 마커를 제거하며 앱 복귀 때 만료를 다시 확인한다. 위치 이력 저장은 기본 기능에 넣지 않는다.
- `visibility_state=hidden`도 더 큰 seq/revision을 가진 상태 변경이다. 숨김은 최신 공개 좌표를 지우며, 오래된 공개 이벤트가 마커를 되살리지 못하도록 한다. 비공개 구역의 구체적 이름이나 숨김 사유는 상대에게 보내지 않는다.
- 수신 이벤트에는 owner별 서버 `revision`을 붙여 단말이 더 낮거나 같은 버전을 무시하게 한다. 전체 재동기화에는 별도 동기화 세대를 사용한다. 서버 재시작을 넘어 revision 비교가 필요하면 DB에 저장된 버전을 사용한다.
- **위치 packet은 connection-state recovery에 저장·재생하지 않는 구성을 우선한다.** 서버 전체 recovery를 끄거나 위치를 별도 서버 설정으로 분리해야 하며, namespace 이름만 나눴다고 replay 제외가 보장된다고 가정하지 않는다. 재접속 시 현재 인증·권한으로 최신 snapshot을 생성한다.
- 재접속 snapshot과 실시간 업데이트 사이의 틈을 막기 위해 같은 coordinator에서 socket 등록과 snapshot 전송을 순서대로 처리하고 그 뒤 업데이트를 보낸다. HTTP snapshot을 별도로 섞으면 서버 revision으로 오래된 응답이 신규 상태를 덮지 않게 한다. 위치 OFF·탈퇴·차단 command는 재시도 가능한 HTTP 요청으로 처리하고, 소켓은 최신 상태 전달에 사용한다.

## 파티 정원과 중복 보상

**파티:** 합류 트랜잭션에서 `SELECT party ... FOR UPDATE` → 현재 상태·이미 참여 여부·활성 인원 확인 → 정원 미만일 때 membership 추가 → commit. 합류·탈퇴·추방·정원 변경의 모든 경로가 같은 party 행을 먼저 잠근다. 최초 승인 대기 상태는 활성 정원에 넣을지 별도 정책이며, 승인을 활성 참여로 바꾸는 시점에 정원을 다시 검사한다. 파티 위치 권한에 영향이 있는 작업은 앞의 coordinator 안에서 이 트랜잭션을 실행한다. DB의 `UNIQUE(party_id, user_id)`도 둔다.

**QR 출석/보상:** 서버가 서명·만료·행사·사용자 참여 조건을 검증하고, 한 트랜잭션에서 `INSERT attendance ... ON CONFLICT DO NOTHING RETURNING id`를 실행한다. **새 행이 실제 삽입됐을 때만** 보상 원장과 포인트 합계를 변경한다. 이미 존재하면 기존 결과를 반환한다. 출석 키는 `UNIQUE(user_id, event_id)` 또는 반복 행사의 회차를 포함한 키이고 모두 NOT NULL이다. 보상 원장에는 별도 `UNIQUE(user_id, reward_source_type, reward_source_id)`를 둔다. 클라이언트 request ID만으로는 다른 ID를 보낸 재시도를 막지 못한다.

검증할 동시성 사례: 마지막 한 자리를 여러 사용자가 동시에 신청; 같은 QR을 여러 기기에서 동시에 제출; 위치 송신과 탈퇴·차단 경합; 공유 OFF→ON 뒤 옛 업로드 도착; 숨김 이후 옛 이벤트 도착; 끊긴 동안 차단된 사용자의 재접속; API 재시작 후 snapshot 복원.
