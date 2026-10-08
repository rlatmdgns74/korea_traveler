# CLAUDE.md — 코리아 트래블러 (실사판 부루마블 여행 게임)

> Claude Code가 매 세션 가장 먼저 읽는 프로젝트 안내서.
> 근거: 앱 폴더(`C:\NewBusiness\appFolder`) 분석 + 사업 지원서(팀 방구석공상가, 2026.09).

---

## 0. 지금 이 폴더의 정체 (먼저 읽을 것)

이 폴더는 **소스 프로젝트가 아니라 `app-debug.apk`를 apktool로 풀어놓은 결과물**이다.

- `smali*/`, `res/`, `unknown/`, `original/` → 컴파일된 안드로이드 껍데기. **직접 수정하지 않는다.**
- 앱은 **Capacitor(웹뷰) 앱**이다. 화면·로직·지도 데이터가 전부
  **`assets/public/index.html` 한 파일**(약 160KB)에 들어 있다. 기능 수정은 이 파일에서 한다.
- `assets/capacitor.config.json`: appId `com.jihyeok.koreatraveler`, 앱 이름 `코리아 트래블러`
- 네이티브 플러그인: `@capacitor/geolocation` 하나뿐
- minSdk 22 / targetSdk 34 / 디버그 빌드(`android:debuggable="true"`)

### 작업 방식 두 가지

| | A. 지금 폴더에서 바로 수정 (임시) | B. Capacitor 프로젝트로 재구성 (권장) |
|---|---|---|
| 수정 위치 | `assets/public/index.html` | `www/` 아래 여러 파일 |
| 빌드 | `apktool b` → 정렬 → 서명 | `npx cap sync` → `gradlew assembleDebug` |
| 장점 | 바로 시작 가능 | 플러그인 추가, 릴리스 서명, 파일 분리 가능 |
| 한계 | 새 네이티브 플러그인 추가 거의 불가, 릴리스 부적합 | 최초 1회 이전 작업 필요 |

**규칙:** 작은 UI·로직 수정은 A로 해도 되지만, 새 네이티브 기능(카메라, 푸시, 백그라운드 위치,
로그인 등)이 필요해지면 **먼저 B로 이전**하고 진행한다. 이전 작업은 사용자 승인 후 시작.

---

## 1. 서비스 개요 (지원서 기준)

**한 줄:** 대한민국 전체가 거대한 게임판. 실제로 가서 GPS로 인증하면 지역이 해금되는 실사판 부루마블.

**해결하려는 문제:** 여행 '정보'의 부족이 아니라, 여행을 떠나고 다시 찾게 만드는 '동기'의 부족.

**핵심 순환 구조:**
여행 → 지역 해금 → 경험 공유(포스트) → 평가 및 보상 → 개인 지도 성장(건물 건설) → 새로운 여행

**차별점:** 현장 GPS 인증 해금의 성취감 + 해금 지역 위에 건물·기념물을 지어 꾸미는
'영구적인 맵 해금과 소유권' + 남에게 전시되는 수집 기록.

---

## 2. 현재 목업에 구현된 것

| 기능 | 구현 위치 (`index.html` 안 함수) | 상태 |
|---|---|---|
| 온보딩: 현재 위치로 홈 지역 지정 | `btnLocate` 핸들러, `startWithHome` | 동작 |
| 지역 판정 (좌표 → 시·도) | `findRegionForPoint`, `pointInPolys`, `pointInRing` (bbox 선필터 후 폴리곤 검사) | 동작 |
| SVG 전국 지도 + 해금/잠김/홈 색칠 | `buildMap`, `renderMap` | 동작 |
| 잠긴 지역: "지금 여기 있는지 확인" → 미션 | `renderLockedSheet` | 동작 |
| 해금 미션 = 커뮤니티 포스트(글+사진) 작성 | `renderMissionForm`, `addPost` | 동작 (사진은 480px JPEG로 축소) |
| 해금 지역 피드 | `renderUnlockedSheet`, `seedPosts` | **가짜 시드 글**(SEED_NAMES) 섞어서 표시 |
| 지역 꾸미기: 4×4 그리드에 건물 8종 배치 | `renderDecorateSheet`, `BUILDINGS`, `GRID_N` | 동작 |
| 빌드 모드 | `<head>`의 `BUILD_MODE`("dev"/"user") → `DEV`. user면 `[data-dev-only]` 요소를 DOM에서 제거 | 원본은 항상 `"dev"` |
| 테스트 모드 (dev 전용): 가상 위치, 더블 탭 즉시 해금 | `setDevMode`, `moveSimulatedTo`, `handleMapTap`/`doubleTapUnlock` | user 빌드에서는 동작 안 함 |
| 하단 탭(지도/설정), 설정: 위치 권한·테마·백업/복원·초기화·버전 | `switchTab`, `renderSettings`, `renderExportSheet`, `renderImportSheet`, `renderResetSheet` | 동작 (앱에선 파일 저장 불가 → 클립보드 복사) |
| 위치 정확도 검사 | `ACCURACY_LIMIT_M`(100m), `poorAccuracy`, `maximumAge:0` | 동작 |
| 저장 | `localStorage["kr-traveler-state-v4"]` (아래 데이터 구조 참고, v1~v3는 백업으로 유지) | 기기 내 저장만 |

