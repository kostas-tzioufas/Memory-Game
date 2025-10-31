// ------------ Dynamic IMAGE_POOL via picsum seeds ------------
const POOL_SIZE = 8;

function generateImagePool(n = POOL_SIZE) {
  const pool = [];
  for (let i = 0; i < n; i++) {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`;
    // unique seed per image, portrait 3:4
    pool.push(`https://picsum.photos/seed/${seed}/400/600`);
  }
  console.log("New IMAGE_POOL:", pool);
  return pool;
}

// Will fill in initGame({ regenPool: true }) ONLY on first load/real refresh
let IMAGE_POOL = [];
const MAX_UPLOADS = 10;

// ------------ State ------------
let uploadCount = 0, moves = 0, misses = 0, matchedCount = 0;
let flippedCards = [], gameFinished = false;

// Open-count per specific DOM card (not per image)
const cardOpenCounts = new Map();
let nextCardId = 1;

// ------------ Elements ------------
const grid = document.getElementById("grid");
const statsText = document.getElementById("statsText");
const menuBtn = document.getElementById("menuBtn");
const gameMenu = document.getElementById("gameMenu");

const flipSound = document.getElementById("flipSound");
const matchSound = document.getElementById("matchSound");
const wrongSound = document.getElementById("wrongSound");
const winSound = document.getElementById("winSound");

// ---------- Header ticker: rotate messages on each scroll loop ----------
const tickerEl = document.querySelector('header .scroll-text');
if (tickerEl) {
  const tickerMessages = [
    "Custom Memory Game — Play with the default images or upload your own",
    "After all pairs are found, you can click or tap any card to view it enlarged.",
    "You can upload up to 10 of your own images to replace the existing ones.",
    "Each time you refresh the page or click the New button, uploaded images are cleared and a new game with different images starts."
  ];

  let tickerIndex = 0;
  tickerEl.textContent = tickerMessages[tickerIndex];

  // change message at the end of each marquee loop
  tickerEl.addEventListener("animationiteration", () => {
    tickerIndex = (tickerIndex + 1) % tickerMessages.length;
    tickerEl.textContent = tickerMessages[tickerIndex];
  });
}

// ------------ Helpers ------------
function shuffle(a){ return a.sort(() => Math.random() - .5); }

function updateStats(){
  statsText.textContent = `Moves: ${moves} | Misses: ${misses} | Uploads: ${uploadCount}/${MAX_UPLOADS}`;
}

function showMessage(t, persist=false){
  statsText.textContent = t;
  clearTimeout(statsText._hideTo);
  if (!persist) statsText._hideTo = setTimeout(updateStats, 3000);
}

function inc(map, key){
  map.set(key, (map.get(key) || 0) + 1);
}

// ------------ Game ------------
function initGame({ regenPool = false } = {}) {
  // New pool only when explicitly requested (first load/real refresh)
  if (regenPool) IMAGE_POOL = generateImagePool(POOL_SIZE);

  grid.innerHTML = "";
  flippedCards = [];
  cardOpenCounts.clear();
  matchedCount = 0;
  moves = 0;
  misses = 0;
  gameFinished = false;
  nextCardId = 1;
  updateStats();

  // volumes
  flipSound.volume = 0.5;
  matchSound.volume = 0.2;
  wrongSound.volume = 0.2;
  winSound.volume = 0.5;

  // Pick 4 random from the pool and duplicate for 8 cards
  const sel = shuffle([...IMAGE_POOL]).slice(0, 4);
  const imgs = shuffle([...sel, ...sel]);

  imgs.forEach(src => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.image = src;

    const cid = String(nextCardId++);
    card.dataset.cid = cid;
    cardOpenCounts.set(cid, 0);

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const front = document.createElement("div");
    front.className = "card-face card-front";

    const back = document.createElement("div");
    back.className = "card-face card-back";

    const img = document.createElement("img");
    img.src = src;

    back.appendChild(img);
    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener("click", () => flipCard(card));
    grid.appendChild(card);
  });
}

function flipCard(c){
  if (flippedCards.length === 2 || c.classList.contains("flipped")) return;
  c.classList.add("flipped");
  flipSound.play();
  flippedCards.push(c);
  if (flippedCards.length === 2){
    moves++;
    updateStats();
    checkMatch();
  }
}

