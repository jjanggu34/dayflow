/**
 * Copies legacy `front/views` + `front/assets` into `frontend/public/`
 * so Vite build ships static HTML routes (/chat/emotion, etc.) on Vercel.
 */
import { cpSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");
const frontRoot = join(frontendRoot, "..", "front");
const publicDir = join(frontendRoot, "public");

const viewsSrc = join(frontRoot, "views");
const assetsSrc = join(frontRoot, "assets");

if (!existsSync(viewsSrc) || !existsSync(assetsSrc)) {
  console.error(
    "[sync-legacy-front] Missing front/views or front/assets — run from repo with front/ present."
  );
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });
cpSync(viewsSrc, join(publicDir, "views"), { recursive: true });
cpSync(assetsSrc, join(publicDir, "assets"), { recursive: true });
console.log("[sync-legacy-front] synced views + assets → public/");
