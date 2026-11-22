import * as THREE from 'three';
import { C, box, cyl } from './core.js';

export function porteDouble(parent, { centreX = 0, z, largeur, hauteur, sol, teinte = C.boisClair }) {
  const pivots = [];
  const demi = largeur / 2;
  const largeurPanneau = largeur / 2;

  for (const cote of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(centreX + cote * demi, sol, z);
    parent.add(pivot);

    const panneau = new THREE.Group();
    panneau.position.x = -cote * (largeurPanneau / 2);
    pivot.add(panneau);

    panneau.add(box(0.09, hauteur, 0.055, teinte, -largeurPanneau / 2 + 0.045, hauteur / 2, 0, { roughness: 0.6 }));
    panneau.add(box(0.09, hauteur, 0.055, teinte, largeurPanneau / 2 - 0.045, hauteur / 2, 0, { roughness: 0.6 }));
    panneau.add(box(largeurPanneau, 0.1, 0.055, teinte, 0, hauteur - 0.05, 0, { roughness: 0.6 }));
    panneau.add(box(largeurPanneau, 0.22, 0.055, teinte, 0, 0.11, 0, { roughness: 0.6 }));

    const vitre = box(largeurPanneau - 0.16, hauteur - 0.36, 0.016, C.verre, 0, hauteur / 2 + 0.04, 0, {
      transparent: true,
      opacity: 0.34,
      roughness: 0.12,
      metalness: 0,
      depthWrite: false,
    });
    vitre.castShadow = false;
    panneau.add(vitre);

    panneau.add(cyl(0.016, 0.016, 0.28, C.metal, -cote * (largeurPanneau / 2 - 0.11), hauteur * 0.52, 0.05, 8, {
      roughness: 0.35,
      metalness: 0.55,
    }));

    pivots.push({ pivot, cote, angle: 0, cible: 0 });
  }

  const collider = { x: centreX, z, hw: demi, hd: 0.09 };

  return { pivots, collider, x: centreX, z, ouvert: false };
}

export function animerPortes(portes, dt) {
  for (const porte of portes) {
    for (const p of porte.pivots) {
      p.angle += (p.cible - p.angle) * Math.min(1, dt * 7);
      p.pivot.rotation.y = p.angle;
    }
  }
}

export const PORTE_OUVERTE = 1.78;
