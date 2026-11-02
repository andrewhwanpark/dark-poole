// Atlas de glyphes partagé par tous les rendus ASCII de la page.

export const FONT = '"Geist Mono", ui-monospace, Menlo, monospace';
export const RAMP = ' .·:-=+*#%@';

export const INK = [233, 231, 226];
export const SIG = [255, 59, 29];

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function dpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

/**
 * Atlas 2D : une ligne par couleur, une colonne par caractère.
 * Dessiner une cellule = un seul drawImage, sans changement d'état du contexte.
 */
export class Atlas {
  readonly canvas: HTMLCanvasElement;
  readonly index = new Map<string, number>();

  constructor(
    readonly chars: string,
    readonly colors: string[],
    readonly cw: number,
    readonly ch: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = cw * chars.length;
    this.canvas.height = ch * colors.length;
    const ctx = this.canvas.getContext('2d')!;
    ctx.font = `${Math.round(ch * 0.62)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [...chars].forEach((c, i) => this.index.set(c, i));
    colors.forEach((col, row) => {
      ctx.fillStyle = col;
      [...chars].forEach((c, i) => ctx.fillText(c, i * cw + cw / 2, row * ch + ch * 0.54));
    });
  }

  draw(ctx: CanvasRenderingContext2D, ci: number, color: number, x: number, y: number) {
    ctx.drawImage(this.canvas, ci * this.cw, color * this.ch, this.cw, this.ch, x, y, this.cw, this.ch);
  }
}

export function rgba(c: number[], a: number) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/** Les mesures de glyphes dépendent de la police : on attend Geist Mono. */
export async function fontsReady() {
  try {
    await document.fonts.load(`12px ${FONT}`);
  } catch {
    /* police système en repli */
  }
}

/** Lance `cb` une fois quand l'élément approche du viewport. */
export function whenNear(el: Element, cb: () => void, margin = '60%') {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        cb();
      }
    },
    { rootMargin: margin },
  );
  io.observe(el);
}

/** Suivi de visibilité, pour suspendre les boucles d'animation hors écran. */
export function trackVisible(el: Element, cb: (visible: boolean) => void) {
  const io = new IntersectionObserver((entries) => cb(entries[entries.length - 1].isIntersecting));
  io.observe(el);
}
