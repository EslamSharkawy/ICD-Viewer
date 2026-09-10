// Build a code, one character at a time.
//
// This is the screen that makes the procedure side usable. A PCS code is not
// looked up; it is constructed, and the constraint that makes it hard is that
// the four trailing characters may only be combined the way a single row of the
// table allows. Everything offered here comes from `optionsFor`, which looks
// only at rows still consistent with the characters already chosen - so a
// combination that is not a real code is never on screen to be clicked.
//
// The partial code lives in the address bar, so the back button steps back a
// character and a half-built code can be sent to someone else.

import { esc, toast, loadingBlock } from '../../js/ui.js';
import * as store2 from '../store2.js';
import {
  sections, table, defs, deviceKey, codes, optionsFor, axisTitle, rowFor,
  normalisePcs, flattenKey, rootOperations,
} from '../pcsdata.js';
import { charBoxes, sectionChip, cite } from '../pcsui.js';
import { setGuidedBar } from '../../js/guided.js';
import { cardsForOperation, cardsForAxis } from '../decide-content.js';

const AXIS_HELP = [
  'Which body part was worked on. If the exact site has no value of its own, PCS has rules for what to choose instead.',
  'How the instrument reached the site.',
  'What was left in the patient at the end. If nothing remained, the answer is "No Device".',
  'A last piece of detail, and what it means changes from table to table.',
];

export async function renderBuilder(view, r) {
  setGuidedBar(null);
  const partial = normalisePcs(r.params.get('c') || '');

  view.innerHTML = loadingBlock('Opening the tables…');

  const secs = await sections();
  const step = partial.length;

  let tbl = null;
  if (step >= 3) {
    try {
      tbl = await table(partial.slice(0, 3));
    } catch {
      view.innerHTML = shell(partial, null, `<div class="empty">
        <strong>There is no table ${esc(partial.slice(0, 3))}.</strong>
        <p>That combination of section, body system and operation does not exist.
           <a href="#/build?c=${esc(partial.slice(0, 2))}">Go back a step</a>.</p></div>`);
      wire(view);
      return;
    }
  }

  let body;
  if (step === 0) body = pickSection(secs);
  else if (step === 1) body = pickBodySystem(secs, partial);
  else if (step === 2) body = await pickOperation(secs, partial);
  else if (step < 7) body = await pickAxis(tbl, partial);
  else body = await finished(tbl, partial);

  view.innerHTML = shell(partial, tbl, body);
  wire(view);
}

/* ---------------------------------------------------------------- shell */

function shell(partial, tbl, body) {
  const chars = charsSoFar(partial, tbl);
  const done = partial.length === 7;

  return `<div class="wrap-mid builder">
    <div class="builder-head">
      <div>
        <h1>Build a procedure code</h1>
        <p class="lede">Seven characters, chosen one at a time. Only values that can legally follow
          what you have already picked are offered, so anything you can build here is a real code.</p>
      </div>
      <div class="builder-actions">
        ${partial ? `<a class="btn" href="#/build">Start again</a>` : ''}
        ${partial.length ? `<a class="btn" href="#/build?c=${esc(partial.slice(0, -1))}">← Back a character</a>` : ''}
      </div>
    </div>

    <div class="codestrip ${done ? 'done' : ''}">
      <div class="codestrip-code mono">${esc(partial.padEnd(7, '·'))}</div>
      ${charBoxes(partial, chars, { interactive: true, active: partial.length })}
    </div>

    <div class="builder-body">${body}</div>
  </div>`;
}

function charsSoFar(partial, tbl) {
  const chars = [
    { title: 'Section', label: '' },
    { title: 'Body System', label: '' },
    { title: 'Operation', label: '' },
    { title: 'Body Part', label: '' },
    { title: 'Approach', label: '' },
    { title: 'Device', label: '' },
    { title: 'Qualifier', label: '' },
  ];
  if (!tbl) return chars;
  chars[0].label = tbl.sec[1];
  chars[1].label = tbl.bs[1];
  chars[2].label = tbl.op[1];
  for (let i = 0; i < 4; i++) {
    chars[3 + i].title = axisTitle(tbl, i);
    const ch = partial[3 + i];
    if (!ch) continue;
    for (const row of tbl.rows) {
      const hit = row.ax[i].find(l => l[0] === ch);
      if (hit) { chars[3 + i].label = hit[1]; break; }
    }
  }
  return chars;
}