function checkMatch(){
  const [c1, c2] = flippedCards;
  const img1 = c1.dataset.image, img2 = c2.dataset.image;
  const cid1 = c1.dataset.cid, cid2 = c2.dataset.cid;

  const c1SeenBefore = (cardOpenCounts.get(cid1) || 0) > 0;
  const c2SeenBefore = (cardOpenCounts.get(cid2) || 0) > 0;
  const anyCardSeenBefore = c1SeenBefore || c2SeenBefore;

  if (img1 === img2){
    matchSound.play();
    matchedCount += 2;
    flippedCards = [];

    // consistency
    inc(cardOpenCounts, cid1);
    inc(cardOpenCounts, cid2);

    if (matchedCount === 8){
      gameFinished = true;
      winSound.play();
      showMessage(`🎉 All card pairs were found with ${misses} misses in ${moves} moves!`, true);
      enableZoom();
    }
  } else {
    if (anyCardSeenBefore) misses++;

    wrongSound.play();
    setTimeout(() => {
      c1.classList.remove("flipped");
      c2.classList.remove("flipped");
      flippedCards = [];
      updateStats();
    }, 1000);

    inc(cardOpenCounts, cid1);
    inc(cardOpenCounts, cid2);
  }
}

function enableZoom(){
  document.querySelectorAll(".card-back img").forEach(img => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => {
      if (gameFinished){
        const l = document.getElementById("lightbox");
        const li = document.getElementById("lightbox-img");
        // safe replace to upscale to 800x1200 (keeps any query string)
        li.src = img.src.replace(/\/(\d+)\/(\d+)(\?.*)?$/, "/800/1200$3");
        l.classList.add("active");
      }
    }, { once: false });
  });
}

// ---- Pressed effect on buttons (works on mobile & keyboard) ----
function addPressEffect(btn) {
  if (!btn) return;
  btn.addEventListener('pointerdown', () => btn.classList.add('pressed'));
  ['pointerup','pointerleave','pointercancel','blur'].forEach(ev =>
    btn.addEventListener(ev, () => btn.classList.remove('pressed'))
  );
  // Keyboard accessibility
  btn.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') btn.classList.add('pressed');
  });
  btn.addEventListener('keyup', () => btn.classList.remove('pressed'));
}

// ------------ UI bindings ------------
menuBtn.onclick = e => {
  e.stopPropagation();
  gameMenu.classList.toggle("open");
};
document.onclick = e => {
  if (!gameMenu.contains(e.target) && e.target !== menuBtn)
    gameMenu.classList.remove("open");
};
// --- Make bottom buttons equal width (match Upload) ---
function syncButtonWidths() {
  const uploadBtn = document.getElementById('uploadBtn');
  const restartBtn = document.getElementById('restartBtn');
  const newBtn = document.getElementById('newBtn');
  if (!uploadBtn || !restartBtn || !newBtn) return;

  // reset any inline widths to let the browser measure natural width of "Upload"
  [restartBtn, uploadBtn, newBtn].forEach(b => b.style.width = '');

  const w = uploadBtn.getBoundingClientRect().width;
  [restartBtn, uploadBtn, newBtn].forEach(b => b.style.width = `${w}px`);
}

window.addEventListener('load', syncButtonWidths);
window.addEventListener('resize', syncButtonWidths);


// About/Contact links
document.getElementById("aboutAction").onclick = () =>
  window.open("about.html#about", "_blank");
document.getElementById("contactAction").onclick = () =>
  window.open("about.html#contact", "_blank");

document.getElementById("closeLightbox").onclick = () =>
  document.getElementById("lightbox").classList.remove("active");
document.getElementById("lightbox").onclick = e => {
  if (e.target.id === "lightbox") e.currentTarget.classList.remove("active");
};

// Restart: new game WITHOUT changing pool
document.getElementById("restartBtn").onclick = () => {
  showMessage("🔄 Game restarted!");
  initGame({ regenPool: false });
};

// Upload
document.getElementById("uploadBtn").onclick = () =>
  document.getElementById("upload").click();

document.getElementById("upload").onchange = e => {
  const f = [...e.target.files];
  if (!f.length) return;
  let added = 0;
  for (const file of f){
    if (uploadCount >= MAX_UPLOADS){
      showMessage("⚠️ Max uploads (10)!");
      break;
    }
    const url = URL.createObjectURL(file);
    if (IMAGE_POOL.length >= POOL_SIZE) IMAGE_POOL.shift();
    IMAGE_POOL.push(url);
    uploadCount++;
    added++;
  }
  if (added > 0){
    showMessage(`✅ ${added} new image${added > 1 ? "s" : ""} added!`);
    initGame({ regenPool: false });
  }
};

// New: do an actual page refresh
document.getElementById("newBtn").onclick = () => {
  location.reload();
};

// Apply pressed effect to the three buttons
addPressEffect(document.getElementById('restartBtn'));
addPressEffect(document.getElementById('uploadBtn'));
addPressEffect(document.getElementById('newBtn'));

// ------------ Start ------------
document.addEventListener('DOMContentLoaded', () => {
  // First load / real refresh => new IMAGE_POOL
  initGame({ regenPool: true });
});
