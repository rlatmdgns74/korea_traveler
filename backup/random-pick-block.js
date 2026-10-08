  /* ---------------- 랜덤Pick ----------------
     지도에 마커펜을 던져 찍힌 곳으로 즉흥 여행. 해금 상태·챌린지·저장 구조는 바꾸지 않는다 (화면 연출만).
     - 결과는 누른 위치·당긴 세기와 무관한 완전 랜덤 (crypto.getRandomValues). 당긴 세기는 비행 연출에만 쓴다.
     - 지도 화면(SVG 좌표)에서 점을 균일하게 뽑는다 → 면적에 비례. 판정은 화면에 그린 좌표(표시용 섬 배치 포함)로 한다.
     - 해금 단위(UNITS) 기준이라 지역이 더 잘게 나뉘어도 같은 코드로 동작한다.
     - 제외: 해금한 곳(테스트 포함), 홈(해금 단위 코드가 정확히 같을 때), 챌린지 섬 영역(MAP_CHALLENGE). 매번 새로 계산 */
  var pickMode = null;            // null | "aim" | "pull" | "fly" | "result"
  var PICK_MAX_TRIES = 400;       // 재시도 상한. 넘으면 남은 후보 중 하나를 면적 비례로 직접 고른다
  var PICK_PULL_MS = 1200;        // 이만큼 누르면 최대로 당겨진다
  var PICK_MIN_HOLD_MS = 150;     // 이보다 짧게 누르면 던지지 않는다
  var PICK_MAX_PULL_PX = 70;
  var pickStage = document.getElementById("mapStage");
  var pickOverlay = document.getElementById("pickOverlay");
  var pickHint = document.getElementById("pickHint");
  var pickBtn = document.getElementById("tabPick");
  var pick = null;                // 진행 중인 Pick 정보
  var pickPrevZoom = null;        // Pick 전 확대 상태 (닫을 때 복원)
  var pickGeom = null;            // 해금 단위·챌린지의 화면(SVG) 좌표 다각형 (처음 쓸 때 한 번 계산)

  function reduceMotion(){ return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  // 0 이상 1 미만의 암호학적 난수
  function rnd(){
    var a = new Uint32Array(1);
    window.crypto.getRandomValues(a);
    return a[0] / 4294967296;
  }
  function svgPolysOf(r){
    return displayPolys(r).map(function(poly){
      return poly.map(function(ring){ return ring.map(function(p){ return proj(p[0], p[1]); }); });
    });
  }
  function ringArea(ring){
    var a = 0;
    for (var i=0, j=ring.length-1; i<ring.length; j=i++) a += ring[j][0]*ring[i][1] - ring[i][0]*ring[j][1];
    return Math.abs(a/2);
  }
  function geomOf(r){
    var polys = svgPolysOf(r), b = [Infinity, Infinity, -Infinity, -Infinity], area = 0;
    polys.forEach(function(poly){
      poly[0].forEach(function(p){
        if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1];
        if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1];
      });
      area += ringArea(poly[0]);
      for (var k=1;k<poly.length;k++) area -= ringArea(poly[k]);
    });
    return { r:r, polys:polys, bbox:b, area:Math.max(area, 0) };
  }
  function ensurePickGeom(){
    if (!pickGeom) pickGeom = { units:UNITS.map(geomOf), chals:CHALLENGES.map(geomOf) };
    return pickGeom;
  }
  function geomHit(list, x, y){
    for (var i=0;i<list.length;i++){
      var g = list[i], b = g.bbox;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (pointInPolys([x, y], g.polys)) return g;
    }
    return null;
  }
  // 지금 상태 기준 제외 목록 (Pick 할 때마다 새로 계산)
  function pickExclusions(){
    var ex = {};
    Object.keys(state.unlocks).forEach(function(c){ if (isUnit(c)) ex[c] = "해금"; });
    if (state.home && isUnit(state.home)) ex[state.home] = ex[state.home] ? ex[state.home]+"·홈" : "홈"; // 시·도 단위 옛 홈은 제외하지 않는다
    return ex;
  }
  function pickCandidates(ex){ return ensurePickGeom().units.filter(function(g){ return !ex[g.r.code]; }); }
  // 결과 뽑기: 지도 위 균일한 점 → 육지·후보·챌린지 섬 밖이면 채택. 상한을 넘으면 면적 비례로 단위를 직접 고른다
  function pickTarget(){
    var geom = ensurePickGeom(), ex = pickExclusions(), cands = pickCandidates(ex);
    if (!cands.length) return null;
    var tries = 0;
    for (; tries < PICK_MAX_TRIES; tries++){
      var x = rnd() * MAP_W, y = rnd() * PROJ.h;
      var g = geomHit(geom.units, x, y);
      if (!g || ex[g.r.code]) continue;               // 바다·후보 밖 → 다시
      if (geomHit(geom.chals, x, y)) continue;         // 챌린지 섬 → 다시
      return { unit:g.r, x:x, y:y, tries:tries+1, fallback:false };
    }
    // 대체 경로: 남은 후보 단위를 면적 비례로 고르고 그 안의 점을 뽑는다
    var total = cands.reduce(function(s, g){ return s + g.area; }, 0), t = rnd() * total, pickG = cands[cands.length-1];
    for (var i=0;i<cands.length;i++){ t -= cands[i].area; if (t <= 0){ pickG = cands[i]; break; } }
    var b = pickG.bbox;
    for (var k=0;k<300;k++){
      var px = b[0] + rnd()*(b[2]-b[0]), py = b[1] + rnd()*(b[3]-b[1]);
      if (pointInPolys([px, py], pickG.polys) && !geomHit(geom.chals, px, py)) return { unit:pickG.r, x:px, y:py, tries:tries, fallback:true };
    }
    var lp = displayPoint(pickG.r, pickG.r.lp[0], pickG.r.lp[1]), xy = proj(lp[0], lp[1]);
    return { unit:pickG.r, x:xy[0], y:xy[1], tries:tries, fallback:true };
  }

  /* --- 화면 좌표 --- */
  function stagePx(){ return (svg.getBoundingClientRect().width || MAP_W) / MAP_W; }  // 화면 px / SVG 단위
  function toStage(e){ var r = pickStage.getBoundingClientRect(); return { x:e.clientX - r.left, y:e.clientY - r.top }; }
  // 마커펜: 촉이 원점, +x 방향을 가리킨다 (단위: 화면 px)
  var PEN_SVG =
    '<path class="pen-ink" d="M0 0 L-12 -4.5 L-12 4.5 Z"/>'+
    '<rect class="pen-body" x="-50" y="-6.5" width="38" height="13" rx="2"/>'+
    '<rect class="pen-ink" x="-20" y="-6.5" width="5" height="13"/>'+
    '<rect class="pen-ink" x="-62" y="-7.5" width="13" height="15" rx="3"/>';
  function setOverlaySize(){
    var r = pickStage.getBoundingClientRect();
    pickOverlay.setAttribute("viewBox", "0 0 "+r.width.toFixed(1)+" "+r.height.toFixed(1));
  }
  function drawPull(anchor, tip, ang, shake){
    var dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    var tail = { x: tip.x - dx*56, y: tip.y - dy*56 };
    var f1 = { x: anchor.x + nx*18, y: anchor.y + ny*18 }, f2 = { x: anchor.x - nx*18, y: anchor.y - ny*18 };
    pickOverlay.innerHTML =
      '<line class="pen-band" x1="'+f1.x+'" y1="'+f1.y+'" x2="'+tail.x+'" y2="'+tail.y+'"/>'+
      '<line class="pen-band" x1="'+f2.x+'" y1="'+f2.y+'" x2="'+tail.x+'" y2="'+tail.y+'"/>'+
      '<circle class="pen-fork" cx="'+f1.x+'" cy="'+f1.y+'" r="3.5"/><circle class="pen-fork" cx="'+f2.x+'" cy="'+f2.y+'" r="3.5"/>'+
      '<g transform="translate('+(tip.x+shake.x).toFixed(1)+' '+(tip.y+shake.y).toFixed(1)+') rotate('+(ang*180/Math.PI).toFixed(1)+')">'+PEN_SVG+'</g>';
  }
  function drawPenAt(p, angDeg, opacity){
    pickOverlay.innerHTML = '<g transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+') rotate('+angDeg.toFixed(1)+')" opacity="'+(opacity == null ? 1 : opacity)+'">'+PEN_SVG+'</g>';
  }

  /* --- 모드 시작·취소 --- */
  function setPickUi(on){
    pickBtn.setAttribute("aria-pressed", on ? "true" : "false");
    pickBtn.querySelector(".pick-txt").textContent = on ? "취소" : "랜덤Pick";
    pickStage.classList.toggle("picking", on);
    pickHint.hidden = !(on && pickMode === "aim");
  }
  function startPick(){
    if (document.getElementById("mapCard").hidden){ toast("먼저 내 위치로 여행을 시작해주세요", "📍"); return; }
    if (currentTab !== "map") switchTab("map");
    if (scrimEl) closeSheet();
    if (!pickCandidates(pickExclusions()).length){ toast("모든 지역을 정복했어요! 더 이상 뽑을 곳이 없어요", "🎉"); return; }
    pickPrevZoom = zoomCode;
    if (zoomCode){ zoomCode = null; applyZoom(!reduceMotion()); }  // 전국 지도에 던진다
    pickMode = "aim";
    setPickUi(true);
    document.getElementById("mapCard").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block:"center" });
  }
  // 조준·당기는 중 취소 (결과가 나온 뒤에는 closePick)
  function cancelPick(){
    if (pick && pick.raf) cancelAnimationFrame(pick.raf);
    pick = null; pickMode = null;
    pickOverlay.innerHTML = "";
    setPickUi(false);
    if (pickPrevZoom){ zoomCode = pickPrevZoom; pickPrevZoom = null; applyZoom(!reduceMotion()); }
  }
  pickBtn.addEventListener("click", function(){
    if (!pickMode) startPick();
    else if (pickMode === "aim" || pickMode === "pull") cancelPick();
    else if (pickMode === "result") closePick();
    // "fly" 중에는 무시 (연출이 끝나면 결과 바에서 닫는다)
  });

  /* --- 길게 누르기 → 당기기 --- */
  pickStage.addEventListener("contextmenu", function(e){ if (pickMode) e.preventDefault(); });
  pickStage.addEventListener("pointerdown", function(e){
    if (pickMode !== "aim" || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    try{ pickStage.setPointerCapture(e.pointerId); }catch(err){}
    setOverlaySize();
    var target = pickTarget();            // 결과는 누른 순간 미리 뽑는다 (누른 위치·세기와 무관)
    if (!target){ cancelPick(); toast("모든 지역을 정복했어요! 더 이상 뽑을 곳이 없어요", "🎉"); return; }
    var px = stagePx(), anchor = toStage(e);
    var tgt = { x: target.x*px, y: target.y*px };   // 전국 지도(확대 없음) 기준 화면 위치
    var ang = Math.atan2(tgt.y - anchor.y, tgt.x - anchor.x);
    if (Math.abs(tgt.x-anchor.x) + Math.abs(tgt.y-anchor.y) < 30) ang = -Math.PI/2; // 거의 같은 자리면 위쪽을 겨눈다
    pick = { pointerId:e.pointerId, anchor:anchor, target:target, tgt:tgt, ang:ang, t0:performance.now(), strength:0, raf:0 };
    pickMode = "pull";
    pickHint.hidden = true;
    var loop = function(now){
      if (!pick || pickMode !== "pull") return;
      var k = Math.min((now - pick.t0) / PICK_PULL_MS, 1);
      pick.strength = k;
      var pull = PICK_MAX_PULL_PX * (1 - Math.pow(1-k, 2));  // 처음엔 빠르게, 끝으로 갈수록 천천히
      var tip = { x: pick.anchor.x - Math.cos(pick.ang)*pull, y: pick.anchor.y - Math.sin(pick.ang)*pull };
      var shake = (k >= 1 && !reduceMotion()) ? { x: Math.sin(now/22)*1.6, y: Math.cos(now/17)*1.6 } : { x:0, y:0 }; // 최대로 당기면 떨림
      pick.tip = tip;
      drawPull(pick.anchor, tip, pick.ang, shake);
      pick.raf = requestAnimationFrame(loop);
    };
    pick.raf = requestAnimationFrame(loop);
  });
  pickStage.addEventListener("pointercancel", function(e){
    if (pickMode === "pull" && pick && e.pointerId === pick.pointerId){
      cancelAnimationFrame(pick.raf); pick = null; pickMode = "aim"; pickOverlay.innerHTML = ""; setPickUi(true);
    }
  });
  pickStage.addEventListener("pointerup", function(e){
    if (pickMode !== "pull" || !pick || e.pointerId !== pick.pointerId) return;
    e.preventDefault();
    cancelAnimationFrame(pick.raf);
    if (performance.now() - pick.t0 < PICK_MIN_HOLD_MS){   // 너무 짧게 눌렀다 → 던지지 않음
      pick = null; pickMode = "aim"; pickOverlay.innerHTML = ""; setPickUi(true);
      return;
    }
    launchPen();
  });

  /* --- 놓기 → 회전하며 포물선 비행 → 꽂힘 --- */
  function easeInOut(t){ return t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2; }
  var PEN_LAND_DEG = 118;   // 꽂혔을 때 펜 각도 (촉이 아래 왼쪽을 향함)
  function launchPen(){
    pickMode = "fly";
    var p = pick, from = p.tip || p.anchor, to = p.tgt, k = p.strength;
    if (reduceMotion()){ // 동작 줄이기: 날아가지 않고 꽂힌 자리에서 짧게 나타난다
      var t0r = performance.now();
      var fade = function(now){
        var t = Math.min((now - t0r)/250, 1);
        drawPenAt(to, PEN_LAND_DEG, t);
        if (t < 1) p.raf = requestAnimationFrame(fade); else landPen();
      };
      p.raf = requestAnimationFrame(fade);
      return;
    }
    var dur = 1300 - 600*k;                               // 세게 당길수록 빠르게
    var dist = Math.sqrt((to.x-from.x)*(to.x-from.x) + (to.y-from.y)*(to.y-from.y));
    var lift = 50 + 90*k + dist*0.25;                     // 세게 당길수록 높게
    var ctrl = { x:(from.x+to.x)/2, y:Math.min(from.y, to.y) - lift };
    var a0 = p.ang*180/Math.PI, spins = 360 * (1 + Math.round(k*2));
    var aEnd = PEN_LAND_DEG + spins;
    var t0 = performance.now();
    var step = function(now){
      var t = Math.min((now - t0)/dur, 1), e2 = easeInOut(t), u = 1 - e2;
      var pos = { x: u*u*from.x + 2*u*e2*ctrl.x + e2*e2*to.x, y: u*u*from.y + 2*u*e2*ctrl.y + e2*e2*to.y };
      drawPenAt(pos, a0 + (aEnd - a0)*e2, 1);
      if (t < 1) p.raf = requestAnimationFrame(step); else landPen();
    };
    p.raf = requestAnimationFrame(step);
  }

  /* --- 꽂힌 자리에 손으로 그린 듯한 원 → 지역으로 확대 → 오늘의 Pick 바 --- */
  function handCirclePath(r){
    var pts = [], ph1 = rnd()*6.28, ph2 = rnd()*6.28, start = -2.2 + rnd()*0.6, sweep = Math.PI*2 + 0.45;
    for (var i=0;i<=48;i++){
      var th = start + sweep*i/48;
      var rr = r * (1 + 0.07*Math.sin(3*th + ph1) + 0.035*Math.sin(5*th + ph2)) * (1 + 0.06*i/48); // 끝이 살짝 바깥으로 겹치게
      pts.push((Math.cos(th)*rr).toFixed(2)+" "+(Math.sin(th)*rr*0.9).toFixed(2));
    }
    return "M"+pts.join(" L");
  }
  function markTransform(x, y, s){ return "translate("+x.toFixed(2)+" "+y.toFixed(2)+") scale("+(1/(stagePx()*s)).toFixed(5)+")"; }
  function landPen(){
    var p = pick, view = svg.querySelector("#mapView");
    pickOverlay.innerHTML = "";
    // 이후 연출은 지도 안(확대와 함께 움직임)에 둔다. scale 은 늘 화면 px 기준이 되도록 확대 배율로 나눈다
    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", "pickMark");
    g.setAttribute("class", "pick-mark");
    g.setAttribute("transform", markTransform(p.target.x, p.target.y, 1));
    g.innerHTML = '<path class="pick-circle" d="'+handCirclePath(24)+'"/><g transform="rotate('+PEN_LAND_DEG+')">'+PEN_SVG+'</g>';
    view.appendChild(g);
    var circle = g.querySelector(".pick-circle"), len = circle.getTotalLength ? circle.getTotalLength() : 200;
    circle.style.strokeDasharray = len.toFixed(1);
    circle.style.strokeDashoffset = len.toFixed(1);
    var dur = reduceMotion() ? 300 : 650, t0 = performance.now();
    var draw = function(now){
      var t = Math.min((now - t0)/dur, 1);
      circle.style.strokeDashoffset = (len*(1 - easeInOut(t))).toFixed(1);
      if (t < 1) p.raf = requestAnimationFrame(draw); else zoomToPick();
    };
    p.raf = requestAnimationFrame(draw);
  }
  function pickViewFor(unit){
    var parent = unit.parent && REG[unit.parent].children ? unit.parent : null;
    var bb = projBBox(displayBBox(unit));
    var s = Math.min(MAP_W/bb.w, PROJ.h/bb.h) * 0.7;
    s = Math.max(1, Math.min(s, 14));                      // 너무 작은 지역은 과하게 확대하지 않는다
    var cx = bb.x + bb.w/2, cy = bb.y + bb.h/2;
    return { parent:parent, s:s, tx: MAP_W/2 - cx*s, ty: PROJ.h/2 - cy*s };
  }
  function currentView(){
    var m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(svg.querySelector("#mapView").style.transform || "");
    return m ? { tx:+m[1], ty:+m[2], s:+m[3] } : { tx:0, ty:0, s:1 };
  }
  // 지도 이동을 프레임마다 직접 계산한다 (마커·원이 화면 크기를 유지하도록 같이 갱신)
  function animateView(to, dur, done){
    var view = svg.querySelector("#mapView"), from = currentView(), t0 = performance.now(), mark = document.getElementById("pickMark");
    view.style.transition = "none";
    var step = function(now){
      var t = dur ? Math.min((now - t0)/dur, 1) : 1, e2 = easeInOut(t);
      var s = from.s + (to.s - from.s)*e2, tx = from.tx + (to.tx - from.tx)*e2, ty = from.ty + (to.ty - from.ty)*e2;
      view.style.transform = "translate("+tx.toFixed(1)+"px,"+ty.toFixed(1)+"px) scale("+s.toFixed(4)+")";
      if (mark && pick) mark.setAttribute("transform", markTransform(pick.target.x, pick.target.y, s));
      if (t < 1) { if (pick) pick.raf = requestAnimationFrame(step); else requestAnimationFrame(step); }
      else if (done) done();
    };
    requestAnimationFrame(step);
  }
  function setPickTarget(code){
    Array.prototype.forEach.call(svg.querySelectorAll(".pick-target"), function(p){ p.classList.remove("pick-target"); });
    if (!code) return;
    var path = svg.querySelector('.region-path[data-code="'+code+'"]');
    if (path){ path.classList.add("pick-target"); if (path.nextSibling) path.parentNode.appendChild(path); }
  }
  function zoomToPick(){
    var p = pick, v = pickViewFor(p.target.unit);
    setZoomClasses(v.parent);                              // 하위 지역이 있는 시·도면 그 시·도를 또렷하게
    setPickTarget(p.target.unit.code);
    animateView(v, reduceMotion() ? 0 : 900, function(){
      zoomScale = v.s;
      placeLabels(v.tx, v.ty, v.s, v.parent);
      pickMode = "result";
      document.getElementById("pickName").textContent = fullName(p.target.unit);
      document.getElementById("pickBar").hidden = false;
    });
  }
  // 닫기: 확대를 풀고 마커·원을 지운 뒤 Pick 전 화면으로
  function closePick(){
    if (pickMode !== "result") return;
    document.getElementById("pickBar").hidden = true;
    var mark = document.getElementById("pickMark");
    if (mark) mark.remove();
    setPickTarget(null);
    pickMode = "closing";
    var back = { tx:0, ty:0, s:1 };
    if (pickPrevZoom){
      var bb = projBBox(zoomBBox(REG[pickPrevZoom])), s = Math.min(MAP_W/bb.w, PROJ.h/bb.h) * 0.92;
      back = { s:s, tx:(MAP_W - bb.w*s)/2 - bb.x*s, ty:(PROJ.h - bb.h*s)/2 - bb.y*s };
    }
    animateView(back, reduceMotion() ? 0 : 600, function(){
      pick = null; pickMode = null;
      zoomCode = pickPrevZoom; pickPrevZoom = null;
      setPickUi(false);
      applyZoom(false);                                    // 라벨·강조·상단 바를 원래 상태로
    });
  }
  document.getElementById("pickClose").addEventListener("click", closePick);
  // 다른 탭으로 가면 Pick 을 바로 정리한다
  function abortPick(){
    if (!pickMode) return;
    if (pick && pick.raf) cancelAnimationFrame(pick.raf);
    var mark = document.getElementById("pickMark"); if (mark) mark.remove();
    document.getElementById("pickBar").hidden = true;
    pickOverlay.innerHTML = "";
    setPickTarget(null);
    pick = null; pickMode = null;
    zoomCode = pickPrevZoom; pickPrevZoom = null;
    setPickUi(false);
    applyZoom(false);
  }

  // 점검용 (dev): n번 뽑아서 제외 지역이 나오지 않는지, 면적 비례인지, isPointInFill 과 판정이 같은지 본다
  function pickSample(n){
    var ex = pickExclusions(), cands = pickCandidates(ex), counts = {}, bad = [], fallback = 0, mismatch = 0, checked = 0;
    for (var i=0;i<n;i++){
      var r = pickTarget();
      if (!r) return { error:"후보 없음" };
      counts[r.unit.code] = (counts[r.unit.code] || 0) + 1;
      if (ex[r.unit.code] || geomHit(ensurePickGeom().chals, r.x, r.y)) bad.push(r.unit.code);
      if (r.fallback) fallback++;
      var path = svg.querySelector('.region-path[data-code="'+r.unit.code+'"]');
      if (path && path.isPointInFill && checked < 300){
        checked++;
        var pt = svg.createSVGPoint ? svg.createSVGPoint() : new DOMPoint();
        pt.x = r.x; pt.y = r.y;
        if (!path.isPointInFill(pt)) mismatch++;
      }
    }
    var totalArea = cands.reduce(function(s, g){ return s + g.area; }, 0);
    var top = Object.keys(counts).sort(function(a, b){ return counts[b] - counts[a]; }).slice(0, 5).map(function(c){
      var g = cands.filter(function(x){ return x.r.code === c; })[0];
      return fullName(REG[c])+" "+counts[c]+"회 (기대 "+(n*g.area/totalArea).toFixed(1)+")";
    });
    return { n:n, candidates:cands.length, excluded:Object.keys(ex).map(function(c){ return fullName(REG[c])+"("+ex[c]+")"; }),
             excludedHits:bad.length, fallbackUsed:fallback, isPointInFillMismatch:mismatch+"/"+checked, top5:top };
  }

