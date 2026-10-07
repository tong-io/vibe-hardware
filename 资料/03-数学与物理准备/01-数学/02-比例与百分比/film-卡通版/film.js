// 比例与百分比 — Mid-century Cartoon, lesson 2 of the math series. The same teacher; lemonade glasses built from
// spoon-blocks, candies shared 3 : 2 into two jars, a 100-square board, a backpack on sale, a book's reading bar.
// Times come from the voice: each section starts on the beat grid; its lines follow one another with GAP pauses.
// Shared parts (timeline, teacher, equation card, tags, captions, medallion iris) come from lesson 1's film.js.
import { PAL, shape, ink, plane, ellipse, spline, rrect, rect, move, xform, star, sparkle, rays, text, measure, fit, arrow, dashed,
  paperFinish, setClock, clamp, lerp, seg, ss, eo, eio, back, twos, TAU, hash, starPts } from './engine/toon.js';
import { drawOwner } from './engine/chars.js';

const W = 1920, H = 1080, BPM = 112, BEAT = 60 / BPM;
const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const tint = (c, k) => mix(c, '#FFFFFF', k), shade = (c, k) => mix(c, '#2B2420', k);
const COL = { box: PAL.kraft, boxD: PAL.kraftD, boxL: PAL.kraftL, candy: PAL.coral, candyD: PAL.coralD, prod: PAL.teal, prodD: PAL.tealD, accent: PAL.coral, good: '#5E8F3E' };

const SECS = [
  ['hook', ['b01', 'b02', 'b03', 'b04', 'b05'], '#E8B43A'],
  ['s1', ['b06', 'b07', 'b08', 'b09', 'b10', 'b11'], '#7F9CC0'],
  ['s2', ['b12', 'b13', 'b14', 'b15', 'b16'], '#F0B4A8'],
  ['s3', ['b17', 'b18', 'b19', 'b20', 'b21'], '#A7AE5B'],
  ['s4', ['b22', 'b23', 'b24', 'b25', 'b26'], '#B9A5C9'],
  ['s5', ['b27', 'b28', 'b29', 'b30', 'b31'], '#F3D37F'],
  ['sum', ['b32', 'b33', 'b34', 'b35'], PAL.paper],
  ['end', ['b36', 'b37', 'b38', 'b39'], '#E8B43A'],
];
const STEP = { s1: [1, '比例：几份对几份'], s2: [2, '按比例分东西'], s3: [3, '百分比：每 100 份占几份'], s4: [4, '求百分之几'], s5: [5, '反过来求总数'] };
const LEAD = { hook: .7, s1: 1.5, s2: 1.5, s3: 1.5, s4: 1.5, s5: 1.5, sum: 1.0, end: .9 };
const GAP = {
  b01: .4, b02: 1.0, b03: 1.4, b04: .6, b05: 2.6,
  b06: .5, b07: .8, b08: .5, b09: 1.0, b10: .8, b11: 1.5,
  b12: .5, b13: .8, b14: .9, b15: 1.0, b16: 1.6,
  b17: .5, b18: 1.0, b19: 1.0, b20: 1.2, b21: 1.5,
  b22: .5, b23: .9, b24: .9, b25: .9, b26: 1.5,
  b27: .5, b28: .9, b29: .7, b30: 1.2, b31: 1.6,
  b32: .5, b33: .7, b34: .7, b35: 3.2,
  b36: .5, b37: .8, b38: .8, b39: 3.8,
};

let VO = {}, DURS = {}, WORDS = {}, TXT = {}, S = [], END = 0, EVS = [], SUBS = [];
const strip = s => s.replace(/[\s，。？！：；、“”,.?!:;]/g, '');
function timeAt(id, f) {
  const ws = WORDS[id].map(w => [w[0], Math.max(0, w[1]), w[2]]);
  const cum = [0]; ws.forEach(w => cum.push(cum[cum.length - 1] + Math.max(1, strip(w[0]).length)));
  const tot = cum[cum.length - 1], c = f * tot; let i = 0;
  while (i < ws.length - 1 && cum[i + 1] <= c) i++;
  return lerp(ws[i][1], ws[i][2], clamp((c - cum[i]) / ((cum[i + 1] - cum[i]) || 1)));
}
function atC(id, sub, o = {}) {
  const tx = strip(TXT[id]), s = strip(sub); let i = -1;
  for (let k = 0; k <= (o.k ?? 0); k++) { i = tx.indexOf(s, i + 1); if (i < 0) throw new Error(`"${sub}" not in ${id}`); }
  return VO[id] + timeAt(id, (o.end ? i + s.length : i) / tx.length);
}
const atE = (id, sub, o = {}) => atC(id, sub, { ...o, end: 1 });
const VE = id => VO[id] + DURS[id];
const ev = (t, type, o = {}) => EVS.push({ t: +t.toFixed(3), type, ...o });

export function setup(lines, durs, words) {
  DURS = durs; WORDS = words; TXT = Object.fromEntries(lines.map(l => [l.id, l.text]));
  let t = 0; S = [];
  for (const [kind, ids, ground] of SECS) {
    const t0 = Math.ceil(t / BEAT - 1e-6) * BEAT; let cur = t0 + LEAD[kind];
    for (const id of ids) { VO[id] = cur; cur += DURS[id] + (GAP[id] ?? .45); }
    S.push({ kind, ids, ground, t0, t1: cur, i: S.length }); t = cur;
  }
  for (let i = 0; i < S.length - 1; i++) S[i].t1 = S[i + 1].t0;
  END = +S[S.length - 1].t1.toFixed(2);
  buildScenes(); buildSubs(); buildEvents();
}
export const DUR = () => END;
export const events = () => EVS;
export const srtCues = () => SUBS;
const sec = k => S.find(s => s.kind === k);
const section = t => S.find(s => t >= s.t0 && t < s.t1) || S[S.length - 1];

// ───────────────────────────────────────── helpers
const pop = (t, t0, d = .28) => back(seg(t, t0, t0 + d), 1.9);
function scaled(ctx, k, x, y, fn) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y); fn(); ctx.restore(); }
const zhFont = s => /[一-鿿]/.test(s);

// ───────────────────────────────────────── props
function candy(ctx, x, y, o = {}) {                    // (x,y) = bottom centre
  const r = 22 * (o.s ?? 1), cy = y - r;
  shape(ctx, [[x - r * .8, cy], [x - r * 1.75, cy - r * .62], [x - r * 1.6, cy + r * .62]], { fill: COL.candyD, line: 2.6, seed: 300, grain: .1 });
  shape(ctx, [[x + r * .8, cy], [x + r * 1.75, cy - r * .62], [x + r * 1.6, cy + r * .62]], { fill: COL.candyD, line: 2.6, seed: 301, grain: .1 });
  shape(ctx, ellipse(x, cy, r, r, 24), { fill: COL.candy, line: 3, seed: 302, grain: .2, breaks: .1 });
  ink(ctx, ellipse(x, cy, r * .55, r * .55, 16, -2.6, -1.2), 3, { color: PAL.white, seed: 303 });
}
const POSES = {
  rest: { armF: null, handF: 'open', armB: null },
  point: { armF: { a1: -.42, a2: -.28 }, handF: 'point' },
  pointDown: { armF: { a1: .25, a2: .05 }, handF: 'point' },
  present: { armF: { a1: .15, a2: -.55 }, handF: 'open' },
  raise: { armF: { a1: -1.25, a2: -1.55 }, handF: 'open' },
  both: { armF: { a1: .1, a2: -.6 }, handF: 'open', armB: { a1: 2.9, a2: -2.6 }, handB: 'open' },
  shrug: { armF: { a1: .55, a2: -.35 }, handF: 'open', armB: { a1: 2.6, a2: -2.8 }, handB: 'open' },
  hold: { armF: { a1: .35, a2: -.9 }, handF: 'grip' },
};
const REST_F = { a1: 1.3, a2: 1.52 }, REST_B = { a1: 1.86, a2: 1.7 };
function teacher(ctx, t, keys, o = {}) {
  const tt = twos(t); let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= tt) i++;
  const k = keys[i], prev = keys[Math.max(0, i - 1)], P = POSES[k[1]], Q = POSES[prev[1]];
  const mid = i > 0 && tt - k[0] < 1 / 12;            // one in-between drawing
  const arm = (p, q, rest) => { const a = p || rest, b = q || rest; return mid ? { a1: (a.a1 + b.a1) / 2, a2: (a.a2 + b.a2) / 2 } : a; };
  const talking = Object.keys(VO).some(id => t >= VO[id] + .05 && t < VE(id) - .05) && !o.mute;
  let face = k[2] || 'neutral';
  if (talking && (face === 'neutral' || face === 'happy') && Math.floor(t * 7) % 2) face = 'talk';
  const blink = (t % 3.7) < .13 ? 1 : 0;
  drawOwner(ctx, { x: o.x ?? 300, y: o.y ?? 900, s: o.s ?? 1.06, dir: o.dir ?? 1, view: 'q', face, blink,
    armF: arm(P.armF, Q.armF, REST_F), armB: arm(P.armB, Q.armB, REST_B), handF: P.handF || 'open', handB: P.handB || 'open', look: k[3] || [3, 0] }, t);
}

