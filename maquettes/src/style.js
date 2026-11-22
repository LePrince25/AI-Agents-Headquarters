// style.js — Le vocabulaire visuel du QG.
// Registre : low-poly lumineux, plein jour, couleurs chaudes, ambiance grosse startup.
// Le néon (lime/gold/cyan) est RÉSERVÉ à l'interface 2D — jamais sur l'île.

import * as THREE from 'three';

// ── Palette 3D ────────────────────────────────────────────────────────────
// Bois, crème, sable, terracotta. Aucune trace de néon ici.
export const P3 = {
  solPrincipal: 0xe8dfd0,
  solBord:      0xd9cdb9,
  solDetail:    0xd2c4ad,
  falaise:      0xc9b9a3,
  falaiseOmbre: 0xa8977f,
  mur:          0xfaf6ee,
  murOmbre:     0xe4dccd,
  murChaud:     0xf2e6d4,
  plateau:      0xe3d8c6,
  bois:         0xd7b183,
  boisSombre:   0xb98f61,
  boisClair:    0xe8cda3,
  tissu:        0xd9a480,
  tissuClair:   0xe8d3bb,
  tissuFonce:   0xb5735a,
  metal:        0x6f7681,
  metalClair:   0x98a0aa,
  plante:       0x7fa05e,
  planteSombre: 0x5f7c45,
  terre:        0xb99a78,
  ecran:        0x2f3a45,
  ecranClair:   0x48606f,
  eau:          0x86c6c9,
  cielHaut:     0x9fc9e8,
  cielBas:      0xf2e4cd,
  soleil:       0xffd9a0,
  silhouette:   0x6b5f52,
  silhouetteAlt:0x8a7a68,
};

// ── Palette 2D (interface) ────────────────────────────────────────────────
// Ici, et seulement ici, le néon de ton design-system FATI revient.
export const P2 = {
  fond:      '#060a14',
  panneau:   '#0c1220',
  panneau2:  '#101830',
  ligne:     '#1e2a44',
  lime:      '#9fe038',
  gold:      '#f6c545',
  cyan:      '#34d8ff',
  ember:     '#ff7a3c',
  flame:     '#ff3d63',
  texte:     '#e8eef7',
  texteFaible: '#8b9bb4',
  display: '"Outfit", sans-serif',
  body: '"Instrument Sans", sans-serif',
  mono: '"IBM Plex Mono", monospace',
};

export const HEX = {
  lime: '#9fe038', gold: '#f6c545', cyan: '#34d8ff',
  ember: '#ff7a3c', flame: '#ff3d63',
};

// ── Lumière ───────────────────────────────────────────────────────────────
// Soleil chaud bas (fin d'après-midi), ombres longues, ciel dégradé.
export function creerLumieres(scene) {
  const soleil = new THREE.DirectionalLight(0xfff0d8, 2.35);
  soleil.position.set(-34, 30, 22);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  soleil.shadow.camera.near = 1;
  soleil.shadow.camera.far = 160;
  soleil.shadow.camera.left = -70;
  soleil.shadow.camera.right = 70;
  soleil.shadow.camera.top = 70;
  soleil.shadow.camera.bottom = -70;
  soleil.shadow.bias = -0.0012;
  soleil.shadow.normalBias = 0.028;
  scene.add(soleil);

  // Rebond du sol : empêche les ombres d'être crayeuses.
  const rebond = new THREE.HemisphereLight(0xffe9c8, 0xb8a488, 1.15);
  scene.add(rebond);

  // Lueur froide du ciel pour les faces à l'ombre.
  const ciel = new THREE.DirectionalLight(0xbcd8f0, 0.42);
  ciel.position.set(26, 14, -30);
  scene.add(ciel);

  return { soleil, rebond, ciel };
}

// ── Ciel ──────────────────────────────────────────────────────────────────
// Dégradé bleu clair vers l'horizon chaud, comme sur qg2-ile.jpg.
export function creerCiel(scene) {
  const uniforms = {
    topColor:    { value: new THREE.Color(P3.cielHaut) },
    bottomColor: { value: new THREE.Color(P3.cielBas) },
    offset:      { value: 60 },
    exponent:    { value: 0.72 },
  };
  const geo = new THREE.SphereGeometry(340, 32, 20);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor; uniform vec3 bottomColor;
      uniform float offset; uniform float exponent;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const ciel = new THREE.Mesh(geo, mat);
  scene.add(ciel);
  return ciel;
}

// ── Fabrique de matériaux ─────────────────────────────────────────────────
const cache = new Map();
export function mat(couleur, opts = {}) {
  const cle = `${couleur}|${opts.opacite ?? 1}|${opts.transparent ?? false}`;
  if (!cache.has(cle)) {
    cache.set(cle, new THREE.MeshLambertMaterial({
      color: couleur,
      opacity: opts.opacite ?? 1,
      transparent: opts.transparent ?? false,
      side: opts.side ?? THREE.FrontSide,
      flatShading: opts.flat ?? false,
    }));
  }
  return cache.get(cle);
}

// ── Boîte avec arêtes franches ───────────────────────────────────────────
export function box(l, h, p, couleur, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat(couleur, opts));
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  return m;
}

// ── Silhouette d'agent ────────────────────────────────────────────────────
// Une silhouette par agent : corps + tête, très simple, lisible de loin.
export function silhouette(x, z, y = 0, couleur = P3.silhouette, hauteur = 1.0) {
  const g = new THREE.Group();
  const corps = box(0.42, 0.62 * hauteur, 0.3, couleur, 0, 0.31 * hauteur, 0, { flat: true });
  const tete = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 10, 8),
    mat(couleur, { flat: true })
  );
  tete.position.set(0, 0.78 * hauteur, 0);
  tete.castShadow = true;
  g.add(corps, tete);
  g.position.set(x, y, z);
  g.userData.estAgent = true;
  return g;
}
