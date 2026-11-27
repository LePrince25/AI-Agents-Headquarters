import * as THREE from 'three';
import { PI, TAU, box } from './core.js';

// Véhicules du parvis : silhouettes extrudées (profil latéral), vitres,
// jantes, phares et détails. Construits localement, sans asset externe.

const TEINTE = new THREE.MeshPhysicalMaterial({
  color: 0x0a1216,
  roughness: 0.06,
  metalness: 0.2,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
  transparent: true,
  opacity: 0.88,
  side: THREE.DoubleSide,
  envMapIntensity: 1.0,
});

const CARBONE = new THREE.MeshStandardMaterial({ color: 0x101215, roughness: 0.82 });
const CHROME = new THREE.MeshStandardMaterial({ color: 0xc9ced2, roughness: 0.16, metalness: 1, envMapIntensity: 1.4 });
const OR = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.24, metalness: 1, envMapIntensity: 1.5 });
// L'or de la calandre émet sa propre lumière : barreaux lumineux, comme sur
// la référence, lisibles même en plein jour.
const OR_LUEUR = new THREE.MeshStandardMaterial({
  color: 0x8a5c14,
  roughness: 0.26,
  metalness: 0.9,
  emissive: 0xffb443,
  emissiveIntensity: 0.65,
});
const NOIR_MAT = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.9 });
const PNEU = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.95 });
const JANTE = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.35, metalness: 0.9, envMapIntensity: 1.1 });
const JANTE_FACE = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.18, metalness: 1, envMapIntensity: 1.6 });
const FREIN = new THREE.MeshStandardMaterial({ color: 0x4c5055, roughness: 0.45, metalness: 0.8 });
const ETRIER = new THREE.MeshStandardMaterial({ color: 0xb2402f, roughness: 0.4, metalness: 0.6 });
const PHARE = new THREE.MeshStandardMaterial({ color: 0xfff6de, emissive: 0xfff0cd, emissiveIntensity: 1.2, roughness: 0.2 });
const LENTILLE = new THREE.MeshStandardMaterial({ color: 0x131a1e, roughness: 0.08, metalness: 0.7, envMapIntensity: 1.3 });
const FEU = new THREE.MeshStandardMaterial({ color: 0x3a0d0b, emissive: 0xff2a16, emissiveIntensity: 0.75, roughness: 0.3 });
const PLAQUE = new THREE.MeshStandardMaterial({ color: 0xe9e7df, roughness: 0.5 });

const cachePeinture = new Map();
function peinture(couleur) {
  if (!cachePeinture.has(couleur)) {
    cachePeinture.set(
      couleur,
      new THREE.MeshPhysicalMaterial({
        color: couleur,
        metalness: 0.25,
        roughness: 0.26,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 0.85,
      })
    );
  }
  return cachePeinture.get(couleur);
}

function tige(parent, a, b, rayon, materiau) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const longueur = dir.length();
  if (longueur < 1e-5) return null;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, longueur, 10), materiau);
  m.position.copy(va).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}

function roue(parent, x, z, rayon, largeur, cote, finition = 'chrome') {
  const g = new THREE.Group();
  g.position.set(x, rayon, z);

  const pneu = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, largeur, 30), PNEU);
  pneu.rotation.x = PI / 2;
  g.add(pneu);

  // Épaules du pneu : la gomme déborde légèrement de la jante.
  for (const s of [-1, 1]) {
    const epaule = new THREE.Mesh(new THREE.TorusGeometry(rayon * 0.94, 0.03, 8, 26), PNEU);
    epaule.position.z = s * (largeur / 2 - 0.012);
    g.add(epaule);
  }

  const face = cote * (largeur / 2 + 0.01);

  const barillet = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.65, rayon * 0.65, largeur * 0.92, 26), JANTE);
  barillet.rotation.x = PI / 2;
  g.add(barillet);

  const levre = new THREE.Mesh(new THREE.TorusGeometry(rayon * 0.66, 0.014, 8, 30), JANTE_FACE);
  levre.position.z = face;
  g.add(levre);

  const disque = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.52, rayon * 0.52, 0.024, 24), FREIN);
  disque.rotation.x = PI / 2;
  disque.position.z = face - cote * 0.03;
  g.add(disque);

  const etrier = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.06), finition === 'or' ? OR : ETRIER);
  etrier.position.set(-0.02, rayon * 0.33, face - cote * 0.055);
  g.add(etrier);

  // Dix rayons fins, doubles d'un voile sombre : la jante lit comme un vrai
  // alliage et non comme un disque plein.
  for (let i = 0; i < 10; i++) {
    const rg = new THREE.Group();
    rg.rotation.z = (i / 10) * TAU;
    const branche = new THREE.Mesh(new THREE.BoxGeometry(0.042, rayon * 0.56, 0.028), JANTE_FACE);
    branche.position.set(0, rayon * 0.33, face);
    rg.add(branche);
    g.add(rg);
  }

  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.15, rayon * 0.15, 0.05, 16), NOIR_MAT);
  moyeu.rotation.x = PI / 2;
  moyeu.position.z = face + cote * 0.02;
  g.add(moyeu);

  const cache = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.075, rayon * 0.075, 0.02, 16), finition === 'or' ? OR : JANTE_FACE);
  cache.rotation.x = PI / 2;
  cache.position.z = face + cote * 0.045;
  g.add(cache);

  parent.add(g);
  return g;
}