// ───────────────────────────────────────── equation card (top right): rows of tokens, ops pills, jumps
const CARD = { x: 860, y: 66, w: 900, rowH: 108, maxRows: 3 };
const FZ = '86px QK', FL = '96px Slab';
function tokW(ctx, s) { return measure(ctx, s, zhFont(s) ? FZ : FL); }
function layoutRow(ctx, r) {
  const gap = 22, ws = r.toks.map(tk => tokW(ctx, tk.s ?? tk));
  const ei = r.toks.findIndex(tk => (tk.s ?? tk) === '=' || (tk.s ?? tk) === ':'), ex = CARD.x + CARD.w / 2;
  let x = ex - ws[ei] / 2; for (let i = ei - 1; i >= 0; i--) x -= ws[i] + gap;
  const tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1), lo = CARD.x + 40, hi = CARD.x + CARD.w - 40;
  if (x < lo || x + tot > hi) x = CARD.x + (CARD.w - tot) / 2;   // too wide to keep '=' centred: centre the row
  return r.toks.map((tk, i) => { const x0 = x; x += ws[i] + gap; return { s: tk.s ?? tk, c: tk.c, x0, cx: x0 + ws[i] / 2, w: ws[i] }; });
}
function drawCard(ctx, t, C) {
  const rows = C.rows.filter(r => t >= r.t - .02);
  if (!rows.length || t < C.t0) return;
  const kIn = pop(t, C.t0, .3);
  const page = rows[rows.length - 1].page ?? 0;
  const cur = C.rows.filter(r => (r.page ?? 0) === page);
  const pageT = cur[0].t;
  const ns = cur.reduce((a, r) => a + ss(seg(t, r.t, r.t + .35)), 0);
  const first = Math.max(0, ns - CARD.maxRows);
  scaled(ctx, kIn, CARD.x + CARD.w / 2, CARD.y, () => {
    const h = CARD.rowH * CARD.maxRows + 40;
    shape(ctx, rrect(CARD.x, CARD.y, CARD.w, h, 18), { fill: PAL.white, line: 4, seed: 600, grain: .12, off: [7, 6] });
    ctx.save(); ctx.beginPath(); ctx.rect(CARD.x + 8, CARD.y + 8, CARD.w - 16, h - 16); ctx.clip();
    // previous page fades out under the new one
    const prevRows = C.rows.filter(r => (r.page ?? 0) === page - 1 && r.t <= t);
    if (prevRows.length && t < pageT + .3) drawRows(ctx, t, C, prevRows, Math.max(0, prevRows.length - CARD.maxRows), 1 - seg(t, pageT, pageT + .3));
    drawRows(ctx, t, C, cur.filter(r => t >= r.t - .02), first, 1);
    ctx.restore();
    for (const j of C.jumps || []) drawJump(ctx, t, C, j);
  });
}
function rowY(i, first) { return CARD.y + 20 + CARD.rowH * (i - first) + CARD.rowH * .72; }
function drawRows(ctx, t, C, rows, first, alpha) {
  rows.forEach((r, i) => {
    const y = rowY(i, first), a = alpha * clamp(1 - (first - i)); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    if (r.ops) {
      const ref = r.ref.L || (r.ref.L = layoutRow(ctx, r.ref));
      r.ops.forEach(([ti, lab], j) => {
        const k = pop(t, r.t + j * .12); if (k <= 0) return; const x = ref[ti].cx;
        scaled(ctx, k, x, y - 26, () => {
          const w = measure(ctx, lab, '56px Slab') + 44;
          shape(ctx, rrect(x - w / 2, y - 64, w, 72, 36), { fill: COL.accent, line: 3, seed: 610 + j, grain: .15 });
          text(ctx, lab, x, y - 9, { font: '56px Slab', fill: PAL.white, align: 'center' });
        });
      });
    } else {
      const L = r.L || (r.L = layoutRow(ctx, r));
      L.forEach((tk, j) => {
        const k = pop(t, r.t + j * (r.stagger ?? .07)); if (k <= 0) return;
        const hid = (C.jumps || []).some(jp => jp.from[0] === r && jp.from[1] === j && t >= jp.t);
        if (hid) return;
        const isAns = r.ans && j === L.length - 1;
        scaled(ctx, k, tk.cx, y - 30, () => {
          if (isAns) star(ctx, tk.cx, y - 30, 66, { n: 12, inner: .62, fill: PAL.mustardL, off: [0, 0], rot: t * .3 });
          const f = zhFont(tk.s) ? FZ : FL;
          text(ctx, tk.s, tk.cx, y, { font: f, fill: tk.c || (isAns ? COL.candyD : PAL.ink), plate: tk.c ? null : PAL.mustardL, off: [4, 4], align: 'center' });
        });
      });
      if (r.under) { const k = seg(t, r.under, r.under + .4); if (k > 0) ink(ctx, [[L[0].x0 - 10, y + 16], [L[L.length - 1].x0 + L[L.length - 1].w + 10, y + 14]], 6, { color: COL.accent, upto: k, seed: 620 }); }
      if (r.check) { const k = pop(t, r.check); if (k > 0) scaled(ctx, k, L[L.length - 1].x0 + L[L.length - 1].w + 60, y - 30, () => checkMark(ctx, L[L.length - 1].x0 + L[L.length - 1].w + 60, y - 30, 34)); }
    }
    ctx.restore();
  });
}
function checkMark(ctx, x, y, r) {
  shape(ctx, ellipse(x, y, r, r, 24), { fill: COL.good, line: 3, seed: 630, grain: .1 });
  ink(ctx, [[x - r * .45, y], [x - r * .1, y + r * .38], [x + r * .5, y - r * .4]], 6, { color: PAL.white, seed: 631, taper: false });
}
// a token that leaves its row, flies over the "=" and lands (flipping its sign) where the next row will show it
function drawJump(ctx, t, C, j) {
  if (t < j.t || t > j.t + j.dur + .05) return;
  const rowsAt = C.rows.filter(r => (r.page ?? 0) === (j.to[0].page ?? 0) && r.t <= j.t + j.dur);
  const fromI = rowsAt.indexOf(j.from[0]), toI = rowsAt.indexOf(j.to[0]);
  const first = Math.max(0, rowsAt.length - CARD.maxRows);
  const A = (j.from[0].L || (j.from[0].L = layoutRow(ctx, j.from[0])))[j.from[1]], B = (j.to[0].L || (j.to[0].L = layoutRow(ctx, j.to[0])))[j.to[1]];
  const u = seg(t, j.t, j.t + j.dur), e = eio(u);
  const x = lerp(A.cx, B.cx, e), y = lerp(rowY(fromI, first), rowY(toI, first), e) - Math.sin(Math.PI * u) * 150;
  const flip = Math.abs(Math.cos(Math.PI * u)), lab = u < .5 ? A.s : B.s;
  ctx.save(); ctx.translate(x, y - 30); ctx.scale(Math.max(.05, flip) * 1.15, 1.15); ctx.translate(-x, -(y - 30));
  text(ctx, lab, x, y, { font: zhFont(lab) ? FZ : FL, fill: COL.candyD, plate: PAL.mustardL, off: [4, 4], align: 'center' });
  ctx.restore();
  dashed(ctx, [[A.cx, rowY(fromI, first) - 90], [lerp(A.cx, B.cx, .5), Math.min(rowY(fromI, first), rowY(toI, first)) - 170], [B.cx, rowY(toI, first) - 90]].map((p, i, a) => p), 3, 10, 9, -t * 30, COL.accent, u);
}

