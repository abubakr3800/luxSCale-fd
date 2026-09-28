/* Full fixture editing in Study Studio (API v2 §4.3 free placement, §9.7 drag-and-drop):
   drag with snap + inside-polygon check, add / delete / duplicate, per-fixture variant, height, rotation 0-360, tilt 0-90,
   editable spacing (click a dashed line), replace all, array copy, layout pattern (count / spacing), undo / redo.
   Every edit re-runs the calculation (debounced) when a result is on screen. */
(() => {
const LS = window.LS; if (!LS || LS.PG !== 'studio') return;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
let VM = {}; API.variantMap().then(m => VM = m);
const hist = { s: [], i: -1 }, snap = () => JSON.stringify(LS.fix);
const mark = () => { const c = snap(); if (hist.s[hist.i] !== c) { hist.s.length = hist.i + 1; hist.s.push(c); hist.i = hist.s.length - 1; if (hist.s.length > 100) { hist.s.shift(); hist.i--; } } };
const after = () => { LS.rebuild(); LS.draw(); LS.persist(); LS.touch(); LS.recalc(); };
const commit = fn => { mark(); fn(); LS.userFix = true; mark(); after(); };
const nextId = () => Math.max(0, ...LS.fix.map(f => f.id)) + 1, r3 = v => +(+v).toFixed(3);
const num = (id, l, v, st = .05, mn = 0, mx = '') => `<label>${l}<input type="number" id="${id}" value="${v}" step="${st}" min="${mn}" max="${mx}"></label>`;
const varOpts = sel => Object.values(VM).map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${x.manufacturer} · ${x.name}</option>`).join('');
const selF = () => LS.sel && LS.sel.type === 'fix' ? LS.sel.f : null;
let snapOn = true, add = false, dr = null;
const stp = () => LS.view.k > 150 ? .05 : LS.view.k > 50 ? .1 : .25;
const pt = e => { const [x, y] = LS.s2w(e.offsetX, e.offsetY); if (!snapOn || e.altKey) return [x, y]; const s = stp(); return [Math.round(x / s) * s, Math.round(y / s) * s]; };
const fixAt = e => LS.fix.find(f => { const [x, y] = LS.w2s(f.x, f.y), r = Math.max(8, .2 * LS.view.k) + 3; return Math.abs(e.offsetX - x) < r && Math.abs(e.offsetY - y) < r; });
const msg = (id, t) => { const el = $('#' + id); if (el) { el.textContent = t || ''; el.hidden = !t; } };

/* ---- canvas: drag / add ---- */
const pd = LS.hooks.down, pm = LS.hooks.move, pu = LS.hooks.up;
LS.hooks.down = e => {
  if (add) { const [x, y] = pt(e); if (!LS.inPoly(x, y)) LS.toast('Fixtures must sit inside the room'); else commit(() => LS.fix.push({ id: nextId(), x: r3(x), y: r3(y) })); return true; }
  if (LS.tool === 'sel') { const f = fixAt(e); if (f) { mark(); dr = { f, moved: false }; LS.select({ type: 'fix', f }); return true; } }
  return pd ? pd(e) : false;
};
LS.hooks.move = e => {
  if (dr) { const [x, y] = pt(e); if (LS.inPoly(x, y)) { dr.f.x = r3(x); dr.f.y = r3(y); dr.moved = true; LS.rebuild(); LS.draw(); if ($('#fX')) { $('#fX').value = dr.f.x; $('#fY').value = dr.f.y; } } return true; }
  return pm ? pm(e) : false;
};
LS.hooks.up = e => { if (dr) { const m = dr.moved; dr = null; if (m) { LS.userFix = true; mark(); LS.persist(); LS.touch(); LS.recalc(); } return true; } return pu ? pu(e) : false; };

/* ---- inspector: fixture ---- */
LS.inspFix = (f, b) => {
  const v = VM[f.variantId || LS.variant];
  b.innerHTML = `<h3>Fixture F${f.id}</h3>${v ? `<img class="pic" src="${v.image}" alt="">` : '<div class="ph">Fixture image</div>'}
  <label>Variant<select id="fVar"><option value="">Project default${VM[LS.variant] ? ' — ' + VM[LS.variant].name : ''}</option>${varOpts(f.variantId)}</select></label>
  <div class="f2">${num('fX', 'X (m)', f.x)}${num('fY', 'Y (m)', f.y)}${num('fZ', 'Mounting height (m)', f.z || LS.heights.mount)}${num('fR', 'Rotation (°)', f.rot || 0, 1, 0, 360)}${num('fT', 'Tilt (°)', f.tilt || 0, 1, 0, 90)}</div>
  <p class="msg" id="fMsg" hidden></p><div class="act"><button class="ghost" id="fDup">Duplicate</button><button class="ghost" id="fDel">Delete</button></div>`;
  $('#fVar').onchange = e => { commit(() => f.variantId = e.target.value || null); LS.inspFix(f, b); };
  const set = (id, fn, chk) => $('#' + id).onchange = e => { const val = +e.target.value; const m = chk(val); msg('fMsg', m); if (m || isNaN(val)) return LS.inspFix(f, b); commit(() => fn(val)); msg('fMsg', ''); };
  const inside = (x, y) => LS.inPoly(x, y) ? null : 'Fixtures must sit inside the room.';
  set('fX', v => f.x = r3(v), v => inside(v, f.y)); set('fY', v => f.y = r3(v), v => inside(f.x, v));
  set('fZ', v => f.z = r3(v), v => v <= 0 || v > LS.heights.ceiling ? 'Mounting height must be above 0 and not above the ceiling height.' : null);
  set('fR', v => f.rot = v, v => v < 0 || v > 360 ? 'Rotation must be between 0° and 360°.' : null);
  set('fT', v => f.tilt = v, v => v < 0 || v > 90 ? 'Tilt must be between 0° and 90°.' : null);
  $('#fDel').onclick = () => { commit(() => LS.fix = LS.fix.filter(o => o !== f)); LS.select(null); };
  $('#fDup').onclick = () => { const o = [[.5, .5], [-.5, -.5], [.5, -.5], [-.5, .5]].map(d => [f.x + d[0], f.y + d[1]]).find(p => LS.inPoly(p[0], p[1])); if (!o) return LS.toast('No room for a copy next to this fixture'); const n = { ...f, id: nextId(), x: r3(o[0]), y: r3(o[1]) }; commit(() => LS.fix.push(n)); LS.select({ type: 'fix', f: n }); };
};
/* ---- inspector: spacing (moving a gap shifts every fixture beyond it) ---- */
LS.inspDash = (s, b) => {
  b.innerHTML = `<h3>Spacing</h3><p class="cap">${s.t}</p><label>Distance (m)<input type="number" id="dD" step=".05" min=".05" value="${s.d.toFixed(3)}"></label><p class="cap">Changing this gap shifts every fixture beyond it along ${s.ax.toUpperCase()}.</p><p class="msg" id="dMsg" hidden></p>`;
  $('#dD').onchange = e => { const nv = +e.target.value, dl = nv - s.d, moved = LS.fix.filter(f => f[s.ax] >= s.k - 1e-3);
    if (!(nv >= .05)) return msg('dMsg', 'Distance must be at least 0.05 m.');
    if (moved.some(f => !LS.inPoly(s.ax === 'x' ? f.x + dl : f.x, s.ax === 'y' ? f.y + dl : f.y))) return msg('dMsg', 'That would push a fixture outside the room.');
    commit(() => moved.forEach(f => f[s.ax] = r3(f[s.ax] + dl))); LS.select(null); };
};

/* ---- toolbar ---- */
const B = t => $('.tb[data-t="' + t + '"]'), go = (t, fn) => { const b = B(t); b.classList.remove('soon'); b.onclick = fn; };
const setAdd = v => { add = v; B('add').classList.toggle('on', v); LS.cv.classList.toggle('draw', v); if (v) LS.toast('Click inside the room to place fixtures — Esc to stop'); };
$$('.tb[data-a=tool]').forEach(b => b.addEventListener('click', () => setAdd(false)));
const need = () => selF() || (LS.toast('Select a fixture first'), null);
const del = () => { const f = need(); if (f) { commit(() => LS.fix = LS.fix.filter(o => o !== f)); LS.select(null); } };
const undo = () => { mark(); if (hist.i > 0) { hist.i--; LS.fix = JSON.parse(hist.s[hist.i]); LS.userFix = true; LS.select(null); after(); } else LS.toast('Nothing to undo'); };
const redo = () => { if (hist.i < hist.s.length - 1) { hist.i++; LS.fix = JSON.parse(hist.s[hist.i]); LS.userFix = true; LS.select(null); after(); } else LS.toast('Nothing to redo'); };
go('add', () => setAdd(!add)); go('del', del); go('undo', undo); go('redo', redo);
go('rot', () => { if (need()) { $('#fR').focus(); $('#fR').select(); } }); go('tilt', () => { if (need()) { $('#fT').focus(); $('#fT').select(); } }); go('rep', () => { if (need()) $('#fVar').focus(); });
go('snap', () => { snapOn = !snapOn; B('snap').classList.toggle('on', snapOn); LS.toast('Snapping ' + (snapOn ? 'on' : 'off') + ' (hold Alt to bypass)'); }); B('snap').classList.add('on');
function pop(btn, html, bind) { closePop(); const p = document.createElement('div'), r = btn.getBoundingClientRect(); p.className = 'pop'; p.id = 'pop'; p.style.left = Math.min(r.left, innerWidth - 300) + 'px'; p.style.top = r.bottom + 8 + 'px'; p.innerHTML = html; document.body.append(p); bind(p); setTimeout(() => addEventListener('pointerdown', away), 0); }
const away = e => { const p = $('#pop'); if (p && !p.contains(e.target)) closePop(); }, closePop = () => { const p = $('#pop'); if (p) p.remove(); removeEventListener('pointerdown', away); };
go('repall', () => pop(B('repall'), `<h4>Replace all fixtures</h4><label>Variant<select id="paV"><option value="">Project default (compare all variants)</option>${varOpts('')}</select></label><button class="btn sq" id="paGo">Apply to all ${LS.fix.length}</button>`, p => $('#paGo', p).onclick = () => { const v = $('#paV').value || null; commit(() => LS.fix.forEach(f => f.variantId = v)); closePop(); }));
go('copy', () => { const f = need(); if (!f) return; pop(B('copy'), `<h4>Copy / array</h4><p class="cap">Repeat F${f.id} on a grid.</p><div class="f2">${num('caX', 'Count X', 3, 1, 1)}${num('caY', 'Count Y', 2, 1, 1)}${num('csX', 'Spacing X (m)', 2.5)}${num('csY', 'Spacing Y (m)', 2.5)}</div><button class="btn sq" id="caGo">Create array</button>`, () => $('#caGo').onclick = () => {
  const cx = +$('#caX').value, cy = +$('#caY').value, sx = +$('#csX').value, sy = +$('#csY').value; let n = 0, skip = 0; const add2 = [];
  for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) { if (!i && !j) continue; const x = r3(f.x + i * sx), y = r3(f.y + j * sy); if (!LS.inPoly(x, y) || LS.fix.some(o => Math.hypot(o.x - x, o.y - y) < .05)) { skip++; continue; } add2.push({ ...f, id: nextId() + add2.length, x, y }); n++; }
  if (!n) return LS.toast('Nothing added — every position is outside the room or occupied'); commit(() => LS.fix.push(...add2)); closePop(); LS.toast(`Added ${n} fixture${n > 1 ? 's' : ''}${skip ? ', skipped ' + skip : ''}`); }); });
addEventListener('keydown', e => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(e.target.tagName); if (typing) return; const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'y')) { e.preventDefault(); (k === 'y' || e.shiftKey) ? redo() : undo(); }
  else if ((k === 'delete' || k === 'backspace') && selF()) { e.preventDefault(); e.stopImmediatePropagation(); del(); }
  else if (k === 'escape') { setAdd(false); closePop(); }
}, true);

/* ---- layout pattern flyout (API v2 §4.3 grid.count / grid.spacing) ---- */
const P = { mode: 'spacing', cx: 3, cy: 2, of: .5, sx: 2.5, sy: 2.5, auto: true, seeded: false };
LS.FLY['Layout pattern'] = () => { if (!P.seeded && LS.pattern) { P.sx = +LS.pattern.spacingX.toFixed(3); P.sy = +LS.pattern.spacingY.toFixed(3); P.auto = true; } P.seeded = true;
  return `<h3>Layout pattern</h3><p class="cap">Generate a regular grid over the room. Positions outside the room are dropped.</p>
<div class="seg"><button data-pm="count">By count</button><button data-pm="spacing">By spacing</button></div>
<div class="f2" id="lpC">${num('pcx', 'Count X', P.cx, 1, 1)}${num('pcy', 'Count Y', P.cy, 1, 1)}${num('pof', 'Wall offset (× spacing)', P.of, .05, 0, 1)}</div>
<div class="f2" id="lpS">${num('psx', 'Spacing X (m)', P.sx)}${num('psy', 'Spacing Y (m)', P.sy)}<label class="chk"><input type="checkbox" id="pau" ${P.auto ? 'checked' : ''}> Auto-centre</label></div>
<button class="btn sq" id="lpGo" style="width:100%;margin-top:14px">Apply layout</button><p class="msg" id="lpMsg" hidden></p><p class="cap">Tip: click any dashed line on the plan to edit a single gap.</p>`; };
LS.AFTER['Layout pattern'] = () => {
  const tabs = () => { $$('.seg button[data-pm]').forEach(b => b.classList.toggle('on', b.dataset.pm === P.mode)); $('#lpC').hidden = P.mode !== 'count'; $('#lpS').hidden = P.mode !== 'spacing'; };
  $$('.seg button[data-pm]').forEach(b => b.onclick = () => { P.mode = b.dataset.pm; tabs(); }); tabs();
  [['pcx', 'cx'], ['pcy', 'cy'], ['pof', 'of'], ['psx', 'sx'], ['psy', 'sy']].forEach(([id, k]) => $('#' + id).oninput = e => P[k] = +e.target.value); $('#pau').onchange = e => P.auto = e.target.checked;
  $('#lpGo').onclick = () => {
    const [x0, y0, x1, y1] = LS.bbox(), ax = (mn, mx, n, sp) => { if (P.mode === 'count') { if (n === 1) return [(mn + mx) / 2]; const S = (mx - mn) / (n - 1 + 2 * P.of); return Array.from({ length: n }, (_, i) => mn + S * P.of + i * S); }
      if (P.auto) { const N = Math.max(1, Math.round((mx - mn) / sp)), mid = (mn + mx) / 2; return Array.from({ length: N }, (_, i) => mid + (i - (N - 1) / 2) * sp); }
      const o = []; for (let v = mn + sp / 2; v <= mx - sp / 2 + 1e-9; v += sp) o.push(v); return o.length ? o : [(mn + mx) / 2]; };
    if (P.mode === 'count' ? !(P.cx >= 1 && P.cy >= 1 && P.of >= 0 && P.of <= 1) : !(P.sx > 0 && P.sy > 0)) return msg('lpMsg', 'Counts must be 1 or more, the offset between 0 and 1, spacings above 0.');
    const xs = ax(x0, x1, Math.round(P.cx), P.sx), ys = ax(y0, y1, Math.round(P.cy), P.sy), pts = []; ys.forEach(y => xs.forEach(x => LS.inPoly(x, y) && pts.push([x, y])));
    if (!pts.length) return msg('lpMsg', 'No fixture position falls inside the room.'); if (pts.length > 400) return msg('lpMsg', 'That is more than 400 fixtures — widen the spacing.'); msg('lpMsg', '');
    const v0 = LS.fix.length && LS.fix.every(f => f.variantId === LS.fix[0].variantId) ? LS.fix[0].variantId : null;
    commit(() => LS.fix = pts.map((p, i) => ({ id: i + 1, x: r3(p[0]), y: r3(p[1]), variantId: v0 }))); LS.toast(pts.length + ' fixtures placed'); };
};

/* ---- arrived from Auto / CAD "Advanced edit" ---- */
const H = LS.handoffPending;
if (H) { LS.recalc(true); mark(); API.variantMap().then(m => { VM = m; const v = m[H.variantId] || {}, rv = $('#rvar'); if (rv) { rv.hidden = false; rv.innerHTML = `<b>${v.manufacturer ? v.manufacturer + ' · ' : ''}${v.name || 'Variant'}</b><span>From ${H.from === 'cad' ? 'CAD' : 'Auto'} Study</span>`; } });
  setTimeout(() => { const b = $('.ib[data-k=pat]'); b && b.click(); LS.toast(`${H.placements.length} fixtures loaded from ${H.from === 'cad' ? 'CAD' : 'Auto'} Study — everything is editable`); }, 400); }
})();
