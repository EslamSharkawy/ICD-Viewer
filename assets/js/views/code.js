// The code detail screen. Everything else in the tool exists to get someone here.

import {
  esc, linkifyCodes, billableBadge, loadingBlock, NOTE_TYPES, TYPE_ORDER, typeVars, toast, openDrawer,
} from '../ui.js';
import {
  resolve, collectNotes, siblings, indexTrailsFor, withSeventh, refCovers, refsInNote,
} from '../data.js';
import * as store from '../store.js';
import { setGuidedBar, guidedOn } from '../guided.js';

export async function renderCode(view, r) {
  const wanted = decodeURIComponent(r.parts.slice(1).join('/'));
  view.innerHTML = loadingBlock('Opening ' + wanted + '…');

  const ctx = await resolve(wanted);

  if (!ctx || !ctx.exists) {
    view.innerHTML = `<div class="empty">
      <strong>There is no code ${esc(wanted)} in this edition.</strong>
      <p>It may have been retired, or the characters may have been mistyped.
         Check <a href="#/whatsnew">what changed this year</a>, or
         <a href="#/search?q=${encodeURIComponent(wanted)}">search for it</a>.</p></div>`;
    setGuidedBar(null);
    return;
  }

  store.pushRecent(ctx.code, ctx.desc);

  const groups = collectNotes(ctx);
  const total = tallies(ctx, groups);
  const confirming = r.params.get('confirm') === '1';
  const fromTrail = r.params.get('trail') || '';

  if (guidedOn() && confirming) {
    setGuidedBar(2, 'Last step: check the code against the rules printed here before you use it.');
  } else {
    setGuidedBar(null);
  }

  view.innerHTML = `
    <div id="confirm-host"></div>
    ${trailHtml(ctx)}
    <div class="detail-grid">
      <div class="detail-main">
        ${headHtml(ctx, total)}
        ${notesToolbar(ctx, groups)}
        <div class="note-cards" id="note-cards"></div>
        ${childrenHtml(ctx)}
      </div>
      <aside class="detail-side">
        ${siblingsHtml(ctx)}
        <div id="trails-host">${panelSkeleton('Documentation terms that lead here', 'Every path through the alphabetic index that arrives at this code.')}</div>
        ${myNotesHtml(ctx)}
      </aside>
    </div>`;

  paintNotes(view, ctx, groups, 'all');
  wireToolbar(view, ctx, groups);
  wireHead(view, ctx);
  wireMyNotes(view, ctx);
  loadTrails(view, ctx);
  if (confirming) buildConfirmStrip(view, ctx, groups, fromTrail);
}

/* ------------------------------------------------------------------ trail */

function trailHtml(ctx) {
  const ch = ctx.chapterMeta;
  const cat = ctx.chain[0];
  const steps = [];

  steps.push(step('Chapter ' + (ch ? ch.num : ''), ch ? ch.plain : '', ch ? ch.range : '', `#/chapter/${ch ? ch.num : ''}`, false));
  for (const u of (ctx.umbrellas || [])) {
    steps.push(step('Group', u.title, u.range, `#/range/${u.first}-${u.last}`, false));
  }
  steps.push(step('Block', ctx.block.title, ctx.block.range, `#/block/${ctx.block.id}`, false));

  for (const anc of ctx.chain) {
    steps.push(step(anc.c.length <= 3 ? 'Category' : 'Subcategory', anc.d, anc.c, `#/code/${anc.c}`, false));
  }
  steps.push(step(ctx.ext ? 'Code with its 7th character' : (ctx.chain.length ? 'Code' : 'Category'),
    ctx.desc, ctx.code, `#/code/${ctx.code}`, true));

  return `<div class="trail">
    <div class="trail-caption">Where this code sits. Rules printed at any of these levels apply to the code at the end of the trail.</div>
    <div class="trail-steps">${steps.join('<span class="trail-arrow" aria-hidden="true">›</span>')}</div>
  </div>`;
}

function step(kind, name, code, href, current) {
  return `<a class="trail-step ${current ? 'current' : ''}" href="${href}">
    <span class="ts-kind">${esc(kind)}</span>
    <span class="ts-code">${esc(code)}</span>
    <span class="ts-name">${esc(name)}</span>
  </a>`;
}

