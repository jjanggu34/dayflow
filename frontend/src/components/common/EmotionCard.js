export function EmotionCard(emotion, selected) {
  return `
    <button class="emotion-card ${selected === emotion ? "is-selected" : ""}" data-emotion="${emotion}">
      ${emotion}
    </button>
  `;
}
