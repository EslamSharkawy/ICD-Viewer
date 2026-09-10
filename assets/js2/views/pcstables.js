// Browsing the 918 tables, and reading one of them the way the book prints it.

import { esc, loadingBlock, highlight } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import { sections, tablemap, table, axisTitle, rootOperations } from '../pcsdata.js';
import { cite } from '../pcsui.js';

export async function renderTables(view, r) {
  setGuidedBar(null);
  view.innerHTML = loadingBlock('Opening the tables…');

  const [secs, tm] = await Promise.all([sections(), tablemap()]);
  const q = (r.params.get('q') || '').trim().toLowerCase();
  const sec = r.params.get('s') || '';

  const rows = tm.filter(t =>
    (!sec || t[1] === sec) &&
    (!q || (t[0] + ' ' + t[4] + ' ' + t[5]).toLowerCase().includes(q)));

  view.innerHTML = `<div class="wrap-mid">
    <div class="hero tight">
      <h1>The tables</h1>
      <p class="lede">Every valid ICD-10-PCS code comes from one of these ${tm.length} tables. The
        first three characters name the table; the last four are chosen from a single row of it.
        Values from different rows can never be combined. ${cite('A1')}</p>

      <form class="searchbox compact" id="tsearch" role="search">
        <span class="mag" aria-hidden="true">🔍</span>
        <label class="skip-link" for="tq">Search the tables</label>
        <input id="tq" type="search" autocomplete="off" spellcheck="false" value="${esc(q)}"
               placeholder="Table id, body system or root operation">
      </form>
    </div>

    <div class="secfilter">
      <a class="chip ${!sec ? 'on' : ''}" href="#/pcstables${q ? `?q=${encodeURIComponent(q)}` : ''}">All sections</a>
      ${secs.map(s => `<a class="chip ${sec === s.code ? 'on' : ''}"
        href="#/pcstables?s=${esc(s.code)}${q ? `&q=${encodeURIComponent(q)}` : ''}">
        <span class="mono">${esc(s.code)}</span> ${esc(s.plain)}</a>`).join('')}
    </div>

    <div class="results-head">
      <h2 class="section-title">${rows.length.toLocaleString()} table${rows.length === 1 ? '' : 's'}</h2>
      <span class="muted small">${rows.reduce((n, t) => n + t[7], 0).toLocaleString()} codes between them</span>
    </div>

    <div class="tablelist">
      ${rows.slice(0, 400).map(t => `<a class="trow" href="#/pcstable/${esc(t[0])}">
        <span class="trow-id mono">${esc(t[0])}</span>
        <span class="trow-main">
          <b>${highlight(t[4], q ? [q] : [])}</b>
          <span class="trow-sub">${highlight(t[5], q ? [q] : [])}</span>
        </span>
        <span class="trow-count">${t[6]} row${t[6] === 1 ? '' : 's'} · ${t[7].toLocaleString()} codes</span>
      </a>`).join('')}
    </div>
    ${rows.length > 400 ? `<p class="small muted" style="margin-top:1rem">
      Showing the first 400. Narrow it with the search box or a section filter.</p>` : ''}
    ${!rows.length ? `<div class="empty"><strong>No table matched that.</strong>
      <p>Try the name of a body system or a root operation.</p></div>` : ''}
  </div>`;

  const box = view.querySelector('#tq');
  let timer = null;
  const go = () => {
    const v = box.value.trim();
    const qs = new URLSearchParams();
    if (sec) qs.set('s', sec);
    if (v) qs.set('q', v);
    location.hash = '#/pcstables' + (qs.toString() ? '?' + qs : '');
  };
  box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(go, 300); });
  view.querySelector('#tsearch').addEventListener('submit', e => { e.preventDefault(); go(); });
}

/* ----------------------------------------------------------- one table */

export async function renderTable(view, r) {
  setGuidedBar(null);
  const id = (r.parts[1] || '').toUpperCase();
  const hl = (r.params.get('hl') || '').toUpperCase();

  let tbl;
  try {
    tbl = await table(id);
  } catch {
    view.innerHTML = `<div class="wrap-narrow"><div class="empty">
      <strong>There is no table ${esc(id)}.</strong>
      <p><a href="#/pcstables">Browse the tables</a>.</p></div></div>`;
    return;
  }

  const ops = await rootOperations();
  const info = ops.get(tbl.op[1]);
  const total = tbl.rows.reduce((n, row) => n + row.n, 0);

  view.innerHTML = `<div class="wrap-mid">
    <p class="crumb"><a href="#/pcstables">The tables</a> ·
      <a href="#/pcstables?s=${esc(tbl.sec[0])}">section ${esc(tbl.sec[0])}</a></p>

    <div class="code-head">
      <div class="code-head-top">
        <div>
          <div class="code-number mono">${esc(tbl.id)}</div>
          <div class="code-desc">${esc(tbl.op[1])} — ${esc(tbl.bs[1])}</div>
        </div>
        <div class="head-actions">
          <a class="btn btn-primary" href="#/build?c=${esc(tbl.id)}">Build a code from this table</a>
          ${info ? `<a class="btn" href="#/rootop/${encodeURIComponent(info.name)}">About ${esc(info.name)}</a>` : ''}
        </div>
      </div>
      <div class="tablehead-axes">
        <span><b class="mono">${esc(tbl.sec[0])}</b> Section — ${esc(tbl.sec[1])}</span>
        <span><b class="mono">${esc(tbl.bs[0])}</b> Body System — ${esc(tbl.bs[1])}</span>
        <span><b class="mono">${esc(tbl.op[0])}</b> Operation — ${esc(tbl.op[1])}</span>
      </div>
      ${tbl.def ? `<p class="opdef">${esc(tbl.def)}</p>` : ''}
    </div>

    <p class="rowwarn">This table has <b>${tbl.rows.length}</b> row${tbl.rows.length === 1 ? '' : 's'}
      and yields <b>${total.toLocaleString()}</b> codes. You may combine values freely
      <b>within a row</b>, and never across rows — that is the single rule that makes a PCS code
      valid or invalid.</p>

    ${tbl.rows.map((row, i) => renderRow(tbl, row, i, hl)).join('')}
  </div>`;
}

function renderRow(tbl, row, i, hl) {
  const cols = [0, 1, 2, 3];
  const hlPicks = hl && hl.length === 7 && hl.slice(0, 3) === tbl.id
    ? [hl[3], hl[4], hl[5], hl[6]] : null;
  const inRow = hlPicks && cols.every(c => row.ax[c].some(l => l[0] === hlPicks[c]));

  return `<section class="pcsrow ${inRow ? 'hit' : ''}">
    <header class="pcsrow-head">
      <span>Row ${i + 1}</span>
      <span class="muted">${row.n.toLocaleString()} code${row.n === 1 ? '' : 's'}</span>
      ${inRow ? `<span class="badge badge-new">contains ${esc(hl)}</span>` : ''}
    </header>
    <div class="pcsrow-cols">
      ${cols.map(c => `<div class="pcscol">
        <h4>${esc(axisTitle(tbl, c))} <span class="muted">· character ${c + 4}</span></h4>
        <ul>
          ${row.ax[c].map(([code, label]) => `<li class="${hlPicks && hlPicks[c] === code && inRow ? 'on' : ''}">
            <span class="mono">${esc(code)}</span> ${esc(label)}</li>`).join('')}
        </ul>
      </div>`).join('')}
    </div>
  </section>`;
}
