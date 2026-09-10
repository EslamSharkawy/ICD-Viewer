// Every convention in the book, in everyday language, each with one real
// worked example taken from the codes this tool actually contains.

import { esc } from '../ui.js';
import { setGuidedBar } from '../guided.js';

const ENTRIES = [
  {
    id: 'excludes1', term: 'Excludes1', plain: 'Never code these together',
    body: `<p>The strictest instruction in the book. An Excludes1 note means <b>not coded here</b>: the listed
      condition and the code above the note can never both appear on the same account, because a patient
      cannot have both at once. The classic case is a condition that is either something you were born with
      or something you acquired later — never both.</p>
      <p>There is one narrow exception. If the two conditions are genuinely unrelated to each other, both
      may be coded. Do not lean on this; when in doubt, ask.</p>`,
    example: `<b>Q03.9</b> Congenital hydrocephalus carries an Excludes1 for acquired hydrocephalus.
      A patient was either born with it or developed it. Coding both says something impossible.`,
  },
  {
    id: 'excludes2', term: 'Excludes2', plain: 'These may be coded together if both are present',
    body: `<p>An Excludes2 note means <b>not included here</b>. The listed condition is not part of what this
      code covers — but the patient can have both at the same time, and if the record documents both, you
      code both.</p>
      <p>One digit apart in the name, opposite in meaning. Excludes1 forbids; Excludes2 invites.</p>`,
    example: `<b>J44</b> Chronic obstructive pulmonary disease carries an Excludes2 for bronchiectasis (J47.-).
      A patient can have COPD and bronchiectasis together, and when they do, both codes go on the account.`,
  },
  {
    id: 'codeFirst', term: 'Code First', plain: 'Code the underlying condition first',
    body: `<p>Some codes describe a <b>manifestation</b> — damage that another disease is doing to part of the
      body. A manifestation code can never be the first code listed. The disease that caused it goes first.</p>
      <p>Wherever there is a Code First note on the manifestation, there is a matching "use additional code"
      note back on the underlying disease. They are two halves of the same instruction.</p>`,
    example: `Codes titled "in diseases classified elsewhere" are almost always manifestation codes.
      They are never allowed to be the principal diagnosis.`,
  },
  {
    id: 'useAdditionalCode', term: 'Use Additional Code', plain: 'Add a second code for',
    body: `<p>This code tells only part of the story. A second code, listed after it, records the extra detail
      the note names — the organism causing an infection, a tobacco habit, the drug involved.</p>
      <p>These notes are the single most common reason a chart comes back for rework, and they are very often
      printed at the chapter or category level rather than on the code itself — which is exactly why they
      get missed.</p>`,
    example: `Chapter 10, the whole respiratory chapter, carries a "use additional code" for tobacco:
      exposure, dependence (F17.-), history (Z87.891) and use (Z72.0).
      That instruction reaches every code in the chapter, <b>J44.1</b> included, even though nothing is printed at J44.1 itself.`,
  },
  {
    id: 'codeAlso', term: 'Code Also', plain: 'Also code, when documented',
    body: `<p>Two codes may be needed to describe the situation fully, but unlike Code First the order is
      yours to choose. Put whichever condition was the main reason for the encounter first.</p>`,
    example: `<b>J44</b> carries "code also type of asthma, if applicable (J45.-)". If the patient's asthma is
      the reason they came in, the asthma code leads; if the COPD exacerbation is, J44.1 leads.`,
  },
  {
    id: 'includes', term: 'Includes', plain: 'This code includes',
    body: `<p>Printed under a category to say what the category covers, and to give examples. It widens your
      sense of what belongs here; it is not an exhaustive list.</p>`,
    example: `<b>J44</b> includes "chronic bronchitis with emphysema" and "chronic obstructive asthma", among
      others. None of those words is in the code title, but all of them land here.`,
  },
  {
    id: 'inclusionTerm', term: 'Inclusion Term', plain: 'Another way of writing the same thing',
    body: `<p>Listed under an individual code rather than a category. Inclusion terms are alternative wordings
      and near-synonyms — the phrases a doctor might actually write for this exact code.</p>
      <p>They are examples, not the full set. The alphabetic index holds many more.</p>`,
    example: `<b>J44.1</b> lists "Decompensated COPD" as an inclusion term. If the chart says decompensated
      COPD, J44.1 is the code — even though the word "decompensated" is nowhere in the title.`,
  },
  {
    id: 'notes', term: 'Note', plain: 'Extra guidance from the code book',
    body: `<p>Free-standing guidance printed at a chapter, block or category. It usually explains how a whole
      group of codes is meant to be used, and it often carries the reasoning behind the rules around it.</p>`,
    example: `Chapter 10 opens with a note saying that when a respiratory condition is documented in more than
      one site and is not specifically indexed, it is classified to the lower anatomic site.`,
  },
  {
    id: 'category', term: 'Category', plain: 'The three-character code at the top of a family',
    body: `<p>Three characters: a letter and two more characters, like <b>J44</b> or <b>E11</b>. A category is
      the family name. Most of the important instructional notes are printed here rather than on the individual
      codes, which is why a beginner who reads only the code misses most of the rules.</p>
      <p>Some categories have no subdivisions at all, and in that case the three-character code is itself
      billable. Most do have subdivisions, and then the category on its own is not usable.</p>`,
    example: `<b>J44</b> Chronic obstructive pulmonary disease is a category. It holds J44.0, J44.1, J44.81,
      J44.89 and J44.9 — and it carries the notes that all of them inherit.`,
  },
  {
    id: 'subcategory', term: 'Subcategory', plain: 'A code four, five or six characters long',
    body: `<p>Each character added narrows the meaning: the site, the side, the severity, whether there was a
      complication. A subcategory may itself be billable, or it may be another heading with more codes beneath it.
      The only way to know is to look.</p>`,
    example: `<b>S72.0</b> is a subcategory of S72; <b>S72.00</b> narrows it further; <b>S72.001</b> narrows it
      to the right side — and even that is not finished, because it still needs a seventh character.`,
  },
  {
    id: 'billable', term: 'Billable code', plain: 'A code that is complete',
    body: `<p>A code is billable — the official phrase is "valid for submission" — when there is nothing more
      specific underneath it and it has all the characters it needs, including a seventh character where one
      is required.</p>
      <p>Anything else is a heading. Headings organise the book; they are not codes you can put on a claim.</p>`,
    example: `<b>J44.1</b> is billable. <b>J44</b> is not, because more specific codes exist underneath it.
      <b>S72.001</b> is not, because it still needs a seventh character; <b>S72.001A</b> is.`,
  },
  {
    id: 'placeholderX', term: 'Placeholder X', plain: 'A letter that holds an empty space open',
    body: `<p>The seventh character must sit in the seventh position — not "at the end", but genuinely seventh.
      When a code is shorter than six characters and still needs a seventh, the letter <b>X</b> fills the gap.</p>
      <p>The X means nothing in itself. Leaving it out shifts the seventh character into the wrong position and
      makes the code invalid.</p>`,
    example: `T74.4 requires a seventh character. You cannot write T74.4A. The code is
      <b>T74.4XXA</b> — two placeholder Xs, then the A in seventh position.`,
  },
  {
    id: 'seventh', term: 'Seventh character', plain: 'The character that says which visit this is',
    body: `<p>Injuries, and some other groups, need a seventh character saying where in the course of care this
      encounter falls. The three you meet most often are:</p>
      <ul>
        <li><b>A — initial encounter.</b> The patient is receiving active treatment for the problem. Not
        "the first time they were ever seen" — active treatment can run across several visits.</li>
        <li><b>D — subsequent encounter.</b> Active treatment is finished and the patient is in routine healing
        or recovery.</li>
        <li><b>S — sequela.</b> A lasting effect left behind after the injury itself has healed.</li>
      </ul>
      <p>Fracture codes use a longer list that also records whether the fracture was open or closed and whether
      healing is going well.</p>`,
    example: `<b>S72.001A</b> — fracture of the right femur, initial encounter for closed fracture.
      Change the A to a D and you are describing a follow-up visit while it heals.`,
  },
  {
    id: 'laterality', term: 'Laterality', plain: 'Which side of the body',
    body: `<p>Many codes carry the side in one of their characters: right, left, bilateral, unspecified.
      The record has to say which side. If it does not, the unspecified code is technically correct but is
      usually a sign that the note needs clarifying rather than that "unspecified" is the right answer.</p>`,
    example: `Under S72.00 the choice is <b>S72.001</b> right, <b>S72.002</b> left, <b>S72.009</b> unspecified.
      Three codes for what the doctor may have written simply as "hip fracture".`,
  },
  {
    id: 'unspecified', term: 'Unspecified codes', plain: 'When the record genuinely does not say',
    body: `<p>An unspecified code is a legitimate code, and sometimes it is the only honest one — in an emergency
      department, at the moment of admission, before any test has come back. What it is not is a way to avoid
      reading the chart.</p>
      <p>Use it when the information genuinely is not there. Ask the clinician when it should be.</p>`,
    example: `<b>R10.9</b> Unspecified abdominal pain is correct when the record says only "abdominal pain".
      If the record says "right lower quadrant", a more specific code exists and should be used.`,
  },
  {
    id: 'nec-nos', term: 'NEC and NOS', plain: 'Two abbreviations that look alike and mean opposite things',
    body: `<p><b>NEC — not elsewhere classifiable.</b> The record is specific, and the book has no code for
      exactly that thing. You know what it is; there is simply no home for it, so it goes in the "other
      specified" code.</p>
      <p><b>NOS — not otherwise specified.</b> The record is vague. This is the same idea as "unspecified".
      You do not know what it is.</p>
      <p>The difference is where the gap is: NEC is a gap in the book, NOS is a gap in the documentation.</p>`,
    example: `<b>J44.89</b> Other specified chronic obstructive pulmonary disease is an NEC-style code —
      the doctor was specific and the book has no exact match. <b>J44.9</b> unspecified is the NOS case.`,
  },
  {
    id: 'index', term: 'Alphabetic Index', plain: 'The half of the book you start in',
    body: `<p>The index lists conditions alphabetically in the wording doctors use, with subterms indented
      beneath each main term. It points you at a code — but it never shows the exclusions, the seventh
      characters or the instructions to add another code.</p>
      <p>The rule is absolute: <b>find the term in the index, then confirm the code in the tabular list.</b>
      Never assign a code from the index alone.</p>`,
    example: `Disease → pulmonary → obstructive (chronic) → with acute exacerbation points at J44.1.
      Only the tabular list tells you that the whole respiratory chapter wants a tobacco code alongside it.`,
  },
  {
    id: 'tabular', term: 'Tabular List', plain: 'The half of the book with the rules in it',
    body: `<p>The tabular list is the codes in order, arranged in chapters, blocks, categories and subcategories —
      with all the instructional notes printed at whichever level they apply to. This tool exists because a
      reader has to see all of those levels at once, and a printed book cannot show them together.</p>`,
    example: `Look up J44.1 here and you see four levels at once: Chapter 10, the block J40–J4B, the category
      J44, and the code itself. Only two lines are actually printed at J44.1.`,
  },
];

export async function renderGlossary(view, r) {
  setGuidedBar(null);
  const at = r.params.get('at');

  view.innerHTML = `<div class="wrap-mid">
    <h1 style="font-size:1.6rem;margin-bottom:.35rem">Plain-language glossary</h1>
    <p class="lede" style="margin-bottom:1.6rem">Every convention the code book uses, explained once, in everyday
      words, with a real example from the codes in this tool. The official term is given alongside each one,
      because sooner or later you will need to say it out loud in a meeting.</p>

    <div class="gloss-layout">
      <nav class="gloss-nav" aria-label="Glossary entries">
        ${ENTRIES.map(e => `<a href="#/glossary?at=${e.id}">${esc(e.plain)}</a>`).join('')}
      </nav>
      <div>
        ${ENTRIES.map(e => `<article class="gloss-entry" id="g-${e.id}">
          <h3>${esc(e.plain)}</h3>
          <div class="official">Officially called: ${esc(e.term)}</div>
          <div class="body">${e.body}</div>
          <div class="worked"><span class="worked-label">A real example</span>${e.example}</div>
        </article>`).join('')}
      </div>
    </div>
  </div>`;

  if (at) {
    const el = view.querySelector('#g-' + CSS.escape(at));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