function wire(view) {
  view.querySelectorAll('[data-char]').forEach(b => {
    b.addEventListener('click', () => {
      const i = +b.dataset.char;
      const cur = normalisePcs(new URLSearchParams(location.hash.split('?')[1] || '').get('c') || '');
      location.hash = '#/build' + (i ? `?c=${cur.slice(0, i)}` : '');
    });
  });

  const save = view.querySelector('#save-build');
  if (save) {
    save.addEventListener('click', () => {
      const code = save.dataset.code;
      const desc = save.dataset.desc;
      const note = (view.querySelector('#build-note') || {}).value || '';
      store2.saveBuild(code, desc, note);
      toast('Kept ' + code + ' in your saved builds.');
    });
  }

  const filter = view.querySelector('#opt-filter');
  if (filter) {
    filter.addEventListener('input', () => {
      const q = filter.value.trim().toLowerCase();
      let shown = 0;
      view.querySelectorAll('.optrow').forEach(el => {
        const hit = !q || el.dataset.search.includes(q);
        el.hidden = !hit;
        if (hit) shown++;
      });
      const none = view.querySelector('#opt-none');
      if (none) none.hidden = shown > 0;
    });
    filter.focus();
  }
}

/* --------------------------------------------------------------- step 1 */

function pickSection(secs) {
  return `<h2 class="section-title">Character 1 &mdash; which section?</h2>
    <p class="step-help">The section says what kind of procedure this is. Almost everything in an
      inpatient chart is section 0. ${cite('A1')}</p>
    <div class="optgrid">
      ${secs.map(s => `<a class="optcard" href="#/build?c=${esc(s.code)}">
        <span class="optcard-char mono">${esc(s.code)}</span>
        <span class="optcard-main">
          <b>${esc(s.plain)}</b>
          <span class="optcard-official">${esc(s.title)}</span>
          <span class="optcard-blurb">${esc(s.blurb)}</span>
        </span>
      </a>`).join('')}
    </div>`;
}

/* --------------------------------------------------------------- step 2 */

function pickBodySystem(secs, partial) {
  const s = secs.find(x => x.code === partial[0]);
  if (!s) return notThere(partial, 'section');
  return `<h2 class="section-title">Character 2 &mdash; which body system?</h2>
    <p class="step-help">Within ${sectionChip(s.code, s.plain)} there are
      ${s.bs.length} body systems. ${cite('B2.1a')}</p>
    ${optFilter('body system')}
    <div class="optlist">
      ${s.bs.map(b => `<a class="optrow" data-search="${esc((b.code + ' ' + b.title).toLowerCase())}"
          href="#/build?c=${esc(partial + b.code)}">
        <span class="optrow-char mono">${esc(b.code)}</span>
        <span class="optrow-main"><b>${esc(b.title)}</b>
          <span class="optrow-sub">${b.ops.length} operation${b.ops.length === 1 ? '' : 's'} available</span></span>
      </a>`).join('')}
    </div>
    <p class="empty" id="opt-none" hidden>Nothing matched that word.</p>`;
}

/* --------------------------------------------------------------- step 3 */

async function pickOperation(secs, partial) {
  const s = secs.find(x => x.code === partial[0]);
  const b = s && s.bs.find(x => x.code === partial[1]);
  if (!b) return notThere(partial, 'body system');

  const ops = await rootOperations();
  const axisName = s.axisTitles ? s.axisTitles[2] : 'Operation';

  return `<h2 class="section-title">Character 3 &mdash; which ${esc(axisName.toLowerCase())}?</h2>
    <p class="step-help">This is the character that decides the code, and the one that is got wrong
      most often. Pick it from the <b>objective</b> of the procedure &mdash; what the surgeon was
      trying to achieve &mdash; not from the word written in the operative note. ${cite('A11')}
      ${partial[0] === '0' ? `<a class="inline-help" href="#/rootops">See all 31 root operations, grouped →</a>` : ''}</p>
    ${optFilter('operation')}
    <div class="optlist">
      ${b.ops.map(o => {
        const info = ops.get(o.title);
        const conf = info && info.group
          ? info.group.ops.filter(x => x !== o.title && b.ops.some(y => y.title === x))
          : [];
        return `<a class="optrow tall" data-search="${esc((o.code + ' ' + o.title + ' ' + (o.def || '')).toLowerCase())}"
            href="#/build?c=${esc(partial + o.code)}">
          <span class="optrow-char mono">${esc(o.code)}</span>
          <span class="optrow-main">
            <b>${esc(o.title)}</b>
            <span class="optrow-def">${esc(o.def || '')}</span>
            ${info && info.exp ? `<span class="optrow-sub">${esc(info.exp)}</span>` : ''}
            ${conf.length ? `<span class="optrow-warn">Often confused with ${esc(conf.join(', '))}</span>` : ''}
          </span>
        </a>`;
      }).join('')}
    </div>
    <p class="empty" id="opt-none" hidden>Nothing matched that word.</p>`;
}

/* ------------------------------------------------------------ steps 4-7 */

