// Browse by chapter: 22 cards, then blocks, then categories, then codes -
// an expanding tree that keeps everything you already opened on screen.

import { esc, loadingBlock, linkifyCodes, NOTE_TYPES, TYPE_ORDER, typeVars, billableBadge } from '../ui.js';
import { chapters, chapterNotes, block, blocksInRange, codes, umbrellas } from '../data.js';
import { setGuidedBar } from '../guided.js';

export async function renderBrowse(view) {
  setGuidedBar(null);
  const list = await chapters();
  const totalCodes = list.reduce((n, c) => n + c.codes, 0);

  view.innerHTML = `<div class="wrap-mid">
    <h1 style="font-size:1.6rem;margin-bottom:.4rem">Browse by chapter</h1>
    <p class="lede" style="margin-bottom:1.6rem">The book is divided into ${list.length} chapters, mostly by body system.
      Each chapter carries notes of its own, and those notes reach down to every single code inside it.
      The counts below show where the dense rule areas are.
      ${totalCodes.toLocaleString()} entries in all.</p>
    <div class="chapter-grid">
      ${list.map(c => `<a class="chapter-card" href="#/chapter/${esc(c.num)}">
        <span class="cc-top"><span class="cc-num">Chapter ${esc(c.num)}</span><span class="cc-range">${esc(c.range)}</span></span>
        <span class="cc-plain">${esc(c.plain)}</span>
        <span class="cc-official">${esc(c.title)}</span>
        <span class="cc-blurb">${esc(c.blurb)}</span>
        <span class="cc-stats">
          <span><b>${c.codes.toLocaleString()}</b> entries</span>
          <span><b>${c.blocks.length}</b> blocks</span>
          <span><b>${c.notes}</b> chapter-level and block-level notes</span>
        </span>
      </a>`).join('')}
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- chapter */

export async function renderChapter(view, r) {
  setGuidedBar(null);
  const num = r.parts[1];
  const [list, notes] = await Promise.all([chapters(), chapterNotes()]);
  const ch = list.find(c => c.num === num);
  if (!ch) { view.innerHTML = `<div class="empty"><strong>No such chapter.</strong></div>`; return; }

  view.innerHTML = `<div class="wrap-mid">
    <p class="small"><a href="#/browse">← All chapters</a></p>
    <div class="code-head" style="margin-bottom:1.2rem">
      <div class="cc-num">Chapter ${esc(ch.num)} · ${esc(ch.range)}</div>
      <div class="code-desc" style="font-size:1.5rem;max-width:none">${esc(ch.plain)}</div>
      <p class="muted" style="margin:.3rem 0 0">${esc(ch.title)}</p>
      <p style="margin:.6rem 0 0">${esc(ch.blurb)}</p>
    </div>

    <h2 class="section-title">Notes printed at the top of this chapter</h2>
    <p class="small muted" style="margin-bottom:.8rem">Every code in ${esc(ch.range)} inherits these, however deep it sits.</p>
    <div class="note-cards">${noteCards(notes[num] || {}, `Chapter ${num}`)}</div>

    <h2 class="section-title" style="margin-top:2rem">The blocks inside this chapter</h2>
    <ul class="tree" id="tree">
      ${ch.blocks.map(b => b.umbrella
        ? `<li><a class="tree-row" href="#/range/${esc(b.range)}" style="background:var(--surface-3)">
            <span class="tw">▤</span>
            <span class="tree-code">${esc(b.range)}</span>
            <span class="tree-desc"><b>${esc(b.title)}</b> — a group heading covering the blocks below</span>
            <span class="tree-meta">${b.notes ? `${b.notes} notes reach every code in the range` : 'no notes of its own'}</span>
          </a></li>`
        : `<li data-block="${esc(b.id)}">
        <button class="tree-row" data-toggle="${esc(b.id)}" aria-expanded="false">
          <span class="tw">▸</span>
          <span class="tree-code">${esc(b.range)}</span>
          <span class="tree-desc">${esc(b.title)}</span>
          <span class="tree-meta">${b.cats} categories · ${b.codes} entries · ${b.notes} notes here</span>
        </button>
        <div class="kids" hidden></div>
      </li>`).join('')}
    </ul>
  </div>`;

  wireTree(view);
}

/* ------------------------------------------------------------------ block */

export async function renderBlock(view, r) {
  setGuidedBar(null);
  const id = r.parts[1];
  const [blk, list] = await Promise.all([block(id), chapters()]);
  const ch = list.find(c => c.num === blk.chapter);

  view.innerHTML = `<div class="wrap-mid">
    <p class="small"><a href="#/chapter/${esc(blk.chapter)}">← Chapter ${esc(blk.chapter)} · ${esc(ch ? ch.plain : '')}</a></p>
    <div class="code-head" style="margin-bottom:1.2rem">
      <div class="cc-num">Block ${esc(blk.range)}</div>
      <div class="code-desc" style="font-size:1.5rem;max-width:none">${esc(blk.title)}</div>
    </div>

    <h2 class="section-title">Notes printed at the top of this block</h2>
    <p class="small muted" style="margin-bottom:.8rem">Every code in ${esc(blk.range)} inherits these.</p>
    <div class="note-cards">${noteCards(blk.notes || {}, blk.range)}</div>

    <h2 class="section-title" style="margin-top:2rem">Categories in this block</h2>
    <ul class="tree">${blk.diags.map(d => diagBranch(d)).join('')}</ul>
  </div>`;

  wireTree(view);
}

/* ------------------------------------------------------------------ range */

export async function renderRange(view, r) {
  setGuidedBar(null);
  const raw = decodeURIComponent(r.parts[1] || '');
  const [a, b] = raw.split('-');
  if (!a || !b) { view.innerHTML = `<div class="empty"><strong>That is not a code range.</strong></div>`; return; }

  const blocks = await blocksInRange(a, b);
  const { all } = await codes();
  const groups = (await umbrellas()).filter(u =>
    u.first <= b.slice(0, 3) && u.last >= a.slice(0, 3) && Object.keys(u.notes || {}).length);
  const lo = a.replace('.', ''), hi = b.replace('.', '');
  const inRange = all.filter(row => {
    const f = row.code.replace('.', '');
    return f.slice(0, 3) >= lo.slice(0, 3) && f.slice(0, 3) <= hi.slice(0, 3);
  });
  const cats = inRange.filter(row => row.code.length <= 3);

  view.innerHTML = `<div class="wrap-mid">
    <h1 style="font-size:1.5rem">Codes in the range ${esc(raw)}</h1>
    <p class="lede">A note somewhere pointed at this whole range rather than a single code.
      ${inRange.length.toLocaleString()} entries fall inside it, spread across
      ${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}.</p>

    ${groups.map(u => `
      <h2 class="section-title" style="margin-top:1.6rem">Notes printed over the whole of ${esc(u.range)}</h2>
      <p class="small muted" style="margin-bottom:.8rem">${esc(u.title)} is a group heading. These notes reach every code in the range.</p>
      <div class="note-cards">${noteCards(u.notes, u.range)}</div>`).join('')}

    <h2 class="section-title" style="margin-top:1.6rem">Blocks covered</h2>
    <div class="result-list">
      ${blocks.map(([first, last, id, cnum]) => `<a class="result" href="#/block/${esc(id)}">
        <span class="r-code">${esc(id)}</span>
        <span class="r-desc">Block ${esc(first)}–${esc(last)}</span>
        <span class="r-badges"><span class="badge badge-rules">Chapter ${esc(cnum)}</span></span>
      </a>`).join('')}
    </div>

    <h2 class="section-title" style="margin-top:1.6rem">Categories in the range</h2>
    <div class="result-list">
      ${cats.map(c => `<a class="result" href="#/code/${esc(c.code)}">
        <span class="r-code">${esc(c.code)}</span>
        <span class="r-desc">${esc(c.desc)}</span>
        <span class="r-badges">${billableBadge(c.flags)}</span>
      </a>`).join('')}
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ parts */

function diagBranch(d) {
  const kids = d.ch || [];
  const noteCount = d.n ? Object.values(d.n).reduce((a, b) => a + b.length, 0) : 0;
  return `<li>
    <div style="display:flex;align-items:center;gap:.2rem">
      ${kids.length
        ? `<button class="tree-row" data-expand aria-expanded="false" style="flex:1">
            <span class="tw">▸</span>
            <span class="tree-code">${esc(d.c)}</span>
            <span class="tree-desc">${esc(d.d)}</span>
            <span class="tree-meta">${kids.length} inside${noteCount ? ` · ${noteCount} notes here` : ''}</span>
          </button>`
        : `<a class="tree-row" href="#/code/${esc(d.c)}" style="flex:1">
            <span class="tw">·</span>
            <span class="tree-code">${esc(d.c)}</span>
            <span class="tree-desc">${esc(d.d)}</span>
            <span class="tree-meta">${noteCount ? `${noteCount} notes here` : ''}</span>
          </a>`}
      <a class="btn" href="#/code/${esc(d.c)}" title="Open the full code page">open</a>
    </div>
    ${kids.length ? `<ul hidden>${kids.map(k => diagBranch(k)).join('')}</ul>` : ''}
  </li>`;
}

function wireTree(view) {
  view.addEventListener('click', async e => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const li = toggle.closest('li');
      const kids = li.querySelector('.kids');
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.querySelector('.tw').textContent = open ? '▸' : '▾';
      kids.hidden = open;
      if (!open && !kids.dataset.loaded) {
        kids.innerHTML = loadingBlock('Loading the categories…');
        const blk = await block(toggle.dataset.toggle);
        kids.innerHTML = `<ul>${blk.diags.map(d => diagBranch(d)).join('')}</ul>`;
        kids.dataset.loaded = '1';
      }
      return;
    }

    const expand = e.target.closest('[data-expand]');
    if (expand) {
      const li = expand.closest('li');
      const ul = li.querySelector(':scope > ul');
      const open = expand.getAttribute('aria-expanded') === 'true';
      expand.setAttribute('aria-expanded', String(!open));
      expand.querySelector('.tw').textContent = open ? '▸' : '▾';
      if (ul) ul.hidden = open;
    }
  });
}

