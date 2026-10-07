"""Foley + voice + score → out/mix.wav. Every brick that lands clicks (short transient + resonances near 2.9 and 4.6 kHz),
flights whoosh, answers ding, the camera's runs along the desk whoosh; room tone with a ticking clock owns the two
silences. Narration compressed on top, score ducked under it, −14 LUFS at mux."""
import sys, os, json, numpy as np, soundfile as sf, soxr
sys.path.insert(0, os.environ['LIB'])
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit, click, whoosh, ding, pop, thump
from core.audio import sampler as S
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json'))); E = ev['ev']; DUR = ev['dur']
C = next(e for e in E if e['type'] == 'cues')
rng = np.random.default_rng(5)
NS = int((DUR + 1) * SR)
fol, vo, room = (np.zeros((NS, 2), np.float32) for _ in range(3))
tt = lambda d: np.arange(int(d * SR)) / SR
def db(x): return 10 ** (x / 20)
def put(buf, x, t, g=1., pan=0.):
    if 0 <= t < DUR: add(buf, np.asarray(x, np.float32), t, g, pan)
def brick_click(p=1., v=1.):
    d = .09; t = tt(d); x = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t / .004) * .9
    for f, a, tau in ((2900, .5, .02), (4600, .35, .012), (1200, .2, .03)): x += np.sin(2 * np.pi * f * p * rng.uniform(.97, 1.03) * t) * np.exp(-t / tau) * a
    return x * .5 * v
last = -1
for e in E:
    ty, t, v = e['type'], e['t'], e.get('v', 1.)
    if ty == 'click':
        if t - last < .02: continue          # many tiles in one frame: one click is enough
        last = t; put(fol, brick_click(e.get('pitch', 1.), v), t, .9, float(rng.uniform(-.3, .3)))
    elif ty == 'whoosh': put(fol, whoosh(e.get('d', .4), v), t, .8, 0)
    elif ty == 'ding': put(fol, ding(v), t, .45, .2)
    elif ty == 'pop': put(fol, pop(v), t, .6, 0)
    elif ty == 'title': put(fol, pop(1.), t, .7, 0); put(fol, thump(.6, 90), t, .5, 0)

rt = lp(rng.standard_normal(NS), 300) * .008
room[:, 0] = rt; room[:, 1] = np.roll(rt, 311)
for a, b in C['SIL']:                         # a clock ticking inside each silence
    for k, t in enumerate(np.arange(a + .1, b, .5)):
        tick = hp(rng.standard_normal(int(.02 * SR)), 3000) * np.exp(-tt(.02) / .002) * (.07 if k % 2 else .05); put(room, tick, t, 1, .5)

vo_lines = json.load(open(os.path.join(HERE, 'lines.json')))
vo_t = {e['id']: e['t'] for e in E if e['type'] == 'vo'}
vm = np.zeros(NS, np.float32)
for L in vo_lines:
    y, sr = sf.read(os.path.join(HERE, 'voices', L['id'] + '.wav'))
    y = soxr.resample(y.astype(np.float32), sr, SR); i = int(vo_t[L['id']] * SR); vm[i:i + len(y)] += y[:NS - i]
vm = hp(vm, 80); vm = compress(vm / (np.abs(vm).max() + 1e-9) * .8, thr=.2, ratio=3.0, att=.004, rel=.1)
vo[:, 0] = vm; vo[:, 1] = vm; vo = vo * .9 + S.room(vo, size=.2, mix=.1) * .1

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
mix = vo + mus * (vr / mr) * db(-9) + fol * (vr / fr) * db(-11) + room
mix = np.stack([limit(mix[:, c], .95) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out/mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
print('rms vo/music/foley', round(20 * np.log10(vr), 1), round(20 * np.log10(mr), 1), round(20 * np.log10(fr), 1), 'peak', float(np.abs(mix).max()))