// ───────────────────────────────────────── UI: step header, tags, caption card, medallion, call-out
function stepHeader(ctx, t, s) {
  const [num, title] = STEP[s.kind]; const k = eo(seg(twos(t), s.t0 + .25, s.t0 + .6)); if (k <= 0) return;
  ctx.save(); ctx.translate(-(1 - k) * 700, 0);
  shape(ctx, ellipse(118, 128, 54, 54, 40), { fill: PAL.ink, line: 0, seed: 700, grain: .1, off: [0, 0] });
  text(ctx, String(num), 118, 151, { font: '62px Slab', fill: PAL.paper, align: 'center' });
  text(ctx, `第 ${num} 步 · 共 5 步`, 192, 104, { font: '700 24px NS', fill: PAL.ink, track: 4 });
  const f = fit(ctx, title, '{px}px QK', 58, 600, 1, 36);
  text(ctx, title, 190, 166, { font: f.font, fill: PAL.ink, plate: PAL.white, off: [4, 4] });
  ctx.restore();
}
function tag(ctx, t, t0, str, x, y, o = {}) {
  if (o.t1 && t > o.t1 + .25) return;
  const k = pop(t, t0) * (o.t1 ? 1 - ss(seg(t, o.t1, o.t1 + .25)) : 1); if (k <= 0) return;
  const font = `700 ${o.px || 40}px NS`, w = measure(ctx, str, font) + 100, h = (o.px || 40) + 40;
  const X = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  scaled(ctx, k, X + w / 2, y + h / 2, () => {
    shape(ctx, rrect(X, y, w, h, 16), { fill: o.fill || PAL.white, line: 3.6, seed: 710, grain: .15, off: [6, 5] });
    star(ctx, X + 38, y + h / 2, 17, { n: 8, inner: .42, fill: o.star || COL.accent, off: [0, 0], rot: t * .6 });
    text(ctx, str, X + 66, y + h / 2 + (o.px || 40) * .36, { font, fill: o.ink || PAL.ink });
  });
}
function bigMark(ctx, t, t0, t1, x, y, kind) {        // a stamped ✕ (wrong) or ✓ (right)
  if (t < t0 || t > t1 + .25) return; const k = pop(t, t0, .22) * (1 - ss(seg(t, t1, t1 + .25)));
  scaled(ctx, k, x, y, () => {
    star(ctx, x, y, 110, { n: 14, inner: .75, fill: kind === 'x' ? '#C9473A' : COL.good, off: [0, 0] });
    if (kind === 'x') { ink(ctx, [[x - 40, y - 40], [x + 40, y + 40]], 16, { color: PAL.white, seed: 720, taper: false }); ink(ctx, [[x + 40, y - 40], [x - 40, y + 40]], 16, { color: PAL.white, seed: 721, taper: false }); }
    else ink(ctx, [[x - 46, y], [x - 12, y + 36], [x + 50, y - 40]], 16, { color: PAL.white, seed: 722, taper: false });
  });
}
function caption(ctx, t) {
  const c = SUBS.find(s => t >= s.t0 && t < s.t1); if (!c) return;
  const a = Math.min(ss(seg(t, c.t0, c.t0 + .16)), 1 - ss(seg(t, c.t1 - .16, c.t1)));
  const f = fit(ctx, c.text, '500 {px}px NS', 40, 1300, 1, 30), w = measure(ctx, c.text, f.font) + 130, h = 76, x = W / 2 - w / 2, y = H - 54 - h;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 10);
  shape(ctx, rrect(x, y, w, h, 12), { fill: PAL.paper, line: 3.2, seed: 901, grain: .15, breaks: .08, off: [5, 5] });
  star(ctx, x + 32, y + h / 2, 14, { n: 8, inner: .4, fill: COL.accent, off: [0, 0], rot: t * .8 });
  star(ctx, x + w - 32, y + h / 2, 14, { n: 8, inner: .4, fill: COL.accent, off: [0, 0], rot: -t * .8 });
  text(ctx, c.text, W / 2, y + h / 2 + f.px * .36, { font: f.font, fill: PAL.ink, align: 'center' });
  ctx.restore();
}
function medallion(ctx, x, y, n, r, fill, k = 1) {
  scaled(ctx, k, x, y, () => {
    star(ctx, x, y, r * 1.2, { n: 16, inner: .84, fill: PAL.white, off: [0, 0], rot: n * .2 });
    shape(ctx, ellipse(x, y, r, r, 64), { fill, line: 5, seed: 730 + n, grain: .3 });
    text(ctx, String(n), x, y + r * .38, { font: `${Math.round(r * 1.1)}px Slab`, fill: PAL.ink, plate: PAL.white, off: [5, 5], align: 'center' });
  });
}
function callout(ctx, t, t0, t1, cx, cy, r, inner, bgc, leader) {
  if (t < t0 || t > t1 + .3) return;
  const k = back(seg(t, t0, t0 + .32), 1.5) * (1 - ss(seg(t, t1, t1 + .3))); if (k <= 0) return; const R = r * k;
  if (leader) { const a = Math.atan2(leader[1] - cy, leader[0] - cx); dashed(ctx, [[cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14)], leader], 4, 14, 10, -t * 40, PAL.ink, clamp(k)); }
  shape(ctx, ellipse(cx, cy, R + 14, R + 14, 72), { fill: PAL.paper, line: 4.5, seed: 740, grain: .15, breaks: .05 });
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip(); ctx.fillStyle = bgc; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.translate(cx, cy); ctx.scale(k, k); inner(ctx); ctx.restore();
  ink(ctx, ellipse(cx, cy, R, R, 72), 4, { closed: true, seed: 741, breaks: .1 });
}
function ground(ctx, col, floorY = 900) {
  ctx.fillStyle = tint(col, .2); ctx.fillRect(-400, -400, W + 800, floorY + 400);
  plane(ctx, rect(-400, floorY, W + 800, H - floorY + 400), shade(col, .14));
  ink(ctx, [[-50, floorY], [W * .2, floorY], [W * .23, floorY]], 4, { seed: 760, breaks: .3, taper: false });
  ink(ctx, [[W * .27, floorY], [W + 50, floorY]], 4, { seed: 761, breaks: .25, taper: false });
  // a couple of atomic ornaments on the wall
  sparkle(ctx, 140, 330, 26, { fill: tint(col, .6) }); sparkle(ctx, 1820, 520, 20, { fill: tint(col, .6) });
  star(ctx, 1830, 300, 30, { n: 8, inner: .4, fill: tint(col, .5), off: [0, 0] });
}

// ───────────────────────────────────────── scenes

