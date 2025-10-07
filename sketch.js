/* ===== util ===== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
$('#year').textContent = new Date().getFullYear();

/* ===== estado ===== */
let board = Array(9).fill('');
let human = 'X', ai = 'O';
let running = true;
let scores = { X:0, O:0, D:0 };
let difficulty = 'hard'; // <-- padrão: difícil

/* ===== elementos ===== */
const boardEl = $('#board');
const statusEl = $('#status');
const btnReset = $('#btn-reset');
const btnYou = $('#btn-you');
const btnAI = $('#btn-ai');
const promo = $('#promo');
const promoClose = $('#promo-close');
const scoreX = $('#scoreX'), scoreO = $('#scoreO'), scoreD = $('#scoreD');
const confettiCanvas = $('#confetti'), ctx = confettiCanvas.getContext('2d');
const btnHard = $('#btn-hard');

/* ===== combinações vencedoras ===== */
const WINS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

/* ===== render ===== */
function renderBoard(){
  boardEl.innerHTML = '';
  board.forEach((val, i) => {
    const cell = document.createElement('button');
    cell.className = 'cell' + (val ? ' taken played' : '');
    cell.textContent = val;
    cell.addEventListener('click', () => play(i));
    boardEl.appendChild(cell);
  });
}

/* ===== lógica ===== */
function availableMoves(b=board){
  return b.map((v,i)=>!v?i:null).filter(i=>i!==null);
}
function winner(b=board){
  for(const [a,b2,c] of WINS)
    if(b[a] && b[a]===b[b2] && b[a]===b[c]) return b[a];
  if(!availableMoves(b).length) return 'D';
  return null;
}

/* ===== IA ===== */

// IA "fácil": joga aleatoriamente, bloqueia às vezes
function easyMove() {
  const empty = availableMoves();
  // 40% de chance de tentar bloquear
  if (Math.random() < 0.4) {
    for (const [a,b,c] of WINS) {
      if (board[a] === human && board[b] === human && board[c] === "") return c;
      if (board[a] === human && board[c] === human && board[b] === "") return b;
      if (board[b] === human && board[c] === human && board[a] === "") return a;
    }
  }
  // Caso contrário, joga aleatoriamente
  return empty[Math.floor(Math.random() * empty.length)];
}

// IA "difícil" (Minimax com poda)
function minimax(b, player, alpha=-Infinity, beta=Infinity, depth=0){
  const w = winner(b);
  if(w){
    if(w===ai) return {score: 10 - depth};
    if(w===human) return {score: depth - 10};
    return {score: 0};
  }

  const moves = availableMoves(b);
  let bestMove, bestScore = (player===ai? -Infinity : Infinity);

  for(const m of moves){
    b[m] = player;
    const {score} = minimax(b, (player===ai? human : ai), alpha, beta, depth+1);
    b[m] = '';

    if(player===ai){
      if(score>bestScore){ bestScore=score; bestMove=m; }
      alpha = Math.max(alpha, score);
      if(beta<=alpha) break;
    }else{
      if(score<bestScore){ bestScore=score; bestMove=m; }
      beta = Math.min(beta, score);
      if(beta<=alpha) break;
    }
  }
  return {move: bestMove, score: bestScore};
}

/* ===== jogadas ===== */
function play(i){
  if(!running || board[i]) return;
  board[i] = human;
  renderBoard();
  const w = winner(board);
  if(w){ end(w); return; }

  statusEl.textContent = 'IA pensando...';

  requestAnimationFrame(() => {
    let move;
    if (difficulty === 'hard') {
      move = minimax([...board], ai).move;
    } else {
      move = easyMove();
    }
    if (move != null) board[move] = ai;

    renderBoard();
    const w2 = winner(board);
    end(w2);
  });
}

function end(w){
  if(!w){ statusEl.textContent = 'Sua vez!'; return; }
  running = false;
  if(w==='D'){
    statusEl.textContent = 'Empate!';
    scores.D++; scoreD.textContent = scores.D;
  }else if(w===human){
    statusEl.textContent = 'Você venceu! 🎉';
    scores.X++; scoreX.textContent = scores.X;
    showPromo();
  }else{
    statusEl.textContent = 'Você perdeu! 🤖';
    scores.O++; scoreO.textContent = scores.O;
  }
}

function reset(start='human'){
  board = Array(9).fill('');
  running = true;
  renderBoard();
  statusEl.textContent = start==='ai' ? 'IA inicia…' : 'Sua vez!';
  if(start==='ai'){
    let move;
    if (difficulty === 'hard') move = minimax([...board], ai).move;
    else move = easyMove();
    board[move ?? 4] = ai;
    renderBoard();
    statusEl.textContent = 'Sua vez!';
  }
}

/* ===== UI: toggles ===== */
btnReset.addEventListener('click', () => reset(btnAI.classList.contains('active') ? 'ai' : 'human'));
btnYou.addEventListener('click', () => {
  btnYou.classList.add('active'); btnAI.classList.remove('active');
  reset('human');
});
btnAI.addEventListener('click', () => {
  btnAI.classList.add('active'); btnYou.classList.remove('active');
  reset('ai');
});

/* ===== Dificuldade ===== */
btnHard.addEventListener('click', () => {
  if (difficulty === 'hard') {
    difficulty = 'easy';
    btnHard.textContent = 'Fácil';
    btnHard.title = 'IA casual, movimentos aleatórios';
    statusEl.textContent = 'Modo fácil ativado 😄';
  } else {
    difficulty = 'hard';
    btnHard.textContent = 'Difícil';
    btnHard.title = 'IA Minimax invencível';
    statusEl.textContent = 'Modo difícil ativado 🧠';
  }
  reset();
});

/* ===== Promo + Confete ===== */
function showPromo(){
  promo.showModal();
  startConfetti(900);
}
promoClose.addEventListener('click', () => promo.close());

let particles = [];
function startConfetti(ms=900){
  resizeCanvas();
  particles = [];
  for(let i=0;i<100;i++){
    particles.push({
      x: Math.random()*confettiCanvas.width,
      y: -10 - Math.random()*confettiCanvas.height*0.3,
      r: 2 + Math.random()*4,
      s: 2 + Math.random()*3,
      a: Math.random()*Math.PI*2
    });
  }
  const t0 = performance.now();
  function tick(t){
    const dt = (t - (startConfetti.last||t))/16;
    startConfetti.last = t;
    ctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
    particles.forEach(p=>{
      p.y += p.s*dt*0.6;
      p.x += Math.sin((p.y+p.a)/20)*1.2;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      const c = (p.x+p.y)%3;
      ctx.fillStyle = c<1 ? '#ffb400' : (c<2 ? '#1ec3ff' : '#ffffff');
      ctx.fill();
    });
    if(t - t0 < ms) requestAnimationFrame(tick);
    else ctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
  }
  requestAnimationFrame(tick);
}
function resizeCanvas(){
  confettiCanvas.width = innerWidth;
  confettiCanvas.height = innerHeight;
}
addEventListener('resize', resizeCanvas);

/* ===== inicialização ===== */
renderBoard();
statusEl.textContent = 'Sua vez!';
