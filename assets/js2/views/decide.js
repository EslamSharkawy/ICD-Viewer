// "Which one do I pick?" - the decision screens.
//
// Two kinds of card share this screen and this URL space:
//
//   #/card/<id>    a curated card from decide-content.js
//   #/card/g:B3.8  a card generated from one official guideline
//
// The generated ones exist so that coverage is complete by construction: every
// numbered guideline in the FY2027 book gets a card whether or not anybody has
// written commentary on it. The curated ones exist because a rule quoted at a
// beginner is not the same thing as a rule explained to them.
//
// Each kind links to the other: a curated card cites the guidelines it rests
// on, and a guideline card lists the curated cards that rest on it.

import { esc, loadingBlock, highlight } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import { guidelinesPCS, rootOperations } from '../pcsdata.js';
import { renderBlocks, linkifyPcs, cite, blocksText } from '../pcsui.js';
import { CARDS, cardById, cardsForRule } from '../decide-content.js';
import { diagram, hasDiagram } from '../anatomy.js';

/* ------------------------------------------------ the generated guideline cards */

let glPromise = null;

function guidelineIndex() {
  if (!glPromise) {
    glPromise = guidelinesPCS().then(g => {
      const byId = new Map();
      for (const group of g.groups) {
        for (const it of group.items) byId.set(it.id, { ...it, group });
      }
      return { doc: g, byId };
    });
  }
  return glPromise;
}

/* ------------------------------------------------------------ the index page */

// The curated cards, arranged by the question the coder is actually asking at
// that moment rather than by guideline number.
const SHELVES = [
  {
    id: 'operation',
    title: 'Character 3 — which root operation?',
    blurb: 'The character that decides the code, and the one most often got wrong. Start with the objective.',
    ids: ['group-takeout', 'group-takeoutstuff', 'group-cutting', 'group-putback',
      'group-tubular', 'group-device', 'group-exam', 'group-repairs', 'group-other'],
  },
  {
    id: 'pairs',
    title: 'The specific choices that trip people up',
    blurb: 'Individual decisions where two operations look alike until you know the deciding question.',
    ids: ['excision-vs-resection', 'insertion-supplement-replacement', 'device-management',
      'occlusion-vs-restriction', 'control-vs-definitive', 'transplant-vs-administration',
      'detachment-levels', 'bypass-direction'],
  },
  {
    id: 'grafts',
    title: 'Grafts, sources and devices',
    blurb: 'What the material is, what it does, and whether harvesting it is a code of its own.',
    ids: ['grafts', 'graft-harvest', 'device-vs-substance'],
  },
  {
    id: 'howmany',
    title: 'How many codes?',
    blurb: 'The rules that decide whether an operative episode is one code or five.',
    ids: ['how-many-codes', 'integral-components', 'biopsy-then-definitive',
      'excision-then-replacement', 'fusion-how-many', 'inspection-when', 'discontinued'],
  },
  {
    id: 'bodypart',
    title: 'Character 4 — which body part?',
    blurb: 'What to do when the site in the note is not one of the values on offer.',
    ids: ['bodypart-no-value', 'bodypart-peri', 'bodypart-vessel-proximal', 'bodypart-branches',
      'bodypart-bilateral', 'bodypart-coronary', 'bodypart-tendon-vs-joint',
      'bodypart-skin-over-joint', 'bodypart-overlapping-layers', 'bodypart-fingers-toes',
      'bodypart-intestinal-tract'],
  },
  {
    id: 'approach',
    title: 'Character 5 — which approach?',
    blurb: 'The route in, and the assisted cases that are coded to the route you would not expect.',
    ids: ['approach-values'],
  },
  {
    id: 'conventions',
    title: 'Sections and conventions',
    blurb: 'Whether the procedure is even in the right section, and what the system assumes you know.',
    ids: ['section-choice', 'objective-not-words', 'z-values', 'keys-first'],
  },
];

