"""Original score — West-Coast cool jazz combo at 112 BPM: vibraphone comping, walking jazz bass, brushes, a flute that
answers the big moments. Every step owns a vibraphone chord cycle; the summary brings each step's colour back on its
stamp; the riddle's two silences are real silences; the box opens on a flute run and a full F6.
Reads events.json. Writes music/score.wav (stereo 48k) and music/credits.txt."""
import sys, os, json, math, numpy as np, soundfile as sf
sys.path.insert(0, os.environ['LIB'])
from core.audio import sampler as S
from core.audio.sfx import SR
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json'))); E = ev['ev']; DUR = ev['dur']
C = next(e for e in E if e['type'] == 'cues'); B = C['BEAT']; BAR = 4 * B; SIL = C['SIL']
SEC = {s['kind']: s for s in C['SEC']}
S.seed(9)
N = []
def n(t, inst, p, d, v=.6, pan=0., g=1., **kw):
    if t < 0 or t >= DUR or any(a - .03 <= t < b for a, b in SIL): return
    N.append(dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, gain=g, **kw))

ROOT = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
QUAL = {'6': [0, 4, 7, 9], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '9': [0, 4, 10, 14], '7': [0, 4, 7, 10]}
def chord(name):
    r = name[:2] if len(name) > 1 and name[1] == 'b' else name[0]; q = name[len(r):]
    return ROOT[r], QUAL[q]
def voicing(name, base=53):                        # close voicing around F3–D5
    r, iv = chord(name); root = base + ((r - base) % 12)
    return [root + i for i in iv]
CYC = {'hook': ['F6', 'Dm7', 'Gm7', 'C9'], 's1': ['F6', 'Gm7', 'C9', 'F6'], 's2': ['Bbmaj7', 'Gm7', 'C9', 'F6'],
       's3': ['Dm7', 'G9', 'Gm7', 'C9'], 's4': ['Am7', 'D9', 'Gm7', 'C9'], 's5': ['Bbmaj7', 'C9', 'Am7', 'Dm7'],
       'sum': ['F6', 'Bbmaj7', 'C9', 'F6'], 'end': ['F6', 'Dm7', 'Gm7', 'C9']}
LEVEL = {'hook': .8, 's1': .8, 's2': .85, 's3': .85, 's4': .9, 's5': .85, 'sum': .7, 'end': .9}

def comp(t0, t1, cyc, lv, brushes=True, bass=True, vib=True):
    b = math.ceil(t0 / BAR - .01); k = 0
    while b * BAR < t1 - .3:
        t = b * BAR; name = cyc[k % len(cyc)]; nxt = cyc[(k + 1) % len(cyc)]
        r, iv = chord(name); nr, _ = chord(nxt)
        if vib:
            for p in voicing(name): n(t, 'vibraphone', p, BAR * .55, .42 * lv, -.25, .8)
            for p in voicing(name)[1:]: n(t + 1.5 * B, 'vibraphone', p + 12, .5, .3 * lv, -.2, .6)
        if bass:                                     # walking: root, 3rd/5th, 5th, chromatic approach
            R0 = 36 + ((r - 36) % 12); tgt = 36 + ((nr - 36) % 12)
            line = [R0, R0 + iv[1], R0 + 7, tgt + (1 if tgt < R0 + 7 else -1)]
            for i, p in enumerate(line): n(t + i * B, 'jazz_bass', p, B * .9, .7 * lv, 0, 1.0)
        if brushes:
            for i in range(4):
                n(t + i * B, 'hihat', 'closed', None, .18 * lv, .3, .4)
                if i % 2: n(t + i * B, 'snare2', 'taps', None, .3 * lv, .15, .45)
                n(t + i * B + B * .66, 'hihat', 'closed', None, .12 * lv, .3, .3)
        b += 1; k += 1

FLUTE = [(0, 77, .5), (.5, 81, .5), (1, 84, 1), (2, 86, .5), (2.5, 84, .5), (3, 81, 1.5), (5, 79, .5), (5.5, 77, 2)]
def flute(t0, lv=.55, tr=0):
    b = math.ceil(t0 / B - .01) * B
    for o, p, d in FLUTE: n(b + o * B, 'flute', p + tr, d * B * .95, lv, .25, .7, attack=.03)

for k, s in SEC.items():
    t0, t1 = s['t0'], s['t1']
    if k == 'hook':
        comp(SIL[0][1], t1, CYC[k], LEVEL[k] * .8, brushes=False)          # after the riddle's silence
        comp(.2, SIL[0][0], CYC[k], .55, brushes=False, bass=False)       # just the vibes under the riddle
        tt = next(e['t'] for e in E if e['type'] == 'title'); flute(tt, .6)
    elif k == 'end':
        comp(t0, SIL[1][0], CYC[k], .55, brushes=False)
        op = C['open']
        for i, p in enumerate([65, 69, 72, 74, 77, 81, 84]): n(op + .1 + i * .06, 'flute', p, .3, .55, .25, .7)
        for p in voicing('F6') + [41, 29]: n(op + .5, 'vibraphone' if p > 50 else 'jazz_bass', p, 3, .6, 0, .9)
        comp(op + .5 + BAR, DUR - 2.6, CYC[k], LEVEL[k])
        L = DUR - 2.3
        for p in voicing('F6') + [voicing('F6')[0] + 12]: n(L, 'vibraphone', p, 3.5, .55, 0, .8)
        n(L, 'jazz_bass', 29, 2.5, .8, 0, 1.0); n(L + .1, 'flute', 84, 2.0, .5, .25, .7, attack=.1)
        n(L, 'glockenspiel', 'F6', 2, .4, .3, .5)
    elif k == 'sum':
        comp(t0, t1, CYC[k], LEVEL[k] * .8, brushes=False)
        for i, (t, nm) in enumerate(zip(C['sumRows'], ['F6', 'Bbmaj7', 'C9'])):
            for j, p in enumerate(voicing(nm, 60)): n(t + j * .05, 'vibraphone', p, 2.2, .6, .1, .9)
    else:
        comp(t0, t1, CYC[k], LEVEL[k])
        flute(t0 + .2, .45, tr={'s1': 0, 's2': 5, 's3': 2, 's4': 4, 's5': 5}[k])

# answers ring a little vibraphone arpeggio; the wrong way gets a sour bass slide
for e in E:
    if e['type'] == 'ding':
        for i, p in enumerate([77, 81, 84, 89]): n(e['t'] + i * .06, 'vibraphone', p, .8, .5, .3, .7)
w = C['wrong']; n(w, 'jazz_bass', 43, .3, .8, 0, 1.0); n(w + .2, 'jazz_bass', 42, .3, .8, 0, 1.0); n(w + .4, 'jazz_bass', 41, .6, .8, 0, 1.0)

N.sort(key=lambda e: e['t'])
mix = S.render(N, dur=DUR + 1, master=False)
mix = S.room(mix, size=.38, mix=.18)
os.makedirs(os.path.join(HERE, 'music'), exist_ok=True)
sf.write(os.path.join(HERE, 'music/score.wav'), mix.astype(np.float32), SR)
print('notes', len(N), 'peak', float(np.abs(mix).max()))
open(os.path.join(HERE, 'music/credits.txt'), 'w').write('\n'.join(S.credits(sorted({e['inst'] for e in N}))) + '\n')
