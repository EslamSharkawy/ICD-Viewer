# ICD-10 coding tools — FY2027

Two browser tools built from the official **FY2027** ICD-10-CM and ICD-10-PCS release files
published by NCHS and CMS, which are already in this folder. No content is invented and none is
hard-coded — everything on screen is derived from those files at build time.

Both run in a browser. Neither needs an install, an account, or a network connection once open.
Nothing you type ever leaves your machine.

## Which one do you want?

| | **ICD-10-CM Notes Explorer** | **ICD-10 Coder Workbench** |
| --- | --- | --- |
| Covers | Diagnosis notes | Diagnosis **and** procedures |
| Written for | Beginner coders, students, researchers | Auditors checking a whole chart |
| Open | `index.html` | `coder.html` |
| One file to share | `icd10cm-notes-explorer.html` (6.2 MB) | `icd10-coder-workbench.html` (8.4 MB) |
| Answers | "What rules apply to this code, and where did each one come from?" | That, plus "Which procedure code is this, and how do I prove it?" |

The Workbench **contains** the Notes Explorer — all eight of its screens are there, unchanged, on
the *Diagnosis* side of the mode switch, joined by a ninth for the ICD-10-CM Official Guidelines.
If you only ever code diagnoses, the smaller tool is less to look at. If you touch procedures at
all, take the Workbench.

Sources and credits for both are in **`SOURCES.md`**, deliberately kept out of the interfaces.

```bash
python serve.py 8123     # http://localhost:8123/index.html   -> Notes Explorer
                         # http://localhost:8123/coder.html   -> Coder Workbench
```

### If you have just cloned this repository

The two generated data folders are not committed — they are rebuilt from the official source
files that are. Run both builds once before using the live versions:

```bash
python build/build.py         # writes data/       (~30s)
python build/build_pcs.py     # writes data-pcs/   (~40s)
python serve.py 8123
```

Nothing but the Python 3.13 standard library is needed. If you only want to *use* a tool rather
than work on it, skip all of that and open `icd10cm-notes-explorer.html` or
`icd10-coder-workbench.html` directly — they are committed, self-contained, and need no build.

---

# ICD-10-CM Notes Explorer

A web interface for reading the instructional notes of the ICD-10-CM Tabular List —
including the notes a code **inherits** from the category, block and chapter above it,
which is the part a printed code book cannot show you in one place.

Built for beginner coders, coding students and non-technical researchers. Nothing in it
assumes you already know what "Excludes1" means.

It covers 47,025 tabular entries in 285 blocks, 74,879 billable codes, 24,762 instructional
notes and 8,130 index main terms, plus the neoplasm table and the table of drugs and chemicals.

## Two ways to use it

### One file, to share

```bash
python build/bundle.py
```

Writes **`icd10cm-notes-explorer.html`** — about 6 MB, everything inside it. Email it, drop it on a
shared drive, put it on a USB stick. Whoever opens it needs no server, no install and no network;
double-clicking the file is enough. Verified to make zero network requests once open.

The 32 MB of data is gzipped and base64'd into the page and unpacked in the browser on load, which
takes a second or two behind a progress screen. That needs `DecompressionStream` — Chrome, Edge,
Firefox 113+ and Safari 16.4+ all have it, and the page says so plainly if the browser does not.
Starred codes and private notes use the browser's local storage, which some browsers restrict for
files opened directly from disk; if it is unavailable the tool still works, it just stops remembering.

### Live, while working on it

```bash
python serve.py
```

Then open <http://localhost:8000> — or pass a port, `python serve.py 8123`. In this mode the
data files are fetched over http, so opening `index.html` straight off the disk will not work —
use the single-file build for that.

If you change anything in `Table and Index/` or `Code Descriptions/`, rebuild first:

```bash
python build/build.py
```

The build takes about half a minute and needs nothing but the Python standard library.

## What is in it

| Screen | What it does |
| --- | --- |
| **Search** | One box that works out whether you typed a code, a condition in everyday words, or a phrase to hunt for inside the note text. |
| **Code detail** | The main event. Breadcrumb of all four levels, then every rule that applies, grouped by type and colour, each line badged with the level it came from. |
| **Browse by chapter** | 22 chapters as cards, expanding down through blocks, categories and codes, with note counts at every level. |
| **Look up a condition** | The Alphabetic Index, with its indentation drawn rather than implied, and a *Confirm in the tabular list* button on every code. |
| **Growths / Substances** | The neoplasm and drug grids, with plain-language column headers over the official ones. |
| **Check for conflicts** | Paste an account's codes and get clashes, permissive pairs, and missing partner codes, each traced to the note and level that caused it. |
| **What's new** | FY2026 → FY2027 additions, retirements and rewordings, from the official addenda. |
| **Glossary** | Every convention explained once, in plain words, with a real worked example. |

