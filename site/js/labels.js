import * as THREE from 'three';
import { ETATS } from './data.js';

const vMonde = new THREE.Vector3();
const vProj = new THREE.Vector3();

function chevauche(x, largeur, haut, bas, p) {
  return (
    Math.abs(x - p.x) < (largeur + p.largeur) / 2 + 6 &&
    bas > p.haut &&
    haut < p.bas
  );
}

export function creerLabels(conteneur) {
  const lieux = [];
  const agents = [];
  let filtre = null;

  function definirFiltreAgent(fn) {
    filtre = typeof fn === 'function' ? fn : null;
  }

  function ajouterLieu({ objet, lieu, pole, accent, nbAgents, poleIds = [] }) {
    const el = document.createElement('div');
    el.className = 'lbl lbl-lieu';
    el.innerHTML = `
      <div class="carte-lieu">
        <div class="trait" style="background:${accent}"></div>
        <div class="texte">
          <span class="lieu">${lieu}</span>
          <span class="pole">${pole}${nbAgents ? ` - ${nbAgents} agent${nbAgents > 1 ? 's' : ''}` : ''}</span>
        </div>
      </div>`;
    conteneur.appendChild(el);
    lieux.push({ el, objet, type: 'lieu', plein: true, poleIds });
  }

  function ajouterAgent(a) {
    const etat = ETATS[a.etat];
    const prenom = a.nom.split(' ')[0];
    const el = document.createElement('div');
    el.className = 'lbl lbl-agent';
    el.innerHTML = `
      <div class="carte-agent">
        <span class="ligne">
          <i style="background:${etat.couleur}"></i>
          <b>${prenom}</b>
          <span class="etat-court">${etat.libelle.toLowerCase()}</span>
        </span>
        <span class="detail">
          <span class="nom">${a.nom}</span>
          <span class="poste">${a.poste}</span>
          <span class="etat-plein" style="color:${etat.couleur}">${etat.libelle}</span>
        </span>
      </div>`;
    conteneur.appendChild(el);
    agents.push({
      el,
      nom: a.nom,
      point: el.querySelector('.ligne i'),
      etatCourt: el.querySelector('.etat-court'),
      etatPlein: el.querySelector('.etat-plein'),
      objet: a.ancre,
      type: 'agent',
      poleId: a.poleId,
      plein: false,
      mesure: null,
    });
  }

  function majActivite(nom, libelle, couleur) {
    const l = agents.find((a) => a.nom === nom);
    if (!l) return;
    if (l.point) l.point.style.background = couleur;
    if (l.etatCourt) l.etatCourt.textContent = libelle.toLowerCase();
    if (l.etatPlein) {
      l.etatPlein.textContent = libelle;
      l.etatPlein.style.color = couleur;
    }
  }

  function mesurer() {
    for (const l of [...lieux, ...agents]) {
      if (l.type === 'lieu') {
        l.w = l.el.offsetWidth;
        l.h = l.el.offsetHeight;
      } else {
        l.el.classList.remove('plein');
        const compact = { w: l.el.offsetWidth, h: l.el.offsetHeight };
        l.el.classList.add('plein');
        const plein = { w: l.el.offsetWidth, h: l.el.offsetHeight };
        l.el.classList.remove('plein');
        l.mesure = { compact, plein };
      }
    }
  }

  function cadre(l, w, h, actifId) {
    if (actifId && l.type === 'lieu' && !l.poleIds.includes(actifId)) return null;
    if (l.type === 'agent' && filtre && !filtre(l.nom)) return null;
    l.objet.getWorldPosition(vMonde);
    vProj.copy(vMonde).project(l.camera);

    if (vProj.z >= 1) return null;
    const x = (vProj.x * 0.5 + 0.5) * w;
    const y = (-vProj.y * 0.5 + 0.5) * h;
    if (x < -260 || x > w + 260 || y < -120 || y > h + 120) return null;

    if (l.type === 'agent') {
      const distance = l.camera.position.distanceTo(vMonde);
      l.distance = distance;
      const plein = l.poleId === actifId || distance < 32;
      if (actifId && l.poleId !== actifId) return null;
      if (plein !== l.plein) {
        l.plein = plein;
        l.el.classList.toggle('plein', plein);
      }
      const m = l.mesure[plein ? 'plein' : 'compact'];
      l.w = m.w;
      l.h = m.h;
    }

    return { x, y };
  }

  function mettreAJour(camera, actifId) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const l of [...lieux, ...agents]) l.el.style.opacity = '0';

    const candidats = [];
    for (const l of [...lieux, ...agents]) {
      l.camera = camera;
      const p = cadre(l, w, h, actifId);
      if (p) candidats.push({ l, ancreX: p.x, ancreY: p.y });
    }

    const places = [];
    const ordre = [
      ...candidats.filter((c) => c.l.type === 'lieu'),
      ...candidats.filter((c) => c.l.type === 'agent'),
    ];

    for (const c of ordre) {
      const l = c.l;
      const largeur = l.w || 150;
      const hauteur = l.h || 38;
      const x = Math.min(Math.max(c.ancreX, largeur / 2 + 10), w - largeur / 2 - 10);

      const maxPas = l.type === 'agent' && !l.plein ? 3 : 8;
      let pose = null;
      for (let pas = 0; pas < maxPas && !pose; pas++) {
        const delta = pas * (hauteur + 5);
        const essais = pas === 0 ? [c.ancreY] : [c.ancreY - delta, c.ancreY + delta];
        for (const bas of essais) {
          const haut = bas - hauteur;
          if (haut < 8 || bas > h - 8) continue;
          if (places.some((p) => chevauche(x, largeur, haut, bas, p))) continue;
          pose = { x, haut, bas, largeur };
          break;
        }
      }

      if (!pose) {
        l.el.style.opacity = '0';
        continue;
      }
      places.push(pose);
      l.el.style.opacity = '1';
      l.el.style.transform = `translate3d(${(pose.x - largeur / 2).toFixed(1)}px, ${pose.haut.toFixed(1)}px, 0)`;
    }
  }

  return { ajouterLieu, ajouterAgent, mesurer, mettreAJour, definirFiltreAgent, majActivite };
}
