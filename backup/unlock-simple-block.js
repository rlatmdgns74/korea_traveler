  function renderLockedSheet(r){
    var html =
      '<div class="sheet-head"><div>'+
        '<span class="region-tag tag-locked">🔒 잠김</span>'+
        '<h2 style="margin-top:6px;">'+r.name+'</h2>'+
        '<div class="coord mono">'+escapeHtml(regionSubtitle(r))+'</div>'+
      '</div><button class="close-x" id="closeBtn">✕</button></div>'+
      '<p style="color:var(--ink-soft); font-size:13px; line-height:1.6;">이 지역은 아직 방문하지 않았어요. 실제로 '+escapeHtml(r.name)+'에 가서 위치를 확인하면 바로 '+(r.challenge ? '챌린지 성공이에요.' : '열려요.')+'</p>'+
      (DEV && devMode ? '<button class="btn btn-secondary btn-dev" id="devHereBtn">🧪 여기로 가상 이동</button>' : '')+
      '<button class="btn btn-primary" id="checkHereBtn">🧭 지금 여기 있는지 확인하기</button>'+
      '<p class="status-line" id="lockedStatus"></p>';
    openSheet(html);
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
    var devHereBtn = document.getElementById("devHereBtn");
    if (devHereBtn) devHereBtn.addEventListener("click", function(){
      if (!moveSimulatedTo(r.code)) return;
      syncDevSelects(r.code);
      document.getElementById("lockedStatus").textContent = "가상 위치를 "+fullName(r)+"(으)로 옮겼어요. 이제 위치를 확인해보세요.";
    });
    var checkBtn = document.getElementById("checkHereBtn");
    checkBtn.addEventListener("click", function(){
      var statusEl = document.getElementById("lockedStatus");
      statusEl.textContent = "위치 확인 중...";
      currentPositionAsync().then(function(pos){
        if (!pos){ statusEl.textContent = geoFailMessage(); return; }
        var poor = poorAccuracy(pos);
        if (poor){
          statusEl.textContent = poorAccuracyMessage(poor);
          checkBtn.textContent = "📡 다시 측정하기";
          return;
        }
        var lon = pos.coords.longitude, lat = pos.coords.latitude;
        var hereUnit = findRegionForPoint(lon, lat), hereChal = findChallengeForPoint(lon, lat);
        var here = r.challenge ? hereChal : hereUnit;
        if (here && here.code === r.code){
          unlockHere(r, pos, statusEl);
        } else {
          var where = hereChal ? hereChal.name+"(챌린지 섬)" : (hereUnit ? fullName(hereUnit) : null);
          statusEl.textContent = (where ? "현재 "+where+"에 계신 것으로 확인돼요." : "대한민국 영역 밖으로 확인됐어요.") + " "+r.name+"에 도착하면 다시 확인해주세요.";
        }
      });
    });
  }

  // 현장 위치 확인에 성공하면 바로 해금한다 (리뷰·건물 기능은 재설계 후 다시 붙일 예정 — 태그 before-remove-post-building 참고)
  // 저장에 실패하면 해금을 되돌리고 알린다 (조용히 실패하지 않는다)
  function unlockHere(r, pos, statusEl){
    var had = isUnlocked(r.code);
    recordUnlock(r.code, pos);
    if (!saveStateQuiet()){
      if (!had) delete state.unlocks[r.code];
      statusEl.textContent = "기기 저장 공간이 부족해 해금을 저장하지 못했어요. 설정 › 데이터 백업으로 기록을 보관한 뒤 다시 시도해주세요.";
      return;
    }
    closeSheet();
    showStamp(r.name, r.challenge ? "challenge" : "unlock");
  }

  // 해금된 지역: 이름, 홈 여부, 해금 날짜만 간단히
  function renderUnlockedSheet(r, isHome){
    var u = state.unlocks[r.code];
    var html =
      '<div class="sheet-head"><div>'+
        unlockTag(r.code, isHome)+
        '<h2 style="margin-top:6px;">'+r.name+'</h2>'+
        '<div class="coord mono">'+escapeHtml(regionSubtitle(r))+'</div>'+
      '</div><button class="close-x" id="closeBtn">✕</button></div>'+
      '<p class="unlock-date">📅 '+escapeHtml(unlockDateText(u))+'</p>';
    openSheet(html);
    document.getElementById("closeBtn").addEventListener("click", closeSheet);
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; });
  }

