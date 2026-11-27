import * as THREE from 'three';
import { materiauSurface, projeterUV, surfacePourCouleur, tuileSurface } from './rendu.js';

export const PI = Math.PI;
export const TAU = PI * 2;

export function graine(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const C = {
  herbe: 0x8db55c,
  sable: 0xe5d1a7,
  sableOmbre: 0xcdb488,
  pierre: 0xe9ddc4,
  pierreClair: 0xf2e9d5,
  pierreSombre: 0xd3c3a5,
  dalle: 0xf5edde,
  mur: 0xf7f0e2,
  murOmbre: 0xe7dfcd,
  bois: 0xcfa46c,
  boisClair: 0xdfba89,
  boisFonce: 0x9c7145,
  terracotta: 0xc4734a,
  argile: 0xb98a63,
  verre: 0xb8dce7,
  metal: 0x64686b,
  metalClair: 0x8a8f92,
  ecran: 0x3d454b,
  ecranClair: 0xdceef1,
  blanc: 0xfcf8ef,
  tissu: 0xd9c9ae,
  tapis: 0xd8c6a8,
};

const cacheMats = new Map();

export function mat(color, opts = {}) {
  const reste = { ...opts };
  delete reste.surface;
  delete reste.tuile;
  const cle = color + '|' + JSON.stringify(reste);
  if (!cacheMats.has(cle)) {
    cacheMats.set(
      cle,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.86,
        metalness: 0,
        envMapIntensity: 0.45,
        ...reste,
      })
    );
  }
  return cacheMats.get(cle);
}

// Les helpers acceptent un matériau à la place d'une couleur : on récupère sa
// teinte et ses réglages, puis on repasse par la bibliothèque de surfaces pour
// que le volume reçoive enfin une vraie matière au lieu d'un aplat blanc.
function lireCouleur(valeur, opts) {
  if (!valeur?.isMaterial) return { couleur: valeur, opts };
  return {
    couleur: valeur.color.getHex(),
    opts: { roughness: valeur.roughness, metalness: valeur.metalness, ...opts },
  };
}

function surfaceDe(couleur, opts) {
  if (opts.surface === false) return null;
  return opts.surface || surfacePourCouleur(couleur);
}

function materiauDe(surface, couleur, opts) {
  if (!surface) return mat(couleur, opts);
  return materiauSurface(surface, couleur, opts) || mat(couleur, opts);
}

function preparerGeometrie(geo, surface, opts) {
  if (surface) projeterUV(geo, opts.tuile || tuileSurface(surface));
  return geo;
}