// ───────────────────────────────────────── props for this lesson
const LEMON = PAL.mustard, WATER = '#A9CBE3', SP = 36;   // one spoon = one block, SP px tall
// a glass of lemonade at (x, y = bottom): blocks [{c:'l'|'w', t}] fall in and stack. o.hi(i,t) → 0..1 highlight
function glass(ctx, x, y, cap, blocks, t, o = {}) {
  const w = 150, h = cap * SP + 34, x0 = x - w / 2;
  const body = [[x0 - 6, y - h], [x0 + w + 6, y - h], [x0 + w - 4, y], [x0 + 4, y]];
  shape(ctx, body, { fill: PAL.white, alpha: .45, line: 0, grain: 0, off: [0, 0] });
  let n = 0;
  blocks.forEach((b, i) => {
    if (t < b.t - .35) return;
    const u = clamp((t - b.t + .35) / .35), yy = y - 5 - (n + 1) * SP, drop = (1 - u * u) * 300;
    const a = o.dim ? o.dim(i, t) : 1;
    shape(ctx, rect(x0 + 9, yy - drop, w - 18, SP - 3), { fill: b.c === 'l' ? LEMON : WATER, line: 2.6, seed: 500 + i, grain: .2, alpha: a });
    if (o.hi && o.hi(i, t) > 0) ink(ctx, rrect(x0 + 2, yy - drop - 4, w - 4, SP + 5, 6), 5, { closed: true, color: COL.accent, seed: 520 + i, upto: o.hi(i, t) });
    n++;
  });
  ink(ctx, [[x0 - 6, y - h], [x0 + 4, y]], 4, { seed: 530, taper: false }); ink(ctx, [[x0 + w + 6, y - h], [x0 + w - 4, y]], 4, { seed: 531, taper: false });
  ink(ctx, [[x0 + 4, y], [x0 + w - 4, y]], 4.5, { seed: 532, taper: false });
  ink(ctx, ellipse(x, y - h, w / 2 + 6, 9, 30), 3.4, { closed: true, seed: 533, breaks: .2, color: COL.prodD });
  ink(ctx, [[x0 + 16, y - h + 22], [x0 + 22, y - 22]], 6, { color: PAL.white, alpha: .7, seed: 534, taper: true });
  return { top: y - h, x };
}
function table(ctx, x0, x1, y) {
  shape(ctx, rect(x0 + 40, y + 20, 22, 900 - y - 20), { fill: PAL.kraftD, line: 3, seed: 540, grain: .2 });
  shape(ctx, rect(x1 - 62, y + 20, 22, 900 - y - 20), { fill: PAL.kraftD, line: 3, seed: 541, grain: .2 });
  shape(ctx, rrect(x0, y, x1 - x0, 26, 6), { fill: PAL.kraft, line: 3.6, seed: 542, grain: .3, shade: [{ pts: rect(x0, y + 16, x1 - x0, 12), color: PAL.kraftD, alpha: .6 }] });
}
function plate(ctx, x, y, str, o = {}) {              // a little name plate (小杯 / 大杯)
  const f = `${o.px || 40}px QK`, w = measure(ctx, str, f) + 40;
  shape(ctx, rrect(x - w / 2, y, w, (o.px || 40) + 22, 10), { fill: PAL.paper, line: 3, seed: 545, grain: .1 });
  text(ctx, str, x, y + (o.px || 40) * .95, { font: f, fill: PAL.ink, align: 'center' });
}
function chip(ctx, x, y, col, str) {                   // legend: a colour block + its name
  shape(ctx, rect(x, y - 30, 56, 32), { fill: col, line: 2.6, seed: 548, grain: .2 });
  text(ctx, str, x + 72, y, { font: '700 32px NS', fill: PAL.ink });
}
function jar(ctx, x, y, label) {                       // (x,y) = bottom centre
  const w = 210, h = 230;
  shape(ctx, rrect(x - w / 2, y - h, w, h, 30), { fill: PAL.white, alpha: .5, line: 0, grain: 0, off: [0, 0] });
  return () => {                                     // the front: outline, lid, label (drawn after the candies inside)
    ink(ctx, rrect(x - w / 2, y - h, w, h, 30), 4.2, { closed: true, seed: 550, breaks: .12 });
    shape(ctx, rrect(x - w / 2 + 14, y - h - 34, w - 28, 38, 10), { fill: COL.prod, line: 3.4, seed: 551, grain: .3 });
    ink(ctx, [[x - w / 2 + 24, y - h + 30], [x - w / 2 + 24, y - 40]], 7, { color: PAL.white, alpha: .7, seed: 552 });
    plate(ctx, x, y + 14, label, { px: 36 });
  };
}
const jarSlot = (x, y, k) => [x + ((k % 3) - 1) * 58, y - 8 - Math.floor(k / 3) * 46];
function hundred(ctx, x0, y0, cell, n, quad, t) {     // the 100-square board (teal frame = this lesson's product)
  const S = cell * 10;
  shape(ctx, rrect(x0 - 26, y0 - 26, S + 52, S + 52, 18), { fill: COL.prod, line: 4.5, seed: 560, grain: .3, shade: [{ pts: rect(x0 + S - 10, y0 - 30, 40, S + 60), color: COL.prodD, alpha: .5 }] });
  shape(ctx, rect(x0, y0, S, S), { fill: PAL.paper, line: 0, grain: .1, off: [0, 0] });
  for (let i = 0; i < 100; i++) {
    const r = Math.floor(i / 10), c = i % 10, fill = i < Math.floor(n) ? 1 : i < n ? n - Math.floor(n) : 0;
    if (fill <= 0) continue;
    let gx = c, gy = r;
    if (quad > 0 && i < 25) { const tr = Math.floor(i / 5), tc = i % 5; gx = lerp(c, tc, eio(quad)); gy = lerp(r, tr, eio(quad)); }
    shape(ctx, rect(x0 + gx * cell + 3, y0 + gy * cell + 3, cell - 6, cell - 6), { fill: COL.accent, line: 0, grain: .15, seed: 561 + i, alpha: fill });
  }
  for (let k = 1; k < 10; k++) {
    ink(ctx, [[x0 + k * cell, y0], [x0 + k * cell, y0 + S]], 1.6, { seed: 570 + k, taper: false, color: PAL.inkSoft, alpha: .6 });
    ink(ctx, [[x0, y0 + k * cell], [x0 + S, y0 + k * cell]], 1.6, { seed: 580 + k, taper: false, color: PAL.inkSoft, alpha: .6 });
  }
  if (quad > 0) { dashed(ctx, [[x0 + S / 2, y0 - 10], [x0 + S / 2, y0 + S + 10]], 6, 16, 10, -t * 30, PAL.ink, quad); dashed(ctx, [[x0 - 10, y0 + S / 2], [x0 + S + 10, y0 + S / 2]], 6, 16, 10, -t * 30, PAL.ink, quad); }
  ink(ctx, rect(x0, y0, S, S), 4, { closed: true, seed: 590 });
}
function backpack(ctx, x, y) {                          // (x,y) = bottom centre
  ink(ctx, spline([[x - 60, y - 280], [x, y - 330], [x + 60, y - 280]], false, 8), 12, { seed: 600, taper: false });
  shape(ctx, rrect(x - 120, y - 290, 240, 290, 50), { fill: PAL.avocado, line: 4.2, seed: 601, grain: .3, shade: [{ pts: rect(x + 60, y - 300, 70, 300), color: PAL.avocadoD, alpha: .5 }] });
  shape(ctx, rrect(x - 80, y - 130, 160, 110, 24), { fill: PAL.avocadoL, line: 3.4, seed: 602, grain: .2 });
  ink(ctx, [[x - 80, y - 100], [x + 80, y - 100]], 3, { seed: 603, taper: false });
  shape(ctx, ellipse(x, y - 200, 22, 22, 18), { fill: PAL.mustard, line: 3, seed: 604, grain: .1 });
}
function priceTag(ctx, x, y, str, k = 1) {
  scaled(ctx, k, x, y, () => {
    ink(ctx, [[x - 70, y - 70], [x - 20, y - 20]], 3, { seed: 610, taper: false });
    shape(ctx, xform([[-60, -30], [60, -30], [80, 0], [60, 30], [-60, 30]], x + 40, y + 10, -.25), { fill: PAL.white, line: 3.4, seed: 611, grain: .1 });
    text(ctx, str, x + 42, y + 26, { font: '40px Slab', fill: PAL.ink, align: 'center', rot: -.25 });
  });
}
function book(ctx, x, y) {                              // an open book, (x,y) = bottom centre
  shape(ctx, [[x, y - 210], [x - 220, y - 236], [x - 230, y - 10], [x, y]], { fill: PAL.white, line: 4, seed: 620, grain: .2 });
  shape(ctx, [[x, y - 210], [x + 220, y - 236], [x + 230, y - 10], [x, y]], { fill: PAL.white, line: 4, seed: 621, grain: .2, shade: [{ pts: [[x, y - 214], [x + 30, y - 216], [x + 34, y], [x, y]], color: PAL.paperD }] });
  for (let i = 0; i < 6; i++) { ink(ctx, [[x - 196, y - 196 + i * 30], [x - 30, y - 178 + i * 30]], 3, { seed: 622 + i, color: PAL.inkSoft }); ink(ctx, [[x + 30, y - 178 + i * 30], [x + 196, y - 196 + i * 30]], 3, { seed: 630 + i, color: PAL.inkSoft }); }
  shape(ctx, [[x - 236, y - 6], [x + 236, y - 6], [x + 240, y + 16], [x - 240, y + 16]], { fill: PAL.coral, line: 3.4, seed: 640, grain: .2 });
}
function segBar(ctx, x0, y, segW, n, fills, labels, t, o = {}) {   // a bar of n segments; fills[i] 0..1, labels[i] string|null
  for (let i = 0; i < n; i++) {
    const off = o.off ? o.off(i, t) : null, X = x0 + i * segW + (off ? off[0] : 0), Y = y + (off ? off[1] : 0);
    ctx.save(); if (off) ctx.globalAlpha *= off[2] ?? 1;
    shape(ctx, rect(X, Y, segW, 54), { fill: fills[i] > 0 ? mix(PAL.paper, o.col || LEMON, fills[i]) : PAL.paper, line: 3.4, seed: 650 + i, grain: .15, breaks: .05 });
    if (labels[i]) text(ctx, labels[i], X + segW / 2, Y + 40, { font: `${o.px || 32}px Slab`, fill: PAL.ink, align: 'center' });
    ctx.restore();
  }
}
const ramp = (t, keys) => { let v = keys[0][1]; for (const [t0, a, b, d] of keys) if (t >= t0) v = lerp(a, b, eio(seg(t, t0, t0 + d))); return v; };

