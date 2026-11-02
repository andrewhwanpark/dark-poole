// Hero : le rendu est converti en ASCII sur le GPU, une loupe révèle la photographie.
import { FONT, RAMP, dpr, reducedMotion, trackVisible } from './glyphs';

// Rampe de densité, puis quatre glyphes de contour : |  \\  -  /
const GLYPHS = RAMP + '|\\-/';

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform sampler2D uImg;
uniform sampler2D uAtlas;
uniform vec2 uRes;
uniform vec2 uCell;
uniform float uImgAR;
uniform float uTime;
uniform float uIntro;
uniform float uScroll;
uniform float uN;
uniform float uRamp;
uniform vec3 uLens;
uniform vec2 uFocus;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec2 cover(vec2 uv) {
  float ar = uRes.x / uRes.y;
  vec2 s = ar > uImgAR ? vec2(1.0, uImgAR / ar) : vec2(ar / uImgAR, 1.0);
  vec2 o = (1.0 - s) * (uFocus - 0.5);
  vec2 r = (uv - 0.5) * s + 0.5 + o;
  return vec2(r.x, 1.0 - r.y);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 cell = uCell * (1.0 + uScroll * 1.6);
  vec2 ci = floor(frag / cell);
  vec2 cc = (ci + 0.5) * cell;

  // Luminance au centre de la cellule et gradient sur les voisines (contours).
  vec3 col = texture2D(uImg, cover(cc / uRes)).rgb;
  vec2 dx = vec2(cell.x, 0.0) / uRes;
  vec2 dy = vec2(0.0, cell.y) / uRes;
  vec3 W = vec3(0.2126, 0.7152, 0.0722);
  float ex = dot(texture2D(uImg, cover(cc / uRes + dx)).rgb - texture2D(uImg, cover(cc / uRes - dx)).rgb, W);
  float ey = dot(texture2D(uImg, cover(cc / uRes + dy)).rgb - texture2D(uImg, cover(cc / uRes - dy)).rgb, W);
  float lum = dot(col, W);
  lum = clamp(pow(lum, 0.6) * 1.55, 0.0, 0.999);
  float edge = clamp(length(vec2(ex, ey)) * 3.2, 0.0, 1.0);

  float g = floor(max(lum, edge * 0.75) * uRamp);
  // Sur un contour net, un glyphe orienté selon le bord.
  if (edge > 0.32 && edge > lum * 0.7) {
    float ang = mod(atan(ey, ex) + 3.14159, 3.14159);
    g = uRamp + mod(floor(ang / 0.785398 + 0.5), 4.0);
    lum = max(lum, edge);
  }

  // Apparition : balayage du haut vers le bas, chaque cellule passe par du bruit.
  float h = hash(ci);
  float thr = h * 0.45 + (1.0 - cc.y / uRes.y) * 0.55;
  float settled = step(thr, uIntro);
  float noiseG = floor(hash(ci + floor(uTime * 24.0)) * (uRamp - 1.0)) + 1.0;
  g = mix(noiseG, g, settled);

  // Scintillement rare, comme un bruit de signal.
  float sp = step(0.9975, hash(ci * 1.37 + floor(uTime * 7.0))) * step(0.08, lum);
  g = mix(g, floor(hash(ci + uTime) * (uRamp - 1.0)) + 1.0, sp);

  vec2 inCell = fract(frag / cell);
  inCell.y = 1.0 - inCell.y;
  float a = texture2D(uAtlas, vec2((g + inCell.x) / uN, inCell.y)).r;

  vec3 ink = vec3(0.914, 0.906, 0.886);
  vec3 hue = col / max(max(col.r, max(col.g, col.b)), 0.001);
  // Seuls les tons chauds (signal rouge, cuivre) colorent les glyphes.
  float warm = clamp((col.r - max(col.g, col.b)) * 4.0, 0.0, 1.0);
  vec3 tint = mix(ink, hue, warm * 0.9);
  float bright = mix(0.3, 1.0, smoothstep(0.02, 0.6, lum));
  bright *= mix(0.35, 1.0, settled);
  vec3 bg = vec3(0.024);
  vec3 ascii = bg + tint * a * bright;

  // Loupe : la photographie sous le champ de caractères.
  float d = distance(frag, uLens.xy);
  float m = (1.0 - smoothstep(uLens.z - 1.0, uLens.z + 1.0, d)) * step(1.0, uLens.z);
  vec3 photo = texture2D(uImg, cover(frag / uRes)).rgb;
  float ring = (1.0 - smoothstep(0.0, 1.25, abs(d - uLens.z))) * step(1.0, uLens.z);

  vec3 outc = mix(ascii, photo, m);
  outc += ring * vec3(0.5);
  outc = mix(outc, bg, uScroll * 0.85);
  gl_FragColor = vec4(outc, 1.0);
}
`;

interface HeroSource {
  url: string;
  focus: [number, number];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

export async function initHero(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas.hero-ascii')!;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) return;

  const portrait = () => root.clientWidth / root.clientHeight < 0.85;
  const sources: Record<'wide' | 'tall', HeroSource> = {
    wide: { url: root.dataset.wide!, focus: [0.5, 0.42] },
    tall: { url: root.dataset.tall!, focus: [0.5, 0.5] },
  };
  let mode: 'wide' | 'tall' = portrait() ? 'tall' : 'wide';
  let img = await loadImage(sources[mode].url);

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    img: U('uImg'), atlas: U('uAtlas'), res: U('uRes'), cell: U('uCell'), ar: U('uImgAR'),
    time: U('uTime'), intro: U('uIntro'), scroll: U('uScroll'), n: U('uN'), ramp: U('uRamp'), lens: U('uLens'), focus: U('uFocus'),
  };

  function texture(unit: number) {
    const t = gl!.createTexture()!;
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    return t;
  }
  const imgTex = texture(0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  const atlasTex = texture(1);
  gl.uniform1i(u.img, 0);
  gl.uniform1i(u.atlas, 1);
  gl.uniform1f(u.n, GLYPHS.length);
  gl.uniform1f(u.ramp, RAMP.length);

  let cellW = 0;
  let cellH = 0;
  function buildAtlas() {
    const r = dpr();
    const base = root.clientWidth < 700 ? 6 : root.clientWidth < 1200 ? 7 : 8;
    cellW = Math.round(base * r);
    cellH = Math.round(cellW * 1.72);
    const c = document.createElement('canvas');
    c.width = cellW * GLYPHS.length;
    c.height = cellH;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(cellW / 0.6)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [...GLYPHS].forEach((ch, i) => ctx.fillText(ch, i * cellW + cellW / 2, cellH * 0.55));
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, atlasTex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, c);
  }

  function resize() {
    const r = dpr();
    canvas.width = Math.round(root.clientWidth * r);
    canvas.height = Math.round(root.clientHeight * r);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    buildAtlas();
    const next = portrait() ? 'tall' : 'wide';
    if (next !== mode) {
      mode = next;
      loadImage(sources[mode].url).then((im) => {
        img = im;
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, imgTex);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, im);
        dirty = true;
      });
    }
    dirty = true;
  }

  // Loupe : suit le pointeur, sinon dérive lentement sur une courbe de Lissajous.
  const lens = { x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0 };
  let lastInput = -1e9;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const onPoint = (x: number, y: number) => {
    const b = canvas.getBoundingClientRect();
    lens.tx = x - b.left;
    lens.ty = y - b.top;
    lastInput = performance.now();
  };
  root.addEventListener('pointermove', (e) => onPoint(e.clientX, e.clientY), { passive: true });
  root.addEventListener('touchmove', (e) => onPoint(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  root.addEventListener('pointerleave', () => (lastInput = -1e9));

  let scroll = 0;
  const onScroll = () => {
    const s = Math.min(Math.max(window.scrollY / (root.clientHeight * 0.9), 0), 1);
    if (s !== scroll) {
      scroll = s;
      dirty = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const still = reducedMotion();
  const t0 = performance.now();
  let visible = true;
  let dirty = true;
  let raf = 0;
  let frame = 0;
  trackVisible(root, (v) => {
    visible = v;
    if (v && !raf) raf = requestAnimationFrame(loop);
  });

  function loop(now: number) {
    raf = 0;
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(loop);
    const t = (now - t0) / 1000;
    const intro = still ? 2 : Math.min(t / 1.9, 1) * 1.15;
    const w = root.clientWidth;
    const h = root.clientHeight;

    const active = now - lastInput < 2600;
    if (!active) {
      const k = t * 0.11;
      lens.tx = w * (0.5 + (mode === 'wide' ? 0.22 : 0.26) * Math.sin(k * 2.1));
      lens.ty = h * ((mode === 'wide' ? 0.4 : 0.36) + 0.1 * Math.sin(k * 3.3 + 1.2));
    }
    const baseR = Math.min(w, h) * (coarse ? 0.2 : 0.13);
    lens.tr = t < 1.6 || still ? 0 : baseR * (1 - scroll);
    const e = active ? 0.22 : 0.05;
    lens.x += (lens.tx - lens.x) * e;
    lens.y += (lens.ty - lens.y) * e;
    lens.r += (lens.tr - lens.r) * 0.08;

    // Au repos, 30 images/s suffisent ; pleine cadence pendant l'intro et l'interaction.
    frame++;
    if (!dirty && !active && intro >= 1.15 && frame % 2) return;
    dirty = false;

    const r = dpr();
    gl!.uniform2f(u.res, canvas.width, canvas.height);
    gl!.uniform2f(u.cell, cellW, cellH);
    gl!.uniform1f(u.ar, img.naturalWidth / img.naturalHeight);
    gl!.uniform1f(u.time, still ? 0 : t);
    gl!.uniform1f(u.intro, intro);
    gl!.uniform1f(u.scroll, scroll);
    gl!.uniform2f(u.focus, sources[mode].focus[0], sources[mode].focus[1]);
    gl!.uniform3f(u.lens, lens.x * r, canvas.height - lens.y * r, lens.r * r);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  new ResizeObserver(resize).observe(root);
  resize();
  onScroll();
  root.classList.add('is-live');
  raf = requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible && !raf) raf = requestAnimationFrame(loop);
  });
}
