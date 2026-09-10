// What the user accumulates on the procedure side: starred codes, saved builds
// and the recently viewed list.
//
// This is deliberately a separate localStorage key from the original tool's,
// so that neither version can corrupt the other's state and the original keeps
// working exactly as it did. Theme is the one thing shared - it comes from the
// original store.js - because having the two versions disagree about light and
// dark would just be irritating.

const KEY = 'icd-coder-workbench/v2';

const defaults = {
  starred: [],        // ["0DTJ4ZZ", ...]
  builds: [],         // [{code, desc, note, at}]
  recent: [],         // most recent first
  notes: {},          // { "0DTJ4ZZ": "text the user typed" }
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private browsing */ }
}

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => fn(state)); }

export function get() { return state; }

export function isStarred(code) { return state.starred.includes(code); }

export function toggleStar(code) {
  const i = state.starred.indexOf(code);
  if (i >= 0) state.starred.splice(i, 1);
  else state.starred.unshift(code);
  save(); emit();
  return i < 0;
}

export function getNote(code) { return state.notes[code] || ''; }

export function setNote(code, text) {
  if (text.trim()) state.notes[code] = text;
  else delete state.notes[code];
  save(); emit();
}

export function pushRecent(code, desc) {
  state.recent = state.recent.filter(r => r.code !== code);
  state.recent.unshift({ code, desc, at: Date.now() });
  state.recent = state.recent.slice(0, 40);
  save(); emit();
}

/** A code kept from the builder, with the note the coder wrote at the time. */
export function saveBuild(code, desc, note) {
  state.builds = state.builds.filter(b => b.code !== code);
  state.builds.unshift({ code, desc, note: note || '', at: Date.now() });
  state.builds = state.builds.slice(0, 100);
  save(); emit();
}

export function removeBuild(code) {
  state.builds = state.builds.filter(b => b.code !== code);
  save(); emit();
}
