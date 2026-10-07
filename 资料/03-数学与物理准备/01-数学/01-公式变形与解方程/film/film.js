// 公式变形与解方程（第二版）— Mid-century Cartoon. A teacher, a teal balance, a mystery box x and coral candies.
// Times come from the voice: each section starts on the beat grid; its lines follow one another with GAP pauses.
// Visual beats hang off spoken characters via atC(lineId, substring).
import { PAL, shape, ink, plane, ellipse, spline, rrect, rect, move, xform, star, sparkle, rays, text, measure, fit, arrow, dashed,
  paperFinish, setClock, clamp, lerp, seg, ss, eo, eio, back, twos, TAU, hash, starPts } from './engine/toon.js';
import { drawOwner } from './engine/chars.js';

const W = 1920, H = 1080, BPM = 112, BEAT = 60 / BPM;
const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const tint = (c, k) => mix(c, '#FFFFFF', k), shade = (c, k) => mix(c, '#2B2420', k);
const COL = { box: PAL.kraft, boxD: PAL.kraftD, boxL: PAL.kraftL, candy: PAL.coral, candyD: PAL.coralD, prod: PAL.teal, prodD: PAL.tealD, accent: PAL.coral, good: '#5E8F3E' };

const SECS = [
  ['hook', ['a01', 'a02', 'a03', 'a04', 'a05'], '#E8B43A'],
  ['s1', ['a06', 'a07', 'a08', 'a09', 'a10', 'a11', 'a12', 'a13'], '#7F9CC0'],
  ['s2', ['a14', 'a15', 'a16', 'a17', 'a18', 'a19', 'a20'], '#F0B4A8'],
  ['s3', ['a21', 'a22', 'a23', 'a24', 'a25', 'a26'], '#A7AE5B'],
  ['s4', ['a27', 'a28', 'a29', 'a30', 'a31', 'a32'], '#B9A5C9'],
  ['s5', ['a33', 'a34', 'a35', 'a36', 'a37', 'a38'], '#F3D37F'],
  ['sum', ['a39', 'a40', 'a41', 'a42'], PAL.paper],
  ['end', ['a43', 'a44'], '#E8B43A'],
];
const STEP = { s1: [1, '等号就是天平'], s2: [2, '减了就加回来'], s3: [3, '乘了就除，除了就乘'], s4: [4, '倒着拆'], s5: [5, '公式变形'] };
const LEAD = { hook: .7, s1: 1.5, s2: 1.5, s3: 1.5, s4: 1.5, s5: 1.5, sum: 1.0, end: .9 };
const GAP = {
  a01: .4, a02: .5, a03: 1.3, a04: .6, a05: 2.6,
  a06: .5, a07: .7, a08: .4, a09: .4, a10: 1.5, a11: 1.3, a12: .9, a13: 1.4,
  a14: .5, a15: 1.1, a16: .5, a17: 1.3, a18: .7, a19: 1.2, a20: 1.3,
  a21: .5, a22: .7, a23: .5, a24: 1.3, a25: .7, a26: 1.4,
  a27: .5, a28: .7, a29: 1.5, a30: 1.1, a31: 1.1, a32: 1.5,
  a33: .5, a34: .7, a35: .9, a36: 1.1, a37: 1.3, a38: 1.4,
  a39: .5, a40: .7, a41: .7, a42: 3.2,
  a43: 1.4, a44: 3.6,
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
function box(ctx, x, y, o = {}) {                      // the mystery box x; o: {s, label, half, open(0..1), sticker, peek}
  const s = o.s ?? 1, w = 104 * s, h = 88 * s, lid = 22 * s;
  if (o.half) {
    const zig = []; for (let i = 0; i <= 6; i++) zig.push([x + (i % 2 ? 8 : -2) * s, y - h - lid * .5 + i * (h + lid * .5) / 6]);
    shape(ctx, [[x - w / 2, y - h], [x, y - h], ...zig.slice(1), [x - w / 2, y]], { fill: COL.box, line: 3.4, seed: 310, grain: .3, shade: [{ pts: rect(x - w / 2, y - h * .3, w, h * .3), color: COL.boxD, alpha: .4 }] });
    shape(ctx, rect(x - w / 2 - 4 * s, y - h - lid, w / 2 + 6 * s, lid), { fill: COL.boxD, line: 3, seed: 311, grain: .2 });
    shape(ctx, rrect(x - w * .42, y - h * .72, w * .36, h * .42, 6 * s), { fill: PAL.white, line: 2.4, seed: 312, grain: 0 });
    text(ctx, '½', x - w * .24, y - h * .38, { font: `${Math.round(34 * s)}px Slab`, fill: PAL.ink, align: 'center' });
    return;
  }
  if (o.peek) for (let i = 0; i < 4; i++) candy(ctx, x - w * .33 + i * w * .22, y - h + 14 * s, { s: .5 * s });
  shape(ctx, rect(x - w / 2, y - h, w, h), { fill: COL.box, line: 3.4, seed: 313, grain: .3, shade: [{ pts: rect(x + w * .22, y - h, w * .28, h), color: COL.boxD, alpha: .45 }] });
  const op = o.open ?? 0;
  if (op < 1) {
    const lx = x + op * 150 * s, ly = y - h - op * 220 * s, rot = op * 1.4;
    shape(ctx, xform(rect(-w / 2 - 6 * s, -lid, w + 12 * s, lid), lx, ly, rot), { fill: COL.boxD, line: 3.2, seed: 314, grain: .2 });
  }
  shape(ctx, rrect(x - w * .3, y - h * .74, w * .6, h * .5, 8 * s), { fill: PAL.white, line: 2.6, seed: 315, grain: 0 });
  text(ctx, o.label ?? 'x', x, y - h * .34, { font: `${Math.round(46 * s)}px Slab`, fill: PAL.ink, align: 'center' });
  if (o.sticker) scaled(ctx, o.sticker, x + w * .42, y - h * .9, () => {
    star(ctx, x + w * .42, y - h * .9, 34 * s, { n: 10, inner: .7, fill: COL.accent, off: [0, 0] });
    text(ctx, '−2', x + w * .42, y - h * .9 + 11 * s, { font: `${Math.round(30 * s)}px Slab`, fill: PAL.white, align: 'center' });
  });
}
function cup(ctx, x, y, o = {}) {
  const s = o.s ?? 1, w = 70 * s, h = 104 * s;
  ink(ctx, [[x + 8 * s, y - h - 10 * s], [x + 22 * s, y - h - 52 * s]], 7 * s, { color: PAL.plum, seed: 320, taper: false });
  shape(ctx, [[x - w / 2, y - h], [x + w / 2, y - h], [x + w * .38, y], [x - w * .38, y]], { fill: PAL.white, line: 3.2, seed: 321, grain: .2 });
  shape(ctx, [[x - w * .46, y - h * .72], [x + w * .46, y - h * .72], [x + w * .38, y - 3], [x - w * .38, y - 3]], { fill: PAL.kraftL, line: 0, seed: 322, grain: .2 });
  for (let i = 0; i < 5; i++) shape(ctx, ellipse(x - w * .25 + (i % 3) * w * .25, y - 12 * s - (i > 2 ? 14 : 0) * s, 6 * s, 6 * s, 10), { fill: PAL.ink, line: 0, seed: 323 + i, grain: 0, off: [0, 0] });
  shape(ctx, ellipse(x, y - h, w * .55, 12 * s, 20), { fill: PAL.white, line: 3, seed: 329, grain: .1 });
  if (o.tag) {
    const k = o.tagK ?? 1;
    scaled(ctx, k, x, y - h - 70 * s, () => {
      shape(ctx, rrect(x - 48 * s, y - h - 96 * s, 96 * s, 50 * s, 10 * s), { fill: o.tag === '?' ? PAL.white : COL.accent, line: 3, seed: 330, grain: .1 });
      text(ctx, o.tag, x, y - h - 60 * s, { font: zhFont(o.tag) ? `700 ${Math.round(28 * s)}px NS` : `${Math.round(30 * s)}px Slab`, fill: o.tag === '?' ? PAL.ink : PAL.white, align: 'center' });
    });
  }
}
function note(ctx, x, y, o = {}) {                     // a 10-yuan note, lying in a little stack
  const s = o.s ?? 1, w = 120 * s, h = 26 * s;
  shape(ctx, rrect(x - w / 2, y - h, w, h, 4 * s), { fill: PAL.avocadoL, line: 2.8, seed: 340, grain: .2 });
  text(ctx, '10', x, y - 5 * s, { font: `${Math.round(22 * s)}px Slab`, fill: PAL.avocadoD, align: 'center' });
}
function mouse(ctx, x, y, o = {}) {                    // a small grey mouse, facing +x when dir = 1
  const d = o.dir ?? 1, s = o.s ?? 1, b = o.belly ?? 0, hop = o.hop ?? 0;
  ctx.save(); ctx.translate(x, y - hop); ctx.scale(d * s, s);
  ink(ctx, spline([[-40, -14], [-70, -22], [-92, -6], [-110, -18]], false, 6), 3.4, { seed: 350 });
  shape(ctx, ellipse(0, -26, 44 + b * 10, 26 + b * 6, 24), { fill: '#9A948C', line: 3.2, seed: 351, grain: .25 });
  shape(ctx, ellipse(30, -50, 16, 16, 16), { fill: '#9A948C', line: 3, seed: 352, grain: .2 });
  shape(ctx, ellipse(31, -50, 8, 8, 10), { fill: PAL.pink, line: 0, seed: 353, grain: 0 });
  shape(ctx, [[30, -40], [64, -26], [36, -14]], { fill: '#9A948C', line: 3, seed: 354, grain: .2 });
  shape(ctx, ellipse(64, -26, 5, 5, 10), { fill: PAL.ink, line: 0, seed: 355, grain: 0, off: [0, 0] });
  shape(ctx, ellipse(44, -34, 3.5, 4.5, 8), { fill: PAL.ink, line: 0, seed: 356, grain: 0, off: [0, 0] });
  ctx.restore();
}

// ───────────────────────────────────────── the balance (the product: teal, one colour all film)
const BAL = { cx: 1140, py: 478, L: 360, hang: 200, floor: 900 };
function plates(tilt) {
  const c = Math.cos(tilt), s = Math.sin(tilt), eL = [BAL.cx - BAL.L * c, BAL.py + BAL.L * s], eR = [BAL.cx + BAL.L * c, BAL.py - BAL.L * s];
  return { eL, eR, L: [eL[0], eL[1] + BAL.hang], R: [eR[0], eR[1] + BAL.hang] };
}
function drawBalance(ctx, tilt, drawItems) {
  const P = plates(tilt), { cx, py, floor } = BAL;
  shape(ctx, [[cx - 150, floor], [cx - 110, floor - 46], [cx + 110, floor - 46], [cx + 150, floor]], { fill: COL.prod, line: 4, seed: 400, grain: .3, shade: [{ pts: rect(cx + 40, floor - 50, 120, 60), color: COL.prodD, alpha: .6 }] });
  shape(ctx, rect(cx - 16, py, 32, floor - 46 - py), { fill: COL.prod, line: 3.6, seed: 401, grain: .25, shade: [{ pts: rect(cx + 4, py, 14, floor - py), color: COL.prodD, alpha: .6 }] });
  for (const [e, p] of [[P.eL, P.L], [P.eR, P.R]]) { ink(ctx, [e, [p[0] - 150, p[1] - 6]], 3, { seed: 402, taper: false }); ink(ctx, [e, [p[0] + 150, p[1] - 6]], 3, { seed: 403, taper: false }); }
  const c = Math.cos(tilt), s = Math.sin(tilt);
  shape(ctx, xform(rrect(-BAL.L - 16, -13, BAL.L * 2 + 32, 26, 12), cx, py, -tilt), { fill: COL.prod, line: 4, seed: 404, grain: .3, shade: [{ pts: xform(rect(-BAL.L - 16, 2, BAL.L * 2 + 32, 12), cx, py, -tilt), color: COL.prodD, alpha: .6 }] });
  for (const e of [P.eL, P.eR]) shape(ctx, ellipse(e[0], e[1], 15, 15, 16), { fill: PAL.mustard, line: 3, seed: 405, grain: .1 });
  star(ctx, cx, py, 34, { n: 8, inner: .5, fill: PAL.white, line: 3, seed: 406 });
  shape(ctx, ellipse(cx, py, 14, 14, 16), { fill: PAL.mustard, line: 3, seed: 407, grain: 0 });
  for (const side of ['L', 'R']) {
    const [x, y] = P[side];
    shape(ctx, [...ellipse(x, y - 6, 165, 18, 30, Math.PI, TAU), ...ellipse(x, y - 6, 165, 42, 30, 0, Math.PI)], { fill: COL.prod, line: 4, seed: 410 + (side === 'L' ? 0 : 1), grain: .3, shade: [{ pts: ellipse(x + 40, y + 20, 160, 30, 20), color: COL.prodD, alpha: .5 }] });
    shape(ctx, ellipse(x, y - 6, 165, 18, 30), { fill: tint(COL.prod, .35), line: 3, seed: 412, grain: .15 });
    if (drawItems) drawItems(side, x, y - 10);
  }
  return P;
}

// items on the plates. it: {k, side, dx, dy, tIn, tOut?, out?, s?, o?(t)→opts, alpha?(t)}
function itemPos(it, t, P) {
  const base = P[it.side], bx = base[0] + it.dx, by = base[1] - 10 + it.dy;
  if (t < it.tIn - .32) return null;
  if (t < it.tIn) { const u = seg(t, it.tIn - .32, it.tIn); return { x: bx, y: by - 160 * (1 - u * u), a: 1 }; }
  if (it.tOut != null && t >= it.tOut) {
    const u = seg(t, it.tOut, it.tOut + .6); if (u >= 1) return null;
    const e = eio(u), o = it.out || [bx + (it.side === 'L' ? -500 : 500), by - 500];
    return { x: lerp(bx, o[0], e), y: lerp(by, o[1], e) - Math.sin(Math.PI * u) * 140, a: 1 - u * u, k: 1 - .3 * u };
  }
  const bounce = Math.sin(clamp((t - it.tIn) / .22) * Math.PI) * 10 * (t - it.tIn < .22 ? 1 : 0);
  return { x: bx, y: by - bounce, a: 1 };
}
function drawItems(ctx, items, t, P, side) {
  for (const it of items) {
    if (it.side !== side) continue;
    const p = itemPos(it, t, P); if (!p) continue;
    const al = (it.alpha ? it.alpha(t) : 1) * p.a; if (al <= 0) continue;
    ctx.save(); ctx.globalAlpha *= al;
    const opts = { s: (it.s ?? 1) * (p.k ?? 1), ...(it.o ? it.o(t) : {}) };
    ({ candy, box, cup, note })[it.k](ctx, p.x, p.y, opts);
    ctx.restore();
  }
}
// candy rows on a plate: n candies, `per` a row, rows stacked upward
const pile = (n, per = 5, sp = 52, rowH = 40) => Array.from({ length: n }, (_, i) => { const r = Math.floor(i / per), inRow = Math.min(per, n - r * per), c = i - r * per; return [(c - (inRow - 1) / 2) * sp + (r % 2) * 8, -r * rowH]; });

// ───────────────────────────────────────── teacher (held body; arms, hands, eyes, mouth move on twos)
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
  const ei = r.toks.findIndex(tk => (tk.s ?? tk) === '='), ex = CARD.x + CARD.w / 2;
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
let SC = {};
function tiltAt(keys, t) {
  let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  const a = keys[i], b = keys[i + 1]; if (!b) return a[1];
  const u = seg(t, b[0] - (b[2] ?? .45), b[0]); return lerp(a[1], b[1], b[3] === 'spring' ? back(u, 2.4) : eio(u));
}
function buildScenes() {
  SC = {};
  const N = (n, per, sp, rowH) => pile(n, per, sp, rowH);
  // ── HOOK: the riddle
  {
    const s = sec('hook'), tBox = atC('a02', '盒子') - .05, tL = atC('a02', '3 颗'), tR = atC('a02', '7 颗');
    const items = [{ k: 'box', side: 'L', dx: -62, dy: 0, tIn: tBox, o: () => ({ label: '?' }) }];
    N(3, 3, 54).forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'L', dx: 70 + dx, dy, tIn: tL + i * .14 }));
    N(7, 4, 54, 42).forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'R', dx, dy, tIn: tR + i * .12 }));
    SC.hook = { items, tilt: [[0, 0]], pose: [[s.t0, 'rest'], [VO.a02 + .2, 'present'], [atC('a03', '几颗') - .2, 'point', 'wow'], [VO.a04, 'raise', 'happy'], [VO.a05 + 1, 'both', 'happy']],
      q: atC('a03', '几颗'), guess: atC('a04', '4 颗') - .1, title: atC('a05', '今天') };
  }
  // ── S1: x + 3 = 7, the wrong way, then both sides
  {
    const s = sec('s1'), items = [{ k: 'box', side: 'L', dx: -62, dy: 0, tIn: s.t0 - 1 }];
    const tWrong = atC('a10', '拿走') + .1, tBack = atC('a11', '所以') - .2, tL = atC('a11', '左边拿走') + .2, tR = atC('a11', '右边也') + .3;
    N(3, 3, 54).forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'L', dx: 70 + dx, dy, tIn: s.t0 - 1, tOut: tL + i * .12, out: [380 + i * 40, -120] }));
    const r7 = N(7, 4, 54, 42);
    // the wrong way: 3 leave the right plate alone, then come back
    r7.forEach(([dx, dy], i) => {
      const gone = i >= 4;
      items.push({ k: 'candy', side: 'R', dx, dy, tIn: s.t0 - 1, tOut: gone ? tWrong + (i - 4) * .1 : null, out: [1900 + i * 30, 120] });
      if (gone) { items.push({ k: 'candy', side: 'R', dx, dy, tIn: tBack + (i - 4) * .12, tOut: tR + (i - 4) * .12, out: [1900 + i * 30, -120] }); }
    });
    const pg = 0;
    const r0 = { t: atC('a07', 'x 加'), toks: ['x', '+', '3', '=', '7'], page: pg };
    const r1 = { t: tL, ops: [[2, '−3'], [4, '−3']], ref: r0, page: pg };
    const r2 = { t: atC('a12', 'x 等于'), toks: ['x', '=', '4'], ans: 1, page: pg };
    SC.s1 = { items, tilt: [[0, 0], [tWrong + .55, .2, .5, 'spring'], [tBack + .4, 0, .5]], card: { t0: atC('a07', '写成') - .3, rows: [r0, r1, r2] },
      pose: [[s.t0, 'rest'], [VO.a07, 'present'], [VO.a08, 'both'], [VO.a09, 'point'], [VO.a10 + .3, 'pointDown', 'focus'], [tWrong + .6, 'shrug', 'wow'], [VO.a11 + .2, 'both'], [VO.a12 + .2, 'point', 'happy'], [VO.a13, 'raise', 'happy']],
      wrong: [tWrong + .55, tBack], right: [VE('a12') - .2, VE('a13') + .6], rule: atC('a13', '两边做') - .1 };
  }
  // ── S2: the mouse eats 2 → x − 2 = 5; put 2 back on both sides; the "−2" jumps the "="
  {
    const s = sec('s2'), tM = atC('a15', '小老鼠') - .3, tEat = atC('a15', '偷吃') + .1, tRun = atE('a15', '2 颗糖') + .3, tR5 = atC('a15', '右边') - .1;
    const tPutL = atC('a17', '各放回') + .1, tPutR = tPutL + .5;
    const items = [{ k: 'box', side: 'L', dx: 0, dy: 0, tIn: s.t0 - 1, o: t => ({ sticker: t > tEat + .3 && t < tPutL + .3 ? pop(t, tEat + .3) * (1 - ss(seg(t, tPutL, tPutL + .3))) : 0 }) }];
    [[-28, -88], [28, -88]].forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'L', dx, dy, tIn: s.t0 - 1, tOut: tEat + i * .2, out: [700 - i * 30, 830], s: .9 }));
    [[-28, -88], [28, -88]].forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'L', dx: dx + 90, dy: 0, tIn: tPutL + i * .15, tOut: tPutL + .7 + i * .1, out: [BAL.cx - BAL.L + dx, 560], s: .9 }));
    const r5 = N(7, 4, 54, 42);
    r5.forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'R', dx, dy, tIn: i < 5 ? tR5 + i * .1 : tPutR + (i - 5) * .15 }));
    const r0 = { t: atC('a16', 'x 减'), toks: ['x', '− 2', '=', '5'], page: 0 };
    const r1 = { t: tPutL, ops: [[1, '+2'], [3, '+2']], ref: r0, page: 0 };
    const r2 = { t: atC('a18', 'x 等于'), toks: ['x', '=', '7'], ans: 1, page: 0 };
    const p0 = { t: VO.a19 + .2, toks: ['x', '− 2', '=', '5'], page: 1 };
    const tJ = atC('a19', '减 2 从') + .1, tJd = 1.3;
    const p1 = { t: tJ + tJd, toks: ['x', '=', '5', { s: '+ 2', c: COL.candyD }], page: 1 };
    const p2 = { t: atC('a20', '两边同时') - .1, toks: ['x', '=', '7'], ans: 1, page: 1, under: atE('a20', '加 2') };
    SC.s2 = { items, tilt: [[0, 0]], card: { t0: atC('a16', '写出来') - .2, rows: [r0, r1, r2, p0, p1, p2], jumps: [{ t: tJ, dur: tJd, from: [p0, 1], to: [p1, 3] }] },
      mouse: { tM, tEat, tRun },
      pose: [[s.t0, 'rest'], [VO.a15 + .2, 'pointDown', 'wow'], [tRun + .2, 'shrug'], [VO.a16, 'present'], [VO.a17, 'both'], [VO.a18 + .3, 'point', 'happy'], [VO.a19, 'raise'], [VO.a20, 'present', 'happy']],
      tagYX: [VO.a19 + .4, VE('a20') + .6] };
  }
  // ── S3: 3x = 12 (split into 3), then half a box: x ÷ 2 = 5 (double it)
  {
    const s = sec('s3'), tB = atC('a22', '3 个') - .1, t12 = atC('a22', '12 颗') - .1, tSplit = atC('a24', '平均分成') + .1;
    const tHalf = VO.a25 + .2, tDouble = atC('a26', '乘 2') + .1;
    const items = [];
    const dim = (k, keep) => t => (t > tSplit + .6 && t < tHalf ? (keep ? 1 : .28 + .72 * (1 - ss(seg(t, tSplit + .6, tSplit + 1)))) : 1);
    [-104, 0, 104].forEach((dx, i) => items.push({ k: 'box', side: 'L', dx, dy: 0, s: .86, tIn: tB + i * .25, tOut: tHalf - .2 + i * .08, out: [400 + i * 60, -150], alpha: dim('b', i === 0) }));
    const r12 = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) r12.push([(c - 1.5) * 64, -r * 44]);
    r12.forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'R', dx, dy, tIn: t12 + i * .07, tOut: tHalf - .2 + (i % 4) * .05, out: [1950, -100 + i * 10], alpha: dim('c', i < 4) }));
    items.push({ k: 'box', side: 'L', dx: -30, dy: 0, tIn: tHalf + .2, o: t => ({ half: t < tDouble + .5 }) });
    items.push({ k: 'box', side: 'L', dx: 300, dy: -260, tIn: tDouble, tOut: tDouble + .25, out: [BAL.cx - BAL.L - 30, BAL.py + BAL.hang - 10], o: () => ({ half: 1 }) });
    N(5, 5, 54).forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'R', dx, dy, tIn: atC('a25', '5 颗') + i * .1 }));
    N(5, 5, 54).forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'R', dx: dx + 8, dy: dy - 42, tIn: tDouble + .5 + i * .1 }));
    const r0 = { t: atC('a23', '所以'), toks: ['3x', '=', '12'], page: 0 };
    const r1 = { t: tSplit, ops: [[0, '÷3'], [2, '÷3']], ref: r0, page: 0 };
    const r2 = { t: atC('a24', 'x 等于'), toks: ['x', '=', '4'], ans: 1, page: 0 };
    const p0 = { t: atC('a25', 'x 除以'), toks: ['x ÷ 2', '=', '5'], page: 1 };
    const p1 = { t: tDouble, ops: [[0, '×2'], [2, '×2']], ref: p0, page: 1 };
    const p2 = { t: atC('a26', 'x 等于'), toks: ['x', '=', '10'], ans: 1, page: 1 };
    SC.s3 = { items, tilt: [[0, 0]], card: { t0: atC('a23', '3 个 x') - .2, rows: [r0, r1, r2, p0, p1, p2] }, split: [tSplit, tHalf - .2], link: [tSplit + .8, tHalf - .3],
      tag3x: [atC('a23', '写作'), atE('a23', '3 乘 x') + .8],
      pose: [[s.t0, 'rest'], [VO.a22, 'present'], [VO.a23, 'point'], [tSplit - .2, 'both', 'focus'], [atC('a24', 'x 等于'), 'raise', 'happy'], [VO.a25, 'pointDown'], [tDouble - .3, 'both'], [atC('a26', 'x 等于'), 'raise', 'happy']] };
  }
  // ── S4: 3x + 2 = 14, unwrap backwards; check
  {
    const s = sec('s4'), tB = atC('a28', '3 个盒子') - .1, tC = atC('a28', '2 颗散糖'), t14 = atC('a28', '14 颗') - .2;
    const tTake = atC('a30', '两边减 2'), tSplit = atC('a31', '两边除以'), tChk = atC('a32', '每盒');
    const items = [];
    const dim = keep => t => (t > tSplit + .4 && t < tChk ? (keep ? 1 : .28 + .72 * (1 - ss(seg(t, tSplit + .4, tSplit + .8)))) : 1);
    [-104, 0, 104].forEach((dx, i) => items.push({ k: 'box', side: 'L', dx, dy: 0, s: .86, tIn: tB + i * .2, alpha: dim(i === 0),
      o: t => ({ open: ss(seg(t, tChk + i * .35, tChk + i * .35 + .5)), peek: t > tChk + i * .35 + .2 }) }));
    [[-30, -78], [30, -78]].forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'L', dx, dy, tIn: tC + i * .15, tOut: tTake + i * .1, out: [420 + i * 50, -120], s: .9 }));
    const r14 = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) r14.push([(c - 1.5) * 64, -r * 44]);
    r14.push([-32, -132], [32, -132]);
    r14.forEach(([dx, dy], i) => items.push({ k: 'candy', side: 'R', dx, dy, tIn: t14 + i * .06, tOut: i >= 12 ? tTake + .2 + (i - 12) * .1 : null, out: [1950, -120], alpha: i < 12 ? dim(i < 4) : null }));
    const r0 = { t: atC('a28', '写成'), toks: ['3x + 2', '=', '14'], page: 0 };
    const r1 = { t: tTake, ops: [[0, '−2'], [2, '−2']], ref: r0, page: 0 };
    const r2 = { t: atC('a30', '得到'), toks: ['3x', '=', '12'], page: 0 };
    const r3 = { t: tSplit, ops: [[0, '÷3'], [2, '÷3']], ref: r2, page: 0 };
    const r4 = { t: atC('a31', 'x 等于'), toks: ['x', '=', '4'], ans: 1, page: 0 };
    const p0 = { t: tChk - .1, toks: ['3 × 4 + 2', '=', '14'], page: 1, check: atC('a32', '对了') - .1 };
    SC.s4 = { items, tilt: [[0, 0]], card: { t0: atC('a28', '写成') - .3, rows: [r0, r1, r2, r3, r4, p0] }, parcel: [VO.a29 - .1, VE('a29') + .9, atC('a29', '最后包上'), atC('a29', '最先拆开')],
      link: [tSplit + .6, tChk - .2],
      pose: [[s.t0, 'rest'], [VO.a28, 'present'], [VO.a29, 'hold', 'focus'], [VO.a30, 'pointDown'], [VO.a31, 'both', 'focus'], [atC('a31', 'x 等于'), 'raise', 'happy'], [VO.a32, 'point'], [atC('a32', '对了') - .1, 'raise', 'happy']] };
  }
  // ── S5: formula — 4 milk teas cost 60 yuan; 单价 = 60 ÷ 4 = 15; 单价 = 总价 ÷ 数量
  {
    const s = sec('s5'), tCups = atC('a35', '4 杯') - .1, t60 = atC('a35', '60 元') - .1, tDiv = atC('a36', '两边同时除以'), t15 = atC('a36', '15 元') - .1;
    const items = [];
    [[-104, 0], [-35, 0], [35, 0], [104, 0]].forEach(([dx, dy], i) => items.push({ k: 'cup', side: 'L', dx, dy, s: .82, tIn: tCups + i * .18,
      o: t => ({ tag: t >= t15 + i * .12 ? '15元' : '?', tagK: t >= t15 + i * .12 ? pop(t, t15 + i * .12) : pop(t, atC('a35', '多少钱') + i * .1) }) }));
    for (let i = 0; i < 6; i++) items.push({ k: 'note', side: 'R', dx: (i % 2 ? 14 : -10), dy: -i * 24, tIn: t60 + i * .1 });
    const r0 = { t: atC('a34', '总价'), toks: ['总价', '=', '单价', '×', '数量'], page: 0, stagger: .35 };
    const r1 = { t: atC('a35', '一杯') - .1, toks: ['60', '=', '单价', '×', '4'], page: 0 };
    const r2 = { t: atC('a36', '单价等于'), toks: ['单价', '=', '60 ÷ 4', '=', '15'], ans: 1, page: 0 };
    const r1o = { t: tDiv, ops: [[0, '÷4'], [4, '÷4']], ref: r1, page: 0 };
    const p0 = { t: VO.a37 + .2, toks: ['总价', '=', '单价', '× 数量'], page: 1 };
    const tJ = atC('a37', '单价，等于') - .2, tJd = 1.4;
    const p1 = { t: tJ + tJd, toks: [{ s: '总价' }, { s: '÷ 数量', c: COL.candyD }, '=', '单价'], page: 1 };
    const p2 = { t: atC('a37', '这就叫') - .3, toks: ['单价', '=', '总价', '÷', '数量'], page: 1, under: atE('a37', '公式变形') };
    SC.s5 = { items, tilt: [[0, 0]], card: { t0: atC('a34', '总价') - .3, rows: [r0, r1, r1o, r2, p0, p1, p2], jumps: [{ t: tJ, dur: tJd, from: [p0, 3], to: [p1, 1] }] },
      boxTag: [VO.a38 + .2, END],
      pose: [[s.t0, 'rest'], [VO.a34, 'present'], [VO.a35, 'point'], [tDiv - .2, 'both', 'focus'], [t15, 'raise', 'happy'], [VO.a37, 'present'], [VO.a38, 'hold', 'happy']] };
  }
  // ── SUMMARY + END
  {
    const s = sec('sum');
    SC.sum = { rows: [atC('a40', '等号'), atC('a41', '两边'), atC('a42', '倒着拆')], pose: [[s.t0, 'present'], [VO.a40, 'point'], [VE('a42'), 'raise', 'happy']] };
    const e = sec('end'), tOpen = atC('a43', '打开') + .4;
    const items = [{ k: 'box', side: 'L', dx: -62, dy: 0, tIn: e.t0 - 1, o: t => ({ label: t < tOpen ? '?' : 'x', open: ss(seg(t, tOpen, tOpen + .45)) }) }];
    N(3, 3, 54).forEach(([dx, dy]) => items.push({ k: 'candy', side: 'L', dx: 70 + dx, dy, tIn: e.t0 - 1 }));
    N(7, 4, 54, 42).forEach(([dx, dy]) => items.push({ k: 'candy', side: 'R', dx, dy, tIn: e.t0 - 1 }));
    SC.end = { items, tilt: [[0, 0]], tOpen, four: atC('a44', '4 颗') - .1, irisT: END - 2.4,
      pose: [[e.t0, 'present'], [VO.a43 + .2, 'pointDown', 'focus'], [tOpen + .3, 'raise', 'wow'], [VO.a44 + .3, 'both', 'happy']] };
  }
}