Global: light and dark mode, a walk-through toggle that paces the index-then-confirm
habit, an edition panel, starred codes, recently viewed, per-code private notes, and a
print stylesheet for the code detail screen. Everything personal is stored in the
browser and never leaves the machine.

## How inheritance is worked out

`assets/js/data.js` is where the real work happens. `resolve()` locates a code in its
block file and collects its ancestors; `collectNotes()` then assembles the notes from
the chapter, the block, each ancestor category, and the code itself — in that order —
tagging every line with its origin so the interface can badge and indent it.

Some details worth knowing:

- **There is a fifth level in a few places.** A dozen sections in the source data are
  group headings spanning several blocks — `V00-V99`, `T20-T32`, `M00-M25`, `Y62-Y84`.
  Four of them carry notes that reach every code in the range. They appear in the
  breadcrumb as **Group** and their notes are badged `from V00-V99 (group)`.
- **A note can be inherited in a form that contradicts the code's own.** In 406 codes the
  same sentence is printed at two levels under two different note types. `I10` is the
  clearest: the block `I10-I1A` prints "hypertensive disease complicating pregnancy
  (O10-O11, O13-O16)" as an **Excludes2**, and `I10` itself prints the identical sentence
  as an **Excludes1** — permissive and forbidding, side by side. (The reason is that
  `O10.0` carries the inclusion term "Any condition in I10 specified as a reason for
  obstetric care", so it already contains I10.) `reconcile()` in `data.js` keeps the most
  specific occurrence as the operative rule, drops the rest, and makes the surviving line
  state what it displaced. 400 of the 406 are Excludes1 against Excludes2. Prose lead-ins
  ending in a colon are left alone, and same-level clashes are reported rather than
  resolved — there are none in FY2027, but the path exists.
- **Seventh characters are inherited too.** A code such as `S72.001A` has no node of its
  own in the source data. The app strips the seventh character, finds `S72.001`, walks up
  for the nearest seventh-character table (it lives at `S72`), and reconstructs the full
  description and billable status from the extension. Placeholder `X` padding is handled
  the same way, so `T74.4XXA` resolves correctly.
- **The demonstration case moved.** The brief expected the tobacco *use additional code*
  instruction to sit at `J44`. In FY2027 it is printed at the top of **Chapter 10** and
  reaches every respiratory code from there. The interface shows where the rule actually
  is, which makes the teaching point sharper rather than weaker: J44.1 carries 4 notes of
  its own and inherits 34.

## Data layout

`build/build.py` writes everything into `data/`:

```
meta.json            edition and effective dates
chapters.json        chapter and block metadata, counts, plain-language names
chapter-notes.json   the notes printed at the top of each chapter
blockmap.json        code-range → block lookup
umbrellas.json       the group headings that span several blocks
blocks/<id>.json     one file per block: its notes and the full tree of codes below it
codes.tsv            flat list of all 47,025 entries for searching
notes.tsv            every instructional note, flattened, for note-text search
index/<letter>.json  the alphabetic index, one file per letter
index-main.json      the 8,130 main terms
index-search.tsv     one searchable line per index entry, with its full trail
rindex/<letter>.json reverse lookup: code → every index trail that arrives at it
neoplasm.json        the neoplasm grid
drug.json            the table of drugs and chemicals
whatsnew.json        the FY2026 → FY2027 addenda
```

Big files are loaded lazily: the block a code lives in, the letter of the index you are
reading, the note text only when you search inside notes. Only `codes.tsv` (3.4 MB) is
needed for a plain search.

## Known limits

- **Changed instructional notes** on the *What's new* screen needs two editions installed.
  The official addenda file covers codes and descriptions only, not notes. Drop last
  year's `icd10cm_tabular_2026.xml` into `Table and Index/` and extend `build/build.py`
  to diff the two note trees; the tab is written and waiting for the data.
- The **edition switcher** describes the one edition that is installed rather than
  switching between several, for the same reason.
- The conflict checker deliberately ignores the chapter-level Excludes2 notes that say
  "this belongs in another chapter". Every chapter carries them about every other chapter,
  and listing them would bury the findings that matter.

## Source files

Official releases, left untouched:

- `Table and Index/` — tabular list, alphabetic index, external-cause index, neoplasm and
  drug tables (XML and PDF).
- `Code Descriptions/` — the billable code list and the year-on-year addenda.

The Coder Workbench reads the ICD-10-PCS files from the same two folders, plus `Guidelines/`
for the three official PDFs. Full details and credits are in `SOURCES.md`.

---

# ICD-10 Coder Workbench

Everything above, plus **ICD-10-PCS** and both sets of **Official Guidelines**, for people who
have to check or defend a procedure code.

ICD-10-PCS is a different problem from ICD-10-CM. There is nothing to "look up": a procedure code
is **built**, seven characters at a time, from a table. And the hard part is not the mechanics —
it is the clinical judgement behind character 3 (root operation), character 4 (body part) and
character 6 (device). Excision or Resection? Release or Division? Does the graft harvest get its
own code? Those calls assume operating-theatre knowledge that a coder without a clinical
background does not have, and getting one wrong changes the code, the DRG and the payment.

So the Workbench is built around three things: the classification, the rules, and the judgement.

```bash
python serve.py 8123      # then http://localhost:8123/coder.html
```

## What it adds

| Screen | What it does |
| --- | --- |
| **Search** | One box for a PCS code, a procedure in everyday words, or an index term. |
| **Build a code** | The core screen. Builds a code one character at a time from the official tables, offering **only values that share a row** — so an invalid code cannot be constructed. It shows the growing code, its official title, and a plain reading of every character, with the relevant explainer one click away at each step. |
| **Tables** | All 918 tables, searchable, each showing what it can and cannot make. |
| **Index** | The 3,440 alphabetic index main terms, including eponyms and device trade names, with `see` and `use` references resolved. |
| **Root operations** | All 31, arranged in CMS's own nine objective groups — so the ones people confuse sit side by side, because a group shares an objective and its members differ on one point. |
| **Which one do I pick?** | 43 cards on the decisions that actually change a code, each citing the official guideline that settles it and linking to real codes you can open in the builder. |
| **Body maps** | 23 diagrams, for the decisions that are really about *where in the body* something happened. |
| **Reference keys** | Body Part Key, Device Key, Substance Key, New Technology Key and the Device Aggregation Table — for when the word the surgeon wrote is not a PCS value. |
| **Guidelines** | The ICD-10-PCS and ICD-10-CM Official Guidelines FY2027, both in full, searchable, quoted rather than paraphrased, and cross-linked to the cards that explain them. |
| **What's new** | The FY2026 → FY2027 changes: 101 codes added, 38 deleted, 3 reworded. |

The **mode switch** at the top left chooses diagnosis or procedures. The tabs beneath it belong to
whichever mode is showing — you never see the other set.

## The builder cannot make a code that does not exist

This is the claim the whole tool rests on, so it is proved rather than asserted.

PCS values are only valid **within one row of a table**. Take a value from one row and a value
from another and you get something that looks like a code and is not. The builder therefore
offers, at every character, only the values still reachable given the choices already made.

At build time, every row of all 918 tables is expanded and the result is compared against the
official code file **in both directions**. It comes to exactly **79,256** codes, matching the
official list with nothing extra and nothing missing. If it ever did not, the build would refuse
to write.

## "Which one do I pick?" — and how it is kept honest

The cards cover the points where the classification asks a coder to make a judgement: Excision vs
Resection, Release vs Division, Occlusion vs Restriction, Insertion vs Supplement vs Replacement,
bypass direction, coronary counting, graft harvesting and graft materials, Detachment levels, the
approach values, how many codes a procedure needs, what counts as integral, and the rest.

Each card gives the deciding question in one sentence, the rule in plain language, the official
text quoted with its guideline number, and the worked examples from the guideline itself.

The list is not hand-picked and hoped over. The build **fails** if a card cites a guideline that
does not exist, if a card names no rule at all, if any of the 31 root operations is left uncovered,
or if a card points at a diagram that is not there. Today: 43 cards, citing 55 of the 66 numbered
PCS guidelines, covering all 31 root operations. The remaining 11 guidelines have no explainer
yet; they are still there in full on the Guidelines screen.

## Body maps

Some PCS decisions are spatial, and asking someone without a clinical background to make them
from words alone is unfair. The 23 diagrams cover:

- **Depth, layers and levels** — how deep a debridement went, what is skin over a joint and what
  is the joint, amputation levels along a limb, the two spinal columns.
- **How much, and by what means** — Excision against Resection, the five ways of taking a body
  part out, the three ways of taking out its contents, cutting to free against cutting to separate.
- **Tubes, routes and vessels** — what happened to the lumen, which end of a bypass is the body
  part, the coronary arteries and how PCS counts them, which segment of a vessel to code.
- **Material, devices and grafts** — what the material is doing to the body part, where the graft
  came from, whether the harvest is a second code.
- **Getting there** — the seven approach values drawn as routes into the body.
- **Operations worth drawing in full** — a coronary artery bypass, with the codes it produces and
  why three grafts make two codes plus the harvest.
- **Where the values live** — every 4th-character value of the heart, the airway, the digestive
  tract, the urinary tract and the biliary tree, laid out in the order the anatomy runs.

Every label on every figure is a real FY2027 PCS value or term, so what you read on a diagram is
what you will find in the table. They are schematics for **choosing a code**, drawn from scratch
for this tool — they are not anatomical illustrations and are no substitute for one.

## Two ways to use it

### One file, to share

```bash
python build/bundle2.py
```

Writes **`icd10-coder-workbench.html`** — 8.4 MB, everything inside it. Email it, drop it on a
shared drive, put it on a USB stick. Whoever opens it needs no server, no install and no network.

It carries both data sets — 1,318 files, 48 MB — gzipped and base64'd into the page and unpacked
in the browser on load, which takes a moment behind a progress screen. That needs
`DecompressionStream`: Chrome, Edge, Firefox 113+ and Safari 16.4+ all have it, and the page says
so plainly if the browser does not.

### Live, while working on it

```bash
python serve.py 8123
```

Then open <http://localhost:8123/coder.html>. Data files are fetched over http in this mode, so
opening `coder.html` straight off the disk will not work — use the single-file build for that.

After changing anything in `Table and Index/`, `Code Descriptions/` or `Guidelines/`:

```bash
python build/build_pcs.py     # about 40 seconds
```

Like the rest of the project it needs nothing but the Python standard library. The guideline PDFs
are read by a text extractor written for this repo rather than by adding a dependency.

## Data layout

`build/build_pcs.py` writes 961 files into `data-pcs/`, kept separate from the Notes Explorer's
`data/` so the original tool's build is untouched:

```
meta.json              edition, effective dates, code count
sections.json          the 17 sections and their body systems
tablemap.json          all 918 tables: id, section, body system, operation, code count
tables/<id>.json       one file per table: every row, every axis, every value
codes.tsv              all 79,256 official codes and titles
index/<letter>.json    the alphabetic index, one file per letter
index-main.json        the 3,440 main terms
index-search.tsv       one searchable line per index entry
defs.json              root-operation definitions, explanations and examples
bodypartkey.json       329 anatomical terms mapped to body-part values
devicekey.json         147 device trade names and everyday words
substancekey.json      20 substances for the Administration section
newtechkey.json        the New Technology key for section X
deviceagg.json         60 rows of the Device Aggregation Table
guidelines-pcs.json    all 66 numbered PCS guidelines, in 10 groups
guidelines-cm.json     the CM guidelines: 490 nodes, 22 chapters mapped
refmanual.json         the CMS Reference Manual, for structure and explanation
whatsnew-pcs.json      the FY2026 → FY2027 addenda
```

Everything is loaded lazily — the table you opened, the letter of the index you are reading, the
guideline document you are in.

## Known limits

- **The CMS ICD-10-PCS Reference Manual is the FY2016 edition.** CMS has not reissued it. It is
  used only for structure and explanation — the nine objective groups, the approach definitions,
  the device classification. Where it disagrees with the FY2027 guidelines or tables, **FY2027
  wins**, and the tool follows FY2027.
- **11 of the 66 PCS guidelines have no plain-language card yet.** They are reproduced in full on
  the Guidelines screen; they just have no explainer.
- **The diagnosis guidelines are reproduced but not explained.** The "which one do I pick?" work
  is procedure-side so far.
- **The diagrams are schematics on purpose.** They show which structure carries which PCS value
  and which layer is deeper than which. If you need to understand the anatomy itself, you need an
  anatomy text.
- **No AHA *Coding Clinic* content.** It is copyrighted and cannot be redistributed. Where the
  Guidelines genuinely do not settle a question, the tool says so rather than quoting advice it
  is not free to reproduce.

---

## A note on the module layout — both tools

`build/bundle.py` and `build/bundle2.py` each wrap every JavaScript module in its own function
with a small `require` shim, so same-named helpers in different files cannot collide. That needs a
dependency graph with no cycles, which is why the guided-mode helpers live in
`assets/js/guided.js` rather than in `main.js` — every view needs them, and `main.js` imports
every view. Both bundlers fail loudly if a cycle is ever reintroduced, rather than emitting a
subtly broken file.

There is no Node, no npm, no bundler dependency and no package manager anywhere in this project.
Both tools are vanilla ES modules with hash routing, and every build script is Python 3.13
standard library only.
