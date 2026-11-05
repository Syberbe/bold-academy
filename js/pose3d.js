/* BOLD Academy: 3D-houdingen per oefening (gewrichtsposities in cm-achtige eenheden, y = hoogte) */
(function () {
  const L = { UA: 28, FA: 26, TH: 36, SH: 35, T: 50, NECK: 12, HEADR: 9.5, FOOT: 11, SW: 15, HW: 8.5, RING: 20 };
  const RAD = Math.PI / 180;
  const v3 = (x, y, z) => ({ x, y, z });
  const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
  const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
  const mul = (a, k) => v3(a.x * k, a.y * k, a.z * k);
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const cross = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  const len = a => Math.hypot(a.x, a.y, a.z);
  const norm = a => { const l = len(a) || 1; return mul(a, 1 / l); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerpV = (a, b, t) => add(a, mul(sub(b, a), t));
  const perp = (dir, ref) => { const n = sub(ref, mul(dir, dot(ref, dir))); return len(n) < 1e-6 ? v3(0, 1, 0) : norm(n); };
  const Z = v3(0, 0, 1), UP = v3(0, 1, 0);

  function ik3(root, target, l1, l2, hint) {
    const d = sub(target, root), D0 = len(d) || 1e-6, u = mul(d, 1 / D0);
    const D = clamp(D0, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
    const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    let n = sub(hint, mul(u, dot(hint, u)));
    n = len(n) < 1e-6 ? v3(0, 1, 0) : norm(n);
    return { joint: add(add(root, mul(u, a)), mul(n, h)), end: add(root, mul(u, D)) };
  }

  /* ---------- Inverted rows (eigen 3D-houding): p = 0 opgetrokken, p = 1 armen gestrekt ---------- */
  function makeRows(ringZ, elbowOut) {
    const ANK = v3(112, 4, 0), HAND = v3(18, 70, 0);
    return function rows(p, bad) {
      const a = bad ? lerp(22, 10, p) : lerp(32, 10, p);
      const dv = v3(-Math.cos(a * RAD), Math.sin(a * RAD), 0);
      let hip = add(ANK, mul(dv, L.TH + L.SH));
      const sh = add(ANK, mul(dv, L.TH + L.SH + L.T));
      if (bad) hip = add(hip, v3(-2, -11, 0));
      const u = norm(sub(sh, hip));
      const front = norm(cross(u, Z));
      const head = add(sh, mul(u, L.NECK + L.HEADR * 0.55));
      const footDir = v3(Math.sin(a * RAD), Math.cos(a * RAD), 0);
      const side = {};
      [-1, 1].forEach(s => {
        const S = add(sh, v3(0, 0, s * L.SW)), Hp = add(hip, v3(0, 0, s * L.HW));
        const arm = ik3(S, add(HAND, v3(0, 0, s * ringZ)), L.UA, L.FA, v3(0.25, -1, s * elbowOut));
        const leg = ik3(Hp, add(ANK, v3(0, 0, s * 9)), L.TH, L.SH, v3(0, 1, 0));
        side[s] = { sh: S, elbow: arm.joint, hand: arm.end, hip: Hp, knee: leg.joint, ankle: leg.end, toe: add(leg.end, mul(footDir, L.FOOT)), footDir };
      });
      return { sh, hip, u, front, head, side, bad, rings: { [-1]: side[-1].hand, 1: side[1].hand } };
    };
  }

  /* ---------- Andere oefeningen: de 2D-beweging (zijaanzicht) wordt naar 3D getild ----------
     2D: x naar rechts, y naar beneden, vloer op F2. 3D: y omhoog, vloer op 0, z = zijwaarts.
     Index 0 in de 2D-houding is de verre kant (z < 0), index 1 de dichte kant (z > 0). */
  const F2 = 178;
  const pick2 = (v, i) => (Array.isArray(v) && Array.isArray(v[0]) ? v[i] : v);
  const pickN = (v, i) => (Array.isArray(v) ? v[i] : v);
  const val = (v, p, s) => (typeof v === 'function' ? v(p, s) : v);
  /* kant waarnaar het middelste gewricht buigt, zoals de 2D-IK het kiest */
  function bend2(root, target, hint) {
    let dx = target[0] - root[0], dy = target[1] - root[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const n = [-dy, dx], s = n[0] * hint[0] + n[1] * hint[1] >= 0 ? 1 : -1;
    return v3(n[0] * s, -n[1] * s, 0);
  }

  function lift(key, o) {
    const P2 = () => window.Eng2D && window.Eng2D.POSES[key];
    let X0 = 0;
    function fn(p, bad, ctx) {
      const q = P2()(p, ctx || { cycle: 0 });
      const to3 = (pt, z) => v3(pt[0] - X0, F2 - pt[1], z || 0);
      const hip = to3(q.hip), sh = to3(q.sh);
      const u = norm(sub(sh, hip));
      const front = norm(cross(u, Z));
      const tA = Math.atan2(u.y, u.x), ha = tA + (q.headOff || 0) * RAD;
      const headU = v3(Math.cos(ha), Math.sin(ha), 0), headF = norm(cross(headU, Z));
      const root2 = q.armRoot || q.sh, root = to3(root2);
      const head = add(root, mul(headU, L.NECK + L.HEADR * 0.55));
      const side = {};
      [-1, 1].forEach(s => {
        const i = s < 0 ? 0 : 1;
        const S = add(root, v3(0, 0, s * L.SW)), Hp = add(hip, v3(0, 0, s * L.HW));
        const h2 = q.hands[i], f2 = q.feet[i];
        let handT = to3(h2, s * val(o.handZ, p, s));
        if (o.handLift) handT = add(handT, v3(0, val(o.handLift, p, s), 0));
        const eh = add(bend2(root2, h2, pick2(q.elbowHint, i)), v3(0, 0, s * val(o.elbowOut == null ? 0.35 : o.elbowOut, p, s)));
        const arm = ik3(S, handT, L.UA, L.FA, eh);
        const footT = to3(f2, s * val(o.footZ == null ? 9 : o.footZ, p, s));
        const kh = add(bend2(q.hip, f2, pick2(q.kneeHint, i)), v3(0, 0, s * val(o.kneeOut == null ? 0.12 : o.kneeOut, p, s)));
        const leg = ik3(Hp, footT, L.TH, L.SH, kh);
        const ta = pickN(q.toe, i) * RAD;
        const footDir = norm(v3(Math.cos(ta), Math.sin(ta), o.toeOut ? s * o.toeOut : 0));
        const j = { sh: S, elbow: arm.joint, hand: arm.end, hip: Hp, knee: leg.joint, ankle: leg.end, footDir };
        j.toe = add(leg.end, mul(footDir, L.FOOT));
        if (o.floorHands) {
          const hd = o.handDir ? o.handDir(p, s, q, ctx) : v3(1, 0, 0);
          j.handDir = norm(hd); j.palmN = UP;
        }
        side[s] = j;
      });
      const g = { sh, hip, u, front, head, headU, headF, side, bad: false };
      if (o.rings === 'hands') g.rings = { [-1]: side[-1].hand, 1: side[1].hand };
      if (o.rings === 'feet') g.rings = { [-1]: add(side[-1].ankle, v3(1, -4, 0)), 1: add(side[1].ankle, v3(1, -4, 0)) };
      if (q.note) g.note = q.note;
      return g;
    }
    /* centreren en camera passend maken over de hele beweging */
    function fit() {
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      const grow = (v, r) => { r = r || 0; minX = Math.min(minX, v.x - r); maxX = Math.max(maxX, v.x + r); minY = Math.min(minY, v.y - r); maxY = Math.max(maxY, v.y + r); };
      X0 = 0;
      for (let k = 0; k <= 16; k++) for (let c = 0; c < 2; c++) {
        const g = fn(k / 16, false, { cycle: c });
        grow(g.head, L.HEADR + 2); grow(g.hip, 12); grow(g.sh, 12);
        [-1, 1].forEach(s => { const j = g.side[s]; [j.elbow, j.hand, j.knee, j.ankle, j.toe].forEach(v => grow(v, 5)); });
        if (g.rings) [-1, 1].forEach(s => grow(g.rings[s], 9));
      }
      (o.props || []).forEach(b => { grow(v3(b.c[0] - b.s[0] / 2, b.c[1] + b.s[1] / 2, 0)); grow(v3(b.c[0] + b.s[0] / 2, 0, 0)); });
      X0 = (minX + maxX) / 2;
      const props = (o.props || []).map(b => ({ c: [b.c[0] - X0, b.c[1], b.c[2]], s: b.s, kind: b.kind }));
      const cy = Math.max((minY + maxY) / 2 + 3, 26), halfW = (maxX - minX) / 2 + 18, halfH = (maxY - Math.min(minY, 0)) / 2 + 24;
      const r = clamp(Math.max(halfH / Math.tan(16 * RAD), halfW / Math.tan(Math.atan(Math.tan(16 * RAD) * 4 / 3))) + 34, 190, 330);
      const g0 = fn(0, false, { cycle: 0 });
      const fs = Math.abs(g0.u.x) > 0.6 ? Math.sign(g0.head.x - g0.hip.x) || 1 : Math.sign(g0.front.x) || 1;
      const az = o.frontAz != null ? o.frontAz : fs * 90;
      return {
        target: [0, cy, 0],
        views: { side: [0, 6, r], front: [az, 16, r], angle: [o.angleAz != null ? o.angleAz : Math.sign(az) * 34, 22, r] },
        props
      };
    }
    return { fn, fit };
  }

  /* ---------- instellingen per oefening ---------- */
  const fwd = v3(1, 0, 0);
  const CONF = {
    wrist: { handZ: 14, footZ: 8, elbowOut: 0.1, floorHands: true, handDir: (p, s, q, ctx) => ((ctx && ctx.cycle) % 2 === 0 ? fwd : v3(-1, 0, 0)), hl: { forearms: true } },
    pikewalk: { handZ: 17, footZ: 8, elbowOut: 0.3, floorHands: true, hl: { hamstrings: true, calves: true, delts: true } },
    foetus: { handZ: 12, footZ: 7, elbowOut: 0.7, kneeOut: 0.25, hl: { abs: true } },
    scapula: { handZ: 17, elbowOut: 0.3, floorHands: true, hl: { upperBack: true, chest: true } },
    pikepush: { handZ: 19, elbowOut: 0.45, floorHands: true, hl: { delts: true, triceps: true } },
    deficit: { handZ: 21, elbowOut: 0.38, floorHands: true, handLift: 0.5, hl: { chest: true, triceps: true, delts: true },
      props: [{ kind: 'block', c: [214, 7, -21], s: [17, 14, 12] }, { kind: 'block', c: [214, 7, 21], s: [17, 14, 12] }] },
    bss: { handZ: 21, elbowOut: 0.25, footZ: (p, s) => (s < 0 ? 7 : 10), kneeOut: 0.1, hl: { quads: true, glutes: true },
      props: [{ kind: 'bench', c: [86, 13.5, -4], s: [76, 27, 34] }] },
    pistol: { handZ: 24, elbowOut: 0.35, footZ: (p, s) => (s < 0 ? 7 : 6), kneeOut: 0.2, rings: 'hands', hl: { quads: true, glutes: true } },
    ringpush: { handZ: 20, elbowOut: 0.35, rings: 'hands', hl: { chest: true, triceps: true, abs: true } },
    hamcurl: { handZ: 26, elbowOut: 0.2, floorHands: true, footZ: 10, rings: 'feet', hl: { hamstrings: true, glutes: true } },
    pelican: { handZ: 22, elbowOut: 0.3, rings: 'hands', hl: { biceps: true, delts: true } },
    diamond: { handZ: 4, elbowOut: 0.2, floorHands: true, handDir: (p, s) => v3(0.7, 0, -s * 0.7), hl: { triceps: true, chest: true } },
    chinup: { handZ: 17, elbowOut: 0.3, rings: 'hands', kneeOut: 0.1, hl: { lats: true, biceps: true } },
    sissy: { handZ: 17, elbowOut: 0.2, footZ: 12, kneeOut: 0.22, toeOut: 0.2, hl: { quads: true } },
    facepull: { handZ: p => lerp(24, 13, p), elbowOut: 1.4, rings: 'hands', hl: { delts: true, upperBack: true } },
    ringcurl: { handZ: 15, elbowOut: 0.05, rings: 'hands', hl: { biceps: true } },
    skull: { handZ: 9, elbowOut: 0.15, rings: 'hands', hl: { triceps: true } }
  };

  const POSES = {
    rows: {
      fn: makeRows(L.RING, 0.45),
      target: [46, 26, 0],
      views: { side: [0, 6, 255], front: [-90, 18, 230], angle: [-34, 22, 255] },
      equipment: { rings: true },
      hl: { lats: true, delts: true, upperArms: true, biceps: true }
    },
    rowswide: {
      fn: makeRows(32, 1.0),
      target: [46, 26, 0],
      views: { side: [0, 6, 255], front: [-90, 18, 230], angle: [-34, 22, 255] },
      equipment: { rings: true },
      hl: { upperBack: true, delts: true, lats: true }
    }
  };
  /* de 2D-module laadt eerst; pas bij het eerste gebruik wordt een oefening opgebouwd */
  const built = {};
  function get(k) {
    if (POSES[k]) return POSES[k];
    if (built[k]) return built[k];
    const o = CONF[k]; if (!o || !window.Eng2D || !window.Eng2D.POSES[k]) return null;
    const lf = lift(k, o), f = lf.fit();
    built[k] = { fn: lf.fn, target: f.target, views: f.views, props: f.props, equipment: { rings: !!o.rings }, hl: o.hl || {} };
    return built[k];
  }

  window.Pose3D = {
    L, has: k => !!(POSES[k] || CONF[k]), get,
    util: { v3, add, sub, mul, dot, cross, len, norm, lerp, lerpV, perp, clamp, RAD }
  };
})();
