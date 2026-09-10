// Boot, top bar and routing for the workbench.
//
// The diagnosis half of this app is the original tool, imported and not
// modified: every view under ../js/views is the same file the original runs.
// Everything under ./views is new and belongs to the procedure half.

import * as store from '../js/store.js';
import * as store2 from './store2.js';
import { esc, closeDrawer, openDrawer, explainNoteType, toast } from '../js/ui.js';
import { meta as cmMeta } from '../js/data.js';
import { meta as pcsMeta } from './pcsdata.js';

// --- the original tool's screens, unchanged ------------------------------
import { renderHome } from '../js/views/home.js';
import { renderCode } from '../js/views/code.js';
import { renderBrowse, renderChapter, renderBlock, renderRange } from '../js/views/browse.js';
import { renderIndex } from '../js/views/indexview.js';
import { renderGrid } from '../js/views/grids.js';
import { renderCheck } from '../js/views/check.js';
import { renderWhatsNew } from '../js/views/whatsnew.js';
import { renderGlossary } from '../js/views/glossary.js';

// --- the procedure half ---------------------------------------------------
import { renderPcsHome } from './views/pcshome.js';
import { renderBuilder } from './views/builder.js';
import { renderTables, renderTable } from './views/pcstables.js';
import { renderPcsIndex } from './views/pcsindex.js';
import { renderPcsCode } from './views/pcscode.js';
import { renderRootOps, renderRootOp } from './views/rootops.js';
import { renderDecide, renderDecideCard } from './views/decide.js';
import { renderBodyMaps, renderBodyMap } from './views/bodymaps.js';
import { renderKeys } from './views/keys.js';
import { renderGuidelines } from './views/guidelines.js';
import { renderPcsWhatsNew } from './views/pcswhatsnew.js';

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

// Stars and recents are kept separately for the two code sets, because a
// diagnosis code and a procedure code are not interchangeable and mixing them
// in one list would invite exactly the confusion this tool exists to prevent.

function savedList() {
  const cm = store.get().starred;
  const pcs = store2.get().starred;
  const block = (title, items, href) => items.length
    ? `<h4>${esc(title)}</h4><ul class="savedlist">${items.map(c =>
        `<li><a href="${href(c)}" data-close-drawer><span class="s-code">${esc(c)}</span><span></span></a></li>`).join('')}</ul>`
    : '';
  const body = block('Diagnosis codes', cm, c => `#/code/${encodeURIComponent(c)}`)
             + block('Procedure codes', pcs, c => `#/pcscode/${encodeURIComponent(c)}`);
  return body || `<p>You have not starred anything yet. The star sits next to the code number
    on any code page, on either side of the tool.</p>`;
}

document.getElementById('saved-btn').addEventListener('click', () => {
  openDrawer('Codes you have starred', savedList());
});

document.getElementById('recent-btn').addEventListener('click', () => {
  const rows = [
    ...store.get().recent.map(x => ({ ...x, href: `#/code/${encodeURIComponent(x.code)}`, kind: 'diagnosis' })),
    ...store2.get().recent.map(x => ({ ...x, href: `#/pcscode/${encodeURIComponent(x.code)}`, kind: 'procedure' })),
  ].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 40);

  const body = rows.length
    ? `<ul class="savedlist">${rows.map(x => `<li><a href="${x.href}" data-close-drawer>
        <span class="s-code">${esc(x.code)}</span>
        <span>${esc(x.desc || '')}<em class="s-kind">${esc(x.kind)}</em></span></a></li>`).join('')}</ul>`
    : `<p>Nothing here yet. Every code you open is listed here so you can retrace your steps.</p>`;
  openDrawer('Recently viewed', body);
});

document.getElementById('edition-btn').addEventListener('click', async () => {
  const [cm, pcs] = await Promise.all([cmMeta(), pcsMeta()]);
  openDrawer('Which edition is this?', `
    <h4>FY2027 &mdash; both code sets</h4>
    <p>Effective ${esc(cm.effective)} through ${esc(cm.through)}. Both code sets are reissued every
       year and the new edition takes effect on 1 October. The date of the patient's encounter
       decides which edition you use &mdash; not the date you are doing the coding.</p>
    <h4>What is loaded right now</h4>
    <p><b>Diagnosis:</b> the ${esc(cm.edition)} ICD-10-CM release &mdash; Tabular List, Alphabetic Index,
       Neoplasm table and Table of Drugs and Chemicals, with
       ${cm.billableCount.toLocaleString()} billable codes.</p>
    <p><b>Procedures:</b> the ${esc(pcs.edition)} ICD-10-PCS release &mdash; all 918 tables and
       ${pcs.codeCount.toLocaleString()} codes, the Index, and the Definitions including the
       Body Part, Device and Substance keys.</p>
    <p><b>Rules:</b> the ICD-10-CM and ICD-10-PCS Official Guidelines for Coding and Reporting for
       FY2027, and the CMS ICD-10-PCS Reference Manual.</p>
    <h4>Switching editions</h4>
    <p>Only one edition is installed. To compare against another year, drop that year's release
       files beside this one and run the build scripts again.</p>`);
});

