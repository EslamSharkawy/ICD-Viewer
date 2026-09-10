// Rendering helpers shared across the procedure screens.

import { esc } from '../js/ui.js';

/** Turn "0DTJ4ZZ" into a link, wherever a code is mentioned in prose. */
export function pcsLink(code, label) {
  const c = String(code || '').toUpperCase();
  return `<a class="code-link mono" href="#/pcscode/${encodeURIComponent(c)}">${esc(label || c)}</a>`;
}

// Codes quoted inside the official guidelines - "code X28F3WB", "XW033CA" -
// should be reachable. Seven characters, no I and no O, and at least one digit,
// which is enough to avoid catching ordinary capitalised words.
const PCS_IN_TEXT = /\b(?=[0-9A-HJ-NP-Z]{7}\b)(?=[^ ]*\d)[0-9A-HJ-NP-Z]{7}\b/g;

export function linkifyPcs(text) {
  const src = String(text || '');
  let out = '';
  let last = 0;
  let m;
  PCS_IN_TEXT.lastIndex = 0;
  while ((m = PCS_IN_TEXT.exec(src))) {
    out += esc(src.slice(last, m.index)) + pcsLink(m[0]);
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

/**
 * The seven characters of a code, each in its own box under the name of the
 * axis it belongs to. This is the one picture that makes PCS make sense, so it
 * is used on the code page, in the builder, and anywhere a code is explained.
 */
export function charBoxes(code, chars, opts = {}) {
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const ch = chars && chars[i];
    const value = (code && code[i]) || '';
    const filled = !!value;
    const active = opts.active === i;
    cells.push(`<${opts.interactive ? 'button' : 'div'}
        class="cbox ${filled ? 'filled' : 'empty'}${active ? ' active' : ''}"
        ${opts.interactive ? `type="button" data-char="${i}"` : ''}>
      <span class="cbox-pos">${i + 1}</span>
      <span class="cbox-char">${filled ? esc(value) : '·'}</span>
      <span class="cbox-axis">${esc(ch ? ch.title : AXIS_FALLBACK[i])}</span>
      <span class="cbox-label">${esc(ch && ch.label ? ch.label : '')}</span>
    </${opts.interactive ? 'button' : 'div'}>`);
  }
  return `<div class="cboxes">${cells.join('')}</div>`;
}

const AXIS_FALLBACK = ['Section', 'Body System', 'Operation',
  'Body Part', 'Approach', 'Device', 'Qualifier'];

/**
 * Guideline bodies come out of the build as a mix of paragraphs and real lists
 * (see build_pcs.py, _as_blocks).
 */
export function renderBlocks(blocks, opts = {}) {
  const link = opts.linkify === false ? esc : linkifyPcs;
  return (blocks || []).map(b => {
    if (typeof b === 'string') return `<p>${link(b)}</p>`;
    if (b.ul) return `<ul class="gl-list">${b.ul.map(x => `<li>${link(x)}</li>`).join('')}</ul>`;
    if (b.ol) return `<ol class="gl-list">${b.ol.map(x => `<li>${link(x)}</li>`).join('')}</ol>`;
    return '';
  }).join('');
}

/** A citation chip that opens the rule it names. */
export function cite(id, opts = {}) {
  const set = opts.cm ? 'cmguidelines' : 'pcsguidelines';
  const label = opts.cm ? `Guideline ${id}` : `PCS guideline ${id}`;
  return `<a class="cite" href="#/${set}?at=${encodeURIComponent(id)}"
     title="Read the official rule">${esc(opts.label || label)}</a>`;
}

/** The plain text of a guideline body, for searching. */
export function blocksText(blocks) {
  return (blocks || []).map(b =>
    typeof b === 'string' ? b : (b.ul || b.ol || []).join(' ')).join(' ');
}

export function sectionChip(code, title) {
  return `<span class="secchip"><b class="mono">${esc(code)}</b> ${esc(title)}</span>`;
}

/**
 * Jump to a section of the page you are already on.
 *
 * A plain href="#something" cannot be used for this: the whole app is routed
 * off location.hash, so the browser's own fragment navigation reads as a route
 * change, finds no route, and drops the reader back on the home screen. These
 * links carry the target in data-scroll and are handled here instead.
 */
export function scrollLink(targetId, html, cls = '') {
  return `<a class="${cls}" href="#" data-scroll="${esc(targetId)}">${html}</a>`;
}

export function wireScrollLinks(root) {
  root.addEventListener('click', e => {
    const a = e.target.closest('[data-scroll]');
    if (!a) return;
    e.preventDefault();
    const el = root.querySelector('#' + CSS.escape(a.getAttribute('data-scroll')));
    if (el) scrollToSection(el);
  });
}

/**
 * Put a section under the top bar rather than behind it, and flash it so the
 * eye lands on the right place.
 *
 * scrollIntoView is not used: the sticky header would cover the heading it just
 * scrolled to, and its smooth behaviour is silently ignored in some embedded
 * browsers, which leaves the reader on the page they started on with no idea
 * why. An explicit scrollTo always moves.
 */
export function scrollToSection(el) {
  const bar = document.querySelector('.topbar');
  const clear = (bar ? bar.getBoundingClientRect().height : 0) + 12;
  const top = el.getBoundingClientRect().top + window.scrollY - clear;
  window.scrollTo(0, Math.max(0, top));
  el.classList.remove('flash');
  void el.offsetWidth;              // restart the highlight if it is re-clicked
  el.classList.add('flash');
}
