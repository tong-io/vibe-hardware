// Page contract: window.READY, window.render(t), window.DUR, window.EV
import { textures } from './engine/toon.js';
const Q = new URLSearchParams(location.search);
const cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all(['700 80px Oleo', '80px Slab', '500 40px Jost', '80px QK', '500 40px NS', '700 40px NS'].map(f => document.fonts.load(f, '公式x0')));
textures();
const [lines, durs, words] = await Promise.all(['lines.json', 'voices/dur.json', 'voices/words.json'].map(async u => (await fetch(u)).json()));
const film = await import('./film.js');
film.setup(lines, durs, words);
window.DUR = film.DUR(); window.EV = film.events(); window.SRT = film.srtCues();
window.render = t => { g.setTransform(1, 0, 0, 1, 0, 0); film.renderFilm(g, t, Q); };
window.READY = true;
