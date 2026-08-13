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
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

const PONTOS_CHAVE = [
 70, 63, 105, 107, 336, 296, 300, // sobrancelha
  33, 133, 159, 145, 362, 263, 386, 374, // olho
  61, 291, 13, 14, 0, // boca
 468, 473 // pupila
];

function dist(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function detectarHumor(l) {
  // NORMALIZA tudo pela distância entre os olhos. Assim funciona em qualquer celular
  const olhoDistancia = dist(l[33], l[263]); 
  
  const bocaLargura = dist(l[61], l[291]) / olhoDistancia;
  const bocaAbertura = dist(l[13], l[14]) / olhoDistancia;
  const olhoAbertura = (dist(l[159], l[145]) + dist(l[386], l[374])) / 2 / olhoDistancia;
  const sobrancelhaAltura = (dist(l[70], l[159]) + dist(l[300], l[386])) / 2 / olhoDistancia;
  const pupilaTamanho = (dist(l[468], l[159]) + dist(l[473], l[386])) / 2 / olhoDistancia;
  
  const bocaCantoY = (l[61].y + l[291].y) / 2;
  const bocaCentroY = (l[13].y + l[14].y) / 2;

  // REGRAS CALIBRADAS - Ordem importa!

  // 1. MEDO/SUSTO: Olho BEM aberto + Boca aberta + Sobrancelha lá em cima
  if (olhoAbertura > 0.25 && bocaAbertura > 0.18 && sobrancelhaAltura > 0.9) {
    return `Medo/Susto 😱 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  }

  // 2. SURPRESA: Olho aberto + Boca em O
  if (olhoAbertura > 0.22 && bocaAbertura > 0.15 && bocaLargura < 0.45) {
    return `Surpreso 😲 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  }

  // 3. FELIZ: Boca larga + cantos pra cima
  if (bocaLargura > 0.5 && bocaCentroY > bocaCantoY) {
    return `Feliz 😄 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  }

  // 4. TRISTE: Boca pra baixo + olho semi-fechado
  if (bocaLargura < 0.4 && bocaCentroY < bocaCantoY && olhoAbertura < 0.18) {
    return `Triste 😔 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  }

  // 5. BRAVO: Sobrancelha franzida + boca tensa
  if (sobrancelhaAltura < 0.65 && bocaLargura < 0.45) {
    return `Bravo 😠 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  }

  // 6. CANSADO: Olho muito fechado
  if (olhoAbertura < 0.12) {
    return `Cansado 😮‍💨 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  }

  // 7. NOJO: Boca torta
  if (Math.abs(l[61].y - l[291].y) / olhoDistancia > 0.08) {
    return `Nojo 🤢 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  }

  return `Neutro 😐 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
}

faceMesh.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiFaceLandmarks) {
    for (const l of results.multiFaceLandmarks) {
      // Desenha pontos
      ctx.fillStyle = '#00f2ff';
      PONTOS_CHAVE.forEach(i => {
        if(l[i]) {
          const p = l[i];
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, i >= 468? 2 : 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Linhas guia
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l[61].x * canvas.width, l[61].y * canvas.height);
      ctx.lineTo(l[291].x * canvas.width, l[291].y * canvas.height);
      ctx.stroke();

      frameCount++;
      if (frameCount % 4 === 0) { // mais responsivo
        const humor = detectarHumor(l);
        if (humor !== lastHumor) {
          humorDiv.innerText = `Humor: ${humor}`;
          lastHumor = humor;
        }
      }
    }
  }
});

video.onloadedmetadata = () => {
  const camera = new Camera(video, {
    onFrame: async () => { await faceMesh.send({image: video}); },
    width: 640, height: 480
  });
  camera.start();
}

iniciarCamera();