export function box(w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const spec = lireCouleur(color, opts);
  const surface = surfaceDe(spec.couleur, spec.opts);
  const geo = preparerGeometrie(new THREE.BoxGeometry(w, h, d), surface, spec.opts);
  const m = new THREE.Mesh(geo, materiauDe(surface, spec.couleur, spec.opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 16, opts = {}) {
  const spec = lireCouleur(color, opts);
  const surface = surfaceDe(spec.couleur, spec.opts);
  const geo = preparerGeometrie(new THREE.CylinderGeometry(rt, rb, h, seg), surface, spec.opts);
  const m = new THREE.Mesh(geo, materiauDe(surface, spec.couleur, spec.opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function plan(w, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const spec = lireCouleur(color, opts);
  const surface = surfaceDe(spec.couleur, spec.opts);
  const geo = preparerGeometrie(new THREE.PlaneGeometry(w, d), surface, spec.opts);
  const m = new THREE.Mesh(geo, materiauDe(surface, spec.couleur, spec.opts));
  m.rotation.x = -PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

export function teinterFacettes(geo, base, variance, seed) {
  const g = geo.toNonIndexed();
  const pos = g.attributes.position;
  const couleurs = new Float32Array(pos.count * 3);
  const r = graine(seed);
  const baseColor = new THREE.Color(base);
  for (let i = 0; i < pos.count; i += 3) {
    const c = baseColor.clone().multiplyScalar(1 + (r() - 0.5) * variance);
    for (let k = 0; k < 3; k++) {
      couleurs[(i + k) * 3] = c.r;
      couleurs[(i + k) * 3 + 1] = c.g;
      couleurs[(i + k) * 3 + 2] = c.b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
  return g;
}

export function toile(largeur, hauteur, dessiner) {
  const c = document.createElement('canvas');
  c.width = largeur;
  c.height = hauteur;
  const ctx = c.getContext('2d');
  dessiner(ctx, largeur, hauteur);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let cachePlancher = null;
let cachePierre = null;

export function texturePlancher() {
  if (cachePlancher) return cachePlancher;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#fbf7ef';
  x.fillRect(0, 0, 512, 512);
  const r = graine(37);
  const hauteurLame = 42;
  for (let y = 0; y < 512; y += hauteurLame) {
    x.fillStyle = `rgba(92, 70, 44, ${0.05 + r() * 0.06})`;
    x.fillRect(0, y, 512, 1.4);
    const decal = Math.floor(r() * 240);
    x.fillStyle = 'rgba(92, 70, 44, 0.045)';
    x.fillRect(decal, y + 1, 1.2, hauteurLame);
    x.fillRect((decal + 256) % 512, y + 1, 1.2, hauteurLame);
  }
  for (let i = 0; i < 900; i++) {
    const y = r() * 512;
    x.strokeStyle = `rgba(120, 94, 62, ${0.03 + r() * 0.05})`;
    x.lineWidth = 0.6 + r() * 0.8;
    x.beginPath();
    x.moveTo(r() * 512, y);
    x.lineTo(r() * 512, y + (r() - 0.5) * 5);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cachePlancher = t;
  return t;
}

export function texturePierre() {
  if (cachePierre) return cachePierre;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#f7f4ee';
  x.fillRect(0, 0, 512, 512);
  const r = graine(91);
  const pas = 64;
  for (let y = 0; y < 512; y += pas) {
    for (let px = 0; px < 512; px += pas) {
      const nx = px + ((y / pas) % 2) * (pas / 2);
      x.fillStyle = `rgba(89, 78, 60, ${0.02 + r() * 0.035})`;
      x.fillRect(nx % 512, y, pas, pas);
    }
    x.fillStyle = 'rgba(79, 68, 52, 0.13)';
    x.fillRect(0, y, 512, 1.2);
  }
  for (let px = 0; px < 512; px += pas) {
    x.fillStyle = 'rgba(79, 68, 52, 0.1)';
    x.fillRect(px, 0, 1, 512);
  }
  for (let i = 0; i < 700; i++) {
    x.fillStyle = `rgba(80, 68, 52, ${0.02 + r() * 0.04})`;
    x.beginPath();
    x.arc(r() * 512, r() * 512, 0.6 + r() * 1.8, 0, TAU);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cachePierre = t;
  return t;
}

export function planTexture(w, d, color, map, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({
      color,
      map,
      roughness: 0.88,
      metalness: 0,
      envMapIntensity: 0.4,
      ...opts,
    })
  );
  m.rotation.x = -PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

export function disqueTexture(rayon, segments, color, map, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(rayon, segments),
    new THREE.MeshStandardMaterial({
      color,
      map,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.4,
      ...opts,
    })
  );
  m.rotation.x = -PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

export function textureHerbe() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#8db55c';
  x.fillRect(0, 0, 256, 256);
  const r = graine(11);
  const teintes = ['#7da44e', '#8fb35e', '#73994a', '#94bc64', '#82a953'];
  for (let i = 0; i < 1100; i++) {
    x.fillStyle = teintes[Math.floor(r() * teintes.length)];
    x.globalAlpha = 0.35 + r() * 0.35;
    x.beginPath();
    x.arc(r() * 256, r() * 256, 0.8 + r() * 3.4, 0, TAU);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
