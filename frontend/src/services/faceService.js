let initialized = false;

export async function initFaceApi() {
  if (initialized) return;
  const faceapi = await import("face-api.js");
  const modelPath = "/models/face-api";
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
  initialized = true;
}

export async function detectExpression(videoEl) {
  const faceapi = await import("face-api.js");
  const result = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceExpressions();
  return result?.expressions || null;
}
