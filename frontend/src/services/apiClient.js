const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "API 요청 실패");
  }

  if (response.status === 204) return null;
  return response.json();
}
