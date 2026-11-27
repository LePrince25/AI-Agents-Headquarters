import * as THREE from 'three';
import {
  PI,
  TAU,
  mat,
  box,
  cyl,
  planTexture,
  texturePlancher,
  textureHerbe,
  texturePierre,
  toile,
  graine,
} from './core.js';
import { poser } from './models.js';
import { porteDouble, porteSimple } from './portes.js';
import { agentProcedural } from './agents.js';
import { voiture, moto } from './vehicules.js';
import { SIEGE, POLES, DIRECTION } from './data.js';

// Le Siège : une tour de dix niveaux au sud du parc.
// RDC : accueil, direction, salles, open-space, parvis et parking.
// Étages 1 à 9 : un étage par pôle, avec noyau d'ascenseurs central,
// bureaux nominatifs, salle de réunion, pause et espace collaboratif.
// Toutes les coordonnées internes sont locales au groupe posé en (0, 0, 64).

export const ZONE_SIEGE = { x0: -32, x1: 32, z0: 32.2, z1: 104 };

const SOL = 0.15;
const H = 4.2;
const W = 48;
const D = 28;

// Étages : dalle de 0.25 m, hauteur libre de 3.4 m.
const FH = 3.4;
const DALLE = 0.25;
const ECART = FH + DALLE;
const ETAGES = 9;
const ROOF_Y = SOL + H + DALLE + (ETAGES - 1) * ECART + FH;

export function solEtage(etage) {
  if (!etage) return SOL;
  return SOL + H + DALLE + (etage - 1) * ECART;
}

export const NOYAU = { x: 0, z: -1, demiW: 3.4, demiD: 3.2, porteZ: -4.2 };
const NOYAU_BAS = 0;
const NOYAU_HAUT = ROOF_Y + 0.25;

// ---------------------------------------------------------------------------
// Textures

let cacheTravertin = null;
function textureTravertin() {
  if (cacheTravertin) return cacheTravertin;
  cacheTravertin = toile(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e9dfcc';
    ctx.fillRect(0, 0, w, h);
    const r = graine(4411);
    for (let y = 0; y < h; y += 64) {
      ctx.fillStyle = `rgba(146, 124, 94, ${0.04 + r() * 0.05})`;
      ctx.fillRect(0, y, w, 2);
      for (let i = 0; i < 12; i++) {
        const yy = y + r() * 62;
        ctx.strokeStyle = `rgba(158, 136, 104, ${0.035 + r() * 0.055})`;
        ctx.lineWidth = 0.6 + r() * 1.2;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(w * 0.3, yy + (r() - 0.5) * 7, w * 0.7, yy + (r() - 0.5) * 7, w, yy);
        ctx.stroke();
      }
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(128, 108, 82, ${0.03 + r() * 0.03})`;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 1 + r() * 7, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(120, 100, 76, 0.12)';
    ctx.fillRect(0, 0, w, 1.5);
    ctx.fillRect(0, 0, 1.5, h);
  });
  cacheTravertin.wrapS = cacheTravertin.wrapT = THREE.RepeatWrapping;
  cacheTravertin.repeat.set(4, 4);
  return cacheTravertin;
}

const cacheTapis = new Map();
function textureTapis(hex) {
  if (cacheTapis.has(hex)) return cacheTapis.get(hex);
  const base = '#' + hex.toString(16).padStart(6, '0');
  const t = toile(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const r = graine(hex);
    for (let i = 0; i < 5200; i++) {
      const clair = r() > 0.5;
      ctx.fillStyle = clair ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.055)';
      ctx.fillRect(r() * w, r() * h, 1.4, 1.4);
    }
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.035)';
      ctx.beginPath();
      ctx.moveTo(r() * w, 0);
      ctx.lineTo(r() * w, h);
      ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  cacheTapis.set(hex, t);
  return t;
}

let cacheAsphalte = null;
function textureAsphalte() {
  if (cacheAsphalte) return cacheAsphalte;
  cacheAsphalte = toile(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#303337';
    ctx.fillRect(0, 0, w, h);
    const r = graine(9137);
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(30 + r() * 46);
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 4},${0.25 + r() * 0.4})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = 'rgba(18,19,21,0.25)';
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      ctx.moveTo(r() * w, r() * h);
      ctx.lineTo(r() * w + (r() - 0.5) * 120, r() * h + (r() - 0.5) * 120);
      ctx.stroke();
    }
  });
  cacheAsphalte.wrapS = cacheAsphalte.wrapT = THREE.RepeatWrapping;
  cacheAsphalte.repeat.set(7, 4);
  return cacheAsphalte;
}

let cacheTerrazzo = null;
function textureTerrazzo() {
  if (cacheTerrazzo) return cacheTerrazzo;
  cacheTerrazzo = toile(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#d9d3c7';
    ctx.fillRect(0, 0, w, h);
    const r = graine(772);
    const teintes = ['#b3a897', '#9fa79b', '#c3b6a0', '#8e938c', '#e7e0d2', '#a58d76'];
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = teintes[Math.floor(r() * teintes.length)];
      ctx.globalAlpha = 0.35 + r() * 0.4;
      const s = 1 + r() * 5;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, s, s * (0.4 + r() * 0.8), r() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  cacheTerrazzo.wrapS = cacheTerrazzo.wrapT = THREE.RepeatWrapping;
  cacheTerrazzo.repeat.set(3, 3);
  return cacheTerrazzo;
}

let cacheCarrelage = null;
function textureCarrelage() {
  if (cacheCarrelage) return cacheCarrelage;
  cacheCarrelage = toile(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5f6468';
    ctx.fillRect(0, 0, w, h);
    const r = graine(5541);
    const pas = 128;
    for (let y = 0; y < h; y += pas) {
      for (let x = 0; x < w; x += pas) {
        ctx.fillStyle = `rgba(255,255,255,${0.015 + r() * 0.035})`;
        ctx.fillRect(x + 2, y + 2, pas - 4, pas - 4);
        ctx.strokeStyle = 'rgba(28,30,32,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, pas, pas);
      }
    }
  });
  cacheCarrelage.wrapS = cacheCarrelage.wrapT = THREE.RepeatWrapping;
  cacheCarrelage.repeat.set(3, 3);
  return cacheCarrelage;
}

let cacheMarbre = null;
function textureMarbre() {
  if (cacheMarbre) return cacheMarbre;
  cacheMarbre = toile(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#17181a';
    ctx.fillRect(0, 0, w, h);
    const r = graine(3199);
    for (let i = 0; i < 46; i++) {
      ctx.strokeStyle = `rgba(190,178,154,${0.05 + r() * 0.17})`;
      ctx.lineWidth = 0.7 + r() * 2.4;
      ctx.beginPath();
      let x = r() * w;
      let y = -10;
      ctx.moveTo(x, y);
      while (y < h + 10) {
        x += (r() - 0.5) * 26;
        y += 10 + r() * 22;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(210,196,170,${0.02 + r() * 0.05})`;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 2 + r() * 14, 0, TAU);
      ctx.fill();
    }
  });
  cacheMarbre.wrapS = cacheMarbre.wrapT = THREE.RepeatWrapping;
  cacheMarbre.repeat.set(2, 1);
  return cacheMarbre;
}

// ---------------------------------------------------------------------------
// Matériaux

const MUR = mat(0xf4efe6, { roughness: 0.95 });
const MUR_OMBRE = mat(0xe8e1d4, { roughness: 0.95 });
const PIERRE = mat(0xdfd3be, { roughness: 0.82 });
const PIERRE_CLAIR = mat(0xeee5d3, { roughness: 0.78 });
const NOIR = mat(0x191a1c, { roughness: 0.32, metalness: 0.18 });
const BOIS = mat(0xc08f59, { roughness: 0.55 });
const BOIS_FONCE = mat(0x6f4a2c, { roughness: 0.62 });
const OR = mat(0xc8a15c, { roughness: 0.24, metalness: 0.9 });
const INOX = mat(0xb4b9be, { roughness: 0.24, metalness: 0.86 });
const TISSU = mat(0xd2c6b1, { roughness: 0.98 });
const TISSU_FONCE = mat(0x756f66, { roughness: 0.96 });
const FEUTRE = mat(0xbcb4a7, { roughness: 1 });
const FEUTRINE = mat(0x8f887c, { roughness: 1 });
const BLANC_CASSÉ = mat(0xf6f1e6, { roughness: 0.7 });
const VERRE = new THREE.MeshStandardMaterial({
  color: 0xa9c4cd,
  roughness: 0.05,
  metalness: 0.12,
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
  side: THREE.DoubleSide,
});
// Vitrage de façade : verre miroir bleu nuit. L'opacité laisse deviner les
// stores, la composante métallique renvoie le ciel et la ville.
export const VERRE_EXT = new THREE.MeshStandardMaterial({
  color: 0x2f5266,
  roughness: 0.045,
  metalness: 0.9,
  envMapIntensity: 1.6,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const VITRAGE_NOIR = new THREE.MeshStandardMaterial({
  color: 0x0d1216,
  roughness: 0.08,
  metalness: 0.5,
  transparent: true,
  opacity: 0.86,
});
const LED = mat(0xfff0cf, { emissive: 0xffc98a, emissiveIntensity: 1.7, roughness: 0.4 });
const LED_BLANC = mat(0xf6fbff, { emissive: 0xdfefff, emissiveIntensity: 1.3, roughness: 0.4 });
const EAU = new THREE.MeshStandardMaterial({ color: 0x1b3a40, roughness: 0.04, metalness: 0.55 });

// ---------------------------------------------------------------------------
// Petits helpers

function vitre(g, w, h, d, x, y, z, rotation = 0, exterieur = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), exterieur ? VERRE_EXT : VERRE);
  m.position.set(x, y, z);
  m.rotation.y = rotation;
  m.renderOrder = 2;
  g.add(m);
  return m;
}

function solPiece(g, x0, x1, z0, z1, map, couleur, y = SOL + 0.004, opts = {}) {
  g.add(planTexture(x1 - x0, z1 - z0, couleur, map, (x0 + x1) / 2, y, (z0 + z1) / 2, opts));
}

function bandeLED(g, w, d, x, y, z, rotation = 0) {
  const m = box(w, 0.022, d, 0xf6ead1, x, y, z);
  m.material = LED;
  m.rotation.y = rotation;
  m.castShadow = false;
  g.add(m);
  return m;
}

function plaque(g, texte, x, y, z, rotation = 0, largeur = 0.9) {
  const t = toile(512, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20,21,23,0.78)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(200,161,92,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#e8d6b4';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 44px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText(texte, w / 2, h / 2 + 2);
    ctx.letterSpacing = '0px';
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, largeur * 0.25),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false })
  );
  m.position.set(x, y, z);
  m.rotation.y = rotation;
  g.add(m);
  return m;
}

function plaqueNom(g, nom, sous, x, y, z, rotation = 0, largeur = 1.6) {
  const t = toile(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(18,20,23,0.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(200,161,92,0.82)';
    ctx.lineWidth = 5;
    ctx.strokeRect(9, 9, w - 18, h - 18);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let taille = 64;
    ctx.font = `600 ${taille}px "Optima", "Didot", Georgia, serif`;
    while (ctx.measureText(nom).width > w - 80 && taille > 30) {
      taille -= 3;
      ctx.font = `600 ${taille}px "Optima", "Didot", Georgia, serif`;
    }
    ctx.fillStyle = '#f0dfbd';
    ctx.fillText(nom, w / 2, sous ? h * 0.42 : h * 0.5);
    if (sous) {
      ctx.fillStyle = 'rgba(226,204,164,0.82)';
      ctx.font = '400 28px system-ui, -apple-system, sans-serif';
      ctx.fillText(sous, w / 2, h * 0.74);
    }
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, largeur * 0.25),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false })
  );
  m.position.set(x, y, z);
  m.rotation.y = rotation;
  g.add(m);
  return m;
}

// Panneau d'orientation : plan des étages ou annuaire d'un étage.
function panneauListe(g, titre, sous, lignes, x, y, z, rotation = 0, largeur = 1.45, hauteur = 2.0) {
  const profondeur = 0.09;
  g.add(box(largeur + 0.14, hauteur + 0.14, profondeur, 0x17191c, x, y, z, { roughness: 0.45, metalness: 0.2 }));
  g.add(box(largeur + 0.2, 0.05, profondeur + 0.06, OR, x, y + hauteur / 2 + 0.1, z));

  const t = toile(640, 900, (ctx, w, h) => {
    ctx.fillStyle = '#121417';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(200,161,92,0.7)';
    ctx.lineWidth = 5;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0dfbd';
    ctx.font = '600 46px "Optima", "Didot", Georgia, serif';
    ctx.fillText(titre, w / 2, 62);
    ctx.fillStyle = 'rgba(226,204,164,0.75)';
    ctx.font = '400 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(sous, w / 2, 108);
    ctx.strokeStyle = 'rgba(200,161,92,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 140);
    ctx.lineTo(w - 40, 140);
    ctx.stroke();

    const haut = 176;
    const pas = Math.min(66, (h - haut - 74) / Math.max(1, lignes.length));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    lignes.forEach((l, i) => {
      const yy = haut + i * pas;
      if (l.actif) {
        ctx.fillStyle = 'rgba(200,161,92,0.16)';
        ctx.fillRect(28, yy - 24, w - 56, pas - 6);
        ctx.strokeStyle = 'rgba(200,161,92,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(28, yy - 24, w - 56, pas - 6);
      }
      ctx.fillStyle = l.accent || '#c8a15c';
      ctx.beginPath();
      ctx.arc(54, yy - 7, 6, 0, TAU);
      ctx.fill();

      ctx.fillStyle = l.actif ? '#f5e6c4' : '#d8cbb3';
      ctx.font = '700 27px system-ui, -apple-system, sans-serif';
      ctx.fillText(l.gauche, 74, yy);
      ctx.fillStyle = '#efe7d6';
      ctx.font = '600 25px system-ui, -apple-system, sans-serif';
      ctx.fillText(l.droite, 184, yy);
      if (l.detail) {
        ctx.fillStyle = 'rgba(232,214,180,0.62)';
        ctx.font = '400 18px system-ui, -apple-system, sans-serif';
        ctx.fillText(l.detail, 184, yy + 22);
      }
    });
    if (lignes.some((l) => l.actif)) {
      ctx.fillStyle = '#c8a15c';
      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('VOUS ÊTES ICI', w - 46, h - 42);
    }
  });

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshBasicMaterial({ map: t, toneMapped: false })
  );
  face.position.set(
    x + Math.sin(rotation) * (profondeur / 2 + 0.006),
    y,
    z + Math.cos(rotation) * (profondeur / 2 + 0.006)
  );
  face.rotation.y = rotation;
  g.add(face);
  return face;
}


