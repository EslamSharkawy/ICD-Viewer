// The Alphabetic Index - the half of the book you are supposed to start in.
//
// The rule the whole screen is built around: find the term here, then confirm
// the code in the tabular list. The index never shows exclusions or seventh
// characters, so a code taken from here alone is not safe to use.

import { esc, loadingBlock, openDrawer } from '../ui.js';
import { indexMain, indexLetter, indexSearchRows, codes } from '../data.js';
import { setGuidedBar, guidedOn } from '../guided.js';

const LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

const HELP = {
  nemod: {
    title: 'Words in brackets',
    body: `<p>Words printed inside round brackets after a term are <b>non-essential modifiers</b>.
      They do not change the code. The record may include them or leave them out; you land in the same place either way.</p>
      <div class="worked"><span class="worked-label">For example</span>
      <b>Abasia (-astasia) (hysterical)</b> is one entry, not three. Whether the chart says "abasia" or
      "hysterical abasia", the code is F44.4.</div>`,
  },
  subterm: {
    title: 'Indented words below a term',
    body: `<p>Indented words <b>do</b> change the code. Each level of indentation narrows the meaning of the
      line above it, and you must read the whole chain from the main term down.</p>
      <p>Misreading which level a subterm sits under is the single most common beginner error in the book.
      That is why the indentation on this screen is drawn with a line rather than left to the eye.</p>
      <div class="worked"><span class="worked-label">For example</span>
      Disease → pulmonary → obstructive (chronic) → with acute exacerbation is four steps.
      Stopping one step early gives you a different code.</div>`,
  },
  see: {
    title: '"see" and "see also"',
    body: `<p><b>see</b> is an instruction, not a suggestion: the entry you are looking at has no code, and
      you must go to the term named instead.</p>
      <p><b>see also</b> is softer. There is a code here, but if it does not fit what the record says,
      there is more under the other term.</p>
      <p>On this screen both are buttons. You never have to retype anything.</p>`,
  },
  condition: {
    title: '"see condition"',
    body: `<p>This is a dead end, and it catches everybody once.</p>
      <p>It means you have looked up a <b>describing word</b> rather than the condition itself.
      The index is organised by the name of the disease or injury, not by the adjectives around it.</p>
      <div class="worked"><span class="worked-label">What to do instead</span>
      Look up the disease or injury by name. Search <b>fracture</b>, not <b>broken</b>.
      Search <b>pain</b>, not <b>sore</b>. Search <b>inflammation</b> or the "-itis" word, not <b>swollen</b>.</div>`,
  },
  manif: {
    title: 'A second code in square brackets',
    body: `<p>When the index prints a second code in square brackets, <b>two codes are required</b>, and the
      order is fixed. The first code is the underlying disease. The bracketed one is the manifestation -
      what that disease is doing to the body - and it can never be listed first.</p>
      <div class="worked"><span class="worked-label">For example</span>
      Amyloid heart disease is indexed as E85.4 [I43]. Both codes go on the account, E85.4 first.</div>`,
  },
  dash: {
    title: 'A code ending in a dash',
    body: `<p>A dash at the end of a code means the code is not finished. More characters are needed,
      and only the tabular list can tell you which ones.</p>
      <p>This is exactly why you never assign a code straight from the index.</p>`,
  },
};

export async function renderIndex(view, r) {
  const q = r.params.get('q') || '';
  const see = r.params.get('see') || '';
  const t = r.params.get('t') || '';

  view.innerHTML = shell(q);
  wireSearch(view);

  const host = view.querySelector('#idx-results');

  if (guidedOn()) setGuidedBar(1, 'Find the wording the record uses, then press "Confirm in the tabular list".');
  else setGuidedBar(null);

  const letter = r.params.get('letter');
  if (t) return showTerm(host, t, r.params.get('path') || '');
  if (see) return followSee(host, see);
  if (letter) return showLetter(host, letter);
  if (q) return runIndexSearch(host, q);
  return showLanding(host);
}

