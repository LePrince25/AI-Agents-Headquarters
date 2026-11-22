import * as THREE from 'three';
import { PI, TAU, C, mat, box, cyl, planTexture, texturePlancher } from './core.js';
import { agentProcedural, POSTES, PLACES } from './agents.js';
import { poser } from './models.js';
import { decorerBureau, decorerPavillon, decorerQG, decorerAtelier } from './decor.js';
import { porteDouble } from './portes.js';
import { POLES, DIRECTION, RAYON_POLES, ATELIER_OUTILS } from './data.js';

const W = 10.6;
const D = 8.6;
const H = 2.55;
const SOL = 0.35;

function zoneClic(g, largeur, profondeur, poleId) {
  const zone = new THREE.Mesh(
    new THREE.BoxGeometry(largeur, 5.2, profondeur),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  );
  zone.position.set(0, 2.6, 0);
  zone.userData.poleId = poleId;
  g.add(zone);
  return zone;
}

function etagere(g, modeles) {
  poser(modeles, 'bibliotheque', g, 0, SOL, -3.72, 0);
}

function plantes(g, modeles) {
  poser(modeles, 'plantePot', g, -4.55, SOL, -3.35, 0.3);
  poser(modeles, 'plantePot', g, 4.5, SOL, 3.5, -0.4);
  poser(modeles, 'planteHaute', g, -4.35, SOL, 3.35, 0.8);
}

function postesEtAgents(spec, index, g, modeles, agents, figurants) {
  spec.agents.forEach((a, i) => {
    const p = POSTES[i];
    const s = PLACES[i];

    poser(modeles, 'bureau', g, p.x, SOL, p.z, p.rot);
    poser(modeles, 'chaise', g, s.x, SOL, s.z, s.rot + PI);
    decorerBureau(g, modeles, { poste: p, place: s, i, agent: a, spec, index, sol: SOL });

    const { groupe, ancre, bras, jambes } = agentProcedural(g, s.x, s.z, s.rot, true, index * 4 + i, SOL);
    agents.push({
      nom: a.nom,
      poste: a.poste,
      etat: a.etat,
      poleId: spec.id,
      lieu: spec.lieu,
      accent: spec.accent,
      objet: groupe,
      ancre,
      bras,
      jambes,
      index: index * 4 + i,
      sol: SOL,
    });
  });

  for (let i = spec.agents.length; i < POSTES.length; i++) {
    const s = PLACES[i];
    const { groupe, bras, jambes } = agentProcedural(g, s.x, s.z, s.rot, true, 60 + index * 4 + i, SOL, {
      casque: (index + i) % 3 === 0,
    });
    figurants.push({
      groupe,
      bras,
      jambes,
      decalage: index * 1.7 + i * 2.3,
      actif: (index + i) % 2 === 0,
    });
  }
}

