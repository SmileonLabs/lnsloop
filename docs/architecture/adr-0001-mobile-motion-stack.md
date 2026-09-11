# ADR-0001: LNS Pulse 모바일 모션·그래픽 스택

- 상태: 승인(Accepted)
- 결정일: 2026-09-07
- 적용 대상: `apps/patient-mobile`의 LNS Pulse 화면과 공통 모바일 UI
- 결정 소유자: Mobile/Product Design

## 배경

LNS Pulse 시안은 일반적인 카드 전환뿐 아니라 다음과 같은 데이터 기반 그래픽을 포함한다.

- 사용자의 상태에 따라 값과 모양이 달라지는 컨디션 링
- 72시간 진행도와 세 개 상태 노드를 표시하는 Pulse 궤도
- 민트·오렌지·퍼플 색상의 빛 리본, 글로우와 파티클
- 건강 변화 및 보상을 표현하는 작은 차트
- 기록 완료에 반응하는 캡슐과 완료 효과

이 요소들은 미리 제작된 영상을 단순 재생하는 콘텐츠가 아니다. 실제 진행률, 기록 상태, 데이터 품질 및 접근성 설정에 반응해야 한다. 동시에 카드, 버튼, 텍스트와 터치 영역은 글자 확대와 스크린리더를 지원해야 한다.

따라서 일반 UI 모션과 복잡한 데이터 그래픽의 책임을 분리하되, 프로덕션 앱에 여러 애니메이션 런타임을 중복 탑재하지 않는 선택이 필요하다.

## 결정

LNS Pulse v1의 프로덕션 모션 스택을 다음과 같이 고정한다.

1. 앱 기반은 **Expo SDK 57, React Native 0.86 계열, React 19.2 계열, New Architecture, Hermes**로 한다.
2. 일반 UI 모션과 제스처는 **React Native Reanimated 4**가 담당한다.
3. 데이터 기반 곡선, 링, 글로우, 파티클과 차트는 **React Native Skia**가 담당한다.
4. 제스처 입력은 `react-native-gesture-handler`를 사용한다.
5. **Rive와 Lottie는 v1 프로덕션 의존성에 추가하지 않는다.** 필요성이 생기면 별도 PoC와 ADR을 거친다.
6. 모든 텍스트, 버튼, 폼, 터치 영역과 접근성 의미 구조는 일반 React Native 컴포넌트로 구현한다. Skia Canvas는 시각 표현에만 사용한다.

### 기준 버전

| 항목 | 기준 | 고정 방식 |
| --- | --- | --- |
| Expo | SDK 57.x | 프로젝트 생성 시 안정 최신 patch, lockfile 고정 |
| React Native | 0.86.x | Expo SDK가 선택한 버전 사용 |
| React | 19.2.x | Expo SDK가 선택한 버전 사용 |
| `react-native-reanimated` | 4.5.1 | `npx expo install` 결과와 lockfile 고정 |
| `react-native-worklets` | 0.10.1 | Reanimated와 같은 설치 단위로 고정 |
| `@shopify/react-native-skia` | 2.6.2 | `npx expo install` 결과와 lockfile 고정 |
| `react-native-gesture-handler` | Expo SDK 57 호환 버전 | `npx expo install` 결과와 lockfile 고정 |

표의 버전은 결정 시점의 Expo SDK 57 호환 기준이다. 실제 빌드의 단일 진실 공급원(source of truth)은 커밋된 `package.json`과 lockfile이다. 개발자가 개별 패키지만 임의로 `latest`로 올려서는 안 된다.

### 역할 분담

#### 일반 React Native 컴포넌트

- 화면 레이아웃, 카드, 목록, 버튼과 탭
- 제목, 설명, 시간, 보상 금액과 차트 데이터 라벨
- 실제 터치 영역과 포커스 순서
- 스크린리더 라벨, 상태 및 힌트

건강 상태와 보상처럼 의미가 있는 정보는 Canvas에만 그리지 않는다. 시각 그래픽과 동일한 내용을 접근 가능한 `Text` 또는 접근성 값으로도 제공한다.

#### Reanimated

