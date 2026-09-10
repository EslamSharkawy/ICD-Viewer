#!/usr/bin/env python3
"""
Turn the official ICD-10-CM FY2027 release files into the JSON the web app reads.

Inputs (as shipped by CMS/NCHS, already unzipped in this folder):
  Table and Index/icd10cm_tabular_2027.xml
  Table and Index/icd10cm_index_2027.xml
  Table and Index/icd10cm_neoplasm_2027.xml
  Table and Index/icd10cm_drug_2027.xml
  Code Descriptions/icd10cm_codes_2027.txt
  Code Descriptions/icd10cm_order_addenda_2027.txt

Output: data/  (see README for the file layout)

Run:  python build/build.py
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Table and Index")
DESC = os.path.join(ROOT, "Code Descriptions")
OUT = os.path.join(ROOT, "data")

EDITION = "2027"

NOTE_TAGS = [
    "includes",
    "inclusionTerm",
    "excludes1",
    "excludes2",
    "codeFirst",
    "useAdditionalCode",
    "codeAlso",
    "notes",
]

# Note groups that count as "instructional notes" for the badge counts.
COUNTED = ["excludes1", "excludes2", "codeFirst", "useAdditionalCode", "codeAlso",
           "includes", "inclusionTerm", "notes"]


def log(*a):
    print(*a, flush=True)


def text_of(el):
    """Flatten an element's text, collapsing whitespace."""
    return re.sub(r"\s+", " ", "".join(el.itertext())).strip()


def write_json(relpath, obj, compact=True):
    path = os.path.join(OUT, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sep = (",", ":") if compact else (", ", ": ")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=sep)
    return os.path.getsize(path)


# --------------------------------------------------------------------------
# Plain-language chapter names. The official chapter titles are accurate but
# forbidding; a beginner needs the everyday name first.
# --------------------------------------------------------------------------
CHAPTER_PLAIN = {
    "1":  ("Infections", "Illnesses caused by germs that can spread from person to person or from animals and food."),
    "2":  ("Cancers and other growths", "Tumours of every kind, whether cancerous or not."),
    "3":  ("Blood and immune system", "Anaemia, clotting problems, and disorders of the body's defences."),
    "4":  ("Hormones, nutrition and metabolism", "Diabetes, thyroid problems, obesity and vitamin deficiencies."),
    "5":  ("Mental health and behaviour", "Mental, behavioural and neurodevelopmental conditions, including substance use."),
    "6":  ("Brain and nerves", "Conditions of the nervous system such as epilepsy, migraine and Parkinson's disease."),
    "7":  ("Eyes", "Conditions of the eye and the structures around it."),
    "8":  ("Ears", "Conditions of the ear, hearing and balance."),
    "9":  ("Heart and blood vessels", "Heart attacks, high blood pressure, strokes and circulation problems."),
    "10": ("Lungs and breathing", "Colds, asthma, chronic obstructive pulmonary disease, pneumonia and other airway conditions."),
    "11": ("Digestion, mouth and teeth", "Conditions of the gut, liver, gallbladder, mouth and teeth."),
    "12": ("Skin", "Rashes, infections, ulcers and other skin conditions."),
    "13": ("Muscles, bones and joints", "Arthritis, back pain and other conditions of the musculoskeletal system."),
    "14": ("Kidneys and urinary and reproductive organs", "Kidney disease, urinary problems and conditions of the reproductive organs."),
    "15": ("Pregnancy and childbirth", "Conditions arising in pregnancy, during birth, and in the weeks afterwards."),
    "16": ("Newborn babies", "Conditions that begin in the first days of life."),
    "17": ("Conditions present at birth", "Malformations and chromosome differences a person is born with."),
    "18": ("Symptoms and abnormal findings", "Signs, symptoms and test results when no firm diagnosis has been made."),
    "19": ("Injuries and poisonings", "Fractures, wounds, burns, poisonings and other effects of external causes."),
    "20": ("Causes of injury", "How an injury happened - the fall, the crash, the assault. Never used on its own."),
    "21": ("Reasons for a visit other than illness", "Check-ups, screening, vaccination, follow-up and personal history."),
    "22": ("Special purposes", "Codes set aside for emergencies and newly identified conditions."),
}