### 데이터 구조 (2026-10-08 v4: 광역시 1곳 통합 + 챌린지)
- 지도 데이터는 index.html 밖 **`assets/public/data/`** 의 자동 생성 파일 (합계 약 350KB):
  - `sido.js` → `var MAP_SIDO = {source, enc:"d4", regions:[...]}` 시·도 16개 (2026-07 광주·전남 통합, 군위→대구, 강원·전북 특별자치도)
  - `sub.js` → `var MAP_SUB = {"41":{regions:[...]}, ...}` 하위 지역 153개 (하위 지역이 있는 9개 시·도)
  - `challenge.js` → `var MAP_CHALLENGE = {regions:[...]}` 챌린지 6개 (울릉도·독도·백령도·대청도·소청도·연평도)
  - 각 지역: `code, name, name_eng(시·도·강원만), bbox, lp(다각형 안쪽 보장 점), a(면적 km²), p(d4 인코딩 좌표)` (+ 시·도 `sub:1`, 하위 지역·챌린지 `parent`, 챌린지 `desc`)
  - 좌표 **d4 인코딩**: 경위도×1e4 정수, 링마다 첫 점 절대값 + 이후 차이. 앱 시작 시 `decodePolys`로 `polys`를 만든다
  - **직접 수정 금지.** `node C:NewBusiness	oolsmapdatauild.mjs`로 다시 만든다 (검사 실패 시 쓰지 않음)
    (원본 `C:NewBusinessgeo-srcHangJeongDong_ver20260701.geojson`, vuski/admdongkor, CC BY 4.0 → 앱 하단 출처 표기 유지).
    한 줄짜리 큰 JSON이므로 Read하지 말고 `node -e`로 필요한 필드만 본다.
  - 단순화 250m. 1km² 미만 조각은 버리되, 단순화로 사라진 0.05km² 이상 섬(마라도·가파도 등)은 꼭짓점 ~10개로 해금 단위에만 복원. 독도는 원본 그대로
- 해금 단위 규칙 (`build.mjs` 상단 상수):
  - 도 = 시·군, **일반구는 시로 묶음**(수원·성남·안양·부천·안산·고양·용인·화성·청주·천안·포항·창원·전주 → 코드 앞4자리+"0"). 판별은 **이름("○○시○○구")으로** (코드 끝자리로 하면 광진구·증평군·인천 신설 구가 잘못 묶인다)
  - **특별·광역시(서울·부산·대구·인천·대전·울산)는 군까지 통째로 1곳**(`METROS`), 세종도 1곳
  - 전남광주통합특별시: **옛 광주 5개 구 → 광주 1곳(코드 12000)** + 5시 17군
  - **울릉군(47940)은 일반 지역에서 빼고 챌린지로만** (`EXCLUDE_UNITS`). 백령도 등 서해5도는 인천 1곳과 별개로 챌린지 추가
