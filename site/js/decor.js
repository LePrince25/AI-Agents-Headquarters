import * as THREE from 'three';
import { PI, TAU, box, cyl, mat, toile, graine } from './core.js';
import { poser } from './models.js';

const POLICE = 'system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const CARTON = 0xb2865c;
const CARTON_FONCE = 0x8f6a47;
const LIVRES = [
  0xc4734a, 0x4f8b86, 0x8d9a4c, 0xb08145, 0x6f8fa3, 0xa65a4f,
  0x7c6a8f, 0xd9b26a, 0x6e8f7c, 0xcfd8cf, 0x9b5f4a, 0x577f8c,
];
const FEUILLES = [0x5f8f4e, 0x6da35a, 0x4f7a3f, 0x7fae63, 0x8fbf6b];

function nuance(hex, dl = 0.06, ds = 0) {
  return '#' + new THREE.Color(hex).offsetHSL(0, ds, dl).getHexString();
}

function hexNum(hex) {
  return new THREE.Color(hex).getHex();
}

function arrondi(ctx, x, y, w, h, r) {
  const rayon = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rayon, y);
  ctx.lineTo(x + w - rayon, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rayon);
  ctx.lineTo(x + w, y + h - rayon);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rayon, y + h);
  ctx.lineTo(x + rayon, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rayon);
  ctx.lineTo(x, y + rayon);
  ctx.quadraticCurveTo(x, y, x + rayon, y);
  ctx.closePath();
}

function texteAjuste(ctx, texte, x, y, maxLargeur, taille, poids = 700, align = 'left') {
  let t = taille;
  ctx.font = `${poids} ${t}px ${POLICE}`;
  while (ctx.measureText(texte).width > maxLargeur && t > 12) {
    t -= 2;
    ctx.font = `${poids} ${t}px ${POLICE}`;
  }
  ctx.textAlign = align;
  ctx.fillText(texte, x, y);
  return t;
}

function fleche(ctx, x1, y1, x2, y2, couleur, largeur = 3) {
  ctx.strokeStyle = couleur;
  ctx.lineWidth = largeur;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.42) * 12, y2 - Math.sin(a - 0.42) * 12);
  ctx.lineTo(x2 - Math.cos(a + 0.42) * 12, y2 - Math.sin(a + 0.42) * 12);
  ctx.closePath();
  ctx.fillStyle = couleur;
  ctx.fill();
}

function postitDessine(ctx, x, y, w, h, couleur, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(50, 42, 30, .12)';
  ctx.fillRect(3, 4, w, h);
  ctx.fillStyle = couleur;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255, 255, 255, .35)';
  ctx.fillRect(0, 0, w, 5);
  ctx.fillStyle = 'rgba(50, 42, 30, .28)';
  for (let i = 0; i < 3; i++) ctx.fillRect(8, 20 + i * 9, w - 20 - (i === 2 ? 10 : 0), 2);
  ctx.restore();
}

function textureEnseigne(info) {
  return toile(1400, 190, (x, w, h) => {
    const fond = x.createLinearGradient(0, 0, 0, h);
    fond.addColorStop(0, '#333a3c');
    fond.addColorStop(1, '#212729');
    x.fillStyle = fond;
    x.fillRect(0, 0, w, h);

    x.globalAlpha = 0.06;
    x.strokeStyle = '#ffffff';
    x.lineWidth = 1;
    for (let i = -2; i < 14; i++) {
      x.beginPath();
      x.moveTo(i * 120, h);
      x.lineTo(i * 120 + 80, 0);
      x.stroke();
    }
    x.globalAlpha = 1;

    x.fillStyle = info.accent;
    x.fillRect(0, 0, 30, h);
    x.fillStyle = nuance(info.accent, -0.1);
    x.fillRect(30, 0, 7, h);

    x.textBaseline = 'middle';
    x.fillStyle = info.accent;
    ctx_tag(x, info.pole.toUpperCase(), w - 48, 36);

    x.fillStyle = '#fbf6ea';
    texteAjuste(x, info.lieu.toUpperCase(), 58, 102, w - 410, 94, 800);

    x.fillStyle = nuance(info.accent, 0.16);
    x.fillRect(60, 132, 84, 4);

    x.fillStyle = 'rgba(244, 238, 224, .72)';
    texteAjuste(x, info.mission, 60, 161, w - 120, 33, 500);
  });
}

function ctx_tag(ctx, texte, x, y) {
  ctx.font = `700 25px ${POLICE}`;
  ctx.textAlign = 'right';
  ctx.fillText(texte, x, y);
}

function textureEnseigneExterieure(info) {
  return toile(900, 120, (x, w, h) => {
    const fond = x.createLinearGradient(0, 0, 0, h);
    fond.addColorStop(0, nuance(info.accent, 0.04));
    fond.addColorStop(1, nuance(info.accent, -0.06));
    x.fillStyle = fond;
    x.fillRect(0, 0, w, h);

    x.strokeStyle = 'rgba(255, 250, 238, .55)';
    x.lineWidth = 3;
    x.strokeRect(8, 8, w - 16, h - 16);

    x.fillStyle = '#fff8e8';
    x.textBaseline = 'middle';
    texteAjuste(x, info.lieu.toUpperCase(), w / 2, h / 2 + 2, w - 90, 56, 800, 'center');
  });
}

