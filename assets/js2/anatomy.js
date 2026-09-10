// The diagrams.
//
// Several PCS decisions are spatial, and a coder without a clinical background
// is being asked to make them from words alone. Which layer is deepest? Where
// does "High" sit on a femur? Which end of a bypass is the body part? A
// sentence can state the rule; a picture is what makes it stick.
//
// LAYOUT RULES. Every figure obeys the same four, because the failure mode of a
// hand-drawn SVG is a label sitting on top of the drawing or falling off the
// edge:
//
//   1. Nothing is drawn outside the viewBox. Text is placed from the helpers
//      below, which keep it inside the frame.
//   2. Labels never sit on the artwork. They live in a left or right gutter and
//      reach the thing they name with a leader line ending in a dot.
//   3. Callout boxes size themselves to the number of lines they hold, so text
//      can never overflow its box.
//   4. Long prose lives in the HTML caption, not in the SVG. A figure carries
//      names and values only.
//
// THEMING. Colours come from the stylesheet's custom properties, so a figure is
// legible in both light and dark, and colour never carries meaning alone -
// every coloured element is also labelled.

import { esc } from '../js/ui.js';

/* ---------------------------------------------------------------- toolkit */

function t(cls, x, y, s, anchor) {
  return `<text class="${cls}" x="${x}" y="${y}"${anchor ? ` text-anchor="${anchor}"` : ''}>${esc(s)}</text>`;
}

/** Several lines of text sharing an anchor. */
function stack(cls, x, y, arr, anchor, lh = 16) {
  return arr.map((s, i) => t(cls, x, y + i * lh, s, anchor)).join('');
}

function dot(x, y) {
  return `<circle cx="${x}" cy="${y}" r="3" fill="var(--fig-ink)"/>`;
}

/** A leader line from a label to the thing it names. */
function lead(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--fig-ink)"
    stroke-width="1" opacity=".55"/>${dot(x2, y2)}`;
}

/** Label in the left gutter, right-aligned to x, pointing at (ax, ay). */
function labelL(x, y, arr, ax, ay, cls = 'fig-label') {
  return lead(x + 9, y - 4, ax, ay) + stack(cls, x, y, arr, 'end');
}

/** Label in the right gutter, left-aligned from x, pointing at (ax, ay). */
function labelR(x, y, arr, ax, ay, cls = 'fig-label') {
  return lead(x - 9, y - 4, ax, ay) + stack(cls, x, y, arr, 'start');
}

/** Plain label with no leader - for things that sit right beside their name. */
function plain(x, y, arr, anchor, cls = 'fig-label') {
  return stack(cls, x, y, arr, anchor);
}

function calloutH(body, head) { return (head ? 44 : 22) + body.length * 16; }

/** A box that grows to fit its lines, so text can never spill out of it. */
function callout(x, y, w, head, body) {
  const h = calloutH(body, head);
  let s = `<g class="fig-callout"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/></g>`;
  let cy = y + 24;
  if (head) { s += t('fig-h', x + 13, cy, head); cy += 22; }
  return s + stack('fig-sub', x + 13, cy, body);
}

/** A code chip: the seven characters, then what they say. */
function codeChip(x, y, w, code, lines) {
  const h = 32 + lines.length * 15;
  return `<g class="fig-callout"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/></g>`
    + t('fig-code', x + 12, y + 20, code)
    + stack('fig-tiny', x + 12, y + 38, lines, 'start', 15);
}

/** Centred italic notes across the bottom of a figure. */
function foot(w, y, arr) { return stack('fig-note', w / 2, y, arr, 'middle', 17); }

function defs(k) {
  return `<defs>
    <marker id="a-${k}" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 z" fill="var(--fig-ink)"/></marker>
    <marker id="g-${k}" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 z" fill="var(--fig-graft)"/></marker>
    <marker id="r-${k}" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 z" fill="var(--fig-cut-s)"/></marker>
  </defs>`;
}

function svg(w, h, alt, body) {
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}">${body}</svg>`;
}

