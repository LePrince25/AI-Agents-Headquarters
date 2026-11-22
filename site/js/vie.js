import * as THREE from 'three';
import { PI, TAU, box, cyl, mat, graine } from './core.js';
import { agentProcedural } from './agents.js';
import { ETATS } from './data.js';
import { creerChemin } from './chemin.js';
import { PORTE_OUVERTE } from './portes.js';

const QG_SOL = 0.32;
const CENTRE_TABLE = { x: 0, z: 0.55 };
const TERRASSE_CENTRE = { x: 0, z: 27.2 };
const VITESSE_MARCHE = 2.5;
const VITESSE_REUNION = 3.2;
const DUREE_REUNION = 24000;
const MAX_AMBIANCE = 3;

const CHAISES = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * TAU;
  const x = Math.cos(a) * 2.15;
  const z = Math.sin(a) * 1.35 + 0.55;
  return { x, z, rot: Math.atan2(-x, -(z - CENTRE_TABLE.z)) };
});

const CAFE_SPOTS = [
  { x: -3.0, z: 28.6 },
  { x: 3.0, z: 28.4 },
  { x: -3.3, z: 25.8 },
  { x: 3.4, z: 25.6 },
];

const CHAT_SPOTS = [
  [
    { x: -1.4, z: 8.6, rot: PI / 2 },
    { x: 1.4, z: 8.6, rot: -PI / 2 },
  ],
  [
    { x: -1.7, z: 10.4, rot: PI / 2 },
    { x: 1.7, z: 10.4, rot: -PI / 2 },
  ],
];

function angleDiff(cible, actuel) {
  let d = cible - actuel;
  while (d > PI) d -= TAU;
  while (d < -PI) d += TAU;
  return d;
}

function orienter(objet, cible, dt, vitesse = 10) {
  objet.rotation.y += angleDiff(cible, objet.rotation.y) * Math.min(1, dt * vitesse);
}

function faireTrajet(points, vitesse) {
  const pts = [];
  let total = 0;
  let precedent = null;
  for (const p of points) {
    if (precedent && Math.hypot(p.x - precedent.x, p.z - precedent.z) < 0.04) continue;
    if (precedent) total += Math.hypot(p.x - precedent.x, p.z - precedent.z);
    pts.push({ x: p.x, y: p.y, z: p.z, d: total });
    precedent = p;
  }
  return { pts, total, vitesse };
}

function positionTrajet(trajet, d) {
  const pts = trajet.pts;
  if (pts.length === 1) {
    return { x: pts[0].x, y: pts[0].y, z: pts[0].z, angle: 0 };
  }
  let i = 1;
  while (i < pts.length - 1 && pts[i].d < d) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const longueur = Math.max(0.0001, b.d - a.d);
  const t = Math.max(0, Math.min(1, (d - a.d) / longueur));
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    angle: Math.atan2(b.x - a.x, b.z - a.z),
  };
}

function inverserTrajet(trajet) {
  return faireTrajet(
    trajet.pts
      .slice()
      .reverse()
      .map((p) => ({ x: p.x, y: p.y, z: p.z })),
    trajet.vitesse
  );
}

