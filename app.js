'use strict';

// Versión de la app (se ve en la pantalla de inicio). Arreglos y ajustes: 0.1.x; novedades: 0.x.0.
const APP_VERSION = '0.1.1';
// Uso de la app en Vercel Analytics: es una sola página, así que cada función se cuenta como una
// página virtual. Solo se envía el nombre de la función, nunca el contenido de los documentos.
const track = (path) => { try { window.va?.('pageview', { path }); } catch (_) { /* sin analítica */ } };
const trackLabel = (label) => track(`/${label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`);
const DISPLAY_KEY = 'cloudctrl:display';
const INSTALL_HINT_KEY = 'cloudctrl:installHint';
const TEXT_URL = 'https://text-app-olive.vercel.app/';
const SHEET_URL = 'https://sheet-app-lake.vercel.app/';
const REFRESH_MS = 60 * 1000;

const ICONS = {
  doc: '<path d="M7 3.5h7l4.5 4.5v12.5H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h6"/>',
  sheet: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M3.5 9.7h17M3.5 14.3h17M9.2 5v14M14.8 5v14"/>',
  file: '<path d="M7 3.5h7l4.5 4.5v12.5H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M14 3.5V8h4.5"/>',
  upload: '<path d="M12 16V5M7.5 9.5L12 5l4.5 4.5"/><path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16"/>',
  save: '<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5"/><path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16"/>',
  open: '<path d="M14 4.5h5.5V10M19.5 4.5L11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  more: '<circle cx="12" cy="5.5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18.5" r="1.5" fill="currentColor"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  restore: '<path d="M8.5 7.5L4.5 11.5l4 4"/><path d="M4.5 11.5H15a4.5 4.5 0 0 1 0 9h-2.5"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4v5h-5"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-4 3.9-6 7.5-6s6.7 2 7.5 6"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.1-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".6" fill="currentColor"/>',
};
const icon = (name, size = 22) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

// Logo de CloudCTRL: anillo fino, anillo discontinuo, arco y una nube con una flecha de subida
let logoCount = 0;
function logoSVG(size) {
  const id = `cld-g${logoCount++}`;
  return `
    <svg class="logo-mark" viewBox="0 0 120 120" width="${size}" height="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#db2777"/><stop offset=".55" stop-color="#f472b6"/><stop offset="1" stop-color="#fbcfe8"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" stroke="url(#${id})" stroke-width="1.2" opacity=".55"/>
      <circle cx="60" cy="60" r="42" stroke="url(#${id})" stroke-width=".8" stroke-dasharray="2 5" opacity=".6"/>
      <path class="logo-arc" pathLength="1" d="M60 8 A52 52 0 1 1 14.97 86" stroke="url(#${id})" stroke-width="3"/>
      <circle class="logo-dot" cx="14.97" cy="86" r="3" fill="#fbcfe8" stroke="none"/>
      <path d="M42 76h37a13 13 0 0 0 2.5-25.8A19 19 0 0 0 45.5 45 15.6 15.6 0 0 0 42 76z" stroke="url(#${id})" stroke-width="2"/>
      <path d="M60 67V54M54.5 59l5.5-5.5 5.5 5.5" stroke="url(#${id})" stroke-width="1.7"/>
    </svg>`;
}
document.querySelectorAll('[data-logo]').forEach((el) => { el.innerHTML = logoSVG(Number(el.dataset.logo)); });
document.getElementById('app-version').textContent = `Versión ${APP_VERSION}`;

// ---------- Utilidades ----------

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (_) { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* sin almacenamiento */ } };
const isTouch = matchMedia('(pointer: coarse)').matches;
const newId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fmtDate = (t) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtSize = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
};

// ---------- Entrar o crear la cuenta ----------

const view = $('view');
let loginMode = 'login';

