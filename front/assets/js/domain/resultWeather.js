/**
 * 결과 화면 하단 카드: 기온·불쾌지수·운(데모)
 * - 날씨: Open-Meteo — 브라우저는 동일 출처 `/api/open-meteo/v1/forecast?...` 만 호출
 *   (로컬: python3 front/scripts/dayflow_serve.py, 배포: front/vercel.json 프록시)
 * - 필요 시 `window.DAYFLOW_OPENMETEO_BASE = "https://..."` 로 베이스 덮어쓰기(고급)
 * - 위치: Geolocation → 실패 시 서울 시청 좌표
 * - 불쾌지수: 기온·습도 기반 THI 근사 (표시용)
 * - 운: 날짜 시드 기반 별점(실제 운세 API 아님)
 */
(function (global) {
  "use strict";

  var SEOUL = { lat: 37.5665, lon: 126.978 };

  /** WMO 코드 → 짧은 한글 (Open-Meteo / ECMWF) */
  function weatherCodeLabel(code) {
    var c = Number(code);
    if (c === 0) return "맑음";
    if (c === 1 || c === 2) return "약간 흐림";
    if (c === 3) return "흐림";
    if (c === 45 || c === 48) return "안개";
    if (c >= 51 && c <= 57) return "이슬비";
    if (c >= 61 && c <= 67) return "비";
    if (c >= 71 && c <= 77) return "눈";
    if (c >= 80 && c <= 82) return "소나기";
    if (c >= 85 && c <= 86) return "눈 소나기";
    if (c >= 95) return "뇌우";
    return "맑음";
  }

  /** THI 스타일 불쾌지수 (대략 55~85), 표시용 */
  function discomfortIndexApprox(tempC, rh) {
    var T = Number(tempC);
    var R = Number(rh);
    if (isNaN(T) || isNaN(R)) return null;
    return Math.round(0.81 * T + 0.01 * R * (0.99 * T - 14.3) + 46.3);
  }

  function discomfortLabel(di) {
    if (di == null || isNaN(di)) return "—";
    if (di < 68) return "쾌적";
    if (di < 75) return "보통";
    if (di < 80) return "주의";
    return "위험";
  }

  function getCoords() {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) {
        resolve(SEOUL);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        function () {
          resolve(SEOUL);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    });
  }

  function openMeteoBasePath() {
    if (typeof window !== "undefined" && window.DAYFLOW_OPENMETEO_BASE != null) {
      var b = String(window.DAYFLOW_OPENMETEO_BASE).trim();
      if (b !== "") return b.replace(/\/$/, "");
    }
    return "/api/open-meteo";
  }

  function buildOpenMeteoUrl(lat, lon) {
    var q =
      "latitude=" +
      encodeURIComponent(lat) +
      "&longitude=" +
      encodeURIComponent(lon) +
      "&current=temperature_2m,relative_humidity_2m,weather_code" +
      "&timezone=auto";
    return openMeteoBasePath() + "/v1/forecast?" + q;
  }

  function fetchCurrentWeather(lat, lon) {
    var url = buildOpenMeteoUrl(lat, lon);
    return fetch(url, { method: "GET", credentials: "omit" }).then(function (res) {
      if (!res.ok) throw new Error("weather_http_" + res.status);
      return res.json();
    });
  }

  /** 날짜 고정 난수 → ★3.0~4.9, 한 줄 라벨 */
  function luckFromToday() {
    var d = new Date();
    var seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
    var t = Math.sin(seed * 12.9898) * 43758.5453;
    var u = t - Math.floor(t);
    var score = 3 + u * 1.9;
    var star = "★" + score.toFixed(1);
    var subs = ["상승", "보통", "안정"];
    var sub = subs[Math.floor(u * 3) % 3];
    return { star: star, sub: sub };
  }

  /**
   * @returns {Promise<{ tempDisplay: string, weatherSub: string, discomfortNum: string, discomfortSub: string, luckVal: string, luckSub: string }>}
   */
  function loadWeatherSnapshot() {
    return getCoords().then(function (coords) {
      return fetchCurrentWeather(coords.lat, coords.lon).then(function (data) {
        var cur = data && data.current;
        if (!cur || cur.temperature_2m == null) throw new Error("no_current");
        var t = cur.temperature_2m;
        var rh = cur.relative_humidity_2m != null ? cur.relative_humidity_2m : 60;
        var code = cur.weather_code != null ? cur.weather_code : 0;
        var di = discomfortIndexApprox(t, rh);
        var luck = luckFromToday();
        return {
          tempDisplay: Math.round(t) + "°",
          weatherSub: weatherCodeLabel(code),
          discomfortNum: di != null ? String(di) : "—",
          discomfortSub: discomfortLabel(di),
          luckVal: luck.star,
          luckSub: luck.sub,
        };
      });
    });
  }

  function setDom(ids, snap) {
    var wVal = document.getElementById(ids.weatherVal || "resultStatWeatherVal");
    var wSub = document.getElementById(ids.weatherSub || "resultStatWeatherSub");
    var cVal = document.getElementById(ids.comfortVal || "resultStatComfortVal");
    var cSub = document.getElementById(ids.comfortSub || "resultStatComfortSub");
    var lVal = document.getElementById(ids.luckVal || "resultStatLuckVal");
    var lSub = document.getElementById(ids.luckSub || "resultStatLuckSub");
    if (wVal) wVal.textContent = snap.tempDisplay;
    if (wSub) wSub.textContent = snap.weatherSub;
    if (cVal) cVal.textContent = snap.discomfortNum;
    if (cSub) cSub.textContent = snap.discomfortSub;
    if (lVal) lVal.textContent = snap.luckVal;
    if (lSub) lSub.textContent = snap.luckSub;
  }

  function setDomFallback() {
    setDom(
      {},
      {
        tempDisplay: "—",
        weatherSub: "불러오기 실패",
        discomfortNum: "—",
        discomfortSub: "—",
        luckVal: "★—",
        luckSub: "—",
      }
    );
  }

  /**
   * result.html 의 DOM id에 맞춰 비동기로 채움. 실패 시 placeholder 또는 대체 문구.
   */
  function fillResultStatusCards(opts) {
    var o = opts || {};
    return loadWeatherSnapshot()
      .then(function (snap) {
        setDom(o.ids || {}, snap);
        return snap;
      })
      .catch(function () {
        if (typeof o.onFail === "function") {
          o.onFail();
        } else {
          setDomFallback();
        }
      });
  }

  global.DayflowResultWeather = {
    loadWeatherSnapshot: loadWeatherSnapshot,
    fillResultStatusCards: fillResultStatusCards,
    luckFromToday: luckFromToday,
  };
})(typeof window !== "undefined" ? window : this);