// ───────────────────────────────────────── scenes
let SC = {};
const GL = { s: 960, b: 1380, top: 800 };
const BLK = (spec) => spec.flatMap(([c, n, t0, dt]) => Array.from({ length: n }, (_, i) => ({ c, t: t0 + i * dt })));
function buildScenes() {
  SC = {};
  {
    const s = sec('hook');
    SC.hook = { small: BLK([['l', 1, atC('b02', '1 勺'), 0], ['w', 3, atC('b02', '3 勺'), .18]]), big: BLK([['l', 2, atC('b02', '2 勺'), .18], ['w', 8, atC('b02', '8 勺'), .1]]),
      q: atC('b03', '哪一杯'), more: VO.b04, moreEnd: VE('b04') + .2, title: atC('b05', '比例') - .1,
      pose: [[s.t0, 'rest'], [VO.b02 + .2, 'present'], [VO.b03, 'point', 'wow'], [VO.b04, 'shrug'], [VO.b05, 'both', 'happy']] };
  }
  {
    const s = sec('s1');
    const r0 = { t: atC('b07', '写作'), toks: ['1', ':', '3'] };
    const r1 = { t: atC('b09', '乘 2'), ops: [[0, '×2'], [2, '×2']], ref: r0 };
    const r2 = { t: atC('b09', '6 勺'), toks: ['2', ':', '6'], ans: 1 };
    SC.s1 = { small: BLK([['l', 1, s.t0 - 1, 0], ['w', 3, s.t0 - 1, 0]]), big: BLK([['l', 2, atC('b09', '2 勺'), .18], ['w', 6, atC('b09', '6 勺'), .12]]), bigIn: VO.b09 - .1,
      card: { t0: atC('b07', '写作') - .3, rows: [r0, r1, r2] }, same: atC('b10', '同一个'), rule: atC('b11', '两边乘'),
      hiS: atC('b07', '1 勺'), hiW: atC('b07', '3 勺'),
      pose: [[s.t0, 'rest'], [VO.b07, 'point'], [VO.b08, 'shrug'], [VO.b09, 'both'], [VO.b10, 'present', 'happy'], [VO.b11, 'raise', 'wink']] };
  }
  {
    const s = sec('s2'), tIn = atC('b13', '10 颗'), tPair = atC('b15', '分成 5 份') - .2, tG = atC('b16', '哥哥'), tM = atC('b16', '妹妹');
    const candies = Array.from({ length: 10 }, (_, i) => {
      const pair = Math.floor(i / 2), toG = pair < 3, k = toG ? i : i - 6, tFly = (toG ? tG : tM) + (toG ? pair : pair - 3) * .35;
      return { i, pair, x: 870 + i * 64 + (pair * 18), tIn: tIn + i * .08, tFly, jar: toG ? 0 : 1, slot: k };
    });
    const r0 = { t: atC('b14', '3 加 2'), toks: ['3 + 2', '=', '5 份'] };
    const r1 = { t: atC('b15', '每份'), toks: ['10 ÷ 5', '=', '2 颗'] };
    const r2 = { t: atC('b16', '6 颗') - .2, toks: ['哥哥', '=', '3 × 2', '=', '6'], ans: 1 };
    const r3 = { t: atC('b16', '4 颗') - .2, toks: ['妹妹', '=', '2 × 2', '=', '4'], ans: 1 };
    SC.s2 = { candies, slots: [atC('b14', '3 加'), atC('b14', '2，是')], pairs: tPair, ok: atC('b16', '正好'),
      card: { t0: atC('b14', '3 加 2') - .3, rows: [r0, r1, r2, r3] },
      pose: [[s.t0, 'rest'], [VO.b13, 'present'], [VO.b14, 'point'], [VO.b15, 'both', 'focus'], [VO.b16, 'pointDown'], [atC('b16', '正好'), 'raise', 'happy']] };
  }
  {
    const s = sec('s3'), a = atC('b18', '涂上'), b = atC('b19', '一半'), c = atC('b19', '涂满'), d = VO.b20 + .1, q = atC('b20', '四分之一') - .2;
    const r0 = { t: atC('b18', '就是'), toks: ['25 格', '=', '25%'] }, r1 = { t: atC('b19', '是 50%'), toks: ['50 格', '=', '50%'] }, r2 = { t: atC('b19', '是 100%'), toks: ['100 格', '=', '100%'] };
    const p0 = { t: VO.b20 + .3, toks: ['25%', '=', '25 ÷ 100'], page: 1 }, p1 = { t: q, toks: ['', '=', '1/4'], page: 1 }, p2 = { t: atC('b20', '0.25'), toks: ['', '=', '0.25'], page: 1, ans: 1 };
    SC.s3 = { fillKeys: [[0, 0, 0, .1], [a, 0, 25, 1.4], [b, 25, 50, .9], [c, 50, 100, 1.0], [d, 100, 25, .6]], quad: [q, q + .9],
      card: { t0: atC('b18', '就是') - .3, rows: [r0, r1, r2, p0, p1, p2] }, pct: atC('b21', '百分号'), fills: [a, b, c],
      pose: [[s.t0, 'rest'], [VO.b18, 'present'], [a, 'point'], [VO.b19, 'both', 'happy'], [VO.b20, 'point', 'focus'], [VO.b21, 'raise', 'wink']] };
  }
  {
    const s = sec('s4'), tBar = atC('b24', '80 乘'), t20 = atC('b24', '等于 20'), tCut = atC('b25', '省 20');
    const r0 = { t: VO.b24 + .1, toks: ['省', '=', '80 × 25%'] }, r1 = { t: tBar, toks: ['', '=', '80 × 0.25'] }, r2 = { t: t20, toks: ['', '=', '20 元'], ans: 1 };
    const p0 = { t: atC('b25', '只要付'), toks: ['付', '=', '80 − 20', '=', '60 元'], ans: 1, page: 1 };
    SC.s4 = { pack: VO.b23 - .1, price: atC('b23', '80 元') - .1, sale: atC('b23', '便宜'), tBar, t20, tCut, pay: atC('b25', '只要付'), rule: atC('b26', '部分'),
      card: { t0: VO.b24 - .2, rows: [r0, r1, r2, p0] },
      pose: [[s.t0, 'rest'], [VO.b23, 'present'], [VO.b24, 'point'], [t20, 'raise', 'happy'], [VO.b25, 'pointDown'], [VO.b26, 'present', 'wink']] };
  }
  {
    const s = sec('s5'), tRead = atC('b28', '读了'), t60 = atC('b28', '60 页'), tEach = atC('b30', '60 除以'), t200 = atC('b30', '200 页') - .1;
    const r0 = { t: atC('b29', '60 等于'), toks: ['60', '=', '总数 × 30%'] }, r1 = { t: atC('b30', '两边同时'), ops: [[0, '÷30%'], [2, '÷30%']], ref: r0 };
    const r2 = { t: atC('b30', '总数等于'), toks: ['总数', '=', '60 ÷ 0.3'] }, r3 = { t: atC('b30', '200 页') - .1, toks: ['', '=', '200 页'], ans: 1 };
    const p0 = { t: VO.b31 + .2, toks: ['200 × 30%', '=', '60'], page: 1, check: atC('b31', '对了') - .1 };
    SC.s5 = { bookIn: VO.b28 - .1, tRead, t60, tEach, t200, callback: atC('b29', '上节课'),
      card: { t0: atC('b29', '60 等于') - .3, rows: [r0, r1, r2, r3, p0] },
      pose: [[s.t0, 'rest'], [VO.b28, 'present'], [VO.b29, 'point', 'focus'], [VO.b30, 'both'], [t200, 'raise', 'happy'], [VO.b31, 'point'], [atC('b31', '对了'), 'raise', 'happy']] };
  }
  {
    const s = sec('sum');
    SC.sum = { rows: [atC('b33', '比例'), atC('b34', '百分比'), atC('b35', '部分')], pose: [[s.t0, 'present'], [VO.b33, 'point'], [VE('b35'), 'raise', 'happy']],
      lines: ['比例：几份对几份，两边乘同一个数不变', '百分比：每 100 份占几份，% 就是 ÷100', '部分 = 总数 × 百分比，反过来用除法'] };
    const e = sec('end');
    SC.end = { small: BLK([['l', 1, e.t0 - 1, 0], ['w', 3, e.t0 - 1, 0]]), big: BLK([['l', 2, e.t0 - 1, 0], ['w', 8, e.t0 - 1, 0]]),
      a: atC('b37', '一共'), a25: atC('b37', '25%') - .1, b: atC('b38', '一共'), b20: atC('b38', '20%') - .1, win: atC('b39', '更酸') - .2,
      irisT: END - 2.4, irisF: [GL.s, 610], titleX: 1560, title: ['比例与百分比', '看占多少，不只看有多少'],
      pose: [[e.t0, 'present'], [VO.b37, 'point', 'focus'], [VO.b38, 'pointDown', 'focus'], [VO.b39, 'raise', 'happy']] };
  }
}

