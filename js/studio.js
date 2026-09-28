(() => {
const $ = (s, r = document) => r.querySelector(s), PG = document.body.dataset.page;
const IC = { home: 'M3 11l9-8 9 8v10H3z', room: 'M4 4h16v16H4z', std: 'M4 6h16M4 12h16M4 18h10', fix: 'M12 3v4m0 10v4M3 12h4m10 0h4M9 12a3 3 0 106 0 3 3 0 00-6 0', surf: 'M3 3h18v18H3zM3 9h18M9 3v18', pat: 'M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4z', srch: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5', cad: 'M12 3v12m0 0l-4-4m4 4l4-4M4 19h16',
  sel: 'M5 3l14 8-6 2-2 6z', pan: 'M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3', ruler: 'M3 17L17 3l4 4L7 21zM8 12l2 2M11 9l2 2M14 6l2 2', rot: 'M20 12a8 8 0 11-3-6.2M20 4v5h-5', tilt: 'M4 18L20 10M4 18h7', rep: 'M4 8h13l-3-3M20 16H7l3 3', repall: 'M4 6h13l-3-3M20 12H7l3 3M4 18h13l-3-3', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3', redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3', save: 'M5 3h11l3 3v15H5zM8 3v6h7V3M8 21v-7h8v7', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', report: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7', theme: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3', snap: 'M4 4h16v16H4zM4 12h16M12 4v16', add: 'M12 5v14M5 12h14', del: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13', copy: 'M8 8h12v12H8zM4 16V4h12', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', down: 'M6 9l6 6 6-6' };
const svg = k => `<svg viewBox="0 0 24 24"><path d="${IC[k]}"/></svg>`;
const CFG = {
  auto: { t: ['Auto', 'Study'], rail: [['room', 'Room'], ['std', 'Standard'], ['fix', 'Fixtures'], ['surf', 'Surfaces'], ['srch', 'Search options']], run: 'Run Auto Study', need: true },
  cad: { t: ['CAD', 'Study'], rail: [['cad', 'Drawing'], ['room', 'Room picker'], ['std', 'Standard'], ['fix', 'Fixtures'], ['surf', 'Surfaces'], ['srch', 'Search options']], run: 'Run CAD Study', need: true },
  studio: { t: ['Study', 'Studio'], rail: [['room', 'Room'], ['cad', 'Drawing (CAD)'], ['fix', 'Fixtures'], ['pat', 'Layout pattern'], ['surf', 'Surfaces'], ['std', 'Standard (optional)']], run: 'Calculate', need: false }
}[PG];
let setup = {}; try { setup = JSON.parse(sessionStorage.getItem('lux.setup') || '{}'); } catch (_) {}
const state = { activityId: setup.activityId || null };
let handoff = null; if (PG === 'studio') try { handoff = JSON.parse(sessionStorage.getItem('lux.handoff') || 'null'); sessionStorage.removeItem('lux.handoff'); } catch (_) {}
const LS = window.LS = { PG, setup, state, hooks: {}, AFTER: {}, lbl: [], hideLabels: false, heights: { ceiling: 3, mount: 3, wp: 0.8 }, handoff, options: null, active: -1, variant: null, userFix: false };
const lux = () => 'assets/lux-logo-' + (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light') + '.svg';
const logo = () => 'https://shortcircuit.company/assets/img/' + (document.documentElement.dataset.theme === 'dark' ? 'logo-dark.svg' : 'logo.svg');

/* ---------- DOM shell ---------- */
const TB = [['sel', 'Select (V)', 'tool'], ['pan', 'Pan (H)', 'tool'], ['ruler', 'Ruler (R)', 'tool'], '|', ['undo', 'Undo', 's'], ['redo', 'Redo', 's'], '|',
  ...(PG === 'studio' ? [['add', 'Add fixture', 's'], ['del', 'Delete', 's'], ['rot', 'Rotate fixture', 's'], ['tilt', 'Tilt angle', 's'], ['rep', 'Replace fixture', 's'], ['repall', 'Replace all fixtures', 's'], ['copy', 'Copy / array', 's'], '|'] : []),
  ['snap', 'Snap & grid', 's'], ['layers', 'Heatmap layers', 's'], ['fit', 'Fit to screen (F)', 'fit'], '|', ['save', 'Save to server', 's']];
document.body.insertAdjacentHTML('beforeend', `
<aside class="rl"><a href="index.html" title="Home"><img src="${logo()}" alt="SC" id="rlogo"></a>
${CFG.rail.map(([k, l], i) => `<button class="ib" data-i="${i}" data-k="${k}" data-l="${l}" aria-label="${l}">${svg(k)}</button>`).join('')}<div class="sp"></div>
<button class="ib" id="thm" data-l="Light / Dark" aria-label="Theme">${svg('theme')}</button></aside>
<div class="fly" id="fly"></div>
<header class="top" id="top"><a href="index.html" class="tl" title="LuxScale home"><img src="${lux()}" alt="LuxScale AI" id="tlogo"></a><span class="ttl">${CFG.t[0]} <em>${CFG.t[1]}</em></span>
${TB.map(t => t === '|' ? '<i class="sep"></i>' : `<button class="tb${t[2] === 's' ? ' soon' : ''}" data-a="${t[2]}" data-t="${t[0]}" title="${t[1]}" aria-label="${t[1]}">${svg(t[0])}</button>`).join('')}
<span class="grow"></span><button class="tb" id="rep" title="Report" aria-label="Report">${svg('report')}</button>
<button class="tog" id="tog" aria-label="Collapse toolbar"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button></header>
<section class="glass res" id="res"><header id="resH"><h3>Results</h3>${svg('down')}</header><div class="bd">
<div class="kv"><div><small>Eavg</small><b id="rE">—</b></div><div><small>Emin</small><b>—</b></div><div><small>Emax</small><b>—</b></div><div><small>U0</small><b>—</b></div><div><small>Power</small><b>—</b></div><div><small>Compliance</small><b>—</b></div></div>
<p class="rvar" id="rvar" hidden></p><p class="cap" id="hint"></p><button class="btn" id="run">${CFG.run}</button>
<button class="ghost wf" id="optBtn" hidden>Available options</button>${PG !== 'studio' ? '<button class="ghost wf" id="advBtn" hidden>Advanced edit</button>' : ''}</div></section>
<section class="glass insp" id="insp"><button class="x" id="ix" aria-label="Close">×</button><div id="ib2"></div></section>
<div class="hud"><span id="hz">100 %</span><span id="hc">x 0.00  y 0.00 m</span></div><div class="toast" id="toast"></div>`);
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800); };
$('#thm').onclick = () => { const d = document.documentElement; d.dataset.theme = d.dataset.theme === 'dark' ? 'light' : 'dark'; $('#rlogo').src = logo(); $('#tlogo').src = lux(); draw(); };
$('#tog').onclick = () => $('#top').classList.toggle('up');
$('#resH').onclick = () => $('#res').classList.toggle('min');
$('#ix').onclick = () => select(null);
$('#rep').onclick = () => toast('Report page comes in phase 7');

/* rail flyouts */
const fly = $('#fly'); let open = -1;
const FLY = LS.FLY = {
  Standard: () => `<h3>Standard</h3><p class="cap">${CFG.need ? 'Required to run this study.' : 'Optional — use it to check compliance after calculating.'}</p><label>Category<select id="fc"></select></label><label>Activity<select id="fa"></select></label>`,
};
async function fill() {
  const c = await API.categories(); $('#fc').innerHTML = '<option value="">— none —</option>' + c.map(x => `<option value="${x.id}" ${x.id === setup.categoryId ? 'selected' : ''}>${x.name}</option>`).join('');
  const ld = async () => { const s = $('#fc').value ? await API.standards($('#fc').value) : []; $('#fa').innerHTML = '<option value="">— none —</option>' + s.map(x => `<option value="${x.id}" ${x.id === state.activityId ? 'selected' : ''}>${x.name}</option>`).join(''); };
  $('#fc').onchange = async () => { state.activityId = null; await ld(); gate(); }; await ld(); $('#fa').onchange = () => { state.activityId = $('#fa').value || null; gate(); };
}
document.querySelectorAll('.ib[data-i]').forEach(b => b.onclick = () => {
  const i = +b.dataset.i; document.querySelectorAll('.ib[data-i]').forEach(x => x.classList.remove('on'));
  if (open === i) { open = -1; fly.classList.remove('show'); LS.onFly && LS.onFly(null); return; } open = i; b.classList.add('on');
  const l = b.dataset.l, f = Object.keys(FLY).find(k => l.startsWith(k));
  fly.innerHTML = f ? FLY[f]() : `<h3>${l}</h3><p class="cap">Settings for this section are built in a later phase.</p>`; fly.classList.add('show'); fly.classList.toggle('wide', f === 'Room'); if (f === 'Standard') fill(); if (f && LS.AFTER[f]) LS.AFTER[f](); LS.onFly && LS.onFly(f || null);
});
function gate() { const ok = (!CFG.need || state.activityId) && (!LS.room || LS.room.length >= 3) && !LS.invalid; $('#run').disabled = !ok; $('#hint').textContent = ok ? '' : (LS.room && LS.room.length < 3) || LS.invalid ? 'Finish a valid room shape first (rail → Room).' : 'Choose a standard (rail → Standard) to enable the run.'; }
$('#run').onclick = () => runStudy(); gate();

/* ---------- canvas engine ---------- */
const cv = $('#cv'), g = cv.getContext('2d'); let W, H, dpr = devicePixelRatio || 1;
const view = { x: 0, y: 0, k: 60 };                       /* px per metre, world origin at (x,y) px, y up */
const room = [];   /* every page starts empty and waits for typed dimensions / a drawing */
LS.room = room; LS.view = view;
const inPoly = (x, y) => { let c = false; for (let i = 0, j = room.length - 1; i < room.length; j = i++) { const [a, b] = room[i], [p, q] = room[j]; if ((b > y) !== (q > y) && x < (p - a) * (y - b) / (q - b) + a) c = !c; } return c; };
const rayLeft = (x, y) => { let best = -1e9; for (let i = 0; i < room.length; i++) { const [a, b] = room[i], [p, q] = room[(i + 1) % room.length]; if ((b > y) !== (q > y)) { const xi = a + (y - b) * (p - a) / (q - b); if (xi < x && xi > best) best = xi; } } return best; };
let fix = [], dash = [], heat = null;
const ray = (x, y, dx, dy) => { let best = 1e9; for (let i = 0; i < room.length; i++) { const [a, b] = room[i], [p, q] = room[(i + 1) % room.length], ex = p - a, ey = q - b, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-12) continue; const t = ((a - x) * ey - (b - y) * ex) / den, u = ((a - x) * dy - (b - y) * dx) / den; if (t > 1e-6 && u > -1e-9 && u < 1 + 1e-9 && t < best) best = t; } return best; };
const rebuild = () => { dash = []; const eq = (a, b) => Math.abs(a - b) < 1e-3;
  fix.forEach(f => {
    const Rt = fix.filter(o => o !== f && eq(o.y, f.y) && o.x > f.x + 1e-3).sort((a, b) => a.x - b.x)[0], Up = fix.filter(o => o !== f && eq(o.x, f.x) && o.y > f.y + 1e-3).sort((a, b) => a.y - b.y)[0];
    if (Rt) dash.push({ a: [f.x, f.y], b: [Rt.x, Rt.y], d: Rt.x - f.x, ax: 'x', k: Rt.x, t: 'Fixture to fixture (X)' });
    if (Up) dash.push({ a: [f.x, f.y], b: [Up.x, Up.y], d: Up.y - f.y, ax: 'y', k: Up.y, t: 'Fixture to fixture (Y)' });
    if (!fix.some(o => o !== f && eq(o.y, f.y) && o.x < f.x - 1e-3)) { const d = ray(f.x, f.y, -1, 0); if (d < 1e8) dash.push({ a: [f.x - d, f.y], b: [f.x, f.y], d, ax: 'x', k: f.x, wall: 1, t: 'Wall to fixture (X)' }); }
    if (!fix.some(o => o !== f && eq(o.x, f.x) && o.y < f.y - 1e-3)) { const d = ray(f.x, f.y, 0, -1); if (d < 1e8) dash.push({ a: [f.x, f.y - d], b: [f.x, f.y], d, ax: 'y', k: f.y, wall: 1, t: 'Wall to fixture (Y)' }); }
  }); };
rebuild();
const PAL = [[0, [75, 0, 130]], [.17, [0, 0, 255]], [.33, [0, 200, 255]], [.5, [0, 200, 80]], [.67, [255, 230, 0]], [.83, [255, 130, 0]], [1, [235, 27, 38]]];
const fcol = t => { t = Math.max(0, Math.min(1, t)); for (let i = 1; i < PAL.length; i++) if (t <= PAL[i][0]) { const [t0, c0] = PAL[i - 1], [t1, c1] = PAL[i], k = (t - t0) / (t1 - t0); return `rgb(${c0.map((v, n) => Math.round(v + (c1[n] - v) * k)).join(',')})`; } };
const w2s = (x, y) => [view.x + x * view.k, view.y - y * view.k], s2w = (px, py) => [(px - view.x) / view.k, (view.y - py) / view.k];
const bbox = () => { if (!room.length) return [0, 0, 8, 6]; const xs = room.map(p => p[0]), ys = room.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
function fit() { const [x0, y0, x1, y1] = bbox(), L = 56 + (fly.classList.contains('show') ? fly.offsetWidth + 24 : 0), pw = W - L - 380, ph = H - 120; view.k = Math.min(pw / (x1 - x0), ph / (y1 - y0)) * .85; view.x = L + 40 + (pw - (x1 - x0) * view.k) / 2 - x0 * view.k; view.y = 70 + ph / 2 + (y1 - y0) * view.k / 2 + y0 * view.k; draw(); }
function size() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
addEventListener('resize', () => { size(); draw(); });
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const nice = t => { const p = 10 ** Math.floor(Math.log10(t)), m = t / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
let sel = null, tool = 'sel', ruler = [], mouse = [0, 0];
function draw() {
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const step = nice(60 / view.k), [wx0, wy1] = s2w(0, 0), [wx1, wy0] = s2w(W, H), line = css('--tx');
  for (let x = Math.floor(wx0 / step) * step; x < wx1; x += step) { const [sx] = w2s(x, 0); g.fillStyle = Math.abs(x % (step * 5)) < 1e-9 ? 'rgba(128,128,128,.22)' : 'rgba(128,128,128,.09)'; g.fillRect(sx, 0, 1, H); }
  for (let y = Math.floor(wy0 / step) * step; y < wy1; y += step) { const [, sy] = w2s(0, y); g.fillStyle = Math.abs(y % (step * 5)) < 1e-9 ? 'rgba(128,128,128,.22)' : 'rgba(128,128,128,.09)'; g.fillRect(0, sy, W, 1); }
  if (heat) { paintHeat(g, heat, view.x, view.y, view.k, .86); g.save(); g.setLineDash([2, 5]); g.strokeStyle = css('--mu'); g.lineWidth = 1; g.beginPath(); heat.ip.forEach(([x, y], i) => { const [a, b] = w2s(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.stroke(); g.restore(); }
  g.beginPath(); room.forEach(([x, y], i) => { const [a, b] = w2s(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath();
  g.fillStyle = sel && sel.type === 'shape' ? 'rgba(235,27,38,.16)' : 'rgba(235,27,38,.07)'; g.fill(); g.strokeStyle = '#eb1b26'; g.lineWidth = 2.5; g.stroke();
  if (sel && sel.type === 'edge') { const [p, q] = [room[sel.i], room[(sel.i + 1) % room.length]], [a, b] = w2s(...p), [c, d] = w2s(...q); g.strokeStyle = line; g.lineWidth = 4; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
  g.font = '500 12px Poppins, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  LS.lbl = []; if (!LS.hideLabels) room.forEach((p, i) => { const q = room[(i + 1) % room.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), [mx, my] = w2s((p[0] + q[0]) / 2, (p[1] + q[1]) / 2); const t = L.toFixed(2) + ' m', tw = g.measureText(t).width + 12;
    const cx = (bbox()[0] + bbox()[2]) / 2, cy = (bbox()[1] + bbox()[3]) / 2, nx = -(q[1] - p[1]), ny = q[0] - p[0], s = ((p[0] - cx) * nx + (p[1] - cy) * ny) > 0 ? 1 : -1, nl = Math.hypot(nx, ny) || 1, ox = s * nx / nl * 16, oy = -s * ny / nl * 16;
    g.fillStyle = css('--bg'); g.fillRect(mx + ox - tw / 2, my + oy - 10, tw, 20); LS.lbl[i] = { x: mx + ox - tw / 2, y: my + oy - 10, w: tw, h: 20, cx: mx + ox, cy: my + oy }; g.fillStyle = css('--mu'); g.fillText(t, mx + ox, my + oy); });
  dash.forEach(s => { const [a, b] = w2s(...s.a), [c, d] = w2s(...s.b), on = sel && sel.type === 'dash' && sel.s === s; g.setLineDash([6, 5]); g.strokeStyle = on ? '#eb1b26' : css('--mu'); g.lineWidth = on ? 2.5 : 1.2; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); g.setLineDash([]);
    if (view.k > 25) { g.fillStyle = css('--mu'); g.fillText(s.d.toFixed(2), (a + c) / 2, (b + d) / 2 - 10); } });
  fix.forEach(f => { const [x, y] = w2s(f.x, f.y), on = sel && sel.type === 'fix' && sel.f === f, r = Math.max(6, .2 * view.k); g.save(); g.translate(x, y); g.rotate(-(f.rot || 0) * Math.PI / 180); g.fillStyle = css('--bg'); g.strokeStyle = on ? '#eb1b26' : line; g.lineWidth = on ? 3 : 1.6; g.beginPath(); g.rect(-r, -r, r * 2, r * 2); g.fill(); g.stroke(); g.fillStyle = '#eb1b26'; g.beginPath(); g.arc(0, 0, r * .35, 0, 7); g.fill(); g.restore();
    if (f.tilt > 0) { const a = (f.rot || 0) * Math.PI / 180, L = r + 12; g.strokeStyle = '#eb1b26'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y - Math.sin(a) * L); g.stroke(); }
    if (view.k > 40) { g.fillStyle = css('--mu'); g.font = '500 10px Poppins, sans-serif'; g.textAlign = 'left'; g.fillText('F' + f.id, x + r + 3, y + r + 8); } });
  if (room.length < 3 && !(LS.room_ && LS.room_.mode === 'draw')) { g.fillStyle = css('--mu'); g.textAlign = 'center'; g.font = '400 20px Poppins, sans-serif'; const cx = (56 + W - 330) / 2 + (fly.classList.contains('show') ? 150 : 0); g.fillText(LS.emptyMsg(), cx, H / 2 - 8); g.font = '300 13px Poppins, sans-serif'; g.fillText('The plan appears here as soon as the shape is valid.', cx, H / 2 + 18); }
  if (ruler.length) { const pts = ruler.length === 1 ? [ruler[0], s2w(...mouse)] : ruler, [a, b] = w2s(...pts[0]), [c, d] = w2s(...pts[1]); g.strokeStyle = '#eb1b26'; g.lineWidth = 2; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
    const L = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), t = L.toFixed(3) + ' m', tw = g.measureText(t).width + 14; g.fillStyle = '#eb1b26'; g.fillRect((a + c) / 2 - tw / 2, (b + d) / 2 - 24, tw, 20); g.fillStyle = '#fff'; g.fillText(t, (a + c) / 2, (b + d) / 2 - 14); }
  const bar = nice(120 / view.k), bx = W - 352, by = H - 20; g.fillStyle = css('--mu'); g.fillRect(bx - bar * view.k, by, bar * view.k, 2); g.textAlign = 'right'; g.fillText(bar + ' m', bx - bar * view.k - 8, by + 1);
  if (heat) { const lx = 330, ly = H - 26; for (let i = 0; i < 160; i++) { g.fillStyle = fcol(i / 159); g.fillRect(lx + i, ly, 1, 10); } g.fillStyle = css('--mu'); g.textAlign = 'left'; g.fillText(Math.round(heat.min) + ' lx', lx - 56, ly + 6); g.fillText(Math.round(heat.max) + ' lx', lx + 168, ly + 6); }
  if (LS.hooks.over) LS.hooks.over(g);
  $('#hz').textContent = Math.round(view.k / 60 * 100) + ' %';
}
/* interaction */
const dseg = (px, py, a, b) => { const [x1, y1] = w2s(...a), [x2, y2] = w2s(...b), dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); };
function hit(px, py) {
  for (const f of fix) { const [x, y] = w2s(f.x, f.y); if (Math.abs(px - x) < Math.max(8, .2 * view.k) + 3 && Math.abs(py - y) < Math.max(8, .2 * view.k) + 3) return { type: 'fix', f }; }
  for (const s of dash) if (dseg(px, py, s.a, s.b) < 6) return { type: 'dash', s };
  for (let i = 0; i < room.length; i++) if (dseg(px, py, room[i], room[(i + 1) % room.length]) < 7) return { type: 'edge', i };
  const [wx, wy] = s2w(px, py); return inPoly(wx, wy) ? { type: 'shape' } : null;
}
const area = () => Math.abs(room.reduce((a, p, i) => { const q = room[(i + 1) % room.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2, perim = () => room.reduce((a, p, i) => { const q = room[(i + 1) % room.length]; return a + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);
const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
function select(s, full) {
  sel = s; const el = $('#insp'), b = $('#ib2'); el.classList.toggle('show', !!s); $('#res').classList.toggle('shift', false); if (!s) return draw();
  const [x0, y0, x1, y1] = bbox();
  if (s.type === 'fix' && LS.inspFix) LS.inspFix(s.f, b);
  else if (s.type === 'fix') { const o = LS.options && LS.options[LS.active], v = o && o.v; b.innerHTML = `<h3>Fixture ${s.f.id}</h3>${v ? `<img class="pic" src="${v.image}" alt="">` : '<div class="ph">Fixture image (from catalog)</div>'}<table>${row('Variant', v ? v.name : '—')}${row('Position', s.f.x.toFixed(2) + ', ' + s.f.y.toFixed(2) + ' m')}${row('Rotation', (s.f.rot || 0) + '°')}${row('Tilt', (s.f.tilt || 0) + '°')}</table>`; }
  else if (s.type === 'dash' && LS.inspDash) LS.inspDash(s.s, b);
  else if (s.type === 'dash') b.innerHTML = `<h3>Spacing</h3><p class="cap">${s.s.t}</p><table>${row('Distance', s.s.d.toFixed(3) + ' m')}</table>`;
  else if (s.type === 'edge' && !full) { const p = room[s.i], q = room[(s.i + 1) % room.length]; b.innerHTML = `<h3>Edge ${s.i + 1}</h3><table>${row('Length', Math.hypot(q[0] - p[0], q[1] - p[1]).toFixed(3) + ' m')}</table><p class="cap">Double-click for full dimensions.</p>`; }
  else if (s.type === 'shape' && !full) b.innerHTML = `<h3>Room</h3><table>${row('Perimeter', perim().toFixed(2) + ' m')}${row('Vertices', room.length)}</table><p class="cap">Double-click for full dimensions.</p>`;
  else b.innerHTML = `<h3>Room dimensions</h3><table>${row('Width', (x1 - x0).toFixed(2) + ' m')}${row('Depth', (y1 - y0).toFixed(2) + ' m')}${row('Area', area().toFixed(2) + ' m²')}${row('Perimeter', perim().toFixed(2) + ' m')}${row('Vertices', room.length)}</table>`;
  draw();
}
let drag = null;
cv.addEventListener('pointerdown', e => { if (e.target !== cv) return; cv.setPointerCapture(e.pointerId);
  if (LS.hooks.down && LS.hooks.down(e)) return;
  if (tool === 'ruler') { const w = s2w(e.offsetX, e.offsetY); ruler = ruler.length === 1 ? [ruler[0], w] : [w]; return draw(); }
  drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; cv.classList.add('pan'); });
cv.addEventListener('pointermove', e => { mouse = [e.offsetX, e.offsetY]; const [wx, wy] = s2w(e.offsetX, e.offsetY); $('#hc').textContent = `x ${wx.toFixed(2)}  y ${wy.toFixed(2)} m`;
  if (LS.hooks.move && LS.hooks.move(e)) return;
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; view.x = drag.vx + dx; view.y = drag.vy + dy; draw(); } else if (tool === 'ruler' && ruler.length === 1) draw(); });
cv.addEventListener('pointerup', e => { cv.classList.remove('pan'); if (LS.hooks.up && LS.hooks.up(e)) return; if (drag && !drag.moved && tool === 'sel') select(hit(e.offsetX, e.offsetY)); drag = null; });
cv.addEventListener('dblclick', e => { if (LS.hooks.dbl && LS.hooks.dbl(e)) return; if (tool !== 'sel') return; const h = hit(e.offsetX, e.offsetY); if (h && (h.type === 'edge' || h.type === 'shape')) select(h, true); });
cv.addEventListener('wheel', e => { e.preventDefault(); const f = Math.exp(-e.deltaY * .0015), k = Math.max(8, Math.min(600, view.k * f)), r = k / view.k, [wx, wy] = s2w(e.offsetX, e.offsetY); view.k = k; view.x = e.offsetX - wx * k; view.y = e.offsetY + wy * k; draw(); }, { passive: false });
document.querySelectorAll('.tb[data-a]').forEach(b => b.onclick = () => {
  const a = b.dataset.a; if (a === 'fit') return fit(); if (a === 's') return toast(b.title + ' — coming in a later phase');
  tool = b.dataset.t; ruler = []; document.querySelectorAll('.tb[data-a=tool]').forEach(x => x.classList.toggle('on', x === b)); cv.classList.toggle('ruler', tool === 'ruler'); draw(); });
$('.tb[data-t=sel]').classList.add('on');
addEventListener('keydown', e => { if (/INPUT|SELECT/.test(e.target.tagName)) return; const k = e.key.toLowerCase();
  if (k === 'escape') { ruler = []; select(null); } else if (k === 'f') fit(); else if (k === 'v') $('.tb[data-t=sel]').click(); else if (k === 'h') $('.tb[data-t=pan]').click(); else if (k === 'r') $('.tb[data-t=ruler]').click(); });
/* ---------- run + loading progression ---------- */
const LOG = {
  auto: [[0, 'Reading room polygon'], [6, 'Validating geometry: area and vertices'], [14, 'Loading standard target and eligible fixture variants'], [26, 'Stage A: ranking candidate grids (direct light)'], [48, 'Stage A: candidates ranked'], [60, 'Stage B: re-verifying best candidates with interreflection'], [82, 'Sampling floor patches'], [92, 'Evaluating compliance'], [100, 'Done']],
  calc: [[0, 'Reading polygon and fixtures'], [10, 'Loading photometry (IES)'], [25, 'Sampling floor patches'], [45, 'Direct illuminance pass'], [65, 'Radiosity interreflection iterations'], [90, 'Evaluating uniformity and compliance'], [100, 'Done']]
};
document.body.insertAdjacentHTML('beforeend', `<div class="load" id="load"><div class="lw"><img class="b" id="lgo" alt=""><img class="t" id="lgo2" alt=""></div><div class="lp"><div class="lt"><span id="lpx">0 %</span><span id="lpt"></span></div><div class="lb"><i id="lbf"></i></div><div class="ll" id="llog"></div><button class="btn sq" id="lcx" style="background:none;color:var(--sc-red);border:1.5px solid var(--sc-red);margin-top:16px">Cancel</button></div></div>`);
function progress(log) {
  return new Promise(res => {
    const L = $('#load'), T = API.SIM_MS, t0 = performance.now(); let i = 0, dead = false; $('#lgo').src = $('#lgo2').src = lux(); $('#llog').innerHTML = ''; L.classList.add('show');
    const fin = ok => { dead = true; L.classList.remove('show'); res(ok); };
    $('#lcx').onclick = () => fin(false);
    (function tick(n) { if (dead) return; const p = Math.min(100, (n - t0) / T * 100), sec = Math.max(0, Math.ceil((T - (n - t0)) / 1000));
      $('#lgo2').style.clipPath = `inset(0 ${100 - p}% 0 0)`; $('#lbf').style.width = p + '%'; $('#lpx').textContent = Math.floor(p) + ' %'; $('#lpt').textContent = sec + ' s left';
      while (i < log.length && p >= log[i][0]) { const d = document.createElement('div'), e = Math.floor((n - t0) / 1000); d.textContent = `[00:${String(e).padStart(2, '0')}] ${log[i][1]}`; $('#llog').append(d); $('#llog').scrollTop = 1e6; i++; }
      p >= 100 ? setTimeout(() => fin(true), 400) : requestAnimationFrame(tick); })(t0);
  });
}
const bodyNow = () => ({ polygon: room.map(([x, y]) => ({ x, y })), ceilingHeight: LS.heights.ceiling, mountingHeight: LS.heights.mount, workPlaneHeight: LS.heights.wp, floorZone: 0.5, activityId: state.activityId, variantId: LS.variant, variantIds: null,
  fixtures: fix.map(f => ({ id: f.id, x: f.x, y: f.y, z: f.z || LS.heights.mount, rotation: f.rot || 0, tiltAngle: f.tilt || 0, variantId: f.variantId || null })) });
function runStudy() {
  if ($('#run').disabled) return;
  const job = PG === 'studio' ? API.calculateOptions(bodyNow()) : API.automate(bodyNow());
  progress(PG === 'studio' ? LOG.calc : LOG.auto).then(ok => { if (ok) job.then(showResult).catch(e => toast('Failed: ' + (e.message || 'see console'))); });
}
/* ---------- smooth heatmap: bilinear field over the workplane (room inset by the API offset), painted once per result ---------- */
const LUT = Array.from({ length: 256 }, (_, i) => fcol(i / 255).match(/\d+/g).map(Number));
function heatBuild(h) {
  h.ip = insetPoly(room, h.border); const ps = h.patches, st = h.step; let mx = 1e9, my = 1e9, Mx = -1e9, My = -1e9;
  ps.forEach(p => { mx = Math.min(mx, p.x); my = Math.min(my, p.y); Mx = Math.max(Mx, p.x); My = Math.max(My, p.y); });
  const nx = Math.round((Mx - mx) / st) + 1, ny = Math.round((My - my) / st) + 1, G = new Float32Array(nx * ny).fill(NaN); ps.forEach(p => G[Math.round((p.y - my) / st) * nx + Math.round((p.x - mx) / st)] = p.e);
  const xs = h.ip.map(p => p[0]), ys = h.ip.map(p => p[1]); h.x0 = Math.min(...xs); h.y1 = Math.max(...ys); const w = Math.max(...xs) - h.x0, hh = h.y1 - Math.min(...ys), ppm = Math.min(48, 1600 / Math.max(w, hh, 1)); h.w = w; h.h = hh;
  const iw = Math.max(2, Math.ceil(w * ppm)), ih = Math.max(2, Math.ceil(hh * ppm)), c = document.createElement('canvas'); c.width = iw; c.height = ih; const cx = c.getContext('2d'), im = cx.createImageData(iw, ih), rg = h.max - h.min || 1;
  for (let j = 0; j < ih; j++) for (let i = 0; i < iw; i++) {
    const gx = (h.x0 + (i + .5) / ppm - mx) / st, gy = (h.y1 - (j + .5) / ppm - my) / st, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy; let sum = 0, ws = 0;
    for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) { const X = ix + a, Y = iy + b; if (X < 0 || Y < 0 || X >= nx || Y >= ny) continue; const v = G[Y * nx + X]; if (v !== v) continue; const wt = (a ? fx : 1 - fx) * (b ? fy : 1 - fy) + 1e-6; sum += v * wt; ws += wt; }
    const o = (j * iw + i) * 4; if (!ws) continue; const col = LUT[Math.max(0, Math.min(255, Math.round((sum / ws - h.min) / rg * 255)))]; im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 255;
  }
  cx.putImageData(im, 0, 0); h.img = c; return h;
}
function paintHeat(g, h, ox, oy, k, a) {   /* screen = (ox + x*k, oy - y*k); clipped to the inset polygon so slanted walls stay crisp */
  g.save(); g.beginPath(); h.ip.forEach(([x, y], i) => { const X = ox + x * k, Y = oy - y * k; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.clip();
  g.globalAlpha = a; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(h.img, ox + h.x0 * k, oy - h.y1 * k, h.w * k, h.h * k); g.restore();
}
const heatOf = (sol, res) => {
  const P = sol.patches || (sol.totalFloor && res.floorPatches ? res.floorPatches.map((p, i) => ({ x: p.center.x, y: p.center.y, e: sol.totalFloor.values[i] })) : null); if (!P || !P.length) return null;
  return { patches: P, step: sol.step || (res.floorMeta && res.floorMeta.spacing) || .25, min: sol.minimum, max: sol.maximum, border: res.floorMeta && res.floorMeta.border != null ? res.floorMeta.border : .5 };
};
function paintSol(sol, res) {
  const h = heatOf(sol, res); heat = h ? heatBuild(h) : null;
  const b = document.querySelectorAll('.kv b'), v = [Math.round(sol.average) + ' lx', Math.round(sol.minimum) + ' lx', Math.round(sol.maximum) + ' lx', sol.uniformity.toFixed(2), (sol.powerW == null ? '—' : sol.powerW + ' W'), sol.recommended ? 'Pass' : 'Fail'];
  v.forEach((t, k) => b[k].textContent = t); $('#hint').textContent = `${sol.fixtureCount} fixtures · dummy local calculation`; $('#res').classList.remove('min'); draw();
}
async function showResult(res) {
  const vm = await API.variantMap(), all = [...res.solutions, ...(res.closestMiss ? [res.closestMiss] : [])];
  LS.options = all.map(sol => ({ sol, v: vm[sol.variantId] || { name: 'Variant', manufacturer: '', image: '', power: 0, lumens: 0, efficacy: 0, cri: 0, ip: '', mm: [0, 0, 0] }, heat: heatOf(sol, res), res }));
  LS.application = res.application; LS.target = res.target;
  if (!LS.options.length) return toast('Nothing viable — widen spacing steps or relax constraints');
  showOption(0); if (LS.openOptions && (LS.options.length > 1 || !LS.options[0].sol.recommended)) LS.openOptions();
}
function showOption(i) {
  const o = LS.options[i]; if (!o) return; LS.active = i; LS.variant = o.sol.variantId;
  if (PG !== 'studio') { fix = o.sol.placements.map(p => ({ id: p.id, x: p.x, y: p.y, z: p.z, rot: p.rotation || 0, tilt: p.tiltAngle || 0 })); rebuild(); LS.pattern = o.sol.grid; }
  paintSol(o.sol, o.res); $('#rvar').hidden = false; $('#rvar').innerHTML = `<b>${o.v.manufacturer ? o.v.manufacturer + ' · ' : ''}${o.v.name}</b><span>${o.sol.recommended ? '✓ Compliant' : '✕ ' + ({ under_target: 'Needs more light', over_cap: 'Over the cap', uniformity: 'Patchy — denser grid needed' }[o.sol.missReason] || 'Not compliant')}</span>`;
  $('#optBtn').hidden = LS.options.length < 2; $('#optBtn').textContent = `Available options (${LS.options.length})`; if ($('#advBtn')) $('#advBtn').hidden = false;
}
function advanced() {
  const o = LS.options && LS.options[LS.active]; if (!o) return;
  try { sessionStorage.setItem('lux.handoff', JSON.stringify({ from: PG, polygon: room, heights: LS.heights, activityId: state.activityId, categoryId: setup.categoryId || null, variantId: o.sol.variantId, placements: o.sol.placements, grid: o.sol.grid })); } catch (_) {}
  location.href = 'studio.html';
}
let rcT; LS.recalc = force => { clearTimeout(rcT); rcT = setTimeout(async () => { if ((!heat && !force) || room.length < 3 || !fix.length) return; try { const r = await API.calculate(bodyNow()); paintSol(r.solutions[0], r); } catch (_) {} }, force ? 0 : 220); };
LS.touch = () => { LS.options = null; LS.active = -1; $('#optBtn').hidden = true; };   /* manual edits make the compared options stale */
Object.assign(LS, { showOption, advanced, paintHeat, heatBuild, insetOf: (d) => insetPoly(room, d), emptyMsg: () => PG === 'cad' ? 'Upload a DWG / DXF drawing to begin' : PG === 'studio' ? 'Type the room dimensions or upload a CAD drawing' : 'Type the room dimensions to begin', bodyNow, draw, fit, gate, toast, select, w2s, s2w, css, nice, bbox, area, perim, inPoly, rebuild, rebuildDemo() { if (PG === 'studio' && LS.userFix) { fix = fix.filter(f => inPoly(f.x, f.y)); rebuild(); select(null); return; } fix = []; if (PG === 'studio') for (let y = 1.25; y < 60; y += 2.5) for (let x = 1.25; x < 60; x += 2.5) if (room.length > 2 && inPoly(x, y) && y < bbox()[3] && x < bbox()[2]) fix.push({ id: fix.length + 1, x, y }); heat = null; rebuild(); select(null); }, clearHeat() { heat = null; }, hasHeat: () => !!heat, dpr, cv });
Object.defineProperties(LS, { sel: { get: () => sel }, fix: { get: () => fix, set: v => { fix = v; rebuild(); } }, tool: { get: () => tool }, W: { get: () => W }, H: { get: () => H } });
size(); fit(); if (LS.boot) LS.boot();
})();
