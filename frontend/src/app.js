import { getScreenFromHash, navigate, onRouteChange } from "./router/router.js";
import { appStore } from "./store/appStore.js";
import { getAllEntries } from "./services/localDbService.js";
import { SplashPage, bindSplashPageEvents } from "./pages/SplashPage.js";
import {
  EmotionSelectPage,
  bindEmotionSelectEvents
} from "./pages/EmotionSelectPage.js";
import { RecordMethodPage, bindRecordMethodEvents } from "./pages/RecordMethodPage.js";
import { ChatRecordPage, bindChatRecordEvents } from "./pages/ChatRecordPage.js";
import { VideoRecordPage, bindVideoRecordEvents } from "./pages/VideoRecordPage.js";
import { AnalysisPage, bindAnalysisEvents } from "./pages/AnalysisPage.js";
import { CalendarPage } from "./pages/CalendarPage.js";
import { PatternPage } from "./pages/PatternPage.js";
import { ReportPage, bindReportPageEvents } from "./pages/ReportPage.js";
import { SettingsPage, bindSettingsEvents } from "./pages/SettingsPage.js";

const appElement = () => document.getElementById("app");

function render() {
  const state = appStore.getState();
  const pages = {
    S1: SplashPage(),
    S2: EmotionSelectPage(state),
    S3: RecordMethodPage(state),
    S4chat: ChatRecordPage(state),
    S4video: VideoRecordPage(state),
    S5: AnalysisPage(state),
    S6: CalendarPage(state),
    S7: PatternPage(state),
    S8: ReportPage(state),
    S9: SettingsPage(state)
  };

  appElement().innerHTML = `<main class="mobile-shell">${pages[state.currentScreen]}</main>`;

  const binder = {
    S1: bindSplashPageEvents,
    S2: bindEmotionSelectEvents,
    S3: bindRecordMethodEvents,
    S4chat: bindChatRecordEvents,
    S4video: bindVideoRecordEvents,
    S5: bindAnalysisEvents,
    S8: bindReportPageEvents,
    S9: bindSettingsEvents
  }[state.currentScreen];

  if (binder) binder();
}

async function hydrateDashboardState() {
  const entries = await getAllEntries();
  const stats = {};
  entries.forEach((entry) => {
    stats[entry.emotion] = (stats[entry.emotion] || 0) + 1;
  });
  const total = Math.max(entries.length, 1);
  const ratio = Object.fromEntries(
    Object.entries(stats).map(([key, count]) => [key, Math.round((count / total) * 100)])
  );
  appStore.setState({
    calendarEntries: entries,
    patternStats: ratio,
    reportStats: {
      totalEntries: entries.length,
      bestEmotion: Object.keys(stats)[0] || "없음",
      streak: Math.min(entries.length, 7)
    }
  });
}

export function mountApp() {
  if (!window.location.hash) navigate("S1");
  appStore.setState({ currentScreen: getScreenFromHash() });
  onRouteChange((screen) => appStore.setState({ currentScreen: screen }));
  appStore.subscribe(() => render());
  hydrateDashboardState();
  render();
}
