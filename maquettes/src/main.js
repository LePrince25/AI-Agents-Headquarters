// main.js — Scène principale : caméra orbitale, survol, étiquettes, interface.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { P3, P2, HEX, creerLumieres, creerCiel, mat, box } from './style.js';
import { creerIle } from './island.js';
import { TOUS, POLES, SIEGE, ETATS } from './data.js';

// ── Rendu ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(P3.cielBas, 150, 330);

const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
camera.position.set(52, 44, 62);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 16;
controls.maxDistance = 130;
controls.maxPolarAngle = Math.PI * 0.47;
controls.target.set(0, 0, 0);

creerCiel(scene);
creerLumieres(scene);

// ── L'île ─────────────────────────────────────────────────────────────────
const ile = creerIle(TOUS);
scene.add(ile);

// Le soleil, visible dans le ciel comme sur la référence.
const soleilDisque = new THREE.Mesh(
  new THREE.SphereGeometry(7, 24, 16),
  new THREE.MeshBasicMaterial({ color: P3.soleil })
);
soleilDisque.position.set(-150, 88, 120);
scene.add(soleilDisque);

// Nuages bas-poly, très discrets.
for (let i = 0; i < 9; i++) {
  const a = (i / 9) * Math.PI * 2;
  const r = 120 + (i % 3) * 22;
  const c = new THREE.Mesh(
    new THREE.IcosahedronGeometry(9 + (i % 4) * 3.5, 0),
    new THREE.MeshBasicMaterial({ color: 0xfff6e8, transparent: true, opacity: 0.42 })
  );
  c.position.set(Math.cos(a) * r, 42 + (i % 5) * 9, Math.sin(a) * r);
  c.scale.set(1.7, 0.55, 1);
  scene.add(c);
}

// ── Étiquettes ────────────────────────────────────────────────────────────
// Projection manuelle : je garde la main sur le style néon de l'interface.
// Les positions viennent du décor (pas de recalcul) — une seule source de vérité.
const layerLabels = document.getElementById('labels');
const labelObjs = [];

function creerEtiquette(pole, agent, world) {
  const el = document.createElement('div');
  el.className = `etiquette etat-${agent.etat}`;
  el.innerHTML = `
    <div class="etq-point"></div>
    <div class="etq-corps">
      <div class="etq-nom">${agent.prenom}</div>
      <div class="etq-poste">${agent.poste}</div>
    </div>`;
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    selectionnerAgent(pole, agent);
  });
  layerLabels.appendChild(el);

  const st = ETATS[agent.etat];
  el.querySelector('.etq-point').style.background = st.dot;
  el.querySelector('.etq-point').style.boxShadow = `0 0 0 3px ${st.dot}22`;

  labelObjs.push({ el, world: world.clone(), pole, agent });
}

// On lit les positions d'agents produites par la construction de l'île.
for (const bat of ile.children) {
  if (!bat.userData.pole || !bat.userData.agents) continue;
  for (const a of bat.userData.agents) {
    creerEtiquette(bat.userData.pole, a.agent, a.world);
  }
}

// ── Interaction : survol et clic ──────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let survole = null;
let cibleVol = null;

function pick(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const touches = raycaster.intersectObjects(ile.children, true);
  for (const t of touches) {
    let o = t.object;
    while (o && !o.userData.pole && o.parent) o = o.parent;
    if (o && o.userData.pole) return o.userData.pole;
  }
  return null;
}

renderer.domElement.addEventListener('pointermove', (ev) => {
  const p = pick(ev);
  if (p !== survole) {
    survole = p;
    document.body.classList.toggle('survol-pole', !!p);
    if (p) {
      const el = document.getElementById('survol');
      el.innerHTML = `<span class="sv-nom">${p.nom}</span><span class="sv-lieu">${p.lieu}</span>`;
      el.classList.add('visible');
    } else {
      document.getElementById('survol').classList.remove('visible');
    }
  }
});

renderer.domElement.addEventListener('click', (ev) => {
  const p = pick(ev);
  if (p) selectionnerPole(p);
});

// ── Vol de caméra ─────────────────────────────────────────────────────────
let vol = null;
function volerVers(pos, distance = 26, duree = 1150) {
  const depart = camera.position.clone();
  const departCible = controls.target.clone();
  const dir = depart.clone().sub(departCible).normalize();
  const arrivee = pos.clone().add(dir.multiplyScalar(distance));
  const arriveeCible = pos.clone();
  const t0 = performance.now();
  vol = () => {
    const t = Math.min(1, (performance.now() - t0) / duree);
    // easeInOutCubic
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(depart, arrivee, e);
    controls.target.lerpVectors(departCible, arriveeCible, e);
    if (t >= 1) vol = null;
  };
}