function refreshCounts() {
  document.getElementById('saved-count').textContent =
    store.get().starred.length + store2.get().starred.length;
}
store.onChange(refreshCounts);
store2.onChange(refreshCounts);

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
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(qs || '');
  return { parts, params, path };
}

// `mode` decides which row of tabs is showing; `key` highlights the tab.
const ROUTES = [
  // diagnosis
  { mode: 'cm', key: 'home', match: p => p.length === 0, run: r => renderHome(view, r) },
  { mode: 'cm', key: 'home', match: p => p[0] === 'search', run: r => renderHome(view, r) },
  { mode: 'cm', key: '', match: p => p[0] === 'code', run: r => renderCode(view, r) },
  { mode: 'cm', key: 'browse', match: p => p[0] === 'browse', run: r => renderBrowse(view, r) },
  { mode: 'cm', key: 'browse', match: p => p[0] === 'chapter', run: r => renderChapter(view, r) },
  { mode: 'cm', key: 'browse', match: p => p[0] === 'block', run: r => renderBlock(view, r) },
  { mode: 'cm', key: 'browse', match: p => p[0] === 'range', run: r => renderRange(view, r) },
  { mode: 'cm', key: 'index', match: p => p[0] === 'index', run: r => renderIndex(view, r) },
  { mode: 'cm', key: 'neoplasm', match: p => p[0] === 'neoplasm', run: r => renderGrid(view, r, 'neoplasm') },
  { mode: 'cm', key: 'drug', match: p => p[0] === 'drug', run: r => renderGrid(view, r, 'drug') },
  { mode: 'cm', key: 'check', match: p => p[0] === 'check', run: r => renderCheck(view, r) },
  { mode: 'cm', key: 'whatsnew', match: p => p[0] === 'whatsnew', run: r => renderWhatsNew(view, r) },
  { mode: 'cm', key: 'glossary', match: p => p[0] === 'glossary', run: r => renderGlossary(view, r) },
  { mode: 'cm', key: 'cmguidelines', match: p => p[0] === 'cmguidelines', run: r => renderGuidelines(view, r, 'cm') },

  // procedures
  { mode: 'pcs', key: 'pcs', match: p => p[0] === 'pcs', run: r => renderPcsHome(view, r) },
  { mode: 'pcs', key: 'build', match: p => p[0] === 'build', run: r => renderBuilder(view, r) },
  { mode: 'pcs', key: 'pcstables', match: p => p[0] === 'pcstables', run: r => renderTables(view, r) },
  { mode: 'pcs', key: 'pcstables', match: p => p[0] === 'pcstable', run: r => renderTable(view, r) },
  { mode: 'pcs', key: 'pcsindex', match: p => p[0] === 'pcsindex', run: r => renderPcsIndex(view, r) },
  { mode: 'pcs', key: '', match: p => p[0] === 'pcscode', run: r => renderPcsCode(view, r) },
  { mode: 'pcs', key: 'rootops', match: p => p[0] === 'rootops', run: r => renderRootOps(view, r) },
  { mode: 'pcs', key: 'rootops', match: p => p[0] === 'rootop', run: r => renderRootOp(view, r) },
  { mode: 'pcs', key: 'decide', match: p => p[0] === 'decide', run: r => renderDecide(view, r) },
  { mode: 'pcs', key: 'decide', match: p => p[0] === 'card', run: r => renderDecideCard(view, r) },
  { mode: 'pcs', key: 'bodymaps', match: p => p[0] === 'bodymaps', run: r => renderBodyMaps(view, r) },
  { mode: 'pcs', key: 'bodymaps', match: p => p[0] === 'bodymap', run: r => renderBodyMap(view, r) },
  { mode: 'pcs', key: 'keys', match: p => p[0] === 'keys', run: r => renderKeys(view, r) },
  { mode: 'pcs', key: 'pcsguidelines', match: p => p[0] === 'pcsguidelines', run: r => renderGuidelines(view, r, 'pcs') },
  { mode: 'pcs', key: 'pcswhatsnew', match: p => p[0] === 'pcswhatsnew', run: r => renderPcsWhatsNew(view, r) },
];

let lastPath = null;

async function route() {
  const r = parseHash();
  const hit = ROUTES.find(x => x.match(r.parts)) || ROUTES[0];

  document.getElementById('subnav-cm').hidden = hit.mode !== 'cm';
  document.getElementById('subnav-pcs').hidden = hit.mode !== 'pcs';
  document.querySelectorAll('.modeswitch a').forEach(a => {
    a.classList.toggle('on', a.dataset.mode === hit.mode);
  });
  document.querySelectorAll('.subnav a').forEach(a => {
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
      <p class="small">If this is the first time you have opened the tool, check that it is being
      served over a web address rather than opened straight from the file system.</p></div>`;
  }
}

window.addEventListener('hashchange', route);

applyTheme();
refreshCounts();
route();
