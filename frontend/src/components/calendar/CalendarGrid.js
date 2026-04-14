export function CalendarGrid({ year, month, entries }) {
  const lastDay = new Date(year, month, 0).getDate();
  const map = new Map(
    entries.map((entry) => [Number(entry.createdAt.slice(8, 10)), entry.emotion])
  );

  return `
    <div class="calendar-grid">
      ${Array.from({ length: lastDay })
        .map((_, i) => {
          const day = i + 1;
          const emotion = map.get(day) || "";
          return `<div class="calendar-grid__cell">
            <span>${day}</span>
            <small>${emotion}</small>
          </div>`;
        })
        .join("")}
    </div>
  `;
}
