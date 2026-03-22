const BG_IMAGES = ['forest-1.webp', 'forest-2.webp'];

export function pickBgUrl(baseUrl: string): string {
  const img = BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)];
  return `${baseUrl}bg-images/${img}`;
}

export function setupLeavesCanvas(screen: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'forest-leaves-canvas';
  screen.prepend(canvas);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const PX = 3;

  const SHAPES: number[][][] = [
    [[0,1,1,0],[1,1,1,0],[1,1,1,1],[0,1,1,0],[0,0,1,0]],
    [[0,1,1,0],[1,1,1,1],[1,1,0,0],[0,1,0,0]],
    [[0,1,0],[0,1,1],[1,1,0],[0,1,0],[0,1,0]],
    [[0,1,0,1,0],[1,1,1,1,0],[0,1,1,0,0],[0,0,1,0,0]],
    [[0,1,1,0],[1,1,1,1],[0,1,1,0],[0,0,1,0]],
  ];

  const COLORS = [
    '#5CAB7D', '#4D8C6F', '#3A7A58', '#6BBF8A',
    '#D4A843', '#C4852A', '#C75B39', '#8B9A60',
  ];

  type Leaf = {
    x: number; y: number;
    vy: number;
    driftFreq: number; driftPhase: number;
    rotation: number; rotSpeed: number;
    shape: number[][];
    color: string;
    alpha: number;
    t: number;
  };

  const W = canvas.width;
  const H = canvas.height;
  const NUM = 22;

  const mkLeaf = (randomY: boolean): Leaf => ({
    x: Math.random() * W,
    y: randomY ? Math.random() * H : -(PX * 8),
    vy: 0.35 + Math.random() * 0.65,
    driftFreq: 0.006 + Math.random() * 0.008,
    driftPhase: Math.random() * Math.PI * 2,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.025,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 0.40 + Math.random() * 0.35,
    t: Math.random() * 1000,
  });

  const leaves: Leaf[] = Array.from({ length: NUM }, (_, i) => mkLeaf(i > 0));

  const drawLeaf = (leaf: Leaf): void => {
    const rows = leaf.shape.length;
    const cols = leaf.shape[0].length;
    ctx.save();
    ctx.globalAlpha = leaf.alpha;
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.rotation);
    ctx.fillStyle = leaf.color;
    const ox = -(cols * PX) / 2;
    const oy = -(rows * PX) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (leaf.shape[r][c]) ctx.fillRect(ox + c * PX, oy + r * PX, PX, PX);
      }
    }
    ctx.restore();
  };

  let animFrameId: number;

  const tick = (): void => {
    ctx.clearRect(0, 0, W, H);
    for (const leaf of leaves) {
      leaf.t += 1;
      leaf.y += leaf.vy;
      leaf.x += Math.sin(leaf.t * leaf.driftFreq + leaf.driftPhase) * 0.7;
      leaf.rotation += leaf.rotSpeed;
      if (leaf.y > H + PX * 8) Object.assign(leaf, mkLeaf(false));
      drawLeaf(leaf);
    }
    animFrameId = requestAnimationFrame(tick);
  };

  animFrameId = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(animFrameId);
}
