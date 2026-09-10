// The procedure search screen.
//
// Three things can be typed here and they need different answers: a code, words
// from an operative note, or the name of a procedure. The last of those is what
// the alphabetic index is for, so a word search reaches for both the code titles
// and the index.

import { esc, highlight, loadingBlock } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import {
  codes, describe, indexSearchRows, normalisePcs, looksLikePcs, tablemap,
} from '../pcsdata.js';
import { charBoxes } from '../pcsui.js';

const EXAMPLES = [
  { label: '0DTJ0ZZ', mono: true },
  { label: 'gallbladder' },
  { label: 'lobectomy' },
  { label: 'coronary bypass' },
  { label: 'appendectomy' },
];

const TILES = [
  { href: '#/build', icon: '🧱', title: 'Build a code', sub: 'Seven characters, one at a time. Only valid combinations are offered.' },
  { href: '#/decide', icon: '🧭', title: 'Which one do I pick?', sub: 'Excision or Resection? Release or Division? Every judgement call, explained.' },
  { href: '#/rootops', icon: '🎯', title: 'Root operations', sub: 'All 31, grouped by objective, with the official definitions.' },
  { href: '#/bodymaps', icon: '🫁', title: 'Body maps', sub: 'Diagrams for the decisions that are really about anatomy.' },
  { href: '#/keys', icon: '🗝️', title: 'Reference keys', sub: 'The surgeon\'s word is not a PCS value. These four keys translate.' },
  { href: '#/pcsguidelines', icon: '📕', title: 'Official guidelines', sub: 'The full FY2027 ICD-10-PCS guidelines, searchable.' },
];

export async function renderPcsHome(view, r) {
  setGuidedBar(null);
  const q = r.params.get('q') || '';

  view.innerHTML = `<div class="wrap-mid">
    <div class="hero">
      <h1>Procedure coding, without the guesswork</h1>
      <p class="lede">A procedure code is not looked up, it is built — seven characters, each one a
        decision. Search here for a code or a procedure, or go straight to the builder and
        construct one character at a time.</p>

      <form class="searchbox" id="searchform" role="search">
        <span class="mag" aria-hidden="true">🔍</span>
        <label class="skip-link" for="q">Search</label>
        <input id="q" name="q" type="search" autocomplete="off" spellcheck="false"
               value="${esc(q)}"
               placeholder="A code, or what the surgeon did">
        <button type="button" class="clear" id="clearq" aria-label="Clear the search box" ${q ? '' : 'hidden'}>✕</button>
      </form>

      <div class="examples">
        <div class="examples-label">Try one of these</div>
        <div class="chips">
          ${EXAMPLES.map(e => `<button class="chip ${e.mono ? 'mono' : ''}" data-ex="${esc(e.label)}">${esc(e.label)}</button>`).join('')}
        </div>
      </div>
    </div>

    <div id="results"></div>

    <div id="tiles" ${q ? 'hidden' : ''}>
      <div class="tiles">
        ${TILES.map(t => `<a class="tile" href="${t.href}">
          <span class="tile-icon" aria-hidden="true">${t.icon}</span>
          <span class="tile-title">${esc(t.title)}</span>
          <span class="tile-sub">${esc(t.sub)}</span>
        </a>`).join('')}
      </div>
    </div>
  </div>`;

  const input = view.querySelector('#q');
  const clear = view.querySelector('#clearq');
  const results = view.querySelector('#results');
  const tiles = view.querySelector('#tiles');

  let timer = null;
  const go = (value, immediate) => {
    clearTimeout(timer);
    clear.hidden = !value;
    tiles.hidden = !!value.trim();
    timer = setTimeout(() => runSearch(results, value), immediate ? 0 : 220);
    history.replaceState(null, '', value ? `#/pcs?q=${encodeURIComponent(value)}` : '#/pcs');
  };

  input.addEventListener('input', () => go(input.value, false));
  view.querySelector('#searchform').addEventListener('submit', e => { e.preventDefault(); go(input.value, true); });
  clear.addEventListener('click', () => { input.value = ''; input.focus(); go('', true); });
  view.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => {
    input.value = b.dataset.ex; input.focus(); go(input.value, true);
  }));

  if (q) runSearch(results, q);
  else input.focus();
}

/* --------------------------------------------------------------- running */

async function runSearch(host, raw) {
  const q = raw.trim();
  if (!q) { host.innerHTML = ''; return; }
  host.innerHTML = loadingBlock('Looking…');

  if (looksLikePcs(q)) return showCode(host, q);
  return showWords(host, q);
}