function meubleSignature(spec, g, modeles) {
  switch (spec.kind) {
    case 'forge': {
      const rack = new THREE.Group();
      rack.position.set(3.85, SOL, -3.3);
      for (let i = 0; i < 2; i++) {
        const x = i * 0.82 - 0.41;
        rack.add(box(0.7, 1.9, 0.55, 0x4f5459, x, 0.95, 0, { roughness: 0.7 }));
        for (let j = 0; j < 4; j++) {
          rack.add(box(0.5, 0.05, 0.05, 0xcfd8cf, x, 0.55 + j * 0.3, 0.28));
        }
      }
      g.add(rack);
      break;
    }
    case 'atelier': {
      poser(modeles, 'chevalet', g, 3.55, SOL, 3.0, -0.7);
      etagere(g, modeles);
      break;
    }
    case 'mobile': {
      const stand = new THREE.Group();
      stand.position.set(3.35, SOL, 3.0);
      stand.add(box(1.4, 0.06, 0.6, C.boisClair, 0, 0.85, 0));
      stand.add(box(0.06, 0.85, 0.5, C.boisFonce, -0.6, 0.43, 0));
      stand.add(box(0.06, 0.85, 0.5, C.boisFonce, 0.6, 0.43, 0));
      for (let i = 0; i < 3; i++) {
        const t = box(0.3, 0.58, 0.05, 0x3f464c, -0.4 + i * 0.4, 1.17, 0, { roughness: 0.5 });
        t.rotation.x = -0.18;
        stand.add(t);
        const e = box(0.25, 0.5, 0.01, 0xbfe0e6, -0.4 + i * 0.4, 1.17, 0.031, { roughness: 0.4 });
        e.rotation.x = -0.18;
        stand.add(e);
      }
      g.add(stand);
      etagere(g, modeles);
      break;
    }
    case 'comptoir': {
      const cpt = new THREE.Group();
      cpt.position.set(2.9, SOL, 3.45);
      cpt.add(box(2.0, 1.0, 0.62, C.mur, 0, 0.5, 0));
      cpt.add(box(2.1, 0.09, 0.72, C.bois, 0, 1.03, 0));
      cpt.add(box(0.45, 0.32, 0.05, 0x3f464c, -0.45, 0.66, 0.33));
      cpt.add(box(0.4, 0.28, 0.02, 0xd7cbb4, -0.45, 0.66, 0.36));
      g.add(cpt);
      poser(modeles, 'machineCafe', g, 2.35, SOL + 1.08, 3.45, PI);
      etagere(g, modeles);
      break;
    }
    case 'bastion': {
      const porte = new THREE.Group();
      porte.position.set(0, SOL, -D / 2 + 0.38);
      porte.add(box(2.2, 1.75, 0.14, 0x8b8f92, 0, 0.875, 0, { roughness: 0.6 }));
      const disque = cyl(0.72, 0.72, 0.1, 0x5d6165, 0, 0.95, 0.09, 28, { roughness: 0.5 });
      disque.rotation.x = PI / 2;
      porte.add(disque);
      porte.add(box(0.5, 0.1, 0.06, 0xb8a98f, 0, 0.95, 0.16));
      porte.add(box(0.1, 0.5, 0.06, 0xb8a98f, 0, 0.95, 0.16));
      g.add(porte);
      poser(modeles, 'coffreFort', g, 4.3, SOL, -3.05, -0.3);
      break;
    }
    case 'vigie': {
      const tour = new THREE.Group();
      tour.position.set(W / 2 + 1.9, 0, -D / 2 + 1.4);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          tour.add(box(0.14, 4.4, 0.14, C.boisFonce, sx * 0.62, 2.2, sz * 0.62));
        }
      }
      tour.add(box(1.7, 0.16, 1.7, C.boisClair, 0, 4.3, 0));
      tour.add(box(1.7, 0.08, 0.1, C.bois, 0, 4.9, -0.8));
      tour.add(box(1.7, 0.08, 0.1, C.bois, 0, 4.9, 0.8));
      tour.add(box(0.1, 0.08, 1.7, C.bois, -0.8, 4.9, 0));
      tour.add(box(0.1, 0.08, 1.7, C.bois, 0.8, 4.9, 0));
      const tipi = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.9, 4), mat(C.terracotta, { flatShading: true }));
      tipi.position.y = 5.5;
      tipi.rotation.y = PI / 4;
      tipi.castShadow = true;
      tour.add(tipi);

      const hibou = new THREE.Group();
      hibou.position.set(0, 4.55, 0.35);
      const corps = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), mat(0xa78a68, { roughness: 0.9 }));
      corps.scale.set(1, 1.15, 0.9);
      corps.position.y = 0.45;
      corps.castShadow = true;
      hibou.add(corps);
      const tete = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), mat(0xb59a76, { roughness: 0.9 }));
      tete.position.y = 0.88;
      tete.castShadow = true;
      hibou.add(tete);
      for (const sx of [-1, 1]) {
        const oreille = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 5), mat(0x8f7354));
        oreille.position.set(sx * 0.15, 1.06, 0);
        hibou.add(oreille);
        const oeil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mat(0xf5eedd, { roughness: 0.4 }));
        oeil.position.set(sx * 0.1, 0.91, 0.22);
        hibou.add(oeil);
        const pupille = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), mat(0x2b2823));
        pupille.position.set(sx * 0.1, 0.91, 0.285);
        hibou.add(pupille);
        const aile = box(0.1, 0.42, 0.3, 0x997c5c, sx * 0.3, 0.45, 0);
        aile.rotation.z = sx * -0.12;
        hibou.add(aile);
      }
      tour.add(hibou);
      g.add(tour);
      etagere(g, modeles);
      break;
    }
    case 'bureau': {
      poser(modeles, 'canape', g, 3.55, SOL, 3.2, 0);
      poser(modeles, 'tableBasse', g, 3.55, SOL, 2.05, 0);
      etagere(g, modeles);
      break;
    }
    case 'data': {
      const mur = new THREE.Group();
      mur.position.set(-2.6, SOL, -D / 2 + 0.4);
      mur.add(box(2.6, 1.15, 0.08, C.blanc, 0, 1.15, 0));
      const teintes = [0x5f8a9a, 0x7d9b4e, 0xc2a04a];
      for (let i = 0; i < 5; i++) {
        const hb = 0.2 + ((i * 37) % 10) / 18;
        mur.add(box(0.28, hb, 0.03, teintes[i % 3], -0.9 + i * 0.44, 1.0 + hb / 2, 0.06));
      }
      g.add(mur);
      break;
    }
    case 'bi': {
      const mur = new THREE.Group();
      mur.position.set(2.9, SOL, -D / 2 + 0.4);
      mur.add(box(2.5, 1.2, 0.08, 0x4a5054, 0, 1.15, 0, { roughness: 0.5 }));
      mur.add(box(2.3, 1.0, 0.02, 0xe8eef0, 0, 1.15, 0.05));
      for (let i = 0; i < 4; i++) {
        const hb = 0.3 + i * 0.18;
        mur.add(box(0.34, hb, 0.02, 0x8a8095, -0.75 + i * 0.5, 0.85 + hb / 2, 0.07));
      }
      g.add(mur);
      poser(modeles, 'tableauLiege', g, -3.35, 1.15, -4.02, 0);
      break;
    }
    default:
      break;
  }
}

