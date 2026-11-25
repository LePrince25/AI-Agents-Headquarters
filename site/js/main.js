import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PI, TAU, box, mat, graine } from './core.js';
import { chargerModeles } from './models.js';
import { construireIle } from './island.js';
import {
  construirePoles,
  construireDirection,
  construireAtelierOutils,
  construireSanner,
} from './buildings.js';
import { creerLabels } from './labels.js';
import { POLES, DIRECTION, ETATS, TERRASSE, RAYON_ILE } from './data.js';
import { animerPortes, PORTE_OUVERTE } from './portes.js';
import { versMonde, resoudre, hauteurSol } from './collision.js';
import { creerRencontre } from './rencontre.js';
import { creerVie } from './vie.js';
import { creerPanneaux } from './panneaux.js';
import { appel } from './api.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe9f2fa, 130, 330);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 700);
camera.rotation.order = 'YXZ';

const ciel = new THREE.Mesh(
  new THREE.SphereGeometry(420, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      haut: { value: new THREE.Color('#6fb0dd') },
      bas: { value: new THREE.Color('#f2f8fc') },
      decal: { value: 45 },
      expo: { value: 0.72 },
    },
    vertexShader: `
      varying vec3 vMonde;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        vMonde = p.xyz;
        gl_Position = projectionMatrix * viewMatrix * p;
      }
    `,
    fragmentShader: `
      uniform vec3 haut;
      uniform vec3 bas;
      uniform float decal;
      uniform float expo;
      varying vec3 vMonde;
      void main() {
        float h = normalize(vMonde + vec3(0.0, decal, 0.0)).y;
        gl_FragColor = vec4(mix(bas, haut, pow(max(h, 0.0), expo)), 1.0);
      }
    `,
  })
);
ciel.frustumCulled = false;
scene.add(ciel);

const hemi = new THREE.HemisphereLight(0xd6ebff, 0xead3ac, 0.82);
scene.add(hemi);

const soleil = new THREE.DirectionalLight(0xfff1d6, 2.85);
soleil.position.set(-42, 58, 30);
soleil.castShadow = true;
soleil.shadow.mapSize.set(2048, 2048);
soleil.shadow.camera.left = -52;
soleil.shadow.camera.right = 52;
soleil.shadow.camera.top = 52;
soleil.shadow.camera.bottom = -52;
soleil.shadow.camera.near = 8;
soleil.shadow.camera.far = 180;
soleil.shadow.bias = -0.0005;
soleil.shadow.normalBias = 0.03;
scene.add(soleil);

const contre = new THREE.DirectionalLight(0xcfe4f5, 0.34);
contre.position.set(40, 22, -45);
scene.add(contre);

