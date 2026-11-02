// Cartes électroniques en ASCII : géométrie réelle extraite des PcbDoc Altium.
import { Atlas, INK, SIG, dpr, fontsReady, reducedMotion, rgba, trackVisible, whenNear } from './glyphs';

type Kind = 'trk' | 'pad' | 'pour' | 'via';
interface Item {
  kind: Kind;
  net: number;
  d: Path2D;
  w: number;
}
const LAYERS = ['top', 'in1', 'in2', 'bot'] as const;
type Layer = (typeof LAYERS)[number];
type View = Layer | 'all';

// Glyphes : 0 '·' 1 '-' 2 '|' 3 '/' 4 '\' 5 '+' 6 '#' 7 'o' 8 '.' 9 '=' 10 ':'
const CHARS = '·-|/\\+#o.=:';
const LEVELS = [1, 0.62, 0.36, 0.2, 0.09, 0.045];
const COLORS = [...LEVELS.map((a) => rgba(INK, a)), rgba(SIG, 1), rgba(SIG, 0.55)];
const HL = LEVELS.length;
const DEPTH: Record<Layer, number> = { top: 0, in1: 3, in2: 3, bot: 2 };

interface Cell {
  g: number; // glyphe
  net: number;
  fill: boolean; // intérieur de pastille
}

export async function initPcb(root: HTMLElement) {
  whenNear(root, () => start(root));
}

