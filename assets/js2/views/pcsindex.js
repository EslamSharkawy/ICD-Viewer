// The ICD-10-PCS alphabetic index.
//
// The index does a job the code titles cannot: PCS titles carry no eponyms and
// no common procedure names, so "Whipple" and "Nissen" and every device trade
// name exist only here. Two kinds of pointer matter:
//
//   see  -> go to this root operation table
//   use  -> the PCS value for this anatomical or device word

import { esc, loadingBlock, highlight } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import { indexMain, indexLetter, indexSearchRows } from '../pcsdata.js';

const LETTERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export async function renderPcsIndex(view, r) {
  setGuidedBar(null);
  const q = (r.params.get('q') || '').trim();
  const L = (r.params.get('l') || '').toUpperCase();

  view.innerHTML = `<div class="wrap-mid">
    <div class="hero tight">
      <h1>The procedure index</h1>
      <p class="lede">Where the procedure names live. PCS code titles never use eponyms or common
        operation names, so this is the only place "Whipple", "Nissen" or a device trade name
        appears. It points you at a table; it never gives you a finished code on its own.</p>

      <form class="searchbox compact" id="isearch" role="search">
        <span class="mag" aria-hidden="true">🔍</span>
        <label class="skip-link" for="iq">Search the index</label>
        <input id="iq" type="search" autocomplete="off" spellcheck="false" value="${esc(q)}"
               placeholder="A procedure name, an eponym, a device, an anatomical term">
      </form>
    </div>

    <div id="ibody">${loadingBlock('Loading the index…')}</div>
  </div>`;

  const body = view.querySelector('#ibody');
  const box = view.querySelector('#iq');
  let timer = null;
  const go = () => {
    const v = box.value.trim();
    history.replaceState(null, '', v ? `#/pcsindex?q=${encodeURIComponent(v)}` : '#/pcsindex');
    if (v) showSearch(body, v); else showLetters(body, L);
  };
  box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(go, 250); });
  view.querySelector('#isearch').addEventListener('submit', e => { e.preventDefault(); go(); });

  if (q) { showSearch(body, q); box.focus(); }
  else showLetters(body, L);
}

/* ------------------------------------------------------------- searching */

async function showSearch(host, q) {
  host.innerHTML = loadingBlock('Searching…');
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = await indexSearchRows();
  const hits = rows.filter(r => tokens.every(t => r.text.includes(t))).slice(0, 200);

  if (!hits.length) {
    host.innerHTML = `<div class="empty"><strong>Nothing in the index matched that.</strong>
      <p>Try a shorter word, or the anatomical term rather than the procedure name.
      You can also <a href="#/build">build the code from the tables</a>.</p></div>`;
    return;
  }

  host.innerHTML = `<div class="results-head">
      <h2 class="section-title">${hits.length}${hits.length === 200 ? '+' : ''} index entries</h2>
      <span class="muted small">Each row shows the full trail of terms above it.</span>
    </div>
    <div class="result-list">
      ${hits.map(h => entryRow(h, tokens)).join('')}
    </div>`;
}

function entryRow(h, tokens) {
  const partial = h.code && h.code.replace(/[^0-9A-HJ-NP-Z]/g, '');
  const href = partial ? `#/build?c=${esc(partial)}`
    : (h.use ? `#/keys?q=${encodeURIComponent(h.use)}` : `#/pcsindex?q=${encodeURIComponent(h.title)}`);
  return `<a class="result" href="${href}">
    <span class="r-code">${esc(h.code || '—')}</span>
    <span class="r-desc">${highlight(h.title, tokens)}</span>
    <span class="r-badges">${h.use
      ? `<span class="badge badge-rules">use: ${esc(h.use)}</span>`
      : (partial ? `<span class="badge badge-new">${partial.length} of 7 characters</span>` : '')}</span>
    <span class="r-where">${esc(h.trail)}</span>
  </a>`;
}

/* -------------------------------------------------------------- browsing */

async function showLetters(host, L) {
  const main = await indexMain();
  const counts = new Map();
  for (const [, letter] of main) counts.set(letter, (counts.get(letter) || 0) + 1);

  host.innerHTML = `<div class="alphabar">
    ${LETTERS.filter(x => counts.has(x)).map(x => `<a class="alpha ${L === x ? 'on' : ''}"
      href="#/pcsindex?l=${x}">${x}</a>`).join('')}
  </div>
  <div id="letterbody"></div>`;

  const lb = host.querySelector('#letterbody');
  if (!L) {
    lb.innerHTML = `<div class="empty subtle">
      <strong>Pick a letter, or search above.</strong>
      <p>The index holds ${main.length.toLocaleString()} main terms.</p></div>`;
    return;
  }

  lb.innerHTML = loadingBlock('Loading ' + L + '…');
  let bucket;
  try {
    bucket = await indexLetter(L);
  } catch {
    lb.innerHTML = `<div class="empty"><strong>Nothing filed under ${esc(L)}.</strong></div>`;
    return;
  }

  lb.innerHTML = `<div class="results-head">
      <h2 class="section-title">${esc(L)}</h2>
      <span class="muted small">${bucket.length} main terms</span>
    </div>
    <div class="idxtree">${bucket.map(n => node(n, 0)).join('')}</div>`;
}

function node(n, depth) {
  const partial = n.code || n.partial;
  const clean = partial && partial.replace(/[^0-9A-HJ-NP-Z]/g, '');
  const bits = [];

  if (n.t) bits.push(`<span class="idx-term">${esc(n.t)}</span>`);
  if (n.use) bits.push(`<span class="idx-use">use <b>${esc(n.use)}</b></span>`);
  if (n.see) {
    bits.push(`<span class="idx-see">see <b>${esc(n.see)}</b></span>`);
    if (n.seeTo) bits.push(`<a class="idx-code mono" href="#/build?c=${esc(n.seeTo.replace(/[^0-9A-HJ-NP-Z]/g, ''))}">${esc(n.seeTo)}</a>`);
  }
  if (clean && !n.seeTo) {
    bits.push(`<a class="idx-code mono" href="#/build?c=${esc(clean)}">${esc(partial)}</a>`);
    if (n.partial) bits.push(`<span class="idx-hint">${clean.length} of 7 — continue in the builder</span>`);
  }

  return `<div class="idx-node d${Math.min(depth, 4)}">
    <div class="idx-line">${bits.join(' ')}</div>
    ${(n.k || []).map(k => node(k, depth + 1)).join('')}
  </div>`;
}
