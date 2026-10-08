  var STATE_KEY = "kr-traveler-state-v3";
  var STATE_KEY_V2 = "kr-traveler-state-v2"; // 이전 버전(강원만 세분화). 지우지 않고 백업으로 남긴다.
  var STATE_KEY_V1 = "kr-traveler-state-v1"; // 그 이전 버전(시·도 단위). 지우지 않고 백업으로 남긴다.
  var STATE_KEY_PREV = "kr-traveler-state-v3-prev"; // 복원·초기화 직전 상태 (한 단계 되돌리기용)
  var PREFS_KEY = "kr-traveler-prefs";              // 화면 테마 등. 게임 기록과 별도로 유지
  var ACCURACY_LIMIT_M = 100; // 위치 정확도 기준(m). 해금 판정 기준이므로 바꿀 때는 사용자 승인 (CLAUDE.md §5)
  var NEAREST_KM = 2;         // 경계 단순화 보정: 다각형 밖이어도 이 거리 안이면 가장 가까운 지역으로 판정
  var GRID_N = 4; // 4x4 decorate grid
  var BUILDINGS = [
    {id:"house", icon:"🏠", name:"집"},
    {id:"landmark", icon:"🏯", name:"랜드마크"},
    {id:"cafe", icon:"☕", name:"카페"},
    {id:"park", icon:"🌳", name:"공원"},
    {id:"tower", icon:"🏢", name:"타워"},
    {id:"plaza", icon:"⛲", name:"광장"},
    {id:"market", icon:"🏮", name:"시장"},
    {id:"temple", icon:"⛩️", name:"사찰"}
  ];
  var SEED_NAMES = ["여행자민지","길위의준호","떠도는하늘","지도채우기","가을바람","나침반유리"];

  function seedPosts(code){
    // deterministic-ish pseudo random pick based on code so it's stable across renders
    var seedTexts = [
      "여기 야경 진짜 최고예요 🌃 다들 꼭 들러보세요!",
      "로컬 맛집 하나 발견! 다음에 또 오고 싶다 😋",
      "미션 완료 도장 쾅! 다음 지역으로 출발합니다 🧭",
      "생각보다 볼거리가 많아서 놀랐어요.",
      "날씨 좋은 날 산책하기 딱이었어요 ☀️"
    ];
    var n = 1 + (parseInt(code,10) % 2);
    var out = [];
    for (var i=0;i<n;i++){
      var idx = (parseInt(code,10)+i) % seedTexts.length;
      var who = SEED_NAMES[(parseInt(code,10)+i*3) % SEED_NAMES.length];
      out.push({who:who, text:seedTexts[idx], when:"예시", seed:true});
    }
    return out;
  }

  /* ---------------- regions ----------------
     MAP_SIDO (data/sido.js) : 시·도 16개. 하위 지역이 있는 시·도는 sub:1
     MAP_SUB[시·도코드] (data/sub.js) : 하위 지역(시·군·구, 일반구는 시로 묶음) 229개
     해금 단위(unit) = 하위 지역 229 + 하위 구역이 없는 세종 1 = 230
     좌표는 d4 인코딩(경위도×1e4 정수, 링마다 첫 점 절대값 + 이후 차이)이라 시작할 때 풀어 쓴다 */
  function decodePolys(enc){
    var polys = [];
    for (var p=0;p<enc.length;p++){
      var rings = [];
      for (var r=0;r<enc[p].length;r++){
        var a = enc[p][r], ring = [], x = 0, y = 0;
        for (var i=0;i<a.length;i+=2){ x += a[i]; y += a[i+1]; ring.push([x/1e4, y/1e4]); }
        rings.push(ring);
      }
      polys.push(rings);
    }
    return polys;
  }
  var REG = {};       // code -> region
  var SIDO = MAP_SIDO.regions;
  var UNITS = [];
  SIDO.forEach(function(s){
    s.polys = decodePolys(s.p); delete s.p;
    REG[s.code] = s;
    var sub = (s.sub && MAP_SUB[s.code]) ? MAP_SUB[s.code].regions : null;
    if (sub){
      s.children = sub;
      sub.forEach(function(c){ c.polys = decodePolys(c.p); delete c.p; REG[c.code] = c; UNITS.push(c); });
    } else {
      UNITS.push(s);
    }
  });
  var TOTAL_UNITS = UNITS.length;
  // 칩·배지용 짧은 시·도 이름
  var SIDO_SHORT = { "11":"서울","12":"전남광주","26":"부산","27":"대구","28":"인천","30":"대전","31":"울산","36":"세종",
                     "41":"경기","43":"충북","44":"충남","47":"경북","48":"경남","50":"제주","51":"강원","52":"전북" };

  function regionByCode(code){ return REG[code] || null; }
  function isUnit(code){ var r = REG[code]; return !!r && !r.children; }
  function fullName(r){
    if (!r) return "";
    return r.parent ? REG[r.parent].name+" "+r.name : r.name;
  }
  // 시트 제목 아래 한 줄: "경기도 · 수원시" 대신 소속 시·도 + (있으면) 영문명
  function regionSubtitle(r){
    var parts = [];
    if (r.parent) parts.push(REG[r.parent].name);
    if (r.name_eng) parts.push(r.name_eng);
    return parts.join(" · ");
  }

  /* ---------------- state ----------------
     v3 = { version:3, home, unlocks{code:{at,lon,lat,acc,test,via}}, posts{}, buildings{}, legacy{} }
     하위 지역이 있는 시·도 코드로 남은 포스트·건물은 그 시·도의 "📜 이전 기록"(legacy)으로 보여준다. */
  function emptyState(){ return { version:3, home:null, unlocks:{}, posts:{}, buildings:{}, legacy:{} }; }

  // v1 시·도 코드(통계청 옛 코드) -> 행정안전부 시·도 코드
  var V1_CODE_MAP = {
    "11":"11","21":"26","22":"27","23":"28","24":"12","25":"30","26":"31","29":"36",
    "31":"41","32":"51","33":"43","34":"44","35":"52","36":"12","37":"47","38":"48","39":"50"
  };
  function placedCount(grid){ return (grid||[]).filter(Boolean).length; }

  // v1 → v3. v1 은 시·도 단위 해금이고 좌표가 없다 → 하위 지역은 잠근 채 시·도의 이전 기록으로 보존 (선택지 A)
  function migrateV1(v1){
    var s = emptyState();
    s.migratedFrom = "v1";
    var oldUnlocked = v1.unlocked || [];
    oldUnlocked.forEach(function(oldCode){
      var code = V1_CODE_MAP[oldCode];
      if (!code) return;
      if (REG[code] && REG[code].children){
        s.legacy[code] = s.legacy[code] || { from:"v1", oldCode:oldCode };
        return;
      }
      if (!s.unlocks[code]) s.unlocks[code] = { at:null, lon:null, lat:null, acc:null, test:false, via:"v1" };
    });
    if (v1.home && V1_CODE_MAP[v1.home]) s.home = V1_CODE_MAP[v1.home];

    // 포스트: 광주(24)+전남(36)처럼 합쳐지는 지역은 이어 붙인다
    Object.keys(v1.posts || {}).forEach(function(oldCode){
      var code = V1_CODE_MAP[oldCode];
      if (!code) return;
      s.posts[code] = (s.posts[code] || []).concat(v1.posts[oldCode] || []);
    });
    // 건물: 한 칸 격자라 합칠 수 없다 → 더 많이 지은 쪽을 쓰고 나머지는 legacy 에 보존
    Object.keys(v1.buildings || {}).forEach(function(oldCode){
      var code = V1_CODE_MAP[oldCode];
      if (!code) return;
      var grid = v1.buildings[oldCode];
      var cur = s.buildings[code];
      if (!cur){ s.buildings[code] = grid; return; }
      var keep = placedCount(grid) > placedCount(cur) ? grid : cur;
      var spare = keep === grid ? cur : grid;
      s.buildings[code] = keep;
      s.legacy[code] = s.legacy[code] || { from:"v1" };
      s.legacy[code].spareBuildings = (s.legacy[code].spareBuildings || []).concat([spare]);
    });
    return s;
  }

  // v2 → v3. v2 는 강원만 시·군, 나머지는 시·도 단위였다.
  //  - 강원 시·군·세종 해금: 코드가 같으므로 그대로
  //  - 시·도 단위 해금 + 좌표 있음(GPS·가상 위치·더블 탭): 그 좌표가 속한 하위 지역을 해금 (테스트 표시·방식 유지)
  //  - 시·도 단위 해금 + 좌표 없음(v1 에서 넘어온 것): 하위 지역은 잠그고 이전 기록으로 보존 (선택지 A)
  //  - 시·도 코드의 포스트·건물: 어느 하위 지역 것인지 알 수 없으므로 그대로 두고 이전 기록으로 보여준다
  function migrateV2(v2){
    var s = emptyState();
    s.migratedFrom = "v2";
    s.posts = v2.posts || {};
    s.buildings = v2.buildings || {};
    s.legacy = v2.legacy || {};
    var homeMapped = null;
    Object.keys(v2.unlocks || {}).forEach(function(code){
      var u = v2.unlocks[code], r = REG[code];
      if (!r || !r.children){ s.unlocks[code] = u; return; }
      var lg = s.legacy[code] = s.legacy[code] || { from:"v2" };
      if (u && typeof u.lon === "number" && typeof u.lat === "number"){
        var sub = findIn(r.children, u.lon, u.lat) || nearestIn(r.children, u.lon, u.lat);
        if (sub){
          lg.mappedTo = sub.code;
          if (!s.unlocks[sub.code]){
            var copy = {}; Object.keys(u).forEach(function(k){ copy[k] = u[k]; });
            copy.migrated = "v2-sido";
            s.unlocks[sub.code] = copy;
          }
          if (code === v2.home) homeMapped = sub.code;
        }
      }
    });
    Object.keys(s.posts).concat(Object.keys(s.buildings)).forEach(function(code){
      var r = REG[code];
      if (r && r.children && !s.legacy[code]) s.legacy[code] = { from:"v2" };
    });
    s.home = homeMapped || v2.home || null;
    return s;
  }

  function normalizeState(s){
    if (!s || typeof s !== "object" || s.version !== 3) s = emptyState();
    s.unlocks = s.unlocks || {};
    s.posts = s.posts || {};
    s.buildings = s.buildings || {};
    s.legacy = s.legacy || {};
    return s;
  }
  // 어떤 버전의 상태든 v3 로 맞춘다 (불러오기·백업 복원 공용)
  function upgradeState(s){
    if (s && s.version === 3) return normalizeState(s);
    if (s && s.version === 2) return normalizeState(migrateV2(s));
    if (s && Array.isArray(s.unlocked)) return normalizeState(migrateV1(s));
    throw new Error("format");
  }
  function loadState(){
    var keys = [STATE_KEY, STATE_KEY_V2, STATE_KEY_V1];
    for (var i=0;i<keys.length;i++){
      try{
        var raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        var s = upgradeState(JSON.parse(raw));
        if (i > 0){ try{ localStorage.setItem(STATE_KEY, JSON.stringify(s)); }catch(e){} } // 이전 키는 지우지 않는다
        return s;
      }catch(e){}
    }
    return emptyState();
  }
  function saveState(){
    try{ localStorage.setItem(STATE_KEY, JSON.stringify(state)); return true; }
    catch(e){ toast("기기 저장 공간이 부족해 저장하지 못했어요", "⚠️"); return false; }
  }