- 카드 및 버튼 press feedback
- 화면 진입·퇴장과 상태 전환
- 설문 선택 노드와 progress 이동
- 숫자 count-up
- 모달, 바텀시트와 스크롤 반응
- Skia에 전달할 shared/derived value와 animation clock

프레임마다 움직이는 값은 가능한 한 `transform`, `opacity`, `backgroundColor`처럼 레이아웃을 다시 계산하지 않는 속성으로 제한한다. `width`, `height`, `top`, `left`, `margin`, `padding`을 연속 애니메이션하지 않는다.

#### React Native Skia

- 컨디션 링과 72시간 Pulse 궤도
- 진행 상태 노드와 빛의 꼬리
- 다중 그라데이션 리본과 제한된 파티클
- 캡슐 주변 글로우
- 수면·증상 변화 미니 차트
- 완료 시 퍼지는 시각 효과

가능하면 화면마다 하나의 합성 Canvas를 사용하고, Reanimated shared value를 Skia 속성에 직접 전달한다. 복잡한 캡슐 본체는 v1에서 정적 이미지 또는 고정 path로 만들고 상태·빛·진행도만 동적으로 표현한다.

## 구현 제약

- 한 화면에서 계속 재생되는 핵심 Skia Canvas는 최대 1개로 한다.
- Canvas 위의 버튼이나 링크는 별도 React Native 컴포넌트로 배치한다.
- 장식용 Canvas는 터치 이벤트를 가로채지 않게 한다.
- 화면이 focus를 잃거나 앱이 background 상태가 되면 animation clock을 중지한다.
- 화면 밖의 목록 항목과 보이지 않는 탭의 반복 애니메이션을 중지한다.
- 시스템의 Reduce Motion 설정을 기본적으로 존중한다. 이 경우 반복·이동 애니메이션 대신 정적인 최종 상태를 표시한다.
- 원격 애니메이션 파일은 첫 화면의 필수 의존성으로 사용하지 않는다. 핵심 에셋은 앱 또는 검증된 OTA 업데이트에 포함한다.
- 저사양 모드는 파티클 수와 업데이트 빈도를 낮추거나 정적 fallback으로 전환한다.
- 대형 blur를 매 프레임 다시 계산하지 않는다. 가능한 경우 작은 blur 영역, 캐시된 그림 또는 glow texture를 사용한다.
- v1에서 Skia `@next`, 실험적 Graphite backend와 실험적 Reanimated/React Native feature flag를 사용하지 않는다.
- Android의 고비트 심도 Canvas는 Graphite 의존성이 있으므로 v1에서 활성화하지 않는다. 어두운 그라데이션 밴딩은 색 조정이나 미세 noise/dither texture로 완화한다.

## 고려한 대안

### Reanimated만 사용

장점은 의존성과 학습 범위가 가장 작다는 것이다. 그러나 빛 리본, 여러 겹의 링, 파티클과 데이터 차트를 개별 React Native View나 SVG 요소로 구성하면 노드 수가 커지고 표현 코드가 분산된다. Reanimated 공식 성능 가이드도 복잡한 다수 요소에는 Skia 결합을 고려하도록 안내한다.

결론: 기본 UI에는 사용하지만 Pulse 그래픽 전체를 맡기지 않는다.

### Reanimated + Rive

Rive는 모션 디자이너가 상태 머신과 데이터 바인딩을 편집하기 좋다. 독립적인 브랜드 캐릭터나 상호작용이 많은 일러스트에는 적합하다.

현재 새 React Native 런타임은 Nitro Modules 기반 완전 재작성본이며 별도 native runtime과 Rive Editor 작업 흐름이 필요하다. LNS Pulse의 핵심 값은 실제 시간, 상태 및 차트 데이터이므로 코드 기반 그래픽이 더 직접적이다. Skia와 Rive를 함께 사용하면 렌더러, 에셋 생명주기, 빌드 및 테스트 경로가 이중화된다.

결론: v1에서 제외한다. 전담 모션 디자이너와 상태형 브랜드 캐릭터가 확정될 때 다시 평가한다.

### Reanimated + Lottie

