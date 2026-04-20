export function MeterBar(label, value = 0) {
  return `
    <div class="meter">
      <div class="meter__head"><span>${label}</span><span>${value}%</span></div>
      <div class="meter__track"><div class="meter__fill" style="width:${value}%"></div></div>
    </div>
  `;
}
