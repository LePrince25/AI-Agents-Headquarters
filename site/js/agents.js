import * as THREE from 'three';
import { PI, TAU, box, mat } from './core.js';

export const POSTES = [
  { x: -2.35, z: -2.55, rot: 0 },
  { x: 2.35, z: -2.55, rot: 0 },
  { x: -2.35, z: 2.45, rot: PI },
  { x: 2.35, z: 2.45, rot: PI },
];

export const PLACES = [
  { x: -2.35, z: -1.72, rot: PI },
  { x: 2.35, z: -1.72, rot: PI },
  { x: -2.35, z: 1.72, rot: 0 },
  { x: 2.35, z: 1.72, rot: 0 },
];

const PEINTURES = [0xf2c9a4, 0xe3ad82, 0xc98f63, 0x9d6a44, 0x7c4c2f, 0xf5d8bf];
const HABITS = [0x6f8fa3, 0xc4734a, 0x8d9a4c, 0xb08145, 0x7a7f8c, 0xa65a4f, 0x6e8f7c, 0xd3b483, 0x8a8095];
const CHEVEUX = [0x2f2a24, 0x4a382a, 0x1f1d1a, 0x6b4a2f, 0x3a2f26];

const PANTALON = 0x5c6066;
const CHAUSSURE = 0x433c34;

export function agentProcedural(parent, x, z, rot, assis, index, baseY = 0.35, options = {}) {
  const g = new THREE.Group();
  g.position.set(x, baseY, z);
  g.rotation.y = rot;

  const peau = PEINTURES[index % PEINTURES.length];
  const habit = HABITS[index % HABITS.length];
  const cheveu = CHEVEUX[index % CHEVEUX.length];

  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), mat(peau, { roughness: 0.75 }));
  tete.castShadow = true;
  g.add(tete);

  const chevelure = new THREE.Mesh(
    new THREE.SphereGeometry(0.175, 16, 10, 0, TAU, 0, 1.25),
    mat(cheveu, { roughness: 0.9 })
  );
  chevelure.castShadow = true;
  g.add(chevelure);

  const bras = [];
  const jambes = [];

  if (options.casque) {
    const yTete = assis ? 1.25 : 1.43;
    const arceau = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.018, 6, 16, PI),
      mat(0x3b3f45, { roughness: 0.5, metalness: 0.2 })
    );
    arceau.position.set(0, yTete, 0);
    arceau.castShadow = true;
    g.add(arceau);
    for (const cote of [-1, 1]) {
      const oreillette = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 10, 8),
        mat(0x2f3338, { roughness: 0.55 })
      );
      oreillette.position.set(cote * 0.18, yTete - 0.04, 0);
      g.add(oreillette);
    }
  }

  if (assis) {
    for (const cote of [-1, 1]) {
      g.add(box(0.19, 0.17, 0.44, PANTALON, cote * 0.12, 0.51, 0.22));
      g.add(box(0.17, 0.42, 0.18, PANTALON, cote * 0.12, 0.27, 0.46));
      g.add(box(0.19, 0.08, 0.27, CHAUSSURE, cote * 0.12, 0.05, 0.56));
    }
    g.add(box(0.42, 0.18, 0.3, PANTALON, 0, 0.55, 0.02));
    g.add(box(0.44, 0.52, 0.27, habit, 0, 0.85, 0));
    for (const cote of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(cote * 0.285, 1.06, 0.06);
      pivot.add(box(0.1, 0.42, 0.13, habit, 0, -0.21, 0));
      pivot.add(box(0.09, 0.09, 0.12, peau, 0, -0.46, 0.05));
      g.add(pivot);
      bras.push(pivot);
    }
    g.add(box(0.12, 0.08, 0.12, peau, 0, 1.12, 0.01));

    tete.position.set(0, 1.25, 0.02);
    chevelure.position.set(0, 1.29, 0);
  } else {
    g.add(box(0.46, 0.58, 0.28, habit, 0, 0.98, 0));
    for (const cote of [-1, 1]) {
      const epaule = new THREE.Group();
      epaule.position.set(cote * 0.29, 1.24, 0);
      epaule.add(box(0.1, 0.52, 0.12, habit, 0, -0.26, 0));
      epaule.add(box(0.09, 0.1, 0.11, peau, 0, -0.54, 0.01));
      g.add(epaule);
      bras.push(epaule);

      const hanche = new THREE.Group();
      hanche.position.set(cote * 0.12, 0.56, 0);
      hanche.add(box(0.18, 0.52, 0.19, PANTALON, 0, -0.26, 0));
      hanche.add(box(0.2, 0.08, 0.28, CHAUSSURE, 0, -0.52, 0.05));
      g.add(hanche);
      jambes.push(hanche);
    }

    tete.position.set(0, 1.43, 0);
    chevelure.position.set(0, 1.46, -0.01);
  }

  const ancre = new THREE.Object3D();
  ancre.position.set(0, assis ? 1.62 : 1.68, 0);
  g.add(ancre);

  parent.add(g);
  return { groupe: g, ancre, bras, jambes };
}
