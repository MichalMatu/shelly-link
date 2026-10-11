from pathlib import Path

p = Path("packages/script-generator/src/shelly/generate.ts")
s = p.read_text()
replacements = [
    ('a===undefined', 'a===void 0'),
    ('c.ag===undefined', 'c.ag===void 0'),
    ('x.rssi!==undefined', 'x.rssi!=null'),
    ('C.ag===undefined?3:C.ag', 'C.ag==null?3:C.ag'),
    ('function parse(x,p,j){return p===1?pt(x,j):pb(x,j);}', 'function parse(x,p,j){return p==1?pt(x,j):pb(x,j)}'),
    ('z===C.a?0:-1', 'z==C.a?0:-1'),
    ('z===s[i][0]', 'z==s[i][0]'),
    ('e!==BLE.Scanner.SCAN_RESULT', 'e!=BLE.Scanner.SCAN_RESULT'),
    ('u[6]!==x', 'u[6]!=x'),
    ('u[3]!==null', 'u[3]!=null'),
    ('l===null', 'l==null'),
    ('v===undefined||v===null?null:v&255', 'v==null?null:v&255'),
]
for old, new in replacements:
    if old not in s:
        raise SystemExit(f"expected generate.ts block not found: {old}")
    s = s.replace(old, new, 1)
p.write_text(s)

p = Path("packages/script-generator/src/__tests__/generator.test.ts")
s = p.read_text()
old = "        0,\n        'boot'\n      ],"
new = "        0,\n        'boot',\n        0,\n        false\n      ],"
if old not in s:
    raise SystemExit("diagnostics expectation block not found")
p.write_text(s.replace(old, new, 1))
