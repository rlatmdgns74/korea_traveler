// 코리아 트래블러 지도 데이터 생성기
//
// 원본: vuski/admdongkor 행정동 경계 (통계청 SGIS 기반, CC BY 4.0)
//   C:\NewBusiness\geo-src\HangJeongDong_ver20260701.geojson
// 출력: appFolder/assets/public/data/sido.js (시·도 16), data/sub.js (하위 지역)
//
// 사용법:  node build.mjs [--interval 250] [--min-island 1] [--keep-island 0.05] [--dry]
//   interval   : 단순화 간격(m). 클수록 거칠고 작아진다.
//   min-island  : 단순화 결과에서 이 면적(km²)보다 작은 조각은 버린다 (독도는 원본 좌표로 다시 넣는다).
//   keep-island : 이 면적(km²) 이상인 섬이 단순화로 사라졌으면 꼭짓점 ~10개로 다시 넣는다 (기본 0.05).
//
// 해금 단위(하위 지역) 규칙
//   - 도: 시·군 / 특별·광역시: 구·군 (전남광주통합특별시는 옛 광주의 구 + 시·군)
//   - 일반 시 안의 일반구(예: 수원시장안구)는 나누지 않고 시 하나로 묶는다 → 코드 앞 4자리 + "0"
//     일반구 판별은 이름("○○시○○구")으로 한다. 코드 끝자리로 판별하면 광진구(11215)·증평군(43745)
//     처럼 끝자리가 0이 아닌 자치구·군까지 잘못 묶인다.
//   - 세종(36)은 하위 구역이 없어 시·도 그대로 하나의 단위.
//
// 시·도 층과 하위 지역 층은 같은 arc 집합에서 dissolve → 함께 단순화하므로 경계가 정확히 일치한다.
//
// 좌표 저장 형식(enc "d4"): 경도·위도 × 1e4 정수. 링마다 [x0, y0, dx1, dy1, dx2, dy2, ...]
//   (첫 점은 절대값, 이후는 앞 점과의 차이). 앱이 시작할 때 decodePolys() 로 풀어 쓴다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mapshaper from "mapshaper";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, "../../geo-src/HangJeongDong_ver20260701.geojson");
const OUT_DIR = path.resolve(HERE, "../../appFolder/assets/public/data");
const SOURCE_TAG = "vuski/admdongkor ver20260701 (통계청 SGIS, CC BY 4.0)";

const args = process.argv.slice(2);
const argVal = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
const INTERVAL = argVal("--interval", 250);
const MIN_ISLAND_KM2 = argVal("--min-island", 1);
const KEEP_ISLAND_KM2 = argVal("--keep-island", 0.05); // 이보다 큰 섬은 단순화로 사라져도 다시 넣는다
const DRY = args.includes("--dry");

// 하위 구역이 없어 나누지 않는 시·도
const NO_SUBDIVIDE = ["36"];
const GU_RE = "/^(.+시)(.+구)$/"; // mapshaper 식 안에서 쓰는 일반구 판별 정규식

const SIDO_ENG = {
  "11": "Seoul", "12": "Jeonnam-Gwangju", "26": "Busan", "27": "Daegu", "28": "Incheon",
  "30": "Daejeon", "31": "Ulsan", "36": "Sejong", "41": "Gyeonggi-do",
  "43": "Chungcheongbuk-do", "44": "Chungcheongnam-do", "47": "Gyeongsangbuk-do",
  "48": "Gyeongsangnam-do", "50": "Jeju-do", "51": "Gangwon State", "52": "Jeonbuk State"
};
// 하위 지역 영문명은 원본에 없어서 표가 있는 곳만 넣는다 (나머지는 앱에서 소속 시·도만 표시)
const SGG_ENG = {
  "51110": "Chuncheon-si", "51130": "Wonju-si", "51150": "Gangneung-si", "51170": "Donghae-si",
  "51190": "Taebaek-si", "51210": "Sokcho-si", "51230": "Samcheok-si", "51720": "Hongcheon-gun",
  "51730": "Hoengseong-gun", "51750": "Yeongwol-gun", "51760": "Pyeongchang-gun",
  "51770": "Jeongseon-gun", "51780": "Cheorwon-gun", "51790": "Hwacheon-gun",
  "51800": "Yanggu-gun", "51810": "Inje-gun", "51820": "Goseong-gun", "51830": "Yangyang-gun"
};

// 독도(동도·서도) 영역: 면적이 작아도 지우지 않는다
const DOKDO_BBOX = [131.85, 37.23, 131.88, 37.25];

