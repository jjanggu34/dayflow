import { appStore } from "../store/appStore.js";
import { navigate } from "../router/router.js";

export function SettingsPage(state) {
  return `
    <section class="page">
      <div class="app-card">
        <h2>설정</h2>
        <label class="setting-item">
          <span>리마인더</span>
          <input type="checkbox" id="reminderEnabled" ${
            state.settings.reminderEnabled ? "checked" : ""
          } />
        </label>
        <label class="setting-item">
          <span>리마인더 시간</span>
          <input type="time" id="reminderTime" value="${state.settings.reminderTime}" />
        </label>
        <button class="btn btn-primary" id="saveSetting">저장</button>
        <button class="btn btn-secondary" id="newRecord">새 기록 시작</button>
      </div>
    </section>
  `;
}

export function bindSettingsEvents() {
  document.getElementById("saveSetting")?.addEventListener("click", () => {
    const current = appStore.getState().settings;
    appStore.setState({
      settings: {
        ...current,
        reminderEnabled: document.getElementById("reminderEnabled")?.checked || false,
        reminderTime: document.getElementById("reminderTime")?.value || current.reminderTime
      }
    });
  });

  document.getElementById("newRecord")?.addEventListener("click", () => {
    appStore.resetForNewEntry();
    navigate("S2");
  });
}
