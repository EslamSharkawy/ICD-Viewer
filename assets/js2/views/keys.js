// The four reference keys.
//
// These are the most under-used part of ICD-10-PCS and the fastest fix for the
// commonest dead end: the word in the operative note is not a PCS value, and
// the coder concludes the code does not exist. It usually does, under another
// name.

import { esc, loadingBlock, highlight } from '../../js/ui.js';
import { setGuidedBar } from '../../js/guided.js';
import { bodyPartKey, deviceKey, substanceKey, newTechKey, deviceAgg, flattenKey } from '../pcsdata.js';
import { cite } from '../pcsui.js';

const TABS = [
  { id: 'bp', label: 'Body Part Key',
    blurb: 'Anatomical terms, and the PCS body-part value that covers each one. If the surgeon named a structure PCS has never heard of, look here first.' },
  { id: 'dev', label: 'Device Key',
    blurb: 'Trade names and everyday device words, mapped onto the device values in the tables.' },
  { id: 'sub', label: 'Substance Key',
    blurb: 'Drug and substance names for the Administration section.' },
  { id: 'nt', label: 'New Technology Key',
    blurb: 'Device, substance and technology names used in section X.' },
  { id: 'agg', label: 'Device Aggregation Table',
    blurb: 'When a specific device value is not offered in the table you are in, this says which general value to use instead.' },
];

export async function renderKeys(view, r) {
  setGuidedBar(null);
  const tab = r.params.get('k') || 'bp';
  const q = (r.params.get('q') || '').trim();

  view.innerHTML = `<div class="wrap-mid">
    <div class="hero tight">
      <h1>Reference keys</h1>
      <p class="lede">The physician is not expected to use PCS words, and the coder is not required
        to query when the correlation is clear — which only works if you know where the translation
        lives. It lives here. ${cite('A11')}</p>

      <form class="searchbox compact" id="ksearch" role="search">
        <span class="mag" aria-hidden="true">🔍</span>
        <label class="skip-link" for="kq">Search the keys</label>
        <input id="kq" type="search" autocomplete="off" spellcheck="false" value="${esc(q)}"
               placeholder="A word from the operative note — hallux, Kcentra, AbioCor…">
      </form>
    </div>

    <div class="secfilter">
      ${TABS.map(t => `<a class="chip ${tab === t.id ? 'on' : ''}"
        href="#/keys?k=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ''}">${esc(t.label)}</a>`).join('')}
    </div>

    <p class="shelf-blurb">${esc((TABS.find(t => t.id === tab) || TABS[0]).blurb)}</p>
    <div id="kbody">${loadingBlock('Loading…')}</div>
  </div>`;

  const body = view.querySelector('#kbody');
  const box = view.querySelector('#kq');
  let timer = null;
  const go = () => {
    const v = box.value.trim();
    const qs = new URLSearchParams({ k: tab });
    if (v) qs.set('q', v);
    history.replaceState(null, '', '#/keys?' + qs);
    fill(body, tab, v);
  };
  box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(go, 220); });
  view.querySelector('#ksearch').addEventListener('submit', e => { e.preventDefault(); go(); });

  fill(body, tab, q);
  if (q) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
}

async function fill(host, tab, q) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);

  if (tab === 'agg') {
    const rows = await deviceAgg();
    const hits = rows.filter(x => !tokens.length ||
      tokens.every(t => (x.device + ' ' + x.parent + ' ' + x.op + ' ' + x.bs.join(' ')).toLowerCase().includes(t)));
    host.innerHTML = `<div class="results-head">
        <h2 class="section-title">${hits.length} entries</h2>
        <span class="muted small">Specific value → the general value to use instead</span>
      </div>
      <table class="keytable">
        <thead><tr><th>Specific device</th><th>In these body systems</th><th>For</th><th>Use instead</th></tr></thead>
        <tbody>${hits.map(x => `<tr>
          <td><b>${highlight(x.device, tokens)}</b></td>
          <td class="small">${esc(x.bs.join(', '))}</td>
          <td class="small">${esc(x.op)}</td>
          <td><span class="mono">${esc(x.parentValue)}</span> ${esc(x.parent)}</td>
        </tr>`).join('')}</tbody>
      </table>
      ${!hits.length ? empty(q) : ''}`;
    return;
  }

  const loader = { bp: bodyPartKey, dev: deviceKey, sub: substanceKey, nt: newTechKey }[tab] || bodyPartKey;
  const rows = flattenKey(await loader());
  const hits = rows.filter(x => !tokens.length || tokens.every(t => x.lower.includes(t)))
    .slice(0, 500);

  host.innerHTML = `<div class="results-head">
      <h2 class="section-title">${hits.length}${hits.length === 500 ? '+' : ''} of ${rows.length} values</h2>
      <span class="muted small">The PCS value, and the words that mean it</span>
    </div>
    <table class="keytable">
      <thead><tr><th>PCS value</th><th>Also written as</th></tr></thead>
      <tbody>${hits.map(x => `<tr>
        <td><b>${highlight(x.value, tokens)}</b>
          ${x.def ? `<div class="small muted">${esc(x.def)}</div>` : ''}</td>
        <td>${x.includes.length
          ? highlight(x.includes.join('; '), tokens)
          : '<span class="muted small">no synonyms listed</span>'}</td>
      </tr>`).join('')}</tbody>
    </table>
    ${!hits.length ? empty(q) : ''}`;
}

function empty(q) {
  return `<div class="empty"><strong>Nothing in this key matched "${esc(q)}".</strong>
    <p>Try one of the other keys above, or the
    <a href="#/pcsindex?q=${encodeURIComponent(q)}">alphabetic index</a>, which also carries
    eponyms and procedure names.</p></div>`;
}
