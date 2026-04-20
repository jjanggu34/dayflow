/* Dexie.js CRUD — Supabase 등으로 교체 시 동일 API 유지 권장 */
(function (global) {
  "use strict";

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /** 로컬 날짜 기준 YYYY-MM-DD */
  function toYmd(d) {
    var x = d || new Date();
    return x.getFullYear() + "-" + pad2(x.getMonth() + 1) + "-" + pad2(x.getDate());
  }

  var SCORE_BY_EMOTION = {
    best: 92,
    good: 72,
    normal: 58,
    bad: 42,
    worst: 28,
  };

  function emotionScore(type) {
    var t = type || "good";
    return Object.prototype.hasOwnProperty.call(SCORE_BY_EMOTION, t) ? SCORE_BY_EMOTION[t] : 58;
  }

  function getDb() {
    return global.DayflowDB;
  }

  /**
   * @param {string} dateYmd
   * @returns {Promise<object|null>} 최신 일기 한 건
   */
  function getLatestDiaryForDate(dateYmd) {
    var db = getDb();
    if (!db) return Promise.resolve(null);
    return db.diaries
      .where("date")
      .equals(dateYmd)
      .toArray()
      .then(function (rows) {
        if (!rows || !rows.length) return null;
        rows.sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        return rows[0];
      })
      .catch(function () {
        return null;
      });
  }

  function getLatestDiaryForToday() {
    return getLatestDiaryForDate(toYmd());
  }

  /**
   * @param {object} opts
   * @param {string} [opts.date] YYYY-MM-DD (기본: 오늘)
   * @param {string} [opts.emotion] best|good|…
   * @param {string} opts.content
   * @param {string} [opts.summary]
   * @param {string|null} [opts.imageBase64]
   * @returns {Promise<number>} 새 diaries.id
   */
  function saveDiaryEntry(opts) {
    var db = getDb();
    if (!db) {
      return Promise.reject(new Error("no_db"));
    }
    var o = opts || {};
    var content = String(o.content || "").trim();
    var summary = o.summary != null ? String(o.summary) : content.slice(0, 2000);
    var row = {
      date: o.date || toYmd(),
      emotion: o.emotion || "good",
      content: content,
      summary: summary.slice(0, 2000),
      imageBase64: o.imageBase64 != null ? o.imageBase64 : null,
      createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
    };
    return db.diaries.add(row);
  }

  /**
   * 오늘 날짜의 감정 스냅샷 (리포트용)
   */
  function saveEmotionEntry(opts) {
    var db = getDb();
    if (!db) return Promise.reject(new Error("no_db"));
    var o = opts || {};
    var type = o.type || "good";
    var row = {
      date: o.date || toYmd(),
      type: type,
      score: o.score != null ? o.score : emotionScore(type),
      createdAt: Date.now(),
    };
    return db.emotions.add(row);
  }

  /**
   * 채팅 완료 한 번에: 일기 + 감정 스냅샷 저장 (감정 행 실패해도 일기 id는 반환)
   */
  function saveTodayDiary(opts) {
    var o = opts || {};
    return saveDiaryEntry({
      date: o.date,
      emotion: o.emotion,
      content: o.content,
      summary: o.summary,
      imageBase64: o.imageBase64,
    }).then(function (id) {
      return saveEmotionEntry({
        date: o.date,
        type: o.emotion || "good",
        score: o.score != null ? o.score : emotionScore(o.emotion),
      })
        .then(function () {
          return id;
        })
        .catch(function () {
          return id;
        });
    });
  }

  function getSetting(key) {
    var db = getDb();
    if (!db) return Promise.resolve(undefined);
    return db.settings.get(String(key)).then(function (row) {
      return row ? row.value : undefined;
    });
  }

  function setSetting(key, value) {
    var db = getDb();
    if (!db) return Promise.reject(new Error("no_db"));
    return db.settings.put({ key: String(key), value: value });
  }

  global.DayflowDiaryStore = {
    toYmd: toYmd,
    getLatestDiaryForDate: getLatestDiaryForDate,
    getLatestDiaryForToday: getLatestDiaryForToday,
    saveDiaryEntry: saveDiaryEntry,
    saveEmotionEntry: saveEmotionEntry,
    saveTodayDiary: saveTodayDiary,
    getSetting: getSetting,
    setSetting: setSetting,
  };
})(typeof window !== "undefined" ? window : this);
