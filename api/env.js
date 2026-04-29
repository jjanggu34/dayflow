/* 런타임 환경값 주입 — 브라우저에서 window.__ENV__ 로만 노출
 * Vercel: Settings → Environment Variables 에 DAYFLOW_KAKAO_JS_KEY 설정 */
module.exports = (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).setHeader("Allow", "GET, OPTIONS").end("Method Not Allowed");
    return;
  }

  var key = String(process.env.DAYFLOW_KAKAO_JS_KEY || "").trim();

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.status(200).end(
    "(function (g) {\n" +
      '  g.__ENV__ = g.__ENV__ || {};\n' +
      "  g.__ENV__.DAYFLOW_KAKAO_JS_KEY = " +
      JSON.stringify(key) +
      ";\n" +
      "})(typeof window !== 'undefined' ? window : this);\n"
  );
};
