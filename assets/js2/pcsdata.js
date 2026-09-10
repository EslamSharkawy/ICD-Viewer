// Loading and the PCS engine.
//
// The difference from the diagnosis side is worth stating plainly, because it
// drives every screen in the procedure half of this app: an ICD-10-CM code is
// looked up, an ICD-10-PCS code is BUILT. There is no list of procedures to
// search through and no hierarchy to walk down. There are 918 tables, each
// holding rows, and a row is a set of four columns whose values may be freely
// combined with each other - but never across rows.
//
// Everything here follows from that. `optionsFor` is the whole builder: given
// the characters chosen so far, it returns the values still reachable, by
// looking only at rows that remain consistent. A character that no row offers
// is never shown, so an invalid code cannot be constructed by clicking.
//
// The build script proves the same thing from the other end: expanding every
// row of every table yields exactly the 79,256 codes in the official file, no
// more and no fewer. See build/build_pcs.py, verify_tables().

const BASE = 'data-pcs/';
const cache = new Map();

// The single-file build drops every data file into this map.
const EMBEDDED = globalThis.__ICD_DATA__ || null;

async function readFile(path) {
  if (EMBEDDED) {
    const hit = EMBEDDED['pcs/' + path];
    if (hit === undefined) throw new Error('Not in this file: ' + path);
    return hit;
  }
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error('Could not load ' + path);
  return r.text();
}

function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, readFile(path).then(JSON.parse)
      .catch(err => { cache.delete(path); throw err; }));
  }
  return cache.get(path);
}

function getText(path) {
  const key = 'text:' + path;
  if (!cache.has(key)) {
    cache.set(key, readFile(path).catch(err => { cache.delete(key); throw err; }));
  }
  return cache.get(key);
}

/**
 * Split a TSV into rows, tolerating either line ending.
 *
 * The build writes these files with Unix endings, but a file that has been
 * through a checkout, an editor or a zip on Windows can come back as CRLF, and
 * splitting on \n alone silently welds a carriage return onto the last column
 * of every row. That is invisible on screen right up until the column is used
 * in a URL or compared against something.
 */
function rows(txt) {
  const out = [];
  for (const line of txt.split('\n')) {
    const clean = line.charCodeAt(line.length - 1) === 13 ? line.slice(0, -1) : line;
    if (clean) out.push(clean);
  }
  return out;
}

export const meta = () => getJSON('meta.json');
export const sections = () => getJSON('sections.json');
export const tablemap = () => getJSON('tablemap.json');
export const table = (id) => getJSON('tables/' + id.toUpperCase() + '.json');
export const defs = () => getJSON('defs.json');
export const bodyPartKey = () => getJSON('bodypartkey.json');
export const deviceKey = () => getJSON('devicekey.json');
export const substanceKey = () => getJSON('substancekey.json');
export const newTechKey = () => getJSON('newtechkey.json');
export const deviceAgg = () => getJSON('deviceagg.json');
export const guidelinesPCS = () => getJSON('guidelines-pcs.json');
export const guidelinesCM = () => getJSON('guidelines-cm.json');
export const refManual = () => getJSON('refmanual.json');
export const whatsNew = () => getJSON('whatsnew-pcs.json');
export const indexMain = () => getJSON('index-main.json');
export const indexLetter = (L) => getJSON('index/' + (/^[A-Z0-9]$/i.test(L) ? L.toUpperCase() : '_num') + '.json');

/* --------------------------------------------------------- the code list */

let codesPromise = null;

/** All 79,256 codes with their official titles. */
export function codes() {
  if (!codesPromise) {
    codesPromise = getText('codes.tsv').then(txt => {
      const byCode = new Map();
      const all = [];
      for (const line of rows(txt)) {
        const tab = line.indexOf('\t');
        if (tab < 0) continue;
        const code = line.slice(0, tab);
        const desc = line.slice(tab + 1);
        const row = { code, desc, lower: desc.toLowerCase() };
        byCode.set(code, row);
        all.push(row);
      }
      return { byCode, all };
    });
  }
  return codesPromise;
}

