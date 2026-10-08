  /* ---------------- zoom (전국 ↔ 시·도) ---------------- */
  var mapBar = document.getElementById("mapBar");
  var LABEL_PX = 12; // 하위 지역 이름 글자 크기 (화면 px)
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
    Array.prototype.forEach.call(svg.querySelectorAll(".sido-path, .prog-path, .sido-line"), function(p){
      p.classList.toggle("zoom-target", p.getAttribute("data-code") === zoomCode);
    });
    Array.prototype.forEach.call(svg.querySelectorAll(".sub-path"), function(p){
      p.classList.toggle("active", !!zoomCode && p.getAttribute("data-parent") === zoomCode);
    });
    placeLabels(tx, ty, s);
    renderSidoChips();
    renderMapBar();
  }
  // 확대된 시·도의 하위 지역 이름만 보이되, 화면에서 겹치는 이름은 면적이 작은 쪽부터 숨긴다
  function placeLabels(tx, ty, s){
    var px = (svg.getBoundingClientRect().width || MAP_W) / MAP_W; // 화면 px / SVG 단위
    var placed = [];
    var labels = Array.prototype.slice.call(svg.querySelectorAll(".sub-label"));
    labels.forEach(function(t){ t.classList.remove("on"); });
    if (!zoomCode) return;
    labels.filter(function(t){ return t.getAttribute("data-parent") === zoomCode; })
      .sort(function(a, b){ return REG[b.getAttribute("data-code")].a - REG[a.getAttribute("data-code")].a; })
      .forEach(function(t){
        var name = REG[t.getAttribute("data-code")].name;
        var cx = (parseFloat(t.getAttribute("x"))*s + tx) * px, cy = (parseFloat(t.getAttribute("y"))*s + ty) * px;
        var w = name.length * LABEL_PX * 0.95 + 4, h = LABEL_PX + 4;
        var box = { x0:cx - w/2, y0:cy - h/2, x1:cx + w/2, y1:cy + h/2 };
        for (var i=0;i<placed.length;i++){
          var q = placed[i];
          if (box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0) return; // 겹침 → 숨김
        }
        placed.push(box);
        t.classList.add("on");
        t.style.fontSize = (LABEL_PX/(px*s)).toFixed(2)+"px";
        t.style.strokeWidth = (3/(px*s)).toFixed(2)+"px";
      });
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
  window.addEventListener("resize", function(){ applyZoom(false); });
  document.getElementById("btnLegacy").addEventListener("click", function(){
    if (zoomCode) renderLegacySheet(REG[zoomCode]);
  });
  document.getElementById("btnSubList").addEventListener("click", function(){
    if (zoomCode) renderSubListSheet(REG[zoomCode]);
  });

  // 작은 하위 지역(과천·구리 등)은 지도에서 누르기 어려워 목록으로도 고를 수 있게 한다
  function unitStatus(code){
    var u = state.unlocks[code];
    if (code === state.home) return { cls:"tag-home", text:"🏡 홈" };
    if (u && u.test) return { cls:"tag-test", text:"🧪 테스트 해금" };
    if (u) return { cls:"tag-unlocked", text:"🔓 해금" };
    return { cls:"tag-locked", text:"🔒 잠김" };
  }
  function renderSubListSheet(sidoR){
    var devTools = DEV && devMode;
    var rows = sidoR.children.slice().sort(function(a, b){ return a.name.localeCompare(b.name, "ko"); }).map(function(c){
      var st = unitStatus(c.code);
      return '<div class="sub-row">'+
        '<button class="sub-row-main" data-open="'+c.code+'"><span>'+escapeHtml(c.name)+'</span>'+
          '<span class="region-tag '+st.cls+'">'+st.text+'</span></button>'+
        (devTools && !isUnlocked(c.code)
          ? '<button class="sub-row-dev" data-move="'+c.code+'" title="여기로 가상 이동">🧭</button>'+
            '<button class="sub-row-dev" data-unlock="'+c.code+'" title="테스트 해금">🧪</button>'
          : '')+
      '</div>';
    }).join("");
    openSheet(
      sheetHead(sidoR.name+" 목록", childUnlockedCount(sidoR)+"/"+sidoR.children.length+" 해금 · 눌러서 지역 정보 보기")+
      '<div class="sub-list" id="subList">'+rows+'</div>'
    );
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
    document.getElementById("subList").addEventListener("click", function(e){
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-open")){ openRegion(b.getAttribute("data-open")); return; }
      if (b.hasAttribute("data-move")){
        var r = moveSimulatedTo(b.getAttribute("data-move"));
        if (r){ syncDevSelects(r.code); toast(fullName(r)+"(으)로 가상 이동했어요", "🧭"); }
        return;
      }
      if (b.hasAttribute("data-unlock")){
        doubleTapUnlock(b.getAttribute("data-unlock"));
        renderSubListSheet(sidoR);
      }
    });
  }
