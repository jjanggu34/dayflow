import { CalendarGrid } from "../components/calendar/CalendarGrid.js";
import { TabBar } from "../components/common/TabBar.js";

export function CalendarPage(state) {
  const now = new Date();
  return `
    <section class="page">
      <div class="app-card">
        <h2>${now.getFullYear()}년 ${now.getMonth() + 1}월 감정 캘린더</h2>
        ${CalendarGrid({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          entries: state.calendarEntries
        })}
      </div>
      ${TabBar("S6")}
    </section>
  `;
}
