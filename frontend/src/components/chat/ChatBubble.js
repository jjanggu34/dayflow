export function ChatBubble({ role, text }) {
  return `<div class="chat-bubble ${role === "user" ? "is-user" : "is-bot"}">${text}</div>`;
}
