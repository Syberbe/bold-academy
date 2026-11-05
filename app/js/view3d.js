/* BOLD Academy: 3D-weergave (paspop, ringen, camera) op basis van three.js */
(function () {
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function isDark() { return cssVar('--scheme') === 'dark'; }

  function createViewer(canvas, stage) {
    if (!window.THREE) return null;
    const T3 = THREE, U = Pose3D.util, L = Pose3D.L;
    let renderer;
    try { renderer = new T3.WebGLRenderer({ canvas, antialias: true, alpha: false }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFSoftShadowMap;
    const scene = new T3.Scene();
    const camera = new T3.PerspectiveCamera(32, 4 / 3, 5, 3000);
    scene.add(new T3.HemisphereLight(0xffffff, 0x7d838a, 0.55));
    const sun = new T3.DirectionalLight(0xffffff, 0.72);
    sun.position.set(-80, 260, 160); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
    Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 10, far: 700 });
    sun.target.position.set(60, 0, 0); scene.add(sun, sun.target);
    const floor = new T3.Mesh(new T3.PlaneGeometry(900, 900), new T3.MeshStandardMaterial({ roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    const M = {
      body: new T3.MeshStandardMaterial({ roughness: .62, metalness: 0 }),
      hl: new T3.MeshStandardMaterial({ roughness: .5, metalness: 0 }),
      bad: new T3.MeshStandardMaterial({ roughness: .6, metalness: 0 }),
      ring: new T3.MeshStandardMaterial({ color: 0x8b5a2b, roughness: .45 }),
      strap: new T3.MeshStandardMaterial({ color: 0x23272b, roughness: .8 })
    };
    function applyTheme() {
      const dark = isDark();
      scene.background = new T3.Color(cssVar('--stage') || '#f4f5f6');
      floor.material.color.set(cssVar('--ground') || '#e4e7ea').multiplyScalar(dark ? 0.9 : 0.8);
      M.body.color.set(dark ? 0xa3abb3 : 0xbcc3ca);
      M.hl.color.set(cssVar('--accent') || '#f2b300');
      M.bad.color.set(cssVar('--bad') || '#d9472b');
    }
    applyTheme();

    const SPH = new T3.SphereGeometry(1, 28, 20);
    const Y = new T3.Vector3(0, 1, 0);
    const tv = v => new T3.Vector3(v.x, v.y, v.z);
    function mesh(geo, m) { const o = new T3.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true; scene.add(o); return o; }
    function limb(r1, r2, m) {
      const cyl = mesh(new T3.CylinderGeometry(r2, r1, 1, 22, 1, true), m);
      const a = mesh(SPH, m), b = mesh(SPH, m);
      a.scale.setScalar(r1); b.scale.setScalar(r2);
      return {
        mats(mm) { cyl.material = mm; a.material = mm; b.material = mm; },
        set(p1, p2) {
          const A1 = tv(p1), B1 = tv(p2), d = B1.clone().sub(A1), l = d.length();
          cyl.position.copy(A1).addScaledVector(d, .5); cyl.scale.set(1, l, 1);
          cyl.quaternion.setFromUnitVectors(Y, d.normalize());
          a.position.copy(A1); b.position.copy(B1);
        }
      };
    }
    function blob(rx, ry, rz, m) {
      const o = mesh(SPH, m); o.scale.set(rx, ry, rz);
      return {
        o, set(c, axisY, axisZ) {
          o.position.copy(tv(c));
          const yv = tv(axisY).normalize(); const zv = tv(axisZ); zv.addScaledVector(yv, -zv.dot(yv)).normalize();
          const xv = new T3.Vector3().crossVectors(yv, zv).normalize();
          o.quaternion.setFromRotationMatrix(new T3.Matrix4().makeBasis(xv, yv, zv));
        }
      };
    }
    const Z = U.v3(0, 0, 1);
    const body = {
      pelvis: blob(11, 10, 15.5, M.body), abdo: blob(9.5, 13, 13.5, M.body), chest: blob(11.5, 13.5, 17, M.body),
      latL: blob(3.6, 12.5, 6, M.hl), latR: blob(3.6, 12.5, 6, M.hl),
      gluteL: blob(7, 7.5, 6.5, M.body), gluteR: blob(7, 7.5, 6.5, M.body),
      neck: limb(4.6, 4.2, M.body), head: blob(8.8, 10.2, 8.6, M.body), nose: blob(1.4, 2.2, 1.6, M.body),
      arms: {}, legs: {}
    };
    [-1, 1].forEach(s => {
      body.arms[s] = { delt: blob(5.6, 6, 5.6, M.hl), ua: limb(5, 4.1, M.hl), bic: blob(3.6, 7.5, 3.8, M.hl), fa: limb(4.1, 3, M.body), hand: blob(3.2, 4.4, 2.3, M.body) };
      body.legs[s] = { th: limb(7.4, 5.2, M.body), quad: blob(4.6, 13, 5.2, M.body), sh: limb(4.8, 3.2, M.body), calf: blob(3.6, 8.5, 3.8, M.body), foot: blob(3.2, 6.2, 2.4, M.body) };
    });
    const rings = {}, straps = {};
    [-1, 1].forEach(s => {
      rings[s] = mesh(new T3.TorusGeometry(7, 1.25, 14, 40), M.ring);
      straps[s] = mesh(new T3.BoxGeometry(2.6, 1, 0.5), M.strap); straps[s].castShadow = false;
    });

    let meta = null;
    function setHighlights(hl) {
      const pick = on => (on ? M.hl : M.body);
      body.latL.o.material = pick(hl.lats); body.latR.o.material = pick(hl.lats);
      [-1, 1].forEach(s => {
        body.arms[s].delt.o.material = pick(hl.delts);
        body.arms[s].ua.mats(pick(hl.upperArms));
        body.arms[s].bic.o.material = pick(hl.biceps);
      });
    }

    function draw(g) {
      const u = g.u, f = g.front, hip = g.hip, T = U.len(U.sub(g.sh, hip));
      const at = (t, fr, side) => U.add(U.add(U.add(hip, U.mul(u, T * t)), U.mul(f, fr || 0)), U.v3(0, 0, side || 0));
      const badM = g.bad ? M.bad : M.body;
      body.pelvis.o.material = badM; body.gluteL.o.material = badM; body.gluteR.o.material = badM;
      body.pelvis.set(at(0.08, 0), u, Z); body.abdo.set(at(0.38, 0.5), u, Z); body.chest.set(at(0.72, 0.5), u, Z);
      body.latL.set(at(0.62, -7, -10), u, Z); body.latR.set(at(0.62, -7, 10), u, Z);
      body.gluteL.set(at(0.04, -6, -6.5), u, Z); body.gluteR.set(at(0.04, -6, 6.5), u, Z);
      body.neck.set(g.sh, U.add(g.sh, U.mul(u, L.NECK)));
      body.head.set(g.head, u, Z); body.nose.set(U.add(g.head, U.mul(f, 8.4)), u, Z);
      [-1, 1].forEach(s => {
        const j = g.side[s], a = body.arms[s], lg = body.legs[s];
        const uaDir = U.norm(U.sub(j.elbow, j.sh));
        a.delt.set(U.add(j.sh, U.mul(uaDir, 1.5)), uaDir, Z);
        a.ua.set(j.sh, j.elbow); a.fa.set(j.elbow, j.hand);
        a.bic.set(U.add(U.lerpV(j.sh, j.elbow, .55), U.mul(U.perp(uaDir, f), 2.2)), uaDir, Z);
        a.hand.set(j.hand, U.norm(U.sub(j.hand, j.elbow)), Z);
        const thDir = U.norm(U.sub(j.knee, j.hip)), shDir = U.norm(U.sub(j.ankle, j.knee));
        lg.th.set(j.hip, j.knee); lg.quad.set(U.add(U.lerpV(j.hip, j.knee, .45), U.mul(U.perp(thDir, f), 1.8)), thDir, Z);
        lg.sh.set(j.knee, j.ankle); lg.calf.set(U.add(U.lerpV(j.knee, j.ankle, .33), U.mul(U.perp(shDir, f), -2.2)), shDir, Z);
        lg.foot.set(U.add(j.ankle, U.mul(j.footDir, 4.5)), j.footDir, Z);
        const showRings = !!(meta && meta.equipment.rings && g.rings);
        rings[s].visible = showRings; straps[s].visible = showRings;
        if (showRings) {
          const hp = tv(g.rings[s]); rings[s].position.copy(hp);
          const top = 280, bottom = hp.y + 7;
          straps[s].position.set(hp.x, (top + bottom) / 2, hp.z); straps[s].scale.set(1, top - bottom, 1);
        }
      });
      renderer.render(scene, camera);
    }

    const target = new T3.Vector3(46, 26, 0);
    let VIEWS = { side: [0, 6, 255], front: [-90, 18, 230], angle: [-34, 22, 255] };
    const cam = { az: -34, el: 22, r: 255 };
    let tween = null, onViewChange = null;
    function placeCam() {
      const a = cam.az * U.RAD, e = cam.el * U.RAD;
      camera.position.set(target.x + cam.r * Math.cos(e) * Math.sin(a), target.y + cam.r * Math.sin(e), target.z + cam.r * Math.cos(e) * Math.cos(a));
      camera.lookAt(target);
    }
    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    resize(); placeCam();

    function setView(name, instant) {
      const v = VIEWS[name]; if (!v) return;
      const daz = ((v[0] - cam.az) % 360 + 540) % 360 - 180;
      if (instant) { cam.az = v[0]; cam.el = v[1]; cam.r = v[2]; tween = null; placeCam(); }
      else tween = { from: { az: cam.az, el: cam.el, r: cam.r }, to: { az: cam.az + daz, el: v[1], r: v[2] }, t: 0 };
      if (onViewChange) onViewChange(name);
    }
    let drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, az: cam.az, el: cam.el, type: e.pointerType }; tween = null; if (onViewChange) onViewChange(null); });
    window.addEventListener('pointermove', e => {
      if (!drag) return;
      cam.az = drag.az - (e.clientX - drag.x) * 0.45;
      if (drag.type === 'mouse') cam.el = U.clamp(drag.el + (e.clientY - drag.y) * 0.3, 2, 70);
      placeCam();
    });
    const end = () => { drag = null; };
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);

    return {
      setExercise(key) {
        meta = Pose3D.get(key);
        target.set(meta.target[0], meta.target[1], meta.target[2]);
        VIEWS = meta.views; setHighlights(meta.hl); setView('angle', true);
      },
      draw, resize, setView, applyTheme,
      onView(fn) { onViewChange = fn; },
      tick(dt) {
        if (!tween) return;
        tween.t = Math.min(1, tween.t + dt / 0.6);
        const k = 0.5 - 0.5 * Math.cos(Math.PI * tween.t);
        cam.az = U.lerp(tween.from.az, tween.to.az, k); cam.el = U.lerp(tween.from.el, tween.to.el, k); cam.r = U.lerp(tween.from.r, tween.to.r, k);
        placeCam(); if (tween.t >= 1) tween = null;
      }
    };
  }

  window.View3D = { createViewer };
})();