function enseigne(g, texte, sous, x, y, z, largeur, hauteur, rotation = 0) {
  const t = toile(1024, 220, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d6b477';
    ctx.font = '600 78px "Optima", "Didot", Georgia, serif';
    ctx.letterSpacing = '22px';
    ctx.fillText(texte, w / 2, h * 0.4);
    if (sous) {
      ctx.font = '500 26px system-ui, -apple-system, sans-serif';
      ctx.letterSpacing = '14px';
      ctx.fillStyle = 'rgba(226,204,164,0.86)';
      ctx.fillText(sous, w / 2, h * 0.76);
    }
    ctx.letterSpacing = '0px';
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false })
  );
  m.position.set(x, y, z);
  m.rotation.y = rotation;
  g.add(m);
  return m;
}

function logoReception(g) {
  const t = toile(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#c8a15c';
    ctx.fillStyle = '#c8a15c';
    ctx.lineWidth = 7;
    ctx.save();
    ctx.translate(w / 2, 120);
    ctx.rotate(PI / 4);
    ctx.strokeRect(-44, -44, 88, 88);
    ctx.fillRect(-22, -22, 44, 44);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.font = '600 58px "Optima", "Didot", Georgia, serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('LEPRINCE', w / 2, 270);
    ctx.font = '500 24px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(214,180,119,0.85)';
    ctx.fillText('VOTRE RÉUSSITE, NOTRE PRIORITÉ', w / 2, 330);
    ctx.letterSpacing = '0px';
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 2.9),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false })
  );
  m.position.set(-9.36, 2.15, -9);
  m.rotation.y = PI / 2;
  g.add(m);
}

function panneauFeutre(g, x, z, taille, rotation) {
  const R = taille / 2;
  // Triangle à coins arrondis, comme les panneaux acoustiques du plateau.
  const coins = [];
  for (let i = 0; i < 3; i++) {
    const a = -PI / 2 + (i * TAU) / 3;
    coins.push({ x: Math.cos(a) * R, y: Math.sin(a) * R });
  }
  const d = R * 0.3;
  const forme = new THREE.Shape();
  for (let i = 0; i < 3; i++) {
    const p = coins[i];
    const precedent = coins[(i + 2) % 3];
    const suivant = coins[(i + 1) % 3];
    const lp = Math.hypot(precedent.x - p.x, precedent.y - p.y);
    const ls = Math.hypot(suivant.x - p.x, suivant.y - p.y);
    const ax = p.x + ((precedent.x - p.x) / lp) * d;
    const ay = p.y + ((precedent.y - p.y) / lp) * d;
    const bx = p.x + ((suivant.x - p.x) / ls) * d;
    const by = p.y + ((suivant.y - p.y) / ls) * d;
    if (i === 0) forme.moveTo(ax, ay);
    else forme.lineTo(ax, ay);
    forme.quadraticCurveTo(p.x, p.y, bx, by);
  }
  forme.closePath();
  const geo = new THREE.ExtrudeGeometry(forme, {
    depth: 0.09,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.03,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.rotateX(PI / 2);
  const m = new THREE.Mesh(geo, FEUTRE);
  m.position.set(x, 3.98, z);
  m.rotation.y = rotation;
  m.castShadow = false;
  m.receiveShadow = false;
  g.add(m);

  const led = box(taille * 0.78, 0.018, 0.045, 0xfff0cf, x, 3.875, z);
  led.material = LED;
  led.rotation.y = rotation + 0.32;
  led.castShadow = false;
  g.add(led);
}

function tableauArt(g, x, y, z, rotation, largeur, hauteur, teintes, graineArt) {
  const t = toile(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e9e2d4';
    ctx.fillRect(0, 0, w, h);
    const r = graine(graineArt);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = teintes[i % teintes.length];
      ctx.globalAlpha = 0.25 + r() * 0.5;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 18 + r() * 70, 12 + r() * 50, r() * PI, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  g.add(box(largeur + 0.06, hauteur + 0.06, 0.035, 0x2b2a27, x, y, z));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur), new THREE.MeshBasicMaterial({ map: t }));
  m.position.set(x, y, z + 0.024);
  m.rotation.y = rotation;
  g.add(m);
}

// ---------------------------------------------------------------------------
// Parvis, parking, véhicules

function gardeCorps(g, colliders, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const longueur = Math.hypot(dx, dz);
  const n = Math.max(2, Math.round(longueur / 4.2) + 1);
  const angle = Math.atan2(dx, dz);

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = x0 + dx * t;
    const z = z0 + dz * t;
    g.add(box(0.4, 1.12, 0.4, 0xd8cdb9, x, 0.58, z, { roughness: 0.9 }));
    const led = box(0.05, 0.86, 0.05, 0xfff0cf, x + 0.21, 0.62, z);
    led.material = LED;
    g.add(led);
    g.add(box(0.44, 0.05, 0.44, 0xbfb39c, x, 1.15, z));
    colliders.push({ x, z, r: 0.3, cercle: true });
  }

  for (let i = 0; i < n - 1; i++) {
    const ta = i / (n - 1);
    const tb = (i + 1) / (n - 1);
    const ax = x0 + dx * ta;
    const az = z0 + dz * ta;
    const bx = x0 + dx * tb;
    const bz = z0 + dz * tb;
    const cx = (ax + bx) / 2;
    const cz = (az + bz) / 2;
    const l = Math.hypot(bx - ax, bz - az);
    for (let k = 0; k < 3; k++) {
      const rail = box(0.06, 0.06, l - 0.4, 0x2c2e31, cx, 0.34 + k * 0.3, cz, { roughness: 0.5, metalness: 0.4 });
      rail.rotation.y = angle;
      g.add(rail);
    }
    colliders.push({ x: cx, z: cz, hw: 0.16, hd: l / 2, rot: angle });
  }
}

function tapisLuxe(g, x, z, w, d) {
  g.add(box(w, 0.012, d, 0x2a2520, x, SOL + 0.011, z, { roughness: 1 }));
  g.add(box(w - 0.22, 0.005, d - 0.22, 0x3b342c, x, SOL + 0.02, z, { roughness: 1 }));
  const filet = mat(0xc8a15c, { roughness: 0.5, metalness: 0.35 });
  for (const dz of [-d / 2 + 0.11, d / 2 - 0.11]) {
    const m = box(w - 0.14, 0.004, 0.03, 0xffffff, x, SOL + 0.024, z + dz);
    m.material = filet;
    g.add(m);
  }
  for (const dx of [-w / 2 + 0.11, w / 2 - 0.11]) {
    const m = box(0.03, 0.004, d - 0.14, 0xffffff, x + dx, SOL + 0.024, z);
    m.material = filet;
    g.add(m);
  }
}

function planteBac(g, colliders, x, z, taille = 1) {
  g.add(box(1.1 * taille, 0.55, 1.1 * taille, 0xcfc4b0, x, 0.29, z, { roughness: 0.92 }));
  g.add(box(1.0 * taille, 0.04, 1.0 * taille, 0x2f2a24, x, 0.57, z));
  const r = graine(Math.round(x * 91 + z * 57));
  const feuilles = [0x4f7a3f, 0x5e8c4b, 0x6a9a52, 0x456c38];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(
      new THREE.SphereGeometry((0.2 + r() * 0.2) * taille, 9, 7),
      mat(feuilles[i % feuilles.length], { roughness: 0.9 })
    );
    f.position.set(x + (r() - 0.5) * 0.7 * taille, 0.75 + r() * 0.55 * taille, z + (r() - 0.5) * 0.7 * taille);
    f.castShadow = true;
    g.add(f);
  }
  colliders.push({ x, z, r: 0.62 * taille, cercle: true });
}

function fleursBlanches(g, colliders, x0, x1, z0, z1) {
  const r = graine(Math.round(x0 * 13 + z0 * 29));
  g.add(box(x1 - x0, 0.34, z1 - z0, 0x8f887b, (x0 + x1) / 2, 0.17, (z0 + z1) / 2, { roughness: 0.95 }));
  g.add(box(x1 - x0 - 0.16, 0.03, z1 - z0 - 0.16, 0x2b2822, (x0 + x1) / 2, 0.35, (z0 + z1) / 2));
  const n = Math.round(((x1 - x0) * (z1 - z0)) / 0.16);
  for (let i = 0; i < n; i++) {
    const f = new THREE.Mesh(
      new THREE.SphereGeometry(0.045 + r() * 0.05, 6, 5),
      mat(r() > 0.3 ? 0xf3efe2 : 0xdfe6cd, { roughness: 0.9 })
    );
    f.position.set(x0 + 0.12 + r() * (x1 - x0 - 0.24), 0.4 + r() * 0.14, z0 + 0.12 + r() * (z1 - z0 - 0.24));
    g.add(f);
  }
  const led = box(x1 - x0 - 0.5, 0.035, 0.05, 0xfff0cf, (x0 + x1) / 2, 0.36, z1 - 0.12);
  led.material = LED;
  g.add(led);
  colliders.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2 });
}

function arbre(g, colliders, x, z, taille = 1) {
  const r = graine(Math.round(x * 31 + z * 17) + 7);
  g.add(cyl(0.14 * taille, 0.2 * taille, 1.9 * taille, 0x6a4a30, x, 0.95 * taille, z, 8, { roughness: 0.9 }));
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(
      new THREE.SphereGeometry((0.8 + r() * 0.55) * taille, 10, 8),
      mat(i % 2 ? 0x4d7a3d : 0x3f6834, { roughness: 0.92 })
    );
    f.scale.y = 0.85;
    f.position.set(x + (r() - 0.5) * 1.1 * taille, (1.9 + r() * 1.5) * taille, z + (r() - 0.5) * 1.1 * taille);
    f.castShadow = true;
    g.add(f);
  }
  colliders.push({ x, z, r: 0.38 * taille, cercle: true });
}

function construireParvis(g, colliders, portes, modeles) {
  // Dalle du plateau, légèrement au-dessus du sol de l'île
  g.add(box(64, 0.14, 71.8, 0x3a3c3f, 0, -0.05, 4.1, { roughness: 0.9 }));
  g.add(box(64.2, 0.9, 72, 0x2c2e30, 0, -0.55, 4.1, { roughness: 0.92 }));
  g.add(planTexture(64, 71.8, 0xffffff, texturePierre(), 0, 0.025, 4.1, { roughness: 0.9 }));

  // Parvis du bâtiment en travertin
  solPiece(g, -25.2, 25.2, -15.8, 15.4, textureTravertin(), 0xffffff, 0.028, { roughness: 0.82 });

  // Parking
  g.add(planTexture(48, 13.4, 0xffffff, textureAsphalte(), 0, 0.034, -22.1, { roughness: 0.95 }));
  for (let i = 0; i < 9; i++) {
    const x = -24 + i * 6;
    g.add(box(0.09, 0.01, 5.4, 0xe8e6df, x, 0.046, -22.4, { roughness: 0.8 }));
  }
  for (let i = 0; i < 2; i++) {
    const z = -20.2 + i * 0.02;
    g.add(box(48, 0.012, 0.09, 0xe8e6df, 0, 0.047, z, { roughness: 0.8 }));
  }

  // Allée centrale en pierre claire
  g.add(planTexture(6.4, 16.4, 0xf1e9d8, texturePierre(), 0, 0.05, -23.4, { roughness: 0.78 }));

  // Véhicules
  const places = [
    { type: 'sport', couleur: 0x6d7277, x: -21, z: -22.5 },
    { type: 'berline', couleur: 0xf0eee8, x: -15.5, z: -22.5 },
    { type: 'suite', couleur: 0x2d3136, x: -10, z: -22.5 },
    { type: 'berline', couleur: 0x21384f, x: 10, z: -22.5 },
    { type: 'suv', couleur: 0xf2f0ea, x: 15.5, z: -22.5 },
  ];
  for (const p of places) {
    const v = voiture({
      type: p.type === 'suite' ? 'coupe' : p.type,
      couleur: p.couleur,
      x: p.x,
      z: p.z,
      rot: -PI / 2,
    });
    g.add(v);
    colliders.push({ x: p.x, z: p.z, hw: 1.05, hd: 2.55 });
  }

  const motos = [
    { type: 'sport', couleur: 0xb02a22, x: -6.6, z: -21.2, rot: -PI / 2 + 0.12 },
    { type: 'sport', couleur: 0x1c1e21, x: 6.6, z: -21.2, rot: -PI / 2 - 0.1 },
    { type: 'cruiser', couleur: 0x3c4045, x: 21.5, z: -19.6, rot: -PI / 2 + 0.06 },
  ];
  for (const m of motos) {
    g.add(moto({ type: m.type, couleur: m.couleur, x: m.x, z: m.z, rot: m.rot }));
    colliders.push({ x: m.x, z: m.z, hw: 0.55, hd: 1.1, rot: m.rot + PI / 2 });
  }

  // Bornes lumineuses le long de l'allée
  for (const z of [-29, -25, -21, -17]) {
    for (const x of [-4.4, 4.4]) {
      g.add(box(0.34, 1.02, 0.34, 0xd8cdb9, x, 0.53, z, { roughness: 0.9 }));
      const led = box(0.045, 0.8, 0.045, 0xfff0cf, x + Math.sign(x) * -0.18, 0.56, z);
      led.material = LED;
      g.add(led);
      colliders.push({ x, z, r: 0.26, cercle: true });
    }
  }

  // Garde-corps du plateau
  gardeCorps(g, colliders, -30, -30.6, -5.2, -30.6);
  gardeCorps(g, colliders, 5.2, -30.6, 30, -30.6);
  gardeCorps(g, colliders, -31.4, -30.6, -31.4, 39);
  gardeCorps(g, colliders, 31.4, -30.6, 31.4, 39);
  gardeCorps(g, colliders, -31.4, 39, 31.4, 39);

  // Massifs de fleurs blanches et plantations
  fleursBlanches(g, colliders, -28.5, -7.5, -29.9, -27.4);
  fleursBlanches(g, colliders, 7.5, 28.5, -29.9, -27.4);
  planteBac(g, colliders, -25, -16, 1.1);
  planteBac(g, colliders, 25, -16, 1.1);
  planteBac(g, colliders, -19.5, -17.4, 0.9);
  planteBac(g, colliders, 19.5, -17.4, 0.9);
  arbre(g, colliders, -27.5, -23, 1.2);
  arbre(g, colliders, 27.5, -23, 1.2);

  // Jardin arrière
  g.add(planTexture(58, 23, 0xffffff, textureHerbe(), 0, 0.03, 27.5, { roughness: 0.98 }));
  solPiece(g, -2.6, 2.6, 15.2, 39, textureTravertin(), 0xffffff, 0.035, { roughness: 0.82 });
  for (const x of [-22, -14, -8, 8, 14, 22]) {
    for (const z of [20, 27, 34]) {
      if (Math.abs(x) < 11 && Math.abs(z - 26) < 4.5) continue;
      arbre(g, colliders, x, z, 0.95 + ((x + z) % 3) * 0.08);
    }
  }

  // Bassin
  g.add(box(20.4, 0.28, 7.4, 0xcfc4b1, 0, 0.14, 26, { roughness: 0.8 }));
  g.add(planTexture(19.6, 6.6, 0xffffff, null, 0, 0.3, 26, { roughness: 0.06, metalness: 0.5 }));
  const eau = new THREE.Mesh(new THREE.PlaneGeometry(19.6, 6.6), EAU);
  eau.rotation.x = -PI / 2;
  eau.position.set(0, 0.31, 26);
  g.add(eau);
  colliders.push({ x: 0, z: 26, hw: 10, hd: 3.6 });

  // Transat et bancs
  for (const x of [-7.5, -4.5, 4.5, 7.5]) {
    g.add(box(0.62, 0.1, 1.7, 0xe8e2d5, x, 0.42, 31.2, { roughness: 0.85 }));
    g.add(box(0.62, 0.62, 0.1, 0xe8e2d5, x, 0.72, 32.1, { roughness: 0.85 }));
  }
  for (const x of [-18, 18]) {
    poser(modeles, 'banc', g, x, 0.03, 16.8, PI);
  }
}