- 해금 단위 수 = **160** (`TOTAL_UNITS`): 서울1 전남광주23 부산1 대구1 인천1 대전1 울산1 세종1 경기31 충북11 충남15 경북21 경남18 제주2 강원18 전북14. 챌린지 6은 따로 센다
- 위치 판정: `findRegionForPoint`(160 단위)와 `findChallengeForPoint`(챌린지)를 따로 한다. bbox 선필터, 실패 시 2km 안 최근접
- 화면: 하단 탭 **지도 / 도감 / 챌린지 / 설정**. 도감(`renderDex`)은 시·도별 목록·검색·해금 날짜, 챌린지(`renderChallenges`)는 카드. 해금 시 도장 연출(`showStamp`, 1.8초, 모션 줄이기 설정 대응)
- 저장 실패(용량 초과): `saveStateQuiet`로 확인 → 실패하면 방금 바꾼 것을 되돌리고 `showSaveError`로 알림(사진이 있으면 "사진 빼고 올리기")
- 투영: 위경도 등장방형, 경도에 cos(중앙 위도) 보정. SVG 경로는 실행 시 `pathFor(region)`로 생성
- **표시용 섬 배치(`DISPLAY_RULES`)**: 모바일에서 지도를 크게 보이려고 먼 섬(서해5도·가거·흑산·격렬비열·울릉·독도·제주·추자)을 내륙 쪽으로 옮기고 키운다. **화면 표시(`displayPolys`/`displayPoint`/`displayBBox`)에만 적용**하고, 위치 판정·이전·가상 위치는 반드시 실제 좌표(`r.polys`, `r.lp`)를 쓴다. 챌린지 섬은 보이지 않는 터치 영역(`chal-hit`, 반지름 16px)을 두고, 여러 개가 겹치면 "이 근처 챌린지" 선택 창을 띄운다
- 저장: `localStorage["kr-traveler-state-v4"]` = `{version:4, home, unlocks{code:{at,lon,lat,acc,test,via}}, posts{}, buildings{}, legacy{}}` — 챌린지 해금도 `unlocks`에 챌린지 코드(`c_…`)로
  - 불러오기 순서 v4 → v3 → v2 → v1, `upgradeState`로 맞춘다. **이전 버전 키는 백업으로 지우지 않는다.** 백업 복원도 같은 경로
  - v3→v4 (`migrateV3`): 광역시의 구·군 → 광역시, 옛 광주 구 → 12000, 울릉군 → 울릉도 챌린지(좌표가 독도면 독도). 합쳐질 때 실제 기록 우선·이른 시각, 포스트 이어 붙임, 건물은 많은 쪽 + 나머지 `legacy[코드].spareBuildings`. 좌표가 없어 이전 기록뿐이던 광역시 해금은 되살림
  - v2→v4 (`migrateV2`): 시·도 해금 + 좌표 → 그 좌표의 하위 지역(없으면 챌린지) / 좌표 없음 → `legacy[시·도]`
  - v1→v4 (`migrateV1`): 광역시·세종·광주(24→12000)는 해금 유지, 도 단위 해금은 좌표가 없으므로 `legacy[시·도]`
  - 시·도 코드로 남은 포스트·건물은 그 시·도 확대 화면의 "📜 이전 기록"(`renderLegacySheet`)에서 보인다
  - `via`: gps | sim(가상 위치) | dbltap | list(목록 즉시 해금) | dev-all | v1
- 개발용 서버: `node C:\NewBusiness\tools\devserver.js` → http://localhost:5179 (file://로 열면 data/*.js·localStorage가 안 됨)

### 알려진 문제 (수정 백로그 후보)
- 지역명 구식: `강원도`(→ 강원특별자치도, 2023), `전라북도`(→ 전북특별자치도, 2024)
- GPS 정확도(`accuracy`) 검사 없음, 모의 위치(위치 조작) 검사 없음, 이동 속도 검사 없음
- (해결 2026-10-08) 테스트 모드는 dev 빌드에서만. 단 코드 자체는 user APK에도 들어 있다(실행만 막음)
- 해금 후 언제든 아무 데서나 추가 포스트 가능 (현장 인증 없음)
- (해결 2026-10-08) `maximumAge:0`, 정확도 100m 초과 시 판정 보류
- `window.claude.hot` 관련 코드는 프로토타입 도구의 흔적, 앱 동작과 무관 (정리 대상)
- 사진을 base64로 localStorage에 저장 → 용량 한도(보통 5MB 안팎) 초과 시 저장 실패가 조용히 묻힘

