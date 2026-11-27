import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { graine } from './core.js';

// ---------------------------------------------------------------------------
// Paliers de qualité
// « ?qualite=mobile|moyen|eleve » force un palier pour les tests.

const PROFILS = {
  mobile: { nom: 'mobile', dpr: 1.25, ombre: 1024, ssao: false, bloom: false, aniso: 4, tuile: 3 },
  moyen: { nom: 'moyen', dpr: 1.4, ombre: 2048, ssao: false, bloom: true, aniso: 4, tuile: 2.6 },
  eleve: { nom: 'eleve', dpr: 1.75, ombre: 4096, ssao: true, bloom: true, aniso: 8, tuile: 2.6 },
};

export function detecterQualite() {
  const demande = new URLSearchParams(location.search).get('qualite');
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
  const coeurs = navigator.hardwareConcurrency || 4;
  const memoire = navigator.deviceMemory || 8;
  const base =
    PROFILS[demande] ||
    (mobile ? PROFILS.mobile : coeurs >= 6 && memoire >= 8 ? PROFILS.eleve : PROFILS.moyen);
  return { ...base, dpr: Math.min(window.devicePixelRatio || 1, base.dpr) };
}

let ANISO = 4;

export function reglerAnisotropie(renderer, qualite) {
  ANISO = Math.min(qualite ? qualite.aniso : 8, renderer.capabilities.getMaxAnisotropy());
}

// ---------------------------------------------------------------------------
// Environnement : HDRI CC0 (Poly Haven) converti en IBL, repli procédural.

function environnementProcedural(renderer) {
  const toile = document.createElement('canvas');
  toile.width = 1024;
  toile.height = 512;
  const ctx = toile.getContext('2d');

  const degrade = ctx.createLinearGradient(0, 0, 0, 512);
  degrade.addColorStop(0, '#6fa9d4');
  degrade.addColorStop(0.36, '#a5cbe4');
  degrade.addColorStop(0.5, '#dfeaf3');
  degrade.addColorStop(0.57, '#f2e8d5');
  degrade.addColorStop(0.8, '#cdbb9c');
  degrade.addColorStop(1, '#9c8e72');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 1024, 512);

  const halo = ctx.createRadialGradient(255, 145, 10, 255, 145, 230);
  halo.addColorStop(0, 'rgba(255, 251, 232, .95)');
  halo.addColorStop(0.35, 'rgba(255, 246, 216, .4)');
  halo.addColorStop(1, 'rgba(255, 246, 216, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 1024, 512);

  const texture = new THREE.CanvasTexture(toile);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cible = pmrem.fromEquirectangular(texture).texture;
  pmrem.dispose();
  texture.dispose();
  return cible;
}

export function installerEnvironnement(renderer, scene, url = './assets/env/ciel_puresky_1k.hdr') {
  scene.environment = environnementProcedural(renderer);
  scene.userData.hdri = false;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  return new RGBELoader()
    .loadAsync(url)
    .then((hdri) => {
      scene.environment = pmrem.fromEquirectangular(hdri).texture;
      scene.userData.hdri = true;
      hdri.dispose();
    })
    .catch((err) => {
      console.warn('HDRI indisponible, environnement procédural conservé :', err);
    })
    .finally(() => pmrem.dispose());
}

// ---------------------------------------------------------------------------
// Bibliothèque de surfaces PBR procédurales.
// Les albédos restent clairs et neutres : la couleur de la pièce les teinte,
// ce qui préserve la palette existante tout en ajoutant matière et relief.

const TAU = Math.PI * 2;

function toileSurface(taille) {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  return c;
}

