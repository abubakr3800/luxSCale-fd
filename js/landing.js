if (typeof API === 'undefined') { console.warn('js/api.js missing'); window.API = { categories: async () => [], standards: async () => [] }; }
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* theme */
const setTheme = t => { document.documentElement.dataset.theme = t;
  $('#logo').src = 'assets/lux-logo-' + t + '.svg';
  $('#railLogo').src = 'https://shortcircuit.company/assets/img/' + (t === 'dark' ? 'logo-dark.svg' : 'logo.svg'); };
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

/* typing */
async function type(el, txt, d = 55) { for (const c of txt) { el.textContent += c; if (!reduce) await sleep(d); } }
(async () => {
  const t1 = $('#t1');
  if (reduce) { t1.innerHTML = 'Light it right. <em>Prove it.</em>'; $('#sub').textContent = 'Lighting studies that close the circuit between design and proof.'; }
  else {
    await sleep(1400);
    await type(t1, 'Light it right. ');
    const em = document.createElement('em'); t1.append(em); await type(em, 'Prove it.');
    await type($('#sub'), 'Lighting studies that close the circuit between design and proof.', 22);
  }
  $$('.reveal').forEach((e, i) => setTimeout(() => e.classList.add('in'), reduce ? 0 : i * 120));
  const b = $('[data-count]'), to = +b.dataset.count, t0 = performance.now();
  (function tick(n) { const p = Math.min((n - t0) / 1200, 1); b.textContent = b.dataset.pre + (to * p).toFixed(1); if (p < 1) requestAnimationFrame(tick); })(t0);
})();

/* textured background: blueprint grid + circuit traces + cursor lux falloff */
(() => {
  const c = $('#bg'), g = c.getContext('2d'), CELL = 40; let W, H, traces = [], mx = -999, my = -999;
  const size = () => { W = c.width = innerWidth; H = c.height = innerHeight;
    traces = Array.from({ length: 14 }, () => { const pts = [[Math.round(Math.random() * W / CELL) * CELL, Math.round(Math.random() * H / CELL) * CELL]];
      for (let i = 0; i < 5; i++) { const [x, y] = pts[i]; pts.push(i % 2 ? [x, y + (Math.random() < .5 ? -1 : 1) * CELL * (1 + Math.floor(Math.random() * 4))] : [x + (Math.random() < .5 ? -1 : 1) * CELL * (1 + Math.floor(Math.random() * 4)), y]); }
      return { pts, t: Math.random() }; }); };
  addEventListener('resize', size); size();
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
  function frame() {
    const dark = document.documentElement.dataset.theme === 'dark', line = dark ? '255,255,255' : '0,0,0';
    g.clearRect(0, 0, W, H);
    for (let x = 0; x < W; x += CELL) for (let y = 0; y < H; y += CELL) {           /* inverse-square lux falloff around cursor */
      const d2 = (x - mx) ** 2 + (y - my) ** 2, lux = Math.min(1, 9000 / (d2 + 9000));
      g.fillStyle = `rgba(235,27,38,${lux * .28})`; g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      g.fillStyle = `rgba(${line},.06)`; g.fillRect(x, y, CELL, 1); g.fillRect(x, y, 1, CELL); }
    g.lineWidth = 1.5;
    traces.forEach(tr => { g.strokeStyle = `rgba(${line},.12)`; g.beginPath(); tr.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
      if (!reduce) { tr.t = (tr.t + .004) % 1; const seg = tr.pts.length - 1, f = tr.t * seg, i = Math.floor(f), a = tr.pts[i], b = tr.pts[i + 1], k = f - i;
        g.fillStyle = '#eb1b26'; g.beginPath(); g.arc(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 3, 0, 7); g.fill(); } });
    if (!reduce) requestAnimationFrame(frame);
  }
  frame();
})();

