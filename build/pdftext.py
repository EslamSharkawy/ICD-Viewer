#!/usr/bin/env python3
"""
Pull the text out of a PDF using nothing but the standard library.

Why this exists: the two sets of official coding guidelines and the CMS reference
manual are published only as PDFs, and this project is not allowed to grow a
dependency (see CLAUDE.md). So the small part of the PDF specification that these
particular documents actually use is implemented here, and nothing else.

What it handles:
  - cross-reference streams and object streams (/ObjStm), which is how everything
    except the page objects is stored in these files
  - FlateDecode, with the PNG/TIFF predictors used by xref streams
  - the page tree, so pages come out in reading order rather than file order
  - the text operators: Tj, TJ, ', ", Tm, Td, TD, T*, TL, Tf, BT/ET

  - fonts, to the extent of telling three kinds apart: a standard-encoded simple
    font (decoded directly), a dingbat font (drawn as a bullet - these documents
    set their bullets in SymbolMT), and a composite Type0 font

What it deliberately does not handle:
  - /ToUnicode CMaps. The only composite font in these documents is the bullet,
    which is recognised by name, so a CMap parser would be a lot of code for a
    case that does not arise. If a Type0 font ever does draw real text, `extract`
    raises rather than quietly returning mojibake.
  - shading, images, XObject text. There is no text in an XObject in these files.

The output is line-oriented and reading-ordered, not column-aligned. Where a
document uses real columns - the Detachment qualifier table in the PCS guidelines is
the one case - the text linearises wrongly, and that table is rebuilt by hand
against the tables XML instead. See build_pcs.py.
"""

import re
import zlib

__all__ = ["extract", "PdfError"]


class PdfError(Exception):
    pass


# --------------------------------------------------------------------------
# object plumbing
# --------------------------------------------------------------------------

OBJ_RE = re.compile(rb"(\d+)\s+(\d+)\s+obj\b(.*?)\bendobj", re.S)
STREAM_START_RE = re.compile(rb"stream(\r\n|\n|\r)")
# /Length is a direct integer here, but guard against the indirect "/Length 12 0 R" form.
LENGTH_RE = re.compile(rb"/Length\s+(\d+)(?!\s+\d+\s+R)")


def _dict_of(body):
    """The opening << ... >> of an object, as raw bytes (nesting-aware)."""
    i = body.find(b"<<")
    if i < 0:
        return b""
    depth = 0
    j = i
    while j < len(body) - 1:
        two = body[j:j + 2]
        if two == b"<<":
            depth += 1
            j += 2
            continue
        if two == b">>":
            depth -= 1
            j += 2
            if depth == 0:
                return body[i:j]
            continue
        j += 1
    return body[i:]


def _num(d, key, default=None):
    m = re.search(rb"/" + key.encode() + rb"\s+(\d+)", d)
    return int(m.group(1)) if m else default


