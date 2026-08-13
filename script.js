const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const humorDiv = document.getElementById('humor');
const botoes = document.querySelectorAll('.filtro-btn');
const btnEfeitos = document.getElementById('btnEfeitos');
const btnTrocarCamera = document.getElementById('btnTrocarCamera');
const menuEfeitos = document.getElementById('menuEfeitos');

let filtroAtual = 'none';
let lastHumor = "";
let frameCount = 0;
let menuAberto = false;
let usandoCameraFrontal = true;
let cameraStream = null;
let faceCamera = null;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ABRIR/FECHAR MENU
btnEfeitos.addEventListener('click', (e) => {
  if(e.target.dataset.dragging === "true") return; // não abre se estiver arrastando
  menuAberto =!menuAberto;
  menuEfeitos.className = menuAberto? 'menu-aberto' : 'menu-fechado';
  btnEfeitos.innerText = menuAberto? 'FECHAR' : 'EFEITOS';
});

// APLICAR FILTRO E FECHAR MENU
botoes.forEach(btn => {
  btn.addEventListener('click', () => {
    filtroAtual = btn.getAttribute('data-filter');
    video.style.filter = filtroAtual;
    canvas.style.filter = filtroAtual;
    menuAberto = false;
    menuEfeitos.className = 'menu-fechado';
    btnEfeitos.innerText = 'EFEITOS';
  });
});

// TROCAR CAMERA
btnTrocarCamera.addEventListener('click', () => {
  usandoCameraFrontal =!usandoCameraFrontal;
  iniciarCamera();
  if(usandoCameraFrontal) {
    video.style.transform = 'scaleX(-1)';
    canvas.style.transform = 'scaleX(-1)';
  } else {
    video.style.transform = 'scaleX(1)';
    canvas.style.transform = 'scaleX(1)';
  }
});

async function iniciarCamera() {
  if(cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: usandoCameraFrontal? "user" : "environment",
        width: 640,
        height: 480
      }
    });
    video.srcObject = cameraStream;
    humorDiv.innerText = "Humor: Detectando...";
    if(faceCamera) faceCamera.start();
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
 70, 63, 105, 107, 334, 336, 296, 300, // sobrancelha
 33, 133, 159, 145, 362, 263, 386, 374, // olho
 61, 291, 13, 14, 0, // boca
 468, 473 // pupila
];

function dist(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function detectarHumor(l) {
  const olhoDistancia = dist(l[33], l[263]);

  const bocaLargura = dist(l[61], l[291]) / olhoDistancia;
  const bocaAbertura = dist(l[13], l[14]) / olhoDistancia;
  const olhoAbertura = (dist(l[159], l[145]) + dist(l[386], l[374])) / 2 / olhoDistancia;

  // MEDIDAS PARA RAIVA
  const sobrancelhaEsq = dist(l[70], l[159]) / olhoDistancia;
  const sobrancelhaDir = dist(l[300], l[386]) / olhoDistancia;
  const sobrancelhaAltura = (sobrancelhaEsq + sobrancelhaDir) / 2;
  const sobrancelhaDistancia = dist(l[105], l[334]) / olhoDistancia;
  const pupilaTamanho = (dist(l[468], l[159]) + dist(l[473], l[386])) / 2 / olhoDistancia;

  const bocaCantoY = (l[61].y + l[291].y) / 2;
  const bocaCentroY = (l[13].y + l[14].y) / 2;

  // ========== SISTEMA DE RAIVA EM 3 NÍVEIS ==========
  let nivelRaiva = 0;
  if (sobrancelhaAltura < 0.65) nivelRaiva += 1; // sobrancelha baixa
  if (sobrancelhaDistancia < 0.35) nivelRaiva += 1; // sobrancelha juntas
  if (bocaLargura < 0.45 && bocaAbertura < 0.05) nivelRaiva += 1; // boca encolhida
  if (pupilaTamanho < 0.12) nivelRaiva += 1; // pupila pequena

  if (nivelRaiva >= 4) return `RAIVA 😡 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  if (nivelRaiva === 3) return `Raiva Moderada 😠 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  if (nivelRaiva === 2) return `Estresse 😤 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  // ========== FIM SISTEMA RAIVA ==========

  // OUTROS HUMORES
  if (olhoAbertura > 0.25 && bocaAbertura > 0.18 && sobrancelhaAltura > 0.9) return `Medo/Susto 😱 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  if (olhoAbertura > 0.22 && bocaAbertura > 0.15 && bocaLargura < 0.45) return `Surpreso 😲 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  if (bocaLargura > 0.5 && bocaCentroY > bocaCantoY) return `Feliz 😄 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  if (bocaLargura < 0.4 && bocaCentroY < bocaCantoY && olhoAbertura < 0.18) return `Triste 😔 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  if (olhoAbertura < 0.12) return `Cansado 😮‍💨 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
  if (Math.abs(l[61].y - l[291].y) / olhoDistancia > 0.08) return `Nojo 🤢 Pupila:${(pupilaTamanho*100).toFixed(0)}`;

  return `Neutro 😐 Pupila:${(pupilaTamanho*100).toFixed(0)}`;
}

faceMesh.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (results.multiFaceLandmarks) {
    for (const l of results.multiFaceLandmarks) {
      ctx.fillStyle = '#00f2ff';
      PONTOS_CHAVE.forEach(i => {
        if(l[i]) {
          const p = l[i];
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, i >= 468? 2 : 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l[61].x * canvas.width, l[61].y * canvas.height);
      ctx.lineTo(l[291].x * canvas.width, l[291].y * canvas.height);
      ctx.stroke();

      frameCount++;
      if (frameCount % 4 === 0) {
        const humor = detectarHumor(l);
        if (humor!== lastHumor) {
          humorDiv.innerText = `Humor: ${humor}`;
          lastHumor = humor;
        }
      }
    }
  }
});

video.onloadedmetadata = () => {
  faceCamera = new Camera(video, {
    onFrame: async () => { await faceMesh.send({image: video}); },
    width: 640, height: 480
  });
  faceCamera.start();
}

iniciarCamera();

// ========== FUNÇÃO PRA DEIXAR O BOTÃO ARRASTÁVEL ==========
function tornarArrastavel(elemento) {
  let offsetX, offsetY, isDragging = false;

  const start = (e) => {
    isDragging = true;
    elemento.dataset.dragging = "true";
    const rect = elemento.getBoundingClientRect();
    offsetX = (e.touches? e.touches[0].clientX : e.clientX) - rect.left;
    offsetY = (e.touches? e.touches[0].clientY : e.clientY) - rect.top;
    elemento.style.cursor = 'grabbing';
  }

  const move = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = (e.touches? e.touches[0].clientX : e.clientX) - offsetX;
    const y = (e.touches? e.touches[0].clientY : e.clientY) - offsetY;
    elemento.style.left = x + 'px';
    elemento.style.right = 'auto';
    elemento.style.top = y + 'px';
    elemento.style.bottom = 'auto';
  }

  const end = () => {
    setTimeout(() => elemento.dataset.dragging = "false", 100); // delay pra não abrir o menu
    isDragging = false;
    elemento.style.cursor = 'grab';
  }

  elemento.addEventListener('mousedown', start);
  elemento.addEventListener('touchstart', start);
  document.addEventListener('mousemove', move);
  document.addEventListener('touchmove', move, {passive: false});
  document.addEventListener('mouseup', end);
  document.addEventListener('touchend', end);
}

tornarArrastavel(btnEfeitos);
tornarArrastavel(btnTrocarCamera);
// ========== FIM FUNÇÃO ARRASTAR ==========
