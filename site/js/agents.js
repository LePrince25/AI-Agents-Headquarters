import * as THREE from 'three';
import { PI, TAU, mat } from './core.js';

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

const PEINTURES = [0xf3cba8, 0xe6b58d, 0xd29d72, 0xba8459, 0x9a6642, 0x7b4d31, 0xf7dcc2, 0xc9946a];
const CHEVEUX = [0x221b16, 0x332419, 0x45301f, 0x5b3c26, 0x7a5738, 0x9a9187, 0x14120f, 0x6b4a2f];
const COSTUMES = [0x2c3a4d, 0x333b43, 0x1d2024, 0x515c67, 0x6d604d, 0x45544a, 0x5c4a3c, 0x7d7364, 0x3a4658, 0x28404a];
const CHEMISES = [0xf8f4e9, 0xdde9f0, 0xead9d2, 0xeef0e8, 0xc9d8e4, 0xf1e5cc];
const CRAVATES = [0x7a2f2f, 0x2f4a6b, 0x4a3f2f, 0x6a6f75, 0x8a6a3a, 0x3f5f4a];
const CHAUSSURES = [0x231f1c, 0x36281f, 0x463527, 0x2c2a28];
const PANTALONS = [0x3d434b, 0x2e3238, 0x4a4238, 0x353b45, 0x55504a];

const GEO = {
  sphere: new THREE.SphereGeometry(1, 14, 10),
  demi: new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, 1.42),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  fuseau: new THREE.CylinderGeometry(1, 0.78, 1, 12),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 8),
  tore: new THREE.TorusGeometry(1, 0.055, 4, 12),
};

