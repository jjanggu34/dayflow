import { MeterBar } from "../components/analysis/MeterBar.js";
import { TabBar } from "../components/common/TabBar.js";

export function PatternPage(state) {
  const stats = state.patternStats || { 행복: 40, 평온: 30, 슬픔: 10, 불안: 20 };
  return `
    <section class="page">
      <div class="app-card">
        <h2>감정 패턴</h2>
        ${Object.entries(stats)
          .map(([label, value]) => MeterBar(label, value))
          .join("")}
      </div>
      ${TabBar("S7")}
    </section>
  `;
}
