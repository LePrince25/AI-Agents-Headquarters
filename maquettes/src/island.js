// island.js — L'île du QG : socle flottant, falaise, bâtiments sans toit, mobilier.
//
// Règle de proportion : le plateau fait ~38 unités de rayon, un bâtiment 13-20
// unités de large. Le mobilier est dimensionné pour qu'un bureau tienne sous
// un agent (1 unité ≈ 1,7 m à l'échelle du jeu).

import * as THREE from 'three';
import { P3, mat, box, silhouette } from './style.js';

const RAYON = 38;
const APPLAT = 0.86; // l'île est plus large que haute

// ── Falaise ───────────────────────────────────────────────────────────────
// Un socle qui s'effile vers le vide, facetté comme la référence.
function creerFalaise() {
  const g = new THREE.Group();

  const niveaux = [
    { y: 0,    r: 1.00 },
    { y: -2.4, r: 0.97 },
    { y: -5.0, r: 0.88 },
    { y: -7.8, r: 0.72 },
    { y: -10.4, r: 0.50 },
    { y: -12.4, r: 0.26 },
  ];

  for (let i = 0; i < niveaux.length - 1; i++) {
    const n = niveaux[i], n2 = niveaux[i + 1];
    const geo = new THREE.CylinderGeometry(
      RAYON * n.r, RAYON * n2.r, n.y - n2.y, 16, 1, false
    );
    const m = new THREE.Mesh(geo, mat(i % 2 ? P3.falaiseOmbre : P3.falaise, { flat: true }));
    m.position.y = (n.y + n2.y) / 2;
    m.scale.z = APPLAT;
    m.rotation.y = i * 0.19; // facettage irrégulier
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }

  const pointe = new THREE.Mesh(
    new THREE.ConeGeometry(RAYON * 0.26, 4.4, 16),
    mat(P3.falaiseOmbre, { flat: true })
  );
  pointe.position.y = -14.6;
  pointe.scale.z = APPLAT;
  pointe.rotation.y = 0.38;
  pointe.castShadow = true;
  g.add(pointe);

  return g;
}

// ── Plateau ───────────────────────────────────────────────────────────────
function creerPlateau() {
  const g = new THREE.Group();

  const sol = new THREE.Mesh(
    new THREE.CylinderGeometry(RAYON, RAYON, 1.8, 40),
    mat(P3.solPrincipal, { flat: true })
  );
  sol.position.y = -0.9;
  sol.scale.z = APPLAT;
  sol.receiveShadow = true;
  sol.castShadow = true;
  g.add(sol);

  // Bordure claire : dessine le pourtour de la dalle.
  const bordure = new THREE.Mesh(
    new THREE.CylinderGeometry(RAYON + 0.7, RAYON + 0.7, 0.8, 40),
    mat(P3.solBord, { flat: true })
  );
  bordure.position.y = -0.1;
  bordure.scale.z = APPLAT;
  bordure.receiveShadow = true;
  g.add(bordure);

  return g;
}

// ── Place centrale ────────────────────────────────────────────────────────
function creerPlace() {
  const g = new THREE.Group();

  const dalle = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, 0.24, 32),
    mat(P3.solDetail, { flat: true })
  );
  dalle.position.y = 0.06;
  dalle.scale.z = APPLAT;
  dalle.receiveShadow = true;
  g.add(dalle);

  // Anneau décoratif + bancs, comme une place de village.
  const anneau = new THREE.Mesh(
    new THREE.TorusGeometry(6.4, 0.16, 8, 40),
    mat(P3.boisClair, { flat: true })
  );
  anneau.rotation.x = -Math.PI / 2;
  anneau.position.y = 0.22;
  anneau.scale.z = APPLAT;
  g.add(anneau);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const bx = Math.cos(a) * 7.2, bz = Math.sin(a) * 7.2;
    const banc = box(2.6, 0.42, 0.7, P3.bois, bx, 0.42, bz);
    banc.rotation.y = -a + Math.PI / 2;
    g.add(banc);
    const dossier = box(2.6, 0.5, 0.16, P3.bois, bx + Math.cos(a) * 0.28, 0.72, bz + Math.sin(a) * 0.28);
    dossier.rotation.y = -a + Math.PI / 2;
    g.add(dossier);
  }

  // Arbres d'alignement autour de la place.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tx = Math.cos(a) * 10.5, tz = Math.sin(a) * 10.5;
    g.add(arbre(tx, tz, 0.9 + (i % 3) * 0.18));
  }

  return g;
}