def _apply_predictor(data, d):
    """Undo the PNG predictors that xref streams are usually written with."""
    parms = re.search(rb"/DecodeParms\s*<<(.*?)>>", d, re.S)
    if not parms:
        return data
    p = parms.group(1)
    pred = _num(p, "Predictor", 1)
    if not pred or pred < 10:
        return data
    cols = _num(p, "Columns", 1)
    colors = _num(p, "Colors", 1)
    bpc = _num(p, "BitsPerComponent", 8)
    bpp = max(1, (colors * bpc) // 8)
    rowlen = (cols * colors * bpc + 7) // 8

    out = bytearray()
    prev = bytearray(rowlen)
    pos = 0
    while pos + 1 + rowlen <= len(data):
        ft = data[pos]
        row = bytearray(data[pos + 1:pos + 1 + rowlen])
        pos += 1 + rowlen
        if ft == 1:
            for i in range(bpp, rowlen):
                row[i] = (row[i] + row[i - bpp]) & 0xFF
        elif ft == 2:
            for i in range(rowlen):
                row[i] = (row[i] + prev[i]) & 0xFF
        elif ft == 3:
            for i in range(rowlen):
                left = row[i - bpp] if i >= bpp else 0
                row[i] = (row[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ft == 4:
            for i in range(rowlen):
                a = row[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                row[i] = (row[i] + pr) & 0xFF
        out += row
        prev = row
    return bytes(out)


def _raw_stream(body, d):
    """The bytes between `stream` and `endstream`.

    Length is trusted when it is a direct integer, because compressed data
    routinely contains byte sequences that look like delimiters. The fallback
    only runs for the indirect-/Length form, which these files do not use.
    """
    m = STREAM_START_RE.search(body)
    if not m:
        return None
    start = m.end()

    lm = LENGTH_RE.search(d)
    if lm:
        n = int(lm.group(1))
        if start + n <= len(body) and b"endstream" in body[start + n:start + n + 32]:
            return body[start:start + n]

    end = body.rfind(b"endstream")
    if end < 0:
        return None
    return body[start:end].rstrip(b"\r\n")


def _stream_bytes(body, d):
    raw = _raw_stream(body, d)
    if raw is None:
        return None
    if b"/FlateDecode" not in d:
        return raw
    try:
        data = zlib.decompress(raw)
    except zlib.error:
        try:                       # some writers leave a stray trailing byte
            data = zlib.decompressobj().decompress(raw)
        except zlib.error:
            return None
    return _apply_predictor(data, d)


def _objects(data):
    """objnum -> object body, from the file itself and from every /ObjStm."""
    objs = {}
    for m in OBJ_RE.finditer(data):
        objs[int(m.group(1))] = m.group(3)

    for num, body in list(objs.items()):
        d = _dict_of(body)
        if b"/ObjStm" not in d:
            continue
        blob = _stream_bytes(body, d)
        if not blob:
            continue
        n = _num(d, "N", 0)
        first = _num(d, "First", 0)
        header = blob[:first].split()
        for i in range(n):
            try:
                onum = int(header[2 * i])
                off = int(header[2 * i + 1])
            except (IndexError, ValueError):
                break
            end = int(header[2 * i + 3]) + first if 2 * i + 3 < len(header) else len(blob)
            objs.setdefault(onum, blob[first + off:end])
    return objs


def _page_order(objs, data):
    """Page object numbers, in reading order, by walking the page tree."""
    root = re.search(rb"/Root\s+(\d+)\s+\d+\s+R", data)
    pages_num = None
    if root:
        cat = objs.get(int(root.group(1)), b"")
        m = re.search(rb"/Pages\s+(\d+)\s+\d+\s+R", cat)
        if m:
            pages_num = int(m.group(1))

    order = []
    seen = set()

    def walk(num, depth=0):
        if num in seen or depth > 64:
            return
        seen.add(num)
        body = objs.get(num)
        if body is None:
            return
        d = _dict_of(body)
        if re.search(rb"/Type\s*/Pages\b", d) or b"/Kids" in d:
            kids = re.search(rb"/Kids\s*\[(.*?)\]", d, re.S)
            if kids:
                for k in re.finditer(rb"(\d+)\s+\d+\s+R", kids.group(1)):
                    walk(int(k.group(1)), depth + 1)
                return
        if re.search(rb"/Type\s*/Page\b", d):
            order.append(num)

    if pages_num is not None:
        walk(pages_num)

    if not order:                  # no usable tree: fall back to object order
        order = sorted(n for n, b in objs.items()
                       if re.search(rb"/Type\s*/Page\b", _dict_of(b)))
    return order


SYMBOL_FONT = re.compile(rb"/BaseFont\s*/[^\s/>]*(?:Wingdings|Symbol|ZapfDingbats|Webdings)",
                         re.I)
FONT_RES = re.compile(rb"/([A-Za-z0-9_.+\-]+)\s+(\d+)\s+\d+\s+R")


BFCHAR = re.compile(rb"beginbfchar(.*?)endbfchar", re.S)
BFRANGE = re.compile(rb"beginbfrange(.*?)endbfrange", re.S)
HEXTOK = re.compile(rb"<([0-9A-Fa-f]+)>")


def _utf16be(h):
    """A CMap destination, which is UTF-16BE, as a Python string."""
    try:
        return bytes.fromhex(h.decode("ascii")).decode("utf-16-be", errors="replace")
    except ValueError:
        return ""


def _tounicode(objs, font_obj):
    """Parse a /ToUnicode CMap into {code point -> string}.

    Only the two forms these files use are handled: bfchar pairs and bfrange
    triples (with either a starting destination or an explicit array).
    """
    m = re.search(rb"/ToUnicode\s+(\d+)\s+\d+\s+R", font_obj)
    if not m:
        return {}
    body = objs.get(int(m.group(1)), b"")
    cmap_bytes = _stream_bytes(body, _dict_of(body))
    if not cmap_bytes:
        return {}

    table = {}
    for block in BFCHAR.findall(cmap_bytes):
        toks = HEXTOK.findall(block)
        for i in range(0, len(toks) - 1, 2):
            table[int(toks[i], 16)] = _utf16be(toks[i + 1])

    for block in BFRANGE.findall(cmap_bytes):
        for entry in re.finditer(
                rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[(.*?)\])",
                block, re.S):
            lo, hi = int(entry.group(1), 16), int(entry.group(2), 16)
            if hi - lo > 65535:
                continue
            if entry.group(3):
                dst = entry.group(3)
                base = int(dst, 16)
                width = len(dst)
                for k in range(hi - lo + 1):
                    table[lo + k] = _utf16be(("%0*x" % (width, base + k)).encode())
            else:
                for k, h in enumerate(HEXTOK.findall(entry.group(4))):
                    if lo + k <= hi:
                        table[lo + k] = _utf16be(h)
    return table


def _page_fonts(objs, page_num):
    """Resource name -> "simple" | "symbol" | "composite" for one page.

    This is what makes decoding safe. A simple font in one of these documents is
    standard-encoded, so its strings decode directly. A dingbat font is only ever
    used to draw a bullet, and is rendered as one. A composite (Type0) font used
    for real text would need its /ToUnicode CMap, which is not implemented - so
    `extract` refuses rather than returning mojibake, but only when such a font
    actually draws something.
    """
    body = objs.get(page_num, b"")
    fonts = re.search(rb"/Font\s*<<(.*?)>>", _dict_of(body), re.S)
    if not fonts:
        return {}
    out = {}
    for m in FONT_RES.finditer(fonts.group(1)):
        fobj = objs.get(int(m.group(2)), b"")
        name = b"/" + m.group(1)
        if SYMBOL_FONT.search(fobj):
            out[name] = "symbol"
        elif re.search(rb"/Subtype\s*/Type0\b", fobj):
            table = _tounicode(objs, fobj)
            out[name] = ("cmap", table) if table else "composite"
        else:
            out[name] = "simple"
    return out


def _content_of(objs, page_num):
    body = objs.get(page_num, b"")
    d = _dict_of(body)
    m = re.search(rb"/Contents\s*(?:(\d+)\s+\d+\s+R|\[(.*?)\])", d, re.S)
    if not m:
        return b""
    refs = [int(m.group(1))] if m.group(1) else \
           [int(x.group(1)) for x in re.finditer(rb"(\d+)\s+\d+\s+R", m.group(2))]
    parts = []
    for r in refs:
        cb = objs.get(r)
        if cb is None:
            continue
        blob = _stream_bytes(cb, _dict_of(cb))
        if blob:
            parts.append(blob)
    return b"\n".join(parts)


# --------------------------------------------------------------------------
# content stream -> text
# --------------------------------------------------------------------------

TOKEN_RE = re.compile(rb"""
    (?P<str>\((?:\\.|[^\\()]|\((?:\\.|[^\\()])*\))*\))   # (literal string)
  | (?P<hex><[0-9A-Fa-f\s]*>)                            # <hex string>
  | (?P<arr>\[)                                          # array open
  | (?P<arrend>\])
  | (?P<num>[-+]?\d*\.?\d+)
  | (?P<name>/[^\s/\[\]<>()]+)
  | (?P<op>[A-Za-z'"*]+)
""", re.X | re.S)

ESCAPES = {b"n": b"\n", b"r": b"\r", b"t": b"\t", b"b": b"\b",
           b"f": b"\f", b"(": b"(", b")": b")", b"\\": b"\\"}


def _unescape(raw):
    """PDF literal string body -> bytes."""
    out = bytearray()
    i = 0
    body = raw[1:-1]
    while i < len(body):
        c = body[i:i + 1]
        if c != b"\\":
            out += c
            i += 1
            continue
        nxt = body[i + 1:i + 2]
        if nxt in ESCAPES:
            out += ESCAPES[nxt]
            i += 2
        elif nxt.isdigit():
            j = i + 1
            digits = b""
            while j < len(body) and len(digits) < 3 and body[j:j + 1].isdigit():
                digits += body[j:j + 1]
                j += 1
            out.append(int(digits, 8) & 0xFF)
            i = j
        elif nxt in (b"\n", b"\r"):
            i += 2                      # line continuation
        else:
            out += nxt
            i += 2
    return bytes(out)


def _decode(bs):
    return bs.decode("cp1252", errors="replace")


def _glyphs(raw, font, fonts, bad):
    """One drawn string -> text, according to the kind of font drawing it."""
    kind = fonts.get(font, "simple")
    if kind == "symbol":
        return "•"
    if isinstance(kind, tuple):
        # A composite font with a usable /ToUnicode: Identity-H, so two bytes
        # per glyph.
        table = kind[1]
        return "".join(table.get((raw[i] << 8) | raw[i + 1], "")
                       for i in range(0, len(raw) - 1, 2))
    if kind == "composite":
        if bad is not None:
            bad.add(font.decode("latin-1") if isinstance(font, bytes) else str(font))
        return ""
    return _decode(raw)


def _page_text(content, fonts=None, bad=None):
    """One page of content stream -> text, laid out by the text matrix."""
    fonts = fonts or {}
    pieces = []          # (x, y, size, text)
    font = None
    x = y = 0.0
    # Td/TD/TL operands are in unscaled text-space units: they only become page
    # units once multiplied by the scale in the text matrix. Missing this makes
    # every line advance ~12x too small, and the whole page collapses into a
    # handful of overlapping lines.
    sx = sy = 1.0
    leading = 0.0        # unscaled
    stack = []
    in_array = False
    arr_items = []

    for m in TOKEN_RE.finditer(content):
        kind = m.lastgroup
        val = m.group()

        if kind == "arr":
            in_array, arr_items = True, []
            continue
        if kind == "arrend":
            in_array = False
            stack.append(("array", arr_items))
            continue
        if kind == "str":
            item = ("str", _unescape(val))
            (arr_items if in_array else stack).append(item)
            continue
        if kind == "hex":
            h = re.sub(rb"\s", b"", val[1:-1])
            if len(h) % 2:
                h += b"0"
            item = ("str", bytes.fromhex(h.decode("ascii")))
            (arr_items if in_array else stack).append(item)
            continue
        if kind == "num":
            item = ("num", float(val))
            (arr_items if in_array else stack).append(item)
            continue
        if kind == "name":
            stack.append(("name", val))
            continue
        if kind != "op":
            continue

        op = val.decode("latin-1")
        nums = [v for k, v in stack if k == "num"]

        if op == "Tf":
            names = [v for k, v in stack if k == "name"]
            font = names[-1] if names else font
        elif op == "BT":
            x = y = 0.0
        elif op == "Tm" and len(nums) >= 6:
            a, b, c, d, e, f = nums[-6:]
            x, y = e, f
            sx = (a * a + b * b) ** 0.5 or 1.0
            sy = (c * c + d * d) ** 0.5 or 1.0
        elif op in ("Td", "TD") and len(nums) >= 2:
            x += nums[-2] * sx
            y += nums[-1] * sy
            if op == "TD":
                leading = -nums[-1]
        elif op == "TL" and nums:
            leading = nums[-1]
        elif op == "T*":
            y -= leading * sy
        elif op in ("Tj", "'", '"'):
            if op != "Tj":
                y -= leading * sy
            for k, v in reversed(stack):
                if k == "str":
                    pieces.append((x, y, sx, _glyphs(v, font, fonts, bad)))
                    break
        elif op == "TJ":
            for k, v in reversed(stack):
                if k == "array":
                    buf = []
                    for ik, iv in v:
                        if ik == "str":
                            buf.append(_glyphs(iv, font, fonts, bad))
                        elif ik == "num" and iv < -120:
                            buf.append(" ")     # kerning wide enough to be a space
                    pieces.append((x, y, sx, "".join(buf)))
                    break
        stack = []

    if not pieces:
        return ""

    # Group into lines by y, then order each line by x.
    pieces.sort(key=lambda p: (-p[1], p[0]))
    lines = []
    cur_y = None
    cur = []
    for px, py, size, txt in pieces:
        # Half the font size is a safe line-separation threshold: it tolerates
        # the sub-point baseline jitter of superscripts without merging rows.
        tol = max(2.0, size * 0.5)
        if cur_y is None or abs(py - cur_y) > tol:
            if cur:
                lines.append(cur)
            cur = [(px, size, txt)]
            cur_y = py
        else:
            cur.append((px, size, txt))
    if cur:
        lines.append(cur)

    out = []
    for line in lines:
        line.sort(key=lambda p: p[0])
        buf = ""
        last_end = None
        for px, size, txt in line:
            gap = size * 0.25
            if last_end is not None and px - last_end > gap and buf \
                    and not buf.endswith(" ") and not txt.startswith(" "):
                buf += " "
            buf += txt
            last_end = px + len(txt) * size * 0.5    # rough advance, for gaps only
        out.append(re.sub(r"[ \t]+", " ", buf).rstrip())
    return "\n".join(out)


# --------------------------------------------------------------------------

def extract(path):
    """PDF file -> plain text, page by page, in reading order."""
    with open(path, "rb") as f:
        data = f.read()

    if not data.startswith(b"%PDF"):
        raise PdfError("%s is not a PDF" % path)

    objs = _objects(data)
    pages = _page_order(objs, data)
    if not pages:
        raise PdfError("no pages found in %s" % path)

    # Fonts are classified per page rather than checked once over the raw bytes:
    # most font dictionaries live inside compressed object streams, so scanning
    # the file for /ToUnicode sees nothing and gives false confidence.
    bad = set()
    out = [_page_text(_content_of(objs, p), _page_fonts(objs, p), bad) for p in pages]

    if bad:
        raise PdfError(
            "%s draws text with the composite font(s) %s, which need the /ToUnicode "
            "CMap this extractor does not implement. Extract it with an external "
            "tool and drop the .txt beside the PDF." % (path, ", ".join(sorted(bad))))

    return "\n\n".join(out)


if __name__ == "__main__":
    import sys
    print(extract(sys.argv[1]))
