/* Supabase CRUD — diaryStore.js 와 동일한 API를 유지합니다
   DayflowSupabase (supabase-config.js) + DayflowAuth (authAgent.js) 필요 */
(function (global) {
  "use strict";

  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  function lastDayOfMonth(yearMonth) {
    var p = yearMonth.split("-");
    return new Date(Number(p[0]), Number(p[1]), 0).getDate();
  }

  function toYmd(d) {
    var x = d || new Date();
    return x.getFullYear() + "-" + pad2(x.getMonth() + 1) + "-" + pad2(x.getDate());
  }

  var SCORE_BY_EMOTION = { best: 92, good: 72, normal: 58, bad: 42, worst: 28 };

  function emotionScore(type) {
    var t = type || "good";
    return Object.prototype.hasOwnProperty.call(SCORE_BY_EMOTION, t) ? SCORE_BY_EMOTION[t] : 58;
  }

  function getClient() { return global.DayflowSupabase; }

  function getUserId() {
    return global.DayflowAuth.getCurrentUser().then(function (user) {
      if (!user) throw new Error("not_authenticated");
      return user.id;
    });
  }

  // ── 일기 ──────────────────────────────────────────────────────

  function getLatestDiaryForDate(dateYmd) {
    var client = getClient();
    if (!client) return Promise.resolve(null);
    return getUserId().then(function (uid) {
      return client
        .from("diaries")
        .select("*")
        .eq("user_id", uid)
        .eq("date", dateYmd)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(function (res) {
          if (res.error) { console.error(res.error); return null; }
          return res.data && res.data.length ? res.data[0] : null;
        });
    }).catch(function () { return null; });
  }

  function getLatestDiaryForToday() {
    return getLatestDiaryForDate(toYmd());
  }

  function saveDiaryEntry(opts) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    var o = opts || {};
    var content = String(o.content || "").trim();
    var summary = o.summary != null ? String(o.summary) : content.slice(0, 2000);
    return getUserId().then(function (uid) {
      var row = {
        user_id:      uid,
        date:         o.date || toYmd(),
        emotion:      o.emotion || "good",
        content:      content,
        summary:      summary.slice(0, 2000),
        image_base64: o.imageBase64 != null ? o.imageBase64 : null,
      };
      return client.from("diaries").insert(row).select("id").single()
        .then(function (res) {
          if (res.error) throw res.error;
          return res.data.id;
        });
    });
  }

  function saveEmotionEntry(opts) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    var o = opts || {};
    var type = o.type || "good";
    return getUserId().then(function (uid) {
      var row = {
        user_id: uid,
        date:    o.date || toYmd(),
        type:    type,
        score:   o.score != null ? o.score : emotionScore(type),
      };
      return client.from("emotions").insert(row).select("id").single()
        .then(function (res) {
          if (res.error) throw res.error;
          return res.data.id;
        });
    });
  }

  var PENDING_SAVE_BY_KEY = {};

  function saveTodayDiary(opts) {
    var o = opts || {};
    var targetDate    = o.date || toYmd();
    var targetContent = String(o.content || "").trim();
    var lockKey       = targetDate + "::" + targetContent;

    if (Object.prototype.hasOwnProperty.call(PENDING_SAVE_BY_KEY, lockKey)) {
      return PENDING_SAVE_BY_KEY[lockKey];
    }

    var task = getLatestDiaryForDate(targetDate).then(function (latest) {
      if (latest && String(latest.content || "").trim() === targetContent) {
        return { id: latest.id, skipped: true };
      }
      return saveDiaryEntry({
        date:        targetDate,
        emotion:     o.emotion,
        content:     targetContent,
        summary:     o.summary,
        imageBase64: o.imageBase64,
      }).then(function (id) { return { id: id, skipped: false }; });
    }).then(function (saved) {
      if (saved.skipped) return saved.id;
      return saveEmotionEntry({
        date:  targetDate,
        type:  o.emotion || "good",
        score: o.score != null ? o.score : emotionScore(o.emotion),
      }).then(function () { return saved.id; })
        .catch(function () { return saved.id; });
    });

    PENDING_SAVE_BY_KEY[lockKey] = task;
    return task.finally(function () { delete PENDING_SAVE_BY_KEY[lockKey]; });
  }

  // ── 설정 ─────────────────────────────────────────────────────

  function getSetting(key) {
    var client = getClient();
    if (!client) return Promise.resolve(undefined);
    return getUserId().then(function (uid) {
      return client.from("settings").select("value").eq("user_id", uid).eq("key", key).single()
        .then(function (res) {
          if (res.error || !res.data) return undefined;
          return res.data.value;
        });
    }).catch(function () { return undefined; });
  }

  function setSetting(key, value) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    return getUserId().then(function (uid) {
      return client.from("settings")
        .upsert({ user_id: uid, key: String(key), value: value }, { onConflict: "user_id,key" })
        .then(function (res) { if (res.error) throw res.error; });
    });
  }

  // ── 리포트용 조회 (diaryStore에 없던 추가 기능) ───────────────

  /** 가장 최근 일기 1건 반환 (advice.js용 — 날짜 무관) */
  function getLatestDiary() {
    var client = getClient();
    if (!client) return Promise.resolve(null);
    return getUserId().then(function (uid) {
      return client.from("diaries").select("*")
        .eq("user_id", uid)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .then(function (res) {
          if (res.error || !res.data || !res.data.length) return null;
          return res.data[0];
        });
    }).catch(function () { return null; });
  }

  /** 일기가 1건 이상 있는지 여부 (advice 빈 상태 판별용) */
  function hasDiaries() {
    var client = getClient();
    if (!client) return Promise.resolve(false);
    return getUserId().then(function (uid) {
      return client.from("diaries").select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .then(function (res) { return (res.count || 0) > 0; });
    }).catch(function () { return false; });
  }

  /** 일기 1건 삭제 */
  function deleteDiary(id) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    return getUserId().then(function (uid) {
      return client.from("diaries").delete()
        .eq("id", id)
        .eq("user_id", uid)
        .then(function (res) {
          if (res.error) throw res.error;
        });
    });
  }

  /** 특정 날짜의 일기 전체 반환 (main.js 캘린더용) */
  function getDiariesForDate(dateYmd) {
    var client = getClient();
    if (!client) return Promise.resolve([]);
    return getUserId().then(function (uid) {
      return client.from("diaries").select("*")
        .eq("user_id", uid)
        .eq("date", dateYmd)
        .order("created_at", { ascending: false })
        .then(function (res) { return res.data || []; });
    }).catch(function () { return []; });
  }

  /** 특정 월의 감정 목록 반환 (emotions 테이블) */
  function getEmotionsByMonth(yearMonth) {
    var client = getClient();
    if (!client) return Promise.resolve([]);
    var from = yearMonth + "-01";
    var to   = yearMonth + "-" + pad2(lastDayOfMonth(yearMonth));
    return getUserId().then(function (uid) {
      return client.from("emotions").select("*")
        .eq("user_id", uid)
        .gte("date", from).lte("date", to)
        .order("date", { ascending: true })
        .then(function (res) { return res.data || []; });
    }).catch(function () { return []; });
  }

  /** 특정 월의 일기 목록 반환 — report.js 에서 emotions 대신 사용 */
  function getDiariesForMonth(yearMonth) {
    var client = getClient();
    if (!client) return Promise.resolve([]);
    var from = yearMonth + "-01";
    var to   = yearMonth + "-" + pad2(lastDayOfMonth(yearMonth));
    return getUserId().then(function (uid) {
      return client.from("diaries")
        .select("id, date, emotion, created_at")
        .eq("user_id", uid)
        .gte("date", from).lte("date", to)
        .order("date", { ascending: true })
        .then(function (res) { return res.data || []; });
    }).catch(function () { return []; });
  }

  global.DayflowSupabaseStore = {
    toYmd:                  toYmd,
    getLatestDiaryForDate:  getLatestDiaryForDate,
    getLatestDiaryForToday: getLatestDiaryForToday,
    getDiariesForDate:      getDiariesForDate,
    saveDiaryEntry:         saveDiaryEntry,
    saveEmotionEntry:       saveEmotionEntry,
    saveTodayDiary:         saveTodayDiary,
    getSetting:             getSetting,
    setSetting:             setSetting,
    deleteDiary:            deleteDiary,
    getLatestDiary:         getLatestDiary,
    hasDiaries:             hasDiaries,
    getEmotionsByMonth:     getEmotionsByMonth,
    getDiariesForMonth:     getDiariesForMonth,
  };

})(typeof window !== "undefined" ? window : this);
