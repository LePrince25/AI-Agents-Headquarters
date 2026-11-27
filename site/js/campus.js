import * as THREE from 'three';
import { PI, TAU, box, cyl, plan, mat, graine, toile } from './core.js';
import { materiauSurface, projeterUV, tuileSurface } from './rendu.js';
import { poser } from './models.js';
import { RAYON_ILE } from './data.js';

// Le parc du QG : parterre d'honneur devant la tour, promenade circulaire,
// fontaine, pelouses plantées, bancs et éclairage public.
// Tout repose à plat sur la dalle de l'île, sans toucher au bâti.

const PLAZA = 12;
const RING_IN = 24;
const RING_OUT = 27.2;
const BELT = RAYON_ILE - 0.6;

const PIERRE_PARC = 0xf1ead9;
const BORDURE = 0xd7ccb8;
const HERBE = 0x7b9656;

let cacheFeuillage = null;
function textureFeuillage() {
  if (cacheFeuillage) return cacheFeuillage;
  cacheFeuillage = toile(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4a7132';
    ctx.fillRect(0, 0, w, h);
    const r = graine(6151);
    const teintes = ['#3c6027', '#557d36', '#688f45', '#7aa251', '#426b2c', '#5f8a3f'];
    for (let i = 0; i < 950; i++) {
      ctx.fillStyle = teintes[Math.floor(r() * teintes.length)];
      ctx.globalAlpha = 0.32 + r() * 0.5;
      const rad = 1.4 + r() * 5.4;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, rad, rad * (0.45 + r() * 0.6), r() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 280; i++) {
      ctx.fillStyle = r() > 0.5 ? '#16320f' : '#a3c27c';
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 0.8 + r() * 2.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  cacheFeuillage.wrapS = cacheFeuillage.wrapT = THREE.RepeatWrapping;
  return cacheFeuillage;
}

function materiauEau() {
  const m = new THREE.MeshStandardMaterial({
    color: 0x1d3f47,
    roughness: 0.18,
    metalness: 0.06,
    envMapIntensity: 0.5,
  });
  m.userData.envIntensiteFixe = true;
  return m;
}

function poser2(groupe, geo, materiau, y) {
  const m = new THREE.Mesh(geo, materiau);
  m.rotation.x = -PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  groupe.add(m);
  return m;
}

export function construireCampus(ile, modeles) {
  const groupe = new THREE.Group();
  ile.add(groupe);
  const colliders = [];
  const rnd = graine(26092026);

  const matHerbe = materiauSurface('herbe', HERBE, { roughness: 1 });
  const matPierre = materiauSurface('pierre', PIERRE_PARC, { roughness: 0.86 });

  // --- Pelouses : anneau intérieur, ceinture extérieure -------------------
  poser2(
    groupe,
    projeterUV(new THREE.RingGeometry(PLAZA + 0.3, RING_IN - 0.3, 96, 1), tuileSurface('herbe')),
    matHerbe,
    0.038
  );
  poser2(
    groupe,
    projeterUV(new THREE.RingGeometry(RING_OUT + 0.2, BELT, 96, 1), tuileSurface('herbe')),
    matHerbe,
    0.038
  );

  // --- Place d'honneur, promenade, allées ---------------------------------
  poser2(
    groupe,
    projeterUV(new THREE.CircleGeometry(PLAZA, 96), tuileSurface('pierre')),
    matPierre,
    0.05
  );
  poser2(
    groupe,
    projeterUV(new THREE.RingGeometry(RING_IN, RING_OUT, 96, 1), tuileSurface('pierre')),
    matPierre,
    0.05
  );

  // Liserés d'entretien : le gazon et le pavé se lisent nettement.
  const matLisiere = materiauSurface('pierre', BORDURE, { roughness: 0.92 });
  poser2(groupe, projeterUV(new THREE.RingGeometry(PLAZA - 0.18, PLAZA + 0.18, 96, 1), 1.8), matLisiere, 0.052);
  poser2(groupe, projeterUV(new THREE.RingGeometry(RING_IN - 0.16, RING_IN + 0.16, 96, 1), 1.8), matLisiere, 0.052);
  poser2(groupe, projeterUV(new THREE.RingGeometry(RING_OUT - 0.16, RING_OUT + 0.16, 96, 1), 1.8), matLisiere, 0.052);
  poser2(groupe, projeterUV(new THREE.RingGeometry(BELT - 0.16, BELT + 0.08, 96, 1), 1.8), matLisiere, 0.052);

  // Allées en croix, interrompues par la place.
  groupe.add(plan(21.4, 5.4, PIERRE_PARC, -23.3, 0.056, 0, { surface: 'pierre', roughness: 0.84 }));
  groupe.add(plan(21.4, 5.4, PIERRE_PARC, 23.3, 0.056, 0, { surface: 'pierre', roughness: 0.84 }));
  groupe.add(plan(5.6, 21.4, PIERRE_PARC, 0, 0.056, -23.3, { surface: 'pierre', roughness: 0.84 }));
  groupe.add(plan(9.2, 19.4, PIERRE_PARC, 0, 0.056, 22.3, { surface: 'pierre', roughness: 0.84 }));

  // Bordures des allées : 0,12 m de haut, grès clair.
  const bordures = [
    [-34, -2.8, -12.4, -2.8],
    [-34, 2.8, -12.4, 2.8],
    [12.4, -2.8, 34, -2.8],
    [12.4, 2.8, 34, 2.8],
    [-2.88, -34, -2.88, -12.4],
    [2.88, -34, 2.88, -12.4],
    [-4.68, 12.4, -4.68, 32],
    [4.68, 12.4, 4.68, 32],
  ];
  for (const [x0, z0, x1, z1] of bordures) {
    const long = Math.hypot(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const b = box(0.16, 0.1, long, BORDURE, cx, 0.06, cz, { surface: 'beton', roughness: 0.9 });
    b.rotation.y = Math.atan2(x1 - x0, z1 - z0);
    groupe.add(b);
  }

  // --- Fontaine centrale ---------------------------------------------------
  const fontaine = new THREE.Group();
  fontaine.position.set(0, 0, 0);
  groupe.add(fontaine);

  // Vasque creuse : socle plein, paroi mince, eau visible à 10 cm du rebord.
  fontaine.add(cyl(5.9, 5.95, 0.36, 0xe7ddcb, 0, 0.18, 0, 64, { surface: 'pierre', roughness: 0.72 }));
  const paroi = new THREE.Mesh(
    new THREE.CylinderGeometry(5.94, 5.94, 0.32, 64, 1, true),
    materiauSurface('pierre', 0xe7ddcb, { roughness: 0.72, side: THREE.DoubleSide })
  );
  paroi.position.y = 0.52;
  paroi.castShadow = true;
  fontaine.add(paroi);

  const fondBassin = new THREE.Mesh(new THREE.CircleGeometry(5.86, 64), mat(0x1e363c, { roughness: 0.9 }));
  fondBassin.rotation.x = -PI / 2;
  fondBassin.position.y = 0.37;
  fontaine.add(fondBassin);
  const eau = new THREE.Mesh(new THREE.CircleGeometry(5.82, 64), materiauEau());
  eau.rotation.x = -PI / 2;
  eau.position.y = 0.52;
  fontaine.add(eau);

  const rebord = new THREE.Mesh(new THREE.TorusGeometry(5.9, 0.14, 10, 72), mat(0xf3ecdd, { roughness: 0.5 }));
  rebord.rotation.x = PI / 2;
  rebord.position.y = 0.67;
  rebord.castShadow = true;
  fontaine.add(rebord);

  fontaine.add(cyl(1.05, 1.35, 0.95, 0xe9e0cf, 0, 0.92, 0, 32, { surface: 'pierre', roughness: 0.7 }));
  fontaine.add(cyl(2.45, 1.55, 0.34, 0xe9e0cf, 0, 1.5, 0, 48, { surface: 'pierre', roughness: 0.62 }));
  const eauHaute = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), materiauEau());
  eauHaute.rotation.x = -PI / 2;
  eauHaute.position.y = 1.6;
  fontaine.add(eauHaute);
  fontaine.add(cyl(0.34, 0.46, 0.8, 0xe9e0cf, 0, 2.05, 0, 24, { surface: 'pierre', roughness: 0.62 }));
  const boule = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), mat(0xf0e8d8, { roughness: 0.5 }));
  boule.position.y = 2.68;
  boule.castShadow = true;
  fontaine.add(boule);

  colliders.push({ x: 0, z: 0, r: 6, cercle: true });

  // --- Arbres --------------------------------------------------------------
  const arbres = [];
  const lampes = [];
  const libre = (x, z) => {
    const d = Math.hypot(x, z);
    if (d > BELT - 0.8 || d < PLAZA + 2.2) return false;
    if (Math.abs(z) < 4.3 || Math.abs(x) < 4.3) return false;
    if (z > 9 && Math.abs(x) < 6.2) return false;
    for (const a of arbres) if (Math.hypot(a.x - x, a.z - z) < 2.9) return false;
    for (const l of lampes) if (Math.hypot(l.x - x, l.z - z) < 2.4) return false;
    return true;
  };
  const arbre = (x, z, s = 1) => {
    if (!libre(x, z)) return;
    arbres.push({ x, z, s });
  };

  // Lampadaires : promenade, axe d'honneur, contre-allée. Placés avant les
  // arbres pour qu'aucune couronne ne les avale.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + PI / 12;
    lampes.push({ x: Math.cos(a) * 28.1, z: Math.sin(a) * 28.1 });
  }
  for (const z of [13.8, 30.2]) {
    lampes.push({ x: -5.9, z });
    lampes.push({ x: 5.9, z });
  }
  for (const z of [-14.5, -28]) {
    lampes.push({ x: -3.7, z });
    lampes.push({ x: 3.7, z });
  }

  // Ceinture extérieure
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU + rnd() * 0.07;
    const r = 30.3 + rnd() * 1.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (z > 27.5) continue;
    arbre(x, z, 1 + rnd() * 0.3);
  }
  // Bosquets intérieurs, un par angle
  for (let q = 0; q < 4; q++) {
    for (let k = -1; k <= 1; k++) {
      const a = PI / 4 + q * (PI / 2) + k * 0.34;
      const r = 19.4 + rnd() * 1.4;
      arbre(Math.cos(a) * r, Math.sin(a) * r, 0.9 + rnd() * 0.28);
    }
  }
  // Double allée d'honneur au sud
  for (const z of [15, 20.6, 26, 30]) {
    arbre(-7.1 + (rnd() - 0.5) * 0.3, z, 0.95 + rnd() * 0.2);
    arbre(7.1 + (rnd() - 0.5) * 0.3, z, 0.95 + rnd() * 0.2);
  }
  // Contre-allée au nord
  for (const z of [-16, -21, -26, -31]) {
    arbre(-4.9 + (rnd() - 0.5) * 0.2, z, 0.9 + rnd() * 0.22);
    arbre(4.9 + (rnd() - 0.5) * 0.2, z, 0.9 + rnd() * 0.22);
  }

  // --- Massifs fleuris -----------------------------------------------------
  const fleurs = [];
  for (let q = 0; q < 4; q++) {
    const a = PI / 4 + q * (PI / 2);
    const x = Math.cos(a) * 15.4;
    const z = Math.sin(a) * 15.4;
    groupe.add(cyl(2.35, 2.35, 0.24, 0xdfd5c3, x, 0.12, z, 48, { surface: 'pierre', roughness: 0.9 }));
    groupe.add(cyl(2.12, 2.12, 0.06, 0x5f7d47, x, 0.255, z, 48, { surface: 'herbe', roughness: 1 }));
    for (let i = 0; i < 56; i++) {
      const ang = rnd() * TAU;
      const rr = Math.sqrt(rnd()) * 1.95;
      fleurs.push({
        x: x + Math.cos(ang) * rr,
        y: 0.29 + rnd() * 0.12,
        z: z + Math.sin(ang) * rr,
        c: rnd() > 0.28 ? 0xf4efe0 : rnd() > 0.5 ? 0xf0d488 : 0xe4e9c8,
      });
    }
    colliders.push({ x, z, r: 2.4, cercle: true });
  }

  const geoFleur = new THREE.SphereGeometry(0.062, 5, 4);
  const matFleur = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
  const meshesFleurs = new THREE.InstancedMesh(geoFleur, matFleur, fleurs.length);
  meshesFleurs.castShadow = true;
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();
  const c3 = new THREE.Color();
  fleurs.forEach((f, i) => {
    v3.set(f.x, f.y, f.z);
    s3.setScalar(0.8 + rnd() * 0.7);
    m4.compose(v3, q4, s3);
    meshesFleurs.setMatrixAt(i, m4);
    c3.setHex(f.c);
    meshesFleurs.setColorAt(i, c3);
  });
  meshesFleurs.instanceMatrix.needsUpdate = true;
  if (meshesFleurs.instanceColor) meshesFleurs.instanceColor.needsUpdate = true;
  groupe.add(meshesFleurs);

  // --- Haies taillées autour de la place ----------------------------------
  const geoHaie = projeterUV(new THREE.BoxGeometry(3.2, 0.62, 0.74), 0.9);
  const matHaie = new THREE.MeshStandardMaterial({
    map: textureFeuillage(),
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.3,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + PI / 8;
    const x = Math.cos(a) * 13.5;
    const z = Math.sin(a) * 13.5;
    const rot = -a - PI / 2;
    const haie = new THREE.Mesh(geoHaie, matHaie);
    haie.position.set(x, 0.33, z);
    haie.rotation.y = rot;
    haie.castShadow = true;
    haie.receiveShadow = true;
    groupe.add(haie);
    colliders.push({ x, z, hw: 1.65, hd: 0.45, rot });
  }

  // --- Arbres et lampadaires instanciés -----------------------------------
  planterArbres(groupe, arbres, rnd, colliders);
  planterLampes(groupe, lampes, colliders);

  // --- Bancs en bois -------------------------------------------------------
  const bancs = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + PI / 8;
    bancs.push({ x: Math.cos(a) * 26.3, z: Math.sin(a) * 26.3, rot: -a - PI / 2 });
  }
  for (let i = 0; i < 4; i++) {
    const a = PI / 4 + i * (PI / 2);
    bancs.push({ x: Math.cos(a) * 8.7, z: Math.sin(a) * 8.7, rot: -a - PI / 2 });
  }
  for (const z of [17.5, 24.5]) {
    bancs.push({ x: -5.55, z, rot: PI / 2 });
    bancs.push({ x: 5.55, z, rot: -PI / 2 });
  }
  for (const b of bancs) {
    poser(modeles, 'banc', groupe, b.x, 0.03, b.z, b.rot);
    colliders.push({ x: b.x, z: b.z, hw: 0.92, hd: 0.42, rot: b.rot });
  }

  return colliders;
}