/* ---------- geometry helpers (lon/lat) ---------- */
const R_EARTH = 6371.0088; // km
function ringAreaKm2(ring) {
  // equirectangular approximation, good enough for small rings
  let a = 0;
  const lat0 = ring[0][1] * Math.PI / 180;
  const kx = Math.cos(lat0) * Math.PI / 180 * R_EARTH, ky = Math.PI / 180 * R_EARTH;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky);
  }
  return Math.abs(a / 2);
}
function ringInBox(ring, b) {
  return ring.every(([x, y]) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]);
}
function round4(v) { return Math.round(v * 1e4) / 1e4; }
function cleanRing(ring) {
  const out = [];
  for (const [x, y] of ring) {
    const p = [round4(x), round4(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  // 닫힘점 제거 (앱의 pointInRing 은 열린 링을 가정)
  if (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  return out;
}
function toPolys(geom) {
  if (!geom) return [];
  return geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
}
function processPolys(geom) {
  const polys = [];
  for (const poly of toPolys(geom)) {
    const outer = poly[0];
    const keep = ringAreaKm2(outer) >= MIN_ISLAND_KM2 || ringInBox(outer, DOKDO_BBOX);
    if (!keep) continue;
    const rings = poly.map(cleanRing).filter((r, i) => r.length >= 3 && (i === 0 || ringAreaKm2(r) >= MIN_ISLAND_KM2));
    if (rings.length && rings[0].length >= 3) polys.push(rings);
  }
  return polys;
}
function bboxOf(polys) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys) for (const [x, y] of poly[0]) {
    if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
  }
  return b.map(round4);
}
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pointInPoly(x, y, poly) {
  if (!pointInRing(x, y, poly[0])) return false;
  for (let k = 1; k < poly.length; k++) if (pointInRing(x, y, poly[k])) return false;
  return true;
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}
function edgeDist(x, y, poly, kx) {
  let d = Infinity;
  for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    d = Math.min(d, segDist(x * kx, y, ring[j][0] * kx, ring[j][1], ring[i][0] * kx, ring[i][1]));
  }
  return d;
}
// 라벨/가상 위치용 내부점: 가장 큰 다각형 안에서 경계와 가장 먼 점 (격자 탐색 + 국소 정밀화)
function labelPoint(polys) {
  let best = null, bestArea = -1;
  for (const p of polys) { const a = ringAreaKm2(p[0]); if (a > bestArea) { bestArea = a; best = p; } }
  const b = bboxOf([best]);
  const kx = Math.cos(((b[1] + b[3]) / 2) * Math.PI / 180);
  let bx = null, by = null, bd = -1;
  let step = Math.max(b[2] - b[0], b[3] - b[1]) / 40;
  let x0 = b[0], x1 = b[2], y0 = b[1], y1 = b[3];
  for (let pass = 0; pass < 4; pass++) {
    for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) {
      if (!pointInPoly(x, y, best)) continue;
      const d = edgeDist(x, y, best, kx);
      if (d > bd) { bd = d; bx = x; by = y; }
    }
    if (bx === null) break;
    x0 = bx - step; x1 = bx + step; y0 = by - step; y1 = by + step; step /= 5;
  }
  if (bx === null) { bx = best[0][0][0]; by = best[0][0][1]; } // 퇴화 다각형 대비
  return [round4(bx), round4(by)];
}
function countPts(polys) { return polys.reduce((s, p) => s + p.reduce((t, r) => t + r.length, 0), 0); }

// d4 인코딩: 링마다 [x0,y0,dx,dy,...] (×1e4 정수)
function encodePolys(polys) {
  return polys.map(poly => poly.map(ring => {
    const out = []; let px = 0, py = 0;
    for (const [x, y] of ring) {
      const ix = Math.round(x * 1e4), iy = Math.round(y * 1e4);
      out.push(ix - px, iy - py); px = ix; py = iy;
    }
    return out;
  }));
}
function decodePolys(enc) { // 검사용 (앱의 decodePolys 와 같은 동작)
  return enc.map(poly => poly.map(a => {
    const ring = []; let x = 0, y = 0;
    for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; ring.push([x / 1e4, y / 1e4]); }
    return ring;
  }));
}
function areaKm2(polys) { return polys.reduce((s, p) => s + ringAreaKm2(p[0]), 0); }
const kb = b => (b / 1024).toFixed(0) + "KB";
const mb = b => (b / 1048576).toFixed(1) + "MB";

/* ---------- run mapshaper ---------- */
const base = [
  `-i "${SRC}" name=dong`,
  // 해금 단위 코드·이름: 일반구는 소속 시로 묶는다
  `-each "unit = ${GU_RE}.test(sggnm) ? sgg.slice(0,4)+'0' : sgg; uname = (sggnm.match(${GU_RE}) || [0, sggnm])[1]"`,
  `-dissolve unit copy-fields=uname,sido,sidonm + name=unit`,
  `-dissolve sido copy-fields=sidonm target=unit + name=sido`
].join(" ");
console.log("mapshaper 실행 중... (1~2분)");
const rawOut = await mapshaper.applyCommands(base + " -o format=geojson target=unit,sido");
const rawUnitBytes = Buffer.byteLength(rawOut["unit.json"]), rawSidoBytes = Buffer.byteLength(rawOut["sido.json"]);
const out = await mapshaper.applyCommands(base + ` -simplify interval=${INTERVAL} keep-shapes target=unit -o format=geojson target=unit,sido`);
const unitFC = JSON.parse(out["unit.json"]);
const sidoFC = JSON.parse(out["sido.json"]);