# --------------------------------------------------------------------------
# Tabular list
# --------------------------------------------------------------------------

def parse_notes(el):
    """Collect the instructional-note containers that are direct children of el."""
    out = {}
    for child in el:
        tag = child.tag
        if tag in NOTE_TAGS:
            notes = [text_of(n) for n in child.findall("note")]
            notes = [n for n in notes if n]
            if notes:
                out.setdefault(tag, []).extend(notes)
    return out


def parse_seventh(el):
    """sevenChrNote / sevenChrDef living directly on this element."""
    note = []
    for n in el.findall("sevenChrNote"):
        note.extend(text_of(x) for x in n.findall("note"))
    defs = []
    for d in el.findall("sevenChrDef"):
        for ext in d.findall("extension"):
            defs.append([ext.get("char"), text_of(ext)])
    return note, defs


def strip_range(desc):
    """'Intestinal infectious diseases (A00-A09)' -> ('Intestinal infectious diseases', 'A00-A09')"""
    m = re.match(r"^(.*?)\s*\(([A-Z]\d[0-9A-Z]*(?:-[A-Z]\d[0-9A-Z]*)?)\)\s*$", desc)
    if m:
        return m.group(1).strip(), m.group(2)
    return desc, None


def build_tabular(billable):
    tree = ET.parse(os.path.join(SRC, "icd10cm_tabular_2027.xml"))
    root = tree.getroot()

    chapters = []          # meta for the browse screen
    blocks_meta = []       # [first, last, id, chapterNum]
    umbrellas = []         # sections that hold no codes but do carry notes over a range
    chapter_notes = {}     # chapterNum -> notes dict
    block_notes = {}       # blockId  -> notes dict
    code_rows = []         # for codes.tsv
    note_rows = []         # for notes.tsv - lets the app search inside note text
    all_codes = {}         # code -> (desc, blockId)
    ancestors_of = {}      # code -> parent code

    def add_notes(level, owner, notes):
        for tag, items in notes.items():
            for t in items:
                note_rows.append((level, owner, tag, t))

    def walk_diag(el, chain, block_id, chapter_num, inherited7):
        """chain: list of ancestor diag nodes (dicts) for note inheritance."""
        name = el.findtext("name", "").strip()
        desc = text_of(el.find("desc")) if el.find("desc") is not None else ""
        notes = parse_notes(el)
        s7n, s7d = parse_seventh(el)
        own7 = {"note": s7n, "def": s7d} if s7d or s7n else None
        eff7 = own7 or inherited7

        node = {"c": name, "d": desc}
        if notes:
            node["n"] = notes
        if own7:
            node["s7"] = own7
        if el.get("placeholder") == "true":
            node["ph"] = 1

        kids = el.findall("diag")
        if kids:
            node["ch"] = []
            for k in kids:
                node["ch"].append(walk_diag(k, chain + [node], block_id, chapter_num, eff7))

        # ---- flags and counts for the flat search list -------------------
        flat = name.replace(".", "")
        is_leaf = not kids
        needs7 = bool(eff7 and eff7.get("def"))
        is_billable = flat in billable

        own_count = sum(len(notes.get(t, [])) for t in COUNTED)
        inh_count = sum(sum(len(a.get("n", {}).get(t, [])) for t in COUNTED) for a in chain)
        inh_count += sum(len(chapter_notes.get(chapter_num, {}).get(t, [])) for t in COUNTED)
        inh_count += sum(len(block_notes.get(block_id, {}).get(t, [])) for t in COUNTED)

        flags = ""
        if is_billable:
            flags += "b"
        if needs7:
            flags += "x"
        if is_leaf:
            flags += "l"
        code_rows.append((name, desc, flags, own_count + inh_count, block_id))
        add_notes("d", name, notes)
        all_codes[name] = desc
        if chain:
            ancestors_of[name] = chain[-1]["c"]

        return node

    for ch in root.findall("chapter"):
        cnum = ch.findtext("name", "").strip()
        cdesc_raw = text_of(ch.find("desc"))
        cdesc, crange = strip_range(cdesc_raw)
        cnotes = parse_notes(ch)
        c7n, c7d = parse_seventh(ch)
        chapter_notes[cnum] = cnotes
        add_notes("c", cnum, cnotes)
        chapter7 = {"note": c7n, "def": c7d} if c7d or c7n else None

        ch_blocks = []
        ch_code_count = 0
        ch_note_count = sum(len(cnotes.get(t, [])) for t in COUNTED)

        for sec in ch.findall("section"):
            sid = sec.get("id")
            sdesc_raw = text_of(sec.find("desc"))
            sdesc, srange = strip_range(sdesc_raw)
            snotes = parse_notes(sec)
            s7n, s7d = parse_seventh(sec)
            block_notes[sid] = snotes
            sec7 = {"note": s7n, "def": s7d} if s7d or s7n else chapter7

            note_count = sum(len(snotes.get(t, [])) for t in COUNTED)
            parts = sid.split("-")
            first, last = parts[0], parts[-1]

            # A dozen sections hold no codes of their own: they are group headings
            # spanning several blocks. Four of them carry notes, and those notes
            # reach every code in the range, so they are a level of their own.
            if not sec.findall("diag"):
                add_notes("u", sid, snotes)
                umbrellas.append({
                    "id": sid, "first": first, "last": last, "chapter": cnum,
                    "title": sdesc, "range": srange or sid, "notes": snotes,
                })
                ch_blocks.append({
                    "id": sid, "title": sdesc, "range": srange or sid,
                    "codes": 0, "notes": note_count, "cats": 0, "umbrella": True,
                })
                ch_note_count += note_count
                continue

            add_notes("b", sid, snotes)
            before = len(code_rows)
            diags = [walk_diag(d, [], sid, cnum, sec7) for d in sec.findall("diag")]
            count = len(code_rows) - before
            ch_code_count += count

            payload = {
                "id": sid,
                "title": sdesc,
                "range": srange or sid,
                "chapter": cnum,
                "notes": snotes,
                "s7": {"note": s7n, "def": s7d} if (s7n or s7d) else None,
                "diags": diags,
            }
            write_json("blocks/%s.json" % sid, payload)

            blocks_meta.append([first, last, sid, cnum])
            ch_blocks.append({
                "id": sid, "title": sdesc, "range": srange or sid,
                "codes": count, "notes": note_count,
                "cats": len(diags),
            })
            ch_note_count += note_count

        plain, blurb = CHAPTER_PLAIN.get(cnum, (cdesc, ""))
        chapters.append({
            "num": cnum,
            "title": cdesc,
            "plain": plain,
            "blurb": blurb,
            "range": crange or "",
            "codes": ch_code_count,
            "notes": ch_note_count,
            "blocks": ch_blocks,
        })

    write_json("chapters.json", chapters)
    write_json("chapter-notes.json", chapter_notes)
    write_json("blockmap.json", blocks_meta)
    write_json("umbrellas.json", umbrellas)

    # Flat search list as TSV - noticeably smaller and faster to parse than JSON.
    lines = ["\t".join([c, d, f, str(n), b]) for (c, d, f, n, b) in code_rows]
    with open(os.path.join(OUT, "codes.tsv"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    with open(os.path.join(OUT, "notes.tsv"), "w", encoding="utf-8") as f:
        f.write("\n".join("\t".join(r) for r in note_rows))

    log("  chapters: %d   blocks: %d   tabular codes: %d   notes: %d" %
        (len(chapters), len(blocks_meta), len(code_rows), len(note_rows)))
    return all_codes


# --------------------------------------------------------------------------
# Alphabetic index
# --------------------------------------------------------------------------

def parse_title(el):
    """<title>Abasia<nemod>(-astasia) (hysterical)</nemod></title>
       -> ("Abasia", "(-astasia) (hysterical)")
    Words inside <nemod> are non-essential modifiers: they never change the code."""
    if el is None:
        return "", ""
    main = re.sub(r"\s+", " ", (el.text or "")).strip()
    nemod = []
    tail = []
    for child in el:
        if child.tag == "nemod":
            nemod.append(text_of(child))
        if child.tail:
            tail.append(child.tail)
    extra = re.sub(r"\s+", " ", " ".join(tail)).strip()
    if extra:
        main = (main + " " + extra).strip()
    return main, " ".join(nemod).strip()


CODE_RE = re.compile(r"^[A-Z]\d[0-9A-Z]{0,5}(?:\.[0-9A-Z]{1,4})?-?$")


def build_index():
    tree = ET.parse(os.path.join(SRC, "icd10cm_index_2027.xml"))
    root = tree.getroot()

    letters = {}
    search_rows = []        # [text, letter, mainIdx, pathIdxString]
    reverse = {}            # code -> list of [term, term, ...] trails
    main_terms = []         # [title, letter, idx]

    def walk_term(el, letter, mi, path_ids, trail):
        title, nemod = parse_title(el.find("title"))
        node = {"t": title}
        if nemod:
            node["nm"] = nemod

        code = el.findtext("code")
        subcat = el.findtext("subcat")
        manif = el.findtext("manif")
        see = el.findtext("see")
        see_also = el.findtext("seeAlso")
        seecat = el.findtext("seecat")

        if code:
            node["c"] = code.strip()
        if subcat:
            node["c"] = subcat.strip()
            node["sub"] = 1        # needs further characters
        if manif:
            node["m"] = manif.strip()   # the bracketed second code
        if see:
            node["see"] = text_of(el.find("see"))
        if see_also:
            node["seeAlso"] = text_of(el.find("seeAlso"))
        if seecat:
            node["seecat"] = seecat.strip()

        full_trail = trail + [title + ((" " + nemod) if nemod else "")]
        search_text = " ".join(full_trail)
        pid = ".".join(str(x) for x in path_ids)
        search_rows.append([search_text.lower(), letter, mi, pid,
                            node.get("c", ""), title, " › ".join(full_trail)])

        if node.get("c"):
            key = node["c"].rstrip("-")
            entry = {"trail": full_trail}
            if node.get("m"):
                entry["m"] = node["m"]
            reverse.setdefault(key, []).append(entry)

        kids = el.findall("term")
        if kids:
            node["k"] = [walk_term(k, letter, mi, path_ids + [i], full_trail)
                         for i, k in enumerate(kids)]
        return node

    for letter_el in root.findall("letter"):
        L = letter_el.findtext("title", "").strip()
        bucket = []
        for mi, mt in enumerate(letter_el.findall("mainTerm")):
            bucket.append(walk_term(mt, L, mi, [], []))
            main_terms.append([bucket[-1]["t"], L, mi])
        letters[L] = bucket
        write_json("index/%s.json" % (L if L != "#" else "_num"), bucket)

    write_json("index-main.json", main_terms)

    with open(os.path.join(OUT, "index-search.tsv"), "w", encoding="utf-8") as f:
        f.write("\n".join("\t".join([r[0], r[1], str(r[2]), r[3], r[4], r[5], r[6]])
                          for r in search_rows))

    # Reverse lookup, sharded by the code's first letter.
    shards = {}
    for code, trails in reverse.items():
        shards.setdefault(code[0], {})[code] = trails
    for L, payload in shards.items():
        write_json("rindex/%s.json" % L, payload)

    log("  index main terms: %d   searchable lines: %d   codes with a trail: %d" %
        (len(main_terms), len(search_rows), len(reverse)))


# --------------------------------------------------------------------------
# Neoplasm and drug grids
# --------------------------------------------------------------------------

def build_grid(filename, outname):
    tree = ET.parse(os.path.join(SRC, filename))
    root = tree.getroot()
    heads = [text_of(h) for h in root.find("indexHeading").findall("head")]
    rows = []

    def walk(el, trail):
        title, nemod = parse_title(el.find("title"))
        label = title + ((" " + nemod) if nemod else "")
        cells = {}
        for c in el.findall("cell"):
            cells[c.get("col")] = text_of(c)
        full = trail + [label]
        if cells:
            rows.append({"trail": full, "cells": [cells.get(str(i), "") for i in range(2, 8)]})
        for k in el.findall("term"):
            walk(k, full)

    for letter_el in root.findall("letter"):
        for mt in letter_el.findall("mainTerm"):
            walk(mt, [])

    write_json(outname, {"heads": heads, "rows": rows})
    log("  %s: %d rows" % (outname, len(rows)))


# --------------------------------------------------------------------------
# What changed since last year (from the official addenda)
# --------------------------------------------------------------------------

def build_whatsnew():
    path = os.path.join(DESC, "icd10cm_order_addenda_2027.txt")
    if not os.path.exists(path):
        return
    added, deleted, revised = [], [], []
    pending_from = None
    # The addenda file is fixed width, laid out like the order file it amends:
    # action(13) billable(1) space code(8) short title(61) long title(rest)
    with open(path, encoding="utf-8", errors="replace") as f:
        for raw in f:
            line = raw.rstrip("\n")
            action = line[:13].strip()
            if action not in ("Add:", "Delete:", "Revise from:", "Revise to:"):
                continue
            billable = line[13:14]
            code = line[15:23].strip()
            short = line[23:84].strip()
            long_ = line[84:].strip() or short
            dotted = code if len(code) <= 3 else code[:3] + "." + code[3:]
            rec = {"code": dotted, "desc": long_, "billable": billable == "1"}
            if action == "Add:":
                added.append(rec)
            elif action == "Delete:":
                deleted.append(rec)
            elif action == "Revise from:":
                pending_from = rec
            elif action == "Revise to:":
                if pending_from:
                    revised.append({"code": dotted, "before": pending_from["desc"],
                                    "after": long_, "billable": billable == "1"})
                    pending_from = None
    write_json("whatsnew.json", {
        "from": "FY2026", "to": "FY2027",
        "added": added, "deleted": deleted, "revised": revised,
    })
    log("  what's new: %d added, %d deleted, %d reworded" %
        (len(added), len(deleted), len(revised)))


# --------------------------------------------------------------------------

def main():
    os.makedirs(OUT, exist_ok=True)

    billable = set()
    with open(os.path.join(DESC, "icd10cm_codes_2027.txt"), encoding="utf-8", errors="replace") as f:
        for line in f:
            parts = line.split(None, 1)
            if parts:
                billable.add(parts[0].strip())
    log("billable codes on file: %d" % len(billable))

    log("tabular list...")
    build_tabular(billable)

    log("alphabetic index...")
    build_index()

    log("grids...")
    build_grid("icd10cm_neoplasm_2027.xml", "neoplasm.json")
    build_grid("icd10cm_drug_2027.xml", "drug.json")

    log("what changed this year...")
    build_whatsnew()

    write_json("meta.json", {
        "edition": "FY%s" % EDITION,
        "effective": "October 1, 2026",
        "through": "September 30, 2027",
        "label": "FY%s — use for encounters through September 30, 2027." % EDITION,
        "billableCount": len(billable),
    })
    log("done -> %s" % OUT)


if __name__ == "__main__":
    main()