/* ------------------------------------------------------------------- head */

function billableExplanation(ctx) {
  if (ctx.flags.includes('b')) {
    return 'This code is complete and can be submitted on a claim.';
  }
  if (ctx.seventh && ctx.seventh.def.length && !ctx.ext) {
    return 'This code is not finished yet. Add a seventh character from the table below before using it.';
  }
  if (ctx.node.ch && ctx.node.ch.length) {
    return `This is a heading. Pick one of the ${ctx.node.ch.length} more specific codes underneath it.`;
  }
  return 'This code cannot be submitted on its own. Look for a more specific code.';
}

function headHtml(ctx, total) {
  const starred = store.isStarred(ctx.code);
  return `<div class="code-head">
    <div class="code-head-top">
      <div>
        <div class="code-number">${esc(ctx.code)}</div>
        <div class="code-desc">${esc(ctx.desc)}</div>
      </div>
      <div class="head-actions">
        <button class="btn ${starred ? 'on' : ''}" id="star-btn">${starred ? '★ Starred' : '☆ Star this code'}</button>
        <button class="btn" id="worklist-btn">Add to my working list</button>
        <button class="btn" id="print-btn">Print</button>
      </div>
    </div>
    <div class="code-status">
      ${billableBadge(ctx.flags)}
      <span class="explain">${esc(billableExplanation(ctx))}</span>
    </div>
    <div class="code-status">
      <span class="badge badge-rules">${total.all} ${total.all === 1 ? 'note applies' : 'notes apply'} to this code</span>
      <span class="explain">${inheritanceLine(total)}${total.seventh ? ' A seventh character is required as well.' : ''}</span>
    </div>
  </div>`;
}

function tallies(ctx, groups) {
  const lines = Object.values(groups).flat();
  const own = lines.filter(l => l.origin.own).length;
  return { all: lines.length, own, inherited: lines.length - own, seventh: !!(ctx.seventh && ctx.seventh.def.length) };
}

function inheritanceLine(t) {
  if (!t.all) return 'No instructional notes are printed anywhere above this code.';
  if (!t.own) return `Not one of them is printed at the code itself — all ${t.all} are inherited from the chapter, block and category above it.`;
  if (!t.inherited) return `All of them are printed at the code itself.`;
  return `${t.own} ${t.own === 1 ? 'is' : 'are'} printed at the code itself; the other ${t.inherited} ${t.inherited === 1 ? 'is' : 'are'} inherited from the levels above.`;
}

function wireHead(view, ctx) {
  view.querySelector('#star-btn').addEventListener('click', e => {
    const on = store.toggleStar(ctx.code);
    e.currentTarget.classList.toggle('on', on);
    e.currentTarget.textContent = on ? '★ Starred' : '☆ Star this code';
    toast(on ? `${ctx.code} added to your starred list.` : `${ctx.code} removed from your starred list.`);
  });

  view.querySelector('#worklist-btn').addEventListener('click', () => {
    const cur = store.get().worklist.trim();
    const list = cur ? cur.split(/[\s,;]+/).filter(Boolean) : [];
    if (!list.includes(ctx.code)) list.push(ctx.code);
    store.setWorklist(list.join('\n'));
    toast(`${ctx.code} added to your working list. Open "Check for conflicts" to test it.`);
  });

  view.querySelector('#print-btn').addEventListener('click', () => window.print());
}

/* ------------------------------------------------------------- note cards */

function notesToolbar(ctx, groups) {
  const t = tallies(ctx, groups);
  const own = t.own, all = t.all;
  return `<div class="notes-toolbar">
    <div>
      <h2 class="section-title" style="margin:0">The rules that apply</h2>
      <p class="small muted" style="margin:.15rem 0 0;max-width:56ch">
        Only ${own === 0 ? 'none' : own} of these ${all} lines ${own === 1 ? 'is' : 'are'} printed under this code in the book.
        The rest are printed higher up — at the chapter, the block or the category — and reach down to
        every code beneath them. Each band below says which.
        <button class="helpbtn" data-inherit-help style="--nc:var(--accent);--nc-ink:var(--accent-ink);vertical-align:middle">?</button>
      </p>
    </div>
    <div class="seg" role="group" aria-label="Which rules to show">
      <button data-scope="all" class="on">Show all rules that apply (${all})</button>
      <button data-scope="own">Show only this code's own notes (${own})</button>
    </div>
  </div>`;
}