/** A titled tile: the frame every "tell these apart" strip is built from. */
function tile(x, y, w, h, head, char) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="var(--fig-l1)"
      stroke="var(--fig-line)" stroke-width="1"/>`
    + t('fig-h', x + 12, y + 24, head)
    + (char ? `<g><rect x="${x + w - 34}" y="${y + 10}" width="24" height="20" rx="4"
        fill="var(--fig-l3)" stroke="var(--fig-line)" stroke-width="1"/>`
        + t('fig-code', x + w - 22, y + 25, char, 'middle') + '</g>' : '');
}

/* ------------------------------------------------------------ the figures */

export const DIAGRAMS = {

  /* ---------------------------------------------- how deep did it go (B3.5) */
  'body-layers': {
    title: 'How deep did it go?',
    blurb: `A procedure on overlapping layers is coded to the <b>deepest</b> layer worked on.
      In PCS each layer is a different body system, so the depth changes the 2nd character as
      well as the 4th.`,
    rule: 'B3.5',
    svg: (() => {
      const W = 760;
      const band = ['Skin', 'Subcutaneous tissue and fascia', 'Muscle', 'Tendon',
        'Bursa and ligament', 'Bone', 'Joint'];
      const sys = ['body system H', 'body system J', 'body system K', 'body system L',
        'body system M', 'body systems N–Q', 'body systems R and S'];
      const fill = ['--fig-l1', '--fig-l2', '--fig-l3', '--fig-l4', '--fig-l5', '--fig-l6', '--fig-l6'];
      const top = i => 40 + i * 40, mid = i => 57 + i * 40, base = i => 62 + i * 40;
      return svg(W, 384,
        'Cross-section of the body wall as seven stacked bands, from skin at the top down to joint at the bottom, each labelled with the ICD-10-PCS body system that carries it. An arrow down the left side says deeper.',
        defs('bl')
        + band.map((_, i) => `<rect x="270" y="${top(i)}" width="290" height="34" rx="4"
            fill="var(${fill[i]})" stroke="var(--fig-line)" stroke-width="1"/>`).join('')
        + band.map((s, i) => labelL(250, base(i), [s], 270, mid(i))).join('')
        + sys.map((s, i) => labelR(580, base(i), [s], 560, mid(i), 'fig-sub')).join('')
        + `<line x1="40" y1="42" x2="40" y2="318" stroke="var(--fig-ink)" stroke-width="1.5"
             marker-end="url(#a-bl)"/>`
        + `<text class="fig-axis" x="26" y="180" text-anchor="middle"
             transform="rotate(-90 26 180)">deeper</text>`
        + foot(W, 350, [
          'An excisional debridement that stops in subcutaneous tissue is a 0J code; one that reaches muscle is a 0K code.',
          'The depth you code has to be the depth the operative note documents.',
        ]));
    })(),
    caption: `This is among the most heavily audited fields in an inpatient chart. Read the
      operative note for the deepest tissue the surgeon says was removed, not for the word
      "debridement" on its own.`,
  },

  /* ------------------------------------------ excision vs resection (B3.8) */
  'excision-resection': {
    title: 'All of it, or part of it?',
    blurb: `<b>Resection</b> is coded whenever all of a PCS body-part value is cut out — even when
      that value is only a part of the organ.`,
    rule: 'B3.8',
    svg: (() => {
      const W = 760;
      const lung = cx => `<path d="M${cx - 70} 96 C ${cx - 78} 64, ${cx - 20} 50, ${cx + 10} 60
          C ${cx + 52} 72, ${cx + 66} 126, ${cx + 58} 180 C ${cx + 50} 228, ${cx + 6} 246, ${cx - 30} 238
          C ${cx - 64} 230, ${cx - 76} 152, ${cx - 70} 96 Z"
          fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.6"/>
        <path d="M${cx - 73} 146 C ${cx - 30} 136, ${cx + 20} 132, ${cx + 62} 138"
          fill="none" stroke="var(--fig-ink)" stroke-width="1.2" stroke-dasharray="5 4"/>`;
      const A = 200, B = 545;
      return svg(W, 382,
        'Two drawings of the left lung, each divided by its fissure into an upper and a lower lobe. On the left a small wedge has been taken from the upper lobe and the code is Excision of Lung, Left. On the right the whole upper lobe has been taken and the code is Resection of Left Upper Lung Lobe.',
        t('fig-h', A, 32, 'Part of a value taken', 'middle')
        + t('fig-h', B, 32, 'All of a value taken', 'middle')
        + `<line x1="372" y1="44" x2="372" y2="268" stroke="var(--fig-line)" stroke-width="1"/>`
        + lung(A)
        + `<path d="M${A + 30} 74 C ${A + 56} 88, ${A + 58} 112, ${A + 44} 124
             C ${A + 20} 112, ${A + 16} 88, ${A + 30} 74 Z"
             fill="var(--fig-cut)" stroke="var(--fig-cut-s)" stroke-width="1.6" stroke-dasharray="5 3"/>`
        + plain(A - 26, 108, ['Upper lobe'], 'middle', 'fig-sub')
        + plain(A - 16, 200, ['Lower lobe'], 'middle', 'fig-sub')
        + lung(B)
        + `<path d="M${B - 70} 96 C ${B - 78} 64, ${B - 20} 50, ${B + 10} 60
             C ${B + 52} 72, ${B + 62} 108, ${B + 62} 138 C ${B + 20} 132, ${B - 30} 136, ${B - 73} 146
             C ${B - 74} 128, ${B - 72} 110, ${B - 70} 96 Z"
             fill="var(--fig-cut)" stroke="var(--fig-cut-s)" stroke-width="1.8" stroke-dasharray="5 3"/>`
        + plain(B - 26, 108, ['Upper lobe'], 'middle', 'fig-sub')
        + plain(B - 16, 200, ['Lower lobe'], 'middle', 'fig-sub')
        + codeChip(78, 274, 244, '0BBL0ZZ',
          ['Excision of Lung, Left', 'the 4th character is the whole lung,', 'and only part of it went'])
        + codeChip(423, 274, 244, '0BTG0ZZ',
          ['Resection of Left Upper Lung Lobe', 'the 4th character is the lobe,', 'and all of it went'])
        + foot(W, 368, ['Shaded red marks the tissue that was removed.']));
    })(),
    caption: `Both operations leave most of the lung behind. The right-hand one is
      <b>Resection</b> because <i>Upper Lung Lobe, Left</i> is a body-part value in its own right
      and all of it is gone. The question is never "how much of the organ?" — it is
      <b>"which values does the table offer, and did all of one of them come out?"</b>`,
  },

  /* --------------------------------------- taking out a body part (group 1) */
  takeout: {
    title: 'Five ways to take a body part out',
    blurb: `All five remove some or all of a body part. They are separated by <b>how much</b> came
      out and <b>by what means</b>.`,
    rule: 'B3.8',
    svg: (() => {
      const W = 764, TW = 144, y = 40, TH = 118;
      const items = [
        ['Excision', 'B', 'some of it, cut out'],
        ['Resection', 'T', 'all of a value, cut out'],
        ['Detachment', '6', 'all of an extremity'],
        ['Destruction', '5', 'destroyed in place'],
        ['Extraction', 'D', 'pulled out by force'],
      ];
      const art = (i, x) => {
        const cx = x + TW / 2;
        const blob = f => `<rect x="${cx - 34}" y="${y + 40}" width="68" height="52" rx="14"
          fill="${f}" stroke="var(--fig-ink)" stroke-width="1.5"/>`;
        if (i === 0) return blob('var(--fig-l2)')
          + `<path d="M${cx + 4} ${y + 40} l16 22 l-16 22 z" fill="var(--fig-cut)"
              stroke="var(--fig-cut-s)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
        if (i === 1) return `<rect x="${cx - 34}" y="${y + 40}" width="68" height="52" rx="14"
          fill="var(--fig-cut)" stroke="var(--fig-cut-s)" stroke-width="1.6" stroke-dasharray="5 4"/>`;
        if (i === 2) return `<rect x="${cx - 40}" y="${y + 50}" width="42" height="32" rx="10"
            fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.5"/>
          <rect x="${cx + 12}" y="${y + 50}" width="34" height="32" rx="10"
            fill="var(--fig-cut)" stroke="var(--fig-cut-s)" stroke-width="1.4" stroke-dasharray="4 3"/>
          <line x1="${cx + 6}" y1="${y + 38}" x2="${cx + 6}" y2="${y + 94}"
            stroke="var(--fig-cut-s)" stroke-width="2.4"/>`;
        if (i === 3) return blob('var(--fig-l2)')
          + `<g stroke="var(--fig-cut-s)" stroke-width="1.6">
              <line x1="${cx - 26}" y1="${y + 50}" x2="${cx + 26}" y2="${y + 82}"/>
              <line x1="${cx + 26}" y1="${y + 50}" x2="${cx - 26}" y2="${y + 82}"/>
              <line x1="${cx - 26}" y1="${y + 66}" x2="${cx + 26}" y2="${y + 66}"/>
            </g>`;
        return blob('var(--fig-l2)')
          + `<path d="M${cx} ${y + 66} L${cx + 50} ${y + 66}" stroke="var(--fig-cut-s)"
              stroke-width="2.4" marker-end="url(#r-to)"/>`;
      };
      return svg(W, 236,
        'Five tiles, one for each root operation that takes a body part out: Excision cuts part of it away, Resection takes all of one value, Detachment cuts across an extremity, Destruction eradicates it in place with nothing removed, Extraction pulls it out by force.',
        defs('to')
        + items.map((it, i) => {
          const x = 14 + i * (TW + 6);
          return tile(x, y, TW, TH, it[0], it[1]) + art(i, x)
            + stack('fig-tiny', x + TW / 2, y + TH + 22, [it[2]], 'middle');
        }).join('')
        + foot(W, 202, [
          'Destruction removes nothing — the tissue is eradicated where it lies: cautery, cryotherapy, laser, chemical, radiofrequency ablation.',
          'Extraction takes the body part out by pulling or scraping, not by cutting it free: dilation and curettage, vein stripping, a suction extraction.',
        ]));
    })(),
    caption: `The two most often mixed up are <b>Excision</b> and <b>Resection</b> — the figure
      above — and <b>Destruction</b> against <b>Excision</b>: if nothing went to pathology because
      nothing came out, it is Destruction.`,
  },

  /* ---------------------------------- taking out solids, fluids and gases */
  takeoutstuff: {
    title: 'Taking out what is inside the body part',
    blurb: `Nothing here removes the body part. What comes out is its <b>contents</b>.`,
    rule: 'B3.11a',
    svg: (() => {
      const W = 720, TW = 224, y = 40, TH = 128;
      const items = [
        ['Drainage', '9', 'fluids or gases taken out'],
        ['Extirpation', 'C', 'solid matter taken out'],
        ['Fragmentation', 'F', 'solid matter broken up, left in'],
      ];
      const art = (i, x) => {
        const cx = x + TW / 2, ty = y + 52;
        const tube = `<path d="M${cx - 76} ${ty} h152 M${cx - 76} ${ty + 40} h152"
          stroke="var(--fig-vessel)" stroke-width="4" fill="none"/>`;
        if (i === 0) return tube
          + `<path d="M${cx} ${ty + 40} v30" stroke="var(--fig-fluid)" stroke-width="7"/>`
          + `<circle cx="${cx}" cy="${ty + 76}" r="5" fill="var(--fig-fluid)"/>`
          + `<circle cx="${cx - 14}" cy="${ty + 68}" r="3.5" fill="var(--fig-fluid)"/>`;
        if (i === 1) return tube
          + `<circle cx="${cx - 18}" cy="${ty + 20}" r="13" fill="var(--fig-l5)" stroke="var(--fig-ink)" stroke-width="1.4"/>`
          + `<path d="M${cx - 2} ${ty + 20} h56" stroke="var(--fig-cut-s)" stroke-width="2.4" marker-end="url(#r-ts)"/>`;
        return tube
          + [[-30, 12], [-12, 26], [4, 14], [22, 26], [38, 16]].map(([dx, dy]) =>
            `<circle cx="${cx + dx}" cy="${ty + dy}" r="5" fill="var(--fig-l5)"
              stroke="var(--fig-ink)" stroke-width="1"/>`).join('')
          + `<path d="M${cx - 46} ${ty + 20} h14" stroke="var(--fig-cut-s)" stroke-width="2.4"/>`;
      };
      return svg(W, 250,
        'Three tiles on a length of tube. Drainage takes fluid out through a channel. Extirpation removes a solid piece of matter from inside the tube. Fragmentation breaks the solid matter into pieces and leaves them where they are.',
        defs('ts')
        + items.map((it, i) => {
          const x = 14 + i * (TW + 8);
          return tile(x, y, TW, TH, it[0], it[1]) + art(i, x)
            + stack('fig-tiny', x + TW / 2, y + TH + 22, [it[2]], 'middle');
        }).join('')
        + foot(W, 216, [
          'A biopsy of fluid is Drainage with qualifier X, Diagnostic. A biopsy of tissue is Excision with qualifier X.',
          'Lithotripsy that leaves the fragments to pass is Fragmentation; a stone lifted out whole with a basket is Extirpation.',
        ]));
    })(),
    caption: `The body part is the place the matter was, not the matter itself. A clot pulled out
      of the middle cerebral artery is an Extirpation of <i>Intracranial Artery</i>.`,
  },

  /* ---------------------------------------------- release and division */
  'release-division': {
    title: 'Cutting to free, or cutting to separate',
    blurb: `Both cut, and both take nothing out. The difference is <b>what the knife touched</b>.`,
    rule: 'B3.13',
    svg: (() => {
      const W = 720, TW = 330, y = 42, TH = 150;
      const art = (i, x) => {
        const cx = x + TW / 2, cy = y + 92;
        if (i === 0) return `<rect x="${cx - 62}" y="${cy - 30}" width="124" height="60" rx="16"
            fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.6"/>
          <path d="M${cx - 74} ${cy - 44} q74 -16 148 0" fill="none" stroke="var(--fig-lig)" stroke-width="6"/>
          <path d="M${cx - 74} ${cy + 44} q74 16 148 0" fill="none" stroke="var(--fig-lig)" stroke-width="6"/>
          <line x1="${cx}" y1="${cy - 56}" x2="${cx}" y2="${cy - 36}" stroke="var(--fig-cut-s)" stroke-width="2.6"/>
          <line x1="${cx}" y1="${cy + 36}" x2="${cx}" y2="${cy + 56}" stroke="var(--fig-cut-s)" stroke-width="2.6"/>`;
        return `<rect x="${cx - 62}" y="${cy - 30}" width="56" height="60" rx="16"
            fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.6"/>
          <rect x="${cx + 6}" y="${cy - 30}" width="56" height="60" rx="16"
            fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.6"/>
          <line x1="${cx}" y1="${cy - 46}" x2="${cx}" y2="${cy + 46}" stroke="var(--fig-cut-s)" stroke-width="2.8"/>`;
      };
      return svg(W, 300,
        'Two tiles. Release: an organ held by bands of tissue, with the bands cut and the organ itself untouched. Division: the body part itself cut into two pieces.',
        defs('rd')
        + tile(14, y, TW, TH, 'Release', 'N') + art(0, 14)
        + labelR(300, y + 40, ['the band that', 'was cut'], 236, y + 48, 'fig-tiny')
        + tile(376, y, TW, TH, 'Division', '8') + art(1, 376)
        + stack('fig-tiny', 14 + TW / 2, y + TH + 24,
          ['the body part is the one being FREED —', 'not the adhesion or band that was cut'], 'middle', 15)
        + stack('fig-tiny', 376 + TW / 2, y + TH + 24,
          ['the body part is the one being CUT —', 'it is separated into pieces'], 'middle', 15)
        + foot(W, 266, [
          'Lysis of adhesions is a Release of whichever body part was freed. Nothing is coded for the adhesions themselves.',
          'Carpal tunnel release is not a Division of the ligament — it is a Release of the median nerve. The nerve is what was freed.',
        ]));
    })(),
    caption: `The trap is that Release <i>looks</i> as though it should be coded to the thing that
      was cut. It is not. Ask what was set free, and code that.`,
  },

  /* --------------------------------------- putting a body part back / moving */
  putback: {
    title: 'Putting a body part in, back, or somewhere else',
    blurb: `Four operations that move living tissue. What separates them is <b>where the tissue
      came from</b> and <b>what job it now does</b>.`,
    rule: 'B3.17',
    svg: (() => {
      const W = 764, TW = 180, y = 42, TH = 122;
      const items = [
        ['Transplantation', 'Y', ['tissue from another', 'person or an animal,', 'taking over the job']],
        ['Reattachment', 'M', ['a severed part put', 'back where it was']],
        ['Transfer', 'X', ['moved to do another', 'part’s job, still', 'attached to its supply']],
        ['Reposition', 'S', ['moved to where it', 'is supposed to be']],
      ];
      const art = (i, x) => {
        const cx = x + TW / 2, cy = y + 74;
        const b = (dx, f) => `<rect x="${cx + dx - 22}" y="${cy - 18}" width="44" height="36" rx="9"
          fill="${f}" stroke="var(--fig-ink)" stroke-width="1.5"/>`;
        const arrow = (x1, x2) => `<path d="M${cx + x1} ${cy} H${cx + x2}" stroke="var(--fig-graft)"
          stroke-width="3" marker-end="url(#g-pb)"/>`;
        if (i === 0) return b(-44, 'var(--fig-donor)') + arrow(-18, 18) + b(44, 'var(--fig-l2)');
        if (i === 1) return b(-44, 'var(--fig-l2)') + arrow(-18, 18) + b(44, 'var(--fig-l2)')
          + `<line x1="${cx + 22}" y1="${cy - 26}" x2="${cx + 22}" y2="${cy + 26}"
              stroke="var(--fig-cut-s)" stroke-width="2" stroke-dasharray="4 3"/>`;
        if (i === 2) return b(-44, 'var(--fig-l2)') + b(44, 'var(--fig-l3)')
          + `<path d="M${cx - 22} ${cy - 26} q44 -22 66 22" fill="none" stroke="var(--fig-graft)"
              stroke-width="3" marker-end="url(#g-pb)"/>`;
        return `<rect x="${cx - 66}" y="${cy - 18}" width="44" height="36" rx="9" fill="none"
              stroke="var(--fig-cut-s)" stroke-width="1.4" stroke-dasharray="4 3"/>`
          + arrow(-18, 18) + b(44, 'var(--fig-l2)');
      };
      return svg(W, 268,
        'Four tiles. Transplantation puts tissue from another person or animal in to take over the function. Reattachment puts a severed part back at its own site. Transfer moves tissue to do the job of another part while it keeps its own blood supply. Reposition moves a body part to its normal location.',
        defs('pb')
        + items.map((it, i) => {
          const x = 14 + i * (TW + 6);
          return tile(x, y, TW, TH, it[0], it[1]) + art(i, x)
            + stack('fig-tiny', x + TW / 2, y + TH + 20, it[2], 'middle', 14);
        }).join('')
        + foot(W, 240, [
          'Reposition covers reducing a fracture, and bringing an undescended testis down into the scrotum.',
          'A skin, muscle or fascia flap that keeps its own blood supply is a Transfer — never a Transplantation.',
        ]));
    })(),
    caption: `Putting a <i>non-living</i> material in is a different group entirely — see
      <b>Insertion, Supplement and Replacement</b>.`,
  },

  /* ---------------------------------------------------- tubular body parts */
  tubular: {
    title: 'What happened to the lumen?',
    blurb: `Four operations on a tube, separated by the state of the channel when the surgeon
      finished.`,
    rule: 'B3.12',
    svg: (() => {
      const W = 720, TW = 168, y = 40, TH = 120;
      const items = [
        ['Dilation', '7', 'wider'],
        ['Restriction', 'V', 'narrower, still open'],
        ['Occlusion', 'L', 'closed completely'],
        ['Bypass', '1', 'left alone, routed around'],
      ];
      const art = (i, x) => {
        const cx = x + TW / 2, ty = y + 56, by = ty + 36;
        if (i === 0) return `<path d="M${cx - 62} ${ty} h30 q16 -12 32 0 h30
            M${cx - 62} ${by} h30 q16 12 32 0 h30" fill="none" stroke="var(--fig-vessel)" stroke-width="4"/>`;
        if (i === 1) return `<path d="M${cx - 62} ${ty} h26 q18 15 36 0 h26
            M${cx - 62} ${by} h26 q18 -15 36 0 h26" fill="none" stroke="var(--fig-vessel)" stroke-width="4"/>`;
        if (i === 2) return `<path d="M${cx - 62} ${ty} h34 M${cx + 28} ${ty} h34
            M${cx - 62} ${by} h34 M${cx + 28} ${by} h34" fill="none" stroke="var(--fig-vessel)" stroke-width="4"/>
          <rect x="${cx - 28}" y="${ty - 3}" width="56" height="42" rx="5"
            fill="var(--fig-cut)" stroke="var(--fig-cut-s)" stroke-width="1.5"/>`;
        return `<path d="M${cx - 62} ${ty + 14} h124 M${cx - 62} ${by + 14} h124"
            fill="none" stroke="var(--fig-vessel)" stroke-width="4"/>
          <rect x="${cx - 18}" y="${ty + 11}" width="36" height="42" rx="4"
            fill="var(--fig-cut)" stroke="var(--fig-cut-s)" stroke-width="1.4"/>
          <path d="M${cx - 46} ${ty + 14} q46 -54 92 0" fill="none" stroke="var(--fig-graft)" stroke-width="4"/>`;
      };
      return svg(W, 246,
        'Four tiles on a tube. Dilation widens the lumen. Restriction narrows it but leaves it open. Occlusion closes it completely. Bypass leaves the blockage alone and routes the contents around it through a new channel.',
        defs('tb')
        + items.map((it, i) => {
          const x = 12 + i * (TW + 8);
          return tile(x, y, TW, TH, it[0], it[1]) + art(i, x)
            + stack('fig-tiny', x + TW / 2, y + TH + 22, [it[2]], 'middle');
        }).join('')
        + foot(W, 212, [
          'Embolisation is Occlusion when the aim is to close the vessel, Restriction when the aim is only to narrow it.',
          'Tumour embolisation: Occlusion. Coiling a cerebral aneurysm: Restriction. Read the aim, not the equipment.',
        ]));
    })(),
    caption: `Green = the new route. Red = what is blocking, or what was put in to block. In a
      Bypass the diseased segment is left exactly where it is.`,
  },

  /* -------------------------------------------------------- bypass direction */
  bypass: {
    title: 'Which end of a bypass is the body part?',
    blurb: `For every bypass except the coronary arteries the 4th character is where the contents
      come <b>from</b>. The coronary arteries reverse it.`,
    rule: 'B3.6a',
    svg: (() => {
      const W = 760;
      const box = (x, y, w, label) => `<rect x="${x}" y="${y}" width="${w}" height="46" rx="9"
          fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.5"/>`
        + t('fig-label', x + w / 2, y + 28, label, 'middle');
      return svg(W, 372,
        'Two bands. The upper band shows a gastric bypass running from the stomach to the jejunum: the fourth character is the stomach, bypassed from, and the seventh is the jejunum, bypassed to. The lower band shows a coronary bypass running from the aorta to two coronary arteries: here the fourth character counts the arteries bypassed to and the seventh names the aorta, bypassed from.',
        defs('by')
        + t('fig-h', 20, 30, 'Every bypass except the coronary arteries')
        + box(120, 56, 130, 'Stomach')
        + box(500, 56, 130, 'Jejunum')
        + `<path d="M256 79 H494" stroke="var(--fig-graft)" stroke-width="5" marker-end="url(#g-by)"/>`
        + t('fig-tiny', 375, 70, 'the new route', 'middle')
        + stack('fig-h', 185, 126, ['4th character'], 'middle')
        + stack('fig-sub', 185, 144, ['bypassed FROM'], 'middle')
        + stack('fig-h', 565, 126, ['7th character'], 'middle')
        + stack('fig-sub', 565, 144, ['bypassed TO'], 'middle')
        + `<line x1="20" y1="176" x2="740" y2="176" stroke="var(--fig-line)" stroke-width="1"/>`
        + t('fig-h', 20, 206, 'Coronary arteries — reversed')
        + box(120, 232, 130, 'Aorta')
        + `<g stroke="var(--fig-vessel)" stroke-width="5" stroke-linecap="round">
             <path d="M500 240 h96"/><path d="M500 268 h96"/></g>`
        + t('fig-label', 548, 296, 'two coronary arteries', 'middle')
        + `<path d="M256 248 H494" stroke="var(--fig-graft)" stroke-width="5" marker-end="url(#g-by)"/>
           <path d="M256 268 H494" stroke="var(--fig-graft)" stroke-width="5" marker-end="url(#g-by)"/>`
        + stack('fig-h', 185, 302, ['7th character'], 'middle')
        + stack('fig-sub', 185, 320, ['bypassed FROM'], 'middle')
        + stack('fig-h', 660, 240, ['4th character'], 'middle')
        + stack('fig-sub', 660, 258, ['HOW MANY', 'bypassed TO'], 'middle')
        + foot(W, 350, [
          'Count the coronary arteries bypassed to — not the grafts, and not the anastomoses.',
        ]));
    })(),
    caption: `Then split into more than one code whenever the <b>device</b> or the
      <b>qualifier</b> differs between grafts — a vein graft from the aorta and a mammary graft
      are two codes, because one is from the aorta and the other from the internal mammary.`,
  },

  /* --------------------------------------------- the coronary vessel map */
  coronary: {
    title: 'The coronary arteries, and how PCS counts them',
    blurb: `The operative note names the vessels. PCS does not have values for them — it has
      values for <b>how many</b> were treated.`,
    rule: 'B4.4',
    svg: (() => {
      const W = 760;
      return svg(W, 434,
        'A schematic front view of the heart, so the patient\u2019s right side is on the left of the picture. The aorta and the pulmonary trunk leave the top. The right coronary artery runs down the left of the picture and continues round the bottom as the posterior descending branch. The left main coronary artery divides into the left anterior descending artery, which runs down the front to the apex, and the circumflex artery, which curves round the right of the picture and gives off an obtuse marginal branch. Below the drawing, the four fourth-character values: one artery, two arteries, three arteries, four or more arteries.',
        defs('co') + heartArt()
        + labelL(184, 44, ['Pulmonary trunk'], 314, 32)
        + labelL(184, 182, ['Right coronary', 'artery (RCA)'], 244, 186)
        + labelL(184, 290, ['Posterior descending', 'branch'], 290, 284)
        + labelR(498, 34, ['Aorta'], 408, 26)
        + labelR(498, 100, ['Left main coronary artery'], 356, 124)
        + labelR(498, 210, ['Circumflex artery'], 432, 218)
        + labelR(498, 262, ['Obtuse marginal branch'], 446, 272)
        + labelR(498, 306, ['Left anterior', 'descending (LAD)'], 394, 296)
        + [['0', 'One Artery'], ['1', 'Two Arteries'], ['2', 'Three Arteries'],
        ['3', 'Four or More Arteries']]
          .map(([c, n], i) => codeChip(20 + i * 186, 352, 172, c, [n])).join('')
        + foot(W, 416, ['The 4th character in every coronary table: 021, 025, 027, 02B, 02C.']));
    })(),
    caption: `One code covers several arteries only when the <b>device and qualifier are the same
      for all of them</b>. Two arteries treated in one session, one stented and one not, is two
      codes — <i>One Artery</i> with the stent and <i>One Artery</i> without.`,
  },

  /* ------------------------------------------------- coronary artery bypass */
  cabg: {
    title: 'A coronary artery bypass, coded',
    blurb: `The commonest operation an auditor has to check, and the one where the PCS rules bite
      hardest. Three grafts here, and they do not make three codes — they make two, plus the
      harvest.`,
    rule: 'B3.6b',
    svg: (() => {
      const W = 760;
      const anast = (x, y) => `<circle cx="${x}" cy="${y}" r="4.5" fill="var(--fig-graft)"/>`;
      return svg(W, 474,
        'The same heart, now with three grafts drawn in green. The left internal mammary artery runs down from the top right of the picture and is sewn onto the left anterior descending artery. Two saphenous vein grafts leave the ascending aorta, one crossing to the right coronary artery and one running down to an obtuse marginal branch. Below, the three codes this produces.',
        defs('cb') + heartArt()
        + `<g fill="none" stroke="var(--fig-graft)" stroke-width="5" stroke-linecap="round">
             <path d="M482 34 C 500 108, 442 180, 388 224"/>
             <path d="M396 54 C 314 72, 250 142, 246 214"/>
             <path d="M408 52 C 456 96, 460 196, 438 262"/>
           </g>`
        + anast(388, 224) + anast(246, 214) + anast(438, 262)
        + labelL(184, 142, ['vein graft from the aorta', 'to the right coronary artery'], 280, 142, 'fig-tiny')
        + labelL(184, 256, ['Right coronary artery'], 268, 274, 'fig-tiny')
        + labelR(498, 34, ['Ascending aorta', 'is where the vein grafts start'], 402, 26, 'fig-tiny')
        + labelR(498, 102, ['Left internal mammary artery', '(LIMA), left attached to its', 'own origin, sewn to the LAD'], 490, 74, 'fig-tiny')
        + labelR(498, 204, ['vein graft from the aorta', 'to an obtuse marginal branch'], 458, 180, 'fig-tiny')
        + labelR(498, 300, ['Left anterior descending', '(LAD)'], 396, 306, 'fig-tiny')
        + codeChip(18, 352, 230, '02100Z9',
          ['One Artery bypassed to, from', 'Left Internal Mammary, Open.', 'No device: the LIMA is the', 'patient’s own, still attached.'])
        + codeChip(265, 352, 230, '021109W',
          ['Two Arteries bypassed to, from', 'Aorta, with Autologous Venous', 'Tissue, Open. One code covers', 'both vein grafts.'])
        + codeChip(512, 352, 230, '06BQ4ZZ',
          ['Excision of Left Saphenous Vein,', 'Percutaneous Endoscopic.', 'The harvest is a second site,', 'so it is coded on its own.'])
        + foot(W, 458, [
          'Group the grafts by device and qualifier, then count the arteries in each group. Different device or qualifier — a separate code.',
        ]));
    })(),
    caption: `Why two codes and not three: the two vein grafts share a device (<i>Autologous
      Venous Tissue</i>) and a qualifier (<i>Aorta</i>), so they are counted together as
      <b>Two Arteries</b>. The mammary graft has a different qualifier (<i>Internal Mammary,
      Left</i>) and no device, so it is counted on its own as <b>One Artery</b>. The vein
      harvest is a separate body part at a separate site, so guideline B3.9 makes it a third
      code.`,
  },

  /* -------------------------------------------------------------- detachment */
  detachment: {
    title: 'Where along the limb was it cut?',
    blurb: `The <b>body part</b> is the region the cut passed through. The <b>qualifier</b> says
      how far along that region’s bone shaft the cut was made.`,
    rule: 'B3.19',
    svg: (() => {
      const W = 760;
      const rows = [
        [58, 'Hindquarter, or Femoral Region', 'qualifier Z — no shaft to divide'],
        [96, 'Upper Leg · High', 'upper third of the femur shaft'],
        [140, 'Upper Leg · Mid', 'middle third of the femur shaft'],
        [184, 'Upper Leg · Low', 'lower third of the femur shaft'],
        [222, 'Lower Leg · High', 'upper third of the tibia and fibula'],
        [262, 'Lower Leg · Mid', 'middle third'],
        [300, 'Lower Leg · Low', 'lower third'],
        [336, 'Foot', 'Complete, Partial, or a numbered ray'],
      ];
      return svg(W, 404,
        'A schematic right lower limb seen from the front, with dashed cut lines across it. Each cut line is named on the left with the ICD-10-PCS body part and qualifier, and explained on the right: high, mid and low describe thirds of the named bone shaft, the hip and knee regions take no qualifier, and the foot takes complete, partial or a ray.',
        defs('dt')
        + `<g stroke="var(--fig-ink)" stroke-width="1.6" fill="var(--fig-l2)">
             <rect x="292" y="34" width="96" height="40" rx="12"/>
             <rect x="308" y="80" width="66" height="112" rx="20"/>
             <circle cx="341" cy="200" r="16"/>
             <rect x="312" y="210" width="58" height="98" rx="18"/>
             <path d="M304 312 h72 q34 0 34 16 t-34 16 h-72 z"/>
           </g>`
        + `<g stroke="var(--fig-cut-s)" stroke-width="2.2" stroke-dasharray="7 5">`
        + rows.map(r => `<line x1="266" y1="${r[0]}" x2="424" y2="${r[0]}"/>`).join('')
        + `</g>`
        + rows.map(r => labelL(256, r[0] + 5, [r[1]], 266, r[0])).join('')
        + rows.map(r => labelR(442, r[0] + 5, [r[2]], 424, r[0], 'fig-sub')).join('')
        + foot(W, 370, [
          'High, Mid and Low are thirds of the named bone shaft — not thirds of the whole limb.',
          'The thumb and the great toe have no Mid value: they have no middle phalanx.',
        ]));
    })(),
    caption: `Two traps. A cut <i>through a joint</i> — hip, knee, ankle, shoulder, elbow, wrist —
      is a disarticulation: there is no shaft, so the qualifier is <b>Z</b> and the body part is
      the region named for that joint. And a cut through the hand or foot uses the <b>ray</b>
      qualifiers, which count from the thumb or great toe.`,
  },

  /* ------------------------------------------------- the two spinal columns */
  'spine-columns': {
    title: 'Anterior column, posterior column, and the way in',
    blurb: `A spinal fusion’s 7th character says <b>two</b> things at once: which column was fused,
      and from which direction the surgeon reached it.`,
    rule: 'B3.10b',
    svg: (() => {
      const W = 760;
      const vert = by => `<rect x="220" y="${by}" width="120" height="52" rx="5"
          fill="var(--fig-l3)" stroke="var(--fig-ink)" stroke-width="1.5"/>
        <rect x="340" y="${by + 14}" width="34" height="22" rx="4"
          fill="var(--fig-l4)" stroke="var(--fig-ink)" stroke-width="1.3"/>
        <rect x="374" y="${by + 4}" width="38" height="44" rx="7"
          fill="var(--fig-l4)" stroke="var(--fig-ink)" stroke-width="1.3"/>
        <path d="M412 ${by + 14} L468 ${by + 22} L412 ${by + 40} Z"
          fill="var(--fig-l4)" stroke="var(--fig-ink)" stroke-width="1.3"/>`;
      return svg(W, 412,
        'Two vertebrae seen from the side, front of the body on the left. The vertebral bodies and the disc between them are outlined as the anterior column. The facet joints, laminae and spinous processes behind them are outlined as the posterior column. Below, the three qualifier values a fusion can take.',
        defs('sc')
        + `<rect x="206" y="56" width="148" height="164" rx="10" fill="none"
             stroke="var(--fig-graft)" stroke-width="1.8" stroke-dasharray="6 4"/>
           <rect x="362" y="56" width="116" height="164" rx="10" fill="none"
             stroke="var(--fig-device)" stroke-width="1.8" stroke-dasharray="6 4"/>`
        + vert(68) + vert(150)
        + `<rect x="220" y="124" width="120" height="22" rx="4"
             fill="var(--fig-fluid)" stroke="var(--fig-ink)" stroke-width="1.3"/>`
        + `<line x1="378" y1="130" x2="408" y2="130" stroke="var(--fig-lig)" stroke-width="5"/>`
        + labelL(196, 100, ['vertebral body'], 260, 94)
        + labelL(196, 142, ['disc space'], 260, 135)
        + labelR(532, 94, ['spinous process'], 444, 92)
        + labelR(532, 136, ['facet joint'], 396, 130)
        + labelR(532, 182, ['lamina'], 392, 180)
        + t('fig-h', 268, 244, 'Anterior column', 'middle')
        + t('fig-sub', 268, 262, 'vertebral bodies + disc', 'middle')
        + t('fig-h', 440, 244, 'Posterior column', 'middle')
        + t('fig-sub', 440, 262, 'facets + posterior elements', 'middle')
        + codeChip(18, 282, 230, '0',
          ['Anterior Approach, Anterior Column', 'in from the front, cage or graft', 'into the disc space (ALIF)'])
        + codeChip(265, 282, 230, 'J',
          ['Posterior Approach, Anterior Column', 'in from the back, still working', 'in the disc space (TLIF, PLIF)'])
        + codeChip(512, 282, 230, '1',
          ['Posterior Approach, Posterior Column', 'in from the back, onto the facets', 'and lamina (posterolateral fusion)'])
        + foot(W, 380, [
          'There is no anterior-approach / posterior-column value. You cannot reach the facets from the front.',
        ]));
    })(),
    caption: `Two consequences an auditor checks for. Fusing the anterior column <i>and</i> the
      posterior column at the same level is <b>two codes</b>, because the qualifier differs. And
      if an interbody cage was used anywhere on that joint, the device is <b>Interbody Fusion
      Device</b> — it outranks the bone graft packed inside it.`,
  },

  /* -------------------------------------------------------- the approaches */
  approaches: {
    title: 'The seven approach values',
    blurb: `Three questions settle the 5th character. Was the body wall <b>cut or punctured</b>?
      Did the instrument use an <b>opening that was already there</b>? And could the surgeon
      <b>see</b> the operative site?`,
    rule: 'B5.2a',
    svg: (() => {
      const W = 760, PW = 170, PH = 92;
      const items = [
        ['0', 'Open', ['Open'], 'cut down and expose the site'],
        ['3', 'Percutaneous', ['Percutaneous'], 'a puncture; the site is not seen'],
        ['4', 'Perc. Endoscopic', ['Percutaneous Endoscopic'], 'a puncture, plus a scope'],
        ['7', 'Via Opening', ['Via Natural or Artificial', 'Opening'], 'in through an existing opening'],
        ['8', 'Via Opening, Scope', ['Via Natural or Artificial', 'Opening Endoscopic'], 'the same, plus a scope'],
        ['F', 'Via Opening + Perc.', ['Via Natural or Artificial', 'Opening With Percutaneous', 'Endoscopic Assistance'], 'an opening and a puncture'],
        ['X', 'External', ['External'], 'on the surface, or through it'],
      ];

      // The body wall is drawn with thickness, and the seven panels differ only
      // in what happens to it: cut apart and held open, punctured, already
      // interrupted by a passage, or left alone. A line has no thickness and so
      // can show none of that, which is why the first version of this figure
      // was unreadable.
      //
      // The rule that separates Open from Via Opening is drawn, not written:
      // red is only ever used for something the surgeon did. In the Open panel
      // the edges of the gap are red, because the surgeon made them. In the
      // Via Opening panels there is no red anywhere except the instrument,
      // because nothing was cut - the way in was already there.
      const L = x => x + 10, R = x => x + 160;
      const WALL_TOP = 24, WALL_H = 13;
      const GAP_A = x => x + 52, GAP_B = x => x + 118;

      const wallPiece = (x1, y, w) => `<rect x="${x1}" y="${y + WALL_TOP}" width="${w}"
        height="${WALL_H}" rx="6" fill="var(--fig-skin)"/>`;
      const wholeWall = (x, y) => wallPiece(L(x), y, R(x) - L(x));
      const splitWall = (x, y) => wallPiece(L(x), y, GAP_A(x) - L(x))
        + wallPiece(GAP_B(x), y, R(x) - GAP_B(x));

      const site = (x, y) => `<rect x="${x + 62}" y="${y + 64}" width="46" height="22" rx="5"
        fill="var(--fig-l3)" stroke="var(--fig-ink)" stroke-width="1.3"/>`;
      const tool = d => `<path d="${d}" fill="none" stroke="var(--fig-cut-s)" stroke-width="2.6"
        stroke-linecap="round"/>`;
      const scope = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="6.5" fill="none"
        stroke="var(--fig-scope)" stroke-width="2.4"/>`;

      // A passage that was already there. The surface of the body wall folds
      // inward and lines it, so it is drawn in the wall's own colour and runs
      // unbroken from the wall down to the site.
      const passage = (x, y) => `<path d="M${GAP_A(x)} ${y + 33} C ${GAP_A(x) + 4} ${y + 48},
            ${x + 60} ${y + 56}, ${x + 64} ${y + 64}" fill="none" stroke="var(--fig-skin)"
          stroke-width="6" stroke-linecap="round"/>
        <path d="M${GAP_B(x)} ${y + 33} C ${GAP_B(x) - 4} ${y + 48}, ${x + 110} ${y + 56},
            ${x + 106} ${y + 64}" fill="none" stroke="var(--fig-skin)" stroke-width="6"
          stroke-linecap="round"/>`;

      const art = (ch, x, y) => {
        const frame = `<rect x="${x}" y="${y}" width="${PW}" height="${PH}" rx="8"
          fill="var(--fig-l1)" stroke="var(--fig-line)" stroke-width="1"/>`;
        const down = tool(`M${x + 85} ${y + 8} V${y + 64}`);
        let inner = '';

        if (ch === '0') {
          // The wall is cut and the two edges are lifted apart. The cut faces
          // are red: they exist only because the surgeon made them.
          inner = splitWall(x, y) + site(x, y)
            + `<path d="M${GAP_A(x)} ${y + 37} L${GAP_A(x)} ${y + 24} L${x + 40} ${y + 10}
                 L${x + 34} ${y + 22} Z" fill="var(--fig-skin)"/>
               <path d="M${GAP_B(x)} ${y + 37} L${GAP_B(x)} ${y + 24} L${x + 130} ${y + 10}
                 L${x + 136} ${y + 22} Z" fill="var(--fig-skin)"/>`
            + tool(`M${GAP_A(x)} ${y + 37} L${GAP_A(x)} ${y + 24} L${x + 40} ${y + 10}`)
            + tool(`M${GAP_B(x)} ${y + 37} L${GAP_B(x)} ${y + 24} L${x + 130} ${y + 10}`)
            + `<path d="M${GAP_A(x)} ${y + 37} L${x + 62} ${y + 64} M${GAP_B(x)} ${y + 37}
                 L${x + 108} ${y + 64}" fill="none" stroke="var(--fig-cut-s)" stroke-width="1.6"
               stroke-dasharray="4 3"/>`;
        } else if (ch === '3') {
          inner = wholeWall(x, y) + site(x, y) + down;
        } else if (ch === '4') {
          inner = wholeWall(x, y) + site(x, y) + down + scope(x + 85, y + 56);
        } else if (ch === '7') {
          inner = splitWall(x, y) + passage(x, y) + site(x, y) + down;
        } else if (ch === '8') {
          inner = splitWall(x, y) + passage(x, y) + site(x, y) + down + scope(x + 85, y + 56);
        } else if (ch === 'F') {
          inner = splitWall(x, y) + passage(x, y) + site(x, y) + down
            + tool(`M${x + 142} ${y + 8} L${x + 108} ${y + 62}`) + scope(x + 112, y + 56);
        } else {
          // Nothing is entered at all. The instrument works on the outside.
          inner = wholeWall(x, y) + site(x, y)
            + tool(`M${x + 58} ${y + 14} H${x + 112}`)
            + `<path d="M${x + 85} ${y + 39} V${y + 62}" fill="none" stroke="var(--fig-cut-s)"
                 stroke-width="1.8" stroke-dasharray="3 3"/>`;
        }
        return frame + inner;
      };

      const rowY = r => 16 + r * 180;
      return svg(W, 442,
        'Seven panels. In each, the thick grey bar is the body wall, the small box below it is the operative site, the red line is the instrument and the teal ring is a scope. Open cuts the wall apart and holds it open. Percutaneous puts a single puncture through it. Percutaneous endoscopic adds a scope at the site. Via a natural or artificial opening leaves the wall alone and travels down a passage that is already there, drawn as a gap in the wall with the surface folding inward to line it. The endoscopic version adds a scope. The assisted version uses that passage and a separate puncture together. External works on the outside of the wall without entering it.',
        defs('ap')
        + items.map((it, i) => {
          const col = i % 4, row = Math.floor(i / 4);
          const x = 16 + col * 186, y = rowY(row);
          return art(it[0], x, y)
            + `<rect x="${x}" y="${y + PH + 8}" width="22" height="20" rx="4" fill="var(--fig-l3)"
                 stroke="var(--fig-line)" stroke-width="1"/>`
            + t('fig-code', x + 11, y + PH + 23, it[0], 'middle')
            + t('fig-h', x + 30, y + PH + 23, it[1])
            + stack('fig-sub fig-strong', x, y + PH + 44, it[2], 'start', 15)
            + t('fig-tiny', x, y + PH + 44 + it[2].length * 15 + 6, it[3]);
        }).join('')
        + callout(574, rowY(1), 170, 'The two traps', [
          'Laparoscopic-ASSISTED, with',
          'the work done through the',
          'incision → Open.',
          'Hand-assisted laparoscopic →',
          'still Percutaneous Endoscopic.',
        ])
        + legendRow(414, [
          ['wall', 'the body wall'],
          ['gap', 'an opening already there'],
          ['tool', 'the instrument'],
          ['scope', 'a scope, so they can see'],
        ]));
    })(),
    caption: `<b>What counts as an opening that is already there?</b> A <i>natural</i> one is a
      body orifice — the mouth, the nose, the ear, the anus, the urethra, the vagina. An
      <i>artificial</i> one is a stoma or tract that already exists when this procedure starts:
      a colostomy, an ileostomy, a tracheostomy, a nephrostomy tract, a gastrostomy tract. The
      test is simply <b>the surgeon did not have to make a way in</b> — an EGD goes down the
      mouth, a colonoscopy up the anus, a cystoscopy up the urethra, and a tube change goes down
      the stoma the patient already had.
      <br><br>
      Two things follow. If the opening was <b>created during this same operation</b>, it is not
      "already there" — code the approach the surgeon actually used to create it. And what
      decides the value is the route the <b>definitive work</b> was done through, not whether an
      incision existed somewhere: if the case converted from laparoscopic to open, the approach
      is the one that finished the job.`,
  },

  'device-ops': {
    title: 'What is the material doing to the body part?',
    blurb: `Insertion, Supplement and Replacement all put something non-living in. Their
      <b>relationship to the body part</b> is what separates them.`,
    rule: 'B6.1a',
    svg: (() => {
      const W = 720, TW = 224, y = 40, TH = 130;
      const items = [
        ['Insertion', 'H', ['body part intact —', 'the appliance does', 'a job of its own']],
        ['Supplement', 'U', ['body part still there —', 'the material reinforces', 'or augments it']],
        ['Replacement', 'R', ['body part gone —', 'the material stands', 'in its place']],
      ];
      const art = (i, x) => {
        const cx = x + TW / 2, cy = y + 84;
        if (i === 0) return `<rect x="${cx - 60}" y="${cy - 26}" width="62" height="52" rx="12"
            fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.5"/>
          <rect x="${cx + 16}" y="${cy - 16}" width="44" height="32" rx="7"
            fill="var(--fig-device)" stroke="var(--fig-ink)" stroke-width="1.4"/>
          <line x1="${cx + 2}" y1="${cy}" x2="${cx + 14}" y2="${cy}" stroke="var(--fig-ink)" stroke-width="1.6"/>`;
        if (i === 1) return `<rect x="${cx - 40}" y="${cy - 22}" width="80" height="48" rx="12"
            fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.5"/>
          <rect x="${cx - 48}" y="${cy - 34}" width="96" height="14" rx="5"
            fill="var(--fig-device)" stroke="var(--fig-ink)" stroke-width="1.3"/>`;
        return `<rect x="${cx - 40}" y="${cy - 26}" width="80" height="52" rx="12"
            fill="var(--fig-device)" stroke="var(--fig-ink)" stroke-width="1.5"/>
          <rect x="${cx - 46}" y="${cy - 32}" width="92" height="64" rx="14" fill="none"
            stroke="var(--fig-cut-s)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
      };
      return svg(W, 278,
        'Three tiles. Insertion: an appliance sits beside an intact body part and does a job of its own. Supplement: material is laid over a body part that is still present, reinforcing it. Replacement: the body part is gone, shown as a red dashed outline, and the purple material stands in its place.',
        defs('do')
        + items.map((it, i) => {
          const x = 14 + i * (TW + 8);
          return tile(x, y, TW, TH, it[0], it[1]) + art(i, x)
            + stack('fig-tiny', x + TW / 2, y + TH + 20, it[2], 'middle', 14);
        }).join('')
        + foot(W, 234, [
          'Purple = the material put in. Red dashes = where the body part used to be.',
          'The test: take the material away in your head. Insertion: the body part still works.',
          'Supplement: it works, but weakly. Replacement: there is nothing left to work.',
        ]));
    })(),
    caption: `A pacemaker lead is an <b>Insertion</b>. A hernia mesh is a <b>Supplement</b>. A
      total hip is a <b>Replacement</b>. And note that Replacement includes taking the old body
      part out — that is not coded separately.`,
  },

  /* ------------------------------------------------------- graft materials */
  'graft-materials': {
    title: 'Where did the material come from?',
    blurb: `The 6th character says what the graft <b>is made of</b>. It never says where it was
      harvested.`,
    rule: 'B6.1a',
    svg: (() => {
      const W = 760, TW = 180, y = 40, TH = 118;
      const items = [
        ['7', 'Autologous', 'the same patient', ['saphenous vein,', 'the patient’s own bone']],
        ['K', 'Nonautologous', 'another human', ['bone-bank bone,', 'cadaveric dermis']],
        ['8', 'Zooplastic', 'an animal', ['porcine valve,', 'bovine pericardium']],
        ['J', 'Synthetic', 'manufactured', ['mesh, Dacron, metal', 'and polyethylene']],
      ];
      return svg(W, 244,
        'Four tiles, one for each family of graft material: autologous from the same patient, nonautologous from another human, zooplastic from an animal, and synthetic manufactured material.',
        defs('gm')
        + items.map((it, i) => {
          const x = 14 + i * (TW + 6);
          return tile(x, y, TW, TH, it[1], it[0])
            + t('fig-label', x + 12, y + 50, 'from ' + it[2])
            + stack('fig-tiny', x + 12, y + 74, it[3], 'start', 15)
            + t('fig-sub', x + 12, y + TH - 10, 'Tissue Substitute');
        }).join('')
        + foot(W, 202, [
          'A mixture of autologous and nonautologous material is coded as Autologous Tissue Substitute.',
          'On a vertebral joint an Interbody Fusion Device outranks all four of these.',
          'Whether the harvest is a second code is a different question — see the next figure.',
        ]));
    })(),
    caption: `Read the material, not the operation. A vein used as a bypass conduit is
      <i>Autologous Venous Tissue</i>; the same operation using a Dacron tube is <i>Synthetic
      Substitute</i>.`,
  },

  /* ---------------------------------------------------- harvesting a graft */
  'graft-harvest': {
    title: 'Is the harvest a second code?',
    blurb: `Yes — <b>unless</b> the 7th character of the main code already names where the graft
      came from.`,
    rule: 'B3.9',
    svg: (() => {
      const W = 760;
      const box = (x, y, w, lines) => `<rect x="${x}" y="${y}" width="${w}" height="${22 + lines.length * 16}"
          rx="9" fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.5"/>`
        + stack('fig-label', x + w / 2, y + 20, lines, 'middle');
      return svg(W, 336,
        'Two cases. In the first, a saphenous vein is harvested from the leg for a coronary bypass whose qualifier names the aorta; because the qualifier does not name the leg, the harvest is coded separately. In the second, a breast is reconstructed with a deep inferior epigastric perforator flap and the qualifier names that flap, so the harvest is already inside the code.',
        defs('gh')
        + t('fig-h', 20, 32, 'The qualifier does NOT name the donor site')
        + box(20, 48, 190, ['Saphenous vein', 'taken from the leg'])
        + `<path d="M216 76 H272" stroke="var(--fig-graft)" stroke-width="4" marker-end="url(#g-gh)"/>`
        + box(278, 48, 190, ['Coronary bypass', 'qualifier = Aorta'])
        + callout(492, 44, 250, 'Two codes', ['Code the bypass, then code the', 'excision of the vein separately.'])
        + `<line x1="20" y1="160" x2="740" y2="160" stroke="var(--fig-line)" stroke-width="1"/>`
        + t('fig-h', 20, 192, 'The qualifier DOES name the donor tissue')
        + box(20, 208, 190, ['DIEP flap raised', 'from the abdomen'])
        + `<path d="M216 236 H272" stroke="var(--fig-graft)" stroke-width="4" marker-end="url(#g-gh)"/>`
        + box(278, 208, 190, ['Breast replacement', 'qualifier = DIEP flap'])
        + callout(492, 204, 250, 'One code', ['The harvest is already inside it.', 'Do not code it again.'])
        + foot(W, 306, [
          'The test is mechanical: open the table and read the 7th-character column of the code you are about to use.',
        ]));
    })(),
    caption: `If a qualifier names donor tissue or a donor site, the harvest is already inside the
      code. If the qualifiers are only destinations, or <i>No Qualifier</i>, or <i>Diagnostic</i>,
      the harvest is a code of its own.`,
  },

  /* ---------------------------------------------------------- around a joint */
  'joint-layers': {
    title: 'Around a joint — which body system?',
    blurb: `The skin over a joint, the soft tissue that supports it, and the joint itself are
      three different answers to the same operative note.`,
    rule: 'B4.5',
    svg: (() => {
      const W = 760;
      const pairs = [['Shoulder', 'Upper Arm'], ['Elbow', 'Lower Arm'], ['Wrist', 'Lower Arm'],
      ['Hip', 'Upper Leg'], ['Knee', 'Lower Leg'], ['Ankle', 'Foot']];
      return svg(W, 400,
        'A knee in cross-section. The skin and subcutaneous tissue running down each side are coded to the lower leg, not to the knee. The ligaments crossing the joint are coded to bursae and ligaments or to tendons. The joint space itself is coded to the lower joints body system. Below, the mapping from each joint to the region its overlying skin belongs to.',
        defs('jl')
        + `<g stroke="var(--fig-ink)" stroke-width="1.6">
             <path d="M300 46 q60 -16 120 0 l0 62 q-60 12 -120 0 z" fill="var(--fig-l3)"/>
             <path d="M300 158 q60 -12 120 0 l0 98 q-60 14 -120 0 z" fill="var(--fig-l3)"/>
             <rect x="296" y="112" width="128" height="42" rx="8" fill="var(--fig-fluid)"/>
           </g>
           <path d="M286 36 v232" fill="none" stroke="var(--fig-skin)" stroke-width="8"/>
           <path d="M434 36 v232" fill="none" stroke="var(--fig-skin)" stroke-width="8"/>
           <g fill="none" stroke="var(--fig-lig)" stroke-width="5">
             <path d="M314 104 q22 32 0 62"/><path d="M406 104 q-22 32 0 62"/>
           </g>`
        + labelL(266, 76, ['skin, subcutaneous', 'tissue and fascia'], 286, 84)
        + labelL(266, 190, ['ligaments, tendons', 'and bursae'], 314, 140)
        + labelR(454, 138, ['the joint space itself'], 424, 133)
        + labelR(454, 76, ['bone'], 420, 74)
        + `<line x1="20" y1="292" x2="740" y2="292" stroke="var(--fig-line)" stroke-width="1"/>`
        + t('fig-h', 20, 318, 'Skin over a joint is coded to the region beyond it')
        + pairs.map(([a, b], i) => {
          const x = 20 + i * 122;
          return `<rect x="${x}" y="${332}" width="112" height="42" rx="7" fill="var(--fig-l1)"
              stroke="var(--fig-line)" stroke-width="1"/>`
            + t('fig-label', x + 56, 350, a, 'middle')
            + t('fig-sub', x + 56, 366, '→ ' + b, 'middle');
        }).join('')
        + foot(W, 394, ['The two that surprise people: the wrist maps to lower arm, and the ankle maps to foot.']));
    })(),
    caption: `So an excision of a skin lesion over the knee is coded to <i>Skin, Lower Leg</i>,
      and a debridement into the knee joint is a <i>Lower Joints</i> code. The word "knee" in the
      note does not settle the body part.`,
  },

  /* ------------------------------------------------------- proximal vessel */
  'vessel-proximal': {
    title: 'Which segment of a vessel is the body part?',
    blurb: `A continuous treated stretch of vessel is coded to the segment <b>closest to the
      heart</b>, whatever end the catheter went in.`,
    rule: 'B4.1c',
    svg: (() => {
      const W = 760;
      return svg(W, 250,
        'A single artery running across the figure, treated along its whole length. The left-hand end is the external iliac artery, nearer the heart; the right-hand end is the femoral artery. Two possible entry points are marked, one at each end. Either way the body part coded is the external iliac artery.',
        defs('vp')
        + t('fig-h', 20, 34, 'One continuous treated segment, two named vessels')
        + `<path d="M90 118 H670" stroke="var(--fig-vessel)" stroke-width="14" stroke-linecap="round"/>
           <path d="M90 118 H670" stroke="var(--fig-graft)" stroke-width="5" stroke-dasharray="10 6"/>
           <line x1="380" y1="98" x2="380" y2="138" stroke="var(--fig-ink)" stroke-width="1.4"
             stroke-dasharray="4 3"/>`
        + t('fig-label', 230, 76, 'External iliac artery', 'middle')
        + t('fig-sub', 230, 92, 'nearer the heart', 'middle')
        + t('fig-label', 540, 76, 'Femoral artery', 'middle')
        + t('fig-sub', 540, 92, 'further away', 'middle')
        + `<g stroke="var(--fig-cut-s)" stroke-width="2.6">
             <line x1="130" y1="170" x2="130" y2="132"/><line x1="630" y1="170" x2="630" y2="132"/>
           </g>`
        + t('fig-tiny', 130, 188, 'entry here?', 'middle')
        + t('fig-tiny', 630, 188, 'or entry here?', 'middle')
        + foot(W, 216, [
          'Either way the body part is the External Iliac Artery. The access site is never the body part.',
          'The same rule sends a stretch treated across two named segments to the more proximal of the two.',
        ]));
    })(),
    caption: `Green dashes mark the treated length; the thin dashed line is the anatomical
      boundary between the two named vessels. Because the treatment crosses it, the proximal
      name wins.`,
  },

  /* ---------------------------------------------------- the digestive tract */
  'gi-tract': {
    title: 'The digestive tract, and its PCS values',
    blurb: `Every 4th-character value of body system <b>D</b>, in the order the tract runs. The
      two general values, <i>Upper Intestinal Tract</i> and <i>Lower Intestinal Tract</i>, divide
      between the duodenum and the jejunum.`,
    rule: 'B4.8',
    svg: (() => {
      const W = 760;
      return svg(W, 452,
        'The digestive tract drawn in order: esophagus, stomach, duodenum, then the coiled jejunum and ileum inside a frame of colon, running from the cecum up the ascending colon, across the transverse colon, down the descending colon, through the sigmoid to the rectum and anus. The esophagus, stomach and duodenum are shaded as the upper intestinal tract; everything from the jejunum onwards is shaded as the lower intestinal tract, and a red mark shows the dividing line.',
        defs('gi')
        + `<path d="M316 36 V96" stroke="var(--fig-gi-up)" stroke-width="14" stroke-linecap="round"/>
           <path d="M316 96 C 266 106, 236 142, 244 180 C 252 218, 302 230, 338 210
                    C 360 198, 366 178, 358 160 C 350 142, 344 120, 342 100 Z"
             fill="var(--fig-gi-up)" stroke="var(--fig-ink)" stroke-width="1.4"/>
           <path d="M358 176 C 400 168, 424 190, 424 214 C 424 244, 396 258, 358 254"
             fill="none" stroke="var(--fig-gi-up)" stroke-width="13" stroke-linecap="round"/>
           <path d="M356 258 H304 a19 19 0 0 0 0 38 H436 a19 19 0 0 1 0 38 H310"
             fill="none" stroke="var(--fig-gi-low)" stroke-width="14" stroke-linecap="round"/>
           <path d="M486 232 H214" stroke="var(--fig-gi-low)" stroke-width="15" stroke-linecap="round"/>
           <path d="M486 232 V330" stroke="var(--fig-gi-low)" stroke-width="15" stroke-linecap="round"/>
           <circle cx="486" cy="342" r="15" fill="var(--fig-gi-low)" stroke="var(--fig-ink)" stroke-width="1.2"/>
           <path d="M214 232 V322 C 216 356, 250 368, 278 356 L 298 384"
             fill="none" stroke="var(--fig-gi-low)" stroke-width="15" stroke-linecap="round"/>
           <path d="M346 246 L372 264" stroke="var(--fig-cut-s)" stroke-width="3"/>`
        + labelL(196, 56, ['Esophagus · 5'], 316, 54)
        + labelL(196, 152, ['Stomach · 6'], 272, 150)
        + labelL(196, 288, ['Descending Colon · M'], 214, 288)
        + labelL(196, 372, ['Rectum · P', 'Anus · Q'], 288, 372)
        + labelR(536, 198, ['Duodenum · 9'], 424, 198)
        + labelR(536, 234, ['Transverse Colon · L'], 440, 232)
        + labelR(536, 268, ['Jejunum · A', 'Ileum · B'], 436, 296)
        + labelR(536, 320, ['Ascending Colon · K'], 486, 310)
        + labelR(536, 356, ['Cecum · H', 'Appendix · J'], 486, 344)
        + `<rect x="528" y="30" width="216" height="140" rx="8" fill="var(--fig-l1)"
             stroke="var(--fig-line)" stroke-width="1"/>
           <rect x="544" y="48" width="20" height="11" rx="2" fill="var(--fig-gi-up)"/>
           <rect x="544" y="118" width="20" height="11" rx="2" fill="var(--fig-gi-low)"/>`
        + t('fig-h', 572, 58, 'Upper Intestinal Tract · 0')
        + stack('fig-tiny', 544, 80, ['esophagus down to and', 'including the duodenum'], 'start', 15)
        + t('fig-h', 572, 128, 'Lower Intestinal Tract · D')
        + stack('fig-tiny', 544, 150, ['jejunum down to and including', 'the rectum and anus'], 'start', 15)
        + foot(W, 414, [
          'The short red mark on the drawing is the dividing line: the last of the duodenum, then the first of the jejunum.',
          'The two general values appear only in root operations such as Change, Insertion, Inspection, Removal and Revision.',
        ]));
    })(),
    caption: `So changing a gastrostomy tube uses <b>Upper</b> Intestinal Tract, and changing a
      jejunostomy tube uses <b>Lower</b> Intestinal Tract. When a specific value exists and the
      operation offers it — Stomach, Jejunum, Transverse Colon — use the specific one.`,
  },

  /* ----------------------------------------------------- the heart's values */
  'heart-chambers': {
    title: 'Inside the heart — where each value lives',
    blurb: `Blood runs body → right heart → lungs → left heart → body. Following it names every
      4th-character value in body system <b>2</b>, in order, with each valve between the two
      chambers it separates.`,
    svg: (() => {
      const W = 760;
      const row1 = [
        [20, ['Superior and Inferior', 'Vena Cava'], 'V'],
        [200, ['Atrium, Right'], '6'],
        [380, ['Ventricle, Right'], 'K'],
        [560, ['Pulmonary Trunk'], 'P'],
      ];
      const row2 = [
        [560, ['Pulmonary Vein,', 'Right and Left'], 'S'],
        [380, ['Atrium, Left'], '7'],
        [200, ['Ventricle, Left'], 'L'],
        [20, ['Thoracic Aorta,', 'Ascending/Arch'], 'X'],
      ];
      const y1 = 62, y2 = 206;
      return svg(W, 400,
        'Two rows of boxes following the flow of blood. The top row runs left to right: the venae cavae, the right atrium, the right ventricle and the pulmonary trunk, with the tricuspid valve and the pulmonary valve marked between them. The bottom row runs right to left: the pulmonary veins, the left atrium, the left ventricle and the ascending aorta, with the mitral valve and the aortic valve marked between them. Below, the values that are not part of the flow: the septa, the papillary muscles, the chordae tendineae, the conduction mechanism and the pericardium.',
        defs('hc')
        + row1.map(r => nodeBox(r[0], y1, 150, r[1], r[2])).join('')
        + row2.map(r => nodeBox(r[0], y2, 150, r[1], r[2])).join('')
        + [[170, y1], [350, y1], [530, y1]].map(([x, y]) => arw(x, y + 30, x + 28, y + 30, 'hc')).join('')
        + [[550, y2], [370, y2], [190, y2]].map(([x, y]) => arw(x + 10, y + 30, x - 18, y + 30, 'hc')).join('')
        + `<path d="M710 ${y1 + 60} V${y2 - 14}" stroke="var(--fig-ink)" stroke-width="2"
             fill="none" marker-end="url(#a-hc)"/>`
        + t('fig-tiny', 704, y1 + 92, 'through the lungs', 'end')
        + t('fig-sub', 364, y1 - 12, 'Tricuspid Valve · J', 'middle')
        + t('fig-sub', 544, y1 - 12, 'Pulmonary Valve · H', 'middle')
        + t('fig-sub', 361, y2 + 78, 'Mitral Valve · G', 'middle')
        + t('fig-sub', 181, y2 + 78, 'Aortic Valve · F', 'middle')
        + t('fig-h', 20, 320, 'Values that are not part of the flow')
        + [['Atrial Septum', '5'], ['Ventricular Septum', 'M'], ['Papillary Muscle', 'D'],
        ['Chordae Tendineae', '9'], ['Conduction Mechanism', '8'], ['Pericardium', 'N']]
          .map(([n, c], i) => {
            const x = 20 + (i % 3) * 246, y = 332 + Math.floor(i / 3) * 34;
            return `<rect x="${x}" y="${y}" width="230" height="28" rx="6" fill="var(--fig-l1)"
                stroke="var(--fig-line)" stroke-width="1"/>`
              + t('fig-code', x + 12, y + 19, c) + t('fig-label', x + 34, y + 19, n);
          }).join(''));
    })(),
    caption: `Two things worth fixing in your head. The <b>mitral valve</b> is the one between
      the left atrium and the left ventricle, so a mitral valve replacement is body part
      <b>G</b> in body system <b>2</b>. And the aorta has two values: <b>X</b> for the ascending
      aorta and the arch, <b>W</b> for the descending thoracic aorta.`,
  },

  /* ------------------------------------------------------------ respiratory */
  respiratory: {
    title: 'The airway, branch by branch',
    blurb: `Body system <b>B</b> names each generation of the airway separately, and then names
      the lobe it ventilates. Right and left are not symmetrical.`,
    svg: (() => {
      const W = 760;
      const right = [['Upper Lobe Bronchus', '4', 'Upper Lung Lobe', 'C'],
      ['Middle Lobe Bronchus', '5', 'Middle Lung Lobe', 'D'],
      ['Lower Lobe Bronchus', '6', 'Lower Lung Lobe', 'F']];
      const left = [['Upper Lobe Bronchus', '8', 'Upper Lung Lobe', 'G'],
      ['Lingula Bronchus', '9', 'Lung Lingula', 'H'],
      ['Lower Lobe Bronchus', 'B', 'Lower Lung Lobe', 'J']];
      const rowY = i => 250 + i * 46;
      return svg(W, 426,
        'A branching diagram of the airway. The trachea leads to the carina, which divides into the right and left main bronchus. Down the left of the picture, the right main bronchus gives the upper, middle and lower lobe bronchi, each feeding its lung lobe. Down the right, the left main bronchus gives the upper and lower lobe bronchi and the lingula bronchus, each feeding its lung lobe.',
        defs('rp')
        + nodeBox(300, 26, 160, ['Trachea'], '1')
        + arw(380, 64, 380, 84, 'rp')
        + nodeBox(300, 88, 160, ['Carina'], '2')
        + `<path d="M380 126 V152 M108 152 H652 M108 152 V176 M652 152 V176" fill="none"
             stroke="var(--fig-ink)" stroke-width="2"/>`
        + nodeBox(20, 176, 176, ['Main Bronchus, Right'], '3')
        + nodeBox(564, 176, 176, ['Main Bronchus, Left'], '7')
        + `<path d="M108 214 V${rowY(2) + 19} M652 214 V${rowY(2) + 19}" fill="none"
             stroke="var(--fig-line)" stroke-width="1.6"/>`
        + right.map((r, i) => nodeBox(20, rowY(i), 176, [r[0]], r[1])
          + nodeBox(210, rowY(i), 138, [r[2]], r[3])
          + arw(198, rowY(i) + 19, 206, rowY(i) + 19, 'rp')).join('')
        + left.map((r, i) => nodeBox(564, rowY(i), 176, [r[0]], r[1])
          + nodeBox(412, rowY(i), 138, [r[2]], r[3])
          + arw(562, rowY(i) + 19, 554, rowY(i) + 19, 'rp')).join('')
        + foot(W, 406, [
          'The left lung has no middle lobe. Its lingula is a value of its own \u2014 Lung Lingula, H \u2014 and so is the bronchus that feeds it.',
        ]));
    })(),
    caption: `Whole-lung values also exist: <b>K</b> Lung, Right · <b>L</b> Lung, Left ·
      <b>M</b> Lungs, Bilateral. Use the lobe value when the operative note names a lobe, because
      taking a whole lobe is a <i>Resection</i> while taking a wedge of it is an <i>Excision</i>.`,
  },

  /* --------------------------------------------------------------- urinary */
  urinary: {
    title: 'The urinary tract, and its PCS values',
    blurb: `Body system <b>T</b>, in the order urine travels. Kidney and kidney pelvis are
      separate values, and the bladder neck is separate from the bladder.`,
    svg: (() => {
      const W = 760;
      return svg(W, 320,
        'A diagram of the urinary tract. The right kidney drains through the right kidney pelvis into the right ureter, and the left kidney through the left kidney pelvis into the left ureter. Both ureters enter the bladder, which drains through the bladder neck into the urethra.',
        defs('ur')
        + nodeBox(20, 48, 150, ['Kidney, Right'], '0')
        + nodeBox(200, 48, 150, ['Kidney Pelvis, Right'], '3')
        + nodeBox(380, 48, 150, ['Ureter, Right'], '6')
        + nodeBox(20, 122, 150, ['Kidney, Left'], '1')
        + nodeBox(200, 122, 150, ['Kidney Pelvis, Left'], '4')
        + nodeBox(380, 122, 150, ['Ureter, Left'], '7')
        + arw(172, 68, 196, 68, 'ur') + arw(352, 68, 376, 68, 'ur')
        + arw(172, 142, 196, 142, 'ur') + arw(352, 142, 376, 142, 'ur')
        + nodeBox(590, 84, 150, ['Bladder'], 'B')
        + nodeBox(590, 158, 150, ['Bladder Neck'], 'C')
        + nodeBox(590, 232, 150, ['Urethra'], 'D')
        + `<path d="M532 142 H562 V104 M532 68 H562 V104 H582" fill="none"
             stroke="var(--fig-ink)" stroke-width="2" marker-end="url(#a-ur)"/>`
        + arw(665, 122, 665, 154, 'ur') + arw(665, 196, 665, 228, 'ur')
        + foot(W, 296, [
          'A nephrostomy tube sits in the kidney pelvis, not the kidney. A stone in the renal pelvis is an Extirpation of Kidney Pelvis, not of Kidney.',
        ]));
    })(),
    caption: `The kidney and its pelvis being separate values matters constantly: pyeloplasty,
      nephrostomy drainage and pelvic stone removal are all <i>Kidney Pelvis</i> codes even
      though the note says "renal".`,
  },

  /* -------------------------------------------------------- hepatobiliary */
  hepatobiliary: {
    title: 'The biliary tree, and its PCS values',
    blurb: `Body system <b>F</b>. Bile leaves the liver through the hepatic ducts, the gallbladder
      joins by the cystic duct, and the common bile duct ends at the ampulla.`,
    svg: (() => {
      const W = 760;
      return svg(W, 340,
        'A diagram of the biliary tree. The right and left hepatic ducts leave the liver and join as the common hepatic duct. The gallbladder drains through the cystic duct into that junction, forming the common bile duct, which ends at the ampulla of Vater. The pancreatic duct joins the ampulla, and the ampulla opens into the duodenum.',
        defs('hb')
        + nodeBox(20, 40, 186, ['Liver'], '0')
        + t('fig-sub', 113, 96, 'Right Lobe · 1     Left Lobe · 2', 'middle')
        + nodeBox(224, 40, 160, ['Hepatic Duct, Right'], '5')
        + nodeBox(224, 100, 160, ['Hepatic Duct, Left'], '6')
        + nodeBox(402, 70, 176, ['Hepatic Duct, Common'], '7')
        + nodeBox(20, 168, 186, ['Gallbladder'], '4')
        + nodeBox(224, 168, 160, ['Cystic Duct'], '8')
        + nodeBox(402, 152, 176, ['Common Bile Duct'], '9')
        + nodeBox(20, 250, 186, ['Pancreas'], 'G')
        + nodeBox(224, 250, 160, ['Pancreatic Duct'], 'D')
        + nodeBox(596, 210, 150, ['Ampulla of Vater'], 'C')
        + arw(208, 59, 220, 59, 'hb')
        + `<path d="M212 62 V119 H216" fill="none" stroke="var(--fig-ink)" stroke-width="2"
             marker-end="url(#a-hb)"/>`
        + arw(208, 187, 220, 187, 'hb')
        + arw(208, 269, 220, 269, 'hb')
        + `<path d="M386 59 H394 V89 M386 119 H394 V89 H396" fill="none"
             stroke="var(--fig-ink)" stroke-width="2" marker-end="url(#a-hb)"/>
           <path d="M490 108 V146" fill="none" stroke="var(--fig-ink)" stroke-width="2"
             marker-end="url(#a-hb)"/>
           <path d="M386 187 H394 V171 H396" fill="none" stroke="var(--fig-ink)" stroke-width="2"
             marker-end="url(#a-hb)"/>
           <path d="M580 171 H588 V229 H590" fill="none" stroke="var(--fig-ink)" stroke-width="2"
             marker-end="url(#a-hb)"/>
           <path d="M386 269 H671 V254" fill="none" stroke="var(--fig-ink)" stroke-width="2"
             marker-end="url(#a-hb)"/>`
        + t('fig-sub', 671, 292, 'opens into the duodenum', 'middle')
        + foot(W, 314, [
          'An ERCP sphincterotomy is a Division of the Ampulla of Vater, C — not of the common bile duct.',
        ]));
    })(),
    caption: `A laparoscopic cholecystectomy is a <b>Resection</b> of Gallbladder — all of that
      body-part value comes out — and the cystic duct clipped on the way is not coded separately,
      because it is integral to the procedure.`,
  },
};