function poser(parent, geo, materiau, echelle, position, rotation) {
  const m = new THREE.Mesh(geo, materiau);
  m.scale.set(echelle[0], echelle[1], echelle[2]);
  m.position.set(position[0], position[1], position[2]);
  if (rotation) m.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function hashCode(nom) {
  let h = 2166136261;
  for (let i = 0; i < (nom || '').length; i++) {
    h ^= nom.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function agentProcedural(parent, x, z, rot, assis, index, baseY = 0.35, options = {}) {
  const g = new THREE.Group();
  g.position.set(x, baseY, z);
  g.rotation.y = rot;

  const h = (Math.imul(index + 1, 2654435761) ^ hashCode(options.nom || '')) >>> 0;
  const peau = mat(PEINTURES[h % PEINTURES.length], { roughness: 0.68 });
  const cheveu = mat(CHEVEUX[(h >>> 3) % CHEVEUX.length], { roughness: 0.95 });
  const costume = mat(COSTUMES[(h >>> 6) % COSTUMES.length], { roughness: 0.92 });
  const chemise = mat(CHEMISES[(h >>> 9) % CHEMISES.length], { roughness: 0.86 });
  const cravate = mat(CRAVATES[(h >>> 12) % CRAVATES.length], { roughness: 0.88 });
  const chaussure = mat(CHAUSSURES[(h >>> 15) % CHAUSSURES.length], { roughness: 0.5, metalness: 0.1 });
  const pantalon = mat(PANTALONS[(h >>> 18) % PANTALONS.length], { roughness: 0.92 });
  const coiffe = (h >>> 5) % 6;
  const lunettes = (h >>> 21) % 7 === 0;
  const barbe = (h >>> 23) % 6 === 0;
  const cravateVue = (h >>> 25) % 3 !== 0;

  const bras = [];
  const jambes = [];

  const buste = assis ? 1.02 : 1.46;
  const teteY = assis ? 1.19 : 1.63;
  const bassinY = assis ? 0.52 : 0.94;

  // Bassin et ceinture
  poser(g, GEO.box, pantalon, [0.3, 0.15, 0.2], [0, bassinY, 0]);
  poser(g, GEO.box, mat(0x2a2420, { roughness: 0.5 }), [0.31, 0.035, 0.21], [0, bassinY + 0.07, 0]);

  // Torse : veste cintrée
  poser(g, GEO.fuseau, costume, [0.215, 0.5, 0.15], [0, assis ? 0.8 : 1.22, 0]);
  poser(g, GEO.box, chemise, [0.125, assis ? 0.32 : 0.36, 0.02], [0, assis ? 0.84 : 1.27, 0.142]);
  if (cravateVue) {
    poser(g, GEO.box, cravate, [0.038, assis ? 0.2 : 0.24, 0.014], [0, assis ? 0.83 : 1.26, 0.153]);
  }
  for (const cote of [-1, 1]) {
    poser(g, GEO.box, costume, [0.062, assis ? 0.24 : 0.29, 0.026], [cote * 0.075, assis ? 0.91 : 1.37, 0.14], [0, 0, cote * 0.16]);
    poser(g, GEO.box, chemise, [0.05, 0.045, 0.014], [cote * 0.05, assis ? 0.965 : 1.44, 0.147], [0, 0, cote * 0.35]);
  }
  // Boutons et pochette
  for (let i = 0; i < 2; i++) {
    poser(g, GEO.sphere, mat(0x1a1a1a, { roughness: 0.4 }), [0.012, 0.012, 0.008], [0.035, (assis ? 0.8 : 1.2) - i * 0.11, 0.152]);
  }
  poser(g, GEO.box, chemise, [0.055, 0.035, 0.012], [-0.115, assis ? 0.93 : 1.38, 0.145]);
  // Badge nominatif
  poser(g, GEO.box, mat(0xf4efe2, { roughness: 0.6 }), [0.052, 0.032, 0.008], [0.135, assis ? 0.87 : 1.31, 0.145]);
  poser(g, GEO.box, mat(0xb08145, { roughness: 0.5, metalness: 0.2 }), [0.052, 0.008, 0.009], [0.135, assis ? 0.882 : 1.322, 0.146]);

  // Épaules
  for (const cote of [-1, 1]) {
    poser(g, GEO.sphere, costume, [0.078, 0.066, 0.082], [cote * 0.205, buste + 0.04, 0]);
  }

  // Cou et tête
  poser(g, GEO.cyl, peau, [0.046, 0.085, 0.046], [0, buste + 0.08, 0.005]);
  poser(g, GEO.sphere, peau, [0.092, 0.111, 0.096], [0, teteY, 0.006]);
  poser(g, GEO.sphere, peau, [0.074, 0.058, 0.079], [0, teteY - 0.062, 0.018]);
  for (const cote of [-1, 1]) {
    poser(g, GEO.sphere, peau, [0.021, 0.028, 0.018], [cote * 0.093, teteY - 0.004, 0]);

    // Yeux
    poser(g, GEO.sphere, mat(0xf7f2e8, { roughness: 0.35 }), [0.019, 0.011, 0.009], [cote * 0.036, teteY + 0.014, 0.09]);
    poser(g, GEO.sphere, mat(0x3a2a1f, { roughness: 0.3 }), [0.008, 0.009, 0.006], [cote * 0.036, teteY + 0.014, 0.098]);
    poser(g, GEO.box, cheveu, [0.04, 0.008, 0.01], [cote * 0.036, teteY + 0.042, 0.091], [0, 0, cote * -0.09]);
  }
  // Nez et bouche
  poser(g, GEO.cone, peau, [0.017, 0.028, 0.017], [0, teteY - 0.01, 0.099], [PI / 2, 0, 0]);
  poser(g, GEO.box, mat(0x8f5048, { roughness: 0.6 }), [0.042, 0.007, 0.008], [0, teteY - 0.048, 0.094]);

  if (lunettes) {
    for (const cote of [-1, 1]) {
      poser(g, GEO.tore, mat(0x2b2d30, { roughness: 0.4, metalness: 0.3 }), [0.026, 0.024, 0.026], [cote * 0.036, teteY + 0.014, 0.097]);
    }
    poser(g, GEO.box, mat(0x2b2d30, { roughness: 0.4 }), [0.036, 0.005, 0.005], [0, teteY + 0.018, 0.099]);
  }

  // Cheveux
  if (coiffe !== 5) {
    poser(g, GEO.demi, cheveu, [0.098, 0.108, 0.102], [0, teteY + 0.008, -0.004]);
  }
  if (coiffe === 1) {
    poser(g, GEO.box, cheveu, [0.155, 0.032, 0.042], [0, teteY + 0.075, 0.062], [0.2, 0, 0]);
  } else if (coiffe === 2) {
    poser(g, GEO.box, cheveu, [0.17, 0.24, 0.055], [0, teteY - 0.095, -0.062]);
    for (const cote of [-1, 1]) {
      poser(g, GEO.box, cheveu, [0.034, 0.2, 0.06], [cote * 0.087, teteY - 0.07, -0.01]);
    }
  } else if (coiffe === 3) {
    poser(g, GEO.sphere, cheveu, [0.055, 0.05, 0.05], [0, teteY + 0.01, -0.105]);
  } else if (coiffe === 4) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      poser(g, GEO.sphere, cheveu, [0.04, 0.036, 0.04], [Math.cos(a) * 0.072, teteY + 0.078, Math.sin(a) * 0.058 - 0.004]);
    }
  }
  if (coiffe === 5) {
    for (const cote of [-1, 1]) {
      poser(g, GEO.sphere, cheveu, [0.024, 0.034, 0.03], [cote * 0.085, teteY + 0.005, -0.02]);
    }
  }
  if (barbe) {
    poser(g, GEO.sphere, cheveu, [0.074, 0.046, 0.034], [0, teteY - 0.07, 0.052]);
    poser(g, GEO.box, cheveu, [0.05, 0.012, 0.012], [0, teteY - 0.033, 0.096]);
  }

  if (options.casque) {
    poser(g, GEO.tore, mat(0x34383d, { roughness: 0.5, metalness: 0.2 }), [0.1, 0.1, 0.1], [0, teteY + 0.04, 0], [PI / 2, 0, 0]);
    for (const cote of [-1, 1]) {
      poser(g, GEO.sphere, mat(0x2a2e33, { roughness: 0.55 }), [0.042, 0.052, 0.03], [cote * 0.096, teteY - 0.01, 0.01]);
    }
  }

  // Bras
  for (const cote of [-1, 1]) {
    const epaule = new THREE.Group();
    epaule.position.set(cote * 0.235, buste - 0.02, 0);
    epaule.rotation.z = cote * -0.09;
    g.add(epaule);

    if (assis) {
      epaule.rotation.x = -0.95;
      poser(epaule, GEO.cyl, costume, [0.052, 0.26, 0.052], [0, -0.13, 0]);
      const coude = new THREE.Group();
      coude.position.set(0, -0.26, 0);
      coude.rotation.x = 1.05;
      epaule.add(coude);
      poser(coude, GEO.cyl, costume, [0.045, 0.23, 0.045], [0, -0.115, 0]);
      poser(coude, GEO.cyl, chemise, [0.049, 0.04, 0.049], [0, -0.215, 0]);
      poser(coude, GEO.sphere, peau, [0.044, 0.05, 0.03], [0, -0.255, 0.008]);
    } else {
      poser(epaule, GEO.cyl, costume, [0.052, 0.27, 0.052], [0, -0.135, 0]);
      const coude = new THREE.Group();
      coude.position.set(0, -0.27, 0);
      coude.rotation.x = -0.14;
      epaule.add(coude);
      poser(coude, GEO.cyl, costume, [0.045, 0.24, 0.045], [0, -0.12, 0]);
      poser(coude, GEO.cyl, chemise, [0.049, 0.038, 0.049], [0, -0.225, 0]);
      poser(coude, GEO.sphere, peau, [0.043, 0.052, 0.03], [0, -0.262, 0.006]);
    }
    bras.push(epaule);
  }
  // Montre au poignet gauche
  poser(bras[1], GEO.tore, mat(0x3c3f43, { roughness: 0.3, metalness: 0.5 }), [0.03, 0.03, 0.03], [0, assis ? -0.24 : -0.245, 0], [PI / 2, 0, 0]);

  // Jambes
  if (assis) {
    for (const cote of [-1, 1]) {
      poser(g, GEO.cyl, pantalon, [0.07, 0.42, 0.075], [cote * 0.1, 0.52, 0.2], [PI / 2, 0, 0]);
      poser(g, GEO.cyl, pantalon, [0.058, 0.44, 0.058], [cote * 0.1, 0.29, 0.42]);
      poser(g, GEO.box, chaussure, [0.105, 0.07, 0.24], [cote * 0.1, 0.05, 0.49]);
    }
  } else {
    for (const cote of [-1, 1]) {
      const hanche = new THREE.Group();
      hanche.position.set(cote * 0.095, 0.93, 0);
      g.add(hanche);
      poser(hanche, GEO.cyl, pantalon, [0.075, 0.44, 0.078], [0, -0.22, 0]);
      const genou = new THREE.Group();
      genou.position.set(0, -0.44, 0.005);
      hanche.add(genou);
      poser(genou, GEO.cyl, pantalon, [0.06, 0.42, 0.062], [0, -0.21, 0]);
      poser(genou, GEO.box, chaussure, [0.108, 0.075, 0.25], [0, -0.435, 0.045]);
      jambes.push(hanche);
    }
  }

  const ancre = new THREE.Object3D();
  ancre.position.set(0, assis ? 1.52 : 1.72, 0);
  g.add(ancre);

  g.scale.setScalar(0.95 + ((h >>> 27) % 10) * 0.011);
  parent.add(g);
  return { groupe: g, ancre, bras, jambes };
}
