// The landing screen: one box that accepts a code, a condition in everyday
// words, or a phrase to hunt for inside the note text.

import { esc, highlight, billableBadge, rulesBadge, loadingBlock, NOTE_TYPES } from '../ui.js';
import { interpret, searchCodes, searchViaIndex, searchNotes, codeMatches, sevenCharCodes } from '../search.js';
import { chapters, blockmap, resolve } from '../data.js';
import { guidedOn, setGuidedBar } from '../guided.js';

const EXAMPLES = [
  { label: 'J44.1', mono: true },
  { label: 'copd flare up' },
  { label: 'chest pain' },
  { label: 'notes mentioning tobacco' },
  { label: 'codes that need a 7th character' },
];

const TILES = [
  { href: '#/browse', icon: '📚', title: 'Browse by chapter', sub: 'Start from the 22 chapters and work down to a code.' },
  { href: '#/index', icon: '🔤', title: 'Look up a condition', sub: 'Search the alphabetic index the way the doctor wrote it.' },
  { href: '#/check', icon: '⚖️', title: 'Check a list of codes for conflicts', sub: 'Paste the codes from an account and see if any clash.' },
  { href: '#/whatsnew', icon: '🗓️', title: "What's new this year", sub: 'Codes added, retired and reworded for FY2027.' },
  { href: '#/glossary', icon: '📖', title: 'Plain-language glossary', sub: 'Every convention in the book, explained once, properly.' },
];

let blockToChapter = null;
let chapterByNum = null;

async function ensureMaps() {
  if (blockToChapter) return;
  const [bm, ch] = await Promise.all([blockmap(), chapters()]);
  blockToChapter = new Map(bm.map(([, , id, cnum]) => [id, cnum]));
  chapterByNum = new Map(ch.map(c => [c.num, c]));
}

function whereLine(row) {
  const cnum = blockToChapter.get(row.block);
  const ch = chapterByNum.get(cnum);
  return ch ? `Chapter ${ch.num} · ${ch.plain} · block ${esc(row.block)}` : '';
}

export function resultRow(row, tokens = []) {
  return `<a class="result" href="#/code/${esc(row.code)}">
    <span class="r-code">${esc(row.code)}</span>
    <span class="r-desc">${highlight(row.desc, tokens)}</span>
    <span class="r-badges">${billableBadge(row.flags)}${rulesBadge(row.notes)}</span>
    <span class="r-where">${whereLine(row)}</span>
  </a>`;
}

export async function renderHome(view, r) {
  await ensureMaps();
  const q = r.params.get('q') || '';

  view.innerHTML = `
    <div class="wrap-mid">
      <div class="hero">
        <h1>Every rule that applies to a code, in one place</h1>
        <p class="lede">In the code book the instructions that govern a single code are scattered across
          four levels — the chapter, the block, the category and the code itself. Look up a code here and
          you see all four at once, each rule labelled with where it came from.</p>

        <form class="searchbox" id="searchform" role="search">
          <span class="mag" aria-hidden="true">🔍</span>
          <label class="skip-link" for="q">Search</label>
          <input id="q" name="q" type="search" autocomplete="off" spellcheck="false"
                 value="${esc(q)}"
                 placeholder="Search a code, a condition, or a word inside the notes">
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

  setGuidedBar(null);

  const input = view.querySelector('#q');
  const clear = view.querySelector('#clearq');
  const results = view.querySelector('#results');
  const tiles = view.querySelector('#tiles');

  let timer = null;
  const go = (value, immediate) => {
    clearTimeout(timer);
    clear.hidden = !value;
    tiles.hidden = !!value.trim();
    const delay = immediate ? 0 : 220;
    timer = setTimeout(() => runSearch(results, value), delay);
    const next = value ? `#/search?q=${encodeURIComponent(value)}` : '#/';
    history.replaceState(null, '', next);
  };

  input.addEventListener('input', () => go(input.value, false));
  view.querySelector('#searchform').addEventListener('submit', e => {
    e.preventDefault();
    go(input.value, true);
  });
  clear.addEventListener('click', () => { input.value = ''; input.focus(); go('', true); });
  view.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => {
    input.value = b.dataset.ex;
    input.focus();
    go(input.value, true);
  }));

  if (q) runSearch(results, q);
  else input.focus();
}

/* ---------------------------------------------------------------- running */

async function runSearch(host, raw) {
  const parsed = interpret(raw);
  if (parsed.mode === 'empty') { host.innerHTML = ''; return; }

  host.innerHTML = loadingBlock('Looking…');

  if (parsed.mode === 'code') return showCode(host, parsed);
  if (parsed.mode === 'notes') return showNotes(host, parsed);
  if (parsed.mode === 'seventh') return showSeventh(host);
  return showText(host, parsed);
}

async function showCode(host, parsed) {
  const { exact, kids } = await codeMatches(parsed.code);
  const ctx = exact ? null : await resolve(parsed.code);

  const head = `<div class="results-head">
      <h2 class="section-title">That looks like a code</h2>
      <span class="muted small">Showing ${esc(parsed.code)} and everything filed underneath it.</span>
    </div>`;

  let body = '';
  if (exact) body += resultRow(exact);
  else if (ctx && ctx.exists) {
    body += `<a class="result" href="#/code/${esc(ctx.code)}">
      <span class="r-code">${esc(ctx.code)}</span>
      <span class="r-desc">${esc(ctx.desc)}</span>
      <span class="r-badges">${billableBadge(ctx.flags)}</span>
      <span class="r-where">A seventh character added to ${esc(ctx.baseCode)}</span></a>`;
  }

  if (kids.length) {
    body += `<div class="results-head"><h3 class="section-title">More specific codes underneath it</h3>
      <span class="muted small">${kids.length} ${kids.length === 1 ? 'code' : 'codes'}</span></div>`;
    body += kids.map(k => resultRow(k)).join('');
  }

  if (!body) {
    body = notFound(parsed.q);
  }
  host.innerHTML = head + `<div class="result-list">${body}</div>`;
}

