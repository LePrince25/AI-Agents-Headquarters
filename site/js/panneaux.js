import { appel } from './api.js';
import { formaterCout, formaterDuree, prenomDe, texteLisible } from './utils.js';

const MAX_REUNION = 8;

const TITRES = {
  poles: { sur: 'Le quartier', titre: 'Pôles et lieux' },
  equipe: { sur: 'En direct', titre: "Ce que fait l'équipe" },
  reunion: { sur: 'Salle de réunion', titre: 'Convoquer une réunion' },
  mission: { sur: 'Lancement', titre: "Découper une idée en tâches" },
  chantiers: { sur: 'Agence', titre: 'Les chantiers' },
  ia: { sur: "Choix de l'IA", titre: 'Mes IA et connecteurs' },
  projets: { sur: 'En développement', titre: 'Projets en cours' },
  taches: { sur: 'Bureau du CEO', titre: 'Les travaux des agents' },
};

const PHASES = {
  arrivee: 'Les agents rejoignent la salle de réunion.',
  assise: 'La réunion est en cours.',
  retour: 'Les agents retournent à leurs bureaux.',
};

function balise(nom, classe, texte) {
  const el = document.createElement(nom);
  if (classe) el.className = classe;
  if (texte !== undefined) el.textContent = texte;
  return el;
}

function bouton(texte, classe) {
  const b = balise('button', classe || 'petit-bouton', texte);
  b.type = 'button';
  return b;
}

