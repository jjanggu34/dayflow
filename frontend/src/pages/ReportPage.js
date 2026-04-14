import { StatCard } from "../components/analysis/StatCard.js";
import { InsightCard } from "../components/analysis/InsightCard.js";
import { TabBar } from "../components/common/TabBar.js";

export function ReportPage(state) {
  const stats = state.reportStats || {
    totalEntries: 14,
    bestEmotion: "평온",
    streak: 5
  };

  return `
    <section class="page">
      <div class="app-card">
        <h2>월간 리포트</h2>
        ${StatCard("기록 수", `${stats.totalEntries}회`)}
        ${StatCard("가장 많은 감정", stats.bestEmotion)}
        ${StatCard("연속 기록", `${stats.streak}일`)}
        ${InsightCard("이번 달은 불안 감정이 주중에 집중되는 경향이 있습니다.")}
      </div>
      ${TabBar("S8")}
    </section>
  `;
}
