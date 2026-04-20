import { db } from "../db/dexie.js";

export async function saveLocalEntry(entry) {
  return db.entries.add({
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString()
  });
}

export async function getEntriesByMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const all = await db.entries.toArray();
  return all.filter((entry) => entry.createdAt.startsWith(prefix));
}

export async function getAllEntries() {
  return db.entries.toArray();
}
