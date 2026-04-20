const initialUi = {
  loading: false,
  toast: ""
};

let uiState = { ...initialUi };
const listeners = new Set();

export const uiStore = {
  getState() {
    return uiState;
  },
  setState(partial) {
    uiState = { ...uiState, ...partial };
    listeners.forEach((listener) => listener(uiState));
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
