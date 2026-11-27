import { ETATS } from './data.js';

// Occupation statique du QG : les agents restent à leur poste.
// Aucun déplacement, aucune promenade, aucun café simulé.
export function creerOccupation({ agents, enTache, surChangement }) {
  const parNom = new Map(agents.map((a) => [a.nom, a]));
  let reunion = {
    active: false,
    phase: 'inactive',
    participants: [],
    sujet: '',
    debut: 0,
    debutAssise: 0,
    assis: 0,
  };
  let compteRendu = null;

  function signaler() {
    if (!surChangement) return;
    surChangement({
      type: 'reunion',
      active: reunion.active,
      phase: reunion.phase,
      sujet: reunion.sujet,
      participants: reunion.participants.map((nom) => ({
        nom,
        prenom: parNom.get(nom)?.prenom || nom,
        etat: reunion.active ? 'assise' : '',
      })),
      depuis: reunion.debutAssise || reunion.debut,
      assis: reunion.assis,
    });
  }

  function lancerReunion({ noms, sujet }) {
    if (reunion.active) return { ok: false, message: 'Une réunion est déjà en cours.' };
    const sujetNet = String(sujet || '').trim();
    if (!sujetNet) return { ok: false, message: 'Donne un sujet à la réunion.' };
    const choisis = [...new Set(noms || [])].filter((nom) => parNom.has(nom));
    if (!choisis.length) return { ok: false, message: 'Coche au moins un agent.' };
    if (choisis.length > 8) return { ok: false, message: 'La salle de réunion accueille 8 agents au maximum.' };
    for (const nom of choisis) {
      if (enTache && enTache(nom)) {
        return { ok: false, message: `${parNom.get(nom).prenom} a une tâche en cours.` };
      }
    }

    const maintenant = performance.now();
    reunion = {
      active: true,
      phase: 'assise',
      participants: choisis,
      sujet: sujetNet,
      debut: maintenant,
      debutAssise: maintenant,
      assis: choisis.length,
    };
    compteRendu = null;
    signaler();
    return { ok: true };
  }

  function finReunion() {
    reunion = {
      active: false,
      phase: 'inactive',
      participants: [],
      sujet: '',
      debut: 0,
      debutAssise: 0,
      assis: 0,
    };
    signaler();
  }

  return {
    maj() {},
    activiteDe(nom) {
      if (reunion.active && reunion.participants.includes(nom)) {
        return { type: 'reunion', libelle: 'En réunion', couleur: '#b08145' };
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
    reunionInfo() {
      return {
        active: reunion.active,
        phase: reunion.phase,
        sujet: reunion.sujet,
        participants: reunion.participants.map((nom) => ({
          nom,
          prenom: parNom.get(nom)?.prenom || nom,
          etat: reunion.active ? 'assise' : '',
        })),
        depuis: reunion.debutAssise || reunion.debut,
        duree: 24000,
        assis: reunion.assis,
        finDemandee: false,
      };
    },
    definirCompteRendu(donnees) {
      compteRendu = donnees || null;
      signaler();
    },
    compteRendu() {
      return compteRendu;
    },
    estAbsent() {
      return false;
    },
    estDisponible(nom) {
      if (!parNom.has(nom)) return false;
      if (enTache && enTache(nom)) return false;
      return !reunion.participants.includes(nom);
    },
    lancerReunion,
    finReunion,
    terminerReunionSilencieux: finReunion,
    colliders: [],
  };
}