function textureTableau(kind, seed, accent) {
  return toile(768, 384, (x, w, h) => {
    x.fillStyle = '#fbfaf4';
    x.fillRect(0, 0, w, h);

    x.strokeStyle = 'rgba(120, 128, 124, .16)';
    x.lineWidth = 1;
    for (let ix = 24; ix < w; ix += 28) {
      for (let iy = 24; iy < h; iy += 28) x.strokeRect(ix, iy, 1, 1);
    }

    x.strokeStyle = '#d9d6c9';
    x.lineWidth = 6;
    x.strokeRect(3, 3, w - 6, h - 6);

    const r = graine(seed);
    const titres = {
      forge: 'ARCHITECTURE API',
      atelier: 'MOODBOARD',
      mobile: 'PARCOURS MOBILE',
      comptoir: 'FLUX CLIENT',
      bastion: 'PLAN DE DÉFENSE',
      vigie: 'RADAR TECH',
      bureau: 'SUIVI CLIENTS',
      data: 'PIPELINE DE DONNÉES',
      bi: 'TABLEAU DE BORD',
      direction: 'ARBITRAGES DE LA SEMAINE',
    };
    x.fillStyle = accent;
    x.font = `800 25px ${POLICE}`;
    x.textAlign = 'left';
    x.textBaseline = 'middle';
    x.fillText(titres[kind] || 'PLAN DE LA SEMAINE', 34, 40);

    x.fillStyle = nuance(accent, 0.1);
    x.fillRect(34, 60, 120, 3);

    const encre = '#3e4a4d';
    const encreDouce = 'rgba(62, 74, 77, .5)';

    if (kind === 'data' || kind === 'bi') {
      x.strokeStyle = 'rgba(90, 100, 100, .32)';
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(60, 316);
      x.lineTo(710, 316);
      x.moveTo(60, 316);
      x.lineTo(60, 100);
      x.stroke();
      const barres = [0.38, 0.62, 0.46, 0.8, 0.58, 0.92, 0.7];
      barres.forEach((v, i) => {
        const bh = v * 175;
        x.fillStyle = i % 2 ? nuance(accent, 0.12) : accent;
        x.globalAlpha = 0.72;
        arrondi(x, 92 + i * 72, 316 - bh, 38, bh, 5);
        x.fill();
        x.globalAlpha = 1;
      });
      x.strokeStyle = nuance(accent, -0.16);
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(90, 258);
      x.bezierCurveTo(220, 210, 320, 250, 430, 158);
      x.bezierCurveTo(520, 96, 600, 160, 690, 116);
      x.stroke();
      x.fillStyle = encre;
      x.font = `600 17px ${POLICE}`;
      x.fillText('T1', 100, 336);
      x.fillText('T2', 316, 336);
      x.fillText('T3', 532, 336);
      postitDessine(x, 612, 86, 74, 66, '#f4d35e', 0.06);
      postitDessine(x, 30, 318, 55, 48, '#a9c98a', -0.1);
    } else if (kind === 'bastion') {
      const noeuds = [
        [150, 170], [280, 118], [270, 250], [410, 180], [520, 112], [540, 262], [650, 180],
      ];
      x.strokeStyle = 'rgba(62, 74, 77, .42)';
      x.lineWidth = 2.5;
      const liens = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]];
      for (const [a, b] of liens) {
        x.beginPath();
        x.moveTo(noeuds[a][0], noeuds[a][1]);
        x.lineTo(noeuds[b][0], noeuds[b][1]);
        x.stroke();
      }
      noeuds.forEach(([nx, ny], i) => {
        x.fillStyle = i === 3 ? accent : '#fbfaf4';
        x.strokeStyle = encre;
        x.lineWidth = 3;
        x.beginPath();
        x.arc(nx, ny, i === 3 ? 18 : 11, 0, TAU);
        x.fill();
        x.stroke();
      });
      x.fillStyle = encre;
      x.font = `600 15px ${POLICE}`;
      x.textAlign = 'center';
      x.fillText('COEUR', 410, 215);
      x.textAlign = 'left';
      x.strokeStyle = 'rgba(166, 90, 79, .55)';
      x.lineWidth = 3;
      x.beginPath();
      x.arc(270, 250, 38, 0, TAU);
      x.stroke();
      postitDessine(x, 620, 300, 86, 56, '#e79a9a', -0.05);
    } else if (kind === 'mobile') {
      for (let i = 0; i < 3; i++) {
        const px = 90 + i * 205;
        x.fillStyle = '#f4f1e7';
        x.strokeStyle = encre;
        x.lineWidth = 3;
        arrondi(x, px, 96, 120, 226, 16);
        x.fill();
        x.stroke();
        x.fillStyle = i === 1 ? accent : nuance(accent, 0.1);
        arrondi(x, px + 14, 116, 92, 48, 8);
        x.fill();
        x.fillStyle = 'rgba(62, 74, 77, .28)';
        for (let j = 0; j < 4; j++) {
          arrondi(x, px + 16, 184 + j * 24, 84 - (j % 2) * 26, 7, 3);
          x.fill();
        }
        x.fillStyle = encreDouce;
        x.beginPath();
        x.arc(px + 60, 300, 7, 0, TAU);
        x.fill();
        if (i < 2) fleche(x, px + 132, 208, px + 190, 208, 'rgba(62, 74, 77, .5)', 3);
      }
      postitDessine(x, 650, 72, 78, 62, '#f4d35e', 0.08);
    } else if (kind === 'atelier') {
      const couleurs = [accent, nuance(accent, 0.16), '#c4734a', '#4f8b86', '#d9b26a', '#7c6a8f'];
      couleurs.forEach((c, i) => {
        x.fillStyle = c;
        x.beginPath();
        x.arc(108 + i * 76, 150, 27, 0, TAU);
        x.fill();
        x.fillStyle = 'rgba(62, 74, 77, .45)';
        x.font = `600 13px ${POLICE}`;
        x.textAlign = 'center';
        x.fillText(['#1', '#2', '#3', '#4', '#5', '#6'][i], 108 + i * 76, 196);
        x.textAlign = 'left';
      });
      x.fillStyle = 'rgba(62, 74, 77, .26)';
      for (let i = 0; i < 4; i++) {
        arrondi(x, 70, 232 + i * 22, 500 - i * 55, 7, 3);
        x.fill();
      }
      x.strokeStyle = 'rgba(196, 115, 74, .7)';
      x.lineWidth = 4;
      x.beginPath();
      x.arc(620, 190, 62, 0.2, 4.4);
      x.stroke();
      postitDessine(x, 596, 280, 92, 62, '#a9c98a', -0.06);
    } else if (kind === 'vigie') {
      const cx = 240;
      const cy = 210;
      x.strokeStyle = 'rgba(62, 74, 77, .3)';
      x.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        x.beginPath();
        x.arc(cx, cy, i * 52, 0, TAU);
        x.stroke();
      }
      x.beginPath();
      x.moveTo(cx - 165, cy);
      x.lineTo(cx + 165, cy);
      x.moveTo(cx, cy - 165);
      x.lineTo(cx, cy + 165);
      x.stroke();
      x.fillStyle = accent;
      x.globalAlpha = 0.24;
      x.beginPath();
      x.moveTo(cx, cy);
      x.arc(cx, cy, 156, -0.7, 0.18);
      x.closePath();
      x.fill();
      x.globalAlpha = 1;
      const points = [[-110, -40], [40, -90], [92, 44], [-30, 76], [140, 110]];
      x.fillStyle = encre;
      points.forEach(([dx, dy]) => {
        x.beginPath();
        x.arc(cx + dx, cy + dy, 5, 0, TAU);
        x.fill();
      });
      x.fillStyle = accent;
      x.beginPath();
      x.arc(cx + 40, cy - 90, 9, 0, TAU);
      x.fill();
      x.font = `700 15px ${POLICE}`;
      x.fillStyle = encre;
      x.fillText('POC', 400, 104);
      postitDessine(x, 470, 262, 96, 64, '#f4d35e', 0.05);
      postitDessine(x, 584, 274, 80, 52, '#a9c98a', -0.08);
    } else if (kind === 'bureau' || kind === 'direction') {
      x.strokeStyle = 'rgba(62, 74, 77, .38)';
      x.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const ly = 112 + i * 40;
        x.strokeRect(64, ly - 11, 22, 22);
        x.beginPath();
        x.moveTo(72, ly);
        x.lineTo(79, ly + 7);
        x.lineTo(91, ly - 6);
        x.strokeStyle = accent;
        x.stroke();
        x.strokeStyle = 'rgba(62, 74, 77, .38)';
        x.beginPath();
        x.moveTo(102, ly);
        x.lineTo(320 - i * 18, ly);
        x.stroke();
      }
      x.strokeStyle = 'rgba(62, 74, 77, .34)';
      x.lineWidth = 2;
      x.strokeRect(390, 86, 310, 226);
      for (let cx2 = 1; cx2 < 5; cx2++) {
        x.beginPath();
        x.moveTo(390 + cx2 * 62, 86);
        x.lineTo(390 + cx2 * 62, 312);
        x.stroke();
      }
      for (let cy2 = 1; cy2 < 5; cy2++) {
        x.beginPath();
        x.moveTo(390, 86 + cy2 * 45);
        x.lineTo(700, 86 + cy2 * 45);
        x.stroke();
      }
      x.fillStyle = accent;
      x.globalAlpha = 0.24;
      x.fillRect(452, 131, 62, 45);
      x.fillRect(576, 221, 62, 45);
      x.globalAlpha = 1;
      postitDessine(x, 366, 318, 68, 46, '#e79a9a', -0.08);
    } else {
      const boites = [
        [70, 128, 150, 62, 'API'],
        [70, 248, 150, 62, 'DATA'],
        [330, 128, 150, 62, 'WEB'],
        [330, 248, 150, 62, 'MOBILE'],
        [590, 188, 140, 62, 'CLIENT'],
      ];
      boites.forEach(([bx, by, bw, bh, lbl]) => {
        x.fillStyle = 'rgba(251, 250, 244, .9)';
        x.strokeStyle = encre;
        x.lineWidth = 3;
        arrondi(x, bx, by, bw, bh, 8);
        x.fill();
        x.stroke();
        x.fillStyle = encre;
        x.font = `700 17px ${POLICE}`;
        x.textAlign = 'center';
        x.fillText(lbl, bx + bw / 2, by + bh / 2);
        x.textAlign = 'left';
      });
      fleche(x, 220, 159, 330, 159, 'rgba(62, 74, 77, .55)', 3);
      fleche(x, 220, 279, 330, 279, 'rgba(62, 74, 77, .55)', 3);
      fleche(x, 480, 190, 520, 206, 'rgba(62, 74, 77, .55)', 3);
      fleche(x, 480, 258, 520, 232, 'rgba(62, 74, 77, .55)', 3);
      fleche(x, 590, 219, 480, 219, accent, 4);
      x.strokeStyle = accent;
      x.lineWidth = 3;
      x.strokeRect(290, 100, 230, 230);
      x.font = `700 15px ${POLICE}`;
      x.fillStyle = accent;
      x.fillText('NOYAU', 300, 94);
      for (let i = 0; i < 2; i++) {
        const px = 520 + i * 96;
        postitDessine(x, px, 72 + i * 120, 78, 58, i ? '#a9c98a' : '#f4d35e', (r() - 0.5) * 0.2);
      }
    }

    x.fillStyle = 'rgba(62, 74, 77, .22)';
    x.font = `500 13px ${POLICE}`;
    x.fillText('atelier du QG', 34, 364);
  });
}

