# L2N Codex 단계별 개발 계획

## 1. 계획의 전제

- 기준 자료: `plan/user`, `plan/hospital`, `plan/rnd`, `plan/rwa`의 화면 기획서 32장
- 현재 상태: 구현 코드와 확정 기술 스택이 없는 신규 프로젝트
- 개발 방식: 사람이 제품·보안·규제 결정을 담당하고 Codex가 설계 초안, 구현, 테스트, 문서화, 코드 리뷰를 수행
- 권장 팀: 테크 리드 1명, 풀스택 2명, 모바일 1명, QA/DevOps 1명. 보안·의료·금융 컴플라이언스 담당자는 별도 참여
- 1차 목표: 실제 의료 데이터 대신 합성 데이터로 핵심 업무 흐름을 검증하는 MVP
- 2차 목표: 병원/연구기관 연동, Secure Analysis, 결제와 RWA를 단계적으로 운영 수준으로 확장

Codex는 구현 속도를 높이는 개발 도구이지 의료·개인정보·금융 관련 법률 판단이나 운영 승인을 대신하지 않는다. 규제 요건, 실제 환자 데이터 사용, 자금 이동, 온체인 발행은 반드시 담당자의 명시적 승인 뒤에 진행한다.

## 2. 최종 제품 범위

### 개인 앱

- 홈 및 데이터 상태
- My Data와 동의 관리
- 건강 데이터 리포트
- 연구 캠페인 탐색·참여·철회
- 리워드 적립·수령
- Wallet과 거래 내역
- RWA Vault 탐색
- 투자 포트폴리오 및 정산 내역

### 병원 포털

- Overview
- Patient Consent
- Device Integration
- Data Assets
- Data Quality
- Research Requests
- IRB/DRB 연계
- Rewards
- Audit Logs

### R&D 포털

- Dataset Search
- Cohort Builder
- Research Request
- Secure Analysis
- Campaign Builder
- Payment
- Reports
- Compliance

### RWA

- 프로젝트 목록·상세
- 참여 적격성/KYC/AML
- 청약
- Documents/Disclosure
- Updates
- My Vaults
- Settlement

## 3. Codex 개발 운영 원칙

### 3.1 저장소가 Codex의 단일 사실 원천이다

다음 문서를 코드와 함께 관리한다.

```text
AGENTS.md                         # 공통 개발 규칙과 검증 명령
docs/product/                     # 기능 요구사항과 사용자 흐름
docs/architecture/                # ADR, 시스템/데이터 아키텍처
docs/api/openapi.yaml             # API 계약
docs/security/                    # 위협 모델, 데이터 분류, 접근 정책
docs/runbooks/                    # 운영 및 장애 대응
plan/                             # 원본 화면과 본 계획
```

`AGENTS.md`에는 반복해서 지켜야 할 사항만 둔다.

- 패키지별 빌드·테스트·타입 검사 명령
- 브랜치와 커밋 규칙
- PHI/PII를 로그·fixture·snapshot에 넣지 않는 규칙
- DB migration의 하위 호환 원칙
- OpenAPI 변경 시 client 재생성 규칙
- 기능 완료 전 실행해야 할 최소 검증
- 금지 사항: 실제 비밀정보 커밋, 외부 서비스 쓰기, 실제 결제, 운영 데이터 변경

반복되는 복잡한 작업은 `.agents/skills` 아래 프로젝트 전용 skill로 만든다.

- `feature-slice`: schema → API → UI → test 순서의 기능 개발
- `screen-visual-qa`: 기준 이미지와 구현 화면의 시각 검증
- `db-migration-review`: migration 안전성 검사
- `security-review`: PHI/PII, 권한, 감사 로그 점검
- `release-check`: 빌드, 테스트, 문서, migration, rollback 확인

### 3.2 작업은 작은 수직 슬라이스로 분할한다

Codex 작업 하나의 권장 크기는 반나절에서 2일이다. 한 작업은 가능한 한 아래 항목을 모두 포함한다.

1. 사용자 결과 한 가지
2. 필요한 DB/API 계약
3. 최소 UI
4. 권한과 감사 이벤트
5. 정상/실패 테스트
6. 문서 또는 API 명세 갱신

예: “Patient Consent 화면 전체 구현”이 아니라 다음처럼 나눈다.

- 동의 목록 조회 API와 계약 테스트
- 동의 상태 필터 및 페이지네이션
- 동의 상세/버전 이력
- 철회 요청 상태 전이
- 철회 권한 및 감사 이벤트
- 통계 카드 집계 쿼리

