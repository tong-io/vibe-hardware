// 比例与百分比 — Brick Toy. No presenter: bricks on a real desk carry the lesson. One spoon = one brick in a glass;
// candies are round red bricks shared into two bins; a 10×10 plate fills with tiles; a price bar loses a brick;
// a reading bar in front of a real book. Equations are printed tiles in the top-right panel.
// Times come from the voice (VO start = previous start + duration + GAP); visual beats hang off spoken characters.
import * as THREE from 'three';
import { makePost } from '/core/three/post.js';
import { clamp, seg, eio, eo, ss, lerp, hash } from '/core/lib.js';
import { COL, BRICK, PLATE, brick, plate, mesh, roundGeo, brickGeo, plastic } from './bricks.js';
import { buildSet, TOP, ST } from './set.js';

const W = 1920, H = 1080, Q = new URLSearchParams(location.search);
const q = t => Math.floor(t * 12 + 1e-6) / 12;                 // stop-motion: pieces step on twos
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ───────────────────────────────────────── voice timeline
const [LINES, DURS, WORDS] = await Promise.all(['lines.json', 'voices/dur.json', 'voices/words.json'].map(async u => (await fetch(u)).json()));
const TXT = Object.fromEntries(LINES.map(l => [l.id, l.text]));
const SECS = [['hook', 'b01 b02 b03 b04 b05'], ['s1', 'b06 b07 b08 b09 b10 b11'], ['s2', 'b12 b13 b14 b15 b16'], ['s3', 'b17 b18 b19 b20 b21'],
  ['s4', 'b22 b23 b24 b25 b26'], ['s5', 'b27 b28 b29 b30 b31'], ['sum', 'b32 b33 b34 b35'], ['end', 'b36 b37 b38 b39']].map(([k, ids]) => [k, ids.split(' ')]);
const STEP = { s1: [1, '比例：几份对几份'], s2: [2, '按比例分东西'], s3: [3, '百分比：每 100 份占几份'], s4: [4, '求百分之几'], s5: [5, '反过来求总数'] };
const LEAD = { hook: .6, s1: 1.3, s2: 1.3, s3: 1.3, s4: 1.3, s5: 1.3, sum: 1.0, end: 1.0 };
const GAP = {
  b01: .4, b02: 1.0, b03: 1.4, b04: .6, b05: 2.6, b06: .5, b07: .8, b08: .5, b09: 1.0, b10: .8, b11: 1.5,
  b12: .5, b13: .8, b14: .9, b15: 1.2, b16: 1.6, b17: .5, b18: 1.2, b19: 1.0, b20: 1.3, b21: 1.5,
  b22: .5, b23: .9, b24: .9, b25: .9, b26: 1.5, b27: .5, b28: 1.0, b29: .7, b30: 1.3, b31: 1.6,
  b32: .5, b33: .7, b34: .7, b35: 3.0, b36: .6, b37: .9, b38: .9, b39: 4.6,
};
const VO = {}, S = []; let cur = 0;
for (const [kind, ids] of SECS) { const t0 = cur; let c = t0 + LEAD[kind]; for (const id of ids) { VO[id] = c; c += DURS[id] + (GAP[id] ?? .45); } S.push({ kind, ids, t0, t1: c }); cur = c; }
const DUR = +cur.toFixed(2);
const sec = k => S.find(s => s.kind === k), secAt = t => S.find(s => t >= s.t0 && t < s.t1) || S[S.length - 1];
const VE = id => VO[id] + DURS[id];
const strip = s => s.replace(/[\s，。？！：；、“”,.?!:;]/g, '');
function timeAt(id, f) {
  const ws = WORDS[id].map(w => [w[0], Math.max(0, w[1]), w[2]]), cum = [0];
  ws.forEach(w => cum.push(cum[cum.length - 1] + Math.max(1, strip(w[0]).length)));
  const c = f * cum[cum.length - 1]; let i = 0; while (i < ws.length - 1 && cum[i + 1] <= c) i++;
  return lerp(ws[i][1], ws[i][2], clamp((c - cum[i]) / ((cum[i + 1] - cum[i]) || 1)));
}
function atC(id, sub, o = {}) {
  const tx = strip(TXT[id]), s = strip(sub); let i = -1;
  for (let k = 0; k <= (o.k ?? 0); k++) { i = tx.indexOf(s, i + 1); if (i < 0) throw new Error(`"${sub}" not in ${id}`); }
  return VO[id] + timeAt(id, (o.end ? i + s.length : i) / tx.length);
}
const atE = (id, sub, o = {}) => atC(id, sub, { ...o, end: 1 });

// ───────────────────────────────────────── renderer
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(2); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .5, 3000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: 2, ao: true, aoRadius: 3.5, aoThickness: 3, aoAmt: .9 });
post.bloom.strength = .12; post.bloom.threshold = 1.3;
post.vig.uniforms.amt.value = .32; post.vig.uniforms.warm.value = -.35; post.vig.uniforms.contrast.value = .24; post.vig.uniforms.sat.value = 1.1;
const set = await buildSet(scene);
await Promise.all(['700 64px ZK', '700 44px NS', '500 40px NS'].map(f => document.fonts.load(f, '比例0')));

