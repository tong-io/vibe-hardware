# subset the Chinese fonts to every character in lines.json and film.js (Google Fonts CSS API, &text=)
import json, os, re, urllib.parse, urllib.request
HERE = os.path.join(os.path.dirname(__file__), '..')
src = ''.join(x['text'] for x in json.load(open(os.path.join(HERE, 'lines.json')))) + open(os.path.join(HERE, 'film.js')).read()
chars = ''.join(sorted(set(c for c in src if ord(c) > 127) | set('0123456789:%=+-×÷−?!，。：、“”（）/xX¼')))
q = urllib.parse.quote(chars)
for fam, fn in [('ZCOOL+QingKe+HuangYou', 'ZCOOLQingKe-subset.ttf'), ('Noto+Sans+SC:wght@500;700', 'NotoSansSC-subset')]:
    css = urllib.request.urlopen(urllib.request.Request(f'https://fonts.googleapis.com/css2?family={fam}&text={q}', headers={'User-Agent': 'Mozilla/5.0'})).read().decode()
    for u, w in zip(re.findall(r'src: url\((.*?)\)', css), re.findall(r'font-weight: (\d+)', css)):
        name = fn if fn.endswith('.ttf') else f'{fn}-{w}.ttf'
        open(os.path.join(HERE, 'fonts', name), 'wb').write(urllib.request.urlopen(u).read()); print(name)
