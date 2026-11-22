import * as THREE from 'three';
import {
  PI, TAU, C, mat, box, cyl, plan, planTexture, disqueTexture, graine, teinterFacettes,
  textureHerbe, texturePierre, texturePlancher,
} from './core.js';
import { poser } from './models.js';
import { RAYON_ILE, RAYON_POLES, POLES, TERRASSE, ATELIER_OUTILS } from './data.js';

export function construireIle(scene, modeles) {
  const alea = graine(20261121);
  const ile = new THREE.Group();
  scene.add(ile);
  const colliders = [];

  const bord = cyl(RAYON_ILE + 0.4, RAYON_ILE, 2.4, C.sable, 0, -1.2, 0, 56, { flatShading: true });
  bord.receiveShadow = true;
  ile.add(bord);

  const herbe = new THREE.Mesh(
    new THREE.CircleGeometry(RAYON_ILE, 64),
    new THREE.MeshStandardMaterial({ map: textureHerbe(), roughness: 0.95, color: 0xffffff })
  );
  herbe.rotation.x = -PI / 2;
  herbe.position.y = 0.02;
  herbe.receiveShadow = true;
  ile.add(herbe);

  const niveaux = [
    { y: -2.3, r: 34.6 },
    { y: -4.6, r: 33.4 },
    { y: -7.0, r: 29.6 },
    { y: -9.6, r: 23.4 },
    { y: -12.2, r: 15.4 },
    { y: -14.8, r: 7.4 },
  ];
  const roches = [0xc9a97d, 0xb38e64, 0x9b774f, 0xa9855c];
  for (let i = 0; i < niveaux.length - 1; i++) {
    const a = niveaux[i];
    const b = niveaux[i + 1];
    const geo = teinterFacettes(
      new THREE.CylinderGeometry(a.r, b.r, a.y - b.y, 14, 1, false),
      roches[i % roches.length],
      0.16,
      40 + i
    );
    const m = new THREE.Mesh(
      geo,
      mat(0xffffff, { vertexColors: true, flatShading: true, roughness: 0.95 })
    );
    m.position.y = (a.y + b.y) / 2;
    m.rotation.y = i * 0.13;
    m.castShadow = true;
    m.receiveShadow = true;
    ile.add(m);
  }
  const pointe = new THREE.Mesh(
    teinterFacettes(new THREE.ConeGeometry(7.2, 6.5, 14), 0x8f6d48, 0.18, 77),
    mat(0xffffff, { vertexColors: true, flatShading: true, roughness: 0.95 })
  );
  pointe.position.y = -18;
  pointe.rotation.y = 0.4;
  pointe.castShadow = true;
  ile.add(pointe);

  for (let i = 0; i < 9; i++) {
    const a = alea() * TAU;
    const r = 8 + alea() * 20;
    const roche = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7 + alea() * 1.6, 0),
      mat(roches[Math.floor(alea() * roches.length)], { flatShading: true })
    );
    roche.position.set(Math.cos(a) * r, -11 - alea() * 6, Math.sin(a) * r);
    roche.rotation.set(alea() * PI, alea() * PI, alea() * PI);
    roche.castShadow = true;
    ile.add(roche);
  }

  const place = disqueTexture(11.2, 64, C.pierreClair, texturePierre(), 0, 0.05, 0, { roughness: 0.9 });
  ile.add(place);

  const anneau = new THREE.Mesh(new THREE.RingGeometry(13.3, 15.3, 72), mat(C.pierre, { roughness: 0.92 }));
  anneau.rotation.x = -PI / 2;
  anneau.position.y = 0.045;
  anneau.receiveShadow = true;
  ile.add(anneau);

  const medaillon = disqueTexture(3.6, 40, C.boisClair, texturePlancher(), 0, 0.07, 0, { roughness: 0.85 });
  ile.add(medaillon);

  const couronne = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.09, 6, 60), mat(C.boisFonce, { roughness: 0.8 }));
  couronne.rotation.x = -PI / 2;
  couronne.position.y = 0.09;
  ile.add(couronne);

  for (const p of POLES) {
    const a = (p.angle * PI) / 180;
    const allee = planTexture(1.5, 6.4, C.pierre, texturePierre(), 0, 0.055, 0, { roughness: 0.92 });
    allee.position.set(Math.cos(a) * 13.9, 0.055, Math.sin(a) * 13.9);
    allee.rotation.z = -a;
    ile.add(allee);
  }

  const jardin = new THREE.Group();
  jardin.position.set(Math.cos((295 * PI) / 180) * 22.5, 0, Math.sin((295 * PI) / 180) * 22.5);
  const cercleJardin = new THREE.Mesh(
    new THREE.TorusGeometry(3.0, 0.24, 6, 40),
    mat(C.pierreSombre, { flatShading: true })
  );
  cercleJardin.rotation.x = -PI / 2;
  cercleJardin.position.y = 0.12;
  jardin.add(cercleJardin);
  const buis = [0x6f9451, 0x7fa65c, 0x5f8347];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const bu = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3 + alea() * 0.2, 0),
      mat(buis[i % 3], { flatShading: true })
    );
    bu.position.set(Math.cos(a) * 1.65, 0.35, Math.sin(a) * 1.65);
    bu.castShadow = true;
    jardin.add(bu);
  }
  ile.add(jardin);

  // Terrasse extérieure, au sud
  const terrasse = new THREE.Group();
  terrasse.position.set(TERRASSE.x, 0, TERRASSE.z);
  const solTerrasse = cyl(4.5, 4.6, 0.2, C.pierreClair, 0, 0.1, 0, 36, { roughness: 0.93 });
  solTerrasse.receiveShadow = true;
  terrasse.add(solTerrasse);
  const bordure = new THREE.Mesh(
    new THREE.TorusGeometry(4.5, 0.18, 6, 44),
    mat(C.pierreSombre, { flatShading: true })
  );
  bordure.rotation.x = -PI / 2;
  bordure.position.y = 0.2;
  terrasse.add(bordure);

  const chaiseTerrasse = (x, z, rot) => {
    const g = new THREE.Group();
    g.position.set(x, 0.2, z);
    g.rotation.y = rot;
    g.add(box(0.5, 0.08, 0.5, C.tissu, 0, 0.52, 0));
    g.add(box(0.5, 0.55, 0.08, C.tissu, 0, 0.82, -0.22));
    g.add(cyl(0.05, 0.05, 0.5, C.metal, 0, 0.26, 0, 8));
    g.add(box(0.5, 0.04, 0.5, C.metal, 0, 0.05, 0));
    terrasse.add(g);
  };

  const coins = [
    { x: -1.9, z: -0.7, parasol: true },
    { x: 1.6, z: -1.5, parasol: true },
    { x: 1.1, z: 1.8, parasol: false },
  ];
  for (const c of coins) {
    const table = new THREE.Group();
    table.position.set(c.x, 0.2, c.z);
    table.add(cyl(0.68, 0.68, 0.07, C.bois, 0, 0.72, 0, 24));
    table.add(cyl(0.07, 0.09, 0.7, C.boisFonce, 0, 0.36, 0, 8));
    table.add(cyl(0.32, 0.38, 0.06, C.boisFonce, 0, 0.03, 0, 16));
    table.add(cyl(0.05, 0.045, 0.09, C.terracotta, 0.2, 0.8, 0.1, 8));
    terrasse.add(table);

    chaiseTerrasse(c.x - 1.05, c.z + 0.15, PI / 2 + 0.2);
    chaiseTerrasse(c.x + 1.05, c.z - 0.15, -PI / 2 + 0.2);

    colliders.push({ x: TERRASSE.x + c.x, z: TERRASSE.z + c.z, r: 0.72, cercle: true });
    colliders.push({ x: TERRASSE.x + c.x - 1.05, z: TERRASSE.z + c.z + 0.15, r: 0.3, cercle: true });
    colliders.push({ x: TERRASSE.x + c.x + 1.05, z: TERRASSE.z + c.z - 0.15, r: 0.3, cercle: true });

    if (c.parasol) {
      const pied = new THREE.Group();
      pied.position.set(c.x, 0.2, c.z);
      pied.add(cyl(0.055, 0.055, 2.35, C.boisFonce, 0, 1.17, 0, 8));
      const voile = new THREE.Mesh(
        new THREE.ConeGeometry(1.75, 0.42, 8),
        mat(0xf2e6cf, { flatShading: true })
      );
      voile.position.y = 2.25;
      voile.castShadow = true;
      pied.add(voile);
      pied.add(cyl(0.07, 0.07, 0.12, C.terracotta, 0, 2.5, 0, 8));
      terrasse.add(pied);
    }
  }

  for (let i = 0; i < 4; i++) {
    const a = PI / 4 + i * (PI / 2);
    const bac = new THREE.Group();
    bac.position.set(Math.cos(a) * 3.7, 0, Math.sin(a) * 3.7);
    bac.rotation.y = -a + PI / 2;
    bac.add(box(1.4, 0.42, 0.5, C.boisFonce, 0, 0.21, 0));
    bac.add(box(1.3, 0.3, 0.4, 0x5f8347, 0, 0.48, 0, { flatShading: true }));
    bac.add(box(0.2, 0.16, 0.2, 0xe0b96a, -0.35, 0.66, 0));
    terrasse.add(bac);
    colliders.push({
      x: TERRASSE.x + Math.cos(a) * 3.7,
      z: TERRASSE.z + Math.sin(a) * 3.7,
      r: 0.5,
      cercle: true,
    });
  }
  ile.add(terrasse);

  const alleeTerrasse = plan(1.8, 7.0, C.pierre, 0, 0.05, 0);
  alleeTerrasse.position.set(0, 0.05, 19.0);
  alleeTerrasse.rotation.z = -PI / 2;
  ile.add(alleeTerrasse);

  // Végétation
  const exclusions = [];
  for (const p of POLES) {
    const a = (p.angle * PI) / 180;
    exclusions.push({ x: Math.cos(a) * RAYON_POLES, z: Math.sin(a) * RAYON_POLES, r: 9.2 });
  }
  exclusions.push({ x: 0, z: 0, r: 13.5 });
  exclusions.push({ x: jardin.position.x, z: jardin.position.z, r: 5.2 });
  exclusions.push({ x: TERRASSE.x, z: TERRASSE.z, r: 6.4 });
  exclusions.push({
    x: Math.cos((ATELIER_OUTILS.angle * PI) / 180) * ATELIER_OUTILS.rayon,
    z: Math.sin((ATELIER_OUTILS.angle * PI) / 180) * ATELIER_OUTILS.rayon,
    r: 5.5,
  });

  const placeLibre = (x, z, r) => {
    if (Math.hypot(x, z) > RAYON_ILE - 3.5) return false;
    for (const e of exclusions) {
      if (Math.hypot(x - e.x, z - e.z) < e.r + r) return false;
    }
    return true;
  };

  const matsFeuilles = [0x6f9451, 0x7fa65c, 0x5f8347, 0x89ad63];
  const geoFeuille = new THREE.IcosahedronGeometry(1, 0);
  const geoFeuille2 = new THREE.IcosahedronGeometry(0.7, 0);
  const geoFeuille3 = new THREE.IcosahedronGeometry(0.5, 0);
  const geoFeuille4 = new THREE.IcosahedronGeometry(0.36, 0);

  const arbre = (x, z, echelle = 1) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.add(cyl(0.14 * echelle, 0.2 * echelle, 1.15 * echelle, C.boisFonce, 0, 0.57 * echelle, 0, 7));
    const f1 = new THREE.Mesh(
      geoFeuille,
      mat(matsFeuilles[Math.floor(alea() * matsFeuilles.length)], { flatShading: true })
    );
    f1.scale.setScalar(1.15 * echelle);
    f1.position.y = 1.55 * echelle;
    f1.castShadow = true;
    g.add(f1);
    const f2 = new THREE.Mesh(
      geoFeuille2,
      mat(matsFeuilles[Math.floor(alea() * matsFeuilles.length)], { flatShading: true })
    );
    f2.scale.setScalar(1.15 * echelle);
    f2.position.set(0.35 * echelle, 1.95 * echelle, 0.2 * echelle);
    f2.castShadow = true;
    g.add(f2);
    const f3 = new THREE.Mesh(
      geoFeuille3,
      mat(matsFeuilles[Math.floor(alea() * matsFeuilles.length)], { flatShading: true })
    );
    f3.scale.setScalar(1.15 * echelle);
    f3.position.set(-0.3 * echelle, 2.0 * echelle, -0.15 * echelle);
    f3.castShadow = true;
    g.add(f3);
    g.rotation.y = alea() * TAU;
    colliders.push({ x, z, r: 0.26 * echelle + 0.08, cercle: true });
    ile.add(g);
  };

  const buisson = (x, z, echelle = 1) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const b = new THREE.Mesh(
      geoFeuille4,
      mat(matsFeuilles[Math.floor(alea() * matsFeuilles.length)], { flatShading: true })
    );
    b.scale.setScalar(1.6 * echelle);
    b.position.y = 0.45 * echelle;
    b.castShadow = true;
    g.add(b);
    const b2 = new THREE.Mesh(geoFeuille4, mat(0x86a862, { flatShading: true }));
    b2.scale.setScalar(1.1 * echelle);
    b2.position.set(0.5 * echelle, 0.32 * echelle, 0.2 * echelle);
    b2.castShadow = true;
    g.add(b2);
    colliders.push({ x, z, r: 0.38 * echelle, cercle: true });
    ile.add(g);
  };

  let arbresPoses = 0;
  let essais = 0;
  while (arbresPoses < 52 && essais < 600) {
    essais++;
    const a = alea() * TAU;
    const r = 17 + alea() * 17;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!placeLibre(x, z, 1.6)) continue;
    arbre(x, z, 0.85 + alea() * 0.7 + (r > 27 ? 0.15 : 0));
    arbresPoses++;
  }

  for (let i = 0; i < 22; i++) {
    const a = alea() * TAU;
    const r = 16.2 + alea() * 3.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!placeLibre(x, z, 0.8)) continue;
    if (alea() > 0.55) arbre(x, z, 0.7 + alea() * 0.3);
    else buisson(x, z, 0.7 + alea() * 0.5);
  }

  // Bancs autour de la place
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const x = Math.cos(a) * 11.9;
    const z = Math.sin(a) * 11.9;
    poser(modeles, 'banc', ile, x, 0.05, z, -a + PI / 2);
    colliders.push({ x, z, hw: 0.92, hd: 0.32, rot: -a + PI / 2 });
  }

  const fleurs = [0xd98d64, 0xe0b96a, 0xc4705a, 0xe9d08f];
  for (let i = 0; i < 16; i++) {
    const a = alea() * TAU;
    const r = 12.4 + alea() * 1.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const massif = new THREE.Group();
    massif.position.set(x, 0, z);
    massif.add(cyl(0.55, 0.6, 0.22, 0xb8a277, 0, 0.11, 0, 10));
    for (let j = 0; j < 5; j++) {
      const f = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.08 + alea() * 0.05, 0),
        mat(fleurs[Math.floor(alea() * fleurs.length)])
      );
      f.position.set((alea() - 0.5) * 0.8, 0.26 + alea() * 0.08, (alea() - 0.5) * 0.8);
      massif.add(f);
    }
    ile.add(massif);
    colliders.push({ x, z, r: 0.62, cercle: true });
  }

  return { ile, place, colliders };
}