function glassesScene(ctx, t, sc, o = {}) {
  table(ctx, 740, 1620, GL.top);
  const gs = glass(ctx, GL.s, GL.top, 4, sc.small, t, o.small || {});
  const gb = glass(ctx, GL.b, GL.top, 10, sc.big, t, o.big || {});
  plate(ctx, GL.s, GL.top + 34, '小杯'); plate(ctx, GL.b, GL.top + 34, '大杯');
  chip(ctx, 1680, 560, LEMON, '柠檬汁'); chip(ctx, 1680, 620, WATER, '水');
  return { gs, gb };
}
function sceneHook(ctx, t, s) {
  const sc = SC.hook, c = camOf(s, t, 1, 1.04);
  withCam(ctx, c, () => {
    ground(ctx, s.ground);
    const { gs, gb } = glassesScene(ctx, t, sc);
    teacher(ctx, t, sc.pose);
    for (const [g, i] of [[gs, 0], [gb, 1]]) { const k = pop(t, sc.q + i * .15); if (k > 0) scaled(ctx, k, g.x, g.top - 80, () => {
      shape(ctx, ellipse(g.x, g.top - 80, 50, 50, 30), { fill: PAL.white, line: 4, seed: 800 + i });
      text(ctx, '?', g.x, g.top - 58, { font: '64px Slab', fill: COL.candyD, align: 'center' }); }); }
  });
  tag(ctx, t, sc.more, '柠檬汁更多 → 更酸？', 1140, 250, { t1: sc.moreEnd, px: 40 });
  const kt = pop(t, sc.title, .4);
  if (kt > 0) {
    rays(ctx, 1140, 230, 30, 760 * kt, tint(PAL.mustard, .45), { rot: t * .05, alpha: .7 });
    scaled(ctx, kt, 1140, 200, () => {
      shape(ctx, rrect(690, 110, 900, 200, 26), { fill: PAL.paper, line: 4.5, seed: 810, grain: .15, off: [8, 7] });
      text(ctx, '比例与百分比', 1140, 225, { font: '100px QK', fill: PAL.ink, plate: PAL.coral, off: [6, 5], align: 'center' });
      text(ctx, '看占多少，不只看有多少', 1140, 285, { font: '700 34px NS', fill: PAL.inkSoft, align: 'center', track: 4 });
    });
  }
  return { focus: w2s(c, (GL.s + GL.b) / 2, 640) };
}
function sceneStep(ctx, t, s) {
  const sc = SC[s.kind], c = camOf(s, t);
  let focus = [1170, 640];
  withCam(ctx, c, () => {
    ground(ctx, s.ground);
    if (s.kind === 's1') {
      table(ctx, 740, 1620, GL.top);
      const hi = (i, tt) => (i === 0 ? seg(tt, sc.hiS, sc.hiS + .4) : seg(tt, sc.hiW, sc.hiW + .5)) * (1 - seg(tt, sc.bigIn, sc.bigIn + .3));
      glass(ctx, 960, GL.top, 4, sc.small, t, { hi });
      plate(ctx, 960, GL.top + 34, '1 : 3');
      const kb = pop(t, sc.bigIn, .3);
      if (kb > 0) { scaled(ctx, kb, 1380, GL.top, () => glass(ctx, 1380, GL.top, 8, sc.big, t)); plate(ctx, 1380, GL.top + 34, '2 : 6'); }
      const ks = pop(t, sc.same, .3);
      if (ks > 0) scaled(ctx, ks, 1170, 640, () => { star(ctx, 1170, 640, 70, { n: 12, inner: .6, fill: PAL.white, off: [0, 0] }); text(ctx, '=', 1170, 672, { font: '90px Slab', fill: COL.candyD, align: 'center' }); });
      chip(ctx, 1680, 560, LEMON, '柠檬汁'); chip(ctx, 1680, 620, WATER, '水');
    }
    if (s.kind === 's2') {
      ink(ctx, [[820, 562], [1560, 562]], 6, { seed: 700, taper: false, color: PAL.kraftD });
      const J = [[1000, 890], [1400, 890]], fronts = [jar(ctx, ...J[0], '哥哥'), jar(ctx, ...J[1], '妹妹')];
      const [tS0, tS1] = sc.slots;
      [[0, 3, tS0], [1, 2, tS1]].forEach(([j, n, t0]) => { for (let k = 0; k < n; k++) { const kk = pop(t, t0 + k * .15); if (kk > 0) { const [x, y] = [J[j][0] - (n - 1) * 32 + k * 64, J[j][1] - 170]; scaled(ctx, kk, x, y, () => { ink(ctx, ellipse(x, y, 26, 26, 24), 4, { closed: true, color: COL.accent, seed: 710 + k, breaks: .3 }); text(ctx, '份', x, y + 12, { font: '700 30px NS', fill: COL.accent, align: 'center' }); }); } } });
      for (const cd of sc.candies) {
        if (t < cd.tIn - .3) continue;
        const u = seg(t, cd.tFly, cd.tFly + .6), [jx, jy] = jarSlot(...J[cd.jar], cd.slot);
        const x0 = cd.x, y0 = 562 - (1 - eo(seg(t, cd.tIn - .3, cd.tIn))) * 120;
        candy(ctx, lerp(x0, jx, eio(u)), lerp(y0, jy, eio(u)) - Math.sin(Math.PI * u) * 160, { s: 1 });
      }
      for (let p = 0; p < 5; p++) { const k = pop(t, sc.pairs + p * .2) * (1 - seg(t, SC.s2.candies[p * 2].tFly - .1, SC.s2.candies[p * 2].tFly + .2)); if (k <= 0) continue;
        const x = 870 + p * 2 * 64 + p * 18 + 32; scaled(ctx, k, x, 540, () => { ink(ctx, ellipse(x, 540, 78, 44, 30), 4, { closed: true, color: COL.accent, seed: 720 + p, breaks: .25 }); text(ctx, String(p + 1), x, 480, { font: '36px Slab', fill: COL.accent, align: 'center' }); }); }
      fronts.forEach(f => f());
      focus = [1200, 700];
    }
    if (s.kind === 's3') {
      const n = ramp(t, sc.fillKeys), q = seg(t, sc.quad[0], sc.quad[1]);
      hundred(ctx, 920, 488, 37, n, q, t);
      const shown = Math.round(n);
      if (t > sc.fills[0]) { text(ctx, `${shown}%`, 1560, 690, { font: '130px Slab', fill: COL.candyD, plate: PAL.white, off: [6, 5], align: 'center' }); text(ctx, `${shown} / 100 格`, 1560, 760, { font: '700 36px NS', fill: PAL.ink, align: 'center' }); }
      if (q > .9) { const k = pop(t, sc.quad[1]); scaled(ctx, k, 1012, 580, () => { star(ctx, 1012, 580, 58, { n: 10, inner: .6, fill: PAL.white, off: [0, 0] }); text(ctx, '¼', 1012, 606, { font: '64px Slab', fill: PAL.ink, align: 'center' }); }); }
      focus = [1100, 650];
    }
    if (s.kind === 's4') {
      const kp = pop(t, sc.pack, .3); if (kp > 0) scaled(ctx, kp, 1000, 780, () => backpack(ctx, 1000, 780));
      priceTag(ctx, 1150, 520, '80元', pop(t, sc.price));
      const ksale = pop(t, sc.sale); if (ksale > 0) scaled(ctx, ksale, 830, 560, () => { star(ctx, 830, 560, 80, { n: 14, inner: .72, fill: COL.accent, off: [0, 0] }); text(ctx, '−25%', 830, 574, { font: '40px Slab', fill: PAL.white, align: 'center' }); });
      const kb = seg(t, sc.tBar - .2, sc.tBar + .2);
      if (kb > 0) {
        ctx.save(); ctx.globalAlpha *= kb;
        const fills = [seg(t, sc.t20, sc.t20 + .3), 0, 0, 0];
        segBar(ctx, 800, 820, 140, 4, fills, ['20', '20', '20', '20'], t, { col: COL.accent, off: (i, tt) => i === 0 && tt > sc.tCut ? [-eio(seg(tt, sc.tCut, sc.tCut + .7)) * 420, -Math.sin(Math.PI * seg(tt, sc.tCut, sc.tCut + .7)) * 160 - eio(seg(tt, sc.tCut, sc.tCut + .7)) * 120, 1 - seg(tt, sc.tCut + .2, sc.tCut + .7)] : null });
        text(ctx, '80 元', 1440, 862, { font: '700 34px NS', fill: PAL.ink });
        if (t > sc.pay) { const k = pop(t, sc.pay); scaled(ctx, k, 1590, 780, () => { shape(ctx, rrect(1450, 730, 270, 70, 14), { fill: PAL.white, line: 3.4, seed: 680 }); text(ctx, '付 60 元', 1585, 780, { font: '700 40px NS', fill: COL.candyD, align: 'center' }); }); }
        ctx.restore();
      }
      focus = [1000, 600];
    }
    if (s.kind === 's5') {
      const kb = pop(t, sc.bookIn, .3); if (kb > 0) scaled(ctx, kb, 1060, 740, () => book(ctx, 1060, 740));
      const f3 = seg(t, sc.tRead, sc.tRead + .9), fills = Array.from({ length: 10 }, (_, i) => i < 3 ? clamp(f3 * 3 - i) : 0);
      const labs = Array.from({ length: 10 }, (_, i) => t > sc.tEach + i * .12 ? '20' : null);
      segBar(ctx, 760, 800, 60, 10, fills, labs, t, { px: 24 });
      if (t > sc.t60) { const k = pop(t, sc.t60); scaled(ctx, k, 850, 888, () => { shape(ctx, rrect(740, 862, 220, 52, 12), { fill: PAL.white, line: 3, seed: 690 }); text(ctx, '30% = 60 页', 850, 899, { font: '700 30px NS', fill: PAL.ink, align: 'center' }); }); }
      if (t > sc.t200) { const k = pop(t, sc.t200); scaled(ctx, k, 1340, 888, () => { shape(ctx, rrect(1250, 862, 180, 52, 12), { fill: COL.accent, line: 3, seed: 691 }); text(ctx, '200 页', 1340, 899, { font: '700 32px NS', fill: PAL.white, align: 'center' }); }); }
      focus = [1060, 620];
    }
    teacher(ctx, t, sc.pose);
  });
  if (s.kind === 's1') tag(ctx, t, sc.rule, '两边乘同一个数，比例不变', 80, 215, { px: 38 });
  if (s.kind === 's2') tag(ctx, t, sc.ok, '6 + 4 = 10 ✓', 1180, 470, { px: 40 });
  if (s.kind === 's3') tag(ctx, t, sc.pct, '% 就是 ÷ 100', 80, 215, { px: 44 });
  if (s.kind === 's4') tag(ctx, t, sc.rule, '部分 = 总数 × 百分比', 80, 215, { px: 40 });
  if (s.kind === 's5') tag(ctx, t, sc.callback, '上节课：两边做同样的事', 80, 215, { px: 36, t1: VE('b30') });
  drawCard(ctx, t, sc.card);
  stepHeader(ctx, t, s);
  return { focus: w2s(c, ...focus) };
}
function sceneSum(ctx, t, s) {
  ground(ctx, s.ground, 960);
  teacher(ctx, t, SC.sum.pose, { x: 1700, dir: -1, s: 1.0, y: 960 });
  text(ctx, '带走三句话', 200, 190, { font: '84px QK', fill: PAL.ink, plate: PAL.mustardL, off: [6, 5] });
  const cols = [PAL.blue, PAL.pink, PAL.avocado];
  SC.sum.rows.forEach((t0, i) => {
    const k = pop(t, t0, .3); if (k <= 0) return; const y = 360 + i * 200;
    medallion(ctx, 290, y, i + 1, 76, cols[i], k);
    ctx.save(); ctx.globalAlpha *= clamp((t - t0) / .25);
    const f = fit(ctx, SC.sum.lines[i], '{px}px QK', 60, 1140, 1, 40);
    text(ctx, SC.sum.lines[i], 420, y + 22, { font: f.font, fill: PAL.ink, plate: PAL.white, off: [4, 4] });
    ctx.restore();
  });
  return { focus: [W / 2, H / 2] };
}
function sceneEnd(ctx, t, s) {
  const sc = SC.end, c = camOf(s, t, 1, 1.04);
  withCam(ctx, c, () => {
    ground(ctx, s.ground);
    if (t > sc.win) rays(ctx, GL.s, 620, 30, 800 * eo(seg(t, sc.win, sc.win + .6)), tint(PAL.mustard, .45), { rot: t * .08, alpha: .8 });
    const hiS = (i, tt) => i === 0 ? seg(tt, sc.a + .3, sc.a + .7) : 0, hiB = (i, tt) => i < 2 ? seg(tt, sc.b + .3, sc.b + .7) : 0;
    const { gs, gb } = glassesScene(ctx, t, sc, { small: { hi: hiS }, big: { hi: hiB } });
    for (const [g, t0, str] of [[gs, sc.a25, '1/4 = 25%'], [gb, sc.b20, '2/10 = 20%']]) {
      const k = pop(t, t0); if (k <= 0) continue;
      scaled(ctx, k, g.x, g.top - 60, () => { shape(ctx, rrect(g.x - 130, g.top - 100, 260, 64, 14), { fill: PAL.white, line: 3.4, seed: 820 }); text(ctx, str, g.x, g.top - 54, { font: '40px Slab', fill: COL.candyD, align: 'center' }); });
    }
    teacher(ctx, t, sc.pose);
  });
  tag(ctx, t, sc.win, '小杯更酸！', 560, 300, { px: 52, t1: sc.irisT - .3 });
  return { focus: [GL.s, 620] };
}