function renderLogin(message = '') {
  const create = loginMode === 'create';
  view.innerHTML = `
    <section class="home-hero">
      <h1>Tu nube</h1>
      <p>Los textos de TextCTRL, las hojas de SheetCTRL y tus archivos, en un solo sitio y cifrados en tu dispositivo.</p>
    </section>
    <form class="card login" id="login-form" style="padding:16px">
      <div class="seg" role="group" aria-label="Cuenta">
        <button type="button" data-mode="login" class="${create ? '' : 'on'}" aria-pressed="${!create}">Entrar</button>
        <button type="button" data-mode="create" class="${create ? 'on' : ''}" aria-pressed="${create}">Crear cuenta</button>
      </div>
      <label class="field"><span>Usuario</span><input id="l-user" autocomplete="username" autocapitalize="none" autocorrect="off" required /></label>
      <label class="field"><span>Contraseña</span><input id="l-pass" type="password" autocomplete="${create ? 'new-password' : 'current-password'}" required /></label>
      ${create ? `
        <label class="field"><span>Repite la contraseña</span><input id="l-pass2" type="password" autocomplete="new-password" required /></label>
        <label class="field"><span>Clave de registro</span><input id="l-invite" autocomplete="off" autocapitalize="none" autocorrect="off" required /></label>
        <p class="small muted" style="margin:0">Guarda bien la contraseña: con ella se cifra todo y no se puede recuperar. Si la pierdes, pierdes los archivos.</p>` : ''}
      <p class="err" id="l-err" ${message ? '' : 'hidden'}>${esc(message)}</p>
      <button class="primary-btn" id="l-go" type="submit">${create ? 'Crear cuenta' : 'Entrar'}</button>
    </form>`;
  view.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { loginMode = b.dataset.mode; renderLogin(); }));
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fail = (text) => { $('l-err').hidden = false; $('l-err').textContent = text; };
    const user = $('l-user').value;
    const pass = $('l-pass').value;
    if (create && pass !== $('l-pass2').value) return fail('Las contraseñas no coinciden.');
    if (create && pass.length < 8) return fail('La contraseña necesita al menos 8 caracteres.');
    $('l-go').disabled = true;
    $('l-go').textContent = 'Un momento…';
    try {
      await Cloud.connect(user, pass, create ? $('l-invite').value : undefined);
      track(create ? '/cuenta-creada' : '/entrar');
      showFiles();
    } catch (err) {
      $('l-go').disabled = false;
      $('l-go').textContent = create ? 'Crear cuenta' : 'Entrar';
      fail(Cloud.errorText(err));
    }
  });
}

// ---------- Archivos ----------

const KINDS = {
  text: { label: 'Texto', icon: 'doc', cls: 'text', app: 'TextCTRL', url: TEXT_URL },
  sheet: { label: 'Hoja', icon: 'sheet', cls: 'sheet', app: 'SheetCTRL', url: SHEET_URL },
  file: { label: 'Archivo', icon: 'file', cls: 'file' },
};
const FILTERS = [['all', 'Todo'], ['text', 'Textos'], ['sheet', 'Hojas'], ['file', 'Archivos']];

let files = [];
let usage = { used: 0, quota: 0 };
let filter = 'all';
let query = '';
let inTrash = false;
let loadError = '';

const kindOf = (f) => KINDS[f.kind] || KINDS.file;

async function refresh() {
  if (!Cloud.account) return;
  try {
    const out = await Cloud.list();
    files = out.files;
    usage = out;
    loadError = '';
  } catch (err) {
    if (err.message === 'auth') { Cloud.logout(); showFiles(); return; }
    loadError = Cloud.errorText(err);
  }
  if ($('file-list')) drawFiles();
}

function showFiles() {
  closeSheet();
  if (!Cloud.account) { files = []; renderLogin(); return; }
  view.innerHTML = `
    <section class="card usage" id="usage"></section>
    <div class="home-actions">
      <button class="primary-btn" id="upload" type="button">${icon('upload', 20)} Subir archivo</button>
      <button class="ghost-big" id="reload" type="button">${icon('refresh', 20)} Actualizar</button>
    </div>
    <div class="chips" id="chips"></div>
    <input class="search" id="search" type="search" placeholder="Buscar" aria-label="Buscar archivos" value="${esc(query)}" />
    <section class="doc-list" id="file-list"></section>
    <p class="home-note" id="foot"></p>`;
  $('upload').addEventListener('click', () => $('file-open').click());
  $('reload').addEventListener('click', refresh);
  $('search').addEventListener('input', (e) => { query = e.target.value; drawList(); });
  drawFiles();
  refresh();
}

