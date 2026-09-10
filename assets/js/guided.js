// The "Walk me through it" mode: the same screens, paced and narrated.
//
// This lives on its own rather than in main.js because every view needs to talk
// to it, and main.js imports every view. Keeping it separate keeps the module
// graph one-directional, which is also what lets the whole app be bundled into
// a single file.

import * as store from './store.js';
import { esc } from './ui.js';

export function guidedOn() { return store.get().guided; }

/**
 * The green strip under the top bar during a walk-through.
 * step: 1 = looking the condition up, 2 = confirming it in the tabular list.
 */
export function setGuidedBar(step, note) {
  const bar = document.getElementById('guided-bar');
  if (!bar) return;
  if (!guidedOn() || !step) { bar.hidden = true; bar.innerHTML = ''; return; }
  bar.hidden = false;
  bar.innerHTML = `
    <div class="gb-inner">
      <span class="gb-steps">
        <span class="gb-step ${step === 1 ? 'on' : 'done'}">1 · Find the words in the index</span>
        <span aria-hidden="true">→</span>
        <span class="gb-step ${step === 2 ? 'on' : ''}">2 · Confirm the code in the tabular list</span>
      </span>
      <span class="muted small">${esc(note || '')}</span>
    </div>`;
}