function textureEcran(seed, accent, mode) {
  return toile(640, 360, (x, w, h) => {
    const fond = x.createLinearGradient(0, 0, w, h);
    fond.addColorStop(0, '#0d181d');
    fond.addColorStop(1, '#14262c');
    x.fillStyle = fond;
    x.fillRect(0, 0, w, h);

    x.fillStyle = 'rgba(8, 16, 20, .95)';
    x.fillRect(0, 0, w, 28);
    ['#e0655b', '#e0b14f', '#6fbf74'].forEach((c, i) => {
      x.fillStyle = c;
      x.beginPath();
      x.arc(16 + i * 16, 14, 4, 0, TAU);
      x.fill();
    });
    x.fillStyle = 'rgba(210, 230, 232, .38)';
    x.font = `600 11px ${POLICE}`;
    x.fillText(['api.forge', 'data.observatoire', 'crm.comptoir', 'mobile.usine', 'design.owl', 'bastion.qg'][mode % 6], 82, 18);

    const r = graine(seed);
    x.strokeStyle = 'rgba(180, 210, 214, .1)';
    x.lineWidth = 1;

    if (mode === 0) {
      x.fillStyle = 'rgba(255, 255, 255, .04)';
      x.fillRect(0, 28, 128, h - 28);
      x.strokeStyle = 'rgba(180, 210, 214, .08)';
      x.beginPath();
      x.moveTo(128, 28);
      x.lineTo(128, h);
      x.stroke();
      x.fillStyle = 'rgba(210, 230, 232, .55)';
      x.font = `600 10px ${POLICE}`;
      x.fillText('EXPLORATEUR', 14, 48);
      x.fillStyle = accent;
      x.fillRect(8, 58, 112, 18);
      x.fillStyle = '#08151a';
      x.font = `600 10px ${POLICE}`;
      x.fillText('src/api/routes.ts', 14, 70);
      x.fillStyle = 'rgba(210, 230, 232, .45)';
      for (let i = 0; i < 9; i++) {
        const lw = 40 + r() * 58;
        x.fillRect(18, 88 + i * 15, lw, 4);
      }
      x.fillStyle = 'rgba(210, 230, 232, .2)';
      for (let i = 0; i < 18; i++) x.fillRect(142, 44 + i * 15, 8, 3);
      const couleurs = [accent, '#7fb7a8', '#d9b26a', '#c4734a', '#8fa3c8', '#b9a3d4'];
      for (let i = 0; i < 18; i++) {
        const indent = 158 + (r() < 0.35 ? 22 : 0);
        let cx2 = indent;
        const nb = 2 + Math.floor(r() * 3);
        for (let j = 0; j < nb; j++) {
          const lw = 12 + r() * 62;
          x.globalAlpha = 0.65 + r() * 0.3;
          x.fillStyle = couleurs[Math.floor(r() * couleurs.length)];
          x.fillRect(cx2, 44 + i * 15 + r() * 3, lw, 5);
          cx2 += lw + 6;
          if (cx2 > 600) break;
        }
      }
      x.globalAlpha = 1;
      x.fillStyle = accent;
      x.fillRect(0, h - 20, w, 20);
      x.fillStyle = '#0b171c';
      x.font = `600 10px ${POLICE}`;
      x.fillText('boucle de build active - 0 erreur', 14, h - 7);
    } else if (mode === 1) {
      x.fillStyle = 'rgba(210, 230, 232, .7)';
      x.font = `700 15px ${POLICE}`;
      x.fillText('VUE D ENSEMBLE', 24, 56);
      const cartes = [
        ['P95', '182 ms', accent],
        ['REQUETES', '24,8 k', '#7fb7a8'],
        ['ERREURS', '0,04 %', '#d9b26a'],
      ];
      cartes.forEach(([titre, valeur, c], i) => {
        const cx2 = 24 + i * 196;
        x.fillStyle = 'rgba(255, 255, 255, .045)';
        arrondi(x, cx2, 76, 180, 74, 8);
        x.fill();
        x.strokeStyle = 'rgba(180, 210, 214, .12)';
        x.lineWidth = 1;
        x.stroke();
        x.fillStyle = 'rgba(210, 230, 232, .45)';
        x.font = `700 9px ${POLICE}`;
        x.fillText(titre, cx2 + 14, 96);
        x.fillStyle = c;
        x.font = `700 26px ${POLICE}`;
        x.fillText(valeur, cx2 + 14, 130);
      });
      x.fillStyle = 'rgba(255, 255, 255, .035)';
      arrondi(x, 24, 172, 374, 160, 8);
      x.fill();
      x.strokeStyle = 'rgba(180, 210, 214, .12)';
      x.stroke();
      for (let i = 0; i < 7; i++) {
        const bh = 24 + r() * 86;
        x.fillStyle = i % 2 ? nuance(accent, 0.1) : accent;
        x.globalAlpha = 0.75;
        arrondi(x, 48 + i * 46, 312 - bh, 26, bh, 3);
        x.fill();
      }
      x.globalAlpha = 1;
      x.fillStyle = 'rgba(255, 255, 255, .035)';
      arrondi(x, 414, 172, 202, 160, 8);
      x.fill();
      x.strokeStyle = 'rgba(180, 210, 214, .12)';
      x.stroke();
      x.strokeStyle = accent;
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(432, 292);
      x.bezierCurveTo(470, 240, 510, 284, 542, 218);
      x.bezierCurveTo(570, 190, 592, 210, 600, 194);
      x.stroke();
      x.fillStyle = 'rgba(210, 230, 232, .55)';
      x.font = `600 9px ${POLICE}`;
      x.fillText('LATENCE', 432, 188);
      x.fillStyle = accent;
      x.beginPath();
      x.arc(600, 194, 4, 0, TAU);
      x.fill();
    } else if (mode === 2) {
      x.fillStyle = 'rgba(255, 255, 255, .04)';
      arrondi(x, 24, 44, 280, 26, 6);
      x.fill();
      x.fillStyle = 'rgba(210, 230, 232, .38)';
      x.font = `500 11px ${POLICE}`;
      x.fillText('Rechercher un client, un devis, une facture', 38, 61);
      x.fillStyle = 'rgba(210, 230, 232, .65)';
      x.font = `700 12px ${POLICE}`;
      x.fillText('COMPTE', 30, 98);
      x.fillText('MONTANT', 330, 98);
      x.fillText('STATUT', 494, 98);
      const noms = ['Atelier Kora', 'Studio Nola', 'Maison Ade', 'Groupe Sika', 'Ferme Zinsou', 'Ecole Lumiere'];
      const etats = [
        ['Paye', '#6fbf74'],
        ['Relance', '#d9b26a'],
        ['Paye', '#6fbf74'],
        ['Brouillon', '#8fa3c8'],
        ['Relance', '#d9b26a'],
        ['Paye', '#6fbf74'],
      ];
      for (let i = 0; i < 6; i++) {
        const ry = 114 + i * 34;
        if (i % 2 === 0) {
          x.fillStyle = 'rgba(255, 255, 255, .028)';
          x.fillRect(24, ry - 12, 592, 28);
        }
        x.fillStyle = nuance(accent, i % 2 ? 0.14 : -0.04);
        x.beginPath();
        x.arc(38, ry + 2, 8, 0, TAU);
        x.fill();
        x.fillStyle = 'rgba(210, 230, 232, .74)';
        x.font = `600 11px ${POLICE}`;
        x.fillText(noms[i], 56, ry + 6);
        x.fillStyle = 'rgba(210, 230, 232, .5)';
        x.fillText(`${(180 + r() * 920).toFixed(0)} 000 F`, 330, ry + 6);
        const [lbl, c] = etats[i];
        x.fillStyle = c;
        x.globalAlpha = 0.18;
        arrondi(x, 490, ry - 6, 76, 18, 9);
        x.fill();
        x.globalAlpha = 1;
        x.fillStyle = c;
        x.font = `700 9px ${POLICE}`;
        x.fillText(lbl.toUpperCase(), 502, ry + 6);
      }
    } else if (mode === 3) {
      x.strokeStyle = 'rgba(180, 210, 214, .13)';
      x.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        x.beginPath();
        x.moveTo(0, 28 + i * 55);
        x.lineTo(w, 28 + i * 55);
        x.stroke();
      }
      const noeuds = [];
      for (let i = 0; i < 11; i++) noeuds.push([60 + r() * 520, 70 + r() * 250]);
      for (let i = 0; i < noeuds.length; i++) {
        for (let j = i + 1; j < noeuds.length; j++) {
          if (r() > 0.82) {
            x.strokeStyle = 'rgba(127, 183, 168, .28)';
            x.lineWidth = 1.4;
            x.beginPath();
            x.moveTo(noeuds[i][0], noeuds[i][1]);
            x.lineTo(noeuds[j][0], noeuds[j][1]);
            x.stroke();
          }
        }
      }
      noeuds.forEach(([nx, ny], i) => {
        const couleur = i === 0 ? accent : i < 4 ? '#7fb7a8' : '#8fa3c8';
        x.fillStyle = couleur;
        x.globalAlpha = 0.22;
        x.beginPath();
        x.arc(nx, ny, 14, 0, TAU);
        x.fill();
        x.globalAlpha = 1;
        x.beginPath();
        x.arc(nx, ny, 5, 0, TAU);
        x.fill();
      });
      x.fillStyle = 'rgba(210, 230, 232, .55)';
      x.font = `600 10px ${POLICE}`;
      x.fillText('FLUX TEMPS REEL', 24, 50);
    } else if (mode === 4) {
      x.fillStyle = 'rgba(255, 255, 255, .04)';
      x.fillRect(0, 28, 52, h - 28);
      for (let i = 0; i < 6; i++) {
        x.fillStyle = i === 0 ? accent : 'rgba(210, 230, 232, .18)';
        arrondi(x, 12, 48 + i * 42, 28, 28, 6);
        x.fill();
      }
      x.fillStyle = '#f3eee2';
      arrondi(x, 84, 54, 380, 246, 6);
      x.fill();
      x.fillStyle = accent;
      x.globalAlpha = 0.82;
      x.beginPath();
      x.moveTo(96, 84);
      x.lineTo(262, 84);
      x.lineTo(190, 210);
      x.closePath();
      x.fill();
      x.globalAlpha = 1;
      x.fillStyle = '#1f3a3f';
      x.beginPath();
      x.arc(366, 146, 52, 0, TAU);
      x.fill();
      x.fillStyle = '#c4734a';
      arrondi(x, 284, 226, 150, 46, 8);
      x.fill();
      x.strokeStyle = 'rgba(30, 40, 42, .38)';
      x.lineWidth = 1;
      x.strokeRect(110, 220, 320, 62);
      x.fillStyle = 'rgba(255, 255, 255, .05)';
      arrondi(x, 480, 54, 136, 246, 6);
      x.fill();
      x.fillStyle = 'rgba(210, 230, 232, .55)';
      x.font = `700 10px ${POLICE}`;
      x.fillText('CALQUES', 494, 76);
      for (let i = 0; i < 5; i++) {
        x.fillStyle = i === 0 ? accent : 'rgba(210, 230, 232, .22)';
        arrondi(x, 494, 92 + i * 30, 108, 20, 4);
        x.fill();
      }
      x.fillStyle = 'rgba(210, 230, 232, .35)';
      x.font = `600 9px ${POLICE}`;
      x.fillText('PALETTE', 494, 268);
      ['#4f8b86', '#c4734a', '#d9b26a', '#efe4cf', '#3e4a4d'].forEach((c, i) => {
        x.fillStyle = c;
        arrondi(x, 494 + i * 22, 278, 16, 16, 4);
        x.fill();
      });
    } else {
      x.fillStyle = 'rgba(8, 15, 12, .6)';
      x.fillRect(16, 42, w - 32, h - 66);
      x.strokeStyle = 'rgba(120, 220, 150, .16)';
      x.lineWidth = 1;
      x.strokeRect(16, 42, w - 32, h - 66);
      x.font = `600 11px ${POLICE}`;
      for (let i = 0; i < 14; i++) {
        const vert = r() > 0.3;
        x.fillStyle = vert ? 'rgba(120, 220, 150, .72)' : 'rgba(217, 178, 106, .8)';
        const txt = vert
          ? `[ok]  ${['auth', 'tls', 'sanitize', 'rate-limit', 'csp'][Math.floor(r() * 5)]} verifie`
          : `[!!]  ${['token exp', 'header manquant', 'cert court'][Math.floor(r() * 3)]} a corriger`;
        x.fillText(txt, 30, 66 + i * 19 + r() * 2);
      }
      x.fillStyle = accent;
      x.globalAlpha = 0.15;
      x.beginPath();
      x.arc(556, 118, 62, 0, TAU);
      x.fill();
      x.globalAlpha = 1;
      x.strokeStyle = accent;
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(556, 72);
      x.lineTo(600, 90);
      x.lineTo(596, 136);
      x.quadraticCurveTo(588, 166, 556, 180);
      x.quadraticCurveTo(524, 166, 516, 136);
      x.lineTo(512, 90);
      x.closePath();
      x.stroke();
      x.strokeStyle = nuance(accent, 0.14);
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(538, 124);
      x.lineTo(552, 140);
      x.lineTo(578, 106);
      x.stroke();
    }
  });
}

function textureAffiche(seed, accent) {
  return toile(320, 440, (x, w, h) => {
    const r = graine(seed);
    const variante = seed % 3;
    if (variante === 0) {
      x.fillStyle = '#f2ecdd';
      x.fillRect(0, 0, w, h);
      x.fillStyle = accent;
      x.beginPath();
      x.arc(w * 0.62, h * 0.38, 92, 0, TAU);
      x.fill();
      x.fillStyle = '#2f3638';
      x.fillRect(30, 30, 14, 210);
      x.font = `800 34px ${POLICE}`;
      x.fillText('QG', 62, 76);
      x.font = `600 10px ${POLICE}`;
      x.fillText('LE QUARTIER', 64, 96);
      x.fillStyle = '#2f3638';
      x.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) x.fillRect(30, 314 + i * 16, 200 - i * 30, 5);
      x.globalAlpha = 1;
      x.fillStyle = nuance(accent, -0.16);
      x.fillRect(30, 386, 120, 8);
    } else if (variante === 1) {
      x.fillStyle = '#243235';
      x.fillRect(0, 0, w, h);
      for (let i = 1; i <= 4; i++) {
        x.strokeStyle = i === 2 ? accent : 'rgba(242, 236, 221, .2)';
        x.lineWidth = i === 2 ? 8 : 3;
        x.beginPath();
        x.arc(w / 2, h * 0.42, i * 34, 0, TAU);
        x.stroke();
      }
      x.fillStyle = '#f2ecdd';
      x.font = `800 30px ${POLICE}`;
      x.textAlign = 'center';
      x.fillText('CONSTRUIRE', w / 2, 336);
      x.fillStyle = accent;
      x.font = `600 11px ${POLICE}`;
      x.fillText('ENSEMBLE, EN LOCAL', w / 2, 360);
      x.textAlign = 'left';
    } else {
      x.fillStyle = '#f5efe3';
      x.fillRect(0, 0, w, h);
      x.fillStyle = nuance(accent, -0.02);
      x.beginPath();
      x.moveTo(0, h * 0.62);
      x.lineTo(w, h * 0.32);
      x.lineTo(w, h);
      x.lineTo(0, h);
      x.closePath();
      x.fill();
      x.fillStyle = '#2f3638';
      x.font = `800 76px ${POLICE}`;
      x.fillText('30', 28, 132);
      x.font = `600 12px ${POLICE}`;
      x.fillText('AGENTS, 9 POLES', 32, 156);
      x.fillStyle = accent;
      for (let i = 0; i < 5; i++) {
        x.beginPath();
        x.arc(54 + i * 34, 210 + (r() - 0.5) * 14, 7, 0, TAU);
        x.fill();
      }
      x.fillStyle = '#f5efe3';
      x.font = `700 13px ${POLICE}`;
      x.fillText('TOUT TOURNE', 30, 350);
      x.fillText('SUR TON MAC', 30, 370);
      x.fillStyle = 'rgba(245, 239, 227, .55)';
      x.fillRect(30, 390, 90, 4);
    }
  });
}

