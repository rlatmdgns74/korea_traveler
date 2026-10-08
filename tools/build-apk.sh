#!/usr/bin/env bash
# 코리아 트래블러 APK 빌드 (A 방식: apktool 재패킹)
#
#   bash tools/build-apk.sh dev    → dist/koreatraveler-dev.apk   (개발용: 테스트 모드·개발자 설정·DEV 배지)
#   bash tools/build-apk.sh user   → dist/koreatraveler-user.apk  (일반 사용자용)
#
# 원본 appFolder 는 건드리지 않는다. build/ 에 복사한 뒤 복사본의 BUILD_MODE 만 바꿔서 묶는다.
# 서명은 ~/.android/debug.keystore (디버그 키). 스토어 배포용 릴리스 서명은 B 방식 이전 후에.
set -euo pipefail

MODE="${1:-}"
if [ "$MODE" != "dev" ] && [ "$MODE" != "user" ]; then
  echo "사용법: bash tools/build-apk.sh dev|user" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/appFolder"
WORK="$ROOT/build/appFolder-$MODE"
DIST="$ROOT/dist"
OUT="$DIST/koreatraveler-$MODE.apk"
HTML="assets/public/index.html"
MODE_LINE='  var BUILD_MODE = "dev";'

grep -qxF "$MODE_LINE" "$SRC/$HTML" || { echo "원본 index.html 에서 BUILD_MODE 줄을 찾지 못했어요: $MODE_LINE" >&2; exit 1; }

rm -rf "$WORK"; mkdir -p "$WORK" "$DIST"
# apktool 작업 폴더(build/)는 복사하지 않는다
(cd "$SRC" && tar --exclude='./build' -cf - .) | (cd "$WORK" && tar -xf -)

sed -i "s/^  var BUILD_MODE = \"dev\";$/  var BUILD_MODE = \"$MODE\";/" "$WORK/$HTML"
grep -qxF "  var BUILD_MODE = \"$MODE\";" "$WORK/$HTML" || { echo "BUILD_MODE 를 $MODE 로 바꾸지 못했어요" >&2; exit 1; }

apktool b "$WORK" -o "$DIST/unsigned-$MODE.apk" 2>&1 | tail -1
zipalign -p -f 4 "$DIST/unsigned-$MODE.apk" "$DIST/aligned-$MODE.apk"
apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --out "$OUT" "$DIST/aligned-$MODE.apk"
apksigner verify "$OUT" >/dev/null 2>&1 || { echo "서명 검증 실패" >&2; exit 1; }
rm -f "$DIST/unsigned-$MODE.apk" "$DIST/aligned-$MODE.apk" "$OUT.idsig"

# 결과물 안의 BUILD_MODE 를 다시 확인 (user 빌드에 dev 가 섞여 나가는 사고 방지)
PACKED="$(unzip -p "$OUT" "$HTML" | grep -o 'var BUILD_MODE = "[a-z]*"')"
[ "$PACKED" = "var BUILD_MODE = \"$MODE\"" ] || { echo "APK 안의 BUILD_MODE 가 $MODE 가 아니에요: $PACKED" >&2; exit 1; }

echo "완료: $OUT ($PACKED, $(du -h "$OUT" | cut -f1))"
