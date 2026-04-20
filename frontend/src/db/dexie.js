import Dexie from "dexie";

export const db = new Dexie("dayflowDB");

db.version(1).stores({
  entries: "++id, createdAt, emotion",
  settings: "id"
});
