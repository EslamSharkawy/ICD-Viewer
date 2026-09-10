#!/usr/bin/env python3
"""
Pack the whole workbench into one HTML file that can be emailed or dropped on a
shared drive: no server, no network, no install. Open it and it works.

    python build/bundle2.py                  -> icd10-coder-workbench.html
    python build/bundle2.py somewhere.html

This is the sibling of bundle.py, which packs the original diagnosis-only tool.
Neither touches the other's output, so both single-file builds can sit on the
same shared drive.

Two differences from bundle.py worth knowing about:

  * It walks assets/js AND assets/js2, with module keys relative to assets/ -
    so the original modules are "js/ui.js" and the new ones "js2/main2.js", and
    an import of "../js/ui.js" from inside js2/views resolves the same way it
    does in the browser. The original files are read, never written.

  * It collects data/ and data-pcs/. The procedure data is keyed under "pcs/",
    which is exactly where assets/js2/pcsdata.js looks for it.
"""

import base64
import gzip
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
JS_DIRS = [os.path.join(ASSETS, 'js'), os.path.join(ASSETS, 'js2')]
DATA_DIRS = [(os.path.join(ROOT, 'data'), ''),
             (os.path.join(ROOT, 'data-pcs'), 'pcs/')]
SHELL = os.path.join(ROOT, 'coder.html')
CSS_FILES = [os.path.join(ASSETS, 'app.css'), os.path.join(ASSETS, 'v2.css')]
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'icd10-coder-workbench.html')

ENTRY = 'js2/main2.js'

IMPORT_RE = re.compile(
    r'^import\s+(?:(\*\s+as\s+\w+)|(\{[^}]*\}))\s+from\s+[\'"]([^\'"]+)[\'"];\s*$',
    re.M | re.S)
EXPORT_CONST_RE = re.compile(r'^export\s+(const|let|class)\s+(\w+)', re.M)
EXPORT_FN_RE = re.compile(r'^export\s+(async\s+)?function\s+(\w+)', re.M)
EXPORT_LIST_RE = re.compile(r'^export\s*\{([^}]*)\};\s*$', re.M)


def module_key(path):
    """assets/js2/views/decide.js -> js2/views/decide.js"""
    return os.path.relpath(path, ASSETS).replace(os.sep, '/')


def resolve(spec, from_key):
    base = os.path.dirname(from_key)
    return os.path.normpath(os.path.join(base, spec)).replace(os.sep, '/')


def read_modules():
    mods = {}
    for root_dir in JS_DIRS:
        for dirpath, _dirs, files in os.walk(root_dir):
            for f in files:
                if f.endswith('.js'):
                    p = os.path.join(dirpath, f)
                    mods[module_key(p)] = open(p, encoding='utf-8').read()
    return mods


def transform(key, src):
    """ES module source -> function body with a require shim. Returns (body, deps)."""
    deps = []

    def swap_import(m):
        star, names, spec = m.group(1), m.group(2), m.group(3)
        dep = resolve(spec, key)
        deps.append(dep)
        if star:
            alias = star.split('as')[1].strip()
            return 'const %s = __require(%s);' % (alias, json.dumps(dep))

        # A named import becomes a destructuring pattern, so a rename has to
        # change form: `{ meta as cmMeta }` is valid in an import and a syntax
        # error in a destructuring assignment, where it is `{ meta: cmMeta }`.
        parts = []
        for piece in names.strip()[1:-1].split(','):
            piece = ' '.join(piece.split())
            if not piece:
                continue
            m2 = re.match(r'^(\S+)\s+as\s+(\S+)$', piece)
            parts.append('%s: %s' % (m2.group(1), m2.group(2)) if m2 else piece)
        return 'const { %s } = __require(%s);' % (', '.join(parts), json.dumps(dep))

    body = IMPORT_RE.sub(swap_import, src)

    exports = []
    exports += [m.group(2) for m in EXPORT_CONST_RE.finditer(body)]
    exports += [m.group(2) for m in EXPORT_FN_RE.finditer(body)]
    for m in EXPORT_LIST_RE.finditer(body):
        exports += [n.strip().split(' as ')[-1].strip() for n in m.group(1).split(',') if n.strip()]

    body = EXPORT_CONST_RE.sub(r'\1 \2', body)
    body = EXPORT_FN_RE.sub(lambda m: '%sfunction %s' % (m.group(1) or '', m.group(2)), body)
    body = EXPORT_LIST_RE.sub('', body)

    if exports:
        body += '\n' + '\n'.join(
            '__exports.%s = %s;' % (n, n) for n in dict.fromkeys(exports))

    # There is no JavaScript engine here to parse the result, so check the two
    # ways this transform is known to produce a syntax error rather than finding
    # out from a blank page. An `import { x as y }` that reached the output as a
    # destructuring pattern is the one that actually happened.
    for bad in re.finditer(r'const \{[^}]*\bas\b[^}]*\} = __require', body):
        raise SystemExit('%s: a renamed import was not converted to destructuring '
                         'syntax: %s' % (key, bad.group(0)[:90]))
    leftover = re.search(r'^\s*(import|export)\s', body, re.M)
    if leftover:
        line = body[leftover.start():body.find('\n', leftover.start())]
        raise SystemExit('%s: this module statement was not transformed, probably '
                         'because it spans several lines: %s' % (key, line.strip()[:90]))

    return body, deps


