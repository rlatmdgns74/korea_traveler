  /* ---------------- tabs ---------------- */
  var currentTab = "map";
  function switchTab(tab){
    if (tab === currentTab) return;
    if (scrimEl) closeSheet();
    currentTab = tab;
    document.getElementById("viewMap").hidden = tab !== "map";
    document.getElementById("viewSettings").hidden = tab !== "settings";
    Array.prototype.forEach.call(document.querySelectorAll(".tabbar [role=tab]"), function(b){
      b.setAttribute("aria-selected", b.getAttribute("data-tab") === tab ? "true" : "false");
    });
    window.scrollTo(0, 0);
    if (tab === "settings") renderSettings();
    // 지도가 숨겨진 동안 그려졌다면 라벨·배지 크기 계산을 다시 한다
    else if (!document.getElementById("mapCard").hidden) applyZoom(false);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".tabbar [role=tab]"), function(b){
    b.addEventListener("click", function(){ switchTab(b.getAttribute("data-tab")); });
  });

  function sheetHead(title, sub){
    return '<div class="sheet-head"><div><h2>'+title+'</h2>'+(sub ? '<div class="coord">'+sub+'</div>' : '')+
      '</div><button class="close-x" id="closeBtn">✕</button></div>';
  }

  /* ---------------- settings: 위치 권한 ---------------- */
  var PERM_LABEL = { granted:"허용됨", denied:"거부됨", prompt:"아직 묻지 않음", "prompt-with-rationale":"아직 묻지 않음" };
  function capGeoPlugin(){ return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation; }
  function checkLocationPermission(){
    var capGeo = capGeoPlugin();
    if (IS_NATIVE && capGeo && capGeo.checkPermissions){
      return capGeo.checkPermissions().then(function(s){ return s.location || s.coarseLocation || "unknown"; }, function(){ return "unknown"; });
    }
    if (navigator.permissions && navigator.permissions.query){
      return navigator.permissions.query({name:"geolocation"}).then(function(s){ return s.state; }, function(){ return "unknown"; });
    }
    return Promise.resolve("unknown");
  }
  var DENIED_HELP = IS_NATIVE
    ? "권한 창이 다시 뜨지 않으면 휴대폰 설정 › 애플리케이션 › 코리아 트래블러 › 권한 › 위치에서 '앱 사용 중에만 허용'을 선택해주세요."
    : "브라우저 주소창 왼쪽의 사이트 설정에서 위치 권한을 허용해주세요.";
  function renderPermission(note){
    checkLocationPermission().then(function(st){
      var el = document.getElementById("permState");
      el.textContent = PERM_LABEL[st] || "확인할 수 없음";
      el.className = st === "granted" ? "perm-granted" : (st === "denied" ? "perm-denied" : "");
      document.getElementById("permNote").textContent = note || (st === "denied" ? DENIED_HELP : "");
    });
  }
  document.getElementById("btnPermRequest").addEventListener("click", function(){
    var capGeo = capGeoPlugin();
    if (IS_NATIVE && capGeo && capGeo.requestPermissions){
      capGeo.requestPermissions({ permissions:["location"] }).then(function(s){
        renderPermission(s.location === "granted" ? "위치 권한이 허용됐어요." : (s.location === "denied" ? DENIED_HELP : ""));
      }, function(){
        renderPermission("권한을 요청하지 못했어요. 휴대폰의 위치 서비스(GPS)가 켜져 있는지 확인해주세요.");
      });
      return;
    }
    // 브라우저: 위치를 한 번 요청하면 권한 창이 뜬다
    if (!("geolocation" in navigator)){ renderPermission("이 브라우저는 위치 기능을 지원하지 않아요."); return; }
    navigator.geolocation.getCurrentPosition(
      function(){ renderPermission("위치 권한이 허용됐어요."); },
      function(){ renderPermission(); },
      { enableHighAccuracy:false, timeout:8000, maximumAge:0 }
    );
  });

  /* ---------------- settings: 화면 테마 ---------------- */
  function loadPrefs(){ try{ return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}; }catch(e){ return {}; } }
  function savePrefs(p){ try{ localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }catch(e){} }
  function applyTheme(t){
    var root = document.documentElement;
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
    else root.removeAttribute("data-theme");
  }
  function renderThemeSeg(){
    var t = loadPrefs().theme || "system";
    Array.prototype.forEach.call(document.querySelectorAll("#themeSeg [data-theme-opt]"), function(b){
      b.setAttribute("aria-checked", b.getAttribute("data-theme-opt") === t ? "true" : "false");
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll("#themeSeg [data-theme-opt]"), function(b){
    b.addEventListener("click", function(){
      var t = b.getAttribute("data-theme-opt");
      var p = loadPrefs(); p.theme = t; savePrefs(p);
      applyTheme(t);
      renderThemeSeg();
    });
  });

  /* ---------------- settings: 백업 / 복원 / 초기화 ---------------- */
  function fmtBytes(n){ return n < 1024 ? n+"B" : (n < 1048576 ? (n/1024).toFixed(1)+"KB" : (n/1048576).toFixed(2)+"MB"); }
  function byteLen(s){ try{ return new Blob([s]).size; }catch(e){ return s.length; } }
  function fileStamp(){
    var d = new Date();
    function p(n){ return (n<10?"0":"")+n; }
    return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes());
  }
  function backupJson(){
    return JSON.stringify({ app:"koreatraveler", kind:"backup", format:1, appVersion:APP_VERSION,
                            exportedAt:new Date().toISOString(), state:state });
  }
  function stateSummary(s){
    var m = { unlocked:0, test:0, posts:0, builds:0 };
    Object.keys(s.unlocks || {}).forEach(function(k){ m.unlocked++; if (s.unlocks[k] && s.unlocks[k].test) m.test++; });
    Object.keys(s.posts || {}).forEach(function(k){ m.posts += (s.posts[k] || []).filter(function(p){ return p && !p.seed; }).length; });
    Object.keys(s.buildings || {}).forEach(function(k){ m.builds += placedCount(s.buildings[k]); });
    return "해금 "+m.unlocked+"곳"+(m.test ? " (🧪 테스트 "+m.test+")" : "")+" · 포스트 "+m.posts+"개 · 건물 "+m.builds+"개";
  }
  function copyText(text, fallbackEl){
    var p = (navigator.clipboard && navigator.clipboard.writeText) ? navigator.clipboard.writeText(text) : Promise.reject();
    return p.catch(function(){
      if (fallbackEl){ fallbackEl.focus(); fallbackEl.select(); if (document.execCommand && document.execCommand("copy")) return; }
      throw new Error("copy failed");
    });
  }
  // 덮어쓰기 직전 상태를 한 단계 보관한다. 저장 공간이 없으면 false — 이때는 덮어쓰지 않는다.
  function keepPrev(){
    try{ localStorage.setItem(STATE_KEY_PREV, JSON.stringify({ savedAt:new Date().toISOString(), state:state })); return true; }
    catch(e){ return false; }
  }
  var NO_SPACE_FOR_PREV = "저장 공간이 부족해 지금 기록을 보관할 수 없어요. 먼저 백업을 내보낸 뒤 다시 시도해주세요.";

  function renderExportSheet(){
    var json = backupJson();
    var html =
      sheetHead("백업 내보내기", stateSummary(state)+" · "+fmtBytes(byteLen(json)))+
      '<p class="set-note">백업에는 해금한 위치 좌표와 사진이 들어 있어요. 다른 사람에게 보낼 때 주의해주세요.</p>'+
      (IS_NATIVE
        ? '<p class="set-note">앱에서는 파일로 바로 저장할 수 없어요. 아래 내용을 복사해서 메모 앱이나 메신저의 \'나와의 채팅\'에 붙여 넣어 보관하세요.</p>'
        : '<button class="btn btn-primary" id="btnSaveFile">📁 JSON 파일로 저장</button>')+
      '<button class="btn btn-secondary" id="btnCopyBackup">📋 클립보드에 복사</button>'+
      '<textarea class="json-box" id="backupText" readonly></textarea>';
    openSheet(html);
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
    var ta = document.getElementById("backupText");
    ta.value = json;
    var saveBtn = document.getElementById("btnSaveFile");
    if (saveBtn) saveBtn.addEventListener("click", function(){
      var url = URL.createObjectURL(new Blob([json], { type:"application/json" }));
      var a = document.createElement("a");
      a.href = url; a.download = "kr-traveler-backup-"+fileStamp()+".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
      toast("백업 파일을 저장했어요", "📁");
    });
    document.getElementById("btnCopyBackup").addEventListener("click", function(){
      copyText(json, ta).then(function(){ toast("백업을 클립보드에 복사했어요", "📋"); },
                              function(){ toast("복사하지 못했어요. 텍스트를 길게 눌러 직접 복사해주세요", "⚠️"); });
    });
  }

  function parseBackup(text){
    var obj = JSON.parse(text);
    if (!obj || typeof obj !== "object") throw new Error("format");
    var s = (obj.kind === "backup" && obj.state) ? obj.state : obj;
    if (s.version === 2 && s.unlocks && typeof s.unlocks === "object") return normalizeState(s);
    if (Array.isArray(s.unlocked)) return normalizeState(migrateV1(s)); // v1 백업도 받아서 이전
    throw new Error("format");
  }

  function renderImportSheet(){
    var html =
      sheetHead("백업 복원", "지금 기록: "+stateSummary(state))+
      '<p class="set-note">JSON 파일을 고르거나 백업 내용을 붙여 넣어주세요. 복원하면 지금 기록을 덮어써요. 덮어쓰기 직전 상태는 한 단계 보관돼요.</p>'+
      '<div class="file-row"><label for="importFile">📁 파일 선택</label><input type="file" id="importFile" accept="application/json,.json,text/plain"></div>'+
      '<textarea class="json-box" id="importText" placeholder="여기에 백업 내용을 붙여 넣기..."></textarea>'+
      '<button class="btn btn-secondary" id="btnImportCheck">🔍 내용 확인</button>'+
      '<p class="status-line" id="importStatus"></p>'+
      '<div id="importConfirm"></div>';
    openSheet(html);
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
    var ta = document.getElementById("importText");
    var statusEl = document.getElementById("importStatus");
    var confirmEl = document.getElementById("importConfirm");
    function check(){
      confirmEl.innerHTML = "";
      var parsed;
      try{ parsed = parseBackup(ta.value.trim()); }
      catch(e){ statusEl.textContent = "코리아 트래블러 백업 형식이 아니에요. 내용을 다시 확인해주세요."; return; }
      statusEl.textContent = "";
      confirmEl.innerHTML =
        '<div class="summary-box">복원할 백업: <b>'+escapeHtml(stateSummary(parsed))+'</b><br>지금 기록: '+escapeHtml(stateSummary(state))+'</div>'+
        '<button class="btn btn-primary" id="btnImportApply" style="margin-top:10px; width:100%;">덮어쓰고 복원</button>';
      document.getElementById("btnImportApply").addEventListener("click", function(){
        if (!keepPrev()){ toast(NO_SPACE_FOR_PREV, "⚠️"); return; }
        state = parsed;
        if (saveState()) location.reload();
      });
    }
    document.getElementById("btnImportCheck").addEventListener("click", check);
    document.getElementById("importFile").addEventListener("change", function(e){
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function(ev){ ta.value = String(ev.target.result || ""); check(); };
      reader.onerror = function(){ statusEl.textContent = "파일을 읽지 못했어요."; };
      reader.readAsText(f);
    });
  }

  var RESET_WORD = "초기화";
  // wipeAll=false: 사용자 기록 초기화 (빈 v2 를 저장해 v1 백업이 다시 이전되지 않게 한다)
  // wipeAll=true : 개발자 전체 초기화 (v2·v1·직전 상태·설정 키 모두 삭제 → 새로 설치한 상태)
  function renderResetSheet(wipeAll){
    if (wipeAll && !DEV) return;
    var html =
      sheetHead(wipeAll ? "전체 초기화 (개발자)" : "기록 초기화", "지금 기록: "+stateSummary(state))+
      '<p class="set-note">'+(wipeAll
        ? "v2 기록, v1 백업, 직전 상태, 화면 테마 설정까지 모두 지워서 앱을 새로 설치한 상태로 만들어요. 되돌릴 수 없어요."
        : "해금 기록·포스트·건물이 모두 지워져요. 지우기 직전 상태는 한 단계 보관되지만, 꼭 필요한 기록이면 먼저 백업을 내보내주세요.")+'</p>'+
      '<input class="confirm-input" id="resetInput" placeholder="계속하려면 \''+RESET_WORD+'\'를 입력하세요" autocomplete="off">'+
      '<button class="btn btn-danger" id="btnResetApply" disabled>'+(wipeAll ? "💣 전체 초기화" : "🗑️ 기록 초기화")+'</button>';
    openSheet(html);
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
    var input = document.getElementById("resetInput");
    var applyBtn = document.getElementById("btnResetApply");
    input.addEventListener("input", function(){ applyBtn.disabled = input.value.trim() !== RESET_WORD; });
    applyBtn.addEventListener("click", function(){
      if (input.value.trim() !== RESET_WORD) return;
      if (wipeAll){
        [STATE_KEY, STATE_KEY_V1, STATE_KEY_PREV, PREFS_KEY].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
        location.reload();
        return;
      }
      if (!keepPrev()){ toast(NO_SPACE_FOR_PREV, "⚠️"); return; }
      state = emptyState();
      if (saveState()) location.reload();
    });
  }

  document.getElementById("btnExport").addEventListener("click", renderExportSheet);
  document.getElementById("btnImport").addEventListener("click", renderImportSheet);
  document.getElementById("btnReset").addEventListener("click", function(){ renderResetSheet(false); });

  /* ---------------- settings: 개발자 (dev 빌드에서만) ---------------- */
  function stateForDisplay(){
    return JSON.stringify(state, function(k, v){
      if (k === "photo" && typeof v === "string" && v.length > 200) return "(사진 "+fmtBytes(v.length)+")";
      return v;
    }, 2);
  }
  if (DEV){
    document.getElementById("btnDevUnlockAll").addEventListener("click", function(){
      if (!window.confirm("아직 잠긴 곳을 모두 🧪 테스트 해금할까요?")) return;
      var n = 0;
      UNITS.forEach(function(r){
        if (isUnlocked(r.code)) return;
        state.unlocks[r.code] = { at:Date.now(), lon:r.lp[0], lat:r.lp[1], acc:0, test:true, via:"dev-all" };
        n++;
      });
      if (!saveState()) return;
      if (document.getElementById("mapCard").hidden) showMapView(); else renderMap();
      toast(n+"곳을 테스트 해금했어요", "🧪");
    });
    document.getElementById("btnDevWipe").addEventListener("click", function(){ renderResetSheet(true); });
    document.getElementById("btnDevState").addEventListener("click", function(){
      var keys = [STATE_KEY_V1, STATE_KEY_PREV, PREFS_KEY].map(function(k){
        var has = false; try{ has = localStorage.getItem(k) !== null; }catch(e){}
        return k+": "+(has ? "있음" : "없음");
      }).join(" · ");
      var text = stateForDisplay();
      openSheet(
        sheetHead("저장된 상태", STATE_KEY+" · "+fmtBytes(byteLen(JSON.stringify(state))))+
        '<p class="set-note mono" style="font-size:11px;">'+keys+'</p>'+
        '<button class="btn btn-secondary" id="btnCopyState">📋 복사</button>'+
        '<pre class="json-box" id="stateText"></pre>'
      );
      document.getElementById("closeBtn").addEventListener("click", closeSheet);
      document.getElementById("stateText").textContent = text;
      document.getElementById("btnCopyState").addEventListener("click", function(){
        copyText(text, null).then(function(){ toast("복사했어요", "📋"); }, function(){ toast("복사하지 못했어요", "⚠️"); });
      });
    });
  }

  function renderSettings(){
    renderPermission();
    renderThemeSeg();
    document.getElementById("appVersion").textContent = APP_VERSION+" · "+(DEV ? "dev" : "user")+" · "+(IS_NATIVE ? "앱" : "브라우저");
  }

  /* ---------------- boot ---------------- */
  document.getElementById("unitTotal").textContent = "/"+TOTAL_UNITS;
  document.getElementById("lockedCountText").textContent = String(TOTAL_UNITS-1);
  if (state.home || Object.keys(state.unlocks).length){
    showMapView();
    if (state.migratedFrom === "v1" && !state.migrationNoticed){
      state.migrationNoticed = true;
      saveState();
      toast("지도가 새 행정구역으로 바뀌었어요. 강원은 이제 시·군 단위로 해금해요", "🗺️");
    }
  }

  // 자동 점검용 — dev 빌드에서만 노출
  if (DEV){
    window.__kt = { migrateV1:migrateV1, findRegionForPoint:findRegionForPoint, parseBackup:parseBackup,
                    REG:REG, UNITS:UNITS, state:function(){ return state; },
                    devMode:function(){ return devMode; }, simulatedPoint:function(){ return simulatedPoint; } };
  }
})();