// 독도: 단순화 단계에서 사라지므로 원본 행정동 경계에서 동도·서도 링을 그대로 가져온다
function dokdoPolys() {
  const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const polys = [];
  for (const f of src.features) {
    if (String(f.properties.sido) !== "47") continue;
    for (const poly of toPolys(f.geometry)) {
      if (ringInBox(poly[0], DOKDO_BBOX)) polys.push(poly.map(cleanRing));
    }
  }
  return polys;
}
const DOKDO = dokdoPolys();

/* ---------- build records ---------- */
const sido = sidoFC.features.map(f => {
  const code = String(f.properties.sido);
  const polys = processPolys(f.geometry);
  if (code === "47") polys.push(...DOKDO);
  return { code, name: f.properties.sidonm, name_eng: SIDO_ENG[code] || "", polys,
           sub: NO_SUBDIVIDE.indexOf(code) < 0 };
}).sort((a, b) => a.code.localeCompare(b.code));

const subs = {};
for (const f of unitFC.features) {
  const parent = String(f.properties.sido);
  if (NO_SUBDIVIDE.indexOf(parent) >= 0) continue;
  const code = String(f.properties.unit);
  const polys = processPolys(f.geometry);
  if (f.properties.uname === "울릉군") polys.push(...DOKDO);
  (subs[parent] = subs[parent] || []).push({ code, name: f.properties.uname, name_eng: SGG_ENG[code] || "", parent, polys });
}
for (const k of Object.keys(subs)) subs[k].sort((a, b) => a.code.localeCompare(b.code));
const allSubs = Object.values(subs).flat();

// 작은 섬 복원: 단순화하면 작은 섬(마라도·가파도·비양도 등)이 사라져 그 섬에서 해금할 수 없게 된다.
// 단순화 결과에 없는 원본 섬 중 KEEP_ISLAND_KM2 이상인 것을 꼭짓점 ~10개로 줄여 해금 단위(하위 지역, 세종은 시·도)에만 다시 넣는다.
// 전국 화면에서는 보이지 않을 크기라 시·도 층에는 넣지 않는다 → 앱은 위치 판정을 해금 단위에서 바로 한다.
function decimateRing(ring, maxPts) {
  const step = Math.max(1, Math.ceil(ring.length / maxPts));
  return cleanRing(ring.filter((_, i) => i % step === 0));
}
function ringCentroid(ring) {
  let x = 0, y = 0; for (const [a, b] of ring) { x += a; y += b; } return [x / ring.length, y / ring.length];
}
let restored = 0;
for (const f of JSON.parse(rawOut["unit.json"]).features) {
  const parentCode = String(f.properties.sido), code = String(f.properties.unit);
  const target = NO_SUBDIVIDE.indexOf(parentCode) >= 0 ? null : (subs[parentCode] || []).find(r => r.code === code);
  const sidoRec = sido.find(r => r.code === parentCode);
  for (const poly of toPolys(f.geometry)) {
    const outer = poly[0], area = ringAreaKm2(outer);
    if (area < KEEP_ISLAND_KM2 || area >= MIN_ISLAND_KM2 * 50) continue; // 큰 땅덩어리는 단순화 결과에 이미 있다
    const [cx, cy] = ringCentroid(outer);
    const owner = target || sidoRec;
    if (owner.polys.some(p => pointInPoly(cx, cy, p))) continue; // 이미 덮여 있음
    const ring = decimateRing(outer, 10);
    if (ring.length < 3) continue;
    owner.polys.push([ring]);
    restored++;
  }
}
for (const r of [...sido, ...allSubs]) { r.bbox = bboxOf(r.polys); r.lp = labelPoint(r.polys); r.a = Math.round(areaKm2(r.polys)); }