let idxSearchPromise = null;

export function indexSearchRows() {
  if (!idxSearchPromise) {
    idxSearchPromise = getText('index-search.tsv').then(txt =>
      rows(txt).map(line => {
        const [text, letter, mi, code, title, trail, use] = line.split('\t');
        return { text, letter, mi: +mi, code, title, trail, use };
      }));
  }
  return idxSearchPromise;
}

/* ------------------------------------------------------------- the code */

export function normalisePcs(raw) {
  return String(raw || '').toUpperCase().replace(/[^0-9A-HJ-NP-Z]/g, '').slice(0, 7);
}

/** A PCS code never uses I or O, so that they cannot be misread as 1 and 0. */
export function looksLikePcs(raw) {
  const s = String(raw || '').toUpperCase().replace(/\s/g, '');
  return /^[0-9A-HJ-NP-Z]{3,7}$/.test(s) && /[0-9]/.test(s);
}

/* --------------------------------------------------------- the builder */

/** Does this row allow every character already chosen? */
function rowAllows(row, picks) {
  for (let i = 0; i < 4; i++) {
    if (picks[i] == null) continue;
    if (!row.ax[i].some(l => l[0] === picks[i])) return false;
  }
  return true;
}

/**
 * The values still available at position `i` (0 = 4th character), given the
 * characters chosen at the other three positions.
 *
 * The constraint at `i` itself is deliberately ignored, so that changing one's
 * mind about a character shows all its alternatives rather than only the one
 * already picked.
 */
