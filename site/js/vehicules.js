import * as THREE from 'three';
import { PI, TAU, mat, box } from './core.js';

// Véhicules du parvis : silhouettes extrudées (profil latéral), vitres,
// jantes, phares et détails. Construits localement, sans asset externe.

const TEINTE = new THREE.MeshStandardMaterial({
  color: 0x121a20,
  roughness: 0.06,
  metalness: 0.35,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
});

const CHROME = mat(0xc9ced2, { roughness: 0.18, metalness: 0.92 });
const NOIR_MAT = mat(0x141518, { roughness: 0.88 });
const PNEU = mat(0x101113, { roughness: 0.96 });
const JANTE = mat(0x9fa5aa, { roughness: 0.26, metalness: 0.88 });
const FREIN = mat(0x5d6166, { roughness: 0.5, metalness: 0.7 });
const PHARE = mat(0xfff6de, { emissive: 0xffedc2, emissiveIntensity: 1.7, roughness: 0.25 });
const FEU = mat(0xd8261b, { emissive: 0xff2a16, emissiveIntensity: 1.8, roughness: 0.35 });
const CLIGNOTANT = mat(0xe8a02c, { emissive: 0xff9a12, emissiveIntensity: 1.1, roughness: 0.35 });

function peinture(couleur) {
  return mat(couleur, { roughness: 0.26, metalness: 0.72, envMapIntensity: 1.35 });
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

function roue(parent, x, z, rayon, largeur, cote) {
  const g = new THREE.Group();
  g.position.set(x, rayon, z);

  const pneu = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, largeur, 22), PNEU);
  pneu.rotation.x = PI / 2;
  pneu.castShadow = true;
  g.add(pneu);

  const jante = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.62, rayon * 0.62, largeur + 0.012, 18), JANTE);
  jante.rotation.x = PI / 2;
  g.add(jante);

  const face = cote * (largeur / 2 + 0.008);
  const disque = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.56, rayon * 0.56, 0.02, 18), FREIN);
  disque.rotation.x = PI / 2;
  disque.position.z = face;
  g.add(disque);

  for (let i = 0; i < 5; i++) {
    const rayonG = new THREE.Group();
    rayonG.rotation.z = (i / 5) * TAU;
    const branche = box(0.055, rayon * 0.92, 0.035, 0x9aa0a5, 0, rayon * 0.46, face + 0.014, {
      roughness: 0.28,
      metalness: 0.86,
    });
    rayonG.add(branche);
    g.add(rayonG);
  }

  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 14), NOIR_MAT);
  moyeu.rotation.x = PI / 2;
  moyeu.position.z = face + 0.03;
  g.add(moyeu);

  const etrier = box(0.1, 0.16, 0.05, 0xb2402f, -0.12, rayon * 0.22, face - 0.025, { roughness: 0.45 });
  g.add(etrier);

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