function pavillon(spec, index, modeles, ile) {
  const g = new THREE.Group();
  const a = (spec.angle * PI) / 180;
  const x = Math.cos(a) * RAYON_POLES;
  const z = Math.sin(a) * RAYON_POLES;
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));

  g.add(box(W + 1.1, 0.34, D + 1.1, C.dalle, 0, 0.17, 0, { roughness: 0.94 }));
  g.add(planTexture(W - 0.4, D - 0.4, spec.sol, texturePlancher(), 0, SOL, 0, { roughness: 0.92 }));

  g.add(box(W, H, 0.3, C.mur, 0, SOL + H / 2, -D / 2 + 0.15));
  for (const cote of [-1, 1]) {
    g.add(box(0.3, 1.0, D, C.mur, cote * (W / 2 - 0.15), 0.84, 0));
    const verre = box(0.12, 1.22, D - 0.5, C.verre, cote * (W / 2 - 0.15), 1.98, 0, {
      transparent: true,
      opacity: 0.28,
      roughness: 0.18,
      metalness: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    verre.castShadow = false;
    g.add(verre);
    for (const mz of [-D / 3, 0, D / 3]) {
      g.add(box(0.16, 2.4, 0.12, C.mur, cote * (W / 2 - 0.15), 1.54, mz));
    }
  }

  for (const cote of [-1, 1]) {
    g.add(box((W - 2.6) / 2, 1.0, 0.3, C.mur, cote * (W / 4 + 0.65), 0.84, D / 2 - 0.15));
  }
  g.add(box(W, 0.34, 0.36, C.mur, 0, SOL + H - 0.17, D / 2 - 0.18));
  g.add(box(W, 0.12, 0.42, C.boisClair, 0, SOL + H + 0.02, D / 2 - 0.18));

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(box(0.34, H + 0.1, 0.34, C.mur, sx * (W / 2 - 0.17), SOL + (H + 0.1) / 2, sz * (D / 2 - 0.17)));
    }
  }

  // Deux tapis sous les rangées
  poser(modeles, 'tapis', g, 0, SOL + 0.012, -2.48, 0);
  poser(modeles, 'tapis', g, 0, SOL + 0.012, 2.5, 0);

  // Plantes de coin et lampadaire
  plantes(g, modeles);
  poser(modeles, 'lampadaire', g, -4.5, SOL, 1.55, 0);

  const agents = [];
  const figurants = [];
  postesEtAgents(spec, index, g, modeles, agents, figurants);
  meubleSignature(spec, g, modeles);
  decorerPavillon(spec, index, g, modeles);

  const colliders = [
    { x: 0, z: -D / 2 + 0.15, hw: W / 2 + 0.05, hd: 0.2 },
    { x: -(W / 2 - 0.15), z: 0, hw: 0.2, hd: D / 2 + 0.05 },
    { x: W / 2 - 0.15, z: 0, hw: 0.2, hd: D / 2 + 0.05 },
    { x: -3.3, z: D / 2 - 0.15, hw: 2.0, hd: 0.2 },
    { x: 3.3, z: D / 2 - 0.15, hw: 2.0, hd: 0.2 },
    { x: 0, z: -3.72, hw: 0.75, hd: 0.32 },
    { x: -4.55, z: -3.35, r: 0.34, cercle: true },
    { x: 4.5, z: 3.5, r: 0.32, cercle: true },
    { x: -4.35, z: 3.35, r: 0.34, cercle: true },
    { x: 4.42, z: -1.95, r: 0.28, cercle: true },
    { x: -4.8, z: 0, r: 0.36, cercle: true },
    { x: 3.95, z: 2.0, r: 0.4, cercle: true },
  ];
  for (const p of POSTES) colliders.push({ x: p.x, z: p.z, hw: 0.8, hd: 0.46 });
  for (const s of PLACES) colliders.push({ x: s.x, z: s.z, hw: 0.26, hd: 0.26 });

  if (spec.kind === 'forge') colliders.push({ x: 3.85, z: -3.3, hw: 0.85, hd: 0.35 });
  if (spec.kind === 'atelier') colliders.push({ x: 3.55, z: 3.0, r: 0.6, cercle: true });
  if (spec.kind === 'mobile') colliders.push({ x: 3.35, z: 3.0, hw: 0.75, hd: 0.35 });
  if (spec.kind === 'comptoir') colliders.push({ x: 2.9, z: 3.45, hw: 1.05, hd: 0.36 });
  if (spec.kind === 'bastion') {
    colliders.push({ x: 4.3, z: -3.05, r: 0.55, cercle: true });
    colliders.push({ x: 4.6, z: 5.75, r: 0.95, cercle: true });
  }
  if (spec.kind === 'vigie') colliders.push({ x: 7.2, z: -2.9, r: 1.0, cercle: true });
  if (spec.kind === 'bureau') {
    colliders.push({ x: 3.55, z: 3.2, hw: 1.0, hd: 0.5 });
    colliders.push({ x: 3.55, z: 2.05, r: 0.55, cercle: true });
  }
  if (spec.kind !== 'forge' && spec.kind !== 'bastion') colliders.push({ x: 4.35, z: -3.28, r: 0.45, cercle: true });
  if (index % 3 === 0) colliders.push({ x: -4.72, z: 2.45, r: 0.28, cercle: true });
  if (['atelier', 'mobile', 'vigie', 'bureau'].includes(spec.kind)) {
    colliders.push({ x: 4.62, z: 0.88, r: 0.5, cercle: true });
  }

  const porte = porteDouble(g, { z: D / 2 - 0.15, largeur: 2.56, hauteur: 2.08, sol: SOL });
  colliders.push(porte.collider);

  const zone = zoneClic(g, W + 2, D + 2, spec.id);

  const ancreLieu = new THREE.Object3D();
  ancreLieu.position.set(0, 3.65, 0);
  g.add(ancreLieu);

  ile.add(g);
  return {
    spec,
    groupe: g,
    agents,
    figurants,
    ancreLieu,
    zone,
    colliders,
    portes: [porte],
    bati: {
      demiW: W / 2,
      demiD: D / 2,
      sol: SOL,
      dalle: { type: 'boite', demiW: (W + 1.1) / 2, demiD: (D + 1.1) / 2, y: 0.34 },
    },
  };
}