async function showCode(host, raw) {
  const code = normalisePcs(raw);

  if (code.length === 7) {
    const ctx = await describe(code);
    if (ctx.exists) {
      host.innerHTML = `<div class="results-head">
          <h2 class="section-title">That is a valid code</h2>
          <span class="muted small">Every character, and what it means.</span>
        </div>
        <a class="codecard" href="#/pcscode/${esc(code)}">
          <div class="codecard-top">
            <span class="mono codecard-code">${esc(code)}</span>
            <span class="codecard-desc">${esc(ctx.desc)}</span>
          </div>
          ${charBoxes(code, ctx.chars)}
        </a>`;
      return;
    }
    host.innerHTML = `<div class="empty">
      <strong>${esc(code)} is not a valid ICD-10-PCS code.</strong>
      <p>${reasonText(ctx)}</p>
      <p><a href="#/build?c=${esc(code.slice(0, 3))}">Build a code from table ${esc(code.slice(0, 3))}</a>
         to see what the valid combinations are.</p></div>`;
    return;
  }

  // A partial code: show the tables it could belong to, and offer the builder.
  const tm = await tablemap();
  const pre = code.slice(0, 3);
  const hits = tm.filter(t => t[0].startsWith(code.slice(0, Math.min(3, code.length))));

  host.innerHTML = `<div class="results-head">
      <h2 class="section-title">${esc(code)} is a partial code</h2>
      <span class="muted small">A PCS code is always seven characters.
        ${hits.length} table${hits.length === 1 ? '' : 's'} start${hits.length === 1 ? 's' : ''} this way.</span>
    </div>
    <p><a class="btn btn-primary" href="#/build?c=${esc(code.slice(0, 3))}">Continue building from here →</a></p>
    <div class="result-list">
      ${hits.slice(0, 40).map(t => `<a class="result" href="#/pcstable/${esc(t[0])}">
        <span class="r-code">${esc(t[0])}</span>
        <span class="r-desc">${esc(t[4])} — ${esc(t[5])}</span>
        <span class="r-badges"><span class="badge badge-rules">${t[7].toLocaleString()} codes</span></span>
      </a>`).join('')}
    </div>`;
}

function reasonText(ctx) {
  if (ctx.reason === 'table') {
    return `There is no table ${esc(ctx.code.slice(0, 3))} — that combination of section, body system
      and root operation does not exist.`;
  }
  if (ctx.reason === 'row') {
    return `Table ${esc(ctx.code.slice(0, 3))} exists, but those last four characters do not appear
      together on any one row of it. In PCS you may only combine values that share a row.`;
  }
  return 'A PCS code is exactly seven characters long.';
}

async function showWords(host, q) {
  const tokens = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const all = await codes();

  const hits = [];
  for (const row of all.all) {
    if (tokens.every(t => row.lower.includes(t))) {
      hits.push(row);
      if (hits.length >= 400) break;
    }
  }

  const idx = await indexSearchRows();
  const idxHits = idx.filter(r => tokens.every(t => r.text.includes(t))).slice(0, 40);

  let html = '';

  if (idxHits.length) {
    html += `<div class="results-head">
        <h2 class="section-title">In the alphabetic index</h2>
        <span class="muted small">The index is where the procedure names live — PCS code titles
          never use eponyms.</span>
      </div>
      <div class="result-list">
        ${idxHits.map(h => `<a class="result"
            href="${h.code ? `#/build?c=${esc(h.code.replace(/[^0-9A-HJ-NP-Z]/g, ''))}` : `#/pcsindex?q=${encodeURIComponent(h.title)}`}">
          <span class="r-code">${esc(h.code || '—')}</span>
          <span class="r-desc">${highlight(h.title, tokens)}</span>
          <span class="r-badges">${h.use ? `<span class="badge badge-rules">use ${esc(h.use)}</span>` : ''}</span>
          <span class="r-where">${esc(h.trail)}</span>
        </a>`).join('')}
      </div>`;
  }

  if (hits.length) {
    html += `<div class="results-head">
        <h2 class="section-title">${hits.length >= 400 ? 'First 400 of many' : hits.length}
          code title${hits.length === 1 ? '' : 's'} match those words</h2>
        <span class="muted small">Code titles are built from the seven characters, so they read
          like a description of the operation.</span>
      </div>
      <div class="result-list">
        ${hits.slice(0, 120).map(row => `<a class="result" href="#/pcscode/${esc(row.code)}">
          <span class="r-code">${esc(row.code)}</span>
          <span class="r-desc">${highlight(row.desc, tokens)}</span>
        </a>`).join('')}
      </div>
      ${hits.length > 120 ? `<p class="small muted" style="margin-top:1rem">
        Showing the first 120. Add another word to narrow it down, or
        <a href="#/build">build the code</a> instead — that is usually faster than reading a list.</p>` : ''}`;
  }

  if (!html) {
    host.innerHTML = `<div class="empty">
      <strong>Nothing matched that.</strong>
      <p>Try a shorter word, or the anatomical term rather than the procedure name.
         You can also <a href="#/pcsindex?q=${encodeURIComponent(q)}">look it up in the index</a>,
         or <a href="#/build">build the code from the tables</a>.</p>
      <p class="small">Remember that PCS has no eponyms in its code titles — there is no "Whipple"
         and no "Nissen". The index is what translates those.</p></div>`;
    return;
  }
  host.innerHTML = html;
}
