import * as THREE from 'three';
import { PI, TAU, mat } from './core.js';
import { materiauSurface, projeterUV, tuileSurface } from './rendu.js';
import { RAYON_ILE } from './data.js';

// Le « sol » du QG : une grande dalle de bureau en béton clair, bordée d'une
// façade vitrée, en pleine ville. Les pôles (pavillons vitrés) sont posés dessus.
export function construireIle(scene, modeles) {
  const ile = new THREE.Group();
  scene.add(ile);
  const colliders = [];

  // Sol : dallage pierre à joints, tuilé à l'échelle réelle
  const geoDisc = projeterUV(new THREE.CircleGeometry(RAYON_ILE, 96), tuileSurface('pierre'));
  const sol = new THREE.Mesh(geoDisc, materiauSurface('pierre', 0xe8e1d2, { roughness: 0.92 }));
  sol.rotation.x = -PI / 2;
  sol.position.y = 0.02;
  sol.receiveShadow = true;
  ile.add(sol);

  // Jupe du podium : 2,5 m de béton qui donnent une vraie épaisseur à la dalle,
  // avec un bandeau saillant et un socle plus sombre.
  const jupe = new THREE.Mesh(
    projeterUV(
      new THREE.CylinderGeometry(RAYON_ILE + 0.12, RAYON_ILE - 0.35, 2.6, 96, 1, true),
      tuileSurface('beton')
    ),
    materiauSurface('beton', 0xc7bfae, { roughness: 0.95 })
  );
  jupe.position.y = -1.25;
  jupe.receiveShadow = true;
  ile.add(jupe);

  const bandeau = new THREE.Mesh(
    new THREE.CylinderGeometry(RAYON_ILE + 0.28, RAYON_ILE + 0.28, 0.26, 96, 1, true),
    materiauSurface('beton', 0xd6cfc0, { roughness: 0.92 })
  );
  bandeau.position.y = -0.16;
  bandeau.receiveShadow = true;
  ile.add(bandeau);

  const socle = new THREE.Mesh(
    new THREE.CylinderGeometry(RAYON_ILE - 0.16, RAYON_ILE - 0.42, 0.55, 96, 1, true),
    mat(0xa8a193, { roughness: 0.96 })
  );
  socle.position.y = -2.3;
  ile.add(socle);

  // Une ouverture au sud (+z) laisse passer le parvis du Siège.
  const trou = 0.32;
  const arc = { thetaStart: trou, thetaLength: TAU - trou * 2 };
  const geoMuret = projeterUV(
    new THREE.CylinderGeometry(RAYON_ILE + 0.2, RAYON_ILE + 0.2, 0.9, 80, 1, true, arc.thetaStart, arc.thetaLength),
    tuileSurface('beton')
  );
  const muret = new THREE.Mesh(geoMuret, materiauSurface('beton', 0xd8d2c6, { roughness: 0.92 }));
  muret.position.y = 0.45;
  muret.receiveShadow = true;
  ile.add(muret);

  const vitrage = new THREE.Mesh(
    new THREE.CylinderGeometry(RAYON_ILE + 0.2, RAYON_ILE + 0.2, 1.6, 80, 1, true, arc.thetaStart, arc.thetaLength),
    new THREE.MeshStandardMaterial({
      color: 0xc7d8e2,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  vitrage.position.y = 1.7;
  ile.add(vitrage);

  const rail = new THREE.Mesh(
    new THREE.CylinderGeometry(RAYON_ILE + 0.2, RAYON_ILE + 0.2, 0.14, 80, 1, true, arc.thetaStart, arc.thetaLength),
    mat(0x6a7075, { roughness: 0.6, metalness: 0.4 })
  );
  rail.position.y = 2.55;
  ile.add(rail);

  // Montants de la balustrade : le verre se lit enfin comme un garde-corps.
  const geoMontant = new THREE.BoxGeometry(0.07, 1.72, 0.07);
  const matMontant = mat(0x8b9297, { metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < 44; i++) {
    const th = trou + ((TAU - trou * 2) * i) / 43;
    const montant = new THREE.Mesh(geoMontant, matMontant);
    montant.position.set(Math.sin(th) * (RAYON_ILE + 0.2), 1.78, Math.cos(th) * (RAYON_ILE + 0.2));
    ile.add(montant);
  }

  // Place centrale, pelouses et allées : voir campus.js
  return { ile, colliders };
}
