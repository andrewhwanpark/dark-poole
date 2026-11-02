// Planches : chaque rendu apparaît d'abord en ASCII, puis se « développe » en photographie.
import { Atlas, INK, RAMP, SIG, dpr, fontsReady, reducedMotion, rgba, whenNear } from './glyphs';

// Palette quantifiée : 5 niveaux d'encre, puis rouge signal et cuivre sur 3 niveaux.
const COPPER = [222, 128, 70];
const ALPHA = [0.3, 0.45, 0.6, 0.8, 1];
const PALETTE = [
  ...ALPHA.map((a) => rgba(INK, a)),
  ...[0.5, 0.75, 1].map((a) => rgba(SIG, a)),
  ...[0.5, 0.75, 1].map((a) => rgba(COPPER, a)),
];
const atlases = new Map<string, Atlas>();
function atlasFor(cw: number, ch: number) {
  const key = `${cw}x${ch}`;
  if (!atlases.has(key)) atlases.set(key, new Atlas(RAMP, PALETTE, cw, ch));
  return atlases.get(key)!;
}
const idle = (cb: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 400 }) : setTimeout(cb, 16);

function asciiFrom(img: HTMLImageElement, canvas: HTMLCanvasElement) {
  const r = dpr();
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const cssCw = W < 500 ? 5 : 6;
  const cols = Math.floor(W / cssCw);
  const rows = Math.floor(H / (cssCw * 1.72));
  canvas.width = Math.round(W * r);
  canvas.height = Math.round(H * r);

  // Échantillonnage « cover » de l'image à la résolution de la grille.
  const s = document.createElement('canvas');
  s.width = cols;
  s.height = rows;
  const sc = s.getContext('2d', { willReadFrequently: true })!;
  const ar = img.naturalWidth / img.naturalHeight;
  const gar = (cols * cssCw) / (rows * cssCw * 1.72);
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (ar > gar) sw = sh * gar;
  else sh = sw / gar;
  sc.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, cols, rows);
  const px = sc.getImageData(0, 0, cols, rows).data;

  const ctx = canvas.getContext('2d')!;
  const cw = Math.round(cssCw * r);
  const ch = Math.round(cw * 1.72);
  const atlas = atlasFor(cw, ch);
  const ox = Math.floor((canvas.width - cols * cw) / 2);
  const oy = Math.floor((canvas.height - rows * ch) / 2);
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const R = px[i];
      const G = px[i + 1];
      const B = px[i + 2];
      let l = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
      l = Math.min(Math.pow(l, 0.6) * 1.55, 0.999);
      const g = Math.floor(l * RAMP.length);
      if (g === 0) continue;
      const level = Math.min(Math.floor(l * 3), 2);
      const warm = ((R - Math.max(G, B)) / 255) * 4;
      let col = Math.min(Math.floor(l * ALPHA.length), ALPHA.length - 1);
      if (warm > 0.35) col = ALPHA.length + (G / Math.max(R, 1) > 0.42 ? 3 : 0) + level;
      atlas.draw(ctx, g, col, ox + x * cw, oy + y * ch);
    }
}

export function initPlates(root: ParentNode = document) {
  const still = reducedMotion();
  root.querySelectorAll<HTMLElement>('.plate').forEach((plate) => {
    const canvas = plate.querySelector<HTMLCanvasElement>('canvas')!;
    const src = plate.dataset.ascii!;
    whenNear(plate, async () => {
      if (still) {
        plate.classList.add('is-developed');
        return;
      }
      const img = new Image();
      img.src = src;
      await Promise.all([img.decode(), fontsReady()]);
      await new Promise<void>((res) => idle(res));
      asciiFrom(img, canvas);
      plate.classList.add('is-ascii');
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            plate.classList.add('is-developed');
          }
        },
        { threshold: 0.55 },
      );
      io.observe(plate);
    });
  });
}

/** Petit décodage de texte : les caractères défilent avant de se fixer. */
export function initDecode(root: ParentNode = document) {
  if (reducedMotion()) return;
  const pool = '#%=+-:./\\|01ABCDEFX';
  root.querySelectorAll<HTMLElement>('[data-decode]').forEach((el) => {
    const final = el.textContent || '';
    el.style.minWidth = `${el.offsetWidth}px`;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const dur = Math.min(300 + final.length * 28, 900);
        const step = (now: number) => {
          const f = Math.min((now - t0) / dur, 1);
          const n = Math.floor(f * final.length);
          el.textContent =
            final.slice(0, n) +
            [...final.slice(n)].map((c) => (c === ' ' ? ' ' : pool[(Math.random() * pool.length) | 0])).join('');
          if (f < 1) requestAnimationFrame(step);
          else el.style.minWidth = '';
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
  });
}