function shell(q) {
  return `<div class="wrap-mid">
    <h1 style="font-size:1.6rem;margin-bottom:.35rem">Look up a condition</h1>
    <p class="lede" style="margin-bottom:1.2rem">This is the alphabetical half of the code book. You find the words
      the doctor wrote here, and then you confirm the code in the tabular list. Never assign a code from this
      screen alone — the index does not show exclusions or seventh characters.</p>

    <form class="searchbox compact" id="idxform" role="search" style="max-width:640px;margin:0 0 1rem">
      <span class="mag" aria-hidden="true">🔤</span>
      <input id="idxq" type="search" autocomplete="off" spellcheck="false" value="${esc(q)}"
             placeholder="Type the condition the way it appears in the record">
    </form>

    <div class="chips" style="justify-content:flex-start;margin-bottom:1.4rem">
      <span class="small muted" style="align-self:center;margin-right:.3rem">How to read this index:</span>
      ${Object.entries(HELP).map(([k, v]) => `<button class="chip" data-idxhelp="${k}">? ${esc(v.title)}</button>`).join('')}
    </div>

    <div class="index-layout">
      <div id="idx-results"></div>
      <aside class="detail-side">
        <div class="panel">
          <div class="panel-head"><h3>Jump to a letter</h3><p>8,130 main terms, A to Z.</p></div>
          <div class="panel-body"><div class="letters">
            ${LETTERS.map(L => `<button data-letter="${L}">${L}</button>`).join('')}
          </div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>The two-step habit</h3></div>
          <div class="panel-body small">
            <p><b>Step one.</b> Find the term here, following the indentation down until the line matches the record.</p>
            <p><b>Step two.</b> Press <b>Confirm in the tabular list</b>. That opens the code with every rule that
            governs it, including the ones inherited from the chapter above.</p>
            <p class="muted">Turn on <b>Walk me through it</b> in the top bar and the tool will pace those two steps for you.</p>
          </div>
        </div>
      </aside>
    </div>
  </div>`;
}

function wireSearch(view) {
  const input = view.querySelector('#idxq');
  view.querySelector('#idxform').addEventListener('submit', e => {
    e.preventDefault();
    location.hash = '#/index?q=' + encodeURIComponent(input.value);
  });
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      history.replaceState(null, '', '#/index?q=' + encodeURIComponent(input.value));
      runIndexSearch(view.querySelector('#idx-results'), input.value);
    }, 260);
  });

  view.querySelectorAll('[data-idxhelp]').forEach(b => b.addEventListener('click', () => {
    const h = HELP[b.dataset.idxhelp];
    openDrawer(h.title, h.body);
  }));

  view.querySelectorAll('[data-letter]').forEach(b => b.addEventListener('click', () => {
    location.hash = '#/index?letter=' + b.dataset.letter;
    showLetter(view.querySelector('#idx-results'), b.dataset.letter);
  }));
}

/* --------------------------------------------------------------- landing */

async function showLanding(host) {
  host.innerHTML = `<div class="empty">
    <strong>Start by typing what the record says.</strong>
    <p>Use the doctor's own words. The index carries everyday wording as well as clinical wording, so
       "sugar diabetes", "flu" and "broken hip" all lead somewhere.</p>
    <p class="small" style="margin-top:1rem">Or try
      <a href="#/index?q=disease pulmonary obstructive">disease, pulmonary, obstructive</a> ·
      <a href="#/index?q=pain abdominal">pain, abdominal</a> ·
      <a href="#/index?q=diabetes type 2 kidney">diabetes, type 2, kidney</a> ·
      <a href="#/index?q=broken">broken</a></p>
  </div>`;
}