function corps(points, largeur, couleur) {
  const geo = new THREE.ExtrudeGeometry(profil(points), {
    depth: largeur,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 3,
    curveSegments: 6,
    steps: 1,
  });
  geo.translate(0, 0, -largeur / 2);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, peinture(couleur));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function vitreLaterale(parent, polygone, largeur, decalage = 0.0) {
  const forme = profil(polygone);
  const geo = new THREE.ShapeGeometry(forme);
  for (const cote of [-1, 1]) {
    const m = new THREE.Mesh(geo, TEINTE);
    m.position.z = cote * (largeur / 2 + 0.006 + decalage);
    m.scale.x = 1;
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

const MODELES = {
  sport: {
    L: 4.55,
    largeur: 1.86,
    roues: 0.345,
    empattement: 2.62,
    profil: [
      [2.24, 0.4], [2.3, 0.62], [2.16, 0.8], [1.62, 0.87], [1.08, 0.98], [0.5, 1.17],
      [-0.32, 1.22], [-1.02, 1.16], [-1.6, 0.97], [-2.16, 0.88], [-2.3, 0.74],
      [-2.28, 0.48], [-2.16, 0.36], [-1.6, 0.3], [1.6, 0.3],
    ],
    vitres: [[0.98, 0.99], [0.5, 1.14], [-0.05, 1.18], [-0.75, 1.14], [-1.4, 0.98], [-1.05, 0.95], [0.72, 0.95]],
    pareBrise: [0.84, 1.07, 0.62, -0.58],
    lunette: [-1.2, 1.07, 0.58, 0.6],
    spoiler: true,
    hauteurToit: 1.22,
  },
  coupe: {
    L: 4.6,
    largeur: 1.84,
    roues: 0.34,
    empattement: 2.68,
    profil: [
      [2.28, 0.42], [2.34, 0.64], [2.2, 0.84], [1.62, 0.9], [1.06, 1.0], [0.55, 1.2],
      [-0.28, 1.25], [-0.98, 1.19], [-1.58, 1.0], [-2.18, 0.9], [-2.34, 0.76],
      [-2.32, 0.5], [-2.2, 0.38], [-1.66, 0.32], [1.66, 0.32],
    ],
    vitres: [[1.0, 1.02], [0.54, 1.17], [-0.05, 1.21], [-0.78, 1.17], [-1.42, 1.0], [-1.08, 0.97], [0.72, 0.97]],
    pareBrise: [0.86, 1.1, 0.64, -0.6],
    lunette: [-1.24, 1.1, 0.6, 0.62],
    hauteurToit: 1.25,
  },
  berline: {
    L: 4.92,
    largeur: 1.86,
    roues: 0.355,
    empattement: 2.9,
    profil: [
      [2.42, 0.44], [2.46, 0.68], [2.3, 0.9], [1.66, 0.96], [1.14, 1.04], [0.62, 1.32],
      [-0.44, 1.42], [-1.14, 1.38], [-1.62, 1.12], [-2.3, 1.0], [-2.44, 0.86],
      [-2.42, 0.55], [-2.3, 0.4], [-1.8, 0.33], [1.8, 0.33],
    ],
    vitres: [[1.02, 1.06], [0.58, 1.3], [-0.44, 1.37], [-1.08, 1.33], [-1.52, 1.11], [-1.2, 1.03], [0.78, 1.03]],
    pareBrise: [0.86, 1.2, 0.7, -0.64],
    lunette: [-1.38, 1.22, 0.66, 0.52],
    hauteurToit: 1.42,
  },
  suv: {
    L: 4.98,
    largeur: 1.96,
    roues: 0.395,
    empattement: 2.95,
    profil: [
      [2.46, 0.5], [2.5, 0.84], [2.34, 1.02], [1.72, 1.07], [1.22, 1.16], [0.7, 1.7],
      [-1.48, 1.75], [-1.92, 1.6], [-2.34, 1.14], [-2.48, 0.92], [-2.44, 0.56],
      [-2.32, 0.4], [-1.82, 0.36], [1.82, 0.36],
    ],
    vitres: [[1.08, 1.18], [0.68, 1.63], [-1.42, 1.68], [-1.84, 1.55], [-2.16, 1.14], [-1.72, 1.1], [0.86, 1.1]],
    pareBrise: [0.95, 1.4, 0.78, -0.58],
    lunette: [-1.9, 1.45, 0.7, 0.36],
    hauteurToit: 1.75,
  },
};

export function voiture({ type = 'coupe', couleur = 0x8b9096, x = 0, z = 0, rot = 0 } = {}) {
  const spec = MODELES[type] || MODELES.coupe;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;

  const largeur = spec.largeur;
  const demiL = spec.L / 2;

  g.add(corps(spec.profil, largeur, couleur));

  // Bas de caisse sombre, lèvre avant et diffuseur
  g.add(box(spec.L - 0.5, 0.1, largeur + 0.01, 0x17181a, 0, 0.3, 0, { roughness: 0.9 }));
  g.add(box(0.3, 0.14, largeur * 0.86, 0x17181a, demiL - 0.08, 0.36, 0, { roughness: 0.9 }));
  g.add(box(0.26, 0.16, largeur * 0.84, 0x17181a, -demiL + 0.06, 0.38, 0, { roughness: 0.9 }));

  // Passages de roue
  for (const cote of [-1, 1]) {
    for (const ex of [-spec.empattement / 2, spec.empattement / 2]) {
      const arche = new THREE.Mesh(
        new THREE.TorusGeometry(spec.roues + 0.055, 0.035, 6, 20, PI),
        mat(0x1b1c1f, { roughness: 0.55 })
      );
      arche.position.set(ex, spec.roues, cote * (largeur / 2 + 0.012));
      arche.castShadow = true;
      g.add(arche);
    }
  }

  const roues = [];
  for (const cote of [-1, 1]) {
    for (const ex of [-spec.empattement / 2, spec.empattement / 2]) {
      roues.push(roue(g, ex, cote * (largeur / 2 + 0.06), spec.roues, 0.25, cote));
    }
  }

  vitreLaterale(g, spec.vitres, largeur);
  vitreInclinee(g, spec.pareBrise[0], spec.pareBrise[1], largeur * 0.84, spec.pareBrise[2], spec.pareBrise[3]);
  vitreInclinee(g, spec.lunette[0], spec.lunette[1], largeur * 0.8, spec.lunette[2], spec.lunette[3]);

  // Tour de vitrage chromé
  g.add(box(2.1, 0.02, largeur + 0.012, 0xb9bec2, 0.1, 1.0, 0, { metalness: 0.8, roughness: 0.3 }));

  // Phares, calandre, bouclier
  for (const cote of [-1, 1]) {
    g.add(box(0.05, 0.19, 0.58, 0x101112, demiL - 0.05, 0.82, cote * 0.54, { roughness: 0.6 }));
    const lentille = box(0.055, 0.13, 0.5, 0xffffff, demiL - 0.035, 0.82, cote * 0.54);
    lentille.material = PHARE;
    g.add(lentille);
    g.add(box(0.05, 0.1, 0.16, 0xd9b25e, demiL - 0.04, 0.8, cote * 0.82, { roughness: 0.4 }));
    const cligno = box(0.045, 0.08, 0.12, 0xd98a1f, demiL - 0.032, 0.8, cote * 0.8);
    cligno.material = CLIGNOTANT;
    g.add(cligno);
  }
  g.add(box(0.06, 0.26, 1.12, 0x0e0f11, demiL - 0.03, 0.55, 0, { roughness: 0.55 }));
  for (let i = 0; i < 7; i++) {
    g.add(box(0.012, 0.22, 0.03, 0xaeb3b8, demiL - 0.002, 0.55, -0.42 + i * 0.14, { metalness: 0.8, roughness: 0.3 }));
  }
  g.add(box(0.02, 0.12, 0.44, 0xf1f1ec, demiL - 0.012, 0.47, 0));

  // Feux arrière
  g.add(box(0.045, 0.1, 1.44, 0x351110, -demiL + 0.04, 0.88, 0, { roughness: 0.4 }));
  const feu = box(0.05, 0.075, 1.4, 0xdd1f14, -demiL + 0.028, 0.88, 0);
  feu.material = FEU;
  g.add(feu);

  g.add(box(0.02, 0.13, 0.42, 0xf1f1ec, -demiL + 0.02, 0.56, 0));

  // Rétroviseurs, poignées, antenne
  for (const cote of [-1, 1]) {
    g.add(box(0.16, 0.1, 0.2, couleur, 0.95, 1.02, cote * (largeur / 2 + 0.1), { roughness: 0.3, metalness: 0.6 }));
    g.add(box(0.04, 0.05, 0.12, 0x1b1c1e, 0.93, 1.02, cote * (largeur / 2 + 0.04)));
    g.add(box(0.24, 0.035, 0.03, 0xb9bec2, 0.42, 0.95, cote * (largeur / 2 + 0.012), { metalness: 0.85, roughness: 0.25 }));
    g.add(box(0.24, 0.035, 0.03, 0xb9bec2, -0.62, 0.95, cote * (largeur / 2 + 0.012), { metalness: 0.85, roughness: 0.25 }));
    g.add(box(0.045, 0.055, 0.045, 0x121315, -0.55, spec.hauteurToit + 0.02, cote * 0.42));
  }

  // Sorties d'échappement
  for (const cote of [-1, 1]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12), CHROME);
    pot.rotation.z = PI / 2;
    pot.position.set(-demiL - 0.02, 0.4, cote * 0.36);
    g.add(pot);
  }

  if (spec.spoiler) {
    g.add(box(0.24, 0.035, largeur * 0.78, 0x1a1b1d, -1.92, spec.hauteurToit + 0.06, 0, { roughness: 0.45 }));
    for (const cote of [-1, 1]) {
      g.add(box(0.05, 0.12, 0.05, 0x1a1b1d, -1.9, spec.hauteurToit - 0.01, cote * 0.6));
    }
  }

  if (type === 'suv') {
    for (const cote of [-1, 1]) {
      g.add(box(2.5, 0.045, 0.07, 0x222326, 0.1, spec.hauteurToit + 0.04, cote * 0.68));
    }
    for (const cote of [-1, 1]) {
      g.add(box(spec.L - 0.7, 0.14, 0.05, 0x24262a, 0, 0.46, cote * (largeur / 2 + 0.006), { roughness: 0.85 }));
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

