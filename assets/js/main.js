// Boot, top bar and routing.

import * as store from './store.js';
import { esc, closeDrawer, openDrawer, explainNoteType, toast } from './ui.js';
import { meta } from './data.js';
import { guidedOn, setGuidedBar } from './guided.js';

import { renderHome } from './views/home.js';
import { renderCode } from './views/code.js';
import { renderBrowse, renderChapter, renderBlock, renderRange } from './views/browse.js';
import { renderIndex } from './views/indexview.js';
import { renderGrid } from './views/grids.js';
import { renderCheck } from './views/check.js';
import { renderWhatsNew } from './views/whatsnew.js';
import { renderGlossary } from './views/glossary.js';

const view = document.getElementById('view');

/* ------------------------------------------------------------------ theme */

function applyTheme() {
  const t = store.get().theme;
  if (t) document.documentElement.setAttribute('data-theme', t);
  else {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
}

document.getElementById('theme-btn').addEventListener('click', () => {
  const now = document.documentElement.getAttribute('data-theme');
  store.setTheme(now === 'dark' ? 'light' : 'dark');
  applyTheme();
});

/* ---------------------------------------------------------- guided mode */

const guidedSwitch = document.getElementById('guided-switch');
guidedSwitch.checked = store.get().guided;
guidedSwitch.addEventListener('change', () => {
  store.setGuided(guidedSwitch.checked);
  toast(guidedSwitch.checked
    ? 'Walk-through is on. Searches for a condition will start in the index.'
    : 'Walk-through is off. You keep your place.');
  route();
});

/* -------------------------------------------------------- saved / recent */

document.getElementById('saved-btn').addEventListener('click', () => {
  const s = store.get().starred;
  const body = s.length
    ? `<ul class="savedlist">${s.map(c => `<li><a href="#/code/${esc(c)}" data-close-drawer><span class="s-code">${esc(c)}</span><span></span></a></li>`).join('')}</ul>`
    : `<p>You have not starred anything yet. The star sits next to the code number on any code page.</p>`;
  openDrawer('Codes you have starred', body);
});

document.getElementById('recent-btn').addEventListener('click', () => {
  const r = store.get().recent;
  const body = r.length
    ? `<ul class="savedlist">${r.map(x => `<li><a href="#/code/${esc(x.code)}" data-close-drawer><span class="s-code">${esc(x.code)}</span><span>${esc(x.desc || '')}</span></a></li>`).join('')}</ul>`
    : `<p>Nothing here yet. Every code you open is listed here so you can retrace your steps.</p>`;
  openDrawer('Recently viewed', body);
});

document.getElementById('edition-btn').addEventListener('click', async () => {
  const m = await meta();
  openDrawer('Which edition is this?', `
    <h4>${esc(m.label)}</h4>
    <p>The code set is reissued every year and the new edition takes effect on 1 October.
       Codes are added, retired and reworded, and the instructional notes change with them.
       The date of the patient's encounter decides which edition you use — not the date you are doing the coding.</p>
    <h4>What is loaded right now</h4>
    <p>The official ${esc(m.edition)} release: the Tabular List, the Alphabetic Index, the Neoplasm
       table and the Table of Drugs and Chemicals, together with ${m.billableCount.toLocaleString()} billable codes.</p>
    <p>Effective ${esc(m.effective)} through ${esc(m.through)}.</p>
    <h4>Switching editions</h4>
    <p>Only one edition is installed. To compare against another year, drop that year's release files
       beside this one and run the build script again; the year-on-year comparison screen will then have
       two editions to put side by side.</p>
    <p style="margin-top:1rem"><a href="#/whatsnew" data-close-drawer>See what changed this year</a></p>`);
});

function refreshCounts() {
  document.getElementById('saved-count').textContent = store.get().starred.length;
}
store.onChange(refreshCounts);

/* ----------------------------------------------------------------- drawer */

document.getElementById('drawer-close').addEventListener('click', closeDrawer);
document.getElementById('drawer-scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDrawer();
  if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) {
    const box = document.querySelector('.searchbox input');
    if (box) { e.preventDefault(); box.focus(); box.select(); }
  }
});

document.addEventListener('click', e => {
  const help = e.target.closest('[data-help]');
  if (help) { explainNoteType(help.getAttribute('data-help')); return; }
  if (e.target.closest('[data-close-drawer]')) closeDrawer();
});

/* ----------------------------------------------------------------- router */

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(qs || '');
  return { parts, params, path };
}

const ROUTES = [
  { key: 'home', match: p => p.length === 0, run: (r) => renderHome(view, r) },
  { key: 'home', match: p => p[0] === 'search', run: (r) => renderHome(view, r) },
  { key: '', match: p => p[0] === 'code', run: (r) => renderCode(view, r) },
  { key: 'browse', match: p => p[0] === 'browse', run: (r) => renderBrowse(view, r) },
  { key: 'browse', match: p => p[0] === 'chapter', run: (r) => renderChapter(view, r) },
  { key: 'browse', match: p => p[0] === 'block', run: (r) => renderBlock(view, r) },
  { key: 'browse', match: p => p[0] === 'range', run: (r) => renderRange(view, r) },
  { key: 'index', match: p => p[0] === 'index', run: (r) => renderIndex(view, r) },
  { key: 'neoplasm', match: p => p[0] === 'neoplasm', run: (r) => renderGrid(view, r, 'neoplasm') },
  { key: 'drug', match: p => p[0] === 'drug', run: (r) => renderGrid(view, r, 'drug') },
  { key: 'check', match: p => p[0] === 'check', run: (r) => renderCheck(view, r) },
  { key: 'whatsnew', match: p => p[0] === 'whatsnew', run: (r) => renderWhatsNew(view, r) },
  { key: 'glossary', match: p => p[0] === 'glossary', run: (r) => renderGlossary(view, r) },
];

let lastPath = null;

async function route() {
  const r = parseHash();
  const hit = ROUTES.find(x => x.match(r.parts)) || ROUTES[0];

  document.querySelectorAll('.topnav a').forEach(a => {
    a.classList.toggle('on', a.dataset.nav === hit.key);
  });

  if (r.path !== lastPath) window.scrollTo(0, 0);
  lastPath = r.path;

  try {
    await hit.run(r);
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty"><strong>Something went wrong loading that.</strong>
      <p>${esc(err.message)}</p>
      <p class="small">If this is the first time you have opened the tool, check that it is being served
      over a web address rather than opened straight from the file system.</p></div>`;
  }
}

window.addEventListener('hashchange', route);

applyTheme();
refreshCounts();
route();
