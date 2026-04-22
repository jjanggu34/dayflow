/**
 * Vercel 빌드: front/ → dist/ (정적 산출물만 복사)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "front");
const out = path.join(root, "dist");

fs.rmSync(out, { recursive: true, force: true });
const skip = new Set([".cursor", ".vercel", ".vscode", ".git"]);
fs.cpSync(src, out, {
  recursive: true,
  filter: (from) => {
    const rel = path.relative(src, from);
    if (!rel) return true;
    return !rel.split(path.sep).some((seg) => skip.has(seg));
  }
});
console.log("[build-static] front/ → dist/");