### 3.3 병렬 작업은 Git worktree로 격리한다

의존성이 없는 Codex task만 별도 worktree에서 병렬 실행한다.

```text
codex/feat-consent-domain
codex/feat-data-catalog-ui
codex/test-research-request
codex/docs-threat-model
```

- API 계약과 도메인 모델을 먼저 병합한다.
- 같은 migration, 공통 타입, 디자인 토큰을 동시에 수정하는 task는 병렬화하지 않는다.
- worktree마다 설치·생성·테스트가 재현되도록 setup script를 둔다.
- 병합 전 통합 브랜치에서 전체 typecheck, test, build, smoke test를 다시 실행한다.

### 3.4 모든 Codex 프롬프트는 결과 중심으로 작성한다

권장 작업 프롬프트 형식:

```text
목표:
환자가 활성 동의를 철회할 수 있는 수직 기능 슬라이스를 구현한다.

범위:
- consent 상태 전이와 POST /consents/{id}/withdraw
- 모바일 상세 화면의 철회 버튼과 확인 단계
- WITHDRAW_CONSENT 감사 이벤트
- 단위/통합/E2E 테스트

제약:
- 기존 OpenAPI와 디자인 시스템을 재사용한다.
- 활성 또는 철회 가능 상태에서만 허용한다.
- 실제 레코드를 삭제하지 않고 새 revision을 만든다.
- PHI를 로그에 남기지 않는다.

완료 기준:
- 권한 없는 사용자 403
- 중복 철회 409
- 철회 후 신규 데이터 접근 차단
- 관련 테스트, typecheck, build 통과
- 변경 파일과 검증 명령을 결과에 보고
```

Codex에 파일 위치, 제약, 성공 기준, 검증 명령을 제공하되 구현 절차를 지나치게 세세하게 지정하지 않는다.

## 4. 권장 기술 구조

### 4.1 모노레포

```text
apps/
  patient-mobile/       # Expo/React Native
  hospital-web/         # Next.js
  researcher-web/       # Next.js
  api/                  # NestJS
  worker/               # 비동기 수집/품질/정산 작업
packages/
  ui/                   # 공통 디자인 시스템
  contracts/            # OpenAPI 생성 타입, 이벤트 계약
  auth/                 # 권한/정책 공통 코드
  config/               # ESLint, TSConfig, test preset
  observability/        # 로깅, tracing, metrics
infra/
  docker/
  terraform/
docs/
```

### 4.2 초기 기술 선택

- TypeScript 기반 monorepo, pnpm, Turborepo
- Web: Next.js, React, TanStack Query, React Hook Form, Zod
- Mobile: Expo/React Native
- API: NestJS
- DB: PostgreSQL + Prisma 또는 Drizzle
- Cache/queue: Redis
- 파일: S3 호환 object storage
- 검색: 초기 PostgreSQL full-text, 규모 확인 후 OpenSearch
- 이벤트: 초기 transactional outbox + worker, 운영 규모 확인 후 Kafka 검토
- 인증: OIDC/OAuth 2.1, 기관 SSO와 MFA 확장 가능 구조
- 관측성: OpenTelemetry
- 테스트: Vitest/Jest, Testing Library, Supertest, Playwright
- 로컬 환경: Docker Compose

초기에는 모듈러 모놀리스로 시작한다. Identity, Consent, Data Catalog, Research, Reward, RWA 모듈의 경계를 코드와 DB schema에서 분명히 하고, 트래픽·보안·배포 요구가 확인된 모듈만 분리한다.

## 5. 단계별 개발 계획

일정은 4~5명의 개발 인력과 Codex를 기준으로 한 목표 범위다. 의사결정 또는 외부 연동 지연은 제외한다.

### Phase 0. 프로젝트 부트스트랩 — 1주

목표: 누구나 같은 명령으로 설치, 실행, 검증할 수 있는 저장소를 만든다.

Codex task:

1. Git 저장소와 monorepo scaffold
2. `AGENTS.md` 초안
3. pnpm/Turborepo/TypeScript/ESLint/Prettier 설정
4. Next.js 2개, Expo 1개, NestJS 1개 앱 shell
5. Docker Compose로 PostgreSQL/Redis/MinIO
6. `.env.example`과 비밀정보 검증
7. CI: lint, typecheck, unit test, build
8. PR 템플릿과 ADR 템플릿

검증 기준:

- 새 checkout에서 문서의 단일 명령으로 설치 가능
- 전체 lint/typecheck/test/build 통과
- 세 앱과 API health endpoint 실행
- secret scan과 dependency audit가 CI에 포함

### Phase 1. 요구사항과 계약 고정 — 1~2주

목표: 화면의 숫자와 표를 실제 도메인, 상태, API로 변환한다.

Codex task:

1. 32개 화면 inventory와 라우트 매핑
2. 역할·권한 매트릭스 작성
3. Consent, Dataset, ResearchRequest, Campaign, Settlement, Subscription 상태 머신 정의
4. ERD 및 데이터 분류표 작성
5. OpenAPI 1차 명세
6. 감사 이벤트 catalog
7. 합성 seed 데이터 schema
8. 아키텍처 ADR 작성

핵심 산출물:

- `docs/product/screen-inventory.md`
- `docs/product/rbac-matrix.md`
- `docs/architecture/domain-model.md`
- `docs/api/openapi.yaml`
- `docs/security/data-classification.md`
- `docs/security/audit-events.md`

검증 기준:

- 모든 기획 화면의 수치가 계산식 또는 API 필드에 연결됨
- 화면에만 존재하고 업무 정의가 없는 상태가 별도 질문 목록에 기록됨
- 동일 개념의 명칭과 상태값이 포털 간 일치

### Phase 2. 디자인 시스템과 앱 shell — 2주

목표: 이후 화면 작업이 공통 컴포넌트 조립으로 진행되게 한다.

Codex task:

1. 색상, 타이포그래피, spacing, radius, shadow 토큰
2. Button, Input, Select, DateRange, Badge, KPI Card
3. DataTable, Pagination, FilterBar, ChartCard, Empty/Error/Loading
4. Web sidebar/header shell
5. Mobile bottom navigation/safe area shell
6. 반응형 breakpoint와 접근성 규칙
7. Storybook 및 visual regression
8. 대표 화면 4종의 정적 fixture 구현

대표 시각 검증 화면:

- `user/home.png`
- `hospital/overview.png`
- `rnd/datasetSearch.png`
- `rwa/RWA Projects.png`

검증 기준:

- 공통 컴포넌트가 앱별로 복제되지 않음
- 키보드 탐색, label, focus, 대비 점검
- 대표 viewport의 screenshot regression 구축
- 로딩·빈 결과·권한 없음·서버 오류 상태 포함

### Phase 3. Identity, Organization, Consent, Audit MVP — 3주

목표: 멀티테넌트와 동의 기반 접근 제어를 먼저 완성한다.

병렬 작업 묶음:

- A: 사용자/조직/멤버십/RBAC
- B: Consent domain과 revision/withdrawal
- C: 개인 My Data 화면
- D: 병원 Patient Consent 화면
- E: Audit event pipeline과 조회 UI

구현 항목:

- 개발용 로그인과 역할 전환
- 기관 경계가 포함된 repository query
- 동의 목적, 범위, 기간, 버전
- 활성화, 만료, 철회 요청, 철회 완료
- 환자 본인의 동의 조회와 철회
- 병원의 동의 검색·필터·상태 변경
- append-only 감사 이벤트

검증 기준:

- 다른 기관 데이터 접근 차단
- 동의 철회 이력 삭제 불가
- 동의가 없는 목적의 데이터 접근 차단
- 민감 식별자를 감사 로그 payload에 직접 저장하지 않음
- API integration/E2E와 권한 테스트 통과

### Phase 4. Device, Data Assets, Data Quality — 3주

목표: 합성 의료 데이터를 수집하고 연구용 데이터셋으로 등록한다.

Codex task:

1. Device/Gateway 등록과 상태 heartbeat
2. 합성 ECG, SpO2, 혈압, 활동량 수집 adapter
3. FHIR `Patient`, `Device`, `Observation`, `Consent` adapter 초안
4. 원천 데이터와 연구용 가명 데이터 분리
5. Dataset/Version/Metadata 등록
6. quality rule engine
7. Data Assets/Data Quality/Device Integration UI
8. 집계 worker와 dashboard query

품질 규칙 예:

- 필수 메타데이터 누락
- 허용 범위 이탈
- timestamp 역전·중복
- 장기 동기화 지연
- 비식별화 검토 필요
- 포맷 불일치

검증 기준:

- 재처리해도 중복 데이터가 생성되지 않음
- 품질 점수가 같은 입력에서 결정적으로 계산됨
- 원천 식별정보가 researcher API에 노출되지 않음
- 수집 실패 재시도와 dead-letter 처리