async function showLetter(host, L) {
  host.innerHTML = loadingBlock('Loading the letter ' + L + '…');
  const terms = await indexLetter(L);
  host.innerHTML = `<h2 class="section-title">Main terms beginning with ${esc(L)}</h2>
    <p class="small muted" style="margin-bottom:.8rem">${terms.length} entries.</p>
    <div class="result-list">
      ${terms.map((t, i) => `<a class="result" href="#/index?t=${esc(L)}.${i}" style="grid-template-columns:1fr auto">
        <span class="r-desc"><b>${esc(t.t)}</b> ${t.nm ? `<span class="idx-nemod">${esc(t.nm)}</span>` : ''}</span>
        <span class="r-badges">${t.c ? `<span class="badge badge-rules">${esc(t.c)}</span>` : ''}${t.k ? `<span class="badge badge-heading">${t.k.length} subterms</span>` : ''}</span>
      </a>`).join('')}
    </div>`;
}

/* ---------------------------------------------------------------- search */

async function runIndexSearch(host, q) {
  const query = q.trim().toLowerCase();
  if (!query) return showLanding(host);

  host.innerHTML = loadingBlock('Searching the index…');
  const rows = await indexSearchRows();
  const tokens = query.split(/[\s,]+/).filter(Boolean);

  const scored = [];
  for (const r of rows) {
    let score = 0, ok = true;
    for (const t of tokens) {
      const at = r.text.indexOf(t);
      if (at < 0) { ok = false; break; }
      score += at === 0 ? 5 : 2;
    }
    if (!ok) continue;
    if (r.text === query) score += 20;
    if (r.text.startsWith(query)) score += 8;
    score -= r.text.length / 120;
    scored.push([score, r]);
  }
  scored.sort((a, b) => b[0] - a[0]);

  if (!scored.length) {
    host.innerHTML = `<div class="empty">
      <strong>Nothing in the index matched that.</strong>
      <p>Try one word rather than a phrase, and use the name of the disease or injury rather than a
         describing word — <b>fracture</b> rather than <b>broken</b>. You can also
         <a href="#/search?q=${encodeURIComponent(q)}">search the code descriptions instead</a>.</p></div>`;
    return;
  }

  // Group the hits under the main term they belong to, the way the book prints them.
  const byMain = new Map();
  for (const [score, r] of scored.slice(0, 400)) {
    const key = r.letter + '.' + r.mi;
    if (!byMain.has(key)) byMain.set(key, { score, letter: r.letter, mi: r.mi, hits: [] });
    const g = byMain.get(key);
    g.score = Math.max(g.score, score);
    if (g.hits.length < 6) g.hits.push(r);
  }

  const groups = [...byMain.values()].sort((a, b) => b.score - a.score).slice(0, 25);
  const { byCode } = await codes();

  host.innerHTML = `<div class="results-head">
      <h2 class="section-title">${scored.length} ${scored.length === 1 ? 'entry' : 'entries'} in the index match</h2>
      <span class="muted small">Grouped under the main term each one sits below. Read each line left to right — every arrow is one step of indentation in the book.</span>
    </div>
    ${groups.map(g => {
      const mainTerm = (g.hits[0].trail || '').split(' › ')[0];
      return `<div class="card" style="padding:.9rem 1.1rem;margin-bottom:.6rem">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:baseline;flex-wrap:wrap">
          <a href="#/index?t=${esc(g.letter)}.${g.mi}" style="font-weight:700;font-size:1.02rem">${esc(mainTerm)}</a>
          <a class="small" href="#/index?t=${esc(g.letter)}.${g.mi}">Open the whole entry →</a>
        </div>
        <ul class="trail-paths" style="margin-top:.4rem">
          ${g.hits.map(hRow => {
            const code = (hRow.code || '').replace(/-$/, '');
            const row = byCode.get(code);
            return `<li style="display:flex;justify-content:space-between;gap:1rem;align-items:baseline;flex-wrap:wrap">
              <span>${trailHtml(hRow.trail)}</span>
              <span style="display:flex;gap:.4rem;align-items:center">
                ${hRow.code ? `<span class="code-text small">${esc(hRow.code)}</span>` : ''}
                ${code && row ? confirmBtn(code, hRow.trail) : (hRow.code ? `<span class="small muted">not a complete code — open the entry</span>` : '')}
              </span>
            </li>`;
          }).join('')}
        </ul>
      </div>`;
    }).join('')}`;
}