// ───────────────────────────────────────── printed faces (tiles and signs carry type; studs never do)
function printTex(str, w, h, o = {}) {
  const c = document.createElement('canvas'), k = 128; c.width = w * k; c.height = h * k; const g = c.getContext('2d');
  g.fillStyle = o.bg || '#f4f4f1'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = o.fg || '#1b2a34'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let px = (o.size ?? .62) * h * k; g.font = `700 ${px}px ZK`;
  const mw = g.measureText(str).width; if (mw > c.width * .88) { px *= c.width * .88 / mw; g.font = `700 ${px}px ZK`; }
  g.fillText(str, c.width / 2, c.height * .54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const faceMat = (tex) => new THREE.MeshPhysicalMaterial({ map: tex, roughness: .35, clearcoat: .6, clearcoatRoughness: .1 });
// a w×1 brick standing on the plate with printed text on its front face (+z)
function sign(w, str, color = COL.white, o = {}) {
  const g = new THREE.Group(), h = o.h ?? BRICK, b = mesh(brickGeo(w, 1, h), color); g.add(b);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w - .2, h - .15), faceMat(printTex(str, w - .2, h - .15, { bg: o.bg || color, fg: o.fg, size: o.size }))); f.position.set(0, h / 2, .505); g.add(f);
  return g;
}
// a flat tile (no studs) lying on top of something, printed on top
function printedTile(w, d, str, color = COL.white, o = {}) {
  const g = new THREE.Group(); g.add(mesh(brickGeo(w, d, PLATE, { tile: true }), color));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w - .15, d - .15), faceMat(printTex(str, w - .15, d - .15, { bg: color, fg: o.fg, size: o.size }))); f.rotation.x = -Math.PI / 2; f.position.y = PLATE + .005; g.add(f);
  return g;
}

// ───────────────────────────────────────── pieces: fly in on an arc, snap with a tiny overshoot, move, fly out
const PIECES = [], EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
function piece(obj, home, o = {}) {
  const p = { obj, home: home.clone(), ...o }; PIECES.push(p); scene.add(obj);
  if (p.tIn != null && !p.noClick) { ev(p.tIn, 'click', { v: p.v ?? .8, pitch: p.pitch ?? 1 }); if ((p.dIn ?? .45) > .3) ev(p.tIn - (p.dIn ?? .45), 'whoosh', { v: .25 }); }
  for (const m of p.moves || []) ev(m.t, 'click', { v: .6, pitch: 1.1 });
  if (p.tOut != null) ev(p.tOut, 'whoosh', { v: .35 });
  return p;
}
const arc = (a, b, u, h) => a.clone().lerp(b, u).add(V(0, Math.sin(Math.PI * clamp(u)) * h, 0));
function updatePiece(p, t) {
  const tq = q(t), o = p.obj, dIn = p.dIn ?? .45;
  if (p.tIn != null && tq < p.tIn - dIn) { o.visible = false; return; }
  let pos = p.home.clone(), land = p.tIn ?? -9, spin = 0;
  if (p.tIn != null && tq < p.tIn) {
    const u = seg(tq, p.tIn - dIn, p.tIn), from = p.from || p.home.clone().add(V(-3, 10, 6));
    pos = arc(from, p.home, eo(u), 2); spin = (1 - u) * .8;
  }
  for (const m of p.moves || []) {
    if (tq < m.t - m.dur) break;
    const u = seg(tq, m.t - m.dur, m.t); pos = arc(pos, m.to, eio(u), m.lift ?? 3); if (tq >= m.t) land = m.t;
  }
  for (const h of p.hops || []) { const u = seg(tq, h, h + .34); if (u > 0 && u < 1) pos.y += Math.sin(Math.PI * u) * .9; }
  const sn = tq - land; if (sn >= 0 && sn < .17) pos.y += .28 * (1 - sn / .17);
  if (p.tOut != null && tq >= p.tOut) {
    const u = seg(tq, p.tOut, p.tOut + .55); if (u >= 1) { o.visible = false; return; }
    pos = arc(pos, p.out, eio(u), p.outLift ?? 5); spin = u * 2.2;
  }
  o.visible = true; o.position.copy(pos); o.rotation.set(spin * .5, (p.ry ?? 0) + spin, 0);
  if (p.scaleIn) { const k = clamp(seg(tq, p.scaleIn, p.scaleIn + .25)); o.scale.setScalar(Math.max(.001, k < 1 ? .6 + .5 * Math.sin(k * Math.PI * .75) : 1)); o.visible = tq >= p.scaleIn; }
}

// glasses: a clear open cylinder; the liquid is stacked 2×2 bricks, one per spoon
const LEMON = COL.yellow, WATER = '#7cc3e8';
const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .16, roughness: .04, clearcoat: 1, clearcoatRoughness: .03, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.6 });
function glass(x, z, cap, o = {}) {
  const g = new THREE.Group(), h = cap * BRICK + .8;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.7, h, 48, 1, true), glassMat); wall.position.y = h / 2; g.add(wall);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.75, .07, 8, 48), glassMat); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, .12, 48), glassMat); bot.position.y = .06; g.add(bot);
  g.renderOrder = 2; return piece(g, V(x, TOP, z), { tIn: o.tIn, scaleIn: o.scaleIn, noClick: o.tIn == null, v: .5 });
}
function fill(x, z, spec, o = {}) {                  // spec: [[colour, n, t0, dt]], hops: (i) => [t…]
  let i = 0; const out = [];
  for (const [c, n, t0, dt] of spec) for (let k = 0; k < n; k++, i++) {
    const m = brick(2, 2, c);
    out.push(piece(m, V(x, TOP + .12 + i * BRICK, z), { tIn: t0 + k * dt, from: V(x - 3, TOP + 16, z + 4), dIn: .5, hops: o.hops ? o.hops(i, c) : null, noClick: t0 < -1, pitch: c === LEMON ? 1.15 : 1 }));
  }
  return out;
}