function drawFiles() {
  const live = files.filter((f) => !f.trashed);
  const pct = usage.quota ? Math.min(100, (usage.used / usage.quota) * 100) : 0;
  $('usage').innerHTML = `
    <div class="usage-row"><b>${live.length} ${live.length === 1 ? 'archivo' : 'archivos'}</b><span>${fmtSize(usage.used)} de ${fmtSize(usage.quota)}</span></div>
    <div class="usage-bar"><i style="width:${pct}%"></i></div>`;
  $('chips').innerHTML = [...FILTERS.map(([id, label]) =>
    `<button type="button" class="chip ${!inTrash && filter === id ? 'on' : ''}" data-f="${id}">${label}</button>`),
    `<button type="button" class="chip ${inTrash ? 'on' : ''}" data-f="trash">Papelera</button>`].join('');
  $('chips').querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
    inTrash = b.dataset.f === 'trash';
    if (!inTrash) filter = b.dataset.f;
    else track('/papelera');
    drawFiles();
  }));
  drawList();
}

function drawList() {
  const q = query.trim().toLowerCase();
  const list = files
    .filter((f) => !!f.trashed === inTrash)
    .filter((f) => inTrash || filter === 'all' || (filter === 'file' ? !['text', 'sheet'].includes(f.kind) : f.kind === filter))
    .filter((f) => !q || f.name.toLowerCase().includes(q))
    .sort((a, b) => (b.trashed || b.upd) - (a.trashed || a.upd));
  $('file-list').innerHTML = list.length ? list.map((f) => `
    <div class="card doc-row">
      <button class="doc-open" type="button" data-file="${esc(f.id)}">
        <span class="file-icon ${kindOf(f).cls}">${icon(kindOf(f).icon, 20)}</span>
        <span><b>${esc(f.name)}</b><small>${kindOf(f).label} · ${fmtDate(f.upd)} · ${fmtSize(f.bytes)}</small></span>
      </button>
      <button class="doc-more" type="button" data-file="${esc(f.id)}" aria-label="Opciones de ${esc(f.name)}">${icon('more', 18)}</button>
    </div>`).join('') : `<p class="empty">${loadError ? '' : inTrash ? 'La papelera está vacía.' : q ? 'Nada coincide con la búsqueda.' : 'Aún no hay nada. Conecta TextCTRL y SheetCTRL desde su menú ⋯, o sube un archivo.'}</p>`;
  $('file-list').querySelectorAll('[data-file]').forEach((b) => b.addEventListener('click', () => openActions(files.find((f) => f.id === b.dataset.file))));
  $('foot').textContent = loadError || (inTrash ? 'Lo que lleva 30 días en la papelera se borra solo.' : 'Todo se cifra en tu dispositivo antes de subirse: ni el servidor ve los nombres.');
}

function openActions(file) {
  if (!file) return;
  const k = kindOf(file);
  const actions = file.trashed
    ? [['restore', 'restore', 'Recuperar'], ['purge', 'trash', 'Borrar para siempre', 'danger']]
    : [
        ...(k.url ? [['app', 'open', `Abrir en ${k.app}`]] : [['download', 'save', 'Descargar']]),
        ['trash', 'trash', 'Mover a la papelera', 'danger'],
      ];
  const back = newSheet();
  back.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Archivo">
      <h2 class="sheet-title">${esc(file.name)}</h2>
      <p class="small muted">${k.label} · ${fmtDate(file.upd)} · ${fmtSize(file.bytes)}</p>
      <div class="action-list">
        ${actions.map(([id, ic, label, cls]) => `<button type="button" class="action ${cls || ''}" data-a="${id}">${icon(ic, 20)}${label}</button>`).join('')}
      </div>
      <div class="sheet-actions"><button type="button" class="ghost-btn" data-close>Cerrar</button></div>
    </div>`;
  back.querySelector('[data-close]').addEventListener('click', closeSheet);
  back.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
    track(`/archivo/${b.dataset.a}`);
    runAction(b.dataset.a, file, k);
  }));
}

async function runAction(action, file, k) {
  if (action === 'app') {
    closeSheet();
    window.open(`${k.url}?open=${encodeURIComponent(file.id)}`, '_blank', 'noopener');
    return;
  }
  if (action === 'purge') { confirmPurge(file); return; }
  closeSheet();
  try {
    if (action === 'download') {
      toast('Descargando…', { stay: true });
      const bytes = await Cloud.get(file, (p) => toast(`Descargando… ${Math.round(p * 100)} %`, { stay: true }));
      await deliver(new Blob([bytes], { type: file.mime || 'application/octet-stream' }), file.name);
    } else {
      await Cloud[action](file.id);
      toast(action === 'trash' ? 'Movido a la papelera' : 'Recuperado');
    }
    await refresh();
  } catch (err) {
    toast(Cloud.errorText(err), { warn: true });
  }
}

function confirmPurge(file) {
  const back = newSheet(true);
  back.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Borrar para siempre">
      <h2 class="sheet-title">¿Borrar «${esc(file.name)}»?</h2>
      <p class="small muted">Desaparece de la nube y no se puede recuperar.</p>
      <div class="sheet-actions">
        <button class="ghost-btn" type="button" data-close>Cancelar</button>
        <button class="danger-btn" type="button" id="purge-ok">Borrar</button>
      </div>
    </div>`;
  back.querySelector('[data-close]').addEventListener('click', closeSheet);
  back.querySelector('#purge-ok').addEventListener('click', async () => {
    closeSheet();
    try { await Cloud.purge(file.id); await refresh(); } catch (err) { toast(Cloud.errorText(err), { warn: true }); }
  });
}

