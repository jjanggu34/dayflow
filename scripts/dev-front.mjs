/**
 * 로컬 정적 서버 — vercel.json 과 동일한 친숙 URL로 front/ 서빙
 * 예: http://localhost:5182/chat/emotion , http://localhost:5182/report
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontRoot = path.resolve(__dirname, "..", "front");
const PORT = Number(process.env.PORT || 5182);

/** 긴 경로 우선 매칭 */
const rewrites = [
  ["/chat/emotion", "/views/chat/emotion.html"],
  ["/chat/result", "/views/chat/result.html"],
  ["/chat", "/views/chat/chat.html"],
  ["/login", "/views/login.html"],
  ["/home", "/views/home/home.html"],
  ["/main", "/views/main/main.html"],
  ["/report", "/views/report/report.html"],
  ["/report/report", "/views/report/report.html"],
  ["/advice/advice", "/views/advice/advice.html"],
  ["/advice", "/views/advice/advice.html"],
  ["/exchange/room", "/views/exchange/room.html"],
  ["/exchange", "/views/exchange/exchange.html"],
  ["/my/chat-list", "/views/my/chat-list.html"],
  ["/my", "/views/my/my.html"],
  ["/", "/index.html"]
];

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff"
};

function normalizePath(urlPath) {
  let p = path.posix.normalize((urlPath.split("?")[0] || "/").replace(/\/+/g, "/"));
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

/** 친숙 URL만 rewrite; 나머지(/assets/…)는 그대로 파일 경로 */
function resolvePath(pathname) {
  for (const [from, to] of rewrites) {
    if (pathname === from) return to;
  }
  return pathname;
}

function fileUnderRoot(filePath) {
  const resolved = path.resolve(frontRoot, "." + filePath);
  if (!resolved.startsWith(frontRoot)) return null;
  return resolved;
}

function serveEnvJs(res) {
  var key = String(process.env.DAYFLOW_KAKAO_JS_KEY || "").trim();
  var body =
    "(function (g) {\n" +
    '  g.__ENV__ = g.__ENV__ || {};\n' +
    "  g.__ENV__.DAYFLOW_KAKAO_JS_KEY = " +
    JSON.stringify(key) +
    ";\n" +
    "})(typeof window !== 'undefined' ? window : this);\n";
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.writeHead(200).end(body);
}

const server = http.createServer((req, res) => {
  const pathname = normalizePath(new URL(req.url || "/", `http://127.0.0.1`).pathname);
  if (pathname === "/env.js") {
    serveEnvJs(res);
    return;
  }
  const logical = resolvePath(pathname);
  const abs = fileUnderRoot(logical);
  if (!abs) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(abs, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(500).end(String(err.message));
      return;
    }
    const ext = path.extname(abs).toLowerCase();
    res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
    /* 로컬에서 JS/CSS가 디스크 캐시·SW 조합으로 갱신 안 되는 경우 방지 */
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.writeHead(200).end(data);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`포트 ${PORT} 사용 중입니다. 예: PORT=5180 npm run dev`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`DAYFLOW front — http://localhost:${PORT}/`);
  if (!process.env.DAYFLOW_KAKAO_JS_KEY) {
    console.log(`  (선택) Kakao: DAYFLOW_KAKAO_JS_KEY=... 를 설정하면 /env.js 로 주입됩니다.`);
  }
  console.log(`  /chat/emotion → /chat → /chat/result (감정→대화→분석 순서)`);
  console.log(`  /report         → 리포트`);
  console.log(`  /report/report  → 리포트(별칭)`);
  console.log(`  /main           → 메인(캘린더)`);
  console.log(`  /advice         → 조언`);
  console.log(`  /advice/advice  → 조언(별칭)`);
  console.log(`  /my/chat-list   → 감정기록 목록`);
  console.log(`  /exchange       → 교환일기(생성/입장)`);
});