// ───────────────────────────────────────── the workstations
const SC = {};
// HOOK + END: two glasses of lemonade (small: 1 lemon + 3 water; big: 2 lemon + 8 water)
{
  const x0 = ST.cups - 4.5, x1 = ST.cups + 4.5;
  glass(x0, 0, 4); glass(x1, 0, 10);
  const e = sec('end');
  const hopS = (i, c) => c === LEMON ? [atC('b37', '柠檬汁占') + .1] : [atC('b37', '一共') + .1 + i * .1];
  const hopB = (i, c) => c === LEMON ? [atC('b38', '柠檬汁占') + .1 + i * .12] : [atC('b38', '一共') + .1 + i * .06];
  fill(x0, 0, [[LEMON, 1, atC('b02', '1 勺'), 0], [WATER, 3, atC('b02', '3 勺'), .2]], { hops: hopS });
  fill(x1, 0, [[LEMON, 2, atC('b02', '2 勺'), .2], [WATER, 8, atC('b02', '8 勺'), .12]], { hops: hopB });
  piece(sign(4, '小杯'), V(x0, TOP, 3.2)); piece(sign(4, '大杯'), V(x1, TOP, 3.2));
  const star = new THREE.Group(); const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, .4, 40), faceMat(printTex('酸', 1, 1, { bg: COL.yellow, fg: '#c91a09', size: .8 }))); star.add(disc);
  piece(star, V(x0, TOP + 4 * BRICK + 1.3, 0), { tIn: atC('b39', '更酸') - .1, v: 1.1, pitch: .9 });
  SC.cups = { x0, x1, q: atC('b03', '哪一杯'), more: VO.b04, title: atC('b05', '比例') - .1, a25: atC('b37', '25%') - .1, b20: atC('b38', '20%') - .1, win: atC('b39', '更酸') - .1 };
}
// S1: 1 : 3 and its double, 2 : 6
{
  const x0 = ST.ratio - 4, x1 = ST.ratio + 4, s = sec('s1'), bigIn = VO.b09 - .2;
  glass(x0, 0, 4);
  fill(x0, 0, [[LEMON, 1, -9, 0], [WATER, 3, -9, 0]], { hops: (i, c) => c === LEMON ? [atC('b07', '1 勺')] : [atC('b07', '3 勺') + (i - 1) * .1] });
  glass(x1, 0, 8, { scaleIn: bigIn });
  fill(x1, 0, [[LEMON, 2, atC('b09', '2 勺'), .2], [WATER, 6, atC('b09', '6 勺'), .12]], { hops: (i) => [atC('b10', '同一个') + i * .05] });
  piece(sign(4, '1 : 3'), V(x0, TOP, 3.2)); piece(sign(4, '2 : 6'), V(x1, TOP, 3.2), { tIn: atC('b09', '6 勺') + 1.0 });
  SC.s1 = { x0, x1, bigIn, same: atC('b10', '同一个'), rule: atC('b11', '两边乘'),
    rows: [{ t: atC('b07', '写作'), toks: ['1', ':', '3'] }, { t: atC('b09', '乘 2'), ops: [[0, '×2'], [2, '×2']], ref: 0 }, { t: atC('b09', '6 勺'), toks: ['2', ':', '6'], ans: 1 }] };
}
// S2: 10 candies shared 3 : 2
{
  const cx = ST.candy, s = sec('s2'), tIn = atC('b13', '10 颗'), tPair = atC('b15', '分成 5 份') - .2, tG = atC('b16', '哥哥'), tM = atC('b16', '妹妹');
  piece(plate(14, 1, COL.dgray), V(cx, TOP, -4.5), { noClick: true });
  const bin = (bx, w, col, name) => {
    const g = new THREE.Group();
    const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); };
    for (let L = 0; L < 2; L++) add(brick(w, 1, col), 0, L * BRICK, -1.5);
    add(brick(w, 1, col), 0, 0, 1.5);
    for (const sx of [-1, 1]) for (let L = 0; L < 2; L++) add(brick(1, 2, col), sx * (w / 2 - .5), L * BRICK, 0);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w - .3, BRICK - .15), faceMat(printTex(name, w - .3, BRICK - .15, { bg: col, fg: col === COL.yellow ? '#1b2a34' : '#ffffff' }))); f.position.set(0, BRICK / 2, 2.005); g.add(f);
    piece(g, V(bx, TOP, 4.5), { noClick: true });
  };
  const GX = cx - 5.5, MX = cx + 5.5;
  bin(GX, 9, COL.blue, '哥哥'); bin(MX, 7, COL.yellow, '妹妹');
  const slotsG = [-2.2, 0, 2.2].map(d => GX + d), slotsM = [-1.2, 1.2].map(d => MX + d);
  const tS = [atC('b14', '3 加'), atC('b14', '2，是')];
  slotsG.forEach((x, k) => piece(printedTile(2, 2, '份', COL.white, { fg: '#c91a09' }), V(x, TOP, 4.5), { tIn: tS[0] + k * .2, v: .6 }));
  slotsM.forEach((x, k) => piece(printedTile(2, 2, '份', COL.white, { fg: '#c91a09' }), V(x, TOP, 4.5), { tIn: tS[1] + k * .2, v: .6 }));
  const pairX = p => cx - 8 + p * 4;
  for (let p = 0; p < 5; p++) {
    const toG = p < 3, slot = toG ? slotsG[p] : slotsM[p - 3], tf = (toG ? tG : tM) + (toG ? p : p - 3) * .4;
    piece(plate(2, 1, COL.white), V(pairX(p), TOP, -1), { tIn: tPair + p * .25, v: .5, moves: [{ t: tf, dur: .55, to: V(slot, TOP + PLATE, 4.5), lift: 6 }] });
    for (const d of [-.5, .5]) {
      const i = p * 2 + (d < 0 ? 0 : 1);
      piece(mesh(roundGeo(.5), COL.red), V(cx - 6.5 + i * 1.45, TOP + PLATE, -4.5), { tIn: tIn + i * .1, v: .7, pitch: 1.2,
        moves: [{ t: tPair + p * .25 + .3, dur: .35, to: V(pairX(p) + d, TOP + PLATE, -1), lift: 1.5 }, { t: tf, dur: .55, to: V(slot + d, TOP + 2 * PLATE, 4.5), lift: 6 }] });
    }
  }
  SC.s2 = { ok: atC('b16', '正好'), GX, MX, tS,
    rows: [{ t: atC('b14', '3 加 2'), toks: ['3 + 2', '=', '5 份'] }, { t: atC('b15', '每份'), toks: ['10 ÷ 5', '=', '2 颗'] },
      { t: atC('b16', '6 颗') - .2, toks: ['哥哥', '=', '3 × 2', '=', '6'], ans: 1 }, { t: atC('b16', '4 颗') - .2, toks: ['妹妹', '=', '2 × 2', '=', '4'], ans: 1 }] };
}
// S3: the 100-square plate
{
  const cx = ST.grid, s = sec('s3'), a = atC('b18', '铺上'), b = atC('b19', '一半'), c = atC('b19', '铺满'), d = VO.b20 + .1, qT = atC('b20', '四分之一') - .2;
  piece(plate(10, 10, COL.white), V(cx, TOP, 0), { noClick: true });
  const cell = (r, cc) => V(cx - 4.5 + cc, TOP + PLATE, -4.5 + r);
  for (let i = 0; i < 100; i++) {
    const r = Math.floor(i / 10), cc = i % 10;
    const tIn = i < 25 ? a + i * 1.4 / 25 : i < 50 ? b + (i - 25) * .9 / 25 : c + (i - 50) * 1.0 / 50;
    const moves = i < 25 ? [{ t: qT + .8 + i * .02, dur: .5, to: cell(Math.floor(i / 5), i % 5), lift: 1.2 }] : null;
    piece(mesh(brickGeo(1, 1, PLATE, { tile: true }), COL.red), cell(r, cc), { tIn, dIn: .3, from: cell(r, cc).add(V(0, 7, 3)), v: .35, pitch: 1.3 + (i % 5) * .04,
      tOut: i >= 25 ? d + (i - 25) * .006 : null, out: V(cx + 14 + (i % 7), 12 + (i % 5), -14 - (i % 9)), moves });
  }
  const bar = (w, d2) => new THREE.Mesh(new THREE.BoxGeometry(w, .5, d2), plastic(COL.black));
  piece(bar(10.4, .22), V(cx, TOP + PLATE + .25, 0), { tIn: qT + 1.4, v: .5 }); piece(bar(.22, 10.4), V(cx, TOP + PLATE + .25, 0), { tIn: qT + 1.5, v: .5 });
  SC.s3 = { cx, a, b, c, d, qT, pct: atC('b21', '百分号'), counts: [[a, 0, 25, 1.4], [b, 25, 50, .9], [c, 50, 100, 1.0], [d, 100, 25, .5]],
    rows: [{ t: atC('b18', '就是'), toks: ['25 块', '=', '25%'] }, { t: atC('b19', '是 50%'), toks: ['50 块', '=', '50%'] }, { t: atC('b19', '是 100%'), toks: ['100 块', '=', '100%'] },
      { t: VO.b20 + .3, toks: ['25%', '=', '25 ÷ 100'], page: 1 }, { t: qT, toks: ['', '=', '1/4'], page: 1 }, { t: atC('b20', '0.25'), toks: ['', '=', '0.25'], page: 1, ans: 1 }] };
}
// S4: the backpack on sale and its price bar
{
  const cx = ST.bag, s = sec('s4'), tPack = VO.b23 - .2, tBar = atC('b24', '80 乘'), t20 = atC('b24', '等于 20'), tCut = atC('b25', '省 20');
  const pack = new THREE.Group(), PG = '#3f8f3a', PGD = '#2c6b29', PGL = '#7fbf5a';
  const add = (m, x, y, z) => { m.position.set(x, y, z); pack.add(m); };
  for (let L = 0; L < 4; L++) add(brick(6, 4, PG), 0, L * BRICK, 0);
  add(plate(6, 4, PGD), 0, 4 * BRICK, 0); add(brick(4, 1, PGL), 0, .2, 2.5); add(brick(4, 1, PGL), 0, .2 + BRICK, 2.5);
  add(mesh(roundGeo(1, PLATE), COL.yellow), 0, 2.8, 2.2);
  add(brick(1, 1, COL.black), -1.5, 4 * BRICK + PLATE, 0); add(brick(1, 1, COL.black), 1.5, 4 * BRICK + PLATE, 0); add(plate(4, 1, COL.black), 0, 5 * BRICK + PLATE, 0);
  piece(pack, V(cx - 1, TOP, -2), { tIn: tPack, dIn: .6, v: 1.1, pitch: .8 });
  piece(sign(4, '80元', COL.white, { h: BRICK * 1.5 }), V(cx + 5.5, TOP, -2), { tIn: atC('b23', '80 元') - .1 });
  const sale = new THREE.Group(), disc = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, .4, 40), [plastic(COL.red), faceMat(Object.assign(printTex('−25%', 1, 1, { bg: COL.red, fg: '#ffffff', size: .42 }), { center: new THREE.Vector2(.5, .5), rotation: Math.PI / 2 })), plastic(COL.red)]);
  disc.rotation.x = Math.PI / 2; disc.position.y = 2.6; sale.add(disc); sale.add(brick(1, 1, COL.red));
  piece(sale, V(cx - 6.5, TOP, -1), { tIn: atC('b23', '便宜') - .05, v: 1, pitch: .9 });
  const barX = i => cx - 6 + i * 4;
  for (let i = 0; i < 4; i++) {
    const g = sign(4, '20', i === 0 ? COL.yellow : COL.yellow, { size: .7 });
    piece(g, V(barX(i), TOP, 5), { tIn: tBar + i * .18, tOut: i === 0 ? tCut : null, out: V(cx - 16, 10, -8) });
  }
  const red0 = sign(4, '20', COL.red, { fg: '#ffffff', size: .7 }); red0.scale.setScalar(1.02);
  piece(red0, V(barX(0), TOP, 5), { tIn: t20, dIn: .01, noClick: true, tOut: tCut, out: V(cx - 16, 10, -8) });
  ev(t20, 'ding', { v: .6 }); ev(tCut, 'pop', { v: 1 });
  SC.s4 = { cx, tBar, t20, tCut, pay: atC('b25', '只要付'), rule: atC('b26', '部分'), barX,
    rows: [{ t: VO.b24 + .1, toks: ['省', '=', '80 × 25%'] }, { t: tBar, toks: ['', '=', '80 × 0.25'] }, { t: t20, toks: ['', '=', '20 元'], ans: 1 },
      { t: atC('b25', '只要付'), toks: ['付', '=', '80 − 20', '=', '60 元'], ans: 1, page: 1 }] };
}
// S5: a real book and its reading bar
{
  const cx = ST.book, s = sec('s5'), tRead = atC('b28', '读了'), t60 = atC('b28', '60 页'), tEach = atC('b30', '60 除以'), t200 = atC('b30', '200 页') - .1;
  const bx = i => cx - 9.45 + i * 2.1;
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group(); g.add(brick(2, 2, COL.white));
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.05), faceMat(printTex('20', 1.8, 1.05, { bg: COL.white, size: .62 }))); f.position.set(0, BRICK / 2, 1.005); f.visible = false; g.add(f); g.userData.face = f;
    const p = piece(g, V(bx(i), 0, 10.5), { tIn: VO.b28 - .3 + i * .06, v: .5 }); p.faceAt = tEach + i * .12;
    if (i < 3) piece(plate(2, 2, COL.yellow), V(bx(i), BRICK, 10.5), { tIn: tRead + i * .3, v: .8, pitch: 1.1 });
  }
  for (let i = 0; i < 10; i++) ev(tEach + i * .12, 'click', { v: .35, pitch: 1.4 });
  SC.s5 = { cx, bx, tRead, t60, tEach, t200, callback: atC('b29', '上节课'),
    rows: [{ t: atC('b29', '60 等于'), toks: ['60', '=', '总数 × 30%'] }, { t: atC('b30', '两边同时'), ops: [[0, '÷30%'], [2, '÷30%']], ref: 0 },
      { t: atC('b30', '总数等于'), toks: ['总数', '=', '60 ÷ 0.3'] }, { t: t200, toks: ['', '=', '200 页'], ans: 1 },
      { t: VO.b31 + .2, toks: ['200 × 30%', '=', '60'], page: 1, check: atC('b31', '对了') - .1 }] };
}

