/* LuxScale API layer.
   ALL real network calls are commented out. Every function returns local dummy results.
   To go live: uncomment the fetch blocks and delete the LOCAL.* return lines.
   Result shape used by the UI (both /automate and the studio option runs):
   { application, target, solutions:[SolutionDto (+ mock `patches`)], closestMiss, floorMeta:{border,...} } */
const API = {
  ENGINE: 'http://127.0.0.1:8000',        // TODO: production engine host
  ADMIN:  'http://localhost:8001/api/v1', // TODO: production admin host
  SIM_MS: 30000,                          // dummy loading duration; in production the UI follows real progress from the server log

  async categories() {
    // const r = await fetch(`${this.ADMIN}/standards/categories`); return (await r.json()).data;
    return [{ id: 'office', name: 'Offices' }, { id: 'industry', name: 'Industrial' }, { id: 'edu', name: 'Education' }];
  },
  async standards(cat) {
    // const r = await fetch(`${this.ADMIN}/standards/?category_table_number=${cat}`); return (await r.json()).data;
    return [{ id: 'en12464_1_v2019_6_2_3', name: 'Writing, reading, data processing — 500 lx' },
            { id: 'en12464_1_v2019_5_1_1', name: 'General circulation — 100 lx' }];
  },
  async variantMap() {   // id -> {id,name,manufacturer,power,efficacy,lumens,cri,ip,mm:[L,W,D],kind,image}
    // page GET `${this.ADMIN}/fixtures/variants/?limit=1000`, cache by id; image = `${this.ADMIN}/assets/${images[0].image_file_id}`
    return LOCAL.VARS;
  },
  async variants() { return Object.values(LOCAL.VARS); },
  async automate(body) {   // Auto Study + CAD Study
    // const r = await fetch(`${this.ENGINE}/automate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    // if (!r.ok) throw await r.json(); return await r.json();      // timeout >= 180 s, never auto-retry
    await LOCAL.tick(); return LOCAL.automate(body);
  },
  async calculate(body) {  // one layout, one variant (live edit loop)
    // POST `${this.ENGINE}/calculate` with includeWallCeilingMatrices:false, then map CalculateResponse -> {solutions:[…]}
    await LOCAL.tick(20); return LOCAL.calculate(body);
  },
  async calculateOptions(body) {   // Study Studio: same layout compared across catalog variants
    // real: one POST /calculate per variant (API v2 §4.6 — /calculate does not compare variants); map each response to a solution
    await LOCAL.tick(); return LOCAL.calculateOptions(body);
  },
  async parseCad(file) {   // DWG/DXF import is a front-end feature that outputs polygons (API v2 §11)
    await LOCAL.tick(600); return LOCAL.cad(file);
  }
};

/* Inward parallel offset of a simple polygon (the EN 12464 calculation workplane = room inset by floorZone).
   Real API patches already respect it; the client uses the same shape to clip/draw the smooth heatmap. */
