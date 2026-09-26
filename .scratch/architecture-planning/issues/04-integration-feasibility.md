# 인증과 학내 데이터 접근 경로 조사

Type: research
Labels: wayfinder:research
Status: ready-for-agent
State: resolved
Assignee: integration_research
Parent: [캠퍼스 앱 MVP 범위와 기술 구조 결정 지도](../map.md)
Blocked by: none

## Question

제안서에 제시된 학교 SSO 또는 학교 관리 Google 계정, 학과 공지·학식·도서관 좌석/예약·셔틀·지도/이동시간 정보의 연동에 대해 공식 공개 자료로 확인할 수 있는 경로와 아직 확인할 수 없는 권한·API를 구분한다. 공개 웹페이지 존재와 API 사용·재배포 허가를 혼동하지 않는다. 실시간 데이터가 없을 때 표기된 샘플 데이터로 시연한다는 제안서의 대안이 어떤 기능에 적용 가능한지 조사한다. 계정 가입·승인 요청·예약 실행은 하지 않는다.

## Comments

2026-09-27 사용자 제보를 반영한 [서울대학교 앱의 정류장 기준 셔틀 정보 조사](../research/shuttle-app-stop-info.md)를 추가했다. 학교 공지가 안내한 새 서비스는 정상 HTTPS로 노선과 읽기 호출이 동작한다. 위치는 GPS가 아닌 정류장 노선도의 픽셀이며 일요일 새벽 응답은 빈 문자열이었다. 실제 운행 중 갱신·정류장 대응·재사용 조건은 미확인이고 네이티브 서울대 앱이 같은 API를 호출하는지는 관찰하지 않았다. 구형 DWR의 TLS 문제를 모든 경로의 문제로 일반화하지 않는다.

이번 조사 보존: research/external-integrations, commit fcf8afea552c61a563fc3256fbf5089e0c98779c. 최신 셔틀 보고서와 구형·종합 보고서의 후속 안내를 별도 index로 보존했으며 현재 브랜치와 사용자 staged 변경은 유지했다.

2026-09-26 사용자 지정 외부 의존성 심화 조사 완료. [외부 서비스 연동 조사와 권고안](../research/external-integrations.md)에 확인 사실과 제안 구조를 모았다. SNUTT는 공식 picker의 origin·RN 호환성 확인, 행샤는 공개 GET의 이용 조건·정정/삭제 계약, 관정은 조회/위임 예약 API 협의, 셔틀은 유효한 TLS feed와 DWR 지원 여부, SSO는 기관 신청 자격·학교 IP/도메인과 단순인증 조건 확인이 다음 단계다. SSO 신청 제도와 행샤 비로그인 GET 응답은 이번에 추가 확인했으며 초기 조사에서 미확인했던 부분을 보완한다. 문의·신청·학교 로그인·예약은 실행하지 않았다.

심화 조사 보존: research/external-integrations, commit a407f7c113d5f7f116e8d7f73c7bfc8b8782a654. 종합 보고서와 세부 보고서 및 초기 조사 보완본 6개를 별도 index로 기록했으며 현재 브랜치·사용자 index는 변경하지 않았다.

## Answer

2026-09-26 공식 공개 자료 조사 완료. 학교 인증, 도서관 좌석·예약, 셔틀의 사용자 서비스는 확인했지만 학생 프로젝트의 외부 API 접근·승인·재사용 권한은 확정하지 못했다. 공개 자료에서 확인하지 못했다는 사실은 API가 없다는 뜻이 아니다. 공지·식단 역시 공개 페이지와 지원되는 수집 경로를 구분해야 한다.

현재 카카오맵 공식 REST 문서에는 도보 경로 API가 있다. 지도 SDK와 도보 시간 계산의 공급자는 별도로 검증한다. 시연 데이터·공식 링크·자체 일정 입력은 세 흐름을 유지할 수 있는 대안이지만 사용자와 합의된 완료 기준은 아직 아니다.

- 상세 근거와 남은 조건: [인증과 학내 데이터 접근 경로 조사](../research/integration-feasibility.md).
- 보존된 조사 맥락: research/integration-feasibility, commit 3158d8f0e7213cc6750c5445fa7f5aab63845e0a, 파일 .scratch/architecture-planning/research/integration-feasibility.md.
- 계정·API 키 발급, 실제 인증·예약, 데이터 수집·재배포, 실기기 검증은 수행하지 않았다.
