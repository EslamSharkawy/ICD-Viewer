// What changed between last year's edition and this one.

import { esc, loadingBlock, billableBadge } from '../ui.js';
import { whatsnew, meta } from '../data.js';
import { setGuidedBar } from '../guided.js';

export async function renderWhatsNew(view, r) {
  setGuidedBar(null);
  view.innerHTML = loadingBlock('Loading the year-on-year comparison…');

  const [d, m] = await Promise.all([whatsnew(), meta()]);
  const tab = r.params.get('tab') || 'added';

  view.innerHTML = `<div class="wrap-mid">
    <h1 style="font-size:1.6rem;margin-bottom:.35rem">What's new this year</h1>
    <p class="lede">The code set is reissued once a year and the new edition takes effect on <b>1 October</b>.
      That twelve-month period is called a <b>fiscal year edition</b> — ${esc(m.label)}
      Codes are added when medicine learns to tell two things apart, retired when they stop being useful,
      and reworded when the old wording caused mistakes. The edition you use is decided by the date of the
      patient's encounter, not by the date you sit down to code it.</p>

    <p class="small muted" style="margin:.8rem 0 1.4rem">Comparing ${esc(d.from)} with ${esc(d.to)}, from the official
      addenda published alongside the release.</p>

    <div class="tabs">
      <button data-tab="added" class="${tab === 'added' ? 'on' : ''}">New codes (${d.added.length})</button>
      <button data-tab="deleted" class="${tab === 'deleted' ? 'on' : ''}">Retired codes (${d.deleted.length})</button>
      <button data-tab="revised" class="${tab === 'revised' ? 'on' : ''}">Changed descriptions (${d.revised.length})</button>
      <button data-tab="notes" class="${tab === 'notes' ? 'on' : ''}">Changed instructional notes</button>
    </div>
    <div id="tabbody"></div>
  </div>`;

  const body = view.querySelector('#tabbody');
  const paint = (which) => {
    view.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === which));
    history.replaceState(null, '', '#/whatsnew?tab=' + which);
    body.innerHTML = renderTab(which, d);
  };

  view.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => paint(b.dataset.tab)));
  paint(tab);
}

function renderTab(which, d) {
  if (which === 'added') {
    return list(d.added,
      `${d.added.length} entries were added for ${d.to}. Entries marked as headings are not billable in themselves — they exist to hold the more specific codes underneath them.`,
      'new');
  }
  if (which === 'deleted') {
    return list(d.deleted,
      `${d.deleted.length} entries were retired. If you are coding an encounter from before 1 October you still use the old edition, so a retired code is not automatically a mistake.`,
      'gone');
  }
  if (which === 'revised') {
    if (!d.revised.length) return `<div class="empty"><strong>No descriptions were reworded this year.</strong></div>`;
    return `<div class="card">
      <div class="diff-labels"><span>Code</span><span>Last year</span><span>This year</span></div>
      ${d.revised.map(v => `<div class="diffrow">
        <span><a class="code-link" href="#/code/${esc(v.code)}">${esc(v.code)}</a></span>
        <span class="diff-before">${esc(v.before)}</span>
        <span class="diff-after">${esc(v.after)}</span>
      </div>`).join('')}
    </div>`;
  }

  // Instructional notes: honest about what is and is not available.
  return `<div class="empty" style="text-align:left">
    <strong>This comparison needs two editions installed, and only one is.</strong>
    <p>Changes to instructional notes — a new Excludes1 appearing under a category, or, most importantly,
       a note switching from the strict <b>Excludes1</b> type to the permissive <b>Excludes2</b> type — are not
       listed in the official addenda file. The addenda only covers codes and their descriptions.</p>
    <p>To see note-level changes, the tool has to read both years' Tabular List files and compare them
       directly. Put last year's <code>icd10cm_tabular_2026.xml</code> next to this year's in the
       <code>Table and Index</code> folder and run the build script again; this tab will then show every
       note that was added, removed or changed type, with the before and after side by side.</p>
    <p class="small muted">Note-type switches matter more than they sound. When a pair of codes moves from
       Excludes1 to Excludes2, something that was forbidden last year is permitted this year — and the
       claim you would have corrected in September is correct in October.</p>
  </div>`;
}

function list(rows, lede, kind) {
  if (!rows.length) return `<div class="empty"><strong>Nothing in this group.</strong></div>`;
  return `<p class="small muted" style="margin-bottom:.8rem">${esc(lede)}</p>
    <div class="result-list">
      ${rows.map(row => `<a class="result" href="#/code/${esc(row.code)}">
        <span class="r-code">${esc(row.code)}</span>
        <span class="r-desc">${esc(row.desc)}</span>
        <span class="r-badges">
          ${row.billable ? '<span class="badge badge-billable">✓ Billable</span>'
            : '<span class="badge badge-heading">Heading only</span>'}
          <span class="badge ${kind === 'new' ? 'badge-new' : 'badge-heading'}">${kind === 'new' ? 'new this year' : 'retired'}</span>
        </span>
      </a>`).join('')}
    </div>`;
}