def order(mods, transformed):
    """Depth-first topological sort. Raises if the graph has a cycle."""
    done, marked, out = set(), set(), []

    def visit(k, trail):
        if k in done:
            return
        if k in marked:
            raise SystemExit('Cycle in the module graph: ' + ' -> '.join(trail + [k]) +
                             '\nBreak it before bundling.')
        marked.add(k)
        for d in transformed[k][1]:
            if d not in transformed:
                raise SystemExit('%s imports %s, which does not exist' % (k, d))
            visit(d, trail + [k])
        marked.discard(k)
        done.add(k)
        out.append(k)

    for k in sorted(mods):
        visit(k, [])
    return out


def collect_data():
    blob = {}
    for base, prefix in DATA_DIRS:
        if not os.path.isdir(base):
            raise SystemExit('%s does not exist - run the build scripts first' % base)
        for dirpath, _dirs, files in os.walk(base):
            for f in files:
                p = os.path.join(dirpath, f)
                rel = os.path.relpath(p, base).replace(os.sep, '/')
                blob[prefix + rel] = open(p, encoding='utf-8').read()
    return blob


def main():
    mods = read_modules()
    transformed = {k: transform(k, v) for k, v in mods.items()}
    sequence = order(mods, transformed)

    runtime = []
    for k in sequence:
        body, _deps = transformed[k]
        runtime.append('__define(%s, function (__exports, __require) {\n%s\n});'
                       % (json.dumps(k), body))

    html = open(SHELL, encoding='utf-8').read()
    css = '\n\n'.join(open(p, encoding='utf-8').read() for p in CSS_FILES)

    html = re.sub(r'\s*<link rel="stylesheet"[^>]*>', '', html)
    html = re.sub(r'\s*<script type="module"[^>]*></script>', '', html)
    body = html[html.index('<body>') + len('<body>'):html.index('</body>')]
    head_extra = re.search(r'^[ \t]*<link rel="icon".*$', html, re.M)

    data = collect_data()
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    packed = base64.b64encode(gzip.compress(raw, 9)).decode('ascii')

    meta = json.loads(data.get('pcs/meta.json', '{}'))

    fields = {
        '{{TITLE}}': 'ICD-10 Coder Workbench — %s' % meta.get('edition', ''),
        '{{ICON}}': head_extra.group(0).strip() if head_extra else '',
        '{{CSS}}': css,
        '{{BODY}}': body,
        '{{DATA}}': packed,
        '{{MODULES}}': '\n\n'.join(runtime),
        '{{ENTRY}}': json.dumps(ENTRY),
        '{{RAWMB}}': '%.0f' % (len(raw) / 1048576),
        '{{FILES}}': str(len(data)),
    }
    page = TEMPLATE
    for token, value in fields.items():
        page = page.replace(token, value)

    check(page)

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(page)

    size = os.path.getsize(OUT) / 1048576
    print('modules bundled : %d' % len(sequence))
    print('data files      : %d  (%.0f MB uncompressed, %.1f MB packed)'
          % (len(data), len(raw) / 1048576, len(packed) / 1048576))
    print('written         : %s  (%.1f MB)' % (OUT, size))


