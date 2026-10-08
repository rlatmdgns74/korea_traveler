// 코리아 트래블러 지도 데이터 생성기
//
// 원본: vuski/admdongkor 행정동 경계 (통계청 SGIS 기반, CC BY 4.0)
//   C:\NewBusiness\geo-src\HangJeongDong_ver20260701.geojson
// 출력: appFolder/assets/public/data/sido.js, data/gangwon.js
//
// 사용법:  node build.mjs [--interval 250] [--base-interval 800] [--min-island 1] [--dry]
//   interval      : 세분화 시·도(강원) 안의 단순화 간격(m). 확대해서 보므로 촘촘하게.
//   base-interval : 나머지 시·도의 단순화 간격(m). 전국 화면에서만 보므로 거칠게.
//   min-island    : 이 면적(km²)보다 작은 섬 조각은 버린다 (독도는 원본 좌표로 다시 넣는다).
//
// 시·도 층과 시·군·구 층은 같은 arc 집합에서 dissolve → 함께 단순화하므로
// 강원 시·군의 바깥선과 강원 시·도 경계가 정확히 일치한다.

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
const BASE_INTERVAL = argVal("--base-interval", 800);
const MIN_ISLAND_KM2 = argVal("--min-island", 1);
const DRY = args.includes("--dry");

// 세분화할 시·도 (지금은 강원만)
const SUBDIVIDE = { "51": "gangwon" };

const SIDO_ENG = {
  "11": "Seoul", "12": "Jeonnam-Gwangju", "26": "Busan", "27": "Daegu", "28": "Incheon",
  "30": "Daejeon", "31": "Ulsan", "36": "Sejong", "41": "Gyeonggi-do",
  "43": "Chungcheongbuk-do", "44": "Chungcheongnam-do", "47": "Gyeongsangbuk-do",
  "48": "Gyeongsangnam-do", "50": "Jeju-do", "51": "Gangwon State", "52": "Jeonbuk State"
};
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

/* ---------- run mapshaper ---------- */
const cmd = [
  `-i "${SRC}" name=dong`,
  `-dissolve sgg copy-fields=sggnm,sido,sidonm + name=sgg`,
  `-dissolve sido copy-fields=sidonm target=sgg + name=sido`,
  // 시·군·구 층에 지역별 간격을 매기면 arc 를 공유하는 시·도 층도 같은 결과를 쓴다
  `-simplify variable interval="(${Object.keys(SUBDIVIDE).map(c => `sido=='${c}'`).join(" || ")}) ? ${INTERVAL} : ${BASE_INTERVAL}" keep-shapes target=sgg`,
  `-o format=geojson target=sgg,sido`
].join(" ");
const out = await mapshaper.applyCommands(cmd);
const sggFC = JSON.parse(out["sgg.json"]);
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
  return {
    code, name: f.properties.sidonm, name_eng: SIDO_ENG[code] || code,
    bbox: bboxOf(polys), lp: labelPoint(polys), polys,
    ...(SUBDIVIDE[code] ? { sub: SUBDIVIDE[code] } : {})
  };
}).sort((a, b) => a.code.localeCompare(b.code));

const subs = {};
for (const [sidoCode, key] of Object.entries(SUBDIVIDE)) {
  subs[sidoCode] = sggFC.features
    .filter(f => String(f.properties.sido) === sidoCode)
    .map(f => {
      const code = String(f.properties.sgg);
      const polys = processPolys(f.geometry);
      return { code, name: f.properties.sggnm, name_eng: SGG_ENG[code] || code, parent: sidoCode,
               bbox: bboxOf(polys), lp: labelPoint(polys), polys };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

/* ---------- checks ---------- */
const problems = [];
if (sido.length !== 16) problems.push(`시·도 개수 ${sido.length} (기대 16)`);
if ((subs["51"] || []).length !== 18) problems.push(`강원 시·군 개수 ${(subs["51"] || []).length} (기대 18)`);
const gunwi = sggFC.features.find(f => /군위/.test(f.properties.sggnm));
if (!gunwi || String(gunwi.properties.sido) !== "27") problems.push("군위군이 대구(27)에 없음");
for (const r of [...sido, ...Object.values(subs).flat()]) {
  if (!r.polys.length) problems.push(`${r.name}: 다각형 없음`);
  else if (!r.polys.some(p => pointInPoly(r.lp[0], r.lp[1], p))) problems.push(`${r.name}: 내부점이 다각형 밖`);
}
const gangwon = sido.find(r => r.code === "51");
for (const r of subs["51"] || []) {
  if (!gangwon.polys.some(p => pointInPoly(r.lp[0], r.lp[1], p))) problems.push(`${r.name}: 내부점이 강원 시·도 다각형 밖`);
}
const dokdo = sido.find(r => r.code === "47").polys.some(p => ringInBox(p[0], DOKDO_BBOX));
if (!dokdo) problems.push("독도 누락");

/* ---------- write ---------- */
const header = `/* 자동 생성 파일 — 직접 수정하지 말 것. tools/mapdata/build.mjs 로 다시 만든다.\n   행정구역 경계: ${SOURCE_TAG}\n   단순화 강원 ${INTERVAL}m · 기타 ${BASE_INTERVAL}m, ${MIN_ISLAND_KM2}km² 미만 섬 제외(독도 유지) */\n`;
const sidoJs = header + "var MAP_SIDO = " + JSON.stringify({ source: SOURCE_TAG, regions: sido }) + ";\n";
const gwJs = header + "var MAP_SUB = MAP_SUB || {};\nMAP_SUB[\"51\"] = " + JSON.stringify({ regions: subs["51"] }) + ";\n";

const sidoPts = sido.reduce((s, r) => s + countPts(r.polys), 0);
const gwPts = (subs["51"] || []).reduce((s, r) => s + countPts(r.polys), 0);
console.log(`interval=${INTERVAL}m base=${BASE_INTERVAL}m min-island=${MIN_ISLAND_KM2}km²`);
console.log(`sido.js    ${sido.length}개, 꼭짓점 ${sidoPts}, ${(Buffer.byteLength(sidoJs) / 1024).toFixed(1)}KB`);
console.log(`gangwon.js ${(subs["51"] || []).length}개, 꼭짓점 ${gwPts}, ${(Buffer.byteLength(gwJs) / 1024).toFixed(1)}KB`);
for (const r of sido) console.log(`  ${r.code} ${r.name}${r.sub ? " [세분화]" : ""} polys=${r.polys.length} pts=${countPts(r.polys)}`);
for (const r of subs["51"] || []) console.log(`    ${r.code} ${r.name} pts=${countPts(r.polys)} lp=${r.lp}`);
if (problems.length) { console.error("검사 실패:\n - " + problems.join("\n - ")); process.exit(1); }
console.log("검사 통과: 시·도 16, 강원 18, 군위→대구, 독도 포함, 내부점 모두 다각형 안");

if (!DRY) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "sido.js"), sidoJs);
  fs.writeFileSync(path.join(OUT_DIR, "gangwon.js"), gwJs);
  console.log("written:", OUT_DIR);
}
