"""Foley + VO + score → out/mix.wav. Every prop event in events.json gets a sound by material: candies clink on the
dish, spoonfuls plop into the glasses, squares tick as they fill, scissors snip the price, medallions stamp, the iris
goes "shhk", the quarter slides on a slide whistle. Narration on top, score ducked."""
import sys, os, json, numpy as np, soundfile as sf, soxr
sys.path.insert(0, os.environ['LIB'])
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit, click, creak, thump, ding, pop, whoosh
from core.audio import sampler as S
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json'))); E = ev['ev']; DUR = ev['dur']
C = next(e for e in E if e['type'] == 'cues')
rng = np.random.default_rng(21)
NS = int((DUR + 1) * SR)
fol, vo, room = (np.zeros((NS, 2), np.float32) for _ in range(3))
tt = lambda d: np.arange(int(d * SR)) / SR
def db(x): return 10 ** (x / 20)
def put(buf, x, t, g=1., pan=0.):
    if 0 <= t < DUR: add(buf, np.asarray(x, np.float32), t, g, pan)
def ring(fs, taus, amps, d):
    x = np.zeros(int(d * SR)); t = tt(d)
    for f, ta, am in zip(fs, taus, amps): x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / ta) * am
    return x
def clink():                                       # a candy landing on a glazed dish
    f0 = rng.uniform(2100, 2600)
    x = ring([f0, f0 * 1.52, f0 * 2.31], [.06, .04, .025], [.5, .3, .15], .25)
    x[:120] += rng.standard_normal(120) * .5
    return x * .45
def buzz():
    t = tt(.45); x = np.sign(np.sin(2 * np.pi * 110 * t)) * .3 + np.sign(np.sin(2 * np.pi * 116 * t)) * .3
    return lp(x, 1400) * np.minimum(1, t / .01) * np.minimum(1, (.45 - t) / .05)
def shhk(d=.35):
    t = tt(d); return hp(rng.standard_normal(len(t)), 2500) * np.sin(np.pi * t / d) ** 2 * .3
def swish(d=.3):
    t = tt(d); return bp(rng.standard_normal(len(t)), 800, 5000) * np.sin(np.pi * t / d) ** 1.5 * .35
def slide_whistle(d):
    t = tt(d); u = t / d; f = 700 + 900 * np.sin(np.pi * u)    # up over the "=", down onto the other side
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * u) ** .7 * .25
def squeak(v=1.):
    t = tt(.18); f = 3200 + 1400 * np.sin(np.pi * t / .18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / .18) * .18 * v
def scamper(d):
    x = np.zeros(int(d * SR)); k = 0
    for t0 in np.arange(0, d - .03, 1 / 16):
        c = bp(rng.standard_normal(int(.012 * SR)), 2000, 6000) * np.linspace(1, 0, int(.012 * SR)); i = int(t0 * SR); x[i:i + len(c)] += c * (.5 + .3 * (k % 2)); k += 1
    return x * .35
def munch():
    x = np.zeros(int(.6 * SR))
    for t0 in (0, .18, .36):
        c = bp(rng.standard_normal(int(.07 * SR)), 1000, 5000) * np.exp(-tt(.07) / .02); i = int(t0 * SR); x[i:i + len(c)] += c
    return x * .4
def rip():
    t = tt(.5); return bp(rng.standard_normal(len(t)), 1500, 7000) * (np.abs(np.sin(t * 90)) ** 3) * np.minimum(1, (.5 - t) / .1) * .5
def lid(): return pop(1.0) * .8
def pour(c):                                       # a spoonful into the glass: a short liquid blip + bubbles
    t = tt(.3); f = (700 if c == 'l' else 520) * (1 + 1.5 * t / .3)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .06) * .35
    for k in range(3):
        b0 = rng.uniform(.04, .2); tb = tt(.05); fb = rng.uniform(900, 1600) * (1 + 2 * tb / .05)
        i = int(b0 * SR); bub = np.sin(2 * np.pi * np.cumsum(fb) / SR) * np.exp(-tb / .015) * .2; x[i:i + len(bub)] += bub[:len(x) - i]
    return x
