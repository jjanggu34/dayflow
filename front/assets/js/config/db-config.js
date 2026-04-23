/**
 * Dexie — DayflowDB 스키마
 * 문서: diaries / emotions / settings (research.md)
 * 로드: /assets/js/lib/dexie.min.js → 본 파일 → diaryStore.js
 */
(function (global) {
  "use strict";

  if (!global.Dexie) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[DayflowDB] Dexie가 없습니다. dexie.min.js를 db-config.js보다 먼저 로드하세요.");
    }
    global.DayflowDB = null;
    return;
  }

  var db = new Dexie("DayflowDB");

  db.version(1).stores({
    diaries: "++id, date, emotion, createdAt",
    emotions: "++id, date, type, createdAt",
    settings: "key",
  });

  global.DayflowDB = db;
})(typeof window !== "undefined" ? window : this);
