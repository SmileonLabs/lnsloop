# LNS Loop Patient Mobile

`LNS Pulse`의 모션·인터랙션을 검증하기 위한 Expo/React Native 모바일 PoC입니다. 모든 건강 기록과 보상 값은 합성 예시이며 실제 진단, 병원 검증, 연구 전송 또는 LNS 지급을 수행하지 않습니다.

## 구현된 흐름

1. **Pulse — 변화 감지**: 수면·증상·병원 기록 신호가 하나의 변화 지점으로 모입니다.
2. **Trace — 72시간 기록**: 하루 30초 기록, 웨어러블 연결, 약물 변경 확인의 진행 상태를 보여 줍니다.
3. **Seal — 변화 캡슐**: 검증된 변화 구간을 캡슐로 묶고 예시 보상 `+12 LNS`를 표시합니다.

변화 감지 화면의 세 리본은 처음부터 완성된 cubic path를 따라 `end` trim으로 `900ms`씩 자연스럽게 그려지며, `80ms` 간격으로 시작해 전체 공개는 `1060ms`에 끝납니다. 공개 중에는 곡선 geometry를 바꾸지 않습니다. 세 선의 공개가 끝나면 약 `1.5px`의 짧은 spring recoil 뒤 `0.5–0.9px` 저진폭 흔들림으로 이어지고, 끝점과 중앙 합류점은 항상 고정됩니다. 형광 shimmer도 세 선의 공개가 끝난 뒤에만 시작합니다.

나머지 화면에는 중심점 호흡, 완료 구간 순환광, 캡슐 유리 안쪽의 컬러 번짐이 이어집니다. 반복 모션은 데이터 값 자체를 움직이지 않으며 앱이 비활성화되거나 Reduce Motion이 켜지면 즉시 정지합니다. Reduce Motion에서는 세 리본을 완성된 곡선으로 정적 표시합니다.

상단 `모션/정적` 스위치로 Reduce Motion 대체 동작을 직접 확인할 수 있습니다. 운영체제의 모션 축소 설정도 자동 반영합니다.

Skia를 우회해야 하는 빌드에서는 `EXPO_PUBLIC_PULSE_MOTION_MODE=static`을 사용합니다. 가능한 값은 `full`, `reduced`, `static`이며 `static`은 Skia 컴포넌트를 마운트하지 않고 React Native 기본 도형 fallback을 표시합니다. 일반 `full`/`reduced` 모드에서 Skia를 lazy-load하는 동안에는 높이만 보존하는 빈 placeholder를 사용하므로, 직선 fallback이 먼저 보였다가 곡선으로 바뀌지 않습니다. 로컬에서 모드를 바꿔 export할 때는 Metro 캐시를 지우도록 `expo export --clear`를 사용합니다.

현재 `static` 전환은 빌드·번들 생성 시 적용하는 로컬 fallback입니다. EAS 프로젝트와 `expo-updates`가 연결되지 않아 원격 설정·OTA 롤백은 아직 지원하지 않습니다.

## 실행

필수 환경은 Node.js `20.19.4+`와 pnpm `11.x`입니다.

```bash
pnpm install
pnpm start
```

플랫폼별 실행:

```bash
pnpm web
pnpm ios
pnpm android
```

Web에서 Skia CanvasKit 파일이 없을 경우 다음 명령을 한 번 실행합니다.

```bash
pnpm postinstall
```

## 검증

```bash
pnpm typecheck
pnpm export:web
```

현재 PoC는 다음 항목을 검증했습니다.

- 세 화면과 `mission → verifying → capsule` 상태 전환
- Skia 리본, 진행 링, 캡슐 렌더링
- Reanimated 화면 진입과 버튼 피드백
- Reduce Motion 수동/시스템 설정
- iOS/Android 햅틱의 웹 안전 fallback
- 앱이 비활성화될 때 개인정보 보호 커버
- 네이티브 화면 캡처 차단과 iOS 앱 전환기 보호
- Skia 비활성화를 위한 `static` 빌드·fallback 모드
- 모바일 및 데스크톱 웹 프레임

## 코드 구조

```text
app/                         Expo Router 진입점
src/components/pulse/        Skia 시그니처 비주얼과 웹 로더
src/components/ui/           공통 UI 컴포넌트
src/features/pulse/          화면, 상태 전환, 합성 데이터 모델
src/theme/                   색상·간격·타이포·모션 토큰
public/canvaskit.wasm        Skia 웹 런타임
```

관련 문서:

- `../../docs/product/lns-pulse-motion-spec.md`
- `../../docs/architecture/adr-0001-mobile-motion-stack.md`
- `../../docs/quality/pulse-accessibility-privacy-qa.md`

## 운영 전 필수 작업

- EAS 프로젝트를 연결하고 `expo-updates`, `updates.url`, `extra.eas.projectId`를 설정한 뒤 OTA 배포·롤백을 실제로 검증
- 병원/FHIR·웨어러블 데이터 연결과 출처(provenance) 검증
- 연구 동의, 철회, 목적 제한, 국가별 개인정보 규정 적용
- 보상 산정·검증·지급을 서버 원장과 온체인 거래 상태에 연결
- `검증됨`, `완료`, `+12 LNS`를 서버 최종 상태에서만 표시
- 오프라인·실패·만료·철회·재심사 상태 구현
- 실제 iOS/Android 기기에서 접근성·성능·개인정보 QA