### Phase 5. Dataset Search, Cohort, Research Request — 4주

목표: 연구자가 데이터를 찾아 코호트를 구성하고 승인 요청을 제출한다.

Codex task:

1. Dataset Search 필터·정렬·저장 검색
2. 데이터 등급과 접근 정책
3. Cohort condition AST와 AND/OR builder
4. 예상 환자 수 집계와 privacy threshold
5. cohort template/snapshot
6. Research Request 작성·임시저장·제출
7. 파일 첨부와 문서 version
8. 병원 검토, 보완 요청, 승인, 거절
9. IRB/DRB/DUA/NDA checklist
10. Compliance dashboard

상태 흐름:

```text
DRAFT → SUBMITTED → HOSPITAL_REVIEW → IRB_REVIEW
      → CONTRACT_REVIEW → APPROVED → ACTIVE → EXPIRED/CLOSED
```

검증 기준:

- 조건 AST의 serialize/deserialize round trip
- 코호트 규모가 privacy threshold 미만이면 상세 집계 차단
- 요청 당시 dataset version과 cohort snapshot 보존
- 승인 이전 데이터 접근 불가
- 보완/거절/승인에 사유와 감사 이벤트 필수

여기까지를 1차 MVP 배포 범위로 권장한다.

### Phase 6. Campaign, Rewards, Wallet, Payment — 4주

목표: 연구 참여와 보상을 이중-entry 원장으로 관리한다.

Codex task:

1. Campaign Builder와 대상 조건
2. 환자 캠페인 탐색·참여·철회
3. 참여 milestone 추적
4. Reward policy와 accrual
5. double-entry ledger
6. claim/settle/reverse/recalculate
7. 개인 Rewards/Wallet UI
8. 병원 Rewards UI
9. R&D Payment, invoice, credit UI
10. reconciliation report

검증 기준:

- 모든 원장 분개 합계가 0으로 균형
- 동일 이벤트의 중복 보상 방지 idempotency key
- 환자 철회 시 향후 보상 정책이 명시적으로 적용
- 잔액 직접 수정 금지
- 실패한 지급의 재시도와 reversal 가능

이 단계에서는 L2N/USDC를 실제 토큰이 아닌 내부 테스트 자산으로 취급한다.

### Phase 7. Secure Analysis — 4~6주

목표: 승인된 연구 데이터만 격리 환경에서 분석하고 결과 반출을 통제한다.

PoC 구현:

- workspace/session/job domain
- 승인 데이터셋의 read-only mount simulation
- Notebook/SQL mock 또는 JupyterHub sandbox 연동
- CPU/GPU/storage quota
- 세션 만료와 강제 종료
- Export Request와 reviewer flow
- 세션·쿼리·파일·반출 감사 로그

운영 확장:

- Kubernetes namespace 격리
- 이미지 allowlist와 dependency policy
- network egress 제한
- malware/secret/identifier scan
- watermark와 download policy
- 결과 반출의 2인 승인

검증 기준:

- 승인되지 않은 dataset mount 불가
- workspace 간 파일/네트워크 격리
- 만료 후 credential과 volume 접근 불가
- 직접 다운로드 우회 E2E 테스트
- 분석 결과 반출 전 감사 및 승인 필수

### Phase 8. RWA Vault — 6주

목표: 규제 검토가 완료된 가정 아래 프로젝트, 적격성, 청약, 공시, 정산 흐름을 구현한다.

Codex task:

1. RWA Project/Stage/Milestone/SPV domain
2. 프로젝트 목록·상세·업데이트
3. 국가/투자자 유형별 eligibility rule
4. KYC/AML provider adapter interface와 mock
5. Document/Disclosure version과 acknowledgement
6. Subscribe 신청과 allocation
7. My Vaults/Portfolio
8. milestone/royalty settlement
9. tax document placeholder와 export
10. 관리자 review/audit 화면

검증 기준:

- 적격성 만료 또는 문서 미확인 시 청약 차단
- 청약 시점의 공시 문서 version 보존
- 금액 계산은 decimal과 단일 통화 규칙 사용
- 청약/배정/취소/환불/정산 상태 전이 테스트
- 실제 자금 이동과 온체인 transaction은 feature flag 뒤에 격리

### Phase 9. 리포트와 대시보드 완성 — 2주

목표: 기획 이미지의 모든 KPI와 차트를 검증 가능한 집계로 연결한다.

