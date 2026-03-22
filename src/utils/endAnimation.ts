// Pixel-art end-game animations: confetti (win) and rain (loss)

const CONFETTI_COLORS = [
  '#C75B39', // terracotta
  '#4D8C6F', // sage
  '#3D5494', // ink
  '#E8B84B', // gold
  '#B85C8A', // magenta
  '#E67E22', // orange
  '#E8D5A3', // cream
  '#5DADE2', // sky
];

// Pre-parsed as [r,g,b] to avoid hex parsing at runtime
const RAIN_COLORS: [number, number, number][] = [
  [124, 164, 192],
  [74,  122, 155],
  [168, 200, 224],
  [94,  139, 168],
];

interface ConfettiParticle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; color: string;
  // 0 = horizontal rect, 1 = vertical rect (pixel-art "rotation")
  rot: 0 | 1;
  rotFrame: number;
  rotInterval: number;
}

interface RainDrop {
  x: number; y: number;
  speed: number;
  length: number; // always even, in px
  rgb: [number, number, number];
}

export function playConfetti(): void { start('confetti'); }
export function playRain(): void    { start('rain'); }

function start(type: 'confetti' | 'rain'): void {
  const W = window.innerWidth;
  const H = window.innerHeight;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  canvas.style.cssText = 'position:fixed;inset:0;z-index:200;pointer-events:none;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const SHOW_MS = 3800;
  const FADE_MS = 700;
  const t0 = performance.now();

  const confetti = type === 'confetti' ? makeConfetti(W, H) : [];
  const rain     = type === 'rain'     ? makeRain(W, H)     : [];

  function tick(now: number): void {
    const elapsed = now - t0;
    const fade = elapsed > SHOW_MS
      ? Math.max(0, 1 - (elapsed - SHOW_MS) / FADE_MS)
      : 1;

    ctx.clearRect(0, 0, W, H);

    if (type === 'confetti') drawConfetti(ctx, confetti, W, H, fade);
    else                     drawRain(ctx, rain, W, H, fade);

    if (elapsed < SHOW_MS + FADE_MS) requestAnimationFrame(tick);
    else canvas.remove();
  }

  requestAnimationFrame(tick);
}

// ── Confetti ─────────────────────────────────────────────────────────────────

function makeConfetti(W: number, H: number): ConfettiParticle[] {
  return Array.from({ length: 95 }, () => ({
    x:    Math.random() * W,
    // distribute: half visible at start, half above viewport
    y:    Math.random() * H * 1.4 - H * 0.4,
    vx:   (Math.random() - 0.5) * 0.9,
    vy:   0.5 + Math.random() * 1.0,
    size: (1 + Math.floor(Math.random() * 3)) * 4, // 4 | 8 | 12 px
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
    rot: (Math.random() < 0.5 ? 0 : 1) as 0 | 1,
    rotFrame:    0,
    rotInterval: 7 + Math.floor(Math.random() * 13),
  }));
}

function drawConfetti(
  ctx: CanvasRenderingContext2D,
  ps: ConfettiParticle[],
  W: number, H: number, fade: number,
): void {
  ctx.globalAlpha = fade;

  for (const p of ps) {
    // physics
    p.x  += p.vx;
    p.vy += 0.018; // gravity
    p.y  += p.vy;
    p.rotFrame++;
    if (p.rotFrame >= p.rotInterval) {
      p.rot = (p.rot === 0 ? 1 : 0);
      p.rotFrame = 0;
    }
    // wrap around
    if (p.y > H + p.size) {
      p.y  = -p.size;
      p.x  = Math.random() * W;
      p.vy = 0.5 + Math.random() * 1.0;
    }

    const px = Math.floor(p.x);
    const py = Math.floor(p.y);
    const hw = p.size >> 1; // half-width
    const qw = p.size >> 2; // quarter-width

    ctx.fillStyle = p.color;
    // pixel-art "rotation": horizontal rect vs vertical rect — no canvas transform
    if (p.rot === 0) {
      ctx.fillRect(px - hw, py - qw, p.size, hw);
    } else {
      ctx.fillRect(px - qw, py - hw, hw, p.size);
    }
  }

  ctx.globalAlpha = 1;
}

// ── Rain ─────────────────────────────────────────────────────────────────────

function makeRain(W: number, H: number): RainDrop[] {
  return Array.from({ length: 160 }, () => ({
    x:      Math.random() * W,
    y:      Math.random() * H,
    speed:  5 + Math.random() * 5,
    length: (4 + Math.floor(Math.random() * 5)) * 2, // 8–16 px, even
    rgb:    RAIN_COLORS[Math.floor(Math.random() * RAIN_COLORS.length)]!,
  }));
}

function drawRain(
  ctx: CanvasRenderingContext2D,
  drops: RainDrop[],
  W: number, H: number, fade: number,
): void {
  // Subtle dark-blue tint to set the mood
  ctx.fillStyle = `rgba(15,30,60,${(fade * 0.18).toFixed(2)})`;
  ctx.fillRect(0, 0, W, H);

  for (const d of drops) {
    d.y += d.speed;
    d.x -= d.speed * 0.18; // slight diagonal angle
    if (d.y > H + d.length) { d.y = -d.length; d.x = Math.random() * W; }

    const [r, g, b] = d.rgb;
    const segs = d.length >> 1; // length / 2 segments of 2px each
    const bx = Math.floor(d.x);
    const by = Math.floor(d.y);

    for (let i = 0; i < segs; i++) {
      // tip (bottom of drop) = most opaque; tail = fades out
      const a = fade * (0.28 + (i / segs) * 0.72);
      ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`;
      ctx.fillRect(bx, by - i * 2, 2, 2);
    }
  }
}