// mouse choreography (s2): run in under the plate, hop up, two candies vanish into it, run off with a full belly
function drawMouse(ctx, t, m, P) {
  if (t < m.tM || t > m.tRun + 1.4) return;
  const px = P.L[0] - 210, top = P.L[1] - 14;
  let x, y, dir = 1, hop = 0, belly = 0;
  if (t < m.tEat - .25) { const u = seg(t, m.tM, m.tEat - .5); x = lerp(-120, px, eo(u)); y = BAL.floor; hop = u < 1 ? Math.abs(Math.sin(t * 18)) * 8 : 0; if (u >= 1) { const v = seg(t, m.tEat - .5, m.tEat - .25); y = lerp(BAL.floor, top, eo(v)); hop = Math.sin(Math.PI * v) * 60; } }
  else if (t < m.tRun) { x = px; y = top; belly = clamp((t - m.tEat) / .6); hop = Math.abs(Math.sin(t * 10)) * 4; }
  else { const u = seg(t, m.tRun, m.tRun + 1.2); dir = -1; belly = 1; x = lerp(px, -200, ei2(u)); y = u < .2 ? lerp(top, BAL.floor, u / .2) : BAL.floor; hop = Math.abs(Math.sin(t * 20)) * 10 + (u < .2 ? Math.sin(Math.PI * u / .2) * 50 : 0); }
  mouse(ctx, x, y, { dir, hop, belly, s: 1.1 });
}
const ei2 = u => u * u;

