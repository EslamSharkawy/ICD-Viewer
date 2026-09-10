// Both sets of official guidelines, read and searched.
//
// One view serves the two documents because they are the same kind of thing:
// numbered rules that a coder has to be able to find, quote and cite. The
// difference is structural - PCS guidelines are a flat list of numbered items
// inside ten groups, CM guidelines are a deep tree - so the two get different
// navigation and the same reader.
//
// The text is reproduced in full and not paraphrased. Where this tool explains
// a rule in its own words, that happens on a card, clearly separated from the
// rule itself.

import { esc, loadingBlock } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import { guidelinesPCS, guidelinesCM } from '../pcsdata.js';
import { renderBlocks, blocksText, linkifyPcs, wireScrollLinks, scrollToSection } from '../pcsui.js';
import { cardsForRule } from '../decide-content.js';

export async function renderGuidelines(view, r, which) {
  setGuidedBar(null);
  view.innerHTML = loadingBlock('Opening the guidelines…');

  const doc = which === 'cm' ? await guidelinesCM() : await guidelinesPCS();
  const q = (r.params.get('q') || '').trim();
  const at = r.params.get('at') || '';

  view.innerHTML = `<div class="wrap-mid guidelines">
    <div class="hero tight">
      <h1>${esc(doc.title)}</h1>
      <p class="lede">${esc(doc.edition)}, published by the Centers for Medicare &amp; Medicaid
        Services and the National Center for Health Statistics. Reproduced in full and quoted, not
        paraphrased. Adherence to these guidelines is required under HIPAA.</p>

      <form class="searchbox compact" id="gsearch" role="search">
        <span class="mag" aria-hidden="true">🔍</span>
        <label class="skip-link" for="gq">Search the guidelines</label>
        <input id="gq" type="search" autocomplete="off" spellcheck="false" value="${esc(q)}"
               placeholder="Search every rule — a word, or a guideline number like ${which === 'cm' ? 'I.C.2' : 'B3.8'}">
      </form>
    </div>
    <div id="gbody"></div>
  </div>`;

  const body = view.querySelector('#gbody');
  const box = view.querySelector('#gq');
  let timer = null;
  const go = () => {
    const v = box.value.trim();
    history.replaceState(null, '',
      `#/${which === 'cm' ? 'cmguidelines' : 'pcsguidelines'}${v ? `?q=${encodeURIComponent(v)}` : ''}`);
    draw(body, doc, which, v, '');
  };
  box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(go, 250); });
  view.querySelector('#gsearch').addEventListener('submit', e => { e.preventDefault(); go(); });

  draw(body, doc, which, q, at);
  // Delegated, and attached to the container rather than the links, so it
  // survives every redraw and is only ever bound once.
  wireScrollLinks(body);

  if (at) {
    const el = view.querySelector('#g-' + cssId(at));
    if (el) scrollToSection(el);
  }
}

function cssId(id) { return String(id).replace(/[^A-Za-z0-9]/g, '_'); }

function draw(host, doc, which, q, at) {
  host.innerHTML = which === 'cm' ? drawCM(doc, q, at) : drawPCS(doc, q, at);
}

/* ------------------------------------------------------------------- PCS */

