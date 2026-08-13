const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const humorDiv = document.getElementById('humor');
const botoes = document.querySelectorAll('.filtro-btn');

let filtroAtual = 'none';
let lastHumor = "";
let frameCount = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

botoes.forEach(btn => {
  btn.addEventListener('click', () => {
    filtroAtual = btn.getAttribute('data-filter');
    video.style.filter = filtroAtual;
    canvas.style.filter = filtroAtual;
  });
});

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: false, // desliga íris pra ficar mais leve
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// Pontos chave pra humor: sobrancelha, olho, boca
const PONTOS_CHAVE = [
  70, 63, 105, 66, 107, // sobrancelha esq
  336, 296, 334, 293, 300, // sobrancelha dir
  159, 145, // olho esq
 386, 374, // olho dir
 61, 291, 13, 14, 17, 0 // boca
];

function detectarHumor(landmarks) {
  const bocaEsq = landmarks[61];
  const bocaDir = landmarks[291];
  const bocaCima = landmarks[13];
  const bocaBaixo = landmarks[14];
  const sobrancelhaEsq = landmarks[70];
  const olhoEsq = landmarks[159];

  const aberturaBoca = Math.abs(bocaBaixo.y - bocaCima.y);
  const distanciaOlhoSobrancelha = Math.abs(sobrancelhaEsq.y - olhoEsq.y);
  const sorriso = Math.abs(bocaDir.x - bocaEsq.x);

  if (aberturaBoca > 0.035) return "Surpreso 😲";
  if (sorriso > 0.08 && aberturaBoca > 0.015) return "Feliz 😄";
  if (distanciaOlhoSobrancelha < 0.018) return "Cansado 😮‍💨";
  if (distanciaOlhoSobrancelha > 0.04) return "Bravo 😠";
  return "Neutro 😐";
}

faceMesh.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      // 1. Desenha SÓ os pontos chave
      ctx.fillStyle = '#00f2ff';
      PONTOS_CHAVE.forEach(i => {
        const p = landmarks[i];
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      // 2. Desenha SÓ 3 linhas: boca, sobrancelha esq, sobrancelha dir
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;
      
      // Linha da boca
      ctx.beginPath();
      ctx.moveTo(landmarks[61].x * canvas.width, landmarks[61].y * canvas.height);
      ctx.lineTo(landmarks[291].x * canvas.width, landmarks[291].y * canvas.height);
      ctx.stroke();
      
      // Linha sobrancelha
      ctx.beginPath();
      ctx.moveTo(landmarks[70].x * canvas.width, landmarks[70].y * canvas.height);
      ctx.lineTo(landmarks[107].x * canvas.width, landmarks[107].y * canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(landmarks[336].x * canvas.width, landmarks[336].y * canvas.height);
      ctx.lineTo(landmarks[300].x * canvas.width, landmarks[300].y * canvas.height);
      ctx.stroke();

      // 3. Detecta humor só a cada 5 frames pra não travar
      frameCount++;
      if (frameCount % 5 === 0) {
        const humor = detectarHumor(landmarks);
        if (humor !== lastHumor) {
          humorDiv.innerText = `Humor: ${humor}`;
          lastHumor = humor;
        }
      }
    }
  }
});

// Câmera em resolução menor = mais FPS
const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({image: video});
  },
  width: 640,  // era 1280. Menor = mais rápido
  height: 480
});
camera.start();
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
