// Shared rendering helpers: escaping, code links, note-type vocabulary,
// the explanation drawer and the little toast.

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function h(strings, ...vals) {
  return strings.reduce((out, s, i) => out + s + (i < vals.length ? vals[i] : ''), '');
}

/* ------------------------------------------------------------------ codes */

// A code reference the way the book writes it: J44.0, E84.-, Z16.-, J60-J70.
const RANGE_RE = /\b([A-Z]\d[0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s*-\s*([A-Z]\d[0-9A-Z](?:\.[0-9A-Z]{1,4})?)\b/g;
const SINGLE_RE = /\b([A-Z]\d[0-9A-Z](?:\.[0-9A-Z]{1,4})?)(\.?-)?/g;

export function normaliseCode(raw) {
  let c = String(raw || '').trim().toUpperCase().replace(/[^0-9A-Z.]/g, '');
  c = c.replace(/\.+$/, '');
  if (c.length > 3 && c[3] !== '.') c = c.slice(0, 3) + '.' + c.slice(3);
  return c;
}

// Turn every code mentioned inside a note into something the reader can click.
export function linkifyCodes(text) {
  const src = String(text || '');
  const out = [];
  let last = 0;

  // Ranges first, so "J60-J70" is not chopped into two unrelated codes.
  const ranges = [];
  RANGE_RE.lastIndex = 0;
  let m;
  while ((m = RANGE_RE.exec(src))) ranges.push([m.index, m.index + m[0].length, m[1], m[2]]);

  const covered = (i) => ranges.some(r => i >= r[0] && i < r[1]);

  const singles = [];
  SINGLE_RE.lastIndex = 0;
  while ((m = SINGLE_RE.exec(src))) {
    if (covered(m.index)) continue;
    singles.push([m.index, m.index + m[0].length, m[1], !!m[2]]);
  }

  const all = [
    ...ranges.map(r => ({ start: r[0], end: r[1], kind: 'range', a: r[2], b: r[3] })),
    ...singles.map(s => ({ start: s[0], end: s[1], kind: 'code', a: s[2], dash: s[3] })),
  ].sort((x, y) => x.start - y.start);

  for (const item of all) {
    out.push(esc(src.slice(last, item.start)));
    const label = esc(src.slice(item.start, item.end));
    if (item.kind === 'range') {
      out.push(`<a class="code-link" href="#/range/${esc(item.a)}-${esc(item.b)}">${label}</a>`);
    } else {
      out.push(`<a class="code-link" href="#/code/${esc(item.a)}">${label}</a>`);
    }
    last = item.end;
  }
  out.push(esc(src.slice(last)));
  return out.join('');
}

/* ------------------------------------------------- the seven kinds of note */

export const NOTE_TYPES = {
  excludes1: {
    key: 'never', icon: '⛔', order: 1,
    plain: 'Never code these together',
    official: 'Officially called: Excludes1',
    help: {
      what: 'An Excludes1 note means "not coded here". The conditions listed can never be reported at the same time as this code, because the two cannot exist together in the same patient at the same time - a condition is either the congenital form or the acquired form, not both.',
      ignored: 'If you ignore it, the claim is likely to be rejected outright, and if it is paid it can be recovered later as an incorrect claim. Excludes1 is the strictest instruction in the whole book.',
      exception: 'There is one narrow exception. If the two conditions are genuinely unrelated to each other, both may be coded. If you are unsure, ask - do not guess.',
    },
  },
  excludes2: {
    key: 'maybe', icon: '⚠', order: 2,
    plain: 'These may be coded together if both are present',
    official: 'Officially called: Excludes2',
    help: {
      what: 'An Excludes2 note means "not included here". The listed condition is not part of what this code covers, but a patient can have both at once. When the record documents both, code both.',
      ignored: 'If you ignore it you may leave money and clinical detail off the claim, because the second condition never gets reported. It is a prompt, not a prohibition.',
    },
  },
  codeFirst: {
    key: 'first', icon: '①', order: 3,
    plain: 'Code the underlying condition first',
    official: 'Officially called: Code First',
    help: {
      what: 'This code describes a manifestation - something caused by another disease. The disease that caused it must be listed before this code on the claim.',
      ignored: 'If you ignore it, the codes are in the wrong order. Sequence matters: the first code listed drives payment and reporting, and a manifestation code can never be first.',
    },
  },
  useAdditionalCode: {
    key: 'add', icon: '＋', order: 4,
    plain: 'Add a second code for',
    official: 'Officially called: Use Additional Code',
    help: {
      what: 'This code tells only part of the story. A second code, listed after it, is needed to record the extra detail named in the note - an infectious organism, a tobacco habit, a drug involved.',
      ignored: 'If you ignore it the account is incomplete. This is one of the most common reasons a coder is asked to rework a chart.',
    },
  },
  codeAlso: {
    key: 'also', icon: '⇄', order: 5,
    plain: 'Also code, when documented',
    official: 'Officially called: Code Also',
    help: {
      what: 'Two codes may be needed to describe the situation fully, but unlike Code First, the order is up to you. Put whichever condition was the main reason for the encounter first.',
      ignored: 'If you ignore it the picture is incomplete, though the order itself is not a hard rule here.',
    },
  },
  includes: {
    key: 'incl', icon: '≡', order: 6,
    plain: 'This code includes',
    official: 'Officially called: Includes and Inclusion Terms',
    help: {
      what: 'These are other ways of writing the same thing. If the record uses any of these words, this code still applies. They are examples, not a complete list.',
      ignored: 'Nothing goes wrong if you ignore them, but you may waste time hunting for a code that does not exist because you did not recognise the doctor\'s wording.',
    },
  },
  notes: {
    key: 'incl', icon: '✎', order: 7,
    plain: 'Extra guidance from the code book',
    official: 'Officially called: Note',
    help: {
      what: 'Free-standing guidance printed at this level of the book. It usually explains how a whole group of codes is meant to be used.',
      ignored: 'These notes often carry the reasoning behind the rules around them. Reading them is how the conventions start to make sense.',
    },
  },
  seventh: {
    key: 'seven', icon: '⑦', order: 8,
    plain: 'Seventh character required',
    official: 'Officially called: 7th character extension',
    help: {
      what: 'Some codes are not finished until a seventh character is added, saying which visit this is - the first time the problem was treated, a follow-up while it heals, or a lasting effect left behind. The seventh character must sit in the seventh position. If the code is shorter than six characters, the letter X fills the gap - that is the placeholder X.',
      ignored: 'A code that is missing its seventh character is not a valid code. It will be rejected.',
    },
  },
};

export const TYPE_ORDER = ['excludes1', 'excludes2', 'codeFirst', 'useAdditionalCode',
  'codeAlso', 'includes', 'notes', 'seventh'];

export function typeVars(key) {
  return `--nc: var(--c-${key}); --nc-bg: var(--c-${key}-bg); --nc-ink: var(--c-${key}-ink);`;
}

/* ----------------------------------------------------------------- drawer */

const drawer = () => document.getElementById('drawer');

export function openDrawer(title, bodyHtml) {
  document.getElementById('drawer-title').textContent = title;
  document.getElementById('drawer-body').innerHTML = bodyHtml;
  drawer().hidden = false;
  document.getElementById('drawer-close').focus();
}

export function closeDrawer() { drawer().hidden = true; }

export function explainNoteType(typeKey) {
  const t = NOTE_TYPES[typeKey];
  if (!t) return;
  const parts = [`<h4>What it means</h4><p>${esc(t.help.what)}</p>`,
    `<h4>What happens if it is ignored</h4><p>${esc(t.help.ignored)}</p>`];
  if (t.help.exception) parts.push(`<h4>The one exception</h4><p>${esc(t.help.exception)}</p>`);
  parts.push(`<p style="margin-top:1.2rem"><a href="#/glossary?at=${typeKey}" data-close-drawer>Read the full glossary entry</a></p>`);
  openDrawer(t.plain, parts.join(''));
}

/* ------------------------------------------------------------------ toast */

let toastTimer = null;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

/* ----------------------------------------------------------------- badges */

export function billableBadge(flags) {
  if (flags.includes('b')) {
    return `<span class="badge badge-billable">✓ Billable</span>`;
  }
  if (flags.includes('x')) {
    return `<span class="badge badge-seven">⑦ Needs a seventh character</span>`;
  }
  return `<span class="badge badge-heading">Heading only — pick a more specific code</span>`;
}

export function rulesBadge(n) {
  if (!n) return `<span class="badge badge-rules">no notes apply</span>`;
  return `<span class="badge badge-rules">${n} ${n === 1 ? 'note applies' : 'notes apply'}</span>`;
}

export function highlight(text, tokens) {
  let out = esc(text);
  for (const t of tokens) {
    if (t.length < 2) continue;
    const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    out = out.replace(re, '<mark>$1</mark>');
  }
  return out;
}

export function loadingBlock(msg) {
  return `<div class="loading"><span class="spinner"></span><span>${esc(msg)}</span></div>`;
}

export function pluralise(n, one, many) { return n === 1 ? one : many; }