function textureHorloge(accent) {
  return toile(256, 256, (x, w) => {
    x.clearRect(0, 0, w, w);
    x.fillStyle = 'rgba(50, 42, 30, .2)';
    x.beginPath();
    x.arc(w / 2, w / 2 + 5, 110, 0, TAU);
    x.fill();
    x.fillStyle = '#fbf7ec';
    x.beginPath();
    x.arc(w / 2, w / 2, 108, 0, TAU);
    x.fill();
    x.strokeStyle = '#3b4144';
    x.lineWidth = 9;
    x.stroke();
    x.strokeStyle = 'rgba(59, 65, 68, .6)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const r1 = i % 3 === 0 ? 76 : 88;
      const r2 = 98;
      x.lineWidth = i % 3 === 0 ? 5 : 3;
      x.beginPath();
      x.moveTo(w / 2 + Math.cos(a) * r1, w / 2 + Math.sin(a) * r1);
      x.lineTo(w / 2 + Math.cos(a) * r2, w / 2 + Math.sin(a) * r2);
      x.stroke();
    }
    x.strokeStyle = '#2f3538';
    x.lineWidth = 7;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(w / 2, w / 2);
    x.lineTo(w / 2 - 42, w / 2 - 30);
    x.stroke();
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(w / 2, w / 2);
    x.lineTo(w / 2 + 60, w / 2 - 26);
    x.stroke();
    x.fillStyle = accent;
    x.beginPath();
    x.arc(w / 2, w / 2, 9, 0, TAU);
    x.fill();
    x.fillStyle = '#2f3538';
    x.beginPath();
    x.arc(w / 2, w / 2, 4, 0, TAU);
    x.fill();
  });
}

function textureOutils(seed, accent) {
  return toile(640, 320, (x, w, h) => {
    x.fillStyle = '#343b3e';
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255, 255, 255, .035)';
    for (let ix = 14; ix < w; ix += 26) {
      for (let iy = 14; iy < h; iy += 26) {
        x.beginPath();
        x.arc(ix, iy, 2, 0, TAU);
        x.fill();
      }
    }
    x.strokeStyle = 'rgba(255, 255, 255, .07)';
    x.strokeRect(10, 10, w - 20, h - 20);
    x.strokeStyle = '#cfd8cf';
    x.lineWidth = 7;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(96, 80);
    x.lineTo(96, 214);
    x.stroke();
    x.fillStyle = '#cfd8cf';
    arrondi(x, 62, 62, 82, 34, 9);
    x.fill();
    x.strokeStyle = accent;
    x.lineWidth = 5;
    x.beginPath();
    x.arc(228, 96, 20, 0, TAU);
    x.moveTo(246, 110);
    x.lineTo(300, 190);
    x.stroke();
    x.strokeStyle = '#cfd8cf';
    x.beginPath();
    x.arc(228, 96, 11, 0, TAU);
    x.stroke();
    x.beginPath();
    x.moveTo(398, 68);
    x.lineTo(398, 218);
    x.stroke();
    x.fillStyle = '#8fa3a5';
    x.fillRect(386, 58, 24, 18);
    x.fillStyle = accent;
    x.fillRect(386, 204, 24, 26);
    x.strokeStyle = '#cfd8cf';
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(484, 82);
    x.lineTo(462, 216);
    x.moveTo(484, 82);
    x.lineTo(510, 216);
    x.stroke();
    x.strokeStyle = 'rgba(207, 216, 207, .6)';
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(540, 90);
    x.lineTo(600, 90);
    x.moveTo(570, 90);
    x.lineTo(570, 200);
    x.stroke();
    x.fillStyle = '#8fa3a5';
    x.beginPath();
    x.arc(570, 216, 12, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(244, 238, 224, .45)';
    x.font = `700 12px ${POLICE}`;
    x.fillText('OUTILS', 28, 300);
    x.fillText('COMMUNS', 484, 300);
  });
}

function texturePhoto(accent) {
  return toile(96, 120, (x, w, h) => {
    const ciel = x.createLinearGradient(0, 0, 0, h * 0.7);
    ciel.addColorStop(0, '#a8d3e8');
    ciel.addColorStop(1, '#f5e6c8');
    x.fillStyle = ciel;
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#f0c46a';
    x.beginPath();
    x.arc(w * 0.72, h * 0.26, 11, 0, TAU);
    x.fill();
    x.fillStyle = nuance(accent, -0.12);
    x.beginPath();
    x.moveTo(0, h * 0.72);
    x.lineTo(w * 0.45, h * 0.44);
    x.lineTo(w * 0.8, h * 0.7);
    x.lineTo(w, h * 0.58);
    x.lineTo(w, h);
    x.lineTo(0, h);
    x.closePath();
    x.fill();
    x.fillStyle = '#6e8f5e';
    x.beginPath();
    x.moveTo(0, h * 0.86);
    x.quadraticCurveTo(w * 0.5, h * 0.72, w, h * 0.9);
    x.lineTo(w, h);
    x.lineTo(0, h);
    x.closePath();
    x.fill();
  });
}

const cacheEcrans = new Map();

function ecranTexture(seed, accent, mode) {
  const cle = `${accent}|${mode}`;
  if (!cacheEcrans.has(cle)) cacheEcrans.set(cle, textureEcran(seed, accent, mode));
  return cacheEcrans.get(cle);
}

let cachePhoto = null;

function photoTexture(accent) {
  if (!cachePhoto) cachePhoto = texturePhoto(accent);
  return cachePhoto;
}

function panneau(parent, texture, largeur, hauteur, x, y, z, rotY = 0, options = {}) {
  const fond = options.fond !== undefined ? options.fond : 0x292f31;
  const profondeur = options.profondeur || 0.04;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.add(box(largeur + 0.07, hauteur + 0.07, profondeur, fond, 0, 0, -profondeur / 2 - 0.002, { roughness: 0.62 }));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  face.position.z = 0.002;
  g.add(face);
  parent.add(g);
  return g;
}

function tableau(parent, texture, largeur, hauteur, x, y, z, rotY, accent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.add(box(largeur + 0.08, hauteur + 0.08, 0.035, 0xc3c8c4, 0, 0, -0.018, { roughness: 0.45, metalness: 0.25 }));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  face.position.z = 0.002;
  g.add(face);
  g.add(box(largeur * 0.62, 0.022, 0.07, 0xb1b6b3, 0, -hauteur / 2 - 0.035, 0.02, { roughness: 0.5, metalness: 0.2 }));
  const couleurs = [accent, 0xc4734a, 0x4f8b86];
  for (let i = 0; i < 3; i++) {
    const marqueur = cyl(0.009, 0.009, 0.09, couleurs[i], -0.09 + i * 0.09, -hauteur / 2 - 0.008, 0.04, 8, { roughness: 0.5 });
    marqueur.rotation.z = PI / 2;
    g.add(marqueur);
  }
  parent.add(g);
  return g;
}

function affiche(parent, texture, largeur, hauteur, x, y, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.add(box(largeur + 0.05, hauteur + 0.05, 0.03, 0x4a4640, 0, 0, -0.015, { roughness: 0.6 }));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  face.position.z = 0.002;
  g.add(face);
  parent.add(g);
  return g;
}

function horloge(parent, x, y, z, rotY, accent, rayon = 0.2) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  const bord = cyl(rayon + 0.026, rayon + 0.026, 0.04, 0x3b4144, 0, 0, -0.006, 28, { roughness: 0.5, metalness: 0.15 });
  bord.rotation.x = PI / 2;
  g.add(bord);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(rayon + 0.02, 32),
    new THREE.MeshBasicMaterial({ map: textureHorloge(accent), toneMapped: false })
  );
  face.position.z = 0.018;
  g.add(face);
  parent.add(g);
  return g;
}

function moniteur(parent, modeles, x, z, rot, texture, echelle = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.scale.setScalar(echelle);
  poser(modeles, 'ecran', g, 0, 0, 0, 0);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.285),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  face.position.set(0, 0.242, 0.024);
  g.add(face);
  parent.add(g);
  return g;
}

function portableFace(parent, modeles, x, z, angleFace, texture, echelle = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angleFace + PI;
  g.scale.setScalar(echelle);
  poser(modeles, 'portable', g, 0, 0, 0, 0);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.145),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  face.position.set(0, 0.123, 0.058);
  face.rotation.y = PI;
  g.add(face);
  parent.add(g);
  return g;
}

function claviers(parent, modeles, x, z, rot, accent, rng) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.add(box(0.4, 0.018, 0.13, 0x3e4448, 0, 0.009, 0, { roughness: 0.55 }));
  g.add(box(0.37, 0.004, 0.11, 0xcfd4d2, 0, 0.019, 0, { roughness: 0.5 }));
  for (let i = 0; i < 4; i++) {
    g.add(box(0.065, 0.002, 0.095, 0x5e6468, -0.13 + i * 0.085, 0.022, 0.002, { roughness: 0.5 }));
  }
  const souris = box(0.052, 0.016, 0.085, 0xd9d3c4, 0.28, 0.008, 0.006, { roughness: 0.5 });
  souris.rotation.y = (rng() - 0.5) * 0.2;
  g.add(souris);
  parent.add(g);
  return g;
}

