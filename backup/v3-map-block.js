  // 층 순서: 시·도 바탕 → 시·도 진행도(해금 색, 비율만큼 진하게) → 하위 지역(확대된 시·도만 색칠)
  //          → 시·도 굵은 경계 → 하위 지역 이름
  function buildMap(){
    svg.setAttribute("viewBox", "0 0 "+MAP_W+" "+PROJ.h);
    var sidoParts = [], progParts = [], subParts = [], lineParts = [], labelParts = [];
    SIDO.forEach(function(s){
      var d = pathFor(s.polys);
      sidoParts.push('<path class="region-path sido-path" data-code="'+s.code+'" d="'+d+'"></path>');
      lineParts.push('<path class="sido-line" data-code="'+s.code+'" d="'+d+'"></path>');
      if (s.children){
        progParts.push('<path class="prog-path" data-code="'+s.code+'" d="'+d+'"></path>');
        s.children.forEach(function(c){
          subParts.push('<path class="region-path sub-path" data-code="'+c.code+'" data-parent="'+s.code+'" d="'+pathFor(c.polys)+'"></path>');
          var lp = proj(c.lp[0], c.lp[1]);
          labelParts.push('<text class="sub-label" data-code="'+c.code+'" data-parent="'+s.code+'" x="'+lp[0].toFixed(1)+'" y="'+lp[1].toFixed(1)+'">'+escapeHtml(c.name)+'</text>');
        });
      }
    });
    svg.innerHTML =
      // 테스트 해금 표시용 사선 무늬 (CSS 변수는 style 로만 적용된다)
      '<defs><pattern id="testHatch" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(45)">'+
        '<rect width="9" height="9" style="fill:var(--unlocked)"></rect>'+
        '<rect width="3.5" height="9" style="fill:var(--gold)"></rect>'+
      '</pattern></defs>'+
      '<g id="mapView">'+
        '<g id="layerSido">'+sidoParts.join("")+'</g>'+
        '<g id="layerProg">'+progParts.join("")+'</g>'+
        '<g id="layerSub">'+subParts.join("")+'</g>'+
        '<g id="layerLine">'+lineParts.join("")+'</g>'+
        '<g id="layerLabels">'+labelParts.join("")+'</g>'+
      '</g>';
    Array.prototype.forEach.call(svg.querySelectorAll(".region-path"), function(p){
      p.addEventListener("click", function(){ handleMapTap(p.getAttribute("data-code")); });
    });
    applyZoom(false);
    renderMap();
  }
  // 진행도 → 겹칠 해금 색의 진하기. 하나라도 열었으면 최소 18% 로 보이게 한다.
  function progOpacity(n, total){ return n > 0 ? 0.18 + 0.82*(n/total) : 0; }
  function homeSidoCode(){
    var h = state.home && REG[state.home];
    return h ? (h.parent || h.code) : null;
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
      // 선택 테두리가 이웃 지역에 가려지지 않도록 같은 층의 맨 위로 올린다
      if (code === selectedCode && p.nextSibling) p.parentNode.appendChild(p);
    });
    Array.prototype.forEach.call(svg.querySelectorAll(".prog-path"), function(p){
      var s = REG[p.getAttribute("data-code")];
      p.style.fillOpacity = progOpacity(childUnlockedCount(s), s.children.length).toFixed(3);
    });
    var homeSido = homeSidoCode();
    Array.prototype.forEach.call(svg.querySelectorAll(".sido-line"), function(l){
      l.classList.toggle("home-sido", l.getAttribute("data-code") === homeSido);
    });
    var testN = testUnlockCount();
    document.getElementById("legendTest").hidden = testN === 0;
    var testCountEl = document.getElementById("testCount"); // dev 빌드에만 있음
    if (testCountEl){ testCountEl.hidden = testN === 0; testCountEl.textContent = "🧪"+testN+" "; }
    renderSidoChips();
    renderMapBar();
  }

  /* ---------------- 시·도별 진행도 칩 ---------------- */
  var chipsEl = document.getElementById("sidoChips");
  function sidoProgress(s){
    return s.children ? { n:childUnlockedCount(s), total:s.children.length } : { n:isUnlocked(s.code) ? 1 : 0, total:1 };
  }
  function renderSidoChips(){
    var homeSido = homeSidoCode();
    chipsEl.innerHTML = SIDO.map(function(s){
      var pr = sidoProgress(s);
      var pct = Math.round(pr.n/pr.total*100);
      return '<button class="sido-chip'+(s.code === zoomCode ? ' on' : '')+(s.code === homeSido ? ' home' : '')+'" data-code="'+s.code+'" '+
        'style="--pct:'+pct+'%" aria-label="'+escapeHtml(s.name)+' '+pr.n+'/'+pr.total+' 해금">'+
        '<span class="chip-name">'+(s.code === homeSido ? '🏡 ' : '')+SIDO_SHORT[s.code]+'</span>'+
        '<span class="chip-num mono">'+pr.n+'/'+pr.total+'</span></button>';
    }).join("");
  }
  chipsEl.addEventListener("click", function(e){
    var b = e.target.closest(".sido-chip");
    if (!b) return;
    var code = b.getAttribute("data-code");
    if (REG[code].children){
      if (scrimEl) closeSheet();
      zoomTo(code);
      document.getElementById("mapCard").scrollIntoView({ behavior:"smooth", block:"start" });
    } else {
      openRegion(code); // 세종처럼 하위 지역이 없는 곳은 바로 시트
    }
  });
