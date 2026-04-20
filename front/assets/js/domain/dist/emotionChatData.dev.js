"use strict";

/**
 * 감정 선택(emotion.html #emotionBtnGroup) ↔ 채팅 칩(chat.js) 공통 데이터
 * emotion.js 는 sessionStorage.dayflow_emotion_type 에 best|good|normal|bad|worst 저장
 */
(function (global) {
  "use strict";

  var TYPE_TO_IDX = {
    best: 0,
    good: 1,
    normal: 2,
    bad: 3,
    worst: 4
  };
  var CHAT_EMOTIONS = [{
    emoji: "😊",
    name: "최고예요",
    color: "#1D9E75"
  }, {
    emoji: "😌",
    name: "좋아요",
    color: "#5448C0"
  }, {
    emoji: "🙂",
    name: "보통이에요",
    color: "#D4537E"
  }, {
    emoji: "😔",
    name: "별로예요",
    color: "#8C8985"
  }, {
    emoji: "😰",
    name: "최악이에요",
    color: "#D85A30"
  }];
  var STARTER_CHIPS_BY_EMO = {
    0: ["에너지가 넘쳐요", "기분이 아주 좋아요", "활기차고 자신 있어요", "오늘 잘될 것 같아요"],
    1: ["기분이 괜찮아요", "안정적이고 편안해요", "차분하고 좋아요", "마음이 가벼워요"],
    2: ["무난해요", "그냥 그래요", "차분해요", "특별한 건 없어요", "조금 신경 쓰여요"],
    3: ["의욕이 없어요", "피곤하고 처져요", "마음이 무거워요", "집중이 잘 안 돼요"],
    4: ["너무 지쳤어요", "불안하고 초조해요", "머리가 복잡해요", "버겁고 힘들어요"]
  };

  function getIdxFromType(type) {
    var t = type || "good";
    return Object.prototype.hasOwnProperty.call(TYPE_TO_IDX, t) ? TYPE_TO_IDX[t] : 1;
  }

  global.DayflowEmotionChat = {
    TYPE_TO_IDX: TYPE_TO_IDX,
    CHAT_EMOTIONS: CHAT_EMOTIONS,
    STARTER_CHIPS_BY_EMO: STARTER_CHIPS_BY_EMO,
    getIdxFromType: getIdxFromType,
    STORAGE_EMOTION_KEY: "dayflow_emotion_type"
  };
})(typeof window !== "undefined" ? window : void 0);
//# sourceMappingURL=emotionChatData.dev.js.map
