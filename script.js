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

async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 }
    });
    video.srcObject = stream;
    humorDiv.innerText = "Humor: Detectando...";
  } catch (err) {
    humorDiv.innerText = "Erro: Permita a câmera!";
    alert("Erro câmera: " + err.name);
  }
}

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true, // Liga íris pra tentar pegar pupila
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// Pontos chave expandidos
const PONTOS_CHAVE = [
  // Sobrancelhas
  70, 63, 105, 66, 107, 336, 296, 334, 293, 300,
  // Olhos
  33, 133, 159, 145, 362, 263, 386, 374,
  // Boca
 61, 291, 13, 14, 17, 0, 40, 270,
  // Íris / Pupila
 468, 469, 470, 471, 472, 473, 474, 475, 476, 477
];

function calcularDistancia(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function detectarHumor(landmarks) {
  // Medidas principais
  const bocaLargura = calcularDistancia(landmarks[61], landmarks[291]);
  const bocaAbertura = calcularDistancia(landmarks[13], landmarks[14]);
  const olhoEsqAbertura = calcularDistancia(landmarks[159], landmarks[145]);
  const olhoDirAbertura = calcularDistancia(landmarks[386], landmarks[374]);
  const olhoAberturaMedia = (olhoEsqAbertura + olhoDirAbertura) / 2;

  const sobrancelhaEsqAltura = calcularDistancia(landmarks[70], landmarks[159]);
  const sobrancelhaDirAltura = calcularDistancia(landmarks[336], landmarks[386]);
  const sobrancelhaMedia = (sobrancelhaEsqAltura + sobrancelhaDirAltura) / 2;

  // Pupila - usa o ponto central da íris
  const pupilaEsq = landmarks[468];
  const pupilaDir = landmarks[473];
  const tamanhoPupila = (calcularDistancia(pupilaEsq, landmarks[159]) + calcularDistancia(pupilaDir, landmarks[386])) / 2;

  // 1. MEDO / SUSTO: Olho muito aberto + boca aberta + pupila dilatada + sobrancelha alta
  if (olhoAberturaMedia > 0.025 && bocaAbertura > 0.025 && sobrancelhaMedia > 0.06) {
    return `Medo/Susto 😱 Pupila: ${(tamanhoPupila*1000).toFixed(1)}`;
  }

  // 2. SURPRESA: Olho aberto + boca aberta em "O" + sobrancelha alta
  if (olhoAberturaMedia > 0.022 && bocaAbertura > 0.03 && bocaLargura < 0.08) {
    return `Surpreso 😲 Pupila: ${(tamanhoPupila*1000).toFixed(1)}`;
  }

  // 3. FELIZ: Boca larga + olho normal
  if (bocaLargura > 0.09 && bocaAbertura > 0.01) {
    return `Feliz 😄 Pupila: ${(tamanhoPupila*1000).toFixed(1)}`;
  }

  // 4. TRISTE: Boca pra baixo + olho semi-fechado
  if (bocaLargura < 0.06 && landmarks[14].y > landmarks[13].y + 0.01) {
    return `Triste 😔 Pupila: ${(tamanhoPupila*1000).toFixed(1)}`;
  }

  // 5. BRAVO: Sobrancelha baixa + boca tensa
  if (sobrancelhaMedia < 0.03 && bocaLargura < 0.07) {
    return `Bravo 😠 Pupila: ${(tamanhoPupila*1000).toFixed(1)}`;
  }

  // 6. CANSADO: Olho muito fechado
  if (olhoAberturaMedia < 0.012) {
    return `Cansado 😮‍💨 Pupila: ${(tamanhoPupila*1000).toFixed(1)}`;
  }

  // 7. NOJO: Nariz franzido = boca torta
  if (Math.abs(landmarks[61].y - landmarks[291].y) > 0.015) {
    return `Nojo 🤢 Pupila: ${(tamanhoPupila*1000).toFixed(1)}`;
  }

  return `Neutro 😐 Pupila: ${(tamanhoPupila*1000).toFixed(1)}`;
}

faceMesh.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      // Desenha pontos
      ctx.fillStyle = '#00f2ff';
      PONTOS_CHAVE.forEach(i => {
        if(landmarks[i]) {
          const p = landmarks[i];
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, i >= 468? 2 : 3, 0, 2 * Math.PI); // pupila menor
          ctx.fill();
        }
      });

      // Desenha linhas principais
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;

      // Boca
      ctx.beginPath();
      ctx.moveTo(landmarks[61].x * canvas.width, landmarks[61].y * canvas.height);
      ctx.lineTo(landmarks[291].x * canvas.width, landmarks[291].y * canvas.height);
      ctx.stroke();

      // Olhos
      ctx.beginPath();
      ctx.moveTo(landmarks[33].x * canvas.width, landmarks[33].y * canvas.height);
      ctx.lineTo(landmarks[133].x * canvas.width, landmarks[133].y * canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(landmarks[362].x * canvas.width, landmarks[362].y * canvas.height);
      ctx.lineTo(landmarks[263].x * canvas.width, landmarks[263].y * canvas.height);
      ctx.stroke();

      frameCount++;
      if (frameCount % 6 === 0) { // mais leve ainda
        const humor = detectarHumor(landmarks);
        if (humor!== lastHumor) {
          humorDiv.innerText = `Humor: ${humor}`;
          lastHumor = humor;
        }
      }
    }
  }
});

video.onloadedmetadata = () => {
  const camera = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({image: video});
    },
    width: 640,
    height: 480
  });
  camera.start();
}

iniciarCamera();