export function construirePoles(ile, modeles) {
  return POLES.map((spec, index) => pavillon(spec, index, modeles, ile));
}

export function construireDirection(ile, modeles) {
  const g = new THREE.Group();
  const Wc = 14.2;
  const Dc = 10.4;
  const Hc = 2.8;
  const sol = 0.32;

  const dalle = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.9, 0.3, 40), mat(C.dalle, { roughness: 0.94 }));
  dalle.position.y = 0.15;
  dalle.receiveShadow = true;
  dalle.castShadow = true;
  g.add(dalle);

  g.add(planTexture(Wc, Dc, 0xe6d3b4, texturePlancher(), 0, sol, 0, { roughness: 0.9 }));

  g.add(box(Wc, 0.9, 0.3, C.mur, 0, 0.75, -Dc / 2));
  const verreFond = box(Wc - 0.6, 1.9, 0.1, C.verre, 0, 2.15, -Dc / 2, {
    transparent: true,
    opacity: 0.26,
    roughness: 0.15,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  verreFond.castShadow = false;
  g.add(verreFond);

  for (const cote of [-1, 1]) {
    g.add(box(0.3, 0.9, Dc, C.mur, cote * (Wc / 2), 0.75, 0));
    const v = box(0.1, 1.9, Dc - 0.5, C.verre, cote * (Wc / 2), 2.15, 0, {
      transparent: true,
      opacity: 0.26,
      roughness: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    v.castShadow = false;
    g.add(v);
    for (const mz of [-Dc / 3, 0, Dc / 3]) {
      g.add(box(0.14, 2.7, 0.1, C.mur, cote * (Wc / 2), 1.6, mz));
    }
  }
  for (const mx of [-Wc / 3, 0, Wc / 3]) {
    g.add(box(0.1, 2.7, 0.14, C.mur, mx, 1.6, -Dc / 2));
  }
  for (const cote of [-1, 1]) {
    g.add(box((Wc - 3.4) / 2, 0.9, 0.3, C.mur, cote * (Wc / 4 + 0.85), 0.75, Dc / 2));
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(box(0.36, Hc, 0.36, C.mur, sx * (Wc / 2 - 0.18), Hc / 2 + 0.3, sz * (Dc / 2 - 0.18)));
    }
  }
  g.add(box(Wc, 0.32, 0.36, C.mur, 0, Hc + 0.14, Dc / 2 - 0.18));

  // Table de réunion
  poser(modeles, 'tableRonde', g, 0, sol, 0.55, 0);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TAU;
    const cx = Math.cos(ang) * 2.15;
    const cz = Math.sin(ang) * 1.35 + 0.55;
    poser(modeles, 'chaise', g, cx, sol, cz, Math.atan2(-cx, -(cz - 0.55)) + PI);
  }

  g.add(box(2.0, 1.0, 0.08, 0x444b50, -3.1, 1.75, -Dc / 2 + 0.3, { roughness: 0.5 }));
  g.add(box(1.85, 0.85, 0.02, 0xe3eef0, -3.1, 1.75, -Dc / 2 + 0.35));
  g.add(box(1.6, 0.9, 0.08, 0x444b50, 2.8, 1.8, -Dc / 2 + 0.3, { roughness: 0.5 }));
  g.add(box(1.45, 0.75, 0.02, 0xe3eef0, 2.8, 1.8, -Dc / 2 + 0.35));

  poser(modeles, 'planteHaute', g, -Wc / 2 + 0.8, sol, Dc / 2 - 0.9, 0.5);
  poser(modeles, 'planteHaute', g, Wc / 2 - 0.8, sol, Dc / 2 - 0.9, -0.5);
  poser(modeles, 'plantePot', g, -Wc / 2 + 0.8, sol, -Dc / 2 + 0.9, 0.2);

  // Bureau du DG, au fond
  poser(modeles, 'bureauAngle', g, 0, sol, -3.75, 0);
  poser(modeles, 'fauteuil', g, 0, sol, -2.95, 0);
  const { groupe, ancre, bras, jambes } = agentProcedural(g, 0, -2.95, PI, true, 3, sol);

  decorerQG(g, modeles, { Wc, Dc, Hc, sol });

  const colliders = [
    { x: 0, z: -Dc / 2, hw: Wc / 2 + 0.1, hd: 0.2 },
    { x: -Wc / 2, z: 0, hw: 0.2, hd: Dc / 2 + 0.1 },
    { x: Wc / 2, z: 0, hw: 0.2, hd: Dc / 2 + 0.1 },
    { x: -4.4, z: Dc / 2, hw: 2.75, hd: 0.2 },
    { x: 4.4, z: Dc / 2, hw: 2.75, hd: 0.2 },
    { x: 0, z: 0.55, r: 1.42, cercle: true },
    { x: 0, z: -3.75, hw: 1.0, hd: 0.6 },
    { x: 0, z: -2.95, r: 0.42, cercle: true },
    { x: -5.85, z: -4.55, hw: 0.8, hd: 0.35 },
    { x: 5.85, z: -4.55, hw: 0.8, hd: 0.35 },
    { x: -6.3, z: 4.3, r: 0.32, cercle: true },
    { x: 6.3, z: 4.3, r: 0.32, cercle: true },
    { x: -6.3, z: -4.3, r: 0.3, cercle: true },
    { x: 6.35, z: 1.3, r: 0.5, cercle: true },
    { x: -6.2, z: 2.9, r: 0.28, cercle: true },
    { x: -5.7, z: 3.75, r: 0.5, cercle: true },
    { x: 1.15, z: -3.35, r: 0.25, cercle: true },
  ];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TAU;
    colliders.push({ x: Math.cos(ang) * 2.15, z: Math.sin(ang) * 1.35 + 0.55, r: 0.27, cercle: true });
  }

  const porte = porteDouble(g, { z: Dc / 2, largeur: 3.3, hauteur: 2.2, sol });
  colliders.push(porte.collider);

  const zone = zoneClic(g, Wc + 2, Dc + 2, 'direction');

  const ancreLieu = new THREE.Object3D();
  ancreLieu.position.set(0, 3.8, 0);
  g.add(ancreLieu);

  ile.add(g);

  return {
    spec: DIRECTION,
    groupe: g,
    ancreLieu,
    zone,
    colliders,
    portes: [porte],
    bati: {
      demiW: Wc / 2,
      demiD: Dc / 2,
      sol,
      dalle: { type: 'cercle', r: 8.9, y: 0.3 },
    },
    agents: [
      {
        nom: 'LePrince Dziedjom',
        poste: 'Directeur Général',
        etat: 'travail',
        poleId: 'direction',
        lieu: 'LePrince WorkLand',
        accent: '#b08145',
        objet: groupe,
        ancre,
        bras,
        jambes,
        index: 3,
        sol,
      },
    ],
  };
}