async function start(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const stage = root.querySelector<HTMLElement>('.pcb-stage')!;
  const outNet = root.querySelector<HTMLElement>('[data-out="net"]')!;
  const outInfo = root.querySelector<HTMLElement>('[data-out="info"]')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const cycle = (root.dataset.cycle || '').split(',').filter(Boolean);

  const [svgText, meta] = await Promise.all([
    fetch(root.dataset.svg!).then((r) => r.text()),
    fetch(root.dataset.meta!).then((r) => r.json() as Promise<{ nets: Record<string, string> }>),
    fontsReady(),
  ]);
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  const BW = parseFloat(svg.getAttribute('data-w')!);
  const BH = parseFloat(svg.getAttribute('data-h')!);
  const names = new Map(Object.entries(meta.nets).map(([k, v]) => [Number(k), v]));
  const byName = new Map([...names].map(([k, v]) => [v, k]));

  const items: Record<Layer, Item[]> = { top: [], in1: [], in2: [], bot: [] };
  const read = (el: Element, kind: Kind): Item => ({
    kind,
    net: Number(el.getAttribute('data-n')),
    d: new Path2D(el.getAttribute('d')!),
    w: parseFloat(el.getAttribute('stroke-width') || '0'),
  });
  svg.querySelectorAll('.pcb-layer').forEach((g) => {
    const L = g.getAttribute('data-layer') as Layer;
    g.querySelectorAll('path').forEach((p) => items[L].push(read(p, p.getAttribute('class') as Kind)));
  });
  const vias = [...svg.querySelectorAll('.via')].map((p) => read(p, 'via'));
  const outline = new Path2D(svg.querySelector('.pcb-outline')!.getAttribute('d')!);

  // Statistiques par net pour le panneau de lecture.
  const netStats = new Map<number, { layers: Set<Layer>; vias: number }>();
  for (const L of LAYERS)
    for (const it of items[L]) {
      if (!netStats.has(it.net)) netStats.set(it.net, { layers: new Set(), vias: 0 });
      netStats.get(it.net)!.layers.add(L);
    }
  for (const v of svg.querySelectorAll('.via')) {
    const n = Number(v.getAttribute('data-n'));
    const count = (v.getAttribute('d')!.match(/M/g) || []).length;
    if (!netStats.has(n)) netStats.set(n, { layers: new Set(), vias: 0 });
    netStats.get(n)!.vias += count;
  }

  let cols = 0;
  let rows = 0;
  let cw = 0;
  let ch = 0;
  let atlas: Atlas;
  const grids = {} as Record<Layer, Cell[]>;
  let viaGrid: Int32Array;
  let edge: Uint8Array;
  const ctx = canvas.getContext('2d')!;
  const overlay = document.createElement('canvas');
  overlay.className = 'pcb-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  stage.append(overlay);
  const octx = overlay.getContext('2d')!;

  const SX = 4;
  const SY = 7;

  async function layout() {
    const r = dpr();
    const W = stage.clientWidth;
    const base = 5;
    cols = Math.floor(W / base);
    const mm = BW / cols;
    rows = Math.ceil(BH / (mm * 1.72));
    const cssCw = W / cols;
    cw = cssCw * r;
    ch = cw * 1.72;
    for (const c of [canvas, overlay]) {
      c.width = Math.round(cw * cols);
      c.height = Math.round(ch * rows);
      c.style.height = `${cssCw * 1.72 * rows}px`;
    }
    atlas = new Atlas(CHARS, COLORS, Math.ceil(cw), Math.ceil(ch));
    ready = false;
    await rasterize(mm);
    ready = true;
    draw(true);
  }

  // Rendu hors écran à 4×7 échantillons par cellule, puis réduction en glyphes.
  async function rasterize(mm: number) {
    const w = cols * SX;
    const h = rows * SY;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const o = off.getContext('2d', { willReadFrequently: true })!;
    const sx = SX / mm;
    const sy = SY / (mm * 1.72);

    const paint = (list: Item[], color: (it: Item) => string, minW = 0) => {
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.clearRect(0, 0, w, h);
      o.setTransform(sx, 0, 0, sy, 0, 0);
      o.lineCap = 'round';
      o.lineJoin = 'round';
      for (const it of list) {
        const c = color(it);
        if (it.kind === 'trk') {
          o.strokeStyle = c;
          o.lineWidth = Math.max(it.w, minW);
          o.stroke(it.d);
        } else {
          o.fillStyle = c;
          o.fill(it.d, 'evenodd');
        }
      }
      return o.getImageData(0, 0, w, h).data;
    };
    const cover = (data: Uint8ClampedArray, ch_: number) => {
      const cov = new Float32Array(cols * rows);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) cov[Math.floor(y / SY) * cols + Math.floor(x / SX)] += data[(y * w + x) * 4 + ch_] / 255;
      for (let i = 0; i < cov.length; i++) cov[i] /= SX * SY;
      return cov;
    };
    const idColor = (it: Item) => `rgb(${(it.net + 1) & 255},${(it.net + 1) >> 8},0)`;
    const known = new Set([...netStats.keys()]);
    const ids = (data: Uint8ClampedArray) => {
      const out = new Int32Array(cols * rows).fill(-1);
      for (let cy = 0; cy < rows; cy++)
        for (let cx = 0; cx < cols; cx++) {
          const px = ((cy * SY + 3) * w + cx * SX + 2) * 4;
          if (data[px + 3] < 255) continue;
          const id = data[px] + data[px + 1] * 256 - 1;
          if (known.has(id)) out[cy * cols + cx] = id;
        }
      return out;
    };

    const thin = mm * 0.9;
    for (const L of LAYERS) {
      // Une couche par image, pour ne pas bloquer le défilement.
      await new Promise(requestAnimationFrame);
      const list = items[L];
      const geo = paint(list, (it) => (it.kind === 'trk' ? '#f00' : it.kind === 'pad' ? '#0f0' : '#00f'), thin);
      const trk = cover(geo, 0);
      const pad = cover(geo, 1);
      const pour = cover(geo, 2);
      const idsTrkPad = ids(paint(list.filter((i) => i.kind !== 'pour'), idColor, thin));
      const idsPour = ids(paint(list.filter((i) => i.kind === 'pour'), idColor));

      const at = (a: Float32Array, k: number) => (x: number, y: number) =>
        x >= 0 && y >= 0 && x < cols && y < rows && a[y * cols + x] > k;
      const on = at(trk, 0.2);
      const isPad = at(pad, 0.45);
      const isPour = at(pour, 0.5);
      const cells: Cell[] = new Array(cols * rows);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          let g = -1;
          let fill = false;
          if (isPad(x, y)) {
            // Pastilles dessinées en contour, comme une empreinte.
            const l = isPad(x - 1, y);
            const r = isPad(x + 1, y);
            const u = isPad(x, y - 1);
            const d = isPad(x, y + 1);
            if (l && r && u && d) {
              g = 0;
              fill = true;
            } else if (l && r) g = 1;
            else if (u && d) g = 2;
            else g = 5;
          } else if (trk[i] > 0.82) g = 9;
          else if (trk[i] > 0.2) {
            const hz = on(x - 1, y) || on(x + 1, y);
            const vt = on(x, y - 1) || on(x, y + 1);
            const d1 = on(x + 1, y - 1) || on(x - 1, y + 1);
            const d2 = on(x - 1, y - 1) || on(x + 1, y + 1);
            g = hz && vt ? 5 : hz ? 1 : vt ? 2 : d1 ? 3 : d2 ? 4 : 0;
          } else if (isPour(x, y)) {
            // Plans de cuivre : seulement leur bord, en pointillé.
            const edge = !isPour(x - 1, y) || !isPour(x + 1, y) || !isPour(x, y - 1) || !isPour(x, y + 1);
            if (edge) g = 8;
          }
          const net = g < 0 ? -1 : g === 8 ? idsPour[i] : idsTrkPad[i] >= 0 ? idsTrkPad[i] : idsPour[i];
          cells[i] = { g, net, fill };
        }
      grids[L] = cells;
    }
    viaGrid = ids(paint(vias, idColor));
    const ol = paint([{ kind: 'trk', net: 0, d: outline, w: mm * 1.1 }], () => '#fff');
    const oc = cover(ol, 0);
    edge = Uint8Array.from(oc, (v) => (v > 0.12 ? 1 : 0));
  }

  let view: View = 'all';
  let hot = -1;
  let ready = false;
  // Glyphe, couleur et net de chaque cellule pour la vue courante.
  let vg = new Int8Array(0);
  let vc = new Int8Array(0);
  let vn = new Int32Array(0);

  // Calque de base : redessiné seulement au changement de vue ou de taille.
  function drawBase() {
    const n = cols * rows;
    vg = new Int8Array(n).fill(-1);
    vc = new Int8Array(n);
    vn = new Int32Array(n).fill(-1);
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const order: Layer[] = view === 'all' ? ['top', 'in1', 'in2', 'bot'] : [view];
    for (let i = 0; i < n; i++) {
      let g = -1;
      let col = 0;
      let net = -1;
      if (viaGrid[i] >= 0) {
        g = 7;
        net = viaGrid[i];
        col = view === 'all' ? 1 : 2;
      } else {
        for (const L of order) {
          const c = grids[L][i];
          if (c.g >= 0) {
            g = c.g;
            net = c.net;
            col = view === 'all' ? DEPTH[L] : 0;
            if (c.fill) col = 5;
            else if (g === 8) col = Math.min(col + 3, 5);
            break;
          }
        }
        if (g < 0 && view !== 'all') {
          // Les autres couches restent visibles en fantôme.
          for (const L of LAYERS) {
            const c = grids[L][i];
            if (c.g >= 0 && c.g !== 8 && !c.fill) {
              g = c.g;
              col = 5;
              break;
            }
          }
        }
      }
      if (g < 0 && edge[i]) {
        g = 0;
        col = 3;
      }
      if (g < 0) continue;
      vg[i] = g;
      vc[i] = col;
      vn[i] = net;
      atlas.draw(ctx, g, col, (i % cols) * cw, Math.floor(i / cols) * ch);
    }
  }

  // Calque du net survolé : seules ses cellules sont redessinées.
  function draw(base = false) {
    if (!ready) return;
    if (base) drawBase();
    octx.clearRect(0, 0, overlay.width, overlay.height);
    if (hot < 0) return;
    octx.fillStyle = '#060606';
    for (let i = 0; i < vn.length; i++) {
      if (vn[i] !== hot) continue;
      const x = (i % cols) * cw;
      const y = Math.floor(i / cols) * ch;
      octx.fillRect(x, y, cw, ch);
      atlas.draw(octx, vg[i], vg[i] === 8 || vc[i] === 5 ? HL + 1 : HL, x, y);
    }
  }

  const label = (n: number) => names.get(n) ?? `N${String(n).padStart(3, '0')}`;
  function setHot(n: number) {
    if (n === hot) return;
    hot = n;
    if (n < 0) {
      outNet.textContent = '—';
      outInfo.textContent = 'Hover a trace';
    } else {
      const s = netStats.get(n);
      const layers = s ? LAYERS.filter((L) => s.layers.has(L)).map((L) => L.toUpperCase()).join(' ') : '';
      outNet.textContent = label(n);
      outInfo.textContent = `${layers}${s && s.vias ? ` · ${s.vias} VIA${s.vias > 1 ? 'S' : ''}` : ''}`;
    }
    draw();
  }

  function netAt(clientX: number, clientY: number) {
    if (!ready) return -1;
    const b = canvas.getBoundingClientRect();
    const cx = Math.floor(((clientX - b.left) / b.width) * cols);
    const cy = Math.floor(((clientY - b.top) / b.height) * rows);
    let best = -1;
    // tolérance d'une cellule autour du pointeur
    for (let r = 0; r <= 1 && best < 0; r++)
      for (let dy = -r; dy <= r && best < 0; dy++)
        for (let dx = -r; dx <= r && best < 0; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
          const i = y * cols + x;
          if (viaGrid[i] >= 0) best = viaGrid[i];
          else {
            const order: Layer[] = view === 'all' ? [...LAYERS] : [view];
            for (const L of order) {
              const c = grids[L][i];
              if (c.g >= 0 && c.g !== 8 && c.net >= 0) {
                best = c.net;
                break;
              }
            }
          }
        }
    return best;
  }

  let lastInput = 0;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    lastInput = performance.now();
    setHot(netAt(e.clientX, e.clientY));
  });
  canvas.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && (lastInput = 0));
  canvas.addEventListener('click', (e) => {
    lastInput = performance.now() + 4000;
    setHot(netAt(e.clientX, e.clientY));
  });

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      view = b.dataset.view as View;
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      draw(true);
    }),
  );

  // Sans interaction, la lecture parcourt quelques nets significatifs.
  const cycleIds = cycle.map((n) => byName.get(n)).filter((n): n is number => n !== undefined);
  let ci = 0;
  let visible = false;
  trackVisible(root, (v) => (visible = v));
  if (!reducedMotion() && cycleIds.length)
    setInterval(() => {
      if (!visible || document.hidden || performance.now() - lastInput < 3500) return;
      setHot(cycleIds[ci++ % cycleIds.length]);
    }, 2200);

  let lastW = stage.clientWidth;
  new ResizeObserver(() => {
    if (stage.clientWidth === lastW) return;
    lastW = stage.clientWidth;
    layout();
  }).observe(stage);
  await layout();
  setHot(cycleIds[0] ?? -1);
  ci = 1;
  root.classList.add('is-live');
}