export async function renderDecide(view, r) {
  setGuidedBar(null);
  view.innerHTML = loadingBlock('Opening the guidelines…');

  const { doc, byId } = await guidelineIndex();
  const q = (r.params.get('q') || '').trim().toLowerCase();

  const covered = new Set();
  CARDS.forEach(c => (c.rules || []).forEach(x => covered.add(x)));

  const shelves = SHELVES.map(s => {
    const cards = s.ids.map(cardById).filter(Boolean)
      .filter(c => !q || matches(c, q));
    return { ...s, cards };
  }).filter(s => s.cards.length);

  const glGroups = doc.groups.map(g => ({
    ...g,
    items: g.items.filter(it => !q || glMatches(it, q)),
  })).filter(g => g.items.length);

  view.innerHTML = `<div class="wrap-mid">
    <div class="hero tight">
      <h1>Which one do I pick?</h1>
      <p class="lede">Every point in ICD-10-PCS where you have to make a judgement, with the
        deciding question in plain words and the official rule it rests on. Nothing here is
        opinion: each card names the guideline that settles it.</p>

      <form class="searchbox compact" id="decide-search" role="search">
        <span class="mag" aria-hidden="true">🔍</span>
        <label class="skip-link" for="dq">Search the decisions</label>
        <input id="dq" type="search" autocomplete="off" spellcheck="false" value="${esc(q)}"
               placeholder="Search — excision, graft, approach, debridement, bypass…">
      </form>
    </div>

    ${shelves.map(s => `<section class="shelf">
      <h2 class="section-title">${esc(s.title)}</h2>
      <p class="shelf-blurb">${esc(s.blurb)}</p>
      <div class="cardgrid">
        ${s.cards.map(cardTile).join('')}
      </div>
    </section>`).join('')}

    <section class="shelf">
      <h2 class="section-title">Every official guideline, one by one</h2>
      <p class="shelf-blurb">All ${byId.size} numbered guidelines in the FY2027 ICD-10-PCS Official
        Guidelines for Coding and Reporting, in the order the book prints them. This list is
        generated from the document itself, so nothing is left out.
        ${covered.size} of them also have a card above explaining them in plain language.</p>
      ${glGroups.map(g => `<div class="glgroup">
        <h3 class="glgroup-title"><span class="mono">${esc(g.id)}</span> ${esc(g.label)}</h3>
        <div class="gllist">
          ${g.items.map(it => `<a class="glrow" href="#/card/g:${encodeURIComponent(it.id)}">
            <span class="glrow-id mono">${esc(it.id)}</span>
            <span class="glrow-main">
              <b>${esc(it.topic || firstSentence(it))}</b>
              ${covered.has(it.id) ? '<span class="glrow-flag">explained</span>' : ''}
            </span>
          </a>`).join('')}
        </div>
      </div>`).join('')}
    </section>

    ${!shelves.length && !glGroups.length ? `<div class="empty">
      <strong>Nothing matched that.</strong>
      <p>Try a shorter word — the name of a root operation, a body part, or a word from the
      operative note. Or <a href="#/decide">see everything</a>.</p></div>` : ''}
  </div>`;

  const box = view.querySelector('#dq');
  let timer = null;
  const go = () => {
    const v = box.value.trim();
    history.replaceState(null, '', v ? `#/decide?q=${encodeURIComponent(v)}` : '#/decide');
    renderDecide(view, { params: new URLSearchParams(v ? 'q=' + encodeURIComponent(v) : '') });
  };
  box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(go, 250); });
  view.querySelector('#decide-search').addEventListener('submit', e => { e.preventDefault(); go(); });
  if (q) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
}

function cardTile(c) {
  return `<a class="dcard" href="#/card/${esc(c.id)}">
    ${hasDiagram(c.diagram) ? '<span class="dcard-hasfig" title="Includes a diagram">▦</span>' : ''}
    <span class="dcard-title">${esc(c.title)}</span>
    <span class="dcard-q">${esc(c.question)}</span>
    <span class="dcard-rules">${(c.rules || []).map(x => `<span class="rulechip">${esc(x)}</span>`).join('')}</span>
  </a>`;
}

function matches(c, q) {
  const hay = [c.title, c.question, c.lead || '', c.body || '',
    (c.ops || []).join(' '), (c.rules || []).join(' '),
    (c.examples || []).map(e => e.text + ' ' + e.answer).join(' '),
    (c.traps || []).join(' ')].join(' ').toLowerCase();
  return hay.includes(q);
}

function glMatches(it, q) {
  return (it.id + ' ' + (it.topic || '') + ' ' + blocksText(it.body) + ' ' +
    (it.examples || []).join(' ')).toLowerCase().includes(q);
}

function firstSentence(it) {
  const t = blocksText(it.body);
  const m = t.match(/^(.{0,90}?[.;])\s/);
  return m ? m[1] : t.slice(0, 90) + (t.length > 90 ? '…' : '');
}

/* --------------------------------------------------------------- one card */

