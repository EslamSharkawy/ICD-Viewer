// Loads the built data files and works out which rules apply to a code.
//
// The whole point of this tool lives in `collectNotes`: a code inherits the
// instructional notes of its category, its block and its chapter, and a reader
// has to be able to see where each one came from.

import { normaliseCode } from './ui.js';

const BASE = 'data/';
const cache = new Map();

// The single-file build drops every data file into this map, so the app runs
// with no server and no network. When it is absent we fetch as normal.
const EMBEDDED = globalThis.__ICD_DATA__ || null;

async function readFile(path) {
  if (EMBEDDED) {
    const hit = EMBEDDED[path];
    if (hit === undefined) throw new Error('Not in this file: ' + path);
    return hit;
  }
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error('Could not load ' + path);
  return r.text();
}

async function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, readFile(path).then(JSON.parse)
      .catch(err => { cache.delete(path); throw err; }));   // never cache a failure
  }
  return cache.get(path);
}

async function getText(path) {
  const key = 'text:' + path;
  if (!cache.has(key)) {
    cache.set(key, readFile(path)
      .catch(err => { cache.delete(key); throw err; }));
  }
  return cache.get(key);
}

export const meta = () => getJSON('meta.json');
export const chapters = () => getJSON('chapters.json');
export const chapterNotes = () => getJSON('chapter-notes.json');
export const blockmap = () => getJSON('blockmap.json');
export const umbrellas = () => getJSON('umbrellas.json');
export const block = (id) => getJSON('blocks/' + id + '.json');
export const neoplasm = () => getJSON('neoplasm.json');
export const drugs = () => getJSON('drug.json');
export const whatsnew = () => getJSON('whatsnew.json');
export const indexMain = () => getJSON('index-main.json');
export const indexLetter = (L) => getJSON('index/' + (L === '#' ? '_num' : L) + '.json');

/* ------------------------------------------------- the flat list of codes */

let codesPromise = null;

export function codes() {
  if (!codesPromise) {
    codesPromise = getText('codes.tsv').then(txt => {
      const byCode = new Map();
      const all = [];
      for (const line of txt.split('\n')) {
        if (!line) continue;
        const [c, d, f, n, b] = line.split('\t');
        const row = { code: c, desc: d, flags: f || '', notes: +n || 0, block: b, lower: d.toLowerCase() };
        byCode.set(c, row);
        all.push(row);
      }
      return { byCode, all };
    });
  }
  return codesPromise;
}

let notesPromise = null;

// Every instructional note in the book, flattened, so note text is searchable.
export function allNotes() {
  if (!notesPromise) {
    notesPromise = getText('notes.tsv').then(txt => txt.split('\n').filter(Boolean).map(line => {
      const [level, owner, type, text] = line.split('\t');
      return { level, owner, type, text, lower: text.toLowerCase() };
    }));
  }
  return notesPromise;
}

let idxSearchPromise = null;

// One line per index entry, holding the whole trail of terms above it.
export function indexSearchRows() {
  if (!idxSearchPromise) {
    idxSearchPromise = getText('index-search.tsv').then(txt => txt.split('\n').filter(Boolean).map(line => {
      const [text, letter, mi, path, code, title, trail] = line.split('\t');
      return { text, letter, mi: +mi, path, code, title, trail };
    }));
  }
  return idxSearchPromise;
}

const reverseCache = new Map();

// Which trails through the alphabetic index arrive at this code?
export async function indexTrailsFor(code) {
  const L = code[0];
  if (!reverseCache.has(L)) {
    reverseCache.set(L, getJSON('rindex/' + L + '.json').catch(() => ({})));
  }
  const shard = await reverseCache.get(L);
  return shard[code] || [];
}

/* ------------------------------------------------------------- hierarchy */

let blockIndex = null;

async function ensureBlockIndex() {
  if (!blockIndex) blockIndex = await blockmap();
  return blockIndex;
}

export async function blockIdFor(code) {
  const map = await ensureBlockIndex();
  const p = code.slice(0, 3).toUpperCase();
  // A handful of ranges nest inside each other; the narrowest one is the block
  // the code actually lives in.
  let best = null, bestSpan = Infinity;
  for (const [first, last, id] of map) {
    if (p >= first && p <= last) {
      const span = last.charCodeAt(0) * 1296 + parseInt(last.slice(1), 36) -
                   (first.charCodeAt(0) * 1296 + parseInt(first.slice(1), 36));
      if (span < bestSpan) { best = id; bestSpan = span; }
    }
  }
  return best;
}

/** Group headings such as V00-V99 that carry notes over several blocks. */
export async function umbrellasFor(code, chapterNum) {
  const list = await umbrellas();
  const p = code.slice(0, 3).toUpperCase();
  return list.filter(u => u.chapter === chapterNum && p >= u.first && p <= u.last &&
                          Object.keys(u.notes || {}).length);
}