function installerEnvironnement() {
  const toileEnv = document.createElement('canvas');
  toileEnv.width = 1024;
  toileEnv.height = 512;
  const ctx = toileEnv.getContext('2d');

  const cielDegrade = ctx.createLinearGradient(0, 0, 0, 512);
  cielDegrade.addColorStop(0, '#78b4dc');
  cielDegrade.addColorStop(0.38, '#a9cfe6');
  cielDegrade.addColorStop(0.5, '#e2eef5');
  cielDegrade.addColorStop(0.56, '#f4ecda');
  cielDegrade.addColorStop(0.78, '#d6c5a4');
  cielDegrade.addColorStop(1, '#a89a7c');
  ctx.fillStyle = cielDegrade;
  ctx.fillRect(0, 0, 1024, 512);

  const halo = ctx.createRadialGradient(250, 150, 12, 250, 150, 240);
  halo.addColorStop(0, 'rgba(255, 250, 228, .95)');
  halo.addColorStop(0.35, 'rgba(255, 245, 214, .42)');
  halo.addColorStop(1, 'rgba(255, 245, 214, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 1024, 512);

  const texture = new THREE.CanvasTexture(toileEnv);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cible = pmrem.fromEquirectangular(texture).texture;
  scene.environment = cible;
  pmrem.dispose();
  texture.dispose();
}

installerEnvironnement();

function adoucirMateriaux() {
  scene.traverse((objet) => {
    if (!objet.isMesh) return;
    const materiaux = Array.isArray(objet.material) ? objet.material : [objet.material];
    for (const m of materiaux) {
      if (m && m.isMeshStandardMaterial) {
        m.envMapIntensity = Math.min(m.envMapIntensity, 0.55);
      }
    }
  });
}

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 130;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = 1.44;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;

function positionVueIle() {
  const aspect = window.innerWidth / window.innerHeight;
  const recul = aspect < 0.85 ? 1.5 : aspect < 1.2 ? 1.2 : 1;
  return new THREE.Vector3(64 * recul, 58 * recul, 64 * recul);
}

camera.position.copy(positionVueIle());
controls.target.set(0, -4.2, 0);
controls.update();

const chargement = document.getElementById('chargement');
const progression = document.getElementById('progression');
const pourcentage = document.getElementById('pourcentage');

function progresser(fait, total) {
  const pct = Math.round((fait / total) * 100);
  progression.style.width = pct + '%';
  pourcentage.textContent = pct + ' %';
}

let poles = [];
let direction = null;
let ateliers = null;
let labels = null;
const clickables = [];
let actifId = null;
let vol = null;

const ATELIER_SPEC = {
  id: 'atelier',
  pole: 'Outillage commun',
  lieu: "L'Atelier des Ateliers",
  accent: '#8d9a4c',
  mission: "Outils, impressions et prototypes de l'équipe",
  agents: [],
};

let mode = 'ile';
const collidersMonde = [];
const portesToutes = [];
const batiments = [];
const lieuParId = new Map();
const agentsMonde = [];
let porteProche = null;
let agentProche = null;
let rencontre = null;
let vie = null;
let panneaux = null;
let compteRenduDemande = false;

async function demanderCompteRendu() {
  if (compteRenduDemande || !vie) return;
  const info = vie.reunionInfo();
  if (!info.active || info.phase !== 'assise' || !info.sujet) return;
  compteRenduDemande = true;
  const sujet = info.sujet;
  const noms = info.participants.map((p) => p.nom);
  try {
    const donnees = await appel('/api/reunion', { sujet, participants: noms });
    vie.definirCompteRendu(donnees);
    if (panneaux) {
      panneaux.notifier({
        titre: 'Compte-rendu de réunion',
        texte: `${donnees.lignes?.length || 0} prises de parole, ${donnees.decisions?.length || 0} décisions.`,
        accent: '#8a6a3c',
      });
    }
  } catch (err) {
    vie.definirCompteRendu({ erreur: String(err?.message || 'Compte-rendu indisponible.') });
  }
  if (panneaux) panneaux.majReunion();
}
let avis = { texte: '', reste: 0 };
let dernieresActivites = 0;
const figurantsMonde = [];

const joueur = new THREE.Vector3();
const vitesse = new THREE.Vector2();
const touches = new Set();
const OEIL = 1.62;
const VITESSE = 3.3;

let yaw = 0;
let pitch = 0;
let camY = 0;

async function demarrer() {
  let modeles;
  try {
    modeles = await chargerModeles('./models', progresser);
  } catch (err) {
    console.error(err);
    chargement.querySelector('p').textContent = 'Impossible de charger les modèles 3D.';
    pourcentage.textContent = 'Erreur';
    return;
  }

  const { ile, colliders: collidersIle } = construireIle(scene, modeles);
  poles = construirePoles(ile, modeles);
  direction = construireDirection(ile, modeles);
  ateliers = construireAtelierOutils(ile, modeles);

  const bastion = poles.find((p) => p.spec.id === 'cyber');
  construireSanner(bastion.groupe);

  for (const p of poles) clickables.push(p.zone);
  clickables.push(direction.zone);
  clickables.push(ateliers.zone);

  for (const p of [...poles, direction, ateliers]) {
    const spec = p.spec || ATELIER_SPEC;
    lieuParId.set(spec.id, { ...p, spec });
    for (const c of p.colliders || []) {
      const monde = versMonde(p.groupe, c);
      collidersMonde.push(monde);
      c.monde = monde;
    }
    for (const porte of p.portes || []) {
      p.groupe.updateMatrixWorld(true);
      porte.monde = p.groupe.localToWorld(new THREE.Vector3(porte.x, 0, porte.z));
      porte.collider.monde.porte = true;
      portesToutes.push(porte);
    }
    if (p.bati) batiments.push({ groupe: p.groupe, bati: p.bati });
  }
  for (const c of collidersIle) {
    collidersMonde.push({ ...c, rot: c.rot || 0, actif: true });
  }

  ile.updateMatrixWorld(true);
  for (const p of [...poles, direction]) {
    const porte = p.portes && p.portes[0] ? p.portes[0].monde : null;
    const anglePole = ((p.spec.angle || 0) * PI) / 180;
    for (const a of p.agents) {
      const pos = new THREE.Vector3();
      a.objet.getWorldPosition(pos);
      agentsMonde.push({
        nom: a.nom,
        prenom: a.nom.split(/\s+/)[0],
        poste: a.poste,
        pole: p.spec.pole,
        lieu: p.spec.lieu,
        accent: p.spec.accent,
        pos,
        objet: a.objet,
        bras: a.bras || [],
        jambes: a.jambes || [],
        index: a.index ?? 0,
        sol: a.sol ?? 0.35,
        lieuId: p.spec.id,
        poleId: p.spec.id,
        anglePole,
        porte,
        batiment: p.groupe,
        decalage: agentsMonde.length * 0.83,
      });
    }
    for (const f of p.figurants || []) figurantsMonde.push(f);
  }

  // Etiquettes de lieu
  labels = creerLabels(document.getElementById('labels'));
  for (const p of poles) {
    if (p.spec.id === 'data' || p.spec.id === 'bi') continue;
    labels.ajouterLieu({
      objet: p.ancreLieu,
      lieu: p.spec.lieu,
      pole: p.spec.pole,
      accent: p.spec.accent,
      nbAgents: p.spec.agents.length,
      poleIds: [p.spec.id],
    });
  }

  const groupeData = poles.find((p) => p.spec.id === 'data').groupe;
  const groupeBi = poles.find((p) => p.spec.id === 'bi').groupe;
  const ancreObservatoire = new THREE.Object3D();
  ancreObservatoire.position.copy(groupeData.position).add(groupeBi.position).multiplyScalar(0.5);
  ancreObservatoire.position.y = 3.95;
  ile.add(ancreObservatoire);
  labels.ajouterLieu({
    objet: ancreObservatoire,
    lieu: "L'Observatoire",
    pole: 'Data & IA · Business Intelligence',
    accent: '#5f8a9a',
    nbAgents: 5,
    poleIds: ['data', 'bi'],
  });

  labels.ajouterLieu({
    objet: direction.ancreLieu,
    lieu: 'LePrince WorkLand',
    pole: 'Direction Générale',
    accent: '#b08145',
    nbAgents: 1,
    poleIds: ['direction'],
  });
  labels.ajouterLieu({
    objet: ateliers.ancreLieu,
    lieu: "L'Atelier des Ateliers",
    pole: 'Outillage commun',
    accent: '#8d9a4c',
    nbAgents: 0,
  });

  for (const p of poles) {
    for (const a of p.agents) labels.ajouterAgent(a);
  }
  for (const a of direction.agents) labels.ajouterAgent(a);

  labels.mesurer();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => labels.mesurer());

  cielVivant(ile);
  brancherInterface();
  rencontre = creerRencontre({
    onOuverture: () => {
      touches.clear();
      vitesse.set(0, 0);
      document.getElementById('indice').classList.remove('actif');
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    onFermeture: () => {
      touches.clear();
      vitesse.set(0, 0);
      if (mode === 'premiere') verrouiller();
    },
    onFin: (tache) => {
      const fini = tache.etat === 'fini';
      const titre = fini ? `${tache.prenom} a terminé sa tâche` : `${tache.prenom} a arrêté sa tâche`;
      const crees = tache.fichiers?.crees?.length || 0;
      const texte = fini
        ? crees
          ? `${crees} fichier${crees > 1 ? 's' : ''} créé${crees > 1 ? 's' : ''}.`
          : 'Rapport reçu.'
        : String(tache.erreur || 'Tâche interrompue.').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (panneaux) {
        panneaux.notifier({
          titre,
          texte,
          accent: fini ? '#4f8f5d' : '#a65a4f',
          action: { label: 'Voir', faire: () => voirTachePanneau(tache.nom) },
        });
      }
      if (mode === 'premiere') avis = { texte: titre, reste: 4.5 };
    },
    onDelegation: (resultat) => {
      const n = (resultat.lancees || []).length;
      if (panneaux) {
        panneaux.notifier({
          titre: 'LePrince a délégué',
          texte: `${n} tâche${n > 1 ? 's' : ''} confiée${n > 1 ? 's' : ''} aux agents spécialisés.`,
          accent: '#4f8f5d',
          action: { label: 'Voir les tâches', faire: () => panneaux.ouvrir('taches') },
        });
      }
    },
  });

  vie = creerVie({
    scene,
    agents: agentsMonde,
    figurants: figurantsMonde,
    enTache: (nom) => !!(rencontre && rencontre.estEnTache(nom)),
    surChangement: (evenement) => {
      if (panneaux) panneaux.majReunion();
      if (evenement && evenement.type === 'reunion') {
        if (evenement.phase === 'arrivee') compteRenduDemande = false;
        if (evenement.active && evenement.phase === 'assise') demanderCompteRendu();
      }
    },
    colliders: collidersMonde,
    sol: solIci,
    portes: portesToutes,
    joueur,
  });
  for (const c of vie.colliders) collidersMonde.push({ ...c, rot: 0, actif: true });
  labels.definirFiltreAgent((nom) => !vie.estAbsent(nom));

  const lieuxPanneau = [
    {
      id: 'direction',
      pole: DIRECTION.pole,
      lieu: DIRECTION.lieu,
      mission: DIRECTION.mission,
      nbAgents: 1,
      accent: DIRECTION.accent,
    },
    ...POLES.map((p) => ({
      id: p.id,
      pole: p.pole,
      lieu: p.lieu,
      mission: p.mission,
      nbAgents: p.agents.length,
      accent: p.accent,
    })),
    {
      id: 'atelier',
      pole: 'Outillage commun',
      lieu: "L'Atelier des Ateliers",
      mission: "Outils, impressions et prototypes de l'équipe",
      nbAgents: 0,
      accent: '#8d9a4c',
    },
  ];

  panneaux = creerPanneaux({
    lieux: lieuxPanneau,
    agents: agentsMonde,
    vie,
    rencontre,
    voirLieu: voirLieuPanneau,
    voirAgent,
    entrerLieu: entrerLieuPanneau,
    voirTache: voirTachePanneau,
  });

  if (location.protocol === 'http:') {
    appel('/api/ia')
      .then((donnees) => {
        const note = document.getElementById('fa-note-discussion');
        if (note && donnees.iaNom) {
          note.textContent = `Discussion non enregistrée - ${donnees.iaNom} répond sans aucun outil.`;
        }
        if (rencontre && donnees.ia) {
          rencontre.definirIA({ id: donnees.ia, nom: donnees.iaNom });
        }
      })
      .catch(() => {});
  }

  if (location.protocol !== 'http:' && panneaux) {
    panneaux.notifier({
      titre: 'Page ouverte sans le serveur',
      texte: 'Discussions et tâches ont besoin du serveur local : node live/server.js, puis http://127.0.0.1:4173/',
      accent: '#a65a4f',
    });
  }

  adoucirMateriaux();

  renderer.render(scene, camera);
  requestAnimationFrame(() => chargement.classList.add('cache'));

  const demande = new URLSearchParams(location.search).get('pole');
  if (demande && (demande === 'direction' || poles.some((p) => p.spec.id === demande))) {
    selectionner(demande);
  }
}

function afficherFiche(id) {
  const p = id === 'direction' ? DIRECTION : POLES.find((x) => x.id === id);
  if (!p) return;

  const agents = id === 'direction' ? [DIRECTION.agent] : p.agents;
  document.getElementById('fiche-trait').style.background = p.accent;
  document.getElementById('fiche-sur').textContent = p.pole;
  document.getElementById('fiche-titre').textContent = p.lieu;
  document.getElementById('fiche-mission').textContent = p.mission;
  document.getElementById('fiche-agents').innerHTML = agents
    .map(
      (a) => `<li>
        <i style="background:${ETATS[a.etat].couleur}"></i>
        <div><b>${a.nom}</b><span>${a.poste}</span></div>
        <em>${ETATS[a.etat].libelle}</em>
      </li>`
    )
    .join('');
  document.getElementById('fiche').classList.add('ouverte');
}

function easing(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function volerVers(position, cible, fin) {
  controls.autoRotate = false;
  controls.enabled = false;
  vol = {
    t0: performance.now(),
    duree: 1.7,
    p0: camera.position.clone(),
    p1: position.clone(),
    c0: controls.target.clone(),
    c1: cible.clone(),
    fin,
  };
}

function selectionner(id) {
  if (mode !== 'ile' || vol) return;
  const p = id === 'direction' ? direction : poles.find((x) => x.spec.id === id);
  if (!p) return;

  const centre = new THREE.Vector3(p.groupe.position.x, 1.8, p.groupe.position.z);
  if (id === 'direction') centre.set(0, 1.5, 0);

  const versCentre = new THREE.Vector3(-centre.x, 0, -centre.z);
  if (versCentre.lengthSq() < 0.01) versCentre.set(0, 0, 1);
  versCentre.normalize();

  const camPos = centre
    .clone()
    .add(versCentre.clone().multiplyScalar(16))
    .add(new THREE.Vector3(versCentre.z, 0, -versCentre.x).multiplyScalar(5.5));
  camPos.y = 11.5;

  actifId = id;
  document.getElementById('entrer').disabled = false;
  afficherFiche(id);
  volerVers(camPos, centre, () => {
    controls.autoRotate = false;
  });
}

function voirLieuPanneau(id) {
  if (mode !== 'ile') return;
  if (id !== 'atelier') {
    selectionner(id);
    return;
  }
  if (vol) return;
  const centre = new THREE.Vector3(ateliers.groupe.position.x, 1.4, ateliers.groupe.position.z);
  const versCentre = new THREE.Vector3(-centre.x, 0, -centre.z);
  if (versCentre.lengthSq() < 0.01) versCentre.set(0, 0, 1);
  versCentre.normalize();
  const camPos = centre
    .clone()
    .add(versCentre.clone().multiplyScalar(14))
    .add(new THREE.Vector3(versCentre.z, 0, -versCentre.x).multiplyScalar(5));
  camPos.y = 9.5;
  actifId = 'atelier';
  document.getElementById('entrer').disabled = false;
  volerVers(camPos, centre);
}

function entrerLieuPanneau(id) {
  if (mode !== 'ile' || vol) return;
  entrerDans(id);
}

function voirAgent(nom) {
  if (mode !== 'ile' || vol) return;
  const a = agentsMonde.find((x) => x.nom === nom);
  if (!a) return;
  const centre = new THREE.Vector3(a.pos.x, 1.6, a.pos.z);
  const camPos = centre.clone().add(new THREE.Vector3(5.5, 3.2, 5.5));
  volerVers(camPos, centre);
}

function voirTachePanneau(nom) {
  const agent = agentsMonde.find((a) => a.nom === nom);
  if (!agent || !rencontre) return;
  if (panneaux) panneaux.fermer();
  rencontre.ouvrir(agent, 'tache');
}

function retourIle() {
  if (vol || mode === 'entree') return;
  if (panneaux) panneaux.fermer();
  if (rencontre && rencontre.estOuverte()) {
    mode = 'ile';
    rencontre.fermer();
  }
  if (mode === 'premiere' && document.pointerLockElement === canvas) document.exitPointerLock();
  mode = 'ile';
  touches.clear();
  vitesse.set(0, 0);
  porteProche = null;
  agentProche = null;
  avis = { texte: '', reste: 0 };
  document.body.classList.remove('premiere', 'souris-libre', 'fenetre');
  document.getElementById('indice').classList.remove('actif');
  document.getElementById('fiche').classList.remove('ouverte');
  camera.near = 1;
  camera.fov = 42;
  camera.updateProjectionMatrix();
  if (actifId) document.getElementById('entrer').disabled = false;
  volerVers(positionVueIle(), new THREE.Vector3(0, -4.2, 0), () => {
    controls.autoRotate = true;
  });
}

function verrouiller() {
  if (!canvas.requestPointerLock) return;
  const r = canvas.requestPointerLock();
  if (r && r.catch) r.catch(() => {});
}

function plongerVers(position, cible, fin) {
  controls.autoRotate = false;
  controls.enabled = false;
  vol = {
    t0: performance.now(),
    duree: 1.15,
    p0: camera.position.clone(),
    p1: position.clone(),
    c0: controls.target.clone(),
    c1: cible.clone(),
    fin,
    fp: true,
  };
}

function entrerDans(id) {
  if (mode !== 'ile' || vol) return;
  const lieu = lieuParId.get(id);
  if (!lieu || !lieu.bati) return;

  if (panneaux) panneaux.fermer();
  actifId = id;
  document.getElementById('fiche').classList.remove('ouverte');

  const bati = lieu.bati;
  let lx = 0;
  let lz = bati.demiD - 1.15;
  if (id === 'direction') lz = 4.0;
  if (id === 'atelier') {
    lx = 1.3;
    lz = 1.05;
  }

  lieu.groupe.updateMatrixWorld(true);
  const spawn = lieu.groupe.localToWorld(new THREE.Vector3(lx, 0, lz));
  const res = resoudre(spawn.x, spawn.z, 0.3, collidersMonde);
  joueur.set(res.x, bati.sol, res.z);
  camY = bati.sol + OEIL;
  yaw = lieu.groupe.rotation.y;
  pitch = 0;
  vitesse.set(0, 0);

  document.body.classList.add('premiere');
  document.body.classList.remove('souris-libre');
  document.getElementById('marche-lieu').textContent = lieu.spec.lieu;
  document.getElementById('marche-pole').textContent = lieu.spec.pole;
  document.getElementById('indice').classList.remove('actif');
  document.getElementById('entrer').disabled = true;
  camera.near = 0.06;
  camera.fov = 68;
  camera.updateProjectionMatrix();

  mode = 'entree';
  verrouiller();

  const cible = lieu.groupe.localToWorld(new THREE.Vector3(lx, bati.sol + OEIL, lz - 2.8));
  plongerVers(new THREE.Vector3(joueur.x, camY, joueur.z), cible, () => {
    mode = 'premiere';
    camera.rotation.set(pitch, yaw, 0);
    camera.position.set(joueur.x, camY, joueur.z);
    document.body.classList.toggle('souris-libre', document.pointerLockElement !== canvas);
  });
}

function solIci(x, z) {
  const h = hauteurSol(x, z, batiments);
  if (h !== null) return h;
  if (Math.hypot(x - TERRASSE.x, z - TERRASSE.z) <= 4.6) return 0.2;
  if (Math.hypot(x, z) <= 11.2) return 0.05;
  return 0.02;
}

function majPortes(dt) {
  porteProche = null;
  let dmin = 2.5;
  for (const porte of portesToutes) {
    const d = Math.hypot(joueur.x - porte.monde.x, joueur.z - porte.monde.z);
    if (d < dmin) {
      dmin = d;
      porteProche = porte;
    }
  }
  if (porteProche) porteProche.distance = dmin;

  const el = document.getElementById('indice');
  if (avis.reste > 0) {
    avis.reste -= dt;
    el.textContent = avis.texte;
    el.classList.add('actif');
    return;
  }
  if (agentProche) {
    el.textContent = `E pour parler à ${agentProche.prenom}`;
    el.classList.add('actif');
  } else if (porteProche) {
    el.textContent = porteProche.ouvert ? 'E pour fermer la porte' : 'E pour ouvrir la porte';
    el.classList.add('actif');
  } else {
    el.classList.remove('actif');
  }
}

function ouvrirAgent(agent) {
  if (!rencontre || mode !== 'premiere' || vol) return;
  touches.clear();
  vitesse.set(0, 0);
  rencontre.ouvrir(agent);
}

function utiliserAction() {
  if (rencontre && rencontre.estOuverte()) return;
  if (agentProche) {
    ouvrirAgent(agentProche);
    return;
  }
  utiliserPorte();
}

function utiliserPorte() {
  if (!porteProche) return;
  const porte = porteProche;

  if (!porte.ouvert) {
    porte.ouvert = true;
    for (const p of porte.pivots) p.cible = p.cote * PORTE_OUVERTE;
    porte.collider.monde.actif = false;
    avis = { texte: 'Porte ouverte', reste: 1.4 };
    return;
  }

  const c = porte.collider.monde;
  const dx = joueur.x - c.x;
  const dz = joueur.z - c.z;
  const cos = Math.cos(c.rot);
  const sin = Math.sin(c.rot);
  const lx = cos * dx - sin * dz;
  const lz = sin * dx + cos * dz;
  if (Math.abs(lx) < c.hw + 0.3 && Math.abs(lz) < c.hd + 0.3) {
    avis = { texte: 'Recule un peu pour fermer la porte', reste: 1.8 };
    return;
  }
  porte.ouvert = false;
  for (const p of porte.pivots) p.cible = 0;
  porte.collider.monde.actif = true;
  avis = { texte: 'Porte fermée', reste: 1.4 };
}

function animerAgents(temps) {
  for (const agent of agentsMonde) {
    if (vie && vie.estAbsent(agent.nom)) continue;
    if (!agent.bras.length) continue;
    const actif = rencontre && rencontre.estEnTache(agent.nom);
    for (let i = 0; i < agent.bras.length; i++) {
      const pivot = agent.bras[i];
      const cible = actif ? -0.62 + Math.sin(temps * 11 + i * 1.9 + agent.decalage) * 0.34 : 0;
      pivot.rotation.x += (cible - pivot.rotation.x) * 0.22;
    }
  }
}

function majPremiere(dt) {
  if (rencontre && rencontre.estOuverte()) {
    camera.position.set(joueur.x, camY, joueur.z);
    camera.rotation.set(pitch, yaw, 0);
    return;
  }

  const avant =
    (touches.has('KeyW') || touches.has('ArrowUp') ? 1 : 0) -
    (touches.has('KeyS') || touches.has('ArrowDown') ? 1 : 0);
  const cote =
    (touches.has('KeyD') || touches.has('ArrowRight') ? 1 : 0) -
    (touches.has('KeyA') || touches.has('ArrowLeft') ? 1 : 0);

  let dx = 0;
  let dz = 0;
  if (avant || cote) {
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    dx = fx * avant + rx * cote;
    dz = fz * avant + rz * cote;
    const l = Math.hypot(dx, dz);
    dx /= l;
    dz /= l;
  }

  const k = 1 - Math.exp(-dt * 12);
  vitesse.x += (dx * VITESSE - vitesse.x) * k;
  vitesse.y += (dz * VITESSE - vitesse.y) * k;

  const limite = RAYON_ILE - 1.4;
  let nx = joueur.x + vitesse.x * dt;
  let nz = joueur.z + vitesse.y * dt;
  const d = Math.hypot(nx, nz);
  if (d > limite) {
    nx *= limite / d;
    nz *= limite / d;
  }

  const res = resoudre(nx, nz, 0.3, collidersMonde);
  const d2 = Math.hypot(res.x, res.z);
  if (d2 > limite) {
    joueur.x = (res.x / d2) * limite;
    joueur.z = (res.z / d2) * limite;
  } else {
    joueur.x = res.x;
    joueur.z = res.z;
  }

  const sol = solIci(joueur.x, joueur.z);
  camY += (sol + OEIL - camY) * Math.min(1, dt * 11);
  camera.position.set(joueur.x, camY, joueur.z);
  camera.rotation.set(pitch, yaw, 0);

  agentProche = null;
  let meilleur = 2.4;
  for (const agent of agentsMonde) {
    if (vie && vie.estAbsent(agent.nom)) continue;
    const distance = Math.hypot(joueur.x - agent.pos.x, joueur.z - agent.pos.z);
    if (distance < meilleur) {
      meilleur = distance;
      agentProche = agent;
    }
  }

  majPortes(dt);
}

function brancherInterface() {
  document.getElementById('retour').addEventListener('click', retourIle);
  document.getElementById('entrer').addEventListener('click', () => {
    if (actifId) entrerDans(actifId);
  });

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let depart = null;
  let survol = false;
  let glisse = null;

  const cibler = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    scene.updateMatrixWorld();
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(clickables, false);
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (mode === 'premiere') {
      if (document.pointerLockElement !== canvas) {
        glisse = { x: e.clientX, y: e.clientY, bouge: false };
        canvas.setPointerCapture(e.pointerId);
      }
      return;
    }
    if (mode !== 'ile') return;
    depart = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (mode === 'premiere' && document.pointerLockElement !== canvas) {
      const g = glisse;
      glisse = null;
      if (g && !g.bouge) verrouiller();
      return;
    }
    if (mode !== 'ile' || e.button !== 0 || !depart) return;
    const bouge = Math.hypot(e.clientX - depart.x, e.clientY - depart.y);
    depart = null;
    if (bouge > 6 || vol) return;
    const trouves = cibler(e.clientX, e.clientY);
    if (trouves.length) entrerDans(trouves[0].object.userData.poleId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (mode === 'premiere') {
      if (glisse && document.pointerLockElement !== canvas) {
        const dx = e.clientX - glisse.x;
        const dy = e.clientY - glisse.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) glisse.bouge = true;
        if (glisse.bouge) {
          yaw -= dx * 0.004;
          pitch -= dy * 0.004;
          pitch = Math.max(-1.35, Math.min(1.35, pitch));
          glisse.x = e.clientX;
          glisse.y = e.clientY;
        }
      }
      return;
    }
    if (mode !== 'ile' || vol) return;
    const trouves = cibler(e.clientX, e.clientY);
    const dessus = trouves.length > 0;
    if (dessus !== survol) {
      survol = dessus;
      canvas.style.cursor = dessus ? 'pointer' : 'grab';
    }
  });

  canvas.addEventListener('pointercancel', () => {
    glisse = null;
  });

  document.addEventListener('mousemove', (e) => {
    if (mode !== 'premiere' || document.pointerLockElement !== canvas) return;
    if (rencontre && rencontre.estOuverte()) return;
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
  });

  document.addEventListener('pointerlockchange', () => {
    if (mode !== 'premiere') {
      document.body.classList.remove('souris-libre');
      return;
    }
    document.body.classList.toggle('souris-libre', document.pointerLockElement !== canvas);
  });

  window.addEventListener('keydown', (e) => {
    if (mode !== 'premiere') return;
    if (rencontre && rencontre.estOuverte()) return;
    if (e.code === 'Escape') return;
    if (
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'Space'
    ) {
      e.preventDefault();
    }
    touches.add(e.code);
    if (e.code === 'KeyE' && !e.repeat) utiliserAction();
  });

  window.addEventListener('keyup', (e) => touches.delete(e.code));
  window.addEventListener('blur', () => touches.clear());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (labels) labels.mesurer();
  });
}