function trailHtml(trail) {
  const parts = String(trail || '').split(' › ');
  return `<span class="grid-trail">${parts.map((p, i) =>
    `<span class="tp-seg ${i === 0 ? 'first' : ''}">${esc(p)}</span>`).join('<span class="tp-sep">→</span>')}</span>`;
}

function confirmBtn(code, trail, label) {
  return `<a class="confirm-btn" href="#/code/${esc(code)}?confirm=1&trail=${encodeURIComponent(trail)}">
    ✓ ${esc(label || 'Confirm in the tabular list')}</a>`;
}

/* ------------------------------------------------------------ a whole term */

async function showTerm(host, t, path) {
  const [L, miRaw] = t.split('.');
  const mi = +miRaw;
  host.innerHTML = loadingBlock('Opening the entry…');
  const terms = await indexLetter(L);
  const main = terms[mi];
  if (!main) { host.innerHTML = `<div class="empty"><strong>That entry is not there.</strong></div>`; return; }

  const { byCode } = await codes();

  // "see condition" is a dead end that confuses everybody the first time.
  const isDeadEnd = [main.see, main.seeAlso].some(v => v && /^condition$/i.test(v.trim()));
  const hitPath = path ? path.split('.').map(Number) : [];

  host.innerHTML = `<p class="small"><a href="#/index">← Back to the index</a></p>
    ${isDeadEnd ? deadEnd(main.t) + '<div style="height:1rem"></div>' : ''}
    <div class="card" style="padding:1.1rem 1.3rem">
      ${renderTree([main], hitPath, byCode)}
    </div>
    <p class="small muted" style="margin-top:.8rem">Each step of indentation narrows the meaning of the line above it.
      Words in light grey brackets do not change the code.</p>`;
}

async function followSee(host, target) {
  host.innerHTML = loadingBlock('Following the cross-reference…');
  if (/^condition$/i.test(target.trim())) {
    host.innerHTML = deadEnd(null);
    return;
  }
  const mains = await indexMain();
  const parts = target.split(/,\s*/);
  const wanted = parts[0].trim().toLowerCase();
  let found = mains.find(([title]) => title.toLowerCase() === wanted);
  if (!found) found = mains.find(([title]) => title.toLowerCase().startsWith(wanted));
  if (!found) {
    host.innerHTML = `<div class="empty"><strong>The index points at “${esc(target)}”, but that main term is not in this edition.</strong>
      <p><a href="#/index?q=${encodeURIComponent(target)}">Search for it instead</a>.</p></div>`;
    return;
  }
  location.hash = `#/index?t=${found[1]}.${found[2]}`;
}

function deadEnd(term) {
  return `<div class="deadend">
    <h3>This entry is a dead end — and that is on purpose</h3>
    <p>${term ? `<b>${esc(term)}</b> says “see condition”.` : 'That entry says “see condition”.'}
       You've looked up a describing word rather than the condition itself.
       Search for the disease or injury name instead — for example, search <b>fracture</b>, not <b>broken</b>.</p>
    <p class="small" style="margin-top:.6rem">The index is filed under the name of the illness or injury.
       Adjectives — broken, sore, swollen, bad — never carry codes of their own.</p>
    <p style="margin-top:.8rem"><button class="btn btn-primary" data-try="fracture">Try “fracture” instead</button></p>
  </div>`;
}

/* ------------------------------------------------------------ tree render */