/* ------------------------------------------------------------------ render */

export function hasDiagram(id) {
  return !!(id && DIAGRAMS[id]);
}

export function diagramIds() {
  return Object.keys(DIAGRAMS);
}

export function diagramMeta(id) {
  return DIAGRAMS[id] || null;
}

/** One figure: heading, blurb, drawing, caption. */
export function diagram(id, opts = {}) {
  const d = DIAGRAMS[id];
  if (!d) return '';
  return `<div class="fig">
    ${opts.bare ? '' : `<h3 class="fig-title">${esc(d.title)}</h3>
      ${d.blurb ? `<p class="fig-blurb">${d.blurb}</p>` : ''}`}
    <div class="fig-canvas">${d.svg}</div>
    ${d.caption ? `<figcaption class="fig-caption">${d.caption}</figcaption>` : ''}
  </div>`;
}

/* ----------------------------------------------------- shared drawings */
// Function declarations, so they can be used by the figures above: those are
// built while this module is evaluated, and only declarations are hoisted.

/** A labelled box in a flow map: the PCS character on a tab, then the name. */
function nodeBox(x, y, w, lines, val) {
  const h = 22 + lines.length * 16;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="var(--fig-l2)"
      stroke="var(--fig-ink)" stroke-width="1.4"/>`
    + (val ? `<path d="M${x + 8} ${y} h18 v${h} h-18 a8 8 0 0 1 -8 -8 v${-(h - 16)} a8 8 0 0 1 8 -8 z"
        fill="var(--fig-l4)" stroke="var(--fig-line)" stroke-width="1"/>`
      + t('fig-code', x + 13, y + h / 2 + 5, val, 'middle') : '')
    + stack('fig-label', x + 26 + (w - 26) / 2, y + 20, lines, 'middle');
}

/**
 * A key across the bottom of a figure. Colour never carries meaning on its own
 * here, so anything drawn in a colour has to be named somewhere.
 */
function legendRow(y, items) {
  return items.map(([kind, label], i) => {
    const x = 16 + i * 186;
    let icon = '';
    if (kind === 'wall') icon = `<rect x="${x}" y="${y - 8}" width="24" height="9" rx="2" fill="var(--fig-skin)"/>`;
    if (kind === 'gap') icon = `<rect x="${x}" y="${y - 8}" width="9" height="9" rx="2" fill="var(--fig-skin)"/>`
      + `<rect x="${x + 15}" y="${y - 8}" width="9" height="9" rx="2" fill="var(--fig-skin)"/>`;
    if (kind === 'tool') icon = `<path d="M${x} ${y - 4} h24" stroke="var(--fig-cut-s)" stroke-width="2.6" stroke-linecap="round"/>`;
    if (kind === 'scope') icon = `<circle cx="${x + 12}" cy="${y - 4}" r="6.5" fill="none" stroke="var(--fig-scope)" stroke-width="2.4"/>`;
    return icon + t('fig-tiny', x + 32, y, label);
  }).join('');
}

function arw(x1, y1, x2, y2, k) {
  return `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="var(--fig-ink)"
    stroke-width="2" marker-end="url(#a-${k})"/>`;
}

/**
 * The heart, seen from the front, with its coronary arteries. Two figures use
 * it: the vessel map, and the bypass. Drawing it once means a coder who has
 * learnt the map can read the bypass without re-orienting.
 */
function heartArt() {
  return `<path d="M246 96 C 200 116, 190 172, 214 216 C 238 258, 300 296, 372 318
             L 404 326 C 424 300, 442 254, 444 206 C 442 150, 416 106, 366 92
             C 326 82, 282 82, 246 96 Z"
           fill="var(--fig-l2)" stroke="var(--fig-ink)" stroke-width="1.8"/>
    <path d="M326 104 C 344 50, 366 26, 416 22" fill="none" stroke="var(--fig-vessel)"
      stroke-width="17" stroke-linecap="round"/>
    <path d="M356 106 C 348 56, 336 34, 308 26" fill="none" stroke="var(--fig-fluid)"
      stroke-width="15" stroke-linecap="round"/>
    <g fill="none" stroke="var(--fig-vessel)" stroke-width="5" stroke-linecap="round">
      <path d="M316 112 C 272 128, 240 176, 246 226"/>
      <path d="M246 226 C 262 270, 318 306, 380 320"/>
      <path d="M338 116 C 348 122, 360 128, 372 136"/>
      <path d="M372 136 C 380 190, 390 262, 400 320"/>
      <path d="M372 136 C 404 150, 430 184, 434 226"/>
      <path d="M430 202 C 444 222, 448 250, 444 278"/>
    </g>`;
}
