import { appel } from './api.js';
import { prenomDe, slugifier, formaterCout, texteLisible } from './utils.js';

function element(id) {
  return document.getElementById(id);
}

export function creerRencontre({ onOuverture, onFermeture, onFin, onDelegation } = {}) {
  let ia = { id: 'claude', nom: 'Claude Code' };
  const el = {
    fenetre: element('fenetre-agent'),
    boite: element('fa-boite'),
    trait: element('fa-trait'),
    fond: element('fa-fond'),
    lieu: element('fa-lieu'),
    titre: element('fa-titre'),
    poste: element('fa-poste'),
    prenom: element('fa-prenom'),
    fermer: element('fa-fermer'),
    choix: element('fa-choix'),
    discuter: element('fa-discuter'),
    tache: element('fa-tache'),
    panneauDiscussion: element('fa-panneau-discussion'),
    retourDiscussion: element('fa-retour-discussion'),
    fil: element('fa-fil'),
    formDiscussion: element('fa-form-discussion'),
    message: element('fa-message'),
    envoyer: element('fa-envoyer'),
    panneauTache: element('fa-panneau-tache'),
    retourTache: element('fa-retour-tache'),
    formTache: element('fa-form-tache'),
    consigne: element('fa-consigne'),
    aideTache: element('fa-aide-tache'),
    lancer: element('fa-lancer'),
    erreurTache: element('fa-erreur-tache'),
    suivi: element('fa-suivi'),
    point: element('fa-point'),
    etatTexte: element('fa-etat-texte'),
    cout: element('fa-cout'),
    journal: element('fa-journal'),
    texteBloc: element('fa-texte-bloc'),
    texte: element('fa-texte'),
    rapportBloc: element('fa-rapport-bloc'),
    rapport: element('fa-rapport'),
    fichiersBloc: element('fa-fichiers-bloc'),
    fichiers: element('fa-fichiers'),
    fichierBloc: element('fa-fichier-bloc'),
    fichierTitre: element('fa-fichier-titre'),
    fichierContenu: element('fa-fichier-contenu'),
    boutonsFin: element('fa-boutons-fin'),
    ouvrir: element('fa-ouvrir'),
    autre: element('fa-autre'),
    erreur: element('fa-erreur'),
  };

  let agent = null;
  let ouverte = false;
  let tacheAffichee = null;
  let discussion = null;
  let envoiEnCours = false;
  let envoiTache = false;
  let derniereTacheVue = 0;

  const actifs = new Map();
  const suivis = new Map();
  const memoire = new Map();
  const dernieres = new Map();
  let verification = false;

  function historiqueDe(nom) {
    if (!memoire.has(nom)) memoire.set(nom, []);
    return memoire.get(nom);
  }

  function estEnTache(nom) {
    return actifs.has(nom);
  }

  function montrerPanneau(nom) {
    el.choix.hidden = nom !== 'choix';
    el.panneauDiscussion.hidden = nom !== 'discussion';
    el.panneauTache.hidden = nom !== 'tache';
  }

  function bulle(genre, texte) {
    const div = document.createElement('div');
    div.className = `bulle ${genre}`;
    div.textContent = texte;
    el.fil.append(div);
    el.fil.scrollTop = el.fil.scrollHeight;
    return div;
  }

  function bulleAttente() {
    const div = document.createElement('div');
    div.className = 'bulle agent attente';
    for (let i = 0; i < 3; i++) div.append(document.createElement('i'));
    el.fil.append(div);
    el.fil.scrollTop = el.fil.scrollHeight;
    return div;
  }

  function dessinerDiscussion() {
    el.fil.textContent = '';
    const historique = historiqueDe(agent.nom);
    if (!historique.length) {
      bulle('agent', `Bonjour. ${agent.prenom} t'écoute.`);
    }
    for (const tour of historique) {
      bulle(tour.role === 'agent' ? 'agent' : 'dg', tour.role === 'agent' ? texteLisible(tour.contenu) : tour.contenu);
    }
  }

  function ouvrirDiscussion() {
    if (!agent) return;
    montrerPanneau('discussion');
    dessinerDiscussion();
    el.message.focus();
  }

  async function envoyerMessage(evenement) {
    evenement.preventDefault();
    if (!agent || envoiEnCours) return;
    const message = el.message.value.trim();
    if (!message) return;

    const historique = historiqueDe(agent.nom);
    envoiEnCours = true;
    el.envoyer.disabled = true;
    el.message.value = '';
    bulle('dg', message);
    const attente = bulleAttente();

    try {
      const donnees = await appel('/api/discuter', {
        nom: agent.nom,
        message,
        historique: historique.slice(-12),
      });
      historique.push({ role: 'dg', contenu: message });
      historique.push({ role: 'agent', contenu: donnees.reponse });
      if (historique.length > 24) historique.splice(0, historique.length - 24);
      attente.remove();
      bulle('agent', texteLisible(donnees.reponse));
    } catch (err) {
      attente.remove();
      bulle('erreur', err.message);
    } finally {
      envoiEnCours = false;
      el.envoyer.disabled = false;
      el.message.focus();
    }
  }

  function afficherErreurTache(message) {
    el.erreurTache.textContent = message;
    el.erreurTache.hidden = !message;
  }

  function afficherFormulaire() {
    tacheAffichee = null;
    el.formTache.hidden = false;
    el.suivi.hidden = true;
    el.erreur.textContent = '';
    el.erreur.hidden = true;
    if (agent) {
      const limite = ia.id === 'claude' ? ' - plafond 2 $' : '';
      el.aideTache.textContent = `${ia.nom} - dossier live/travaux/${slugifier(prenomDe(agent.nom))}${limite} - 4 tâches simultanées`;
    }
    el.consigne.focus();
  }

  function rangerJournal(tache) {
    const journal = el.journal;
    const procheFin = journal.scrollHeight - journal.scrollTop - journal.clientHeight < 36;
    journal.textContent = '';

    const evenements = tache.evenements || [];
    if (!evenements.length) {
      const li = document.createElement('li');
      li.className = 'vide';
      li.textContent = tache.etat === 'en_cours' ? 'En attente du premier outil...' : 'Aucun outil utilisé.';
      journal.append(li);
    } else {
      const visibles = evenements.slice(-80);
      if (evenements.length > visibles.length) {
        const li = document.createElement('li');
        li.className = 'vide';
        li.textContent = `${evenements.length - visibles.length} étapes plus tôt`;
        journal.append(li);
      }
      for (const evenement of visibles) {
        const li = document.createElement('li');
        const outil = document.createElement('span');
        outil.className = 'outil';
        outil.textContent = evenement.outil;
        li.append(outil);
        if (evenement.fichier) {
          const fichier = document.createElement('span');
          fichier.className = 'fichier';
          fichier.textContent = evenement.fichier;
          li.append(fichier);
        }
        journal.append(li);
      }
    }

    if (procheFin || tache.evenements?.length !== derniereTacheVue) {
      journal.scrollTop = journal.scrollHeight;
    }
    derniereTacheVue = tache.evenements?.length || 0;
  }

  function rangerFichiers(tache) {
    const crees = tache.fichiers?.crees || [];
    const modifies = tache.fichiers?.modifies || [];
    el.fichiers.textContent = '';

    if (!crees.length && !modifies.length) {
      const li = document.createElement('li');
      const chemin = document.createElement('span');
      chemin.className = 'chemin';
      chemin.textContent = tache.etat === 'en_cours' ? 'Les fichiers apparaîtront à la fin.' : 'Aucun fichier créé.';
      li.append(chemin);
      el.fichiers.append(li);
    } else {
      for (const [liste, genre] of [
        [crees, 'créé'],
        [modifies, 'modifié'],
      ]) {
        for (const cheminFichier of liste) {
          const li = document.createElement('li');
          li.className = 'fichier-ligne';
          const badge = document.createElement('span');
          badge.className = genre === 'modifié' ? 'genre modifie' : 'genre';
          badge.textContent = genre;
          const chemin = document.createElement('span');
          chemin.className = 'chemin';
          chemin.textContent = cheminFichier;
          li.append(badge, chemin);
          li.addEventListener('click', () => lireFichier(cheminFichier));
          el.fichiers.append(li);
        }
      }
    }
    el.fichiersBloc.hidden = tache.etat === 'en_cours' && !crees.length && !modifies.length;
  }

  async function lireFichier(chemin) {
    if (!tacheAffichee) return;
    el.fichierBloc.hidden = false;
    el.fichierTitre.textContent = chemin;
    el.fichierContenu.textContent = 'Chargement...';
    try {
      const donnees = await appel(`/api/tache/${tacheAffichee}/fichier?chemin=${encodeURIComponent(chemin)}`);
      el.fichierContenu.textContent = donnees.contenu || '';
    } catch (err) {
      el.fichierContenu.textContent = err.message || 'Lecture impossible.';
    }
  }

  function afficherTache(tache) {
    tacheAffichee = tache.id;
    el.formTache.hidden = true;
    el.suivi.hidden = false;
    afficherErreurTache('');
    el.fichierBloc.hidden = true;

    const etats = {
      en_cours: `${tache.prenom} travaille...`,
      fini: `${tache.prenom} a terminé`,
      erreur: `${tache.prenom} s'est arrêté`,
    };
    el.etatTexte.textContent = etats[tache.etat] || 'Tâche';
    el.point.className = tache.etat === 'en_cours' ? 'actif' : tache.etat === 'erreur' ? 'erreur' : 'fini';
    el.cout.textContent = formaterCout(tache.cout);

    rangerJournal(tache);

    const texte = Array.isArray(tache.texte) ? tache.texte : [];
    if (texte.length) {
      el.texteBloc.hidden = false;
      el.texte.textContent = '';
      for (const morceau of texte) {
        const p = document.createElement('p');
        p.textContent = texteLisible(morceau);
        el.texte.append(p);
      }
      el.texte.scrollTop = el.texte.scrollHeight;
    } else {
      el.texteBloc.hidden = true;
    }

    el.rapport.textContent = texteLisible(tache.rapport || '');
    el.rapportBloc.hidden = !tache.rapport;

    rangerFichiers(tache);

    el.erreur.textContent = tache.erreur || '';
    el.erreur.hidden = !tache.erreur;

    const termine = tache.etat !== 'en_cours';
    el.boutonsFin.hidden = !termine;
    el.ouvrir.hidden = !termine;
  }

  async function suivre(id) {
    const info = suivis.get(id);
    if (!info) return;

    let tache;
    try {
      tache = await appel(`/api/tache/${id}`);
    } catch {
      setTimeout(() => suivre(id), 2500);
      return;
    }

    if (tache.etat === 'en_cours') {
      dernieres.set(tache.nom, tache);
      if (ouverte && agent && agent.nom === tache.nom && tacheAffichee === tache.id) {
        afficherTache(tache);
      }
      setTimeout(() => suivre(id), 1500);
      return;
    }

    suivis.delete(id);
    actifs.delete(tache.nom);
    dernieres.set(tache.nom, tache);
    if (ouverte && agent && agent.nom === tache.nom && tacheAffichee === tache.id) {
      afficherTache(tache);
    }
    if (!info.notifie) {
      info.notifie = true;
      if (onFin) onFin(tache);
    }
  }

  async function scruter() {
    if (verification) return;
    verification = true;
    try {
      const donnees = await appel('/api/taches');
      for (const tache of donnees.taches || []) {
        if (tache.etat !== 'en_cours') continue;
        actifs.set(tache.nom, tache.id);
        if (!suivis.has(tache.id)) {
          suivis.set(tache.id, { nom: tache.nom, prenom: tache.prenom, notifie: false });
          suivre(tache.id);
        }
      }
    } catch {
      // serveur momentanément indisponible
    } finally {
      verification = false;
      setTimeout(scruter, 2200);
    }
  }

  function ouvrirSuiviTache() {
    if (!agent) return;
    montrerPanneau('tache');
    afficherErreurTache('');
    const id = actifs.get(agent.nom);
    if (id) {
      const connue = dernieres.get(agent.nom);
      if (connue && connue.id === id && connue.etat === 'en_cours') {
        afficherTache(connue);
        return;
      }
      el.formTache.hidden = true;
      el.suivi.hidden = false;
      el.etatTexte.textContent = `${agent.prenom} travaille...`;
      el.point.className = 'actif';
      el.journal.textContent = '';
      const li = document.createElement('li');
      li.className = 'vide';
      li.textContent = 'Chargement du suivi...';
      el.journal.append(li);
      appel(`/api/tache/${id}`)
        .then((tache) => {
          dernieres.set(tache.nom, tache);
          if (ouverte && agent && agent.nom === tache.nom) afficherTache(tache);
        })
        .catch(() => afficherFormulaire());
      return;
    }

    const derniere = dernieres.get(agent.nom);
    if (derniere) {
      afficherTache(derniere);
      return;
    }
    afficherFormulaire();
  }

  async function lancerTache() {
    if (!agent || envoiTache) return;
    const consigne = el.consigne.value.trim();
    if (!consigne) {
      afficherErreurTache('Écris d\'abord la tâche à confier.');
      el.consigne.focus();
      return;
    }

    envoiTache = true;
    el.lancer.disabled = true;
    afficherErreurTache('');
    try {
      const tache = await appel('/api/tache', { nom: agent.nom, consigne });
      if (tache.delegue) {
        el.formTache.hidden = true;
        el.suivi.hidden = false;
        el.etatTexte.textContent = 'LePrince a délégué';
        el.point.className = 'fini';
        el.cout.textContent = '';
        el.journal.textContent = '';
        const li = document.createElement('li');
        li.className = 'vide';
        li.textContent = `${(tache.lancees || []).length} tâche(s) confiée(s) aux agents spécialisés — suis-les dans l'onglet Tâches.`;
        el.journal.append(li);
        if (onDelegation) onDelegation(tache);
        return;
      }
      actifs.set(tache.nom, tache.id);
      dernieres.set(tache.nom, tache);
      suivis.set(tache.id, { nom: tache.nom, prenom: tache.prenom, notifie: false });
      afficherTache(tache);
      suivre(tache.id);
    } catch (err) {
      afficherErreurTache(err.message);
    } finally {
      envoiTache = false;
      el.lancer.disabled = false;
    }
  }

  async function ouvrirDossier() {
    if (!tacheAffichee) return;
    el.ouvrir.disabled = true;
    try {
      await appel(`/api/tache/${tacheAffichee}/ouvrir`, {});
    } catch (err) {
      afficherErreurTache(err.message);
    } finally {
      el.ouvrir.disabled = false;
    }
  }

  function ouvrir(nouvelAgent, panneauInitial = 'choix') {
    if (ouverte) return;
    agent = nouvelAgent;
    ouverte = true;
    tacheAffichee = null;

    el.lieu.textContent = `${nouvelAgent.pole} - ${nouvelAgent.lieu}`;
    el.titre.textContent = nouvelAgent.nom;
    el.poste.textContent = nouvelAgent.poste;
    el.prenom.textContent = prenomDe(nouvelAgent.nom);
    el.trait.style.background = nouvelAgent.accent || '#b08145';
    el.boite.style.setProperty('--accent', nouvelAgent.accent || '#b08145');
    el.consigne.value = '';
    afficherErreurTache('');
    montrerPanneau('choix');

    el.fenetre.hidden = false;
    document.body.classList.add('fenetre');
    el.fermer.focus();
    if (onOuverture) onOuverture(nouvelAgent);
    if (panneauInitial === 'tache') ouvrirSuiviTache();
  }

  function fermer() {
    if (!ouverte) return;
    ouverte = false;
    el.fenetre.hidden = true;
    document.body.classList.remove('fenetre');
    const ancien = agent;
    agent = null;
    tacheAffichee = null;
    if (onFermeture) onFermeture(ancien);
  }

  el.discuter.addEventListener('click', ouvrirDiscussion);
  el.tache.addEventListener('click', ouvrirSuiviTache);
  el.retourDiscussion.addEventListener('click', () => montrerPanneau('choix'));
  el.retourTache.addEventListener('click', () => {
    tacheAffichee = null;
    montrerPanneau('choix');
  });
  el.fermer.addEventListener('click', fermer);
  el.fond.addEventListener('click', fermer);
  el.formDiscussion.addEventListener('submit', envoyerMessage);
  el.message.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter' && !evenement.shiftKey) {
      evenement.preventDefault();
      el.formDiscussion.requestSubmit();
    }
  });
  el.lancer.addEventListener('click', lancerTache);
  el.ouvrir.addEventListener('click', ouvrirDossier);
  el.autre.addEventListener('click', afficherFormulaire);
  el.consigne.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter' && (evenement.metaKey || evenement.ctrlKey)) {
      evenement.preventDefault();
      lancerTache();
    }
  });

  window.addEventListener('keydown', (evenement) => {
    if (ouverte && evenement.code === 'Escape') {
      evenement.stopPropagation();
      fermer();
    }
  }, true);

  scruter();

  return {
    ouvrir,
    fermer,
    estOuverte: () => ouverte,
    estEnTache,
    reprendre: scruter,
    definirIA: (nouvelleIA) => {
      if (nouvelleIA && nouvelleIA.nom) ia = nouvelleIA;
    },
  };
}