// ---------------------------------------------------------------------------
// Enveloppe : façades, fins, toiture, lanterne

function facadeN(g, colliders, portes, modeles) {
  const z = -14;
  // Ailes gauche et droite : pierres, vitrage, fins verticales
  for (const cote of [-1, 1]) {
    const xa = cote * 9.6;
    const xb = cote * 24;
    const [x0, x1] = cote < 0 ? [xb, xa] : [xa, xb];

    g.add(box(x1 - x0, 0.76, 0.3, PIERRE_CLAIR, (x0 + x1) / 2, SOL + 0.38, z, { roughness: 0.82 }));
    vitre(g, x1 - x0 - 0.4, 3.44, 0.09, (x0 + x1) / 2, SOL + 0.76 + 1.72, z, 0, true);

    for (let x = Math.min(x0, x1) + 2.4; x < Math.max(x0, x1); x += 4.8) {
      g.add(box(0.5, H + 0.1, 0.42, PIERRE_CLAIR, x, SOL + H / 2, z - 0.03, { roughness: 0.8 }));
    }
    for (let i = 0; i < 6; i++) {
      g.add(box(0.12, 3.3, 0.1, 0x23262a, Math.min(x0, x1) + 1.2 + i * 2.2, SOL + 2.45, z - 0.08));
    }

    // Fins de travertin devant le vitrage
    const debut = Math.min(x0, x1) + 0.9;
    const fin = Math.max(x0, x1) - 0.9;
    for (let x = debut; x <= fin; x += 1.15) {
      g.add(box(0.22, 3.3, 0.5, 0xe4d9c5, x, SOL + 2.5, z - 0.32, { roughness: 0.82 }));
      const led = box(0.05, 2.7, 0.04, 0xfff0cf, x, SOL + 2.5, z - 0.57);
      led.material = LED;
      g.add(led);
    }

    // Lame de bois horizontale sur l'aile droite
    if (cote > 0) {
      for (let i = 0; i < 7; i++) {
        g.add(box(13.4, 0.06, 0.12, 0x9a6c42, 16.8, SOL + 3.06 + i * 0.16, z - 0.66, { roughness: 0.7 }));
      }
    }

    colliders.push({ x: (x0 + x1) / 2, z, hw: (x1 - x0) / 2, hd: 0.2 });
  }

  // Hall : rideau de verre sur une hauteur d'étage
  g.add(box(3.6, 0.45, 0.34, PIERRE_CLAIR, -7.8, SOL + 0.22, z));
  g.add(box(3.6, 0.45, 0.34, PIERRE_CLAIR, 7.8, SOL + 0.22, z));
  vitre(g, 4.9, 3.72, 0.08, -4.55, SOL + 2.42, z, 0, true);
  vitre(g, 4.9, 3.72, 0.08, 4.55, SOL + 2.42, z, 0, true);
  for (let i = 0; i < 9; i++) {
    g.add(box(0.1, 3.72, 0.12, 0x1f2226, -8.2 + i * 2.05, SOL + 2.42, z - 0.1));
  }
  g.add(box(19.2, 0.18, 0.34, NOIR, 0, SOL + H - 0.09, z));
  colliders.push({ x: -6.1, z, hw: 3.6, hd: 0.18 });
  colliders.push({ x: 6.1, z, hw: 3.6, hd: 0.18 });

  // Portes d'entrée vitrées
  const porte = porteDouble(g, { z, largeur: 3.6, hauteur: 2.85, sol: SOL, teinte: 0x34383d });
  portes.push(porte);
  colliders.push(porte.collider);

  // Auvent : dalle mince, sous-face sombre, frise d'enseigne à hauteur d'œil.
  g.add(box(15.2, 0.14, 3.8, PIERRE_CLAIR, 0, SOL + 3.86, -15.8, { roughness: 0.72 }));
  g.add(box(15.24, 0.035, 0.08, OR, 0, SOL + 3.945, -17.66));
  g.add(box(0.08, 0.035, 3.86, OR, -7.62, SOL + 3.945, -15.8));
  g.add(box(0.08, 0.035, 3.86, OR, 7.62, SOL + 3.945, -15.8));
  g.add(box(14.6, 0.02, 3.3, 0x3b3e42, 0, SOL + 3.782, -15.7));
  g.add(box(15.2, 0.6, 0.16, 0x1b1d20, 0, SOL + 3.49, -17.62, { roughness: 0.5 }));
  g.add(box(15.24, 0.03, 0.18, OR, 0, SOL + 3.18, -17.62));
  for (let i = 0; i < 7; i++) {
    const led = box(1.9, 0.03, 0.05, 0xfff0cf, -6 + i * 2, SOL + 3.766, -15.6);
    led.material = LED;
    led.castShadow = false;
    g.add(led);
  }
  for (const x of [-6.9, 6.9]) {
    g.add(cyl(0.14, 0.16, 3.79, 0xd8cdb9, x, SOL + 1.9, -17.1, 12, { roughness: 0.6 }));
    colliders.push({ x, z: -17.1, r: 0.28, cercle: true });
  }

  // Encadrement profond de l'entrée : deux piédroits et un linteau de pierre.
  for (const x of [-2.18, 2.18]) {
    g.add(box(0.5, 3.3, 0.8, PIERRE_CLAIR, x, SOL + 1.65, -14.28, { roughness: 0.8 }));
  }
  g.add(box(4.86, 0.42, 0.8, PIERRE_CLAIR, 0, SOL + 3.15, -14.28, { roughness: 0.8 }));
  g.add(box(4.4, 0.02, 0.92, 0x2a2c2e, 0, SOL + 0.012, -14.32, { roughness: 0.5 }));

  poser(modeles, 'plantePot', g, -5.1, 0.05, -15.5, 0.4);
  poser(modeles, 'plantePot', g, 5.1, 0.05, -15.5, -0.4);
  colliders.push({ x: -5.1, z: -15.5, r: 0.34, cercle: true });
  colliders.push({ x: 5.1, z: -15.5, r: 0.34, cercle: true });

  enseigne(g, 'LEPRINCE', 'HEADQUARTERS', 0, SOL + 3.5, -17.72, 7.2, 0.6, PI);
}

function facadeS(g, colliders, portes) {
  const z = 14;

  // Grande façade sud : pierres et vitrages, avec porte de service
  const porte = porteDouble(g, { centreX: -21, z, largeur: 1.26, hauteur: 2.3, sol: SOL, teinte: 0x2c3034 });
  portes.push(porte);
  colliders.push(porte.collider);

  const segments = [
    [-24, -21.66],
    [-20.34, 24],
  ];
  for (const [x0, x1] of segments) {
    g.add(box(x1 - x0, 0.76, 0.3, PIERRE_CLAIR, (x0 + x1) / 2, SOL + 0.38, z, { roughness: 0.82 }));
    vitre(g, x1 - x0 - 0.3, 3.3, 0.09, (x0 + x1) / 2, SOL + 0.76 + 1.65, z, 0, true);
    for (let x = x0 + 2.4; x < x1; x += 4.8) {
      g.add(box(0.5, H + 0.1, 0.42, PIERRE_CLAIR, x, SOL + H / 2, z + 0.03, { roughness: 0.8 }));
    }
    for (let i = 0; i * 2.2 < x1 - x0; i++) {
      g.add(box(0.1, 3.1, 0.1, 0x23262a, x0 + 1.1 + i * 2.2, SOL + 2.3, z + 0.07));
    }
    colliders.push({ x: (x0 + x1) / 2, z, hw: (x1 - x0) / 2, hd: 0.2 });
  }

  // Écran de lattes de bois derrière le bureau de direction
  for (let i = 0; i < 40; i++) {
    g.add(box(0.09, 3.0, 0.18, 0x9c6d43, -8.3 + i * 0.345, SOL + 2.0, z + 0.22, { roughness: 0.7 }));
  }
  g.add(box(14.2, 0.06, 0.2, OR, 0, SOL + 3.55, z + 0.22));

  // Escalier de service arrière
  g.add(box(3.4, 0.14, 1.2, 0xd9cfbc, -21, 0.08, 14.7, { roughness: 0.85 }));
}

function facadeLaterale(g, colliders, cote) {
  const x = cote * 24;
  const z0 = -14;
  const z1 = 14;

  g.add(box(0.3, 0.76, D, PIERRE_CLAIR, x, SOL + 0.38, 0, { roughness: 0.82 }));
  vitre(g, 0.09, 3.3, D - 0.5, x, SOL + 2.4, 0, 0, true);
  for (let z = z0 + 3; z < z1; z += 4.8) {
    g.add(box(0.42, H + 0.1, 0.5, PIERRE_CLAIR, x + cote * 0.03, SOL + H / 2, z, { roughness: 0.8 }));
  }
  for (let z = z0 + 2.2; z < z1; z += 2.4) {
    g.add(box(0.1, 3.1, 0.1, 0x23262a, x - cote * 0.08, SOL + 2.35, z));
  }
  // Fins verticales côté jardin
  for (let z = z0 + 1; z < z1 - 0.5; z += 1.25) {
    g.add(box(0.5, 3.3, 0.22, 0xe4d9c5, x + cote * 0.32, SOL + 2.45, z, { roughness: 0.82 }));
  }
  colliders.push({ x, z: 0, hw: 0.2, hd: D / 2 });
}