// ── Allées ────────────────────────────────────────────────────────────────
function creerAllées(poles) {
  const g = new THREE.Group();

  for (const p of poles) {
    const b = p.bat;
    const dx = b.x, dz = b.z;
    const long = Math.hypot(dx, dz);
    const n = Math.max(3, Math.round(long / 2.6));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = dx * t, z = dz * t;
      const d = box(2.8, 0.2, 2.8, P3.solDetail, x, 0.08, z, { cast: false });
      d.rotation.y = Math.atan2(dz, dx);
      d.receiveShadow = true;
      g.add(d);
    }
  }
  return g;
}

// ── Arbre ─────────────────────────────────────────────────────────────────
function arbre(x, z, echelle = 1) {
  const g = new THREE.Group();

  const tronc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * echelle, 0.26 * echelle, 1.3 * echelle, 6),
    mat(P3.boisSombre, { flat: true })
  );
  tronc.position.y = 0.65 * echelle;
  tronc.castShadow = true;
  g.add(tronc);

  // Feuillage en deux masses, façon low-poly.
  const bas = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05 * echelle, 0),
    mat(P3.planteSombre, { flat: true })
  );
  bas.position.y = 1.75 * echelle;
  bas.scale.y = 0.85;
  bas.castShadow = true;

  const haut = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.78 * echelle, 0),
    mat(P3.plante, { flat: true })
  );
  haut.position.y = 2.55 * echelle;
  haut.castShadow = true;

  g.add(bas, haut);
  g.position.set(x, 0, z);
  return g;
}

