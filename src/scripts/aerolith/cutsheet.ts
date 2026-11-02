// Plan de découpe : les vrais contours DXF de la plaque carbone, découpés au fil du scroll.
import { Atlas, INK, SIG, dpr, fontsReady, reducedMotion, rgba, trackVisible } from './glyphs';

interface Sheet {
  w: number;
  h: number;
  parts: number;
  outer: number[];
  paths: number[][];
}

const CHARS = '-|/\\';
// Couleurs : fantôme, coupé, puis traînée chaude (du plus récent au plus ancien)
const COLORS = [rgba(INK, 0.1), rgba(INK, 0.78), rgba(SIG, 1), rgba(SIG, 0.7), rgba(SIG, 0.42), rgba(INK, 0.06)];
const TRAIL = 1400; // mm de coupe encore « chauds »

export async function initCutsheet(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const stage = root.querySelector<HTMLElement>('.cut-stage')!;
  const out = {
    len: root.querySelector<HTMLElement>('[data-out="len"]')!,
    part: root.querySelector<HTMLElement>('[data-out="part"]')!,
    x: root.querySelector<HTMLElement>('[data-out="x"]')!,
    y: root.querySelector<HTMLElement>('[data-out="y"]')!,
    bar: root.querySelector<HTMLElement>('[data-out="bar"]')!,
  };

  const [sheet] = await Promise.all([
    fetch(root.dataset.src!).then((r) => r.json() as Promise<Sheet>),
    fontsReady(),
  ]);

  // Décodage des deltas → coordonnées en mm, avec longueur de coupe cumulée.
  const paths: Float32Array[] = [];
  const cum: Float32Array[] = [];
  let total = 0;
  for (const flat of sheet.paths) {
    const p = new Float32Array(flat.length);
    const c = new Float32Array(flat.length / 2);
    let x = 0;
    let y = 0;
    for (let i = 0; i < flat.length; i += 2) {
      x += flat[i];
      y += flat[i + 1];
      p[i] = x / 10;
      p[i + 1] = y / 10;
      if (i) total += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
      c[i / 2] = total;
    }
    paths.push(p);
    cum.push(c);
  }
  const pathEnd = cum.map((c) => c[c.length - 1]);
  const partEnds = sheet.outer.map((i) => pathEnd[i]);

  let portrait = false;
  let cols = 0;
  let rows = 0;
  let cw = 0;
  let ch = 0;
  let mm = 0; // mm par colonne
  let cells = new Int32Array(0);
  let tcut = new Float32Array(0);
  let glyph = new Uint8Array(0);
  let atlas: Atlas;
  // Trois calques superposés, composés par le navigateur :
  // fantôme (statique), découpe (incrémentale), effets (traînée + tête).
  const cutLayer = document.createElement('canvas');
  const fx = document.createElement('canvas');
  for (const c of [cutLayer, fx]) {
    c.setAttribute('aria-hidden', 'true');
    c.className = 'cut-layer';
    stage.append(c);
  }
  const gctx = canvas.getContext('2d')!;
  const cctx = cutLayer.getContext('2d')!;
  const ctx = fx.getContext('2d')!;

  // Coordonnées plaque (mm) → cellule, avec rotation en portrait.
  const toGrid = (x: number, y: number): [number, number] =>
    portrait ? [(sheet.h - y) / mm, x / (mm * 1.72)] : [x / mm, y / (mm * 1.72)];

  function layout() {
    const r = dpr();
    portrait = root.clientWidth < 640;
    const sw = portrait ? sheet.h : sheet.w;
    const sh = portrait ? sheet.w : sheet.h;
    // Le ratio est fixé avant la mesure, pour éviter une boucle avec le ResizeObserver.
    root.style.setProperty('--sheet-ar', `${sw / sh}`);
    const W = stage.clientWidth;
    const base = portrait ? 4.2 : W < 1100 ? 4.6 : 5;
    cols = Math.floor(W / base);
    mm = sw / cols;
    rows = Math.ceil(sh / (mm * 1.72));
    const cssW = W;
    const cssH = (cssW / cols) * 1.72 * rows;
    cw = (cssW / cols) * r;
    ch = cw * 1.72;
    for (const c of [canvas, cutLayer, fx]) {
      c.width = Math.round(cw * cols);
      c.height = Math.round(ch * rows);
      c.style.height = `${cssH}px`;
    }
    atlas = new Atlas(CHARS, COLORS, Math.ceil(cw), Math.ceil(ch));
    rasterize();
    draw(true);
  }

  function rasterize() {
    const n = cols * rows;
    const t = new Float32Array(n).fill(-1);
    const g = new Uint8Array(n);
    const step = 0.35;
    paths.forEach((p, k) => {
      const c = cum[k];
      for (let i = 2; i < p.length; i += 2) {
        const [ax, ay] = toGrid(p[i - 2], p[i - 1]);
        const [bx, by] = toGrid(p[i], p[i + 1]);
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);
        // caractère choisi selon l'orientation du segment, en espace grille
        const ang = Math.abs(Math.atan2(dy * 1.72, dx));
        const a = ang > Math.PI / 2 ? Math.PI - ang : ang;
        let ci = 0;
        if (a > 1.2) ci = 1;
        else if (a > 0.39) ci = dx * dy < 0 ? 2 : 3;
        const segs = Math.max(1, Math.ceil(len / step));
        for (let s = 0; s <= segs; s++) {
          const f = s / segs;
          const gx = Math.floor(ax + dx * f);
          const gy = Math.floor(ay + dy * f);
          if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
          const idx = gy * cols + gx;
          if (t[idx] < 0) {
            t[idx] = c[i / 2 - 1] + (c[i / 2] - c[i / 2 - 1]) * f;
            g[idx] = ci;
          }
        }
      }
    });
    // Cellules triées par instant de coupe : chaque image ne dessine que la nouveauté.
    const list: number[] = [];
    t.forEach((v, i) => v >= 0 && list.push(i));
    list.sort((a, b) => t[a] - t[b]);
    cells = Int32Array.from(list);
    tcut = Float32Array.from(list.map((i) => t[i]));
    glyph = Uint8Array.from(list.map((i) => g[i]));

    gctx.fillStyle = '#060606';
    gctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let k = 0; k < cells.length; k++) put(gctx, k, 0);
    cutK = 0;
    fxBox = null;
  }

  let cutK = 0;
  let fxBox: number[] | null = null;

  function put(c: CanvasRenderingContext2D, k: number, color: number) {
    const i = cells[k];
    atlas.draw(c, glyph[k], color, (i % cols) * cw, Math.floor(i / cols) * ch);
  }

  // Nombre de cellules coupées avant la longueur L (recherche dichotomique).
  function upTo(L: number) {
    let lo = 0;
    let hi = tcut.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (tcut[m] <= L) lo = m + 1;
      else hi = m;
    }
    return lo;
  }

  // Position de la tête laser pour une longueur de coupe donnée.
  function headAt(L: number): [number, number] {
    let lo = 0;
    let hi = pathEnd.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pathEnd[mid] < L) lo = mid + 1;
      else hi = mid;
    }
    const c = cum[lo];
    const p = paths[lo];
    let a = 0;
    let b = c.length - 1;
    while (a < b) {
      const m = (a + b) >> 1;
      if (c[m] < L) a = m + 1;
      else b = m;
    }
    const i = Math.max(a, 1);
    const f = c[i] === c[i - 1] ? 1 : Math.min(Math.max((L - c[i - 1]) / (c[i] - c[i - 1]), 0), 1);
    return [p[(i - 1) * 2] + (p[i * 2] - p[(i - 1) * 2]) * f, p[(i - 1) * 2 + 1] + (p[i * 2 + 1] - p[(i - 1) * 2 + 1]) * f];
  }

  let progress = 0;
  let drawn = -1;
  function draw(force = false) {
    if (!force && progress === drawn) return;
    drawn = progress;
    const L = progress * total;
    const k = upTo(L);
    if (k < cutK) {
      cctx.clearRect(0, 0, cutLayer.width, cutLayer.height);
      cutK = 0;
    }
    cctx.fillStyle = '#060606';
    for (let j = cutK; j < k; j++) {
      const i = cells[j];
      cctx.fillRect((i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
      put(cctx, j, 1);
    }
    cutK = k;

    // Effets : on n'efface que la zone touchée à l'image précédente.
    if (fxBox) ctx.clearRect(fxBox[0], fxBox[1], fxBox[2] - fxBox[0], fxBox[3] - fxBox[1]);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    ctx.fillStyle = '#060606';
    for (let j = upTo(L - TRAIL); j < k; j++) {
      const age = L - tcut[j];
      const i = cells[j];
      const x = (i % cols) * cw;
      const y = Math.floor(i / cols) * ch;
      ctx.fillRect(x, y, cw, ch);
      put(ctx, j, age < TRAIL * 0.15 ? 2 : age < TRAIL * 0.45 ? 3 : 4);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + cw);
      y1 = Math.max(y1, y + ch);
    }
    if (progress > 0 && progress < 1) {
      const [hx, hy] = headAt(L);
      const [gx, gy] = toGrid(hx, hy);
      const x = gx * cw;
      const y = gy * ch;
      const R = cw * 7;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, R);
      grad.addColorStop(0, 'rgba(255,90,50,.55)');
      grad.addColorStop(0.25, 'rgba(255,59,29,.18)');
      grad.addColorStop(1, 'rgba(255,59,29,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - R, y - R, R * 2, R * 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - cw * 0.35, y - cw * 0.35, cw * 0.7, cw * 0.7);
      x0 = Math.min(x0, x - R);
      y0 = Math.min(y0, y - R);
      x1 = Math.max(x1, x + R);
      y1 = Math.max(y1, y + R);
      out.x.textContent = hx.toFixed(1).padStart(6, '0');
      out.y.textContent = hy.toFixed(1).padStart(5, '0');
    }
    fxBox = x0 < x1 ? [Math.floor(x0) - 1, Math.floor(y0) - 1, Math.ceil(x1) + 1, Math.ceil(y1) + 1] : null;
    let part = 0;
    while (part < partEnds.length && partEnds[part] <= L) part++;
    out.len.textContent = (L / 1000).toFixed(2);
    out.part.textContent = String(part).padStart(2, '0');
    out.bar.style.transform = `scaleX(${progress})`;
  }

  // Progression pilotée par la position dans la section collante.
  const still = reducedMotion();
  function measure() {
    if (still) {
      progress = 1;
      return;
    }
    const b = root.getBoundingClientRect();
    const span = b.height - innerHeight;
    progress = Math.min(Math.max(-b.top / Math.max(span, 1), 0), 1);
    progress = Math.min(progress / 0.92, 1);
  }

  let visible = false;
  let raf = 0;
  const tick = () => {
    raf = 0;
    measure();
    draw();
  };
  addEventListener('scroll', () => visible && !raf && (raf = requestAnimationFrame(tick)), { passive: true });
  trackVisible(root, (v) => (visible = v));

  let lastW = stage.clientWidth;
  new ResizeObserver(() => {
    if (stage.clientWidth === lastW) return;
    lastW = stage.clientWidth;
    layout();
  }).observe(stage);
  measure();
  layout();
  root.classList.add('is-live');
}