Codex task:

1. KPI catalog와 계산식 문서화
2. dashboard read model/materialized view
3. 기간/기관/역할별 집계
4. CSV/XLSX/PDF export
5. 환자 Data Report
6. 연구/병원/RWA 운영 리포트
7. timezone와 currency 처리

검증 기준:

- 각 KPI에 source table, 계산식, 갱신 주기, owner가 존재
- 상세 목록 합계와 KPI 카드 값 일치
- 기간 경계와 Asia/Seoul timezone 테스트
- export에도 화면과 동일한 권한 정책 적용

### Phase 10. 보안 강화와 출시 준비 — 3주

목표: 운영 배포 전 보안·복구·성능·관측성을 검증한다.

Codex task:

1. STRIDE 기반 위협 모델 갱신
2. IDOR, tenant escape, mass assignment, injection 테스트
3. secret/PII/PHI log scan
4. dependency/SAST/container scan
5. rate limit과 abuse protection
6. backup/restore rehearsal
7. migration rollback rehearsal
8. load test와 slow query 개선
9. SLO/dashboard/alert/runbook
10. 접근권한 및 감사 로그 운영 점검

출시 게이트:

- P0/P1 취약점 0건
- 복구 목표를 만족하는 restore 증거
- 주요 API 부하 테스트 통과
- 필수 감사 이벤트 누락 0건
- 관리자·병원·연구자·환자의 acceptance test 서명
- 법무·보안·의료·금융 담당자의 해당 범위 승인

## 6. Sprint별 Codex 실행 방식

### 월요일: 계약과 작업 분해

1. 담당자가 이번 sprint의 사용자 결과와 제외 범위를 확정한다.
2. Codex에 관련 이미지, PRD, 코드 경로를 읽혀 영향 분석을 요청한다.
3. API/schema 변경을 먼저 별도 task로 만든다.
4. 충돌하지 않는 UI/API/test task를 worktree로 분리한다.

### 화~목요일: 구현과 자체 검증

각 Codex task는 다음 순서로 종료한다.

1. 관련 지침과 기존 구현 확인
2. 최소 변경 구현
3. 변경 영역 unit/integration test
4. typecheck/lint/build
5. 필요한 migration과 문서 갱신
6. diff 자체 리뷰
7. 미검증 항목과 위험 보고

### 금요일: 통합과 회귀 검증

1. 계약 변경을 먼저 병합
2. 작은 PR 순서로 병합
3. 전체 test/build/E2E
4. 대표 화면 visual regression
5. 권한과 감사 이벤트 회귀 테스트
6. 사용자 시나리오 데모
7. 반복 피드백은 `AGENTS.md` 또는 project skill에 반영

## 7. Definition of Ready

Codex에 구현을 맡기기 전에 task에 다음 정보가 있어야 한다.

- 대상 사용자와 기대 결과
- 기준 화면 또는 PRD
- 포함/제외 범위
- API 또는 상태 전이
- 역할·권한
- PHI/PII 처리 여부
- 실패/빈 결과/로딩 상태
- acceptance criteria
- 실행해야 할 검증 명령
- 외부 변경·결제·배포 등 승인 필요 작업

## 8. Definition of Done

- 요구사항과 acceptance criteria 충족
- unit/integration/E2E 중 위험에 맞는 테스트 존재
- lint, typecheck, build 통과
- 접근 권한과 기관 격리 확인
- 감사 이벤트 확인
- 오류·로딩·빈 상태 구현
- OpenAPI/ERD/운영 문서 갱신
- migration forward/rollback 검토
- 실제 비밀정보·PHI fixture·민감 로그 없음
- 변경 diff에 대한 독립 리뷰 완료
- 미검증 항목이 결과에 명시됨

## 9. 테스트 전략

### 단위 테스트

- 상태 머신
- 품질 점수 계산
- 코호트 조건 AST
- reward/settlement 계산
- eligibility rule

### 통합 테스트

- DB repository와 tenant scope
- OpenAPI endpoint
- transactional outbox와 worker
- object storage 권한
- ledger transaction

### E2E 테스트

1. 환자 동의 → 병원 확인 → 데이터셋 등록
2. 연구자 검색 → 코호트 생성 → 요청 제출 → 승인
3. 승인 데이터 분석 → 반출 요청 → 승인
4. 캠페인 참여 → milestone → 보상 → 지갑 반영
5. RWA 적격성 → 공시 확인 → 청약 → 배정 → 정산
6. 동의 철회 후 신규 접근 차단
7. 다른 기관·사용자의 resource ID 직접 접근 차단