---

## 3. 제품 로드맵 (지원서 사업화 계획)

작업 우선순위를 판단할 때 이 순서를 따른다.

**1단계 — MVP (현재 목표)**
- GPS 기반 지역 해금 + 보상 시스템
- 콘텐츠는 **글 기반**, 영상 업로드는 넣지 않는다 (서버·스토리지 비용 방어)
- GPS 어뷰징 방지 **이상 탐지(FDS) 기초**
- 오픈 지역은 **특정 1개 권역**(예: 제주도 또는 강원도 특정 시)으로 한정 → 시·군·구 단위 세분화 필요
- 초기 유저: 대학생 서포터즈, 여행 마이크로 인플루언서

**2단계 — 로컬 생태계**
- 지자체 B2G 제휴: '한정판 스페셜 구역 퀘스트', 기간 한정 특별 구역, 보물 상자
- 앱 재화 → 지역 랜드마크·소상공인 가맹점 할인 바우처 교환 (O2O)

**3단계 — 전국 확장 + B2C**
- 전국 맵 오픈, 서버 아키텍처 확장, AI 추천('리뷰 공장' 콘텐츠)
- 치장형 유료 아이템: 스킨, 프로필 아바타, 리뷰 테두리

**4단계 — 데이터 비즈니스**
- 이동 동선·체류 시간·선호 여행지 데이터를 가공한 '관광 상권 분석 리포트' (B2B)
- 피드 내 네이티브 광고, 보상형 동영상 광고

> 2단계 이후 기능(재화, 쿠폰, 결제, 서버, 데이터 판매)은 **법적 검토가 선행돼야 하므로**
> 구현 전에 반드시 사용자와 상의한다. (§7 참고)

---

## 4. 명령어

> 사용자 환경: **Windows** (`C:\NewBusiness\appFolder`). 아래는 Git Bash 기준.
> 필요한 도구: JDK 17, Android SDK(build-tools: `zipalign`, `apksigner`), `adb`, apktool, Node.js(B 방식).

### A. 지금 폴더에서 수정 후 다시 APK 만들기

**보통은 스크립트를 쓴다** (원본은 건드리지 않고 `build/`에 복사해서 BUILD_MODE만 바꿔 묶는다):
```bash
bash tools/build-apk.sh dev    # → dist/koreatraveler-dev.apk
bash tools/build-apk.sh user   # → dist/koreatraveler-user.apk (사용자에게 줄 것은 항상 user)
```
아래는 스크립트가 하는 일을 손으로 하는 방법이다.
```bash
# 1) 다시 묶기 (appFolder의 상위 폴더에서 실행)
apktool b appFolder -o dist/unsigned.apk
# 2) 정렬
zipalign -p -f 4 dist/unsigned.apk dist/aligned.apk
# 3) 서명 (debug.keystore는 ~/.android/debug.keystore, 비밀번호 android)
apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --out dist/koreatraveler-debug.apk dist/aligned.apk
# 4) 설치
adb install -r dist/koreatraveler-debug.apk
```
- 원본 APK와 서명 키가 다르면 `-r` 설치가 실패한다 → `adb uninstall com.jihyeok.koreatraveler` 후 설치.
  **이때 기기 안의 해금 기록(localStorage)이 지워진다.** 실사용 데이터가 있으면 먼저 사용자에게 알린다.
- `dist/`, `build/` 결과물은 appFolder 안에 만들지 않는다 (apktool이 다시 묶어버림).

### B. Capacitor 프로젝트로 재구성 (최초 1회, 승인 후)
```bash
mkdir koreatraveler && cd koreatraveler
npm init -y
npm i @capacitor/core @capacitor/geolocation
npm i -D @capacitor/cli @capacitor/android
npx cap init "코리아 트래블러" com.jihyeok.koreatraveler --web-dir www
mkdir www && cp ../appFolder/assets/public/index.html www/
npx cap add android
# android/app/src/main/AndroidManifest.xml 에 ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION 추가
npx cap sync android
cd android && ./gradlew assembleDebug
```
재구성 후 할 일: `index.html`을 `index.html` / `css/` / `js/app.js` / `data/regions.json`으로 분리.
appId를 그대로 유지해야 같은 앱으로 인식된다.

