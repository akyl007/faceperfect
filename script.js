const video = document.getElementById("inputVideo");
const canvas = document.getElementById("outputCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

const averageScoreEl = document.getElementById("averageScore");
const eyeDistanceEl = document.getElementById("eyeDistance");
const faceWidthEl = document.getElementById("faceWidth");
const emotionEl = document.getElementById("emotion");

let camera = null;
let faceMesh = null;
let running = false;
let mmPerUnit = 1;

function get3DDistance(p1, p2) {
  return Math.sqrt(
    (p1.x - p2.x) ** 2 +
    (p1.y - p2.y) ** 2 +
    (p1.z - p2.z) ** 2
  );
}

function estimateEmotion(landmarks) {
  const mouthLeft = landmarks[61];
  const mouthRight = landmarks[291];
  const upperLip = landmarks[13];
  const lowerLip = landmarks[14];

  const mouthWidth = get3DDistance(mouthLeft, mouthRight);
  const mouthOpen = get3DDistance(upperLip, lowerLip);

  const ratio = mouthOpen / mouthWidth;

  return ratio > 0.35 ? "Улыбка" : "Нейтральное";
}

function onResults(results) {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

  const landmarks = results.multiFaceLandmarks[0];

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Опорные точки
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const leftFace = landmarks[234];
  const rightFace = landmarks[454];

  const eyeDist = get3DDistance(leftEye, rightEye);
  const faceWidth = get3DDistance(leftFace, rightFace);

  // Калибровка: между зрачками ≈ 63 мм
  mmPerUnit = 63 / eyeDist;

  eyeDistanceEl.textContent = (eyeDist * mmPerUnit).toFixed(1);
  faceWidthEl.textContent = (faceWidth * mmPerUnit).toFixed(1);

  // Симметрия (разница по x между точками слева и справа)
  const symmetry = Math.abs(landmarks[234].x - (1 - landmarks[454].x)) * 100;
  averageScoreEl.textContent = (100 - symmetry).toFixed(1) + " %";

  // Эмоции
  emotionEl.textContent = estimateEmotion(landmarks);
}

function startAnalyzer() {
  if (running) return;

  faceMesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  faceMesh.onResults(onResults);

  camera = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480
  });
  camera.start();

  running = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
}

function stopAnalyzer() {
  if (!running) return;

  camera.stop();
  running = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

startBtn.addEventListener("click", startAnalyzer);
stopBtn.addEventListener("click", stopAnalyzer);
