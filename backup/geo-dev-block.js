  /* ---------------- onboarding / geolocation ---------------- */
  var onboardStatus = document.getElementById("onboardStatus");
  var devMode = false;        // 테스트 모드 (dev 빌드에서만 켤 수 있다)
  var simulatedPoint = null;  // [lon,lat] 가상 위치 (dev 빌드 + 테스트 모드에서만 사용)
  var lastGeoError = null;    // "denied" | "timeout" | "unavailable" | null

  // 실제 위치를 측정한다. 실패하면 null 로 resolve 하고 이유를 lastGeoError 에 남긴다.
  // maximumAge:0 — 이전에 캐시된 위치로 판정하지 않는다 (CLAUDE.md §5 신선도)
  function currentPositionAsync(){
    lastGeoError = null;
    return new Promise(function(resolve){
      if (DEV && devMode && simulatedPoint){
        resolve({coords:{longitude:simulatedPoint[0], latitude:simulatedPoint[1], accuracy:0}, simulated:true});
        return;
      }
      var opts = { enableHighAccuracy:true, timeout:8000, maximumAge:0 };
      // Native app build (Capacitor): use the native Geolocation plugin so the
      // OS-level permission prompt and GPS hardware are used correctly.
      var capGeo = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation;
      if (capGeo && capGeo.getCurrentPosition){
        capGeo.getCurrentPosition(opts)
          .then(function(pos){ resolve(pos); })
          .catch(function(err){
            var m = String((err && (err.message || err.code)) || "").toLowerCase();
            lastGeoError = /denied|permission/.test(m) ? "denied" : (/timeout|timed out/.test(m) ? "timeout" : "unavailable");
            resolve(null);
          });
        return;
      }
      // Web/preview build: standard browser Geolocation API.
      if (!("geolocation" in navigator)){ lastGeoError = "unavailable"; resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        function(pos){ resolve(pos); },
        function(err){
          lastGeoError = err && err.code === 1 ? "denied" : (err && err.code === 3 ? "timeout" : "unavailable");
          resolve(null);
        },
        opts
      );
    });
  }
  function geoFailMessage(){
    if (lastGeoError === "denied") return "위치 권한이 꺼져 있어요. 설정 탭에서 위치 권한을 확인해주세요.";
    if (lastGeoError === "timeout") return "위치를 잡지 못했어요. 실외나 창가에서 다시 시도해주세요.";
    return "위치를 가져오지 못했어요. 위치 서비스(GPS)가 켜져 있는지 확인해주세요.";
  }
  // 정확도가 기준보다 낮으면 그 값(m)을, 괜찮으면 0 을 돌려준다. 정확도 값이 없으면 막지 않는다.
  function poorAccuracy(pos){
    var a = pos && pos.coords && pos.coords.accuracy;
    return (typeof a === "number" && a > ACCURACY_LIMIT_M) ? Math.round(a) : 0;
  }
  function poorAccuracyMessage(m){
    return "위치 정확도가 낮아요(약 ±"+m+"m). 하늘이 트인 곳에서 다시 측정해주세요.";
  }

  function showMapView(){
    document.getElementById("onboard").hidden = true;
    document.getElementById("mapCard").hidden = false;
    buildMap();
  }

  function startWithHome(code, pos){
    state.home = code;
    recordUnlock(code, pos);
    saveState();
    showMapView();
    var r = regionByCode(code);
    toast((r?fullName(r):"현재 지역")+" 잠금 해제! 여행을 시작해보세요", "🎉");
  }

  var btnLocate = document.getElementById("btnLocate");
  btnLocate.addEventListener("click", function(){
    onboardStatus.textContent = "위치를 확인하는 중...";
    currentPositionAsync().then(function(pos){
      if (!pos){
        onboardStatus.textContent = geoFailMessage() + (DEV ? " 테스트 모드도 쓸 수 있어요." : "");
        return;
      }
      var poor = poorAccuracy(pos);
      if (poor){
        onboardStatus.textContent = poorAccuracyMessage(poor);
        btnLocate.textContent = "📡 다시 측정하기";
        return;
      }
      var r = findRegionForPoint(pos.coords.longitude, pos.coords.latitude);
      if (!r){
        onboardStatus.textContent = "대한민국 영역 밖으로 확인됐어요." + (DEV ? " 테스트 모드로 시작해볼까요?" : "");
        return;
      }
      onboardStatus.textContent = "";
      startWithHome(r.code, pos);
    });
  });

  /* ---------------- dev mode (dev 빌드에서만 동작) ---------------- */
  var devToggle = document.getElementById("devToggle");    // 상단 테스트 모드 바
  var devToggle2 = document.getElementById("devToggle2");  // 설정 › 개발자
  var devPanel = document.getElementById("devPanel");
  var devSelect = document.getElementById("devSelect");
  var devSubSelect = document.getElementById("devSubSelect");

  function setDevMode(v){
    if (!DEV) return;
    devMode = !!v;
    devToggle.setAttribute("aria-pressed", devMode ? "true":"false");
    devToggle2.setAttribute("aria-pressed", devMode ? "true":"false");
    devToggle2.textContent = devMode ? "켜짐" : "꺼짐";
    devPanel.hidden = !devMode;
    if (!devMode){ simulatedPoint = null; if (tapTimer){ clearTimeout(tapTimer); tapTimer = null; } }
  }
  function moveSimulatedTo(code){
    if (!(DEV && devMode)) return null;
    var r = regionByCode(code);
    simulatedPoint = [r.lp[0], r.lp[1]]; // 빌드 단계에서 계산한, 다각형 안쪽이 보장되는 점
    return r;
  }
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
  function syncDevSelects(code){
    if (!DEV) return;
    var r = REG[code];
    devSelect.value = r.parent || r.code;
    fillDevSub();
    if (r.parent) devSubSelect.value = r.code;
  }

  if (DEV){
    SIDO.slice().sort(function(a,b){ return a.name.localeCompare(b.name,"ko"); }).forEach(function(r){
      var opt = document.createElement("option");
      opt.value = r.code; opt.textContent = r.name;
      devSelect.appendChild(opt);
    });
    devSelect.addEventListener("change", fillDevSub);
    fillDevSub();
    devToggle.addEventListener("click", function(){ setDevMode(!devMode); });
    devToggle2.addEventListener("click", function(){ setDevMode(!devMode); });

    document.getElementById("btnDevStart").addEventListener("click", function(){
      setDevMode(true);
      onboardStatus.textContent = "위 테스트 패널에서 지역을 선택하고 '이 위치로 이동'을 눌러주세요.";
      devPanel.scrollIntoView({behavior:"smooth", block:"center"});
    });

    document.getElementById("devApply").addEventListener("click", function(){
      var code = devSubSelect.hidden ? devSelect.value : devSubSelect.value;
      var r = moveSimulatedTo(code);
      if (!r) return;
      if (document.getElementById("onboard").hidden === false){
        startWithHome(code, {coords:{longitude:simulatedPoint[0], latitude:simulatedPoint[1], accuracy:0}, simulated:true});
      } else {
        toast(fullName(r)+"(으)로 이동했어요. 지도에서 확인해보세요.", "🧭");
        if (selectedCode) openRegion(selectedCode);
      }
    });
  }