// ── Mobilier ──────────────────────────────────────────────────────────────
// Chaque pièce est meublée en fonction de son usage. Le mobilier est petit
// (bureau 1.8 de large, chaise 0.5) pour qu'un agent de 1.6 de haut
// donne l'échelle.
function creerMobilier(style, b, refs) {
  const g = new THREE.Group();
  const y = 0;
  const W = b.w, D = b.d;
  const cx = b.x, cz = b.z;

  // Repère de poste : renvoie la position monde d'un emplacement de travail.
  const poste = (ix, iz, rot = 0) => {
    const x = cx - W / 2 + 1.8 + ix * ((W - 3.6) / Math.max(1, cols() - 1));
    const z = cz - D / 2 + 2.2 + iz * ((D - 4.4) / Math.max(1, rangees() - 1));
    return { x, z, rot };
  };
  const cols = () => (W > 16 ? 4 : 3);
  const rangees = () => (D > 13 ? 3 : 2);

  // --- Primitives de mobilier -------------------------------------------
  const bureau = (x, z, rot = 0, avecEcran = true) => {
    const grp = new THREE.Group();
    const plateau = box(1.8, 0.1, 0.8, P3.boisClair, 0, 0.72, 0);
    const p1 = box(0.08, 0.68, 0.72, P3.metal, -0.78, 0.36, 0);
    const p2 = box(0.08, 0.68, 0.72, P3.metal, 0.78, 0.36, 0);
    grp.add(plateau, p1, p2);
    if (avecEcran) {
      const mon = box(0.78, 0.46, 0.05, P3.ecran, 0, 1.02, -0.24);
      const pied = box(0.07, 0.18, 0.07, P3.metal, 0, 0.86, -0.24);
      grp.add(mon, pied);
    }
    // Chaise
    const assise = box(0.46, 0.08, 0.44, P3.tissu, 0, 0.44, 0.55);
    const dossier = box(0.46, 0.48, 0.07, P3.tissu, 0, 0.68, 0.76);
    const pied = box(0.1, 0.4, 0.1, P3.metal, 0, 0.2, 0.55);
    grp.add(assise, dossier, pied);
    grp.position.set(x, y, z);
    grp.rotation.y = rot;
    return grp;
  };

  const tableRonde = (x, z, r = 1.3) => {
    const grp = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.09, 18), mat(P3.bois, { flat: true }));
    t.position.y = 0.74; t.castShadow = true;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.26, 0.72, 10), mat(P3.metal, { flat: true }));
    p.position.y = 0.36; p.castShadow = true;
    grp.add(t, p);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const assise = box(0.42, 0.07, 0.4, P3.tissuClair, Math.cos(a) * (r + 0.48), 0.43, Math.sin(a) * (r + 0.48));
      const dos = box(0.42, 0.44, 0.06, P3.tissuClair, Math.cos(a) * (r + 0.68), 0.66, Math.sin(a) * (r + 0.68));
      dos.lookAt(0, 0.66, 0);
      grp.add(assise, dos);
    }
    grp.position.set(x, y, z);
    return grp;
  };

  const plante = (x, z, s = 1) => {
    const grp = new THREE.Group();
    const pot = box(0.42, 0.42, 0.42, P3.terre, 0, 0.21, 0);
    const feuillage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.46 * s, 0),
      mat(s > 1 ? P3.planteSombre : P3.plante, { flat: true })
    );
    feuillage.position.y = 0.66;
    feuillage.scale.y = 1.2;
    feuillage.castShadow = true;
    grp.add(pot, feuillage);
    grp.position.set(x, y, z);
    return grp;
  };

  const rangee = (x, z, l, couleur = P3.bois) =>
    box(l, 1.4, 0.5, couleur, x, 0.7, z);

  const cloison = (x, z, l, axe = 'x') =>
    axe === 'x'
      ? box(l, 1.1, 0.14, P3.murChaud, x, 0.55, z)
      : box(0.14, 1.1, l, P3.murChaud, x, 0.55, z);

  // --- Aménagement par pôle ----------------------------------------------
  switch (style) {
    case 'qg': {
      // Le siège : grande table ovale + bureaux en arc + salon.
      g.add(tableRonde(cx, cz - 1.5, 2.1));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.5;
        const p = poste(i % 2, i < 2 ? 0 : 1, a);
        g.add(bureau(cx + Math.cos(a) * 6.4, cz + Math.sin(a) * 4.4, a + Math.PI / 2));
        void p;
      }
      g.add(cloison(cx - W / 2 + 0.5, cz, D - 3, 'z'));
      g.add(cloison(cx + W / 2 - 0.5, cz, D - 3, 'z'));
      g.add(rangee(cx - 4, cz + D / 2 - 0.9, 5));
      g.add(plante(cx + W / 2 - 1.5, cz - D / 2 + 1.5, 1.2));
      g.add(plante(cx - W / 2 + 1.5, cz - D / 2 + 1.5, 1.2));
      g.add(plante(cx - 3, cz + 2, 1));
      g.add(plante(cx + 3, cz + 2, 1));
      break;
    }

    case 'api': {
      // La Forge : rangées de postes + baie serveurs.
      for (let r = 0; r < rangees(); r++) {
        for (let c = 0; c < cols(); c++) {
          const p = poste(c, r, Math.PI);
          g.add(bureau(p.x, p.z, p.rot, (r + c) % 3 !== 0));
          refs.push({ ...p, agent: null });
        }
      }
      for (let i = 0; i < 4; i++) {
        const srv = box(0.85, 1.8, 0.65, P3.metal, cx + W / 2 - 1.1, 0.9, cz - 3 + i * 1.05);
        g.add(srv);
        const led = box(0.7, 0.07, 0.04, P3.ecranClair, cx + W / 2 - 1.1, 1.5, cz - 3 + i * 1.05 + 0.34);
        g.add(led);
      }
      g.add(cloison(cx, cz - D / 2 + 1.6, W - 2));
      g.add(plante(cx - W / 2 + 1.3, cz + D / 2 - 1.4));
      g.add(plante(cx + W / 2 - 1.3, cz + D / 2 - 1.4));
      break;
    }

    case 'vitrines': {
      // L'Atelier Owl : grandes tables, moodboard, canapé.
      g.add(tableRonde(cx - 3.4, cz - 1.6, 1.5));
      g.add(tableRonde(cx + 3.2, cz + 1.8, 1.5));
      for (let i = 0; i < 3; i++) {
        const p = poste(i, 0, Math.PI);
        g.add(bureau(p.x, cz + D / 2 - 2, p.rot, i !== 1));
      }
      // Moodboard mural
      g.add(box(5, 1.9, 0.12, P3.boisSombre, cx + 4.4, 1.5, cz - D / 2 + 0.4));
      for (let i = 0; i < 7; i++) {
        g.add(box(0.62, 0.46, 0.03,
          [P3.boisClair, P3.tissuClair, P3.tissu][i % 3],
          cx + 2.9 + (i % 4) * 1.0, 1.05 + Math.floor(i / 4) * 0.66, cz - D / 2 + 0.5));
      }
      // Canapé
      g.add(box(3.2, 0.5, 1.0, P3.tissu, cx - 4.6, 0.3, cz + D / 2 - 2.2));
      g.add(box(3.2, 0.62, 0.22, P3.tissu, cx - 4.6, 0.64, cz + D / 2 - 2.62));
      g.add(plante(cx - W / 2 + 1.2, cz - 2.5, 1.15));
      g.add(plante(cx + W / 2 - 1.2, cz + 2.2, 1.15));
      g.add(plante(cx + 1.5, cz - 3.6, 0.9));
      break;
    }

    case 'mobiles': {
      // L'Usine Mobile : tables hautes, bancs de test,Drawer à outils.
      for (let i = 0; i < 3; i++) {
        const x = cx - 4 + i * 4;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16), mat(P3.boisClair, { flat: true }));
        t.position.set(x, 1.0, cz - 1.8); t.castShadow = true;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.22, 0.98, 10), mat(P3.metal, { flat: true }));
        p.position.set(x, 0.5, cz - 1.8); p.castShadow = true;
        g.add(t, p);
        const tab = box(0.38, 0.03, 0.66, P3.ecran, x, 1.07, cz - 1.8);
        g.add(tab);
      }
      for (let i = 0; i < 3; i++) {
        const x = cx - 4.4 + i * 4.4;
        g.add(box(0.85, 0.46, 2.0, P3.tissuClair, x, 0.23, cz + 2.4));
        g.add(box(0.34, 0.03, 0.64, P3.ecran, x, 0.48, cz + 2.4));
      }
      g.add(rangee(cx + W / 2 - 1.2, cz, 0.9, P3.boisSombre));
      g.add(plante(cx - W / 2 + 1.3, cz + 3.5, 1.1));
      g.add(plante(cx + W / 2 - 1.3, cz - 3.5, 1.1));
      break;
    }

    case 'saas': {
      // Le Comptoir : open space + salle de réunion vitrée + espace facturation.
      for (let r = 0; r < rangees(); r++) {
        for (let c = 0; c < cols(); c++) {
          const p = poste(c, r, Math.PI);
          g.add(bureau(p.x, p.z, p.rot, (r * c) % 4 !== 0));
          refs.push({ ...p, agent: null });
        }
      }
      g.add(tableRonde(cx + W / 2 - 3, cz + D / 2 - 3, 1.2));
      g.add(rangee(cx - 4, cz + D / 2 - 0.8, 4.5));
      g.add(cloison(cx + W / 2 - 5.5, cz, D - 3, 'z'));
      g.add(plante(cx + W / 2 - 1.4, cz - D / 2 + 1.6, 1.1));
      g.add(plante(cx - W / 2 + 1.4, cz - D / 2 + 1.6));
      break;
    }

    case 'cyber': {
      // Le Bastion : mur d'écrans, table de guerre, postes de riposte.
      g.add(box(W * 0.62, 1.8, 0.14, P3.ecran, cx, 1.5, cz - D / 2 + 0.5));
      for (let i = 0; i < 6; i++) {
        g.add(box(1.15, 0.72, 0.05, P3.ecranClair, cx - W * 0.26 + i * 1.35, 1.5, cz - D / 2 + 0.6));
      }
      g.add(tableRonde(cx, cz + 0.8, 1.7));
      for (let i = 0; i < 3; i++) {
        const p = poste(i, 0, Math.PI);
        g.add(bureau(p.x, cz + D / 2 - 2, p.rot, true));
      }
      // Baie vitrée
      g.add(box(W * 0.34, 2.4, 0.1, P3.ecranClair, cx - W / 2 + 2.6, 1.5, cz + D / 2 - 0.4));
      g.add(plante(cx + W / 2 - 1.4, cz + D / 2 - 1.6, 1.1));
      g.add(plante(cx - W / 2 + 1.4, cz + D / 2 - 1.6));
      break;
    }

    case 'veille': {
      // La Vigie : table de veille, cartes, tableau de suivi.
      g.add(tableRonde(cx, cz, 1.8));
      const carte = box(4.6, 1.6, 0.12, P3.boisSombre, cx, 1.45, cz - D / 2 + 0.45);
      g.add(carte);
      for (let i = 0; i < 8; i++) {
        g.add(box(0.66, 0.46, 0.03,
          [P3.boisClair, P3.tissuClair, P3.tissu][i % 3],
          cx - 1.9 + (i % 4) * 1.25, 1.05 + Math.floor(i / 4) * 0.62, cz - D / 2 + 0.53));
      }
      g.add(box(3.4, 1.1, 0.55, P3.bois, cx - W / 2 + 2.4, 0.55, cz + 2.6));
      g.add(box(3.4, 1.1, 0.55, P3.bois, cx + W / 2 - 2.4, 0.55, cz + 2.6));
      g.add(plante(cx - 1.6, cz + 3.4, 1.1));
      g.add(plante(cx + 1.6, cz + 3.4, 1.1));
      break;
    }

    case 'ops': {
      // Le Bureau : comptoir d'accueil, table de devis, archives.
      const comptoir = box(5.0, 1.05, 0.9, P3.bois, cx - W / 2 + 3.2, 0.53, cz - 2.2);
      g.add(comptoir);
      g.add(box(5.2, 0.09, 1.05, P3.boisClair, cx - W / 2 + 3.2, 1.1, cz - 2.2));
      g.add(tableRonde(cx + 2.8, cz + 1.6, 1.15));
      for (let i = 0; i < 3; i++) {
        const p = poste(i, 0, Math.PI);
        g.add(bureau(p.x, cz + D / 2 - 2, p.rot, i === 1));
      }
      for (let i = 0; i < 4; i++) {
        g.add(box(1.2, 1.7, 0.55, P3.boisSombre, cx + W / 2 - 1.1, 0.85, cz - 3.2 + i * 0.95));
      }
      g.add(plante(cx - W / 2 + 1.2, cz + 3.4, 1));
      g.add(plante(cx + W / 2 - 1.2, cz + 3.4, 1));
      break;
    }

    case 'data': {
      // L'Observatoire : postes de calcul + mur de monitors.
      for (let r = 0; r < rangees(); r++) {
        for (let c = 0; c < cols(); c++) {
          const p = poste(c, r, Math.PI);
          g.add(bureau(p.x, p.z, p.rot, true));
          refs.push({ ...p, agent: null });
        }
      }
      for (let i = 0; i < 5; i++) {
        g.add(box(1.0, 0.66, 0.05, P3.ecranClair, cx - 2.9 + i * 1.45, 1.5, cz - D / 2 + 0.4));
      }
      g.add(box(W * 0.66, 1.2, 0.42, P3.metal, cx, 0.6, cz + D / 2 - 1.1));
      g.add(plante(cx - W / 2 + 1.3, cz + D / 2 - 1.6));
      break;
    }

    case 'bi': {
      // La BI : salle de reporting, tableau de chiffres, table de décision.
      g.add(box(5.4, 1.9, 0.12, P3.boisSombre, cx, 1.5, cz - D / 2 + 0.45));
      for (let i = 0; i < 4; i++) {
        g.add(box(1.0, 0.66, 0.04, P3.ecranClair, cx - 2.1 + i * 1.4, 1.5, cz - D / 2 + 0.53));
      }
      g.add(tableRonde(cx, cz + 1.4, 1.6));
      for (let i = 0; i < 2; i++) {
        const p = poste(i, 0, Math.PI);
        g.add(bureau(p.x, cz + D / 2 - 2, p.rot, true));
      }
      g.add(plante(cx - W / 2 + 1.3, cz + 2.8, 1.05));
      g.add(plante(cx + W / 2 - 1.3, cz + 2.8, 1.05));
      break;
    }
  }

  return g;
}