// ── Panneau latéral ───────────────────────────────────────────────────────
const panneau = document.getElementById('panneau');
let poleActif = null;

function selectionnerPole(p) {
  poleActif = p;
  const agents = p.agents.map((a) => {
    const st = ETATS[a.etat];
    return `<div class="agent-row">
      <span class="agent-dot" style="background:${st.dot};box-shadow:0 0 0 3px ${st.dot}22"></span>
      <div class="agent-txt">
        <div class="agent-nom">${a.prenom}</div>
        <div class="agent-poste">${a.poste}</div>
      </div>
      <span class="agent-etat" style="color:${st.dot}">${st.libelle}</span>
    </div>`;
  }).join('');

  panneau.innerHTML = `
    <div class="pn-tete">
      <div class="pn-icone" style="color:${p.neon}">${p.icone}</div>
      <div>
        <h2>${p.nom}</h2>
        <p class="pn-lieu">${p.lieu} · ${p.agents.length} agent${p.agents.length > 1 ? 's' : ''}</p>
      </div>
      <button class="pn-fermer" id="fermer">×</button>
    </div>
    <div class="pn-liste">${agents}</div>
    <div class="pn-actions">
      <button class="btn btn-primaire" id="entrer">J'entre</button>
      <button class="btn" id="voir">Voir l'île</button>
    </div>`;
  panneau.classList.add('ouvert');

  document.getElementById('fermer').onclick = () => panneau.classList.remove('ouvert');
  document.getElementById('entrer').onclick = () => {
    document.getElementById('etape').textContent =
      `Étape 4 — « J'entre » : marche à la première personne dans ${p.lieu}. Prochaine maquette.`;
    document.getElementById('etape').classList.add('actif');
  };
  document.getElementById('voir').onclick = () => {
    volerVers(new THREE.Vector3(0, 0, 0), 88, 900);
    panneau.classList.remove('ouvert');
  };

  volerVers(new THREE.Vector3(p.bat.x, 0, p.bat.z), 24);
}

function selectionnerAgent(pole, agent) {
  selectionnerPole(pole);
  const st = ETATS[agent.etat];
  document.getElementById('etape').textContent =
    `Étape 5 — Parler à ${agent.prenom} (${st.libelle}) : une vraie session Claude Code, lancée sur ta machine. Prochaine maquette.`;
  document.getElementById('etape').classList.add('actif');
}

// ── Navigation par liste (sidebar) ────────────────────────────────────────
const liste = document.getElementById('liste-poles');
TOUS.forEach((p) => {
  const b = document.createElement('button');
  b.className = 'lp-item';
  b.innerHTML = `<span class="lp-ic" style="color:${p.neon}">${p.icone}</span>
    <span class="lp-nom">${p.nom}</span>
    <span class="lp-nb">${p.agents.length}</span>`;
  b.onclick = () => selectionnerPole(p);
  liste.appendChild(b);
});

// ── Boucle ────────────────────────────────────────────────────────────────
const v3 = new THREE.Vector3();
function animerEtiquettes() {
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  for (const l of labelObjs) {
    v3.copy(l.world).project(camera);
    const visible = v3.z < 1;
    if (!visible) { l.el.style.display = 'none'; continue; }
    const x = (v3.x * 0.5 + 0.5) * w;
    const y = (-v3.y * 0.5 + 0.5) * h;
    l.el.style.display = 'block';
    l.el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
  }
}

function resize() {
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let t = 0;
function boucle() {
  requestAnimationFrame(boucle);
  t += 0.006;
  if (vol) vol();
  controls.update();
  ile.rotation.y = Math.sin(t * 0.12) * 0.012;
  animerEtiquettes();
  renderer.render(scene, camera);
}
boucle();

// ── Marqueur de repérage des pôles ───────────────────────────────────────
// Un liseré fin au sol, à la couleur du pôle : discret, il structure la
// lecture d'ensemble sans salir le plateau.
for (const p of TOUS) {
  const b = p.bat;
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(1, 1, 4),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(p.neon),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.rotation.z = Math.PI / 4;
  halo.scale.set(b.w * 0.78, b.d * 0.9, 1);
  halo.position.set(b.x, 0.03, b.z);
  scene.add(halo);
}

console.log('QG maquette chargée —', TOUS.length, 'pôles,',
  TOUS.reduce((n, p) => n + p.agents.length, 0), 'agents');
