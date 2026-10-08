# 코리아 트래블러 (korea_traveler)

실제로 가서 GPS로 인증하면 지역이 해금되는 여행 게임 앱 (Capacitor 웹뷰 안드로이드 앱).

> 자세한 구조·규칙·작업 방식은 **[appFolder/CLAUDE.md](appFolder/CLAUDE.md)** 를 먼저 읽는다.

## 폴더 구성

| 경로 | 내용 |
|---|---|
| `appFolder/` | `app-debug.apk` 를 apktool 로 푼 앱 본체. 화면·로직은 `assets/public/index.html`, 지도 데이터는 `assets/public/data/*.js` |
| `tools/build-apk.sh` | APK 빌드 (`dev` / `user`) |
| `tools/devserver.js` | 브라우저 확인용 서버 (dev :5179 / user :5180) |
| `tools/mapdata/build.mjs` | 행정구역 경계 → 지도 데이터(`data/*.js`) 생성기 |
| `backup/` | 단계별 이전 버전 index.html·스크립트 |

## 저장소에 없는 것 (각자 준비)

- **APK·서명 키**: `*.apk`, `dist/`, `*.keystore` 는 올리지 않는다. 팀에 배포하는 APK는 따로 공유한다.
  업데이트를 덮어쓰기 설치하려면 같은 서명 키가 필요하므로, 키는 저장소 밖에서 비공개로 전달한다.
- **apktool**: https://apktool.org/docs/install 에서 3.x 설치 (`apktool --version` 이 3.0.3 이상)
- **행정구역 원본 GeoJSON** (지도 데이터를 다시 만들 때만 필요):
  https://raw.githubusercontent.com/vuski/admdongkor/master/ver20260701/HangJeongDong_ver20260701.geojson
  → `geo-src/HangJeongDong_ver20260701.geojson` 로 저장
  (출처: vuski/admdongkor, 통계청 SGIS 기반, CC BY 4.0 — 앱 하단에 출처 표기 유지)

## 필요한 도구

JDK 17, Android SDK (build-tools: `zipalign`, `apksigner`), `adb`, apktool 3.x, Node.js.

## 자주 쓰는 명령 (Git Bash)

```bash
# 브라우저로 확인: dev http://localhost:5179 , user http://localhost:5180
node tools/devserver.js

# APK 빌드 → dist/koreatraveler-dev.apk / dist/koreatraveler-user.apk
bash tools/build-apk.sh dev
bash tools/build-apk.sh user

# 지도 데이터 다시 만들기 (geo-src 필요)
cd tools/mapdata && npm install && node build.mjs
```

- 다른 사람에게 줄 APK는 항상 **user** 빌드.
- `appFolder/assets/public/index.html` 의 `BUILD_MODE` 는 원본에서 항상 `"dev"` 로 둔다 (빌드 스크립트가 복사본에서만 바꾼다).