### 시각 테스트

- 기획서와 동일 viewport screenshot
- Chromatic 또는 Playwright snapshot
- 모바일 safe area와 글자 확대
- 표 overflow와 작은 노트북 화면
- 차트 데이터 없음/단일 값/큰 값

## 10. Codex 작업 우선순위 큐

다음 순서로 실제 개발을 시작한다.

| 순서 | Codex task | 선행 조건 | 완료 결과 |
|---:|---|---|---|
| 1 | 저장소 scaffold와 실행 환경 | 없음 | `pnpm dev/test/build` |
| 2 | `AGENTS.md`, CI, PR 템플릿 | 1 | 반복 가능한 품질 게이트 |
| 3 | 화면 inventory와 라우트 정의 | 없음 | 32개 화면 추적표 |
| 4 | 도메인/상태 머신/ERD | 3 | 설계 기준선 |
| 5 | OpenAPI와 mock server | 4 | UI/API 병렬 개발 가능 |
| 6 | 디자인 토큰과 공통 shell | 1 | Web/Mobile 기반 UI |
| 7 | Organization/User/RBAC | 4, 5 | 기관 격리와 역할 |
| 8 | Consent API와 감사 이벤트 | 7 | 핵심 동의 흐름 |
| 9 | Patient My Data 화면 | 6, 8 | 환자 동의 관리 |
| 10 | Hospital Patient Consent 화면 | 6, 8 | 병원 동의 관리 |
| 11 | 합성 데이터 수집과 Dataset | 7, 8 | 연구 데이터 기반 |
| 12 | Dataset Search/Cohort Builder | 5, 11 | 연구자 탐색 |
| 13 | Research Request/Approval | 12 | 1차 MVP 완성 |

## 11. 권장 릴리스 마일스톤

### M0 — 개발 기반선

- Phase 0~2
- 세 앱 shell, API, CI, 디자인 시스템, 계약

### M1 — 의료 데이터 연구 MVP

- Phase 3~5
- 동의 → 수집 → 데이터셋 → 검색 → 코호트 → 연구 승인

### M2 — 참여와 보상

- Phase 6, 9 일부
- 캠페인 → 참여 → 리워드 → 결제/리포트

### M3 — 보안 분석

- Phase 7
- 승인 데이터의 격리 분석과 결과 반출

### M4 — RWA Pilot

- Phase 8
- mock KYC와 테스트 자산 기반 청약·정산

### M5 — 운영 출시

- Phase 9~10
- 실제 연동, 성능, 복구, 보안, 규제 승인

## 12. 예상 일정

| 범위 | 누적 기간 | 결과 |
|---|---:|---|
| M0 | 4~5주 | 개발 가능한 기반선 |
| M1 | 14~15주 | 핵심 의료 데이터 연구 MVP |
| M2 | 18~19주 | 캠페인·보상·결제 |
| M3 | 22~25주 | Secure Analysis |
| M4 | 28~31주 | RWA Pilot |
| M5 | 33~36주 | 운영 출시 후보 |

인력이 1~2명뿐이라면 병렬 task 수를 줄이고 M1까지 약 20~24주, 전체 범위는 12개월 이상으로 잡는 것이 현실적이다.

## 13. 개발 착수 전 확정할 결정

1. MVP가 데모인지 실제 의료기관 파일럿인지
2. 대상 국가와 적용할 의료·개인정보·금융 규정
3. 환자 앱을 Expo로 시작할지 native가 필요한지
4. EMR/FHIR와 연결할 실제 기관·시스템
5. 기기 연동 대상과 데이터 수집 주기
6. 연구 데이터 저장 위치와 보존 기간
7. KYC/결제/수탁 공급자
8. L2N의 실제 토큰 발행 여부
9. RWA SPV와 투자 권리의 법적 구조
10. 예상 사용자, 데이터량, 동시 분석 세션

결정되지 않은 외부 연동은 adapter interface와 mock으로 개발하되, 실제 공급자에 종속된 구현은 계약과 규제 검토 뒤로 미룬다.

## 14. 참고한 Codex 운영 방식

- Codex 프로젝트 지침과 skills: https://learn.chatgpt.com/docs/customization/overview
- Codex Git worktrees: https://learn.chatgpt.com/docs/environments/git-worktrees
- OpenAI 모델 프롬프트/검증 가이드: https://developers.openai.com/api/docs/guides/latest-model
