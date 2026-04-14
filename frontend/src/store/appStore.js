const initialState = {
  currentScreen: "S1",
  selectedEmotion: "",
  recordMethod: "",
  diaryText: "",
  chatMessages: [],
  chatFollowIndex: 0,
  expressionSamples: [],
  analysisResult: null,
  calendarEntries: [],
  patternStats: null,
  reportStats: null,
  settings: {
    reminderEnabled: true,
    reminderTime: "21:00",
    darkMode: false
  }
};

let state = { ...initialState };
const listeners = new Set();

export const appStore = {
  getState() {
    return state;
  },
  setState(partial) {
    state = { ...state, ...partial };
    listeners.forEach((listener) => listener(state));
  },
  resetForNewEntry() {
    state = {
      ...state,
      selectedEmotion: "",
      recordMethod: "",
      diaryText: "",
      chatMessages: [],
      chatFollowIndex: 0,
      expressionSamples: [],
      analysisResult: null
    };
    listeners.forEach((listener) => listener(state));
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