async function deliver(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (isTouch && navigator.canShare?.({ files: [file] })) { // en móvil, abre «Guardar en Archivos» y compañía
    $('toast').hidden = true;
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast(`Descargado: ${name}`);
}

async function uploadFiles(list) {
  if (!Cloud.account) return;
  let done = 0;
  for (const file of list) {
    try {
      toast(`Subiendo ${file.name}…`, { stay: true });
      await Cloud.put({
        id: newId(), kind: 'file', name: file.name, mime: file.type, upd: Date.now(), bytes: await file.arrayBuffer(),
        onProgress: (p) => toast(`Subiendo ${file.name}… ${Math.round(p * 100)} %`, { stay: true }),
      });
      done += 1;
    } catch (err) {
      toast(`${file.name}: ${Cloud.errorText(err)}`, { warn: true });
      await refresh();
      return;
    }
  }
  track('/subir');
  toast(done === 1 ? 'Subido' : `${done} archivos subidos`);
  await refresh();
}
$('file-open').addEventListener('change', (e) => {
  const list = [...e.target.files];
  e.target.value = '';
  if (list.length) uploadFiles(list);
});
// Arrastrar archivos a la ventana (escritorio)
document.addEventListener('dragover', (e) => { e.preventDefault(); if (Cloud.account) document.body.classList.add('drop-on'); });
document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('drop-on'); });
document.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('drop-on');
  const list = [...(e.dataTransfer?.files || [])];
  if (list.length) uploadFiles(list);
});

// Otro dispositivo o las otras apps pueden haber cambiado la nube
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);

// ---------- Menú ⋯ ----------

const MENU = [
  { label: 'Cuenta', icon: 'user', run: () => openAccountSheet() },
  { label: 'Opciones de visualización', icon: 'palette', run: () => openDisplaySheet() },
  { label: 'Información', icon: 'info', run: () => openInfoSheet() },
];

function openMenu() {
  const menu = $('menu');
  const items = MENU.filter((m) => m.label !== 'Cuenta' || Cloud.account);
  menu.innerHTML = items.map((m, i) =>
    `<button class="menu-item" role="menuitem" data-i="${i}">${icon(m.icon, 20)}<span>${m.label}</span></button>`).join('');
  menu.querySelectorAll('.menu-item').forEach((b) => b.addEventListener('click', () => {
    closeMenu();
    trackLabel(items[b.dataset.i].label);
    items[b.dataset.i].run();
  }));
  const r = $('menu-btn').getBoundingClientRect();
  menu.style.top = `${r.bottom + 6}px`;
  menu.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
  menu.hidden = false;
  $('menu-btn').setAttribute('aria-expanded', 'true');
}
function closeMenu() {
  $('menu').hidden = true;
  $('menu-btn').setAttribute('aria-expanded', 'false');
}
$('menu-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if ($('menu').hidden) openMenu();
  else closeMenu();
});
document.addEventListener('click', (e) => {
  if (!$('menu').hidden && !e.target.closest('#menu')) closeMenu();
});
window.addEventListener('resize', closeMenu);