function sceneBalance(ctx, t, s, sc) {
  ground(ctx, s.ground);
  const tilt = tiltAt(sc.tilt, t);
  const P = drawBalance(ctx, tilt, (side) => drawItems(ctx, sc.items, t, plates(tilt), side));
  return { P, tilt };
}
const camOf = (s, t, z0 = 1, z1 = 1.035) => ({ cx: 960, cy: 560, z: lerp(z0, z1, ss(seg(t, s.t0, s.t1))) });
function withCam(ctx, c, fn) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy); fn(); ctx.restore(); }
const w2s = (c, x, y) => [W / 2 + (x - c.cx) * c.z, H / 2 + (y - c.cy) * c.z];

function sceneHook(ctx, t, s) {
  const sc = SC.hook, c = camOf(s, t, 1, 1.05);
  withCam(ctx, c, () => {
    const { P } = sceneBalance(ctx, t, s, sc);
    teacher(ctx, t, sc.pose);
    const k = pop(t, sc.q); if (k > 0) scaled(ctx, k, P.L[0] - 62, P.L[1] - 190, () => {
      shape(ctx, ellipse(P.L[0] - 62, P.L[1] - 190, 58, 58, 30), { fill: PAL.white, line: 4, seed: 800 });
      text(ctx, '?', P.L[0] - 62, P.L[1] - 166, { font: '72px Slab', fill: COL.candyD, align: 'center' });
    });
  });
  tag(ctx, t, sc.guess, '4 颗？', 520, 330, { t1: sc.title - .3, px: 44 });
  // title card with a sunburst, written in on "今天"
  const kt = pop(t, sc.title, .4);
  if (kt > 0) {
    rays(ctx, 1140, 230, 30, 760 * kt, tint(PAL.mustard, .45), { rot: t * .05, alpha: .7 });
    scaled(ctx, kt, 1140, 200, () => {
      shape(ctx, rrect(690, 110, 900, 200, 26), { fill: PAL.paper, line: 4.5, seed: 810, grain: .15, off: [8, 7] });
      text(ctx, '公式变形与解方程', 1140, 225, { font: '96px QK', fill: PAL.ink, plate: PAL.coral, off: [6, 5], align: 'center' });
      text(ctx, '把盒子打开 · 5 个步骤', 1140, 285, { font: '700 34px NS', fill: PAL.inkSoft, align: 'center', track: 4 });
    });
  }
  return { focus: w2s(c, BAL.cx, BAL.py) };
}
function sceneStep(ctx, t, s) {
  const sc = SC[s.kind], c = camOf(s, t);
  let P;
  withCam(ctx, c, () => {
    P = sceneBalance(ctx, t, s, sc).P;
    if (s.kind === 's2') drawMouse(ctx, t, sc.mouse, P);
    teacher(ctx, t, sc.pose);
    if (s.kind === 's3' || s.kind === 's4') {
      const [a, b] = sc.link; const k = seg(t, a, a + .5) * (1 - seg(t, b, b + .3));
      if (k > 0) {
        const L = P.L, R = P.R, x0 = s.kind === 's3' ? L[0] - 104 * .86 + 0 : L[0] - 104;
        arrow(ctx, [L[0] - 104, L[1] - 120], [R[0], R[1] - 70], { u: k, bend: -.28, w: 6, fill: COL.accent, bob: (t / BEAT) % 1 });
        tag(ctx, t, a + .3, '1 盒 = 4 颗', BAL.cx - 130, BAL.py - 210, { t1: b, px: 38 });
      }
    }
    if (s.kind === 's3') {
      const [a, b] = sc.split; const k = seg(t, a, a + .4) * (1 - seg(t, b, b + .3));
      if (k > 0) for (let r = 1; r < 3; r++) dashed(ctx, [[P.R[0] - 150, P.R[1] - 10 - r * 44 + 8], [P.R[0] + 150, P.R[1] - 10 - r * 44 + 8]], 4, 14, 10, 0, PAL.ink, k);
    }
  });
  if (s.kind === 's1') {
    bigMark(ctx, t, sc.wrong[0], sc.wrong[1], 1600, 600, 'x');
    tag(ctx, t, sc.wrong[0] + .2, '只拿一边，天平歪了！', 1100, 800, { t1: sc.wrong[1], px: 38, align: 'center' });
    tag(ctx, t, sc.rule, '两边做同样的事', 560, 300, { t1: s.t1, px: 46 });
  }
  if (s.kind === 's2') tag(ctx, t, sc.tagYX[0], '移项变号 = 两边同时 +2', 80, 215, { t1: sc.tagYX[1], px: 36 });
  if (s.kind === 's3') tag(ctx, t, sc.tag3x[0], '3x = 3 × x', 470, 420, { t1: sc.tag3x[1], px: 40 });
  if (s.kind === 's4') {
    const [a, b, tOuter, tFirst] = sc.parcel;
    callout(ctx, t, a, b, 610, 410, 150, g => parcel(g, t, tOuter, tFirst), tint(s.ground, .55), [w2s(c, P.L[0], P.L[1] - 80)[0] - 110, w2s(c, P.L[0], P.L[1] - 80)[1]]);
    tag(ctx, t, tOuter + .2, '最后包的，最先拆', 440, 205, { t1: b, px: 34 });
  }
  if (s.kind === 's5') {
    const [a] = sc.boxTag;
    if (t > a) { const k = pop(t, a); scaled(ctx, k, 560, 470, () => { box(ctx, 560, 520, { s: 1.2 }); sparkle(ctx, 630, 380, 26, { fill: PAL.white }); }); tag(ctx, t, a + .4, '文字、字母 = 没打开的盒子', 370, 215, { px: 32 }); }
  }
  drawCard(ctx, t, sc.card);
  stepHeader(ctx, t, s);
  return { focus: w2s(c, BAL.cx, BAL.py) };
}
// the parcel inside the call-out: outer paper (+2) peels away, then the crate (×3) opens onto three boxes
function parcel(ctx, t, tOuter, tFirst) {
  const u1 = seg(t, tOuter, tOuter + .6), u2 = seg(t, tFirst, tFirst + .5);
  // the crate ×3 with three boxes peeking
  for (let i = 0; i < 3; i++) box(ctx, -70 + i * 70, 70 - (u2 > 0 ? eo(u2) * 20 * (i === 1 ? 1 : .5) : 0), { s: .55 });
  if (u2 < 1) { ctx.save(); ctx.globalAlpha *= 1 - u2; shape(ctx, rrect(-115, -40, 230, 120, 10), { fill: PAL.kraftL, line: 3.4, seed: 820, grain: .3 });
    text(ctx, '×3', 0, 40, { font: '54px Slab', fill: PAL.ink, align: 'center' }); ctx.restore(); }
  if (u1 < 1) {
    ctx.save(); ctx.translate(u1 * 260, -u1 * 220); ctx.rotate(u1 * .8); ctx.globalAlpha *= 1 - u1 * .6;
    shape(ctx, rrect(-135, -80, 270, 180, 16), { fill: PAL.pink, line: 4, seed: 821, grain: .3 });
    for (let i = 0; i < 9; i++) shape(ctx, ellipse(-100 + (i % 3) * 100 + (Math.floor(i / 3) % 2) * 50, -50 + Math.floor(i / 3) * 55, 9, 9, 10), { fill: PAL.white, line: 0, seed: 822 + i, grain: 0 });
    shape(ctx, rect(-14, -80, 28, 180), { fill: COL.accent, line: 3, seed: 832, grain: .2 });
    shape(ctx, rrect(40, -110, 90, 56, 10), { fill: PAL.white, line: 3, seed: 833 }); text(ctx, '+2', 85, -70, { font: '40px Slab', fill: PAL.ink, align: 'center' });
    ctx.restore();
  }
}
function sceneSum(ctx, t, s) {
  ground(ctx, s.ground, 960);
  teacher(ctx, t, SC.sum.pose, { x: 1640, dir: -1, s: 1.0, y: 960 });
  text(ctx, '带走三句话', 200, 190, { font: '84px QK', fill: PAL.ink, plate: PAL.mustardL, off: [6, 5] });
  const lines = ['等号是天平', '两边做同样的事，让 x 单独留下', '倒着拆，最后放回去检查'];
  const cols = [PAL.blue, PAL.pink, PAL.avocado];
  SC.sum.rows.forEach((t0, i) => {
    const k = pop(t, t0, .3); if (k <= 0) return; const y = 360 + i * 200;
    medallion(ctx, 290, y, i + 1, 76, cols[i], k);
    ctx.save(); ctx.globalAlpha *= clamp((t - t0) / .25);
    text(ctx, lines[i], 420, y + 24, { font: '64px QK', fill: PAL.ink, plate: PAL.white, off: [4, 4] });
    ctx.restore();
  });
  return { focus: [W / 2, H / 2] };
}
function sceneEnd(ctx, t, s) {
  const sc = SC.end, c = camOf(s, t, 1, 1.04);
  let P;
  withCam(ctx, c, () => {
    if (t > sc.tOpen) rays(ctx, BAL.cx - BAL.L - 62, BAL.py + BAL.hang - 60, 30, 900 * eo(seg(t, sc.tOpen, sc.tOpen + .6)), tint(PAL.mustard, .45), { rot: t * .08, alpha: .8 });
    P = sceneBalance(ctx, t, s, sc).P;
    // four candies spring out of the opened box
    const bx = P.L[0] - 62, by = P.L[1] - 10 - 88;
    for (let i = 0; i < 4; i++) {
      const u = seg(t, sc.tOpen + .15 + i * .12, sc.tOpen + .75 + i * .12); if (u <= 0) continue;
      const tx = bx - 150 + i * 100, ty = by - 210 - (i % 2) * 40;
      candy(ctx, lerp(bx, tx, eo(u)), lerp(by, ty, eo(u)) - Math.sin(Math.PI * u) * 60, { s: 1.25 });
      if (u >= 1) sparkle(ctx, tx + 30, ty - 60, 18 + 6 * Math.sin(t * 6 + i), { fill: PAL.white });
    }
    teacher(ctx, t, sc.pose);
  });
  tag(ctx, t, sc.four, 'x = 4', 1300, 300, { px: 56 });
  return { focus: w2s(c, P.L[0] - 62, P.L[1] - 160) };
}
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
  // the iris-out at the very end: one last circle on the open box
  if (s.kind === 'end' && t > SC.end.irisT) {
    const k = eio(seg(t, SC.end.irisT, SC.end.irisT + 1.2)), f = [BAL.cx - BAL.L - 62, BAL.py + BAL.hang - 130], r = lerp(1300, 310, k);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(f[0], f[1], r, 0, TAU, true); ctx.fillStyle = PAL.ink; ctx.fill('evenodd'); ctx.restore();
    ink(ctx, ellipse(f[0], f[1], r, r, 90), 7, { closed: true, seed: 964, color: PAL.paper });
    const kt = pop(t, SC.end.irisT + 1.1, .35);
    if (kt > 0) scaled(ctx, kt, 1340, 520, () => {
      text(ctx, '公式变形与解方程', 1340, 500, { font: '84px QK', fill: PAL.paper, plate: PAL.coral, off: [5, 5], align: 'center' });
      text(ctx, '两边做同样的事', 1340, 580, { font: '700 36px NS', fill: PAL.mustardL, align: 'center', track: 6 });
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
    for (const it of sc.items || []) {
      if (it.tIn > s.t0) ev(it.tIn, it.k === 'candy' ? 'drop' : it.k === 'note' ? 'paper' : 'thud', { pan: it.side === 'L' ? -.25 : .3 });
      if (it.tOut != null) ev(it.tOut, 'out', { pan: it.side === 'L' ? -.3 : .4 });
    }
    if (sc.card) {
      ev(sc.card.t0, 'pop', { v: .7 });
      for (const r of sc.card.rows) { ev(r.t, r.ops ? 'pill' : 'chalk'); if (r.ans) ev(r.t + .25, 'ding'); if (r.check) ev(r.check, 'ding', { v: 1.2 }); }
      for (const j of sc.card.jumps || []) ev(j.t, 'slidewhistle', { dur: j.dur });
    }
  }
  const s1 = SC.s1; ev(s1.wrong[0] - .5, 'creak'); ev(s1.wrong[0], 'buzz'); ev(s1.wrong[1] + .1, 'creak', { v: .6 }); ev(s1.rule, 'pop');
  const m = SC.s2.mouse; ev(m.tM, 'scamper', { dur: m.tEat - m.tM - .3 }); ev(m.tEat, 'squeak'); ev(m.tEat + .5, 'munch'); ev(m.tRun, 'scamper', { dur: 1.2 }); ev(m.tRun, 'squeak', { v: .7 });
  ev(SC.s2.tagYX[0], 'pop');
  ev(SC.s3.link[0], 'pop'); ev(SC.s3.tag3x[0], 'pop'); ev(SC.s4.link[0], 'pop');
  const pc = SC.s4.parcel; ev(pc[0], 'pop'); ev(pc[2], 'rip'); ev(pc[3], 'lid');
  ev(SC.hook.q, 'pop'); ev(SC.hook.guess, 'pop'); ev(SC.hook.title, 'title');
  SC.sum.rows.forEach(t => ev(t, 'stamp'));
  ev(sec('sum').t0, 'wipe'); ev(sec('end').t0, 'wipe');
  ev(SC.end.tOpen, 'lid'); ev(SC.end.tOpen + .2, 'ta-da'); ev(SC.end.four, 'ding'); ev(SC.end.irisT, 'iris');
  EVS.push({ t: 0, type: 'cues', BEAT, BPM, END, SEC: S.map(s => ({ kind: s.kind, t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3) })),
    SIL: [[VE('a03') + .1, VO.a04 - .05], [atC('a43', '打开') - .1, SC.end.tOpen]], wrong: s1.wrong[0], open: SC.end.tOpen, sumRows: SC.sum.rows });
  EVS.sort((a, b) => a.t - b.t);
}
