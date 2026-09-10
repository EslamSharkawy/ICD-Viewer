// What changed in the procedure code set this year.

import { esc, loadingBlock, highlight } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import { whatsNew } from '../pcsdata.js';

export async function renderPcsWhatsNew(view, r) {
  setGuidedBar(null);
  view.innerHTML = loadingBlock('Loading the addenda…');

  const w = await whatsNew();
  const q = (r.params.get('q') || '').trim().toLowerCase();
  const tab = r.params.get('t') || 'added';

  const sets = {
    added: { label: 'New codes', rows: w.added, blurb: 'Codes that exist for the first time this year. A discharge before 1 October cannot use them.' },
    deleted: { label: 'Retired codes', rows: w.deleted, blurb: 'Codes that no longer exist. If one of these appears on a current account, it will be rejected.' },
    revised: { label: 'Reworded', rows: w.revised, blurb: 'The code number is unchanged but its title has been altered, which can change what it covers.' },
  };

  const cur = sets[tab] || sets.added;
  const rows = cur.rows.filter(x => !q ||
    (x.code + ' ' + (x.desc || '') + ' ' + (x.before || '') + ' ' + (x.after || '')).toLowerCase().includes(q));

  view.innerHTML = `<div class="wrap-mid">
    <div class="hero tight">
      <h1>What changed in the procedure codes</h1>
      <p class="lede">${esc(w.from)} → ${esc(w.to)}. The edition you use is decided by the date of
        the patient's discharge, not the date you are doing the coding.</p>

      <form class="searchbox compact" id="wsearch" role="search">
        <span class="mag" aria-hidden="true">🔍</span>
        <label class="skip-link" for="wq">Search the changes</label>
        <input id="wq" type="search" autocomplete="off" spellcheck="false" value="${esc(q)}"
               placeholder="A code or a word from its title">
      </form>
    </div>

    <div class="secfilter">
      ${Object.entries(sets).map(([k, s]) => `<a class="chip ${tab === k ? 'on' : ''}"
        href="#/pcswhatsnew?t=${k}${q ? `&q=${encodeURIComponent(q)}` : ''}">
        ${esc(s.label)} <b>${s.rows.length}</b></a>`).join('')}
    </div>

    <p class="shelf-blurb">${esc(cur.blurb)}</p>

    <div class="result-list">
      ${rows.map(x => tab === 'revised' ? `<div class="result static">
          <span class="r-code">${esc(x.code)}</span>
          <span class="r-desc">
            <span class="was">${highlight(x.before || '', q ? [q] : [])}</span>
            <span class="now">${highlight(x.after || '', q ? [q] : [])}</span>
          </span>
        </div>` : `<a class="result" href="#/pcscode/${esc(x.code)}">
          <span class="r-code">${esc(x.code)}</span>
          <span class="r-desc">${highlight(x.desc || '', q ? [q] : [])}</span>
        </a>`).join('')}
    </div>

    ${!rows.length ? `<div class="empty"><strong>Nothing here matched that.</strong>
      <p>Try another tab, or <a href="#/pcswhatsnew?t=${tab}">clear the search</a>.</p></div>` : ''}

    <p class="small muted" style="margin-top:1.5rem">Retired codes are shown without a link,
      because they no longer resolve to anything in the current tables.</p>
  </div>`;

  const box = view.querySelector('#wq');
  let timer = null;
  const go = () => {
    const v = box.value.trim();
    const qs = new URLSearchParams({ t: tab });
    if (v) qs.set('q', v);
    location.hash = '#/pcswhatsnew?' + qs;
  };
  box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(go, 300); });
  view.querySelector('#wsearch').addEventListener('submit', e => { e.preventDefault(); go(); });
}