### 공통: 테스트
```bash
adb logcat -d | grep -iE "Capacitor|chromium|Console" | tail -80   # 웹뷰 콘솔 에러
adb exec-out screencap -p > screen.png                             # 화면 캡처 후 직접 확인
# 웹뷰 디버깅: PC 크롬에서 chrome://inspect → 앱 선택 (debuggable 빌드라 가능)
```
웹 로직만 빠르게 확인할 때는 `node tools/devserver.js` 후 **dev = http://localhost:5179, user = http://localhost:5180** (BUILD_MODE는 응답할 때만 바뀜, 두 포트는 저장소가 따로).
앱 WebView 상태 확인: `adb forward tcp:9222 localabstract:webview_devtools_remote_$(adb shell pidof com.jihyeok.koreatraveler)` 후 PC 크롬 `chrome://inspect`.

### 에뮬레이터 위치 바꾸기 (경도 먼저)
```bash
adb emu geo fix 126.5312 33.4996   # 제주시
adb emu geo fix 126.5601 33.2541   # 서귀포시
adb emu geo fix 127.9202 37.3422   # 원주시
adb emu geo fix 128.5918 38.2070   # 속초시
adb emu geo fix 127.7298 37.8813   # 춘천시
adb emu geo fix 126.9780 37.5665   # 서울 시청
adb emu geo fix 129.0756 35.1796   # 부산 시청
```

---

## 5. 해금 규칙 (게임의 핵심 — 사용자 승인 없이 완화 금지)

- **판정**: 좌표가 지역 폴리곤 안이면 그 지역. 지역 데이터는 앱에 번들, 오프라인 동작 유지.
- **해금 조건**: 현장 GPS 인증 성공 → 미션(포스트 작성) 완료 → 해금. 순서를 바꾸지 않는다.
- **중복 없음**: 같은 지역 코드는 한 번만 해금. 해금 시각·좌표를 함께 기록하도록 확장한다.
- **FDS 기초 (MVP 목표)**:
  - 정확도: `coords.accuracy` > 100m 이면 판정 보류, 재측정 요청
  - 신선도: `maximumAge: 0`, 위치 `timestamp`가 오래됐으면 거부
  - 모의 위치: Capacitor Geolocation은 mock 여부를 주지 않으므로, 필요하면 B 방식으로 이전 후
    작은 네이티브 플러그인에서 `Location.isMock`(API 31+)/`isFromMockProvider` 확인
  - 이동 속도: 직전 인증과의 거리÷시간이 비현실적(예: 시속 300km 초과, 제주↔육지 비행 고려)이면 의심 기록
  - 의심 건은 바로 막기보다 **기록 + 보류**가 기본. 차단 기준 확정은 사용자와 상의.
- **테스트 모드**: 개발 중에는 유지하되, 배포용 빌드에서는 숨긴다
  (예: `const DEV = location.hostname === "localhost"` 또는 빌드 플래그). 테스트 모드로 해금한 기록은 표시 구분.

---

## 6. 코드 작성 규칙

- 기존 코드 스타일 유지: ES5 스타일(`var`, `function`), IIFE, 프레임워크 없음.
  B로 이전한 뒤에도 프레임워크(React 등) 도입은 사용자 승인 후에만.
- 색은 `:root`의 CSS 변수(`--accent`, `--unlocked`, `--locked`, `--gold` …)만 쓴다. 다크 모드 변수도 함께 수정.
- 사용자 입력을 innerHTML에 넣을 때는 반드시 `escapeHtml` 사용.
- `data/sido.js`, `data/sub.js`, `data/challenge.js`(한 줄짜리 큰 JSON)를 통째로 출력하거나 Read하지 않는다 — 컨텍스트를 낭비한다.
  필요하면 `node -e`로 파싱해서 필요한 필드만 본다.
- **저장 구조를 바꿀 때**: `STATE_KEY` 버전을 올리고, 이전 버전(`kr-traveler-state-v1`) 데이터를
  읽어서 새 구조로 옮기는 마이그레이션 코드를 같이 작성한다. 사용자 해금 기록을 절대 날리지 않는다.
