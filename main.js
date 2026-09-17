const canvas = document.getElementById("loveCanvas");
const ctx = canvas.getContext("2d");

const envWrap = document.getElementById("envelopeWrap");
const envClosed = document.getElementById("envClosed");
const envOpened = document.getElementById("envOpened");

const tapHint = document.getElementById("tapHint");
const revealHint = document.getElementById("revealHint");
const letterOverlay = document.getElementById("letterOverlay");
const letterClose = document.getElementById("letterClose");
const letterMessages = document.querySelectorAll(".letter-message");

const isMobile = window.matchMedia("(max-width: 768px)").matches;
const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
const MAX_FLOWERS = isMobile ? 360 : 600;

let W, H, CX, CY;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  CX = W / 2;
  CY = H / 2;
}
resize();
window.addEventListener("resize", resize);

const flowers = [];
const mooncakeImages = ["image/banh1.png"].map((src) => {
  const image = new Image();
  image.src = src;
  return image;
});

envClosed.style.opacity = "1";

setTimeout(() => {
  envClosed.style.transition =
    "opacity .8s ease-out, transform .8s cubic-bezier(.34,1.56,.64,1)";
  envClosed.style.animation = "envelopeFloat 3s ease-in-out infinite";
  tapHint.style.transition = "opacity .8s";
  tapHint.style.opacity = "1";
}, 1000);

let state = "envelope";

function typeLetterMessages() {
  letterMessages.forEach((message) => {
    if (!message.dataset.text) {
      message.dataset.text = message.textContent.trim();
    }
    message.textContent = "";
    message.classList.remove("is-typing", "is-typed");
  });

  let messageIndex = 0;

  function typeNextMessage() {
    const message = letterMessages[messageIndex];
    if (!message) return;

    const text = message.dataset.text;
    let characterIndex = 0;
    message.classList.add("is-typing");

    const timer = setInterval(() => {
      message.textContent += text[characterIndex];
      characterIndex++;

      if (characterIndex >= text.length) {
        clearInterval(timer);
        message.classList.remove("is-typing");
        message.classList.add("is-typed");
        messageIndex++;
        setTimeout(typeNextMessage, 350);
      }
    }, 32);
  }

  typeNextMessage();
}

envWrap.addEventListener("click", () => {
  if (state !== "envelope") return;

  state = "opening";

  tapHint.style.opacity = "0";

  envClosed.style.animation = "none";
  envClosed.style.opacity = "0";

  envOpened.style.transition =
    "opacity .4s ease, transform .5s cubic-bezier(.34,1.56,.64,1)";
  envOpened.style.opacity = "1";
  envOpened.style.transform = "translate(-50%,-50%) scale(1.02)";

  setTimeout(startBurst, 700);
});

function createFlower(index, leftSide) {
  const ring = Math.floor(index / 42);
  const pos = index % 40;
  const side = leftSide ? 1 : -1;

  const angle =
    (leftSide ? -Math.PI / 2 : Math.PI / 2) +
    side * (pos / 40) * Math.PI * 2 +
    (Math.random() - 0.5) * 0.08;

  const radius =
    Math.max(W, H) * (0.05 + ring * 0.09 + Math.random() * 0.1);

  flowers.push({
    tx: Math.cos(angle) * radius,
    ty: Math.sin(angle) * radius,
    img: mooncakeImages[Math.floor(Math.random() * mooncakeImages.length)],
    start: performance.now(),
    dur: 1050 + Math.random() * 500,
    rot: (Math.random() - 0.5) * 70,
    spin: (Math.random() - 0.5) * 90,
    size: 0.65 + Math.random() * 0.45,
    drop: H + 300 + Math.random() * 300,
  });
}

function startBurst() {
  const rect = envWrap.getBoundingClientRect();
  CX = rect.left + rect.width / 2;
  CY = rect.top + rect.height / 2;
  state = "burst";
  envOpened.style.transition = "opacity 0.5s ease-out";
  envOpened.style.opacity = "0";

  let left = 0;
  let right = 0;
  const burstStep = isMobile ? 2 : 4;

  function spawnBurstFrame() {
    if (state !== "burst") return;

    for (let i = 0; i < burstStep && left + right < MAX_FLOWERS; i++) {
      if (left < MAX_FLOWERS / 2) {
        createFlower(left, true);
        left++;
      }
      if (right < MAX_FLOWERS / 2) {
        createFlower(right, false);
        right++;
      }
    }

    if (left >= MAX_FLOWERS / 2 && right >= MAX_FLOWERS / 2) {
      revealHint.style.transition = "opacity .6s";
      revealHint.style.opacity = "1";
      state = "waiting";
      return;
    }

    requestAnimationFrame(spawnBurstFrame);
  }

  requestAnimationFrame(spawnBurstFrame);
}

document.addEventListener("click", () => {
  if (state !== "waiting") return;

  revealHint.style.opacity = "0";
  state = "dropping";
  dropStart = performance.now();
  setTimeout(() => {
    if (state !== "dropping") return;
    flowers.length = 0;
    state = "letter";
    letterOverlay.classList.add("is-visible");
    letterOverlay.setAttribute("aria-hidden", "false");
    typeLetterMessages();
  }, 1900);
});

let dropStart = 0;

letterClose.addEventListener("click", (event) => {
  event.stopPropagation();
  letterOverlay.classList.remove("is-visible");
  letterOverlay.setAttribute("aria-hidden", "true");
  state = "letter-closed";
});

letterOverlay.addEventListener("click", (event) => {
  if (event.target !== letterOverlay) return;
  letterClose.click();
});

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeIn(t) {
  return t * t;
}

function render() {
  ctx.clearRect(0, 0, W, H);

  const now = performance.now();
  const imageSize = isMobile ? 120 : 160;

  for (let i = 0; i < flowers.length; i++) {
    const f = flowers[i];
    let x, y, scale, alpha, rot;

    if (state === "dropping") {
      const p = Math.min(1, (now - dropStart) / 1800);
      const e = easeIn(p);

      x = CX + f.tx;
      y = CY + f.ty + e * f.drop;
      scale = 1;
      alpha = 1 - p;
      rot = f.rot + ((now - f.start) / 1000) * f.spin;
    } else {
      const p = easeOut(Math.min(1, (now - f.start) / f.dur));

      x = CX + p * f.tx;
      y = CY + p * f.ty;
      scale = p;
      alpha = Math.min(1.2 * p, 0.92);
      rot = f.rot + ((now - f.start) / 1000) * f.spin;
    }

    if (alpha <= 0) continue;

    const img = f.img;
    if (!img.complete || !img.naturalWidth) continue;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(scale * 0.8 * f.size, scale * 0.8 * f.size);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
    ctx.restore();
  }

  requestAnimationFrame(render);
}

render();
