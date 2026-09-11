# LNS Loop

“작은 기록이 더 나은 연구로 이어져요.”

호주 멜버른의 성인 궤양성 대장염(UC) 참여자 100명을 대상으로, 기존 병원기록과 12주 일상 기록을 연결하는 비중재 관찰 연구를 첫 제품 방향으로 삼습니다. 현재 코드는 **LNS Pulse 모션 PoC**이며 실제 연구 운영·의료정보 연동·LNS 지급 기능이 완성된 상태는 아닙니다.

현재 초기 앱 방향은 **Google 로그인 → 연구 참여·기록 → 포인트 적립**입니다. 소개 온보딩과 지갑은 뒤로 미루고, 현재는 포인트 적립·내역을 제공합니다. [초기 앱 기능 정리](docs/product/lns-loop-mvp-features.md)를 먼저 참고하세요. 이 범위는 기획이며 현재 PoC에 구현된 상태는 아닙니다.

## 먼저 읽을 문서

1. [제품 기준안 — 2026-09-11](docs/product/lns-loop-product-brief.md): 제품 범위, 연구 흐름, 보상 가설, 데이터 원칙, 브랜드, 로드맵, KPI, 미확정 사항
2. [SmileOn Labs 제공 원문](docs/reference/2026-09-11-smileon-labs-original.txt): 전달받은 내용을 그대로 보관
3. [Joined Bio 분석 및 적용 메모](docs/research/joined-bio-review.md): 공개 서비스·동의·보상·운영 구조와 LNS Loop 참고 제안
4. [Joined Bio 조사 출처 목록](docs/research/joined-bio-source-map.md): 서비스·정책 문서와 자료실 게시물 30건
5. [모바일 앱 실행 안내](apps/patient-mobile/README.md): 현재 PoC 기능과 실행·검증 명령

## 저장소 구조

| 위치 | 내용 |
| --- | --- |
| `apps/patient-mobile/` | Expo/React Native 모바일 PoC |
| `docs/product/` | 최신 제품 기준안과 기존 Pulse 모션 명세 |
| `docs/research/` | 외부 서비스 조사와 적용 메모 |
| `docs/reference/` | 사용자 제공 원문 |
| `docs/architecture/` | 기술 결정 기록 |
| `docs/quality/` | 기존 PoC QA 자료 |
| `design/` | 디자인 참고 자료 |
| `plan/` | 과거 개발 계획과 역할별 화면 기획 자료 |

기존 자료와 2026-09-11 제품 기준안의 범위가 다르면 새 제품 기준안을 먼저 참고합니다. 기존 Pulse 72시간 흐름과 예시 보상을 12주 UC 연구의 확정 규칙으로 해석하지 않습니다.

## 모바일 PoC 실행

앱 README에 명시된 Node.js `20.19.4+`, pnpm `11.x` 환경에서:

```bash
cd apps/patient-mobile
pnpm install
pnpm start
```

플랫폼별 실행 및 검증은 [앱 README](apps/patient-mobile/README.md)를 참고하세요.
