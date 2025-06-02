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

function updateResults(landmarks) {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const faceLeft = landmarks[234];
  const faceRight = landmarks[454];

  const eyeDist = getDistance(leftEye, rightEye);
  const faceWidth = getDistance(faceLeft, faceRight);

  const symmetry = 1 - Math.abs(leftEye.x - (1 - rightEye.x));

  scores.push(symmetry);
  if (scores.length > 30) scores.shift();

  const average = scores.reduce((a, b) => a + b, 0) / scores.length;

  document.getElementById('eyeDistance').textContent = eyeDist.toFixed(2);
  document.getElementById('faceWidth').textContent = faceWidth.toFixed(2);
  document.getElementById('averageScore').textContent = (average * 100).toFixed(1) + '%';
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

  videoElement.style.display = 'none'; // скрыт, если не нужен
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