export function construireAtelierOutils(ile, modeles) {
  const g = new THREE.Group();
  const a = (ATELIER_OUTILS.angle * PI) / 180;
  g.position.set(Math.cos(a) * ATELIER_OUTILS.rayon, 0, Math.sin(a) * ATELIER_OUTILS.rayon);
  g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));

  const w = 6.4;
  const d = 4.6;
  const h = 2.3;
  g.add(box(w + 0.8, 0.28, d + 0.8, C.dalle, 0, 0.14, 0, { roughness: 0.95 }));
  g.add(planTexture(w - 0.5, d - 0.5, 0xe2d6c1, texturePlancher(), 0, 0.29, 0, { roughness: 0.96 }));
  g.add(box(w, h, 0.28, C.mur, 0, 0.28 + h / 2, -d / 2 + 0.14));
  for (const cote of [-1, 1]) {
    g.add(box(0.28, 1.0, d, C.mur, cote * (w / 2 - 0.14), 0.78, 0));
  }
  g.add(box(w - 3.0, 1.0, 0.28, C.mur, -(w / 2 - (w - 3.0) / 4), 0.78, d / 2 - 0.14));
  for (const sx of [-1, 1]) {
    g.add(box(0.3, h, 0.3, C.mur, sx * (w / 2 - 0.15), 0.28 + h / 2, -d / 2 + 0.15));
  }

  const etabli = new THREE.Group();
  etabli.position.set(0.2, 0.28, -1.15);
  etabli.add(box(3.4, 0.1, 0.9, C.bois, 0, 0.85, 0));
  for (const sx of [-1, 1]) {
    etabli.add(box(0.12, 0.85, 0.8, C.boisFonce, sx * 1.55, 0.42, 0));
  }
  g.add(etabli);

  poser(modeles, 'imprimante', g, 1.2, 1.19, -1.15, 0);
  poser(modeles, 'caisse', g, -2.1, 0.28, 1.05, 0.2);
  poser(modeles, 'caisse', g, -2.08, 0.83, 1.02, 0.55);
  poser(modeles, 'caisse', g, -1.45, 0.28, 1.35, -0.3);
  poser(modeles, 'plantePot', g, 2.4, 0.28, 1.2, 0);

  decorerAtelier(g, modeles);

  const colliders = [
    { x: 0, z: -d / 2 + 0.14, hw: w / 2, hd: 0.16 },
    { x: -(w / 2 - 0.14), z: 0, hw: 0.16, hd: d / 2 },
    { x: w / 2 - 0.14, z: 0, hw: 0.16, hd: d / 2 },
    { x: -2.35, z: d / 2 - 0.14, hw: 1.7, hd: 0.16 },
    { x: 0.2, z: -1.15, hw: 1.7, hd: 0.46 },
    { x: -2.72, z: 0.85, hw: 0.62, hd: 0.28, rot: PI / 2 },
    { x: -1.9, z: 1.15, r: 0.75, cercle: true },
    { x: -2.5, z: 2.0, r: 0.5, cercle: true },
    { x: 2.05, z: 1.55, r: 0.45, cercle: true },
    { x: 1.7, z: 1.85, r: 0.28, cercle: true },
    { x: 2.55, z: 1.9, r: 0.28, cercle: true },
    { x: 2.4, z: 1.2, r: 0.3, cercle: true },
    { x: -1.24, z: -1.9, hw: 0.7, hd: 0.12 },
  ];

  const porte = porteDouble(g, {
    centreX: 1.15,
    z: d / 2 - 0.14,
    largeur: 3.6,
    hauteur: 2.05,
    sol: 0.29,
  });
  colliders.push(porte.collider);

  const zone = zoneClic(g, w + 2, d + 2, 'atelier');

  ile.add(g);

  const ancreLieu = new THREE.Object3D();
  ancreLieu.position.set(0, 3.2, 0);
  g.add(ancreLieu);

  return {
    groupe: g,
    ancreLieu,
    zone,
    colliders,
    portes: [porte],
    bati: {
      demiW: w / 2,
      demiD: d / 2,
      sol: 0.29,
      dalle: { type: 'boite', demiW: (w + 0.8) / 2, demiD: (d + 0.8) / 2, y: 0.28 },
    },
  };
}