export function noteCards(notes, ownerLabel) {
  const merged = { ...notes };
  if (merged.inclusionTerm) {
    merged.includes = (merged.includes || []).concat(merged.inclusionTerm);
    delete merged.inclusionTerm;
  }
  const cards = [];
  for (const type of TYPE_ORDER) {
    const lines = merged[type];
    if (!lines || !lines.length) continue;
    const t = NOTE_TYPES[type];
    cards.push(`<section class="note-card" style="${typeVars(t.key)}">
      <header class="note-card-head">
        <span class="nc-icon" aria-hidden="true">${t.icon}</span>
        <span class="nc-titles">
          <span class="nc-plain">${esc(t.plain)}</span>
          <span class="nc-official">${esc(t.official)}</span>
        </span>
        <span class="nc-count">${lines.length} ${lines.length === 1 ? 'line' : 'lines'}</span>
        <button class="helpbtn" data-help="${type}" aria-label="What does this mean?">?</button>
      </header>
      <ul class="note-lines">
        ${lines.map(l => `<li class="note-line"><span class="nl-text">${linkifyCodes(l)}</span>
          <span class="origin own">${esc(ownerLabel)}</span></li>`).join('')}
      </ul>
    </section>`);
  }
  if (!cards.length) {
    return `<div class="empty"><strong>Nothing is printed at this level.</strong>
      <p>The rules for these codes live further down, at the category or the code itself.</p></div>`;
  }
  return cards.join('');
}
