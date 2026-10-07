// The desk: a real walnut desk under a neutral studio HDRI, toy-photography lights, a pencil and a teacup at true
// scale, and one matte baseplate per "workstation". Units: 1 = one stud pitch (8 mm); 1 m = 125 studs.
// Desk, lights and props adapted from the Lemo-Opuscar brick-toy demo (MIT).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { brickGeo } from './bricks.js';

const PH = '/core/assets/polyhaven/';
export const M = 125;
export const TOP = .3;                               // top of a baseplate
// workstations along the desk (centre x); every one sits on its own baseplate
export const ST = { ratio: -64, cups: -36, candy: -8, grid: 18, bag: 44, book: 82 };

export async function buildSet(scene) {
  const hdr = await new RGBELoader().loadAsync(PH + 'photo_studio_loft_hall_2k.hdr');
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; scene.background = hdr;
  scene.backgroundBlurriness = .5; scene.backgroundIntensity = .22; scene.environmentIntensity = .45;
  scene.environmentRotation.y = scene.backgroundRotation.y = 1.2;
  const tl = new THREE.TextureLoader(), tex = (f, srgb) => { const t = tl.load(PH + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(800, 600), new THREE.MeshStandardMaterial({ map: tex('walnut_diff.jpg', true), normalMap: tex('walnut_nor.jpg'), roughnessMap: tex('walnut_rough.jpg'), roughness: 1 }));
  desk.rotation.x = -Math.PI / 2; desk.position.set(0, 0, -60); desk.receiveShadow = true; scene.add(desk);

  const key = new THREE.DirectionalLight('#fff4e8', 3.0); key.position.set(-60, 110, 50);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 10, far: 400 }); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#cfe0ff', .45); fill.position.set(60, 40, -50); scene.add(fill);
  RectAreaLightUniformsLib.init();
  const soft = [];
  const box = (col, I, w, h) => { const l = new THREE.RectAreaLight(col, I, w, h); scene.add(l); soft.push(l); return l; };
  const softKey = box('#fff6ee', 6, 70, 45), softRim = box('#e4eeff', 9, 60, 30);

  const gl = new GLTFLoader(), load = async n => (await gl.loadAsync(`${PH}${n}/${n}.gltf`)).scene;
  const tea = await load('tea_set_01');
  const keep = { tea_set_01_cup_small_01: [ST.candy + 14 , -26, 2.4], tea_set_01_saucer_circular_04: [ST.candy + 14, -26, 0] };
  const dead = [];
  tea.traverse(o => { if (!o.name.startsWith('tea_set_01_')) return; const k = keep[o.name]; if (!k) dead.push(o); else { o.position.set(k[0] / M, o.position.y + (o.name.includes('cup_small') ? .012 : 0), k[1] / M); o.rotation.y = k[2]; } });
  dead.forEach(o => o.parent.remove(o)); tea.scale.setScalar(M); scene.add(tea);
  tea.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });

  // a pencil lying across the desk between two stations
  const pencil = new THREE.Group();
  const P = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = m.receiveShadow = true; pencil.add(m); };
  P(new THREE.CylinderGeometry(.95, .95, 22, 6), new THREE.MeshStandardMaterial({ color: '#f3b61f', roughness: .45 }), 0);
  P(new THREE.ConeGeometry(.95, 2.6, 6), new THREE.MeshStandardMaterial({ color: '#e9c89a', roughness: .8 }), 12.3);
  P(new THREE.ConeGeometry(.3, .8, 12), new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: .4 }), 14);
  P(new THREE.CylinderGeometry(1, 1, 1.4, 16), new THREE.MeshStandardMaterial({ color: '#b9bcc0', metalness: 1, roughness: .3 }), -11.7);
  P(new THREE.CylinderGeometry(.95, .95, 1.6, 16), new THREE.MeshStandardMaterial({ color: '#e88a8a', roughness: .8 }), -13.2);
  pencil.rotation.set(Math.PI / 2, 0, 1.25); pencil.position.set(ST.grid + 13, .95, 16); scene.add(pencil);

  // matte baseplates (a glossy one would reflect the softboxes as a colour wash)
  const base = (w, d, x, z, col = '#9ea3a6') => { const m = new THREE.Mesh(brickGeo(w, d, .3), new THREE.MeshPhysicalMaterial({ color: col, roughness: .6, clearcoat: .1, clearcoatRoughness: .5 })); m.position.set(x, 0, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  base(16, 12, ST.ratio, 0); base(20, 12, ST.cups, 0, '#7fae62'); base(24, 16, ST.candy, 0, '#d9b98e'); base(16, 16, ST.grid, 0); base(16, 14, ST.bag, 0, '#8db4d6');

  // a real book (closed, lying flat): two cloth boards, a spine and the page block showing toward the camera
  const book = new THREE.Group(); book.position.set(ST.book, 0, -4); book.rotation.y = -.05; scene.add(book);
  const cloth = new THREE.MeshStandardMaterial({ color: '#2f4a68', roughness: .78 });
  const board = y => { const m = new THREE.Mesh(new THREE.BoxGeometry(24, .35, 18), cloth); m.position.y = y; book.add(m); };
  board(.175); board(2.825);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(24, 3, .5), cloth); spine.position.set(0, 1.5, -8.8); book.add(spine);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(23.4, 2.3, 17.4), new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: .9 })); pages.position.set(0, 1.5, .2); book.add(pages);
  const c = document.createElement('canvas'); c.width = 768; c.height = 576; const g = c.getContext('2d');
  g.fillStyle = '#2f4a68'; g.fillRect(0, 0, 768, 576); g.strokeStyle = '#d9b45a'; g.lineWidth = 10; g.strokeRect(40, 40, 688, 496);
  g.fillStyle = '#e9cf8a'; g.font = '700 150px ZK'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('故事书', 384, 300);
  const cov = new THREE.CanvasTexture(c); cov.colorSpace = THREE.SRGBColorSpace;
  const title = new THREE.Mesh(new THREE.PlaneGeometry(23.6, 17.6), new THREE.MeshStandardMaterial({ map: cov, roughness: .75 })); title.rotation.x = -Math.PI / 2; title.position.y = 3.01; book.add(title);
  book.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });

  // lights follow the shot: key shadow frustum and softboxes are re-aimed at the focus every frame
  function aim(focus, span = 32) {
    key.target.position.copy(focus); key.position.copy(focus).add(new THREE.Vector3(-60, 110, 50)); key.target.updateMatrixWorld();
    Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span }); key.shadow.camera.updateProjectionMatrix();
    softKey.position.copy(focus).add(new THREE.Vector3(-55, 60, 55)); softKey.lookAt(focus.x, focus.y + 4, focus.z);
    softRim.position.copy(focus).add(new THREE.Vector3(45, 45, -75)); softRim.lookAt(focus.x, focus.y + 6, focus.z);
  }
  return { aim, BOOK_TOP: 3.6 };
}