export async function renderDecideCard(view, r) {
  setGuidedBar(null);
  const id = r.parts.slice(1).join('/');
  if (id.startsWith('g:')) return renderGuidelineCard(view, id.slice(2));

  const c = cardById(id);
  if (!c) {
    view.innerHTML = `<div class="wrap-narrow"><div class="empty">
      <strong>There is no card called that.</strong>
      <p><a href="#/decide">Back to all the decisions</a>.</p></div></div>`;
    return;
  }

  const { byId } = await guidelineIndex();
  const ops = await rootOperations();

  view.innerHTML = `<div class="wrap-narrow cardpage">
    <p class="crumb"><a href="#/decide">Which one do I pick?</a></p>

    <header class="cardhead">
      <h1>${esc(c.title)}</h1>
      <p class="cardq">${esc(c.question)}</p>
      ${c.lead ? `<p class="lede">${c.lead}</p>` : ''}
    </header>

    ${c.compare ? compareTable(c, ops) : ''}

    ${hasDiagram(c.diagram) ? `<figure class="figure">
      ${diagram(c.diagram)}
    </figure>` : ''}

    <div class="prose">${c.body || ''}</div>

    ${c.examples && c.examples.length ? `<section class="examples-box">
      <h3>Worked examples</h3>
      <table class="extable">
        <tbody>${c.examples.map(e => `<tr>
          <td class="ex-case">${esc(e.text)}</td>
          <td class="ex-ans">${linkifyPcs(e.answer)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </section>` : ''}

    ${c.traps && c.traps.length ? `<section class="traps-box">
      <h3>What auditors find</h3>
      <ul>${c.traps.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    </section>` : ''}

    ${rulesBox(c, byId)}

    ${c.also && c.also.length ? `<section class="also-box">
      <h3>Related</h3>
      <div class="cardgrid">${c.also.map(cardById).filter(Boolean).map(cardTile).join('')}</div>
    </section>` : ''}
  </div>`;
}

function compareTable(c, ops) {
  return `<div class="comparewrap"><table class="compare">
    <thead><tr>
      <th>Choice</th><th>What it means</th><th>Pick it when</th><th>Not when</th>
    </tr></thead>
    <tbody>${c.compare.map(x => {
      const info = ops.get(x.name);
      return `<tr>
        <th scope="row" class="cmp-name">
          ${x.char ? `<span class="cmp-char mono">${esc(x.char)}</span>` : ''}
          ${info ? `<a href="#/rootop/${encodeURIComponent(x.name)}">${esc(x.name)}</a>` : esc(x.name)}
        </th>
        <td>${x.means}</td>
        <td class="cmp-yes">${esc(x.pick || '')}</td>
        <td class="cmp-no">${esc(x.avoid || '')}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function rulesBox(c, byId) {
  const rules = (c.rules || []).map(id => [id, byId.get(id)]).filter(([, it]) => it);
  if (!rules.length) {
    // decide-content.js requires every card to name its rule. If one ever does
    // not, say so on the page rather than presenting an unsourced assertion.
    return `<section class="rules-box missing">
      <h3>Where this rule comes from</h3>
      <p>This card does not yet name an official guideline. Treat it as commentary and check the
      guidelines before you rely on it.</p></section>`;
  }
  return `<section class="rules-box">
    <h3>The official rule${rules.length > 1 ? 's' : ''}</h3>
    ${rules.map(([id, it]) => `<article class="ruletext">
      <h4><span class="mono">${esc(id)}</span> ${esc(it.topic || it.group.label)}</h4>
      ${renderBlocks(it.body)}
      ${it.examples ? `<p class="ruleex"><b>Official example.</b> ${linkifyPcs(it.examples.join(' '))}</p>` : ''}
      <p class="rulelink">${cite(id, { label: 'Read it in context' })}</p>
    </article>`).join('')}
    <p class="sourcenote">Quoted from the ICD-10-PCS Official Guidelines for Coding and Reporting,
      FY2027, published by CMS and NCHS.</p>
  </section>`;
}

/* ------------------------------------------------ one official guideline */

async function renderGuidelineCard(view, id) {
  const { byId } = await guidelineIndex();
  const it = byId.get(id);
  if (!it) {
    view.innerHTML = `<div class="wrap-narrow"><div class="empty">
      <strong>There is no guideline ${esc(id)}.</strong>
      <p><a href="#/decide">Back to all the decisions</a>.</p></div></div>`;
    return;
  }
  const explained = cardsForRule(id);

  view.innerHTML = `<div class="wrap-narrow cardpage">
    <p class="crumb"><a href="#/decide">Which one do I pick?</a> ·
      <a href="#/pcsguidelines">All the guidelines</a></p>

    <header class="cardhead">
      <p class="glbadge"><span class="mono">${esc(it.id)}</span> ${esc(it.group.label)}</p>
      <h1>${esc(it.topic || 'Guideline ' + it.id)}</h1>
    </header>

    <div class="prose ruletext">${renderBlocks(it.body)}</div>

    ${it.examples ? `<section class="examples-box">
      <h3>Official example${it.examples.length > 1 ? 's' : ''}</h3>
      ${it.examples.map(e => `<p>${linkifyPcs(e)}</p>`).join('')}
    </section>` : ''}

    <p class="sourcenote">The full text of guideline ${esc(it.id)} from the ICD-10-PCS Official
      Guidelines for Coding and Reporting, FY2027 (CMS and NCHS). Quoted, not paraphrased.</p>

    ${explained.length ? `<section class="also-box">
      <h3>Explained in plain language</h3>
      <div class="cardgrid">${explained.map(cardTile).join('')}</div>
    </section>` : `<section class="also-box">
      <h3>No plain-language card yet</h3>
      <p class="muted">This guideline is reproduced here in full, but nobody has written a
      walk-through for it. The rule above is the authority either way.</p>
    </section>`}
  </div>`;
}
