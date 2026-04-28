/* views/chat/chat.html — dayflow_04 ChatPage 패턴: 인사·칩·Claude 대화·타이핑·기록완료 */
(function () {
  "use strict";
  if (window.__dayflowChatInit) return;

  var D = window.DayflowEmotionChat;
  if (!D) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "DayflowEmotionChat 없음 — emotionChatData.js 로드 실패 시 내장 폴백 사용. 가능하면 chat.html에 emotionChatData.js를 chat.js보다 먼저 넣으세요."
      );
    }
    var FB_TYPE_TO_IDX = { best: 0, good: 1, normal: 2, bad: 3, worst: 4 };
    window.DayflowEmotionChat = {
      TYPE_TO_IDX: FB_TYPE_TO_IDX,
      CHAT_EMOTIONS: [
        { emoji: "😊", name: "최고예요", color: "#1D9E75" },
        { emoji: "😌", name: "좋아요", color: "#5448C0" },
        { emoji: "🙂", name: "보통이에요", color: "#D4537E" },
        { emoji: "😔", name: "별로예요", color: "#8C8985" },
        { emoji: "😰", name: "최악이에요", color: "#D85A30" },
      ],
      STARTER_CHIPS_BY_EMO: {
        0: ["에너지가 넘쳐요", "기분이 아주 좋아요", "활기차고 자신 있어요", "오늘 잘될 것 같아요"],
        1: ["기분이 괜찮아요", "안정적이고 편안해요", "차분하고 좋아요", "마음이 가벼워요"],
        2: ["무난해요", "그냥 그래요", "차분해요", "특별한 건 없어요", "조금 신경 쓰여요"],
        3: ["의욕이 없어요", "피곤하고 처져요", "마음이 무거워요", "집중이 잘 안 돼요"],
        4: ["너무 지쳤어요", "불안하고 초조해요", "머리가 복잡해요", "버겁고 힘들어요"],
      },
      getIdxFromType: function (type) {
        var t = type || "good";
        return Object.prototype.hasOwnProperty.call(FB_TYPE_TO_IDX, t) ? FB_TYPE_TO_IDX[t] : 1;
      },
      STORAGE_EMOTION_KEY: "dayflow_emotion_type",
    };
    D = window.DayflowEmotionChat;
  }

  /** 감정기록 목록 → /chat : diary id 또는 날짜로 이전 기록 보기 (보기 전용) */
  function consumeHistoryIntent() {
    try {
      var hid = (sessionStorage.getItem("dayflow_chat_history_diary_id") || "").trim();
      var hdt = (sessionStorage.getItem("dayflow_chat_history_date") || "").trim();
      var hem = (sessionStorage.getItem("dayflow_chat_history_emotion") || "").trim();
      var out = null;
      if (/^\d+$/.test(hid)) {
        out = { id: parseInt(hid, 10) };
        sessionStorage.removeItem("dayflow_chat_history_diary_id");
        sessionStorage.removeItem("dayflow_chat_history_date");
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(hdt)) {
        out = { date: hdt };
        sessionStorage.removeItem("dayflow_chat_history_diary_id");
        sessionStorage.removeItem("dayflow_chat_history_date");
      } else {
        return null;
      }
      sessionStorage.removeItem("dayflow_chat_history_emotion");
      if (hem && /^(best|good|normal|bad|worst)$/.test(hem)) {
        sessionStorage.setItem(D.STORAGE_EMOTION_KEY, hem);
      } else {
        var cur = sessionStorage.getItem(D.STORAGE_EMOTION_KEY);
        if (!cur || !/^(best|good|normal|bad|worst)$/.test(cur)) {
          sessionStorage.setItem(D.STORAGE_EMOTION_KEY, "good");
        }
      }
      return out;
    } catch (eC) {
      return null;
    }
  }

  var HISTORY_LOAD = consumeHistoryIntent();

  try {
    if (!HISTORY_LOAD) {
      var emGate = sessionStorage.getItem(D.STORAGE_EMOTION_KEY);
      if (!emGate || !/^(best|good|normal|bad|worst)$/.test(emGate)) {
        window.location.replace(D.urlChatFlow("emotion"));
        return;
      }
    }
  } catch (eGate) {
    if (!HISTORY_LOAD) {
      window.location.replace(D.urlChatFlow("emotion"));
      return;
    }
  }

  window.__dayflowChatInit = true;

  var CHAT_EMOTIONS = D.CHAT_EMOTIONS;
  var STARTER_CHIPS_BY_EMO = D.STARTER_CHIPS_BY_EMO;
  /** 결과 화면「채팅 요약」— 기록완료 시 Claude로 생성해 sessionStorage에 저장 */
  var STORAGE_CHAT_SUMMARY = "dayflow_diary_chat_summary";
  var STORAGE_SELECTED_DATE = "dayflow_selected_date";

  var chatHistory = [];
  var diaryText = "";
  /** 감정기록에서 연 기록 보기 — 입력·새 전송 비활성 */
  var isHistoryViewMode = false;
  var pendingImageBase64 = null;
  var starterChipsTimer = null;
  var lastSendAt = 0;
  var isFinishing = false;
  /** 음성 대화 모드: 마이크 켠 상태에서 인식 → 2초 묵음 후 자동 전송 → 봇 답변 TTS */
  var isVoiceConversationMode = false;
  var voicePausedForTts = false;
  var voiceFinalAccum = "";
  var voiceAutoSendTimer = null;
  var VOICE_AUTO_SEND_MS = 2000;

  var threadInner = document.querySelector("#chatThread .chat-thread__inner");
  var chatMessages = document.getElementById("chatMessages");
  var chatHeaderSub = document.getElementById("chatHeaderSub");
  var input = document.getElementById("chatInput");
  var sendBtn = document.getElementById("chatSendBtn");
  var backBtn = document.getElementById("chatBackBtn");
  var apikeyBtn = document.getElementById("chatApikeyBtn");
  var attachBtn = document.getElementById("chatAttachBtn");
  var imgInput = document.getElementById("chatImgInput");
  var micBtn = document.getElementById("chatMicBtn");
  var voiceBanner = document.getElementById("chatVoiceBanner");
  var voiceCancel = document.getElementById("chatVoiceCancel");
  var ttsStyleSelect = document.getElementById("chatTtsStyle");

  if (apikeyBtn && (DayflowApiKey.usesEmbeddedKey() || DayflowApiKey.usesServerProxy())) {
    apikeyBtn.setAttribute("hidden", "");
    apikeyBtn.setAttribute("aria-hidden", "true");
    apikeyBtn.setAttribute("tabindex", "-1");
  }

  var recognition = null;
  var isVoiceOn = false;

  function getEmotionIdx() {
    var t = sessionStorage.getItem(D.STORAGE_EMOTION_KEY) || "good";
    return D.getIdxFromType(t);
  }

  function getChatEmotion() {
    return CHAT_EMOTIONS[getEmotionIdx()] || CHAT_EMOTIONS[1];
  }

  /** emotion.html 에서 고른 감정 타입 — 인사 두 번째 줄 문구 분기 */
  function getStoredEmotionType() {
    try {
      var t = sessionStorage.getItem(D.STORAGE_EMOTION_KEY);
      if (t && /^(best|good|normal|bad|worst)$/.test(t)) return t;
    } catch (e) {}
    return "good";
  }

  function greetingH2SecondLineForType(type) {
    var m = {
      best: "오늘의 하루가 정말 최고였어요!",
      good: "오늘의 하루가 좋으셨군요!",
      normal: "오늘의 하루는 어떠셨나요?",
      bad: "오늘의 하루가 좀 힘드셨군요.",
      worst: "오늘의 하루가 너무 힘드셨군요.",
    };
    return Object.prototype.hasOwnProperty.call(m, type) ? m[type] : m.good;
  }

  function SYS_PROMPT() {
    var e = getChatEmotion();
    return (
      "당신은 감정 일기 앱 '무디(Moody)'입니다. 사용자의 하루를 공감하며 감정 기록을 돕는 따뜻한 AI 친구예요.\n\n" +
      "오늘 사용자가 선택한 감정: " +
      e.name +
      "\n\n대화 규칙:\n" +
      "- 짧고 공감적으로 답변하세요 (2~4문장)\n" +
      "- 한국어 존댓말만 사용하세요\n" +
      "- 이모지를 적절히 활용하세요"
    );
  }

  function getStarterChips() {
    var idx = getEmotionIdx();
    return STARTER_CHIPS_BY_EMO[idx] || STARTER_CHIPS_BY_EMO[2];
  }

  function scrollThreadToBottom() {
    if (!threadInner) return;
    threadInner.scrollTop = threadInner.scrollHeight;
  }

  function formatChatTime() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h < 12 ? "오전" : "오후";
    var hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return ampm + " " + hour12 + ":" + String(m).padStart(2, "0");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function removeTyping() {
    var el = document.getElementById("chatTyping");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function addTyping() {
    removeTyping();
    if (!chatMessages) return;
    var row = document.createElement("div");
    row.className = "chat-typing";
    row.id = "chatTyping";
    row.setAttribute("aria-live", "polite");
    row.innerHTML =
      '<div class="chat-msg__avatar" aria-hidden="true">🌙</div>' +
      '<div class="chat-typing__dots" aria-hidden="true">' +
      "<span></span><span></span><span></span></div>";
    chatMessages.appendChild(row);
    scrollThreadToBottom();
  }

  /** 첫 인사만 emotion.html 과 동일: section.text-content + .text-group (p + h2), 말풍선·아바타 없음 */
  function addAssistantOpeningGreeting() {
    if (!chatMessages) return;
    var line2 = greetingH2SecondLineForType(getStoredEmotionType());
    var wrap = document.createElement("div");
    wrap.className = "chat-msg chat-msg--assistant chat-msg--assistant-opening";
    wrap.innerHTML =
      '<section class="text-content" aria-labelledby="chat-greeting-title">' +
      '<div class="text-group">' +
      '<h2 id="chat-greeting-title">안녕하세요!<br />' +
        '<span>' + escapeHtml(line2) + '</span>' +
      "</h2>" +
      '<p id="chat-greeting-sub">선택하신 감정의 세부 감정을 선택해주세요</p>' +
      "</div>" +
      '<span class="chat-msg__time chat-msg__time--assistant-opening">' +
      formatChatTime() +
      "</span>" +
      "</section>";
    chatMessages.appendChild(wrap);
    scrollThreadToBottom();
  }

  function addBotBubble(htmlOrText, asHtml) {
    if (!chatMessages) return;
    var wrap = document.createElement("div");
    wrap.className = "chat-msg chat-msg--assistant chat-msg--with-av";
    var row = document.createElement("div");
    row.className = "chat-msg__row";
    var av = document.createElement("div");
    av.className = "chat-msg__avatar";
    av.setAttribute("aria-hidden", "true");
    av.textContent = "🌙";
    var body = document.createElement("div");
    body.className = "chat-msg__body";
    var bubble = document.createElement("div");
    bubble.className = "chat-msg__bubble";
    if (asHtml) bubble.innerHTML = htmlOrText.replace(/\n/g, "<br>");
    else bubble.innerHTML = escapeHtml(htmlOrText).replace(/\n/g, "<br>");
    var time = document.createElement("span");
    time.className = "chat-msg__time";
    time.textContent = formatChatTime();
    body.appendChild(bubble);
    body.appendChild(time);
    row.appendChild(av);
    row.appendChild(body);
    wrap.appendChild(row);
    chatMessages.appendChild(wrap);
    scrollThreadToBottom();
  }

  function addUserMessage(text) {
    if (!chatMessages) return;
    var wrap = document.createElement("div");
    wrap.className = "chat-msg chat-msg--user";
    wrap.innerHTML =
      '<div class="chat-msg__body">' +
      '<p class="chat-msg__bubble">' +
      escapeHtml(text).replace(/\r\n|\r|\n/g, "<br />") +
      "</p>" +
      '<span class="chat-msg__time">' +
      formatChatTime() +
      "</span></div>";
    chatMessages.appendChild(wrap);
    scrollThreadToBottom();
  }

  function addUserImage(dataUrl) {
    if (!chatMessages || typeof dataUrl !== "string" || dataUrl.indexOf("data:image") !== 0) return;
    var wrap = document.createElement("div");
    wrap.className = "chat-msg chat-msg--user";
    var body = document.createElement("div");
    body.className = "chat-msg__body";
    var imgWrap = document.createElement("div");
    imgWrap.className = "chat-msg__img-wrap";
    var img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "첨부 이미지";
    imgWrap.appendChild(img);
    var time = document.createElement("span");
    time.className = "chat-msg__time";
    time.textContent = formatChatTime();
    body.appendChild(imgWrap);
    body.appendChild(time);
    wrap.appendChild(body);
    chatMessages.appendChild(wrap);
    scrollThreadToBottom();
  }

  function removeChips() {
    var nodes = chatMessages.querySelectorAll(".chat-chips-wrap");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  function removeFinishOnlyChips() {
    var nodes = chatMessages.querySelectorAll(".chat-chips-wrap--finishonly");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  /** 첫 칩 클릭·첫 메시지 등 대화 시작 시 인사 블록·스타터 칩만 제거(기록완료 전용 칩은 유지) */
  function removeChatIntroChrome() {
    if (!chatMessages) return;
    var opening = chatMessages.querySelector(".chat-msg--assistant-opening");
    if (opening && opening.parentNode) opening.parentNode.removeChild(opening);
    var introChips = chatMessages.querySelectorAll(".chat-chips-wrap--intro");
    for (var j = 0; j < introChips.length; j++) {
      if (introChips[j].parentNode) introChips[j].parentNode.removeChild(introChips[j]);
    }
  }

  function addChips(chips, opts) {
    opts = opts || {};
    if (!chatMessages) return;
    removeChips();
    var wrap = document.createElement("div");
    wrap.className = "chat-chips-wrap" + (opts.introLayout ? " chat-chips-wrap--intro" : "");
    var row = document.createElement("div");
    row.className = "chat-chips" + (opts.introLayout ? " chat-chips--intro-grid" : "");
    chips.forEach(function (label) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chat-chip";
      b.textContent = label;
      b.addEventListener("click", function () {
        wrap.remove();
        handleChat(label);
      });
      row.appendChild(b);
    });
    var fin = document.createElement("button");
    fin.type = "button";
    fin.className = "chat-chip chat-chip--finish";
    fin.textContent = "기록완료";
    fin.setAttribute("aria-label", "기록 완료하고 결과 보기");
    fin.addEventListener("click", function () {
      wrap.remove();
      finishDiary();
    });
    row.appendChild(fin);
    wrap.appendChild(row);
    chatMessages.appendChild(wrap);
    scrollThreadToBottom();
  }

  function addFinishChip() {
    removeFinishOnlyChips();
    if (!chatMessages) return;
    var wrap = document.createElement("div");
    wrap.className = "chat-chips-wrap chat-chips-wrap--finishonly";
    var row = document.createElement("div");
    row.className = "chat-chips chat-chips--flush";
    var fin = document.createElement("button");
    fin.type = "button";
    fin.className = "chat-chip chat-chip--finish";
    fin.textContent = "기록완료";
    fin.setAttribute("aria-label", "기록 완료하고 결과 보기");
    fin.addEventListener("click", function () {
      wrap.remove();
      finishDiary();
    });
    row.appendChild(fin);
    wrap.appendChild(row);
    chatMessages.appendChild(wrap);
    scrollThreadToBottom();
  }

  function callClaude() {
    var messages = chatHistory.map(function (m) {
      return { role: m.role, content: m.content };
    });
    return DayflowChatAgent.sendMessages({
      apiKey: DayflowApiKey.get(),
      system: SYS_PROMPT(),
      messages: messages,
    });
  }

  /** API/네트워크 오류 → 사용자에게 보여줄 문구 */
  function buildChatErrorMessage(err) {
    if (!err) return "죄송해요, 잠시 문제가 생겼어요. 다시 말씀해 주세요 🙏";
    if (err.message === "no_api_key") {
      return "API 키가 필요해요. 상단 ⚙를 눌러 설정해 주세요.";
    }
    if (err.message && /Failed to fetch|NetworkError|Load failed/i.test(err.message)) {
      var apiUrl = DayflowChatAgent.getMessagesUrl();
      if (apiUrl.indexOf("127.0.0.1:8787") !== -1 || apiUrl.indexOf("localhost:8787") !== -1) {
        return (
          "로컬 프록시(포트 8787)에 연결되지 않았어요. 터미널에서 실행:\n" +
          "python3 front/scripts/anthropic_proxy.py\n" +
          "실행 후 페이지를 새로고침하고 다시 보내 보세요."
        );
      }
      return (
        "네트워크 오류이거나 CORS 제한일 수 있어요. 로컬이면 프록시를 켜고, 배포 환경이면 백엔드 URL을 window.DAYFLOW_ANTHROPIC_URL 로 지정하세요."
      );
    }

    var st = err.status;
    var detail = (err.message || "").trim();
    if (detail.length > 320) detail = detail.slice(0, 320) + "…";

    if (st === 401) {
      return "API 키가 인식되지 않아요. ⚙에서 키를 확인해 주세요.";
    }
    if (st === 400) {
      return (
        "요청이 거절됐어요(400).\n" +
        (detail ? "상세: " + detail + "\n" : "") +
        "• API 키 형식(sk-ant-…)\n• 모델 이름(필요 시 콘솔에서 DAYFLOW_ANTHROPIC_MODEL 확인)"
      );
    }
    if (st === 403) {
      return "접근이 거부됐어요(403).\n" + (detail ? detail : "키 권한·결제·지역 제한을 확인해 주세요.");
    }
    if (st === 404) {
      return "요청 URL 또는 모델을 찾을 수 없어요(404).\n" + (detail ? detail : "");
    }
    if (st === 429) {
      return "요청이 많아 잠시 막혔어요(429). 잠시 후 다시 시도해 주세요.\n" + (detail ? detail : "");
    }
    if (st === 529 || (detail && /overloaded|Overloaded/i.test(detail))) {
      return "Claude 서버가 바빠요(529). 잠시 후 다시 시도해 주세요.";
    }

    if (detail) {
      return "문제가 있었어요.\n" + (st ? "(" + st + ") " : "") + detail;
    }
    return "죄송해요, 잠시 문제가 생겼어요. 다시 말씀해 주세요 🙏";
  }

  function stripForSpeech(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.innerHTML = String(s);
    var t = div.textContent || div.innerText || String(s);
    return t.replace(/\s+/g, " ").trim();
  }

  /** 브라우저 TTS는 한계가 있음. 뉴럴/고품질 음성 우선 + rate/pitch + 문장 단위 재생으로 덜 “AI 티” 나게 조절 */
  var TTS_STYLE_STORAGE = "dayflow_tts_style";
  var TTS_PRESETS = {
    default: { rate: 0.97, pitch: 1, chunkGap: 85 },
    natural: { rate: 0.91, pitch: 1, chunkGap: 130 },
    cute: { rate: 1.08, pitch: 1.12, chunkGap: 75 },
    warm: { rate: 0.9, pitch: 0.97, chunkGap: 95 },
  };

  function getTtsStyle() {
    if (typeof window !== "undefined" && window.DAYFLOW_TTS_STYLE) {
      var w = String(window.DAYFLOW_TTS_STYLE).trim().toLowerCase();
      if (w === "cute" || w === "warm" || w === "default" || w === "natural") return w;
    }
    try {
      var s = localStorage.getItem(TTS_STYLE_STORAGE);
      if (s === "cute" || s === "warm" || s === "default" || s === "natural") return s;
    } catch (e) {}
    return "default";
  }

  function setTtsStyle(style) {
    if (style !== "cute" && style !== "warm" && style !== "default" && style !== "natural") style = "default";
    try {
      localStorage.setItem(TTS_STYLE_STORAGE, style);
    } catch (e) {}
    if (ttsStyleSelect) ttsStyleSelect.value = style;
  }

  function getKoVoices() {
    if (!window.speechSynthesis) return [];
    var list = speechSynthesis.getVoices();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var l = (list[i].lang || "").toLowerCase();
      if (l.indexOf("ko") === 0) out.push(list[i]);
    }
    return out;
  }

  /** OS에 깔린 음성 이름 힌트로 “뉴럴/자연” 쪽 우선 (완벽하진 않음) */
  function scoreVoiceNatural(v) {
    var n = (v.name || "").toLowerCase();
    var s = 0;
    if (/neural|neural2|natural|enhanced|premium|wavenet|google|microsoft|azure|polly|aegis|siri|yuna|heera|고품질|개선|향상/i.test(n)) s += 6;
    if (/wave|studio|pro\b|plus|hd\b|hd\)/i.test(n)) s += 2;
    if (/basic|compact|legacy|espeak|e-speech|classic|standard|tiny|small|로봇|기계|낡은/i.test(n)) s -= 5;
    if (/\.compact\.|offline.*low|low.*quality/i.test(n)) s -= 3;
    return s;
  }

  function scoreVoiceCute(v) {
    var n = (v.name || "").toLowerCase();
    var s = 0;
    if (/female|girl|woman|yuna|heera|소녀|여성|sara|young|premium|미녀|소프트/i.test(n)) s += 4;
    if (/google|natural|enhanced|neural|wave/i.test(n)) s += 2;
    if (/male|남성|grandpa|grandfather|아저씨|할아버지/i.test(n)) s -= 4;
    return s + scoreVoiceNatural(v) * 0.35;
  }

  function scoreVoiceWarm(v) {
    var n = (v.name || "").toLowerCase();
    var s = 0;
    if (/male|남성|bass|deep|grand|아저씨|할아버지|저음/i.test(n)) s += 4;
    if (/warm|calm|soft|부드|따뜻|yuna|여성|woman|female/i.test(n)) s += 2;
    if (/robot|기계|tts basic/i.test(n)) s -= 3;
    return s + scoreVoiceNatural(v) * 0.35;
  }

  function pickBestByScore(ko, scoreFn) {
    var best = ko[0];
    var bestScore = scoreFn(best);
    for (var j = 1; j < ko.length; j++) {
      var sc = scoreFn(ko[j]);
      if (sc > bestScore) {
        bestScore = sc;
        best = ko[j];
      }
    }
    return best;
  }

  function pickVoiceNatural() {
    var ko = getKoVoices();
    if (!ko.length) return null;
    return pickBestByScore(ko, scoreVoiceNatural);
  }

  function splitIntoNaturalChunks(text) {
    var t = (text || "").trim();
    if (!t) return [];
    if (t.length < 72) return [t];
    var chunks = [];
    var buf = "";
    for (var i = 0; i < t.length; i++) {
      var c = t.charAt(i);
      buf += c;
      if (/[.!?。！？]/.test(c) && buf.replace(/\s/g, "").length > 6) {
        chunks.push(buf.trim());
        buf = "";
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks.length > 1 ? chunks : [t];
  }

  function pickVoiceForStyle(style) {
    var ko = getKoVoices();
    if (!ko.length) return null;
    if (style === "default" || style === "natural") {
      return pickVoiceNatural() || ko[0];
    }
    var scoreFn = style === "cute" ? scoreVoiceCute : scoreVoiceWarm;
    return pickBestByScore(ko, scoreFn);
  }

  function ensureVoicesThen(run) {
    if (!window.speechSynthesis) {
      run();
      return;
    }
    if (speechSynthesis.getVoices().length) {
      run();
      return;
    }
    var done = false;
    var once = function () {
      if (done) return;
      done = true;
      speechSynthesis.removeEventListener("voiceschanged", once);
      run();
    };
    speechSynthesis.addEventListener("voiceschanged", once);
    speechSynthesis.getVoices();
    setTimeout(function () {
      if (!done && speechSynthesis.getVoices().length) once();
    }, 400);
    setTimeout(function () {
      if (!done) once();
    }, 2000);
  }

  function speakText(text, onEnd) {
    if (!window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    var plain = stripForSpeech(text);
    if (!plain) {
      if (onEnd) onEnd();
      return;
    }

    function applyUtteranceProps(u, preset, voice) {
      u.lang = "ko-KR";
      u.rate = preset.rate;
      u.pitch = preset.pitch;
      if (voice) {
        try {
          u.voice = voice;
        } catch (ignored) {}
      }
    }

    function doSpeak() {
      speechSynthesis.cancel();
      var style = getTtsStyle();
      var preset = TTS_PRESETS[style] || TTS_PRESETS.default;
      var chunkGap = typeof preset.chunkGap === "number" ? preset.chunkGap : 90;
      var voice = pickVoiceForStyle(style);
      var parts = splitIntoNaturalChunks(plain);

      if (parts.length <= 1) {
        var u1 = new SpeechSynthesisUtterance(parts[0] || plain);
        applyUtteranceProps(u1, preset, voice);
        u1.onend = function () {
          if (onEnd) onEnd();
        };
        u1.onerror = function () {
          if (onEnd) onEnd();
        };
        speechSynthesis.speak(u1);
        return;
      }

      var idx = 0;
      function speakNextChunk() {
        if (idx >= parts.length) {
          if (onEnd) onEnd();
          return;
        }
        var u = new SpeechSynthesisUtterance(parts[idx]);
        applyUtteranceProps(u, preset, voice);
        var last = idx === parts.length - 1;
        idx++;
        u.onend = function () {
          if (last) {
            if (onEnd) onEnd();
          } else {
            setTimeout(speakNextChunk, chunkGap);
          }
        };
        u.onerror = function () {
          if (onEnd) onEnd();
        };
        speechSynthesis.speak(u);
      }
      speakNextChunk();
    }

    ensureVoicesThen(doSpeak);
  }

  if (typeof window !== "undefined") {
    window.DayflowChatTts = {
      TTS_PRESETS: TTS_PRESETS,
      getStyle: getTtsStyle,
      setStyle: setTtsStyle,
      getKoVoices: getKoVoices,
    };
  }

  function setVoiceBannerSpeaking(speaking) {
    if (!voiceBanner) return;
    var el = voiceBanner.querySelector(".chat-voice-banner__text");
    if (el) {
      el.textContent = speaking
        ? "AI 응답 재생 중… (끝나면 다시 말씀해 주세요)"
        : "음성 대화 중 — 말씀하신 뒤 " + VOICE_AUTO_SEND_MS / 1000 + "초 뒤 자동 전송돼요";
    }
  }

  function resetVoiceAutoSendTimer() {
    if (voiceAutoSendTimer) {
      clearTimeout(voiceAutoSendTimer);
      voiceAutoSendTimer = null;
    }
  }

  function scheduleVoiceAutoSend() {
    resetVoiceAutoSendTimer();
    voiceAutoSendTimer = setTimeout(function () {
      voiceAutoSendTimer = null;
      var text = voiceFinalAccum.trim();
      if (!text) return;
      voiceFinalAccum = "";
      if (input) {
        input.value = "";
        setSendEnabled();
        autosizeInput();
      }
      submitChatMessage(text);
    }, VOICE_AUTO_SEND_MS);
  }

  function maybeSpeakAssistantReply(text) {
    if (!isVoiceConversationMode || !text) return;
    voicePausedForTts = true;
    resetVoiceAutoSendTimer();
    try {
      if (recognition) recognition.stop();
    } catch (e) {}
    setVoiceBannerSpeaking(true);
    speakText(text, function () {
      voicePausedForTts = false;
      setVoiceBannerSpeaking(false);
      if (isVoiceConversationMode && recognition) {
        try {
          recognition.start();
        } catch (e) {}
      }
    });
  }

  function handleChat(text) {
    if (isHistoryViewMode) return;
    var t = (text || "").trim();
    if (!t) return;

    removeChatIntroChrome();

    /* API 키 여부와 관계없이 사용자 말풍선은 항상 표시 */
    addUserMessage(t);
    diaryText += diaryText ? "\n" + t : t;
    chatHistory.push({ role: "user", content: t });

    if (!window.DayflowApiKey || (!DayflowApiKey.has() && !DayflowApiKey.usesServerProxy())) {
      var needKeyMsg =
        "Claude와 대화하려면 상단 ⚙에서 API 키를 먼저 입력해 주세요.\n키는 이 브라우저에만 저장돼요.";
      addBotBubble(needKeyMsg, false);
      maybeSpeakAssistantReply(needKeyMsg);
      addFinishChip();
      return;
    }

    /* 인트로 칩줄에 있던 기록완료 제거 후, 응답 대기 중에도 항상 노출 */
    addFinishChip();

    addTyping();

    callClaude()
      .then(function (reply) {
        removeTyping();
        addBotBubble(reply, false);
        chatHistory.push({ role: "assistant", content: reply });
        addFinishChip();
        maybeSpeakAssistantReply(reply);
      })
      .catch(function (err) {
        removeTyping();
        if (typeof console !== "undefined" && console.error) {
          console.error("[Dayflow chat]", err && err.status, err && err.message, err);
        }
        var msg = buildChatErrorMessage(err);
        addBotBubble(msg, false);
        addFinishChip();
        maybeSpeakAssistantReply(msg);
      });
  }

  function submitChatMessage(text) {
    if (isHistoryViewMode) return;
    var t = (text || "").trim();
    if (!t) return;
    var now = Date.now();
    if (now - lastSendAt < 400) return;
    lastSendAt = now;
    if (input) {
      input.value = "";
      setSendEnabled();
      autosizeInput();
    }
    handleChat(t);
  }

  function sendChat() {
    if (!input || !sendBtn || sendBtn.disabled) return;
    var text = (input.value || "").trim();
    submitChatMessage(text);
  }

  function requestDiaryNarrativeSummary(fullText, onDone) {
    if (typeof onDone !== "function") onDone = function () {};
    var t = (fullText || "").trim();
    if (t.length < 12) {
      onDone("");
      return;
    }
    if (!window.DayflowApiKey || (!DayflowApiKey.has() && !DayflowApiKey.usesServerProxy()) || !window.DayflowChatAgent || typeof DayflowChatAgent.sendMessages !== "function") {
      onDone("");
      return;
    }
    DayflowChatAgent.sendMessages({
      apiKey: DayflowApiKey.get(),
      system:
        "당신은 감정 일기 앱의 편집자입니다. 아래는 사용자가 챗봇과 나눈 하루 기록입니다. " +
        "2~3문장 정도의 한국어 존댓말로 한 덩어리만 써 주세요. 글머리표·따옴표·제목 없이 본문만. " +
        "대화에 없는 사실은 지어내지 마세요.",
      messages: [
        {
          role: "user",
          content: "[일기 대화]\n\n" + t.slice(0, 12000),
        },
      ],
    })
      .then(function (reply) {
        onDone(String(reply || "").trim());
      })
      .catch(function () {
        onDone("");
      });
  }

  function finishDiary() {
    if (isHistoryViewMode || isFinishing) return;
    isFinishing = true;

    var text = diaryText.trim();
    var summary = text.slice(0, 2000);
    try {
      sessionStorage.setItem("dayflow_diary_summary", summary);
    } catch (e) {}

    var emotion = "good";
    var selectedDate = "";
    try {
      emotion = sessionStorage.getItem(D.STORAGE_EMOTION_KEY) || "good";
      selectedDate = (sessionStorage.getItem(STORAGE_SELECTED_DATE) || "").trim();
    } catch (e2) {}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) selectedDate = "";

    function goResult() {
      try {
        sessionStorage.setItem(D.STORAGE_CHAT_FLOW_DONE, "1");
        if (selectedDate) sessionStorage.removeItem(STORAGE_SELECTED_DATE);
      } catch (e4) {}
      window.location.href = D.urlChatFlow("result");
    }

    function saveThenGo() {
      if (window.DayflowSupabaseStore && typeof DayflowSupabaseStore.saveTodayDiary === "function") {
        DayflowSupabaseStore.saveTodayDiary({
          date: selectedDate || undefined,
          emotion: emotion,
          content: text,
          summary: summary,
          imageBase64: pendingImageBase64,
        })
          .then(goResult)
          .catch(function (err) {
            if (typeof console !== "undefined" && console.warn) {
              console.warn("[Dayflow] Supabase 저장 실패 — 결과 화면으로 이동", err);
            }
            goResult();
          });
      } else {
        goResult();
      }
    }

    requestDiaryNarrativeSummary(text, function (blurb) {
      try {
        if (blurb) sessionStorage.setItem(STORAGE_CHAT_SUMMARY, blurb.slice(0, 2000));
        else sessionStorage.removeItem(STORAGE_CHAT_SUMMARY);
      } catch (e3) {}
      saveThenGo();
    });
  }

  function setSendEnabled() {
    if (!sendBtn || !input) return;
    var has = (input.value || "").trim().length > 0;
    sendBtn.disabled = !has;
  }

  function autosizeInput() {
    if (!input) return;
    input.style.height = "auto";
    var next = Math.min(input.scrollHeight, 100);
    input.style.height = next + "px";
  }

  function initPage() {
    if (starterChipsTimer) {
      clearTimeout(starterChipsTimer);
      starterChipsTimer = null;
    }

    chatHistory = [];
    diaryText = "";
    pendingImageBase64 = null;
    isFinishing = false;
    try {
      sessionStorage.removeItem(STORAGE_CHAT_SUMMARY);
    } catch (eRm) {}
    if (chatMessages) chatMessages.innerHTML = "";

    var e = getChatEmotion();
    if (chatHeaderSub) chatHeaderSub.textContent = e.emoji + " " + e.name + " 감정 기록 중";

    addAssistantOpeningGreeting();

    starterChipsTimer = setTimeout(function () {
      addChips(getStarterChips(), { introLayout: true });
      starterChipsTimer = null;
    }, 500);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatYmdDotShort(ymd) {
    var p = String(ymd || "").split("-");
    if (p.length !== 3) return ymd;
    return String(p[0]).slice(-2) + "." + p[1] + "." + p[2];
  }

  function hideChatComposerChrome() {
    var composer = document.querySelector("#bodyWrap .chat-composer");
    if (composer) {
      composer.setAttribute("hidden", "");
      composer.setAttribute("aria-hidden", "true");
    }
    var voice = document.getElementById("chatVoiceBanner");
    if (voice) voice.setAttribute("hidden", "");
  }

  /** 기록 보기 — 입력 대신 result.html 과 같은 button-content + 그날 분석 상세보기 링크 */
  function showHistoryDockFooter(row) {
    hideChatComposerChrome();
    var dock = document.getElementById("chatHistoryDock");
    var meta = document.getElementById("chatHistoryDockMeta");
    var link = document.getElementById("chatHistoryDockDetail");
    if (meta) {
      if (row && row.date) {
        meta.innerHTML =
          "<strong>" + escapeHtml(formatYmdDotShort(row.date)) + "</strong> 그날의 분석";
      } else {
        meta.textContent = "그날의 분석";
      }
    }
    if (link) {
      if (row && row.date) {
        var base =
          typeof D.urlChatFlow === "function" ? D.urlChatFlow("result") : "/chat/result";
        var q = "date=" + encodeURIComponent(row.date);
        if (row.id) q += "&diary=" + encodeURIComponent(String(row.id));
        link.href = base.indexOf("?") >= 0 ? base + "&" + q : base + "?" + q;
        link.removeAttribute("hidden");
      } else {
        link.href = "/my/chat-list";
        link.textContent = "감정기록으로";
      }
    }
    if (dock) dock.removeAttribute("hidden");
  }

  function showHistoryDockError() {
    hideChatComposerChrome();
    var dock = document.getElementById("chatHistoryDock");
    var meta = document.getElementById("chatHistoryDockMeta");
    var link = document.getElementById("chatHistoryDockDetail");
    if (meta) meta.textContent = "기록을 불러오지 못했어요.";
    if (link) {
      link.href = "/my/chat-list";
      link.textContent = "감정기록으로";
    }
    if (dock) dock.removeAttribute("hidden");
  }

  function initHistoryView(loadSpec) {
    isHistoryViewMode = true;
    if (starterChipsTimer) {
      clearTimeout(starterChipsTimer);
      starterChipsTimer = null;
    }
    chatHistory = [];
    diaryText = "";
    pendingImageBase64 = null;
    isFinishing = true;
    try {
      sessionStorage.removeItem(STORAGE_CHAT_SUMMARY);
    } catch (eRm) {}
    if (chatMessages) chatMessages.innerHTML = "";

    function normalizeRow(row) {
      if (!row) return null;
      return {
        id: row.id,
        date: String(row.date || "").trim(),
        emotion: row.emotion && /^(best|good|normal|bad|worst)$/.test(row.emotion) ? row.emotion : "good",
        content: String(row.content || "").trim(),
        summary: String(row.summary || "").trim(),
      };
    }

    function applyDiaryRow(row) {
      row = normalizeRow(row);
      if (!row) {
        addBotBubble("기록을 불러오지 못했어요. 감정기록 목록으로 돌아가 주세요.", false);
        showHistoryDockError();
        return;
      }
      try {
        sessionStorage.setItem(D.STORAGE_EMOTION_KEY, row.emotion);
      } catch (eS) {}
      var em = getChatEmotion();
      if (chatHeaderSub) {
        chatHeaderSub.textContent = em.emoji + " " + em.name + " · " + row.date;
      }
      addBotBubble(
        "저장된 기록을 보여 드려요. 지금은 쓰신 말만 저장돼 있고, AI 답변은 화면에 남지 않아요. 이어서 대화하기는 아직 지원하지 않아요.",
        false
      );
      var lines = row.content ? row.content.split(/\n+/) : [];
      var shown = 0;
      lines.forEach(function (line) {
        var t = (line || "").trim();
        if (!t) return;
        addUserMessage(t);
        shown++;
      });
      if (!shown) {
        addBotBubble("이날 저장된 본문이 비어 있어요.", false);
      }
      var sum = row.summary;
      if (sum && sum.length && sum !== row.content) {
        addBotBubble("요약: " + sum.slice(0, 1800), false);
      }
      showHistoryDockFooter(row);
      scrollThreadToBottom();
    }

    if (!window.DayflowSupabaseStore) {
      addBotBubble("저장소 연결이 없어 기록을 불러올 수 없어요.", false);
      showHistoryDockError();
      return;
    }

    var p;
    if (loadSpec.id && typeof DayflowSupabaseStore.getDiaryById === "function") {
      p = DayflowSupabaseStore.getDiaryById(loadSpec.id);
    } else if (loadSpec.date && typeof DayflowSupabaseStore.getLatestDiaryForDate === "function") {
      p = DayflowSupabaseStore.getLatestDiaryForDate(loadSpec.date);
    } else {
      p = Promise.resolve(null);
    }
    p.then(normalizeRow)
      .then(applyDiaryRow)
      .catch(function () {
        applyDiaryRow(null);
      });
  }


  function openApiKeyPrompt() {
    if (DayflowApiKey.usesEmbeddedKey() || DayflowApiKey.usesServerProxy()) {
      return;
    }
    var cur = DayflowApiKey.get();
    var k = window.prompt(
      "Anthropic Claude API 키를 입력하세요.\n(콘솔에서 발급 — 이 브라우저 localStorage에만 저장됩니다)",
      cur || ""
    );
    if (k === null) return;
    k = String(k).trim();
    if (k) {
      DayflowApiKey.set(k);
      addBotBubble("API 키를 저장했어요. 이제 대화를 이어가 볼까요? 💬", false);
      addFinishChip();
    }
  }

  function speechSupported() {
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  }

  function stopVoice(doStop) {
    if (doStop === undefined) doStop = true;
    isVoiceConversationMode = false;
    voicePausedForTts = false;
    resetVoiceAutoSendTimer();
    voiceFinalAccum = "";
    isVoiceOn = false;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (micBtn) {
      micBtn.classList.remove("is-recording");
      micBtn.setAttribute("aria-pressed", "false");
    }
    if (voiceBanner) voiceBanner.setAttribute("hidden", "");
    if (recognition && doStop) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    recognition = null;
  }

  function toggleVoice() {
    if (isHistoryViewMode) return;
    if (!speechSupported()) {
      window.alert("음성 입력은 Chrome·Edge 등에서 지원됩니다.");
      return;
    }
    if (isVoiceConversationMode) {
      stopVoice(true);
      return;
    }

    isVoiceConversationMode = true;
    voicePausedForTts = false;
    voiceFinalAccum = "";
    resetVoiceAutoSendTimer();

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = function () {
      isVoiceOn = true;
      if (micBtn) {
        micBtn.classList.add("is-recording");
        micBtn.setAttribute("aria-pressed", "true");
      }
      if (voiceBanner) {
        voiceBanner.removeAttribute("hidden");
        setVoiceBannerSpeaking(false);
      }
    };

    recognition.onresult = function (ev) {
      var interim = "";
      var gotFinal = false;
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) {
          voiceFinalAccum += ev.results[i][0].transcript;
          gotFinal = true;
        } else {
          interim += ev.results[i][0].transcript;
        }
      }
      if (input) {
        input.value = (voiceFinalAccum + interim).trim();
        setSendEnabled();
        autosizeInput();
      }
      if (gotFinal) {
        scheduleVoiceAutoSend();
      }
    };

    recognition.onend = function () {
      if (voicePausedForTts) return;
      if (!isVoiceConversationMode) return;
      setTimeout(function () {
        if (!isVoiceConversationMode || voicePausedForTts) return;
        try {
          recognition.start();
        } catch (e) {}
      }, 80);
    };

    recognition.onerror = function (ev) {
      if (voicePausedForTts) return;
      if (ev.error === "not-allowed") {
        window.alert("마이크 권한이 필요해요.");
        stopVoice(true);
        return;
      }
      if (ev.error === "aborted") return;
      if (isVoiceConversationMode && (ev.error === "no-speech" || ev.error === "network")) {
        setTimeout(function () {
          if (!isVoiceConversationMode || voicePausedForTts) return;
          try {
            recognition.start();
          } catch (e) {}
        }, 200);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      stopVoice(true);
    }
  }

  function attachImage() {
    if (isHistoryViewMode) return;
    if (imgInput) imgInput.click();
  }

  function handleImageFile(ev) {
    if (isHistoryViewMode) return;
    var file = ev.target && ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl = e.target && e.target.result;
      if (typeof dataUrl === "string") {
        removeChatIntroChrome();
        addUserImage(dataUrl);
        pendingImageBase64 = dataUrl.split(",")[1] || null;
        addBotBubble("사진을 받았어요 📸 메시지를 입력하고 전송해 주세요. (이미지 분석은 API 연동 후 가능해요)", false);
      }
    };
    reader.readAsDataURL(file);
    ev.target.value = "";
  }

  if (threadInner) {
    window.addEventListener("load", scrollThreadToBottom);
    window.addEventListener("resize", scrollThreadToBottom);
  }

  if (input) {
    input.addEventListener("input", function () {
      setSendEnabled();
      autosizeInput();
      scrollThreadToBottom();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.shiftKey) return;
      if (e.repeat) return;
      if (e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      sendChat();
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      if (isHistoryViewMode) {
        window.location.href = "/my/chat-list";
        return;
      }
      window.location.href = D.urlChatFlow("emotion");
    });
  }

  if (apikeyBtn) apikeyBtn.addEventListener("click", openApiKeyPrompt);
  if (sendBtn) sendBtn.addEventListener("click", sendChat);
  if (attachBtn) attachBtn.addEventListener("click", attachImage);
  if (imgInput) imgInput.addEventListener("change", handleImageFile);
  if (micBtn) micBtn.addEventListener("click", toggleVoice);
  if (voiceCancel)
    voiceCancel.addEventListener("click", function () {
      stopVoice(true);
    });

  if (ttsStyleSelect) {
    ttsStyleSelect.value = getTtsStyle();
    ttsStyleSelect.addEventListener("change", function () {
      setTtsStyle(ttsStyleSelect.value);
    });
  }

  if (HISTORY_LOAD) {
    initHistoryView(HISTORY_LOAD);
  } else {
    initPage();
  }
  setSendEnabled();
  if (input) autosizeInput();
})();
