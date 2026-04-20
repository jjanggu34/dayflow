import { navigate } from "../router/router.js";

export function SplashPage() {
  return `
    <section class="page splash">
      <div class="app-card center">
        <h1>DAYFLOW</h1>
        <p>감정을 기록하고 흐름을 확인하세요.</p>
        <button class="btn btn-primary" id="startBtn">시작하기</button>
      </div>
    </section>
  `;
}

export function bindSplashPageEvents() {
  document.getElementById("startBtn")?.addEventListener("click", () => navigate("S2"));
}
