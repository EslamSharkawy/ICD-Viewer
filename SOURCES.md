# Sources and credits — ICD-10 Coder Workbench

Everything the tool asserts traces to one of the documents below. Nothing about the code set,
the rules, or the anatomy is written from memory.

None of this is printed inside the tool, by request. This file is the record.

---

## 1. The code set and the rules (primary, and binding)

All published by the **Centers for Medicare & Medicaid Services (CMS)** and the
**National Center for Health Statistics (NCHS)**, U.S. Department of Health and Human Services.
U.S. Government works — public domain, free to reproduce.

| File in this project | What it is | What it governs in the tool |
| --- | --- | --- |
| `Table and Index/icd10pcs_tables_2027.xml` | FY2027 ICD-10-PCS Tables — 918 tables, 2,801 rows | **The only authority on which codes exist.** The builder generates codes from these rows and nothing else. |
| `Code Descriptions/icd10pcs_codes_2027.txt` | FY2027 ICD-10-PCS official code titles — 79,256 codes | Every code title shown. Also the proof: expanding all rows reproduces exactly these 79,256 codes, checked both directions at build time. |
| `Table and Index/icd10pcs_definitions_2027.xml` | FY2027 ICD-10-PCS Definitions | Root-operation definitions, explanations and examples; Body Part Key (329 groups); Device Key; Substance Key; Device Aggregation Table |
| `Table and Index/icd10pcs_index_2027.xml` | FY2027 ICD-10-PCS Alphabetic Index — 3,440 main terms | The index screen, including eponyms, device trade names and `see` / `use` references |
| `Code Descriptions/icd10pcs_codes_addenda_2027.txt` | FY2026 → FY2027 addenda | The "What's new" screen |
| `Guidelines/icd10pcs-guidelines-2027.pdf` | **ICD-10-PCS Official Guidelines for Coding and Reporting, FY2027** | The binding procedure rules. Reproduced in full, quoted, never paraphrased in place. Highest authority in the tool. |
| `Guidelines/icd10cm-guidelines-2027.pdf` | **ICD-10-CM Official Guidelines for Coding and Reporting, FY2027** | The binding diagnosis rules, reproduced in full |
| `Table and Index/` (CM XML), `Code Descriptions/` (CM) | FY2027 ICD-10-CM Tabular List, Index, Neoplasm and Drug tables | The original Notes Explorer, unchanged |

Adherence to both sets of Official Guidelines is required under HIPAA.

### The one secondary document

| File | What it is | How it is used |
| --- | --- | --- |
| `Guidelines/icd10pcs-reference-manual-cms.pdf` | **CMS ICD-10-PCS Reference Manual** | CMS's own explanatory manual. Used for *structure and explanation only*: the nine official root-operation objective groups, the approach definitions, and Appendix B's device / substance / equipment classification. |

**Vintage caveat.** CMS has not reissued the Reference Manual since FY2016. Where it disagrees
with the FY2027 Guidelines or the FY2027 tables, **FY2027 wins**, and the tool follows FY2027.
Known drift that was handled explicitly: B3.7 (Control) and B3.18 (Excision or Resection followed
by Replacement) have been revised or added since; Detachment qualifiers and several body-part
values have changed.

---

## 2. The diagrams

**Every figure in `assets/js2/anatomy.js` is original work, drawn for this tool.** Nothing is
traced, copied, adapted or derived from any illustration, atlas or image library. There is no
third-party artwork in the build, and therefore no licence obligation and no attribution to
carry. That is deliberate — see the note on Servier and Elsevier below.

### What each label on a figure is checked against

1. **FY2027 ICD-10-PCS tables and Body Part Key** — *primary*. Every label on every figure is a
   real PCS body-part value, device value, qualifier or defined term, copied from these files.
   If a name does not appear there, it does not appear on a figure.
2. **FY2027 ICD-10-PCS Official Guidelines** — the rule each figure exists to draw: B3.5
   (overlapping layers), B3.6a/b (bypass direction and coronary counting), B3.8 (Excision vs
   Resection), B3.9 (graft harvesting), B3.10b (spinal columns), B3.12 (tubular body parts),
   B3.13 (Release vs Division), B3.19 (Detachment levels), B4.1c (proximal vessel), B4.4
   (coronary arteries), B4.5 (skin over a joint), B4.8 (upper/lower intestinal tract), B5.2a
   (approaches), B6.1a (device values).
3. **CMS ICD-10-PCS Reference Manual** — the approach definitions and the device classification
   the schematics render.
4. **SNOMED CT body structure hierarchy** — anatomical names and part-of relations were confirmed
   by query against a live SNOMED CT terminology server rather than recalled.
5. **Terminologia Anatomica (FIPAT / IFAA)** — the international standard for anatomical naming.
6. **Gray's *Anatomy of the Human Body*, 1918 edition** (public domain) and **OpenStax *Anatomy &
   Physiology*** (CC BY 4.0) — consulted for anatomical relations and proportions only. No image
   from either is reproduced or traced.

### Codes quoted on the figures

Each was verified against `data-pcs/codes.tsv` (the official FY2027 code list) before use:

`0BBL0ZZ` · `0BTG0ZZ` · `02100Z9` · `021109W` · `06BQ4ZZ` · `0RG10A0` · `0SG00AJ` ·
`0DTJ4ZZ` · `0DBJ4ZZ`

### A note on Servier and Elsevier

You suggested Elsevier Medical Art. Two things are worth knowing:

- **Elsevier's medical image libraries are subscription-licensed** (ClinicalKey, Netter / Elsevier
  Images). Their licences do not permit redistributing images inside a tool you hand to a team,
  so using them here would have been a licensing breach.
- **The free, authoritative library people usually mean is Servier Medical Art**
  (`smart.servier.com`), published by Servier under **Creative Commons Attribution 4.0**. It is
  genuinely good and genuinely free.

Servier's CC BY 4.0 licence requires the attribution to travel *with the work* — which conflicts
directly with your instruction that no resources be mentioned inside the tool. Rather than break
either the licence or your requirement, the figures were drawn from scratch. That also turned out
to be the better pedagogical choice: a Servier illustration shows what an organ looks like, while
these figures have to show *which structure carries which PCS value* and *which layer is deeper
than which* — which is a different picture.

If you later decide a visible credit line is acceptable, Servier Medical Art can be dropped in
under CC BY 4.0 with the line "Illustrations adapted from Servier Medical Art, licensed under
CC BY 4.0".

---

## 3. Tools and dependencies

None. Python 3.13 standard library only; the front end is vanilla ES modules with no framework,
no bundler and no package manager. The PDF text extractor (`build/pdftext.py`) was written for
this project rather than pulling in a library, per the standing rule in `CLAUDE.md`.

---

## 4. What is *not* a source

- No commercial encoder, grouper or coding-advice product.
- No AHA *Coding Clinic* content — it is copyrighted and not redistributable. Where a rule is
  genuinely unsettled by the Guidelines, the tool says so rather than quoting advice it cannot
  reproduce.
- No copyrighted anatomical atlas (Netter, modern Gray's, Thieme, Sobotta) — not consulted, not
  traced, not adapted.
