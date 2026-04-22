import { TabBar } from "../components/common/TabBar.js";

/** public에 복사된 레거시 리포트 HTML (Vite는 /report 리라이트 없음 → 실제 경로 사용) */
const REPORT_FRAME_SRC = "/views/report/report.html";

/**
 * 리포트 UI는 front/views/report/report.html + report.js 단일 소스.
 * SPA에서는 동일 문서를 iframe으로만 싸서 탭바만 유지한다.
 */
export function ReportPage() {
  return `
    <section class="page page-report-embed">
      <iframe
        class="report-embed"
        title="리포트"
        src="${REPORT_FRAME_SRC}"
        referrerpolicy="same-origin"
      ></iframe>
      <footer class="report-embed__tabbar">
        ${TabBar("S8")}
      </footer>
    </section>
  `;
}

export function bindReportPageEvents() {
  /* 리포트 DOM·애니메이션은 iframe 내부 report.js가 담당 */
}
