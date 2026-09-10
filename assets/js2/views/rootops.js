// The root operations, grouped by objective.
//
// The grouping is CMS's own, from the ICD-10-PCS Reference Manual. It is not
// decoration: operations a coder confuses are nearly always members of the same
// group, because a group shares an objective and its members differ on one
// point. Presenting them any other way hides the thing that actually needs
// explaining.

import { esc, loadingBlock } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import { rootOperations, OP_GROUPS, tablemap, defs } from '../pcsdata.js';
import { cite, scrollToSection } from '../pcsui.js';
import { CARDS, cardsForOperation } from '../decide-content.js';
import { diagram, hasDiagram } from '../anatomy.js';

export async function renderRootOps(view, r) {
  setGuidedBar(null);
  view.innerHTML = loadingBlock('Loading the definitions…');

  const [ops, tm, d] = await Promise.all([rootOperations(), tablemap(), defs()]);
  const q = (r.params.get('q') || '').trim().toLowerCase();

  const tablesFor = new Map();
  for (const [, sec, , , opTitle] of tm) {
    if (sec !== '0') continue;
    tablesFor.set(opTitle, (tablesFor.get(opTitle) || 0) + 1);
  }

  const groups = OP_GROUPS.map(g => ({
    ...g,
    members: g.ops.map(name => ops.get(name)).filter(Boolean)
      .filter(o => !q || (o.name + ' ' + o.def + ' ' + o.exp + ' ' + o.inc.join(' ')).toLowerCase().includes(q)),
  })).filter(g => g.members.length);

  // Everything outside the Medical and Surgical section.
  const others = Object.entries(d)
    .filter(([sec]) => sec !== '0')
    .map(([sec, axes]) => ({
      sec,
      title: (axes['3'] || {}).title || 'Operation',
      terms: ((axes['3'] || {}).terms || [])
        .filter(t => !q || (t.v[0] + ' ' + (t.def || '')).toLowerCase().includes(q)),
    }))
    .filter(x => x.terms.length);

  view.innerHTML = `<div class="wrap-mid">
    <div class="hero tight">
      <h1>Root operations</h1>
      <p class="lede">Character 3, and the character that decides the code. Pick it from the
        <b>objective</b> of the procedure — what the surgeon set out to achieve — and not from the
        word written in the note. The coder is expected to make that translation. ${cite('A11')}</p>

      <form class="searchbox compact" id="osearch" role="search">
        <span class="mag" aria-hidden="true">🔍</span>
        <label class="skip-link" for="oq">Search the root operations</label>
        <input id="oq" type="search" autocomplete="off" spellcheck="false" value="${esc(q)}"
               placeholder="An operation, or a word from its definition">
      </form>
    </div>

    <p class="shelf-blurb">The nine groups below are CMS's own, from the ICD-10-PCS Reference
      Manual. Operations inside a group share an objective and differ on one point — which is
      exactly why they get mixed up, and exactly what each group card sorts out.</p>

    ${groups.map(g => {
      const card = CARDS.find(c => c.group === g.id);
      return `<section class="shelf" id="${esc(g.id)}">
        <h2 class="section-title">${esc(g.title)}</h2>
        <p class="shelf-blurb">${esc(g.plain)}
          ${card ? `<a class="inline-help" href="#/card/${esc(card.id)}">How to tell them apart →</a>` : ''}</p>
        <div class="opgrid">
          ${g.members.map(o => `<a class="opcard" href="#/rootop/${encodeURIComponent(o.name)}">
            <span class="opcard-char mono">${esc(o.char)}</span>
            <span class="opcard-name">${esc(o.name)}</span>
            <span class="opcard-def">${esc(o.def)}</span>
            <span class="opcard-foot">${(tablesFor.get(o.name) || 0)} table${(tablesFor.get(o.name) || 0) === 1 ? '' : 's'}</span>
          </a>`).join('')}
        </div>
      </section>`;
    }).join('')}

    <section class="shelf">
      <h2 class="section-title">Outside the Medical and Surgical section</h2>
      <p class="shelf-blurb">The other sixteen sections have their own root operations and root
        types. They are shorter lists, and choosing the right <i>section</i> is usually the harder
        step. <a class="inline-help" href="#/card/section-choice">Which section? →</a></p>
      ${others.map(o => `<div class="glgroup">
        <h3 class="glgroup-title"><span class="mono">${esc(o.sec)}</span> ${esc(o.title)}</h3>
        <div class="opgrid tight">
          ${o.terms.map(t => `<div class="opcard flat">
            <span class="opcard-name">${esc(t.v[0])}</span>
            <span class="opcard-def">${esc(t.def || '')}</span>
          </div>`).join('')}
        </div>
      </div>`).join('')}
    </section>

    ${!groups.length && !others.length ? `<div class="empty">
      <strong>No root operation matched that.</strong>
      <p><a href="#/rootops">See all of them</a>.</p></div>` : ''}
  </div>`;

  // Arriving from a code page with a group named in the address bar.
  const at = r.params.get('at');
  if (at) {
    const el = view.querySelector('#' + CSS.escape(at));
    if (el) scrollToSection(el);
  }

  const box = view.querySelector('#oq');
  let timer = null;
  const go = () => {
    const v = box.value.trim();
    history.replaceState(null, '', v ? `#/rootops?q=${encodeURIComponent(v)}` : '#/rootops');
    renderRootOps(view, { params: new URLSearchParams(v ? 'q=' + encodeURIComponent(v) : '') });
  };
  box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(go, 250); });
  view.querySelector('#osearch').addEventListener('submit', e => { e.preventDefault(); go(); });
  if (q) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
}