function profil(points) {
  const forme = new THREE.Shape();
  forme.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) forme.lineTo(points[i][0], points[i][1]);
  forme.closePath();
  return forme;
}

// Le biseau de l'extrusion repousse toute la paroi de la valeur du chanfrein :
// la vraie surface du nez est donc xProfil + BEV.
const BEV = 0.045;

function corps(points, largeur, materiau) {
  const geo = new THREE.ExtrudeGeometry(profil(points), {
    depth: largeur,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.045,
    bevelSegments: 4,
    curveSegments: 8,
    steps: 1,
  });
  geo.translate(0, 0, -largeur / 2);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, materiau);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Bordure sombre autour du vitrage : sans elle, la vitre semble collée sur la
// tôle. Le cadre est le même polygone, légèrement agrandi.
function vitreLaterale(parent, polygone, flanc) {
  const forme = profil(polygone);
  const geo = new THREE.ShapeGeometry(forme, 10);
  const contour = geo.clone();
  contour.computeBoundingBox();
  const centre = contour.boundingBox.getCenter(new THREE.Vector3());
  contour.translate(-centre.x, -centre.y, 0);
  contour.scale(1.035, 1.06, 1);
  contour.translate(centre.x, centre.y, 0);

  for (const cote of [-1, 1]) {
    const cadre = new THREE.Mesh(contour, CARBONE);
    cadre.position.z = cote * (flanc + 0.004);
    parent.add(cadre);

    const m = new THREE.Mesh(geo, TEINTE);
    m.position.z = cote * (flanc + 0.008);
    m.renderOrder = 2;
    parent.add(m);
  }
}

function vitreInclinee(parent, x, y, largeur, longueur, angle, hauteur = 0.02) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(longueur, hauteur, largeur), TEINTE);
  m.position.set(x, y, 0);
  m.rotation.z = angle;
  m.renderOrder = 2;
  parent.add(m);
}

// Détails : boîtes partageant leur géométrie, avec le matériau exact demandé
// (les helpers box() ne savent pas transporter un émissif ni un clearcoat).
const geoBoites = new Map();
function geoBoite(w, h, d) {
  const cle = w + '|' + h + '|' + d;
  if (!geoBoites.has(cle)) geoBoites.set(cle, new THREE.BoxGeometry(w, h, d));
  return geoBoites.get(cle);
}

function piece(parent, materiau, w, h, d, x, y, z) {
  const m = new THREE.Mesh(geoBoite(w, h, d), materiau);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Abscisse du profil à une hauteur donnée : les optiques se posent ainsi sur
// la vraie face avant, quel que soit le galbe du capot.
function xProfil(points, y, avant = true) {
  let meilleur = avant ? -Infinity : Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if ((a[1] - y) * (b[1] - y) <= 0 && Math.abs(b[1] - a[1]) > 1e-6) {
      const t = (y - a[1]) / (b[1] - a[1]);
      const x = a[0] + t * (b[0] - a[0]);
      meilleur = avant ? Math.max(meilleur, x) : Math.min(meilleur, x);
    }
  }
  return meilleur;
}

