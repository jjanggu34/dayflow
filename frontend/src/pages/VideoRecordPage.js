import { StepBar } from "../components/common/StepBar.js";
import { appStore } from "../store/appStore.js";
import { navigate } from "../router/router.js";
import { startCamera, stopCamera } from "../services/cameraService.js";
import { initFaceApi, detectExpression } from "../services/faceService.js";

let streamRef = null;
let timerRef = null;
const NEUTRAL_SAMPLE = {
  neutral: 0.85,
  happy: 0.05,
  sad: 0.03,
  angry: 0.03,
  fearful: 0.02,
  disgusted: 0.01,
  surprised: 0.01
};

export function VideoRecordPage(state) {
  return `
    <section class="page">
      ${StepBar({ step: 4 })}
      <div class="app-card">
        <h2>영상 기록</h2>
        <video id="videoPreview" class="video" playsinline muted></video>
        <p class="help">표정을 5초간 샘플링합니다.</p>
        <button class="btn btn-secondary" id="startVideo">측정 시작</button>
        <button class="btn btn-primary" id="videoDone" ${
          state.expressionSamples.length ? "" : "disabled"
        }>완료</button>
      </div>
    </section>
  `;
}

export function bindVideoRecordEvents() {
  const startButton = document.getElementById("startVideo");
  const doneButton = document.getElementById("videoDone");
  const videoEl = document.getElementById("videoPreview");

  startButton?.addEventListener("click", async () => {
    if (!videoEl) return;
    if (timerRef) clearInterval(timerRef);
    startButton.disabled = true;

    try {
      streamRef = await startCamera(videoEl);
    } catch (error) {
      startButton.disabled = false;
      alert("카메라 접근에 실패했어요. 브라우저 권한을 확인해 주세요.");
      return;
    }

    let useFallbackSampling = false;
    try {
      await initFaceApi();
    } catch (error) {
      useFallbackSampling = true;
    }

    const samples = [];
    let attempts = 0;
    const maxAttempts = 7;

    timerRef = setInterval(async () => {
      attempts += 1;
      let expression = null;

      if (!useFallbackSampling) {
        try {
          expression = await detectExpression(videoEl);
        } catch (error) {
          useFallbackSampling = true;
        }
      }

      if (expression) {
        samples.push(expression);
      } else if (useFallbackSampling) {
        samples.push(NEUTRAL_SAMPLE);
      }

      if (samples.length >= 5 || attempts >= maxAttempts) {
        clearInterval(timerRef);
        timerRef = null;
        stopCamera(streamRef);
        streamRef = null;
        const finalizedSamples = samples.length ? samples : [NEUTRAL_SAMPLE];
        appStore.setState({
          expressionSamples: finalizedSamples,
          diaryText: "영상 기록 완료"
        });
        startButton.disabled = false;
        doneButton?.removeAttribute("disabled");
      }
    }, 1000);
  });

  doneButton?.addEventListener("click", () => {
    if (timerRef) clearInterval(timerRef);
    timerRef = null;
    stopCamera(streamRef);
    streamRef = null;
    navigate("S5");
  });
}