async function showText(host, parsed) {
  const { rows, tokens, total } = await searchCodes(parsed.q);

  if (guidedOn()) {
    host.innerHTML = `<div class="confirm-strip">
      <h3>Walk-through is on, so let's start where a coder starts.</h3>
      <p class="small">You never assign a code straight from a description search. You find the words in the
      alphabetic index first, then confirm the code in the tabular list. Both steps are one click away.</p>
      <p style="margin-top:.7rem"><a class="btn btn-primary" href="#/index?q=${encodeURIComponent(parsed.q)}">Look "${esc(parsed.q)}" up in the index →</a>
      <button class="btn" id="skip-guided">Just show me matching codes</button></p>
    </div><div id="plain"></div>`;
    host.querySelector('#skip-guided').addEventListener('click', () => {
      renderTextResults(host.querySelector('#plain'), parsed, rows, tokens, total);
    });
    return;
  }

  renderTextResults(host, parsed, rows, tokens, total);
}

async function renderTextResults(host, parsed, rows, tokens, total) {
  let html = '';
  if (rows.length) {
    html += `<div class="results-head">
        <h2 class="section-title">${total} ${total === 1 ? 'code matches' : 'codes match'} those words</h2>
        <span class="muted small">Searched the wording of the codes themselves${tokens.length ? ` · looking for ${tokens.map(t => `<b>${esc(t)}</b>`).join(', ')}` : ''}</span>
      </div>
      <div class="result-list">${rows.map(r => resultRow(r, tokens)).join('')}</div>`;
  }

  // The index is a big file. Only reach for it when the code titles alone did
  // not answer the question.
  if (rows.length >= 5) {
    host.innerHTML = html + `<p class="small muted" style="margin-top:1rem">
      Not what you meant? <a href="#/index?q=${encodeURIComponent(parsed.q)}">Look the same words up in the alphabetic index</a>,
      which carries wording the code titles leave out.</p>`;
    return;
  }

  host.innerHTML = html + loadingBlock('Also checking the alphabetic index, where everyday wording lives…');

  const viaIndex = await searchViaIndex(parsed.q, rows.length ? 15 : 40);
  const fresh = viaIndex.rows.filter(v => v.row && !rows.some(r => r.code === v.code));

  let extra = '';
  if (fresh.length) {
    extra = `<div class="results-head">
        <h2 class="section-title">Found through the alphabetic index</h2>
        <span class="muted small">The index carries the everyday and clinical wording that the code titles leave out.</span>
      </div>
      <div class="result-list">${fresh.map(v => `
        <a class="result" href="#/code/${esc(v.code)}">
          <span class="r-code">${esc(v.code)}</span>
          <span class="r-desc">${esc(v.row.desc)}</span>
          <span class="r-badges">${billableBadge(v.row.flags)}${rulesBadge(v.row.notes)}</span>
          <span class="r-where">Index trail: ${esc(v.trail)}</span>
        </a>`).join('')}</div>`;
  }

  if (!rows.length && !fresh.length) {
    host.innerHTML = notFound(parsed.q);
    return;
  }
  host.innerHTML = html + extra;
}

async function showNotes(host, parsed) {
  const hits = await searchNotes(parsed.term);
  if (!hits.length) {
    host.innerHTML = notFound(parsed.term, 'No note in the book contains that word.');
    return;
  }
  const rows = hits.map(n => {
    const t = NOTE_TYPES[n.type === 'inclusionTerm' ? 'includes' : n.type] || NOTE_TYPES.notes;
    const where = n.level === 'c' ? `Chapter ${n.owner}`
      : n.level === 'b' ? `block ${n.owner}`
      : n.level === 'u' ? `group ${n.owner}` : n.owner;
    const href = n.level === 'c' ? `#/chapter/${n.owner}`
      : n.level === 'b' ? `#/block/${n.owner}`
      : n.level === 'u' ? `#/range/${n.owner}` : `#/code/${n.owner}`;
    return `<a class="result" href="${href}">
        <span class="r-code">${esc(where)}</span>
        <span class="r-desc">${highlight(n.text, [parsed.term])}</span>
        <span class="r-badges"><span class="badge badge-rules">${esc(t.plain)}</span></span>
        <span class="r-where">${esc(t.official)}</span>
      </a>`;
  }).join('');

  host.innerHTML = `<div class="results-head">
      <h2 class="section-title">${hits.length} ${hits.length === 1 ? 'note mentions' : 'notes mention'} “${esc(parsed.term)}”</h2>
      <span class="muted small">Each row says which level of the book the note is printed at.</span>
    </div><div class="result-list">${rows}</div>`;
}

async function showSeventh(host) {
  const rows = await sevenCharCodes();
  host.innerHTML = `<div class="results-head">
      <h2 class="section-title">Codes that are not finished until a seventh character is added</h2>
      <span class="muted small">Showing the first ${rows.length}. Open any of them to see the list of characters to choose from.</span>
    </div>
    <div class="result-list">${rows.map(r => resultRow(r)).join('')}</div>`;
}

function notFound(term, lead) {
  return `<div class="empty">
    <strong>${esc(lead || 'Nothing matched that.')}</strong>
    <p>Try a shorter word, check the spelling, or <a href="#/browse">browse by chapter</a>.
       You can also <a href="#/index?q=${encodeURIComponent(term || '')}">look the condition up in the alphabetic index</a>,
       which uses the wording doctors write rather than the wording the code titles use.</p>
  </div>`;
}