function lampeBureau(parent, x, z, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(cyl(0.075, 0.085, 0.016, 0x4e5357, 0, 0.008, 0, 16, { roughness: 0.4, metalness: 0.35 }));
  g.add(cyl(0.011, 0.011, 0.3, 0x6b7074, 0, 0.16, 0, 8, { roughness: 0.4, metalness: 0.4 }));
  const bras = cyl(0.009, 0.009, 0.16, 0x6b7074, 0.04, 0.31, 0, 8, { roughness: 0.4, metalness: 0.4 });
  bras.rotation.z = -0.95;
  g.add(bras);
  const tete = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.12, 14, 1, true),
    mat(0x5b6064, { roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide })
  );
  tete.position.set(0.1, 0.37, 0);
  g.add(tete);
  const ampoule = new THREE.Mesh(
    new THREE.SphereGeometry(0.026, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe6ad, toneMapped: false })
  );
  ampoule.position.set(0.1, 0.345, 0);
  g.add(ampoule);
  g.add(box(0.05, 0.008, 0.05, hexNum(accent), 0.1, 0.31, 0));
  parent.add(g);
  return g;
}

function planteBureau(parent, x, z, rng, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const h = 0.06 + rng() * 0.035;
  g.add(cyl(h * 0.82, h * 0.64, h, 0xb8663e, 0, h / 2, 0, 12, { roughness: 0.85 }));
  g.add(cyl(h * 0.74, h * 0.74, 0.008, 0x5a3b26, 0, h - 0.003, 0, 12, { roughness: 0.95 }));
  const nb = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * TAU + rng() * 0.5;
    const tigeH = 0.06 + rng() * 0.1;
    const tige = cyl(0.005, 0.005, tigeH, FEUILLES[Math.floor(rng() * FEUILLES.length)], Math.cos(a) * 0.018, h + tigeH / 2, Math.sin(a) * 0.018, 5);
    tige.rotation.z = Math.cos(a) * 0.25;
    tige.rotation.x = -Math.sin(a) * 0.25;
    g.add(tige);
    const feuille = new THREE.Mesh(
      new THREE.SphereGeometry(0.018 + rng() * 0.012, 8, 6),
      mat(FEUILLES[Math.floor(rng() * FEUILLES.length)], { roughness: 0.8 })
    );
    feuille.scale.set(1, 0.5, 0.75);
    feuille.position.set(Math.cos(a) * (0.03 + rng() * 0.03), h + tigeH, Math.sin(a) * (0.03 + rng() * 0.03));
    g.add(feuille);
  }
  if (accent && rng() < 0.4) {
    const fleur = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(hexNum(accent), { roughness: 0.7 }));
    fleur.position.set(0.015, h + 0.15, 0.01);
    g.add(fleur);
  }
  parent.add(g);
  return g;
}

function tasseBureau(parent, x, z, couleur, echelle = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(echelle);
  g.add(cyl(0.04, 0.033, 0.075, couleur, 0, 0.0375, 0, 14, { roughness: 0.4 }));
  const cafe = new THREE.Mesh(new THREE.CircleGeometry(0.032, 14), mat(0x38251a, { roughness: 0.3 }));
  cafe.rotation.x = -PI / 2;
  cafe.position.y = 0.074;
  g.add(cafe);
  const anse = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 6, 12), mat(couleur, { roughness: 0.4 }));
  anse.position.set(0.045, 0.039, 0);
  anse.rotation.y = PI / 2;
  g.add(anse);
  parent.add(g);
  return g;
}

function tasseGlb(parent, modeles, x, z, rot, echelle = 0.68) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const t = poser(modeles, 'tasse', g, 0, 0, 0, 0, echelle);
  t.castShadow = true;
  parent.add(g);
  return g;
}

function pileLivres(parent, x, z, rng, n = 3, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  let h = 0;
  for (let i = 0; i < n; i++) {
    const l = 0.13 + rng() * 0.06;
    const p = 0.09 + rng() * 0.035;
    const e = 0.02 + rng() * 0.013;
    const b = box(l, e, p, LIVRES[Math.floor(rng() * LIVRES.length)], (rng() - 0.5) * 0.03, h + e / 2, (rng() - 0.5) * 0.02, { roughness: 0.78 });
    b.rotation.y = (rng() - 0.5) * 0.28;
    g.add(b);
    const pages = box(l * 0.88, e * 0.5, p * 0.9, 0xf3ecdb, 0, h + e / 2, 0, { roughness: 0.9 });
    pages.position.y += 0.004;
    g.add(pages);
    h += e;
  }
  parent.add(g);
  return g;
}

function rangLivres(parent, x, y, z, rng, n, largeur, accent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  let curseur = -largeur / 2;
  for (let i = 0; i < n; i++) {
    const ep = 0.023 + rng() * 0.017;
    const ht = 0.12 + rng() * 0.09;
    const prof = 0.1 + rng() * 0.035;
    const couleur = i === 0 && accent ? hexNum(accent) : LIVRES[Math.floor(rng() * LIVRES.length)];
    const b = box(ep, ht, prof, couleur, curseur + ep / 2, ht / 2, 0, { roughness: 0.78 });
    if (rng() < 0.16) b.rotation.z = (rng() - 0.5) * 0.22;
    g.add(b);
    if (rng() < 0.35) {
      const tranche = box(ep * 0.8, 0.012, 0.006, 0xf3ecdb, curseur + ep / 2, ht * (0.6 + rng() * 0.2), prof / 2 + 0.003);
      g.add(tranche);
    }
    curseur += ep + 0.005;
    if (curseur > largeur / 2 - 0.02) break;
  }
  parent.add(g);
  return g;
}

function cahierOuvert(parent, x, z, rot, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.add(box(0.2, 0.006, 0.15, nuance(accent, -0.05), 0, 0.003, 0, { roughness: 0.7 }));
  for (const cote of [-1, 1]) {
    const page = box(0.09, 0.004, 0.14, 0xf7f1e2, cote * 0.048, 0.009, 0, { roughness: 0.9 });
    page.rotation.z = cote * 0.012;
    g.add(page);
  }
  for (let i = 0; i < 4; i++) {
    g.add(box(0.07, 0.002, 0.003, 0x7f8a8c, -0.045, 0.012, -0.045 + i * 0.026, { roughness: 0.9 }));
    g.add(box(0.065, 0.002, 0.003, 0x7f8a8c, 0.045, 0.012, -0.045 + i * 0.026, { roughness: 0.9 }));
  }
  const stylo = cyl(0.004, 0.004, 0.12, hexNum(accent), 0.02, 0.014, 0.01, 6, { roughness: 0.4 });
  stylo.rotation.z = PI / 2;
  stylo.rotation.y = 0.35;
  g.add(stylo);
  parent.add(g);
  return g;
}

function carnetFerme(parent, x, z, rot, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.add(box(0.15, 0.012, 0.2, nuance(accent, -0.04), 0, 0.006, 0, { roughness: 0.7 }));
  g.add(box(0.142, 0.008, 0.19, 0xf4eddd, 0, 0.016, 0, { roughness: 0.9 }));
  g.add(box(0.144, 0.003, 0.03, hexNum(accent), 0, 0.021, 0.05, { roughness: 0.6 }));
  parent.add(g);
  return g;
}

function porteStylos(parent, x, z, rng, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(cyl(0.045, 0.038, 0.09, 0x50605e, 0, 0.045, 0, 12, { roughness: 0.55 }));
  const couleurs = [accent, '#c4734a', '#4f8b86', '#d9b26a', '#3f464c'];
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Color(couleurs[i]);
    const st = cyl(0.004, 0.004, 0.17 + rng() * 0.05, c.getHex(), (rng() - 0.5) * 0.05, 0.12, (rng() - 0.5) * 0.05, 6, { roughness: 0.5 });
    st.rotation.z = (rng() - 0.5) * 0.35;
    st.rotation.x = (rng() - 0.5) * 0.35;
    g.add(st);
  }
  parent.add(g);
  return g;
}

function cadrePhoto(parent, x, z, rot, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const pied = box(0.11, 0.012, 0.05, 0x6b5a45, 0, 0.006, 0.01, { roughness: 0.7 });
  g.add(pied);
  const cadre = new THREE.Group();
  cadre.rotation.x = -0.12;
  cadre.position.y = 0.03;
  cadre.add(box(0.13, 0.16, 0.012, 0x6b5a45, 0, 0.08, 0, { roughness: 0.6 }));
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.13), new THREE.MeshBasicMaterial({ map: photoTexture(accent), toneMapped: false }));
  photo.position.set(0, 0.08, 0.007);
  cadre.add(photo);
  g.add(cadre);
  parent.add(g);
  return g;
}

function telephone(parent, x, z, rot) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.add(box(0.065, 0.01, 0.125, 0x2f3538, 0, 0.005, 0, { roughness: 0.45 }));
  const ecran = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.095), new THREE.MeshBasicMaterial({ color: 0xcfe3e6, toneMapped: false }));
  ecran.rotation.x = -PI / 2;
  ecran.position.y = 0.011;
  g.add(ecran);
  parent.add(g);
  return g;
}

function casque(parent, x, z, rot, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const arceau = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 16, PI), mat(0x3f464c, { roughness: 0.5 }));
  arceau.position.y = 0.035;
  g.add(arceau);
  for (const cote of [-1, 1]) {
    const oreillette = cyl(0.03, 0.03, 0.025, hexNum(accent), cote * 0.075, 0.032, 0, 12, { roughness: 0.45 });
    oreillette.rotation.z = PI / 2;
    g.add(oreillette);
  }
  parent.add(g);
  return g;
}

function dossiers(parent, x, z, rot, accent, rng) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  for (let i = 0; i < 3; i++) {
    const d = box(0.17, 0.012, 0.23, nuance(accent, i * 0.04), (rng() - 0.5) * 0.02, 0.006 + i * 0.013, 0, { roughness: 0.75 });
    d.rotation.y = (rng() - 0.5) * 0.1;
    g.add(d);
    g.add(box(0.06, 0.004, 0.01, 0xf3ecdb, 0.02, 0.013 + i * 0.013, -0.11, { roughness: 0.9 }));
  }
  parent.add(g);
  return g;
}

function postitsBureau(parent, x, z, rot) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const couleurs = [0xf4d35e, 0xe79a9a, 0xa9c98a];
  for (let i = 0; i < 3; i++) {
    const n = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.06),
      new THREE.MeshBasicMaterial({ color: couleurs[i % couleurs.length], toneMapped: false })
    );
    n.rotation.x = -PI / 2;
    n.rotation.z = (i - 1) * 0.18;
    n.position.set(i * 0.035 - 0.035, 0.001 + i * 0.0005, i * 0.012);
    g.add(n);
  }
  parent.add(g);
  return g;
}

