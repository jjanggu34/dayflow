import { TabBar } from "../components/common/TabBar.js";

let disposeBubbleMotion = null;

export function ReportPage(state) {
  const mockBars = [42, 58, 60, 62, 77, 70, 54];
  const dow = ["일", "월", "화", "수", "목", "금", "토"];
  const maxBar = Math.max(...mockBars, 1);
  const bubbles = [
    { label: "설렘", days: 9, size: 114, left: 20, top: 40, tone: "is-main" },
    { label: "평온함", days: 8, size: 92, left: 66, top: 33, tone: "is-soft" },
    { label: "활기참", days: 5, size: 90, left: 48, top: 70, tone: "is-soft-2" },
    { label: "무기력", days: 3, size: 70, left: 13, top: 74, tone: "is-muted" },
    { label: "불안함", days: 3, size: 64, left: 84, top: 61, tone: "is-muted-2" }
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
          <div class="report-v2__bubble-cluster">
            ${bubbles
              .map(
                (bubble, idx) => `
                <div class="report-v2__bubble ${bubble.tone}" data-value="${bubble.days}" style="width:${bubble.size}px;height:${bubble.size}px;left:${bubble.left}%;top:${bubble.top}%;--bubble-delay:${(idx * 0.23).toFixed(2)}s;">
                  <strong>${bubble.label}</strong>
                  <span>${bubble.days}일</span>
                </div>
              `
              )
              .join("")}
          </div>
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

export function bindReportPageEvents() {
  if (typeof disposeBubbleMotion === "function") {
    disposeBubbleMotion();
    disposeBubbleMotion = null;
  }

  const host = document.querySelector(".report-v2__bubble-box");
  if (!host) return;
  const bubbles = Array.from(host.querySelectorAll(".report-v2__bubble"));
  if (!bubbles.length) return;

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const hostW = host.clientWidth;
  const hostH = host.clientHeight;
  const nodes = bubbles.map((el) => {
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const radius = width / 2;
    const leftPct = parseFloat(el.style.left || "50");
    const topPct = parseFloat(el.style.top || "50");
    const value = Number(el.getAttribute("data-value") || 1);
    const speedBase = 0.34 + Math.random() * 0.46;
    return {
      el,
      value,
      r: radius,
      mass: Math.max(1, radius * radius * 0.01),
      x: (leftPct / 100) * hostW,
      y: (topPct / 100) * hostH,
      vx: (Math.random() - 0.5) * speedBase,
      vy: (Math.random() - 0.5) * speedBase,
      drag: 0.992 + Math.random() * 0.004
    };
  });

  nodes
    .slice()
    .sort((a, b) => a.value - b.value)
    .forEach((node, idx) => {
      node.el.style.zIndex = String(10 + idx);
    });

  let rafId = 0;
  let running = true;
  const padding = 4;
  const centerX = hostW / 2;
  const centerY = hostH / 2;

  function tick() {
    if (!running) return;

    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];

      n.vx += (centerX - n.x) * 0.00035;
      n.vy += (centerY - n.y) * 0.00035;
      n.vx *= n.drag;
      n.vy *= n.drag;

      n.x += n.vx;
      n.y += n.vy;

      const minX = n.r + padding;
      const maxX = hostW - n.r - padding;
      const minY = n.r + padding;
      const maxY = hostH - n.r - padding;

      if (n.x < minX) {
        n.x = minX;
        n.vx *= -1;
      } else if (n.x > maxX) {
        n.x = maxX;
        n.vx *= -1;
      }

      if (n.y < minY) {
        n.y = minY;
        n.vy *= -1;
      } else if (n.y > maxY) {
        n.y = maxY;
        n.vy *= -1;
      }
    }

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const minDist = a.r + b.r + 16;
        if (dist >= minDist) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const impact = rvx * nx + rvy * ny;
        if (impact > 0) continue;

        const restitution = 0.98;
        const totalMass = a.mass + b.mass;
        const impulse = ((-impact * restitution) / totalMass);
        a.vx -= impulse * b.mass * nx;
        a.vy -= impulse * b.mass * ny;
        b.vx += impulse * a.mass * nx;
        b.vy += impulse * a.mass * ny;
      }
    }

    nodes.forEach((n) => {
      n.el.style.left = `${n.x}px`;
      n.el.style.top = `${n.y}px`;
    });

    rafId = window.requestAnimationFrame(tick);
  }

  rafId = window.requestAnimationFrame(tick);

  disposeBubbleMotion = function () {
    running = false;
    window.cancelAnimationFrame(rafId);
  };
}
