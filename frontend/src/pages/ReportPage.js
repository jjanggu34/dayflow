import { TabBar } from "../components/common/TabBar.js";

export function ReportPage(state) {
  const mockBars = [42, 58, 60, 62, 77, 70, 54];
  const dow = ["일", "월", "화", "수", "목", "금", "토"];
  const maxBar = Math.max(...mockBars, 1);
  const bubbles = [
    { label: "설렘", days: 9, size: 118, left: 22, top: 42, tone: "is-main" },
    { label: "평온함", days: 8, size: 96, left: 62, top: 34, tone: "is-soft" },
    { label: "활기참", days: 5, size: 94, left: 47, top: 68, tone: "is-soft-2" },
    { label: "무기력", days: 3, size: 74, left: 18, top: 72, tone: "is-muted" },
    { label: "불안함", days: 3, size: 66, left: 79, top: 62, tone: "is-muted-2" }
  ];

  return `
    <section class="page report-v2">
      <header class="report-v2__header">
        <h1>리포트</h1>
      </header>

      <section class="report-v2__hero">
        <p>4월의 감정은 어땠을까요?</p>
        <h2>한 달의 마음 흐름을 돌아보세요!</h2>
      </section>

      <section class="report-v2__panel">
        <p class="report-v2__eyebrow">한 주의 흐름</p>
        <h3>요일별 에너지</h3>
        <div class="report-v2__bars">
          ${mockBars
            .map(
              (value, idx) => `
                <div class="report-v2__bar-col">
                  <div class="report-v2__bar-wrap">
                    <span class="report-v2__bar" style="height:${Math.max(16, Math.round((value / maxBar) * 88))}px"></span>
                  </div>
                  <span class="report-v2__bar-label">${dow[idx]}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="report-v2__panel">
        <p class="report-v2__eyebrow">감정 리포트</p>
        <h3>이번 달 감정 순위</h3>
        <div class="report-v2__bubble-box">
          ${bubbles
            .map(
              (bubble) => `
                <div class="report-v2__bubble ${bubble.tone}" style="width:${bubble.size}px;height:${bubble.size}px;left:${bubble.left}%;top:${bubble.top}%;">
                  <strong>${bubble.label}</strong>
                  <span>${bubble.days}일</span>
                </div>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="report-v2__insight">
        <h3>패턴 인사이트</h3>
        <ul>
          <li>주초(월·화)에 에너지가 높고 주 중반 이후 낮아지는 패턴이 보여요.</li>
          <li>평온함이 베이스 감정으로, 안정적인 흐름을 유지하고 있어요.</li>
          <li>불쾌지수가 높은 날 무기력·불안이 동반되는 경향이 있어요.</li>
        </ul>
      </section>

      <div class="report-v2__tabbar">
        ${TabBar("S8")}
      </div>
    </section>
  `;
}