function wireToolbar(view, ctx, groups) {
  const helpBtn = view.querySelector('[data-inherit-help]');
  if (helpBtn) helpBtn.addEventListener('click', () => openDrawer('Where the rules come from', `
    <p>The code book is printed in layers. A rule that applies to a whole family of codes is printed
      <b>once</b>, at the top of that family — and it silently governs everything underneath.</p>
    <h4>The levels, widest first</h4>
    <p><b>Chapter</b> → <b>group heading</b> (only in a few places) → <b>block</b> →
      <b>category</b> → <b>subcategory</b> → <b>the code itself</b>.</p>
    <h4>Why this trips people up</h4>
    <p>If you look up ${esc(ctx.code)} in a printed book, or in a tool that shows you only the lines
      sitting under that code, you see a small fraction of what actually governs it. The rest is several
      pages earlier, at the top of the chapter, and nothing on the code's own entry tells you it is there.</p>
    <div class="worked"><span class="worked-label">A real example</span>
      <b>I10</b> Essential hypertension has two Excludes2 lines of its own. Eleven more apply to it —
      one from the block <b>I10-I1A</b> and ten from <b>Chapter 9</b>. All thirteen are binding.</div>
    <h4>How to read the cards below</h4>
    <p>Each card is one kind of rule. Inside it, the lines are banded by where they were printed, widest
      level first, and the inherited ones are indented and shaded. Switch to
      <b>Show only this code's own notes</b> to see what the printed page under this code actually says.</p>`));

  view.querySelectorAll('.seg [data-scope]').forEach(btn => {
    btn.addEventListener('click', () => {
      view.querySelectorAll('.seg [data-scope]').forEach(b => b.classList.toggle('on', b === btn));
      paintNotes(view, ctx, groups, btn.dataset.scope);
    });
  });
}

function paintNotes(view, ctx, groups, scope) {
  const host = view.querySelector('#note-cards');
  const cards = [];

  for (const type of TYPE_ORDER) {
    if (type === 'seventh') continue;
    let lines = groups[type] || [];
    if (scope === 'own') lines = lines.filter(l => l.origin.own);
    if (!lines.length) continue;
    cards.push(noteCard(type, lines));
  }

  if (ctx.seventh && ctx.seventh.def.length && (scope === 'all' || ctx.node.s7)) {
    cards.push(seventhCard(ctx));
  }

  if (!cards.length) {
    host.innerHTML = `<div class="empty">
      <strong>${scope === 'own' ? 'This code carries no notes of its own.' : 'No instructional notes apply to this code.'}</strong>
      <p>${scope === 'own'
        ? 'Everything that governs it is printed at a higher level. Switch back to “Show all rules that apply”.'
        : 'That is unusual but not wrong — some codes are governed only by the general coding guidelines.'}</p></div>`;
    return;
  }
  host.innerHTML = cards.join('');
}

function noteCard(type, lines) {
  const t = NOTE_TYPES[type];
  const inheritedCount = lines.filter(l => !l.origin.own).length;

  // Group the lines by the level they were printed at. A per-line badge alone is
  // too easy to skim past on a long card - a reader needs to see the seams.
  const groups = [];
  for (const l of lines) {
    const last = groups[groups.length - 1];
    if (last && last.origin.label === l.origin.label) last.lines.push(l);
    else groups.push({ origin: l.origin, lines: [l] });
  }

  const LEVEL_WORD = {
    chapter: 'Inherited from the chapter',
    group: 'Inherited from the group heading',
    block: 'Inherited from the block',
    category: 'Inherited from the category',
    subcategory: 'Inherited from the subcategory',
    this: 'Printed at this code',
  };

  return `<section class="note-card" style="${typeVars(t.key)}">
    <header class="note-card-head">
      <span class="nc-icon" aria-hidden="true">${t.icon}</span>
      <span class="nc-titles">
        <span class="nc-plain">${esc(t.plain)}</span>
        <span class="nc-official">${esc(t.official)}</span>
      </span>
      <span class="nc-count">${lines.length} ${lines.length === 1 ? 'line' : 'lines'}${inheritedCount ? ` · ${inheritedCount} inherited` : ''}</span>
      <button class="helpbtn" data-help="${type}" aria-label="What does “${esc(t.plain)}” mean?">?</button>
    </header>
    ${groups.map(g => `
      <div class="origin-band ${g.origin.own ? 'own' : ''}">
        <span class="ob-where">${esc(LEVEL_WORD[g.origin.level] || 'Inherited')}</span>
        <a class="origin ${g.origin.own ? 'own' : ''}" href="${g.origin.href || '#'}">
          <span class="o-dot" aria-hidden="true"></span>${esc(g.origin.long)}
        </a>
        <span class="ob-count">${g.lines.length}</span>
      </div>
      <ul class="note-lines">
        ${g.lines.map(l => `<li class="note-line ${l.origin.own ? '' : 'inherited'}">
          <span class="nl-text">${linkifyCodes(l.text)}${footnote(l)}</span>
        </li>`).join('')}
      </ul>`).join('')}
  </section>`;
}