// ── Bâtiment ──────────────────────────────────────────────────────────────
// Sans toit : les murs sont bas (1.25) pour que la caméra plonge dans
// les pièces. Une bordure claire dessine le plan au sol.
export function creerBatiment(pole) {
  const g = new THREE.Group();
  const b = pole.bat;
  const hauteurMur = 1.25;
  const y = 0;

  // Sol du bâtiment, plus clair que le plateau.
  const sol = new THREE.Mesh(
    new THREE.BoxGeometry(b.w, 0.22, b.d),
    mat(P3.plateau, { flat: true })
  );
  sol.position.set(b.x, y + 0.11, b.z);
  sol.receiveShadow = true;
  g.add(sol);

  // Murs : on laisse les deux angles sud-ouest et sud-est ouverts pour que
  // la caméra plonge dans les pièces.
  const t = 0.28;
  const murs = [
    [b.w, t, b.x, b.z - b.d / 2 + t / 2],
    [t, b.d - t * 2, b.x - b.w / 2 + t / 2, b.z],
    [t, b.d - t * 2, b.x + b.w / 2 - t / 2, b.z],
  ];
  for (const [w, d, mx, mz] of murs) {
    const mur = box(w, hauteurMur, d, P3.mur, mx, y + hauteurMur / 2 + 0.22, mz);
    g.add(mur);
  }

  // Façade vitrée au nord (face « rue »).
  const baie = box(b.w * 0.46, hauteurMur * 0.8, 0.14, 0xbcd8e0,
    b.x + b.w * 0.2, y + hauteurMur * 0.5 + 0.22, b.z - b.d / 2 + 0.14);
  baie.material = mat(0xbcd8e0, { transparent: true, opacite: 0.55 });
  g.add(baie);

  // Bordure : dessine le plan du bâtiment au sol.
  const bordure = box(b.w + 0.7, 0.14, b.d + 0.7, P3.murChaud,
    b.x, y + 0.07, b.z);
  g.add(bordure);

  // Escalier d'entrée, côté sud.
  const marche = box(2.2, 0.16, 0.7, P3.solBord, b.x, y + 0.08, b.z + b.d / 2 + 0.4);
  g.add(marche);

  // Mobilier + emplacements d'agents.
  const refs = [];
  g.add(creerMobilier(pole.style, b, refs));

  // Les agents sont posés sur les emplacements de travail quand il y en a,
  // sinon ils sont répartis dans la salle.
  const agents = [];
  pole.agents.forEach((a, i) => {
    const ref = refs[i];
    let px, pz, rot;
    if (ref) {
      px = ref.x + Math.sin(ref.rot) * 0.85;
      pz = ref.z + Math.cos(ref.rot) * 0.85;
      rot = ref.rot;
    } else {
      const n = pole.agents.length;
      const col = i % Math.min(3, n);
      px = b.x - b.w / 2 + 2.4 + col * ((b.w - 4.8) / Math.max(1, Math.min(3, n) - 1 || 1));
      pz = b.z + b.d / 2 - 2.2;
      rot = Math.PI;
    }
    const s = silhouette(px, pz, y + 0.22, i % 3 === 1 ? P3.silhouetteAlt : P3.silhouette);
    s.rotation.y = rot;
    s.userData.agent = a;
    s.userData.pole = pole;
    g.add(s);
    agents.push({ agent: a, world: new THREE.Vector3(px, y + 2.0, pz) });
  });

  g.userData.pole = pole;
  g.userData.agents = agents;

  // Zone cliquable invisible.
  const zone = new THREE.Mesh(
    new THREE.BoxGeometry(b.w + 1, 3, b.d + 1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  zone.position.set(b.x, 1.5, b.z);
  zone.userData.pole = pole;
  g.add(zone);

  return g;
}

// ── Assemble l'île ────────────────────────────────────────────────────────
export function creerIle(poles) {
  const g = new THREE.Group();
  g.add(creerFalaise());
  g.add(creerPlateau());
  g.add(creerPlace());
  g.add(creerAllées(poles));

  for (const p of poles) {
    g.add(creerBatiment(p));
  }

  // Végétation sur les marges, là où il n'y a pas de bâtiment.
  const rnd = (n) => ((Math.sin(n * 78.233) * 43758.5453) % 1 + 1) % 1;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + rnd(i) * 0.18;
    const r = 31 + rnd(i * 3.3) * 5;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * APPLAT;
    // On évite de planter un arbre sur un bâtiment.
    let proche = false;
    for (const p of poles) {
      if (Math.abs(x - p.bat.x) < p.bat.w / 2 + 2.5 && Math.abs(z - p.bat.z) < p.bat.d / 2 + 2.5) proche = true;
    }
    if (proche) continue;
    g.add(arbre(x, z, 0.85 + rnd(i * 7) * 0.4));
  }

  // Buissons épars sur le plateau.
  for (let i = 0; i < 22; i++) {
    const a = rnd(i * 5.1) * Math.PI * 2;
    const r = 13 + rnd(i * 2.7) * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * APPLAT;
    let proche = false;
    for (const p of poles) {
      if (Math.abs(x - p.bat.x) < p.bat.w / 2 + 1.2 && Math.abs(z - p.bat.z) < p.bat.d / 2 + 1.2) proche = true;
    }
    if (Math.hypot(x, z) < 12 || proche) continue;
    const buisson = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.4 + rnd(i) * 0.3, 0),
      mat(rnd(i * 2) > 0.5 ? P3.plante : P3.planteSombre, { flat: true })
    );
    buisson.position.set(x, 0.28, z);
    buisson.scale.y = 0.8;
    buisson.castShadow = true;
    g.add(buisson);
  }

  return g;
}