// Repère posé sur la face avant ou arrière : y suit la tôle, x en sort
// perpendiculairement. Indispensable sur les nez galbés, sinon la calandre
// flotte au-dessus du capot.
function groupeFace(parent, points, yc, h, avant = true) {
  const signe = avant ? 1 : -1;
  const xB = xProfil(points, yc - h / 2, avant) + signe * BEV;
  const xT = xProfil(points, yc + h / 2, avant) + signe * BEV;
  const g = new THREE.Group();
  g.position.set((xB + xT) / 2, yc, 0);
  g.rotation.z = Math.atan2(xB - xT, h) + (avant ? 0 : PI);
  parent.add(g);
  return g;
}

function calandre(parent, spec, finition) {
  const barre = finition === 'or' ? OR_LUEUR : CHROME;
  const { y, h, demiZ } = spec.grille;
  const g = groupeFace(parent, spec.profil, y, h);

  // Panneau plaqué sur le nez, puis lames et cadre par-dessus.
  piece(g, CARBONE, 0.06, h + 0.06, demiZ * 2 + 0.06, -0.027, 0, 0);

  const xf = 0.01;
  piece(g, barre, 0.028, 0.026, demiZ * 2 + 0.06, xf, h / 2, 0);
  piece(g, barre, 0.028, 0.026, demiZ * 2 + 0.06, xf, -h / 2, 0);
  piece(g, barre, 0.028, h, 0.026, xf, 0, demiZ);
  piece(g, barre, 0.028, h, 0.026, xf, 0, -demiZ);

  // Lames fines, légèrement en retrait du cadre.
  const n = 11;
  for (let i = 0; i < n; i++) {
    const z = -demiZ + 0.035 + (i / (n - 1)) * (demiZ * 2 - 0.07);
    piece(g, barre, 0.02, h - 0.05, 0.02, xf - 0.008, 0, z);
  }

  const blason = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.05, h * 0.16), 0.011, 8, 22), barre);
  blason.rotation.y = PI / 2;
  blason.position.set(xf + 0.012, 0, 0);
  g.add(blason);
}

function optiques(g, spec, finition) {
  const barre = finition === 'or' ? OR_LUEUR : CHROME;
  const l2 = spec.largeur / 2;

  calandre(g, spec, finition);

  // Phares : boîtier sombre, verre fumé, trait de jour lumineux.
  const yP = spec.phare.y;
  for (const cote of [-1, 1]) {
    const z = cote * (spec.phare.z + 0.02);
    const f = groupeFace(g, spec.profil, yP, 0.17);
    piece(f, CARBONE, 0.08, 0.17, 0.3, -0.02, 0, z);
    piece(f, LENTILLE, 0.03, 0.085, 0.26, 0.018, 0, z);
    piece(f, PHARE, 0.032, 0.016, 0.32, 0.016, 0.065, z);
  }

  // Entrées d'air basses, soulignées d'un filet de finition.
  if (spec.bouche != null) {
    for (const cote of [-1, 1]) {
      const f = groupeFace(g, spec.profil, spec.bouche, 0.15);
      piece(f, CARBONE, 0.05, 0.15, 0.34, -0.01, 0, cote * spec.phare.z);
      piece(f, barre, 0.016, 0.012, 0.3, 0.012, 0.035, cote * spec.phare.z);
    }
  }

  // Feu arrière pleine largeur, avec ses retours verticaux.
  const yF = spec.feu.y;
  const fr = groupeFace(g, spec.profil, yF, 0.08, false);
  piece(fr, CARBONE, 0.05, 0.08, spec.largeur - 0.34, 0.002, 0, 0);
  piece(fr, FEU, 0.028, 0.034, spec.largeur - 0.38, 0.022, 0, 0);
  for (const cote of [-1, 1]) {
    piece(fr, FEU, 0.028, 0.1, 0.04, 0.022, 0.01, cote * (l2 - 0.24));
  }

  // Plaques, chacune sur la face à sa hauteur.
  const yPl = yF - 0.32;
  const fp = groupeFace(g, spec.profil, yPl, 0.12, false);
  piece(fp, PLAQUE, 0.02, 0.12, 0.38, 0.006, 0, 0);
  if (spec.bouche != null) {
    const fpf = groupeFace(g, spec.profil, 0.55, 0.11);
    piece(fpf, PLAQUE, 0.02, 0.11, 0.34, 0.002, 0, 0);
  }

  const xPot = xProfil(spec.profil, 0.4, false) - BEV - 0.02;
  for (const cote of [-1, 1]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.16, 14), CHROME);
    pot.rotation.z = PI / 2;
    pot.position.set(xPot, 0.4, cote * 0.42);
    g.add(pot);
  }
}

