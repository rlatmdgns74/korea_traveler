<script>
(function(){
  "use strict";
  var STATE_KEY = "kr-traveler-state-v2";
  var STATE_KEY_V1 = "kr-traveler-state-v1"; // 이전 버전 기록. 지우지 않고 백업으로 남긴다.
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
     MAP_SIDO (data/sido.js)   : 시·도 16개. 세분화된 시·도는 sub 필드를 가진다.
     MAP_SUB[code] (data/*.js) : 세분화된 시·도의 시·군·구.
     해금 단위(unit) = 세분화되지 않은 시·도 + 세분화된 시·도의 시·군·구 */
  var REG = {};       // code -> region
  var SIDO = MAP_SIDO.regions;
  var UNITS = [];
  SIDO.forEach(function(s){
    REG[s.code] = s;
    var sub = (s.sub && MAP_SUB[s.code]) ? MAP_SUB[s.code].regions : null;
    if (sub){
      s.children = sub;
      sub.forEach(function(c){ REG[c.code] = c; UNITS.push(c); });
    } else {
      UNITS.push(s);
    }
  });
  var TOTAL_UNITS = UNITS.length;

  function regionByCode(code){ return REG[code] || null; }
  function isUnit(code){ var r = REG[code]; return !!r && !r.children; }
  function fullName(r){
    if (!r) return "";
    return r.parent ? REG[r.parent].name+" "+r.name : r.name;
  }

  /* ---------------- state ---------------- */
  function emptyState(){ return { version:2, home:null, unlocks:{}, posts:{}, buildings:{}, legacy:{} }; }

  // v1 시·도 코드(통계청 옛 코드) -> v2 코드(행정안전부 코드)
  var V1_CODE_MAP = {
    "11":"11","21":"26","22":"27","23":"28","24":"12","25":"30","26":"31","29":"36",
    "31":"41","32":"51","33":"43","34":"44","35":"52","36":"12","37":"47","38":"48","39":"50"
  };
  function placedCount(grid){ return (grid||[]).filter(Boolean).length; }

  function migrateV1(v1){
    var s = emptyState();
    s.migratedFrom = "v1";
    var oldUnlocked = v1.unlocked || [];
    oldUnlocked.forEach(function(oldCode){
      var code = V1_CODE_MAP[oldCode];
      if (!code) return;
      if (REG[code] && REG[code].children){
        // 강원: v1 은 도 전체 해금이라 어느 시·군인지 알 수 없다 → 시·군은 잠근 채 이전 기록으로 보존
        s.legacy[code] = s.legacy[code] || { from:"v1", oldCode:oldCode };
        return;
      }
      if (!s.unlocks[code]) s.unlocks[code] = { at:null, lon:null, lat:null, acc:null, test:false, from:"v1" };
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

  function normalizeState(s){
    if (!s || typeof s !== "object" || s.version !== 2) s = emptyState();
    s.unlocks = s.unlocks || {};
    s.posts = s.posts || {};
    s.buildings = s.buildings || {};
    s.legacy = s.legacy || {};
    return s;
  }
  function loadState(){
    try{
      var raw = localStorage.getItem(STATE_KEY);
      if (raw) return normalizeState(JSON.parse(raw));
      var rawV1 = localStorage.getItem(STATE_KEY_V1);
      if (rawV1){
        var migrated = normalizeState(migrateV1(JSON.parse(rawV1)));
        try{ localStorage.setItem(STATE_KEY, JSON.stringify(migrated)); }catch(e){}
        return migrated;
      }
    }catch(e){}
    return emptyState();
  }
  function saveState(){
    try{ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
    catch(e){ toast("기기 저장 공간이 부족해 저장하지 못했어요", "⚠️"); }
  }
  var state = (window.claude && window.claude.hot && window.claude.hot.data) ? normalizeState(window.claude.hot.data) : loadState();

  if (window.claude && window.claude.hot && window.claude.hot.snapshot){
    window.claude.hot.snapshot(function(){ return state; });
  }

  function isUnlocked(code){ return !!state.unlocks[code]; }
  function unlockedUnitCount(){
    var n = 0;
    for (var i=0;i<UNITS.length;i++) if (isUnlocked(UNITS[i].code)) n++;
    return n;
  }
  function childUnlockedCount(sidoR){
    var n = 0;
    (sidoR.children||[]).forEach(function(c){ if (isUnlocked(c.code)) n++; });
    return n;
  }
  function recordUnlock(code, pos){
    if (state.unlocks[code]) return;
    var c = pos && pos.coords;
    state.unlocks[code] = {
      at: Date.now(),
      lon: c ? c.longitude : null,
      lat: c ? c.latitude : null,
      acc: (c && typeof c.accuracy === "number") ? c.accuracy : null,
      test: devMode
    };
  }

  /* ---------------- geo helpers ---------------- */
  function pointInRing(pt, ring){
    var x = pt[0], y = pt[1], inside = false;
    for (var i=0, j=ring.length-1; i<ring.length; j=i++){
      var xi=ring[i][0], yi=ring[i][1], xj=ring[j][0], yj=ring[j][1];
      var intersect = ((yi>y) !== (yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  function pointInPolys(pt, polys){
    // even-odd across all rings of all polygons (handles holes reasonably)
    for (var p=0;p<polys.length;p++){
      var poly = polys[p];
      var inOuter = pointInRing(pt, poly[0]);
      if (!inOuter) continue;
      var inHole = false;
      for (var r=1;r<poly.length;r++){ if (pointInRing(pt, poly[r])) { inHole = true; break; } }
      if (inOuter && !inHole) return true;
    }
    return false;
  }
  function inBBox(lon, lat, b, pad){
    pad = pad || 0;
    return !(lon < b[0]-pad || lon > b[2]+pad || lat < b[1]-pad || lat > b[3]+pad);
  }
  function findIn(list, lon, lat){
    for (var i=0;i<list.length;i++){
      var r = list[i];
      if (!inBBox(lon, lat, r.bbox)) continue;
      if (pointInPolys([lon,lat], r.polys)) return r;
    }
    return null;
  }
  // 점과 다각형 경계 사이 거리(km) — 경계 단순화로 해안·경계 근처가 밖으로 판정될 때 보정용
  function distToPolysKm(lon, lat, polys){
    var kx = Math.cos(lat*Math.PI/180) * 111.32, ky = 110.57;
    var best = Infinity;
    for (var p=0;p<polys.length;p++) for (var r=0;r<polys[p].length;r++){
      var ring = polys[p][r];
      for (var i=0, j=ring.length-1; i<ring.length; j=i++){
        var ax=(ring[j][0]-lon)*kx, ay=(ring[j][1]-lat)*ky, bx=(ring[i][0]-lon)*kx, by=(ring[i][1]-lat)*ky;
        var dx=bx-ax, dy=by-ay, len=dx*dx+dy*dy;
        var t = len ? Math.max(0, Math.min(1, -(ax*dx+ay*dy)/len)) : 0;
        var qx=ax+t*dx, qy=ay+t*dy, d=Math.sqrt(qx*qx+qy*qy);
        if (d < best) best = d;
      }
    }
    return best;
  }
  var NEAREST_KM = 2;
  function nearestIn(list, lon, lat){
    var best = null, bestD = NEAREST_KM;
    for (var i=0;i<list.length;i++){
      var r = list[i];
      if (!inBBox(lon, lat, r.bbox, 0.05)) continue;
      var d = distToPolysKm(lon, lat, r.polys);
      if (d <= bestD){ bestD = d; best = r; }
    }
    return best;
  }
  // 좌표 → 해금 단위(세분화된 시·도면 시·군·구, 아니면 시·도)
  function findRegionForPoint(lon, lat){
    var sido = findIn(SIDO, lon, lat) || nearestIn(SIDO, lon, lat);
    if (!sido) return null;
    if (!sido.children) return sido;
    return findIn(sido.children, lon, lat) || nearestIn(sido.children, lon, lat);
  }

  /* ---------------- toast ---------------- */
  function toast(msg, icon){
    var wrap = document.getElementById("toast-wrap");
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = "<span>"+(icon||"✅")+"</span><span></span>";
    el.querySelector("span:last-child").textContent = msg;
    wrap.appendChild(el);
    setTimeout(function(){ el.style.transition="opacity .3s"; el.style.opacity="0"; setTimeout(function(){ el.remove(); }, 300); }, 2200);
  }

  /* ---------------- projection ----------------
     위경도를 그대로 쓰되 경도 방향을 cos(중앙 위도)로 줄여 모양 왜곡을 줄인다 */
  var MAP_W = 800, MAP_PAD = 16;
  var PROJ = (function(){
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    SIDO.forEach(function(s){
      b[0] = Math.min(b[0], s.bbox[0]); b[1] = Math.min(b[1], s.bbox[1]);
      b[2] = Math.max(b[2], s.bbox[2]); b[3] = Math.max(b[3], s.bbox[3]);
    });
    var kx = Math.cos(((b[1]+b[3])/2) * Math.PI/180);
    var scale = (MAP_W - MAP_PAD*2) / ((b[2]-b[0]) * kx);
    return { lon0:b[0], lat1:b[3], kx:kx, scale:scale, h: Math.ceil((b[3]-b[1])*scale + MAP_PAD*2) };
  })();
  function proj(lon, lat){
    return [MAP_PAD + (lon-PROJ.lon0)*PROJ.kx*PROJ.scale, MAP_PAD + (PROJ.lat1-lat)*PROJ.scale];
  }
  function pathFor(polys){
    var out = [];
    for (var p=0;p<polys.length;p++) for (var r=0;r<polys[p].length;r++){
      var ring = polys[p][r];
      for (var i=0;i<ring.length;i++){
        var xy = proj(ring[i][0], ring[i][1]);
        out.push((i===0?"M":"L")+xy[0].toFixed(1)+","+xy[1].toFixed(1));
      }
      out.push("Z");
    }
    return out.join("");
  }
  function projBBox(b){
    var a = proj(b[0], b[3]), c = proj(b[2], b[1]);
    return { x:a[0], y:a[1], w:c[0]-a[0], h:c[1]-a[1] };
  }

  /* ---------------- map render ---------------- */
  var svg = document.getElementById("map");
  var zoomCode = null;    // 확대 중인 시·도 코드 (null = 전국)
  var zoomScale = 1;

  function buildMap(){
    svg.setAttribute("viewBox", "0 0 "+MAP_W+" "+PROJ.h);
    var sidoParts = [], subParts = [], labelParts = [];
    SIDO.forEach(function(s){
      sidoParts.push('<path class="region-path sido-path'+(s.children?' has-sub':'')+'" data-code="'+s.code+'" d="'+pathFor(s.polys)+'"></path>');
      if (s.children){
        s.children.forEach(function(c){
          subParts.push('<path class="region-path sub-path" data-code="'+c.code+'" data-parent="'+s.code+'" d="'+pathFor(c.polys)+'"></path>');
          var lp = proj(c.lp[0], c.lp[1]);
          labelParts.push('<text class="sub-label" data-parent="'+s.code+'" x="'+lp[0].toFixed(1)+'" y="'+lp[1].toFixed(1)+'">'+escapeHtml(c.name)+'</text>');
        });
        var bp = proj(s.lp[0], s.lp[1]);
        labelParts.push('<g class="sub-badge" data-code="'+s.code+'" transform="translate('+bp[0].toFixed(1)+','+bp[1].toFixed(1)+')">'+
          '<rect x="-24" y="-13" width="48" height="26" rx="13"></rect><text y="1"></text></g>');
      }
    });
    svg.innerHTML =
      '<g id="mapView">'+
        '<g id="layerSido">'+sidoParts.join("")+'</g>'+
        '<g id="layerSub">'+subParts.join("")+'</g>'+
        '<g id="layerLabels">'+labelParts.join("")+'</g>'+
      '</g>';
    Array.prototype.forEach.call(svg.querySelectorAll(".region-path"), function(p){
      p.addEventListener("click", function(){ openRegion(p.getAttribute("data-code")); });
    });
    Array.prototype.forEach.call(svg.querySelectorAll(".sub-badge"), function(g){
      g.addEventListener("click", function(){ openRegion(g.getAttribute("data-code")); });
    });
    applyZoom(false);
    renderMap();
  }
  function renderMap(){
    var unlockedCount = unlockedUnitCount();
    document.getElementById("unlockedCount").textContent = unlockedCount;
    document.getElementById("progressFill").style.width = Math.round(unlockedCount/TOTAL_UNITS*100)+"%";
    Array.prototype.forEach.call(svg.querySelectorAll(".region-path"), function(p){
      var code = p.getAttribute("data-code");
      var unit = isUnit(code);
      p.classList.toggle("unlocked", unit && isUnlocked(code) && code !== state.home);
      p.classList.toggle("home", unit && code === state.home);
      p.classList.toggle("test-unlock", unit && isUnlocked(code) && !!state.unlocks[code].test);
      p.classList.toggle("selected", code === selectedCode);
    });
    Array.prototype.forEach.call(svg.querySelectorAll(".sub-badge"), function(g){
      var r = REG[g.getAttribute("data-code")];
      g.querySelector("text").textContent = childUnlockedCount(r)+"/"+r.children.length;
    });
    renderMapBar();
  }

  /* ---------------- zoom (전국 ↔ 시·도) ---------------- */
  var mapBar = document.getElementById("mapBar");
  function applyZoom(animate){
    var view = svg.querySelector("#mapView");
    if (!view) return;
    var tx = 0, ty = 0, s = 1;
    if (zoomCode){
      var bb = projBBox(REG[zoomCode].bbox);
      s = Math.min(MAP_W/bb.w, PROJ.h/bb.h) * 0.92;
      tx = (MAP_W - bb.w*s)/2 - bb.x*s;
      ty = (PROJ.h - bb.h*s)/2 - bb.y*s;
    }
    zoomScale = s;
    view.style.transition = animate ? "transform .32s ease" : "none";
    view.style.transform = "translate("+tx.toFixed(1)+"px,"+ty.toFixed(1)+"px) scale("+s.toFixed(4)+")";
    svg.classList.toggle("zoomed", !!zoomCode);
    // 라벨 글자 크기를 화면 기준으로 일정하게
    Array.prototype.forEach.call(svg.querySelectorAll(".sub-label"), function(t){
      var on = zoomCode && t.getAttribute("data-parent") === zoomCode;
      t.classList.toggle("on", !!on);
      t.style.fontSize = (13/s).toFixed(2)+"px";
    });
    Array.prototype.forEach.call(svg.querySelectorAll(".sub-path"), function(p){
      p.classList.toggle("active", !!zoomCode && p.getAttribute("data-parent") === zoomCode);
    });
    renderMapBar();
  }
  function zoomTo(code){
    zoomCode = code;
    applyZoom(true);
  }
  function zoomOut(){
    if (scrimEl) closeSheet();
    zoomCode = null;
    applyZoom(true);
  }
  function renderMapBar(){
    if (!mapBar) return;
    if (!zoomCode){
      mapBar.hidden = true;
      return;
    }
    var r = REG[zoomCode];
    mapBar.hidden = false;
    document.getElementById("zoomTitle").textContent = r.name+" · "+childUnlockedCount(r)+"/"+r.children.length+" 해금";
    document.getElementById("btnLegacy").hidden = !state.legacy[zoomCode];
  }
  document.getElementById("btnZoomOut").addEventListener("click", zoomOut);
  document.getElementById("btnLegacy").addEventListener("click", function(){
    if (zoomCode) renderLegacySheet(REG[zoomCode]);
  });

  /* ---------------- onboarding / geolocation ---------------- */
  var onboardStatus = document.getElementById("onboardStatus");
  var devMode = false;
  var simulatedPoint = null; // [lon,lat] when in dev mode

  function currentPositionAsync(){
    return new Promise(function(resolve){
      if (devMode && simulatedPoint){ resolve({coords:{longitude:simulatedPoint[0], latitude:simulatedPoint[1], accuracy:0}, simulated:true}); return; }
      // Native app build (Capacitor): use the native Geolocation plugin so the
      // OS-level permission prompt and GPS hardware are used correctly.
      var capGeo = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation;
      if (capGeo && capGeo.getCurrentPosition){
        capGeo.getCurrentPosition({ enableHighAccuracy:true, timeout:8000 })
          .then(function(pos){ resolve(pos); })
          .catch(function(){ resolve(null); });
        return;
      }
      // Web/preview build: standard browser Geolocation API.
      if (!("geolocation" in navigator)){ resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        function(pos){ resolve(pos); },
        function(){ resolve(null); },
        { enableHighAccuracy:true, timeout:8000, maximumAge:60000 }
      );
    });
  }

  function startWithHome(code, pos){
    state.home = code;
    recordUnlock(code, pos);
    saveState();
    document.getElementById("onboard").hidden = true;
    document.getElementById("mapCard").hidden = false;
    buildMap();
    var r = regionByCode(code);
    toast((r?fullName(r):"현재 지역")+" 잠금 해제! 여행을 시작해보세요", "🎉");
  }

  document.getElementById("btnLocate").addEventListener("click", function(){
    onboardStatus.textContent = "위치를 확인하는 중...";
    currentPositionAsync().then(function(pos){
      if (!pos){
        onboardStatus.textContent = "위치를 가져오지 못했어요. 권한을 허용했는지 확인하거나 테스트 모드를 사용해주세요.";
        return;
      }
      var r = findRegionForPoint(pos.coords.longitude, pos.coords.latitude);
      if (!r){
        onboardStatus.textContent = "대한민국 영역 밖으로 확인됐어요. 테스트 모드로 시작해볼까요?";
        return;
      }
      onboardStatus.textContent = "";
      startWithHome(r.code, pos);
    });
  });

  document.getElementById("btnDevStart").addEventListener("click", function(){
    setDevMode(true);
    document.getElementById("devPanel").hidden = false;
    onboardStatus.textContent = "아래 테스트 패널에서 지역을 선택하고 '이 위치로 이동'을 눌러주세요.";
    document.getElementById("devPanel").scrollIntoView({behavior:"smooth", block:"center"});
  });

  /* ---------------- dev mode ---------------- */
  var devToggle = document.getElementById("devToggle");
  var devPanel = document.getElementById("devPanel");
  var devSelect = document.getElementById("devSelect");
  var devSubSelect = document.getElementById("devSubSelect");
  SIDO.slice().sort(function(a,b){ return a.name.localeCompare(b.name,"ko"); }).forEach(function(r){
    var opt = document.createElement("option");
    opt.value = r.code; opt.textContent = r.name;
    devSelect.appendChild(opt);
  });
  function fillDevSub(){
    var s = REG[devSelect.value];
    devSubSelect.innerHTML = "";
    devSubSelect.hidden = !s.children;
    if (!s.children) return;
    s.children.slice().sort(function(a,b){ return a.name.localeCompare(b.name,"ko"); }).forEach(function(c){
      var opt = document.createElement("option");
      opt.value = c.code; opt.textContent = c.name;
      devSubSelect.appendChild(opt);
    });
  }
  devSelect.addEventListener("change", fillDevSub);
  fillDevSub();
  function devTargetCode(){
    return devSubSelect.hidden ? devSelect.value : devSubSelect.value;
  }
  function syncDevSelects(code){
    var r = REG[code];
    devSelect.value = r.parent || r.code;
    fillDevSub();
    if (r.parent) devSubSelect.value = r.code;
  }
  function setDevMode(v){
    devMode = v;
    devToggle.setAttribute("aria-pressed", v ? "true":"false");
    devPanel.hidden = !v;
  }
  devToggle.addEventListener("click", function(){ setDevMode(!devMode); });
  function moveSimulatedTo(code){
    var r = regionByCode(code);
    simulatedPoint = [r.lp[0], r.lp[1]]; // 빌드 단계에서 계산한, 다각형 안쪽이 보장되는 점
    return r;
  }
  document.getElementById("devApply").addEventListener("click", function(){
    var code = devTargetCode();
    var r = moveSimulatedTo(code);
    if (document.getElementById("onboard").hidden === false){
      startWithHome(code, {coords:{longitude:simulatedPoint[0], latitude:simulatedPoint[1], accuracy:0}});
    } else {
      toast(fullName(r)+"(으)로 이동했어요. 지도에서 확인해보세요.", "🧭");
      if (selectedCode) openRegion(selectedCode);
    }
  });

  /* ---------------- sheet ---------------- */
  var selectedCode = null;
  var scrimEl = null;
  function closeSheet(){
    if (scrimEl){ scrimEl.remove(); scrimEl = null; }
    selectedCode = null;
    renderMap();
  }
  function openSheet(html){
    if (scrimEl) scrimEl.remove();
    scrimEl = document.createElement("div");
    scrimEl.className = "scrim";
    scrimEl.innerHTML = '<div class="sheet"><div class="sheet-handle"></div>'+html+'</div>';
    scrimEl.addEventListener("click", function(e){ if (e.target === scrimEl) closeSheet(); });
    document.body.appendChild(scrimEl);
  }

  function openRegion(code){
    var r = regionByCode(code);
    if (!r) return;
    if (r.children){
      // 세분화된 시·도는 시트 대신 시·군·구 지도로 확대
      if (zoomCode !== code) zoomTo(code);
      return;
    }
    selectedCode = code;
    renderMap();
    var isHome = code === state.home;

    if (!isUnlocked(code)){
      renderLockedSheet(r);
    } else {
      renderUnlockedSheet(r, isHome);
    }
  }

  function unlockTag(code, isHome){
    var u = state.unlocks[code];
    var tag = '<span class="region-tag '+(isHome?'tag-home':'tag-unlocked')+'">'+(isHome?'🏡 내 홈 지역':'🔓 잠금 해제됨')+'</span>';
    if (u && u.test) tag += ' <span class="region-tag tag-test">🧪 테스트 모드로 해금</span>';
    return tag;
  }

  function renderLockedSheet(r){
    var html =
      '<div class="sheet-head"><div>'+
        '<span class="region-tag tag-locked">🔒 잠김</span>'+
        '<h2 style="margin-top:6px;">'+r.name+'</h2>'+
        '<div class="coord mono">'+(r.parent ? REG[r.parent].name+' · ' : '')+r.name_eng+'</div>'+
      '</div><button class="close-x" id="closeBtn">✕</button></div>'+
      '<p style="color:var(--ink-soft); font-size:13px; line-height:1.6;">이 지역은 아직 방문하지 않았어요. 실제로 이 지역에 가서 확인하면 미션을 시작할 수 있어요.</p>'+
      (devMode ? '<button class="btn btn-secondary btn-dev" id="devHereBtn">🧪 여기로 가상 이동</button>' : '')+
      '<button class="btn btn-secondary" id="checkHereBtn">🧭 지금 여기 있는지 확인하기</button>'+
      '<p class="status-line" id="lockedStatus"></p>'+
      '<div id="missionSlot"></div>';
    openSheet(html);
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
    var devHereBtn = document.getElementById("devHereBtn");
    if (devHereBtn) devHereBtn.addEventListener("click", function(){
      moveSimulatedTo(r.code);
      syncDevSelects(r.code);
      document.getElementById("lockedStatus").textContent = "가상 위치를 "+fullName(r)+"(으)로 옮겼어요. 이제 위치를 확인해보세요.";
    });
    document.getElementById("checkHereBtn").addEventListener("click", function(){
      var statusEl = document.getElementById("lockedStatus");
      statusEl.textContent = "위치 확인 중...";
      currentPositionAsync().then(function(pos){
        if (!pos){ statusEl.textContent = "위치를 가져오지 못했어요. 테스트 모드를 사용해보세요."; return; }
        var here = findRegionForPoint(pos.coords.longitude, pos.coords.latitude);
        if (here && here.code === r.code){
          statusEl.textContent = "";
          renderMissionForm(r, pos);
        } else {
          statusEl.textContent = (here? "현재 "+fullName(here)+"에 계신 것으로 확인돼요." : "대한민국 영역 밖으로 확인됐어요.") + " "+r.name+"에 도착하면 다시 확인해주세요.";
        }
      });
    });
  }

  function renderMissionForm(r, pos){
    var slot = document.getElementById("missionSlot");
    slot.innerHTML =
      '<hr class="divider">'+
      '<div class="mission-box">📍 도착 확인 완료! 미션: <b>커뮤니티 포스트 작성</b><br>이 지역에서의 순간을 짧은 글(+사진)로 남기면 지역이 잠금 해제돼요.</div>'+
      '<textarea id="postText" placeholder="'+r.name+'에서의 순간을 적어보세요..." maxlength="300"></textarea>'+
      '<div class="file-row"><label for="postPhoto">📷 사진 추가(선택)</label><input type="file" id="postPhoto" accept="image/*"><img id="photoPreview" class="photo-preview" hidden></div>'+
      '<button class="btn btn-primary" id="submitPostBtn">✅ 포스트 올리고 잠금 해제</button>';
    var photoData = null;
    document.getElementById("postPhoto").addEventListener("change", function(e){
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        var tmpImg = new Image();
        tmpImg.onload = function(){
          var maxW = 480;
          var scale = Math.min(1, maxW / tmpImg.width);
          var cw = Math.max(1, Math.round(tmpImg.width*scale));
          var ch = Math.max(1, Math.round(tmpImg.height*scale));
          var canvas = document.createElement("canvas");
          canvas.width = cw; canvas.height = ch;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(tmpImg, 0, 0, cw, ch);
          try{ photoData = canvas.toDataURL("image/jpeg", 0.72); }
          catch(err){ photoData = ev.target.result; }
          var img = document.getElementById("photoPreview");
          img.src = photoData; img.hidden = false;
        };
        tmpImg.onerror = function(){
          photoData = ev.target.result;
          var img = document.getElementById("photoPreview");
          img.src = photoData; img.hidden = false;
        };
        tmpImg.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    });
    document.getElementById("submitPostBtn").addEventListener("click", function(){
      var text = document.getElementById("postText").value.trim();
      if (!text){ document.getElementById("postText").focus(); return; }
      addPost(r.code, text, photoData);
      recordUnlock(r.code, pos);
      saveState();
      closeSheet();
      toast(r.name+" 잠금 해제! 이제 건물을 지어보세요", "🎉");
    });
  }

  function addPost(code, text, photo){
    state.posts[code] = state.posts[code] || [];
    state.posts[code].unshift({ who:"나", text:text, photo:photo||null, when:new Date().toLocaleDateString("ko-KR"), mine:true });
    saveState();
  }

  function feedHtmlFor(posts){
    return posts.map(function(p){
      return '<div class="post"><div class="avatar">'+(p.mine?"나":escapeHtml(p.who.slice(0,1)))+'</div><div style="flex:1; min-width:0;">'+
        '<span class="who">'+(p.mine?"나":escapeHtml(p.who))+'</span><span class="when">'+escapeHtml(p.when||"")+'</span>'+
        '<div class="text">'+escapeHtml(p.text)+'</div>'+
        (p.photo? '<img class="photo" src="'+p.photo+'">':'')+
      '</div></div>';
    }).join("");
  }

  function renderUnlockedSheet(r, isHome){
    var buildings = state.buildings[r.code] || [];
    var placedCount = buildings.filter(Boolean).length;
    var myPosts = state.posts[r.code] || [];
    var feed = myPosts.concat(seedPosts(r.code));
    var feedHtml = feedHtmlFor(feed);

    var html =
      '<div class="sheet-head"><div>'+
        unlockTag(r.code, isHome)+
        '<h2 style="margin-top:6px;">'+r.name+'</h2>'+
        '<div class="coord mono">'+(r.parent ? REG[r.parent].name+' · ' : '')+r.name_eng+'</div>'+
      '</div><button class="close-x" id="closeBtn">✕</button></div>'+
      '<div class="stat-row">'+
        '<div class="stat-tile"><div class="v">'+myPosts.length+'</div><div class="l">내 포스트</div></div>'+
        '<div class="stat-tile"><div class="v">'+placedCount+'</div><div class="l">건물 수</div></div>'+
      '</div>'+
      '<button class="btn btn-secondary" id="decorateBtn">🏗️ 이 지역 꾸미기</button>'+
      '<hr class="divider">'+
      '<h3 style="font-size:14px;">커뮤니티 피드</h3>'+
      (feed.length? '<div class="feed">'+feedHtml+'</div>' : '<p class="empty-note">아직 포스트가 없어요.</p>')+
      '<textarea id="extraPostText" placeholder="이 지역에 포스트 추가로 남기기..." maxlength="300"></textarea>'+
      '<button class="btn btn-secondary" id="extraPostBtn">✏️ 포스트 남기기</button>';
    openSheet(html);
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
    document.getElementById("decorateBtn").addEventListener("click", function(){ renderDecorateSheet(r); });
    document.getElementById("extraPostBtn").addEventListener("click", function(){
      var t = document.getElementById("extraPostText").value.trim();
      if (!t) return;
      addPost(r.code, t, null);
      toast("포스트를 남겼어요", "📝");
      renderUnlockedSheet(r, isHome);
    });
  }

  // 이전 버전(v1)에서 시·도 단위로 해금했던 기록. 시·군은 잠근 채 포스트·건물만 보존해 보여준다.
  function renderLegacySheet(r){
    var buildings = state.buildings[r.code] || [];
    var posts = state.posts[r.code] || [];
    var html =
      '<div class="sheet-head"><div>'+
        '<span class="region-tag tag-legacy">📜 이전 버전 기록</span>'+
        '<h2 style="margin-top:6px;">'+r.name+'</h2>'+
        '<div class="coord mono">'+r.name_eng+'</div>'+
      '</div><button class="close-x" id="closeBtn">✕</button></div>'+
      '<p style="color:var(--ink-soft); font-size:13px; line-height:1.6;">이전 버전에서 '+r.name+' 전체를 한 번에 해금했던 기록이에요. 이제는 시·군을 하나씩 방문해서 해금해요. 예전 포스트와 건물은 그대로 남아 있어요.</p>'+
      '<div class="stat-row">'+
        '<div class="stat-tile"><div class="v">'+posts.length+'</div><div class="l">이전 포스트</div></div>'+
        '<div class="stat-tile"><div class="v">'+buildings.filter(Boolean).length+'</div><div class="l">이전 건물 수</div></div>'+
      '</div>'+
      '<button class="btn btn-secondary" id="decorateBtn">🏗️ 이전 건물 보기·꾸미기</button>'+
      '<hr class="divider">'+
      (posts.length? '<div class="feed">'+feedHtmlFor(posts)+'</div>' : '<p class="empty-note">이전 포스트가 없어요.</p>');
    openSheet(html);
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
    document.getElementById("decorateBtn").addEventListener("click", function(){ renderDecorateSheet(r, function(){ renderLegacySheet(r); }); });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; });
  }

  function renderDecorateSheet(r, onBack){
    var buildings = state.buildings[r.code] || new Array(GRID_N*GRID_N).fill(null);
    var selectedBuilding = null;
    var html =
      '<div class="sheet-head"><div>'+
        '<h2>'+r.name+' 꾸미기</h2>'+
        '<div class="coord">칸을 눌러 건물을 배치하거나 지워보세요</div>'+
      '</div><button class="close-x" id="closeBtn">✕</button></div>'+
      '<div class="palette" id="palette"></div>'+
      '<div class="grid4" id="grid"></div>'+
      '<button class="btn btn-primary" id="backBtn">← 지역 정보로 돌아가기</button>';
    openSheet(html);
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
    document.getElementById("backBtn").addEventListener("click", function(){
      if (onBack) onBack(); else renderUnlockedSheet(r, r.code===state.home);
    });

    var palEl = document.getElementById("palette");
    BUILDINGS.forEach(function(b){
      var btn = document.createElement("button");
      btn.className = "pal-item"; btn.setAttribute("aria-pressed","false"); btn.textContent = b.icon; btn.title = b.name;
      btn.addEventListener("click", function(){
        selectedBuilding = (selectedBuilding===b.id) ? null : b.id;
        Array.prototype.forEach.call(palEl.children, function(c){ c.setAttribute("aria-pressed","false"); });
        if (selectedBuilding) btn.setAttribute("aria-pressed","true");
      });
      palEl.appendChild(btn);
    });
    var eraser = document.createElement("button");
    eraser.className = "pal-item eraser"; eraser.setAttribute("aria-pressed","false"); eraser.textContent = "지우기";
    eraser.addEventListener("click", function(){
      selectedBuilding = (selectedBuilding==="__erase__") ? null : "__erase__";
      Array.prototype.forEach.call(palEl.children, function(c){ c.setAttribute("aria-pressed","false"); });
      if (selectedBuilding) eraser.setAttribute("aria-pressed","true");
    });
    palEl.appendChild(eraser);

    var gridEl = document.getElementById("grid");
    function renderGrid(){
      gridEl.innerHTML = "";
      for (var i=0;i<GRID_N*GRID_N;i++){
        var cellVal = buildings[i];
        var cell = document.createElement("button");
        cell.className = "cell" + (cellVal? " filled":"");
        var b = cellVal ? BUILDINGS.filter(function(x){return x.id===cellVal;})[0] : null;
        cell.textContent = b ? b.icon : "";
        (function(idx){
          cell.addEventListener("click", function(){
            if (selectedBuilding === "__erase__"){ buildings[idx] = null; }
            else if (selectedBuilding){ buildings[idx] = selectedBuilding; }
            else { return; }
            state.buildings[r.code] = buildings;
            saveState();
            renderGrid();
          });
        })(i);
        gridEl.appendChild(cell);
      }
    }
    renderGrid();
  }

  /* ---------------- boot ---------------- */
  document.getElementById("unitTotal").textContent = "/"+TOTAL_UNITS;
  document.getElementById("lockedCountText").textContent = String(TOTAL_UNITS-1);
  if (state.home){
    document.getElementById("onboard").hidden = true;
    document.getElementById("mapCard").hidden = false;
    buildMap();
    if (state.migratedFrom === "v1" && !state.migrationNoticed){
      state.migrationNoticed = true;
      saveState();
      toast("지도가 새 행정구역으로 바뀌었어요. 강원은 이제 시·군 단위로 해금해요", "🗺️");
    }
  }

  // 자동 점검용 (테스트 모드에서만 의미 있음)
  window.__kt = { migrateV1:migrateV1, findRegionForPoint:findRegionForPoint, REG:REG, UNITS:UNITS, state:function(){ return state; } };
})();
</script>