// ───────────────────────────────────────── camera: one set of keys per section, moves on ones
const std = (cx, o = {}) => ({ pos: V(cx + (o.dx ?? 4), o.y ?? 17, o.z ?? 33), look: V(cx + (o.lx ?? 5), o.ly ?? 3, o.lz ?? 0), fov: o.fov ?? 30, aper: o.aper ?? 700 });
const CAM = [];
const K = (t, c, ease = 'io') => CAM.push({ t, ...c, ease });
{
  const h = sec('hook'), c = SC.cups;
  K(0, { pos: V(c.x0 + 6, 6.5, 19), look: V(c.x0 + 1, 3.6, 0), fov: 30, aper: 1000 });
  K(VO.b02 - .1, { pos: V(c.x0 + 5.5, 6.2, 18), look: V(c.x0 + 1, 3.6, 0), fov: 30, aper: 1000 });
  K(VO.b02 + 1.6, std(ST.cups, { lx: 4, ly: 4.5, y: 14, z: 34 }));
  K(VE('b04'), std(ST.cups, { lx: 4.5, ly: 4.5, y: 14.5, z: 32 }), 'l');
  K(h.t1 - .1, std(ST.cups, { lx: 4.5, ly: 4.5, y: 15, z: 31 }), 'l');
  const s1 = sec('s1'); K(s1.t0 + .7, std(ST.ratio, { lx: 4, ly: 4, y: 13, z: 30 })); K(s1.t1 - .1, std(ST.ratio, { lx: 4, ly: 4, y: 13.5, z: 28 }), 'l');
  const s2 = sec('s2'); K(s2.t0 + .7, std(ST.candy, { lx: 5, ly: 1, y: 24, z: 30, aper: 600 })); K(s2.t1 - .1, std(ST.candy, { lx: 5, ly: 1, y: 23, z: 28, aper: 600 }), 'l');
  const s3 = sec('s3'); K(s3.t0 + .7, std(ST.grid, { dx: 2, lx: 5, ly: 0, y: 26, z: 22, aper: 500 })); K(s3.t1 - .1, std(ST.grid, { dx: 2, lx: 5, ly: 0, y: 25, z: 21, aper: 500 }), 'l');
  const s4 = sec('s4'); K(s4.t0 + .7, std(ST.bag, { lx: 5, ly: 3, y: 16, z: 32 })); K(s4.t1 - .1, std(ST.bag, { lx: 5, ly: 3, y: 16, z: 30 }), 'l');
  const s5 = sec('s5'); K(s5.t0 + .7, std(ST.book, { dx: 1, lx: 1, ly: 2, lz: 5, y: 20, z: 37 })); K(s5.t1 - .1, std(ST.book, { dx: 1, lx: 1, ly: 2, lz: 5, y: 19.5, z: 35 }), 'l');
  const sm = sec('sum'); K(sm.t0 + 1.6, { pos: V(10, 105, 112), look: V(6, 0, -6), fov: 40, aper: 260 }); K(sm.t1 - .1, { pos: V(10, 103, 108), look: V(6, 0, -6), fov: 40, aper: 260 }, 'l');
  const e = sec('end'); K(e.t0 + 1.4, std(ST.cups, { lx: 4.5, ly: 4.5, y: 14, z: 32 })); K(c.win, std(ST.cups, { lx: 4.5, ly: 4.5, y: 14, z: 31 }), 'l');
  K(c.win + 1.2, { pos: V(c.x0 + 4, 7, 17), look: V(c.x0 + .5, 4, 0), fov: 30, aper: 900 }); K(DUR, { pos: V(c.x0 + 3.6, 6.8, 15.5), look: V(c.x0 + .5, 4, 0), fov: 30, aper: 900 }, 'l');
}
function camAt(t) {
  let i = 0; while (i < CAM.length - 1 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1]; if (!b) return a;
  const u = (t - a.t) / (b.t - a.t), e = b.ease === 'l' ? u : eio(u);
  return { pos: a.pos.clone().lerp(b.pos, e), look: a.look.clone().lerp(b.look, e), fov: lerp(a.fov, b.fov, e), aper: lerp(a.aper, b.aper, e), moving: b.ease !== 'l' && u > 0 && u < 1 };
}
for (let i = 1; i < CAM.length; i++) if (CAM[i].ease !== 'l' && CAM[i].pos.distanceTo(CAM[i - 1].pos) > 20) ev(CAM[i - 1].t + (CAM[i].t - CAM[i - 1].t) * .25, 'whoosh', { v: .7, d: .6 });