function detailsCarrosserie(g, spec, paint, finition, flanc) {
  const demiL = spec.L / 2;
  const trim = finition === 'or' ? OR : CHROME;

  // Soubassement, lèvre avant et diffuseur.
  piece(g, CARBONE, spec.L - 0.55, 0.09, spec.largeur + 0.006, 0, 0.31, 0);
  piece(g, CARBONE, 0.32, 0.12, spec.largeur * 0.9, demiL - 0.14, 0.37, 0);
  piece(g, CARBONE, 0.28, 0.13, spec.largeur * 0.88, -demiL + 0.16, 0.38, 0);

  // Passages de roue : doublure sombre et lèvre peinte.
  for (const cote of [-1, 1]) {
    for (const ex of [-spec.empattement / 2, spec.empattement / 2]) {
      const doublure = new THREE.Mesh(new THREE.TorusGeometry(spec.roues + 0.018, 0.03, 6, 20, PI), CARBONE);
      doublure.position.set(ex, spec.roues, cote * (flanc + 0.006));
      g.add(doublure);
      const levre = new THREE.Mesh(new THREE.TorusGeometry(spec.roues + 0.05, 0.024, 6, 22, PI), paint);
      levre.position.set(ex, spec.roues, cote * (flanc + 0.014));
      g.add(levre);
    }
  }

  // Baguette de ceinture, poignées, joints de porte, bas de marche.
  for (const cote of [-1, 1]) {
    const z = cote * (flanc + 0.012);
    piece(g, trim, spec.ceinture.longueur, 0.018, 0.016, spec.ceinture.x, spec.ceinture.y, z);
    piece(g, trim, 0.22, 0.026, 0.018, 0.55, spec.ceinture.y - 0.1, z);
    piece(g, trim, 0.22, 0.026, 0.018, -1.05, spec.ceinture.y - 0.1, z);
    piece(g, CARBONE, 0.012, 0.76, 0.014, 0.08, 0.86, z);
    piece(g, CARBONE, 0.012, 0.76, 0.014, -1.6, 0.86, z);
    piece(g, CARBONE, spec.L - 1.1, 0.13, 0.024, 0, 0.47, cote * (flanc + 0.012));

    // Rétroviseurs : coque peinte montée sur un bras court.
    piece(g, paint, 0.2, 0.09, 0.16, spec.miroir[0], spec.miroir[1], cote * (flanc + 0.1));
    piece(g, CARBONE, 0.05, 0.055, 0.11, spec.miroir[0], spec.miroir[1] - 0.03, cote * (flanc + 0.035));
    piece(g, trim, 0.18, 0.012, 0.014, spec.miroir[0], spec.miroir[1] + 0.05, cote * (flanc + 0.1));
  }

  // Aileron de pavillon et antenne requin.
  if (spec.aileron) {
    piece(g, CARBONE, 0.28, 0.04, spec.largeur * 0.74, -demiL + 0.52, spec.hauteurToit + 0.045, 0);
  }
  piece(g, CARBONE, 0.17, 0.055, 0.07, -demiL + 0.85, spec.hauteurToit + 0.015, 0);

  // Marchepieds et barres de toit des SUV.
  if (spec.marchepied) {
    for (const cote of [-1, 1]) {
      piece(g, CARBONE, 2.3, 0.05, 0.12, 0.05, 0.42, cote * (flanc + 0.05));
      piece(g, trim, 2.3, 0.012, 0.02, 0.05, 0.45, cote * (flanc + 0.105));
    }
  }
  if (spec.barresToit) {
    for (const cote of [-1, 1]) {
      piece(g, trim, 1.4, 0.035, 0.05, -0.56, spec.hauteurToit + 0.045, cote * 0.74);
      for (const fx of [-1.15, 0.02]) piece(g, CARBONE, 0.08, 0.05, 0.05, fx, spec.hauteurToit + 0.015, cote * 0.74);
    }
  }
  if (spec.toitOuvrant) {
    piece(g, TEINTE, 1.0, 0.016, 1.0, -0.35, spec.hauteurToit + 0.008, 0);
  }
}