/**
 * When the same sentence is printed at two levels under two different note
 * types, only the more specific one is shown - but a reader has to be told that
 * something was displaced, or the interface is just hiding a rule from them.
 */
function footnote(line) {
  const bits = [];

  for (const o of (line.overrides || [])) {
    const loser = NOTE_TYPES[o.type];
    bits.push(`<span class="nl-note override">
      <b>This overrides a weaker version of the same line.</b>
      The same sentence is printed at ${esc(o.origin.long)} as
      “${esc(loser.plain)}” (${esc(loser.official.replace('Officially called: ', ''))}).
      The more specific level wins, so the rule above is the one that binds.
    </span>`);
  }

  for (const a of (line.ambiguous || [])) {
    const other = NOTE_TYPES[a.type];
    bits.push(`<span class="nl-note ambiguous">
      <b>The book prints this line twice, under two different note types.</b>
      It appears here and also as “${esc(other.plain)}”, both at ${esc(a.origin.long)}.
      Nothing in the book decides between them — treat the stricter reading as the safe one
      and check with whoever signs off your work.
    </span>`);
  }

  if (line.alsoAt && line.alsoAt.length) {
    bits.push(`<span class="nl-note repeat">Also printed at
      ${line.alsoAt.map(o => esc(o.long)).join(', ')}.</span>`);
  }

  return bits.join('');
}

