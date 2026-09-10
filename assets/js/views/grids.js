// The two grid lookups: the Neoplasm table and the Table of Drugs and Chemicals.
// Both work the same way - find the term on the left, read across to the column
// that matches the clinical situation.

import { esc, loadingBlock } from '../ui.js';
import { neoplasm, drugs, codes } from '../data.js';
import { setGuidedBar } from '../guided.js';

const CONFIG = {
  neoplasm: {
    title: 'Growths and cancers: the neoplasm table',
    lede: `Every growth in the body is looked up the same way: find the body site on the left, then read
      across to the column that matches what the pathology report says the growth is. The six columns are
      six different codes for the same body part.`,
    placeholder: 'Search a body part — lung, breast, colon, skin of the face',
    rowHead: 'Body site',
    examples: ['lung', 'breast', 'colon', 'stomach', 'skin of face'],
    columns: [
      ['Cancer, started here', 'Malignant, primary', 'The growth began in this body part.'],
      ['Cancer, spread here from elsewhere', 'Malignant, secondary', 'The growth began somewhere else and travelled here.'],
      ["Cancer, hasn't spread past the surface", 'Carcinoma in situ', 'Cancerous cells that have not yet grown into the tissue underneath.'],
      ['Not cancer', 'Benign', 'A growth that does not invade or spread.'],
      ['Behaviour not yet known', 'Uncertain behaviour', 'The pathologist has looked and cannot yet say whether it will behave as a cancer.'],
      ['Not documented', 'Unspecified behaviour', 'The record simply does not say. Use this only when nothing better is documented.'],
    ],
    loader: neoplasm,
  },
  drug: {
    title: 'Substances: the table of drugs and chemicals',
    lede: `Every medicine, chemical and poison is looked up the same way: find the substance on the left,
      then read across to the column that matches how it came to be in the patient. The columns are about
      intent, not about the drug.`,
    placeholder: 'Search a substance — acetaminophen, insulin, bleach, carbon monoxide',
    rowHead: 'Substance',
    examples: ['acetaminophen', 'insulin', 'aspirin', 'carbon monoxide', 'bleach'],
    columns: [
      ['Taken by accident', 'Poisoning, accidental (unintentional)', 'Too much was taken, or the wrong thing was taken, with no intent to harm.'],
      ['Taken deliberately to self-harm', 'Poisoning, intentional self-harm', 'The patient took it meaning to hurt themselves.'],
      ['Given by another person to cause harm', 'Poisoning, assault', 'Someone else administered it deliberately.'],
      ['Intent not documented', 'Poisoning, undetermined', 'The record does not say, and nobody can say. Not a shortcut for "I did not read the chart".'],
      ['Correct drug, correctly taken, but caused a reaction', 'Adverse effect', 'The right medicine, the right dose, taken properly — and the patient reacted badly to it.'],
      ['Less taken than prescribed', 'Underdosing', 'The patient took less than the doctor ordered, or missed doses.'],
    ],
    loader: drugs,
  },
};

