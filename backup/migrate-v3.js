  // v3 → v4. v3 는 광역시가 구·군 단위, 옛 광주가 5개 구, 울릉군이 일반 지역이었다.
  //  - 광역시의 구·군 코드 → 그 광역시(시·도 코드) / 옛 광주 구 → 광주(12000)
  //  - 울릉군(47940) → 챌린지: 좌표가 독도 안이면 독도, 아니면 울릉도
  //  - 같은 곳으로 합쳐지면: 해금은 실제(비테스트) 기록을 우선, 그다음 이른 시각. 포스트는 이어 붙이고,
  //    건물 격자는 더 많이 지은 쪽을 쓰고 나머지는 legacy[코드].spareBuildings 에 보존
  //  - 좌표가 없어 legacy 로만 남았던 광역시 해금(v1)은, 이제 광역시가 다시 1곳이 되므로 해금으로 되살린다
  function remapV3Code(code, u){
    var r = REG[code];
    if (r && (isUnit(code) || r.challenge || r.children)) return code;
    if (GWANGJU_GU[code]) return "12000";
    if (code === "47940"){
      var c = (u && typeof u.lon === "number") ? findIn([REG.c_dokdo], u.lon, u.lat) : null;
      return c ? "c_dokdo" : "c_ulleungdo";
    }
    if (code.length === 5 && METRO_CODES[code.slice(0,2)]) return code.slice(0,2);
    return code;
  }
  function betterUnlock(a, b){
    if (!a) return b; if (!b) return a;
    if (!!a.test !== !!b.test) return a.test ? b : a;   // 실제 해금 우선
    if (a.at == null) return b; if (b.at == null) return a;
    return a.at <= b.at ? a : b;                         // 먼저 해금한 기록
  }
  function migrateV3(v3){
    var s = emptyState();
    s.migratedFrom = "v3";
    s.legacy = v3.legacy || {};
    Object.keys(v3.unlocks || {}).forEach(function(code){
      var u = v3.unlocks[code], to = remapV3Code(code, u);
      var pick = betterUnlock(s.unlocks[to], u);
      if (to !== code && pick === u){ var copy = {}; Object.keys(u).forEach(function(k){ copy[k] = u[k]; }); copy.mergedFrom = code; pick = copy; }
      s.unlocks[to] = pick;
    });
    Object.keys(v3.posts || {}).forEach(function(code){
      var to = remapV3Code(code, null);
      s.posts[to] = (s.posts[to] || []).concat(v3.posts[code] || []);
    });
    Object.keys(v3.buildings || {}).forEach(function(code){
      var to = remapV3Code(code, null), grid = v3.buildings[code], cur = s.buildings[to];
      if (!cur){ s.buildings[to] = grid; return; }
      var keep = placedCount(grid) > placedCount(cur) ? grid : cur;
      s.buildings[to] = keep;
      s.legacy[to] = s.legacy[to] || { from:"v3" };
      s.legacy[to].spareBuildings = (s.legacy[to].spareBuildings || []).concat([keep === grid ? cur : grid]);
    });
    Object.keys(s.legacy).forEach(function(code){
      if (!METRO_CODES[code]) return;
      if (!s.unlocks[code]) s.unlocks[code] = { at:null, lon:null, lat:null, acc:null, test:false, via:"v1", restored:true };
      if (!s.legacy[code].spareBuildings) delete s.legacy[code]; // 광역시는 이제 확대 화면이 없으므로 이전 기록 표시가 필요 없다
    });
    var home = v3.home ? remapV3Code(v3.home, v3.unlocks && v3.unlocks[v3.home]) : null;
    s.home = (home && REG[home] && REG[home].challenge) ? REG[home].parent : home; // 챌린지는 홈이 될 수 없다
    return s;
  }

