// One procedure code, taken apart.
//
// The point of this page is that a PCS code is readable once you know which
// axis each character belongs to. So the seven characters come first, each
// labelled with its axis and its meaning, and everything else hangs off that.

import { esc, toast } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import * as store2 from '../store2.js';
import { describe, normalisePcs, optionsFor, axisTitle, rootOperations, codes } from '../pcsdata.js';
import { charBoxes, cite } from '../pcsui.js';
import { cardsForOperation } from '../decide-content.js';

export async function renderPcsCode(view, r) {
  setGuidedBar(null);
  const code = normalisePcs(r.parts[1] || '');
  const ctx = await describe(code);

  if (!ctx.exists) {
    view.innerHTML = `<div class="wrap-narrow"><div class="empty">
      <strong>${esc(code || 'That')} is not a valid ICD-10-PCS code.</strong>
      <p>${ctx.reason === 'row'
        ? `Table ${esc(code.slice(0, 3))} exists, but those last four characters do not appear
           together on any single row. PCS only allows values that share a row.`
        : ctx.reason === 'table'
          ? `There is no table ${esc(code.slice(0, 3))}.`
          : 'A PCS code is exactly seven characters.'}</p>
      <p><a href="#/build${code ? `?c=${esc(code.slice(0, 3))}` : ''}">Build one instead</a>,
         or <a href="#/pcs">search</a>.</p></div></div>`;
    return;
  }

  store2.pushRecent(ctx.code, ctx.desc);
  const ops = await rootOperations();
  const opInfo = ops.get(ctx.table.op[1]);
  const cards = cardsForOperation(ctx.table.op[1]);
  const starred = store2.isStarred(ctx.code);

  view.innerHTML = `<div class="wrap-mid">
    <div class="code-head">
      <div class="code-head-top">
        <div>
          <div class="code-number mono">${esc(ctx.code)}</div>
          <div class="code-desc">${esc(ctx.desc)}</div>
          <p class="small muted" style="margin-top:.5rem">The official FY2027 title. This is the
            wording on the code file, not a title assembled from the characters.</p>
        </div>
        <div class="head-actions">
          <button class="btn ${starred ? 'on' : ''}" id="star-btn">${starred ? '★ Starred' : '☆ Star'}</button>
          <a class="btn" href="#/build?c=${esc(ctx.code)}">Open in the builder</a>
          <a class="btn" href="#/pcstable/${esc(ctx.table.id)}?hl=${esc(ctx.code)}">See the table</a>
        </div>
      </div>
    </div>

    <section class="panel">
      <h2 class="section-title">What each character says</h2>
      ${charBoxes(ctx.code, ctx.chars)}
      <table class="chartable">
        <thead><tr><th>#</th><th>Axis</th><th>Value</th><th>Means</th></tr></thead>
        <tbody>${ctx.chars.map(c => `<tr>
          <td class="mono">${c.pos}</td>
          <td>${esc(c.title)}</td>
          <td class="mono">${esc(c.code)}</td>
          <td>${esc(c.label)}</td>
        </tr>`).join('')}</tbody>
      </table>
      <p class="small muted">Character 3 is where the judgement lives. The other six follow from
        the table once it is chosen. ${cite('A1')}</p>
    </section>

    ${opInfo ? `<section class="panel">
      <h2 class="section-title">The root operation: ${esc(opInfo.name)}</h2>
      <p class="opdef">${esc(opInfo.def)}</p>
      ${opInfo.exp ? `<p class="opexp"><b>Also:</b> ${esc(opInfo.exp)}</p>` : ''}
      ${opInfo.inc.length ? `<p class="small muted"><b>Examples given in the book:</b> ${esc(opInfo.inc.join('; '))}</p>` : ''}
      ${opInfo.group ? `<p class="small">Objective group: <a href="#/rootops?at=${encodeURIComponent(opInfo.group.id)}">${esc(opInfo.group.title)}</a>
        — the operations most easily confused with this one are
        ${esc(opInfo.group.ops.filter(o => o !== opInfo.name).join(', '))}.</p>` : ''}
      <p><a class="btn" href="#/rootop/${encodeURIComponent(opInfo.name)}">Everything about ${esc(opInfo.name)} →</a></p>
    </section>` : ''}

    ${cards.length ? `<section class="panel">
      <h2 class="section-title">Before you commit to this code</h2>
      <p class="small muted">The decisions that most often change a code like this one.</p>
      <ul class="checklist">
        ${cards.map(c => `<li><a href="#/card/${esc(c.id)}">${esc(c.title)}</a>
          <span class="muted">${esc(c.question)}</span></li>`).join('')}
      </ul>
    </section>` : ''}

    <section class="panel">
      <h2 class="section-title">Nearby codes</h2>
      <p class="small muted">Everything else on the same row of table ${esc(ctx.table.id)} —
        these are the codes you could have built by changing one character.</p>
      ${siblingBlocks(ctx)}
    </section>

    <section class="panel">
      <h2 class="section-title">Your note on this code</h2>
      <p class="small muted">Kept in this browser only. Nothing is sent anywhere.</p>
      <textarea id="pcs-note" class="notebox" rows="3"
        placeholder="Why this code, for the next person who audits it…">${esc(store2.getNote(ctx.code))}</textarea>
    </section>
  </div>`;

  view.querySelector('#star-btn').addEventListener('click', e => {
    const on = store2.toggleStar(ctx.code);
    e.target.classList.toggle('on', on);
    e.target.textContent = on ? '★ Starred' : '☆ Star';
    toast(on ? 'Starred ' + ctx.code : 'Removed the star');
  });

  const note = view.querySelector('#pcs-note');
  let t = null;
  note.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => store2.setNote(ctx.code, note.value), 400);
  });
}

/**
 * The alternatives at each of the last four characters, holding the other three
 * fixed. This is the quickest way to see what the code turns on.
 */
function siblingBlocks(ctx) {
  const picks = [ctx.code[3], ctx.code[4], ctx.code[5], ctx.code[6]];
  return [0, 1, 2, 3].map(i => {
    const opts = optionsFor(ctx.table, picks, i);
    if (opts.length < 2) return '';
    return `<div class="sibgroup">
      <h4>Change character ${i + 4} — ${esc(axisTitle(ctx.table, i))}</h4>
      <div class="sibchips">
        ${opts.map(([c, label]) => {
          const alt = ctx.code.slice(0, 3 + i) + c + ctx.code.slice(4 + i);
          const on = c === picks[i];
          return `<a class="sibchip ${on ? 'on' : ''}" href="#/pcscode/${esc(alt)}">
            <span class="mono">${esc(c)}</span> ${esc(label)}</a>`;
        }).join('')}
      </div>
    </div>`;
  }).join('') || `<p class="muted small">This row offers no alternatives — every character is fixed.</p>`;
}