const MODELES = {
  sport: {
    L: 4.55,
    largeur: 1.86,
    roues: 0.345,
    empattement: 2.62,
    pneu: 0.27,
    profil: [
      [2.24, 0.4], [2.3, 0.62], [2.16, 0.8], [1.62, 0.87], [1.08, 0.98], [0.5, 1.17],
      [-0.32, 1.22], [-1.02, 1.16], [-1.6, 0.97], [-2.16, 0.88], [-2.3, 0.74],
      [-2.28, 0.48], [-2.16, 0.36], [-1.6, 0.3], [1.6, 0.3],
    ],
    vitres: [[0.98, 0.99], [0.5, 1.14], [-0.05, 1.18], [-0.75, 1.14], [-1.4, 0.98], [-1.05, 0.95], [0.72, 0.95]],
    pareBrise: [0.84, 1.07, 0.62, -0.58],
    lunette: [-1.2, 1.07, 0.58, 0.6],
    ceinture: { x: -0.2, y: 0.97, longueur: 2.2 },
    miroir: [0.95, 1.02],
    grille: { y: 0.53, h: 0.18, demiZ: 0.44 },
    phare: { y: 0.55, z: 0.64 },
    feu: { y: 0.88 },
    hauteurToit: 1.22,
  },
  coupe: {
    L: 4.6,
    largeur: 1.84,
    roues: 0.34,
    empattement: 2.68,
    pneu: 0.27,
    profil: [
      [2.28, 0.42], [2.34, 0.64], [2.2, 0.84], [1.62, 0.9], [1.06, 1.0], [0.55, 1.2],
      [-0.28, 1.25], [-0.98, 1.19], [-1.58, 1.0], [-2.18, 0.9], [-2.34, 0.76],
      [-2.32, 0.5], [-2.2, 0.38], [-1.66, 0.32], [1.66, 0.32],
    ],
    vitres: [[1.0, 1.02], [0.54, 1.17], [-0.05, 1.21], [-0.78, 1.17], [-1.42, 1.0], [-1.08, 0.97], [0.72, 0.97]],
    pareBrise: [0.86, 1.1, 0.64, -0.6],
    lunette: [-1.24, 1.1, 0.6, 0.62],
    ceinture: { x: -0.2, y: 0.99, longueur: 2.2 },
    miroir: [0.95, 1.05],
    grille: { y: 0.54, h: 0.18, demiZ: 0.46 },
    phare: { y: 0.56, z: 0.66 },
    feu: { y: 0.9 },
    hauteurToit: 1.25,
  },
  berline: {
    L: 4.92,
    largeur: 1.86,
    roues: 0.355,
    empattement: 2.9,
    pneu: 0.27,
    profil: [
      [2.42, 0.44], [2.46, 0.68], [2.3, 0.9], [1.66, 0.96], [1.14, 1.04], [0.62, 1.32],
      [-0.44, 1.42], [-1.14, 1.38], [-1.62, 1.12], [-2.3, 1.0], [-2.44, 0.86],
      [-2.42, 0.55], [-2.3, 0.4], [-1.8, 0.33], [1.8, 0.33],
    ],
    vitres: [[1.02, 1.06], [0.58, 1.3], [-0.44, 1.37], [-1.08, 1.33], [-1.52, 1.11], [-1.2, 1.03], [0.78, 1.03]],
    pareBrise: [0.86, 1.2, 0.7, -0.64],
    lunette: [-1.38, 1.22, 0.66, 0.52],
    ceinture: { x: -0.2, y: 1.05, longueur: 2.4 },
    miroir: [1.0, 1.12],
    grille: { y: 0.56, h: 0.2, demiZ: 0.5 },
    phare: { y: 0.58, z: 0.7 },
    feu: { y: 0.95 },
    hauteurToit: 1.42,
  },
  suv: {
    L: 5.14,
    largeur: 2.0,
    roues: 0.41,
    empattement: 3.0,
    pneu: 0.34,
    profil: [
      [2.52, 0.5], [2.56, 0.72], [2.55, 1.06], [2.5, 1.16], [2.24, 1.21], [1.56, 1.23], [1.06, 1.3],
      [0.62, 1.66], [0.18, 1.82], [-1.3, 1.84], [-1.56, 1.8], [-1.9, 1.52], [-2.18, 1.32],
      [-2.32, 1.12], [-2.42, 0.86], [-2.42, 0.58], [-2.32, 0.4], [-2.1, 0.34], [1.95, 0.34],
    ],
    vitres: [[1.0, 1.34], [0.66, 1.68], [0.2, 1.78], [-1.28, 1.79], [-1.5, 1.74], [-1.82, 1.44], [-1.78, 1.32]],
    pareBrise: [0.62, 1.56, 0.95, -0.53],
    lunette: [-2.03, 1.42, 0.42, 0.58],
    ceinture: { x: -0.4, y: 1.31, longueur: 2.8 },
    miroir: [1.05, 1.18],
    grille: { y: 0.85, h: 0.38, demiZ: 0.56 },
    phare: { y: 1.0, z: 0.84 },
    bouche: 0.72,
    feu: { y: 1.05 },
    hauteurToit: 1.84,
    aileron: true,
    marchepied: true,
    barresToit: true,
    toitOuvrant: true,
  },
};