function openAccountSheet() {
  const back = newSheet(true);
  back.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Cuenta">
      <h2 class="sheet-title">Cuenta</h2>
      <p class="small">Has entrado como <b>${esc(Cloud.account.username)}</b>.</p>
      <p class="small muted">Para que TextCTRL y SheetCTRL guarden aquí, entra con este mismo usuario desde su menú ⋯ → Nube. Al salir, tus archivos siguen en la nube.</p>
      <div class="sheet-actions">
        <button class="ghost-btn" type="button" data-close>Cerrar</button>
        <button class="done-btn" type="button" id="logout">Salir</button>
      </div>
    </div>`;
  back.querySelector('[data-close]').addEventListener('click', closeSheet);
  back.querySelector('#logout').addEventListener('click', () => { Cloud.logout(); showFiles(); });
}

function openInfoSheet() {
  const back = newSheet(true);
  back.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Información">
      <span class="install-logo">${logoSVG(56)}</span>
      <h2 class="sheet-title">CloudCTRL</h2>
      <p class="small muted">Versión ${APP_VERSION} · by OmT Finance</p>
      <p class="small">Tu nube privada. Reúne los documentos de TextCTRL, las hojas de SheetCTRL y los archivos que subas, y los mantiene iguales en todos tus dispositivos.</p>
      <p class="small muted">Todo se cifra en tu dispositivo con tu contraseña antes de subirse, también los nombres. Nadie más puede leerlo, y por eso la contraseña no se puede recuperar.</p>
      <div class="sheet-actions"><button type="button" class="done-btn" data-close>Cerrar</button></div>
    </div>`;
  back.querySelector('[data-close]').addEventListener('click', closeSheet);
}

// ---------- Hojas ----------

function closeSheet() {
  document.querySelector('.sheet-backdrop')?.remove();
}
function newSheet(center = false) {
  closeSheet();
  const back = document.createElement('div');
  back.className = `sheet-backdrop${center ? ' center' : ''}`;
  document.body.append(back);
  back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });
  return back;
}

// ---------- Opciones de visualización (modo y fondo) ----------

const WALLS = {
  nube: { name: 'Nube', c: ['219 39 119', '251 207 232', '236 72 153', '131 24 67'] },
  noche: { name: 'Noche', c: ['100 116 139', '148 163 184', '59 130 246', '30 64 175'] },
  alba: { name: 'Alba', c: ['251 146 60', '254 215 170', '244 114 182', '124 58 237'] },
  cielo: { name: 'Cielo', c: ['56 189 248', '186 230 253', '14 165 233', '12 74 110'] },
};
const lightQuery = matchMedia('(prefers-color-scheme: light)');
let display = { theme: 'auto', wall: 'nube', ...load(DISPLAY_KEY, {}) };
if (!WALLS[display.wall]) display.wall = 'nube';