Lottie는 After Effects로 제작한 로딩, 축하, empty-state 같은 비상호작용 애니메이션을 전달하기 쉽다. 그러나 런타임 데이터로 경로와 노드를 계속 바꾸는 Pulse 시각화에는 적합하지 않으며, 플랫폼별 After Effects 기능 지원 차이와 복잡한 mask/matte의 성능 비용을 별도로 관리해야 한다.

결론: 기존 After Effects 콘텐츠 파이프라인이 없는 v1에서는 제외한다. 향후 단순 JSON 애니메이션이 꼭 필요하면 별도 Lottie runtime 추가 전에 Skia의 Skottie 호환성을 에셋별로 먼저 시험한다.

### Reanimated + Skia + Rive + Lottie

각 도구의 장점을 모두 사용할 수 있지만 네이티브 바이너리 크기, 업그레이드 조합, 디버깅, 시각 회귀 및 장애 격리 비용이 지나치게 커진다.

결론: 채택하지 않는다.

## 호환성 및 업그레이드 정책

1. 설치와 정렬은 `npx expo install`을 사용한다.
2. CI에서 Expo dependency compatibility 검사를 실행한다.
3. Reanimated, Worklets와 Skia는 하나의 변경 묶음으로 업그레이드하고 iOS·Android 바이너리를 모두 다시 만든다.
4. Expo SDK 및 네이티브 모션 의존성은 기능 개발 중 수시로 올리지 않고 정해진 업그레이드 창에서만 변경한다.
5. 업그레이드는 별도 브랜치에서 정적 기준선, animation PoC, 전체 E2E와 release 성능 측정을 다시 통과해야 한다.
6. Reanimated/Worklets의 JavaScript, C++, Java/Objective-C 부분과 Babel 변환기 버전이 섞이지 않도록 중복 설치를 검사한다.
7. Hermes와 React Native DevTools를 표준 디버깅 경로로 사용한다. JavaScriptCore Remote JS Debugging을 전제로 하지 않는다.
8. Expo SDK 55 이상은 New Architecture 전용이므로 Legacy Architecture 전환을 롤백 수단으로 사용하지 않는다.

## 성능 예산

성능은 debug 빌드가 아니라 production과 동일한 release 빌드, 실제 iOS·Android 기기에서 측정한다. 60Hz를 v1 출시 기준으로 하며 120Hz는 best effort이다.

| 항목 | v1 통과 기준 |
| --- | --- |
| animation frame | 핵심 30초 구간에서 전체 frame의 95% 이상이 16.7ms 예산 안에 있을 것 |
| 심한 끊김 | 33.3ms를 넘는 frame 비율 1% 미만 |
| 입력 반응 | tap부터 첫 시각 반응까지 p95 100ms 이하 |
| 첫 화면 성능 | 정적 기준선 대비 time-to-interactive 악화 10% 이하 |
| 메모리 | 핵심 화면 진입·이탈 10회 뒤 지속 증가가 없고, 안정화 기준 잔류 증가 10MB 이하 |
| Canvas 수 | 보이는 화면당 지속 animation Canvas 1개 이하 |
| 앱 크기 | 정적 기준선 대비 Skia 추가분이 다운로드 크기 기준 iOS 약 6MB, Android 약 4MB에서 15% 이상 벗어나면 조사 |
| background | 앱 background 또는 화면 blur 후 1초 안에 반복 animation 정지 |
| 접근성 | Reduce Motion에서 기능과 정보 손실 0건 |

성능 목표를 넘기면 다음 순서로 낮춘다.

1. 화면 밖 animation 정지 확인
2. layout animation을 transform/opacity로 변경
3. 대형 blur, mask와 겹치는 layer 축소
4. 파티클 수와 갱신 빈도 축소
5. 캐시된 texture 또는 정적 이미지로 대체
6. 해당 화면을 reduced/static motion mode로 전환

## 테스트 전략

### 단위 및 컴포넌트 테스트

