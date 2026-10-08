  /* ---------------- 도감 ---------------- */
  // 시·도별로 해금 단위를 모아 보여준다. 지도에서 누르기 힘든 작은 지역도 여기서 고른다.
  function fmtDate(ms){
    if (ms == null) return null;
    var d = new Date(ms);
    return d.getFullYear()+". "+(d.getMonth()+1)+". "+d.getDate()+".";
  }
  function unlockDateText(u){
    if (!u) return "";
    var d = fmtDate(u.at);
    return (d ? d+" 해금" : "이전 버전에서 해금 (날짜 기록 없음)") + (u.test ? " · 🧪 테스트" : "");
  }
  function dexRowHtml(r){
    var st = unitStatus(r.code), u = state.unlocks[r.code];
    return '<button class="dex-row'+(u ? ' done' : '')+'" data-code="'+r.code+'">'+
      '<span class="dex-name">'+escapeHtml(r.name)+'</span>'+
      '<span class="dex-meta">'+(u ? escapeHtml(unlockDateText(u)) : '아직 방문 전')+'</span>'+
      '<span class="region-tag '+st.cls+'">'+st.text+'</span>'+
    '</button>';
  }
  var dexOpen = {};       // 펼쳐 둔 시·도 (화면을 다시 그려도 유지)
  var dexInitDone = false;
  function renderDex(){
    var q = document.getElementById("dexSearch").value.trim();
    if (!dexInitDone){ var hs = homeSidoCode(); if (hs) dexOpen[hs] = true; dexInitDone = true; }
    var n = unlockedUnitCount();
    document.getElementById("dexSummary").textContent = n+" / "+TOTAL_UNITS+" 해금";
    var html = SIDO.map(function(s){
      var units = s.children ? s.children.slice().sort(function(a, b){ return a.name.localeCompare(b.name, "ko"); }) : [s];
      var shown = q ? units.filter(function(r){ return r.name.indexOf(q) >= 0 || s.name.indexOf(q) >= 0; }) : units;
      if (!shown.length) return "";
      var pr = sidoProgress(s);
      var open = q ? true : !!dexOpen[s.code];
      return '<details class="dex-sido"'+(open ? ' open' : '')+' data-sido="'+s.code+'">'+
        '<summary><span class="dex-sido-name">'+escapeHtml(s.name)+'</span>'+
          '<span class="dex-bar"><i style="width:'+Math.round(pr.n/pr.total*100)+'%"></i></span>'+
          '<span class="mono dex-count">'+pr.n+'/'+pr.total+'</span></summary>'+
        '<div class="dex-rows">'+shown.map(dexRowHtml).join("")+'</div>'+
      '</details>';
    }).join("");
    document.getElementById("dexList").innerHTML = html || '<p class="empty-note">"'+escapeHtml(q)+'"(으)로 찾은 지역이 없어요.</p>';
  }
  document.getElementById("dexSearch").addEventListener("input", renderDex);
  document.getElementById("dexList").addEventListener("click", function(e){
    var b = e.target.closest(".dex-row");
    if (b) openRegion(b.getAttribute("data-code"));
  });
  document.getElementById("dexList").addEventListener("toggle", function(e){
    var d = e.target;
    if (d.classList && d.classList.contains("dex-sido") && !document.getElementById("dexSearch").value.trim()){
      dexOpen[d.getAttribute("data-sido")] = d.open;
    }
  }, true);

  /* ---------------- 챌린지 ---------------- */
  function renderChallenges(){
    var done = CHALLENGES.filter(function(c){ return isUnlocked(c.code); }).length;
    document.getElementById("chalSummary").textContent = done+" / "+CHALLENGES.length+" 성공";
    document.getElementById("chalList").innerHTML = CHALLENGES.map(function(c){
      var u = state.unlocks[c.code];
      return '<div class="chal-card'+(u ? ' done' : '')+'">'+
        '<div class="chal-top"><span class="chal-star">'+(u ? '🏆' : '⭐')+'</span>'+
          '<div class="chal-title"><h3>'+escapeHtml(c.name)+'</h3><span class="coord">'+escapeHtml(REG[c.parent].name)+'</span></div>'+
          (u ? '<span class="region-tag '+(u.test ? 'tag-test' : 'tag-unlocked')+'">'+(u.test ? '🧪 테스트 성공' : '✅ 성공')+'</span>' : '')+
        '</div>'+
        '<p class="chal-desc">'+escapeHtml(c.desc)+'</p>'+
        (u ? '<p class="chal-date">'+escapeHtml(unlockDateText(u))+'</p>' : '')+
        '<button class="btn '+(u ? 'btn-secondary' : 'btn-primary')+'" data-code="'+c.code+'">'+(u ? '기록 보기' : '도전하기')+'</button>'+
      '</div>';
    }).join("");
  }
  document.getElementById("chalList").addEventListener("click", function(e){
    var b = e.target.closest("button[data-code]");
    if (b) openRegion(b.getAttribute("data-code"));
  });

  // 해금 등으로 상태가 바뀌면 지금 보고 있는 도감·챌린지 화면도 다시 그린다
  function refreshSideViews(){
    if (currentTab === "dex") renderDex();
    else if (currentTab === "chal") renderChallenges();
  }

  /* ---------------- 해금 도장 연출 (2초 이내) ---------------- */
  // kind: "unlock" | "home" | "test" | "challenge"
  function showStamp(name, kind){
    var LABEL = { unlock:"해금", home:"여행 시작", test:"TEST", challenge:"챌린지 성공" };
    var old = document.querySelector(".stamp-wrap");
    if (old) old.remove();
    var wrap = document.createElement("div");
    wrap.className = "stamp-wrap stamp-"+(kind || "unlock");
    wrap.setAttribute("role", "status");
    wrap.innerHTML =
      '<div class="stamp">'+
        '<span class="stamp-top">'+(kind === "challenge" ? "★ KOREA ★" : "KOREA TRAVELER")+'</span>'+
        '<span class="stamp-name"></span>'+
        '<span class="stamp-label">'+LABEL[kind || "unlock"]+'</span>'+
        '<span class="stamp-date">'+fmtDate(Date.now())+'</span>'+
      '</div>';
    wrap.querySelector(".stamp-name").textContent = name;
    document.body.appendChild(wrap);
    setTimeout(function(){ wrap.remove(); }, 1900);
  }

