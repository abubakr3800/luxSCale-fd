/* LuxScale room entry (phase 3).
   Uniform: pick a shape, type its dimensions.  Non-uniform: draw corners on the canvas, or type X/Y,
   and edit every edge length (all angles are kept).  Heights live here too because the engine needs them.
   Loaded after studio.js; talks to it through window.LS. Not used on cad.html (rooms come from the DWG there). */
(() => {
const LS = window.LS; if (!LS || LS.PG === 'cad') return;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const room = LS.room, view = LS.view, KEY = 'lux.room.' + LS.PG, MIN = 0.05;
const R = { kind: LS.setup.shape === 'nonuniform' ? 'free' : 'uniform', shape: 'rect', dims: {}, mode: 'view', draft: [], prev: null, selV: -1, drag: null, pan: null, cur: null, open: false };

/* ---------------- shapes (all metres, origin-normalised, engine needs a simple polygon) ---------------- */
const norm = P => { const x0 = Math.min(...P.map(p => p[0])), y0 = Math.min(...P.map(p => p[1])); return P.map(p => [+(p[0] - x0).toFixed(4), +(p[1] - y0).toFixed(4)]); };
const reg = n => d => { const s = d.side, Rr = s / (2 * Math.sin(Math.PI / n)); return norm(Array.from({ length: n }, (_, k) => { const a = -Math.PI / 2 - Math.PI / n + 2 * Math.PI * k / n; return [Rr * Math.cos(a), Rr * Math.sin(a)]; })); };
const F = (id, l, def) => ({ id, l, def });   // dimension field
const SHAPES = {
  rect: { n: 'Rectangle', f: [F('w', 'Width', 8), F('d', 'Depth', 6)], make: d => norm([[0, 0], [d.w, 0], [d.w, d.d], [0, d.d]]) },
  square: { n: 'Square', f: [F('s', 'Side', 6)], make: d => norm([[0, 0], [d.s, 0], [d.s, d.s], [0, d.s]]) },
  tri: { n: 'Triangle', f: [F('b', 'Base', 8), F('h', 'Height', 5)], make: d => norm([[0, 0], [d.b, 0], [d.b / 2, d.h]]) },
  trap: { n: 'Trapezoid', f: [F('b', 'Bottom', 8), F('t', 'Top', 5), F('h', 'Height', 5)], make: d => norm([[0, 0], [d.b, 0], [(d.b + d.t) / 2, d.h], [(d.b - d.t) / 2, d.h]]) },
  pent: { n: 'Pentagon', f: [F('side', 'Side', 4)], make: reg(5) },
  hex: { n: 'Hexagon', f: [F('side', 'Side', 4)], make: reg(6) },
  oct: { n: 'Octagon', f: [F('side', 'Side', 3.5)], make: reg(8) },
  circ: { n: 'Circle', f: [F('dia', 'Diameter', 6)], note: 'Drawn as a 32-sided polygon — the engine works on polygons.', make: d => norm(Array.from({ length: 32 }, (_, k) => [d.dia / 2 * Math.cos(2 * Math.PI * k / 32), d.dia / 2 * Math.sin(2 * Math.PI * k / 32)])) },
  L: { n: 'L-shape', f: [F('w', 'Width', 8), F('d', 'Depth', 6), F('a', 'Arm width', 3), F('b', 'Arm depth', 3)],
    chk: d => d.a >= d.w || d.b >= d.d ? 'Arms must be smaller than the overall width and depth.' : null, make: d => [[0, 0], [d.w, 0], [d.w, d.b], [d.a, d.b], [d.a, d.d], [0, d.d]] },
  T: { n: 'T-shape', f: [F('w', 'Bar width', 8), F('d', 'Total depth', 6), F('sw', 'Stem width', 3), F('bt', 'Bar depth', 2.5)],
    chk: d => d.sw >= d.w || d.bt >= d.d ? 'Stem must be narrower than the bar, and the bar shallower than the total depth.' : null, make: d => { const a = (d.w - d.sw) / 2, b = a + d.sw, y = d.d - d.bt; return [[a, 0], [b, 0], [b, y], [d.w, y], [d.w, d.d], [0, d.d], [0, y], [a, y]]; } },
  U: { n: 'U-shape', f: [F('w', 'Width', 8), F('d', 'Depth', 6), F('t', 'Side wall', 2.5), F('b', 'Base depth', 2.5)],
    chk: d => 2 * d.t >= d.w || d.b >= d.d ? 'Side walls must leave a gap, and the base must be shallower than the depth.' : null, make: d => [[0, 0], [d.w, 0], [d.w, d.d], [d.w - d.t, d.d], [d.w - d.t, d.b], [d.t, d.b], [d.t, d.d], [0, d.d]] }
};
Object.values(SHAPES).forEach(s => s.d0 = Object.fromEntries(s.f.map(f => [f.id, f.def])));
R.dims = {};   /* blank until the user types — the page waits for dimensions */
const thumb = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1, k = Math.min(34 / w, 26 / h), x0 = Math.min(...xs), y1 = Math.max(...ys);
  return `<svg viewBox="0 0 40 32"><path d="${pts.map((p, i) => (i ? 'L' : 'M') + (3 + (p[0] - x0) * k + (34 - w * k) / 2).toFixed(1) + ' ' + (3 + (y1 - p[1]) * k + (26 - h * k) / 2).toFixed(1)).join('')}Z"/></svg>`; };

/* ---------------- geometry helpers ---------------- */
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onSeg = (a, b, c) => Math.min(a[0], b[0]) - 1e-9 <= c[0] && c[0] <= Math.max(a[0], b[0]) + 1e-9 && Math.min(a[1], b[1]) - 1e-9 <= c[1] && c[1] <= Math.max(a[1], b[1]) + 1e-9;
function segHit(a, b, c, d) { const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b), E = 1e-9;
  if (((d1 > E && d2 < -E) || (d1 < -E && d2 > E)) && ((d3 > E && d4 < -E) || (d3 < -E && d4 > E))) return true;
  return (Math.abs(d1) <= E && onSeg(a, b, c)) || (Math.abs(d2) <= E && onSeg(a, b, d)) || (Math.abs(d3) <= E && onSeg(c, d, a)) || (Math.abs(d4) <= E && onSeg(c, d, b)); }
