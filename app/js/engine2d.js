/* 2D-terugval: lijnfiguren voor oefeningen zonder 3D */
(function () {
/* Stick-figure engine: forward/inverse kinematics + exercise definitions */
const F = 178, T = 50, UA = 28, FA = 26, TH = 36, SH = 35, NECK = 15, HEADR = 9, FOOT = 9, LEG = TH + SH;
const RAD = Math.PI / 180;
const dir = a => [Math.cos(a * RAD), -Math.sin(a * RAD)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const vlen = a => Math.hypot(a[0], a[1]);
const at = (o, ang, l) => add(o, mul(dir(ang), l));
const lerp = (a, b, t) => a + (b - a) * t;
const lp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const angOf = v => Math.atan2(-v[1], v[0]) / RAD;
const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

function ik(root, target, l1, l2, hint) {
  let d = sub(target, root), dist = vlen(d);
  if (dist < 1e-6) { d = [0, 1]; dist = 1e-6; }
  const u = mul(d, 1 / dist);
  const maxR = l1 + l2 - 0.01, minR = Math.abs(l1 - l2) + 0.01;
  const D = clamp(dist, minR, maxR);
  const end = add(root, mul(u, D));
  const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const P = add(root, mul(u, a));
  const n = [-u[1], u[0]];
  const s = n[0] * hint[0] + n[1] * hint[1];
  return { j: add(P, mul(n, s >= 0 ? h : -h)), e: end, over: dist - maxR };
}

function pick(v, i) { return Array.isArray(v) && Array.isArray(v[0]) ? v[i] : v; }
function pickN(v, i) { return Array.isArray(v) ? v[i] : v; }

function solve(ps) {
  const tA = angOf(sub(ps.sh, ps.hip));
  const head = at(ps.sh, tA + (ps.headOff || 0), NECK);
  const root = ps.armRoot || ps.sh;
  const arms = [0, 1].map(i => {
    const r = ik(root, ps.hands[i], UA, FA, pick(ps.elbowHint, i));
    const pts = [root, r.j, r.e];
    if (ps.palm !== undefined) pts.push(at(r.e, pickN(ps.palm, i), 7));
    return { pts, hand: r.e, over: r.over };
  });
  const legs = [0, 1].map(i => {
    const r = ik(ps.hip, ps.feet[i], TH, SH, pick(ps.kneeHint, i));
    return { pts: [ps.hip, r.j, r.e, at(r.e, pickN(ps.toe, i), FOOT)], over: r.over };
  });
  return { tA, head, arms, legs, hip: ps.hip, sh: ps.sh, root, spine: ps.spine || 0, note: ps.note || '' };
}

function solveAng(A, R, H, dist, lo, hi) {
  const f = a => vlen(sub(at(A, a, R), H)) - dist;
  let flo = f(lo);
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2, fm = f(m);
    if ((fm > 0) === (flo > 0)) { lo = m; flo = fm; } else hi = m;
  }
  return (lo + hi) / 2;
}
function pushup(p, o) {
  const R = LEG + T, Ay = F - 9;
  const angTop = Math.asin((Ay - o.topSh[1]) / R) / RAD;
  const A = [o.topSh[0] - R * Math.cos(angTop * RAD), Ay];
  const angBot = Math.asin((Ay - o.botY) / R) / RAD;
  const ang = lerp(angTop, angBot, p);
  return { hip: at(A, ang, LEG), sh: at(A, ang, R), headOff: -6, hands: [o.H, o.H], feet: [A, A],
    elbowHint: o.elbow || [-1, -1], kneeHint: [1, 0.4], toe: -75 };
}
function leanRings(p, o) {
  const A = o.A, R = LEG + T;
  const shT = at(A, o.top, R);
  const H = add(add(shT, mul(dir(o.top), o.up)), mul(dir(o.top - 90), o.fwd));
  const bot = solveAng(A, R, H, 53.4, o.top, o.top + 60);
  const ang = lerp(o.top, bot, p);
  return { hip: at(A, ang, LEG), sh: at(A, ang, R), headOff: 0, hands: [H, H], feet: [A, A],
    elbowHint: o.elbow, kneeHint: [1, 0], toe: 0 };
}

/* ---------- exercise poses (p = 0 top/start, p = 1 bottom/end of eccentric) ---------- */
const POSES = {
  wrist(p, c) {
    const k = [118, F - 3];
    const hip = at(k, lerp(104, 70, p), TH);
    const sh = at(hip, 16, T);
    const hand = [172, F - 1];
    const ank = [k[0] - SH, F - 4];
    const fwd = (c.cycle % 2) === 0;
    return { hip, sh, headOff: -14, hands: [hand, hand], feet: [ank, ank], elbowHint: [-1, 0], kneeHint: [1, 1],
      toe: 180, palm: fwd ? 0 : 180, note: fwd ? 'Vingers naar voren' : 'Vingers naar je knieën' };
  },
  pikewalk(p) {
    const H = [214, F - 1];
    const A0 = H[0] - 112, A1 = H[0] - 76;
    const step = (q, lead) => {
      const n = 4, s = q * n, k = Math.min(n - 1, Math.floor(s)), loc = s - k;
      const h = clamp(lead ? loc * 2 - 1 : loc * 2, 0, 1);
      return { x: (k + ease(h)) / n, lift: Math.sin(Math.PI * h) };
    };
    const fN = step(p, 0), fF = step(p, 1);
    const ankN = [lerp(A0, A1, fN.x), F - 9 - 5 * fN.lift];
    const ankF = [lerp(A0, A1, fF.x), F - 9 - 5 * fF.lift];
    const A = lp(ankN, ankF, 0.5);
    const D = lerp(58, 101, ease(p));
    const hip = ik(A, H, LEG, D, [0, -1]).j;
    const sh = ik(hip, H, T, 53.6, [0.3, -1]).j;
    return { hip, sh, headOff: 0, hands: [H, H], feet: [ankF, ankN], elbowHint: [-1, -0.2], kneeHint: [1, 0.4],
      toe: lerp(-75, -55, p) };
  },
  foetus(p) {
    const hip = [158, F - 9];
    const sh = at(hip, lerp(180, 146, p), T);
    const foot = lp([229, F - 6], [188, F - 38], p);
    const hand = lp([162, F - 6], [170, F - 47], p);
    return { hip, sh, headOff: lerp(0, -30, p), hands: [hand, hand], feet: [foot, foot], elbowHint: [0, -1],
      kneeHint: [-0.3, -1], toe: lerp(80, -15, p) };
  },
  scapula(p) {
    const H = [214, F - 1];
    const root = [H[0], F - 54];
    const A = [H[0] - 112, F - 9];
    const ang = angOf(sub(root, A));
    const hip = at(A, ang, LEG);
    const sh = add(root, [0, lerp(-3, 5, p)]);
    return { hip, sh, armRoot: root, spine: lerp(6, -4, p), headOff: -4, hands: [H, H], feet: [A, A],
      elbowHint: [-1, 0], kneeHint: [1, 0.4], toe: -75 };
  },
  pikepush(p) {
    const H = [214, F - 1], A = [H[0] - 62, F - 9];
    const top = at(H, 122, 53.4), bot = [H[0] - 6, F - 28];
    const sh = lp(top, bot, p);
    const hip = ik(A, sh, LEG - 0.5, T, [0, -1]).j;
    return { hip, sh, headOff: lerp(0, 30, p), hands: [H, H], feet: [A, A], elbowHint: [-0.7, -1], kneeHint: [1, 0.3],
      toe: -62 };
  },
  chinup(p) {
    const H = [150, F - 133];
    const sh = lp([141, F - 126], [147, F - 81], p);
    const hip = add(sh, [lerp(3, 1, p), 50]);
    const foot = [158, F - 6];
    return { hip, sh, headOff: lerp(14, 0, p), hands: [H, H], feet: [foot, foot], elbowHint: [1, 0.4],
      kneeHint: [1, -0.6], toe: lerp(-45, 0, p) };
  },
  deficit(p) {
    const H = [214, F - 15], A = [H[0] - 108, F - 9];
    const angTop = angOf(sub([H[0], F - 68], A));
    const angBot = Math.asin(11 / (LEG + T)) / RAD;
    const ang = lerp(angTop, angBot, p);
    return { hip: at(A, ang, LEG), sh: at(A, ang, LEG + T), headOff: -6, hands: [H, H], feet: [A, A],
      elbowHint: [-1, -1], kneeHint: [1, 0.4], toe: -75 };
  },
  rows(p) {
    const A = [244, F - 4];
    const H = [156, F - 68];
    const a = lerp(31, 10, p);
    return { hip: at(A, 180 - a, LEG), sh: at(A, 180 - a, LEG + T), headOff: 0, hands: [H, H], feet: [A, A],
      elbowHint: [0.3, 1], kneeHint: [0, -1], toe: 90 - a };
  },
  pelican(p) {
    const A = [96, F - 5];
    const ang = 90 - lerp(6, 35, p);
    const H = [A[0] + 16.6, F - 104];
    return { hip: at(A, ang, LEG), sh: at(A, ang, LEG + T), headOff: lerp(0, -8, p), hands: [H, H], feet: [A, A],
      elbowHint: [-1, 0.6], kneeHint: [1, 0], toe: lerp(0, -28, p) };
  },
  bss(p) {
    const fA = [196, F - 4], rA = [120, F - 31];
    const hip = lp([176, F - 73], [164, F - 48], p);
    const sh = at(hip, lerp(84, 74, p), T);
    const hand = add(sh, [6, 51]);
    return { hip, sh, headOff: lerp(0, 8, p), hands: [hand, hand], feet: [rA, fA], elbowHint: [-1, 0],
      kneeHint: [[0.3, 1], [1, -0.2]], toe: [200, 0] };
  },
  ringpush(p) {
    const H = [214, F - 16];
    return pushup(p, { H, topSh: [H[0] + 2, H[1] - 53], botY: F - 24, elbow: [-1, -0.8] });
  },
  diamond(p) {
    const H = [214, F - 1];
    return pushup(p, { H, topSh: [H[0] + 8, F - 53], botY: F - 15, elbow: [-1, -0.4] });
  },
  pistol(p) {
    const ank = [150, F - 4];
    const hip = lp([147, F - 74], [128, F - 30], p);
    const sh = at(hip, lerp(88, 62, p), T);
    const free = at(hip, lerp(-50, -5, p), LEG - 0.5);
    const H = [192, F - 98];
    return { hip, sh, headOff: lerp(0, 18, p), hands: [H, H], feet: [free, ank], elbowHint: [0, 1],
      kneeHint: [[1, -0.4], [1, -0.5]], toe: [lerp(40, 85, p), 0] };
  },
  rowswide(p) {
    const A = [244, F - 4], H = [152, F - 70];
    const a = lerp(31, 10, p);
    return { hip: at(A, 180 - a, LEG), sh: at(A, 180 - a, LEG + T), headOff: 0, hands: [H, H], feet: [A, A],
      elbowHint: [-0.6, 1], kneeHint: [0, -1], toe: 90 - a };
  },
  hamcurl(p) {
    const sh = [92, F - 8];
    const thBot = Math.asin(23 / (LEG + T)) / RAD;
    const th = lerp(40, thBot, p);
    const hip = at(sh, th, T);
    const ankle = lp([174, F - 31], [sh[0] + (LEG + T) * Math.cos(thBot * RAD), F - 31], p);
    const hand = [sh[0] + 50, F - 4];
    return { hip, sh, headOff: 1 - th, hands: [hand, hand], feet: [ankle, ankle], elbowHint: [0, -1],
      kneeHint: [0, -1], toe: 80 };
  },
  sissy(p) {
    const A = [122, F - 10];
    const knee = at(A, lerp(88, 28, p), SH);
    const beta = lerp(90, 124, p);
    const hip = at(knee, beta, TH), sh = at(hip, beta, T);
    const hd = at(sh, beta - 94, 52);
    return { hip, sh, headOff: lerp(0, -14, p), hands: [hd, hd], feet: [A, A], elbowHint: [0, 1],
      kneeHint: [1, -0.3], toe: -50 };
  },
  facepull(p) {
    return leanRings(p, { A: [200, F - 4], top: 115, up: 22, fwd: 12, elbow: [-1, -0.2] });
  },
  ringcurl(p) {
    return leanRings(p, { A: [200, F - 4], top: 112, up: 18, fwd: 22, elbow: [1, 0.3] });
  },
  skull(p) {
    const A = [78, F - 9], R = LEG + T, aBot = 30;
    const shB = at(A, aBot, R);
    const H = add(add(shB, mul(dir(aBot), 22)), mul(dir(aBot + 90), 11));
    const aTop = solveAng(A, R, H, 53.4, aBot, 85);
    const ang = lerp(aTop, aBot, p);
    return { hip: at(A, ang, LEG), sh: at(A, ang, R), headOff: 0, hands: [H, H], feet: [A, A],
      elbowHint: [1, 0.6], kneeHint: [1, 0.4], toe: -60 };
  }
};

/* static props per exercise (drawn behind the figure) */
const PROPS = {
  deficit: [{ t: 'rect', x: 206, y: F - 14, w: 16, h: 14 }],
  bss: [{ t: 'rect', x: 48, y: F - 27, w: 76, h: 27 }],
};
const RINGS = { chinup: true, rows: true, pelican: true, ringpush: true, pistol: true, rowswide: true,
  facepull: true, ringcurl: true, skull: true, hamcurl: { feet: true, anchor: 192 } };

/* ---------- SVG rendering ---------- */
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const fmt = pts => pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');

function fitBox(key, ex) {
  let minX = 1e9, maxX = -1e9, minY = 1e9;
  const grow = (x, y, r) => { r = r || 0; minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r); minY = Math.min(minY, y - r); };
  for (let i = 0; i <= 20; i++) {
    for (let c = 0; c < 2; c++) {
      const g = solve(POSES[key](i / 20, { cycle: c }));
      g.arms.concat(g.legs).forEach(l => l.pts.forEach(q => grow(q[0], q[1], 4)));
      grow(g.head[0], g.head[1], HEADR + 2);
      if (RINGS[key] === true) g.arms.forEach(a => grow(a.hand[0], a.hand[1], 10));
      if (RINGS[key] && RINGS[key].feet) g.legs.forEach(l => grow(l.pts[2][0], l.pts[2][1] + 5, 10));
    }
  }
  (PROPS[key] || []).forEach(pr => { grow(pr.x, pr.y); grow(pr.x + pr.w, pr.y); });
  const pad = 16, padTop = 34, bottom = F + 16;
  const needH = bottom - (minY - padTop), needW = (maxX - minX) + 2 * pad;
  const h = Math.max(needH, needW / 1.5, 132), w = h * 1.5;
  const cx = (minX + maxX) / 2;
  return { x: cx - w / 2, y: bottom - h, w, h };
}

function createFigure(svg, key, hl) {
  hl = hl || [];
  const vb = fitBox(key);
  svg.setAttribute('viewBox', [vb.x, vb.y, vb.w, vb.h].map(v => v.toFixed(1)).join(' '));
  el('rect', { x: vb.x - 2, y: F, width: vb.w + 4, height: vb.h, class: 'ground' }, svg);
  el('line', { x1: vb.x - 2, y1: F, x2: vb.x + vb.w + 2, y2: F, class: 'floor' }, svg);
  (PROPS[key] || []).forEach(pr => el('rect', { x: pr.x, y: pr.y, width: pr.w, height: pr.h, rx: 3, class: 'prop' }, svg));
  const rings = RINGS[key];
  let straps = [], ringEls = [];
  if (rings) straps = [el('line', { class: 'strap far' }, svg), el('line', { class: 'strap' }, svg)];
  const on = (part, far) => hl.includes(part) || hl.includes(part + (far ? 'F' : 'N'));
  const cls = (part, far) => 'limb' + (far ? ' far' : '') + (on(part, far) ? ' hl' : '');
  const armF = el('polyline', { class: cls('arms', true) }, svg);
  const legF = el('polyline', { class: cls('legs', true) }, svg);
  const torso = el('path', { class: 'torso' + (hl.includes('torso') ? ' hl' : '') }, svg);
  const girdle = el('line', { class: 'limb girdle' }, svg);
  const head = el('circle', { r: HEADR, class: 'head' }, svg);
  const legN = el('polyline', { class: cls('legs', false) }, svg);
  const armN = el('polyline', { class: cls('arms', false) }, svg);
  if (rings) ringEls = [el('circle', { r: 7, class: 'ring far' }, svg), el('circle', { r: 7, class: 'ring' }, svg)];

  return function draw(p, ctx) {
    const g = solve(POSES[key](p, ctx || { cycle: 0 }));
    armF.setAttribute('points', fmt(g.arms[0].pts));
    armN.setAttribute('points', fmt(g.arms[1].pts));
    legF.setAttribute('points', fmt(g.legs[0].pts));
    legN.setAttribute('points', fmt(g.legs[1].pts));
    const mid = lp(g.hip, g.sh, 0.5), perp = dir(g.tA + 90);
    const c = add(mid, mul(perp, g.spine * 2));
    torso.setAttribute('d', 'M' + g.hip[0].toFixed(1) + ',' + g.hip[1].toFixed(1) + ' Q' + c[0].toFixed(1) + ',' + c[1].toFixed(1) + ' ' + g.sh[0].toFixed(1) + ',' + g.sh[1].toFixed(1));
    girdle.setAttribute('x1', g.sh[0].toFixed(1)); girdle.setAttribute('y1', g.sh[1].toFixed(1));
    girdle.setAttribute('x2', g.root[0].toFixed(1)); girdle.setAttribute('y2', g.root[1].toFixed(1));
    head.setAttribute('cx', g.head[0].toFixed(1)); head.setAttribute('cy', g.head[1].toFixed(1));
    if (rings) {
      [0, 1].forEach(i => {
        const dx = i === 0 ? -3 : 0, dy = i === 0 ? -2 : 0;
        let cx, cy, ax;
        if (rings.feet) { const a = g.legs[i].pts[2]; cx = a[0] + 1 + dx; cy = a[1] + 5 + dy; ax = rings.anchor + dx; }
        else { const h = g.arms[i].hand; cx = h[0] + dx; cy = h[1] + dy; ax = cx; }
        ringEls[i].setAttribute('cx', cx.toFixed(1)); ringEls[i].setAttribute('cy', cy.toFixed(1));
        const top = [ax, vb.y - 2], v = sub([cx, cy], top), u = mul(v, 1 / vlen(v));
        straps[i].setAttribute('x1', ax.toFixed(1)); straps[i].setAttribute('y1', (vb.y - 2).toFixed(1));
        straps[i].setAttribute('x2', (cx - u[0] * 7).toFixed(1)); straps[i].setAttribute('y2', (cy - u[1] * 7).toFixed(1));
      });
    }
    return g;
  };
}

window.Eng2D = { createFigure, POSES };
})();
