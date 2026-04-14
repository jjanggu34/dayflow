export function StepBar({ step = 1, total = 5 }) {
  return `<div class="stepbar">${Array.from({ length: total })
    .map(
      (_, index) =>
        `<span class="stepbar__dot ${index + 1 <= step ? "is-active" : ""}"></span>`
    )
    .join("")}</div>`;
}