/* ---------- checks ---------- */
const problems = [];
if (sido.length !== 16) problems.push(`시·도 개수 ${sido.length} (기대 16)`);
if (allSubs.length !== 229) problems.push(`하위 지역 개수 ${allSubs.length} (기대 229 = 230곳 중 세종 제외)`);
const guCities = new Set();
JSON.parse(fs.readFileSync(SRC, "utf8")).features.forEach(f => { const m = f.properties.sggnm.match(/^(.+시)(.+구)$/); if (m) guCities.add(String(f.properties.sgg).slice(0, 4) + "0"); });
if (guCities.size !== 13) problems.push(`일반구를 묶은 시 ${guCities.size}곳 (기대 13)`);
for (const c of guCities) if (!allSubs.find(r => r.code === c)) problems.push(`묶은 시 ${c} 가 하위 지역에 없음`);
const gunwi = allSubs.find(r => r.name === "군위군");
if (!gunwi || gunwi.parent !== "27") problems.push("군위군이 대구(27)에 없음");
if (!sido.find(r => r.code === "51" && r.name === "강원특별자치도")) problems.push("강원특별자치도 명칭 아님");
if (!sido.find(r => r.code === "52" && r.name === "전북특별자치도")) problems.push("전북특별자치도 명칭 아님");
for (const r of [...sido, ...allSubs]) {
  if (!r.polys.length) problems.push(`${r.name}: 다각형 없음`);
  else if (!r.polys.some(p => pointInPoly(r.lp[0], r.lp[1], p))) problems.push(`${r.name}: 내부점이 다각형 밖`);
}
for (const r of allSubs) {
  const s = sido.find(x => x.code === r.parent);
  if (!s.polys.some(p => pointInPoly(r.lp[0], r.lp[1], p))) problems.push(`${r.name}: 내부점이 ${s.name} 다각형 밖`);
}
if (!sido.find(r => r.code === "47").polys.some(p => ringInBox(p[0], DOKDO_BBOX))) problems.push("독도 누락(경북)");
if (!allSubs.find(r => r.name === "울릉군").polys.some(p => ringInBox(p[0], DOKDO_BBOX))) problems.push("독도 누락(울릉군)");

/* ---------- encode & write ---------- */
function rec(r, withParent) {
  const o = { code: r.code, name: r.name };
  if (r.name_eng) o.name_eng = r.name_eng;
  if (withParent) o.parent = r.parent;
  o.bbox = r.bbox; o.lp = r.lp; o.a = r.a;
  if (!withParent && r.sub) o.sub = 1;
  o.p = encodePolys(r.polys);
  return o;
}
// 인코딩 왕복 검사
for (const r of [...sido, ...allSubs]) {
  const back = decodePolys(encodePolys(r.polys));
  if (JSON.stringify(back) !== JSON.stringify(r.polys)) { problems.push(`${r.name}: 인코딩 왕복 불일치`); break; }
}

const header = `/* 자동 생성 파일 — 직접 수정하지 말 것. tools/mapdata/build.mjs 로 다시 만든다.\n   행정구역 경계: ${SOURCE_TAG}\n   단순화 ${INTERVAL}m, ${MIN_ISLAND_KM2}km² 미만 섬 제외(독도 유지), 좌표 enc d4 */\n`;
const sidoJs = header + "var MAP_SIDO = " + JSON.stringify({ source: SOURCE_TAG, enc: "d4", regions: sido.map(r => rec(r, false)) }) + ";\n";
const subObj = {}; for (const k of Object.keys(subs)) subObj[k] = { regions: subs[k].map(r => rec(r, true)) };
const subJs = header + "var MAP_SUB = " + JSON.stringify(subObj) + ";\n";

const plainBytes = Buffer.byteLength(JSON.stringify([...sido, ...allSubs].map(r => r.polys)));
const pts = [...sido, ...allSubs].reduce((s, r) => s + countPts(r.polys), 0);
console.log(`단순화 전(합친 직후 GeoJSON): 하위 ${mb(rawUnitBytes)} + 시·도 ${mb(rawSidoBytes)} = ${mb(rawUnitBytes + rawSidoBytes)}`);
console.log(`단순화 후(${INTERVAL}m, 일반 JSON 좌표): ${kb(plainBytes)} (꼭짓점 ${pts})`);
console.log(`작은 섬 복원 ${restored}개 (${KEEP_ISLAND_KM2}km² 이상)`);
console.log(`단순화 후 + d4 인코딩: sido.js ${kb(Buffer.byteLength(sidoJs))} + sub.js ${kb(Buffer.byteLength(subJs))} = ${kb(Buffer.byteLength(sidoJs) + Buffer.byteLength(subJs))}`);
console.log("시·도별 하위 지역: " + sido.map(s => s.name.replace(/특별자치도|특별자치시|통합특별시|특별시|광역시/, "") + " " + (subs[s.code] ? subs[s.code].length : 1)).join(" · "));
if (problems.length) { console.error("검사 실패:\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`검사 통과: 시·도 16, 하위 지역 ${allSubs.length}(+세종 1 = ${allSubs.length + 1}), 일반구 묶은 시 13, 군위→대구, 강원·전북 명칭, 독도(경북·울릉), 내부점, 인코딩 왕복`);

if (!DRY) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "sido.js"), sidoJs);
  fs.writeFileSync(path.join(OUT_DIR, "sub.js"), subJs);
  console.log("written:", OUT_DIR);
}
