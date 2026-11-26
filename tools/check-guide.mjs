// 가이드 콘텐츠(appFolder/assets/public/data/guide.js) 검사
// 사용: node tools/check-guide.mjs   (문제가 있으면 목록을 출력하고 종료 코드 1)
// 지도 데이터처럼 자동 생성이 아니라 손으로 고치는 파일이라, 고칠 때마다 이걸 돌린다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", "appFolder", "assets", "public", "data");

function loadVar(file, name){
  const src = fs.readFileSync(path.join(dataDir, file), "utf8");
  return new Function(src + "\nreturn " + name + ";")();
}

// index.html 의 decodePolys 와 같은 방식 (d4: 경위도×1e4, 링마다 첫 점 절대값 + 이후 차이)
function decodePolys(enc){
  return enc.map(poly => poly.map(a => {
    const ring = []; let x = 0, y = 0;
    for (let i = 0; i < a.length; i += 2){ x += a[i]; y += a[i+1]; ring.push([x/1e4, y/1e4]); }
    return ring;
  }));
}
function inRing(lon, lat, ring){
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++){
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inPolys(lon, lat, polys){
  return polys.some(rings => inRing(lon, lat, rings[0]) && !rings.slice(1).some(h => inRing(lon, lat, h)));
}

const errors = [];
const MAP_SUB = loadVar("sub.js", "MAP_SUB");
const units = {};
Object.values(MAP_SUB).forEach(s => s.regions.forEach(r => { units[r.code] = r; }));

let GUIDE;
try { GUIDE = loadVar("guide.js", "GUIDE"); }
catch (e) { console.error("guide.js 를 읽지 못했어요: " + e.message); process.exit(1); }

const KINDS = ["spot", "food", "story"];
const seenIds = {};
for (const [code, g] of Object.entries(GUIDE)){
  const r = units[code];
  const at = "[" + code + "] ";
  if (!r){ errors.push(at + "지도에 없는 해금 단위 코드"); continue; }
  const polys = decodePolys(r.p);
  const m = g.mascot || {};
  ["id", "name", "intro"].forEach(k => { if (typeof m[k] !== "string" || !m[k]) errors.push(at + "mascot." + k + " 없음"); });
  if (m.id && m.id !== "m_" + code) errors.push(at + "mascot.id 는 m_" + code + " 이어야 함");
  if (typeof g.preview !== "string" || !g.preview) errors.push(at + "preview 없음");
  const qs = Array.isArray(g.quests) ? g.quests : [];
  if (qs.length !== 3) errors.push(at + "퀘스트는 3개여야 함 (지금 " + qs.length + ")");
  const kinds = qs.map(q => q.kind).sort().join(",");
  if (kinds !== KINDS.slice().sort().join(",")) errors.push(at + "퀘스트 종류는 spot·food·story 하나씩이어야 함");
  qs.forEach((q, i) => {
    const qa = at + "quests[" + i + "] ";
    if (q.id !== "q_" + code + "_" + (i + 1)) errors.push(qa + "id 는 q_" + code + "_" + (i + 1) + " 이어야 함");
    if (seenIds[q.id]) errors.push(qa + "id 중복");
    seenIds[q.id] = true;
    ["title", "text", "place"].forEach(k => { if (typeof q[k] !== "string" || !q[k]) errors.push(qa + k + " 없음"); });
    if (typeof q.radius !== "number" || q.radius < 50 || q.radius > 500) errors.push(qa + "radius 는 50~500m");
    if (typeof q.lat !== "number" || typeof q.lon !== "number") errors.push(qa + "lat/lon 숫자 아님");
    else if (!inPolys(q.lon, q.lat, polys)) errors.push(qa + "인증 지점이 " + r.name + " 경계 밖");
  });
}

const tempCount = Object.values(GUIDE).reduce((n, g) => n + (g.quests || []).filter(q => q.temp).length, 0);
if (errors.length){
  console.error("가이드 검사 실패 " + errors.length + "건");
  errors.forEach(e => console.error(" - " + e));
  process.exit(1);
}
console.log("가이드 검사 통과: 지역 " + Object.keys(GUIDE).length + "곳, 퀘스트 " + Object.keys(seenIds).length + "개" + (tempCount ? " (임시 좌표 " + tempCount + "개 — 실제 좌표로 바꿔야 함)" : ""));
