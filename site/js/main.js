import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PI, TAU, box, mat, graine, toile } from './core.js';
import { detecterQualite, installerEnvironnement, reglerAnisotropie, reglerSoleil, reglerIntensites, creerComposeur } from './rendu.js';
import { chargerModeles } from './models.js';
import { construireIle } from './island.js';
import { construireCampus } from './campus.js';
import { construireSiege, ZONE_SIEGE, solEtage, VERRE_EXT } from './siege.js';
import { creerLabels } from './labels.js';
import { POLES, DIRECTION, ETATS, RAYON_ILE, SIEGE } from './data.js';
import { animerPortes, PORTE_OUVERTE } from './portes.js';
import { versMonde, resoudre, hauteurSol } from './collision.js';
import { creerRencontre } from './rencontre.js';
import { creerOccupation } from './occupation.js';
import { creerPanneaux } from './panneaux.js';
import { appel } from './api.js';

const canvas = document.getElementById('scene');
const QUALITE = detecterQualite();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(QUALITE.dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
reglerAnisotropie(renderer, QUALITE);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe1f0, 210, 820);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 900);
camera.rotation.order = 'YXZ';

const ciel = new THREE.Mesh(
  new THREE.SphereGeometry(420, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      haut: { value: new THREE.Color('#3f86c6') },
      bas: { value: new THREE.Color('#d7e7f4') },
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
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
ciel.frustumCulled = false;
ciel.name = 'ciel';
scene.add(ciel);

const directionSoleil = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(50),
  THREE.MathUtils.degToRad(145)
);

// Skyline de ville : une couronne de bâtiments lointains dans la brume,
// pour ancrer la scène « en pleine ville » plutôt que « suspendue dans le vide ».
function textureFacadeVille() {
  const t = toile(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a3acb4';
    ctx.fillRect(0, 0, w, h);
    const r = graine(50021);
    const m = 128;
    for (let y = 0; y < h; y += m) {
      for (let x = 0; x < w; x += m) {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(x, y, w, 6);
        ctx.fillStyle = 'rgba(38,44,50,0.2)';
        ctx.fillRect(x, y + 6, w, 4);
        const g = ctx.createLinearGradient(x + 16, y + 26, x + 112, y + 108);
        g.addColorStop(0, '#8296a2');
        g.addColorStop(0.45, '#5b6d79');
        g.addColorStop(1, '#3d4b56');
        ctx.fillStyle = g;
        ctx.fillRect(x + 16, y + 24, 96, 84);
        ctx.fillStyle = 'rgba(214,232,244,0.16)';
        ctx.fillRect(x + 16, y + 24, 24, 84);
        ctx.fillStyle = 'rgba(228,232,236,0.5)';
        ctx.fillRect(x + 63, y + 24, 2, 84);
        ctx.fillStyle = 'rgba(28,34,40,0.5)';
        ctx.fillRect(x + 16, y + 64, 96, 2);
        ctx.fillStyle = 'rgba(18,22,26,0.24)';
        ctx.fillRect(x + 16, y + 102, 96, 6);
      }
    }
    for (let i = 0; i < 170; i++) {
      ctx.fillStyle = `rgba(70,78,84,${0.02 + r() * 0.05})`;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 1 + r() * 6, 0, TAU);
      ctx.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Les UV d'une boîte sont normalisées par face : on les remet à l'échelle
// réelle pour que les fenêtres gardent la même taille d'un immeuble à l'autre.
function uvFacade(geo, l, h, p, tuile) {
  const uv = geo.attributes.uv;
  const dims = [
    [p, h],
    [p, h],
    [l, p],
    [l, p],
    [l, h],
    [l, h],
  ];
  for (let f = 0; f < 6; f++) {
    const [du, dv] = dims[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * du) / tuile, (uv.getY(i) * dv) / tuile);
    }
  }
  uv.needsUpdate = true;
}

function construireSkyline(scene) {
  const groupe = new THREE.Group();
  const alea = graine(97131);
  const texture = textureFacadeVille();
  const facades = [0xffffff, 0xf3f5f7, 0xe9edf0, 0xf7f2e8, 0xdfe6ea, 0xcfd9df].map(
    (couleur) =>
      new THREE.MeshStandardMaterial({
        map: texture,
        color: couleur,
        roughness: 0.62,
        metalness: 0.16,
        envMapIntensity: 0.65,
      })
  );
  const toit = new THREE.MeshStandardMaterial({ color: 0x707a82, roughness: 0.95 });

  for (let i = 0; i < 54; i++) {
    const a = (i / 54) * TAU + alea() * 0.09;
    const l = 11 + alea() * 21;
    const h = 18 + Math.pow(alea(), 1.45) * 84;
    const p = 11 + alea() * 21;
    const facade = facades[Math.floor(alea() * facades.length)];
    const geo = new THREE.BoxGeometry(l, h, p);
    uvFacade(geo, l, h, p, 7);

    const batiment = new THREE.Mesh(geo, [facade, facade, toit, toit, facade, facade]);
    batiment.position.set(Math.cos(a) * 335, h / 2 - 8, Math.sin(a) * 335);
    batiment.rotation.y = a + PI;

    const couronne = new THREE.Mesh(
      new THREE.BoxGeometry(l * 0.44, 2.4 + alea() * 4.2, p * 0.46),
      toit
    );
    couronne.position.y = h / 2 + couronne.geometry.parameters.height / 2 - 1.2;
    batiment.add(couronne);
    groupe.add(batiment);
  }
  scene.add(groupe);
}
construireSkyline(scene);

const hemi = new THREE.HemisphereLight(0xd6ebff, 0xead3ac, 0.28);
scene.add(hemi);

const soleil = new THREE.DirectionalLight(0xfff3dc, 3.9);
soleil.castShadow = true;
soleil.target.position.set(0, 6, 42);
soleil.position.copy(soleil.target.position).addScaledVector(directionSoleil, 190);
scene.add(soleil);
scene.add(soleil.target);
reglerSoleil(soleil, QUALITE);

const contre = new THREE.DirectionalLight(0xcfe4f5, 0.3);
contre.position.set(40, 22, -45);
scene.add(contre);

installerEnvironnement(renderer, scene);

const composer =
  new URLSearchParams(location.search).get('post') === 'non'
    ? null
    : creerComposeur(renderer, scene, camera, QUALITE);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 300;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = 1.44;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;

const CIBLE_ILE = new THREE.Vector3(0, 9, 42);

function positionVueIle() {
  const aspect = window.innerWidth / window.innerHeight;
  const recul = aspect < 0.85 ? 1.4 : aspect < 1.2 ? 1.15 : 1;
  return new THREE.Vector3(128 * recul, 84 * recul, -86 * recul);
}

camera.position.copy(positionVueIle());
controls.target.copy(CIBLE_ILE);
controls.update();

const chargement = document.getElementById('chargement');
const progression = document.getElementById('progression');
const pourcentage = document.getElementById('pourcentage');

function progresser(fait, total) {
  const pct = Math.round((fait / total) * 100);
  progression.style.width = pct + '%';
  pourcentage.textContent = pct + ' %';
}

let siege = null;
let labels = null;
const clickables = [];
let actifId = null;
let vol = null;

let mode = 'ile';
let etage = 0;
let ascenseurOuvert = false;
let transitionEtage = false;
const collidersEtagesMonde = [];
const collidersActifs = [];
const portesToutes = [];
const batiments = [];
const agentsMonde = [];
const agentParNom = new Map();
const ascenseurMonde = new THREE.Vector3();
let porteProche = null;
let ascenseurProche = false;
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
  const collidersParc = construireCampus(ile, modeles);
  siege = construireSiege(ile, modeles);
  clickables.push(siege.zone);

  siege.groupe.updateMatrixWorld(true);
  for (let e = 0; e < siege.collidersEtages.length; e++) {
    collidersEtagesMonde[e] = (siege.collidersEtages[e] || []).map((c) => {
      const monde = versMonde(siege.groupe, c);
      c.monde = monde;
      return monde;
    });
  }
  collidersEtagesMonde[0].push(
    ...[...collidersIle, ...collidersParc].map((c) => ({ ...c, rot: c.rot || 0, actif: true }))
  );

  for (const porte of siege.portes) {
    porte.monde = siege.groupe.localToWorld(new THREE.Vector3(porte.x, 0, porte.z));
    porte.collider.monde.porte = true;
    portesToutes.push(porte);
  }
  batiments.push({ groupe: siege.groupe, bati: siege.bati });

  const ascenseurLocal = siege.groupe.localToWorld(
    new THREE.Vector3(siege.ascenseur.x, 0, siege.ascenseur.z)
  );
  ascenseurMonde.set(ascenseurLocal.x, 0, ascenseurLocal.z);

  ile.updateMatrixWorld(true);
  for (const a of siege.agents) {
    const pos = new THREE.Vector3();
    a.objet.getWorldPosition(pos);
    const agent = {
      ...a,
      pos,
      bras: a.bras || [],
      jambes: a.jambes || [],
      sol: a.sol ?? 0.35,
      decalage: agentsMonde.length * 0.83,
    };
    agentsMonde.push(agent);
    agentParNom.set(agent.nom, agent);
  }

  // Etiquette unique de la tour
  labels = creerLabels(document.getElementById('labels'));
  labels.ajouterLieu({
    objet: siege.ancreLieu,
    lieu: SIEGE.lieu,
    pole: SIEGE.pole,
    accent: SIEGE.accent,
    nbAgents: siege.agents.length,
    poleIds: ['siege'],
  });
  labels.mesurer();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => labels.mesurer());

  appliquerEtage(0);

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

  vie = creerOccupation({
    agents: agentsMonde,
    enTache: (nom) => !!(rencontre && rencontre.estEnTache(nom)),
    surChangement: (evenement) => {
      if (panneaux) panneaux.majReunion();
      if (evenement && evenement.type === 'reunion') {
        if (evenement.phase === 'arrivee') compteRenduDemande = false;
        if (evenement.active && evenement.phase === 'assise') demanderCompteRendu();
      }
    },
  });

  const lieuxPanneau = [
    {
      id: 'direction',
      pole: DIRECTION.pole,
      lieu: `${DIRECTION.lieu} · RDC`,
      mission: DIRECTION.mission,
      nbAgents: 1,
      accent: DIRECTION.accent,
    },
    ...POLES.map((p) => ({
      id: p.id,
      pole: p.pole,
      lieu: `${p.lieu} · étage ${p.etage}`,
      mission: p.mission,
      nbAgents: p.agents.length,
      accent: p.accent,
    })),
    {
      id: 'siege',
      pole: SIEGE.pole,
      lieu: `${SIEGE.lieu} · RDC`,
      mission: SIEGE.mission,
      nbAgents: 1,
      accent: SIEGE.accent,
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

  reglerIntensites(scene);

  // Reflet d'environnement réel pour le vitrage : une capture cubique depuis
  // le toit renvoie la skyline et le ciel dans les vitres, pas seulement un
  // dégradé. Une seule capture au chargement.
  const reflet = new THREE.CubeCamera(
    1,
    1200,
    new THREE.WebGLCubeRenderTarget(QUALITE.nom === 'mobile' ? 256 : 512, { type: THREE.HalfFloatType }),
  );
  reflet.position.set(0, 46, 64);
  scene.add(reflet);
  const toneMappingAvant = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  reflet.update(renderer, scene);
  renderer.toneMapping = toneMappingAvant;
  VERRE_EXT.envMap = reflet.renderTarget.texture;
  VERRE_EXT.envMapIntensity = 1.45;
  VERRE_EXT.needsUpdate = true;

  renderer.render(scene, camera);
  requestAnimationFrame(() => chargement.classList.add('cache'));

  const demande = new URLSearchParams(location.search).get('pole');
  if (demande === 'siege' || demande === 'direction' || POLES.some((p) => p.id === demande)) {
    entrerTour(demande);
  }
}

function afficherFiche(id) {
  if (id === 'siege') {
    document.getElementById('fiche-trait').style.background = SIEGE.accent;
    document.getElementById('fiche-sur').textContent = SIEGE.pole;
    document.getElementById('fiche-titre').textContent = SIEGE.lieu;
    document.getElementById('fiche-mission').textContent = SIEGE.mission;
    document.getElementById('fiche-agents').innerHTML =
      '<li><div><b>RDC</b><span>Accueil · Direction Générale · Salle du conseil · Pause</span></div></li>' +
      '<li><div><b>Étages 1 → 9</b><span>Un pôle par étage · ascenseur au centre</span></div></li>';
    document.getElementById('fiche').classList.add('ouverte');
    return;
  }
  const p = id === 'direction' ? DIRECTION : POLES.find((x) => x.id === id);
  if (!p) return;

  const agents = id === 'direction' ? [DIRECTION.agent] : p.agents;
  document.getElementById('fiche-trait').style.background = p.accent;
  document.getElementById('fiche-sur').textContent =
    id === 'direction' ? p.pole : `${p.pole} · étage ${p.etage}`;
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
  if (mode !== 'ile' || vol || !siege) return;
  actifId = 'siege';
  document.getElementById('entrer').disabled = false;
  afficherFiche(id);
  volerVers(new THREE.Vector3(42, 30, 18), new THREE.Vector3(0, 16, 64), () => {
    controls.autoRotate = false;
  });
}

function voirLieuPanneau(id) {
  if (mode !== 'ile') return;
  selectionner(id);
}

function entrerLieuPanneau(id) {
  if (mode !== 'ile' || vol) return;
  entrerTour(id);
}

function voirAgent(nom) {
  const a = agentParNom.get(nom);
  if (!a) return;
  if (mode === 'ile' && !vol) {
    if (panneaux) panneaux.fermer();
    entrerTour(a.lieuId, { agent: nom });
    return;
  }
  if (panneaux) {
    panneaux.notifier({
      titre: `${a.prenom} est ${a.etage ? `à l'étage ${a.etage}` : 'au RDC'}`,
      texte: `${a.poste} — ${a.lieu}`,
      accent: a.accent || '#b08145',
    });
  }
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
  fermerAscenseur();
  mode = 'ile';
  touches.clear();
  vitesse.set(0, 0);
  porteProche = null;
  agentProche = null;
  ascenseurProche = false;
  avis = { texte: '', reste: 0 };
  appliquerEtage(0);
  document.body.classList.remove('premiere', 'souris-libre', 'fenetre');
  document.getElementById('indice').classList.remove('actif');
  document.getElementById('fiche').classList.remove('ouverte');
  camera.near = 1;
  camera.fov = 42;
  camera.updateProjectionMatrix();
  if (actifId) document.getElementById('entrer').disabled = false;
  volerVers(positionVueIle(), CIBLE_ILE.clone(), () => {
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

function entrerTour(id, options = {}) {
  if (mode !== 'ile' || vol || !siege) return;
  const pole = POLES.find((p) => p.id === id);
  const niveau = pole ? pole.etage : 0;
  const meta = siege.etages[niveau];

  if (panneaux) panneaux.fermer();
  actifId = 'siege';
  document.getElementById('fiche').classList.remove('ouverte');

  let lx;
  let lz;
  if (id === 'direction') {
    lx = 3;
    lz = 5.2;
  } else if (pole) {
    const bureau = options.agent
      ? siege.portes.find((p) => p.etage === niveau && p.nom === options.agent)
      : null;
    if (bureau) {
      lx = bureau.x;
      lz = bureau.z - 1.6;
    } else {
      lx = 0;
      lz = -5.4;
    }
  } else {
    lx = 0;
    lz = -10.8;
  }
  const regard = pole && !options.agent ? 0 : PI;

  appliquerEtage(niveau);
  siege.groupe.updateMatrixWorld(true);
  const spawn = siege.groupe.localToWorld(new THREE.Vector3(lx, 0, lz));
  const res = resoudre(spawn.x, spawn.z, 0.3, collidersActifs);
  const sol = solEtage(niveau);
  joueur.set(res.x, sol, res.z);
  camY = sol + OEIL;
  yaw = regard;
  pitch = 0;
  vitesse.set(0, 0);

  document.body.classList.add('premiere');
  document.body.classList.remove('souris-libre');
  document.getElementById('marche-lieu').textContent =
    niveau === 0 ? 'RDC — Accueil & Direction' : meta.sous.split(' · ')[0];
  document.getElementById('marche-pole').textContent =
    niveau === 0 ? meta.pole : `Étage ${niveau} · ${meta.pole}`;
  document.getElementById('indice').classList.remove('actif');
  document.getElementById('entrer').disabled = true;
  camera.near = 0.06;
  camera.fov = 68;
  camera.updateProjectionMatrix();

  mode = 'entree';
  verrouiller();

  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const cible = siege.groupe.localToWorld(new THREE.Vector3(lx + fx * 3.2, 0, lz + fz * 3.2));
  cible.y = camY;
  plongerVers(new THREE.Vector3(joueur.x, camY, joueur.z), cible, () => {
    mode = 'premiere';
    camera.rotation.set(pitch, yaw, 0);
    camera.position.set(joueur.x, camY, joueur.z);
    document.body.classList.toggle('souris-libre', document.pointerLockElement !== canvas);
  });
}

function appliquerEtage(niveau) {
  if (!siege) return;
  etage = niveau;
  for (let i = 0; i < siege.groupesEtages.length; i++) {
    const groupe = siege.groupesEtages[i];
    if (groupe) groupe.visible = i === 0 || i === niveau;
  }

  collidersActifs.length = 0;
  for (const c of collidersEtagesMonde[niveau] || []) collidersActifs.push(c);

  const y = solEtage(niveau);
  for (const pl of siege.lumieres) pl.position.y = y + 2.55;

  const meta = siege.etages[niveau] || siege.etages[0];
  const hudPole = document.getElementById('marche-pole');
  const hudLieu = document.getElementById('marche-lieu');
  const hudEtage = document.getElementById('marche-etage');
  if (hudPole) {
    hudPole.textContent = niveau === 0 ? meta.pole : `Étage ${niveau} · ${meta.pole}`;
  }
  if (hudLieu && mode !== 'ile') {
    hudLieu.textContent = niveau === 0 ? 'RDC — Accueil & Direction' : meta.sous.split(' · ')[0];
  }
  if (hudEtage) hudEtage.textContent = niveau === 0 ? 'RDC' : `Étage ${niveau}`;

  if (ascenseurOuvert) construireAscenseur();
}

function construireAscenseur() {
  const zone = document.getElementById('ascenseur-etages');
  if (!zone || !siege) return;
  zone.textContent = '';
  for (const e of siege.etages) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ascenseur-etage' + (e.niveau === etage ? ' actif' : '');
    b.style.setProperty('--accent', e.accent);
    b.innerHTML =
      `<b>${e.niveau === 0 ? 'RDC' : `Étage ${e.niveau}`}</b>` +
      `<span>${e.pole}</span><em>${e.sous}</em>`;
    b.addEventListener('click', () => allerEtage(e.niveau));
    zone.append(b);
  }
}

function ouvrirAscenseur() {
  if (!siege || mode !== 'premiere' || transitionEtage) return;
  ascenseurOuvert = true;
  construireAscenseur();
  const el = document.getElementById('ascenseur');
  if (el) el.hidden = false;
  touches.clear();
  vitesse.set(0, 0);
  if (document.pointerLockElement === canvas) document.exitPointerLock();
}

function fermerAscenseur() {
  ascenseurOuvert = false;
  const el = document.getElementById('ascenseur');
  if (el) el.hidden = true;
}

function allerEtage(niveau) {
  if (!siege || transitionEtage) return;
  const meta = siege.etages[niveau];
  if (!meta) return;
  transitionEtage = true;
  fermerAscenseur();
  const voile = document.getElementById('voile-etage');
  if (voile) voile.classList.add('actif');

  setTimeout(() => {
    appliquerEtage(niveau);
    siege.groupe.updateMatrixWorld(true);
    const spawn = siege.groupe.localToWorld(new THREE.Vector3(0, 0, -5.4));
    const res = resoudre(spawn.x, spawn.z, 0.3, collidersActifs);
    const sol = solEtage(niveau);
    joueur.set(res.x, sol, res.z);
    camY = sol + OEIL;
    yaw = 0;
    pitch = 0;
    vitesse.set(0, 0);
    camera.position.set(joueur.x, camY, joueur.z);
    camera.rotation.set(0, 0, 0);
    avis = { texte: niveau === 0 ? 'Rez-de-chaussée' : `Étage ${niveau} — ${meta.pole}`, reste: 3.0 };
    if (voile) voile.classList.remove('actif');
    if (mode === 'premiere') verrouiller();
    setTimeout(() => {
      transitionEtage = false;
    }, 260);
  }, 330);
}

function solIci(x, z) {
  if (mode !== 'ile' && etage > 0) return solEtage(etage);
  const h = hauteurSol(x, z, batiments);
  if (h !== null) return h;
  if (Math.hypot(x, z) <= 11.2) return 0.05;
  return 0.02;
}

// Zone de marche : le disque de l'île et le plateau du Siège, réunis.
const LIMITE_ILE = RAYON_ILE - 1.4;
const MARCHE_SIEGE = {
  x0: ZONE_SIEGE.x0 + 0.8,
  x1: ZONE_SIEGE.x1 - 0.8,
  z0: ZONE_SIEGE.z0 + 0.2,
  z1: ZONE_SIEGE.z1 - 0.8,
};

function borner(x, z) {
  if (mode !== 'ile' && etage > 0) {
    const z0 = siege.groupe.position.z;
    return [
      Math.max(-23.4, Math.min(23.4, x)),
      Math.max(z0 - 13.4, Math.min(z0 + 13.4, z)),
    ];
  }
  const cercle = Math.hypot(x, z) <= LIMITE_ILE;
  const rect =
    x >= MARCHE_SIEGE.x0 && x <= MARCHE_SIEGE.x1 && z >= MARCHE_SIEGE.z0 && z <= MARCHE_SIEGE.z1;
  if (cercle || rect) return [x, z];

  const r = Math.hypot(x, z) || 1;
  const cx = (x * LIMITE_ILE) / r;
  const cz = (z * LIMITE_ILE) / r;
  const rx = Math.min(MARCHE_SIEGE.x1, Math.max(MARCHE_SIEGE.x0, x));
  const rz = Math.min(MARCHE_SIEGE.z1, Math.max(MARCHE_SIEGE.z0, z));
  const dc = (cx - x) ** 2 + (cz - z) ** 2;
  const dr = (rx - x) ** 2 + (rz - z) ** 2;
  return dc <= dr ? [cx, cz] : [rx, rz];
}

function majPortes(dt) {
  porteProche = null;
  let dmin = 2.5;
  for (const porte of portesToutes) {
    if (porte.etage !== etage) continue;
    const d = Math.hypot(joueur.x - porte.monde.x, joueur.z - porte.monde.z);
    if (d < dmin) {
      dmin = d;
      porteProche = porte;
    }
  }
  if (porteProche) porteProche.distance = dmin;
  ascenseurProche =
    Math.hypot(joueur.x - ascenseurMonde.x, joueur.z - ascenseurMonde.z) <= siege.ascenseur.rayon;

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
  } else if (ascenseurProche) {
    el.textContent = 'E pour prendre l\u2019ascenseur';
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
  if (ascenseurProche) {
    ouvrirAscenseur();
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
  if (ascenseurOuvert || transitionEtage) {
    vitesse.set(0, 0);
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

  let nx = joueur.x + vitesse.x * dt;
  let nz = joueur.z + vitesse.y * dt;
  [nx, nz] = borner(nx, nz);

  const res = resoudre(nx, nz, 0.3, collidersActifs);
  [joueur.x, joueur.z] = borner(res.x, res.z);

  const sol = solIci(joueur.x, joueur.z);
  camY += (sol + OEIL - camY) * Math.min(1, dt * 11);
  camera.position.set(joueur.x, camY, joueur.z);
  camera.rotation.set(pitch, yaw, 0);

  agentProche = null;
  let meilleur = 2.4;
  for (const agent of agentsMonde) {
    if (agent.etage !== etage) continue;
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
    if (actifId) entrerTour(actifId);
  });

  const ascenseur = document.getElementById('ascenseur');
  if (ascenseur) {
    document.getElementById('ascenseur-fermer').addEventListener('click', fermerAscenseur);
    ascenseur.addEventListener('pointerdown', (evenement) => {
      if (evenement.target === ascenseur) fermerAscenseur();
    });
  }

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
    if (trouves.length) entrerTour(trouves[0].object.userData.poleId);
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
    if (ascenseurOuvert) {
      if (e.code === 'Escape') {
        fermerAscenseur();
        verrouiller();
        return;
      }
      const chiffre = /^Digit([0-9])$/.exec(e.code);
      if (chiffre) {
        e.preventDefault();
        allerEtage(Number(chiffre[1]));
      }
      return;
    }
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
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
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
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  animer();
}

demarrer();
