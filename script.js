let video = document.getElementById("inputVideo");
let canvas = document.getElementById("outputCanvas");
let ctx = canvas.getContext("2d");

let startBtn = document.getElementById("startBtn");
let stopBtn = document.getElementById("stopBtn");

let camera = null;
let faceMesh = null;
let collecting = false;

let scores = [];
let eyeDistances = [];
let faceWidths = [];

function calculateSymmetry(landmarks) {
  let sum = 0;
  const center = 234; // Approximate nose tip
  for (let i = 0; i < landmarks.length / 2; i++) {
    let left = landmarks[i];
    let right = landmarks[landmarks.length - 1 - i];
    let dx = Math.abs(left.x - (1 - right.x));
    sum += dx;
  }
  return 1 - sum / (landmarks.length / 2);
}

function distance(p1, p2) {
  return Math.sqrt(
    (p1.x - p2.x) ** 2 +
    (p1.y - p2.y) ** 2
  ) * canvas.width;
}

function onResults(results) {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  for (const landmarks of results.multiFaceLandmarks) {
    drawConnectors(ctx, landmarks, FACEMESH_TESSELATION,
      { color: '#00FF00', lineWidth: 1 });

    if (collecting) {
      const symmetry = calculateSymmetry(landmarks);
      scores.push(symmetry);

      const leftEye = landmarks[33]; // Approx. left eye
      const rightEye = landmarks[263]; // Approx. right eye
      eyeDistances.push(distance(leftEye, rightEye));

      const leftCheek = landmarks[234]; // Approx. left face side
      const rightCheek = landmarks[454]; // Approx. right face side
      faceWidths.push(distance(leftCheek, rightCheek));
    }
  }
}

startBtn.onclick = async () => {
  startBtn.disabled = true;
  stopBtn.disabled = false;
  collecting = true;
  scores = [];
  eyeDistances = [];
  faceWidths = [];

  canvas.width = 400;
  canvas.height = 300;

  faceMesh = new FaceMesh({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

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
    width: 400,
    height: 300
  });

  camera.start();
};

stopBtn.onclick = () => {
  collecting = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  camera.stop();

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length || 0;

  document.getElementById("averageScore").textContent = avg(scores).toFixed(3);
  document.getElementById("eyeDistance").textContent = avg(eyeDistances).toFixed(1);
  document.getElementById("faceWidth").textContent = avg(faceWidths).toFixed(1);
};