function corbeille(parent, x, y, z, accent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(cyl(0.105, 0.085, 0.28, 0x5e6668, 0, 0.14, 0, 16, { roughness: 0.5, metalness: 0.15 }));
  g.add(cyl(0.098, 0.098, 0.012, 0x444b4d, 0, 0.276, 0, 16, { roughness: 0.4 }));
  const alea = graine(Math.round(x * 97 + z * 131 + 17));
  for (let i = 0; i < 3; i++) {
    const papier = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 5), mat(0xf4efe2, { roughness: 0.95 }));
    papier.position.set((alea() - 0.5) * 0.08, 0.29 + i * 0.008, (alea() - 0.5) * 0.08);
    g.add(papier);
  }
  const liseré = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.006, 6, 18), mat(hexNum(accent), { roughness: 0.5 }));
  liseré.rotation.x = PI / 2;
  liseré.position.y = 0.24;
  g.add(liseré);
  parent.add(g);
  return g;
}

function sacADos(parent, x, y, z, rot, accent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;
  g.add(box(0.2, 0.28, 0.12, 0x5c6b62, 0, 0.14, 0, { roughness: 0.85 }));
  g.add(box(0.16, 0.13, 0.05, 0x4f5c54, 0, 0.09, 0.075, { roughness: 0.85 }));
  g.add(box(0.09, 0.03, 0.03, 0x3e4841, 0, 0.295, 0, { roughness: 0.8 }));
  for (const cote of [-1, 1]) {
    const sangle = box(0.03, 0.25, 0.015, hexNum(accent), cote * 0.055, 0.15, -0.068, { roughness: 0.8 });
    sangle.rotation.x = 0.12;
    g.add(sangle);
  }
  parent.add(g);
  return g;
}

function cartons(parent, x, y, z, rng) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const tailles = [
    [0.42, 0.3, 0.34, 0, 0.15, 0],
    [0.34, 0.24, 0.3, 0.08, 0.42, 0.04],
    [0.3, 0.2, 0.26, -0.3, 0.1, 0.2],
  ];
  tailles.forEach(([l, h, p, cx, cy, cz], i) => {
    const b = new THREE.Group();
    b.position.set(cx, cy, cz);
    b.rotation.y = (rng() - 0.5) * 0.5;
    b.add(box(l, h, p, CARTON, 0, 0, 0, { roughness: 0.92 }));
    b.add(box(l + 0.006, 0.05, p + 0.006, CARTON_FONCE, 0, h / 2 - 0.025, 0, { roughness: 0.92 }));
    b.add(box(0.05, 0.004, p + 0.01, 0xd8c5a5, 0, h / 2 + 0.002, 0, { roughness: 0.8 }));
    if (i === 1) b.add(box(l * 0.4, 0.008, 0.003, 0xf3ecdb, 0.05, 0, -p / 2 - 0.002, { roughness: 0.9 }));
    g.add(b);
  });
  parent.add(g);
  return g;
}

function suspension(parent, x, yBeam, z, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const yBas = yBeam - 0.34;
  const corde = cyl(0.006, 0.006, yBeam - yBas, 0x4a4238, 0, (yBeam + yBas) / 2, 0, 6, { roughness: 0.8 });
  g.add(corde);
  const chapeau = cyl(0.03, 0.03, 0.025, 0x3f3a32, 0, yBeam - 0.012, 0, 10, { roughness: 0.6 });
  g.add(chapeau);
  const abat = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.17, 16, 1, true),
    mat(0xf3ecdb, { roughness: 0.62, side: THREE.DoubleSide })
  );
  abat.position.y = yBas + 0.085;
  g.add(abat);
  const doublure = new THREE.Mesh(
    new THREE.ConeGeometry(0.165, 0.155, 16, 1, true),
    mat(hexNum(accent), { roughness: 0.55, side: THREE.BackSide })
  );
  doublure.position.y = yBas + 0.083;
  g.add(doublure);
  const ampoule = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe7b0, toneMapped: false })
  );
  ampoule.position.y = yBas + 0.06;
  g.add(ampoule);
  parent.add(g);
  return g;
}

function planteSuspendue(parent, x, yBeam, z, rng) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const yPot = yBeam - 0.55;
  for (const dx of [-0.09, 0.09]) {
    g.add(cyl(0.004, 0.004, 0.55, 0x8a806c, dx, yBeam - 0.275, 0, 5, { roughness: 0.9 }));
  }
  g.add(cyl(0.105, 0.08, 0.15, 0xb8663e, 0, yPot, 0, 12, { roughness: 0.88 }));
  g.add(cyl(0.096, 0.096, 0.008, 0x5a3b26, 0, yPot + 0.072, 0, 12, { roughness: 0.95 }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + rng() * 0.4;
    const longueur = 0.15 + rng() * 0.4;
    const tige = cyl(0.004, 0.004, longueur, 0x4f7a3f, Math.cos(a) * 0.09, yPot + 0.05 - longueur / 2, Math.sin(a) * 0.09, 5, { roughness: 0.85 });
    tige.rotation.z = Math.cos(a) * 0.35;
    tige.rotation.x = -Math.sin(a) * 0.35;
    g.add(tige);
    const nbFeuilles = 2 + Math.floor(rng() * 3);
    for (let j = 0; j < nbFeuilles; j++) {
      const f = new THREE.Mesh(
        new THREE.SphereGeometry(0.02 + rng() * 0.01, 7, 5),
        mat(FEUILLES[Math.floor(rng() * FEUILLES.length)], { roughness: 0.82 })
      );
      f.scale.set(1, 0.45, 0.7);
      f.position.set(
        Math.cos(a) * (0.09 + 0.05) + (rng() - 0.5) * 0.06,
        yPot + 0.04 - longueur * (j / nbFeuilles) - rng() * 0.04,
        Math.sin(a) * (0.09 + 0.05) + (rng() - 0.5) * 0.06
      );
      g.add(f);
    }
  }
  parent.add(g);
  return g;
}

function etagereMurale(parent, x, y, z, rotY, largeur, rng, accent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  const prof = 0.22;
  g.add(box(largeur, 0.045, prof, 0xcfa46c, 0, 0, prof / 2, { roughness: 0.8 }));
  for (const sx of [-largeur / 2 + 0.13, largeur / 2 - 0.13]) {
    g.add(box(0.035, 0.15, 0.035, 0x64686b, sx, -0.09, 0.05, { roughness: 0.5, metalness: 0.25 }));
    const ep = box(0.03, 0.03, 0.16, 0x64686b, sx, -0.05, 0.11, { roughness: 0.5, metalness: 0.25 });
    ep.rotation.x = -0.7;
    g.add(ep);
  }
  rangLivres(g, -largeur * 0.28, 0.0225, prof * 0.58, rng, 7, largeur * 0.42, accent);
  pileLivres(g, largeur * 0.22, prof * 0.58, rng, 2, (rng() - 0.5) * 0.4).position.y = 0.0225;
  planteBureau(g, largeur * 0.38, prof * 0.5, rng, accent).position.y = 0.0225;
  const boite = box(0.11, 0.09, 0.1, nuance(accent, -0.1), -largeur * 0.02, 0.0675, prof * 0.55, { roughness: 0.75 });
  boite.rotation.y = (rng() - 0.5) * 0.3;
  g.add(boite);
  parent.add(g);
  return g;
}

function notesCorkboard(parent, x, y, z, rotY, rng) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  const couleurs = [0xf4d35e, 0xe79a9a, 0xa9c98a, 0x9fc0d8];
  for (let i = 0; i < 5; i++) {
    const note = new THREE.Mesh(
      new THREE.PlaneGeometry(0.075 + rng() * 0.025, 0.07 + rng() * 0.02),
      new THREE.MeshBasicMaterial({ color: couleurs[i % couleurs.length], toneMapped: false })
    );
    note.position.set((rng() - 0.5) * 0.82, (rng() - 0.5) * 0.5, 0.012);
    note.rotation.z = (rng() - 0.5) * 0.25;
    g.add(note);
    const punaise = cyl(0.008, 0.008, 0.014, 0xb64a44, note.position.x, note.position.y + 0.03, 0.026, 8, { roughness: 0.4 });
    punaise.rotation.x = PI / 2;
    g.add(punaise);
  }
  parent.add(g);
  return g;
}

function consoleCafe(parent, modeles, x, z, rotY, rng, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  const l = 1.05;
  const h = 0.76;
  const p = 0.42;
  g.add(box(l, h, p, 0xe7dfcd, 0, h / 2, 0, { roughness: 0.85 }));
  g.add(box(l + 0.05, 0.05, p + 0.05, 0xcfa46c, 0, h + 0.025, 0, { roughness: 0.75 }));
  for (const cote of [-1, 1]) {
    g.add(box(l * 0.42, h * 0.66, 0.012, 0xf3ecdb, cote * l * 0.245, h * 0.46, p / 2 + 0.006, { roughness: 0.75 }));
    const poignee = box(0.12, 0.012, 0.018, 0x8a8f92, cote * l * 0.245, h * 0.58, p / 2 + 0.014, { roughness: 0.4, metalness: 0.4 });
    g.add(poignee);
  }
  poser(modeles, 'machineCafe', g, -0.3, h + 0.05, 0.02, 0.6, 1.1);
  for (let i = 0; i < 3; i++) {
    tasseBureau(g, -0.05 + i * 0.13, 0.12, i === 1 ? hexNum(accent) : 0xf3ecdb, 0.9).position.y = h + 0.05;
  }
  const bocal = cyl(0.05, 0.05, 0.13, 0xe7cdb6, 0.36, h + 0.115, -0.03, 10, { roughness: 0.35, transparent: true, opacity: 0.75 });
  g.add(bocal);
  g.add(cyl(0.052, 0.052, 0.02, 0x8a6a4c, 0.36, h + 0.19, -0.03, 10, { roughness: 0.6 }));
  planteBureau(g, 0.12, 0.0, rng, accent).position.y = h + 0.05;
  parent.add(g);
  return g;
}

function porteManteau(parent, x, y, z, accent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(cyl(0.22, 0.24, 0.04, 0x5a5044, 0, 0.02, 0, 16, { roughness: 0.7 }));
  g.add(cyl(0.022, 0.022, 1.72, 0x9c7145, 0, 0.9, 0, 10, { roughness: 0.7 }));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(0x9c7145, { roughness: 0.7 }))).position.y = 1.78;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const crochet = cyl(0.012, 0.012, 0.16, 0x6b5a45, Math.cos(a) * 0.08, 1.58, Math.sin(a) * 0.08, 6, { roughness: 0.6 });
    crochet.rotation.z = Math.cos(a) * 0.7;
    crochet.rotation.x = -Math.sin(a) * 0.7;
    g.add(crochet);
  }
  g.add(box(0.3, 0.46, 0.16, 0x4f5c54, 0.19, 1.28, 0.04, { roughness: 0.9 }));
  g.add(box(0.09, 0.4, 0.12, 0x4f5c54, 0.3, 1.25, 0.02, { roughness: 0.9 }));
  const echarpe = box(0.08, 0.5, 0.05, hexNum(accent), -0.14, 1.35, 0.05, { roughness: 0.9 });
  echarpe.rotation.z = 0.12;
  g.add(echarpe);
  parent.add(g);
  return g;
}

