// Everything the user personally accumulates - stars, private notes, recently
// viewed codes, the working list of codes for the conflict checker, and the two
// interface preferences. All of it stays in this browser; nothing is sent anywhere.

const KEY = 'icd-notes-explorer/v1';

const defaults = {
  starred: [],        // ["J44.1", ...]
  notes: {},          // { "J44.1": "text the user typed" }
  recent: [],         // most recent first
  worklist: '',       // the text sitting in the conflict checker
  theme: null,        // "light" | "dark" | null (follow the computer's setting)
  guided: false,
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

export function setWorklist(text) { state.worklist = text; save(); }

export function setTheme(theme) { state.theme = theme; save(); emit(); }

export function setGuided(on) { state.guided = !!on; save(); emit(); }
