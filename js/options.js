/* "Available options" modal — every study can return several fixture options; "Show on plan" opens one on the current page,
   "Advanced edit" (Auto / CAD) hands it to Study Studio with its spacing. */
(() => {
const LS = window.LS; if (!LS) return;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NAME = { auto: 'Auto Study', cad: 'CAD Study', studio: 'Study Studio' }[LS.PG];
document.body.insertAdjacentHTML('beforeend', `<dialog id="odlg" class="odlg" aria-labelledby="oT"><header class="oh"><div><p class="eyebrow">${NAME} · results</p><h2 id="oT">Available options</h2><p class="cap" id="oSub"></p></div><div class="ofil" id="oFil" role="tablist"></div><button class="ox" id="oX" aria-label="Close" type="button">×</button></header><div class="onote" id="oNote" hidden></div><div class="ogrid" id="oGrid"></div></dialog>`);
const dlg = $('#odlg'); let filter = 'all';
const WHY = { under_target: 'Needs more light', over_cap: 'Too bright — over the overdesign cap', uniformity: 'Average is fine but patchy — denser grid needed' };
const ICO = { ok: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>', no: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>' };

function mini(c, o) {
  const g = c.getContext('2d'), W = c.width, H = c.height, room = LS.room, xs = room.map(p => p[0]), ys = room.map(p => p[1]), x0 = Math.min(...xs), w = Math.max(...xs) - x0 || 1, y0 = Math.min(...ys), h = Math.max(...ys) - y0 || 1;
  const k = Math.min((W - 16) / w, (H - 16) / h), ox = (W - w * k) / 2 - x0 * k, oy = (H - h * k) / 2 + (y0 + h) * k, path = () => { g.beginPath(); room.forEach(([x, y], i) => i ? g.lineTo(ox + x * k, oy - y * k) : g.moveTo(ox + x * k, oy - y * k)); g.closePath(); };
  g.clearRect(0, 0, W, H); path(); g.fillStyle = 'rgba(235,27,38,.08)'; g.fill();
  if (o.heat) { if (!o.heat.img) LS.heatBuild(o.heat); LS.paintHeat(g, o.heat, ox, oy, k, .95); } else { g.fillStyle = '#999'; g.font = '11px Poppins, sans-serif'; g.textAlign = 'center'; g.fillText('No heatmap', W / 2, H / 2); }
  path(); g.strokeStyle = '#eb1b26'; g.lineWidth = 2; g.stroke();
  o.sol.placements.forEach(p => { g.beginPath(); g.arc(ox + p.x * k, oy - p.y * k, 2.6, 0, 7); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); });
}
function count(el, to, d, delay) { const t0 = performance.now() + delay; (function f(n) { const p = Math.max(0, Math.min(1, (n - t0) / 750)), e = 1 - (1 - p) ** 3; el.textContent = (to * e).toFixed(d); if (p < 1) requestAnimationFrame(f); })(performance.now()); }

function render() {
  const O = LS.options || [], good = O.filter(o => o.sol.recommended).length, T = LS.target || {};
  $('#oSub').textContent = `${O.length} option${O.length === 1 ? '' : 's'} · ${good} compliant · target ${T.avgLux || '—'} lx, U0 ≥ ${T.uniformity || '—'}`;
  $('#oFil').innerHTML = [['all', 'All', O.length], ['ok', 'Compliant', good]].map(([k, l, n]) => `<button role="tab" class="${filter === k ? 'on' : ''}" data-f="${k}">${l} <b>${n}</b></button>`).join('');
  $$('#oFil button').forEach(b => b.onclick = () => { filter = b.dataset.f; render(); });
  const note = $('#oNote'), notes = [];
  if (LS.application) notes.push(`Using ${LS.application} fixtures because the mounting height is ${LS.application === 'interior' ? '3 m or below' : 'above 3 m'}.`);
  if (!good) notes.push('No compliant layout — the closest options are shown. Lower the target, allow more overdesign, or add dimmer variants.');
  note.hidden = !notes.length; note.innerHTML = notes.map(n => `<p>${n}</p>`).join('');
  const list = O.map((o, i) => [o, i]).filter(([o]) => filter === 'all' || o.sol.recommended);
  $('#oGrid').innerHTML = list.length ? list.map(([o, i], n) => { const s = o.sol, v = o.v, od = s.overdesign * 100, ok = s.recommended;
    return `<article class="oc${i === LS.active ? ' active' : ''}" style="--i:${n}"><div class="oi"><img src="${v.image}" alt="${v.name}"><canvas class="om" width="280" height="190" data-i="${i}" aria-label="Heatmap preview"></canvas>
<span class="bdg ${ok ? 'ok' : 'no'}">${ok ? ICO.ok + 'Compliant' : ICO.no + 'Not compliant'}</span>${n === 0 && ok ? '<span class="best">Best match</span>' : ''}${i === LS.active ? '<span class="cur">Showing</span>' : ''}</div>
<div class="ob"><p class="eyebrow">${v.manufacturer || 'Fixture'}</p><h3>${v.name}</h3>
<div class="okv"><div><small>Fixtures</small><b data-n="${s.fixtureCount}" data-d="0">0</b></div><div><small>Eavg</small><b data-n="${s.average}" data-d="0">0</b><i>lx</i></div><div><small>U0</small><b data-n="${s.uniformity}" data-d="2">0</b></div><div><small>Power</small><b data-n="${s.powerW || 0}" data-d="0">0</b><i>W</i></div></div>
<p class="omsg ${ok ? 'g' : 'b'}">${ok ? 'Meets the target' : WHY[s.missReason] || 'Below the requirement'} · ${od >= 0 ? '+' : ''}${od.toFixed(0)} % vs target${s.powerDensity ? ' · ' + s.powerDensity.toFixed(1) + ' W/m²' : ''}</p>
<div class="ospec"><span>${Math.round(v.lumens)} lm</span><span>${v.efficacy} lm/W</span><span>CRI ${v.cri}</span><span>${v.ip}</span><span>${v.mm.join(' × ')} mm</span></div>
<div class="oact"><button class="btn sq" data-show="${i}"${o.heat || LS.PG !== 'studio' ? '' : ''}>Show on plan</button>${LS.PG !== 'studio' ? `<button class="ghost" data-adv="${i}">Advanced edit</button>` : ''}</div></div></article>`; }).join('') : '<p class="cap" style="padding:20px">No compliant options.</p>';
  $$('#oGrid canvas').forEach(c => mini(c, O[+c.dataset.i]));
  $$('#oGrid .okv b').forEach((b, k) => count(b, +b.dataset.n, +b.dataset.d, 250 + (Math.floor(k / 4)) * 70));
  $$('#oGrid [data-show]').forEach(b => b.onclick = () => { LS.showOption(+b.dataset.show); dlg.close(); });
  $$('#oGrid [data-adv]').forEach(b => b.onclick = () => { LS.showOption(+b.dataset.adv); LS.advanced(); });
}
LS.openOptions = () => { if (!LS.options || !LS.options.length) return; filter = 'all'; render(); if (!dlg.open) dlg.showModal(); };
$('#oX').onclick = () => dlg.close(); dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
$('#optBtn').onclick = LS.openOptions; if ($('#advBtn')) $('#advBtn').onclick = () => LS.advanced();
})();
