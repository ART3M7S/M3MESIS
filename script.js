const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const humorDiv = document.getElementById('humor');
const botoes = document.querySelectorAll('.filtro-btn');

let filtroAtual = 'none';

// Ajusta canvas ao tamanho da tela
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Troca de filtro
botoes.forEach(btn => {
  btn.addEventListener('click', () => {
    filtroAtual = btn.getAttribute('data-filter');
    video.style.filter = filtroAtual;
    canvas.style.filter = filtroAtual;
  });
});

// Configura MediaPipe FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// Função pra detectar humor pelas landmarks
function detectarHumor(landmarks) {
  // Pontos importantes: boca e sobrancelha
  const bocaEsq = landmarks[61];
  const bocaDir = landmarks[291];
  const bocaCima = landmarks[13];
  const bocaBaixo = landmarks[14];
  const sobrancelhaEsq = landmarks[70];
  const olhoEsq = landmarks[159];

  const aberturaBoca = Math.abs(bocaBaixo.y - bocaCima.y);
  const distanciaOlhoSobrancelha = Math.abs(sobrancelhaEsq.y - olhoEsq.y);

  if (aberturaBoca > 0.03) return "Feliz 😄";
  if (distanciaOlhoSobrancelha < 0.02) return "Cansado 😮‍💨";
  if (aberturaBoca < 0.01 && distanciaOlhoSobrancelha > 0.035) return "Neutro 😐";
  return "Analisando...";
}

faceMesh.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      // Desenha os pontos
      drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {color: '#00f2ff', lineWidth: 1});
      drawLandmarks(ctx, landmarks, {color: '#ff00ff', lineWidth: 1, radius: 1});

      // Detecta humor
      const humor = detectarHumor(landmarks);
      humorDiv.innerText = `Humor: ${humor}`;
    }
  }
});

// Liga a câmera
const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({image: video});
  },
  width: 1280,
  height: 720
});
camera.start();
