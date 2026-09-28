/* CAD upload + room picker (cad.html and studio.html). Parsing is mocked in API.parseCad; the polygon it returns feeds the same room engine as typed dimensions. */
(() => {
const LS = window.LS; if (!LS || !['cad', 'studio'].includes(LS.PG)) return;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)], room = LS.room;
const C = LS.cad = { name: LS.setup.cadName || null, rooms: [], sel: -1 };
const area = P => Math.abs(P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const thumb = P => { const xs = P.map(p => p[0]), ys = P.map(p => p[1]), w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1, k = Math.min(34 / w, 26 / h), x0 = Math.min(...xs), y1 = Math.max(...ys);
  return `<svg viewBox="0 0 40 32"><path d="${P.map((p, i) => (i ? 'L' : 'M') + (3 + (p[0] - x0) * k + (34 - w * k) / 2).toFixed(1) + ' ' + (3 + (y1 - p[1]) * k + (26 - h * k) / 2).toFixed(1)).join('')}Z"/></svg>`; };
const roomsHtml = () => C.rooms.length ? `<h4>Rooms found (${C.rooms.length})</h4><div class="rooms">${C.rooms.map((r, i) => `<button class="rmc${i === C.sel ? ' on' : ''}" data-r="${i}">${thumb(r.polygon)}<span><b>${r.name}</b><small>${area(r.polygon).toFixed(1)} m² · ${r.polygon.length} corners</small></span></button>`).join('')}</div>` : '<p class="cap">No drawing loaded yet.</p>';
const fld = (id, l, v) => `<label>${l}<div class="u"><input type="number" id="${id}" value="${v}" step=".05" min="0" inputmode="decimal"><i>m</i></div></label>`;

LS.FLY.Drawing = () => `<h3>Drawing</h3><p class="cap">Upload a DWG or DXF, then pick the room to study. You can upload another drawing at any time.</p>
<label class="drop"><input type="file" id="cadIn" accept=".dwg,.dxf"><svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16"/></svg><b>Upload new CAD</b><small id="cadNm">${C.name || 'DWG or DXF — no file yet'}</small></label>
<div id="cadRooms">${roomsHtml()}</div>`;
LS.AFTER.Drawing = () => { $('#cadIn').onchange = e => e.target.files[0] && ingest(e.target.files[0]); bindRooms(); };
if (LS.PG === 'cad') {
  LS.FLY['Room picker'] = () => `<h3>Room picker</h3><div id="cadRooms">${roomsHtml()}</div><h4>Heights</h4><div class="f2">${fld('hC', 'Ceiling height', LS.heights.ceiling)}${fld('hM', 'Mounting height', LS.heights.mount)}${fld('hW', 'Work plane height', LS.heights.wp)}</div><p class="msg" id="rmMsg" hidden></p>`;
  LS.AFTER['Room picker'] = () => { bindRooms(); const h = LS.heights;
    const chk = () => { const m = !(h.ceiling > 0 && h.mount > 0) ? 'Ceiling and mounting height must be greater than 0.' : h.mount > h.ceiling ? 'Mounting height cannot be above the ceiling height.' : h.wp < 0 ? 'Work-plane height cannot be negative.' : h.wp >= h.mount ? 'Work plane must sit below the mounting height.' : null; LS.invalid = m; LS.gate(); const el = $('#rmMsg'); if (el) { el.textContent = m || ''; el.hidden = !m; } };
    [['hC', 'ceiling'], ['hM', 'mount'], ['hW', 'wp']].forEach(([id, k]) => $('#' + id).oninput = e => { h[k] = +e.target.value; chk(); }); chk(); };
}
function bindRooms() { $$('#cadRooms .rmc').forEach(b => b.onclick = () => load(+b.dataset.r)); }
function refresh() { const el = $('#cadRooms'); if (el) { el.innerHTML = roomsHtml(); bindRooms(); } const n = $('#cadNm'); if (n) n.textContent = C.name || 'DWG or DXF — no file yet'; }
function load(i) {
  const r = C.rooms[i]; if (!r) return; C.sel = i;
  if (LS.loadPolygon) LS.loadPolygon(r.polygon);
  else { const x0 = Math.min(...r.polygon.map(p => p[0])), y0 = Math.min(...r.polygon.map(p => p[1])); room.splice(0, room.length, ...r.polygon.map(p => [+(p[0] - x0).toFixed(4), +(p[1] - y0).toFixed(4)])); LS.hideLabels = room.length > 12; LS.rebuildDemo(); document.querySelectorAll('.kv b').forEach(b => b.textContent = '—'); LS.gate(); LS.fit(); }
  refresh(); LS.toast('Loaded ' + r.name);
}
async function ingest(file) {
  const nm = $('#cadNm'); if (nm) nm.textContent = 'Reading ' + file.name + '…';
  try { const r = await API.parseCad(file); C.name = file.name; C.rooms = r.rooms; load(0); } catch (e) { LS.toast('Could not read the drawing'); refresh(); }
}
if (LS.PG === 'cad') {   /* a drawing chosen on the landing page arrives by name only (mock); otherwise wait for an upload */
  const open = k => { const b = $('.ib[data-k="' + k + '"]'); b && b.click(); };
  if (C.name) API.parseCad({ name: C.name }).then(r => { C.rooms = r.rooms; load(0); open('room'); }); else open('cad');
}
})();
