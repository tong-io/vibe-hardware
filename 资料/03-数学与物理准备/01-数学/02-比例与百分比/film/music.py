"""Original score — a small toy band at 108 BPM in C: ukulele strums, pizzicato bass, glockenspiel melody, woodblock
and claps. Each step adds one colour; the riddle's silences are real silences; answers ring a xylophone run; the last
reveal lands on a full C chord. Reads events.json. Writes music/score.wav and music/credits.txt."""
import sys, os, json, math, numpy as np, soundfile as sf
sys.path.insert(0, os.environ['LIB'])
from core.audio import sampler as S
from core.audio.sfx import SR
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json'))); E = ev['ev']; DUR = ev['dur']
C = next(e for e in E if e['type'] == 'cues'); SIL = C['SIL']; SEC = {s['kind']: s for s in C['SEC']}
BPM = 108; B = 60 / BPM; BAR = 4 * B
S.seed(12)
N = []
def n(t, inst, p, d, v=.6, pan=0., g=1., **kw):
    if t < 0 or t >= DUR or any(a - .03 <= t < b for a, b in SIL): return
    N.append(dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, gain=g, **kw))
CH = {'C': [48, 52, 55, 60], 'F': [53, 57, 60, 65], 'G': [55, 59, 62, 67], 'Am': [57, 60, 64, 69], 'Dm': [50, 53, 57, 62], 'Em': [52, 55, 59, 64]}
ROOT = {'C': 36, 'F': 41, 'G': 43, 'Am': 45, 'Dm': 38, 'Em': 40}
PROG = {'hook': ['C', 'Am', 'F', 'G'], 's1': ['C', 'F', 'G', 'C'], 's2': ['F', 'G', 'Em', 'Am'], 's3': ['C', 'Am', 'Dm', 'G'],
        's4': ['F', 'C', 'G', 'C'], 's5': ['Am', 'F', 'C', 'G'], 'sum': ['C', 'F', 'G', 'C'], 'end': ['C', 'Am', 'F', 'G']}
LAYERS = {'hook': 1, 's1': 2, 's2': 3, 's3': 4, 's4': 4, 's5': 4, 'sum': 2, 'end': 3}
MEL = [(0, 72, .5), (.5, 76, .5), (1, 79, 1), (2, 81, .5), (2.5, 79, .5), (3, 76, 1), (4, 77, 1), (5, 76, .5), (5.5, 74, .5), (6, 72, 2)]

def groove(t0, t1, prog, layers, lv=1.):
    b = math.ceil(t0 / BAR - .01); k = 0
    while b * BAR < t1 - .3:
        t = b * BAR; ch = prog[k % len(prog)]
        for beat, up in ((0, 0), (1.5, 1), (2, 0), (3.5, 1)):      # ukulele: down, up, down, up
            for j, p in enumerate(CH[ch] if not up else CH[ch][::-1]): n(t + beat * B + j * .012, 'ukulele', p + 12, B * .9, (.42 if not up else .3) * lv, -.2, .9)
        if layers >= 2:
            n(t, 'contrabass_pizz', ROOT[ch], .5, .7 * lv, 0, 1.0); n(t + 2 * B, 'contrabass_pizz', ROOT[ch] + 7, .5, .6 * lv, 0, 1.0)
        if layers >= 3:
            for i in range(4): n(t + i * B, 'woodblock', 'a' if i % 2 == 0 else 'b', None, .26 * lv, .35, .5)
        if layers >= 4:
            for i in (1, 3): n(t + i * B, 'claps', 'group', None, .3 * lv, 0, .4)
        b += 1; k += 1
def melody(t0, lv=.5, tr=0):
    b = math.ceil(t0 / BAR - .01) * BAR
    for o, p, d in MEL: n(b + o * B, 'glockenspiel', p + 12 + tr, d * B, lv, .3, .7)

for k, s in SEC.items():
    t0, t1 = s['t0'], s['t1']
    if k == 'hook':
        groove(.4, SIL[0][0], PROG[k], 1, .7)
        groove(SIL[0][1], t1, PROG[k], 2, .85); melody(C['title'], .6)
    elif k == 'end':
        groove(t0, SIL[1][0], PROG[k], 2, .75)
        w = C['win']
        for i, p in enumerate([72, 76, 79, 84, 88, 91]): n(w + i * .05, 'xylophone', p, .4, .6, .2, .8)
        for p in CH['C'] + [64, 67]: n(w + .35, 'ukulele', p + 12, 2.5, .55, -.2, .9)
        n(w + .35, 'contrabass_pizz', 36, 1, .8, 0, 1.0); n(w + .35, 'glockenspiel', 'C7', 2.5, .5, .3, .6)
        groove(w + .35 + BAR, DUR - 2.0, PROG[k], 3, .8)
        L = DUR - 1.8
        for p in CH['C']: n(L, 'ukulele', p + 12, 2, .5, -.2, .9)
        n(L, 'contrabass_pizz', 36, 1, .7, 0, 1.0); n(L + .05, 'glockenspiel', 'C7', 1.6, .45, .3, .6)
    elif k == 'sum':
        groove(t0, t1, PROG[k], 2, .7)
        for t, p in zip(C['sumRows'], [72, 76, 79]): n(t, 'glockenspiel', p + 12, 1.2, .55, .3, .7)
    else:
        groove(t0, t1, PROG[k], LAYERS[k], .85); melody(t0 + .3, .45, tr={'s1': 0, 's2': 5, 's3': 7, 's4': 5, 's5': 2}[k])
for e in E:
    if e['type'] == 'ding':
        for i, p in enumerate([84, 88, 91]): n(e['t'] + i * .05, 'xylophone', p, .3, .45 * e.get('v', 1), .25, .7)

N.sort(key=lambda e: e['t'])
mix = S.render(N, dur=DUR + 1, master=False)
mix = S.room(mix, size=.35, mix=.15)
os.makedirs(os.path.join(HERE, 'music'), exist_ok=True)
sf.write(os.path.join(HERE, 'music/score.wav'), mix.astype(np.float32), SR)
print('notes', len(N), 'peak', float(np.abs(mix).max()))
open(os.path.join(HERE, 'music/credits.txt'), 'w').write('\n'.join(S.credits(sorted({e['inst'] for e in N}))) + '\n')