export async function blocksInRange(a, b) {
  const map = await ensureBlockIndex();
  const lo = a.slice(0, 3), hi = b.slice(0, 3);
  return map.filter(([first, last]) => !(last < lo || first > hi));
}

function findNode(list, code, chain) {
  for (const n of list) {
    if (n.c === code) return { node: n, chain: chain.slice() };
    if (n.ch && code.startsWith(n.c.slice(0, 3))) {
      const hit = findNode(n.ch, code, chain.concat([n]));
      if (hit) return hit;
    }
  }
  return null;
}

function dot(flat) {
  return flat.length > 3 ? flat.slice(0, 3) + '.' + flat.slice(3) : flat;
}

// Build the full seventh character version of a code: T74.4 + 'A' -> T74.4XXA
export function withSeventh(code, char) {
  let flat = code.replace('.', '');
  while (flat.length < 6) flat += 'X';
  return dot(flat.slice(0, 6) + char);
}

/**
 * Work out everything there is to know about a code: where it sits, what its
 * own notes are, and which notes it inherits.
 */
export async function resolve(input) {
  const code = normaliseCode(input);
  if (!code) return null;

  const bid = await blockIdFor(code);
  if (!bid) return { code, exists: false };

  const blk = await block(bid);
  const chNotes = (await chapterNotes())[blk.chapter] || {};
  const chapterList = await chapters();
  const chapterMeta = chapterList.find(c => c.num === blk.chapter);

  const overArching = await umbrellasFor(code, blk.chapter);

  let hit = findNode(blk.diags, code, []);
  let ext = null, extDesc = null;

  if (!hit) {
    // Might be a code carrying a seventh character, which has no node of its own.
    const flat = code.replace('.', '');
    if (flat.length >= 5) {
      const char = flat.slice(-1);
      let baseFlat = flat.slice(0, -1);
      hit = findNode(blk.diags, dot(baseFlat), []);
      while (!hit && baseFlat.length > 3 && baseFlat.endsWith('X')) {
        baseFlat = baseFlat.slice(0, -1);
        hit = findNode(blk.diags, dot(baseFlat), []);
      }
      if (hit) ext = char;
    }
  }

  if (!hit) return { code, exists: false, block: blk, chapterMeta };

  const { node, chain } = hit;

  // The effective seventh-character table, and where it came from.
  let seventh = null;
  const s7Sources = [
    ...(node.s7 ? [{ s7: node.s7, from: node }] : []),
    ...chain.slice().reverse().filter(a => a.s7).map(a => ({ s7: a.s7, from: a })),
    ...(blk.s7 ? [{ s7: blk.s7, from: 'block' }] : []),
  ];
  if (s7Sources.length) {
    const src = s7Sources[0];
    seventh = {
      def: src.s7.def || [],
      note: src.s7.note || [],
      originCode: src.from === 'block' ? blk.id : src.from.c,
      originKind: src.from === 'block' ? 'block' : levelName(src.from.c),
    };
  }

  if (ext && seventh) {
    const row = seventh.def.find(d => d[0] === ext);
    extDesc = row ? row[1] : null;
  }

  const codeRows = await codes();
  const row = codeRows.byCode.get(node.c);

  let flags = row ? row.flags : '';
  if (ext) flags = extDesc ? 'b' : '';   // a finished seventh-character code is billable

  return {
    code, exists: true,
    node, chain, block: blk, chapterMeta, chapterNotes: chNotes, umbrellas: overArching,
    seventh, ext, extDesc,
    baseCode: node.c,
    desc: extDesc ? node.d + ', ' + extDesc : node.d,
    flags,
    row,
  };
}

export function levelName(code) {
  const flat = code.replace('.', '');
  if (flat.length <= 3) return 'category';
  return 'subcategory';
}

/**
 * Every instructional note that applies, grouped by type, each line tagged
 * with the level it came from. Order within a group runs from the widest
 * level (chapter) down to the code itself.
 */
export function collectNotes(ctx) {
  const entries = [];
  const add = (notes, origin) => {
    if (!notes) return;
    for (const [type, lines] of Object.entries(notes)) {
      for (const text of lines) {
        // Includes and inclusion terms read as one idea to a beginner.
        const t = type === 'inclusionTerm' ? 'includes' : type;
        entries.push({ type: t, text, origin, key: normKey(text) });
      }
    }
  };

  const ch = ctx.chapterMeta;
  add(ctx.chapterNotes, {
    level: 'chapter', rank: 0,
    label: `from Chapter ${ch ? ch.num : ''}`,
    long: ch ? `Chapter ${ch.num} — ${ch.plain}` : 'Chapter',
    href: ch ? `#/chapter/${ch.num}` : null,
    own: false,
  });

  for (const u of (ctx.umbrellas || [])) {
    add(u.notes, {
      level: 'group', rank: 1,
      label: `from ${u.range} (group)`,
      long: `${u.range} — ${u.title}`,
      href: `#/range/${u.first}-${u.last}`,
      own: false,
    });
  }

  add(ctx.block.notes, {
    level: 'block', rank: 2,
    label: `from ${ctx.block.range} (block)`,
    long: `${ctx.block.range} — ${ctx.block.title}`,
    href: `#/block/${ctx.block.id}`,
    own: false,
  });

  ctx.chain.forEach((anc, i) => {
    add(anc.n, {
      level: levelName(anc.c), rank: 3 + i,
      label: `from ${anc.c} (${levelName(anc.c)})`,
      long: `${anc.c} — ${anc.d}`,
      href: `#/code/${anc.c}`,
      own: false,
    });
  });

  add(ctx.node.n, {
    level: 'this', rank: 100,
    label: ctx.ext ? `from ${ctx.node.c}` : 'this code',
    long: `${ctx.node.c} — ${ctx.node.d}`,
    href: `#/code/${ctx.node.c}`,
    own: !ctx.ext,
  });

  const groups = {};
  for (const e of reconcile(entries)) {
    (groups[e.type] = groups[e.type] || []).push(e);
  }
  return groups;
}