function renderTree(nodes, hitPath, byCode, depth = 0, prefix = []) {
  return `<ul class="${depth === 0 ? 'idx-tree' : 'idx-children'}">
    ${nodes.map((n, i) => {
      const here = prefix.concat([i]);
      const isHit = hitPath.length && here.length === hitPath.length && here.every((v, k) => v === hitPath[k]);
      return `<li class="idx-item ${depth === 0 ? 'idx-main' : ''} ${isHit ? 'hit' : ''}">
        <div class="idx-row">
          <span class="idx-term">${esc(n.t)}${n.nm ? ` <span class="idx-nemod" title="The code is the same whether or not the record includes these words.">${esc(n.nm)}</span>` : ''}</span>
          ${n.see ? seeChip('see', n.see) : ''}
          ${n.seeAlso ? seeChip('see also', n.seeAlso) : ''}
          ${n.seecat ? `<span class="small muted">see category <a class="code-link" href="#/code/${esc(n.seecat)}">${esc(n.seecat)}</a></span>` : ''}
          ${codeBit(n, byCode)}
        </div>
        ${n.m ? pairHtml(n, byCode) : ''}
        ${n.k ? renderTree(n.k, hitPath, byCode, depth + 1, here) : ''}
      </li>`;
    }).join('')}
  </ul>`;
}

function codeBit(n, byCode) {
  if (!n.c || n.m) return '';
  const clean = n.c.replace(/-$/, '');
  const known = byCode && byCode.get(clean);
  const dash = n.c.endsWith('-') || n.sub;
  return `<span class="code-text small">${esc(n.c)}</span>
    ${dash ? `<button class="chip small" data-idxhelp="dash" title="This code is not finished">needs more characters</button>` : ''}
    ${known
      ? (dash
          ? `<a class="confirm-btn" href="#/code/${esc(clean)}">→ See the choices in the tabular list</a>`
          : confirmBtn(clean, n.t))
      : `<span class="small muted">confirm in the tabular list</span>`}`;
}

function pairHtml(n, byCode) {
  const a = n.c.replace(/-$/, ''), b = n.m.replace(/-$/, '');
  const da = byCode && byCode.get(a), db = byCode && byCode.get(b);
  return `<div class="pair">
    <div class="pair-head">Two codes needed, in this order</div>
    <div class="pair-item"><span class="pair-n">1</span><a class="code-link" href="#/code/${esc(a)}">${esc(n.c)}</a>
      <span>${esc(da ? da.desc : 'the underlying disease')}</span></div>
    <div class="pair-item"><span class="pair-n">2</span><a class="code-link" href="#/code/${esc(b)}">${esc(n.m)}</a>
      <span>${esc(db ? db.desc : 'the manifestation')}</span></div>
    <div style="display:flex;gap:.4rem;margin-top:.4rem;flex-wrap:wrap">
      ${da ? confirmBtn(a, n.t, 'Confirm ' + n.c + ' in the tabular list') : ''}
      ${db ? confirmBtn(b, n.t, 'Confirm ' + n.m + ' in the tabular list') : ''}
      <button class="chip" data-idxhelp="manif">? Why two codes</button>
    </div>
  </div>`;
}

function seeChip(kind, target) {
  if (/^condition$/i.test(String(target).trim())) {
    return `<button class="seechip" data-idxhelp="condition">${esc(kind)} condition — what does that mean?</button>`;
  }
  return `<a class="seechip" href="#/index?see=${encodeURIComponent(target)}">${esc(kind)} ${esc(target)} →</a>`;
}

/* Delegated clicks for help chips and the dead-end suggestion. */
document.addEventListener('click', e => {
  const help = e.target.closest('[data-idxhelp]');
  if (help && HELP[help.dataset.idxhelp]) {
    const h = HELP[help.dataset.idxhelp];
    openDrawer(h.title, h.body);
    return;
  }
  const tryBtn = e.target.closest('[data-try]');
  if (tryBtn) location.hash = '#/index?q=' + encodeURIComponent(tryBtn.dataset.try);
});