function insetPoly(P, d) {
  const n = P.length; if (n < 3 || !(d > 0)) return P;
  const ar = Q => Q.reduce((a, p, i) => { const q = Q[(i + 1) % Q.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2, A = ar(P), s = A >= 0 ? 1 : -1;
  const cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const X = Q => { const m = Q.length; for (let i = 0; i < m; i++) for (let j = i + 2; j < m; j++) { if (i === 0 && j === m - 1) continue; const a = Q[i], b = Q[(i + 1) % m], c = Q[j], e = Q[(j + 1) % m]; if (cr(a, b, c) * cr(a, b, e) < 0 && cr(c, e, a) * cr(c, e, b) < 0) return true; } return false; };
  for (let t = 0; t < 7; t++, d /= 2) {
    const L = P.map((p, i) => { const q = P[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; return { ux, uy, px: p[0] - s * uy * d, py: p[1] + s * ux * d }; });
    const R = P.map((_, i) => { const a = L[(i + n - 1) % n], b = L[i], c = a.ux * b.uy - a.uy * b.ux; if (Math.abs(c) < 1e-9) return [b.px, b.py]; const k = ((b.px - a.px) * b.uy - (b.py - a.py) * b.ux) / c; return [a.px + k * a.ux, a.py + k * a.uy]; });
    const B = ar(R); if (B * s > 0 && B * s < Math.abs(A) && !X(R) && R.every((p, i) => { const q = R[(i + 1) % n]; return (q[0] - p[0]) * L[i].ux + (q[1] - p[1]) * L[i].uy > 1e-6; })) return R;
  }
  return P;
}

/* ---- local dummy physics (direct light only, Lambertian point sources) ---- */
const svgImg = (kind) => {   // stand-in fixture pictures (real: catalog images from the Admin API)
  const f = { panel: '<rect x="70" y="52" width="140" height="140" rx="6" fill="url(#g)" stroke="#888" stroke-width="3"/><path d="M70 122h140M140 52v140" stroke="#bbb" stroke-width="1.5"/>',
    down: '<ellipse cx="140" cy="122" rx="78" ry="78" fill="#2a2a2a" stroke="#888" stroke-width="3"/><circle cx="140" cy="122" r="52" fill="url(#g)"/><circle cx="140" cy="122" r="52" fill="none" stroke="#eb1b26" stroke-width="2"/>',
    highbay: '<path d="M140 8v52M132 24h16M132 40h16" stroke="#888" stroke-width="3"/><path d="M50 172c0-70 40-112 90-112s90 42 90 112z" fill="#2a2a2a" stroke="#888" stroke-width="3"/><rect x="72" y="172" width="136" height="14" rx="4" fill="url(#g)"/><path d="M84 122c20-26 92-26 112 0" stroke="#eb1b26" stroke-width="2" fill="none"/>',
    linear: '<rect x="24" y="100" width="232" height="44" rx="8" fill="#2a2a2a" stroke="#888" stroke-width="3"/><rect x="34" y="112" width="212" height="20" rx="4" fill="url(#g)"/><path d="M60 100V60M220 100V60" stroke="#888" stroke-width="3"/>' }[kind];
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 200"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffd9db"/></radialGradient></defs>${f}</svg>`);
};
const LOCAL = {
  VARS: (() => { const V = [
    { id: 'v-1', name: 'Panel 600×600 40W', manufacturer: 'LuxLine', kind: 'panel', power: 40, efficacy: 100, cri: 80, ip: 'IP20', mm: [595, 595, 10] },
    { id: 'v-2', name: 'Downlight 20W', manufacturer: 'Aurora', kind: 'down', power: 20, efficacy: 105, cri: 90, ip: 'IP44', mm: [170, 170, 70] },
    { id: 'v-3', name: 'High-bay 150W', manufacturer: 'Titan', kind: 'highbay', power: 150, efficacy: 140, cri: 80, ip: 'IP65', mm: [300, 300, 120] },
    { id: 'v-4', name: 'Linear 50W', manufacturer: 'Aurora', kind: 'linear', power: 50, efficacy: 120, cri: 85, ip: 'IP40', mm: [1200, 80, 60] }];
    return Object.fromEntries(V.map(v => [v.id, { ...v, lumens: v.power * v.efficacy, image: svgImg(v.kind) }])); })(),
  tick: ms => new Promise(r => setTimeout(r, ms || 60)),   // lets the loading screen paint before the heavy mock maths
  poly: p => p.map(q => Array.isArray(q) ? q : [q.x, q.y]),
  inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [a, b] = P[i], [p, q] = P[j]; if ((b > y) !== (q > y) && x < (p - a) * (y - b) / (q - b) + a) c = !c; } return c; },
  bbox(P) { const xs = P.map(p => p[0]), ys = P.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; },
  // TODO: replace with the real candela table parsed from the fixture's IES file
  candela(theta, flux) { return flux / Math.PI * Math.cos(theta); },
  target: b => /5_1_1/.test(b.activityId || '') ? 100 : 500,
  patches(P, fx, o = {}) {   // floor cells on the workplane = room inset by `border` (floorZone)
    const step = o.step || .25, wp = o.wp || 0, mount = o.mount || 3, IP = insetPoly(P, o.border ?? .5), [x0, y0, x1, y1] = this.bbox(IP), out = [];
    for (let y = y0 + step / 2; y < y1; y += step) for (let x = x0 + step / 2; x < x1; x += step) {
      if (!this.inPoly(IP, x, y)) continue; let e = 0;
      for (const f of fx) { const h = Math.max(.1, (f.z || mount) - wp), r2 = (x - f.x) ** 2 + (y - f.y) ** 2, d2 = r2 + h * h, ct = h / Math.sqrt(d2); e += this.candela(Math.acos(ct), f.flux) * ct / d2; }
      out.push({ x, y, e: e * 1.18 });   // 1.18 = dummy interreflection gain
    }
    const v = out.map(p => p.e), min = Math.min(...v), max = Math.max(...v), avg = v.reduce((a, b) => a + b, 0) / (v.length || 1);
    return { patches: out, step, min, max, average: avg, uniformity: avg ? min / avg : 0 };
  },
  solution(P, fx, v, body, o = {}) {
    const T = this.target(body), r = this.patches(P, fx, { mount: body.mountingHeight, wp: body.workPlaneHeight, border: body.floorZone ?? .5, step: .25, ...o }), area = Math.abs(P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2,
      miss = r.average < T ? 'under_target' : r.average > T * 1.3 ? 'over_cap' : r.uniformity < .6 ? 'uniformity' : null, pw = fx.reduce((a, f) => a + (this.VARS[f.variantId || v.id] || v).power, 0);
    return { variantId: v.id, fixtureCount: fx.length, placements: fx.map((f, i) => ({ id: f.id ?? i + 1, x: f.x, y: f.y, z: f.z || body.mountingHeight || 3, rotation: f.rotation || 0, tiltAngle: f.tiltAngle || 0, variantId: f.variantId || null })),
      grid: o.grid || null, average: r.average, minimum: r.min, maximum: r.max, uniformity: r.uniformity, overdesign: r.average / T - 1, powerW: pw, powerDensity: pw / area, missReason: miss, recommended: !miss, patches: r.patches, step: r.step };
  },
  wrap(body, sols) { return { application: (body.mountingHeight || 3) <= 3 ? 'interior' : 'industrial', target: { avgLux: this.target(body), uniformity: .6, maxOverdesign: .3 }, solutions: sols, closestMiss: null, floorMeta: { border: body.floorZone ?? .5, spacing: .25, workPlaneHeight: body.workPlaneHeight || 0 } }; },
  withFlux(body, v) { return (body.fixtures || []).map(f => ({ ...f, flux: (this.VARS[f.variantId] || v).lumens })); },
  calculate(body) {
    const P = this.poly(body.polygon), v = this.VARS[body.variantId] || this.VARS['v-1'];
    return this.wrap(body, [this.solution(P, this.withFlux(body, v), v, body)]);
  },
  calculateOptions(body) {
    const P = this.poly(body.polygon), mixed = (body.fixtures || []).some(f => f.variantId);
    if (mixed) return this.calculate(body);
    const sols = Object.values(this.VARS).map(v => this.solution(P, (body.fixtures || []).map(f => ({ ...f, flux: v.lumens })), v, body));
    return this.wrap(body, this.rank(sols));
  },
  rank: s => s.sort((a, b) => (b.recommended - a.recommended) || (a.recommended ? a.fixtureCount - b.fixtureCount : Math.abs(a.overdesign) - Math.abs(b.overdesign))),
  automate(body) {
    const P = this.poly(body.polygon), IP = insetPoly(P, body.floorZone ?? .5), [x0, y0, x1, y1] = this.bbox(P), T = this.target(body), sols = [];
    for (const v of Object.values(this.VARS)) {
      let best = null;
      for (let nx = 1; nx <= 9; nx++) for (let ny = 1; ny <= 9; ny++) {
        const fx = []; for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const x = x0 + (i + .5) * (x1 - x0) / nx, y = y0 + (j + .5) * (y1 - y0) / ny; if (this.inPoly(IP, x, y)) fx.push({ x, y, id: fx.length + 1, flux: v.lumens }); }
        if (!fx.length || fx.length > 64) continue;
        const r = this.patches(P, fx, { mount: body.mountingHeight, wp: body.workPlaneHeight, border: body.floorZone ?? .5, step: .5 }), ok = r.average >= T && r.average <= T * 1.3 && r.uniformity >= .6,
          sc = ok ? fx.length : 1000 + Math.abs(r.average / T - 1.1) * 100 + (1 - r.uniformity) * 50;
        if (!best || sc < best.sc) best = { fx, sc, nx, ny };
      }
      if (best) sols.push(this.solution(P, best.fx, v, body, { grid: { spacingX: (x1 - x0) / best.nx, spacingY: (y1 - y0) / best.ny, offsetX: (x1 - x0) / best.nx / 2, offsetY: (y1 - y0) / best.ny / 2, rotation: 0 } }));
    }
    return this.wrap(body, this.rank(sols));
  },
  cad(file) {   // mock parse: a drawing with three rooms (one has a slanted wall)
    return { file: file.name, rooms: [
      { id: 'r1', name: 'Office (L-shape)', polygon: [[0, 0], [8, 0], [8, 3], [5, 3], [5, 6], [0, 6]] },
      { id: 'r2', name: 'Meeting room', polygon: [[0, 0], [6, 0], [6, 4], [0, 4]] },
      { id: 'r3', name: 'Open plan (slanted wall)', polygon: [[0, 0], [9, 0], [9, 4], [6, 7], [0, 7]] }] };
  }
};