export function voiture({ type = 'coupe', couleur = 0x8b9096, x = 0, z = 0, rot = 0, finition = 'chrome' } = {}) {
  const spec = MODELES[type] || MODELES.coupe;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;

  const paint = peinture(couleur);
  // Le biseau de l'extrusion déborde du profil de la valeur du chanfrein :
  // c'est ce flanc réel qu'il faut viser pour poser vitres et détails.
  const flanc = spec.largeur / 2 + 0.05;

  g.add(corps(spec.profil, spec.largeur, paint));

  detailsCarrosserie(g, spec, paint, finition, flanc);

  vitreLaterale(g, spec.vitres, flanc);
  vitreInclinee(g, spec.pareBrise[0], spec.pareBrise[1], spec.largeur * 0.86, spec.pareBrise[2], spec.pareBrise[3]);
  vitreInclinee(g, spec.lunette[0], spec.lunette[1], spec.largeur * 0.82, spec.lunette[2], spec.lunette[3]);

  optiques(g, spec, finition);

  const roues = [];
  for (const cote of [-1, 1]) {
    for (const ex of [-spec.empattement / 2, spec.empattement / 2]) {
      roues.push(roue(g, ex, cote * (flanc - spec.pneu / 2 + 0.01), spec.roues, spec.pneu, cote, finition));
    }
  }

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  g.userData.roues = roues;
  return g;
}

// ---------------------------------------------------------------------------
// Motos

function roueMoto(parent, x, rayon, largeurPneu, couleurJante = 0x2a2c2f) {
  const g = new THREE.Group();
  g.position.set(x, rayon, 0);

  const pneu = new THREE.Mesh(new THREE.TorusGeometry(rayon * 0.8, rayon * 0.2, 8, 22), PNEU);
  pneu.castShadow = true;
  g.add(pneu);

  const jante = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.66, rayon * 0.66, 0.045, 18), JANTE);
  jante.rotation.x = PI / 2;
  g.add(jante);

  for (let i = 0; i < 6; i++) {
    const rg = new THREE.Group();
    rg.rotation.z = (i / 6) * TAU;
    rg.add(box(0.03, rayon * 1.24, 0.02, 0x9aa0a5, 0, 0, 0, { metalness: 0.85, roughness: 0.3 }));
    g.add(rg);
  }

  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, largeurPneu, 12), couleurJante);
  moyeu.rotation.x = PI / 2;
  g.add(moyeu);

  parent.add(g);
  return g;
}