export function construireSanner(bastion) {
  const sanner = new THREE.Group();
  sanner.position.set(4.6, 0, 5.75);
  sanner.rotation.y = 0.32;
  sanner.scale.setScalar(1.12);
  sanner.add(cyl(0.72, 0.84, 0.3, C.pierre, 0, 0.15, 0, 12, { roughness: 0.9 }));
  sanner.add(cyl(0.5, 0.62, 1.2, 0xa98455, 0, 0.9, 0, 10, { roughness: 0.55, metalness: 0.25 }));
  sanner.add(box(0.6, 0.38, 0.4, 0x9a774c, 0, 1.55, 0, { roughness: 0.55, metalness: 0.25 }));
  const tete = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 14, 10),
    mat(0xb39266, { roughness: 0.45, metalness: 0.3 })
  );
  tete.position.y = 1.94;
  tete.castShadow = true;
  sanner.add(tete);
  sanner.add(box(0.4, 0.06, 0.06, 0xf0e6cc, 0, 1.97, 0.22));
  const bouclier = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.64, 0.14, 6),
    mat(0xe4d7b8, { roughness: 0.55 })
  );
  bouclier.rotation.z = PI / 2;
  bouclier.position.set(-0.7, 1.3, 0.3);
  bouclier.castShadow = true;
  sanner.add(bouclier);
  sanner.add(box(0.06, 0.52, 0.03, 0x8c6f4e, -0.7, 1.3, 0.38));
  sanner.add(box(0.34, 0.06, 0.03, 0x8c6f4e, -0.7, 1.3, 0.38));
  bastion.add(sanner);
}