const camOf = (s, t, z0 = 1, z1 = 1.035) => ({ cx: 960, cy: 560, z: lerp(z0, z1, ss(seg(t, s.t0, s.t1))) });
function withCam(ctx, c, fn) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy); fn(); ctx.restore(); }
const w2s = (c, x, y) => [W / 2 + (x - c.cx) * c.z, H / 2 + (y - c.cy) * c.z];

function drawSection(ctx, t, s) {
  ctx.save(); let r;
  if (s.kind === 'hook') r = sceneHook(ctx, t, s);
  else if (s.kind === 'sum') r = sceneSum(ctx, t, s);
  else if (s.kind === 'end') r = sceneEnd(ctx, t, s);
  else r = sceneStep(ctx, t, s);
  ctx.restore(); return r || {};
}

// ───────────────────────────────────────── frame
export function renderFilm(ctx, t, Q) {
  setClock(t);
  const idx = S.indexOf(section(t)), s = S[idx], nx = S[idx + 1], pv = S[idx - 1];
  const isStep = k => !!STEP[k];
  const irisOut = nx && isStep(nx.kind) && t >= nx.t0 - BEAT * .5 ? nx : null;
  const irisIn = isStep(s.kind) && pv && t < s.t0 + BEAT * .5 ? s : null;
  const wipeIn = (s.kind === 'sum' || s.kind === 'end') && t < s.t0 + .35;
  if (irisOut || irisIn) {
    const inc = irisOut || irisIn, prev = S[S.indexOf(inc) - 1];
    const k = eio(seg(t, inc.t0 - BEAT * .5, inc.t0 + BEAT * .5));
    const f = drawSection(ctx, Math.min(t, inc.t0 - 1e-3), prev).focus || [W / 2, H / 2];
    medallion(ctx, f[0], f[1], STEP[inc.kind][0], 104, tint(inc.ground, .1), 1);
    const cx = lerp(f[0], W / 2, k), cy = lerp(f[1], H / 2, k), r = lerp(104, 1250, k * k);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); drawSection(ctx, Math.max(t, inc.t0 + 1e-3), inc); ctx.restore();
    ink(ctx, ellipse(cx, cy, r, r, 90), 7, { closed: true, seed: 960 });
  } else if (wipeIn) {
    const k = eio(seg(t, s.t0, s.t0 + .35));
    drawSection(ctx, pv.t1 - 1e-3, pv);
    ctx.save(); ctx.beginPath();
    if (s.kind === 'sum') ctx.rect(0, H * (1 - k), W, H); else ctx.rect(W * (1 - k), 0, W, H);
    ctx.clip(); drawSection(ctx, t, s); ctx.restore();
    if (s.kind === 'sum') ink(ctx, [[-10, H * (1 - k)], [W + 10, H * (1 - k)]], 6, { seed: 963 }); else ink(ctx, [[W * (1 - k), -10], [W * (1 - k), H + 10]], 6, { seed: 962 });
  } else {
    // a step's last beat: the medallion stamps onto the balance pivot before the iris
    const f = drawSection(ctx, t, s).focus;
    if (nx && isStep(nx.kind) && t >= nx.t0 - BEAT * 1.5 && f) medallion(ctx, f[0], f[1], STEP[nx.kind][0], 104, tint(nx.ground, .1), pop(t, nx.t0 - BEAT * 1.5, .24));
  }
  // the iris-out at the very end: one last circle on the answer
  if (s.kind === 'end' && t > SC.end.irisT) {
    const k = eio(seg(t, SC.end.irisT, SC.end.irisT + 1.2)), f = SC.end.irisF, r = lerp(1300, 310, k);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(f[0], f[1], r, 0, TAU, true); ctx.fillStyle = PAL.ink; ctx.fill('evenodd'); ctx.restore();
    ink(ctx, ellipse(f[0], f[1], r, r, 90), 7, { closed: true, seed: 964, color: PAL.paper });
    const kt = pop(t, SC.end.irisT + 1.1, .35);
    const TX = SC.end.titleX ?? 1340;
    if (kt > 0) scaled(ctx, kt, TX, 520, () => {
      text(ctx, SC.end.title[0], TX, 500, { font: '84px QK', fill: PAL.paper, plate: PAL.coral, off: [5, 5], align: 'center' });
      text(ctx, SC.end.title[1], TX, 580, { font: '700 36px NS', fill: PAL.mustardL, align: 'center', track: 6 });
    });
  }
  paperFinish(ctx, W, H, 1);
  if (!(Q && Q.has('nosubs'))) caption(ctx, t);
}

