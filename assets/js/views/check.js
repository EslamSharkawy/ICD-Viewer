// "Paste the codes from an account and I'll tell you if any of them clash."

import { esc, loadingBlock, linkifyCodes, typeVars, NOTE_TYPES } from '../ui.js';
import { resolve, collectNotes, refsInNote, refCovers } from '../data.js';
import { normaliseCode } from '../ui.js';
import * as store from '../store.js';
import { setGuidedBar } from '../guided.js';

export async function renderCheck(view) {
  setGuidedBar(null);
  const saved = store.get().worklist;

  view.innerHTML = `<div class="wrap-mid">
    <h1 style="font-size:1.6rem;margin-bottom:.35rem">Check a list of codes for conflicts</h1>
    <p class="lede" style="margin-bottom:1.4rem">Paste the codes from an account and I'll tell you if any of them clash.
      The check reads every instructional note that applies to each code — including the ones inherited from the
      category, the block and the chapter above it — and looks for codes in your list that those notes name.</p>

    <div class="check-grid">
      <div>
        <div class="panel">
          <div class="panel-head">
            <h3>The codes on the account</h3>
            <p>Commas, spaces or one per line all work. Pasting a column straight out of a spreadsheet works too.</p>
          </div>
          <div class="panel-body">
            <label class="skip-link" for="paste">Codes to check</label>
            <textarea class="codepaste" id="paste" placeholder="J44.1
Z72.0
E11.9
I25.10">${esc(saved)}</textarea>
            <div class="save-row">
              <button class="btn btn-primary btn-lg" id="run">Check these codes</button>
              <button class="btn" id="clear">Clear</button>
            </div>
            <p class="small muted" style="margin-top:.6rem">Your list is kept on this computer so it is still here when you come back.</p>
          </div>
        </div>
      </div>
      <div id="findings"></div>
    </div>
  </div>`;

  const box = view.querySelector('#paste');
  const out = view.querySelector('#findings');

  view.querySelector('#run').addEventListener('click', () => {
    store.setWorklist(box.value);
    run(out, box.value);
  });
  view.querySelector('#clear').addEventListener('click', () => {
    box.value = ''; store.setWorklist(''); out.innerHTML = '';
  });

  if (saved.trim()) run(out, saved);
  else out.innerHTML = `<div class="empty"><strong>Nothing to check yet.</strong>
    <p>Paste a list on the left and press <b>Check these codes</b>. You can also add codes one at a time
       from any code page, with the <b>Add to my working list</b> button.</p></div>`;
}

