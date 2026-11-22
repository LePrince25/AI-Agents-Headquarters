import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CATALOGUE = {
  bureau: { fichier: 'desk.glb', largeur: 1.5 },
  bureauAngle: { fichier: 'desk-angle.glb', largeur: 1.52 },
  chaise: { fichier: 'chaise-bureau.glb', hauteur: 0.85 },
  fauteuil: { fichier: 'fauteuil-bureau.glb', hauteur: 1.12 },
  plantePot: { fichier: 'plante-pot.glb', hauteur: 0.64 },
  planteHaute: { fichier: 'plante-haute.glb', hauteur: 1.05 },
  bibliotheque: { fichier: 'bibliotheque.glb', hauteur: 1.75 },
  canape: { fichier: 'canape.glb', largeur: 1.95 },
  tableRonde: { fichier: 'table-ronde.glb', largeur: 2.8 },
  tableBasse: { fichier: 'table-basse.glb', largeur: 1.1 },
  ecran: { fichier: 'ecran.glb', largeur: 0.56 },
  portable: { fichier: 'portable.glb', largeur: 0.36 },
  tapis: { fichier: 'tapis.glb', largeur: 4.6 },
  lampadaire: { fichier: 'lampadaire.glb', hauteur: 1.55 },
  machineCafe: { fichier: 'machine-cafe.glb', hauteur: 0.36 },
  coffreFort: { fichier: 'coffre-fort.glb', hauteur: 0.55 },
  chevalet: { fichier: 'chevalet.glb', hauteur: 1.7 },
  caisse: { fichier: 'caisse.glb', hauteur: 0.55 },
  banc: { fichier: 'banc.glb', largeur: 1.8 },
  television: { fichier: 'television.glb', largeur: 1.15 },
  tableauLiege: { fichier: 'tableau-liège.glb', largeur: 1.15 },
  imprimante: { fichier: 'imprimante.glb', largeur: 0.5 },
  tasse: { fichier: 'tasse.glb', hauteur: 0.1 },
};

function normaliser(scene, cible) {
  const boite = new THREE.Box3().setFromObject(scene);
  const taille = boite.getSize(new THREE.Vector3());
  let echelle = 1;
  if (cible.largeur) echelle = cible.largeur / Math.max(taille.x, 0.0001);
  else if (cible.hauteur) echelle = cible.hauteur / Math.max(taille.y, 0.0001);

  scene.scale.setScalar(echelle);
  scene.updateMatrixWorld(true);

  const b2 = new THREE.Box3().setFromObject(scene);
  const centre = b2.getCenter(new THREE.Vector3());
  scene.position.x -= centre.x;
  scene.position.z -= centre.z;
  scene.position.y -= b2.min.y;

  const groupe = new THREE.Group();
  groupe.add(scene);
  groupe.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material) o.material.side = THREE.FrontSide;
    }
  });
  return groupe;
}

export async function chargerModeles(base, onProgress) {
  const chargeur = new GLTFLoader();
  const noms = Object.keys(CATALOGUE);
  let faits = 0;
  const modeles = {};

  await Promise.all(
    noms.map(
      (nom) =>
        new Promise((resolve, reject) => {
          chargeur.load(
            `${base}/${CATALOGUE[nom].fichier}`,
            (gltf) => {
              modeles[nom] = normaliser(gltf.scene, CATALOGUE[nom]);
              faits++;
              if (onProgress) onProgress(faits, noms.length);
              resolve();
            },
            undefined,
            (err) => reject(err)
          );
        })
    )
  );

  return modeles;
}

export function poser(modeles, nom, parent, x, y, z, rot = 0, echelle = 1) {
  const g = modeles[nom].clone(true);
  g.position.set(x, y, z);
  g.rotation.y = rot;
  if (echelle !== 1) g.scale.multiplyScalar(echelle);
  parent.add(g);
  return g;
}