/* ------------------------------------------------------- one root operation */

export async function renderRootOp(view, r) {
  setGuidedBar(null);
  const name = r.parts.slice(1).join('/');
  const [ops, tm] = await Promise.all([rootOperations(), tablemap()]);
  const o = ops.get(name);

  if (!o) {
    view.innerHTML = `<div class="wrap-narrow"><div class="empty">
      <strong>There is no root operation called ${esc(name)}.</strong>
      <p><a href="#/rootops">See all of them</a>.</p></div></div>`;
    return;
  }

  const tables = tm.filter(t => t[1] === '0' && t[4] === o.name);
  const cards = cardsForOperation(o.name);
  const siblings = o.group ? o.group.ops.filter(x => x !== o.name).map(x => ops.get(x)).filter(Boolean) : [];
  const groupCard = o.group ? CARDS.find(c => c.group === o.group.id) : null;
  const fig = groupCard && hasDiagram(groupCard.diagram) ? groupCard.diagram : null;

  view.innerHTML = `<div class="wrap-mid">
    <p class="crumb"><a href="#/rootops">Root operations</a></p>

    <div class="code-head">
      <div class="code-head-top">
        <div>
          <div class="code-number mono">${esc(o.char)}</div>
          <div class="code-desc">${esc(o.name)}</div>
        </div>
        <div class="head-actions">
          <a class="btn" href="#/pcstables?q=${encodeURIComponent(o.name)}">${tables.length} table${tables.length === 1 ? '' : 's'}</a>
          ${groupCard ? `<a class="btn btn-primary" href="#/card/${esc(groupCard.id)}">Tell it apart from the others</a>` : ''}
        </div>
      </div>
    </div>

    <section class="panel">
      <h2 class="section-title">The official definition</h2>
      <p class="opdef big">${esc(o.def)}</p>
      ${o.exp ? `<h3>What that means in practice</h3><p class="opexp">${esc(o.exp)}</p>` : ''}
      ${o.inc.length ? `<h3>Examples given in the book</h3>
        <p>${esc(o.inc.join('; '))}</p>` : ''}
      <p class="sourcenote">Quoted from the FY2027 ICD-10-PCS Definitions file (CMS).</p>
    </section>

    ${o.group ? `<section class="panel">
      <h2 class="section-title">Objective group: ${esc(o.group.title)}</h2>
      <p>${esc(o.group.plain)}</p>
      ${siblings.length ? `<h3>The operations most easily confused with ${esc(o.name)}</h3>
        <div class="opgrid">
          ${siblings.map(s => `<a class="opcard" href="#/rootop/${encodeURIComponent(s.name)}">
            <span class="opcard-char mono">${esc(s.char)}</span>
            <span class="opcard-name">${esc(s.name)}</span>
            <span class="opcard-def">${esc(s.def)}</span>
          </a>`).join('')}
        </div>` : ''}
      ${fig ? `<figure class="figure">${diagram(fig)}</figure>` : ''}
    </section>` : ''}

    ${cards.length ? `<section class="panel">
      <h2 class="section-title">Decisions that involve ${esc(o.name)}</h2>
      <ul class="checklist">
        ${cards.map(c => `<li><a href="#/card/${esc(c.id)}">${esc(c.title)}</a>
          <span class="muted">${esc(c.question)}</span></li>`).join('')}
      </ul>
    </section>` : ''}

    <section class="panel">
      <h2 class="section-title">Where ${esc(o.name)} appears</h2>
      <p class="small muted">The body systems that offer this root operation. Open one to build a
        code from it.</p>
      <div class="tablelist">
        ${tables.map(t => `<a class="trow" href="#/pcstable/${esc(t[0])}">
          <span class="trow-id mono">${esc(t[0])}</span>
          <span class="trow-main"><b>${esc(t[5])}</b></span>
          <span class="trow-count">${t[7].toLocaleString()} codes</span>
        </a>`).join('')}
      </div>
    </section>
  </div>`;
}
