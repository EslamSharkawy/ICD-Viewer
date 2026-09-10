#!/usr/bin/env python3
"""
Turn the official ICD-10-PCS FY2027 release, both sets of official coding
guidelines and the CMS reference manual into the JSON the workbench reads.

Inputs (as shipped by CMS, already unzipped in this folder):
  Table and Index/icd10pcs_tables_2027.xml
  Table and Index/icd10pcs_index_2027.xml
  Table and Index/icd10pcs_definitions_2027.xml
  Code Descriptions/icd10pcs_codes_2027.txt
  Code Descriptions/icd10pcs_codes_addenda_2027.txt
  Guidelines/icd10pcs-guidelines-2027.pdf
  Guidelines/icd10cm-guidelines-2027.pdf
  Guidelines/icd10pcs-reference-manual-cms.pdf

Output: data-pcs/   (nothing here touches data/, which belongs to the original tool)

Run:  python build/build_pcs.py

The load-bearing check is in verify_tables(). A PCS code is not looked up, it is
built, so the builder is only trustworthy if the tables it offers can produce
every real code and nothing else. Expanding every pcsRow gives exactly the
official code set - 79,256 codes, set-equal in both directions - and the build
refuses to write if that ever stops being true.
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pdftext                                                    # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Table and Index")
DESC = os.path.join(ROOT, "Code Descriptions")
GUIDE = os.path.join(ROOT, "Guidelines")
OUT = os.path.join(ROOT, "data-pcs")

EDITION = "2027"

problems = []


def log(*a):
    print(*a, flush=True)


def fail(msg):
    problems.append(msg)


def text_of(el):
    if el is None:
        return ""
    return re.sub(r"\s+", " ", "".join(el.itertext())).strip()


def write_json(relpath, obj):
    path = os.path.join(OUT, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path)


def write_text(relpath, s):
    """Write a TSV with Unix line endings.

    newline="" matters. Without it Python translates every \\n to \\r\\n on
    Windows, and the browser - which splits on \\n and not on os.linesep - ends
    up with a stray carriage return glued to the last column of every row. It is
    invisible in the file and produces things like a link to "0FB4%0D".
    """
    path = os.path.join(OUT, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(s)
    return os.path.getsize(path)


# --------------------------------------------------------------------------
# The official code list. Titles come from here rather than being assembled
# from the axis labels, so a displayed title is always the official one.
# --------------------------------------------------------------------------

def load_codes():
    codes = {}
    path = os.path.join(DESC, "icd10pcs_codes_2027.txt")
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip():
                continue
            code, _, title = line.partition(" ")
            codes[code.strip()] = title.strip()
    log("official codes on file: %d" % len(codes))
    return codes


# --------------------------------------------------------------------------
# Tables - the part that actually defines which codes exist
# --------------------------------------------------------------------------

# Plain-language names for the sixteen sections. The official titles are
# accurate but tell a beginner nothing about when to reach for the section.
SECTION_PLAIN = {
    "0": ("Surgery and procedures on a body part",
          "The main section. Almost every operation in an inpatient chart is coded here."),
    "1": ("Pregnancy and the products of conception",
          "Only procedures on the products of conception. Anything done to the pregnant patient herself is section 0."),
    "2": ("Putting on or in a device without cutting",
          "Casts, splints, dressings, packing, traction and braces - applied, not implanted."),
    "3": ("Giving a substance",
          "Injections, infusions, transfusions, irrigation. Cells and blood products live here, not in Transplantation."),
    "4": ("Taking a measurement or monitoring",
          "Measuring a function once, or monitoring it over a period."),
    "5": ("Machines taking over a body function",
          "Ventilators, dialysis, cardiac assist - helping a function or performing it entirely."),
    "6": ("Whole-body therapies from outside",
          "Hyperthermia, phototherapy, hyperbaric oxygen, plasmapheresis and similar."),
    "7": ("Osteopathic treatment", "Manual osteopathic treatment of somatic dysfunction."),
    "8": ("Other procedures", "Acupuncture, meditation, yoga and a few other therapies."),
    "9": ("Chiropractic manipulation", "Chiropractic manipulation of the spine and other regions."),
    "B": ("Imaging", "Plain films, fluoroscopy, CT, MRI and ultrasound."),
    "C": ("Nuclear medicine", "Radioactive material introduced to create an image or to treat."),
    "D": ("Radiation therapy", "Beam radiation, brachytherapy and other radiation oncology."),
    "F": ("Rehabilitation and audiology",
          "Therapy, assessment, device fitting and caregiver training."),
    "G": ("Mental health", "Psychotherapy, counselling, electroconvulsive therapy and similar."),
    "H": ("Substance abuse treatment", "Detoxification, counselling and pharmacotherapy."),
    "X": ("New technology",
          "New devices and techniques given their own codes for a few years before they move into the main sections."),
}


def build_tables():
    tree = ET.parse(os.path.join(SRC, "icd10pcs_tables_2027.xml"))
    root = tree.getroot()

    tablemap = []
    sections = {}           # secCode -> {title, plain, blurb, bs: {bsCode: {title, ops:{}}}}
    generated = {}          # code -> tableId, built by expanding every row
    seen_ids = {}

    for tbl in root.findall("pcsTable"):
        head = {a.get("pos"): a for a in tbl.findall("axis")}
        if not all(p in head for p in ("1", "2", "3")):
            fail("a pcsTable is missing one of its first three axes")
            continue

        def axis1(pos):
            lab = head[pos].find("label")
            return lab.get("code"), text_of(lab)

        sec_c, sec_t = axis1("1")
        bs_c, bs_t = axis1("2")
        op_c, op_t = axis1("3")
        op_def = text_of(head["3"].find("definition"))
        tid = sec_c + bs_c + op_c

        # A handful of tables are printed in two parts in the book and share an
        # id. Merge their rows rather than letting the second overwrite the first.
        rows = []
        for prow in tbl.findall("pcsRow"):
            ax = []
            titles = []
            for pos in ("4", "5", "6", "7"):
                a = next((x for x in prow.findall("axis") if x.get("pos") == pos), None)
                if a is None:
                    ax.append([])
                    titles.append("")
                    continue
                titles.append(a.findtext("title", "").strip())
                ax.append([[l.get("code"), text_of(l)] for l in a.findall("label")])
            rows.append({"n": int(prow.get("codes") or 0), "ax": ax, "t": titles})

            # expand this row into codes
            for b in ax[0] or [[None, None]]:
                for ap in ax[1] or [[None, None]]:
                    for dv in ax[2] or [[None, None]]:
                        for q in ax[3] or [[None, None]]:
                            if None in (b[0], ap[0], dv[0], q[0]):
                                continue
                            generated[tid + b[0] + ap[0] + dv[0] + q[0]] = tid

        if tid in seen_ids:
            payload = seen_ids[tid]
            payload["rows"].extend(rows)
        else:
            payload = {
                "id": tid,
                "sec": [sec_c, sec_t],
                "bs": [bs_c, bs_t],
                "op": [op_c, op_t],
                "def": op_def,
                "rows": rows,
            }
            seen_ids[tid] = payload

        s = sections.setdefault(sec_c, {
            "code": sec_c, "title": sec_t,
            "plain": SECTION_PLAIN.get(sec_c, (sec_t, ""))[0],
            "blurb": SECTION_PLAIN.get(sec_c, (sec_t, ""))[1],
            "axisTitles": [head[p].findtext("title", "").strip() for p in ("1", "2", "3")],
            "bs": {},
        })
        b = s["bs"].setdefault(bs_c, {"code": bs_c, "title": bs_t, "ops": {}})
        b["ops"][op_c] = {"code": op_c, "title": op_t, "def": op_def, "table": tid}

    for tid, payload in seen_ids.items():
        write_json("tables/%s.json" % tid, payload)
        codes_in = sum(r["n"] for r in payload["rows"])
        tablemap.append([tid, payload["sec"][0], payload["bs"][0], payload["op"][0],
                         payload["op"][1], payload["bs"][1], len(payload["rows"]), codes_in])

    tablemap.sort(key=lambda r: r[0])
    write_json("tablemap.json", tablemap)

    ordered = []
    for c in sorted(sections, key=lambda k: (k.isdigit() is False, k)):
        s = sections[c]
        s["bs"] = [s["bs"][k] for k in sorted(s["bs"])]
        for b in s["bs"]:
            b["ops"] = [b["ops"][k] for k in sorted(b["ops"])]
        ordered.append(s)
    write_json("sections.json", ordered)

    log("  tables: %d   rows: %d   codes generated: %d" %
        (len(seen_ids), sum(len(p["rows"]) for p in seen_ids.values()), len(generated)))
    return generated


def verify_tables(generated, official):
    """The tables must generate the official code set exactly - nothing more,
    nothing less. If this ever fails the builder would offer combinations that
    are not real codes, or hide ones that are."""
    gen, off = set(generated), set(official)
    missing = off - gen
    extra = gen - off
    if missing:
        fail("the tables do not generate %d official codes, e.g. %s"
             % (len(missing), sorted(missing)[:5]))
    if extra:
        fail("the tables generate %d combinations that are not official codes, e.g. %s"
             % (len(extra), sorted(extra)[:5]))
    if not missing and not extra:
        log("  verified: the tables generate exactly the %d official codes" % len(off))


# --------------------------------------------------------------------------
# Definitions: root operations, approaches, devices, and the four keys
# --------------------------------------------------------------------------

def build_defs():
    root = ET.parse(os.path.join(SRC, "icd10pcs_definitions_2027.xml")).getroot()

    defs = {}          # secCode -> {pos -> {title, terms:[...]}}
    keys = {}          # "bodypart"/"device"/"substance" -> [{values:[...], includes:[...]}]

    for sec in root.findall("section"):
        sc = sec.get("code")
        axes = {}
        for axis in sec.findall("axis"):
            pos = axis.get("pos")
            atitle = axis.findtext("title", "").strip()
            terms = []
            for t in axis.findall("terms"):
                titles = [text_of(x) for x in t.findall("title")]
                entry = {"v": titles}
                d = text_of(t.find("definition"))
                e = text_of(t.find("explanation"))
                inc = [text_of(x) for x in t.findall("includes")]
                if d:
                    entry["def"] = d
                if e:
                    entry["exp"] = e
                if inc:
                    entry["inc"] = inc
                terms.append(entry)
            axes[pos] = {"title": atitle, "terms": terms}

            # The keys are the axes whose entries are mostly synonym lists.
            if sc == "0" and atitle == "Body Part":
                keys["bodypart"] = terms
            elif sc == "0" and atitle == "Device":
                keys["device"] = terms
            elif sc == "3" and atitle == "Substance":
                keys["substance"] = terms
            elif sc == "X" and atitle.startswith("Device"):
                keys["newtech"] = terms
        defs[sc] = axes

    agg = []
    da = root.find("deviceAggregation")
    if da is not None:
        for a in da.findall("aggregate"):
            parent = a.find("parent")
            agg.append({
                "device": text_of(a.find("device")),
                "op": text_of(a.find("operation")),
                "bs": [text_of(x) for x in a.findall("bodySys")],
                "parent": text_of(parent) if parent is not None else "",
                "parentValue": parent.get("value") if parent is not None else "",
            })

    write_json("defs.json", defs)
    write_json("bodypartkey.json", keys.get("bodypart", []))
    write_json("devicekey.json", keys.get("device", []))
    write_json("substancekey.json", keys.get("substance", []))
    write_json("newtechkey.json", keys.get("newtech", []))
    write_json("deviceagg.json", agg)

    ops = {t["v"][0] for t in defs.get("0", {}).get("3", {}).get("terms", [])}
    log("  definitions: %d sections, %d M&S root operations, "
        "body part key %d, device key %d, substance key %d, aggregation %d"
        % (len(defs), len(ops), len(keys.get("bodypart", [])), len(keys.get("device", [])),
           len(keys.get("substance", [])), len(agg)))
    return defs


# --------------------------------------------------------------------------
# Alphabetic index
# --------------------------------------------------------------------------

def build_index():
    root = ET.parse(os.path.join(SRC, "icd10pcs_index_2027.xml")).getroot()
    search_rows = []
    main_terms = []

    def walk(el, letter, mi, trail):
        title = text_of(el.find("title"))
        node = {"t": title}

        # A term can carry: a partial code (<codes>, needs more characters), a
        # complete code (<code>), a "see" pointing at another index entry or a
        # table, or a "use" naming the PCS value to use for an anatomical or
        # device word.
        codes = el.findtext("codes")
        code = el.findtext("code")
        use = el.findtext("use")
        see = el.find("see")

        if codes:
            node["partial"] = codes.strip()
        if code:
            node["code"] = code.strip()
        if use:
            node["use"] = text_of(el.find("use"))
        if see is not None:
            node["see"] = text_of(see)
            tab = see.findtext("tab") or see.findtext("codes") or see.findtext("code")
            if tab:
                node["seeTo"] = tab.strip()
                # text_of() glues the table id onto the end of the see text
                node["see"] = node["see"][:-len(tab.strip())].strip().rstrip(",")

        # Most sub-terms in this index carry no title of their own: they are a
        # bare "see Excision, Gallbladder 0FB4" hanging under the main term. If
        # only <title> reaches the search rows, every one of those becomes an
        # unclickable blank line, which is most of the useful index.
        label = title or node.get("see") or node.get("use") or ""
        target = node.get("code") or node.get("partial") or node.get("seeTo") or ""

        full = trail + [title] if title else trail
        haystack = " ".join(full + [label, node.get("use", ""), node.get("see", "")])

        search_rows.append([haystack.lower(), letter, str(mi), target,
                            label, " > ".join(full) or label, node.get("use", "")])

        kids = el.findall("term")
        if kids:
            node["k"] = [walk(k, letter, mi, full) for k in kids]
        return node

    letters = 0
    for letter_el in root.findall("letter"):
        L = letter_el.findtext("title", "").strip()
        bucket = []
        for mi, mt in enumerate(letter_el.findall("mainTerm")):
            bucket.append(walk(mt, L, mi, []))
            main_terms.append([bucket[-1]["t"], L, mi])
        write_json("index/%s.json" % (L if L.isalnum() else "_num"), bucket)
        letters += 1

    write_json("index-main.json", main_terms)
    write_text("index-search.tsv", "\n".join("\t".join(r) for r in search_rows))
    log("  index: %d letters, %d main terms, %d searchable lines"
        % (letters, len(main_terms), len(search_rows)))


# --------------------------------------------------------------------------
# The official coding guidelines
#
# Both documents are published only as PDFs. pdftext.py turns them into
# reading-ordered lines; the job here is to recover the structure - the
# numbered guideline each paragraph belongs to - because a rule the reader
# cannot cite is not much use to an auditor.
# --------------------------------------------------------------------------

NOISE = re.compile(
    r"^\s*(?:"
    r"\d{1,3}"                                             # a bare page number
    r"|Page \d+ of \d+"
    r"|FY \d{4}"
    r"|ICD-10-(?:CM|PCS) Official Guidelines for Coding and Reporting.*"
    r")\s*$")

# A table-of-contents row: a dot leader then a page number. The dots often come
# out of the PDF separated by spaces, so the run has to tolerate whitespace.
TOC_LINE = re.compile(r"(?:\.\s*){4,}\d+\s*$")


def clean_lines(text):
    """Drop running headers, footers, page numbers and table-of-contents rows."""
    out = []
    for raw in text.split("\n"):
        line = raw.rstrip()
        if NOISE.match(line) or TOC_LINE.search(line):
            continue
        out.append(line)
    return out


# ---------------------------------------------------------------------------
# Mending the text the PDFs give back.
#
# A PDF stores glyph positions, not words, so a line that looked fine on paper
# can come back with a space wedged inside a word ("T o identify"), a space in
# front of its punctuation ("characters ."), or a code range broken in half
# ("U00- U85"). None of these are in the published document; they are artefacts
# of reading it. Leaving them in makes the tool look broken and makes a quoted
# rule harder to trust, so they are repaired here - and only these three
# patterns are, because the text is quoted and must not be edited.

_SPACE_BEFORE_PUNCT = re.compile(r"[ \t]+([,.;:!?%)\]])")
_SPACE_AFTER_OPEN = re.compile(r"([(\[])[ \t]+")
_SPLIT_RANGE = re.compile(r"\b([A-Z]\d{2}(?:\.\d+)?)-[ \t]+([A-Z]\d{2})")
# A capital stranded from the rest of its word, and only at the start of a
# sentence, where a stray capital cannot be a code value or an abbreviation.
# "A" and "I" are held out of this one: they are words in their own right, and
# joining them would corrupt real text ("A patient" -> "Apatient").
_SPLIT_WORD = re.compile(r"(^|(?<=[.:;] ))([B-HJ-Z]) ([a-z]{2,})")
# A one-letter tail is always a split. No capitalised word in English is
# followed by a single lowercase letter, so "T o" and "I n" are safe to join.
_SPLIT_TAIL = re.compile(r"(^|(?<=[.:;] ))([A-Z]) ([a-z])\b")


def mend(s):
    """Undo the spacing artefacts of PDF text extraction. Wording is untouched."""
    s = _SPACE_BEFORE_PUNCT.sub(r"\1", s)
    s = _SPACE_AFTER_OPEN.sub(r"\1", s)
    s = _SPLIT_WORD.sub(lambda m: m.group(1) + m.group(2) + m.group(3), s)
    s = _SPLIT_TAIL.sub(lambda m: m.group(1) + m.group(2) + m.group(3), s)
    s = _SPLIT_RANGE.sub(r"\1-\2", s)
    return s

def paragraphs(lines):
    """Blank-line separated blocks, each rewrapped to a single string."""
    paras, buf = [], []
    for line in lines:
        if line.strip():
            buf.append(line.strip())
        elif buf:
            paras.append(" ".join(buf))
            buf = []
    if buf:
        paras.append(" ".join(buf))

    return [mend(re.sub(r"\s+", " ", p).strip()) for p in paras if p.strip()]


def to_blocks(paras):
    """Rewrapped paragraphs -> prose strings and real lists, ready to render."""
    out = []
    for p in paras:
        out.extend(_as_blocks(p) if isinstance(p, str) else [p])
    return out


ORDERED = re.compile(r"(?:^|\s)(?=\d{1,2}\.\s+[A-Z])")


def _as_blocks(p):
    """A rewrapped paragraph -> prose strings and real lists.

    The PDF has no list markup, so a bulleted rule such as the spinal-fusion
    device hierarchy in B3.10c arrives as one long run-on sentence. Splitting it
    back into a list is the difference between a rule a reader can follow and a
    wall of text.
    """
    if "•" in p:
        lead, _, rest = p.partition("•")
        items = [x.strip() for x in rest.split("•") if x.strip()]
        blocks = []
        if lead.strip():
            blocks.append(lead.strip())
        if items:
            blocks.append({"ul": items})
        return blocks

    parts = [x.strip() for x in ORDERED.split(p) if x.strip()]
    if len(parts) >= 3 and sum(1 for x in parts if re.match(r"^\d{1,2}\.\s", x)) >= 2:
        blocks = []
        if not re.match(r"^\d{1,2}\.\s", parts[0]):
            blocks.append(parts[0])
            parts = parts[1:]
        blocks.append({"ol": [re.sub(r"^\d{1,2}\.\s*", "", x) for x in parts]})
        return blocks

    return [p]


# ---- ICD-10-PCS -----------------------------------------------------------

# A1, B2.1a, B3.10c, B5.4, C2, D1.a, E1.b - note that the part after the dot is
# a number in the B guidelines but a letter in D and E.
PCS_ID = re.compile(r"^([A-F]\d{1,2}(?:\.(?:\d{1,2}[a-z]?|[a-z]))?)$")
PCS_GROUP = re.compile(r"^([A-F]\d?)\.\s+(.{3,60})$")
PCS_BANNER = re.compile(r"^(?:Medical and Surgical|Obstetric|Radiation Therapy|New Technology|"
                        r"Selection of Principal Procedure).*(?:Guidelines|Section).*$")

# Section-level names, so a card can say which part of the book it comes from.
PCS_GROUP_NAMES = {
    "A": "Conventions",
    "B2": "Body System",
    "B3": "Root Operation",
    "B4": "Body Part",
    "B5": "Approach",
    "B6": "Device",
    "C": "Obstetrics Section",
    "D": "Radiation Therapy Section",
    "E": "New Technology Section",
    "F": "Selection of Principal Procedure",
}


def build_pcs_guidelines():
    text = pdftext.extract(os.path.join(GUIDE, "icd10pcs-guidelines-2027.pdf"))
    lines = clean_lines(text)

    groups = []          # [{id, label, items: [...]}]
    by_id = {}
    cur_group = None
    cur_item = None
    buf = []
    intro = []

    def flush():
        if cur_item is not None:
            cur_item["body"] = paragraphs(buf)

    for i, line in enumerate(lines):
        s = line.strip()

        m = PCS_ID.match(s)
        if m:
            # The line above a guideline number is its topic heading. It has to
            # be lifted off the previous rule's buffer before that rule is
            # flushed, or every rule ends with the next rule's title.
            topic = ""
            for back in range(i - 1, max(-1, i - 3), -1):
                prev = lines[back].strip()
                if not prev:
                    continue
                if len(prev) < 70 and not prev.endswith(".") and not PCS_ID.match(prev) \
                        and not PCS_GROUP.match(prev):
                    topic = prev
                    while buf and not buf[-1].strip():
                        buf.pop()
                    if buf and buf[-1].strip() == topic:
                        buf.pop()
                break

            flush()
            gid = re.match(r"^([A-F]\d?)", m.group(1)).group(1)
            gid = gid if gid in PCS_GROUP_NAMES else m.group(1)[0]
            if cur_group is None or cur_group["id"] != gid:
                cur_group = {"id": gid,
                             "label": mend(PCS_GROUP_NAMES.get(gid, gid)),
                             "items": []}
                groups.append(cur_group)

            cur_item = {"id": m.group(1), "topic": mend(topic), "body": []}
            cur_group["items"].append(cur_item)
            by_id[m.group(1)] = cur_item
            buf = []
            continue

        g = PCS_GROUP.match(s)
        if g and g.group(1) in PCS_GROUP_NAMES:
            flush()
            buf = []
            cur_group = {"id": g.group(1), "label": mend(g.group(2).strip()), "items": []}
            groups.append(cur_group)
            # Section F carries its rules as a numbered list with no guideline
            # number of its own, so every group opens with a placeholder item
            # that is dropped again below if nothing lands in it.
            cur_item = {"id": g.group(1), "topic": mend(g.group(2).strip()),
                        "body": [], "unnumbered": True}
            cur_group["items"].append(cur_item)
            by_id.setdefault(g.group(1), cur_item)
            continue

        if PCS_BANNER.match(s):
            continue

        if cur_item is None:
            intro.append(line)
        else:
            buf.append(line)
    flush()

    # Pull the worked examples out of the body: the guidelines mark them with a
    # literal "Example:" and they are the most useful part of a card.
    for item in by_id.values():
        body, examples = [], []
        for p in item["body"]:
            # Split the examples off while the paragraph is still flat text. Do
            # it after list structure is built and an "Examples:" run-on ends up
            # welded onto the final bullet.
            for chunk in re.split(r"(?=\bExamples?:\s)", p):
                chunk = chunk.strip()
                if not chunk:
                    continue
                if re.match(r"^Examples?:", chunk):
                    examples.append(mend(re.sub(r"^Examples?:\s*", "", chunk)))
                else:
                    body.append(chunk)
        item["body"] = to_blocks(body)
        if examples:
            item["examples"] = examples

    # A group's placeholder only survives if the group has no numbered guideline
    # of its own - Section F is the one case. Everywhere else the text that
    # landed in the placeholder is the group's own preamble, which belongs on the
    # group, not in a card pretending to be a rule.
    for g in groups:
        numbered = [it for it in g["items"] if not it.get("unnumbered")]
        holder = next((it for it in g["items"] if it.get("unnumbered")), None)
        if numbered:
            if holder:
                g["preamble"] = to_blocks(holder["body"])
                by_id.pop(holder["id"], None)
            g["items"] = numbered
        elif holder and not (holder["body"] or holder.get("examples")):
            g["items"] = []
            by_id.pop(holder["id"], None)
    groups = [g for g in groups if g["items"] or g.get("preamble")]
    payload = {
        "title": "ICD-10-PCS Official Guidelines for Coding and Reporting",
        "edition": "FY%s" % EDITION,
        "source": "Guidelines/icd10pcs-guidelines-2027.pdf",
        "intro": to_blocks(paragraphs(intro)),
        "groups": groups,
    }
    write_json("guidelines-pcs.json", payload)

    ids = sorted(by_id)
    log("  PCS guidelines: %d groups, %d numbered guidelines (%s ... %s)"
        % (len(groups), len(ids), ids[0] if ids else "-", ids[-1] if ids else "-"))

    # Guidelines the book is known to contain. If the extraction silently
    # degrades, these disappear and the build must stop rather than ship a
    # rule set with holes in it.
    for need in ("A1", "A11", "B2.1a", "B3.1a", "B3.2", "B3.6a", "B3.8", "B3.9",
                 "B3.10c", "B3.19", "B4.1a", "B4.8", "B5.2a", "B6.1a", "C1", "C2"):
        if need not in by_id:
            fail("PCS guideline %s did not survive extraction" % need)
    for gid, item in by_id.items():
        if not item["body"] and not item.get("examples"):
            fail("PCS guideline %s came out empty" % gid)
    return by_id


# ---- ICD-10-CM ------------------------------------------------------------

CM_SECTION = re.compile(r"^Section (I|II|III|IV)\.\s*(.*)$")
CM_UPPER = re.compile(r"^([A-Z])\.\s+(\S.{2,110})$")
CM_CHAPTER = re.compile(r"^(\d{1,2})\.\s+Chapter (\d{1,2}):\s*(.+)$")
CM_NUMBER = re.compile(r"^(\d{1,2})\.\s+(\S.{2,110})$")
CM_LOWER = re.compile(r"^([a-z])\.\s+(\S.{2,110})$")
CM_PAREN_NUM = re.compile(r"^(\d{1,2})\)\s+(\S.{2,110})$")
CM_PAREN_LOW = re.compile(r"^\(([a-z])\)\s+(\S.{2,110})$")
CM_PAREN_ROM = re.compile(r"^\(([ivx]{1,4})\)\s+(\S.{2,110})$")

# Depth is fixed per marker type, which is exactly how the official citations
# are formed: I.C.19.g.3.a is section / upper / chapter / lower / number / paren.
CM_LEVELS = [
    (CM_SECTION, 0), (CM_UPPER, 1), (CM_CHAPTER, 2), (CM_NUMBER, 2),
    (CM_LOWER, 3), (CM_PAREN_NUM, 4), (CM_PAREN_LOW, 5), (CM_PAREN_ROM, 6),
]


def _looks_like_heading(label):
    """Headings are short and do not read as a sentence.

    This is applied to the label - the text after the marker - not to the whole
    line, because the marker contributes a full stop of its own ("A. Conventions")
    and testing the raw line rejects every heading in the document.
    """
    label = label.strip()
    if not label or len(label) > 115:
        return False
    # A dot leader means this is a table-of-contents row, not the heading itself.
    # The front matter has to be rejected here rather than in clean_lines: the
    # PDF spaces some leaders out so far that they no longer look like leaders.
    if re.search(r"\.{3,}", label) or re.search(r"(?:\.\s*){3,}\d+$", label):
        return False
    # A full stop means the line reads as a sentence: "Section I.C.19.g.3.a.
    # Transplant complications other than kidney." is a cross-reference inside a
    # paragraph, not a heading. A trailing comma or colon is fine - long headings
    # wrap mid-phrase, as Chapter 1's does.
    if label.endswith((".", ";")):
        return False
    return ". " not in label


def build_cm_guidelines():
    text = pdftext.extract(os.path.join(GUIDE, "icd10cm-guidelines-2027.pdf"))
    lines = clean_lines(text)

    root = {"id": "", "label": "", "body": [], "kids": []}
    stack = [root]        # stack[d] is the node currently open at depth d
    path = [None] * 8
    buf = []
    started = False
    chapters = {}

    def flush(node):
        node["body"] = to_blocks(paragraphs(buf))

    for line in lines:
        s = line.strip()
        if not started:
            # Everything before the first real Section I heading is front matter
            # and the table of contents. The TOC's own "Section I." row carries a
            # dot leader, so _looks_like_heading rejects it and the body starts
            # at the genuine heading.
            m0 = CM_SECTION.match(s)
            if m0 and _looks_like_heading(m0.group(2)):
                started = True
            else:
                continue

        matched = None
        for rx, depth in CM_LEVELS:
            m = rx.match(s)
            if not m:
                continue
            label = m.group(3) if rx is CM_CHAPTER else m.group(2)
            if not _looks_like_heading(label):
                continue
            if depth > len(stack):              # cannot skip more than one level
                continue
            matched = (m, depth, rx)
            break

        if matched:
            m, depth, rx = matched
            flush(stack[-1])
            buf = []
            while len(stack) > depth + 1:
                stack.pop()

            if rx is CM_SECTION:
                key, label = m.group(1), m.group(2).strip()
            elif rx is CM_CHAPTER:
                key, label = m.group(1), "Chapter %s: %s" % (m.group(2), m.group(3).strip())
            else:
                key, label = m.group(1), m.group(2).strip()

            path[depth] = key
            node_id = ".".join(x for x in path[:depth + 1] if x)
            label = mend(label)
            node = {"id": node_id, "label": label, "body": [], "kids": []}
            stack[-1]["kids"].append(node)
            stack.append(node)

            if rx is CM_CHAPTER:
                rng = re.search(r"\(([A-Z]\d[0-9A-Z]*-[A-Z]\d[0-9A-Z]*)\)", label)
                chapters[m.group(2)] = {"id": node_id, "label": label,
                                        "range": rng.group(1) if rng else ""}
            continue

        buf.append(line)
    flush(stack[-1])

    payload = {
        "title": "ICD-10-CM Official Guidelines for Coding and Reporting",
        "edition": "FY%s" % EDITION,
        "source": "Guidelines/icd10cm-guidelines-2027.pdf",
        "nodes": root["kids"],
        "chapters": chapters,
    }
    write_json("guidelines-cm.json", payload)

    def count(ns):
        return sum(1 + count(n["kids"]) for n in ns)

    log("  CM guidelines: %d top sections, %d nodes, %d chapters mapped"
        % (len(root["kids"]), count(root["kids"]), len(chapters)))

    if len(root["kids"]) != 4:
        fail("expected 4 top-level CM guideline sections, found %d" % len(root["kids"]))
    if len(chapters) != 22:
        fail("expected 22 CM chapter guideline blocks, found %d" % len(chapters))
    return payload


# ---- the CMS reference manual --------------------------------------------

def build_refmanual():
    """The manual is used for its prose: the official root-operation groups and
    the per-operation coding notes. Its code tables are not read - those come
    from the tables XML, which is current. The manual is CMS's FY2016 edition
    and has never been reissued, so anything here is subordinate to the FY2027
    guidelines; the app says so wherever it quotes it."""
    path = os.path.join(GUIDE, "icd10pcs-reference-manual-cms.pdf")
    if not os.path.exists(path):
        log("  reference manual not present - skipping")
        return
    text = pdftext.extract(path)
    lines = clean_lines(text)
    paras = to_blocks(paragraphs(lines))
    write_json("refmanual.json", {
        "title": "ICD-10-PCS Reference Manual",
        "publisher": "Centers for Medicare & Medicaid Services",
        "vintage": "FY2016 edition - the most recent CMS has published",
        "caveat": "Where this manual and the FY2027 Official Guidelines differ, "
                  "the FY2027 guidelines are what applies.",
        "paras": paras,
    })
    log("  reference manual: %d paragraphs" % len(paras))


# --------------------------------------------------------------------------
# Are the explanations still anchored to the book?
#
# The "which one do I pick?" screen is generated from two places: a card per
# official guideline, built at run time from guidelines-pcs.json, and a set of
# hand-written cards in assets/js2/decide-content.js. The generated half cannot
# drift. The hand-written half can, so it is checked here against what the
# release files actually say - the same discipline the rest of this build
# follows, and the reason nothing in the app asserts a rule it cannot cite.
# --------------------------------------------------------------------------

CARD_ID = re.compile(r"^\s{4}id:\s*'([^']+)'", re.M)
CARD_RULES = re.compile(r"^\s{4}rules:\s*\[([^\]]*)\]", re.M)
CARD_OPS = re.compile(r"^\s{4}ops:\s*\[([^\]]*)\]", re.M)
CARD_FIG = re.compile(r"diagram:\s*'([^']+)'")
DIAGRAM_KEY = re.compile(r"^\s{2}'?([a-z0-9-]+)'?:\s*\{$", re.M)


def check_cards(guideline_ids, root_ops):
    """Cross-check the hand-written cards against the release files."""
    cards_path = os.path.join(ROOT, "assets", "js2", "decide-content.js")
    fig_path = os.path.join(ROOT, "assets", "js2", "anatomy.js")
    if not os.path.exists(cards_path):
        fail("assets/js2/decide-content.js is missing - the decision cards cannot be checked")
        return

    src = open(cards_path, encoding="utf-8").read()
    figs = set(DIAGRAM_KEY.findall(open(fig_path, encoding="utf-8").read())) \
        if os.path.exists(fig_path) else set()

    ids = CARD_ID.findall(src)
    if len(ids) != len(set(ids)):
        dupes = sorted({i for i in ids if ids.count(i) > 1})
        fail("decide-content.js has duplicate card ids: %s" % ", ".join(dupes))

    quoted = re.compile(r"'([^']+)'")
    cited = set()
    for block in CARD_RULES.findall(src):
        cited.update(quoted.findall(block))
    covered_ops = set()
    for block in CARD_OPS.findall(src):
        covered_ops.update(quoted.findall(block))

    # 1. Every rule a card leans on has to exist in this year's guidelines.
    unknown = sorted(cited - set(guideline_ids))
    if unknown:
        fail("decide-content.js cites guidelines that are not in the FY%s book: %s"
             % (EDITION, ", ".join(unknown)))

    # 2. Every card has to name a rule. A card that asserts something without a
    #    citation is exactly the thing this tool exists to argue against.
    bodies = re.split(r"^\s{2}\{", src, flags=re.M)[1:]
    for body in bodies:
        m = re.search(r"id:\s*'([^']+)'", body)
        if m and "rules:" not in body.split("\n  }")[0]:
            fail("decision card '%s' does not name an official guideline" % m.group(1))

    # 3. Every Medical and Surgical root operation must be separated from its
    #    neighbours somewhere, or the coverage claim is false.
    missing_ops = sorted(set(root_ops) - covered_ops)
    if missing_ops:
        fail("no decision card distinguishes these root operations: %s"
             % ", ".join(missing_ops))

    # 4. A card must not point at a diagram that does not exist.
    for fig in sorted(set(CARD_FIG.findall(src))):
        if fig not in figs:
            fail("decision card refers to diagram '%s', which anatomy.js does not define" % fig)

    log("  decision cards: %d, citing %d of %d guidelines, covering all %d root operations"
        % (len(ids), len(cited & set(guideline_ids)), len(guideline_ids), len(root_ops)))


# --------------------------------------------------------------------------
# What changed this year
# --------------------------------------------------------------------------

def build_whatsnew():
    path = os.path.join(DESC, "icd10pcs_codes_addenda_2027.txt")
    if not os.path.exists(path):
        return
    added, deleted, revised = [], [], []
    pending = None
    with open(path, encoding="utf-8", errors="replace") as f:
        for raw in f:
            line = raw.rstrip("\n")
            m = re.match(r"^(Add|Delete|Revise from|Revise to):\s+(\S+)\s+(.*)$", line)
            if not m:
                continue
            action, code, title = m.group(1), m.group(2), m.group(3).strip()
            rec = {"code": code, "desc": title}
            if action == "Add":
                added.append(rec)
            elif action == "Delete":
                deleted.append(rec)
            elif action == "Revise from":
                pending = rec
            else:
                revised.append({"code": code,
                                "before": pending["desc"] if pending else "",
                                "after": title})
                pending = None
    write_json("whatsnew-pcs.json",
               {"from": "FY2026", "to": "FY2027",
                "added": added, "deleted": deleted, "revised": revised})
    log("  what's new: %d added, %d deleted, %d reworded"
        % (len(added), len(deleted), len(revised)))


# --------------------------------------------------------------------------

def main():
    os.makedirs(OUT, exist_ok=True)

    official = load_codes()

    log("tables...")
    generated = build_tables()
    verify_tables(generated, official)

    log("code list...")
    write_text("codes.tsv", "\n".join("%s\t%s" % (c, official[c]) for c in sorted(official)))

    log("definitions and keys...")
    defs_by_section = build_defs()

    log("alphabetic index...")
    build_index()

    log("official guidelines...")
    pcs_rules = build_pcs_guidelines()
    build_cm_guidelines()
    build_refmanual()

    log("checking the explanations against the book...")
    root_ops = [t["v"][0] for t in
                defs_by_section.get("0", {}).get("3", {}).get("terms", [])]
    check_cards(set(pcs_rules), root_ops)

    log("what changed this year...")
    build_whatsnew()

    write_json("meta.json", {
        "edition": "FY%s" % EDITION,
        "effective": "October 1, 2026",
        "through": "September 30, 2027",
        "codeCount": len(official),
    })

    if problems:
        raise SystemExit("Refusing to write a broken build:\n  - " + "\n  - ".join(problems))
    log("done -> %s" % OUT)


if __name__ == "__main__":
    main()