function crosses(P) { const n = P.length; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (j === i + 1 || (i === 0 && j === n - 1)) continue; if (segHit(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) return true; } return false; }
const signedArea = P => P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const len = i => { const p = room[i], q = room[(i + 1) % room.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); };
function interior(j) { const n = room.length, a = room[(j + n - 1) % n], b = room[j], c = room[(j + 1) % n], ix = b[0] - a[0], iy = b[1] - a[1], ox = c[0] - b[0], oy = c[1] - b[1], turn = Math.atan2(ix * oy - iy * ox, ix * ox + iy * oy) * 180 / Math.PI; return signedArea(room) >= 0 ? 180 - turn : 180 + turn; }

/* change one edge length, keep every edge direction (= every angle): edge i grows, the two edges after it absorb the change,
   so the corner after them stays where it was. Falls back to other edge pairs if that would collapse. */
function setEdge(i, L) {
  const n = room.length; if (!(L >= MIN)) return `Length must be at least ${MIN} m.`;
  const e = room.map((p, j) => { const q = room[(j + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return { l, ux: dx / l, uy: dy / l }; });
  const d = L - e[i].l; if (Math.abs(d) < 1e-9) return null;
  for (let a = 1; a < n; a++) for (let b = a + 1; b < n; b++) {
    const p = (i + a) % n, q = (i + b) % n, det = e[p].ux * e[q].uy - e[p].uy * e[q].ux; if (Math.abs(det) < 1e-3) continue;
    const rx = -d * e[i].ux, ry = -d * e[i].uy, A = (rx * e[q].uy - e[q].ux * ry) / det, B = (e[p].ux * ry - e[p].uy * rx) / det;
    if (e[p].l + A < MIN || e[q].l + B < MIN) continue;
    const ls = e.map(x => x.l); ls[i] = L; ls[p] += A; ls[q] += B;
    const out = new Array(n); out[i] = room[i].slice(); let cur = room[i].slice();
    for (let k = 0; k < n - 1; k++) { const j = (i + k) % n; cur = [cur[0] + e[j].ux * ls[j], cur[1] + e[j].uy * ls[j]]; out[(j + 1) % n] = cur; }
    if (crosses(out)) continue; room.splice(0, n, ...out); return null;
  }
  return 'That length would collapse or cross another edge, so the angles cannot be kept.';
}

/* ---------------- state changes ---------------- */
function validate() {
  let m = null; const n = room.length;
  if (R.mode === 'draw' || (R.kind === 'uniform' && n === 0)) m = null; else if (n < 3) m = 'Room needs at least 3 corners.';
  else if (Math.abs(signedArea(room)) < 1e-6) m = 'Room has no area (corners are in a line).';
  else if (crosses(room)) m = 'Edges cross each other — the engine needs a simple polygon.';
  const h = LS.heights; if (!m && !(h.ceiling > 0 && h.mount > 0)) m = 'Ceiling and mounting height must be greater than 0.';
  else if (!m && h.mount > h.ceiling) m = 'Mounting height cannot be above the ceiling height.';
  else if (!m && h.wp < 0) m = 'Work-plane height cannot be negative.';
  else if (!m && h.wp >= h.mount) m = 'Work plane must sit below the mounting height.';
  LS.invalid = m; LS.gate(); const el = $('#rmMsg'); if (el) { el.textContent = m || ''; el.hidden = !m; } return !m;
}
function changed(o = {}) {
  LS.hideLabels = room.length > 12; LS.rebuildDemo(); $$('.kv b').forEach(b => b.textContent = '—');
  validate(); stats(); if (o.fit) LS.fit(); else LS.draw(); if (o.tables) tables(); else sync(); save();
}
function save() { try { sessionStorage.setItem(KEY, JSON.stringify({ kind: R.kind, shape: R.shape, dims: R.dims, pts: room, h: LS.heights, fx: LS.PG === 'studio' && LS.userFix ? LS.fix : null })); } catch (_) {} }
function applyDims(o = {}) {
  const S = SHAPES[R.shape]; if (S.f.some(f => R.dims[f.id] === undefined)) { const box = $('#rmDimMsg'); if (box) box.hidden = true; if (room.length) { room.splice(0); changed({ tables: true }); } return; }   /* incomplete → empty page, no error */
  const bad = S.f.find(f => !(R.dims[f.id] >= MIN)); let m = bad ? `${bad.l} must be at least ${MIN} m.` : S.chk && S.chk(R.dims);
  const box = $('#rmDimMsg'); if (box) { box.textContent = m || ''; box.hidden = !m; } if (m) return;
  room.splice(0, room.length, ...S.make(R.dims).map(p => p.slice())); changed({ fit: o.fit !== false, tables: true });
}
function stats() { const el = $('#rmStat'); if (!el) return; el.innerHTML = room.length > 2 ? `<span>Area <b>${LS.area().toFixed(2)} m²</b></span><span>Perimeter <b>${LS.perim().toFixed(2)} m</b></span><span>Corners <b>${room.length}</b></span>` : '<span>No room yet</span>'; }

/* ---------------- flyout panel ---------------- */
const fld = (id, l, v, step = .05, min = 0, ph = '') => `<label>${l}<div class="u"><input type="number" id="${id}" value="${v ?? ''}" placeholder="${ph}" step="${step}" min="${min}" inputmode="decimal"><i>m</i></div></label>`;
LS.FLY.Room = () => `<h3>Room</h3>
<div class="seg" role="tablist"><button data-k="uniform" role="tab">Uniform</button><button data-k="free" role="tab">Non-uniform</button></div>
<div id="rmU"></div><div id="rmF"></div>
<p class="msg" id="rmMsg" hidden></p><div class="rstat" id="rmStat"></div>
<h4>Heights</h4><div class="f2">${fld('hC', 'Ceiling height', LS.heights.ceiling)}${fld('hM', 'Mounting height', LS.heights.mount)}${fld('hW', 'Work plane height', LS.heights.wp)}</div>
<p class="cap" id="hApp"></p>`;

function uniformPane() {
  const S = SHAPES[R.shape];
  $('#rmU').innerHTML = `<p class="cap">Pick a shape, then type its dimensions.</p><div class="shp">${Object.entries(SHAPES).map(([k, s]) => `<button data-s="${k}" class="${k === R.shape ? 'on' : ''}" title="${s.n}">${thumb(s.make(s.d0))}<span>${s.n}</span></button>`).join('')}</div>
  <div class="f2 dims">${S.f.map(f => fld('d_' + f.id, f.l, R.dims[f.id], .05, 0, f.def)).join('')}</div>${S.note ? `<p class="cap">${S.note}</p>` : ''}<p class="msg" id="rmDimMsg" hidden></p>`;
  $$('#rmU .shp button').forEach(b => b.onclick = () => { R.shape = b.dataset.s; R.dims = {}; uniformPane(); applyDims(); });
  S.f.forEach(f => $('#d_' + f.id).oninput = e => { R.dims[f.id] = e.target.value === '' ? undefined : +e.target.value; applyDims(); });
}
function freePane() {
  $('#rmF').innerHTML = `<div class="act"><button class="ghost" id="rmDraw">${room.length || R.mode === 'draw' ? 'Draw again' : 'Draw on canvas'}</button>
  <select id="rmTpl" aria-label="Start from a template"><option value="">Start from…</option><option value="rect">Rectangle</option><option value="L">L-shape</option><option value="U">U-shape</option></select></div>
  <p class="cap" id="rmHelp"></p>
  <div id="rmTabs"></div><button class="ghost sm" id="rmAdd">+ Add corner</button>`;
  $('#rmDraw').onclick = () => R.mode === 'draw' ? cancelDraw() : startDraw();
  $('#rmTpl').onchange = e => { const k = e.target.value; if (!k) return; endDraw(true); room.splice(0, room.length, ...SHAPES[k].make(SHAPES[k].d0).map(p => p.slice())); R.mode = 'edit'; changed({ fit: true, tables: true }); freePane(); };
  $('#rmAdd').onclick = () => { if (room.length < 2) return; const i = R.selV >= 0 ? R.selV : room.length - 1, p = room[i], q = room[(i + 1) % room.length]; room.splice(i + 1, 0, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); R.selV = i + 1; changed({ tables: true }); };
  help(); tables();
}
function help() { const el = $('#rmHelp'); if (!el) return; el.textContent = R.mode === 'draw' ? 'Click to place corners. Click the first corner or press Enter to close. Backspace undoes. Type a number to set the next length. Alt turns snapping off.' : 'Drag a corner, or edit X / Y below. Edit any length (here or on the canvas label) and every angle is kept. Double-click an edge to add a corner.'; }
function tables() {
  const el = $('#rmTabs'); if (!el) return;
  const ab = $('#rmAdd'); if (ab) ab.hidden = R.mode === 'draw';
  if (R.mode === 'draw') { const d = R.draft; el.innerHTML = `<p class="cap">${d.length ? d.length + (d.length === 1 ? ' corner' : ' corners') + ' placed' + (d.length >= 3 ? ' — click the first corner or press Enter to close.' : '.') : 'No corners yet.'}</p>`; return; }
  if (room.length < 1) { el.innerHTML = '<p class="cap">No corners yet.</p>'; return; }
  el.innerHTML = `<table class="tt"><thead><tr><th>#</th><th>X (m)</th><th>Y (m)</th><th>Edge to next</th><th>∠</th><th></th></tr></thead><tbody>${room.map((p, i) => `<tr data-i="${i}" class="${i === R.selV ? 'on' : ''}"><td>${i + 1}</td>
  <td><input type="number" step=".05" data-c="0" value="${p[0].toFixed(3)}"></td><td><input type="number" step=".05" data-c="1" value="${p[1].toFixed(3)}"></td>
  <td>${room.length > 1 ? `<input type="number" step=".05" min="${MIN}" data-l value="${len(i).toFixed(3)}">` : ''}</td><td class="an">${room.length > 2 ? interior(i).toFixed(1) + '°' : ''}</td>
  <td><button class="rm" data-del aria-label="Delete corner ${i + 1}" ${room.length <= 3 || R.mode === 'draw' ? 'disabled' : ''}>×</button></td></tr>`).join('')}</tbody></table>`;
  $$('#rmTabs tbody tr').forEach(tr => { const i = +tr.dataset.i; tr.onfocusin = () => { if (R.selV !== i) { R.selV = i; $$('#rmTabs tbody tr').forEach(x => x.classList.toggle('on', x === tr)); LS.draw(); } };
    $$('input[data-c]', tr).forEach(inp => inp.onchange = () => { const v = +inp.value; if (isNaN(v)) return sync(true); room[i][+inp.dataset.c] = v; changed(); });
    const l = $('input[data-l]', tr); if (l) l.onchange = () => { const m = setEdge(i, +l.value); if (m) { LS.toast(m); sync(true); } else changed(); };
    $('[data-del]', tr).onclick = () => { if (room.length > 3) { room.splice(i, 1); R.selV = -1; changed({ tables: true }); } }; });
}
function sync(force) {
  const rows = $$('#rmTabs tbody tr'); if (rows.length !== room.length) return tables();
  rows.forEach((tr, i) => { $$('input[data-c]', tr).forEach(inp => { if (force || document.activeElement !== inp) inp.value = room[i][+inp.dataset.c].toFixed(3); });
    const l = $('input[data-l]', tr); if (l && (force || document.activeElement !== l)) l.value = len(i).toFixed(3); const a = $('.an', tr); if (a) a.textContent = room.length > 2 ? interior(i).toFixed(1) + '°' : ''; });
}
function heights() {
  const h = LS.heights, bind = (id, k) => $('#' + id).oninput = e => { h[k] = +e.target.value; heightHint(); validate(); save(); };
  bind('hC', 'ceiling'); bind('hM', 'mount'); bind('hW', 'wp'); heightHint();
}
function heightHint() { const el = $('#hApp'); if (el) el.textContent = LS.heights.mount <= 3 ? 'A mounting height of 3 m or lower uses the interior catalog.' : 'A mounting height above 3 m uses the industrial catalog.'; }
function kindTabs() {
  $$('.seg button').forEach(b => { b.classList.toggle('on', b.dataset.k === R.kind); b.onclick = () => setKind(b.dataset.k); });
  $('#rmU').hidden = R.kind !== 'uniform'; $('#rmF').hidden = R.kind !== 'free';
}
function setKind(k) {
  if (k === R.kind) return; if (R.mode === 'draw') cancelDraw(); R.kind = k;
  if (k === 'uniform') { const S = SHAPES[R.shape]; uniformPane(); applyDims(); if (room.length) LS.toast('Rebuilt from the ' + S.n.toLowerCase() + ' dimensions'); } else { R.mode = room.length > 2 ? 'edit' : 'view'; freePane(); if (!room.length) startDraw(); }
  kindTabs(); save(); LS.draw();
}
LS.loadPolygon = pts => { if (R.mode === 'draw') cancelDraw(); LS.userFix = false; R.kind = 'free'; R.mode = R.open ? 'edit' : 'view'; R.selV = -1; room.splice(0, room.length, ...norm(pts.map(p => [p[0], p[1]]))); changed({ fit: true, tables: true }); if ($('#rmF')) { freePane(); kindTabs(); } };
LS.persist = save;
LS.AFTER.Room = () => { uniformPane(); freePane(); kindTabs(); heights(); validate(); stats(); };
LS.onFly = l => { R.open = l === 'Room'; if (R.kind === 'free' && R.mode !== 'draw') R.mode = R.open ? 'edit' : 'view'; LS.draw(); };

/* ---------------- drawing ---------------- */
function startDraw() { R.prev = room.map(p => p.slice()); room.splice(0); R.draft = []; R.mode = 'draw'; R.selV = -1; LS.select(null); changed({ tables: true }); help(); const b = $('#rmDraw'); if (b) b.textContent = 'Cancel drawing'; LS.cv.classList.add('draw'); }
function endDraw(keepRoom) { R.mode = R.open ? 'edit' : 'view'; R.draft = []; R.prev = null; LS.cv.classList.remove('draw'); closeLen(); if (!keepRoom) return; }
function cancelDraw() { const prev = R.prev; endDraw(); if (prev && prev.length) room.splice(0, 0, ...prev); R.mode = room.length > 2 ? (R.open ? 'edit' : 'view') : 'view'; changed({ fit: true, tables: true }); freePane(); }
function finishDraw() {
  const d = R.draft; if (d.length < 3) return LS.toast('Place at least 3 corners');
  if (crosses(d)) return LS.toast('Edges cross — undo the last corner (Backspace)');
  endDraw(); room.splice(0, 0, ...d); R.mode = 'edit'; changed({ fit: true, tables: true }); freePane();
}
const stepFor = () => view.k > 150 ? .05 : view.k > 50 ? .1 : .25;
function snap(e, from) {
  const [wx, wy] = LS.s2w(e.offsetX, e.offsetY); if (e.altKey) return [wx, wy]; const st = stepFor(); let x = Math.round(wx / st) * st, y = Math.round(wy / st) * st;
  if (from) { const dx = wx - from[0], dy = wy - from[1], L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI, near = Math.round(ang / 15) * 15;
    if (L > 0 && (e.shiftKey || Math.abs(ang - near) < 3)) { const r = Math.round(L / st) * st, a = near * Math.PI / 180; x = from[0] + r * Math.cos(a); y = from[1] + r * Math.sin(a); } }
  return [+x.toFixed(4), +y.toFixed(4)];
}
const near = (e, p, r = 10) => { const [x, y] = LS.w2s(p[0], p[1]); return Math.hypot(e.offsetX - x, e.offsetY - y) <= r; };
const vHit = e => room.findIndex(p => near(e, p, 10));
const lHit = e => LS.lbl.findIndex(b => b && e.offsetX >= b.x && e.offsetX <= b.x + b.w && e.offsetY >= b.y && e.offsetY <= b.y + b.h);
const editing = () => R.kind === 'free' && R.mode === 'edit' && LS.tool === 'sel';

/* floating inputs: length while drawing, edge length on the canvas label */
function floatInput(x, y, val, cb, ph) {
  closeLen(); const w = document.createElement('div'); w.className = 'flt'; w.id = 'rmLen'; w.style.left = Math.min(x, LS.W - 200) + 'px'; w.style.top = y + 'px';
  w.innerHTML = `<input type="number" step=".05" min="${MIN}" value="${val}" placeholder="${ph || ''}" aria-label="Length in metres"><i>m</i>`; document.body.append(w);
  const i = $('input', w); i.focus(); i.select();
  i.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') { const v = +i.value; if (v >= MIN) { closeLen(); cb(v); } } else if (ev.key === 'Escape') closeLen(); };
  const t0 = performance.now(); i.onblur = () => { if (performance.now() - t0 < 300) return i.focus(); setTimeout(closeLen, 120); };   /* the mouse-down that opened it steals focus once */
}
function closeLen() { const w = $('#rmLen'); if (w) w.remove(); }
function typedLength(seed) {
  const last = R.draft[R.draft.length - 1]; if (!last) return; const [sx, sy] = LS.w2s(last[0], last[1]);
  floatInput(sx + 14, sy - 34, seed || '', v => { const c = R.cur || [last[0] + 1, last[1]], dx = c[0] - last[0], dy = c[1] - last[1], L = Math.hypot(dx, dy) || 1; addPoint([last[0] + dx / L * v, last[1] + dy / L * v]); }, 'length');
}
function addPoint(p) { const l = R.draft[R.draft.length - 1]; if (l && Math.hypot(p[0] - l[0], p[1] - l[1]) < .02) return; R.draft.push([+p[0].toFixed(4), +p[1].toFixed(4)]); tables(); LS.draw(); }

/* ---------------- canvas hooks ---------------- */
LS.hooks.down = e => {
  if (R.mode === 'draw') { R.pan = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; return true; }
  if (!editing()) return false;
  const li = lHit(e); if (li >= 0) { const b = LS.lbl[li]; floatInput(b.x - 20, b.y - 34, len(li).toFixed(3), v => { const m = setEdge(li, v); m ? LS.toast(m) : changed(); }); return true; }
  const vi = vHit(e); if (vi >= 0) { R.drag = { i: vi, moved: false }; R.selV = vi; $$('#rmTabs tbody tr').forEach(x => x.classList.toggle('on', +x.dataset.i === vi)); return true; }
  return false;
};
LS.hooks.move = e => {
  if (R.mode === 'draw') { const last = R.draft[R.draft.length - 1]; R.cur = snap(e, last); if (R.pan) { const dx = e.clientX - R.pan.x, dy = e.clientY - R.pan.y; if (Math.abs(dx) + Math.abs(dy) > 3) R.pan.moved = true; if (R.pan.moved) { view.x = R.pan.vx + dx; view.y = R.pan.vy + dy; } } LS.draw(); return true; }
  if (R.drag) { const i = R.drag.i, n = room.length, from = e.shiftKey ? room[(i + n - 1) % n] : null; R.drag.moved = true; room[i] = snap(e, from); validate(); stats(); sync(); LS.rebuildDemo(); LS.draw(); return true; }
  if (editing()) LS.cv.style.cursor = vHit(e) >= 0 ? 'move' : lHit(e) >= 0 ? 'text' : ''; return false;
};
LS.hooks.up = e => {
  if (R.mode === 'draw') { const p = R.pan, first = R.draft[0]; R.pan = null; if (p && !p.moved) { if (first && R.draft.length >= 3 && near(e, first, 12)) finishDraw(); else addPoint(snap(e, R.draft[R.draft.length - 1])); } return true; }
  if (R.drag) { R.drag = null; changed(); return true; } return false;
};
LS.hooks.dbl = e => {
  if (R.mode === 'draw') { if (R.draft.length > 3) R.draft.pop(); if (R.draft.length >= 3) finishDraw(); return true; }
  if (!editing()) return false; const n = room.length;
  for (let i = 0; i < n; i++) { const p = room[i], q = room[(i + 1) % n], [x1, y1] = LS.w2s(p[0], p[1]), [x2, y2] = LS.w2s(q[0], q[1]), dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((e.offsetX - x1) * dx + (e.offsetY - y1) * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(e.offsetX - x1 - t * dx, e.offsetY - y1 - t * dy) < 8 && vHit(e) < 0 && lHit(e) < 0) { room.splice(i + 1, 0, snap(e)); R.selV = i + 1; changed({ tables: true }); return true; } }
  return false;
};
LS.hooks.over = g => {
  const acc = '#eb1b26', mu = LS.css('--mu'), P = LS.w2s;
  if (LS.invalid && room.length > 2 && R.mode !== 'draw') { g.save(); g.strokeStyle = acc; g.lineWidth = 5; g.setLineDash([3, 6]); g.beginPath(); room.forEach((p, i) => { const [a, b] = P(...p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.stroke(); g.restore(); }
  if (R.mode === 'edit' && R.kind === 'free') {
    g.save(); LS.lbl.forEach(b => { if (!b) return; g.strokeStyle = acc; g.lineWidth = 1; g.strokeRect(b.x + .5, b.y + .5, b.w, b.h); });
    room.forEach((p, i) => { const [x, y] = P(...p), on = i === R.selV; g.fillStyle = on ? acc : LS.css('--bg'); g.strokeStyle = acc; g.lineWidth = 2; g.beginPath(); g.arc(x, y, on ? 7 : 6, 0, 7); g.fill(); g.stroke(); g.fillStyle = on ? '#fff' : mu; g.font = '600 9px Poppins, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i + 1, x, y + .5); }); g.restore();
  }
  if (R.mode === 'draw') {
    const d = R.draft, c = R.cur; g.save(); g.lineWidth = 2.5; g.strokeStyle = acc; g.fillStyle = 'rgba(235,27,38,.08)';
    g.beginPath(); d.forEach((p, i) => { const [a, b] = P(...p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); if (c && d.length) { const [a, b] = P(...c); g.lineTo(a, b); } if (d.length > 2) g.fill(); g.stroke();
    if (c && d.length) { const l = d[d.length - 1], L = Math.hypot(c[0] - l[0], c[1] - l[1]), ang = (Math.atan2(c[1] - l[1], c[0] - l[0]) * 180 / Math.PI + 360) % 360, [a, b] = P(...c), t = `${L.toFixed(2)} m  ·  ${ang.toFixed(0)}°`;
      g.font = '500 12px Poppins, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; const w = g.measureText(t).width + 14; g.fillStyle = acc; g.fillRect(a + 14, b + 10, w, 20); g.fillStyle = '#fff'; g.fillText(t, a + 21, b + 20); }
    d.forEach((p, i) => { const [x, y] = P(...p), first = i === 0 && d.length >= 3; g.fillStyle = first ? acc : LS.css('--bg'); g.strokeStyle = acc; g.lineWidth = 2; g.beginPath(); g.arc(x, y, first ? 8 : 5, 0, 7); g.fill(); g.stroke(); });
    if (c) { const [x, y] = P(...c); g.strokeStyle = mu; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.moveTo(x, y - 8); g.lineTo(x, y + 8); g.stroke(); }
    if (!d.length) { g.fillStyle = mu; g.font = '400 15px Poppins, sans-serif'; g.textAlign = 'center'; g.fillText('Click to place the first corner', LS.W / 2 - 100, LS.H / 2); }
    g.restore();
  }
};
addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (R.mode === 'draw') {
    if (e.key === 'Enter') { e.preventDefault(); finishDraw(); } else if (e.key === 'Backspace') { e.preventDefault(); R.draft.pop(); tables(); LS.draw(); }
    else if (e.key === 'Escape') cancelDraw(); else if (/^[0-9.]$/.test(e.key) && R.draft.length) { e.preventDefault(); typedLength(e.key); }
  } else if (R.mode === 'edit' && R.kind === 'free' && (e.key === 'Delete' || e.key === 'Backspace') && R.selV >= 0 && room.length > 3) { room.splice(R.selV, 1); R.selV = -1; changed({ tables: true }); }
});

/* ---------------- boot ---------------- */
(() => {
  let st = null; try { st = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (_) {}
  const HO = LS.handoff;
  if (HO) {   /* Auto / CAD "Advanced edit": open the solution and its spacing for full editing */
    R.kind = 'free'; Object.assign(LS.heights, HO.heights || {}); room.splice(0, room.length, ...HO.polygon.map(p => [p[0], p[1]])); LS.hideLabels = room.length > 12; LS.rebuildDemo();
    LS.fix = HO.placements.map(p => ({ id: p.id, x: p.x, y: p.y, z: p.z, rot: p.rotation || 0, tilt: p.tiltAngle || 0 })); LS.userFix = true; LS.variant = HO.variantId; LS.pattern = HO.grid; LS.state.activityId = HO.activityId; LS.setup.categoryId = HO.categoryId; LS.handoffPending = HO; save();
  } else if (st && st.kind === R.kind && Array.isArray(st.pts)) { R.shape = SHAPES[st.shape] ? st.shape : 'rect'; R.dims = { ...st.dims }; Object.assign(LS.heights, st.h || {}); room.splice(0, room.length, ...st.pts); LS.hideLabels = room.length > 12; LS.rebuildDemo(); if (Array.isArray(st.fx) && st.fx.length && LS.PG === 'studio') { LS.fix = st.fx; LS.userFix = true; } }
  R.mode = R.kind === 'free' && room.length > 2 ? 'edit' : 'view';
  const btn = $('.ib[data-k=room]'); if (btn) btn.click();      /* open the Room flyout on first load */
  if (R.kind === 'free' && room.length < 3) startDraw();
  validate(); LS.fit();
})();
LS.room_ = R;
})();