function statuette(parent, x, z, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(cyl(0.045, 0.05, 0.02, 0x3e4648, 0, 0.01, 0, 10, { roughness: 0.5 }));
  g.add(cyl(0.02, 0.03, 0.07, hexNum(accent), 0, 0.055, 0, 8, { roughness: 0.55 }));
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), mat(0xe4b57f, { roughness: 0.6 }));
  tete.position.y = 0.12;
  g.add(tete);
  parent.add(g);
  return g;
}

function formeMini(parent, modeles, nom, x, y, z, rot, echelle) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;
  const m = poser(modeles, nom, g, 0, 0, 0, 0, echelle);
  m.castShadow = true;
  parent.add(g);
  return g;
}

export function decorerBureau(parent, modeles, { poste, place, i, agent, spec, index, sol }) {
  const d = new THREE.Group();
  d.position.set(poste.x, sol + 0.785, poste.z);
  d.rotation.y = poste.rot;
  parent.add(d);

  const rng = graine(7000 + index * 101 + i * 17);
  const style = (index + i) % 5;
  const accent = spec.accent;
  const modes = { forge: 0, vitrines: 4, mobiles: 0, saas: 2, cyber: 5, veille: 3, ops: 2, data: 1, bi: 1 };
  let mode = modes[spec.id] !== undefined ? modes[spec.id] : 0;
  if (style === 1) mode = 4;
  if (style === 3) mode = 3;
  const ecran = ecranTexture(index * 31 + i * 7 + 3, accent, mode);

  if (style !== 3) {
    moniteur(d, modeles, -0.1, 0.09, (rng() - 0.5) * 0.1, ecran, style === 4 ? 1.05 : 1);
    const clavier = new THREE.Group();
    clavier.position.set(-0.08, 0, 0.285);
    clavier.rotation.y = (rng() - 0.5) * 0.06;
    claviers(clavier, modeles, 0, 0, 0, accent, rng);
    d.add(clavier);
  } else {
    portableFace(d, modeles, -0.02, 0.14, 0, ecran, 1.06);
    const souris = box(0.052, 0.016, 0.085, 0xd9d3c4, 0.22, 0.008, 0.27, { roughness: 0.5 });
    souris.rotation.y = -0.15;
    d.add(souris);
  }

  const couleursTasse = [hexNum(accent), 0xf3e7cf, 0xd9583f, 0x3f5c6b, 0xe0b84f];
  const tasseCouleur = couleursTasse[Math.floor(rng() * couleursTasse.length)];
  if (rng() < 0.7) tasseBureau(d, 0.55, 0.2, tasseCouleur);
  else tasseGlb(d, modeles, 0.54, 0.18, rng() * TAU, 0.64);
  if (agent.etat === 'pause') tasseBureau(d, -0.5, 0.28, 0xf0e6d2);

  if (style === 0) {
    planteBureau(d, -0.58, -0.12, rng, accent);
    pileLivres(d, 0.48, -0.2, rng, 3, (rng() - 0.5) * 0.4);
    porteStylos(d, 0.62, 0.02, rng, accent);
    carnetFerme(d, 0.3, 0.0, (rng() - 0.5) * 0.4, accent);
    postitsBureau(d, -0.38, 0.24, 0.2);
  } else if (style === 1) {
    lampeBureau(d, -0.58, -0.14, accent);
    planteBureau(d, 0.58, -0.18, rng, accent);
    cadrePhoto(d, -0.32, -0.26, -0.2, accent);
    pileLivres(d, 0.32, -0.16, rng, 2, 0.3);
    cahierOuvert(d, 0.3, 0.06, -0.25, accent);
    porteStylos(d, 0.62, 0.1, rng, accent);
    postitsBureau(d, 0.45, 0.27, -0.1);
  } else if (style === 2) {
    dossiers(d, -0.5, -0.18, 0.1, accent, rng);
    telephone(d, 0.55, 0.02, -0.4);
    porteStylos(d, 0.6, -0.17, rng, accent);
    planteBureau(d, -0.58, 0.12, rng, accent);
    carnetFerme(d, 0.3, 0.06, 0.15, accent);
    postitsBureau(d, -0.28, 0.27, 0.3);
    if (rng() < 0.6) pileLivres(d, 0.35, -0.26, rng, 3, -0.2);
  } else if (style === 3) {
    planteBureau(d, -0.58, -0.14, rng, accent);
    casque(d, 0.55, 0.02, -0.5, accent);
    carnetFerme(d, 0.32, 0.02, 0.2, accent);
    pileLivres(d, 0.5, -0.24, rng, 2, 0.3);
    postitsBureau(d, -0.38, 0.24, 0.15);
    if (rng() < 0.6) porteStylos(d, -0.55, 0.18, rng, accent);
  } else {
    planteBureau(d, -0.58, -0.16, rng, accent);
    pileLivres(d, 0.48, -0.22, rng, 4, (rng() - 0.5) * 0.35);
    dossiers(d, 0.1, -0.16, -0.1, accent, rng);
    statuette(d, -0.3, 0.24, accent);
    postitsBureau(d, 0.36, 0.3, 0.2);
    porteStylos(d, 0.62, 0.02, rng, accent);
  }

  if (i === 0) corbeille(parent, poste.x + (poste.x < 0 ? 1.0 : -1.0), sol, poste.z + 0.5, accent);
  if (i === 1) sacADos(parent, place.x + (place.x < 0 ? 0.36 : -0.36), sol, place.z + 0.1, (rng() - 0.5) * 0.5, accent);
}

function placementTableau(kind) {
  switch (kind) {
    case 'forge':
      return { x: -3.55, largeur: 1.9 };
    case 'data':
      return { x: 3.5, largeur: 1.8 };
    case 'bastion':
      return { x: -3.7, largeur: 1.75 };
    case 'bi':
      return { x: -0.55, largeur: 1.7 };
    default:
      return { x: -3.55, largeur: 1.8 };
  }
}

export function decorerPavillon(spec, index, g, modeles) {
  const rng = graine(5200 + index * 173);
  const accent = spec.accent;
  const info = { pole: spec.pole, lieu: spec.lieu, mission: spec.mission, accent };

  panneau(g, textureEnseigne(info), 5.7, 0.72, 0, 2.51, -3.968, 0, { fond: 0x252b2d });
  panneau(g, textureEnseigneExterieure(info), 2.55, 0.33, 0, 3.08, 4.19, 0, { fond: hexNum(accent), profondeur: 0.05 });

  const placeTab = placementTableau(spec.kind);
  tableau(g, textureTableau(spec.kind, index * 41 + 3, accent), placeTab.largeur, 0.88, placeTab.x, 1.56, -3.955, 0, accent);
  horloge(g, 4.62, 2.5, -3.94, 0, accent, 0.19);

  const cote = index % 2 === 0 ? 1 : -1;
  etagereMurale(g, cote * 5.03, 1.89, -1.25, -cote * (PI / 2), 1.45, rng, accent);

  affiche(g, textureAffiche(index * 7 + 2, accent), 0.55, 0.76, -cote * 5.055, 1.92, 1.0, cote * (PI / 2));
  affiche(g, textureAffiche(index * 7 + 5, accent), 0.55, 0.76, -cote * 5.055, 1.92, 2.05, cote * (PI / 2));

  g.add(box(10.25, 0.1, 0.12, 0x9c7145, 0, 2.72, 0.4, { roughness: 0.75 }));
  suspension(g, -1.55, 2.67, 0.4, accent);
  suspension(g, 1.55, 2.67, 0.4, accent);
  planteSuspendue(g, 3.95, 2.67, 0.4, rng);

  formeMini(g, modeles, 'planteHaute', 4.42, 0.35, -1.95, (rng() - 0.5) * 0.8, 1.0);

  if (spec.kind !== 'forge' && spec.kind !== 'bastion') {
    cartons(g, 4.35, 0.35, -3.28, rng);
  }

  if (['atelier', 'mobile', 'vigie', 'bureau'].includes(spec.kind)) {
    consoleCafe(g, modeles, 4.62, 0.88, -PI / 2, rng, accent);
  }

  if (spec.kind === 'bi') {
    notesCorkboard(g, -3.35, 1.15, -3.93, 0, rng);
  }

  if (index % 3 === 0) {
    porteManteau(g, -4.72, 0.35, 2.45, accent);
  }

  const taille = 1 + rng() * 0.25;
  const planteSol = planteBureau(g, -4.8, 0.0, rng, accent);
  planteSol.position.y = 0.35;
  planteSol.scale.setScalar(taille);
  formeMini(g, modeles, 'caisse', 3.95, 0.35, 2.0, rng() * 0.8, 0.9);
  corbeille(g, 3.9, 0.35, 1.15, accent);
}

