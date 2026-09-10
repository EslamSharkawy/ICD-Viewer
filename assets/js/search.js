// One box, three kinds of question. This module decides which kind was asked
// and answers it, translating everyday words into the wording the book uses.

import { codes, allNotes, indexSearchRows } from './data.js';
import { normaliseCode } from './ui.js';

// Everyday words on the left, book wording on the right. A beginner types the
// left-hand side; the book only ever says the right-hand side.
const SYNONYMS = {
  'copd': 'chronic obstructive pulmonary',
  'flare': 'exacerbation', 'flareup': 'exacerbation', 'flares': 'exacerbation',
  'sugar': 'diabetes', 'sugars': 'diabetes',
  'heart attack': 'myocardial infarction',
  'attack': '', 'stroke': 'cerebral infarction',
  'high blood pressure': 'hypertension',
  'low blood pressure': 'hypotension',
  'broken': 'fracture', 'break': 'fracture', 'breaks': 'fracture',
  'clot': 'thrombosis', 'blood clot': 'thrombosis',
  'kidney failure': 'renal failure',
  'water infection': 'urinary tract infection',
  'tummy': 'abdominal', 'belly': 'abdominal', 'stomach ache': 'abdominal pain',
  'shortness of breath': 'dyspnea', 'short of breath': 'dyspnea',
  'breathless': 'dyspnea',
  'smoking': 'tobacco', 'smoker': 'tobacco',
  'hardening of the arteries': 'atherosclerotic',
  'chest infection': 'pneumonia',
  'wee': 'urinary', 'pee': 'urinary',
  'hip break': 'fracture femur',
  'sore throat': 'pharyngitis',
  'high sugar': 'hyperglycemia', 'low sugar': 'hypoglycemia',
  'blocked artery': 'atherosclerotic',
  'lung disease': 'pulmonary disease',
  'cancer': 'malignant neoplasm',
  'growth': 'neoplasm',
  'bad reaction': 'adverse effect',
  'overdose': 'poisoning',
  'unspecified': 'unspecified',
};

const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'for', 'with', 'and', 'or', 'in', 'on',
  'up', 'it', 'is', 'my', 'that', 'this', 'code', 'codes', 'about']);

const CODE_LIKE = /^[a-z]\d[0-9a-z]{0,5}(\.[0-9a-z]{0,4})?$/i;

export function interpret(raw) {
  const q = String(raw || '').trim();
  if (!q) return { mode: 'empty', q };

  const low = q.toLowerCase();

  if (/(need|require|requires|requiring|with)s?\s+(a\s+)?(7th|seventh)/.test(low) ||
      /^(7th|seventh) character/.test(low)) {
    return { mode: 'seventh', q };
  }

  const notesAsk = low.match(/^(?:notes?|rules?)\s+(?:mentioning|about|containing|with|that mention|saying)\s+(.+)$/);
  if (notesAsk) return { mode: 'notes', q, term: notesAsk[1].trim() };

  const bare = q.replace(/\s+/g, '');
  if (CODE_LIKE.test(bare)) return { mode: 'code', q, code: normaliseCode(bare) };

  return { mode: 'text', q };
}

export function expandQuery(q) {
  let s = ' ' + q.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ') + ' ';
  // Multi-word phrases first, so "heart attack" is not read as two words.
  const phrases = Object.keys(SYNONYMS).filter(k => k.includes(' '))
    .sort((a, b) => b.length - a.length);
  for (const p of phrases) {
    if (s.includes(' ' + p + ' ')) s = s.replace(' ' + p + ' ', ' ' + SYNONYMS[p] + ' ');
  }
  const words = s.trim().split(' ').filter(Boolean);
  const out = [];
  for (const w of words) {
    const mapped = Object.prototype.hasOwnProperty.call(SYNONYMS, w) ? SYNONYMS[w] : w;
    for (const piece of mapped.split(' ')) {
      const t = piece.trim();
      if (t && !STOP.has(t) && t.length > 1) out.push(t);
    }
  }
  return [...new Set(out)];
}

/* --------------------------------------------------------------- searching */

export async function searchCodes(query, limit = 60) {
  const { all } = await codes();
  const tokens = expandQuery(query);
  if (!tokens.length) return { rows: [], tokens };

  const phrase = tokens.join(' ');
  const scored = [];

  for (const row of all) {
    const hay = row.lower;
    let score = 0, all_present = true;
    for (const t of tokens) {
      const at = hay.indexOf(t);
      if (at < 0) { all_present = false; break; }
      score += at === 0 ? 6 : (hay[at - 1] === ' ' ? 4 : 1.5);
    }
    if (!all_present) continue;
    if (hay.includes(phrase)) score += 8;
    if (row.flags.includes('b')) score += 2.5;
    if (row.flags.includes('x')) score += 1.5;
    score += Math.max(0, 4 - row.code.length * 0.35);
    score -= Math.min(3, hay.length / 90);
    scored.push([score, row]);
  }

  scored.sort((a, b) => b[0] - a[0] || a[1].code.localeCompare(b[1].code));
  return { rows: scored.slice(0, limit).map(s => s[1]), tokens, total: scored.length };
}

// Falls back to the alphabetic index when the tabular wording does not contain
// the words a person actually used.
export async function searchViaIndex(query, limit = 40) {
  const rows = await indexSearchRows();
  const { byCode } = await codes();
  const tokens = expandQuery(query);
  const raw = query.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  const use = [...new Set([...tokens, ...raw])];
  if (!use.length) return { rows: [], tokens: use };

  const seen = new Map();
  for (const r of rows) {
    if (!r.code) continue;
    let score = 0, ok = true;
    for (const t of use) {
      const at = r.text.indexOf(t);
      if (at < 0) { ok = false; break; }
      score += at === 0 ? 4 : 2;
    }
    if (!ok) continue;
    const code = r.code.replace(/-$/, '');
    const prev = seen.get(code);
    if (!prev || prev.score < score) seen.set(code, { score, trail: r.trail, title: r.title, letter: r.letter, path: r.path, mi: r.mi });
  }

  const out = [...seen.entries()]
    .map(([code, v]) => ({ ...v, code, row: byCode.get(code) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { rows: out, tokens: use };
}

export async function searchNotes(term, limit = 120) {
  const notes = await allNotes();
  const t = term.toLowerCase().trim();
  if (!t) return [];
  return notes.filter(n => n.lower.includes(t)).slice(0, limit);
}

export async function codeMatches(code, limit = 60) {
  const { byCode, all } = await codes();
  const exact = byCode.get(code) || null;
  const flat = code.replace('.', '');
  const kids = all.filter(r => r.code !== code && r.code.replace('.', '').startsWith(flat))
    .slice(0, limit);
  return { exact, kids };
}

export async function sevenCharCodes(limit = 300) {
  const { all } = await codes();
  return all.filter(r => r.flags.includes('x') && r.flags.includes('l')).slice(0, limit);
}
