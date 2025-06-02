const videoElement = document.getElementById('inputVideo');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

let camera = null;
let scores = [];

function getDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function pxToMm(px) {
  const dpi = 96; // стандартный DPI
  const mmPerPx = 25.4 / dpi; // ≈ 0.2646
  return px * mmPerPx;
}

function detectSmile(landmarks) {
  const leftMouth = landmarks[61];
  const rightMouth = landmarks[291];
  const topLip = landmarks[13];
  const bottomLip = landmarks[14];

  const mouthWidth = getDistance(leftMouth, rightMouth);
  const mouthHeight = getDistance(topLip, bottomLip);

  const ratio = mouthWidth / mouthHeight;

  if (ratio > 2.5) return 'Улыбка 😀';
  else if (ratio < 1.5) return 'Грусть 😟';
  else return 'Нейтрально 😐';
}

function updateResults(landmarks) {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const faceLeft = landmarks[234];
  const faceRight = landmarks[454];

  const eyeDistPx = getDistance(leftEye, rightEye) * canvasElement.width;
  const faceWidthPx = getDistance(faceLeft, faceRight) * canvasElement.width;

  const eyeDistMm = pxToMm(eyeDistPx).toFixed(1);
  const faceWidthMm = pxToMm(faceWidthPx).toFixed(1);

  const symmetry = 1 - Math.abs(leftEye.x - (1 - rightEye.x));
  scores.push(symmetry);
  if (scores.length > 30) scores.shift();
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;

  const emotion = detectSmile(landmarks);

  document.getElementById('eyeDistance').textContent = `${eyeDistMm} мм`;
  document.getElementById('faceWidth').textContent = `${faceWidthMm} мм`;
  document.getElementById('averageScore').textContent = (average * 100).toFixed(1) + '%';

  let emotionEl = document.getElementById('emotion');
  if (!emotionEl) {
    emotionEl = document.createElement('p');
    emotionEl.innerHTML = `<strong>Эмоция:</strong> <span id="emotion">–</span>`;
    document.querySelector('.result').appendChild(emotionEl);
  }
  emotionEl.querySelector('span').textContent = emotion;
}

function onResults(results) {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

  const landmarks = results.multiFaceLandmarks[0];

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Рисуем точки
  ctx.fillStyle = "limegreen";
  for (const point of landmarks) {
    const x = point.x * canvas.width;
    const y = point.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // 3D измерения
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const leftFace = landmarks[234];
  const rightFace = landmarks[454];

  const eyeDist = get3DDistance(leftEye, rightEye);
  const faceWidth = get3DDistance(leftFace, rightFace);

  mmPerUnit = 63 / eyeDist;

  eyeDistanceEl.textContent = (eyeDist * mmPerUnit).toFixed(1);
  faceWidthEl.textContent = (faceWidth * mmPerUnit).toFixed(1);

  const symmetry = Math.abs(landmarks[234].x - (1 - landmarks[454].x)) * 100;
  averageScoreEl.textContent = (100 - symmetry).toFixed(1) + " %";

  emotionEl.textContent = estimateEmotion(landmarks);
}


const faceMesh = new FaceMesh({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

startBtn.onclick = async () => {
  startBtn.disabled = true;
  stopBtn.disabled = false;

  camera = new Camera(videoElement, {
    onFrame: async () => {
      await faceMesh.send({ image: videoElement });
    },
    width: 640,
    height: 480
  });

  videoElement.style.display = 'none';
  await camera.start();
};

stopBtn.onclick = () => {
  stopBtn.disabled = true;
  startBtn.disabled = false;

  if (camera) {
    camera.stop();
    camera = null;
  }
};
