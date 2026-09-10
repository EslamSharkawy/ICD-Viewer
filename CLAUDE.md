# CLAUDE.md

Working notes for this repo. `README.md` is written for the people who *use* the tool;
this file is for whoever is *changing* it.

**There are two tools in this folder.** Everything down to the horizontal rule describes
**version 1**, the ICD-10-CM Notes Explorer. Everything after it describes **version 2**, the
ICD-10 Coder Workbench, which adds ICD-10-PCS and both sets of Official Guidelines. Version 2
reuses version 1's modules unchanged; version 1 is never edited. If you are touching anything
under `assets/js2/`, `build/build_pcs.py` or `data-pcs/`, the section you want is
[Version 2](#version-2--the-icd-10-coder-workbench).

## What version 1 is

A browser tool for reading the instructional notes of the ICD-10-CM Tabular List, aimed at
beginner medical coders. Its whole reason to exist is **note inheritance**: the rules that
govern a code are printed at four or five different levels of the book, and no printed page
shows them together. Every design decision serves showing a rule *and where it came from*.

Built from the official **FY2027** NCHS/CMS release files, which are in this folder. All
content is derived from those files — nothing about the code set is hand-written in the app.

## Environment

- **Python 3.13 only, standard library only.** There is no Node, no npm, no bundler, no
  package manager. Do not add a dependency; if something needs a library, write it.
- **Windows.** Prefer the Bash tool for scripting; PowerShell 5.1 has no `&&`.
- **Not a git repo.** There is no undo. Read a file before overwriting it.
- Front end is vanilla ES modules with hash routing. No framework, no build step for dev.

## Layout

```
Table and Index/     official source XML (tabular, index, neoplasm, drug) — never edit
Code Descriptions/   official billable-code list and FY2026→FY2027 addenda — never edit
build/build.py       source XML  ->  data/          (~30s)
build/bundle.py      data/ + app ->  one .html file
data/                GENERATED, 33 MB, 357 files — never hand-edit, always rebuild
index.html           dev shell
assets/app.css       whole design system, one file
assets/js/           app modules (see below)
serve.py             threaded static server for dev
icd10cm-notes-explorer.html   GENERATED single-file build for sharing
```

Everything else in the folder — `coder.html`, `assets/v2.css`, `assets/js2/`, `data-pcs/`,
`Guidelines/`, `build/pdftext.py`, `build/build_pcs.py`, `build/bundle2.py`, `SOURCES.md` —
belongs to version 2 and is listed in its own section below.

## Running it

```bash
python serve.py 8123          # dev, then open http://localhost:8123
python build/build.py         # rebuild data/ after touching the source files
python build/bundle.py        # rebuild the shareable single file
```

`serve.py` must stay threaded — the app requests several data files at once and a
single-threaded handler deadlocks on keep-alive.

## Module map — version 1

Dependency direction is strictly one-way. `main.js` imports everything; nothing imports
`main.js`.

| Module | Role |
| --- | --- |
| `ui.js` | escaping, code linkification, the seven note-type definitions, drawer, toast |
| `store.js` | localStorage: stars, private notes, recents, worklist, theme, guided flag |
| `data.js` | **the engine** — loading, `resolve()`, `collectNotes()`, `reconcile()` |
| `search.js` | query interpretation, everyday-word synonyms, ranking |
| `guided.js` | walk-through mode helpers |
| `views/*.js` | one file per screen |
| `main.js` | boot, top bar, hash router |

**Keep the graph acyclic.** `guided.js` exists only because every view needs
`setGuidedBar()` and `main.js` imports every view — that cycle broke the bundler.
`bundle.py` fails loudly if a cycle reappears.

## The engine — read this before touching notes

`data.js` `collectNotes(ctx)` gathers every note that applies to a code and tags each line
with its origin, widest level first:

```
chapter -> group heading -> block -> ancestor categories -> the code itself
rank 0     rank 1           rank 2   rank 3+                rank 100
```

Then `reconcile()` runs. Four things it handles, each learned from real data:

1. **Overlapping block ranges.** Some sections nest (`T07-T88` contains `T66-T78`).
   `blockIdFor()` picks the **narrowest** match. Getting this wrong sends a code to the
   wrong block and it appears not to exist.
2. **Group headings** (`umbrellas.json`) — 12 sections hold no codes but 4 carry notes over
   a whole range (`V00-V99` reaches 1,722 codes). They are a real inheritance level.
3. **Contradictory duplicates.** In **406 codes** the same sentence appears at two levels
   under two *different* note types — 400 of them Excludes1 against Excludes2. The
   canonical case is `I10`: the block prints the pregnancy exclusion as Excludes2,
   `I10` itself prints it as Excludes1. Showing both makes the tool tell a coder to do the
   forbidden thing. `reconcile()` keeps the deepest occurrence and records what it
   displaced; the UI renders that as a footnote. Prose lead-ins ending in `:` are skipped —
   the same lead-in under two types means nothing.
4. **Seventh characters.** `S72.001A` has no node in the source. `resolve()` strips the
   character, finds the base, walks up for the nearest seventh-character table, and rebuilds
   description and billable status. Placeholder `X` padding is handled the same way
   (`T74.4XXA` → `T74.4`).

`check.js` calls `collectNotes()` too, so **a change here changes the conflict checker's
verdicts.** Verify both.

## Verification discipline

The hard lesson from this project: a bundle once shipped that rendered its own stylesheet as
body text, and **every behavioural check passed** — the scripts still ran, so `innerText`
assertions on all 18 routes came back clean. Function and appearance are separate claims.

- **Screenshots are available** via the Browser pane (`preview_start` / `navigate`, then
  `computer{action:"screenshot"}`). An earlier version of this file said they were not; that was
  wrong, and it cost a round of "verified" claims that were only behavioural. Look at the page.
  Still say which you tested — looking and asserting are different claims.
- For rendering, assert on **computed styles**: `document.styleSheets[0].cssRules.length`
  — **320** in v1, **610** in the v2 bundle — plus a signature property on a signature element
  per screen, plus
  `scrollWidth - clientWidth` for overflow and a regex for CSS text leaking into the body.
- `bundle.py` has a `check()` that HTML-parses the output and refuses to write if the
  `<style>` element did not survive or head quotes are unbalanced. Do not weaken it.
- Claims about the code set must be checked against the source XML, not from memory. The
  user has caught real errors this way; when they push back, go read the file.

## Test codes — version 1

These exercise the awkward paths. Use them, not toy data.

| Code | Why |
| --- | --- |
| `J44.1` | 4 own notes, 34 inherited; the tobacco rule comes from **Chapter 10**, not J44 |
| `I10` | the Excludes1/Excludes2 contradiction; 5 own of 23 |
| `R10.9` | every note inherited, none of its own |
| `S72.001A` | seventh character, table inherited from `S72` |
| `T74.4XXA` | placeholder `X` padding |
| `V03.10XA` | group-heading inheritance from `V00-V99` |
| `I10` + `O10.011` | conflict checker must say **cannot be coded together** |

Index-side: `#/index?q=broken`, `#/index?t=A.352` (bracketed two-code pair),
`#/neoplasm?q=lung`, `#/drug?q=acetaminophen`.

## Interface writing rules

The audience has never been taught coding conventions. Copy is part of the product.

- Plain language everywhere, official term second and smaller. "Never code these together",
  then *Officially called: Excludes1*.
- No jargon in buttons or empty states. Not "No results" — "Nothing matched that. Try a
  shorter word, or browse by chapter."
- Colour never carries meaning alone: every note type pairs a colour with an icon and a
  written label.
- Say where a rule came from, always. An unattributed rule is the problem this tool exists
  to fix.
- Be honest about gaps rather than faking them. The *changed instructional notes* tab
  explains that it needs a second edition instead of showing an empty list.

## Known open items — version 1

- **Changed instructional notes** needs `icd10cm_tabular_2026.xml` dropped into
  `Table and Index/` and a note-tree diff added to `build/build.py`. The tab is written.
- **Chapter-boundary noise.** Every chapter carries an Excludes2 naming all the other
  chapters (10 lines on Chapter 9). They are binding but low-value, and they sit as peers of
  real rules on the code page. Proposal, not yet built: collapse behind a "what this chapter
  does not cover" control. The conflict checker already suppresses them.
- **Block and chapter browse pages** show that level's raw notes with no hint that a code
  below may override one. A cross-reference would help.
- The **edition switcher** describes the single installed edition rather than switching.

---

# Version 2 — the ICD-10 Coder Workbench

Diagnosis **and** procedures, for auditors checking a whole chart. It is a second tool that
reuses version 1 rather than replacing it.

**Version 1 is never edited and never rebuilt.** `index.html`, `assets/app.css`,
`assets/js/**`, `data/**`, `build/build.py`, `build/bundle.py` and
`icd10cm-notes-explorer.html` all still carry their original timestamps. Check them with
`ls -la --time-style=+%Y-%m-%d` before claiming version 1 is untouched — v2 imports v1's
modules, so a mistake there reaches both tools.

## Layout

```
coder.html                     v2 dev shell (project root, so data/ still resolves)
assets/v2.css                  loaded AFTER app.css; PCS, guideline and figure styles only
assets/js2/**                  v2 modules; they import v1 modules read-only via ../js/*.js
Guidelines/                    the three official PDFs, kept as source
build/pdftext.py               stdlib PDF text extraction (no dependency added)
build/build_pcs.py             PCS + guidelines  ->  data-pcs/   (~40s)
build/bundle2.py               v2 single file  ->  icd10-coder-workbench.html  (8.4 MB)
data-pcs/                      GENERATED, 1,318 files, 48 MB — never hand-edit, always rebuild
SOURCES.md                     every source and credit; kept OUT of the tool, by request
icd10-coder-workbench.html     GENERATED single-file build for sharing
```

## Running it

```bash
python serve.py 8123          # /index.html is v1, /coder.html is v2, same server
python build/build_pcs.py     # rebuild data-pcs/ after touching a source file
python build/bundle2.py       # rebuild the shareable single file
```

Both builds must be re-run after any change to `assets/js2/**` or `data-pcs/` before you claim
the shareable file is current. `bundle2.py` inlines a snapshot; editing a module does not update
it.

## v2 module map

Dependency direction is one-way, as in v1: `main2.js` imports everything and nothing imports
`main2.js`. `bundle2.py` fails loudly if a cycle appears.

| Module | Role |
| --- | --- |
| `pcsdata.js` | **the engine** — loading, `optionsFor()`, `rowFor()`, `describe()`, `rootOperations()`, `OP_GROUPS` |
| `pcsui.js` | rendering helpers: `charBoxes()`, `cite()`, `renderBlocks()`, `linkifyPcs()`, `wireScrollLinks()`, `scrollToSection()` |
| `decide-content.js` | the 43 decision cards — the only hand-written coding content in the tool |
| `anatomy.js` | the 23 figures and their drawing toolkit |
| `store2.js` | localStorage under its own key, `icd-coder-workbench/v2`; theme is deliberately shared with v1 |
| `views/*.js` | one file per screen (11 of them) |
| `main2.js` | boot, the two-tier nav, the hash router |

`views/keys.js` carries all five reference keys as tabs — Body Part, Device, Substance, New
Technology and the Device Aggregation Table — so every generated key file is surfaced.

v2 imports these v1 modules **unmodified**: `js/ui.js`, `js/store.js`, `js/data.js`,
`js/search.js`, `js/guided.js`, and every `js/views/*.js`. All the CM screens in v2 are v1's
screens. PCS-only state went into `store2.js` rather than editing `store.js`.

## The builder is proved, not assumed

`build_pcs.py` expands every `pcsRow` (the product of its four axes) and checks the result is
**set-equal in both directions** to the 79,256 codes in the official code file. It refuses to
write if it is not. That is what makes "you cannot build an invalid code" a fact rather than a
hope. Do not weaken `verify_tables()`.

`check_cards()` is the other load-bearing check. The build fails if a card cites a guideline that
does not exist, if a card has no rule, if any of the 31 root operations is uncovered, or if a card
names a diagram id that is not in `anatomy.js`. Exhaustiveness is enforced, not promised — so
adding a card with a typo'd rule id breaks the build rather than shipping an unsourced assertion.

A good build prints, and all of these are assertions rather than decoration:

```
tables: 918   rows: 2801   codes generated: 79256
verified: the tables generate exactly the 79256 official codes
definitions: 16 sections, 31 M&S root operations, body part key 329, device key 147, ...
index: 27 letters, 3440 main terms, 25023 searchable lines
PCS guidelines: 10 groups, 66 numbered guidelines (A1 ... F)
CM guidelines: 4 top sections, 490 nodes, 22 chapters mapped
decision cards: 43, citing 55 of 66 guidelines, covering all 31 root operations
```

## The engine

`pcsdata.js` `optionsFor(table, picks, i)` is the whole builder: it relaxes position `i` and
returns only the values still reachable given the other three picks, because **PCS values are
only valid within one row**. Everything the builder offers comes from there. A "combine any
value from any column" implementation would produce codes that do not exist, which is the single
most damaging bug this tool could ship.

`rows(txt)` splits TSV on `\n` **and tolerates a trailing `\r`**. Do not remove that. The
matching build-side rule is `write_text()`, which opens with `newline=""` so Python does not
emit CRLF. Get either wrong and the last column of every row gains a `\r`, which silently
becomes part of a code (`0FB4%0D` in a link). The same latent bug exists in **v1's** data and
shows there as a blank "Chapter · block" caption under every search result. It has been left
alone under the do-not-touch-v1 rule; a spun-off task covers it.

## Text out of the PDFs

`pdftext.py` reads the guideline PDFs with the standard library only. Three things it had to be
taught, all of which will bite again if reverted:

1. Compressed streams have no newline before `endstream` — trust the direct `/Length`.
2. `Td` / `TD` operands are in **unscaled text units** — multiply by the text-matrix scale, or
   lines come back scrambled and merged.
3. Font dictionaries live inside compressed `/ObjStm` object streams, so a raw byte scan for
   `/ToUnicode` finds nothing. Fonts are classified per page, and the build refuses only when a
   composite font actually draws text.

`build_pcs.py` `mend()` then repairs the three spacing artefacts a PDF always produces:

| Artefact | Example | Rule |
| --- | --- | --- |
| a space inside a word | `T o identify` | only at the start of a sentence, and `A` / `I` are held out because they are words — joining them gives `Apatient` |
| a space before punctuation | `characters .` | always wrong in English |
| a split code range | `U00- U85` | only between two code-shaped tokens |

**Wording is never touched.** The guidelines are quoted, not edited, and `mend()` restores what
the published page says rather than changing it. It runs in `paragraphs()` and on node labels,
topics and examples — all four, or artefacts survive in headings while bodies look clean.

The check that this is working: sweep the rendered text of every route for `\s[,.;:]`, a
replacement character, `[a-z]\.[A-Z]`, and doubled words. It found 40+ before `mend()` and
finds **zero** now.

## The figures

`assets/js2/anatomy.js`, 23 of them, all original schematics drawn for this tool. Nothing is
traced or adapted from any atlas or image library, so there is no licence to carry.

### The four layout rules

They are stated in the file header and they exist because the first version shipped labels
sitting on top of the artwork and text falling off the edge of the viewBox — which is exactly
the failure the user reported, twice.

1. Nothing is drawn outside the viewBox.
2. Labels never sit on the artwork. They live in a left or right gutter and reach what they name
   with a leader line ending in a dot (`labelL()` / `labelR()`).
3. Callout boxes size themselves to the number of lines they hold (`callout()`, `codeChip()`),
   so text cannot overflow a box.
4. Long prose lives in the HTML `caption`, not in the SVG. A figure carries names and values.

### Enforce them with the geometry check, not by eye

```js
// paste in the browser console on any v2 page
const m = await import('/assets/js2/anatomy.js?v=' + Date.now());
const host = Object.assign(document.createElement('div'),
  {style: 'position:absolute;left:-9999px;top:0;width:900px'});
document.body.appendChild(host);
const bad = [];
for (const id of m.diagramIds()) {
  host.innerHTML = m.DIAGRAMS[id].svg;
  const svg = host.querySelector('svg'), vb = svg.viewBox.baseVal;
  const B = [...svg.querySelectorAll('text')].map(t => ({b: t.getBBox(), s: t.textContent.trim()}));
  for (const {b, s} of B)
    if (b.x < -1 || b.y < -1 || b.x + b.width > vb.width + 1 || b.y + b.height > vb.height + 1)
      bad.push(id + ' OUTSIDE: ' + s);
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    const a = B[i].b, c = B[j].b;
    if (Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x) > 2 &&
        Math.min(a.y + a.height, c.y + c.height) - Math.max(a.y, c.y) > 2)
      bad.push(id + ' OVERLAP: ' + B[i].s + ' / ' + B[j].s);
  }
}
host.remove(); bad;   // must be []
```

It must come back empty. It does today. **This is a necessary check, not a sufficient one** —
it cannot tell you a heart looks like a bag rather than a heart. Take a screenshot as well.

### Drawing conventions

- Anatomy is drawn as seen from the **front**, so the patient's right is on the **left** of the
  picture. Get this backwards and the RCA ends up on the wrong side.
- The coronary map (`coronary`) and the bypass (`cabg`) share one drawing via `heartArt()`, so a
  coder who has learnt the map can read the bypass without re-orienting.
- In the approach figure, **red only ever marks something the surgeon did**. That is what
  separates Open (red cut faces on the gap) from Via Natural or Artificial Opening (the same gap,
  no red anywhere, because nothing was cut). The distinction is drawn, not written, and it is the
  point of the panel — an earlier version drew the opening as a 16px hook in the corner and the
  user could not read it at all.
- Colour never carries meaning alone. Anything drawn in a colour is named — in a gutter label,
  or in `legendRow()`.

### The hoisted helpers

`heartArt()`, `nodeBox()`, `arw()` and `legendRow()` are **function declarations** on purpose.
`DIAGRAMS` is built while the module is evaluated, so a `const` helper defined after it would be
in the temporal dead zone. Do not convert them to arrow functions or move them above and "tidy
up".

### Adding a figure

Add the entry to `DIAGRAMS`, put its id on a shelf in `views/bodymaps.js` (otherwise it lands in
a fallback "Also here" group), run the geometry check, look at it, and — if a card points at it —
re-run `build_pcs.py` so `check_cards()` can confirm the id resolves.

## No sources or credits inside the tool

A standing product decision, made by the user: **resource lists, provenance blocks and credits do
not appear in the interface.** They live in `SOURCES.md`. Do not re-add a "where this came from"
section to a view.

What does stay, because it is coding information rather than a credit: **guideline citations**
(`B3.8`, `I.C.19.g.3.a`), the statement of which edition a quoted rule comes from, and the note
that the Detachment grid was set out by hand and checked against tables `0X6` / `0Y6`. An auditor
has to be able to tell an official rule from this tool's paraphrase of one.

Related: the free CC BY medical-art library is **Servier** (`smart.servier.com`), not Elsevier —
Elsevier's is subscription-licensed and cannot be redistributed. Servier's licence would require
a visible credit, which conflicts with the rule above; that is why the figures are original.
`SOURCES.md` records this in full.

## Navigation

The app routes off `location.hash`, so a plain `href="#section"` reads as a **route change**,
finds no route, and dumps the reader on the home screen. In-page jumps use `data-scroll` plus
`wireScrollLinks()` / `scrollToSection()` in `pcsui.js`.

`scrollIntoView` is not used, for two reasons: the sticky top bar covers the heading it just
scrolled to, and `behavior: "smooth"` is **silently ignored in some embedded browsers**, so the
page does not move at all and the reader is left staring at where they started. `scrollToSection()`
measures `.topbar` and calls `window.scrollTo` explicitly.

Mode is derived from the route, not stored: every entry in `ROUTES` carries `mode: 'cm' | 'pcs'`,
and `route()` sets `hidden` on the two `.subnav` rows from it. So a deep link to `#/build` shows
the procedure tabs without anything else having to be told.

`.subnav[hidden] { display: none; }` in `v2.css` is load-bearing — without it the class selector
`.subnav { display: flex }` beats the browser's own `[hidden]` rule and **both** rows of tabs
show at once, whichever mode you are in.

## Verifying a change to v2

Function, appearance and text are three separate claims. Say which you checked.

1. **Data** — `python build/build_pcs.py`. Its assertions are the strongest evidence in the
   project; if it writes, the code set is right.
2. **Behaviour** — sweep every route in both the dev shell and the bundle, asserting
   `innerText.length`, `scrollWidth - clientWidth <= 4`, and no CSS text leaking into the body.
   25 routes today.
3. **Rendering** — `document.styleSheets[0].cssRules.length` is **610** in the v2 bundle and
   **320** in v1. A bundle once shipped that rendered its own stylesheet as body text and every
   behavioural check passed.
4. **Text** — the corruption sweep described under *Text out of the PDFs*.
5. **Figures** — the geometry check, plus a screenshot.
6. **Regression on v1** — timestamps unchanged, and all of v1's routes still pass.

## PCS test codes

These exercise the awkward paths. All were checked against `data-pcs/codes.tsv` before use.

| Code | Why |
| --- | --- |
| `021109W` | coronary bypass; 4th character counts arteries bypassed **to**, 7th names the vessel bypassed **from** — the reverse of every other bypass |
| `02100Z9` | LIMA graft — device `Z`, because the mammary artery stays attached to its own origin |
| `06BQ4ZZ` | the saphenous vein harvest; a separate code under B3.9 because the qualifier names the aorta, not the leg |
| `0BTG0ZZ` vs `0BBL0ZZ` | Resection of a lobe against Excision of the lung — all of a *value*, not all of the organ |
| `0SG00AJ` | fusion; one qualifier carries approach direction **and** column |
| `0DTJ4ZZ` | Resection of Appendix — a whole value through a percutaneous endoscopic approach |
| `0X6` / `0Y6` tables | the Detachment qualifier grid, which does not survive PDF extraction and is set out by hand |

Index-side: `#/pcsindex?q=Fontan` (an eponym that resolves to a code) and
`#/pcsindex?q=Impella` (a device trade name that resolves by `use` with no code of its
own). Builder-side: `#/pcstable/021`, `#/build?c=021`.

## Known open items — v2

- **The Reference Manual is FY2016.** CMS has not reissued it. It is used for structure and
  explanation only, and where it disagrees with FY2027 the guidelines or tables win. Known drift:
  B3.7 (Control) and B3.18 have been revised or added since; Detachment qualifiers and several
  body-part values have changed.
- **11 of the 66 PCS guidelines have no decision card.** `check_cards()` reports the count each
  build (55 of 66 today). They are reachable in full on the Guidelines screen; they just have no
  plain-language explainer.
- **No CM-side decision cards.** The confusables work is procedure-only so far; the CM guidelines
  are reproduced but not explained.
- **The figures are schematics, deliberately.** If a coder needs to understand the anatomy itself
  rather than which value carries which name, they need an anatomy text, and the tool does not
  pretend otherwise.