function applyDisplay() {
  const light = display.theme === 'light' || (display.theme === 'auto' && lightQuery.matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.documentElement.dataset.wall = display.wall;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', light ? '#fdf4f9' : '#140a10');
}
lightQuery.addEventListener('change', () => { if (display.theme === 'auto') applyDisplay(); });

function wallPreview(key) {
  const [c1, c2, c3, c4] = WALLS[key].c;
  const light = document.documentElement.dataset.theme === 'light';
  const a = light ? 0.4 : 0.5;
  const base = light ? '#fdf4f9' : '#140a10';
  return `radial-gradient(70% 60% at 15% 10%, rgb(${c1} / ${a}), transparent 70%), radial-gradient(60% 55% at 90% 25%, rgb(${c2} / ${a * 0.8}), transparent 72%),
    radial-gradient(70% 60% at 75% 95%, rgb(${c3} / ${a * 0.85}), transparent 70%), radial-gradient(60% 55% at 5% 85%, rgb(${c4} / ${a * 0.8}), transparent 72%), ${base}`;
}

function openDisplaySheet() {
  const back = newSheet();
  const draw = () => {
    back.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Opciones de visualización">
        <h2 class="sheet-title">Opciones de visualización</h2>
        <p class="opt-label">Modo</p>
        <div class="seg" role="group" aria-label="Modo">
          ${[['dark', 'Oscuro'], ['light', 'Claro'], ['auto', 'Automático']].map(([v, l]) =>
            `<button type="button" data-theme-opt="${v}" class="${display.theme === v ? 'on' : ''}" aria-pressed="${display.theme === v}">${l}</button>`).join('')}
        </div>
        <p class="muted small">${display.theme === 'auto' ? 'Sigue el modo claro u oscuro del sistema.' : '&nbsp;'}</p>
        <p class="opt-label">Fondo</p>
        <div class="walls">
          ${Object.entries(WALLS).map(([k, w]) =>
            `<button type="button" class="wall ${display.wall === k ? 'on' : ''}" data-wall-opt="${k}" style="background:${wallPreview(k)}" aria-pressed="${display.wall === k}">${w.name}</button>`).join('')}
        </div>
        <div class="sheet-actions"><button class="done-btn" type="button">Listo</button></div>
      </div>`;
    back.querySelectorAll('[data-theme-opt]').forEach((b) => b.addEventListener('click', () => {
      display.theme = b.dataset.themeOpt;
      save(DISPLAY_KEY, display);
      applyDisplay();
      draw();
    }));
    back.querySelectorAll('[data-wall-opt]').forEach((b) => b.addEventListener('click', () => {
      display.wall = b.dataset.wallOpt;
      save(DISPLAY_KEY, display);
      applyDisplay();
      draw();
    }));
    back.querySelector('.done-btn').addEventListener('click', closeSheet);
  };
  draw();
}

// ---------- Aviso breve ----------

let toastTimer = 0;
function toast(text, { warn = false, stay = false } = {}) {
  const el = $('toast');
  el.textContent = text;
  el.classList.toggle('warn', warn);
  el.hidden = false;
  clearTimeout(toastTimer);
  if (!stay) toastTimer = setTimeout(() => { el.hidden = true; }, warn ? 5000 : 2400);
}

// ---------- Pantalla de inicio ----------
// Sin botón Entrar: el logo aparece (el arco se dibuja), se ve un instante y se pasa sola a la app
// con la transición de cristal, como en las demás apps.
const SPLASH_HOLD_MS = 1700;
const SPLASH_OUT_MS = 1200;
function enterApp() {
  const body = document.body;
  if (!$('splash') || body.classList.contains('entering')) return;
  body.classList.add('entering');
  setTimeout(() => {
    $('splash').remove();
    body.classList.remove('booting', 'entering');
    maybeShowInstallHint();
  }, SPLASH_OUT_MS);
}
setTimeout(enterApp, SPLASH_HOLD_MS);

// ---------- Aviso: añadir a la pantalla de inicio (solo móvil y tablet) ----------

const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const HINT_ICONS = {
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 10.5H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1"/>',
  more: '<circle cx="12" cy="5.5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18.5" r="1.5" fill="currentColor"/>',
  add: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};
const hintIcon = (name) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${HINT_ICONS[name]}</svg>`;

function maybeShowInstallHint() {
  if (!(isIOS || isAndroid) || isStandalone()) return;
  if (load(INSTALL_HINT_KEY, null) === 'off') return;
  const steps = isIOS
    ? [
        ['share', 'Pulsa el botón <b>Compartir</b> de Safari (abajo en el iPhone, arriba en el iPad).'],
        ['add', 'Desliza hacia abajo y elige <b>Añadir a pantalla de inicio</b>.'],
        ['check', 'Pulsa <b>Añadir</b>. El icono de CloudCTRL aparecerá junto a tus apps.'],
      ]
    : [
        ['more', 'Pulsa el menú <b>⋮</b> de Chrome, arriba a la derecha.'],
        ['add', 'Elige <b>Añadir a pantalla de inicio</b> o <b>Instalar aplicación</b>.'],
        ['check', 'Confirma con <b>Instalar</b>. El icono de CloudCTRL aparecerá junto a tus apps.'],
      ];
  const back = newSheet(true);
  back.innerHTML = `
    <div class="sheet install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <span class="install-logo">${logoSVG(56)}</span>
      <h2 class="sheet-title" id="install-title">Añade CloudCTRL a tu pantalla de inicio</h2>
      <p class="muted small">Así la abrirás como una app más, a pantalla completa y con un solo toque.</p>
      <ol class="install-steps">
        ${steps.map(([ic, text]) => `<li><span class="step-icon">${hintIcon(ic)}</span><span>${text}</span></li>`).join('')}
      </ol>
      <div class="install-footer">
        <label class="no-more"><input type="checkbox" id="install-no-more" /> No mostrar más</label>
        <button class="done-btn" type="button" id="install-ok">Aceptar</button>
      </div>
    </div>`;
  back.querySelector('#install-ok').addEventListener('click', () => {
    if (back.querySelector('#install-no-more').checked) save(INSTALL_HINT_KEY, 'off');
    closeSheet();
  });
}

// ---------- Sin zoom (Safari en iOS ignora user-scalable=no) ----------
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------- Service worker ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

applyDisplay();
showFiles();