// ───────────────────────────────────────── subtitles + sound events
function buildSubs() {
  SUBS = [];
  for (const id of Object.keys(VO)) {
    const raw = TXT[id], parts = [];
    for (const p of raw.match(/[^，。？！：；]+[，。？！：；]*/g)) { const last = parts[parts.length - 1]; if (last != null && strip(last + p).length <= 20) parts[parts.length - 1] += p; else parts.push(p); }
    let c0 = 0; const n = strip(raw).length;
    for (const p of parts) {
      const a = c0 / n, b = (c0 + strip(p).length) / n; c0 += strip(p).length;
      SUBS.push({ t0: VO[id] + (a === 0 ? 0 : timeAt(id, a)) - .08, t1: VO[id] + (b >= .999 ? DURS[id] : timeAt(id, b)) + .3, text: p.replace(/[，。；：]+$/, '').trim() });
    }
  }
  SUBS.sort((a, b) => a.t0 - b.t0);
  for (let i = 0; i < SUBS.length - 1; i++) SUBS[i].t1 = Math.min(Math.max(SUBS[i].t1, SUBS[i].t0 + 1.8), SUBS[i + 1].t0 - .04);
}

function buildEvents() {
  EVS = [];
  for (const id of Object.keys(VO)) ev(VO[id], 'vo', { id });
  for (const s of S) {
    const sc = SC[s.kind]; if (!sc) continue;
    if (STEP[s.kind]) { ev(s.t0 - BEAT * 1.5, 'stamp'); ev(s.t0 - BEAT * .5, 'iris'); ev(s.t0 + .25, 'slide'); }
    for (const g of [sc.small, sc.big]) for (const b of g || []) if (b.t > s.t0) ev(b.t, 'pour', { pan: g === sc.small ? -.1 : .3, c: b.c });
    if (sc.card) {
      ev(sc.card.t0, 'pop', { v: .7 });
      for (const r of sc.card.rows) { ev(r.t, r.ops ? 'pill' : 'chalk'); if (r.ans) ev(r.t + .25, 'ding'); if (r.check) ev(r.check, 'ding', { v: 1.2 }); }
    }
  }
  const h = SC.hook; ev(h.q, 'pop'); ev(h.q + .15, 'pop'); ev(h.more, 'pop'); ev(h.title, 'title');
  ev(SC.s1.bigIn, 'thud'); ev(SC.s1.same, 'ding'); ev(SC.s1.rule, 'pop');
  const c2 = SC.s2; for (const cd of c2.candies) { ev(cd.tIn, 'drop', { pan: (cd.x - 960) / 1400 }); ev(cd.tFly, 'out', { pan: cd.jar ? .3 : -.1 }); ev(cd.tFly + .6, 'drop', { pan: cd.jar ? .3 : 0 }); }
  c2.slots.forEach(t => ev(t, 'pop')); for (let p = 0; p < 5; p++) ev(c2.pairs + p * .2, 'pop', { v: .6 }); ev(c2.ok, 'ding');
  const s3 = SC.s3; for (const [t0, a, b, d] of s3.fillKeys.slice(1)) ev(t0, 'fill', { dur: d, up: b > a ? 1 : 0 }); ev(s3.quad[0], 'slidewhistle', { dur: .9 }); ev(s3.pct, 'pop');
  const s4 = SC.s4; ev(s4.pack, 'thud'); ev(s4.price, 'pop'); ev(s4.sale, 'stamp'); ev(s4.tBar, 'paper'); ev(s4.tCut, 'snip'); ev(s4.tCut + .05, 'out'); ev(s4.pay, 'ding'); ev(s4.rule, 'pop');
  const s5 = SC.s5; ev(s5.bookIn, 'thud'); ev(s5.tRead, 'fill', { dur: .9, up: 1 }); ev(s5.t60, 'pop'); ev(s5.tEach, 'fill', { dur: 1.2, up: 1 }); ev(s5.t200, 'ding'); ev(s5.callback, 'pop');
  SC.sum.rows.forEach(t => ev(t, 'stamp'));
  ev(sec('sum').t0, 'wipe'); ev(sec('end').t0, 'wipe');
  const e = SC.end; ev(e.a25, 'pop'); ev(e.b20, 'pop'); ev(e.win, 'ding', { v: 1.2 }); ev(e.irisT, 'iris');
  EVS.push({ t: 0, type: 'cues', BEAT, BPM, END, SEC: S.map(s => ({ kind: s.kind, t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3) })),
    SIL: [[VE('b03') + .1, VO.b04 - .05], [VE('b38') + .05, e.win]], wrong: null, open: e.win, sumRows: SC.sum.rows });
  EVS.sort((a, b) => a.t - b.t);
}