/* arch */
const TOOLS = [
  { n: 'Auto Study', d: 'Backend picks fixtures and spacing', href: '#auto' },
  { n: 'Study Studio', d: 'Choose spacing, count and layout pattern', href: 'studio.html' },
  { n: 'CAD Study', d: 'Start from your DWG drawing', href: 'cad.html' },
  { n: 'Chat with LuxSCale', d: 'Coming soon', off: true }
];
(() => {
  const svg = $('#archSvg'), C = 300, R1 = 290, R0 = 120, pt = (r, a) => [C + r * Math.cos(a), C - r * Math.sin(a)];
  let h = `<path class="bk" d="M8 300A292 292 0 0 1 592 300Z"/><text id="ct" x="300" y="246">Choose a tool</text><text id="cd" x="300" y="268">Hover a segment</text>`;
  TOOLS.forEach((t, i) => {
    const a0 = Math.PI - i * Math.PI / 4 - .012, a1 = Math.PI - (i + 1) * Math.PI / 4 + .012, m = (a0 + a1) / 2;
    const [x0, y0] = pt(R1, a0), [x1, y1] = pt(R1, a1), [x2, y2] = pt(R0, a1), [x3, y3] = pt(R0, a0), [lx, ly] = pt(205, m);
    h += `<g><path class="w${t.off ? ' off' : ''}" tabindex="${t.off ? -1 : 0}" role="menuitem" data-i="${i}" style="--i:${i};--dx:${Math.cos(m) * 12}px;--dy:${-Math.sin(m) * 12}px"
      d="M${x0} ${y0}A${R1} ${R1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 0 0 ${x3} ${y3}Z"/>
      <text class="wn" x="${lx}" y="${ly - 4}">0${i + 1}</text><text class="wl" x="${lx}" y="${ly + 14}" opacity="${t.off ? .4 : 1}">${t.n}</text></g>`;
  });
  svg.innerHTML = h;
  $$('.w', svg).forEach(w => { const t = TOOLS[w.dataset.i];
    const on = () => { $('#ct').textContent = t.n; $('#cd').textContent = t.d; };
    w.onmouseenter = w.onfocus = on;
    w.onclick = () => { if (t.off) return; t.href[0] === '#' ? (close(), openModal()) : location.href = t.href; }; });
  $('#sheet').innerHTML = TOOLS.map(t => `<a class="card" ${t.off ? 'style="opacity:.4"' : `href="${t.href}"`}><h3>${t.n}</h3><p>${t.d}</p></a>`).join('');
  const btn = $('#start'), cta = $('#cta');
  const close = () => { cta.classList.remove('open'); $('#sheet').classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  btn.onclick = () => { const o = cta.classList.toggle('open'); $('#sheet').classList.toggle('open', o); btn.setAttribute('aria-expanded', o); };
  addEventListener('keydown', e => e.key === 'Escape' && close());
  $('#scrim').onclick = close; window.closeArch = close;
})();

/* modal */
const modal = $('#modal'); function openModal() { modal.showModal(); }
$('#mx').onclick = () => modal.close();
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
$('[data-open]').onclick = e => { e.preventDefault(); window.closeArch && closeArch(); openModal(); };

/* setup modal: shape + optional standard + CAD */
(async () => {
  const cats = await API.categories(); $('#cat').innerHTML = '<option value="">— none —</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const load = async () => { const s = $('#cat').value ? await API.standards($('#cat').value) : []; $('#act').innerHTML = '<option value="">— none —</option>' + s.map(x => `<option value="${x.id}">${x.name}</option>`).join(''); };
  $('#cat').onchange = load; load();
  $('#hasCad').onchange = e => $('#cadRow').hidden = !e.target.checked;
  $('#setup').onsubmit = async e => {
    e.preventDefault(); const cad = $('#hasCad').checked, file = $('#cadFile').files[0];
    const s = { shape: $('[name=shape]:checked').value, categoryId: $('#cat').value || null, activityId: $('#act').value || null, cad, cadName: file ? file.name : null };
    try { sessionStorage.setItem('lux.setup', JSON.stringify(s)); ['auto', 'cad', 'studio'].forEach(k => sessionStorage.removeItem('lux.room.' + k)); } catch (_) {}
    location.href = cad ? 'cad.html' : 'auto.html';
  };
})();
