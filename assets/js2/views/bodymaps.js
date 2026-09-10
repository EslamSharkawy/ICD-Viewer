// The diagrams, gathered in one place.
//
// Each figure exists to answer a coding question, so it is presented with that
// question, the rule behind it, and a link to the card that works through it -
// never as decoration.

import { esc } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import { DIAGRAMS, diagram, diagramIds, diagramMeta } from '../anatomy.js';
import { CARDS } from '../decide-content.js';

const SHELVES = [
  {
    title: 'Depth, layers and levels',
    blurb: 'The decisions that are really about where in the body something happened.',
    ids: ['body-layers', 'joint-layers', 'detachment', 'spine-columns'],
  },
  {
    title: 'How much, and by what means',
    blurb: 'What separates the root operations that remove something.',
    ids: ['excision-resection', 'takeout', 'takeoutstuff', 'release-division'],
  },
  {
    title: 'Tubes, routes and vessels',
    blurb: 'Bypass direction, vessel segments, and what happened to the lumen.',
    ids: ['tubular', 'bypass', 'coronary', 'vessel-proximal'],
  },
  {
    title: 'Material, devices and grafts',
    blurb: 'What was put in, what it does, and where it came from.',
    ids: ['device-ops', 'graft-materials', 'graft-harvest', 'putback'],
  },
  {
    title: 'Getting there',
    blurb: 'The approach values, drawn as routes into the body.',
    ids: ['approaches'],
  },
  {
    title: 'Operations worth drawing in full',
    blurb: 'The procedures that come up constantly on an inpatient chart and are hardest to code from the note alone.',
    ids: ['cabg'],
  },
  {
    title: 'Where the values live, body system by body system',
    blurb: 'Every 4th-character value of a body system, laid out in the order the anatomy runs, so you can see which value the note is describing.',
    ids: ['heart-chambers', 'respiratory', 'gi-tract', 'urinary', 'hepatobiliary'],
  },
];

export async function renderBodyMaps(view, r) {
  setGuidedBar(null);
  const q = (r.params.get('q') || '').trim().toLowerCase();

  const shown = new Set();
  const shelves = SHELVES.map(s => ({
    ...s,
    ids: s.ids.filter(id => {
      const d = DIAGRAMS[id];
      if (!d) return false;
      shown.add(id);
      return !q || (id + ' ' + d.title + ' ' + d.blurb).toLowerCase().includes(q);
    }),
  })).filter(s => s.ids.length);

  const orphans = diagramIds().filter(id => !shown.has(id));

  view.innerHTML = `<div class="wrap-mid">
    <div class="hero tight">
      <h1>Body maps</h1>
      <p class="lede">Some PCS decisions are spatial, and asking somebody without a clinical
        background to make them from words alone is unfair. These are the ones worth drawing.</p>
      <p class="small muted">Every label on every figure is a real FY2027 ICD-10-PCS value or
        term, so what you read here is what you will find in the table.</p>

      <form class="searchbox compact" id="bsearch" role="search">
        <span class="mag" aria-hidden="true">🔍</span>
        <label class="skip-link" for="bq">Search the diagrams</label>
        <input id="bq" type="search" autocomplete="off" spellcheck="false" value="${esc(q)}"
               placeholder="layers, approach, bypass, amputation, graft…">
      </form>
    </div>

    ${shelves.map(s => `<section class="shelf">
      <h2 class="section-title">${esc(s.title)}</h2>
      <p class="shelf-blurb">${esc(s.blurb)}</p>
      <div class="figgrid">
        ${s.ids.map(tile).join('')}
      </div>
    </section>`).join('')}

    ${orphans.length ? `<section class="shelf">
      <h2 class="section-title">Also here</h2>
      <div class="figgrid">${orphans.map(tile).join('')}</div>
    </section>` : ''}

    ${!shelves.length && !orphans.length ? `<div class="empty">
      <strong>No diagram matched that.</strong>
      <p><a href="#/bodymaps">See all of them</a>.</p></div>` : ''}
  </div>`;

  const box = view.querySelector('#bq');
  let timer = null;
  const go = () => {
    const v = box.value.trim();
    history.replaceState(null, '', v ? `#/bodymaps?q=${encodeURIComponent(v)}` : '#/bodymaps');
    renderBodyMaps(view, { params: new URLSearchParams(v ? 'q=' + encodeURIComponent(v) : '') });
  };
  box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(go, 250); });
  view.querySelector('#bsearch').addEventListener('submit', e => { e.preventDefault(); go(); });
  if (q) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
}

function tile(id) {
  const d = DIAGRAMS[id];
  return `<a class="figtile" href="#/bodymap/${esc(id)}">
    <span class="figtile-canvas">${d.svg}</span>
    <span class="figtile-title">${esc(d.title)}</span>
    <span class="figtile-blurb">${d.blurb}</span>
    ${d.rule ? `<span class="figtile-rule">${esc(d.rule)}</span>` : ''}
  </a>`;
}

/* ------------------------------------------------------------- one figure */

export async function renderBodyMap(view, r) {
  setGuidedBar(null);
  const id = r.parts.slice(1).join('/');
  const d = diagramMeta(id);

  if (!d) {
    view.innerHTML = `<div class="wrap-narrow"><div class="empty">
      <strong>There is no diagram called that.</strong>
      <p><a href="#/bodymaps">See all of them</a>.</p></div></div>`;
    return;
  }

  const related = CARDS.filter(c => c.diagram === id);

  view.innerHTML = `<div class="wrap-narrow cardpage">
    <p class="crumb"><a href="#/bodymaps">Body maps</a></p>
    <figure class="figure solo">${diagram(id)}</figure>

    ${related.length ? `<section class="also-box">
      <h3>The decision this belongs to</h3>
      <div class="cardgrid">
        ${related.map(c => `<a class="dcard" href="#/card/${esc(c.id)}">
          <span class="dcard-title">${esc(c.title)}</span>
          <span class="dcard-q">${esc(c.question)}</span>
          <span class="dcard-rules">${(c.rules || []).map(x => `<span class="rulechip">${esc(x)}</span>`).join('')}</span>
        </a>`).join('')}
      </div>
    </section>` : ''}

    ${d.rule ? `<section class="rules-box">
      <h3>The official rule this figure draws</h3>
      <p>ICD-10-PCS Official Guideline
        <a href="#/card/g:${encodeURIComponent(d.rule)}">${esc(d.rule)}</a> — read it in full,
        then come back to the picture.</p>
    </section>` : ''}
  </div>`;
}