export function decorerQG(parent, modeles, { Wc, Dc, Hc, sol }) {
  const accent = '#b08145';
  const rng = graine(66013);
  const info = {
    pole: 'Direction Générale',
    lieu: 'LePrince WorkLand',
    mission: 'Arbitrages, comptes rendus, tableau des travaux',
    accent,
  };

  panneau(parent, textureEnseigne(info), 6.4, 0.78, 0, 2.69, -5.09, 0, { fond: 0x252b2d });
  panneau(parent, textureEnseigneExterieure(info), 4.6, 0.3, 0, Hc + 0.14, Dc / 2 + 0.02, 0, { fond: hexNum(accent), profondeur: 0.04 });

  tableau(parent, textureTableau('direction', 7, accent), 1.9, 0.92, Wc / 2 - 0.055, 1.95, -1.55, -PI / 2, accent);
  tableau(parent, textureTableau('bureau', 19, accent), 1.7, 0.85, -Wc / 2 + 0.055, 1.9, -1.55, PI / 2, accent);
  horloge(parent, Wc / 2 - 0.055, 2.55, -4.2, -PI / 2, accent, 0.2);
  affiche(parent, textureAffiche(3, accent), 0.6, 0.85, -Wc / 2 + 0.05, 1.95, 1.55, PI / 2);
  affiche(parent, textureAffiche(5, accent), 0.6, 0.85, Wc / 2 - 0.05, 1.95, 2.15, -PI / 2);

  parent.add(box(Wc - 0.3, 0.1, 0.14, 0x9c7145, 0, 2.98, 0.55, { roughness: 0.75 }));
  suspension(parent, -1.8, 2.93, 0.55, accent);
  suspension(parent, 1.8, 2.93, 0.55, accent);
  planteSuspendue(parent, 5.1, 2.93, 0.55, rng);

  poser(modeles, 'tapis', parent, 0, sol + 0.012, 0.55, 0, 0.9);

  const table = new THREE.Group();
  table.position.set(0, sol + 0.845, 0.55);
  parent.add(table);

  const carafe = new THREE.Group();
  carafe.position.set(0.3, 0, 0.02);
  carafe.add(cyl(0.06, 0.075, 0.19, 0xbcd8e0, 0, 0.095, 0, 16, { transparent: true, opacity: 0.55, roughness: 0.15 }));
  carafe.add(cyl(0.026, 0.048, 0.07, 0xbcd8e0, 0, 0.22, 0, 12, { transparent: true, opacity: 0.55, roughness: 0.15 }));
  carafe.add(cyl(0.05, 0.05, 0.11, 0x7fb7a8, 0, 0.075, 0, 12, { transparent: true, opacity: 0.72, roughness: 0.2 }));
  table.add(carafe);

  const verres = [[-0.45, 0.18], [-0.22, -0.26], [0.72, 0.24], [0.52, -0.24], [0.02, 0.38], [-0.78, 0.06]];
  verres.forEach(([vx, vz]) => {
    const v = new THREE.Group();
    v.position.set(vx, 0, vz);
    v.add(cyl(0.04, 0.032, 0.09, 0xc7e2e8, 0, 0.045, 0, 12, { transparent: true, opacity: 0.45, roughness: 0.12 }));
    v.add(cyl(0.033, 0.033, 0.03, 0x8fc2b8, 0, 0.04, 0, 12, { transparent: true, opacity: 0.7, roughness: 0.15 }));
    table.add(v);
  });

  const coupe = new THREE.Group();
  coupe.position.set(-0.42, 0, -0.02);
  coupe.add(cyl(0.16, 0.1, 0.07, 0xe4d7b8, 0, 0.035, 0, 16, { roughness: 0.55 }));
  const fruits = [
    [0.02, 0.09, 0.02, 0xe07a3f, 0.042],
    [-0.08, 0.08, 0.03, 0x8d9a4c, 0.036],
    [0.08, 0.08, -0.04, 0xc94b3f, 0.038],
    [-0.03, 0.08, -0.08, 0xd9b26a, 0.034],
    [0.06, 0.14, 0.01, 0xe0a34a, 0.036],
  ];
  fruits.forEach(([fx, fy, fz, c, r]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(c, { roughness: 0.7 }));
    f.position.set(fx, fy, fz);
    coupe.add(f);
  });
  table.add(coupe);

  const vase = new THREE.Group();
  vase.position.set(0.06, 0, -0.32);
  vase.add(cyl(0.04, 0.05, 0.12, 0xe7dfcd, 0, 0.06, 0, 12, { roughness: 0.4 }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const tige = cyl(0.004, 0.004, 0.14 + rng() * 0.07, 0x5f8f4e, Math.cos(a) * 0.015, 0.18, Math.sin(a) * 0.015, 5, { roughness: 0.85 });
    tige.rotation.z = Math.cos(a) * 0.22;
    vase.add(tige);
    const fleur = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat(i % 2 ? hexNum(accent) : 0xe79a9a, { roughness: 0.7 }));
    fleur.scale.set(1, 0.7, 1);
    fleur.position.set(Math.cos(a) * 0.05, 0.26 + rng() * 0.04, Math.sin(a) * 0.05);
    vase.add(fleur);
  }
  table.add(vase);

  const angles = [0, 1, 2, 3, 4, 5, 6, 7];
  angles.forEach((iAng, j) => {
    const a = (iAng / 8) * TAU;
    const cx = Math.cos(a) * 0.95;
    const cz = Math.sin(a) * 0.42;
    const face = Math.atan2(Math.cos(a), Math.sin(a));
    if (j === 0 || j === 4) {
      portableFace(table, modeles, cx, cz, face, ecranTexture(900 + j * 7, accent, j === 0 ? 1 : 2), 0.9);
    } else {
      carnetFerme(table, cx, cz, face, accent);
      if (j % 2 === 1) tasseBureau(table, cx + Math.cos(a) * -0.14, cz + Math.sin(a) * -0.12, hexNum(accent), 1.05);
    }
  });

  const bureau = new THREE.Group();
  bureau.position.set(0, sol + 0.605, -3.72);
  parent.add(bureau);
  moniteur(bureau, modeles, -0.12, 0.18, 0.05, ecranTexture(31, accent, 1), 1.08);
  const clavier = new THREE.Group();
  clavier.position.set(-0.12, 0, 0.43);
  clavier.rotation.y = 0.02;
  claviers(clavier, modeles, 0, 0, 0, accent, rng);
  bureau.add(clavier);
  lampeBureau(bureau, -0.56, 0.5, accent);
  pileLivres(bureau, -0.48, -0.42, rng, 3, 0.15);
  cadrePhoto(bureau, -0.15, -0.45, -0.18, accent);
  tasseBureau(bureau, 0.42, 0.38, hexNum(accent));
  portableFace(bureau, modeles, 0.5, 0.1, -0.55, ecranTexture(44, accent, 0), 0.9);
  porteStylos(bureau, 0.63, -0.32, rng, accent);
  planteBureau(bureau, 0.56, 0.56, rng, accent);

  poser(modeles, 'bibliotheque', parent, -5.85, sol, -4.55, 0);
  poser(modeles, 'bibliotheque', parent, 5.85, sol, -4.55, 0);
  planteBureau(parent, -5.85, -4.5, rng, accent).position.y = sol + 1.755;
  planteBureau(parent, 5.85, -4.5, rng, accent).position.y = sol + 1.755;

  consoleCafe(parent, modeles, 6.35, 1.3, -PI / 2, rng, accent);
  corbeille(parent, 1.15, sol, -3.35, accent);
  porteManteau(parent, -6.2, sol, 2.9, accent);
  cartons(parent, -5.7, sol, 3.75, rng);
}

export function decorerAtelier(parent, modeles) {
  const sol = 0.28;
  const accent = '#8d9a4c';
  const rng = graine(93017);
  const info = {
    pole: 'Outillage commun',
    lieu: "L'Atelier des Ateliers",
    mission: "Outils, impressions et prototypes de l'équipe",
    accent,
  };

  panneau(parent, textureEnseigne(info), 3.55, 0.55, 0, 2.2, -2.005, 0, { fond: 0x252b2d });
  tableau(parent, textureTableau('atelier', 51, accent), 1.25, 0.74, -2.52, 1.5, -2.0, 0, accent);
  panneau(parent, textureOutils(9, accent), 1.3, 0.8, 2.45, 1.53, -1.995, 0, { fond: 0x343b3e });
  horloge(parent, -2.52, 2.16, -1.985, 0, accent, 0.17);

  parent.add(box(5.9, 0.09, 0.11, 0x9c7145, 0, 2.46, 0.4, { roughness: 0.75 }));
  suspension(parent, -1.5, 2.41, 0.4, accent);
  suspension(parent, 1.5, 2.41, 0.4, accent);
  planteSuspendue(parent, 2.6, 2.41, 0.4, rng);

  poser(modeles, 'bibliotheque', parent, -2.72, sol, 0.85, PI / 2);
  planteBureau(parent, -2.72, 0.85, rng, accent).position.y = sol + 1.755;

  const etabli = new THREE.Group();
  etabli.position.set(0.2, 1.185, -1.15);
  parent.add(etabli);
  portableFace(etabli, modeles, 0.34, 0.08, 0, ecranTexture(73, accent, 4), 0.95);
  const peintures = [0xc4734a, 0x4f8b86, 0xd9b26a, 0x7c6a8f, 0x6e8f5f];
  peintures.forEach((c, i) => {
    const pot = new THREE.Group();
    pot.position.set(-1.25 + i * 0.16, 0, -0.22 + (i % 2) * 0.12);
    pot.add(cyl(0.045, 0.045, 0.09, 0xe7dfcd, 0, 0.045, 0, 10, { roughness: 0.4 }));
    pot.add(cyl(0.038, 0.038, 0.008, c, 0, 0.09, 0, 10, { roughness: 0.35 }));
    pot.add(cyl(0.014, 0.014, 0.12, 0x8a6a4c, 0.01, 0.15, 0, 5, { roughness: 0.5 }));
    etabli.add(pot);
  });
  const bocalPinceaux = new THREE.Group();
  bocalPinceaux.position.set(-0.95, 0, 0.16);
  bocalPinceaux.add(cyl(0.05, 0.045, 0.13, 0xbfd4d8, 0, 0.065, 0, 10, { transparent: true, opacity: 0.55, roughness: 0.25 }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const pinceau = cyl(0.004, 0.004, 0.2, 0x9c7145, Math.cos(a) * 0.02, 0.17, Math.sin(a) * 0.02, 5, { roughness: 0.5 });
    pinceau.rotation.z = Math.cos(a) * 0.18;
    bocalPinceaux.add(pinceau);
    const poils = cyl(0.007, 0.004, 0.03, hexNum(peintures[i % peintures.length]), Math.cos(a) * 0.048, 0.26, Math.sin(a) * 0.048, 5, { roughness: 0.7 });
    bocalPinceaux.add(poils);
  }
  etabli.add(bocalPinceaux);
  cahierOuvert(etabli, 0.02, 0.2, 0.2, accent);
  tasseBureau(etabli, 1.25, 0.14, 0xf3e7cf);
  planteBureau(etabli, 1.5, -0.2, rng, accent);
  pileLivres(etabli, -0.5, 0.15, rng, 2, -0.3);

  for (let i = 0; i < 2; i++) {
    const toilePeinte = new THREE.Group();
    toilePeinte.position.set(-1.55 + i * 0.62, sol + 0.35, -1.9);
    toilePeinte.rotation.x = -0.14;
    toilePeinte.rotation.y = 0.1;
    toilePeinte.add(box(0.56, 0.72, 0.035, 0x9c7145, 0, 0, 0, { roughness: 0.7 }));
    toilePeinte.add(box(0.5, 0.66, 0.01, 0xf4efe2, 0, 0, 0.02, { roughness: 0.9 }));
    const tache = new THREE.Mesh(new THREE.CircleGeometry(0.1 + i * 0.04, 14), mat(i ? hexNum(accent) : 0xc4734a, { roughness: 0.8 }));
    tache.position.set(0.02, 0.02, 0.03);
    toilePeinte.add(tache);
    parent.add(toilePeinte);
  }

  formeMini(parent, modeles, 'caisse', 2.05, sol, 1.55, 0.5, 1.0);
  corbeille(parent, 1.7, sol, 1.85, accent);
  cartons(parent, -2.5, sol, 2.0, rng);
  porteManteau(parent, 2.55, sol, 1.9, accent);
}
