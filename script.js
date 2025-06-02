const videoElement = document.getElementById('inputVideo');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const scoreDisplay = document.getElementById('score');

function calculateFaceScore(landmarks) {
  const getDist = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const noseTip = landmarks[1];
  const mouthLeft = landmarks[61];
  const mouthRight = landmarks[291];
  const chin = landmarks[152];

  const eyeDist = getDist(leftEye, rightEye);
  const eyeNose = getDist(noseTip, chin);
  const mouthWidth = getDist(mouthLeft, mouthRight);

  const goldenRatio = 1.618;
  let score = 100;

  const ratio1 = eyeDist / mouthWidth;
  const ratio2 = eyeNose / eyeDist;

  score -= Math.abs(ratio1 - goldenRatio) * 20;
  score -= Math.abs(ratio2 - goldenRatio) * 20;

  return Math.max(0, Math.min(100, score.toFixed(1)));
}

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults((results) => {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiFaceLandmarks.length > 0) {
    for (const landmarks of results.multiFaceLandmarks) {
      drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: '#0f0', lineWidth: 1 });
      const score = calculateFaceScore(landmarks);
      scoreDisplay.innerText = `Оценка лица: ${score}%`;
    }
  } else {
    scoreDisplay.innerText = 'Лицо не обнаружено';
  }
  canvasCtx.restore();
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 400,
  height: 300
});
camera.start();
