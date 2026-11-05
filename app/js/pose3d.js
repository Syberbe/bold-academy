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

  function ik3(root, target, l1, l2, hint) {
    const d = sub(target, root), D0 = len(d) || 1e-6, u = mul(d, 1 / D0);
    const D = clamp(D0, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
    const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    let n = sub(hint, mul(u, dot(hint, u)));
    n = len(n) < 1e-6 ? v3(0, 1, 0) : norm(n);
    return { joint: add(add(root, mul(u, a)), mul(n, h)), end: add(root, mul(u, D)) };
  }

  /* Inverted rows: p = 0 bovenaan (opgetrokken), p = 1 onderaan (armen gestrekt) */
  const ANK = v3(112, 4, 0), HAND = v3(18, 70, 0);
  function rows(p, bad) {
    const a = bad ? lerp(22, 10, p) : lerp(32, 10, p);
    const dv = v3(-Math.cos(a * RAD), Math.sin(a * RAD), 0);
    let hip = add(ANK, mul(dv, L.TH + L.SH));
    const sh = add(ANK, mul(dv, L.TH + L.SH + L.T));
    if (bad) hip = add(hip, v3(-2, -11, 0));
    const u = norm(sub(sh, hip));
    const front = norm(cross(u, v3(0, 0, 1)));
    const head = add(sh, mul(u, L.NECK + L.HEADR * 0.55));
    const footDir = v3(Math.sin(a * RAD), Math.cos(a * RAD), 0);
    const side = {};
    [-1, 1].forEach(s => {
      const S = add(sh, v3(0, 0, s * L.SW)), Hp = add(hip, v3(0, 0, s * L.HW));
      const arm = ik3(S, add(HAND, v3(0, 0, s * L.RING)), L.UA, L.FA, v3(0.25, -1, s * 0.45));
      const leg = ik3(Hp, add(ANK, v3(0, 0, s * 9)), L.TH, L.SH, v3(0, 1, 0));
      side[s] = { sh: S, elbow: arm.joint, hand: arm.end, hip: Hp, knee: leg.joint, ankle: leg.end, toe: add(leg.end, mul(footDir, L.FOOT)), footDir };
    });
    return { sh, hip, u, front, head, side, bad, rings: { [-1]: side[-1].hand, 1: side[1].hand } };
  }

  const POSES = {
    rows: {
      fn: rows,
      target: [46, 26, 0],
      views: { side: [0, 6, 255], front: [-90, 18, 230], angle: [-34, 22, 255] },
      equipment: { rings: true },
      hl: { lats: true, delts: true, upperArms: true, biceps: true }
    }
  };

  window.Pose3D = {
    L, has: k => !!POSES[k], get: k => POSES[k],
    util: { v3, add, sub, mul, dot, cross, len, norm, lerp, lerpV, perp, clamp, RAD }
  };
})();
