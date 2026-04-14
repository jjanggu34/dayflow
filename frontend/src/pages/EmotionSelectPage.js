import { StepBar } from "../components/common/StepBar.js";
import { EmotionCard } from "../components/common/EmotionCard.js";
import { EMOTIONS } from "../constants/emotions.js";
import { appStore } from "../store/appStore.js";
import { navigate } from "../router/router.js";

export function EmotionSelectPage(state) {
  return `
    <section class="page">
      ${StepBar({ step: 2 })}
      <div class="app-card">
        <h2>오늘의 감정</h2>
        <div class="emotion-list">
          ${EMOTIONS.map((emotion) => EmotionCard(emotion, state.selectedEmotion)).join("")}
        </div>
        <button class="btn btn-primary" id="emotionNext" ${
          state.selectedEmotion ? "" : "disabled"
        }>다음</button>
      </div>
    </section>
  `;
}

export function bindEmotionSelectEvents() {
  document.querySelectorAll("[data-emotion]").forEach((button) => {
    button.addEventListener("click", () => {
      appStore.setState({ selectedEmotion: button.dataset.emotion });
    });
  });
  document.getElementById("emotionNext")?.addEventListener("click", () => navigate("S3"));
}
