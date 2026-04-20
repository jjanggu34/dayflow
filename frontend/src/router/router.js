const SCREEN_BY_HASH = {
  "#/splash": "S1",
  "#/emotion": "S2",
  "#/record-method": "S3",
  "#/chat-record": "S4chat",
  "#/video-record": "S4video",
  "#/analysis": "S5",
  "#/calendar": "S6",
  "#/pattern": "S7",
  "#/report": "S8",
  "#/settings": "S9"
};

const HASH_BY_SCREEN = Object.fromEntries(
  Object.entries(SCREEN_BY_HASH).map(([hash, screen]) => [screen, hash])
);

export function getScreenFromHash() {
  return SCREEN_BY_HASH[window.location.hash] || "S1";
}

export function navigate(screen) {
  const hash = HASH_BY_SCREEN[screen] || "#/splash";
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}

export function onRouteChange(handler) {
  window.addEventListener("hashchange", () => handler(getScreenFromHash()));
}