// Stores intérieurs : quelques baies tirées, la plupart relevées, teintes
// légèrement différentes. C'est ce qui donne une façade habitée plutôt qu'un
// ruban de verre uniforme.
let cacheStore = null;
function textureStore() {
  if (cacheStore) return cacheStore;
  cacheStore = toile(128, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ece6d8';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 9) {
      const g = ctx.createLinearGradient(0, y, 0, y + 9);
      g.addColorStop(0, '#d3ccbd');
      g.addColorStop(0.35, '#f6f1e6');
      g.addColorStop(0.78, '#ded6c7');
      g.addColorStop(1, '#a9a294');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, 8);
    }
    const r = graine(3311);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(88, 80, 66, ${0.015 + r() * 0.03})`;
      ctx.fillRect(0, r() * h, w, 1 + r() * 2);
    }
  });
  cacheStore.wrapS = cacheStore.wrapT = THREE.RepeatWrapping;
  return cacheStore;
}

function storesTour(g) {
  const r = graine(90512);
  const matStore = new THREE.MeshStandardMaterial({
    map: textureStore(),
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const items = [];
  const ALLEGE = 0.42;
  const hVitre = FH - 0.42 - 0.15;

  const aretes = (etendue, module) => {
    const e = [-etendue / 2];
    for (let x = -etendue / 2 + module; x < etendue / 2 - 0.5; x += module) e.push(x);
    e.push(etendue / 2);
    return e;
  };
  const teintes = [0xffffff, 0xf4efe4, 0xe9e1d0, 0xdcd3c0, 0xccc4b2];

  const poser = (cx, cz, largeur, y0, face) => {
    const tirage = r();
    if (tirage < 0.42) return;
    const h = tirage > 0.74 ? hVitre - 0.05 : hVitre * (0.3 + r() * 0.5);
    items.push({
      x: face === 'o' ? -W / 2 + 0.15 : face === 'e' ? W / 2 - 0.15 : cx,
      z: face === 'n' ? -D / 2 + 0.15 : face === 's' ? D / 2 - 0.15 : cz,
      y: y0 + ALLEGE + hVitre - h / 2 - 0.02,
      largeur: largeur - 0.2,
      h,
      rot: face === 'n' || face === 's' ? 0 : PI / 2,
      teinte: teintes[Math.floor(r() * teintes.length)],
    });
  };

  for (let e = 1; e <= ETAGES; e++) {
    const y0 = solEtage(e);
    const xa = aretes(W, 3.2);
    const za = aretes(D, 3.2);
    for (let i = 0; i < xa.length - 1; i++) {
      const cx = (xa[i] + xa[i + 1]) / 2;
      const largeur = xa[i + 1] - xa[i];
      poser(cx, 0, largeur, y0, 'n');
      poser(cx, 0, largeur, y0, 's');
    }
    for (let i = 0; i < za.length - 1; i++) {
      const cz = (za[i] + za[i + 1]) / 2;
      const largeur = za[i + 1] - za[i];
      poser(0, cz, largeur, y0, 'o');
      poser(0, cz, largeur, y0, 'e');
    }
  }

  const stores = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), matStore, items.length);
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const ech = new THREE.Vector3();
  const couleur = new THREE.Color();
  items.forEach((b, i) => {
    q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rot);
    pos.set(b.x, b.y, b.z);
    ech.set(b.largeur, b.h, 1);
    m4.compose(pos, q4, ech);
    stores.setMatrixAt(i, m4);
    couleur.setHex(b.teinte);
    stores.setColorAt(i, couleur);
  });
  stores.instanceMatrix.needsUpdate = true;
  if (stores.instanceColor) stores.instanceColor.needsUpdate = true;
  stores.receiveShadow = true;
  g.add(stores);
}

// Façades de la tour : une dalle et une ceinture vitrée par étage.
function facadesTour(g) {
  const ALLEGE = 0.42;
  const BANDEAU = 0.15;
  const hVerre = FH - ALLEGE - BANDEAU;

  for (let e = 1; e <= ETAGES; e++) {
    const y0 = solEtage(e);
    const yVerre = y0 + ALLEGE + hVerre / 2;
    const yBandeau = y0 + FH - BANDEAU / 2;

    // Dalle : plancher de l'étage, plafond de l'étage inférieur
    g.add(box(W + 0.6, DALLE, D + 0.6, 0xe7ddca, 0, y0 - DALLE / 2, 0, { roughness: 0.9 }));

    // Allège et bandeau de pierre : deux lames fines, le verre occupe l'essentiel
    for (const z of [-D / 2, D / 2]) {
      g.add(box(W, ALLEGE, 0.4, PIERRE_CLAIR, 0, y0 + ALLEGE / 2, z, { roughness: 0.82 }));
      g.add(box(W, BANDEAU, 0.36, PIERRE_CLAIR, 0, yBandeau, z, { roughness: 0.82 }));
    }
    for (const x of [-W / 2, W / 2]) {
      g.add(box(0.4, ALLEGE, D, PIERRE_CLAIR, x, y0 + ALLEGE / 2, 0, { roughness: 0.82 }));
      g.add(box(0.36, BANDEAU, D, PIERRE_CLAIR, x, yBandeau, 0, { roughness: 0.82 }));
    }

    // Ceinture vitrée continue
    vitre(g, W - 0.5, hVerre, 0.08, 0, yVerre, -D / 2, 0, true);
    vitre(g, W - 0.5, hVerre, 0.08, 0, yVerre, D / 2, 0, true);
    vitre(g, 0.08, hVerre, D - 0.5, -W / 2, yVerre, 0, 0, true);
    vitre(g, 0.08, hVerre, D - 0.5, W / 2, yVerre, 0, 0, true);

    // Ombre portée du linteau et du nez de dalle : deux traits sombres qui
    // creusent la baie et donnent de la profondeur au vitrage.
    for (const z of [-D / 2 + 0.03, D / 2 - 0.03]) {
      g.add(box(W - 0.3, 0.05, 0.1, 0x1d2023, 0, y0 + ALLEGE + 0.02, z));
      g.add(box(W - 0.3, 0.05, 0.1, 0x1d2023, 0, y0 + FH - BANDEAU - 0.02, z));
      g.add(box(W - 0.6, 0.05, 0.1, 0x2b2e31, 0, y0 + ALLEGE + hVerre * 0.5, z));
    }
    for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) {
      g.add(box(0.1, 0.05, D - 0.3, 0x1d2023, x, y0 + ALLEGE + 0.02, 0));
      g.add(box(0.1, 0.05, D - 0.3, 0x1d2023, x, y0 + FH - BANDEAU - 0.02, 0));
    }

    // Meneaux saillants : le métal dépasse du nu du verre.
    for (let x = -W / 2 + 3.2; x < W / 2 - 1; x += 3.2) {
      for (const z of [-D / 2, D / 2]) {
        g.add(box(0.12, hVerre, 0.2, 0x2b2e31, x, yVerre, z + Math.sign(z) * 0.02));
      }
    }
    for (let z = -D / 2 + 3.2; z < D / 2 - 1; z += 3.2) {
      for (const x of [-W / 2, W / 2]) {
        g.add(box(0.2, hVerre, 0.12, 0x2b2e31, x + Math.sign(x) * 0.02, yVerre, z));
      }
    }

    // Arêtes d'angle en métal : la tour se lit comme une boîte de verre.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        g.add(box(0.24, FH - DALLE, 0.24, 0x2b2e31, sx * (W / 2 - 0.02), y0 + (FH - DALLE) / 2, sz * (D / 2 - 0.02)));
      }
    }

    // Fins de travertin sur les pignons nord et sud
    for (let x = -W / 2 + 4; x <= W / 2 - 4; x += 4) {
      for (const z of [-D / 2 + 0.2, D / 2 - 0.2]) {
        g.add(box(0.14, FH - 0.12, 0.28, 0xe4d9c5, x, y0 + FH / 2, z, { roughness: 0.82 }));
      }
    }

    // Filet doré sous chaque dalle
    for (const z of [-D / 2 - 0.02, D / 2 + 0.02]) {
      g.add(box(W + 0.1, 0.03, 0.4, 0xc8a15c, 0, y0 + 0.015, z));
    }
  }

  storesTour(g);
}

function toitureTour(g) {
  const y = ROOF_Y;
  // Dalle de couverture : le champ du toit se lit depuis la vue d'île, il porte
  // donc une membrane gravillonnée grise et non un aplat de pierre claire.
  g.add(box(W + 0.9, 0.4, D + 0.9, 0xa8a196, 0, y + 0.2, 0, { surface: 'beton', tuile: 3.2, roughness: 0.96 }));

  const hAcro = 1.05;
  for (const z of [-D / 2 - 0.35, D / 2 + 0.35]) {
    g.add(box(W + 1, hAcro, 0.3, PIERRE_CLAIR, 0, y + 0.4 + hAcro / 2, z, { roughness: 0.82 }));
    g.add(box(W + 1.1, 0.05, 0.36, OR, 0, y + 0.4 + hAcro, z));
  }
  for (const x of [-W / 2 - 0.35, W / 2 + 0.35]) {
    g.add(box(0.3, hAcro, D + 0.7, PIERRE_CLAIR, x, y + 0.4 + hAcro / 2, 0, { roughness: 0.82 }));
    g.add(box(0.36, 0.05, D + 0.8, OR, x, y + 0.4 + hAcro, 0));
  }

  // Superstructure du noyau d'ascenseurs
  g.add(box(7.6, 3.4, 7.0, 0x2a2d31, 0, y + 0.4 + 1.7, -1, { roughness: 0.5, metalness: 0.2 }));
  for (let i = 0; i < 4; i++) {
    g.add(box(1.1, 2.9, 0.06, 0x3d444b, -2.7 + i * 1.8, y + 0.4 + 1.7, -4.52, { metalness: 0.55, roughness: 0.35 }));
  }
  g.add(box(8.0, 0.18, 7.4, INOX, 0, y + 0.4 + 3.4, -1, { metalness: 0.7, roughness: 0.3 }));

  // Porte d'accès technique et désenfumage sur le noyau
  g.add(box(0.08, 2.2, 1.3, 0x3d444b, 3.84, y + 0.4 + 1.1, 0.6, { metalness: 0.5, roughness: 0.4 }));
  g.add(box(0.06, 1.0, 2.0, 0x2b2f33, 3.84, y + 0.4 + 2.4, -2.2, { metalness: 0.45, roughness: 0.55 }));

  // Coupoles d'éclairage zénithal : deux lanterneaux vitrés sur la façade nord.
  for (const x of [-10.2, -4.6]) {
    g.add(box(3.4, 0.22, 2.2, PIERRE_CLAIR, x, y + 0.53, -10.6, { roughness: 0.8 }));
    g.add(box(3.0, 0.3, 1.8, 0x2b3a45, x, y + 0.76, -10.6, { metalness: 0.6, roughness: 0.16 }));
    g.add(box(3.1, 0.05, 1.9, 0x4a5055, x, y + 0.92, -10.6, { metalness: 0.55, roughness: 0.3 }));
  }

  // Extractions et cheminées : volumes simples qui cassent la platitude du champ.
  for (const [x, z, r, h] of [
    [-6.6, 9.4, 0.34, 1.15],
    [-3.4, 10.2, 0.24, 0.85],
    [8.4, -10.2, 0.3, 1.0],
    [11.6, 8.4, 0.22, 0.72],
    [19.0, 8.9, 0.26, 0.9],
  ]) {
    g.add(cyl(r, r * 1.16, h, 0x8f969b, x, y + 0.45 + h / 2, z, 14, { metalness: 0.55, roughness: 0.42 }));
    g.add(cyl(r * 1.38, r * 1.38, 0.08, 0x3d4145, x, y + 0.45 + h, z, 14, { metalness: 0.5, roughness: 0.4 }));
  }

  // Enseigne au sommet, face au parvis
  g.add(box(12.4, 0.85, 0.4, PIERRE_CLAIR, 0, y + 1.15, -D / 2 - 0.5, { roughness: 0.78 }));
  g.add(box(12.5, 0.06, 0.44, OR, 0, y + 1.6, -D / 2 - 0.5));
  enseigne(g, 'LEPRINCE', 'WORKLAND', 0, y + 1.2, -D / 2 - 0.72, 9.2, 0.92, PI);

  // Technique : groupes de climatisation
  const hvac = new THREE.Group();
  hvac.position.set(-16.5, y + 0.4, -7);
  for (let i = 0; i < 2; i++) {
    hvac.add(box(3.2, 0.95, 1.9, 0xc9c4b8, i * 4.2, 0.48, 0, { roughness: 0.7 }));
    hvac.add(box(2.8, 0.06, 1.5, 0x3d4145, i * 4.2, 0.97, 0));
  }
  g.add(hvac);

  // Panneaux solaires
  for (let i = 0; i < 4; i++) {
    const panneau = box(3.6, 0.07, 1.7, 0x1e2f45, -21 + i * 4.2, y + 0.4 + 0.6, 8, {
      roughness: 0.28,
      metalness: 0.55,
    });
    panneau.rotation.z = -0.18;
    g.add(panneau);
  }

  // Hélipad
  const t = toile(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#e8e2d4';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.42, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#e8e2d4';
    ctx.font = '700 250px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', w / 2, h / 2 + 10);
  });
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(4.4, 48),
    new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.8 })
  );
  pad.rotation.x = -PI / 2;
  pad.position.set(15.5, y + 0.42, -3.5);
  g.add(pad);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + PI / 4;
    const led = box(0.16, 0.05, 0.16, 0xfff0cf, 15.5 + Math.cos(a) * 4.2, y + 0.46, -3.5 + Math.sin(a) * 4.2);
    led.material = LED_BLANC;
    g.add(led);
  }

  // Feux de balisage aéronautique aux quatre angles de l'acrotère.
  const matFeu = new THREE.MeshStandardMaterial({
    color: 0x54100c,
    emissive: 0xff2a18,
    emissiveIntensity: 2.6,
    roughness: 0.35,
  });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (W / 2 + 0.35);
      const z = sz * (D / 2 + 0.35);
      g.add(cyl(0.045, 0.06, 0.42, 0x2a2d30, x, y + 0.4 + hAcro + 0.21, z, 8, { metalness: 0.4, roughness: 0.5 }));
      const feu = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), matFeu);
      feu.position.set(x, y + 0.4 + hAcro + 0.5, z);
      g.add(feu);
    }
  }
}

function enveloppe(g, colliders, portes, modeles) {
  facadeN(g, colliders, portes, modeles);
  facadeS(g, colliders, portes);
  facadeLaterale(g, colliders, -1);
  facadeLaterale(g, colliders, 1);
  facadesTour(g);
  toitureTour(g);

  // Plinthe du bâtiment
  g.add(box(50.4, SOL, 30.4, 0xe7ddca, 0, SOL / 2, 0, { roughness: 0.84 }));
  g.add(box(8, 0.08, 1.6, 0xd9cfbc, 0, 0.035, -15.8, { roughness: 0.85 }));
}

// ---------------------------------------------------------------------------
// Cloisons intérieures

function cloisonH(g, colliders, x0, x1, z, o = {}) {
  const h = o.h ?? H;
  const type = o.type || 'mur';
  const couleur = o.couleur || MUR;
  const ep = 0.16;
  const porte = o.porte;

  const segments = [];
  if (porte) {
    segments.push([x0, porte.centre - porte.largeur / 2]);
    segments.push([porte.centre + porte.largeur / 2, x1]);
  } else {
    segments.push([x0, x1]);
  }

  for (const [a, b] of segments) {
    if (b - a < 0.05) continue;
    const cx = (a + b) / 2;
    const largeur = b - a;
    if (type === 'verre') {
      g.add(box(largeur, 0.9, ep, MUR_OMBRE, cx, SOL + 0.45, z));
      vitre(g, largeur, 2.42, 0.035, cx, SOL + 2.11, z);
      g.add(box(largeur, 0.08, 0.08, 0x24272b, cx, SOL + 3.36, z));
      g.add(box(largeur, 0.05, 0.07, 0x24272b, cx, SOL + 0.92, z));
      for (let x = a; x <= b + 0.01; x += Math.max(1.5, (b - a) / 3)) {
        g.add(box(0.06, 2.46, 0.06, 0x24272b, Math.min(x, b - 0.05), SOL + 2.12, z));
      }
    } else {
      g.add(box(largeur, h, ep, couleur, cx, SOL + h / 2, z));
    }
    colliders.push({ x: cx, z, hw: largeur / 2, hd: ep / 2 + 0.02 });
  }

  if (porte) {
    for (const cote of [-1, 1]) {
      const x = porte.centre + cote * (porte.largeur / 2 + 0.03);
      g.add(box(0.09, 2.45, 0.18, 0x24272b, x, SOL + 1.22, z));
    }
    g.add(box(porte.largeur + 0.2, 0.12, 0.18, 0x24272b, porte.centre, SOL + 2.42, z));
  }
}

function cloisonV(g, colliders, x, z0, z1, o = {}) {
  const h = o.h ?? H;
  const type = o.type || 'mur';
  const couleur = o.couleur || MUR;
  const ep = 0.16;
  const porte = o.porte;

  const segments = [];
  if (porte) {
    segments.push([z0, porte.centre - porte.largeur / 2]);
    segments.push([porte.centre + porte.largeur / 2, z1]);
  } else {
    segments.push([z0, z1]);
  }

  for (const [a, b] of segments) {
    if (b - a < 0.05) continue;
    const cz = (a + b) / 2;
    const prof = b - a;
    if (type === 'verre') {
      g.add(box(ep, 0.9, prof, MUR_OMBRE, x, SOL + 0.45, cz));
      vitre(g, 0.035, 2.42, prof, x, SOL + 2.11, cz);
      g.add(box(0.08, 0.08, prof, 0x24272b, x, SOL + 3.36, cz));
      for (let z = a; z <= b + 0.01; z += Math.max(1.5, (b - a) / 3)) {
        g.add(box(0.06, 2.46, 0.06, 0x24272b, x, SOL + 2.12, Math.min(z, b - 0.05)));
      }
    } else {
      g.add(box(ep, h, prof, couleur, x, SOL + h / 2, cz));
    }
    colliders.push({ x, z: cz, hw: ep / 2 + 0.02, hd: prof / 2 });
  }

  if (porte) {
    for (const cote of [-1, 1]) {
      const z = porte.centre + cote * (porte.largeur / 2 + 0.03);
      g.add(box(0.18, 2.45, 0.09, 0x24272b, x, SOL + 1.22, z));
    }
  }
}

// ---------------------------------------------------------------------------
// Étages : murs, bureaux nominatifs, noyau d'ascenseurs

function segmentsOuverture(a, b, ouverture) {
  if (!ouverture) return [[a, b]];
  return [
    [a, ouverture.centre - ouverture.largeur / 2],
    [ouverture.centre + ouverture.largeur / 2, b],
  ];
}

function cadreH(g, centre, z, largeur) {
  for (const cote of [-1, 1]) {
    g.add(box(0.1, 2.36, 0.2, 0x24272b, centre + cote * (largeur / 2 + 0.02), 1.18, z));
  }
  g.add(box(largeur + 0.24, 0.14, 0.2, 0x24272b, centre, 2.43, z));
}

function murEtageH(g, colliders, x0, x1, z, o = {}) {
  const h = o.h ?? 2.95;
  for (const [a, b] of segmentsOuverture(x0, x1, o.ouverture)) {
    if (b - a < 0.05) continue;
    const cx = (a + b) / 2;
    g.add(box(b - a, h, 0.14, o.couleur || MUR, cx, h / 2, z));
    colliders.push({ x: cx, z, hw: (b - a) / 2, hd: 0.09 });
  }
  if (o.ouverture) cadreH(g, o.ouverture.centre, z, o.ouverture.largeur);
}

function murEtageV(g, colliders, x, z0, z1, o = {}) {
  const h = o.h ?? 2.95;
  for (const [a, b] of segmentsOuverture(z0, z1, o.ouverture)) {
    if (b - a < 0.05) continue;
    const cz = (a + b) / 2;
    g.add(box(0.14, h, b - a, o.couleur || MUR, x, h / 2, cz));
    colliders.push({ x, z: cz, hw: 0.09, hd: (b - a) / 2 });
  }
}

function vitrineH(g, colliders, x0, x1, z, o = {}) {
  const h = o.h ?? 2.95;
  for (const [a, b] of segmentsOuverture(x0, x1, o.ouverture)) {
    if (b - a < 0.05) continue;
    const cx = (a + b) / 2;
    const w = b - a;
    g.add(box(w, 0.55, 0.14, 0xe8e1d4, cx, 0.275, z, { roughness: 0.92 }));
    vitre(g, w - 0.04, h - 0.95, 0.03, cx, 0.55 + (h - 0.95) / 2, z);
    g.add(box(w, 0.25, 0.16, 0x2a2d31, cx, h - 0.125, z));
    colliders.push({ x: cx, z, hw: w / 2, hd: 0.09 });
  }
  if (o.ouverture) cadreH(g, o.ouverture.centre, z, o.ouverture.largeur);
}

function vitrineV(g, colliders, x, z0, z1, o = {}) {
  const h = o.h ?? 2.95;
  for (const [a, b] of segmentsOuverture(z0, z1, o.ouverture)) {
    if (b - a < 0.05) continue;
    const cz = (a + b) / 2;
    const d = b - a;
    g.add(box(0.14, 0.55, d, 0xe8e1d4, x, 0.275, cz, { roughness: 0.92 }));
    vitre(g, 0.03, h - 0.95, d - 0.04, x, 0.55 + (h - 0.95) / 2, cz);
    g.add(box(0.16, 0.25, d, 0x2a2d31, x, h - 0.125, cz));
    colliders.push({ x, z: cz, hw: 0.09, hd: d / 2 });
  }
}

function tapisEtage(g, x, z, w, d) {
  g.add(box(w, 0.012, d, 0x2a2520, x, 0.006, z, { roughness: 1 }));
  g.add(box(w - 0.22, 0.005, d - 0.22, 0x3b342c, x, 0.012, z, { roughness: 1 }));
  for (const dz of [-d / 2 + 0.11, d / 2 - 0.11]) {
    g.add(box(w - 0.14, 0.004, 0.03, 0xc8a15c, x, 0.014, z + dz, { roughness: 0.5 }));
  }
}

function bureauNomme(g, modeles, colliders, portes, agents, pole, e, index, cx, largeur) {
  const zFront = 7.6;
  const x0 = cx - largeur / 2;
  const x1 = cx + largeur / 2;
  const agent = pole.agents[index];

  // Cloisons mitoyennes
  for (const x of [x0, x1]) {
    g.add(box(0.14, 2.95, 6.3, MUR, x, 1.475, 10.75, { roughness: 0.95 }));
    colliders.push({ x, z: 10.75, hw: 0.09, hd: 3.15 });
  }

  // Façade vitrée avec porte
  vitrineH(g, colliders, x0 + 0.07, x1 - 0.07, zFront, {
    ouverture: { centre: cx, largeur: 1.04 },
  });
  const porte = porteSimple(g, {
    centreX: cx,
    z: zFront,
    largeur: 1.0,
    hauteur: 2.3,
    sol: 0,
    teinte: 0x2a2d31,
  });
  porte.etage = e;
  porte.nom = agent.nom;
  portes.push(porte);
  colliders.push(porte.collider);

  // Nom lisible au-dessus de la porte
  plaqueNom(g, agent.nom, agent.poste, cx, 2.66, zFront - 0.12, PI, Math.min(1.7, largeur - 3.4));
  plaque(g, `${e}${String(index + 1).padStart(2, '0')}`, x1 - 0.55, 2.72, zFront - 0.12, PI, 0.62);

  // Bureau, siège, écran
  g.add(box(2.1, 0.08, 0.95, 0x3a2a20, cx, 0.75, 11.35, { roughness: 0.45 }));
  g.add(box(1.9, 0.02, 0.6, 0x211b17, cx, 0.8, 11.35, { roughness: 0.55 }));
  for (const cote of [-1, 1]) {
    g.add(box(0.1, 0.72, 0.85, 0x4a3526, cx + cote * 1.0, 0.36, 11.35, { roughness: 0.55 }));
  }
  poser(modeles, 'chaise', g, cx, 0, 12.35, PI);
  poser(modeles, 'ecran', g, cx - 0.05, 0.78, 11.15, PI);
  poser(modeles, 'portable', g, cx + 0.62, 0.8, 11.2, 0.15);
  poser(modeles, 'tasse', g, cx - 0.62, 0.8, 11.35, 0);
  poser(modeles, 'bibliotheque', g, x0 + 0.5, 0, 13.5, PI / 2);
  poser(modeles, 'planteHaute', g, x1 - 0.55, 0, 13.25, -0.4);
  tapisEtage(g, cx, 11.8, Math.min(3.6, largeur - 1.4), 2.6);
  tableauArt(g, cx, 1.95, 13.86, 0, 1.1, 0.7, ['#c8a15c', '#5f6f62', '#33373c'], 9000 + e * 10 + index);

  colliders.push({ x: cx, z: 11.35, hw: 1.05, hd: 0.5 });
  colliders.push({ x: cx, z: 12.35, r: 0.3, cercle: true });
  colliders.push({ x: x0 + 0.5, z: 13.5, hw: 0.35, hd: 1.1 });
  colliders.push({ x: x1 - 0.55, z: 13.25, r: 0.4, cercle: true });

  // L'agent travaille assis, sans déplacement
  const humain = agentProcedural(g, cx, 12.32, PI, true, 500 + e * 20 + index, 0);
  agents.push({
    nom: agent.nom,
    prenom: agent.nom.split(/\s+/)[0],
    poste: agent.poste,
    etat: agent.etat,
    index: 500 + e * 20 + index,
    etage: e,
    lieuId: pole.id,
    poleId: pole.id,
    lieu: pole.lieu,
    accent: pole.accent,
    groupe: humain.groupe,
    objet: humain.groupe,
    ancre: humain.ancre,
    bras: humain.bras,
    jambes: humain.jambes,
    sol: solEtage(e),
    porte,
    bureau: agent.nom,
  });
}

function salleReunionEtage(g, modeles, colliders, portes, pole, e) {
  // Cloisons vitrées
  vitrineH(g, colliders, -23.8, -9.2, -6.0, { ouverture: { centre: -16.2, largeur: 1.3 } });
  vitrineV(g, colliders, -9.2, -13.8, -6.0);
  const porte = porteDouble(g, {
    centreX: -16.2,
    z: -6.0,
    largeur: 1.26,
    hauteur: 2.3,
    sol: 0,
    teinte: 0x2a2d31,
  });
  porte.etage = e;
  portes.push(porte);
  colliders.push(porte.collider);
  plaqueNom(g, pole.pole, 'Salle de réunion', -16.2, 2.68, -5.9, 0, 2.4);

  // Table et chaises
  g.add(box(4.2, 0.09, 1.7, 0x3b2a20, -16.5, 0.75, -10, { roughness: 0.45 }));
  for (const dx of [-1.7, 0, 1.7]) {
    g.add(box(0.12, 0.7, 1.35, 0x24262a, -16.5 + dx, 0.36, -10, { roughness: 0.5 }));
  }
  for (let i = 0; i < 4; i++) {
    for (const cote of [-1, 1]) {
      poser(modeles, 'chaise', g, -17.85 + i * 0.9, 0, -10 + cote * 1.28, cote > 0 ? 0 : PI);
      colliders.push({ x: -17.85 + i * 0.9, z: -10 + cote * 1.28, r: 0.26, cercle: true });
    }
  }
  colliders.push({ x: -16.5, z: -10, hw: 2.1, hd: 0.85 });
  poser(modeles, 'television', g, -16.5, 1.9, -13.68, 0);
  g.add(box(2.0, 0.65, 0.4, 0x4a3526, -16.5, 0.33, -13.4, { roughness: 0.5 }));
  poser(modeles, 'planteHaute', g, -22.8, 0, -12.8, 0.4);
  poser(modeles, 'plantePot', g, -10.2, 0, -7.2, 0);
  colliders.push({ x: -22.8, z: -12.8, r: 0.4, cercle: true });
  colliders.push({ x: -16.5, z: -13.4, hw: 1.0, hd: 0.25 });
}

function pauseEtage(g, modeles, colliders) {
  vitrineH(g, colliders, 9.2, 23.8, -6.0, { ouverture: { centre: 16, largeur: 2.3 } });
  g.add(box(2.3, 0.25, 0.16, 0x2a2d31, 16, 2.825, -6.0));
  plaque(g, 'PAUSE', 16, 2.82, -5.88, 0, 1.2);

  // Comptoir le long de la façade est
  g.add(box(0.7, 0.94, 5.0, 0x2f2a24, 23.4, 0.47, -10.2, { roughness: 0.6 }));
  g.add(box(0.78, 0.06, 5.15, 0xf1ece1, 23.37, 0.97, -10.2, { roughness: 0.4 }));
  for (let i = 0; i < 3; i++) {
    g.add(box(0.45, 0.7, 1.4, 0x7a5a3a, 23.4, 1.62, -11.7 + i * 1.5, { roughness: 0.6 }));
  }
  poser(modeles, 'machineCafe', g, 23.3, 1.0, -11.9, -PI / 2);
  g.add(box(0.7, 1.9, 0.7, 0x9aa1a6, 23.4, 0.95, -7.9, { roughness: 0.4, metalness: 0.4 }));

  // Table conviviale
  g.add(box(2.8, 0.08, 1.1, 0xc79a63, 16.2, 0.76, -9.8, { roughness: 0.5 }));
  for (const dx of [-1.15, 1.15]) {
    g.add(box(0.1, 0.74, 0.9, 0x4a3526, 16.2 + dx, 0.37, -9.8));
  }
  for (let i = 0; i < 3; i++) {
    for (const dz of [-0.95, 0.95]) {
      poser(modeles, 'chaise', g, 15.3 + i * 0.9, 0, -9.8 + dz, dz > 0 ? 0 : PI);
    }
  }
  colliders.push({ x: 16.2, z: -9.8, hw: 1.45, hd: 0.6 });
  colliders.push({ x: 23.4, z: -10.2, hw: 0.42, hd: 2.55 });
  colliders.push({ x: 23.4, z: -7.9, hw: 0.4, hd: 0.4 });
  poser(modeles, 'planteHaute', g, 10.2, 0, -12.9, 0.4);
  poser(modeles, 'plantePot', g, 22.6, 0, -6.8, 0);
}

function wcEtage(g, modeles, colliders, portes, e) {
  murEtageH(g, colliders, -8.4, -4.8, 2.4);
  murEtageH(g, colliders, -8.4, -4.8, 6.4, { ouverture: { centre: -6.6, largeur: 0.88 } });
  murEtageV(g, colliders, -8.4, 2.4, 6.4);
  murEtageV(g, colliders, -4.8, 2.4, 6.4);
  const porte = porteSimple(g, {
    centreX: -6.6,
    z: 6.4,
    largeur: 0.84,
    hauteur: 2.1,
    sol: 0,
    teinte: 0x8f969b,
  });
  porte.etage = e;
  portes.push(porte);
  colliders.push(porte.collider);
  plaque(g, 'WC', -6.6, 2.61, 6.47, 0, 0.55);

  // Deux cabines et vasque
  for (let i = 0; i < 2; i++) {
    const x = -8.0 + i * 1.7;
    g.add(box(1.5, 2.0, 0.06, 0x8f969b, x + 0.75, 1.0, 5.6, { roughness: 0.55 }));
    g.add(box(0.06, 2.0, 1.3, 0x8f969b, x, 1.0, 4.9, { roughness: 0.55 }));
    g.add(cyl(0.2, 0.24, 0.42, 0xf3f2ee, x + 0.75, 0.22, 4.95, 14, { roughness: 0.35 }));
    g.add(box(0.36, 0.06, 0.5, 0xf3f2ee, x + 0.75, 0.43, 4.95, { roughness: 0.35 }));
  }
  g.add(box(2.0, 0.18, 0.55, 0xe8e5dc, -6.6, 0.92, 3.0, { roughness: 0.4 }));
  for (let i = 0; i < 2; i++) {
    g.add(cyl(0.17, 0.2, 0.1, 0xffffff, -7.2 + i * 1.15, 0.87, 3.0, 16, { roughness: 0.25 }));
    g.add(cyl(0.014, 0.014, 0.28, INOX, -7.2 + i * 1.15, 1.12, 2.9, 8, { metalness: 0.9, roughness: 0.2 }));
  }
  g.add(box(2.0, 0.9, 0.03, 0xbfe0e6, -6.6, 1.8, 2.48, { roughness: 0.06, metalness: 0.5 }));
}

function etagePole(g, modeles, colliders, portes, agents, pole, e) {
  // Sol et plafond de travail
  solPiece(g, -24, 24, -14, 14, texturePlancher(), 0xffffff, 0.006, { roughness: 0.72 });
  solPiece(g, -23.8, 23.8, -5.9, 7.4, textureTapis(0xb8b0a4), 0xffffff, 0.009, { roughness: 1 });
  tapisEtage(g, 0, 4.7, 6.8, 3.0);

  // Bureaux nominatifs du sud : un par agent
  const n = pole.agents.length;
  const largeur = n <= 3 ? 7.4 : 6.6;
  const total = n * largeur;
  for (let i = 0; i < n; i++) {
    const cx = -total / 2 + largeur * (i + 0.5);
    bureauNomme(g, modeles, colliders, portes, agents, pole, e, i, cx, largeur);
  }

  salleReunionEtage(g, modeles, colliders, portes, pole, e);
  pauseEtage(g, modeles, colliders);
  wcEtage(g, modeles, colliders, portes, e);

  // Salon central
  poser(modeles, 'canape', g, -1.7, 0, 4.7, PI / 2);
  poser(modeles, 'canape', g, 1.7, 0, 4.7, -PI / 2);
  poser(modeles, 'tableBasse', g, 0, 0, 4.7, 0);
  colliders.push({ x: -1.7, z: 4.7, hw: 0.5, hd: 1.05 });
  colliders.push({ x: 1.7, z: 4.7, hw: 0.5, hd: 1.05 });
  colliders.push({ x: 0, z: 4.7, r: 0.55, cercle: true });

  // Deux postes de passage à l'est
  for (const x of [12.4, 16.2]) {
    g.add(box(1.8, 0.74, 0.85, 0xe4dbca, x, 0.37, 2.2, { roughness: 0.5 }));
    g.add(box(1.7, 0.06, 0.7, 0x3a3e42, x, 0.77, 2.2));
    poser(modeles, 'ecran', g, x, 0.8, 2.0, PI);
    poser(modeles, 'chaise', g, x, 0, 1.3, PI);
    colliders.push({ x, z: 2.2, hw: 0.9, hd: 0.45 });
    colliders.push({ x, z: 1.3, r: 0.26, cercle: true });
  }

  // Plantes et bibliothèque d'étage
  for (const [x, z] of [[-11.6, -4.8], [11.6, 6.6], [-10.6, 6.8], [22.9, 1.2]]) {
    poser(modeles, 'planteHaute', g, x, 0, z, 0.3);
    colliders.push({ x, z, r: 0.42, cercle: true });
  }
  poser(modeles, 'bibliotheque', g, -22.9, 0, 2.6, PI / 2);

  // Bandes lumineuses
  for (const z of [-10.5, -2.2, 5.2]) {
    for (const x of [-12, 8, 18]) {
      const led = box(2.4, 0.04, 0.1, 0xf6fbff, x, 3.3, z);
      led.material = LED_BLANC;
      g.add(led);
    }
  }

  // Annuaire de l'étage près des ascenseurs
  const lignes = pole.agents.map((a, i) => ({
    gauche: `${e}${String(i + 1).padStart(2, '0')}`,
    droite: a.nom,
    detail: a.poste,
    accent: pole.accent,
  }));
  lignes.push({
    gauche: '—',
    droite: 'Ascenseur',
    detail: 'Accueil et direction au RDC',
    accent: '#c8a15c',
  });
  panneauListe(g, `ÉTAGE ${e}`, `${pole.pole} · ${pole.lieu}`, lignes, 2.45, 1.72, -4.44, PI, 1.5, 2.05);
}

// Noyau central : gaine sombre, portes d'ascenseur à chaque niveau.
function noyauTour(g, collidersEtages, portes) {
  const { x, z, demiW, demiD } = NOYAU;
  const hauteur = NOYAU_HAUT;
  const zf = z - demiD - 0.22;

  g.add(box(demiW * 2 + 0.4, hauteur, demiD * 2 + 0.4, 0x292c30, x, hauteur / 2, z, {
    roughness: 0.5,
    metalness: 0.18,
  }));
  for (const coteX of [-1, 1]) {
    for (const coteZ of [-1, 1]) {
      g.add(box(0.24, hauteur, 0.24, INOX, x + coteX * (demiW + 0.1), hauteur / 2, z + coteZ * (demiD + 0.1), {
        metalness: 0.75,
        roughness: 0.28,
      }));
    }
  }

  for (let e = 0; e <= ETAGES; e++) {
    const y = solEtage(e);
    // Bandeau métal de niveau
    g.add(box(demiW * 2 + 0.6, 0.12, demiD * 2 + 0.6, INOX, x, y + 0.06, z, {
      metalness: 0.7,
      roughness: 0.32,
    }));

    // Portes d'ascenseur, face nord
    g.add(box(3.1, 0.18, 0.26, INOX, x, y + 2.52, zf - 0.06, { metalness: 0.8, roughness: 0.3 }));
    for (const cote of [-1, 1]) {
      g.add(box(1.06, 2.36, 0.08, 0x3b4248, x + cote * 0.56, y + 1.18, zf, { metalness: 0.6, roughness: 0.36 }));
      g.add(box(0.03, 2.3, 0.09, 0x14171a, x + cote * 0.03, y + 1.15, zf - 0.01));
      g.add(box(0.08, 2.4, 0.14, 0x23272b, x + cote * 1.11, y + 1.2, zf - 0.04));
    }
    g.add(box(0.05, 2.3, 0.1, 0x101214, x, y + 1.16, zf - 0.02));

    // Numéro d'étage et bouton d'appel
    plaque(g, e === 0 ? 'RDC' : String(e).padStart(2, '0'), x - 2.45, y + 2.05, zf - 0.12, PI, 0.6);
    const bouton = box(0.1, 0.32, 0.06, 0xfff0cf, x + 1.85, y + 1.15, zf - 0.13);
    bouton.material = LED;
    g.add(bouton);

    collidersEtages[e].push({ x, z, hw: demiW + 0.32, hd: demiD + 0.32 });
  }
}

function lignesPlan(actifNiveau) {
  const lignes = [...POLES]
    .sort((a, b) => b.etage - a.etage)
    .map((p) => ({
      gauche: String(p.etage).padStart(2, '0'),
      droite: p.pole,
      detail: `${p.agents.length} agent${p.agents.length > 1 ? 's' : ''} · ${p.lieu}`,
      accent: p.accent,
      actif: actifNiveau === p.etage,
    }));
  lignes.push({
    gauche: 'RDC',
    droite: 'Accueil · Direction',
    detail: 'Salles · Pause · Parking · Parvis',
    accent: '#b08145',
    actif: actifNiveau === 0,
  });
  return lignes;
}

// ---------------------------------------------------------------------------
// Intérieurs

function poste(g, modeles, colliders, x, z, rot) {
  poser(modeles, 'bureau', g, x, SOL, z, rot);
  poser(modeles, 'chaise', g, x + Math.sin(rot) * 0.86, SOL, z + Math.cos(rot) * 0.86, rot + PI);
  poser(modeles, 'ecran', g, x - Math.sin(rot) * 0.2, SOL + 0.78, z - Math.cos(rot) * 0.2, rot + PI);
  poser(modeles, 'plantePot', g, x + Math.cos(rot) * 0.7, SOL, z - Math.sin(rot) * 0.7, rot);
  colliders.push({ x, z, hw: 0.8, hd: 0.42, rot });
  colliders.push({
    x: x + Math.sin(rot) * 0.86,
    z: z + Math.cos(rot) * 0.86,
    r: 0.26,
    cercle: true,
  });
}

function bureauDirection(g, modeles, colliders, agents) {
  // Bureau exécutif face au vitrage
  const x = -1.2;
  const z = 10.6;
  g.add(box(3.0, 0.08, 1.2, 0x3a2a20, x, SOL + 0.77, z, { roughness: 0.42 }));
  g.add(box(2.7, 0.015, 0.66, 0x211b17, x, SOL + 0.82, z, { roughness: 0.55 }));
  for (const cote of [-1, 1]) {
    g.add(box(0.12, 0.74, 1.0, 0x4a3526, x + cote * 1.3, SOL + 0.37, z, { roughness: 0.55 }));
  }
  g.add(box(2.2, 0.4, 0.5, 0x3a2a20, x, SOL + 0.36, z - 0.32, { roughness: 0.55 }));
  poser(modeles, 'fauteuil', g, x, SOL, z + 1.05, PI);
  poser(modeles, 'portable', g, x - 0.4, SOL + 0.84, z - 0.08, 0);
  poser(modeles, 'tasse', g, x + 0.64, SOL + 0.84, z + 0.14, 0);
  g.add(box(0.4, 0.26, 0.1, 0x24262a, x - 1.05, SOL + 0.96, z - 0.15));
  g.add(box(0.36, 0.22, 0.02, 0xdceef1, x - 1.05, SOL + 0.96, z - 0.1));
  const lampe = cyl(0.035, 0.05, 0.5, OR, x + 1.15, SOL + 1.05, z - 0.3, 8, { metalness: 0.8, roughness: 0.3 });
  g.add(lampe);
  g.add(cyl(0.16, 0.22, 0.18, 0xfff0cf, x + 1.15, SOL + 1.34, z - 0.3, 12));

  colliders.push({ x, z, hw: 1.5, hd: 0.62 });
  colliders.push({ x, z: z + 1.05, r: 0.4, cercle: true });

  // Fauteuils visiteurs
  for (const dx of [-0.85, 0.85]) {
    poser(modeles, 'fauteuil', g, x + dx, SOL, z - 1.25, 0);
    colliders.push({ x: x + dx, z: z - 1.25, r: 0.38, cercle: true });
  }

  // Le directeur général à son bureau, immobile
  const dg = agentProcedural(g, x, z + 1.12, PI, true, 400, SOL);
  agents.push({
    nom: DIRECTION.agent.nom,
    prenom: DIRECTION.agent.nom.split(/\s+/)[0],
    poste: DIRECTION.agent.poste,
    etat: DIRECTION.agent.etat,
    index: 400,
    etage: 0,
    lieuId: 'direction',
    poleId: 'direction',
    lieu: DIRECTION.lieu,
    accent: DIRECTION.accent,
    groupe: dg.groupe,
    objet: dg.groupe,
    ancre: dg.ancre,
    bras: dg.bras,
    jambes: dg.jambes,
    sol: SOL,
    porte: null,
    bureau: 'Direction Générale',
  });

  // Noms sur la porte du bureau
  plaque(g, 'LEPRINCE DZIEDJOM', 3, SOL + 2.66, 6.9, PI, 2.0);
  plaque(g, 'DIRECTION GÉNÉRALE', 5.1, SOL + 2.02, 6.9, PI, 1.45);

  // Mur de marbre noir et niche éclairée
  g.add(box(9.4, 3.5, 0.08, 0x17181a, 0.65, SOL + 1.75, 13.55, { roughness: 0.3 }));
  const marbre = new THREE.Mesh(new THREE.PlaneGeometry(9.3, 3.4), new THREE.MeshStandardMaterial({ map: textureMarbre(), roughness: 0.28 }));
  marbre.position.set(0.65, SOL + 1.75, 13.5);
  marbre.rotation.y = PI;
  g.add(marbre);
  g.add(box(4.3, 2.7, 0.26, 0x2a211a, 2.4, SOL + 1.55, 13.32, { roughness: 0.55 }));
  for (let i = 0; i < 3; i++) {
    g.add(box(3.9, 0.06, 0.22, 0xb08b52, 2.4, SOL + 0.64 + i * 0.72, 13.2, { roughness: 0.5 }));
  }
  for (let i = 0; i < 3; i++) {
    const led = box(3.7, 0.025, 0.05, 0xfff0cf, 2.4, SOL + 0.7 + i * 0.72, 13.1);
    led.material = LED;
    g.add(led);
    g.add(cyl(0.07, 0.09, 0.22, OR, 1.4 + i * 0.9, SOL + 0.78 + i * 0.72, 13.2, 10, { metalness: 0.85, roughness: 0.25 }));
  }

  // Lattes de bois côté ouest
  for (let i = 0; i < 26; i++) {
    g.add(box(0.07, 3.1, 0.14, 0x9c6d43, -8.28, SOL + 1.55, 7.4 + i * 0.24, { roughness: 0.7 }));
  }

  // Coin salon
  tapisLuxe(g, 3.4, 11.8, 3.2, 2.6);
  poser(modeles, 'canape', g, 5.15, SOL, 11.8, -PI / 2);
  poser(modeles, 'tableBasse', g, 3.2, SOL, 11.8, 0);
  poser(modeles, 'planteHaute', g, -7.3, SOL, 8.2, 0.3);
  poser(modeles, 'planteHaute', g, 5.2, SOL, 7.6, -0.4);
  poser(modeles, 'lampadaire', g, -7.1, SOL, 12.6, 0);
  colliders.push({ x: 5.15, z: 11.8, hw: 0.5, hd: 1.05 });
  colliders.push({ x: 3.2, z: 11.8, r: 0.55, cercle: true });

  tableauArt(g, 3.35, SOL + 2.2, 13.28, PI, 1.3, 1.0, ['#c8a15c', '#8f6f4a', '#3b3f45'], 551);
}

function accueil(g, modeles, colliders, figurants) {
  // Comptoir d'accueil en lattes de bois et marbre blanc
  const x = -6.6;
  const z = -9.2;
  g.add(box(0.92, 1.06, 3.9, 0x6f4a2c, x, SOL + 0.53, z, { roughness: 0.55 }));
  for (let i = 0; i < 16; i++) {
    g.add(box(0.08, 1.02, 0.1, 0xb08655, x + 0.5, SOL + 0.52, z - 1.85 + i * 0.235, { roughness: 0.6 }));
  }
  g.add(box(1.06, 0.09, 4.1, 0xf5f1e8, x, SOL + 1.1, z, { roughness: 0.5 }));
  g.add(box(0.9, 0.9, 3.7, 0xe7ddca, x - 0.72, SOL + 0.45, z, { roughness: 0.7 }));
  poser(modeles, 'ecran', g, x - 0.2, SOL + 1.16, z + 0.55, PI / 2);
  poser(modeles, 'plantePot', g, x + 0.1, SOL + 1.15, z + 1.6, 0);
  poser(modeles, 'tasse', g, x + 0.1, SOL + 1.16, z - 0.5, 0);
  colliders.push({ x, z, hw: 0.58, hd: 2.0 });

  // Mur de marbre noir + logo
  g.add(box(0.1, 3.6, 4.9, 0x17181a, -9.35, SOL + 1.8, -9, { roughness: 0.3 }));
  g.add(box(0.06, 3.5, 0.06, OR, -9.28, SOL + 1.78, -6.55));
  g.add(box(0.06, 3.5, 0.06, OR, -9.28, SOL + 1.78, -11.45));
  logoReception(g);

  // Banquette d'attente
  tapisLuxe(g, 5.6, -9, 3.8, 4.2);
  poser(modeles, 'canape', g, 7.9, SOL, -9, -PI / 2);
  poser(modeles, 'fauteuil', g, 4.1, SOL, -10.4, PI / 2);
  poser(modeles, 'fauteuil', g, 4.1, SOL, -7.6, PI / 2);
  poser(modeles, 'tableBasse', g, 5.9, SOL, -9, 0);
  poser(modeles, 'planteHaute', g, 8.5, SOL, -12.4, -0.5);
  poser(modeles, 'planteHaute', g, 8.5, SOL, -5.6, 0.4);
  poser(modeles, 'lampadaire', g, 2.6, SOL, -12.6, 0);
  colliders.push({ x: 7.9, z: -9, hw: 0.52, hd: 1.1 });
  colliders.push({ x: 4.1, z: -10.4, r: 0.4, cercle: true });
  colliders.push({ x: 4.1, z: -7.6, r: 0.4, cercle: true });
  colliders.push({ x: 5.9, z: -9, r: 0.6, cercle: true });

  tableauArt(g, 9.4, SOL + 2.3, -9.2, -PI / 2, 1.7, 1.15, ['#d8b878', '#7a6a55', '#2f3338'], 907);

  // Suspensions de l'accueil
  for (let i = 0; i < 3; i++) {
    const xp = -4 + i * 4;
    g.add(cyl(0.012, 0.012, 0.85, OR, xp, SOL + 3.92, -8.6, 6, { metalness: 0.8, roughness: 0.3 }));
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff3da, emissive: 0xffd49a, emissiveIntensity: 1.15, roughness: 0.4 })
    );
    globe.position.set(xp, SOL + 3.5, -8.6);
    g.add(globe);
  }

  // Réceptionniste
  const receptionniste = agentProcedural(g, -7.7, -9.2, PI / 2, true, 401, SOL);
  figurants.push({ groupe: receptionniste.groupe, bras: receptionniste.bras, jambes: receptionniste.jambes, decalage: 1.2, actif: true });

  // Deux visiteurs assis dans l'espace d'attente, immobiles
  const visiteurs = [
    { x: 7.4, z: -10.4, rot: PI / 2, index: 402 },
    { x: 7.4, z: -7.6, rot: PI / 2, index: 403 },
  ];
  for (const v of visiteurs) {
    const a = agentProcedural(g, v.x, v.z, v.rot, true, v.index, SOL);
    figurants.push({ groupe: a.groupe, bras: a.bras, jambes: a.jambes, decalage: 0, actif: false });
  }
}

function openSpace(g, modeles, colliders, figurants, felted) {
  const clusters = [
    { x: -15.7, z: -2.4, n: 2 },
    { x: 15.7, z: -2.4, n: 2 },
    { x: -6.2, z: 2.5, n: 2 },
    { x: 6.2, z: 2.5, n: 2 },
  ];
  let index = 0;
  for (const c of clusters) {
    for (let i = 0; i < c.n; i++) {
      for (let j = 0; j < 2; j++) {
        const x = c.x + (i - (c.n - 1) / 2) * 1.75;
        const z = c.z + (j === 0 ? -0.62 : 0.62);
        poste(g, modeles, colliders, x, z, j === 0 ? 0 : PI);
        index++;
      }
    }
    // Séparateur planté
    g.add(box(3.6, 0.52, 0.42, 0x9d7248, c.x, SOL + 0.26, c.z, { roughness: 0.62 }));
    g.add(box(3.45, 0.03, 0.34, 0x2b241d, c.x, SOL + 0.53, c.z));
    for (let k = 0; k < 7; k++) {
      const f = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 8, 6),
        mat(k % 2 ? 0x5d8a48 : 0x486f39, { roughness: 0.9 })
      );
      f.position.set(c.x - 1.45 + k * 0.5, SOL + 0.68 + (k % 3) * 0.08, c.z);
      g.add(f);
    }
    colliders.push({ x: c.x, z: c.z, hw: 1.8, hd: 0.24 });
  }

  // Cabines téléphoniques vitrées
  for (const x of [-18.3, 18.3]) {
    const z = 3;
    g.add(box(1.6, 0.14, 1.6, 0x2c2f33, x, SOL + 0.07, z, { roughness: 0.7 }));
    g.add(box(1.6, 2.5, 0.08, 0x22252a, x, SOL + 1.25, z + 0.76, { roughness: 0.5 }));
    g.add(box(0.08, 2.5, 1.5, 0x22252a, x + 0.76, SOL + 1.25, z, { roughness: 0.5 }));
    vitre(g, 1.4, 2.2, 0.04, x, SOL + 1.2, z - 0.74);
    g.add(box(0.06, 0.06, 1.4, 0x24272b, x, SOL + 2.4, z));
    g.add(box(1.0, 0.5, 0.34, BOIS, x - 0.1, SOL + 0.58, z + 0.2, { roughness: 0.6 }));
    colliders.push({ x, z, hw: 0.85, hd: 0.85 });
  }

  // Point courrier
  const cx = -12.35;
  g.add(box(0.34, 1.5, 3.4, 0xdcd4c5, cx, SOL + 0.75, 3.2, { roughness: 0.85 }));
  for (let i = 0; i < 3; i++) {
    g.add(box(0.28, 0.06, 3.0, 0x9d7248, cx + 0.04, SOL + 0.42 + i * 0.42, 3.2, { roughness: 0.6 }));
  }
  poser(modeles, 'imprimante', g, cx + 0.5, SOL + 0.75, 4.6, PI / 2);
  poser(modeles, 'caisse', g, cx + 0.6, SOL, 2, 0.2);
  colliders.push({ x: cx + 0.1, z: 3.2, hw: 0.3, hd: 1.7 });
}

function sallesReunion(g, modeles, colliders, portes) {
  for (const cote of [-1, 1]) {
    const cx = cote * 17;
    const nom = cote < 0 ? 'ATLANTIQUE' : 'INDIEN';
    const porte = porteDouble(g, {
      centreX: cx,
      z: -5.42,
      largeur: 1.26,
      hauteur: 2.35,
      sol: SOL,
      teinte: 0x2a2d31,
    });
    portes.push(porte);
    colliders.push(porte.collider);

    // Table de réunion
    g.add(box(4.0, 0.09, 1.6, 0x3b2a20, cx, SOL + 0.75, -9.8, { roughness: 0.45 }));
    for (const dx of [-1.7, 0, 1.7]) {
      g.add(box(0.12, 0.7, 1.3, 0x24262a, cx + dx, SOL + 0.36, -9.8, { roughness: 0.5 }));
    }
    for (let i = 0; i < 4; i++) {
      for (const c of [-1, 1]) {
        poser(modeles, 'chaise', g, cx - 1.35 + i * 0.9, SOL, -9.8 + c * 1.28, c > 0 ? 0 : PI);
        colliders.push({ x: cx - 1.35 + i * 0.9, z: -9.8 + c * 1.28, r: 0.26, cercle: true });
      }
    }
    colliders.push({ x: cx, z: -9.8, hw: 2.0, hd: 0.8 });

    poser(modeles, 'planteHaute', g, cx - 3.4, SOL, -12.6, 0.4);
    poser(modeles, 'plantePot', g, cx + 3.3, SOL, -6.4, 0);
    poser(modeles, 'television', g, cx, SOL + 1.9, -13.72, 0);
    g.add(box(2.0, 0.7, 0.4, 0x4a3526, cx, SOL + 0.35, -13.4, { roughness: 0.5 }));
    tableauArt(g, cx - 4.5, SOL + 2.2, -9.8, PI / 2, 1.0, 1.4, ['#c8a15c', '#5f7a6a', '#2f3338'], 300 + cote);
    plaque(g, nom, cx, SOL + 3.55, -5.28, 0, 1.15);
  }
}

function bureauxSud(g, modeles, colliders, portes) {
  const pieces = [
    { x0: -18, x1: -13.5, num: '101' },
    { x0: -13.5, x1: -8.5, num: '102' },
    { x0: -8.5, x1: 6, num: '200', direction: true },
    { x0: 6, x1: 10.5, num: '103' },
    { x0: 10.5, x1: 15, num: '104' },
    { x0: 15, x1: 19.5, num: '105' },
    { x0: 19.5, x1: 24, num: '106' },
  ];
  for (const p of pieces) {
    const cx = (p.x0 + p.x1) / 2;
    if (p.direction) continue;
    poste(g, modeles, colliders, cx, 11.1, PI);
    poser(modeles, 'fauteuil', g, cx + 1.15, SOL, 9.2, PI);
    poser(modeles, 'bibliotheque', g, p.x0 + 0.55, SOL, 13.45, PI / 2);
    poser(modeles, 'planteHaute', g, p.x1 - 0.7, SOL, 13.2, -0.4);
    tapisLuxe(g, cx, 11.2, 2.6, 2.0);
    colliders.push({ x: cx + 1.15, z: 9.2, r: 0.36, cercle: true });
    tableauArt(g, cx, SOL + 2.2, 13.82, 0, 1.1, 0.8, ['#b8a58a', '#6f7a6a', '#3b3f45'], 610 + p.x0);

    plaque(g, p.num, cx, SOL + 3.55, 7.18, PI, 0.72);
  }
}

function bureauxLateraux(g, modeles, colliders) {
  const pieces = [
    { x0: -24, x1: -19.6, z0: -5.4, z1: 0.2, num: '107', porteZ: -2.6 },
    { x0: -24, x1: -19.6, z0: 0.6, z1: 5.2, num: '108', porteZ: 2.9 },
    { x0: 19.6, x1: 24, z0: -5.4, z1: 0.2, num: '109', porteZ: -2.6 },
    { x0: 19.6, x1: 24, z0: 0.6, z1: 5.2, num: '110', porteZ: 2.9 },
  ];
  for (const p of pieces) {
    const cx = (p.x0 + p.x1) / 2;
    const cz = (p.z0 + p.z1) / 2;
    const est = p.x0 > 0;
    const rot = est ? -PI / 2 : PI / 2;
    poste(g, modeles, colliders, cx, cz, rot);
    poser(modeles, 'bibliotheque', g, est ? p.x1 - 0.45 : p.x0 + 0.45, SOL, p.z0 + 0.5, est ? -PI / 2 : PI / 2);
    poser(modeles, 'plantePot', g, cx, SOL, p.z1 - 0.55, 0);
    tapisLuxe(g, cx, cz, 3.6, 2.2);
    tableauArt(g, est ? p.x1 - 0.18 : p.x0 + 0.18, SOL + 2.2, cz, est ? -PI / 2 : PI / 2, 0.95, 0.75, ['#c8b79a', '#5f6f62', '#33373c'], 720 + p.num);

    plaque(g, p.num, est ? p.x0 + 0.1 : p.x1 - 0.1, SOL + 3.55, cz, est ? -PI / 2 : PI / 2, 0.72);
  }
}

function toilettes(g, modeles, colliders, x0, x1, z0, z1) {
  // Cloisons
  const cx = (x0 + x1) / 2;
  g.add(box(x1 - x0, 0.06, z1 - z0, 0xcfc9bd, cx, SOL + 3.1, (z0 + z1) / 2, { roughness: 0.9 }));

  // Deux cabines
  for (let i = 0; i < 2; i++) {
    const x = x0 + 0.4 + i * 1.65;
    g.add(box(1.5, 2.0, 0.06, 0x8f969b, x + 0.75, SOL + 1.0, z1 - 1.65, { roughness: 0.55 }));
    g.add(box(0.06, 2.0, 1.5, 0x8f969b, x, SOL + 1.0, z1 - 0.9, { roughness: 0.55 }));
    g.add(cyl(0.2, 0.24, 0.42, 0xf3f2ee, x + 0.75, SOL + 0.22, z1 - 0.75, 14, { roughness: 0.35 }));
    g.add(box(0.36, 0.06, 0.5, 0xf3f2ee, x + 0.75, SOL + 0.43, z1 - 0.75, { roughness: 0.35 }));
  }
  // Vasques et miroir
  g.add(box(2.4, 0.18, 0.55, 0xe8e5dc, x0 + 2.2, SOL + 0.92, z0 + 0.35, { roughness: 0.4 }));
  for (let i = 0; i < 2; i++) {
    g.add(cyl(0.17, 0.2, 0.1, 0xffffff, x0 + 1.55 + i * 1.15, SOL + 0.87, z0 + 0.35, 16, { roughness: 0.25 }));
    g.add(cyl(0.014, 0.014, 0.28, INOX, x0 + 1.55 + i * 1.15, SOL + 1.12, z0 + 0.2, 8, { metalness: 0.9, roughness: 0.2 }));
  }
  g.add(box(2.3, 1.0, 0.03, 0xbfe0e6, x0 + 2.2, SOL + 1.9, z0 + 0.06, { roughness: 0.06, metalness: 0.5 }));
  poser(modeles, 'plantePot', g, x1 - 0.55, SOL, z1 - 0.5, 0);

  // Rien à faire : le sol et les murs sont posés par les cloisons
  void colliders;
}

function pause(g, modeles, colliders) {
  // Comptoir le long du mur ouest
  g.add(box(0.7, 0.92, 6.2, 0x2f2a24, -23.45, SOL + 0.46, 10.2, { roughness: 0.6 }));
  g.add(box(0.78, 0.06, 6.35, 0xf1ece1, -23.42, SOL + 0.95, 10.2, { roughness: 0.4 }));
  for (let i = 0; i < 3; i++) {
    g.add(box(0.45, 0.7, 1.7, 0x7a5a3a, -23.45, SOL + 1.85, 7.6 + i * 1.9, { roughness: 0.6 }));
  }
  poser(modeles, 'machineCafe', g, -23.35, SOL + 0.98, 7.4, PI / 2);
  g.add(box(0.78, 2.0, 0.8, 0x9aa1a6, -23.45, SOL + 1.0, 13.1, { roughness: 0.4, metalness: 0.4 }));
  g.add(box(0.8, 0.04, 0.82, 0x2b2e31, -23.45, SOL + 1.6, 13.1));

  // Table conviviale
  g.add(box(2.8, 0.08, 1.1, 0xc79a63, -20.2, SOL + 0.76, 10.2, { roughness: 0.5 }));
  for (const dx of [-1.2, 1.2]) {
    g.add(box(0.1, 0.74, 0.9, 0x4a3526, -20.2 + dx, SOL + 0.37, 10.2));
  }
  for (let i = 0; i < 3; i++) {
    for (const dz of [-0.95, 0.95]) {
      poser(modeles, 'chaise', g, -21.1 + i * 0.9, SOL, 10.2 + dz, dz > 0 ? 0 : PI);
    }
  }
  colliders.push({ x: -20.2, z: 10.2, hw: 1.5, hd: 0.6 });
  colliders.push({ x: -23.45, z: 10.2, hw: 0.4, hd: 3.15 });

  // Mange-debout
  for (const z of [7.8, 12.2]) {
    g.add(cyl(0.4, 0.44, 0.08, 0xd9d1c2, -18.6, SOL + 1.05, z, 18, { roughness: 0.55 }));
    g.add(cyl(0.06, 0.06, 1.0, 0x2c2e31, -18.6, SOL + 0.5, z, 10, { metalness: 0.6, roughness: 0.4 }));
    for (const a of [0, 2.1, 4.2]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.06, 12), BOIS);
      s.position.set(-18.6 + Math.cos(a) * 0.75, SOL + 0.66, z + Math.sin(a) * 0.75);
      g.add(s);
      g.add(cyl(0.025, 0.025, 0.66, 0x2c2e31, -18.6 + Math.cos(a) * 0.75, SOL + 0.33, z + Math.sin(a) * 0.75, 8));
    }
    colliders.push({ x: -18.6, z, r: 0.95, cercle: true });
  }

  poser(modeles, 'planteHaute', g, -18.3, SOL, 13.2, 0.4);
  poser(modeles, 'plantePot', g, -18.4, SOL, 6.8, 0);
  for (let i = 0; i < 3; i++) {
    const led = box(2.0, 0.03, 0.06, 0xfff0cf, -20.4 + i * 2.2, SOL + 3.95, 10.2);
    led.material = LED;
    g.add(led);
  }
}

function interieur(g, modeles, colliders, portes, figurants, agents) {
  // Sols
  solPiece(g, -24, 24, -14, -5, textureTravertin(), 0xffffff, SOL + 0.004, { roughness: 0.7 });
  solPiece(g, -24, 24, -5, 5.2, texturePlancher(), 0xffffff, SOL + 0.004, { roughness: 0.72 });
  solPiece(g, -24, 24, 5.2, 7, textureTravertin(), 0xffffff, SOL + 0.004, { roughness: 0.72 });
  solPiece(g, -24, 24, 7, 14, textureTapis(0xb8b0a4), 0xffffff, SOL + 0.004, { roughness: 1 });
  for (const cote of [-1, 1]) {
    solPiece(g, cote < 0 ? -24 : 9.6, cote < 0 ? -9.6 : 24, -14, -5.5, textureTapis(0x8f8a80), 0xffffff, SOL + 0.006, { roughness: 1 });
  }
  solPiece(g, -24, -18, 7, 14, textureTerrazzo(), 0xffffff, SOL + 0.006, { roughness: 0.8 });
  solPiece(g, -8.5, 6, 7, 14, textureTapis(0xa79c8b), 0xffffff, SOL + 0.006, { roughness: 1 });
  solPiece(g, -16.2, -12.2, 0.4, 5.2, textureCarrelage(), 0xffffff, SOL + 0.006, { roughness: 0.45 });
  solPiece(g, 12.2, 16.2, 0.4, 5.2, textureCarrelage(), 0xffffff, SOL + 0.006, { roughness: 0.45 });

  // Tapis de l'accueil
  tapisLuxe(g, 0, -9.2, 5.6, 6.0);

  // Cloisons
  cloisonV(g, colliders, -9.6, -14, -5.5, { type: 'verre' });
  cloisonV(g, colliders, 9.6, -14, -5.5, { type: 'verre' });
  cloisonH(g, colliders, -24, -9.6, -5.5, { type: 'verre', porte: { centre: -17, largeur: 1.3 } });
  cloisonH(g, colliders, 9.6, 24, -5.5, { type: 'verre', porte: { centre: 17, largeur: 1.3 } });
  g.add(box(19.2, 0.32, 0.4, MUR, 0, SOL + H - 0.16, -5.2));

  // Bureaux côté ouest et est
  for (const cote of [-1, 1]) {
    const x = cote * 19.6;
    cloisonH(g, colliders, cote < 0 ? -24 : 19.6, cote < 0 ? -19.6 : 24, -5.4);
    cloisonH(g, colliders, cote < 0 ? -24 : 19.6, cote < 0 ? -19.6 : 24, 0.2);
    cloisonH(g, colliders, cote < 0 ? -24 : 19.6, cote < 0 ? -19.6 : 24, 0.6);
    cloisonH(g, colliders, cote < 0 ? -24 : 19.6, cote < 0 ? -19.6 : 24, 5.2);
    cloisonV(g, colliders, x, -5.4, 0.2, { type: 'verre', porte: { centre: -2.6, largeur: 1.1 } });
    cloisonV(g, colliders, x, 0.6, 5.2, { type: 'verre', porte: { centre: 2.9, largeur: 1.1 } });
  }

  // Blocs sanitaires
  cloisonH(g, colliders, -16.2, -12.2, 0.4, { porte: { centre: -14.2, largeur: 0.98 } });
  cloisonH(g, colliders, -16.2, -12.2, 5.2);
  cloisonV(g, colliders, -16.2, 0.4, 5.2);
  cloisonV(g, colliders, -12.2, 0.4, 5.2);
  cloisonH(g, colliders, 12.2, 16.2, 0.4, { porte: { centre: 14.2, largeur: 0.98 } });
  cloisonH(g, colliders, 12.2, 16.2, 5.2);
  cloisonV(g, colliders, 12.2, 0.4, 5.2);
  cloisonV(g, colliders, 16.2, 0.4, 5.2);

  // Bandeau sud : murs vitrés des bureaux et salle de pause
  const bandeau = [
    { x0: -24, x1: -18, porte: -21, type: 'mur', num: null },
    { x0: -18, x1: -13.5, porte: -15.75, type: 'verre', num: '101' },
    { x0: -13.5, x1: -8.5, porte: -11.05, type: 'verre', num: '102' },
    { x0: -8.5, x1: 6, porte: 3, type: 'verre', num: null, direction: true },
    { x0: 6, x1: 10.5, porte: 8.25, type: 'verre', num: '103' },
    { x0: 10.5, x1: 15, porte: 12.75, type: 'verre', num: '104' },
    { x0: 15, x1: 19.5, porte: 17.25, type: 'verre', num: '105' },
    { x0: 19.5, x1: 24, porte: 21.75, type: 'verre', num: '106' },
  ];
  for (const b of bandeau) {
    cloisonH(g, colliders, b.x0, b.x1, 7, {
      type: b.type,
      porte: { centre: b.porte, largeur: b.direction ? 1.5 : 1.1 },
    });
  }

  // Direction : porte à galandage
  const porteDir = porteDouble(g, { centreX: 3, z: 7, largeur: 1.5, hauteur: 2.3, sol: SOL, teinte: 0x2a2d31 });
  portes.push(porteDir);
  colliders.push(porteDir.collider);

  // Cloisons entre les bureaux du sud
  for (const x of [-18, -13.5, -8.5, 6, 10.5, 15, 19.5]) {
    cloisonV(g, colliders, x, 7, 14);
  }

  // Moquette de la direction
  tapisLuxe(g, -1.2, 10.4, 5.2, 4.2);

  // Mobilier
  accueil(g, modeles, colliders, figurants);
  openSpace(g, modeles, colliders, figurants);
  sallesReunion(g, modeles, colliders, portes);
  bureauDirection(g, modeles, colliders, agents);
  bureauxSud(g, modeles, colliders, portes);
  bureauxLateraux(g, modeles, colliders);
  toilettes(g, modeles, colliders, -16.2, -12.2, 0.4, 5.2);
  toilettes(g, modeles, colliders, 12.2, 16.2, 0.4, 5.2);
  pause(g, modeles, colliders);

  // Plan du bâtiment : au hall et devant les ascenseurs
  g.add(box(0.55, 0.38, 0.36, 0x202327, 5.6, 0.19, -6.8, { roughness: 0.5 }));
  panneauListe(g, 'PLAN DES ÉTAGES', 'LePrince Headquarters', lignesPlan(0), 5.6, 1.58, -6.8, PI, 1.7, 2.3);
  g.add(box(1.9, 0.06, 0.5, OR, 5.6, 2.76, -6.8));
  colliders.push({ x: 5.6, z: -6.8, hw: 0.95, hd: 0.14 });
  panneauListe(g, 'PLAN DES ÉTAGES', 'LePrince Headquarters', lignesPlan(0), 2.45, 1.72, -4.44, PI, 1.5, 2.05);

  // Plafonds feutrés de l'open-space
  const r = graine(8821);
  for (let ix = 0; ix < 7; ix++) {
    for (let iz = 0; iz < 3; iz++) {
      const x = -16.2 + ix * 5.4 + (r() - 0.5) * 1.4;
      const z = -3.6 + iz * 3.8 + (r() - 0.5) * 1.0;
      if (x > -16.5 && x < -12 && z > 0.2) continue;
      if (x > 12 && x < 16.5 && z > 0.2) continue;
      if (Math.abs(x) < 2.2) continue;
      panneauFeutre(g, x, z, 1.9 + r() * 0.9, r() * TAU);
    }
  }

  // Lattes de bois du hall (sous le plafond du RDC)
  for (let i = 0; i < 11; i++) {
    g.add(box(0.16, 0.3, 8.4, 0xa9784a, -7.5 + i * 1.5, SOL + 4.02, -9.5, { roughness: 0.62 }));
  }
  for (let i = 0; i < 4; i++) {
    const led = box(0.05, 0.05, 7.8, 0xfff0cf, -6 + i * 4, SOL + 3.9, -9.5);
    led.material = LED;
    g.add(led);
  }

  // Luminaires linéaires des bureaux
  for (const x of [-21, -15.75, -11, 8.25, 12.75, 17.25, 21.75]) {
    const led = box(1.9, 0.03, 0.09, 0xf6fbff, x, SOL + 4.1, 10.5);
    led.material = LED_BLANC;
    led.castShadow = false;
    g.add(led);
  }
  for (const z of [-9, -2, 3]) {
    for (const x of [-8, 8]) {
      const led = box(0.09, 0.03, 3.0, 0xf6fbff, x, SOL + 4.1, z);
      led.material = LED_BLANC;
      led.castShadow = false;
      g.add(led);
    }
  }

  // Plantes d'ambiance
  poser(modeles, 'planteHaute', g, -3.4, SOL, -13.2, 0.3);
  poser(modeles, 'planteHaute', g, 3.4, SOL, -13.2, -0.3);
  poser(modeles, 'planteHaute', g, -8.4, SOL, 5.9, 0.5);
  poser(modeles, 'planteHaute', g, 8.4, SOL, 5.9, -0.5);
  poser(modeles, 'planteHaute', g, -19, SOL, -5, 0.2);
  poser(modeles, 'planteHaute', g, 19, SOL, -5, -0.2);

  // Le personnel du RDC est statique : réceptionniste, visiteurs et direction.
  // Aucun agent ne déambule : plus de vies simulées.

  // Corniches lumineuses : deux lignes continues dessinent le volume du hall.
  for (const z of [-13.7, -5.8]) {
    g.add(box(46.4, 0.16, 0.22, 0x2a2d31, 0, SOL + 4.09, z, { roughness: 0.6 }));
    const led = box(46.0, 0.03, 0.05, 0xfff0cf, 0, SOL + 3.995, z + (z < -9 ? 0.12 : -0.12));
    led.material = LED;
    led.castShadow = false;
    g.add(led);
  }

  // Downlights encastrés au-dessus de l'accueil et de l'espace d'attente.
  const geoSpot = new THREE.CylinderGeometry(0.1, 0.1, 0.025, 12);
  for (const x of [-12, -6, 0, 6, 12]) {
    for (const z of [-12.6, -8.2]) {
      const s = new THREE.Mesh(geoSpot, LED_BLANC);
      s.position.set(x, SOL + 4.17, z);
      s.castShadow = false;
      g.add(s);
    }
  }

  // Éclairage intérieur
  const lumieres = [
    { x: 0, y: SOL + 4.6, z: -9, i: 70, d: 24 },
    { x: -11.5, y: SOL + 3.8, z: -1, i: 46, d: 20 },
    { x: 11.5, y: SOL + 3.8, z: -1, i: 46, d: 20 },
    { x: -1.2, y: SOL + 3.6, z: 10.4, i: 42, d: 16 },
    { x: -20, y: SOL + 3.6, z: 10.4, i: 38, d: 16 },
    { x: 0, y: SOL + 3.4, z: -17.2, i: 34, d: 14 },
  ];
  for (const l of lumieres) {
    const pl = new THREE.PointLight(0xffe5bd, l.i, l.d, 2);
    pl.position.set(l.x, l.y, l.z);
    g.add(pl);
  }
}

// ---------------------------------------------------------------------------
// Assemblage

export function construireSiege(ile, modeles) {
  const g = new THREE.Group();
  g.position.set(0, 0, 64);
  ile.add(g);

  const colliders = [];
  const collidersEtages = [colliders];
  const portes = [];
  const figurants = [];
  const agents = [];
  const groupesEtages = [];

  construireParvis(g, colliders, portes, modeles);
  enveloppe(g, colliders, portes, modeles);

  // RDC : toujours visible, y compris depuis le parc
  const rdc = new THREE.Group();
  g.add(rdc);
  interieur(rdc, modeles, colliders, portes, figurants, agents);
  groupesEtages[0] = rdc;

  // Un étage par pôle
  for (const pole of POLES) {
    const e = pole.etage;
    const sol = solEtage(e);
    const groupe = new THREE.Group();
    groupe.position.y = sol;
    g.add(groupe);
    groupesEtages[e] = groupe;

    const collidersEtage = [
      { x: 0, z: -14, hw: 24, hd: 0.2 },
      { x: 0, z: 14, hw: 24, hd: 0.2 },
      { x: -24, z: 0, hw: 0.2, hd: 14 },
      { x: 24, z: 0, hw: 0.2, hd: 14 },
    ];
    collidersEtages[e] = collidersEtage;
    etagePole(groupe, modeles, collidersEtage, portes, agents, pole, e);
    groupe.visible = false;
  }

  // Noyau d'ascenseurs traversant tous les niveaux
  noyauTour(g, collidersEtages, portes);

  for (const porte of portes) {
    if (porte.etage === undefined) porte.etage = 0;
  }

  // Deux lumières partagées, repositionnées sur l'étage courant
  const lumieres = [];
  for (const l of [{ x: -10, z: 1.5 }, { x: 10, z: 1.5 }]) {
    const pl = new THREE.PointLight(0xffe5bd, 12, 20, 2);
    pl.position.set(l.x, solEtage(0) + 2.55, l.z);
    g.add(pl);
    lumieres.push(pl);
  }

  const etages = [
    {
      niveau: 0,
      id: 'siege',
      pole: 'Accueil & Direction',
      sous: 'RDC · Accueil · Direction · Salles · Pause',
      accent: '#b08145',
      nbAgents: 1,
    },
    ...POLES.map((p) => ({
      niveau: p.etage,
      id: p.id,
      pole: p.pole,
      sous: `${p.lieu} · ${p.agents.length} agent${p.agents.length > 1 ? 's' : ''}`,
      accent: p.accent,
      nbAgents: p.agents.length,
    })),
  ];

  const zone = new THREE.Mesh(
    new THREE.BoxGeometry(53, 41, 33),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  );
  zone.position.set(0, 20.5, 0);
  zone.userData.poleId = 'siege';
  g.add(zone);

  const ancreLieu = new THREE.Object3D();
  ancreLieu.position.set(0, 42.5, 0);
  g.add(ancreLieu);

  g.traverse((o) => {
    if (o.isMesh && !o.material?.transparent) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    spec: SIEGE,
    groupe: g,
    zone,
    ancreLieu,
    colliders,
    collidersEtages,
    portes,
    figurants,
    agents,
    etages,
    groupesEtages,
    lumieres,
    solEtage,
    ascenseur: { x: 0, z: -5.6, rayon: 2.2 },
    bati: {
      demiW: 25.2,
      demiD: 15.2,
      sol: SOL,
      dalle: { type: 'boite', demiW: 32, demiD: 40, y: 0.04 },
    },
  };
}
