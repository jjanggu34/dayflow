import { StepBar } from "../components/common/StepBar.js";
import { ChatBubble } from "../components/chat/ChatBubble.js";
import { QuickReplyChip } from "../components/chat/QuickReplyChip.js";
import { QUICK_REPLIES } from "../constants/emotions.js";
import { appStore } from "../store/appStore.js";
import { navigate } from "../router/router.js";

export function ChatRecordPage(state) {
  return `
    <section class="page">
      ${StepBar({ step: 4 })}
      <div class="app-card">
        <h2>채팅 기록</h2>
        <div class="chat-box" id="chatBox">
          ${state.chatMessages.map((message) => ChatBubble(message)).join("")}
        </div>
        <div class="chip-row">
          ${QUICK_REPLIES.map((chip) => QuickReplyChip(chip)).join("")}
        </div>
        <div class="row">
          <input class="input" id="chatInput" placeholder="오늘의 마음을 적어보세요" />
          <button class="btn btn-primary" id="chatSend">전송</button>
        </div>
        <button class="btn btn-primary" id="chatDone">기록 완료</button>
      </div>
    </section>
  `;
}

export function bindChatRecordEvents() {
  const FOLLOW_UP_QUESTIONS = [
    "오늘 감정에 가장 큰 영향을 준 사건은 무엇이었나요?",
    "그때 몸의 느낌이나 생각은 어땠나요?",
    "지금 나에게 가장 필요한 한 가지는 무엇일까요?"
  ];

  const buildAssistantReply = (state, userText) => {
    const followIndex = state.chatFollowIndex || 0;
    const followUp = FOLLOW_UP_QUESTIONS[Math.min(followIndex, FOLLOW_UP_QUESTIONS.length - 1)];
    return `잘 들었어요. "${userText}" 라고 느꼈군요. ${followUp}`;
  };

  const appendConversation = (text) => {
    const state = appStore.getState();
    const userMessage = { role: "user", text };
    const assistantMessage = { role: "assistant", text: buildAssistantReply(state, text) };
    const messages = [...state.chatMessages, userMessage, assistantMessage];

    appStore.setState({
      chatMessages: messages,
      chatFollowIndex: Math.min((state.chatFollowIndex || 0) + 1, FOLLOW_UP_QUESTIONS.length - 1),
      diaryText: messages
        .filter((message) => message.role === "user")
        .map((message) => message.text)
        .join("\n")
    });
  };

  document.getElementById("chatSend")?.addEventListener("click", () => {
    const input = document.getElementById("chatInput");
    if (!input || !input.value.trim()) return;
    appendConversation(input.value.trim());
    input.value = "";
  });

  document.getElementById("chatInput")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const input = document.getElementById("chatInput");
    if (!input || !input.value.trim()) return;
    appendConversation(input.value.trim());
    input.value = "";
  });

  document.querySelectorAll("[data-chip]").forEach((chip) => {
    chip.addEventListener("click", () => appendConversation(chip.dataset.chip || ""));
  });

  document.getElementById("chatDone")?.addEventListener("click", () => navigate("S5"));
}