- 진행률, 각도, 경로 위치와 상태 색상 계산을 renderer 밖의 순수 함수로 유지한다.
- 시작 전, 진행 중, 완료, 데이터 없음과 오류 상태를 모두 검사한다.
- Reanimated의 Jest setup과 fake timer로 0%, 50%, 100% 시점을 검증한다.
- Skia 공식 Jest environment와 CanvasKit setup을 사용한다.
- Reduce Motion에서 즉시 정적인 최종 상태가 되는지 검사한다.
- Canvas를 제거해도 동일한 텍스트 정보와 접근성 값이 남는지 검사한다.

### 시각 회귀 테스트

- animation clock과 파티클 random seed를 고정한다.
- 주요 화면의 0%, 50%, 100% frame을 golden image로 저장한다.
- iOS·Android, 지원 viewport, 한국어·영어, 글자 확대와 Reduce Motion을 포함한다.
- 작은 렌더러 차이를 고려해 합의된 pixel tolerance를 적용하되, 숫자·노드 위치·색상 상태는 엄격히 검사한다.

### E2E 테스트

빌드된 앱을 대상으로 Maestro로 다음 흐름을 검사한다.

- Pulse 시작 및 재진입
- 설문 선택과 다음 단계
- 72시간 진행 상태 표시
- 기록 완료와 보상 상태 전환
- background 이동 후 복귀
- Reduce Motion 및 정적 fallback
- 에셋 로드 실패 시 기능 유지

EAS Workflows의 Maestro job은 결정 시점에 alpha이므로 유일한 출시 차단 장치로 사용하지 않는다. 로컬 또는 별도 CI 실행 경로를 함께 유지한다.

### 기기 성능 테스트

- 지원 범위 내 오래된 iPhone 1대
- 현재 주력 iPhone 1대
- 4GB 메모리급 중저가 Android 1대
- 현재 주력 Android 1대

각 기기에서 cold start, 화면 첫 render, UI/JS FPS, 메모리, 5분 반복 animation의 발열·배터리 경향과 화면 10회 진입·이탈을 측정한다.

## PoC 및 출시 게이트

구현은 다음 순서로 검증한다.

1. 세 개 Pulse 화면의 정적 React Native 기준선을 만든다.
2. Reanimated로 press, 설문 선택, progress 및 화면 전환을 구현한다.
3. Skia로 가장 어려운 두 장면인 72시간 궤도와 캡슐·글로우 장면을 구현한다.
4. 실제 데이터 상태와 Reduce Motion을 연결한다.
5. release 기기 성능, 시각 회귀와 E2E를 측정한다.
6. 이 ADR의 성능 예산을 통과한 뒤 나머지 Pulse 그래픽을 확장한다.

Rive 또는 Lottie 비교 실험은 프로덕션 앱 의존성에 넣지 않은 별도 PoC에서만 수행한다. 동일한 장면과 동일한 기기·빌드 조건으로 시각 충실도, 바이너리 증가, 첫 render, FPS, 메모리와 제작 시간을 비교한다.

## 배포 및 롤백

> 구현 상태: 현재 PoC에는 `runtimeVersion`, staging/production 빌드 프로필, 번들 내 `static` fallback까지만 적용되어 있다. EAS 프로젝트 연결, `expo-updates`, `updates.url`, `extra.eas.projectId`, 원격 설정은 아직 없으므로 아래 OTA 전환·롤백 절차는 운영 구축 목표이며 현재 작동한다고 간주하지 않는다.

### 배포

- Expo Go가 아니라 Expo Development Build를 개발 기준으로 사용한다.
- `development`, `preview`, `staging`, `production` 채널을 분리한다.
- staging은 production과 같은 native runtime으로 TestFlight와 Google Play 내부 트랙에서 검증한다.
- `runtimeVersion`은 Expo가 권장하는 `appVersion` 정책을 사용한다.
- 네이티브 의존성 변경은 OTA로 배포하지 않고 새 바이너리를 만든다.
- JS와 번들 에셋 변경만 호환 runtime에 EAS Update로 배포한다.
- 업데이트는 내부 사용자, 5%, 25%, 100% 순서로 확대하며 오류율과 성능을 확인한다.

### 런타임 롤백

모든 Pulse 그래픽은 다음 세 단계의 motion mode를 지원한다.