function normKey(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

// Several hundred codes inherit a note that says exactly what one of their own
// notes says, but files it under a different - and sometimes opposite - type.
// I10 is the clearest case: the block prints "hypertensive disease complicating
// pregnancy (O10-O11, O13-O16)" as an Excludes2, and I10 itself prints the same
// sentence as an Excludes1. Showing both, in a permissive card and a forbidding
// card, is how a beginner writes a wrong claim.
//
// The rule the book works by is that the more specific level wins. So the
// deepest occurrence is kept as the operative rule and carries a record of what
// it displaced; the others are dropped.
function reconcile(entries) {
  const byKey = new Map();
  for (const e of entries) {
    if (!byKey.has(e.key)) byKey.set(e.key, []);
    byKey.get(e.key).push(e);
  }

  const dropped = new Set();

  for (const [key, list] of byKey) {
    if (list.length < 2) continue;
    // Lines ending in a colon are prose lead-ins ("code, where applicable, to
    // identify:"). The same lead-in under two types means nothing.
    if (key.endsWith(':')) continue;

    const top = Math.max(...list.map(e => e.origin.rank));
    const winners = list.filter(e => e.origin.rank === top);
    const losers = list.filter(e => e.origin.rank < top);
    const keep = winners[0];

    // The book occasionally prints the same sentence twice at one level under
    // two types. Nothing decides between them, so say so rather than guess.
    const rivals = winners.filter(w => w !== keep);
    for (const w of rivals) {
      dropped.add(w);
      if (w.type !== keep.type) {
        (keep.ambiguous = keep.ambiguous || []).push({ type: w.type, origin: w.origin });
      }
    }

    for (const l of losers) {
      dropped.add(l);
      if (l.type !== keep.type) {
        (keep.overrides = keep.overrides || []).push({ type: l.type, origin: l.origin });
      } else {
        (keep.alsoAt = keep.alsoAt || []).push(l.origin);
      }
    }
  }

  return entries.filter(e => !dropped.has(e));
}

export function countNotes(groups) {
  return Object.values(groups).reduce((n, list) => n + list.length, 0);
}

/** Sibling codes: the other children of this code's parent. */
export function siblings(ctx) {
  const parent = ctx.chain[ctx.chain.length - 1];
  const list = parent ? (parent.ch || []) : ctx.block.diags;
  return { parent, list };
}

/* -------------------------------------------- matching note code references */

// Does a code reference written in a note ("J44.-", "J60-J70", "E11.9") cover
// this code?
export function refCovers(ref, code) {
  const clean = String(ref).trim().toUpperCase();
  const target = code.replace('.', '');

  const range = clean.match(/^([A-Z]\d[0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s*-\s*([A-Z]\d[0-9A-Z](?:\.[0-9A-Z]{1,4})?)$/);
  if (range) {
    const lo = range[1].replace('.', ''), hi = range[2].replace('.', '');
    const t = target.slice(0, Math.max(lo.length, hi.length, 3));
    const padded = t.padEnd(Math.max(lo.length, hi.length), '0');
    return padded >= lo.padEnd(padded.length, '0') && padded.slice(0, hi.length) <= hi;
  }

  const bare = clean.replace(/\.?-$/, '').replace('.', '');
  if (!bare) return false;
  return target.startsWith(bare) || bare.startsWith(target);
}

const REF_SCAN = /[A-Z]\d[0-9A-Z](?:\.[0-9A-Z]{1,4})?(?:\s*-\s*[A-Z]\d[0-9A-Z](?:\.[0-9A-Z]{1,4})?)?\.?-?/g;

export function refsInNote(text) {
  const out = [];
  const inParens = String(text).match(/\(([^)]*)\)/g) || [];
  const hay = inParens.length ? inParens.join(' ') : String(text);
  let m;
  REF_SCAN.lastIndex = 0;
  while ((m = REF_SCAN.exec(hay))) out.push(m[0].trim());
  return out;
}
