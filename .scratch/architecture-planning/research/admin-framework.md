# 어드민 프레임워크 비교

조사일: 2026-09-27 KST. 대상: 행사 작성·발행, 외부 연동 상태 확인, 테스트 지원 화면. 사용자 범위는 아직 미정이며, 아래는 선택을 위한 제안이다. 제품 코드·패키지를 생성하지 않았다.

## 판단

**Next.js App Router는 적합한 후보다.** 사용자가 Next.js를 고려하고 있고, 경로·공통 레이아웃·화면별 로딩/오류 처리의 틀을 함께 사용할 수 있다. 이 기능 구성은 [공식 App Router 문서](https://nextjs.org/docs/app)에 따른다. 현재 요구만으로 SSR이 필수라는 근거는 없으며, Next.js 선택을 확정한 것은 아니다.

**React + Vite SPA는 운영 구성을 줄이고 싶은 경우의 대안이다.** 기존 NestJS API를 사용하는 내부 관리 화면이면 정적 파일 배포로 구현할 수 있다는 설계 판단이다. Vite 빌드 결과는 기본적으로 `dist`에 생성되며 정적 호스팅이 가능하다. `vite preview`는 운영 서버가 아니다. [Vite 정적 배포](https://vite.dev/guide/static-deploy)

| 비교 | Next.js App Router | React + Vite SPA |
| --- | --- | --- |
| 경로·레이아웃 | 프레임워크의 파일 경로 규칙·중첩 레이아웃 사용 | React Router 등 별도 선택 |
| 데이터 처리 | 서버 API 조회와 브라우저 상호작용을 조합 가능 | 브라우저에서 main API 조회; 데이터 캐시 도구 등을 필요에 따라 조합 |
| 일반 배포안 | Node/Docker 어드민 런타임 추가 | HTML/JS/CSS 정적 호스팅 |
| 고려할 점 | Server/Client Component 경계와 서버 기능의 운영 필요 | 라우팅·데이터 조회·스타일 등 앱 구성 선택 필요 |

Next.js의 화면·레이아웃은 기본적으로 Server Component이고 상호작용·브라우저 API에는 Client Component를 사용한다. Vite는 이러한 앱 기능 전체를 제공하는 프레임워크가 아니며, React 문서도 빌드 도구 이후 라우팅·데이터 조회 구성을 별도로 설명한다. [Next.js 구성](https://nextjs.org/docs/app/getting-started/server-and-client-components), [React 앱 구성](https://react.dev/learn/build-a-react-app-from-scratch)

## NestJS와의 책임 분리

- 제안: **main이 행사 발행 규칙·최종 권한 검사·DB 변경을 소유**하고 어드민은 화면과 관리 요청을 담당한다. Next.js 채택이 업무 백엔드 이전을 뜻하지 않는다.
- 브라우저가 main API를 직접 호출할 수 있다. 같은 출처 프록시와 쿠키 설정, 또는 교차 출처 인증 방식을 정해야 하며, 모든 API를 Next.js Route Handler에 다시 만들 필요는 없다.
- 서버에서 토큰을 보관하거나 여러 API 결과를 화면용으로 조합할 요구가 있으면 얇은 BFF를 검토한다. 이는 별도 인증·세션 논의 대상이며 아직 채택하지 않았다. Next.js는 BFF 기능을 제공하지만 전체 백엔드 대체라고 설명하지 않는다. [공식 BFF 안내](https://nextjs.org/docs/app/guides/backend-for-frontend)
- Next.js 서버 렌더링을 쓰면 Server Component에서 main API를 직접 조회하는 안이 자연스럽다. 자기 Route Handler를 다시 호출하는 경유는 불필요한 HTTP 왕복이 된다. [BFF 주의사항](https://nextjs.org/docs/app/guides/backend-for-frontend#server-components)
- 화면에서 관리자 메뉴를 숨기는 것과 실제 요청 권한 검사는 별개다. 우리 구조에서는 main이 요청한 관리자 신원·권한을 검사한다. Next.js 문서도 UI/경로의 낙관적 확인과 데이터 접근 시 권한 검사를 구별한다. [인증·인가 안내](https://nextjs.org/docs/app/guides/authentication#authorization)

## 배포에서 빠뜨리면 안 되는 차이

Next.js를 `next start` 또는 Docker로 배포하면 지원 기능을 모두 사용할 수 있다. 이 경우 main·socket·worker 외에 **어드민 웹 런타임**이 하나 추가되며 업무 서비스 경계는 그대로다. Vercel 전용은 아니다. [Next.js 배포](https://nextjs.org/docs/app/getting-started/deploying)

Next.js도 `output: 'export'`로 정적 배포할 수 있지만 요청 시 서버 쿠키 처리·Server Actions·요청에 의존하는 Route Handler와 빌드 때 열거하지 않은 동적 경로 등의 제한이 있다. 예를 들어 새 행사가 생길 때마다 달라지는 `/events/[id]`를 정적 출력에서 무조건 지원한다고 약속하면 안 된다. 정적 배포를 고르면 경로·API·인증 설계를 그에 맞춰야 한다. [정적 출력 제한](https://nextjs.org/docs/app/guides/static-exports#unsupported-features)

## CRUD 우선 대안: React-admin

React-admin은 목록·작성·수정 등의 관리 UI와 API 연결 패턴을 제공하며, Next.js나 Vite 위에서 사용할 수 있는 선택지다. Next.js/Vite와 같은 층의 대체 빌드 도구는 아니다. `dataProvider`로 우리 API를 연결하고 인증도 연결해야 한다. 전형적인 CRUD 화면 제작에 유용할 수 있지만 별도의 규칙과 어댑터를 학습해야 하므로, 사용자 정의 연동 대시보드·테스트 흐름의 비중을 보고 선택할 제안이다. [React-admin 공식 튜토리얼](https://marmelab.com/react-admin/Tutorial.html)

## 권고안과 미확정 항목

우선 **Next.js App Router + TypeScript를 추천 후보**로 제시한다. 서버 기능까지 쓰는 배포를 허용하고 라우팅·레이아웃을 일관되게 구성하려는 경우에 적합하다. 내부 CRUD만 빠르게 제공하고 추가 웹 런타임을 줄이는 것이 우선이면 React + Vite SPA를 선택할 근거가 충분하다. 프레임워크, 정적/Node 배포, 브라우저 직접 호출/BFF, UI 라이브러리, 관리자 로그인 정책은 사용자 합의 후 확정한다.

## 2026-09-27 후속: 루트 설정과 디렉터리 계층

사용자가 **Next.js와 NestJS 내부 `src/modules/` 분류를 선택**했으므로 위의 프레임워크 미확정 기록은 이 결정으로 갱신된다. 서버는 저장소 루트의 `main-server/`, `socket-server/`, `worker-server/`를 선호한다. pnpm workspace 채택, 루트 설정, 어드민의 업무 API 배치는 별도 논의 대상이다.

- `apps/`와 `services/`는 사람이 여러 프로젝트를 분류하기 위한 저장소 관례다. pnpm workspace는 패턴으로 구성원을 선택하며 루트 바로 아래의 프로젝트도 명시할 수 있다. 따라서 `main-server/`·`admin/` 등을 직접 등록하는 구성이 가능하다. [pnpm 10 workspace 구성](https://pnpm.io/10.x/pnpm-workspace_yaml)
- `pnpm-workspace.yaml`은 workspace 루트와 구성원 경로를 정의한다. 루트 `package.json`의 역할과 다르다. 공식 workspace 안내가 필수라고 명시하는 파일은 `pnpm-workspace.yaml`이며, 여기서 모든 명령에 대한 루트 manifest의 필요/불필요를 단정하지 않는다. [pnpm workspace](https://pnpm.io/10.x/workspaces)
- 루트 `package.json`은 업무 서버를 하나 더 만드는 파일이 아니다. workspace를 채택한다면 공통 개발 명령·개발 도구와 선택한 `packageManager` 버전을 기록하는 최소 manifest를 권장한다. 서버의 `dependencies`와 실행 명령은 각 서버 manifest가 소유한다. `pnpm run`은 해당 package의 manifest에 정의한 명령을 실행하며 workspace 루트에 설치한 도구도 찾을 수 있다. [pnpm run](https://pnpm.io/10.x/cli/run), [packageManager 설정](https://pnpm.io/10.x/settings#managepackagemanagerversions)
- 공유 lockfile은 별도 선택이다. pnpm의 `sharedWorkspaceLockfile` 기본값은 `true`라 루트 `pnpm-lock.yaml` 하나가 생기지만 각 package의 명시적 의존성 경계는 유지된다. 이것이 모든 서버를 같은 프로세스나 같은 배포로 합친다는 뜻은 아니다. 로컬 공유 패키지 연결은 각 manifest의 `workspace:` 선언으로 표현할 수 있다. [공유 lockfile](https://pnpm.io/10.x/workspaces#sharedworkspacelockfile), [workspace 프로토콜](https://pnpm.io/10.x/workspaces#workspace-protocol-workspace)
- 단순히 독립 프로젝트들을 한 Git 저장소에 놓고 각각 설치·빌드·실행한다면 루트 개발용 manifest는 생략할 수 있는 설계안이다. 다만 workspace를 쓰는 안과 혼동하지 말고, 공유 코드 배포·lockfile·CI 설치 범위를 별도로 정해야 한다. 이는 공식 도구 역할을 바탕으로 한 구성 제안이며 모든 pnpm 명령의 동작 보장은 아니다.
- 저장소의 복수형 `apps/`와 Next.js 프로젝트 내부의 단수형 `app/`은 별개다. `admin/src/app/`의 `app`은 App Router의 라우팅 규칙이고, `src` 자체는 선택 사항이다. 어드민 프로젝트가 루트 `admin/`에 있어도 동일하다. [Next.js 프로젝트 구조](https://nextjs.org/docs/app/getting-started/project-structure)
- Next.js의 서버 렌더링·선택적 Route Handler/BFF와 NestJS의 관리자 업무 API도 별개다. 제안 경계는 어드민 웹을 `admin/`에, 행사 발행·권한·DB 변경을 `main-server/`의 해당 업무 모듈에 두는 것이다. 별도 `admin-server/`는 새로운 서비스 경계이므로 필요를 확인한 뒤 합의한다. [Next.js BFF 역할](https://nextjs.org/docs/app/guides/backend-for-frontend)

이 후속 확인에서는 문서만 수정했으며 설정 파일·폴더·의존성을 생성하지 않았다. pnpm은 현재 로컬에서 확인된 10.x 계열 공식 문서를 사용했다.
