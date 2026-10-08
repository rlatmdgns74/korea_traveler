  /* ---------------- 표시용 섬 배치 ----------------
     실제 지도와 다르게, 모바일에서 지도가 크게 보이도록 먼 섬을 내륙 쪽으로 옮기고 터치하기 쉽게 키운다.
     ★ 화면 표시에만 쓴다. 위치 판정(GPS)·이전·가상 위치는 모두 실제 좌표(r.polys, r.lp)를 그대로 쓴다.
     규칙은 다각형(외곽 링) 경계 상자 중심으로 고르고, 그 다각형을 자기 중심 기준 k배로 키운 뒤 (dx, dy)만큼 옮긴다. */
  var DISPLAY_RULES = [
    // 서해5도 북쪽: 백령도·대청도·소청도
    { name:"백령·대청·소청", test:function(x, y){ return x < 125.0 && y > 37.5; },               dx:0.85, dy:-0.1, k:1.5 },
    // 연평도(대·소연평): 위치는 그대로, 크기만
    { name:"연평",          test:function(x, y){ return x > 125.55 && x < 125.8 && y > 37.55 && y < 37.8; }, dx:0,    dy:0,    k:1.5 },
    // 가거도: 가장 서쪽
    { name:"가거",          test:function(x, y){ return x < 125.2 && y > 33.9 && y < 34.2; },  dx:0.45, dy:0,    k:1.4 },
    // 흑산도·홍도·만재도·태도: 신안 앞바다 섬과 겹치지 않을 만큼만
    { name:"흑산·홍도",      test:function(x, y){ return x < 125.6 && y > 33.9 && y < 35.0; },  dx:0.25, dy:0,    k:1.3 },
    // 격렬비열도 (태안)
    { name:"격렬비열",       test:function(x, y){ return x < 125.75 && y > 36.4 && y < 36.8; }, dx:0.2,  dy:0,    k:1.5 },
    // 울릉도(관음도·죽도 포함)
    { name:"울릉",          test:function(x, y){ return x > 130.7 && x < 131.1 && y > 37.3; }, dx:-0.7, dy:0,    k:1.5 },
    // 독도: 울릉도 동남쪽에, 아주 작아서 크게
    { name:"독도",          test:function(x, y){ return x > 131.5; },                          dx:-1.27, dy:0.1, k:4 },
    // 추자도: 제주를 올린 만큼 살짝
    { name:"추자",          test:function(x, y){ return x > 126.15 && x < 126.5 && y > 33.85 && y < 34.06; }, dx:0, dy:0.08, k:1.2 },
    // 제주 본섬·우도·마라도·가파도·비양도: 위로
    { name:"제주",          test:function(x, y){ return y < 33.7; },                           dx:0,    dy:0.25, k:1 }
  ];
  function ringBoxCenter(ring){
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i=0;i<ring.length;i++){
      var x = ring[i][0], y = ring[i][1];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return { cx:(x0+x1)/2, cy:(y0+y1)/2, x0:x0, y0:y0, x1:x1, y1:y1 };
  }
  function ruleFor(cx, cy){
    for (var i=0;i<DISPLAY_RULES.length;i++) if (DISPLAY_RULES[i].test(cx, cy)) return DISPLAY_RULES[i];
    return null;
  }
  // 다각형 하나를 표시 좌표로 (규칙이 없으면 그대로 돌려준다)
  function displayPoly(poly){
    var c = ringBoxCenter(poly[0]), rule = ruleFor(c.cx, c.cy);
    if (!rule) return poly;
    return poly.map(function(ring){
      return ring.map(function(p){
        return [c.cx + (p[0]-c.cx)*rule.k + rule.dx, c.cy + (p[1]-c.cy)*rule.k + rule.dy];
      });
    });
  }
  function displayPolys(r){
    if (!r.dpolys) r.dpolys = r.polys.map(displayPoly);
    return r.dpolys;
  }
  function displayBBox(r){
    if (!r.dbbox){
      var b = [Infinity, Infinity, -Infinity, -Infinity];
      displayPolys(r).forEach(function(p){
        var c = ringBoxCenter(p[0]);
        b[0] = Math.min(b[0], c.x0); b[1] = Math.min(b[1], c.y0); b[2] = Math.max(b[2], c.x1); b[3] = Math.max(b[3], c.y1);
      });
      r.dbbox = b;
    }
    return r.dbbox;
  }
  // 지역 안의 한 점(라벨·터치 위치)을 표시 좌표로: 그 점을 품은 다각형의 규칙을 따른다
  function displayPoint(r, lon, lat){
    for (var i=0;i<r.polys.length;i++){
      var c = ringBoxCenter(r.polys[i][0]);
      if (lon < c.x0 || lon > c.x1 || lat < c.y0 || lat > c.y1) continue;
      var rule = ruleFor(c.cx, c.cy);
      if (!rule) return [lon, lat];
      return [c.cx + (lon-c.cx)*rule.k + rule.dx, c.cy + (lat-c.cy)*rule.k + rule.dy];
    }
    return [lon, lat];
  }

  /* ---------------- projection ----------------
     위경도를 그대로 쓰되 경도 방향을 cos(중앙 위도)로 줄여 모양 왜곡을 줄인다. 범위는 표시용 배치 기준 */
  var MAP_W = 800, MAP_PAD = 16;
  var PROJ = (function(){
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    SIDO.concat(CHALLENGES).forEach(function(s){
      var d = displayBBox(s);
      b[0] = Math.min(b[0], d[0]); b[1] = Math.min(b[1], d[1]);
      b[2] = Math.max(b[2], d[2]); b[3] = Math.max(b[3], d[3]);
    });
    var kx = Math.cos(((b[1]+b[3])/2) * Math.PI/180);
    var scale = (MAP_W - MAP_PAD*2) / ((b[2]-b[0]) * kx);
    return { lon0:b[0], lat1:b[3], kx:kx, scale:scale, h: Math.ceil((b[3]-b[1])*scale + MAP_PAD*2) };
  })();
  function proj(lon, lat){
    return [MAP_PAD + (lon-PROJ.lon0)*PROJ.kx*PROJ.scale, MAP_PAD + (PROJ.lat1-lat)*PROJ.scale];
  }
  // 지역의 SVG 경로 (표시용 배치 적용)
  function pathFor(r){
    var polys = displayPolys(r), out = [];
    for (var p=0;p<polys.length;p++) for (var q=0;q<polys[p].length;q++){
      var ring = polys[p][q];
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