- `full`: Reanimated + Skia 전체 표현
- `reduced`: 이동·반복·파티클을 줄인 표현
- `static`: 정적 이미지·SVG·일반 React Native 컴포넌트만 사용하는 표현

EAS Update 구성이 완료된 운영 앱에서는 Skia 화면 장애가 발생하면 원격 설정 또는 동일 runtime의 EAS Update로 해당 화면을 `static`으로 전환한다. 현재 PoC는 빌드 환경변수 또는 앱 설정으로만 전환한다. 이 fallback은 네트워크가 없어도 앱에 포함되어 있어야 한다.

OTA 이후 오류가 증가하면 이전에 검증한 update로 되돌린다. 네이티브 초기화·링크 단계에서 발생하는 오류는 OTA로 제거할 수 없으므로 staged store rollout을 중단하고 수정 바이너리를 배포한다. 이 이유로 네이티브 버전 변경은 preview와 staging의 실제 기기 실행을 통과하기 전 production에 올리지 않는다.

## 결과와 트레이드오프

### 기대 효과

- 실제 건강 데이터와 진행률을 하나의 animation model로 표현할 수 있다.
- 일반 UI와 그래픽의 책임이 명확하다.
- Skia와 Reanimated가 shared value를 직접 공유해 프레임별 React render를 줄일 수 있다.
- Rive와 Lottie 중복 런타임을 피해 빌드·업그레이드·테스트 범위를 제한한다.
- Canvas 장애 시에도 일반 React Native 기반 정보와 행동은 유지된다.

### 수용하는 비용

- Skia로 인해 앱 다운로드 크기가 증가한다.
- Android NDK/CMake와 iOS native build 관리가 필요하다.
- 모션 디자이너가 그래픽을 독립적으로 배포하기보다 개발자와 협업해야 한다.
- Canvas 자체는 접근성 트리를 대신하지 못하므로 의미 정보의 이중 표현이 필요하다.
- 어두운 그라데이션, blur와 파티클은 저사양 기기에서 별도 최적화가 필요하다.

## 재검토 조건

다음 중 하나가 발생하면 별도 ADR로 결정을 재검토한다.

- 전담 Rive 모션 디자이너와 세 가지 이상 상태를 가진 브랜드 캐릭터가 확정됨
- 다섯 개 이상의 반복 사용 Lottie 에셋을 제공하는 After Effects 제작 파이프라인이 생김
- Skia가 성능 예산을 통과하지 못하고 정적 fallback으로도 제품 요구를 충족하지 못함
- Expo SDK 또는 React Native 업그레이드가 현재 조합의 호환성을 중단함
- 웹에서 Pulse 그래픽의 완전한 기능 동등성이 출시 요구가 됨

## 참고 자료

- [Expo SDK 버전 및 플랫폼 지원](https://docs.expo.dev/versions/latest/)
- [Expo SDK 57: React Native Reanimated](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/)
- [Expo SDK 57: React Native Skia](https://docs.expo.dev/versions/v57.0.0/sdk/skia/)
- [Expo: React Native New Architecture](https://docs.expo.dev/guides/new-architecture/)
- [Reanimated 성능 가이드](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [Reanimated 접근성 가이드](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)
- [Reanimated Jest 테스트](https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/)
- [React Native Skia 애니메이션 연동](https://shopify.github.io/react-native-skia/docs/animations/animations/)
- [React Native Skia 설치, 크기 및 Jest 설정](https://shopify.github.io/react-native-skia/docs/getting-started/installation/)
- [React Native Skia Canvas와 high bit depth](https://shopify.github.io/react-native-skia/docs/canvas/overview/)
- [Rive React Native 새 런타임](https://github.com/rive-app/rive-nitro-react-native)
- [Rive의 Expo 설정](https://rive.app/docs/runtimes/react-native/adding-rive-to-expo)
- [Lottie React Native](https://github.com/lottie-react-native/lottie-react-native)
- [Lottie Android 성능 가이드](https://github.com/airbnb/lottie/blob/master/android.md)
- [Expo EAS runtime version과 업데이트](https://docs.expo.dev/eas-update/runtime-versions/)
- [Expo EAS Workflows의 Maestro E2E 테스트](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)