function parseCodes(text) {
  return [...new Set(
    String(text).split(/[\s,;|]+/).map(s => normaliseCode(s.replace(/["']/g, ''))).filter(c => /^[A-Z]\d/.test(c))
  )];
}

async function run(out, text) {
  const list = parseCodes(text);
  if (!list.length) {
    out.innerHTML = `<div class="empty"><strong>I could not find any codes in that.</strong>
      <p>A code starts with a letter and a number, like <b>J44.1</b> or <b>E11.9</b>.</p></div>`;
    return;
  }

  out.innerHTML = loadingBlock(`Reading the rules for ${list.length} ${list.length === 1 ? 'code' : 'codes'}…`);

  const contexts = [];
  for (const code of list) contexts.push(await resolve(code));

  const unknown = contexts.filter(c => !c || !c.exists).map((c, i) => c ? c.code : list[i]);
  const known = contexts.filter(c => c && c.exists);

  const never = [], maybe = [], missing = [], incomplete = [];
  const requirements = new Map();

  for (const ctx of known) {
    const groups = collectNotes(ctx);

    if (!ctx.flags.includes('b')) {
      incomplete.push({
        ctx,
        why: ctx.seventh && ctx.seventh.def.length && !ctx.ext
          ? 'This code is not finished until a seventh character is added.'
          : (ctx.node.ch && ctx.node.ch.length)
            ? `This is a heading, not a code. Pick one of the ${ctx.node.ch.length} more specific codes underneath it.`
            : 'This entry cannot be submitted on a claim as it stands.',
      });
    }

    for (const line of (groups.excludes1 || [])) {
      for (const other of known) {
        if (other.code === ctx.code) continue;
        if (refsInNote(line.text).some(ref => refCovers(ref, other.code))) {
          const key = [ctx.code, other.code].sort().join('|');
          if (!never.some(n => n.key === key)) never.push({ key, a: ctx, b: other, line });
        }
      }
    }

    for (const line of (groups.excludes2 || [])) {
      // Every chapter carries an Excludes2 listing all the other chapters. True,
      // but it is scenery - it would bury the findings that actually matter.
      if (line.origin.level === 'chapter') continue;
      for (const other of known) {
        if (other.code === ctx.code) continue;
        if (refsInNote(line.text).some(ref => refCovers(ref, other.code))) {
          const key = [ctx.code, other.code].sort().join('|');
          if (!maybe.some(n => n.key === key)) maybe.push({ key, a: ctx, b: other, line });
        }
      }
    }

    // A "use additional code" instruction is usually several lines under one
    // heading - a list of the things any one of which would satisfy it. Treat
    // the whole group as one requirement rather than nagging line by line.
    for (const type of ['useAdditionalCode', 'codeFirst']) {
      for (const line of (groups[type] || [])) {
        const refs = refsInNote(line.text);
        if (!refs.length) continue;                       // a prose lead-in, nothing to match
        const key = type + '|' + line.origin.long;
        let req = requirements.get(key);
        if (!req) {
          req = { type, origin: line.origin, lines: [], codes: new Set(), satisfiedBy: null };
          requirements.set(key, req);
        }
        if (!req.lines.includes(line.text)) req.lines.push(line.text);
        req.codes.add(ctx.code);
        const hit = known.find(o => o.code !== ctx.code && refs.some(ref => refCovers(ref, o.code)));
        if (hit) req.satisfiedBy = hit.code;
      }
    }
  }

  for (const req of requirements.values()) {
    if (!req.satisfiedBy) missing.push(req);
  }

  // A pair already flagged as forbidden does not also need a "maybe" row.
  const forbidden = new Set(never.map(n => n.key));
  const maybeClean = maybe.filter(m => !forbidden.has(m.key));

  out.innerHTML = render({ list, unknown, known, never, maybe: maybeClean, missing, incomplete });
}

function render({ list, unknown, known, never, maybe, missing, incomplete }) {
  const parts = [];

  parts.push(`<div class="results-head" style="margin-top:0">
    <h2 class="section-title">${known.length} ${known.length === 1 ? 'code' : 'codes'} checked</h2>
    <span class="muted small">${esc(known.map(c => c.code).join('  ·  '))}</span>
  </div>`);

  if (unknown.length) {
    parts.push(group('maybe', '❓', 'Not a code in this edition',
      `${unknown.length} ${unknown.length === 1 ? 'entry was' : 'entries were'} not found. They may be mistyped, or retired in an earlier year.`,
      `<div class="finding-body">${unknown.map(u => `<div class="pairrow"><span class="pc">${esc(u)}</span>
        <span>Not in FY2027. <a href="#/whatsnew">Check what changed this year</a>.</span></div>`).join('')}</div>`));
  }

  if (never.length) {
    parts.push(group('never', '⛔', 'Problem — these cannot be coded together',
      'An Excludes1 note names one of these codes under the other. The two are not allowed on the same account.',
      never.map(n => findingBody(n)).join('')));
  }

  if (maybe.length) {
    parts.push(group('maybe', '⚠', 'Check the documentation — these may both be correct',
      'An Excludes2 note links these. The second condition is not part of the first, but a patient can have both. Code both if the record documents both. Chapter-wide notes that simply say "that belongs in another chapter" are left out here.',
      maybe.map(n => findingBody(n)).join('')));
  }

  if (missing.length) {
    parts.push(group('add', '＋', 'Missing a required partner code',
      'One of your codes carries an instruction to add another code, and nothing in your list matches it.',
      missing.map(m => {
        const codes = [...m.codes];
        return `<div class="finding-body">
        <div class="pairrow"><span class="pc">${codes.map(c => `<a class="code-link" href="#/code/${esc(c)}">${esc(c)}</a>`).join(' ')}</span>
          <span>${codes.length === 1 ? 'carries this instruction' : 'all carry this instruction'}, and nothing on your list answers it.</span></div>
        <div class="why"><span class="why-label">${esc(NOTE_TYPES[m.type].plain)} — ${esc(NOTE_TYPES[m.type].official)}</span>
          <ul style="margin:.2rem 0 0;padding-left:1.1rem">${m.lines.map(t => `<li>${linkifyCodes(t)}</li>`).join('')}</ul>
          <div class="small muted" style="margin-top:.35rem">Any one of these would satisfy it. The instruction is printed at ${esc(m.origin.long)} — ${esc(m.origin.label)}.</div></div>
      </div>`;
      }).join('')));
  }

  if (incomplete.length) {
    parts.push(group('seven', '⑦', 'Not ready to submit',
      'These entries are not complete codes yet.',
      incomplete.map(i => `<div class="finding-body">
        <div class="pairrow"><span class="pc"><a class="code-link" href="#/code/${esc(i.ctx.code)}">${esc(i.ctx.code)}</a></span>
          <span>${esc(i.ctx.desc)}</span></div>
        <div class="why">${esc(i.why)}</div>
      </div>`).join('')));
  }

  if (!never.length && !maybe.length && !missing.length && !incomplete.length && !unknown.length) {
    parts.push(`<div class="allclear">
      <div class="big" aria-hidden="true">✓</div>
      <h3>Nothing clashes.</h3>
      <p>All ${known.length} codes are complete, none of them excludes another, and every instruction to add a
         second code is already satisfied by something on the list. That is exactly what you want to see.</p>
    </div>`);
  }

  return parts.join('');
}

function group(key, icon, title, sub, body) {
  return `<div class="finding" style="${typeVars(key)}">
    <div class="finding-head"><span aria-hidden="true">${icon}</span>
      <div><strong>${esc(title)}</strong><div class="small muted">${esc(sub)}</div></div>
    </div>
    ${body}
  </div>`;
}

function findingBody(n) {
  return `<div class="finding-body">
    <div class="pairrow"><span class="pc"><a class="code-link" href="#/code/${esc(n.a.code)}">${esc(n.a.code)}</a></span>
      <span>${esc(n.a.desc)}</span></div>
    <div class="pairrow"><span class="pc"><a class="code-link" href="#/code/${esc(n.b.code)}">${esc(n.b.code)}</a></span>
      <span>${esc(n.b.desc)}</span></div>
    <div class="why"><span class="why-label">The note that causes it</span>
      ${linkifyCodes(n.line.text)}
      <div class="small muted" style="margin-top:.3rem">Printed at ${esc(n.line.origin.long)} — ${esc(n.line.origin.label)}.</div>
    </div>
  </div>`;
}