def fill_ticks(d, up=1):                           # squares filling in: a run of soft ticks rising (or falling) in pitch
    x = np.zeros(int(d * SR) + SR // 4)
    for k, t0 in enumerate(np.arange(0, d, .07)):
        u = t0 / max(d, .01); c = click(1.0 + (u if up else 1 - u) * .8, .5); i = int(t0 * SR); x[i:i + len(c)] += c[:len(x) - i]
    return x * .6
def snip():
    x = np.zeros(int(.25 * SR))
    for t0 in (0, .11):
        c = bp(rng.standard_normal(int(.03 * SR)), 3000, 9000) * np.exp(-tt(.03) / .006); i = int(t0 * SR); x[i:i + len(c)] += c
    return x * .7
def paper(): return swish(.18) * .8

for e in E:
    ty, t, pan = e['type'], e['t'], e.get('pan', 0)
    if ty == 'drop': put(fol, clink(), t, .9, pan)
    elif ty == 'thud': put(fol, thump(.8, 100), t, .9, pan); put(fol, swish(.12), t - .05, .5, pan)
    elif ty == 'paper': put(fol, paper(), t, .8, pan)
    elif ty == 'out': put(fol, whoosh(.4, .5), t, .8, pan)
    elif ty == 'creak': put(fol, creak(e.get('v', 1.)), t, .9, .1)
    elif ty == 'buzz': put(fol, buzz(), t, .7, .3)
    elif ty == 'stamp': put(fol, thump(1.0, 80), t, 1.0, 0); put(fol, click(.6, .8), t, .6, 0)
    elif ty == 'iris': put(fol, shhk(), t, 1.0, 0)
    elif ty in ('slide', 'wipe'): put(fol, swish(.3), t, .9, -.2)
    elif ty == 'pop': put(fol, pop(e.get('v', 1.)), t, .7, .1)
    elif ty == 'pill': put(fol, pop(.6), t, .5, .2); put(fol, pop(.5), t + .12, .5, .3)
    elif ty == 'chalk': put(fol, click(1.3, .4), t, .5, .2)
    elif ty == 'ding': put(fol, ding(e.get('v', 1.)), t, .5, .25)
    elif ty == 'slidewhistle': put(fol, slide_whistle(e['dur']), t, .9, .2)
    elif ty == 'scamper': put(fol, scamper(e['dur']), t, 1.0, -.4)
    elif ty == 'squeak': put(fol, squeak(e.get('v', 1.)), t, 1.0, -.3)
    elif ty == 'munch': put(fol, munch(), t, .9, -.3)
    elif ty == 'rip': put(fol, rip(), t, .9, -.2)
    elif ty == 'lid': put(fol, lid(), t, 1.0, -.2)
    elif ty == 'pour': put(fol, pour(e.get('c', 'w')), t, .9, pan)
    elif ty == 'fill': put(fol, fill_ticks(e['dur'], e.get('up', 1)), t, .8, .2)
    elif ty == 'snip': put(fol, snip(), t, 1.0, -.2)
    elif ty == 'title': put(fol, swish(.4), t - .1, .8, 0); put(fol, thump(.7, 90), t + .25, .7, 0)

# room tone, silent inside the two silences
rt = lp(rng.standard_normal(NS), 500) * .006
for a, b in C['SIL']: rt[int(a * SR):int(b * SR)] *= .25
room[:, 0] = rt; room[:, 1] = np.roll(rt, 211)

vo_lines = json.load(open(os.path.join(HERE, 'lines.json')))
vo_t = {e['id']: e['t'] for e in E if e['type'] == 'vo'}
vm = np.zeros(NS, np.float32)
for L in vo_lines:
    y, sr = sf.read(os.path.join(HERE, 'voices', L['id'] + '.wav'))
    y = soxr.resample(y.astype(np.float32), sr, SR); i = int(vo_t[L['id']] * SR); vm[i:i + len(y)] += y[:NS - i]
vm = hp(vm, 80); vm = compress(vm / (np.abs(vm).max() + 1e-9) * .8, thr=.2, ratio=3.0, att=.004, rel=.1)
vo[:, 0] = vm; vo[:, 1] = vm
vo = vo * .9 + S.room(vo, size=.2, mix=.1) * .1

mus, _ = sf.read(os.path.join(HERE, 'music/score.wav')); mus = mus[:NS]
if len(mus) < NS: mus = np.pad(mus, ((0, NS - len(mus)), (0, 0)))
env = np.convolve(np.abs(vm), np.ones(2400) / 2400, 'same'); on = (env > .02).astype(np.float32)
g, dk = 0., np.zeros(NS, np.float32)
for j in range(0, NS, 240):
    tgt = on[j]; g += (tgt - g) * (240 / (.06 * SR) if tgt > g else 240 / (.4 * SR)); dk[j:j + 240] = g
mus = mus * (1 - (1 - db(-8)) * dk)[:, None]
for a, b in C['SIL']:
    i0, i1 = int(a * SR), int(b * SR); f = int(.15 * SR); mus[i0:i0 + f] *= np.linspace(1, 0, f)[:, None]; mus[i0 + f:i1] = 0

def rms(x): return float(np.sqrt(np.mean(x[np.abs(x).max(1) > 1e-4] ** 2))) if np.any(np.abs(x) > 1e-4) else 1.
vr, mr, fr = rms(vo), rms(mus), rms(fol)
mix = vo + mus * (vr / mr) * db(-9) + fol * (vr / fr) * db(-10) + room
mix = np.stack([limit(mix[:, c], .95) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out/mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
print('rms vo/music/foley', round(20 * np.log10(vr), 1), round(20 * np.log10(mr), 1), round(20 * np.log10(fr), 1), 'peak', float(np.abs(mix).max()))