function planterArbres(groupe, arbres, rnd, colliders) {
  const geoTronc = new THREE.CylinderGeometry(0.11, 0.2, 1, 8, 1);
  geoTronc.translate(0, 0.5, 0);
  projeterUV(geoTronc, 1.4);
  const matTronc = materiauSurface('bois', 0x6a4a2f, { roughness: 0.95 });

  // Houppier irrégulier : on déplace les sommets sur la sphère (sans casser
  // la soudure, grâce à une fonction du seul vecteur directeur) et on garde
  // des normales lisses. Les couleurs de sommet assombrissent le dessous.
  const geoFeuille = new THREE.IcosahedronGeometry(1, 2);
  {
    const pos = geoFeuille.attributes.position;
    const nor = geoFeuille.attributes.normal;
    const couleurs = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const d =
        0.9 +
        0.07 * Math.sin(4.7 * v.x + 1.2) * Math.cos(3.9 * v.y) +
        0.06 * Math.sin(6.3 * v.z + 2.1) +
        0.04 * Math.cos(8.1 * v.x + v.z);
      pos.setXYZ(i, v.x * d, v.y * d * 0.96, v.z * d);
      nor.setXYZ(i, v.x, v.y, v.z);
      const l = 0.55 + 0.5 * ((v.y + 1) / 2);
      couleurs[i * 3] = l;
      couleurs[i * 3 + 1] = l;
      couleurs[i * 3 + 2] = l;
    }
    geoFeuille.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
  }
  const matFeuille = new THREE.MeshStandardMaterial({
    map: textureFeuillage(),
    color: 0xe9f0dc,
    roughness: 0.94,
    metalness: 0,
    vertexColors: true,
    envMapIntensity: 0.3,
  });

  const troncs = new THREE.InstancedMesh(geoTronc, matTronc, arbres.length);
  const feuilles = new THREE.InstancedMesh(geoFeuille, matFeuille, arbres.length * 5);
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const ech = new THREE.Vector3();
  const haut = new THREE.Vector3(0, 1, 0);
  const couleur = new THREE.Color();

  let fi = 0;
  arbres.forEach((a, i) => {
    const s = a.s;
    const h = (2.7 + rnd() * 0.65) * s;
    pos.set(a.x, 0.02, a.z);
    ech.set(s * 0.92, h, s * 0.92);
    q4.setFromAxisAngle(haut, rnd() * TAU);
    m4.compose(pos, q4, ech);
    troncs.setMatrixAt(i, m4);

    const R = (1.45 + rnd() * 0.4) * s;
    const cy = h * 0.9;
    for (let k = 0; k < 5; k++) {
      const ang = k === 0 ? rnd() * TAU : (k / 4) * TAU + rnd() * 0.6;
      const d = k === 0 ? 0 : R * (0.48 + rnd() * 0.22);
      const sx = R * (k === 0 ? 1.04 : 0.56 + rnd() * 0.2);
      const sy = R * (k === 0 ? 0.74 : 0.48 + rnd() * 0.16);
      pos.set(
        a.x + Math.cos(ang) * d,
        cy + (k === 0 ? R * 0.24 : R * (-0.05 + rnd() * 0.26)),
        a.z + Math.sin(ang) * d
      );
      ech.set(sx, sy, sx * (0.9 + rnd() * 0.2));
      q4.setFromAxisAngle(haut, rnd() * TAU);
      m4.compose(pos, q4, ech);
      feuilles.setMatrixAt(fi, m4);
      couleur.setRGB(0.9 + rnd() * 0.2, 0.93 + rnd() * 0.16, 0.84 + rnd() * 0.18);
      feuilles.setColorAt(fi, couleur);
      fi++;
    }

    colliders.push({ x: a.x, z: a.z, r: 0.34 * s, cercle: true });
  });

  troncs.castShadow = true;
  troncs.receiveShadow = true;
  feuilles.castShadow = true;
  feuilles.receiveShadow = true;
  troncs.instanceMatrix.needsUpdate = true;
  feuilles.instanceMatrix.needsUpdate = true;
  if (feuilles.instanceColor) feuilles.instanceColor.needsUpdate = true;
  groupe.add(troncs, feuilles);
}