function semis(ctx, r, nombre, taille, couleurs, alphaMin, alphaMax, rMin = 0.4, rMax = 1.7) {
  for (let i = 0; i < nombre; i++) {
    ctx.fillStyle = couleurs[Math.floor(r() * couleurs.length)];
    ctx.globalAlpha = alphaMin + r() * (alphaMax - alphaMin);
    ctx.beginPath();
    ctx.arc(r() * taille, r() * taille, rMin + r() * (rMax - rMin), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function nuages(ctx, r, nombre, taille, teinte, alpha) {
  for (let i = 0; i < nombre; i++) {
    const x = r() * taille;
    const y = r() * taille;
    const rayon = taille * (0.06 + r() * 0.22);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rayon);
    g.addColorStop(0, `rgba(${teinte}, ${alpha * (0.4 + r() * 0.6)})`);
    g.addColorStop(1, `rgba(${teinte}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rayon, y - rayon, rayon * 2, rayon * 2);
  }
}

function surfaceBeton(taille = 512) {
  const r = graine(101);
  const albedo = toileSurface(taille);
  const a = albedo.getContext('2d');
  a.fillStyle = '#f3f1ed';
  a.fillRect(0, 0, taille, taille);
  nuages(a, r, 16, taille, '126,118,106', 0.05);
  nuages(a, r, 10, taille, '255,255,252', 0.06);
  semis(a, r, 6200, taille, ['#6f6a62', '#8d877d', '#ffffff'], 0.02, 0.07, 0.4, 1.3);
  for (let i = 0; i < 300; i++) {
    a.fillStyle = `rgba(96, 90, 80, ${0.06 + r() * 0.1})`;
    a.beginPath();
    a.arc(r() * taille, r() * taille, 0.6 + r() * 1.5, 0, TAU);
    a.fill();
  }

  const hauteur = toileSurface(taille);
  const h = hauteur.getContext('2d');
  h.fillStyle = '#808080';
  h.fillRect(0, 0, taille, taille);
  nuages(h, r, 14, taille, '40,40,40', 0.12);
  semis(h, r, 5200, taille, ['#585858', '#a8a8a8'], 0.06, 0.2, 0.5, 1.4);
  for (let i = 0; i < 340; i++) {
    h.fillStyle = 'rgba(30, 30, 30, 0.45)';
    h.beginPath();
    h.arc(r() * taille, r() * taille, 0.5 + r() * 1.3, 0, TAU);
    h.fill();
  }

  const rugosite = toileSurface(taille);
  const g = rugosite.getContext('2d');
  g.fillStyle = '#d7d7d7';
  g.fillRect(0, 0, taille, taille);
  nuages(g, r, 12, taille, '170,170,170', 0.18);
  semis(g, r, 3200, taille, ['#c2c2c2', '#e8e8e8'], 0.05, 0.16);

  return { albedo, hauteur, rugosite, pente: 2.2, relief: 0.85, tuile: 2.6, metalness: 0 };
}

function surfaceTravertin(taille = 512) {
  const r = graine(442);
  const albedo = toileSurface(taille);
  const a = albedo.getContext('2d');
  a.fillStyle = '#f6f1e5';
  a.fillRect(0, 0, taille, taille);
  for (let i = 0; i < 22; i++) {
    const y = r() * taille;
    a.fillStyle = `rgba(196, 174, 138, ${0.03 + r() * 0.05})`;
    a.fillRect(0, y, taille, 1 + r() * 6);
  }
  for (let i = 0; i < 150; i++) {
    const y = r() * taille;
    a.strokeStyle = `rgba(154, 132, 100, ${0.03 + r() * 0.05})`;
    a.lineWidth = 0.5 + r() * 1.1;
    a.beginPath();
    a.moveTo(0, y);
    a.bezierCurveTo(taille * 0.35, y + (r() - 0.5) * 5, taille * 0.7, y + (r() - 0.5) * 5, taille, y);
    a.stroke();
  }
  for (let i = 0; i < 460; i++) {
    a.fillStyle = `rgba(126, 106, 78, ${0.05 + r() * 0.08})`;
    a.beginPath();
    a.ellipse(r() * taille, r() * taille, 1 + r() * 5, 0.6 + r() * 1.8, r() * TAU, 0, TAU);
    a.fill();
  }

  const hauteur = toileSurface(taille);
  const h = hauteur.getContext('2d');
  h.fillStyle = '#8a8a8a';
  h.fillRect(0, 0, taille, taille);
  for (let i = 0; i < 40; i++) {
    const y = r() * taille;
    h.fillStyle = `rgba(70, 70, 70, ${0.15 + r() * 0.25})`;
    h.fillRect(0, y, taille, 1 + r() * 4);
  }
  for (let i = 0; i < 520; i++) {
    h.fillStyle = 'rgba(38, 38, 38, 0.55)';
    h.beginPath();
    h.ellipse(r() * taille, r() * taille, 1 + r() * 5, 0.6 + r() * 1.8, r() * TAU, 0, TAU);
    h.fill();
  }
  semis(h, r, 2600, taille, ['#6a6a6a', '#a2a2a2'], 0.05, 0.14);

  const rugosite = toileSurface(taille);
  const g = rugosite.getContext('2d');
  g.fillStyle = '#cfcfcf';
  g.fillRect(0, 0, taille, taille);
  for (let i = 0; i < 460; i++) {
    g.fillStyle = `rgba(232, 232, 232, ${0.1 + r() * 0.25})`;
    g.beginPath();
    g.ellipse(r() * taille, r() * taille, 1 + r() * 5, 0.6 + r() * 1.8, r() * TAU, 0, TAU);
    g.fill();
  }
  semis(g, r, 2400, taille, ['#bebebe', '#e4e4e4'], 0.05, 0.14);

  return { albedo, hauteur, rugosite, pente: 3, relief: 1, tuile: 2.2, metalness: 0 };
}

// Travertin de façade : grands panneaux 1,2 × 1,2 m, joints creusés et légère
// variation de teinte d'un panneau à l'autre. C'est ce qui casse l'aplat blanc
// des allèges et des piliers de la tour.
function surfaceFacade(taille = 512) {
  const r = graine(772);
  const albedo = toileSurface(taille);
  const a = albedo.getContext('2d');
  a.fillStyle = '#eee4d2';
  a.fillRect(0, 0, taille, taille);
  const demi = taille / 2;
  for (let py = 0; py < 2; py++) {
    for (let px = 0; px < 2; px++) {
      a.fillStyle = `rgba(${208 + Math.floor(r() * 34)}, ${196 + Math.floor(r() * 30)}, ${
        172 + Math.floor(r() * 30)
      }, ${0.18 + r() * 0.16})`;
      a.fillRect(px * demi, py * demi, demi, demi);
    }
  }
  for (let i = 0; i < 26; i++) {
    const y = r() * taille;
    a.fillStyle = `rgba(188, 166, 130, ${0.03 + r() * 0.05})`;
    a.fillRect(0, y, taille, 1 + r() * 5);
  }
  for (let i = 0; i < 120; i++) {
    const y = r() * taille;
    a.strokeStyle = `rgba(146, 124, 94, ${0.03 + r() * 0.05})`;
    a.lineWidth = 0.5 + r();
    a.beginPath();
    a.moveTo(0, y);
    a.bezierCurveTo(taille * 0.35, y + (r() - 0.5) * 4, taille * 0.7, y + (r() - 0.5) * 4, taille, y);
    a.stroke();
  }
  semis(a, r, 3200, taille, ['#93815f', '#ffffff', '#c8b696'], 0.02, 0.07, 0.4, 1.4);

  const hauteur = toileSurface(taille);
  const h = hauteur.getContext('2d');
  h.fillStyle = '#9c9c9c';
  h.fillRect(0, 0, taille, taille);
  semis(h, r, 3600, taille, ['#6a6a6a', '#c8c8c8'], 0.04, 0.14, 0.4, 1.5);
  for (let i = 0; i < 26; i++) {
    h.fillStyle = `rgba(70, 70, 70, ${0.12 + r() * 0.2})`;
    h.fillRect(0, r() * taille, taille, 1 + r() * 3);
  }

  const rugosite = toileSurface(taille);
  const g = rugosite.getContext('2d');
  g.fillStyle = '#c6c6c6';
  g.fillRect(0, 0, taille, taille);
  semis(g, r, 2600, taille, ['#b2b2b2', '#dedede'], 0.05, 0.16);

  // Joints : rainure sombre + chanfrein clair, tous les demi-tuiles.
  for (const c of [h, g]) {
    c.fillStyle = c === h ? '#3c3c3c' : '#f4f4f4';
    c.fillRect(0, 0, taille, 3);
    c.fillRect(0, 0, 3, taille);
    c.fillRect(0, demi - 1, taille, 3);
    c.fillRect(demi - 1, 0, 3, taille);
  }
  a.fillStyle = 'rgba(118, 101, 76, 0.55)';
  a.fillRect(0, 0, taille, 2);
  a.fillRect(0, 0, 2, taille);
  a.fillRect(0, demi - 1, taille, 2);
  a.fillRect(demi - 1, 0, 2, taille);
  a.fillStyle = 'rgba(255, 252, 244, 0.35)';
  a.fillRect(0, 2, taille, 1);
  a.fillRect(2, 0, 1, taille);

  return { albedo, hauteur, rugosite, pente: 2.6, relief: 0.9, tuile: 2.4, metalness: 0 };
}

function surfacePierre(taille = 512) {
  const r = graine(91);
  const pas = taille / 4;
  const albedo = toileSurface(taille);
  const a = albedo.getContext('2d');
  a.fillStyle = '#f4f1e9';
  a.fillRect(0, 0, taille, taille);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      a.fillStyle = `rgba(120, 108, 88, ${0.01 + r() * 0.035})`;
      a.fillRect(x * pas, y * pas, pas, pas);
    }
  }
  a.fillStyle = 'rgba(96, 86, 70, 0.22)';
  for (let y = 0; y <= 4; y++) a.fillRect(0, y * pas - 1, taille, 2);
  for (let x = 0; x <= 4; x++) a.fillRect(x * pas - 1, 0, 2, taille);
  semis(a, r, 3400, taille, ['#8c8478', '#ffffff', '#a89e8c'], 0.02, 0.06, 0.4, 1.3);

  const hauteur = toileSurface(taille);
  const h = hauteur.getContext('2d');
  h.fillStyle = '#8c8c8c';
  h.fillRect(0, 0, taille, taille);
  h.fillStyle = '#3a3a3a';
  for (let y = 0; y <= 4; y++) h.fillRect(0, y * pas - 2, taille, 4);
  for (let x = 0; x <= 4; x++) h.fillRect(x * pas - 2, 0, 4, taille);
  semis(h, r, 2800, taille, ['#6c6c6c', '#a4a4a4'], 0.06, 0.18);

  const rugosite = toileSurface(taille);
  const g = rugosite.getContext('2d');
  g.fillStyle = '#d4d4d4';
  g.fillRect(0, 0, taille, taille);
  g.fillStyle = '#f2f2f2';
  for (let y = 0; y <= 4; y++) g.fillRect(0, y * pas - 2, taille, 4);
  for (let x = 0; x <= 4; x++) g.fillRect(x * pas - 2, 0, 4, taille);
  semis(g, r, 2200, taille, ['#c0c0c0', '#e6e6e6'], 0.04, 0.12);

  return { albedo, hauteur, rugosite, pente: 3.4, relief: 1.1, tuile: 1.8, metalness: 0 };
}

function surfaceBois(taille = 512) {
  const r = graine(37);
  const albedo = toileSurface(taille);
  const a = albedo.getContext('2d');
  a.fillStyle = '#f3e7d4';
  a.fillRect(0, 0, taille, taille);
  for (let i = 0; i < 210; i++) {
    const x = r() * taille;
    a.strokeStyle = `rgba(146, 106, 62, ${0.03 + r() * 0.07})`;
    a.lineWidth = 0.5 + r() * 1.6;
    a.beginPath();
    a.moveTo(x, 0);
    a.bezierCurveTo(x + (r() - 0.5) * 22, taille * 0.33, x + (r() - 0.5) * 22, taille * 0.66, x, taille);
    a.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = r() * taille;
    const y = r() * taille;
    a.strokeStyle = `rgba(120, 84, 48, ${0.12 + r() * 0.12})`;
    a.lineWidth = 1;
    for (let k = 1; k <= 4; k++) {
      a.beginPath();
      a.ellipse(x, y, 3 * k + r() * 3, 1.5 * k + r() * 2, 0, 0, TAU);
      a.stroke();
    }
  }

  const hauteur = toileSurface(taille);
  const h = hauteur.getContext('2d');
  h.fillStyle = '#808080';
  h.fillRect(0, 0, taille, taille);
  for (let i = 0; i < 210; i++) {
    const x = r() * taille;
    h.strokeStyle = `rgba(52, 52, 52, ${0.1 + r() * 0.16})`;
    h.lineWidth = 0.5 + r() * 1.2;
    h.beginPath();
    h.moveTo(x, 0);
    h.bezierCurveTo(x + (r() - 0.5) * 18, taille * 0.33, x + (r() - 0.5) * 18, taille * 0.66, x, taille);
    h.stroke();
  }

  const rugosite = toileSurface(taille);
  const g = rugosite.getContext('2d');
  g.fillStyle = '#c9c9c9';
  g.fillRect(0, 0, taille, taille);
  for (let i = 0; i < 210; i++) {
    const x = r() * taille;
    g.strokeStyle = `rgba(226, 226, 226, ${0.08 + r() * 0.14})`;
    g.lineWidth = 0.5 + r() * 1.4;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + (r() - 0.5) * 18, taille * 0.33, x + (r() - 0.5) * 18, taille * 0.66, x, taille);
    g.stroke();
  }

  return { albedo, hauteur, rugosite, pente: 1.6, relief: 0.7, tuile: 1.5, metalness: 0 };
}

function surfaceAsphalte(taille = 512) {
  const r = graine(613);
  const albedo = toileSurface(taille);
  const a = albedo.getContext('2d');
  a.fillStyle = '#eeedeb';
  a.fillRect(0, 0, taille, taille);
  nuages(a, r, 12, taille, '110,104,96', 0.1);
  semis(a, r, 9000, taille, ['#5c5a56', '#8a877f', '#ffffff', '#3f3e3b'], 0.03, 0.12, 0.4, 1.8);
  for (let i = 0; i < 24; i++) {
    a.strokeStyle = `rgba(70, 68, 64, ${0.05 + r() * 0.07})`;
    a.lineWidth = 0.6 + r() * 1.1;
    a.beginPath();
    const x = r() * taille;
    const y = r() * taille;
    a.moveTo(x, y);
    a.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60);
    a.stroke();
  }

  const hauteur = toileSurface(taille);
  const h = hauteur.getContext('2d');
  h.fillStyle = '#808080';
  h.fillRect(0, 0, taille, taille);
  semis(h, r, 9000, taille, ['#4a4a4a', '#b0b0b0'], 0.08, 0.24, 0.5, 1.9);

  const rugosite = toileSurface(taille);
  const g = rugosite.getContext('2d');
  g.fillStyle = '#e2e2e2';
  g.fillRect(0, 0, taille, taille);
  semis(g, r, 6000, taille, ['#c8c8c8', '#f4f4f4'], 0.06, 0.18);
  nuages(g, r, 8, taille, '180,180,180', 0.2);

  return { albedo, hauteur, rugosite, pente: 2.6, relief: 1, tuile: 3.2, metalness: 0 };
}

function surfaceHerbe(taille = 512) {
  const r = graine(11);
  const albedo = toileSurface(taille);
  const a = albedo.getContext('2d');
  a.fillStyle = '#ecefe6';
  a.fillRect(0, 0, taille, taille);
  nuages(a, r, 18, taille, '70, 88, 44', 0.16);
  for (let i = 0; i < 2600; i++) {
    const x = r() * taille;
    const y = r() * taille;
    a.strokeStyle = `rgba(${40 + r() * 60}, ${70 + r() * 70}, ${30 + r() * 40}, ${0.08 + r() * 0.2})`;
    a.lineWidth = 0.6 + r() * 1.2;
    a.beginPath();
    a.moveTo(x, y);
    a.lineTo(x + (r() - 0.5) * 5, y - 2 - r() * 5);
    a.stroke();
  }

  const hauteur = toileSurface(taille);
  const h = hauteur.getContext('2d');
  h.fillStyle = '#808080';
  h.fillRect(0, 0, taille, taille);
  semis(h, r, 5200, taille, ['#565656', '#a8a8a8'], 0.08, 0.22, 0.5, 2);

  const rugosite = toileSurface(taille);
  const g = rugosite.getContext('2d');
  g.fillStyle = '#e4e4e4';
  g.fillRect(0, 0, taille, taille);
  semis(g, r, 3200, taille, ['#cccccc', '#f4f4f4'], 0.06, 0.18);

  return { albedo, hauteur, rugosite, pente: 2, relief: 0.9, tuile: 2.4, metalness: 0 };
}

function surfaceInox(taille = 512) {
  const r = graine(733);
  const albedo = toileSurface(taille);
  const a = albedo.getContext('2d');
  a.fillStyle = '#f4f4f5';
  a.fillRect(0, 0, taille, taille);
  for (let i = 0; i < 720; i++) {
    const y = r() * taille;
    a.strokeStyle = `rgba(120, 124, 128, ${0.02 + r() * 0.06})`;
    a.lineWidth = 0.4 + r() * 1.1;
    a.beginPath();
    a.moveTo(0, y);
    a.lineTo(taille, y + (r() - 0.5) * 2);
    a.stroke();
  }
  semis(a, r, 1600, taille, ['#ffffff', '#c9ccce'], 0.02, 0.06, 0.4, 1.2);

  const hauteur = toileSurface(taille);
  const h = hauteur.getContext('2d');
  h.fillStyle = '#808080';
  h.fillRect(0, 0, taille, taille);
  for (let i = 0; i < 620; i++) {
    const y = r() * taille;
    h.strokeStyle = `rgba(96, 96, 96, ${0.06 + r() * 0.1})`;
    h.lineWidth = 0.4 + r() * 1;
    h.beginPath();
    h.moveTo(0, y);
    h.lineTo(taille, y + (r() - 0.5) * 2);
    h.stroke();
  }

  const rugosite = toileSurface(taille);
  const g = rugosite.getContext('2d');
  g.fillStyle = '#7c7c7c';
  g.fillRect(0, 0, taille, taille);
  for (let i = 0; i < 720; i++) {
    const y = r() * taille;
    g.strokeStyle = `rgba(${120 + r() * 70}, ${120 + r() * 70}, ${120 + r() * 70}, ${0.1 + r() * 0.2})`;
    g.lineWidth = 0.4 + r() * 1.1;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(taille, y + (r() - 0.5) * 2);
    g.stroke();
  }

  return { albedo, hauteur, rugosite, pente: 1.2, relief: 0.5, tuile: 1.2, metalness: 0.72 };
}

function normaleDepuisHauteur(canvasHauteur, pente) {
  const s = canvasHauteur.width;
  const src = canvasHauteur.getContext('2d').getImageData(0, 0, s, s).data;
  const sortie = toileSurface(s);
  const ctx = sortie.getContext('2d');
  const img = ctx.createImageData(s, s);
  const h = (x, y) => src[((((y + s) % s) * s) + ((x + s) % s)) * 4] / 255;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const nx = -(h(x + 1, y) - h(x - 1, y)) * pente;
      const ny = (h(x, y + 1) - h(x, y - 1)) * pente;
      const l = Math.hypot(nx, ny, 1);
      const i = (y * s + x) * 4;
      img.data[i] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return sortie;
}

const GENERATEURS = {
  beton: surfaceBeton,
  travertin: surfaceTravertin,
  pierre: surfacePierre,
  bois: surfaceBois,
  asphalte: surfaceAsphalte,
  herbe: surfaceHerbe,
  inox: surfaceInox,
  facade: surfaceFacade,
};

const cacheSurfaces = new Map();

function textureDepuisCanvas(canvas, sRGB) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  if (sRGB) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function obtenirSurface(nom) {
  if (!cacheSurfaces.has(nom)) {
    const gen = GENERATEURS[nom];
    if (!gen) return null;
    const brut = gen();
    cacheSurfaces.set(nom, {
      ...brut,
      map: textureDepuisCanvas(brut.albedo, true),
      normalMap: textureDepuisCanvas(normaleDepuisHauteur(brut.hauteur, brut.pente), false),
      roughnessMap: textureDepuisCanvas(brut.rugosite, false),
    });
  }
  return cacheSurfaces.get(nom);
}

const TUILLES = {
  beton: 2.6,
  travertin: 2.2,
  pierre: 1.8,
  bois: 1.5,
  asphalte: 3.2,
  herbe: 2.4,
  inox: 1.2,
  facade: 2.4,
};

export function tuileSurface(nom) {
  return TUILLES[nom] || 2;
}

const cacheMateriaux = new Map();

export function materiauSurface(nom, couleur, opts = {}) {
  const reste = { ...opts };
  delete reste.surface;
  delete reste.tuile;
  const cle = nom + '|' + couleur + '|' + JSON.stringify(reste);
  if (cacheMateriaux.has(cle)) return cacheMateriaux.get(cle);
  const spec = obtenirSurface(nom);
  if (!spec) return null;

  const m = new THREE.MeshStandardMaterial({
    color: couleur,
    roughness: 1,
    metalness: spec.metalness,
    roughnessMap: spec.roughnessMap,
    normalMap: spec.normalMap,
    map: spec.map,
    ...reste,
  });
  m.normalScale.set(spec.relief, spec.relief);
  m.envMapIntensity = 0.68;
  cacheMateriaux.set(cle, m);
  return m;
}

// Teinte par couleur de la palette existante : la maquette garde son identité
// chromatique, mais chaque surface reçoit une vraie matière.
const SURFACE_PAR_COULEUR = new Map([
  [0xf4efe6, 'beton'],
  [0xe8e1d4, 'beton'],
  [0xf7f0e2, 'beton'],
  [0xe7dfcd, 'beton'],
  [0xe5d1a7, 'beton'],
  [0xcdb488, 'beton'],
  [0xf3f2ee, 'beton'],
  [0xf5f1e8, 'beton'],
  [0xf6f1e6, 'beton'],
  [0xe8e6df, 'beton'],
  [0xe8e5dc, 'beton'],
  [0xe8e2d5, 'beton'],
  [0xf1ece1, 'beton'],
  [0xd9cfbc, 'beton'],
  [0xd8cdb9, 'beton'],
  [0xb8b0a4, 'beton'],
  [0xdfd3be, 'travertin'],
  [0xeee5d3, 'facade'],
  [0xd3c3a5, 'travertin'],
  [0xe9ddc4, 'travertin'],
  [0xf2e9d5, 'travertin'],
  [0xe7ddca, 'travertin'],
  [0xe4d9c5, 'travertin'],
  [0xf5edde, 'pierre'],
  [0xc08f59, 'bois'],
  [0x6f4a2c, 'bois'],
  [0xcfa46c, 'bois'],
  [0xdfba89, 'bois'],
  [0x9c7145, 'bois'],
  [0xc79a63, 'bois'],
  [0x9d7248, 'bois'],
  [0x9c6d43, 'bois'],
  [0x7a5a3a, 'bois'],
  [0x4a3526, 'bois'],
  [0x3a2a20, 'bois'],
  [0x3b2a20, 'bois'],
  [0xb4b9be, 'inox'],
  [0x64686b, 'inox'],
  [0x8f969b, 'inox'],
  [0x9aa1a6, 'inox'],
]);

export function surfacePourCouleur(couleur) {
  return SURFACE_PAR_COULEUR.get(couleur) || null;
}

// Projection UV par face (XZ / XY / ZY selon la normale dominante) : les
// textures gardent la même échelle réelle quel que soit le volume.
export function projeterUV(geo, tuile = 2) {
  const pos = geo.attributes.position;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const e = 1 / Math.max(0.05, tuile);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let u;
    let v;
    if (ax >= ay && ax >= az) {
      u = z * e;
      v = y * e;
    } else if (ay >= az) {
      u = x * e;
      v = z * e;
    } else {
      u = x * e;
      v = y * e;
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// ---------------------------------------------------------------------------
// Soleil et ombres

export function reglerSoleil(soleil, qualite) {
  const taille = qualite ? qualite.ombre : 2048;
  soleil.shadow.mapSize.set(taille, taille);
  const c = soleil.shadow.camera;
  c.left = -110;
  c.right = 110;
  c.top = 120;
  c.bottom = -120;
  c.near = 10;
  c.far = 330;
  soleil.shadow.bias = -0.0004;
  soleil.shadow.normalBias = 0.02;
  c.updateProjectionMatrix();
}

export function reglerIntensites(scene) {
  scene.traverse((objet) => {
    if (!objet.isMesh) return;
    const materiaux = Array.isArray(objet.material) ? objet.material : [objet.material];
    for (const m of materiaux) {
      if (!m || !m.isMeshStandardMaterial || m.userData.envIntensiteFixe) continue;
      if (m.transparent || m.roughness < 0.22) {
        m.envMapIntensity = m.envMapIntensity > 1 ? m.envMapIntensity : 0.85;
      } else if (m.metalness > 0.35) {
        m.envMapIntensity = 0.7;
      } else {
        m.envMapIntensity = 0.3;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Post-processing : rendu → SSAO → bloom → tonemapping → SMAA → étalonnage.

const EtalonnageShader = {
  uniforms: {
    tDiffuse: { value: null },
    contraste: { value: 1.055 },
    saturation: { value: 1.06 },
    vignette: { value: 0.16 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float contraste;
    uniform float saturation;
    uniform float vignette;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col = clamp((col - 0.5) * contraste + 0.5, 0.0, 1.0);
      vec2 d = vUv - 0.5;
      float f = 1.0 - vignette * smoothstep(0.25, 0.72, length(d));
      gl_FragColor = vec4(col * f, c.a);
    }
  `,
};

export function creerComposeur(renderer, scene, camera, qualite) {
  if (!qualite.bloom && !qualite.ssao) return null;
  try {
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(qualite.dpr);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));

    if (qualite.ssao) {
      const ssao = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
      ssao.kernelRadius = 26;
      ssao.minDistance = 0.0015;
      ssao.maxDistance = 0.05;
      composer.addPass(ssao);
    }

    composer.addPass(new OutputPass());

    // Bloom après le tonemapping : sur un ciel HDR, un seuil linéaire
    // blanchirait toute l'image. Ici seuls les blancs restent lumineux.
    if (qualite.bloom) {
      const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.1, 0.4, 0.97);
      composer.addPass(bloom);
    }

    composer.addPass(new SMAAPass(window.innerWidth, window.innerHeight));
    composer.addPass(new ShaderPass(EtalonnageShader));
    return composer;
  } catch (err) {
    console.error('Post-processing indisponible, repli sur le rendu simple :', err);
    return null;
  }
}