// ───────────────────────────────────────── 2D layer: captions, step header, equation tiles, tags, title, summary, end card
const ov = document.getElementById('ov'), g = ov.getContext('2d');
const proj = p => { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
function brickIcon(x, y, s = 1, col = '#f2cd37') {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.beginPath(); g.roundRect(0, 8, 58, 26, 5); g.fill();
  g.beginPath(); g.roundRect(7, 0, 18, 10, 3); g.roundRect(33, 0, 18, 10, 3); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 28, 58, 6); g.restore();
}
function pill(text, cx, y, o = {}) {
  const px = o.px || 44; g.font = `700 ${px}px NS`; const tw = g.measureText(text).width, pw = tw + 140, ph = px + 40, x = o.left ? cx : cx - pw / 2;
  g.save(); g.globalAlpha *= o.a ?? 1; g.fillStyle = 'rgba(18,20,26,.66)'; g.beginPath(); g.roundRect(x, y, pw, ph, ph / 2); g.fill();
  brickIcon(x + 26, y + ph / 2 - 17, 1, o.col || '#f2cd37');
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(text, x + 104, y + ph / 2 + 2); g.restore();
  return { x, y, w: pw, h: ph };
}
const pop = (t, t0, d = .25) => { const u = clamp(seg(q(t), t0, t0 + d)); return u <= 0 ? 0 : u < 1 ? .6 + .5 * Math.sin(u * Math.PI * .75) : 1; };
function tagAt(t, t0, t1, str, world, o = {}) {        // a pill anchored above a world point
  if (t < t0 || (t1 && t > t1)) return; const k = pop(t, t0); if (k <= 0) return;
  const [x, y] = proj(world); g.save(); g.translate(x, y); g.scale(k, k); g.translate(-x, -y);
  pill(str, x, y - (o.px || 40) - 40, { px: o.px || 40, col: o.col }); g.restore();
}
const SUBS = [];
for (const id of Object.keys(VO)) {
  const raw = TXT[id], parts = [];
  for (const p of raw.match(/[^，。？！：；]+[，。？！：；]*/g)) { const last = parts[parts.length - 1]; if (last != null && strip(last + p).length <= 20) parts[parts.length - 1] += p; else parts.push(p); }
  let c0 = 0; const n = strip(raw).length;
  for (const p of parts) { const a = c0 / n, b = (c0 + strip(p).length) / n; c0 += strip(p).length;
    SUBS.push({ t0: VO[id] + (a === 0 ? 0 : timeAt(id, a)) - .08, t1: VO[id] + (b >= .999 ? DURS[id] : timeAt(id, b)) + .3, text: p.replace(/[，。；：]+$/, '').trim() }); }
}
SUBS.sort((a, b) => a.t0 - b.t0);
for (let i = 0; i < SUBS.length - 1; i++) SUBS[i].t1 = Math.min(Math.max(SUBS[i].t1, SUBS[i].t0 + 1.8), SUBS[i + 1].t0 - .04);