function seventhCard(ctx) {
  const t = NOTE_TYPES.seventh;
  const s = ctx.seventh;
  const originLabel = s.originCode === ctx.node.c ? 'this code' : `from ${s.originCode} (${s.originKind})`;
  return `<section class="note-card" style="${typeVars(t.key)}">
    <header class="note-card-head">
      <span class="nc-icon" aria-hidden="true">${t.icon}</span>
      <span class="nc-titles">
        <span class="nc-plain">${esc(t.plain)}</span>
        <span class="nc-official">${esc(t.official)}</span>
      </span>
      <span class="nc-count"><span class="origin ${s.originCode === ctx.node.c ? 'own' : ''}">${esc(originLabel)}</span></span>
      <button class="helpbtn" data-help="seventh" aria-label="What is a seventh character?">?</button>
    </header>
    ${s.note.length ? `<div class="seven-note">${s.note.map(n => linkifyCodes(n)).join('<br>')}</div>` : ''}
    <table class="seven-table">
      <thead><tr><th>Character</th><th>What it means</th><th>The finished code</th></tr></thead>
      <tbody>
        ${s.def.map(([c, d]) => {
          const full = withSeventh(ctx.baseCode, c);
          const here = ctx.ext === c;
          return `<tr${here ? ' style="background:var(--c-seven-bg)"' : ''}>
            <td class="sc">${esc(c)}</td>
            <td>${esc(d)}${here ? ' <span class="badge badge-seven">you are looking at this one</span>' : ''}</td>
            <td class="full"><a class="code-link" href="#/code/${esc(full)}">${esc(full)}</a></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ${needsPlaceholder(ctx.baseCode) ? `<div class="seven-note">
      This code is shorter than six characters, so the letter <b>X</b> fills the empty places before the
      seventh character. That filler is called the <a href="#/glossary?at=placeholderX">placeholder X</a>.
    </div>` : ''}
  </section>`;
}

function needsPlaceholder(code) { return code.replace('.', '').length < 6; }

/* --------------------------------------------------------------- children */

function childrenHtml(ctx) {
  const kids = ctx.node.ch || [];
  if (!kids.length) return '';
  return `<div class="panel" style="margin-top:1.2rem">
    <div class="panel-head">
      <h3>More specific codes underneath ${esc(ctx.node.c)}</h3>
      <p>A heading is never billed. One of these is the code you want.</p>
    </div>
    <ul class="sib-list" style="max-height:none">
      ${kids.map(k => `<li><a href="#/code/${esc(k.c)}">
        <span class="s-code">${esc(k.c)}</span><span>${esc(k.d)}</span></a></li>`).join('')}
    </ul>
  </div>`;
}

/* ------------------------------------------------------------------- side */

function siblingsHtml(ctx) {
  const { parent, list } = siblings(ctx);
  const others = list.filter(n => n.c !== ctx.node.c);
  if (!others.length) return '';
  return `<div class="panel">
    <div class="panel-head">
      <h3>Related codes</h3>
      <p>The other choices sitting alongside this one${parent ? ` under ${esc(parent.c)}` : ` in block ${esc(ctx.block.range)}`}.</p>
    </div>
    <ul class="sib-list">
      ${list.map(n => `<li><a href="#/code/${esc(n.c)}" class="${n.c === ctx.node.c ? 'here' : ''}">
        <span class="s-code">${esc(n.c)}</span><span>${esc(n.d)}</span></a></li>`).join('')}
    </ul>
  </div>`;
}

function panelSkeleton(title, sub) {
  return `<div class="panel"><div class="panel-head"><h3>${esc(title)}</h3><p>${esc(sub)}</p></div>
    <div class="panel-body">${loadingBlock('Reading the index…')}</div></div>`;
}

async function loadTrails(view, ctx) {
  const host = view.querySelector('#trails-host');
  const trails = await indexTrailsFor(ctx.baseCode);
  const head = `<div class="panel-head">
      <h3>Documentation terms that lead here</h3>
      <p>What the record would have to say for the alphabetic index to bring you to this code.</p>
    </div>`;

  if (!trails.length) {
    host.innerHTML = `<div class="panel">${head}<div class="panel-body">
      <p class="small muted">No entry in the alphabetic index points directly at this code. Codes like this are
      usually reached through a more general term and then narrowed down in the tabular list.</p>
    </div></div>`;
    return;
  }

  const render = (t) => `<li>${t.trail.map((seg, i) =>
      `<span class="tp-seg ${i === 0 ? 'first' : ''}">${esc(seg)}</span>`).join('<span class="tp-sep">→</span>')}
      ${t.m ? `<div class="small" style="margin-top:.2rem"><span class="badge badge-rules">two codes needed</span>
        then <a class="code-link" href="#/code/${esc(t.m)}">${esc(t.m)}</a></div>` : ''}</li>`;

  const first = trails.slice(0, 8), rest = trails.slice(8);
  host.innerHTML = `<div class="panel">${head}
    <ul class="trail-paths">${first.map(render).join('')}</ul>
    ${rest.length ? `<ul class="trail-paths" id="more-trails" hidden>${rest.map(render).join('')}</ul>
      <div class="panel-body"><button class="btn" id="show-all-trails">Show all ${trails.length} paths</button></div>` : ''}
  </div>`;

  const btn = host.querySelector('#show-all-trails');
  if (btn) btn.addEventListener('click', () => {
    host.querySelector('#more-trails').hidden = false;
    btn.remove();
  });
}

function myNotesHtml(ctx) {
  return `<div class="panel no-print">
    <div class="panel-head"><h3>My notes</h3><p>Only you can see this. Saved on this computer.</p></div>
    <div class="panel-body">
      <label class="skip-link" for="mynotes">My notes about ${esc(ctx.code)}</label>
      <textarea class="mynotes" id="mynotes" placeholder="Anything you want to remember about ${esc(ctx.code)} — a tricky exclusion, how your team handles it, a question to ask.">${esc(store.getNote(ctx.code))}</textarea>
      <div class="save-row">
        <button class="btn" id="save-note">Save</button>
        <span class="save-state" id="save-state" hidden>Saved</span>
      </div>
    </div>
  </div>`;
}

function wireMyNotes(view, ctx) {
  const box = view.querySelector('#mynotes');
  const state = view.querySelector('#save-state');
  let timer = null;
  const save = () => {
    store.setNote(ctx.code, box.value);
    state.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { state.hidden = true; }, 1800);
  };
  let debounce = null;
  box.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(save, 700); });
  view.querySelector('#save-note').addEventListener('click', save);
}

/* -------------------------------------------------- the confirmation strip */

async function buildConfirmStrip(view, ctx, groups, fromTrail) {
  const host = view.querySelector('#confirm-host');
  const kids = ctx.node.ch || [];

  const complete = ctx.flags.includes('b');
  const needs7 = !!(ctx.seventh && ctx.seventh.def.length) && !ctx.ext;

  // Anything on the working list that this code must never sit beside.
  const worklist = store.get().worklist.split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
  const others = worklist.filter(c => c !== ctx.code);
  const clashes = [];
  for (const line of (groups.excludes1 || [])) {
    for (const ref of refsInNote(line.text)) {
      for (const other of others) {
        if (refCovers(ref, other)) clashes.push({ other, line });
      }
    }
  }

  const items = [
    {
      mark: 'ask', cls: 'ask',
      q: 'Does the tabular description match what the record says?',
      a: `The tabular list words it as “<b>${esc(ctx.desc)}</b>”.${fromTrail ? ` You arrived from the index entry <i>${esc(fromTrail)}</i>.` : ''} Read it against the chart before you commit.`,
    },
    {
      mark: complete ? '✓' : '✕', cls: complete ? 'yes' : 'no',
      q: 'Is this code complete, or does it need more characters?',
      a: complete ? 'Complete. It can go on a claim as it stands.'
        : kids.length ? `Not complete — this is a heading with ${kids.length} more specific codes beneath it.`
        : 'Not complete on its own.',
    },
    {
      mark: needs7 ? '✕' : '✓', cls: needs7 ? 'no' : 'yes',
      q: 'Does it need a seventh character?',
      a: needs7 ? `Yes. Choose one of the ${ctx.seventh.def.length} characters in the purple table below.`
        : ctx.ext ? `The seventh character ${ctx.ext} is already in place — ${esc(ctx.extDesc || '')}.`
        : 'No seventh character applies here.',
    },
    {
      mark: clashes.length ? '✕' : (others.length ? '✓' : 'ask'),
      cls: clashes.length ? 'no' : (others.length ? 'yes' : 'ask'),
      q: 'Is anything already on this account excluded by it?',
      a: clashes.length
        ? `Yes — ${clashes.map(c => `<a class="code-link" href="#/code/${esc(c.other)}">${esc(c.other)}</a>`).join(', ')} ${clashes.length === 1 ? 'is' : 'are'} named in a “never code together” note. <a href="#/check">Open the conflict checker</a>.`
        : others.length
          ? `No clash with the ${others.length} ${others.length === 1 ? 'code' : 'codes'} on your working list.`
          : 'Your working list is empty, so there is nothing to check against. Add the other codes from the account with “Add to my working list” and this line will answer itself.',
    },
  ];

  host.innerHTML = `<div class="confirm-strip">
    <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">
      <div>
        <h3>Confirming this code in the tabular list</h3>
        <p class="small" style="margin:0">You found the term in the index. This is the second half of the job —
        the index never shows exclusions or seventh characters, so nothing is safe to use until it has been checked here.</p>
      </div>
      <button class="btn" id="dismiss-confirm">Hide this</button>
    </div>
    <ul class="confirm-list">
      ${items.map(i => `<li>
        <span class="confirm-mark ${i.cls}">${i.mark === 'ask' ? '?' : i.mark}</span>
        <span><span class="confirm-q">${esc(i.q)}</span><br><span class="confirm-a">${i.a}</span></span>
      </li>`).join('')}
    </ul>
  </div>`;

  host.querySelector('#dismiss-confirm').addEventListener('click', () => { host.innerHTML = ''; });
}