- 행정구역이 바뀌면: 새 vuski/admdongkor 버전을 `geo-src/`에 받고 `build.mjs`의 `SRC`·`SOURCE_TAG`를 바꿔 다시 생성 → 검사 통과 확인. 코드가 바뀐 지역이 있으면 저장 구조 버전을 올리고 이전 코드를 같이 작성한다. 진행도 분모는 자동 계산된다.
- 수정 후 확인 순서: ① 브라우저에서 index.html 열어 테스트 모드로 기능 확인 ② APK 빌드 ③ 기기/에뮬레이터 설치 후 `screen.png`로 화면 확인.

---

## 7. 법·개인정보 (지원서 Q4-2 고민 사항 반영)

구현 전 사용자와 상의가 필요한 영역. 코드로 먼저 만들지 않는다.

- **위치정보**: 정식 출시 전 위치기반서비스사업자 신고, 개인위치정보 수집·이용 동의 화면, 이용약관 필요.
  현재처럼 위치 좌표를 기기 밖으로 보내지 않는 구조를 기본으로 유지한다.
- **서버 전송**: 포스트·위치·동선을 서버에 올리는 기능(피드 공유, 데이터 리포트)은 개인정보 처리방침과 함께 설계.
- **재화 → 쿠폰·경품 교환**: 게임 재화의 현금성 교환은 국내 법령상 제약이 있을 수 있음. 구현 전 법률 검토 필요.
- **백그라운드 위치**: 넣지 않는다. 필요해지면 Play 스토어 정책 고지가 따로 필요하다.
- 시드 피드(`seedPosts`의 가짜 사용자 글)는 목업용. 실제 출시 버전에서는 제거하거나 "예시" 표시를 명확히 유지.

---

## 8. 절대 하지 말 것

- `smali*/`, `res/values*/`, `original/`, `unknown/` 직접 편집 (A 방식에서도 `index.html`과 필요 시 `AndroidManifest.xml`만 수정)
- 키스토어(`*.jks`, `*.keystore`)와 비밀번호를 파일에 쓰거나 커밋
- 해금 판정 기준·FDS 기준을 승인 없이 완화
- 저장 키/구조 변경 시 마이그레이션 없이 배포
- 영상 업로드, 결제, 재화 현금화 기능을 승인 없이 추가

---

## 9. 작업 백로그 (지원서 MVP 기준 우선순위)

- [x] 지역명 갱신: 강원특별자치도, 전북특별자치도 (+ 전남광주통합특별시) — 2026-10-08
- [x] 테스트 모드를 개발 빌드에서만 노출 (BUILD_MODE) — 2026-10-08
- [ ] FDS 기초: ~~정확도~~(완료)·신선도(timestamp 검사)·이동 속도 검사, 의심 기록 저장
- [ ] 백업을 파일로 저장·공유 (A 방식 불가, B 이전 후 Filesystem/Share 플러그인)
- [x] 해금 기록에 시각·좌표 저장 (저장 구조 v2 + 마이그레이션) — 2026-10-08
- [x] MVP 권역(강원) 시·군 단위 지도 데이터 추가, 강원 탭 → 확대 → 시·군 해금 — 2026-10-08
- [x] 전국 시·군·구 세분화(230곳), 저장 v3 + v1·v2 이전, 시·도 진행도 진하기 — 2026-10-08 (지도 아래 칩 목록은 2026-10-08 제거, 도감 탭으로 대체)
- [ ] 하위 지역 영문명 표 (지금은 강원만, 나머지는 소속 시·도만 표시)
- [x] 광역시 1곳 통합(160곳), 챌린지 6, 도감 탭, 저장 v4 + v3 이전, 용량 초과 알림 — 2026-10-08
- [ ] 챌린지 섬에서 앱을 처음 시작하는 경우(홈 지정 불가) 처리
- [ ] 하드웨어 뒤로 가기로 강원 확대 해제 (A 방식에선 불가, B 이전 후 `@capacitor/app`)
- [ ] 보상 시스템: 해금 시 재화/건물 지급 (현재 건물은 무제한 무료)
- [x] 해금 연출 강화: 도장 연출 — 2026-10-08
- [ ] Capacitor 프로젝트로 재구성 (네이티브 기능 필요 시점에)