export function moto({ type = 'sport', couleur = 0xa82f26, x = 0, z = 0, rot = 0 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;

  const sport = type !== 'cruiser';
  const rAvant = sport ? 0.31 : 0.34;
  const rArriere = sport ? 0.32 : 0.32;
  const xAvant = sport ? 0.74 : 0.86;
  const xArriere = -0.72;
  const peintureMoto = peinture(couleur);

  roueMoto(g, xAvant, rAvant, 0.1, 0x2b2d30);
  roueMoto(g, xArriere, rArriere, 0.12, 0x2b2d30);

  // Fourche et colonne de direction
  for (const cote of [-1, 1]) {
    tige(g, [xAvant - 0.04, rAvant, cote * 0.09], [0.42, 1.0, cote * 0.09], 0.026, CHROME);
    tige(g, [0.42, 1.0, cote * 0.09], [0.24, 1.16, cote * 0.09], 0.024, NOIR_MAT);
  }
  tige(g, [0.5, 0.72, 0], [0.3, 1.08, 0], 0.035, NOIR_MAT);

  // Cadre
  tige(g, [0.3, 0.98, 0], [-0.18, 0.5, 0], 0.035, NOIR_MAT);
  tige(g, [0.3, 0.98, 0], [0.02, 0.4, 0], 0.035, NOIR_MAT);
  tige(g, [-0.18, 0.5, 0], [-0.62, 0.5, 0], 0.04, NOIR_MAT);
  if (sport) {
    for (const cote of [-1, 1]) {
      tige(g, [-0.14, 0.52, cote * 0.16], [-0.66, 0.36, cote * 0.14], 0.025, JANTE);
    }
  }

  // Moteur
  const moteur = new THREE.Group();
  moteur.position.set(0.02, 0.52, 0);
  moteur.add(box(0.42, 0.34, 0.3, 0x2f3236, 0, 0, 0, { roughness: 0.55, metalness: 0.4 }));
  for (let i = 0; i < 4; i++) {
    moteur.add(box(0.44, 0.024, 0.34, 0x8b9095, 0, -0.1 + i * 0.07, 0, { metalness: 0.6, roughness: 0.4 }));
  }
  g.add(moteur);

  // Réservoir
  const reservoir = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), peintureMoto);
  reservoir.scale.set(1.25, 0.62, 0.72);
  reservoir.position.set(0.16, 0.84, 0);
  reservoir.castShadow = true;
  g.add(reservoir);

  // Selle et carénage arrière
  g.add(box(0.46, 0.11, 0.28, 0x18191b, -0.32, 0.88, 0, { roughness: 0.75 }));
  if (sport) {
    const dosseret = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.36, 4), peintureMoto);
    dosseret.rotation.z = -PI / 2;
    dosseret.position.set(-0.62, 0.94, 0);
    dosseret.castShadow = true;
    g.add(dosseret);
    g.add(box(0.36, 0.2, 0.34, peintureMoto, 0.52, 0.72, 0, { roughness: 0.3, metalness: 0.6 }));
  } else {
    g.add(box(0.34, 0.2, 0.3, peintureMoto, -0.66, 0.72, 0, { roughness: 0.3, metalness: 0.6 }));
    for (const cote of [-1, 1]) {
      g.add(box(0.34, 0.3, 0.16, 0x3a2a1d, -0.66, 0.6, cote * 0.24, { roughness: 0.7 }));
    }
  }

  // Guidon
  const guidon = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, sport ? 0.54 : 0.66, 10), CHROME);
  guidon.rotation.x = PI / 2;
  guidon.position.set(0.4, sport ? 1.02 : 1.12, 0);
  g.add(guidon);
  for (const cote of [-1, 1]) {
    g.add(box(0.1, 0.05, 0.05, NOIR_MAT, 0.4, sport ? 1.02 : 1.12, cote * 0.27));
    tige(g, [0.4, sport ? 1.02 : 1.12, cote * 0.22], [0.32, sport ? 1.12 : 1.24, cote * 0.3], 0.012, CHROME);
    g.add(box(0.05, 0.09, 0.03, 0x1a1b1d, 0.32, sport ? 1.14 : 1.26, cote * 0.31));
  }

  // Phare et instrumentation
  const phare = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), PHARE);
  phare.scale.set(0.5, 1, 1);
  phare.position.set(0.55, sport ? 0.9 : 0.86, 0);
  g.add(phare);
  g.add(box(0.08, 0.12, 0.26, 0x17181a, 0.48, sport ? 0.9 : 0.86, 0, { roughness: 0.6 }));

  // Garde-boue avant
  const gardeBoue = new THREE.Mesh(
    new THREE.TorusGeometry(rAvant + 0.06, 0.045, 5, 12, PI * 0.7),
    peintureMoto
  );
  gardeBoue.position.set(xAvant, rAvant, 0);
  gardeBoue.rotation.z = 0.2;
  g.add(gardeBoue);

  // Échappement
  tige(g, [0.2, 0.4, 0.16], [-0.5, 0.34, 0.2], 0.035, CHROME);
  const silencieux = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.52, 14), CHROME);
  silencieux.rotation.z = PI / 2 - 0.05;
  silencieux.position.set(-0.72, 0.36, 0.22);
  g.add(silencieux);

  // Plaque et feu arrière
  g.add(box(0.02, 0.13, 0.18, 0xf1f1ec, -0.9, 0.55, 0));
  const feuAr = box(0.045, 0.05, 0.14, 0xdd1f14, -0.88, 0.68, 0);
  feuAr.material = FEU;
  g.add(feuAr);

  // Béquille
  tige(g, [-0.2, 0.42, 0.05], [-0.34, 0.02, 0.28], 0.018, NOIR_MAT);
  g.add(box(0.16, 0.02, 0.06, NOIR_MAT, -0.34, 0.02, 0.28));

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

