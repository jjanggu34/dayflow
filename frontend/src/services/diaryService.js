import { apiFetch } from "./apiClient.js";

export function createDiaryEntry(payload) {
  return apiFetch("/api/diary", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