function creerTapisBande() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#3f4549';
  x.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 128; i += 16) {
    x.fillStyle = i % 32 === 0 ? '#4b5257' : '#363c40';
    x.fillRect(i, 0, 7, 64);
  }
  x.fillStyle = 'rgba(255, 255, 255, .08)';
  x.fillRect(0, 0, 128, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ajouterTasse(walker) {
  if (!walker || !walker.bras.length || walker.tasse) return;
  const bras = walker.bras[1];
  const tasse = new THREE.Group();
  tasse.position.set(0, -0.56, 0.08);
  tasse.add(cyl(0.04, 0.034, 0.075, 0xf3ead5, 0, 0, 0, 10, { roughness: 0.5 }));
  tasse.add(box(0.028, 0.05, 0.012, 0xf3ead5, 0.045, 0, 0));
  tasse.add(cyl(0.034, 0.034, 0.012, 0x7a4b2f, 0, 0.043, 0, 10));
  bras.add(tasse);
  walker.tasse = tasse;
}

function retirerTasse(walker) {
  if (!walker || !walker.tasse) return;
  walker.tasse.parent?.remove(walker.tasse);
  walker.tasse = null;
}

export function creerVie({ scene, agents, figurants = [], enTache, surChangement, colliders = [], sol, portes = [], joueur }) {
  const parNom = new Map(agents.map((a) => [a.nom, a]));
  const etats = new Map();
  const absents = new Set();
  let reunion = { active: false, phase: 'inactive', participants: [], sujet: '', debut: 0, debutAssise: 0, assis: 0, finDemandee: false };
  let compteRendu = null;
  const figurantsVivants = [...figurants];
  const solIci = sol || (() => 0.05);
  const chemin = creerChemin({ colliders });

  function cheminer(depart, arrivee, vitesse) {
    const points = chemin.trouver(depart, arrivee) || [arrivee];
    const complets = [{ x: depart.x, y: depart.y ?? solIci(depart.x, depart.z), z: depart.z }];
    for (const p of points) complets.push({ x: p.x, y: solIci(p.x, p.z), z: p.z });
    complets.push({ x: arrivee.x, y: arrivee.y ?? solIci(arrivee.x, arrivee.z), z: arrivee.z });
    return faireTrajet(complets, vitesse);
  }

  function signaler() {
    if (!surChangement) return;
    surChangement({
      type: 'reunion',
      active: reunion.active,
      phase: reunion.phase,
      sujet: reunion.sujet,
      participants: reunion.participants.map((nom) => {
        const a = parNom.get(nom);
        return { nom, prenom: a ? a.prenom : nom, etat: etats.get(nom)?.phase || '' };
      }),
      depuis: reunion.debutAssise || reunion.debut,
      assis: reunion.assis,
    });
  }

  function creerMarcheur(agent) {
    const p = agentProcedural(scene, agent.pos.x, agent.pos.z, 0, false, agent.index, agent.sol || 0.05);
    p.groupe.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    p.tasse = null;
    p.phase = Math.random() * TAU;
    return p;
  }

  function creerAssis(agent, x, z, rot, y) {
    const p = agentProcedural(scene, x, z, rot, true, agent.index, y);
    p.groupe.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    p.phase = Math.random() * TAU;
    return p;
  }

  function detruire(groupe) {
    if (!groupe) return;
    groupe.parent?.remove(groupe);
    groupe.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose?.();
    });
  }

  function trajetVersQG(agent, chair) {
    const depart = { x: agent.pos.x, z: agent.pos.z, y: agent.sol || QG_SOL };
    const points = chemin.trouver(depart, chair) || [chair];
    const complets = [{ x: depart.x, y: depart.y, z: depart.z }];
    for (const p of points) complets.push({ x: p.x, y: solIci(p.x, p.z), z: p.z });
    complets.push({ x: chair.x, y: QG_SOL, z: chair.z });
    return faireTrajet(complets, VITESSE_REUNION);
  }

  function lancerMarche(agent, type, trajet, extra = {}) {
    const walker = creerMarcheur(agent);
    walker.groupe.visible = false;
    agent.objet.visible = false;
    absents.add(agent.nom);
    const position = positionTrajet(trajet, 0);
    walker.groupe.position.set(position.x, position.y, position.z);
    walker.groupe.rotation.y = position.angle;
    etats.set(agent.nom, {
      type,
      phase: 'aller',
      trajet,
      d: 0,
      walker,
      sitter: null,
      arrive: performance.now(),
      ...extra,
    });
    return etats.get(agent.nom);
  }

  function arriverSurPlace(agent, etat, duree, rot) {
    const position = positionTrajet(etat.trajet, etat.trajet.total);
    etat.walker.groupe.position.set(position.x, position.y, position.z);
    etat.walker.groupe.visible = true;
    etat.phase = 'surplace';
    etat.arrive = performance.now() + duree;
    if (typeof rot === 'number') etat.rot = rot;
  }

  function commencerRetour(agent, etat) {
    etat.phase = 'retour';
    etat.trajet = inverserTrajet(etat.trajet);
    etat.d = 0;
    const position = positionTrajet(etat.trajet, 0);
    etat.walker.groupe.visible = true;
    etat.walker.groupe.position.set(position.x, position.y, position.z);
  }

  function finirAmbiance(agent, etat) {
    retirerTasse(etat.walker);
    detruire(etat.walker.groupe);
    agent.objet.visible = true;
    etats.delete(agent.nom);
    absents.delete(agent.nom);
  }

  function choisirLibre(saufPole = null, doisEtreLibre = true) {
    const candidats = agents.filter((a) => {
      if (enTache && enTache(a.nom)) return false;
      if (etats.has(a.nom)) return false;
      if (saufPole !== null && a.poleId === saufPole) return false;
      return true;
    });
    if (!candidats.length) return null;
    const agent = candidats[Math.floor(Math.random() * candidats.length)];
    if (doisEtreLibre && !agent) return null;
    return agent;
  }

  function lancerCafe(agent) {
    if (!agent) return false;
    const spot = CAFE_SPOTS[Math.floor(Math.random() * CAFE_SPOTS.length)];
    const trajet = cheminer({ x: agent.pos.x, z: agent.pos.z, y: agent.sol || 0.05 }, { x: spot.x, z: spot.z }, VITESSE_MARCHE);
    const etat = lancerMarche(agent, 'cafe', trajet);
    ajouterTasse(etat.walker);
    etat.spot = spot;
    etat.rot = Math.atan2(TERRASSE_CENTRE.x - spot.x, TERRASSE_CENTRE.z - spot.z);
    return true;
  }

  function lancerDiscussion() {
    const premier = choisirLibre();
    if (!premier) return false;
    const second = choisirLibre(premier.poleId);
    if (!second) return false;
    const paire = CHAT_SPOTS[Math.floor(Math.random() * CHAT_SPOTS.length)];
    const trajetA = cheminer({ x: premier.pos.x, z: premier.pos.z, y: premier.sol || 0.05 }, { x: paire[0].x, z: paire[0].z }, VITESSE_MARCHE);
    const trajetB = cheminer({ x: second.pos.x, z: second.pos.z, y: second.sol || 0.05 }, { x: paire[1].x, z: paire[1].z }, VITESSE_MARCHE);
    const etatA = lancerMarche(premier, 'discussion', trajetA, { pair: second.prenom });
    const etatB = lancerMarche(second, 'discussion', trajetB, { pair: premier.prenom });
    etatA.rot = paire[0].rot;
    etatB.rot = paire[1].rot;
    etatA.duree = 18000;
    etatB.duree = 18000;
    return true;
  }

  function lancerPromenade(agent) {
    if (!agent) return false;
    const a = (agent.anglePole || 0) + 0.75;
    const r = 13.4;
    const trajet = cheminer(
      { x: agent.pos.x, z: agent.pos.z, y: agent.sol || 0.05 },
      { x: Math.cos(a) * r, z: Math.sin(a) * r },
      VITESSE_MARCHE * 0.85
    );
    const etat = lancerMarche(agent, 'promenade', trajet);
    etat.duree = 0;
    return true;
  }

  function ambiancePossible() {
    if (reunion.active && reunion.phase !== 'assise') return;
    let actives = 0;
    for (const etat of etats.values()) if (etat.type !== 'reunion') actives++;
    if (actives >= MAX_AMBIANCE) return;
    const tirage = Math.random();
    if (tirage < 0.34) {
      lancerDiscussion();
    } else if (tirage < 0.72) {
      lancerCafe(choisirLibre());
    } else {
      lancerPromenade(choisirLibre());
    }
  }

  function lancerReunion({ noms, sujet } = {}) {
    if (reunion.active) return { ok: false, message: 'Une réunion est déjà en cours.' };
    const sujetNet = typeof sujet === 'string' ? sujet.trim() : '';
    if (!sujetNet) return { ok: false, message: 'Donne un sujet à la réunion, ou un projet à lancer.' };
    const choisis = [...new Set((noms || []).filter((n) => typeof n === 'string'))];
    if (!choisis.length) return { ok: false, message: 'Coche au moins un agent.' };
    if (choisis.length > CHAISES.length) {
      return { ok: false, message: `La salle de réunion accueille ${CHAISES.length} agents au maximum.` };
    }
    const participants = [];
    for (const nom of choisis) {
      const agent = parNom.get(nom);
      if (!agent) continue;
      if (enTache && enTache(nom)) return { ok: false, message: `${agent.prenom} a une tâche en cours.` };
      if (etats.has(nom)) return { ok: false, message: `${agent.prenom} est déjà en déplacement.` };
      participants.push(agent);
    }
    if (!participants.length) return { ok: false, message: 'Aucun agent disponible.' };

    reunion = {
      active: true,
      phase: 'arrivee',
      participants: participants.map((a) => a.nom),
      sujet: sujetNet.slice(0, 200),
      debut: performance.now(),
      debutAssise: 0,
      assis: 0,
      finDemandee: false,
    };
    compteRendu = null;
    participants.forEach((agent, i) => {
      const chair = CHAISES[i % CHAISES.length];
      const etat = lancerMarche(agent, 'reunion', trajetVersQG(agent, chair));
      etat.chair = chair;
      etat.vitesse = VITESSE_REUNION;
    });
    signaler();
    return { ok: true };
  }

  function relancerRetour() {
    if (!reunion.active || reunion.phase === 'retour') return;
    reunion.phase = 'retour';
    for (const nom of reunion.participants) {
      const etat = etats.get(nom);
      if (!etat) continue;
      if (etat.sitter) {
        etat.sitter.groupe.visible = false;
      }
      if (!etat.walker) {
        const agent = parNom.get(nom);
        if (!agent) continue;
        etat.walker = creerMarcheur(agent);
      }
      etat.walker.groupe.visible = true;
      etat.trajet = inverserTrajet(etat.trajet);
      etat.d = 0;
      etat.phase = 'retour';
      const position = positionTrajet(etat.trajet, 0);
      etat.walker.groupe.position.set(position.x, position.y, position.z);
    }
    signaler();
  }

  function finReunion() {
    if (!reunion.active) return;
    if (reunion.phase === 'arrivee') {
      reunion.finDemandee = true;
      return;
    }
    if (reunion.phase === 'assise') relancerRetour();
  }

  function terminerReunionSilencieux() {
    for (const nom of reunion.participants) {
      const etat = etats.get(nom);
      if (!etat) continue;
      if (etat.walker) detruire(etat.walker.groupe);
      if (etat.sitter) detruire(etat.sitter.groupe);
      const agent = parNom.get(nom);
      if (agent) agent.objet.visible = true;
      etats.delete(nom);
      absents.delete(nom);
    }
    reunion = { active: false, phase: 'inactive', participants: [], sujet: '', debut: 0, debutAssise: 0, assis: 0, finDemandee: false };
    signaler();
  }

  function majPassages() {
    const maintenant = performance.now();
    for (const porte of portes) {
      if (!porte.monde || !porte.collider || !porte.collider.monde) continue;
      let pres = false;
      for (const etat of etats.values()) {
        const p = etat.walker && etat.walker.groupe.visible ? etat.walker.groupe.position : null;
        if (p && Math.hypot(p.x - porte.monde.x, p.z - porte.monde.z) < 1.9) {
          pres = true;
          break;
        }
      }
      if (pres) {
        if (!porte.ouvert) {
          porte.ouvert = true;
          porte.ouvertPar = 'passage';
          for (const p of porte.pivots) p.cible = p.cote * PORTE_OUVERTE;
          porte.collider.monde.actif = false;
        }
        porte.dernierPassage = maintenant;
      } else if (
        porte.ouvert &&
        porte.ouvertPar === 'passage' &&
        maintenant - (porte.dernierPassage || 0) > 1400
      ) {
        const joueurPres = joueur ? Math.hypot(joueur.x - porte.monde.x, joueur.z - porte.monde.z) < 1.8 : false;
        if (!joueurPres) {
          porte.ouvert = false;
          porte.ouvertPar = null;
          for (const p of porte.pivots) p.cible = 0;
          porte.collider.monde.actif = true;
        }
      }
    }
  }

  function majEtats(dt, temps) {
    const maintenant = performance.now();
    for (const [nom, etat] of [...etats.entries()]) {
      if (!etat.walker) continue;
      const walker = etat.walker;

      if (etat.phase === 'aller' || etat.phase === 'retour') {
        etat.d += etat.trajet.vitesse * dt;
        if (etat.d >= etat.trajet.total) etat.d = etat.trajet.total;
        const p = positionTrajet(etat.trajet, etat.d);
        walker.groupe.position.set(p.x, p.y + Math.sin(temps * 9 + walker.phase) * 0.012, p.z);
        orienter(walker.groupe, p.angle, dt, 9);

        const f = 7.5;
        for (let i = 0; i < walker.jambes.length; i++) {
          walker.jambes[i].rotation.x = Math.sin(temps * f + walker.phase + i * PI) * 0.55;
        }
        for (let i = 0; i < walker.bras.length; i++) {
          walker.bras[i].rotation.x = Math.sin(temps * f + walker.phase + i * PI + PI) * 0.42;
        }

        if (etat.d >= etat.trajet.total) {
          if (etat.type === 'reunion') {
            if (etat.phase === 'aller') {
              walker.groupe.visible = false;
              const agent = parNom.get(nom);
              if (agent && etat.chair) {
                etat.sitter = creerAssis(agent, etat.chair.x, etat.chair.z, etat.chair.rot, QG_SOL);
              }
              etat.phase = 'assise';
              reunion.assis += 1;
              signaler();
              if (reunion.assis >= reunion.participants.length) {
                reunion.phase = 'assise';
                reunion.debutAssise = maintenant;
                signaler();
              }
            } else {
              detruire(walker.groupe);
              if (etat.sitter) detruire(etat.sitter.groupe);
              const agent = parNom.get(nom);
              if (agent) agent.objet.visible = true;
              etats.delete(nom);
              absents.delete(nom);
              if (![...etats.values()].some((e) => e.type === 'reunion')) {
                reunion = { active: false, phase: 'inactive', participants: [], sujet: '', debut: 0, debutAssise: 0, assis: 0, finDemandee: false };
                signaler();
              }
            }
          } else if (etat.phase === 'aller') {
            if (etat.type === 'promenade') {
              commencerRetour(parNom.get(nom), etat);
            } else {
              etat.duree = etat.duree || 14000;
              arriverSurPlace(parNom.get(nom), etat, etat.duree, etat.rot);
            }
          } else {
            finirAmbiance(parNom.get(nom), etat);
          }
        }
      } else if (etat.phase === 'surplace') {
        if (walker.bras.length) {
          const geste = etat.type === 'discussion' ? 0.55 : 0.16;
          walker.bras[0].rotation.x = -0.18 + Math.sin(temps * 2.1 + walker.phase) * geste;
          walker.bras[1].rotation.x = -0.12 + Math.sin(temps * 1.7 + walker.phase + 1.7) * geste * 0.7;
        }
        for (const jambe of walker.jambes) jambe.rotation.x *= 0.85;
        if (typeof etat.rot === 'number') orienter(walker.groupe, etat.rot, dt, 6);
        if (maintenant >= etat.arrive) commencerRetour(parNom.get(nom), etat);
      } else if (etat.phase === 'assise') {
        if (etat.sitter && etat.sitter.bras.length) {
          etat.sitter.bras[0].rotation.x = -0.28 + Math.sin(temps * 1.5 + etat.sitter.phase) * 0.06;
          etat.sitter.bras[1].rotation.x = -0.28 + Math.sin(temps * 1.3 + etat.sitter.phase + 2) * 0.06;
        }
      }
    }

    if (reunion.active && reunion.phase === 'assise') {
      if (maintenant - reunion.debutAssise > DUREE_REUNION || reunion.finDemandee) relancerRetour();
    }
  }

  // --- Figurants et décor vivant ---

  function majFigurants(temps) {
    for (const f of figurantsVivants) {
      if (!f.bras.length) continue;
      const battement = f.actif
        ? Math.sin(temps * 1.15 + f.decalage) > -0.15
        : Math.sin(temps * 0.55 + f.decalage) > 0.75;
      const cible = battement ? -0.42 + Math.sin(temps * 12 + f.decalage) * 0.08 : -0.06;
      for (const bras of f.bras) bras.rotation.x += (cible - bras.rotation.x) * 0.08;
    }
  }

  const statiqueTerre = [];
  function creerStatiques() {
    const places = [
      { x: -3.4, z: 29.9, rot: Math.atan2(-3.4, 2.7), index: 81 },
      { x: 3.3, z: 29.8, rot: Math.atan2(-3.3, -2.6), index: 84 },
    ];
    for (const p of places) {
      const s = agentProcedural(scene, p.x, p.z, p.rot, false, p.index, 0.2);
      s.groupe.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      const w = { groupe: s.groupe, bras: s.bras, jambes: s.jambes, phase: Math.random() * TAU, tasse: null };
      ajouterTasse(w);
      statiqueTerre.push(w);
    }
  }

  function majStatiques(temps) {
    for (const s of statiqueTerre) {
      if (!s.bras.length) continue;
      s.bras[0].rotation.x = -0.12 + Math.sin(temps * 1.4 + s.phase) * 0.1;
      s.bras[1].rotation.x = -0.28 + Math.sin(temps * 1.1 + s.phase + 2) * 0.08;
    }
  }

  // Tapis de course
  const tapis = new THREE.Group();
  tapis.position.set(5.6, 0.05, 8.2);
  tapis.rotation.y = 0.42;
  tapis.add(box(2.5, 0.09, 0.86, 0x3c4246, 0, 0.045, 0, { roughness: 0.7 }));
  const bande = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 0.62),
    new THREE.MeshStandardMaterial({ map: creerTapisBande(), roughness: 0.8, metalness: 0.1 })
  );
  bande.rotation.x = -PI / 2;
  bande.position.set(0, 0.1, 0);
  bande.receiveShadow = true;
  tapis.add(bande);
  for (const cote of [-1, 1]) {
    tapis.add(box(0.06, 1.05, 0.06, 0x6e767b, -1.05, 0.56, cote * 0.4, { metalness: 0.4, roughness: 0.4 }));
    tapis.add(box(0.06, 1.05, 0.06, 0x6e767b, 1.05, 0.56, cote * 0.4, { metalness: 0.4, roughness: 0.4 }));
    tapis.add(box(2.2, 0.05, 0.05, 0x8a9398, 0, 1.06, cote * 0.4, { metalness: 0.5, roughness: 0.35 }));
  }
  const consoleTapis = new THREE.Group();
  consoleTapis.position.set(-1.2, 1.12, 0);
  consoleTapis.add(box(0.12, 0.55, 0.66, 0x3a4044, 0, 0.1, 0, { metalness: 0.3, roughness: 0.5 }));
  consoleTapis.add(box(0.03, 0.3, 0.44, 0xbfe0e6, -0.07, 0.14, 0, { roughness: 0.25 }));
  consoleTapis.rotation.z = -0.24;
  tapis.add(consoleTapis);
  const serviette = box(0.36, 0.04, 0.14, 0xd8a15c, 0.55, 1.09, 0.4);
  serviette.rotation.y = 0.2;
  tapis.add(serviette);
  scene.add(tapis);
  const coureur = agentProcedural(tapis, 0, 0, -PI / 2, false, 88, 0.11, { casque: true });
  coureur.groupe.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // Robot aspirateur
  const robot = new THREE.Group();
  robot.add(cyl(0.32, 0.32, 0.1, 0x3a4045, 0, 0.1, 0, 20, { roughness: 0.5, metalness: 0.25 }));
  robot.add(cyl(0.27, 0.29, 0.03, 0xe8e2d5, 0, 0.16, 0, 20, { roughness: 0.6 }));
  for (const cote of [-1, 1]) {
    robot.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat(0xffffff, { roughness: 0.3 })).translateX(cote * 0.08).translateY(0.18).translateZ(0.2));
    robot.add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(0x24282c)).translateX(cote * 0.08).translateY(0.18).translateZ(0.23));
  }
  const noeud = box(0.07, 0.12, 0.02, 0xa65a4f, 0, 0.15, 0.26);
  noeud.rotation.x = 0.5;
  robot.add(noeud);
  const brosse = cyl(0.02, 0.02, 0.28, 0x9aa1a5, 0.32, 0.08, 0, 8, { metalness: 0.4 });
  brosse.rotation.z = 0.4;
  robot.add(brosse);
  scene.add(robot);
  let angleRobot = 0;

  // Drone café
  const drone = new THREE.Group();
  drone.add(box(0.46, 0.12, 0.46, 0xe9e4d8, 0, 0, 0, { roughness: 0.45 }));
  drone.add(box(0.3, 0.06, 0.3, 0x485055, 0, 0.08, 0, { roughness: 0.4, metalness: 0.3 }));
  const rotors = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const bras = box(0.36, 0.035, 0.035, 0x555d62, sx * 0.27, 0.02, sz * 0.27, { metalness: 0.3 });
      bras.rotation.y = Math.atan2(sz, sx);
      drone.add(bras);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 14), mat(0x2f3538, { roughness: 0.4 }));
      rotor.position.set(sx * 0.42, 0.06, sz * 0.42);
      drone.add(rotor);
      rotors.push(rotor);
    }
  }
  const charge = new THREE.Group();
  charge.position.y = -0.42;
  charge.add(cyl(0.006, 0.006, 0.36, 0x6b6f72, 0, 0.18, 0, 4));
  charge.add(cyl(0.045, 0.038, 0.08, 0xf3ead5, 0, -0.02, 0, 10, { roughness: 0.5 }));
  charge.add(box(0.03, 0.05, 0.012, 0xf3ead5, 0.048, -0.02, 0));
  drone.add(charge);
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x7fd8ff })
  );
  led.position.set(0.18, 0.02, 0.18);
  drone.add(led);
  scene.add(drone);
  const positionDrone = new THREE.Vector3(0.8, 3.2, 26.4);
  drone.position.copy(positionDrone);
  const vol = { phase: 'attente', jusqua: performance.now() + 6000, points: null, durees: [], i: 0, t: 0, fin: null };

  function composerVol(cible, retour) {
    const depart = drone.position.clone();
    const haut = { x: depart.x, y: 6.4, z: depart.z };
    const dessus = { x: cible.x, y: 6.4, z: cible.z };
    const bas = { x: cible.x, y: 2.5, z: cible.z };
    const points = retour ? [depart, haut, { x: 0.8, y: 6.4, z: 26.4 }, { x: 0.8, y: 3.2, z: 26.4 }] : [depart, haut, dessus, bas];
    vol.points = points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    vol.durees = retour ? [2.2, 5.5, 2.2] : [1.6, 6, 2.4];
    vol.i = 0;
    vol.t = 0;
    vol.phase = 'vol';
  }

  function majDrone(dt, temps) {
    const maintenant = performance.now();
    for (const rotor of rotors) rotor.rotation.y += dt * 28;
    led.material.color.setHex(Math.sin(temps * 6) > 0 ? 0x7fd8ff : 0x2a5d72);
    if (vol.phase === 'attente' && maintenant >= vol.jusqua) {
      const cible = agents[Math.floor(Math.random() * agents.length)];
      composerVol(cible ? { x: cible.pos.x, z: cible.pos.z } : { x: 0, z: 8 }, false);
      return;
    }
    if (vol.phase === 'vol') {
      if (vol.i < vol.points.length - 1) {
        vol.t += dt / vol.durees[vol.i];
        const a = vol.points[vol.i];
        const b = vol.points[vol.i + 1];
        const t = Math.min(1, vol.t);
        const e = t * t * (3 - 2 * t);
        const avant = drone.position.clone();
        drone.position.lerpVectors(a, b, e);
        const dx = drone.position.x - avant.x;
        const dz = drone.position.z - avant.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.001) orienter(drone, Math.atan2(dx, dz), dt, 5);
        drone.rotation.z = -0.12;
        if (vol.t >= 1) {
          vol.i += 1;
          vol.t = 0;
          if (vol.i >= vol.points.length - 1) {
            vol.phase = vol.fin === 'retour' ? 'attente' : 'livraison';
            vol.jusqua = maintenant + (vol.fin === 'retour' ? 9000 : 4200);
            drone.rotation.z = 0;
            if (vol.phase === 'attente') vol.fin = null;
          }
        }
      }
    } else if (vol.phase === 'livraison' && maintenant >= vol.jusqua) {
      vol.fin = 'retour';
      const cible = { x: drone.position.x, z: drone.position.z };
      composerVol(cible, true);
    }
  }

  // Avion en papier
  const avion = new THREE.Group();
  {
    const geo = new THREE.BufferGeometry();
    const v = new Float32Array([
      0, 0, 0.75, -0.62, 0, -0.5, 0, 0.16, -0.32,
      0, 0, 0.75, 0, 0.16, -0.32, 0.62, 0, -0.5,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    geo.computeVertexNormals();
    const aile = new THREE.Mesh(geo, mat(0xfcfbf6, { side: THREE.DoubleSide, roughness: 0.65 }));
    aile.castShadow = true;
    avion.add(aile);
  }
  scene.add(avion);

  let angleAvion = 0.5;

  function majAvion(dt) {
    angleAvion += dt * 0.22;
    const r = 12.5;
    avion.position.set(Math.cos(angleAvion) * r, 5.4 + Math.sin(angleAvion * 2) * 0.7, Math.sin(angleAvion) * r);
    avion.rotation.y = -angleAvion;
    avion.rotation.z = Math.sin(angleAvion * 2.2) * 0.28;
  }

  function majCoureur(dt, temps) {
    const f = 9.5;
    for (let i = 0; i < coureur.jambes.length; i++) {
      coureur.jambes[i].rotation.x = Math.sin(temps * f + i * PI) * 0.62;
    }
    for (let i = 0; i < coureur.bras.length; i++) {
      coureur.bras[i].rotation.x = Math.sin(temps * f + i * PI + PI) * 0.5;
    }
    coureur.groupe.position.y = 0.11 + Math.abs(Math.sin(temps * f)) * 0.02;
    bande.material.map.offset.y -= dt * 0.9;
  }

  function majRobot(dt) {
    angleRobot += dt * 0.14;
    const r = 9.65;
    robot.position.set(Math.cos(angleRobot) * r, 0.06, Math.sin(angleRobot) * r);
    robot.rotation.y = -angleRobot;
    robot.rotation.z = Math.sin(angleRobot * 7) * 0.02;
  }

  function demarrerVie() {
    creerStatiques();
    setTimeout(() => {
      const a = choisirLibre();
      if (a) lancerCafe(a);
    }, 1400);
    setTimeout(() => lancerDiscussion(), 3600);
    setTimeout(() => {
      const a = choisirLibre();
      if (a) lancerPromenade(a);
    }, 7000);
    setInterval(() => {
      if (document.hidden) return;
      ambiancePossible();
    }, 7500);
  }

  demarrerVie();

  return {
    maj(dt, temps) {
      majEtats(dt, temps);
      majPassages();
      majFigurants(temps);
      majStatiques(temps);
      majDrone(dt, temps);
      majAvion(dt);
      majCoureur(dt, temps);
      majRobot(dt);
    },
    lancerReunion,
    finReunion,
    definirCompteRendu(donnees) {
      compteRendu = donnees || null;
      signaler();
    },
    compteRendu() {
      return compteRendu;
    },
    reunionInfo() {
      return {
        active: reunion.active,
        phase: reunion.phase,
        sujet: reunion.sujet,
        participants: reunion.participants.map((nom) => {
          const a = parNom.get(nom);
          return {
            nom,
            prenom: a ? a.prenom : nom,
            etat: etats.get(nom)?.phase === 'assise' ? 'assise' : 'marche',
          };
        }),
        depuis: reunion.debutAssise || reunion.debut,
        duree: DUREE_REUNION,
        assis: reunion.assis,
        finDemandee: reunion.finDemandee,
      };
    },
    estAbsent(nom) {
      return absents.has(nom);
    },
    estDisponible(nom) {
      if (!parNom.has(nom)) return false;
      if (enTache && enTache(nom)) return false;
      if (etats.has(nom)) return false;
      return !absents.has(nom);
    },
    activiteDe(nom) {
      const etat = etats.get(nom);
      if (etat) {
        if (etat.type === 'reunion') {
          return {
            type: 'reunion',
            libelle: etat.phase === 'assise' ? 'En réunion' : etat.phase === 'retour' ? 'Retour de réunion' : 'Vers la réunion',
            couleur: '#b08145',
          };
        }
        if (etat.type === 'cafe') {
          return {
            type: 'cafe',
            libelle: etat.phase === 'retour' ? 'Revient du café' : 'Au café',
            couleur: '#c98a2e',
          };
        }
        if (etat.type === 'discussion') {
          return {
            type: 'discussion',
            libelle: etat.pair ? `Discute avec ${etat.pair}` : 'Discute',
            couleur: '#5f8a9a',
          };
        }
        return {
          type: 'promenade',
          libelle: etat.phase === 'retour' ? 'Revient de balade' : 'En balade',
          couleur: '#8d9a4c',
        };
      }
      if (enTache && enTache(nom)) {
        return { type: 'tache', libelle: 'Tâche en cours', couleur: '#7b8496' };
      }
      const agent = parNom.get(nom);
      const base = agent ? ETATS[agent.etat] : null;
      return {
        type: base === ETATS.pause ? 'pause' : base === ETATS.attente ? 'attente' : 'travail',
        libelle: base ? base.libelle : 'Au travail',
        couleur: base ? base.couleur : '#4f8f5d',
      };
    },
    colliders: [{ x: 5.6, z: 8.2, r: 1.35, cercle: true }],
    terminerReunionSilencieux,
  };
}