def check(page):
    """Structural sanity checks on the finished page.

    The hard lesson behind this: a bundle once shipped that rendered its own
    stylesheet as body text, and every behavioural check passed, because the
    scripts still ran. Function and appearance are separate claims, so this
    parses the output as HTML and refuses to write if the <style> element did
    not survive.
    """
    import html.parser

    problems = []

    head = page[:page.index('<style>')] if '<style>' in page else page[:4000]
    for line in head.splitlines():
        line = line.strip()
        if line.startswith('<') and line.count('"') % 2:
            problems.append('unbalanced quotes in head: ' + line[:90])

    class Probe(html.parser.HTMLParser):
        def __init__(self):
            super().__init__()
            self.style_chars = 0
            self.ids = set()
            self._in_style = False

        def handle_starttag(self, tag, attrs):
            d = dict(attrs)
            if d.get('id'):
                self.ids.add(d['id'])
            if tag == 'style':
                self._in_style = True

        def handle_endtag(self, tag):
            if tag == 'style':
                self._in_style = False

        def handle_data(self, data):
            if self._in_style:
                self.style_chars += len(data)

    probe = Probe()
    probe.feed(page)

    if probe.style_chars < 20000:
        problems.append('the stylesheet did not survive parsing (%d chars inside <style>) - '
                        'something before it is swallowing the document' % probe.style_chars)

    for need in ('view', 'boot', 'icd-data', 'drawer', 'guided-switch',
                 'subnav-cm', 'subnav-pcs'):
        if need not in probe.ids:
            problems.append('missing element #' + need)

    if problems:
        raise SystemExit('Refusing to write a broken bundle:\n  - ' + '\n  - '.join(problems))


TEMPLATE = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
{{ICON}}
<style>
{{CSS}}

/* Shown only while the embedded data is being unpacked. */
#boot {
  position: fixed; inset: 0; display: grid; place-items: center;
  background: var(--bg); color: var(--ink); z-index: 200; text-align: center;
  font-family: var(--sans); padding: 2rem;
}
#boot .boot-inner { max-width: 34rem; }
#boot h1 { font-size: 1.3rem; margin-bottom: .6rem; }
#boot p { color: var(--ink-2); font-size: .95rem; }
#boot .bar { height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; margin: 1.2rem 0 .6rem; }
#boot .bar i { display: block; height: 100%; width: 30%; background: var(--accent); border-radius: 2px;
  animation: boot 1.1s ease-in-out infinite; }
@keyframes boot { 0% { margin-left: -30%; } 100% { margin-left: 100%; } }
#boot.failed .bar { display: none; }
</style>
</head>
<body>

<div id="boot">
  <div class="boot-inner">
    <h1>Opening the code books…</h1>
    <div class="bar"><i></i></div>
    <p>Unpacking {{FILES}} data files, {{RAWMB}} MB of the official ICD-10-CM and ICD-10-PCS
       releases and both sets of coding guidelines. This happens once, in your browser.
       Nothing is downloaded and nothing is sent anywhere.</p>
  </div>
</div>

{{BODY}}

<script id="icd-data" type="application/gzip-base64">{{DATA}}</script>

<script>
(function () {
  'use strict';

  var boot = document.getElementById('boot');

  function fail(title, detail) {
    boot.className = 'failed';
    boot.innerHTML = '<div class="boot-inner"><h1>' + title + '</h1><p>' + detail + '</p></div>';
  }

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function unpack(bytes) {
    if (typeof DecompressionStream !== 'function') {
      return Promise.reject(new Error('no-decompression-stream'));
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  /* --- the module runtime: one function per source file, resolved on demand --- */
  var registry = {}, cache = {};
  function __define(name, factory) { registry[name] = factory; }
  function __require(name) {
    if (cache[name]) return cache[name];
    var factory = registry[name];
    if (!factory) throw new Error('Missing module: ' + name);
    var exports = cache[name] = {};
    factory(exports, __require);
    return exports;
  }

{{MODULES}}

  var packed = document.getElementById('icd-data').textContent.trim();

  unpack(b64ToBytes(packed))
    .then(function (json) {
      window.__ICD_DATA__ = JSON.parse(json);
      document.getElementById('icd-data').remove();   // free the base64 copy
      boot.remove();
      __require({{ENTRY}});
    })
    .catch(function (err) {
      if (String(err.message) === 'no-decompression-stream') {
        fail('This browser is too old to open the file',
             'The data inside is compressed, and unpacking it needs a browser feature ' +
             'this one does not have. Chrome, Edge, Firefox 113 or Safari 16.4 and newer all work.');
      } else {
        fail('The file could not be opened', 'Something went wrong unpacking the data: ' +
             String(err && err.message || err) + '. If the file was edited or truncated in transit, ' +
             'ask for a fresh copy.');
      }
    });
})();
</script>
</body>
</html>
'''


if __name__ == '__main__':
    main()