function cielVivant(ile) {
  const alea = graine(77113);

  const nuages = [];
  const geoNuage = new THREE.SphereGeometry(1, 12, 8);
  const matNuage = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    emissive: 0xe9f2fa,
    emissiveIntensity: 0.35,
  });
  const matNuageLoin = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    emissive: 0xe9f2fa,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.85,
  });

  const nuage = (x, y, z, echelle, materiau) => {
    const n = new THREE.Group();
    const nb = 3 + Math.floor(alea() * 3);
    for (let j = 0; j < nb; j++) {
      const b = new THREE.Mesh(geoNuage, materiau);
      const s = (2.1 + alea() * 2.2) * echelle;
      b.scale.set(s, s * 0.55, s * 0.85);
      b.position.set((alea() - 0.5) * 7 * echelle, (alea() - 0.5) * 1.2 * echelle, (alea() - 0.5) * 4.5 * echelle);
      n.add(b);
    }
    n.position.set(x, y, z);
    n.userData.vitesse = 0.25 + alea() * 0.45;
    scene.add(n);
    nuages.push(n);
  };

  for (let i = 0; i < 4; i++) {
    const a = alea() * TAU;
    const r = 46 + alea() * 26;
    nuage(Math.cos(a) * r, -38 - alea() * 8, Math.sin(a) * r, 1.3 + alea() * 0.9, matNuage);
  }
  for (let i = 0; i < 5; i++) {
    const a = alea() * TAU;
    const r = 150 + alea() * 70;
    nuage(Math.cos(a) * r, 6 + alea() * 26, Math.sin(a) * r, 1.6 + alea() * 1.2, matNuageLoin);
  }

  const oiseaux = [];
  for (let i = 0; i < 5; i++) {
    const o = new THREE.Group();
    const a1 = box(0.5, 0.05, 0.06, 0x4c4a44, -0.22, 0, 0);
    a1.rotation.z = 0.35;
    const a2 = box(0.5, 0.05, 0.06, 0x4c4a44, 0.22, 0, 0);
    a2.rotation.z = -0.35;
    o.add(a1, a2);
    o.userData = {
      r: 16 + alea() * 13,
      y: 9 + alea() * 6,
      phase: alea() * TAU,
      vitesse: 0.06 + alea() * 0.05,
    };
    scene.add(o);
    oiseaux.push(o);
  }

  const horloge = new THREE.Clock();
  let temps = 0;

  function animer() {
    requestAnimationFrame(animer);
    const dt = Math.min(horloge.getDelta(), 0.1);
    temps += dt;

    for (const n of nuages) {
      n.position.x += n.userData.vitesse * dt;
      if (n.position.x > 110) n.position.x = -110;
    }

    for (const o of oiseaux) {
      const u = o.userData;
      const ang = u.phase + temps * u.vitesse;
      o.position.set(Math.cos(ang) * u.r, u.y + Math.sin(temps * 0.6 + u.phase) * 0.6, Math.sin(ang) * u.r);
      o.rotation.y = -ang;
      o.children[0].rotation.z = 0.35 + Math.sin(temps * 6 + u.phase) * 0.5;
      o.children[1].rotation.z = -0.35 - Math.sin(temps * 6 + u.phase) * 0.5;
    }

    animerPortes(portesToutes, dt);
    animerAgents(temps);
    if (vie) vie.maj(dt, temps);
    if (vie && labels && temps - dernieresActivites > 0.9) {
      dernieresActivites = temps;
      for (const a of agentsMonde) {
        const act = vie.activiteDe(a.nom);
        labels.majActivite(a.nom, act.libelle, act.couleur);
      }
    }

    if (mode === 'premiere') {
      majPremiere(dt);
    } else if (vol) {
      const t = Math.min((performance.now() - vol.t0) / 1000 / vol.duree, 1);
      const e = easing(t);
      camera.position.lerpVectors(vol.p0, vol.p1, e);
      camera.position.y += Math.sin(PI * e) * 3.2;
      const cible = new THREE.Vector3().lerpVectors(vol.c0, vol.c1, e);
      camera.lookAt(cible);
      if (t >= 1) {
        camera.position.copy(vol.p1);
        camera.lookAt(vol.c1);
        const fin = vol.fin;
        const fp = vol.fp;
        vol = null;
        if (!fp) {
          controls.target.copy(cible);
          controls.enabled = true;
        }
        if (fin) fin();
      }
    } else {
      controls.update();
    }

    if (mode !== 'premiere') labels.mettreAJour(camera, actifId);
    renderer.render(scene, camera);
  }

  animer();
}

demarrer();
