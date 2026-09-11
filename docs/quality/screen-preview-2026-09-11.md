# LNS Loop 화면 프로토타입

승인된 4화면 이미지의 차콜 배경, 민트 버튼, 큰 타이포, 실버 Loop 그래픽을 Expo/React Native 화면으로 구현했다. 마이페이지와 연구 설명·동의·적합성 보조 화면도 같은 테마로 구성했다.

## 범위

Google 버튼은 홈으로 이동한다. 탭 전환, 연구 안내 순서, 포인트 Activity/Ranking 전환, 소개·설정·약관 미리보기, 로그아웃만 로컬 화면 상태를 바꾼다. 인증 요청, 입력 저장, 실제 참여 신청·동의, 적합성 판정, 포인트 적립은 수행하지 않는다. 새로고침하면 로그인으로 돌아온다.

## 확인

- TypeScript 검사 통과
- 웹 export 통과
- 브라우저에서 더미 로그인 → 홈 → 연구 정보 → 동의 → 적합성 이동 확인
- 포인트 Activity/Ranking, 프로필, 로그아웃 이동 확인
- 로그인·홈·포인트의 브라우저 화면을 캡처해 확인
- iOS/Android 실제 기기와 큰 시스템 글자 크기는 미검증

## 그래픽

`apps/patient-mobile/assets/brand/loop.png`: 내장 imagegen 도구 사용. 프롬프트 요약: "Single brushed-silver Mobius ribbon, pale mint inner surface, three-quarter view, #181C20 background, restrained studio lighting, no text." 승인된 시안을 참고해 생성했다. 아이콘과 세포 장식은 React Native 도형이다.
