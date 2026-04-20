const tabs = [
  { screen: "S5", label: "분석", hash: "#/analysis" },
  { screen: "S6", label: "캘린더", hash: "#/calendar" },
  { screen: "S7", label: "패턴", hash: "#/pattern" },
  { screen: "S8", label: "리포트", hash: "#/report" }
];

export function TabBar(currentScreen) {
  return `
    <nav class="tabbar">
      ${tabs
        .map(
          (tab) =>
            `<a href="${tab.hash}" class="tabbar__item ${
              currentScreen === tab.screen ? "is-active" : ""
            }">${tab.label}</a>`
        )
        .join("")}
    </nav>
  `;
}