function drawPCS(doc, q, at) {
  const needle = q.toLowerCase();
  const groups = doc.groups.map(g => ({
    ...g,
    items: g.items.filter(it => !needle || hit(it, needle)),
  })).filter(g => g.items.length);

  if (!groups.length) {
    return `<div class="empty"><strong>No guideline mentions that.</strong>
      <p>Try a shorter word, or a guideline number such as B3.8.</p></div>`;
  }

  const contents = `<nav class="gtoc">
    <h2>Contents</h2>
    <ul>${groups.map(g => `<li><a href="#" data-scroll="g-${cssId(g.id)}"><span class="mono">${esc(g.id)}</span>
      ${esc(g.label)}</a> <span class="muted">${g.items.length}</span></li>`).join('')}</ul>
  </nav>`;

  const bodyHtml = groups.map(g => `<section class="gsection" id="g-${cssId(g.id)}">
    <h2 class="section-title"><span class="mono">${esc(g.id)}</span> ${esc(g.label)}</h2>
    ${g.preamble ? `<div class="prose gpreamble">${renderBlocks(g.preamble)}</div>` : ''}
    ${g.items.map(it => {
      const cards = cardsForRule(it.id);
      return `<article class="gitem" id="g-${cssId(it.id)}">
        <h3><span class="gid mono">${esc(it.id)}</span> ${esc(it.topic || '')}</h3>
        <div class="prose ruletext">${renderBlocks(it.body)}</div>
        ${it.examples ? `<div class="gex">
          <b>Example${it.examples.length > 1 ? 's' : ''}</b>
          ${it.examples.map(e => `<p>${linkifyPcs(e)}</p>`).join('')}
        </div>` : ''}
        <p class="gitem-links">
          <a href="#/card/g:${encodeURIComponent(it.id)}">Open on its own</a>
          ${cards.length ? ` · Explained in: ${cards.map(c =>
            `<a href="#/card/${esc(c.id)}">${esc(c.title)}</a>`).join(', ')}` : ''}
        </p>
      </article>`;
    }).join('')}
  </section>`).join('');

  return `<div class="gwrap">${contents}<div class="gmain">${bodyHtml}</div></div>`;
}

function hit(it, needle) {
  return (it.id + ' ' + (it.topic || '') + ' ' + blocksText(it.body) + ' ' +
    (it.examples || []).join(' ')).toLowerCase().includes(needle);
}

/* -------------------------------------------------------------------- CM */

function drawCM(doc, q, at) {
  const needle = q.toLowerCase();

  // A node survives a search if it matches itself - in which case it keeps its
  // whole subtree, because context is the point - or if any descendant does, in
  // which case it keeps only the branches that led to the match.
  const keep = (n) => {
    if (!needle) return n;
    const self = (n.id + ' ' + n.label + ' ' + blocksText(n.body)).toLowerCase().includes(needle);
    if (self) return n;
    const kids = (n.kids || []).map(keep).filter(Boolean);
    return kids.length ? { ...n, kids } : null;
  };

  const nodes = (doc.nodes || []).map(keep).filter(Boolean);

  if (!nodes.length) {
    return `<div class="empty"><strong>No guideline mentions that.</strong>
      <p>Try a shorter word, or a guideline number such as I.C.2.</p></div>`;
  }

  const chapters = doc.chapters || {};
  const chapterNav = Object.keys(chapters).length ? `<nav class="gtoc">
    <h2>Chapter-specific</h2>
    <ul>${Object.entries(chapters)
      .sort((a, b) => +a[0] - +b[0])
      .map(([num, c]) => `<li><a href="#" data-scroll="g-${cssId(c.id)}">
        <span class="mono">${esc(num)}</span> ${esc(c.label.replace(/^Chapter \d+:\s*/, ''))}</a></li>`)
      .join('')}</ul>
  </nav>` : '';

  return `<div class="gwrap">
    ${chapterNav}
    <div class="gmain">${nodes.map(n => cmNode(n, 0)).join('')}</div>
  </div>`;
}

function cmNode(n, depth) {
  const H = Math.min(2 + depth, 6);
  return `<section class="gnode d${Math.min(depth, 5)}" id="g-${cssId(n.id)}">
    <h${H} class="gnode-head">
      ${n.id ? `<span class="gid mono">${esc(n.id)}</span>` : ''} ${esc(n.label)}
    </h${H}>
    ${n.body && n.body.length ? `<div class="prose">${renderBlocks(n.body, { linkify: false })}</div>` : ''}
    ${(n.kids || []).map(k => cmNode(k, depth + 1)).join('')}
  </section>`;
}