export async function renderGrid(view, r, which) {
  setGuidedBar(null);
  const cfg = CONFIG[which];
  const q = r.params.get('q') || '';

  view.innerHTML = `<div class="wrap-mid">
    <h1 style="font-size:1.6rem;margin-bottom:.35rem">${esc(cfg.title)}</h1>
    <p class="lede" style="margin-bottom:1.2rem">${cfg.lede}</p>

    <form class="searchbox compact" id="gridform" role="search" style="max-width:620px;margin:0 0 .8rem">
      <span class="mag" aria-hidden="true">🔍</span>
      <input id="gridq" type="search" autocomplete="off" value="${esc(q)}" placeholder="${esc(cfg.placeholder)}">
    </form>
    <div class="chips" style="justify-content:flex-start;margin-bottom:1.4rem">
      <span class="small muted" style="align-self:center;margin-right:.3rem">Try one of these:</span>
      ${cfg.examples.map(e => `<button class="chip" data-ex="${esc(e)}">${esc(e)}</button>`).join('')}
    </div>

    <details class="card" style="padding:.9rem 1.1rem;margin-bottom:1.2rem">
      <summary style="cursor:pointer;font-weight:650">What each column means</summary>
      <div style="margin-top:.7rem;display:grid;gap:.6rem">
        ${cfg.columns.map(c => `<div>
          <div style="font-weight:650">${esc(c[0])}</div>
          <div class="small muted">Officially called: ${esc(c[1])}</div>
          <div class="small">${esc(c[2])}</div>
        </div>`).join('')}
      </div>
    </details>

    <div id="gridout"></div>
  </div>`;

  const input = view.querySelector('#gridq');
  const out = view.querySelector('#gridout');

  const go = () => {
    history.replaceState(null, '', `#/${which}?q=` + encodeURIComponent(input.value));
    run(out, cfg, input.value);
  };

  view.querySelector('#gridform').addEventListener('submit', e => { e.preventDefault(); go(); });
  let timer = null;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(go, 250); });
  view.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.ex; go(); }));

  run(out, cfg, q);
}

async function run(out, cfg, query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    out.innerHTML = `<div class="empty"><strong>Type a term to see its row.</strong>
      <p>The table is far too wide to read all at once, so this screen shows you one row at a time —
         the row you asked for, with the columns spelled out.</p></div>`;
    return;
  }

  out.innerHTML = loadingBlock('Finding the row…');
  const data = await cfg.loader();
  const { byCode } = await codes();

  const tokens = q.split(/\s+/).filter(Boolean);
  const hits = data.rows.filter(row => {
    const hay = row.trail.join(' ').toLowerCase();
    return tokens.every(t => hay.includes(t));
  }).slice(0, 40);

  if (!hits.length) {
    out.innerHTML = `<div class="empty"><strong>Nothing in the table matched that.</strong>
      <p>Try a shorter word, or the everyday name of the site or substance.</p></div>`;
    return;
  }

  out.innerHTML = `
    <p class="small muted" style="margin-bottom:.5rem">${hits.length === 1 ? 'One row matches' : hits.length + ' rows match'}. Every cell is a code you can open.</p>
    <div class="grid-scroll">
      <table class="gridtable">
        <thead><tr>
          <th class="rowhead"><span class="gh-plain">${esc(cfg.rowHead)}</span><span class="gh-official">as the book files it</span></th>
          ${cfg.columns.map(c => `<th><span class="gh-plain">${esc(c[0])}</span><span class="gh-official">${esc(c[1])}</span></th>`).join('')}
        </tr></thead>
        <tbody>
          ${hits.map(row => `<tr>
            <td class="rowhead"><span class="grid-trail">${trail(row.trail)}</span></td>
            ${row.cells.map(cell => `<td>${cellHtml(cell, byCode)}</td>`).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="stacked-rows">
      ${hits.map(row => `<div class="stacked-card">
        <h4>${trail(row.trail)}</h4>
        ${row.cells.map((cell, i) => `<div class="stacked-cell">
          <span><b>${esc(cfg.columns[i][0])}</b><br><span class="small muted">${esc(cfg.columns[i][1])}</span></span>
          <span>${cellHtml(cell, byCode)}</span>
        </div>`).join('')}
      </div>`).join('')}
    </div>`;
}

function trail(parts) {
  return parts.map((p, i) => `<span class="tp-seg ${i === 0 ? 'first' : ''}">${esc(p)}</span>`)
    .join('<span class="tp-sep">›</span>');
}

function cellHtml(cell, byCode) {
  const raw = String(cell || '').trim();
  if (!raw || raw === '--') return `<span class="cell-none">not applicable</span>`;
  const clean = raw.replace(/-$/, '');
  const known = byCode.get(clean);
  return `<a class="code-link cellcode ${known ? '' : 'dead'}" href="#/code/${esc(clean)}"
     title="${esc(known ? known.desc : 'Open this code')}">${esc(raw)}</a>`;
}