async function pickAxis(tbl, partial) {
  const i = partial.length - 3;             // 0..3
  const picks = [partial[3] || null, partial[4] || null, partial[5] || null, partial[6] || null];
  const opts = optionsFor(tbl, picks, i);
  const title = axisTitle(tbl, i);

  if (!opts.length) {
    return `<div class="empty"><strong>Nothing can follow that combination.</strong>
      <p>The characters chosen so far do not appear together on any row of table
      ${esc(tbl.id)}. <a href="#/build?c=${esc(partial.slice(0, -1))}">Go back a character</a>.</p></div>`;
  }

  const extra = await axisAnnotations(tbl, i, opts);
  const cards = cardsForAxis(i + 4, tbl.op[1]);

  return `<h2 class="section-title">Character ${partial.length + 1} &mdash; ${esc(title.toLowerCase())}</h2>
    <p class="step-help">${esc(AXIS_HELP[i])}
      ${opts.length > 1 ? `<b>${opts.length}</b> values are possible here given what you have picked.`
        : `Only one value is possible here.`}</p>
    ${cards.length ? `<p class="step-cards">${cards.map(c =>
        `<a class="cardchip" href="#/card/${esc(c.id)}">${esc(c.title)}</a>`).join('')}</p>` : ''}
    ${optFilter(title.toLowerCase())}
    <div class="optlist">
      ${opts.map(([code, label]) => {
        const note = extra.get(code) || extra.get(label) || '';
        return `<a class="optrow ${note ? 'tall' : ''}"
            data-search="${esc((code + ' ' + label + ' ' + note).toLowerCase())}"
            href="#/build?c=${esc(partial + code)}">
          <span class="optrow-char mono">${esc(code)}</span>
          <span class="optrow-main"><b>${esc(label)}</b>
            ${note ? `<span class="optrow-def">${esc(note)}</span>` : ''}</span>
        </a>`;
      }).join('')}
    </div>
    <p class="empty" id="opt-none" hidden>Nothing matched that word.</p>`;
}

/**
 * Explanatory text for the values on offer: the official approach definitions,
 * and for devices the trade names and synonyms from the Device Key. Without
 * this, character 5 and character 6 are lists of bare phrases.
 */
async function axisAnnotations(tbl, i, opts) {
  const out = new Map();
  const sec = tbl.sec[0];

  if (i === 1) {                                   // Approach
    const d = await defs();
    const terms = ((d[sec] || {})['5'] || {}).terms || [];
    for (const t of terms) {
      for (const v of t.v) if (t.def) out.set(v, t.def);
    }
  }

  if (i === 2) {                                   // Device or Substance
    const rows = flattenKey(await deviceKey());
    const byValue = new Map(rows.map(r => [r.value, r]));
    for (const [, label] of opts) {
      const hit = byValue.get(label);
      if (hit && hit.includes.length) {
        out.set(label, 'Also written as: ' + hit.includes.slice(0, 6).join('; '));
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------- finished */

async function finished(tbl, code) {
  const picks = [code[3], code[4], code[5], code[6]];
  const row = rowFor(tbl, picks);
  const all = await codes();
  const official = all.byCode.get(code);

  if (!row || !official) {
    return `<div class="empty"><strong>That is not a valid code.</strong>
      <p>${esc(code)} is not on any row of table ${esc(tbl.id)}. This should not be reachable by
      clicking &mdash; if you typed the code into the address bar, check it against
      <a href="#/pcstable/${esc(tbl.id)}">the table</a>.</p></div>`;
  }

  const cards = cardsForOperation(tbl.op[1]);

  return `<div class="built">
    <div class="built-badge">✓ Valid code</div>
    <h2 class="built-code mono">${esc(code)}</h2>
    <p class="built-desc">${esc(official.desc)}</p>
    <p class="small muted">This is the official title from the FY2027 code file, not a title
      assembled from the characters.</p>

    <div class="built-actions">
      <a class="btn btn-primary" href="#/pcscode/${esc(code)}">Open the full code page</a>
      <a class="btn" href="#/pcstable/${esc(tbl.id)}?hl=${esc(code)}">See it in the table</a>
      <button class="btn" id="save-build" data-code="${esc(code)}" data-desc="${esc(official.desc)}">Keep this build</button>
    </div>

    <label class="built-note">
      <span>A note to yourself about why you chose this (kept on this computer only)</span>
      <textarea id="build-note" rows="2" placeholder="e.g. op note says partial resection of the gallbladder"></textarea>
    </label>

    ${cards.length ? `<div class="built-checks">
      <h3>Before you commit to this, check</h3>
      <ul>${cards.map(c => `<li><a href="#/card/${esc(c.id)}">${esc(c.title)}</a>
        <span class="muted">${esc(c.question)}</span></li>`).join('')}</ul>
    </div>` : ''}
  </div>`;
}

/* --------------------------------------------------------------- bits */

function optFilter(what) {
  return `<div class="searchbox compact optfilter">
    <span class="mag" aria-hidden="true">🔍</span>
    <label class="skip-link" for="opt-filter">Filter the list</label>
    <input id="opt-filter" type="search" autocomplete="off" spellcheck="false"
           placeholder="Type to narrow the ${esc(what)} list">
  </div>`;
}

function notThere(partial, what) {
  return `<div class="empty"><strong>That ${esc(what)} does not exist.</strong>
    <p><a href="#/build">Start again</a>.</p></div>`;
}