export function optionsFor(tbl, picks, i) {
  const relaxed = picks.slice();
  relaxed[i] = null;
  const seen = new Map();
  for (const row of tbl.rows) {
    if (!rowAllows(row, relaxed)) continue;
    for (const [code, label] of row.ax[i]) {
      if (!seen.has(code)) seen.set(code, label);
    }
  }
  return [...seen].map(([code, label]) => [code, label])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

/** The column headings of this table at position i, as the book prints them. */
export function axisTitle(tbl, i) {
  for (const row of tbl.rows) {
    if (row.t && row.t[i]) return row.t[i];
  }
  return ['Body Part', 'Approach', 'Device', 'Qualifier'][i];
}

/** Is this combination of four characters actually on one row? */
export function rowFor(tbl, picks) {
  if (picks.some(p => p == null)) return null;
  return tbl.rows.find(row => rowAllows(row, picks)) || null;
}

/**
 * Everything there is to say about a seven-character code: which table it comes
 * from, what each character means, and its official title.
 */
export async function describe(input) {
  const code = normalisePcs(input);
  if (code.length !== 7) return { code, exists: false, reason: 'length' };

  let tbl;
  try {
    tbl = await table(code.slice(0, 3));
  } catch {
    return { code, exists: false, reason: 'table' };
  }

  const picks = [code[3], code[4], code[5], code[6]];
  const row = rowFor(tbl, picks);
  if (!row) return { code, exists: false, reason: 'row', table: tbl };

  const chars = [
    { pos: 1, title: 'Section', code: tbl.sec[0], label: tbl.sec[1] },
    { pos: 2, title: 'Body System', code: tbl.bs[0], label: tbl.bs[1] },
    { pos: 3, title: 'Operation', code: tbl.op[0], label: tbl.op[1], def: tbl.def },
  ];
  for (let i = 0; i < 4; i++) {
    const hit = row.ax[i].find(l => l[0] === picks[i]);
    chars.push({
      pos: 4 + i,
      title: axisTitle(tbl, i),
      code: picks[i],
      label: hit ? hit[1] : '',
    });
  }

  const all = await codes();
  const official = all.byCode.get(code);

  return { code, exists: true, table: tbl, row, chars, desc: official ? official.desc : '' };
}

/* ------------------------------------------------------------ the keys */

/**
 * The keys map the words a surgeon writes onto the values PCS recognises.
 * They are searched constantly, so the flattened form is built once.
 */
export function flattenKey(entries) {
  const rows = [];
  for (const e of entries || []) {
    for (const v of e.v) {
      rows.push({
        value: v,
        includes: e.inc || [],
        def: e.def || '',
        exp: e.exp || '',
        lower: (v + ' ' + (e.inc || []).join(' ')).toLowerCase(),
      });
    }
  }
  return rows.sort((a, b) => a.value.localeCompare(b.value));
}

/* --------------------------------------------- root operations, grouped */

// The nine objective groups are CMS's own, from the ICD-10-PCS Reference
// Manual. They matter because the operations a coder confuses are almost
// always members of the same group: they share an objective and differ on one
// point, which is exactly what makes them hard to tell apart and exactly what
// each group page has to spell out.
export const OP_GROUPS = [
  {
    id: 'takeout',
    title: 'Take out some or all of a body part',
    plain: 'Something is removed from the body.',
    ops: ['Excision', 'Resection', 'Detachment', 'Destruction', 'Extraction'],
  },
  {
    id: 'takeoutstuff',
    title: 'Take out solids, fluids or gases from a body part',
    plain: 'What comes out is not body part - it is fluid, gas, or matter that should not be there.',
    ops: ['Drainage', 'Extirpation', 'Fragmentation'],
  },
  {
    id: 'cutting',
    title: 'Cutting or separation only',
    plain: 'Nothing is taken out and nothing is put in. Something is cut, or freed.',
    ops: ['Division', 'Release'],
  },
  {
    id: 'putback',
    title: 'Put in, put back, or move some or all of a body part',
    plain: 'Living tissue moves - from a donor, or from somewhere else in the same patient.',
    ops: ['Transplantation', 'Reattachment', 'Transfer', 'Reposition'],
  },
  {
    id: 'tubular',
    title: 'Alter the diameter or route of a tubular body part',
    plain: 'A tube is widened, narrowed, closed off, or rerouted.',
    ops: ['Restriction', 'Occlusion', 'Dilation', 'Bypass'],
  },
  {
    id: 'device',
    title: 'Always involve a device',
    plain: 'The point of the procedure is the device: putting one in, taking one out, or working on one.',
    ops: ['Insertion', 'Replacement', 'Supplement', 'Change', 'Removal', 'Revision'],
  },
  {
    id: 'exam',
    title: 'Examination only',
    plain: 'Looking, and nothing else.',
    ops: ['Inspection', 'Map'],
  },
  {
    id: 'repairs',
    title: 'Other repairs',
    plain: 'Putting something back to the way it should be, when nothing more specific fits.',
    ops: ['Control', 'Repair'],
  },
  {
    id: 'other',
    title: 'Other objectives',
    plain: 'Objectives that do not fit any of the groups above.',
    ops: ['Fusion', 'Alteration', 'Creation'],
  },
];

let opIndexPromise = null;

/** Root operation name -> its definition, explanation, examples and character. */
export function rootOperations() {
  if (!opIndexPromise) {
    opIndexPromise = Promise.all([defs(), tablemap()]).then(([d, tm]) => {
      const terms = ((d['0'] || {})['3'] || {}).terms || [];
      const charOf = new Map();
      for (const [, sec, , op, opTitle] of tm) {
        if (sec === '0') charOf.set(opTitle, op);
      }
      const byName = new Map();
      for (const t of terms) {
        const name = t.v[0];
        byName.set(name, {
          name,
          char: charOf.get(name) || '',
          def: t.def || '',
          exp: t.exp || '',
          inc: t.inc || [],
          group: OP_GROUPS.find(g => g.ops.includes(name)) || null,
        });
      }
      return byName;
    });
  }
  return opIndexPromise;
}