function planterLampes(groupe, lampes, colliders) {
  const geoPoteau = new THREE.CylinderGeometry(0.062, 0.13, 4.2, 10, 1);
  geoPoteau.translate(0, 2.1, 0);
  const matPoteau = mat(0x34383c, { metalness: 0.55, roughness: 0.45 });
  const geoChapeau = new THREE.BoxGeometry(0.68, 0.16, 0.34);
  const matChapeau = mat(0x24282b, { metalness: 0.5, roughness: 0.42 });
  const geoLed = new THREE.BoxGeometry(0.5, 0.03, 0.2);
  const matLed = new THREE.MeshStandardMaterial({
    color: 0xfff3da,
    emissive: 0xffd79a,
    emissiveIntensity: 0.85,
    roughness: 0.4,
  });

  const poteaux = new THREE.InstancedMesh(geoPoteau, matPoteau, lampes.length);
  const chapeaux = new THREE.InstancedMesh(geoChapeau, matChapeau, lampes.length);
  const leds = new THREE.InstancedMesh(geoLed, matLed, lampes.length);
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const un = new THREE.Vector3(1, 1, 1);

  lampes.forEach((l, i) => {
    q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-l.x, -l.z));
    pos.set(l.x, 0.02, l.z);
    m4.compose(pos, q4, un);
    poteaux.setMatrixAt(i, m4);
    pos.set(l.x, 4.22, l.z);
    m4.compose(pos, q4, un);
    chapeaux.setMatrixAt(i, m4);
    pos.set(l.x, 4.11, l.z);
    m4.compose(pos, q4, un);
    leds.setMatrixAt(i, m4);
    colliders.push({ x: l.x, z: l.z, r: 0.3, cercle: true });
  });

  for (const m of [poteaux, chapeaux]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true;
  }
  leds.instanceMatrix.needsUpdate = true;
  groupe.add(poteaux, chapeaux, leds);
}