export function creerPanneaux({ lieux, agents, vie, rencontre, voirLieu, entrerLieu, voirTache, voirAgent } = {}) {
  const onglets = document.getElementById('onglets');
  const panneau = document.getElementById('panneau');
  const sur = document.getElementById('panneau-sur');
  const titre = document.getElementById('panneau-titre');
  const corps = document.getElementById('panneau-corps');
  const fermerBouton = document.getElementById('panneau-fermer');
  const zoneToasts = document.getElementById('toasts');
  const badges = document.querySelectorAll('.onglet[data-panneau]');

  let ouvert = null;
  let minuteur = null;
  let lieuChoisi = 0;
  let selection = new Set();
  let lignesEquipe = new Map();
  let reunionActive = false;
  let sujetReunion = '';
  let tachesEnCours = 0;
  let chantierVue = null;
  let equipeComplete = null;
  let apercuFichier = null;

  function badgeTaches(nombre) {
    tachesEnCours = nombre;
    const pastille = document.querySelector('#onglet-taches .pastille');
    if (!pastille) return;
    pastille.hidden = nombre <= 0;
    pastille.textContent = nombre > 9 ? '9+' : String(nombre);
  }

  function notifier({ titre: titreToast, texte = '', accent = '#b08145', action = null }) {
    if (!zoneToasts) return;
    const div = balise('div', 'toast');
    div.style.setProperty('--accent', accent);
    const tete = balise('div', 'toast-tete');
    tete.append(balise('b', 'toast-titre', titreToast));
    const croix = bouton('×', 'toast-fermer');
    croix.setAttribute('aria-label', 'Fermer la notification');
    tete.append(croix);
    div.append(tete);
    if (texte) div.append(balise('p', 'toast-texte', texte));
    let minuterie = null;
    const retirer = () => {
      clearTimeout(minuterie);
      div.classList.add('sort');
      setTimeout(() => div.remove(), 260);
    };
    if (action) {
      const barre = balise('div', 'toast-actions');
      const voir = bouton(action.label || 'Voir', 'toast-action');
      voir.addEventListener('click', () => {
        retirer();
        action.faire();
      });
      barre.append(voir);
      div.append(barre);
    }
    croix.addEventListener('click', retirer);
    zoneToasts.append(div);
    while (zoneToasts.children.length > 3) zoneToasts.firstElementChild.remove();
    minuterie = setTimeout(retirer, 9000);
  }

  function changerOnglet(nom) {
    for (const b of badges) b.classList.toggle('actif', b.dataset.panneau === nom);
  }

  function vider() {
    corps.textContent = '';
    lignesEquipe = new Map();
  }

  function ajouterNote(texte) {
    corps.append(balise('p', 'panneau-note', texte));
  }

  // --- Pôles ---

  function dessinerPoles() {
    vider();
    const nav = balise('div', 'poles-nav');
    const avant = bouton('‹', 'fleche');
    avant.setAttribute('aria-label', 'Lieu précédent');
    const compteur = balise('span', 'poles-compteur');
    const apres = bouton('›', 'fleche');
    apres.setAttribute('aria-label', 'Lieu suivant');
    nav.append(avant, compteur, apres);

    const carte = balise('article', 'poles-carte');
    const index = balise('div', 'poles-index');
    corps.append(nav, carte, index);

    let cartes = [];
    const choisir = (i, voler) => {
      lieuChoisi = (i + lieux.length) % lieux.length;
      const l = lieux[lieuChoisi];
      compteur.textContent = `${lieuChoisi + 1} / ${lieux.length}`;

      carte.textContent = '';
      carte.style.setProperty('--accent', l.accent);
      const texte = balise('div', 'poles-texte');
      texte.append(balise('span', 'poles-pole', l.pole));
      texte.append(balise('h3', 'poles-lieu', l.lieu));
      texte.append(balise('p', 'poles-mission', l.mission));
      texte.append(
        balise(
          'span',
          'poles-nb',
          l.nbAgents
            ? `${l.nbAgents} agent${l.nbAgents > 1 ? 's' : ''}`
            : 'Lieu commun, sans poste fixe'
        )
      );
      const actions = balise('div', 'poles-actions');
      const voir = bouton('Voir', 'petit-bouton');
      const entrer = bouton('Entrer', 'petit-bouton petit-fort');
      voir.addEventListener('click', () => voirLieu && voirLieu(l.id));
      entrer.addEventListener('click', () => {
        fermer();
        if (entrerLieu) entrerLieu(l.id);
      });
      actions.append(voir, entrer);
      carte.append(texte, actions);

      for (const c of cartes) c.classList.toggle('actif', Number(c.dataset.index) === lieuChoisi);
      if (voler && voirLieu) voirLieu(l.id);
    };

    lieux.forEach((l, i) => {
      const c = bouton(l.pole, 'poles-chip');
      c.dataset.index = String(i);
      c.style.setProperty('--accent', l.accent);
      c.addEventListener('click', () => choisir(i, true));
      cartes.push(c);
      index.append(c);
    });

    avant.addEventListener('click', () => {
      choisir(lieuChoisi - 1, true);
    });
    apres.addEventListener('click', () => {
      choisir(lieuChoisi + 1, true);
    });
    choisir(Math.min(lieuChoisi, lieux.length - 1), false);
  }

  // --- Équipe ---

  function dessinerEquipe() {
    vider();
    const resume = balise('div', 'equipe-resume');
    const liste = balise('div', 'equipe-liste');
    const fiche = balise('div', 'equipe-fiche');
    corps.append(resume, liste, fiche);

    for (const a of agents) {
      const ligne = document.createElement('button');
      ligne.type = 'button';
      ligne.className = 'equipe-ligne';
      const point = balise('i', 'equipe-point');
      const identite = balise('span', 'equipe-identite');
      identite.append(balise('b', '', a.prenom));
      identite.append(balise('span', 'equipe-nom', a.nom));
      const poste = balise('span', 'equipe-poste', a.poste);
      const lieu = balise('span', 'equipe-lieu', a.lieu);
      const activite = balise('span', 'equipe-activite');
      ligne.append(point, identite, poste, lieu, activite);
      ligne.addEventListener('click', () => {
        if (voirAgent) voirAgent(a.nom);
        else if (voirLieu) voirLieu(a.poleId);
        montrerFiche(a.nom);
      });
      liste.append(ligne);
      lignesEquipe.set(a.nom, { ligne, point, activite });
    }

    majEquipe();
  }

  async function chargerEquipe() {
    try {
      const donnees = await appel('/api/equipe');
      equipeComplete = new Map((donnees.agents || []).map((a) => [a.nom, a]));
    } catch {
      equipeComplete = null;
    }
  }

  async function montrerFiche(nom) {
    if (!equipeComplete) await chargerEquipe();
    const zone = corps.querySelector('.equipe-fiche');
    if (!zone) return;
    zone.textContent = '';
    const a = equipeComplete && equipeComplete.get(nom);
    if (!a) {
      zone.append(balise('p', 'panneau-note', 'Fiche indisponible (serveur du QG requis).'));
      return;
    }
    zone.append(balise('b', 'equipe-fiche-nom', a.nom));
    zone.append(balise('span', 'equipe-fiche-poste', `${a.poste} · ${a.pole}${a.lieu ? ' · ' + a.lieu : ''}`));
    if (a.missions && a.missions.length) {
      zone.append(balise('h4', '', 'Missions'));
      for (const m of a.missions) zone.append(balise('p', 'equipe-fiche-mission', m));
    }
    if (a.outils) {
      zone.append(balise('h4', '', 'Outils'));
      zone.append(balise('p', 'equipe-fiche-outils', a.outils));
    }
  }

  function majEquipe() {
    if (!lignesEquipe.size) return;
    const compte = { travail: 0, pause: 0, attente: 0, deplacement: 0, tache: 0 };
    for (const a of agents) {
      const refs = lignesEquipe.get(a.nom);
      if (!refs) continue;
      const act = vie ? vie.activiteDe(a.nom) : { type: 'travail', libelle: 'Au travail', couleur: '#4f8f5d' };
      refs.point.style.background = act.couleur;
      refs.activite.textContent = act.libelle;
      refs.activite.style.color = act.couleur;
      if (act.type === 'reunion' || act.type === 'cafe' || act.type === 'promenade') compte.deplacement += 1;
      else if (act.type === 'discussion') compte.deplacement += 1;
      else if (act.type === 'tache') compte.tache += 1;
      else if (compte[act.type] !== undefined) compte[act.type] += 1;
      else compte.travail += 1;
    }
    const resume = corps.querySelector('.equipe-resume');
    if (!resume) return;
    resume.textContent = '';
    const parts = [
      `${compte.travail} au travail`,
      `${compte.deplacement} en mouvement`,
      `${compte.pause} en pause`,
    ];
    if (compte.tache) parts.push(`${compte.tache} en tâche`);
    for (const p of parts) resume.append(balise('span', '', p));
  }

  // --- Réunion ---

  function remplirCompteRendu(conteneur, cr, visibles) {
    const lignes = Array.isArray(cr.lignes) ? cr.lignes : [];
    for (const l of lignes.slice(0, visibles)) {
      const tour = balise('div', 'reunion-tour');
      tour.append(balise('b', '', l.prenom));
      tour.append(balise('span', '', l.texte));
      conteneur.append(tour);
    }
    if (Array.isArray(cr.decisions) && cr.decisions.length && visibles >= lignes.length) {
      const bloc = balise('div', 'reunion-decisions');
      bloc.append(balise('h3', '', 'Décisions'));
      for (const d of cr.decisions) bloc.append(balise('p', '', d));
      conteneur.append(bloc);
    }
  }

  function majEcoutee() {
    const ecoute = corps.querySelector('.reunion-ecoute');
    if (!ecoute) return;
    const info = vie ? vie.reunionInfo() : { active: false };
    const cr = vie && vie.compteRendu ? vie.compteRendu() : null;
    ecoute.textContent = '';
    if (!info.active || info.phase === 'arrivee') return;
    if (!cr) {
      if (info.phase === 'assise') {
        ecoute.append(balise('p', 'reunion-attente', 'L\'IA prépare le débat autour de la table...'));
      }
      return;
    }
    if (cr.erreur) {
      ecoute.append(balise('p', 'reunion-erreur', cr.erreur));
      return;
    }
    const lignes = Array.isArray(cr.lignes) ? cr.lignes : [];
    let visibles = lignes.length;
    if (info.phase === 'assise' && lignes.length) {
      const ecoule = Math.max(0, performance.now() - (info.depuis || 0));
      const duree = Math.max(1, info.duree || 24000) - 2500;
      const ratio = Math.min(1, Math.max(0, ecoule - 1500) / duree);
      visibles = Math.max(1, Math.ceil(ratio * lignes.length));
    }
    remplirCompteRendu(ecoute, cr, visibles);
  }

  function dessinerReunion() {
    vider();
    const info = vie ? vie.reunionInfo() : { active: false };
    reunionActive = !!info.active;

    if (!reunionActive) {
      corps.append(
        balise(
          'p',
          'panneau-intro',
          'Donne un sujet, coche les agents, puis siffle la réunion. Ils marcheront jusqu\'à la table de LePrince WorkLand.'
        )
      );
      const champSujet = balise('label', 'reunion-sujet');
      champSujet.append(balise('span', 'reunion-etiquette', 'Sujet de la réunion'));
      const saisieSujet = document.createElement('input');
      saisieSujet.type = 'text';
      saisieSujet.className = 'reunion-saisie';
      saisieSujet.placeholder = 'Un sujet précis, ou un nouveau projet à lancer';
      saisieSujet.maxLength = 200;
      saisieSujet.value = sujetReunion;
      saisieSujet.addEventListener('input', () => {
        sujetReunion = saisieSujet.value;
        majCompte();
      });
      saisieSujet.addEventListener('keydown', (evenement) => {
        if (evenement.key === 'Enter' && !sifflet.disabled) sifflet.click();
      });
      champSujet.append(saisieSujet);
      corps.append(champSujet);
      const liste = balise('div', 'reunion-liste');
      corps.append(liste);
      const note = balise('p', 'panneau-note');
      const pied = balise('div', 'reunion-pied');
      const sifflet = balise('button', 'sifflet');
      sifflet.type = 'button';
      sifflet.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5h7.4l3.4-3.4h5.4a2.7 2.7 0 0 1 0 5.4h-2.5l-1.4 1.4A6.2 6.2 0 1 1 3 13.2z" fill="currentColor"/><circle cx="8.6" cy="13.6" r="1.9" fill="#fffaf0"/></svg><span>Siffler la réunion</span>';
      const compteSelection = balise('span', 'reunion-compte');
      pied.append(sifflet, compteSelection);
      corps.append(note, pied);

      for (const a of agents) {
        const dispo = vie ? vie.estDisponible(a.nom) : true;
        const item = balise('label', 'reunion-agent');
        const caseC = document.createElement('input');
        caseC.type = 'checkbox';
        caseC.value = a.nom;
        caseC.checked = selection.has(a.nom);
        caseC.disabled = !dispo;
        if (!dispo) item.classList.add('indispo');
        const texte = balise('span', 'reunion-texte');
        texte.append(balise('b', '', a.prenom));
        texte.append(balise('span', '', a.poste));
        if (!dispo) {
          const raison = rencontre && rencontre.estEnTache(a.nom) ? 'tâche en cours' : 'déjà en mouvement';
          texte.append(balise('em', 'reunion-raison', raison));
        }
        item.append(caseC, texte);

        caseC.addEventListener('change', () => {
          if (caseC.checked) {
            if (selection.size >= MAX_REUNION) {
              caseC.checked = false;
              note.textContent = `La salle accueille ${MAX_REUNION} agents au maximum.`;
              note.classList.add('alerte');
              return;
            }
            selection.add(a.nom);
          } else {
            selection.delete(a.nom);
          }
          note.textContent = '';
          note.classList.remove('alerte');
          majCompte();
        });
        liste.append(item);
      }

      const majCompte = () => {
        const n = selection.size;
        compteSelection.textContent = n ? `${n} agent${n > 1 ? 's' : ''} coché${n > 1 ? 's' : ''}` : 'Aucun agent coché';
        sifflet.disabled = n === 0 || !sujetReunion.trim();
      };

      selection = new Set([...selection].filter((nom) => agents.some((a) => a.nom === nom)));
      majCompte();

      sifflet.addEventListener('click', () => {
        if (!vie) return;
        const sujet = sujetReunion.trim();
        if (!sujet) {
          note.textContent = 'Donne un sujet à la réunion, ou un nouveau projet à lancer.';
          note.classList.add('alerte');
          return;
        }
        const res = vie.lancerReunion({ noms: [...selection], sujet });
        if (!res.ok) {
          note.textContent = res.message;
          note.classList.add('alerte');
          return;
        }
        const n = selection.size;
        selection.clear();
        notifier({
          titre: 'Réunion lancée',
          texte: `${n} agent${n > 1 ? 's' : ''} ${n > 1 ? 'rejoignent' : 'rejoint'} la table du QG. Sujet : ${sujet}`,
          accent: '#8a6a3c',
        });
        fermer();
      });

      const dernier = vie && vie.compteRendu ? vie.compteRendu() : null;
      if (dernier && !dernier.erreur) {
        const passe = balise('div', 'reunion-ecoute');
        passe.append(balise('p', 'reunion-sujet-actif', `Dernière réunion : ${dernier.sujet || ''}`));
        remplirCompteRendu(passe, dernier, (dernier.lignes || []).length);
        corps.append(passe);
      }
      return;
    }

    const etat = balise('div', 'reunion-etat');
    etat.append(balise('span', 'reunion-phase', PHASES[info.phase] || 'Réunion en cours.'));
    const compte = balise('span', 'reunion-assis', `${info.assis} / ${info.participants.length} installés`);
    etat.append(compte);
    corps.append(etat);

    if (info.sujet) corps.append(balise('p', 'reunion-sujet-actif', `Sujet : ${info.sujet}`));

    const liste = balise('ul', 'reunion-presents');
    for (const p of info.participants) {
      const li = balise('li');
      li.dataset.nom = p.nom;
      li.append(balise('i'));
      li.append(balise('b', '', p.prenom));
      li.append(balise('span', '', p.etat === 'assise' ? 'À table' : 'En route'));
      liste.append(li);
    }
    corps.append(liste);

    const ecoute = balise('div', 'reunion-ecoute');
    corps.append(ecoute);
    majEcoutee();

    const fin = bouton('Terminer la réunion', 'petit-bouton petit-fort');
    fin.addEventListener('click', () => {
      if (vie) vie.finReunion();
      notifier({ titre: 'Fin de réunion', texte: 'Les agents retournent à leurs bureaux.', accent: '#8a6a3c' });
      fermer();
    });
    corps.append(fin);
    ajouterNote('La réunion se tient à la grande table de LePrince WorkLand. Tu peux la suivre depuis la vue d\'en haut.');
  }

  function majReunion() {
    if (ouvert !== 'reunion') return;
    const info = vie ? vie.reunionInfo() : { active: false };
    if (!!info.active !== reunionActive) {
      dessinerReunion();
      return;
    }
    if (!info.active) return;
    const phase = corps.querySelector('.reunion-phase');
    if (phase) phase.textContent = PHASES[info.phase] || 'Réunion en cours.';
    const compte = corps.querySelector('.reunion-assis');
    if (compte) compte.textContent = `${info.assis} / ${info.participants.length} installés`;
    const lignes = [...corps.querySelectorAll('.reunion-presents li')];
    for (const p of info.participants) {
      const ligne = lignes.find((li) => li.dataset.nom === p.nom)?.querySelector('span');
      if (ligne) ligne.textContent = p.etat === 'assise' ? 'À table' : 'En route';
    }
    majEcoutee();
  }

  // --- IA et connecteurs ---

  function ilYA(ecart) {
    const minutes = Math.max(0, Math.floor(ecart / 60000));
    if (minutes < 60) return `il y a ${minutes} min`;
    const heures = Math.floor(minutes / 60);
    if (heures < 24) return `il y a ${heures} h`;
    return `il y a ${Math.floor(heures / 24)} j`;
  }

  async function chargerIA() {
    vider();
    const attente = balise('p', 'panneau-note', 'Lecture des IA installées...');
    corps.append(attente);
    let donnees;
    try {
      donnees = await appel('/api/ia');
    } catch {
      attente.textContent =
        'Informations indisponibles. Recharge la page si le serveur du QG vient d\'être relancé.';
      return;
    }
    if (ouvert !== 'ia') return;
    vider();

    corps.append(balise('p', 'panneau-section', 'L\'IA des discussions et des tâches'));
    const candidates = Array.isArray(donnees.candidates) ? donnees.candidates : [];
    const iaCourante = String(donnees.ia || 'claude');
    if (!candidates.length) {
      corps.append(balise('p', 'panneau-vide', 'Aucune IA détectée sur cet ordinateur.'));
    } else {
      const liste = balise('div', 'ia-liste');
      for (const c of candidates) {
        liste.append(ligneIA(c, iaCourante));
      }
      corps.append(liste);
    }

    corps.append(balise('p', 'panneau-section', 'Ajouter une IA ou un connecteur'));
    corps.append(formIA());

    corps.append(balise('p', 'panneau-section', 'Connecteurs de l\'équipe'));
    let outils = [];
    try {
      const donneesOutils = await appel('/api/outils');
      outils = Array.isArray(donneesOutils.outils) ? donneesOutils.outils : [];
    } catch {
      // section silencieuse si indisponible
    }
    if (ouvert !== 'ia') return;
    if (!outils.length) {
      corps.append(balise('p', 'panneau-vide', 'Aucun connecteur détecté sur cet ordinateur.'));
    } else {
      const liste = balise('div', 'outils-liste');
      for (const o of outils) {
        const ligne = balise('div', 'outil-ligne');
        const point = balise('i', 'outil-point');
        point.classList.add(o.etat === 'ok' ? 'ok' : 'ko');
        const nom = balise('b', 'outil-nom', String(o.nom || 'Connecteur'));
        const etat = balise('span', 'outil-etat', o.etat === 'ok' ? 'Connecté' : 'Ne répond pas');
        etat.classList.add(o.etat === 'ok' ? 'ok' : 'ko');
        ligne.append(point, nom, etat);
        liste.append(ligne);
      }
      corps.append(liste);
    }
    const pied = balise('div', 'outils-pied');
    const rafraichir = bouton('Actualiser', 'petit-bouton');
    rafraichir.addEventListener('click', () => chargerIA());
    pied.append(rafraichir);
    corps.append(pied);
    ajouterNote(
      'Vérifié sur cet ordinateur. Aucune adresse et aucun message d\'erreur ne sont affichés. Les clés restent dans le dossier live du QG, jamais dans le code.'
    );
  }

  function ligneIA(c, iaCourante) {
    const ligne = balise('div', 'ia-ligne');
    if (c.id === iaCourante) ligne.classList.add('choisie');
    const point = balise('i', 'ia-point');
    point.classList.add(c.installe ? 'ok' : 'ko');
    const nom = balise('b', 'ia-nom', String(c.nom || c.id));
    ligne.append(point, nom);

    const etat = balise('span', 'ia-etat');
    if (c.id === iaCourante) {
      etat.textContent = 'Choisie';
      etat.classList.add('ok');
    } else if (c.application) {
      etat.textContent = 'Application';
    } else if (c.installe) {
      etat.textContent = 'Disponible';
    } else {
      etat.textContent = 'Non installée';
      etat.classList.add('ko');
    }
    ligne.append(etat);

    if (c.cle) {
      ligne.append(balise('span', 'ia-cle', `clé ${c.cle}`));
    }

    if (c.installe && !c.application && c.id !== iaCourante) {
      const choisir = bouton('Choisir');
      choisir.addEventListener('click', async () => {
        try {
          await appel('/api/ia', { ia: c.id });
          const note = document.getElementById('fa-note-discussion');
          if (note) note.textContent = `Discussion non enregistrée - ${c.nom} répond sans aucun outil.`;
          if (rencontre && rencontre.definirIA) rencontre.definirIA({ id: c.id, nom: c.nom });
          notifier({ titre: 'IA changée', texte: `${c.nom} s'occupe maintenant des discussions et des tâches.` });
          chargerIA();
        } catch (err) {
          notifier({ titre: 'Changement refusé', texte: texteLisible(String(err.message || '')), accent: '#a65a4f' });
        }
      });
      ligne.append(choisir);
    }

    if (c.perso) {
      const retirer = bouton('Retirer', 'petit-bouton ia-retirer');
      retirer.addEventListener('click', async () => {
        try {
          await appel('/api/ia/retirer', { ia: c.id });
          notifier({ titre: 'IA retirée', texte: `${c.nom} ne fait plus partie de la liste.` });
          chargerIA();
        } catch (err) {
          notifier({ titre: 'Retrait impossible', texte: texteLisible(String(err.message || '')), accent: '#a65a4f' });
        }
      });
      ligne.append(retirer);
    }
    return ligne;
  }

  function formIA() {
    const form = balise('form', 'ia-form');
    form.noValidate = true;

    const champNom = balise('label', 'ia-champ');
    champNom.append(balise('span', '', 'Nom affiché'));
    const inputNom = balise('input', 'ia-saisie');
    inputNom.type = 'text';
    inputNom.maxLength = 40;
    inputNom.placeholder = 'Ex. Kimi, OpenRouter...';
    inputNom.autocomplete = 'off';
    champNom.append(inputNom);

    const champCommande = balise('label', 'ia-champ');
    champCommande.append(balise('span', '', 'Commande installée'));
    const inputCommande = balise('input', 'ia-saisie');
    inputCommande.type = 'text';
    inputCommande.maxLength = 120;
    inputCommande.placeholder = 'Ex. kimi, llm...';
    inputCommande.autocomplete = 'off';
    inputCommande.spellcheck = false;
    champCommande.append(inputCommande);

    const champVar = balise('label', 'ia-champ');
    champVar.append(balise('span', '', 'Variable de la clé (facultatif)'));
    const inputVar = balise('input', 'ia-saisie');
    inputVar.type = 'text';
    inputVar.maxLength = 60;
    inputVar.placeholder = 'Ex. OPENAI_API_KEY';
    inputVar.autocomplete = 'off';
    inputVar.spellcheck = false;
    champVar.append(inputVar);

    const champCle = balise('label', 'ia-champ');
    champCle.append(balise('span', '', 'Clé API (facultatif)'));
    const inputCle = balise('input', 'ia-saisie');
    inputCle.type = 'password';
    inputCle.maxLength = 200;
    inputCle.placeholder = 'Reste sur cet ordinateur';
    inputCle.autocomplete = 'off';
    champCle.append(inputCle);

    const erreur = balise('p', 'ia-erreur');
    erreur.hidden = true;

    const valider = bouton('Ajouter', 'petit-bouton');
    valider.type = 'submit';

    form.append(champNom, champCommande, champVar, champCle, erreur, valider);
    form.addEventListener('submit', async (evenement) => {
      evenement.preventDefault();
      erreur.hidden = true;
      const nom = inputNom.value.trim();
      const commande = inputCommande.value.trim();
      if (!nom || !commande) {
        erreur.textContent = 'Le nom et la commande sont obligatoires.';
        erreur.hidden = false;
        return;
      }
      valider.disabled = true;
      try {
        await appel('/api/ia/ajouter', {
          nom,
          commande,
          envVar: inputVar.value.trim(),
          cle: inputCle.value,
        });
        notifier({ titre: 'IA ajoutée', texte: `${nom} apparaît dans la liste, tu peux la choisir.` });
        chargerIA();
      } catch (err) {
        erreur.textContent = texteLisible(String(err.message || ''));
        erreur.hidden = false;
      }
      valider.disabled = false;
    });
    return form;
  }

  // --- Projets ---

  async function chargerProjets() {
    vider();
    const attente = balise('p', 'panneau-note', 'Lecture des dossiers...');
    corps.append(attente);
    let donnees;
    try {
      donnees = await appel('/api/projets');
    } catch {
      attente.textContent = 'Informations indisponibles pour l\'instant.';
      return;
    }
    if (ouvert !== 'projets') return;
    vider();
    const projets = Array.isArray(donnees.projets) ? donnees.projets : [];
    if (!projets.length) {
      corps.append(balise('p', 'panneau-vide', 'Aucun projet détecté dans ton dossier dev.'));
    } else {
      const liste = balise('div', 'projets-liste');
      for (const p of projets) {
        const ligne = balise('div', 'projet-ligne');
        const nom = balise('b', 'projet-nom', String(p.nom || 'Projet'));
        const type = balise('span', 'projet-type', String(p.type || 'Dossier'));
        const maj = balise('span', 'projet-maj', ilYA(Date.now() - Number(p.modifie || 0)));
        const ouvrir = bouton('Ouvrir');
        ouvrir.addEventListener('click', async () => {
          ouvrir.disabled = true;
          try {
            await appel('/api/projet/ouvrir', { nom: p.nom });
          } catch (err) {
            notifier({ titre: 'Ouverture impossible', texte: texteLisible(String(err.message || '')), accent: '#a65a4f' });
          }
          ouvrir.disabled = false;
        });
        ligne.append(nom, type, maj, ouvrir);
        liste.append(ligne);
      }
      corps.append(liste);
    }
    ajouterNote(
      'Projets détectés dans ton dossier dev, du plus récemment modifié au plus ancien. « Ouvrir » l\'affiche dans le Finder.'
    );
  }

  // --- Tâches ---

  function carteTache(t, active) {
    const carte = balise('article', 'tache-carte');
    const tete = balise('div', 'tache-tete');
    const identite = balise('div', 'tache-identite');
    identite.append(balise('b', '', t.prenom || prenomDe(t.nom || '')));
    identite.append(balise('span', '', t.pole || ''));
    const etat = balise('span', 'tache-etat');
    if (active) {
      etat.textContent = 'En cours';
      etat.classList.add('encours');
    } else if (t.etat === 'erreur') {
      etat.textContent = 'Arrêtée';
      etat.classList.add('arret');
    } else {
      etat.textContent = 'Terminée';
      etat.classList.add('finie');
    }
    tete.append(identite, etat);

    const consigne = balise(
      'p',
      'tache-consigne',
      texteLisible(String(active ? t.consigne : t.rapport || t.consigne || '')).replace(/\s+/g, ' ').trim().slice(0, 180)
    );
    carte.append(tete, consigne);

    const meta = balise('div', 'tache-meta');
    if (active) {
      meta.append(balise('span', '', `Depuis ${formaterDuree(Date.now() - t.debut)}`));
      const cout = formaterCout(t.cout);
      if (cout) meta.append(balise('span', '', cout));
    } else {
      const duree = t.debut && t.fin ? formaterDuree(t.fin - t.debut) : '';
      if (duree) meta.append(balise('span', '', `En ${duree}`));
      const nbFichiers = (t.fichiers?.crees?.length || 0) + (t.fichiers?.modifies?.length || 0);
      if (nbFichiers) meta.append(balise('span', '', `${nbFichiers} fichier${nbFichiers > 1 ? 's' : ''}`));
      const cout = formaterCout(t.cout);
      if (cout) meta.append(balise('span', '', cout));
    }
    const voir = bouton('Voir', 'tache-voir');
    voir.addEventListener('click', () => {
      fermer();
      if (voirTache) voirTache(t.nom);
    });
    meta.append(voir);
    carte.append(meta);

    if (!active) {
      const crees = t.fichiers?.crees || [];
      const modifies = t.fichiers?.modifies || [];
      const tous = [...crees.map((f) => [f, 'créé']), ...modifies.map((f) => [f, 'modifié'])];
      if (tous.length) {
        const zone = balise('div', 'tache-fichiers');
        for (const [f, genre] of tous) {
          const b = balise('button', 'tache-fichier', `${genre} · ${f}`);
          b.type = 'button';
          b.addEventListener('click', () => lireFichierTache(t.id, f));
          zone.append(b);
        }
        carte.append(zone);
      }
    }
    return carte;
  }

  async function chargerTaches() {
    let donnees;
    try {
      donnees = await appel('/api/taches');
    } catch {
      if (ouvert === 'taches' && !corps.children.length) {
        corps.append(balise('p', 'panneau-note', 'Le tableau se met à jour dès que le serveur répond.'));
      }
      return;
    }
    const actives = Array.isArray(donnees.taches) ? donnees.taches : [];
    const termine = Array.isArray(donnees.termine) ? donnees.termine : [];
    badgeTaches(actives.length);
    if (ouvert !== 'taches') return;
    vider();

    const blocActif = balise('section', 'taches-bloc');
    blocActif.append(balise('h3', 'taches-titre', `En cours (${actives.length})`));
    if (!actives.length) {
      blocActif.append(
        balise('p', 'panneau-vide', 'Aucune tâche en cours. Parle à un agent dans le QG pour lui en confier une.')
      );
    } else {
      for (const t of actives) blocActif.append(carteTache(t, true));
    }
    corps.append(blocActif);

    const blocFin = balise('section', 'taches-bloc');
    blocFin.append(balise('h3', 'taches-titre', `Terminées récemment (${termine.length})`));
    if (!termine.length) {
      blocFin.append(balise('p', 'panneau-vide', 'Rien de terminé pour l\'instant.'));
    } else {
      for (const t of termine) blocFin.append(carteTache(t, false));
    }
    corps.append(blocFin);
    const apercu = balise('pre', 'tache-apercu');
    apercu.hidden = true;
    corps.append(apercu);
    majApercu();
    ajouterNote('Le tableau se rafraîchit tout seul. Une notification arrive à chaque tâche terminée.');
  }

  async function surveillerTaches() {
    try {
      const donnees = await appel('/api/taches');
      badgeTaches(Array.isArray(donnees.taches) ? donnees.taches.length : 0);
    } catch {
      // la pastille reste sur sa dernière valeur
    }
  }

  function majApercu() {
    const apercu = corps.querySelector('.tache-apercu');
    if (!apercu) return;
    if (!apercuFichier) {
      apercu.hidden = true;
      return;
    }
    apercu.hidden = false;
    apercu.textContent = apercuFichier.contenu;
  }

  async function lireFichierTache(id, chemin) {
    const apercu = corps.querySelector('.tache-apercu');
    if (!apercu) return;
    apercu.hidden = false;
    apercu.textContent = 'Chargement de ' + chemin + '...';
    try {
      const donnees = await appel(`/api/tache/${id}/fichier?chemin=${encodeURIComponent(chemin)}`);
      apercuFichier = { contenu: donnees.contenu || '' };
    } catch (err) {
      apercuFichier = { contenu: err.message || 'Lecture impossible.' };
    }
    majApercu();
  }

  // --- Mission ---

  function dessinerPlan(plan) {
    const bloc = balise('div', 'mission-plan');
    if (plan.objectif) {
      bloc.append(balise('p', 'mission-objectif', `Objectif : ${texteLisible(plan.objectif)}`));
    }

    const taches = Array.isArray(plan.taches) ? plan.taches : [];
    const cochées = new Set(taches.map((t) => t.agent));
    const liste = balise('div', 'mission-taches');
    for (const t of taches) {
      const item = balise('label', 'mission-tache');
      const caseC = document.createElement('input');
      caseC.type = 'checkbox';
      caseC.checked = true;
      caseC.value = t.agent;
      const texte = balise('span', 'mission-texte');
      texte.append(balise('b', '', `${t.prenom} — ${t.poste}`));
      texte.append(balise('span', 'mission-pole', t.pole || ''));
      texte.append(balise('p', 'mission-consigne', texteLisible(t.consigne || '')));
      item.append(caseC, texte);
      caseC.addEventListener('change', () => {
        if (caseC.checked) cochées.add(t.agent);
        else cochées.delete(t.agent);
        majCompte();
      });
      liste.append(item);
    }
    bloc.append(liste);

    const pied = balise('div', 'mission-pied');
    const lancer = bouton('', 'petit-bouton petit-fort');
    const note = balise('p', 'panneau-note');
    pied.append(lancer, note);
    bloc.append(pied);

    function majCompte() {
      const n = cochées.size;
      lancer.textContent = `Lancer ${n} tâche${n > 1 ? 's' : ''}`;
      lancer.disabled = n === 0;
    }
    majCompte();

    lancer.addEventListener('click', async () => {
      const choisies = taches.filter((t) => cochées.has(t.agent));
      if (!choisies.length) return;
      lancer.disabled = true;
      note.textContent = 'Lancement des agents...';
      try {
        const res = await appel('/api/mission/lancer', {
          taches: choisies.map((t) => ({ agent: t.agent, consigne: t.consigne })),
        });
        const lancees = Array.isArray(res.lancees) ? res.lancees : [];
        const refus = Array.isArray(res.refus) ? res.refus : [];
        const texte = refus.length
          ? `${lancees.length} lancée${lancees.length > 1 ? 's' : ''}, ${refus.length} refusée${refus.length > 1 ? 's' : ''}.`
          : `${lancees.length} tâche${lancees.length > 1 ? 's' : ''} confiée${lancees.length > 1 ? 's' : ''} aux agents.`;
        notifier({ titre: 'Mission lancée', texte, accent: '#4f8f5d' });
        fermer();
        ouvrir('taches');
      } catch (err) {
        note.textContent = texteLisible(String(err.message || ''));
        lancer.disabled = false;
      }
    });

    if (plan.cout) {
      bloc.append(balise('p', 'panneau-note', `Coût de la planification : ${formaterCout(plan.cout)}`));
    }
    return bloc;
  }

  async function dessinerMission() {
    vider();
    corps.append(
      balise(
        'p',
        'panneau-intro',
        'Décris une idée ou une mission. LePrince la découpe en tâches et l\'assigne aux bons agents.'
      )
    );

    const champ = balise('label', 'reunion-sujet');
    champ.append(balise('span', 'reunion-etiquette', 'Ton idée, en une ou deux phrases'));
    const saisie = balise('textarea', 'mission-saisie');
    saisie.rows = 3;
    saisie.maxLength = 3000;
    saisie.placeholder = 'Ex. Créer une landing page avec paiement pour le nouveau produit X';
    champ.append(saisie);
    corps.append(champ);

    const decouper = bouton('Découper en tâches', 'petit-bouton petit-fort');
    corps.append(decouper);

    const zone = balise('div', 'mission-zone');
    corps.append(zone);

    const demander = async () => {
      const idee = saisie.value.trim();
      if (!idee) return;
      decouper.disabled = true;
      zone.textContent = '';
      zone.append(balise('p', 'panneau-note', 'LePrince découpe l\'idée...'));
      try {
        const plan = await appel('/api/mission', { idee });
        if (ouvert !== 'mission') return;
        zone.textContent = '';
        zone.append(dessinerPlan(plan));
      } catch (err) {
        zone.textContent = '';
        zone.append(balise('p', 'panneau-note', texteLisible(String(err.message || ''))));
      }
      decouper.disabled = false;
    };

    decouper.addEventListener('click', demander);
    saisie.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Enter' && (evenement.metaKey || evenement.ctrlKey)) demander();
    });
  }

  // --- Chantiers ---

  const ETAPE_BADGES = {
    en_attente: { libelle: 'En attente', classe: 'attente' },
    en_cours: { libelle: 'En cours', classe: 'encours' },
    a_valider: { libelle: 'À valider', classe: 'avalider' },
    validee: { libelle: 'Validée', classe: 'validee' },
  };

  function badgeEtape(etat) {
    const b = balise('span', 'etape-badge ' + ((ETAPE_BADGES[etat] || {}).classe || ''));
    b.textContent = (ETAPE_BADGES[etat] || {}).libelle || etat;
    return b;
  }

  function dessinerChantierDetail(c) {
    vider();
    const retour = bouton('‹ Retour aux chantiers', 'petit-bouton');
    retour.addEventListener('click', () => {
      chantierVue = null;
      chargerChantiers();
    });
    corps.append(retour);

    corps.append(balise('p', 'chantier-objectif', c.nom || c.objectif));
    if (c.objectif && c.objectif !== c.nom) corps.append(balise('p', 'panneau-note', c.objectif));
    if (c.projet) corps.append(balise('p', 'chantier-projet', `Projet : ${c.projet}`));

    const etat = balise('span', 'chantier-etat');
    etat.textContent = c.etat === 'termine' ? 'Terminé' : 'En cours';
    etat.classList.add(c.etat === 'termine' ? 'validee' : 'encours');
    corps.append(etat);

    const liste = balise('div', 'mission-taches');
    (c.etapes || []).forEach((e, i) => {
      const item = balise('div', 'chantier-etape');
      const tete = balise('div', 'chantier-etape-tete');
      tete.append(balise('b', '', `${i + 1}. ${e.pole || ''} — ${e.prenom}`));
      tete.append(badgeEtape(e.etat));
      item.append(tete);
      item.append(balise('p', 'mission-consigne', texteLisible(e.consigne || '')));
      if (e.branche) item.append(balise('p', 'panneau-note', `Branche : ${e.branche}`));
      liste.append(item);
    });
    corps.append(liste);

    const actions = balise('div', 'mission-pied');
    const enAttente = (c.etapes || []).some((e) => e.etat === 'en_attente');
    const enCours = (c.etapes || []).some((e) => e.etat === 'en_cours');
    const aValider = (c.etapes || []).some((e) => e.etat === 'a_valider');
    const note = balise('p', 'panneau-note');

    if (enAttente && !enCours) {
      const lancer = bouton('Lancer l\'étape suivante', 'petit-bouton petit-fort');
      lancer.addEventListener('click', async () => {
        lancer.disabled = true;
        try {
          await appel(`/api/chantier/${c.id}/lancer`, {});
          notifier({ titre: 'Étape lancée', texte: 'L\'agent du pôle se met au travail.', accent: '#4f8f5d' });
          chargerChantiers();
        } catch (err) {
          note.textContent = texteLisible(String(err.message || ''));
          lancer.disabled = false;
        }
      });
      actions.append(lancer);
    }
    if (aValider) {
      const valider = bouton('Valider et passer au suivant', 'petit-bouton petit-fort');
      valider.addEventListener('click', async () => {
        valider.disabled = true;
        try {
          await appel(`/api/chantier/${c.id}/valider`, {});
          notifier({ titre: 'Étape validée', texte: 'Le chantier passe au pôle suivant.', accent: '#4f8f5d' });
          chargerChantiers();
        } catch (err) {
          note.textContent = texteLisible(String(err.message || ''));
          valider.disabled = false;
        }
      });
      actions.append(valider);
    }
    if (c.etat === 'termine') {
      note.textContent = 'Chantier terminé — toutes les étapes sont validées.';
    }
    actions.append(note);
    corps.append(actions);
  }

  async function chargerChantiers() {
    vider();
    if (chantierVue) {
      corps.append(balise('p', 'panneau-note', 'Lecture du chantier...'));
      let c;
      try {
        c = await appel(`/api/chantier/${chantierVue}`);
      } catch {
        chantierVue = null;
        chargerChantiers();
        return;
      }
      if (ouvert !== 'chantiers') return;
      dessinerChantierDetail(c);
      return;
    }

    corps.append(balise('p', 'panneau-note', 'Lecture des chantiers...'));
    let donnees;
    try {
      donnees = await appel('/api/chantiers');
    } catch {
      if (ouvert === 'chantiers') corps.children[0].textContent = 'Serveur indisponible.';
      return;
    }
    if (ouvert !== 'chantiers') return;
    vider();

    corps.append(
      balise('p', 'panneau-intro', 'Un chantier = un projet découpé en étapes que les pôles se relaient pour livrer.')
    );

    const champ = balise('label', 'reunion-sujet');
    champ.append(balise('span', 'reunion-etiquette', 'Ton idée ou ton projet'));
    const saisie = balise('textarea', 'mission-saisie');
    saisie.rows = 2;
    saisie.maxLength = 3000;
    saisie.placeholder = 'Ex. Livrer le site vitrine et le paiement pour le client X';
    champ.append(saisie);
    corps.append(champ);

    const champProjet = balise('label', 'reunion-sujet');
    champProjet.append(balise('span', 'reunion-etiquette', 'Projet concerné dans ~/dev (facultatif)'));
    const saisieProjet = document.createElement('input');
    saisieProjet.type = 'text';
    saisieProjet.className = 'reunion-saisie';
    saisieProjet.placeholder = 'Ex. juice_site';
    saisieProjet.maxLength = 80;
    champProjet.append(saisieProjet);
    corps.append(champProjet);

    const creer = bouton('Créer le chantier', 'petit-bouton petit-fort');
    const note = balise('p', 'panneau-note');
    corps.append(creer, note);

    creer.addEventListener('click', async () => {
      const idee = saisie.value.trim();
      if (!idee) {
        note.textContent = 'Décris ton idée.';
        return;
      }
      creer.disabled = true;
      note.textContent = 'LePrince découpe le chantier...';
      try {
        const res = await appel('/api/chantier', { idee, projet: saisieProjet.value.trim() });
        notifier({ titre: 'Chantier créé', texte: `${res.etapes.length} étapes réparties sur les pôles.`, accent: '#4f8f5d' });
        chantierVue = res.id;
        chargerChantiers();
      } catch (err) {
        note.textContent = texteLisible(String(err.message || ''));
        creer.disabled = false;
      }
    });

    const chantiersListe = Array.isArray(donnees.chantiers) ? donnees.chantiers : [];
    corps.append(balise('p', 'panneau-section', `Chantiers (${chantiersListe.length})`));
    if (!chantiersListe.length) {
      corps.append(balise('p', 'panneau-vide', 'Aucun chantier pour l\'instant.'));
    } else {
      const liste = balise('div', 'chantiers-liste');
      for (const c of chantiersListe) {
        const ligne = balise('div', 'chantier-ligne');
        const nom = balise('b', 'chantier-nom', c.nom || c.objectif);
        const finies = (c.etapes || []).filter((e) => e.etat === 'validee').length;
        const info = balise('span', 'chantier-info', `${finies}/${(c.etapes || []).length} étapes`);
        const badge = balise('span', 'chantier-etat');
        badge.textContent = c.etat === 'termine' ? 'Terminé' : 'En cours';
        badge.classList.add(c.etat === 'termine' ? 'validee' : 'encours');
        const ouvrir = bouton('Ouvrir');
        ouvrir.addEventListener('click', () => {
          chantierVue = c.id;
          chargerChantiers();
        });
        ligne.append(nom, info, badge, ouvrir);
        liste.append(ligne);
      }
      corps.append(liste);
    }
  }

  // --- Gestion du panneau ---

  function rendre() {
    if (!ouvert) return;
    const t = TITRES[ouvert];
    sur.textContent = t.sur;
    titre.textContent = t.titre;
    changerOnglet(ouvert);
    if (ouvert === 'poles') dessinerPoles();
    else if (ouvert === 'equipe') dessinerEquipe();
    else if (ouvert === 'reunion') dessinerReunion();
    else if (ouvert === 'mission') dessinerMission();
    else if (ouvert === 'chantiers') chargerChantiers();
    else if (ouvert === 'ia') chargerIA();
    else if (ouvert === 'projets') chargerProjets();
    else if (ouvert === 'taches') chargerTaches();
  }

  function rafraichir() {
    if (!ouvert) return;
    if (ouvert === 'equipe') majEquipe();
    else if (ouvert === 'reunion') majReunion();
    else if (ouvert === 'chantiers' && chantierVue) chargerChantiers();
    else if (ouvert === 'taches') chargerTaches();
  }

  function ouvrir(nom) {
    if (!TITRES[nom]) return;
    if (rencontre && rencontre.estOuverte()) return;
    ouvert = nom;
    panneau.hidden = false;
    document.body.classList.add('panneau-ouvert');
    rendre();
    clearInterval(minuteur);
    minuteur = setInterval(rafraichir, nom === 'taches' ? 2400 : 1300);
  }

  function fermer() {
    if (!ouvert) return;
    ouvert = null;
    clearInterval(minuteur);
    minuteur = null;
    panneau.hidden = true;
    document.body.classList.remove('panneau-ouvert');
    changerOnglet(null);
  }

  for (const b of badges) {
    b.addEventListener('click', () => {
      const nom = b.dataset.panneau;
      if (ouvert === nom) fermer();
      else ouvrir(nom);
    });
  }
  fermerBouton.addEventListener('click', fermer);

  window.addEventListener(
    'keydown',
    (evenement) => {
      if (evenement.code !== 'Escape' || !ouvert) return;
      if (rencontre && rencontre.estOuverte()) return;
      evenement.stopPropagation();
      fermer();
    },
    true
  );

  setInterval(surveillerTaches, 6000);
  surveillerTaches();

  return {
    ouvrir,
    fermer,
    estOuvert: () => !!ouvert,
    notifier,
    majReunion,
    majEquipe: () => {
      if (ouvert === 'equipe') majEquipe();
    },
    badgeTaches,
  };
}
