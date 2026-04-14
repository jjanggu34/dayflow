import { StepBar } from "../components/common/StepBar.js";
import { appStore } from "../store/appStore.js";
import { navigate } from "../router/router.js";

export function RecordMethodPage() {
  return `
    <section class="page">
      ${StepBar({ step: 3 })}
      <div class="app-card">
        <h2>기록 방식 선택</h2>
        <div class="stack">
          <button class="btn btn-secondary" data-method="chat">채팅으로 기록</button>
          <button class="btn btn-secondary" data-method="video">영상으로 기록</button>
        </div>
      </div>
    </section>
  `;
}

export function bindRecordMethodEvents() {
  document.querySelectorAll("[data-method]").forEach((button) => {
    button.addEventListener("click", () => {
      const method = button.dataset.method;
      appStore.setState({ recordMethod: method });
      navigate(method === "chat" ? "S4chat" : "S4video");
    });
  });
}