// equation tiles (top right)
const PANEL = { x: 1080, y: 36, w: 800, rowH: 118, max: 3 };
const tokFont = '700 64px ZK';
function tokW(s) { g.font = tokFont; return s ? Math.max(64, g.measureText(s).width + 34) : 0; }
function layout(r) {
  const gap = 12, ws = r.toks.map(tokW), ei = r.toks.findIndex(s => s === '=' || s === ':');
  let x = PANEL.x + PANEL.w / 2 - ws[ei] / 2; for (let i = ei - 1; i >= 0; i--) x -= ws[i] + (ws[i] ? gap : 0);
  const tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.filter(Boolean).length - 1);
  if (x < PANEL.x + 20 || x + tot > PANEL.x + PANEL.w - 20) x = PANEL.x + (PANEL.w - tot) / 2;
  return r.toks.map((s, i) => { const x0 = x; x += ws[i] + (ws[i] ? gap : 0); return { s, x0, w: ws[i], cx: x0 + ws[i] / 2 }; });
}
function tile(x, y, w, h, col, s, fg = '#1b2a34', k = 1) {
  g.save(); g.translate(x + w / 2, y + h / 2); g.scale(k, k); g.translate(-(x + w / 2), -(y + h / 2));
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.roundRect(x + 4, y + 8, w, h, 10); g.fill();
  g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill();
  g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x + 8, y + 6, w - 16, 6);
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y + h - 10, w, 10);
  g.fillStyle = fg; g.font = tokFont; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x + w / 2, y + h / 2 + 4);
  g.restore();
}
function equations(t, rows) {
  if (!rows || t < rows[0].t - .3) return;
  const vis = rows.filter(r => t >= r.t - .02); if (!vis.length) vis.push(rows[0]);
  const page = vis[vis.length - 1].page ?? 0, cur = rows.filter(r => (r.page ?? 0) === page && t >= r.t - .02);
  const n = cur.reduce((a, r) => a + ss(seg(t, r.t, r.t + .3)), 0), first = Math.max(0, n - PANEL.max);
  const ka = pop(t, rows[0].t - .3, .3);
  const ph = PANEL.rowH * clamp(Math.max(1, n), 1, PANEL.max) + 30;
  g.save(); g.globalAlpha = ka; g.fillStyle = 'rgba(18,20,26,.5)'; g.beginPath(); g.roundRect(PANEL.x, PANEL.y, PANEL.w, ph, 26); g.fill(); g.restore();
  g.save(); g.beginPath(); g.rect(PANEL.x, PANEL.y, PANEL.w, ph); g.clip();
  cur.forEach((r, i) => {
    const y = PANEL.y + 20 + PANEL.rowH * (i - first), a = clamp(1 - (first - i)); if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    if (r.ops) {
      const ref = layout(rows[r.ref]);
      r.ops.forEach(([ti, lab], j) => { const k = pop(t, r.t + j * .12); if (k <= 0) return; g.font = tokFont; const w = g.measureText(lab).width + 34; tile(ref[ti].cx - w / 2, y + 14, w, 76, COL.red, lab, '#fff', k); });
    } else {
      layout(r).forEach((tk, j) => { if (!tk.s) return; const k = pop(t, r.t + j * .08); if (k <= 0) return;
        const ans = r.ans && j === r.toks.length - 1; tile(tk.x0, y + 6, tk.w, 92, ans ? COL.yellow : '#f4f4f1', tk.s, '#1b2a34', k); });
      if (r.check && t > r.check) { const L = layout(r), e = L[L.length - 1], k = pop(t, r.check); tile(e.x0 + e.w + 14, y + 6, 92, 92, COL.green, '✓', '#fff', k); }
    }
    g.restore();
  });
  g.restore();
}
function stepHeader(t, s) {
  const st = STEP[s.kind]; if (!st) return; const k = pop(t, s.t0 + .2, .3); if (k <= 0) return;
  g.save(); g.translate(60, 60); g.scale(k, k);
  g.fillStyle = 'rgba(18,20,26,.66)'; g.font = '700 46px NS'; const w = g.measureText(st[1]).width + 190;
  g.beginPath(); g.roundRect(0, 0, w, 96, 48); g.fill();
  brickIcon(22, 26, 1.3, COL.yellow); g.fillStyle = '#1b2a34'; g.font = '700 30px ZK'; g.textAlign = 'center'; g.fillText(String(st[0]), 22 + 38, 66);
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '700 46px NS'; g.fillText(st[1], 122, 64);
  g.fillStyle = COL.yellow; g.font = '700 22px NS'; g.fillText(`第 ${st[0]} 步 · 共 5 步`, 124, 122);
  g.restore();
}
function legend(t) {
  const s = secAt(t).kind; if (!['hook', 's1', 'end'].includes(s)) return;
  const y0 = s === 'hook' ? 60 : 176;
  g.save(); g.fillStyle = 'rgba(18,20,26,.55)'; g.beginPath(); g.roundRect(60, y0, 300, 110, 22); g.fill();
  brickIcon(84, y0 + 18, .7, COL.yellow); brickIcon(84, y0 + 64, .7, WATER);
  g.fillStyle = '#fff'; g.font = '700 30px NS'; g.textBaseline = 'middle'; g.fillText('= 1 勺柠檬汁', 136, y0 + 32); g.fillText('= 1 勺水', 136, y0 + 78); g.restore();
}
const SUM = ['比例：几份对几份，两边乘同一个数不变', '百分比：每 100 份占几份，% 就是 ÷100', '部分 = 总数 × 百分比，反过来用除法'];
function hud(t) {
  g.clearRect(0, 0, W, H);
  const s = secAt(t), c = SC.cups;
  if (s.kind === 'hook') {
    for (const [x, i] of [[c.x0, 0], [c.x1, 1]]) { const top = i ? 10 * BRICK + 1.5 : 4 * BRICK + 1.5; tagAt(t, c.q + i * .15, VO.b05, '？', V(x, TOP + top, 0), { px: 48, col: COL.red }); }
    tagAt(t, c.more, VE('b04') + .3, '柠檬汁更多 → 更酸？', V(c.x1, TOP + 10 * BRICK + 4, 0), { px: 36 });
    if (t >= c.title) {
      const k = pop(t, c.title, .3), a = 1 - seg(t, s.t1 - .5, s.t1);
      g.save(); g.globalAlpha = a; g.translate(W / 2, 230); g.scale(k, k); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 26; g.shadowOffsetY = 6; g.fillStyle = '#fff'; g.font = '700 130px ZK'; g.fillText('比例与百分比', 0, 0);
      g.shadowBlur = 0; g.shadowOffsetY = 0; g.font = '700 40px NS'; g.fillStyle = COL.yellow; g.fillText('看占多少，不只看有多少', 0, 100); g.restore();
    }
  }
  if (s.kind === 's1') { tagAt(t, SC.s1.same, s.t1 - .3, '同一个味道', V((SC.s1.x0 + SC.s1.x1) / 2, TOP + 7, 0), { px: 38 }); if (t > SC.s1.rule) pill('两边乘同一个数，比例不变', 60, 310, { px: 38, left: 1, a: pop(t, SC.s1.rule) }); }
  if (s.kind === 's2') {
    const s2 = SC.s2; tagAt(t, s2.tS[0], s2.ok - .2, '哥哥 3 份', V(s2.GX, TOP + 3.4, 4.5), { px: 34, col: COL.blue }); tagAt(t, s2.tS[1], s2.ok - .2, '妹妹 2 份', V(s2.MX, TOP + 3.4, 4.5), { px: 34 });
    tagAt(t, s2.ok, s.t1, '6 + 4 = 10 ✓', V(ST.candy, TOP + 4, 4.5), { px: 40, col: COL.green });
  }
  if (s.kind === 's3') {
    const s3 = SC.s3; let n = 0; for (const [t0, a, b, d] of s3.counts) if (t >= t0) n = Math.round(lerp(a, b, clamp((t - t0) / d)));
    if (t > s3.a) tagAt(t, s3.a, s.t1, `${n}%  ·  ${n} / 100`, V(s3.cx, TOP + 1, -6), { px: 44 });
    tagAt(t, s3.qT + 1.5, s.t1, '¼', V(s3.cx - 2.5, TOP + 1, -2.5), { px: 44, col: COL.red });
    if (t > s3.pct) pill('% 就是 ÷ 100', 60, 200, { px: 44, left: 1, a: pop(t, s3.pct) });
  }
  if (s.kind === 's4') { const s4 = SC.s4; tagAt(t, s4.t20 + .1, s4.tCut + .3, '25% = 20 元', V(s4.barX(0), TOP + BRICK + .5, 5), { px: 36, col: COL.red });
    tagAt(t, s4.pay, s.t1, '付 60 元', V(s4.barX(2), TOP + BRICK + .5, 5), { px: 40 }); if (t > s4.rule) pill('部分 = 总数 × 百分比', 60, 200, { px: 40, left: 1, a: pop(t, s4.rule) }); }
  if (s.kind === 's5') { const s5 = SC.s5; tagAt(t, s5.t60, s.t1, '30% = 60 页', V(s5.bx(1), BRICK + 1, 10.5), { px: 34 }); tagAt(t, s5.t200, s.t1, '200 页', V(s5.bx(7), BRICK + 1, 10.5), { px: 40, col: COL.red });
    if (t > s5.callback && t < VE('b30')) pill('上节课：两边做同样的事', 60, 200, { px: 36, left: 1, a: pop(t, s5.callback) }); }
  if (s.kind === 'end') {
    tagAt(t, c.a25, null, '1/4 = 25%', V(c.x0, TOP + 4 * BRICK + 1.5, 0), { px: 40 });
    tagAt(t, c.b20, null, '2/10 = 20%', V(c.x1, TOP + 10 * BRICK + 1.5, 0), { px: 40 });
    tagAt(t, c.win + .2, DUR - 3, '小杯更酸！', V(c.x0, TOP + 4 * BRICK + 5.5, 0), { px: 48, col: COL.red });
  }
  if (s.kind === 'sum') {
    const d = ss(seg(t, s.t0 + .8, s.t0 + 1.6)); g.fillStyle = `rgba(10,12,16,${.45 * d})`; g.fillRect(0, 0, W, H);
    if (t > s.t0 + 1) { g.save(); g.globalAlpha = d; g.font = '700 84px ZK'; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText('带走三句话', 200, 250); g.restore(); }
    const tt = [atC('b33', '比例'), atC('b34', '百分比'), atC('b35', '部分')];
    tt.forEach((t0, i) => { const k = pop(t, t0, .3); if (k <= 0) return; const y = 360 + i * 170;
      g.save(); g.translate(200, y); g.scale(k, k); g.translate(-200, -y);
      brickIcon(200, y + 10, 1.6, [COL.yellow, COL.red, COL.blue][i]); g.fillStyle = i === 0 ? '#1b2a34' : '#fff'; g.font = '700 40px ZK'; g.textAlign = 'center'; g.fillText(String(i + 1), 246, y + 52);
      pill(SUM[i], 320, y, { px: 46, left: 1 }); g.restore(); });
  }
  equations(t, SC[s.kind]?.rows);
  stepHeader(t, s); legend(t);
  // captions
  const cue = SUBS.find(c => t >= c.t0 && t < c.t1);
  if (cue && !Q.has('nosubs')) { const a = Math.min(ss(seg(t, cue.t0, cue.t0 + .12)), 1 - ss(seg(t, cue.t1 - .12, cue.t1))); pill(cue.text, W / 2, H - 150, { a, px: 44 }); }
  // end card
  if (t > DUR - 3) {
    const a = ss(seg(t, DUR - 3, DUR - 2.4)), gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, `rgba(10,12,16,${.2 * a})`); gr.addColorStop(1, `rgba(10,12,16,${.82 * a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = '700 110px ZK'; g.fillText('比例与百分比', W / 2, H / 2 + 120);
    brickIcon(W / 2 - 29, H / 2 + 200, 1); g.font = '700 38px NS'; g.fillStyle = COL.yellow; g.fillText('看占多少，不只看有多少', W / 2, H / 2 + 290); g.restore();
  }
}

// ───────────────────────────────────────── frame
function render(t) {
  for (const p of PIECES) { updatePiece(p, t); if (p.faceAt != null) p.obj.userData.face.visible = q(t) >= p.faceAt; }
  const c = camAt(t);
  camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.look);
  set.aim(c.look, secAt(t).kind === 'sum' ? 110 : 34);
  post.dof.focus = camera.position.distanceTo(c.look); post.dof.aper = c.aper; post.dof.maxCoc = 14;
  post.composer.render();
  hud(t);
}

// sound events (the same times drive the pictures)
for (const [id, t] of Object.entries(VO)) ev(t, 'vo', { id });
for (const s of S) if (STEP[s.kind]) ev(s.t0 + .2, 'pop', { v: .8 });
for (const k of ['s1', 's2', 's3', 's4', 's5']) for (const r of SC[k].rows) { ev(r.t, 'click', { v: .5, pitch: 1.5 }); if (r.ans) ev(r.t + .2, 'ding', { v: .7 }); if (r.check) ev(r.check, 'ding', { v: 1 }); }
const c0 = SC.cups; ev(c0.title, 'title'); ev(c0.q, 'pop'); ev(c0.a25, 'pop'); ev(c0.b20, 'pop'); ev(c0.win, 'ding', { v: 1.2 });
EV.push({ t: 0, type: 'cues', DUR, SEC: S.map(s => ({ kind: s.kind, t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3) })),
  SIL: [[VE('b03') + .1, VO.b04 - .05], [VE('b38') + .05, c0.win]], win: c0.win, title: c0.title, sumRows: [atC('b33', '比例'), atC('b34', '百分比'), atC('b35', '部分')] });
EV.sort((a, b) => a.t - b.t);
window.SRT = SUBS.map(s => ({ t0: s.t0, t1: s.t1, text: s.text }));
window.render = render; window.DUR = DUR; window.EV = EV;
render(10);
window.READY = true;
