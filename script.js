const videoElement = document.getElementById('inputVideo');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

let camera = null;
let scores = [];

const REAL_EYE_DISTANCE_MM = 63; // среднее расстояние между глазами в мм

function get3DDistance(p1, p2) {
  return Math.sqrt(
    (p1.x - p2.x) ** 2 +
    (p1.y - p2.y) ** 2 +
    (p1.z - p2.z) ** 2
  );
}

function detectSmile(landmarks) {
  const leftMouth = landmarks[61];
  const rightMouth = landmarks[291];
  const topLip = landmarks[13];
  const bottomLip = landmarks[14];

  const mouthWidth = get3DDistance(leftMouth, rightMouth);
  const mouthHeight = get3DDistance(topLip, bottomLip);

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

  // 3D расстояния
  const eyeDist3D = get3DDistance(leftEye, rightEye);
  const faceWidth3D = get3DDistance(faceLeft, faceRight);

  // масштаб мм на 1 "единицу"
  const mmPerUnit = REAL_EYE_DISTANCE_MM / eyeDist3D;

  // пересчет в мм
  const eyeDistMm = (eyeDist3D * mmPerUnit).toFixed(1);
  const faceWidthMm = (faceWidth3D * mmPerUnit).toFixed(1);

  // симметрия в 2D для простоты
  const symmetry = 1 - Math.abs(leftEye.x - (1 - rightEye.x));
  scores.push(symmetry);
  if (scores.length > 30) scores.shift();
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;

  const emotion = detectSmile(landmarks);

  document.getElementById('eyeDistance').textContent = eyeDistMm;
  document.getElementById('faceWidth').textContent = faceWidthMm;
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
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    updateResults(landmarks);

    canvasCtx.strokeStyle = '#00FF00';
    canvasCtx.lineWidth = 1;
    for (let point of landmarks) {
      canvasCtx.beginPath();
      canvasCtx.arc(point.x * canvasElement.width, point.y * canvasElement.height, 1.5, 0, 2 * Math.PI);
      canvasCtx.stroke();
    }
  }

  canvasCtx.restore();
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
