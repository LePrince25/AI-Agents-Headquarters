const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, execFile } = require('node:child_process');
const gitOps = require('./git');

const HOST = process.env.HOTE || '127.0.0.1';
const PORT = Number(process.env.PORT) || 4173;
const PROJET = path.resolve(__dirname, '..');
const RACINE = path.join(PROJET, 'site');
const TRAVAUX = path.join(__dirname, 'travaux');
const EQUIPE_MD = path.join(PROJET, 'EQUIPE.md');
const MEMOIRE = path.join(__dirname, 'memoire');
const REGISTRE = path.join(__dirname, 'registre', 'travaux.json');
const MEMOIRE_LUE = 6000;
const MEMOIRE_FICHIER = 32000;
const REGISTRE_MAX = 200;
const CHANTIERS = path.join(__dirname, 'registre', 'chantiers.json');
const CHANTIERS_MAX = 60;

const CLI = process.env.CLAUDE_BIN || 'claude';
const MODELE = 'sonnet';
const OUTILS = 'Read,Write,Edit,Glob,Grep,WebSearch,WebFetch';
const BUDGET = '2';
const MAX_TACHES = 4;
const MAX_DISCUSSIONS = 4;
const DUREE_MAX_TACHE = 15 * 60 * 1000;
const DUREE_MAX_DISCUSSION = 90 * 1000;
const DUREE_MAX_REUNION = 180 * 1000;
const MAX_CORPS = 64 * 1024;
const REGLAGES = JSON.stringify({ disableAllHooks: true });

const FICHIER_IA = path.join(__dirname, 'reglages.json');
const IA_CONNUS = [
  { id: 'claude', nom: 'Claude Code', cmd: process.env.CLAUDE_BIN || 'claude', genre: 'claude' },
  { id: 'opencode', nom: 'OpenCode', cmd: process.env.OPENCODE_BIN || 'opencode', genre: 'opencode' },
  { id: 'kimi', nom: 'Kimi Code', cmd: process.env.KIMI_BIN || 'kimi', genre: 'kimi' },
  { id: 'kilo', nom: 'Kilo Code', cmd: process.env.KILO_BIN || 'kilo', genre: 'opencode' },
  { id: 'codex', nom: 'Codex CLI', cmd: 'codex', genre: 'codex' },
  { id: 'gemini', nom: 'Gemini CLI', cmd: 'gemini', genre: 'gemini' },
  { id: 'ollama', nom: 'Ollama', cmd: process.env.OLLAMA_BIN || 'ollama', genre: 'ollama' },
  { id: 'qoder', nom: 'Qoder', cmd: 'qoder', genre: 'qoder' },
  { id: 'aider', nom: 'Aider', cmd: 'aider', genre: 'generique' },
  { id: 'crush', nom: 'Crush', cmd: 'crush', genre: 'generique' },
  { id: 'goose', nom: 'Goose', cmd: 'goose', genre: 'generique' },
  { id: 'qwen', nom: 'Qwen Code', cmd: 'qwen', genre: 'generique' },
  { id: 'cursor', nom: 'Cursor CLI', cmd: 'cursor-agent', genre: 'generique' },
];
const MODELE_OPENCODE = process.env.OPENCODE_MODEL || 'opencode/beam-free';
const MODELE_OLLAMA = process.env.OLLAMA_MODEL || 'qwen3-coder:30b';
const APP_QODER = '/Applications/Qoder.app';
const RACINE_PROJETS = process.env.PROJETS_DIR || path.join(os.homedir(), 'dev');
const HOTE_PROJETS = process.env.HOTE_PROJETS || null;
const HOTE_APP = process.env.HOTE_APP || null;
const PONT = process.env.PONT_MAC || null;

let iaChoisie = 'claude';
let iaCustoms = [];
try {
  const lu = JSON.parse(fs.readFileSync(FICHIER_IA, 'utf8'));
  if (typeof lu.ia === 'string') iaChoisie = lu.ia;
  if (Array.isArray(lu.customs)) iaCustoms = lu.customs.filter((c) => c && c.id && c.nom && c.cmd);
} catch {}

function trouverIA(id) {
  return IA_CONNUS.find((c) => c.id === id) || iaCustoms.find((c) => c.id === id) || null;
}

function iaActive() {
  return trouverIA(iaChoisie) || IA_CONNUS[0];
}

function envIA(ia) {
  if (ia.envVar && ia.cle) return { ...process.env, [ia.envVar]: ia.cle };
  return process.env;
}

function cleMasquee(cle) {
  if (!cle) return '';
  return cle.length <= 4 ? '••••' : `••••${cle.slice(-4)}`;
}

async function ecrireReglages() {
  await fsp.writeFile(FICHIER_IA, JSON.stringify({ ia: iaChoisie, customs: iaCustoms }, null, 2));
}

const JETON = crypto.randomBytes(24).toString('base64url');
const HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`, `[::1]:${PORT}`]);
const ORIGINES = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`, `http://[::1]:${PORT}`]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const taches = new Map();
const enfants = new Set();
let discussions = 0;
let historique = [];
let chantiers = [];
let cacheEquipe = { mtime: 0, agents: new Map() };
let cacheOutils = { quand: 0, outils: [] };
let cacheIA = { quand: 0, candidates: [] };
let cacheProjets = { quand: 0, projets: [] };

class ErreurApi extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function repondre(res, code, texte, entetes = {}) {
  res.writeHead(code, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...entetes,
  });
  res.end(texte);
}

function json(res, code, donnees) {
  const corps = JSON.stringify(donnees);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corps),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(corps);
}

function jetonValide(recu) {
  if (typeof recu !== 'string') return false;
  const a = Buffer.from(recu);
  const b = Buffer.from(JETON);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function nettoyer(texte) {
  return String(texte)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function slugifier(texte) {
  return String(texte)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'agent';
}

function cheminMemoire(agent) {
  return path.join(MEMOIRE, `${agent.slug}.md`);
}

function lireMemoire(agent) {
  try {
    const texte = fs.readFileSync(cheminMemoire(agent), 'utf8').trim();
    return texte.length > MEMOIRE_LUE ? texte.slice(-MEMOIRE_LUE) : texte;
  } catch {
    return '';
  }
}

async function ajouterMemoire(agent, consigne, rapport) {
  const fichier = cheminMemoire(agent);
  const date = new Date().toISOString().slice(0, 10);
  const entree = `
## ${date} — ${resumeTexte(consigne, 120)}
${resumeTexte(rapport, 900)}
`;
  const existant = lireMemoire(agent);
  const complet = (existant ? existant + entree : entree).trimStart();
  try {
    await fsp.mkdir(MEMOIRE, { recursive: true });
    await fsp.writeFile(fichier, complet.slice(-MEMOIRE_FICHIER), 'utf8');
  } catch {}
}

function chargerRegistre() {
  try {
    const lu = JSON.parse(fs.readFileSync(REGISTRE, 'utf8'));
    if (Array.isArray(lu)) historique = lu;
  } catch {}
}

async function sauverRegistre() {
  try {
    await fsp.mkdir(path.dirname(REGISTRE), { recursive: true });
    await fsp.writeFile(REGISTRE, JSON.stringify(historique.slice(0, REGISTRE_MAX), null, 2));
  } catch {}
}

function chargerChantiers() {
  try {
    const lu = JSON.parse(fs.readFileSync(CHANTIERS, 'utf8'));
    if (Array.isArray(lu)) chantiers = lu;
  } catch {}
}

async function sauverChantiers() {
  try {
    await fsp.mkdir(path.dirname(CHANTIERS), { recursive: true });
    await fsp.writeFile(CHANTIERS, JSON.stringify(chantiers.slice(0, CHANTIERS_MAX), null, 2));
  } catch {}
}

async function lireEquipe() {
  const stat = await fsp.stat(EQUIPE_MD);
  if (stat.mtimeMs === cacheEquipe.mtime) return cacheEquipe;

  const texte = await fsp.readFile(EQUIPE_MD, 'utf8');
  const agents = new Map();
  const prince = { missions: [], outils: '' };
  let pole = '';
  let lieu = '';
  let chezPrince = false;
  let dansMissions = false;

  for (const ligne of texte.split(/\r?\n/)) {
    const titre = ligne.match(/^##\s+(.+)$/);
    if (titre) {
      chezPrince = /LePrince Dziedjom/.test(titre[1]);
      const bloc = titre[1].match(/Pôle\s+(.+?)\s+—\s+\*(.+?)\*/u);
      pole = bloc ? `Pôle ${bloc[1].trim()}` : '';
      lieu = bloc ? bloc[2].trim() : '';
      if (chezPrince) {
        pole = 'Direction Générale';
        lieu = 'LePrince WorkLand';
      }
      dansMissions = false;
      continue;
    }

    if (chezPrince) {
      if (/^\*\*Poste\.\*\*/.test(ligne)) continue;
      if (/^\*\*Missions\.\*\*/.test(ligne)) {
        dansMissions = true;
        continue;
      }
      if (/^\*\*Outils\.\*\*/.test(ligne)) {
        dansMissions = false;
        prince.outils = nettoyer(ligne.replace(/^\*\*Outils\.\*\*\s*/, ''));
        continue;
      }
      if (dansMissions) {
        const mission = ligne.match(/^\d+\.\s+(.+)$/);
        if (mission) prince.missions.push(nettoyer(mission[1]));
      }
      continue;
    }

    if (!ligne.trim().startsWith('|')) continue;
    const cellules = ligne.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cellules.length !== 5) continue;
    const nomBrut = cellules[0].match(/^\*\*(.+?)\*\*$/);
    if (!nomBrut) continue;

    const nom = nettoyer(nomBrut[1]);
    const prenom = nom.split(/\s+/)[0];
    const missions = [nettoyer(cellules[2]), nettoyer(cellules[3])].filter(Boolean);
    agents.set(nom, {
      nom,
      prenom,
      poste: nettoyer(cellules[1]),
      missions,
      outils: nettoyer(cellules[4]),
      pole,
      lieu,
      slug: slugifier(prenom),
    });
  }

  agents.set('LePrince Dziedjom', {
    nom: 'LePrince Dziedjom',
    prenom: 'LePrince',
    poste: 'Directeur Général',
    missions: prince.missions,
    outils: prince.outils,
    pole: 'Direction Générale',
    lieu: 'LePrince WorkLand',
    slug: 'leprince',
  });

  cacheEquipe = { mtime: stat.mtimeMs, agents };
  return cacheEquipe;
}

function presentation(agent) {
  if (agent.pole === 'Direction Générale') {
    return `${agent.nom}, ${agent.poste} chez LePrince WorkLand`;
  }
  const pole = agent.pole ? ` au ${agent.pole}` : '';
  const lieu = agent.lieu ? ` (${agent.lieu})` : '';
  return `${agent.nom}, ${agent.poste}${pole}${lieu}`;
}

function persona(agent) {
  const missions = agent.missions.length
    ? `Tes missions dans l'équipe :\n${agent.missions.map((m) => `- ${m}`).join('\n')}`
    : '';
  const outils = agent.outils ? `Tes outils : ${agent.outils}.` : '';
  return `Tu es ${presentation(agent)}.
${missions}
${outils}
Tu discutes avec LePrince Dziedjom, Directeur Général, qui passe te voir à ton bureau.
Réponds en français, à la première personne, avec le ton d'un collègue compétent et direct.
Sois concis : deux à quatre phrases, sauf si on te demande un détail.
Tu ne peux rien exécuter pendant cette discussion : aucun outil, aucun fichier, aucune action réelle.
Ne prétends jamais avoir fait quelque chose. Si on te confie un vrai travail, invite à utiliser « Confier une tâche ».`;
}

function consigneSysteme(agent, memoire, info) {
  const contexte = memoire
    ? `

Voici un résumé de tes travaux précédents. Utilise-le comme contexte, ne le récite pas.

${memoire}`
    : '';
  const surProjet = info && info.projet
    ? `Tu travailles sur le vrai projet « ${info.projet} » dans le dossier courant, une copie de travail sur la branche « ${info.branche} ».
Écris et modifie les fichiers directement dans ce dossier. Ne lance pas toi-même de commande git : le serveur prépare la branche et committe tes changements.`
    : `Tu travailles uniquement dans le dossier courant, live/travaux/${agent.slug}, et tu ne modifies rien en dehors.`;
  const terminal = info && info.terminal
    ? ' Tu as accès au terminal pour construire, tester et vérifier ton travail.'
    : ' Tu n\'as pas de terminal.';
  return `Tu es ${presentation(agent)}.
Tu travailles chez LePrince WorkLand et le Directeur Général te confie une tâche.
${surProjet}
Tu peux lire, écrire et modifier des fichiers, et chercher sur le web.${terminal}
Exécute la tâche sans demander de confirmation, puis termine par un compte rendu court en français :
ce qui a été fait, les fichiers concernés, et ce qui reste éventuellement à vérifier.${contexte}`;
}

async function corpsJson(req) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new ErreurApi(415, 'Contenu JSON attendu.');
  const annonce = Number(req.headers['content-length'] || 0);
  if (annonce > MAX_CORPS) throw new ErreurApi(413, 'Demande trop lourde.');

  let texte = '';
  for await (const morceau of req) {
    texte += morceau;
    if (Buffer.byteLength(texte) > MAX_CORPS) throw new ErreurApi(413, 'Demande trop lourde.');
  }
  try {
    const donnees = JSON.parse(texte || '{}');
    if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) {
      throw new ErreurApi(400, 'Demande invalide.');
    }
    return donnees;
  } catch (err) {
    if (err instanceof ErreurApi) throw err;
    throw new ErreurApi(400, 'JSON invalide.');
  }
}

function texteCourt(valeur, max) {
  if (typeof valeur !== 'string') return '';
  return valeur.trim().slice(0, max);
}

function executerCLI(ia, args, dossier, limite) {
  return new Promise((resolve, reject) => {
    let enfant;
    try {
      enfant = spawn(ia.cmd, args, {
        cwd: dossier,
        env: envIA(ia),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      reject(new ErreurApi(503, `${ia.nom} est introuvable.`));
      return;
    }

    enfants.add(enfant);
    let sortie = '';
    let erreur = '';
    let fini = false;

    const minuteur = setTimeout(() => {
      if (fini) return;
      try { enfant.kill('SIGTERM'); } catch {}
      setTimeout(() => { try { enfant.kill('SIGKILL'); } catch {} }, 4000);
    }, limite);

    enfant.stdout.setEncoding('utf8');
    enfant.stdout.on('data', (morceau) => {
      sortie += morceau;
      if (sortie.length > 4 * 1024 * 1024) sortie = sortie.slice(-2 * 1024 * 1024);
    });
    enfant.stderr.setEncoding('utf8');
    enfant.stderr.on('data', (morceau) => {
      erreur += morceau;
      if (erreur.length > 8000) erreur = erreur.slice(-4000);
    });
    enfant.on('error', (err) => {
      fini = true;
      clearTimeout(minuteur);
      enfants.delete(enfant);
      reject(err.code === 'ENOENT' ? new ErreurApi(503, `${ia.nom} est introuvable.`) : err);
    });
    enfant.on('close', (code, signal) => {
      fini = true;
      clearTimeout(minuteur);
      enfants.delete(enfant);
      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        reject(new ErreurApi(504, `${ia.nom} a dépassé le temps imparti.`));
        return;
      }
      if (code !== 0) {
        reject(new ErreurApi(502, `${ia.nom} s'est arrêté sans réponse.`));
        return;
      }
      resolve({ sortie, erreur });
    });
  });
}

function reponseTexte(sortie, ia) {
  const lignes = String(sortie || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith('>') && !l.startsWith('←') && !l.startsWith('•') && !l.startsWith('INFO '));
  const texte = lignes.join('\n').trim();
  if (!texte) throw new ErreurApi(502, `${ia.nom} n'a pas répondu.`);
  return texte;
}

function reponseKimi(sortie, ia) {
  const morceaux = [];
  for (const ligne of String(sortie || '').split('\n')) {
    if (!ligne.trim()) continue;
    try {
      const bloc = JSON.parse(ligne);
      if (bloc.role === 'assistant' && typeof bloc.content === 'string' && bloc.content.trim() && !bloc.tool_calls) {
        morceaux.push(bloc.content.trim());
      }
    } catch {}
  }
  const texte = morceaux.join('\n').trim();
  if (!texte) throw new ErreurApi(502, `${ia.nom} n'a pas répondu.`);
  return texte;
}

async function discuter(agent, message, historique) {
  if (discussions >= MAX_DISCUSSIONS) {
    throw new ErreurApi(429, 'Trop de discussions en même temps. Patiente un instant.');
  }

  let fil = '';
  for (const tour of historique) {
    const qui = tour.role === 'agent' ? agent.prenom : 'LePrince Dziedjom';
    fil += `${qui} : ${tour.contenu}\n`;
  }
  fil += `LePrince Dziedjom : ${message}`;

  const ia = iaActive();
  discussions += 1;
  try {
    if (ia.id === 'claude') {
      const args = [
        '-p', fil,
        '--output-format', 'json',
        '--model', MODELE,
        '--tools', '',
        '--permission-prompts', 'none',
        '--no-session-persistence',
        '--strict-mcp-config',
        '--settings', REGLAGES,
        '--append-system-prompt', persona(agent),
      ];
      const { sortie } = await executerCLI(ia, args, PROJET, DUREE_MAX_DISCUSSION);
      let resultat;
      try {
        resultat = JSON.parse(sortie);
      } catch {
        throw new ErreurApi(502, 'Réponse illisible de Claude Code.');
      }
      if (resultat.is_error || typeof resultat.result !== 'string' || !resultat.result.trim()) {
        throw new ErreurApi(502, 'Claude Code n\'a pas répondu.');
      }
      return {
        reponse: resultat.result.trim(),
        cout: Number(resultat.total_cost_usd) || 0,
      };
    }

    const invite = `${persona(agent)}\n\n${fil}\n${agent.prenom} :`;
    let args;
    let dossier = PROJET;
    let menage = null;
    if (ia.genre === 'opencode') {
      args = ['run', invite];
      if (ia.id === 'opencode') args = ['run', '-m', MODELE_OPENCODE, invite];
      dossier = await fsp.mkdtemp(path.join(os.tmpdir(), 'qg-'));
      menage = dossier;
    } else if (ia.genre === 'codex') {
      args = ['exec', invite];
    } else if (ia.genre === 'kimi') {
      args = ['-p', invite, '--output-format', 'stream-json'];
      dossier = await fsp.mkdtemp(path.join(os.tmpdir(), 'qg-'));
      menage = dossier;
    } else if (ia.genre === 'ollama') {
      args = ['run', MODELE_OLLAMA, invite];
    } else if (ia.genre === 'gemini') {
      args = ['-p', invite];
    } else {
      args = [invite];
      dossier = await fsp.mkdtemp(path.join(os.tmpdir(), 'qg-'));
      menage = dossier;
    }

    try {
      const { sortie } = await executerCLI(ia, args, dossier, DUREE_MAX_DISCUSSION);
      const texte = ia.genre === 'kimi' ? reponseKimi(sortie, ia) : reponseTexte(sortie, ia);
      return { reponse: texte, cout: 0 };
    } finally {
      if (menage) await fsp.rm(menage, { recursive: true, force: true });
    }
  } finally {
    discussions -= 1;
  }
}

function extraireJSON(texte) {
  const source = String(texte || '').replace(/```json|```/g, '\n');
  const bloc = source.match(/\{[\s\S]*\}/);
  if (!bloc) return null;
  try {
    return JSON.parse(bloc[0]);
  } catch {
    return null;
  }
}

async function tenirReunion(sujet, noms) {
  if (discussions >= MAX_DISCUSSIONS) {
    throw new ErreurApi(429, 'Trop de discussions en même temps. Patiente un instant.');
  }

  const equipe = await lireEquipe();
  const participants = [];
  for (const nom of noms) {
    const agent = equipe.agents.get(nom);
    if (agent) participants.push(agent);
  }
  if (!participants.length) throw new ErreurApi(404, 'Participants inconnus.');

  const trame = participants
    .map((a) => `- ${a.prenom}, ${a.poste}${a.missions && a.missions.length ? ` : ${a.missions[0]}` : ''}`)
    .join('\n');
  const invite = `Tu animes une réunion de travail chez LePrince WorkLand, en français.

Sujet : ${sujet}

Participants :
${trame}

Chaque participant prend la parole une ou deux fois, en une ou deux phrases courtes, en accord avec son rôle. Termine par trois décisions concrètes prises ensemble.

Réponds uniquement par un objet JSON, sans texte autour :
{"lignes":[{"prenom":"Prénom","texte":"..."}],"decisions":["...","...","..."]}`;

  const ia = iaActive();
  discussions += 1;
  let cout = 0;
  let texte = '';
  try {
    if (ia.id === 'claude') {
      const args = [
        '-p', invite,
        '--output-format', 'json',
        '--model', MODELE,
        '--tools', '',
        '--permission-prompts', 'none',
        '--no-session-persistence',
        '--strict-mcp-config',
        '--settings', REGLAGES,
      ];
      const { sortie } = await executerCLI(ia, args, PROJET, DUREE_MAX_REUNION);
      let resultat;
      try {
        resultat = JSON.parse(sortie);
      } catch {
        throw new ErreurApi(502, 'Réponse illisible de Claude Code.');
      }
      if (resultat.is_error || typeof resultat.result !== 'string' || !resultat.result.trim()) {
        throw new ErreurApi(502, 'Claude Code n\'a pas répondu.');
      }
      texte = resultat.result.trim();
      cout = Number(resultat.total_cost_usd) || 0;
    } else {
      let args;
      let dossier = PROJET;
      let menage = null;
      if (ia.genre === 'opencode') {
        args = ['run', invite];
        if (ia.id === 'opencode') args = ['run', '-m', MODELE_OPENCODE, invite];
        dossier = await fsp.mkdtemp(path.join(os.tmpdir(), 'qg-'));
        menage = dossier;
      } else if (ia.genre === 'codex') {
        args = ['exec', invite];
      } else if (ia.genre === 'kimi') {
        args = ['-p', invite, '--output-format', 'stream-json'];
        dossier = await fsp.mkdtemp(path.join(os.tmpdir(), 'qg-'));
        menage = dossier;
      } else if (ia.genre === 'ollama') {
        args = ['run', MODELE_OLLAMA, invite];
      } else if (ia.genre === 'gemini') {
        args = ['-p', invite];
      } else {
        args = [invite];
        dossier = await fsp.mkdtemp(path.join(os.tmpdir(), 'qg-'));
        menage = dossier;
      }
      try {
        const { sortie } = await executerCLI(ia, args, dossier, DUREE_MAX_REUNION);
        texte = ia.genre === 'kimi' ? reponseKimi(sortie, ia) : reponseTexte(sortie, ia);
      } finally {
        if (menage) await fsp.rm(menage, { recursive: true, force: true });
      }
    }
  } finally {
    discussions -= 1;
  }

  const brut = extraireJSON(texte);
  const lignes = [];
  if (brut && Array.isArray(brut.lignes)) {
    for (const l of brut.lignes) {
      if (!l || typeof l !== 'object') continue;
      const prenom = texteCourt(l.prenom, 40);
      const tour = texteCourt(l.texte, 400);
      if (prenom && tour) lignes.push({ prenom, texte: tour });
    }
  }
  const decisions = [];
  if (brut && Array.isArray(brut.decisions)) {
    for (const d of brut.decisions) {
      const t = texteCourt(d, 300);
      if (t) decisions.push(t);
    }
  }
  if (!lignes.length) throw new ErreurApi(502, `${ia.nom} n'a pas animé la réunion.`);
  return { sujet, lignes, decisions: decisions.slice(0, 5), cout };
}

function trouverAgentParNom(equipe, nom) {
  const direct = equipe.agents.get(nom);
  if (direct) return direct;
  const cible = String(nom).trim();
  for (const agent of equipe.agents.values()) {
    if (agent.nom.localeCompare(cible, 'fr', { sensitivity: 'base' }) === 0) return agent;
  }
  return null;
}

async function appelerIA(invite, duree) {
  const ia = iaActive();
  let texte = '';
  let cout = 0;
  if (ia.id === 'claude') {
    const args = [
      '-p', invite,
      '--output-format', 'json',
      '--model', MODELE,
      '--tools', '',
      '--permission-prompts', 'none',
      '--no-session-persistence',
      '--strict-mcp-config',
      '--settings', REGLAGES,
    ];
    const { sortie } = await executerCLI(ia, args, PROJET, duree);
    let resultat;
    try {
      resultat = JSON.parse(sortie);
    } catch {
      throw new ErreurApi(502, 'Réponse illisible de Claude Code.');
    }
    if (resultat.is_error || typeof resultat.result !== 'string' || !resultat.result.trim()) {
      throw new ErreurApi(502, 'Claude Code n\'a pas répondu.');
    }
    texte = resultat.result.trim();
    cout = Number(resultat.total_cost_usd) || 0;
  } else {
    let args;
    let dossier = PROJET;
    let menage = null;
    if (ia.genre === 'opencode') {
      args = ['run', invite];
      if (ia.id === 'opencode') args = ['run', '-m', MODELE_OPENCODE, invite];
      dossier = await fsp.mkdtemp(path.join(os.tmpdir(), 'qg-'));
      menage = dossier;
    } else if (ia.genre === 'codex') {
      args = ['exec', invite];
    } else if (ia.genre === 'kimi') {
      args = ['-p', invite, '--output-format', 'stream-json'];
      dossier = await fsp.mkdtemp(path.join(os.tmpdir(), 'qg-'));
      menage = dossier;
    } else if (ia.genre === 'ollama') {
      args = ['run', MODELE_OLLAMA, invite];
    } else if (ia.genre === 'gemini') {
      args = ['-p', invite];
    } else {
      args = [invite];
      dossier = await fsp.mkdtemp(path.join(os.tmpdir(), 'qg-'));
      menage = dossier;
    }
    try {
      const { sortie } = await executerCLI(ia, args, dossier, duree);
      texte = ia.genre === 'kimi' ? reponseKimi(sortie, ia) : reponseTexte(sortie, ia);
    } finally {
      if (menage) await fsp.rm(menage, { recursive: true, force: true });
    }
  }
  return { texte, cout };
}

async function planifierMission(idee) {
  if (discussions >= MAX_DISCUSSIONS) {
    throw new ErreurApi(429, 'Trop de discussions en même temps. Patiente un instant.');
  }

  const equipe = await lireEquipe();
  const lignes = [];
  for (const a of equipe.agents.values()) {
    if (a.pole === 'Direction Générale') continue;
    const mission = a.missions.length ? ` — ${a.missions[0]}` : '';
    const lieu = a.lieu ? ` (${a.lieu})` : '';
    lignes.push(`- ${a.nom} · ${a.poste} · ${a.pole}${lieu}${mission}`);
  }
  const saut = `
`;
  const roster = lignes.join(saut);

  const invite = `Tu es LePrince Dziedjom, Directeur Général de LePrince WorkLand, un atelier de 30 agents IA qui livrent des produits numériques (APIs, sites vitrines, applications mobiles, SaaS, sécurité, data, ops).

Voici l'équipe :
${roster}

Une idée vient d'arriver. Transforme-la en plan d'exécution : découpe-la en tâches concrètes et confie chaque tâche à l'agent le plus compétent.

Idée reçue :
${idee}

Règles :
- Chaque tâche est confiée à UN agent précis dont le nom complet figure dans la liste (jamais au DG).
- La consigne est courte et actionnable : ce qu'il faut produire et le résultat attendu.
- « ordre » est un entier croissant ; si une tâche dépend d'une autre, mets le nom de l'agent qui la précède dans « depend_de » (sinon tableau vide).
- Reste réaliste : 3 à 8 tâches maximum, uniquement celles qui servent.

Réponds uniquement par un objet JSON, sans texte autour :
{"objectif":"une phrase","taches":[{"agent":"Nom Complet","consigne":"...","ordre":1,"depend_de":[]}]}`;

  discussions += 1;
  let texte = '';
  let cout = 0;
  try {
    const reponse = await appelerIA(invite, DUREE_MAX_REUNION);
    texte = reponse.texte;
    cout = reponse.cout;
  } finally {
    discussions -= 1;
  }

  const brut = extraireJSON(texte);
  if (!brut || !Array.isArray(brut.taches) || !brut.taches.length) {
    throw new ErreurApi(502, `${iaActive().nom} n'a pas produit de plan exploitable.`);
  }

  const taches = [];
  for (const t of brut.taches.slice(0, 12)) {
    if (!t || typeof t !== 'object') continue;
    const nom = texteCourt(t.agent, 80);
    const consigne = texteCourt(t.consigne, 2000);
    if (!nom || !consigne) continue;
    const agent = trouverAgentParNom(equipe, nom);
    if (!agent) continue;
    if (taches.some((x) => x.agent === agent.nom)) continue;
    taches.push({
      agent: agent.nom,
      prenom: agent.prenom,
      poste: agent.poste,
      pole: agent.pole,
      lieu: agent.lieu,
      consigne,
      ordre: Number.isFinite(Number(t.ordre)) ? Number(t.ordre) : taches.length + 1,
      depend_de: Array.isArray(t.depend_de)
        ? t.depend_de.map((d) => texteCourt(d, 80)).filter(Boolean)
        : [],
    });
  }
  if (!taches.length) {
    throw new ErreurApi(502, `${iaActive().nom} n'a assigné aucune tâche à un agent connu.`);
  }
  taches.sort((a, b) => a.ordre - b.ordre);
  return { objectif: texteCourt(brut.objectif, 300), taches, cout };
}

async function lancerMission(taches) {
  const equipe = await lireEquipe();
  const lancees = [];
  const refus = [];
  for (const t of taches) {
    const nom = texteCourt(t && t.agent, 80);
    const consigne = texteCourt(t && t.consigne, 4000);
    if (!nom || !consigne) continue;
    const agent = trouverAgentParNom(equipe, nom);
    if (!agent) {
      refus.push({ agent: nom, raison: 'Agent inconnu.' });
      continue;
    }
    try {
      const tache = await demarrerTache(agent, consigne);
      lancees.push(etatTache(tache));
    } catch (err) {
      refus.push({ agent: nom, raison: err instanceof ErreurApi ? err.message : 'Lancement impossible.' });
    }
  }
  return { lancees, refus };
}

async function creerChantier(idee, projet) {
  const plan = await planifierMission(projet ? `${idee} (projet concerné : ${projet})` : idee);
  const chantier = {
    id: crypto.randomUUID(),
    nom: resumeTexte(plan.objectif || idee, 60),
    objectif: plan.objectif || idee,
    projet: projet || '',
    cree: Date.now(),
    etat: 'en_cours',
    cout: plan.cout || 0,
    etapes: plan.taches.map((t) => ({
      pole: t.pole,
      lieu: t.lieu,
      agent: t.agent,
      prenom: t.prenom,
      poste: t.poste,
      consigne: t.consigne,
      ordre: t.ordre,
      depend_de: t.depend_de,
      etat: 'en_attente',
      tacheId: null,
    })),
  };
  chantiers.unshift(chantier);
  if (chantiers.length > CHANTIERS_MAX) chantiers = chantiers.slice(0, CHANTIERS_MAX);
  await sauverChantiers();
  return chantier;
}

async function lancerEtapeChantier(chantier) {
  if (chantier.etapes.some((e) => e.etat === 'en_cours')) {
    throw new ErreurApi(409, 'Une étape est déjà en cours. Attends qu\'elle finisse avant de lancer la suivante.');
  }
  const idx = chantier.etapes.findIndex((e) => e.etat === 'en_attente');
  if (idx === -1) {
    throw new ErreurApi(409, 'Aucune étape en attente : tout est lancé, validé ou terminé.');
  }
  const etape = chantier.etapes[idx];
  const equipe = await lireEquipe();
  const agent = trouverAgentParNom(equipe, etape.agent);
  if (!agent) throw new ErreurApi(404, `Agent introuvable : ${etape.agent}`);
  const tache = await demarrerTache(agent, etape.consigne, { lien: { chantierId: chantier.id, etapeIndex: idx }, projet: chantier.projet });
  etape.etat = 'en_cours';
  etape.tacheId = tache.id;
  etape.branche = tache.branche || '';
  await sauverChantiers();
  return { chantier, tache: etatTache(tache) };
}

async function validerEtapeChantier(chantier) {
  const idx = chantier.etapes.findIndex((e) => e.etat === 'a_valider');
  if (idx === -1) {
    throw new ErreurApi(409, 'Aucune étape prête à être validée. Lance-la et attends sa fin.');
  }
  chantier.etapes[idx].etat = 'validee';
  if (chantier.etapes.every((e) => e.etat === 'validee')) chantier.etat = 'termine';
  await sauverChantiers();
  return chantier;
}

function cheminCourt(chemin, dossier) {
  if (!chemin) return '';
  const relatif = path.relative(dossier, chemin);
  if (relatif && !relatif.startsWith('..') && !path.isAbsolute(relatif)) return relatif;
  return path.basename(chemin);
}

function nommerOutil(outil, entree, dossier) {
  const fichier = entree.file_path || entree.notebook_path || entree.path;
  if (fichier) return cheminCourt(fichier, dossier);
  if (outil === 'WebSearch') return 'recherche web';
  if (outil === 'WebFetch') {
    try {
      return new URL(String(entree.url)).hostname;
    } catch {
      return 'page web';
    }
  }
  return '';
}

function evenement(tache, outil, fichier) {
  const dernier = tache.evenements[tache.evenements.length - 1];
  if (dernier && dernier.outil === outil && dernier.fichier === fichier) return;
  tache.evenements.push({ outil, fichier, temps: Date.now() });
  if (tache.evenements.length > 300) tache.evenements.splice(0, tache.evenements.length - 300);
}

function traiterLigne(tache, ligne) {
  let evenementBrut;
  try {
    evenementBrut = JSON.parse(ligne);
  } catch {
    return;
  }

  if (evenementBrut.type === 'assistant' && Array.isArray(evenementBrut.message?.content)) {
    for (const bloc of evenementBrut.message.content) {
      if (bloc.type === 'text' && typeof bloc.text === 'string' && bloc.text.trim()) {
        tache.lignes.push(bloc.text.trim());
        if (tache.lignes.length > 200) tache.lignes.splice(0, tache.lignes.length - 200);
      } else if (bloc.type === 'tool_use') {
        const entree = bloc.input && typeof bloc.input === 'object' ? bloc.input : {};
        evenement(tache, String(bloc.name || 'Outil'), nommerOutil(bloc.name, entree, tache.dossier));
      }
    }
    return;
  }

  if (evenementBrut.type === 'result') {
    tache.cout = Number(evenementBrut.total_cost_usd) || 0;
    if (typeof evenementBrut.result === 'string' && evenementBrut.result.trim()) {
      tache.rapport = evenementBrut.result.trim();
    }
    if (evenementBrut.is_error) {
      tache.erreur = tache.erreur || 'La tâche s\'est arrêtée en erreur.';
    }
    if (Array.isArray(evenementBrut.permission_denials) && evenementBrut.permission_denials.length) {
      tache.refus = evenementBrut.permission_denials.length;
    }
  }
}

async function instantane(dossier) {
  const fichiers = new Map();

  async function marcher(repertoire, prefixe) {
    let entrees;
    try {
      entrees = await fsp.readdir(repertoire, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entree of entrees) {
      if (entree.name === '.DS_Store' || entree.name === 'node_modules' || entree.name === '.git') continue;
      const absolu = path.join(repertoire, entree.name);
      const relatif = prefixe ? `${prefixe}/${entree.name}` : entree.name;
      if (entree.isDirectory()) {
        await marcher(absolu, relatif);
      } else if (entree.isFile()) {
        try {
          const stat = await fsp.stat(absolu);
          fichiers.set(relatif, { taille: stat.size, mtime: stat.mtimeMs });
        } catch {}
      }
      if (fichiers.size >= 2000) return;
    }
  }

  await marcher(dossier, '');
  return fichiers;
}

async function terminerTache(tache, code) {
  if (tache.etat !== 'en_cours') return;
  clearTimeout(tache.minuteur);
  tache.enfant = null;

  const apres = await instantane(tache.dossier);
  const crees = [];
  const modifies = [];
  for (const [relatif, info] of apres) {
    const avant = tache.avant.get(relatif);
    if (!avant) crees.push(relatif);
    else if (avant.taille !== info.taille || avant.mtime !== info.mtime) modifies.push(relatif);
  }
  tache.fichiers = {
    crees: crees.sort(),
    modifies: modifies.sort(),
  };
  tache.avant = null;

  if (tache.erreur) {
    tache.etat = 'erreur';
  } else {
    tache.etat = 'fini';
    if (!tache.rapport && tache.lignes && tache.lignes.length) {
      tache.rapport = tache.lignes.slice(-40).join('\n').trim();
    }
    if (!tache.rapport) tache.rapport = 'Tâche terminée.';
  }
  if (typeof code === 'number' && code !== 0 && !tache.erreur) {
    tache.etat = 'erreur';
    tache.erreur = `${tache.iaNom || 'L\'IA'} s'est arrêtée avec le code ${code}.`;
  }

  try {
    const saut = `
`;
    const contenu = [
      `# Compte rendu — ${tache.prenom} (${tache.poste})`,
      ``,
      `**Tâche :** ${tache.consigne}`,
      `**État :** ${tache.etat}`,
      `**Coût :** ${tache.cout ? tache.cout + ' $' : '-'}`,
      tache.projet ? `**Projet :** ${tache.projet} · **Branche :** ${tache.branche}` : '',
      ``,
      `## Résultat`,
      tache.rapport,
      ``,
      `## Fichiers`,
      ...tache.fichiers.crees.map((f) => '- créé : ' + f),
      ...tache.fichiers.modifies.map((f) => '- modifié : ' + f),
    ].join(saut);
    await fsp.writeFile(path.join(tache.dossier, 'compte-rendu.md'), contenu, 'utf8');
    if (!tache.fichiers.crees.includes('compte-rendu.md')) tache.fichiers.crees.push('compte-rendu.md');
  } catch (err) {
    console.error(`[compte-rendu] écriture impossible : ${err.message}`);
  }

  tache.fin = Date.now();
  console.log(`[tache] ${tache.nom} : ${tache.etat} (${tache.fichiers.crees.length} créé(s))`);

  await ajouterMemoire(tache.agent, tache.consigne, tache.rapport || '');
  historique.push({
    id: tache.id,
    nom: tache.nom,
    prenom: tache.prenom,
    poste: tache.poste,
    pole: tache.pole,
    projet: tache.projet || '',
    branche: tache.branche || '',
    dossier: cheminCourt(tache.dossier, PROJET),
    consigne: resumeTexte(tache.consigne, 180),
    rapport: resumeTexte(tache.rapport, 240),
    etat: tache.etat,
    debut: tache.debut,
    fin: tache.fin,
    cout: tache.cout,
    fichiers: tache.fichiers || { crees: [], modifies: [] },
  });
  if (historique.length > REGISTRE_MAX) historique = historique.slice(-REGISTRE_MAX);
  await sauverRegistre();

  if (tache.projet && tache.branche) {
    try {
      const hash = await gitOps.committer(tache.dossier, `qg(${tache.prenom}) : ${resumeTexte(tache.consigne, 60)}`);
      tache.commit = hash ? String(hash).slice(0, 12) : '';
    } catch (err) {
      console.error(`[git] commit impossible : ${err.message}`);
    }
  }

  if (tache.lien && tache.lien.chantierId) {
    const chantier = chantiers.find((c) => c.id === tache.lien.chantierId);
    const etape = chantier && chantier.etapes[tache.lien.etapeIndex];
    if (etape && etape.etat === 'en_cours') {
      etape.etat = 'a_valider';
      await sauverChantiers();
    }
  }
}

function traiterLigneKimi(tache, ligne) {
  let bloc;
  try {
    bloc = JSON.parse(ligne);
  } catch {
    return;
  }
  if (bloc.role !== 'assistant') return;
  if (typeof bloc.content === 'string' && bloc.content.trim()) {
    tache.lignes.push(bloc.content.trim());
    tache.rapport = bloc.content.trim();
  }
  if (Array.isArray(bloc.tool_calls)) {
    for (const appel of bloc.tool_calls) {
      const nom = appel?.function?.name || 'Outil';
      let argumentsOutil = {};
      try {
        argumentsOutil = JSON.parse(appel?.function?.arguments || '{}');
      } catch {}
      const cible =
        argumentsOutil.path || argumentsOutil.file_path || argumentsOutil.notebook_path || '';
      evenement(tache, String(nom), String(cible));
    }
  }
}

function traiterLigneCLI(tache, ligne) {
  const outil = ligne.match(/^←\s+(\S+)(?:\s+(.+))?$/);
  if (outil) {
    evenement(tache, outil[1], (outil[2] || '').trim());
    return;
  }
  if (!ligne || ligne.startsWith('>') || ligne.startsWith('•') || ligne.startsWith('INFO ')) return;
  if (/^(Wrote|Read|Ran|Created|Updated|Deleted|Edited|Executed|Bash)\b/i.test(ligne)) return;
  tache.lignes.push(ligne);
}

function lancerTache(tache) {
  const ia = iaActive();
  tache.ia = ia.id;
  tache.iaNom = ia.nom;
  const infoTache = { projet: tache.projet, branche: tache.branche, terminal: tache.terminal };
  const outilsTache = tache.terminal ? `${OUTILS},Bash` : OUTILS;
  let args;
  if (ia.id === 'claude') {
    args = [
      '-p', tache.consigne,
      '--output-format', 'stream-json',
      '--verbose',
      '--model', MODELE,
      '--tools', outilsTache,
      '--allowedTools', outilsTache,
      '--permission-mode', 'acceptEdits',
      '--permission-prompts', 'none',
      '--max-budget-usd', BUDGET,
      '--no-session-persistence',
      '--strict-mcp-config',
      '--settings', REGLAGES,
      '--append-system-prompt', consigneSysteme(tache.agent, tache.memoire, infoTache),
    ];
  } else {
    const invite = `${tache.consigne}\n\n${consigneSysteme(tache.agent, tache.memoire, infoTache)}`;
    if (ia.genre === 'opencode') {
      args = ia.id === 'opencode' ? ['run', '-m', MODELE_OPENCODE, invite] : ['run', invite];
    } else if (ia.genre === 'codex') {
      args = ['exec', '--sandbox', 'workspace-write', invite];
    } else if (ia.genre === 'kimi') {
      args = ['-p', invite, '--output-format', 'stream-json'];
    } else if (ia.genre === 'ollama') {
      args = ['run', MODELE_OLLAMA, invite];
    } else if (ia.genre === 'gemini') {
      args = ['-y', '-p', invite];
    } else {
      args = [invite];
    }
  }

  let enfant;
  try {
    enfant = spawn(ia.cmd, args, {
      cwd: tache.dossier,
      env: envIA(ia),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    tache.erreur = `${ia.nom} est introuvable sur cet ordinateur.`;
    tache.etat = 'erreur';
    tache.fin = Date.now();
    return;
  }

  enfants.add(enfant);
  tache.enfant = enfant;

  tache.minuteur = setTimeout(() => {
    if (tache.etat !== 'en_cours') return;
    tache.erreur = 'La tâche a dépassé 15 minutes, elle a été arrêtée.';
    try { enfant.kill('SIGTERM'); } catch {}
    setTimeout(() => {
      try { enfant.kill('SIGKILL'); } catch {}
      terminerTache(tache, null);
    }, 4000);
  }, DUREE_MAX_TACHE);

  let tampon = '';
  enfant.stdout.setEncoding('utf8');
  enfant.stdout.on('data', (morceau) => {
    tampon += morceau;
    let index;
    while ((index = tampon.indexOf('\n')) >= 0) {
      const ligne = tampon.slice(0, index).trim();
      tampon = tampon.slice(index + 1);
      if (ligne) {
        if (ia.genre === 'claude') traiterLigne(tache, ligne);
        else if (ia.genre === 'kimi') traiterLigneKimi(tache, ligne);
        else traiterLigneCLI(tache, ligne);
      }
    }
  });

  let erreur = '';
  enfant.stderr.setEncoding('utf8');
  enfant.stderr.on('data', (morceau) => {
    erreur += morceau;
    if (erreur.length > 4000) erreur = erreur.slice(-2000);
  });

  enfant.on('error', (err) => {
    enfants.delete(enfant);
    tache.erreur = err.code === 'ENOENT'
      ? `${ia.nom} est introuvable sur cet ordinateur.`
      : `Impossible de lancer ${ia.nom}.`;
    terminerTache(tache, null);
  });

  enfant.on('close', (code) => {
    enfants.delete(enfant);
    if (tampon.trim()) {
      if (ia.genre === 'claude') traiterLigne(tache, tampon.trim());
      else traiterLigneCLI(tache, tampon.trim());
    }
    tampon = '';
    if (code !== 0 && !tache.erreur) {
      tache.erreur = `${ia.nom} s'est arrêté avant la fin de la tâche.`;
    }
    if (erreur.trim()) console.error(`[ia] ${erreur.trim().slice(0, 600)}`);
    terminerTache(tache, code);
  });
}

function etatTache(tache) {
  return {
    id: tache.id,
    nom: tache.nom,
    prenom: tache.prenom,
    poste: tache.poste,
    pole: tache.pole,
    lieu: tache.lieu,
    ia: tache.iaNom || '',
    consigne: tache.consigne,
    dossier: cheminCourt(tache.dossier, PROJET),
    projet: tache.projet || '',
    branche: tache.branche || '',
    commit: tache.commit || '',
    etat: tache.etat,
    debut: tache.debut,
    fin: tache.fin,
    cout: tache.cout,
    evenements: tache.evenements.slice(-150),
    rapport: tache.rapport,
    texte: tache.lignes ? tache.lignes.slice(-40) : [],
    fichiers: tache.fichiers,
    erreur: tache.erreur,
  };
}

function trouverTache(id) {
  const active = taches.get(id);
  if (active) return { dossier: active.dossier };
  const fini = historique.find((h) => h.id === id);
  if (fini && fini.dossier) return { dossier: path.resolve(PROJET, fini.dossier) };
  return null;
}

function tachesActives() {
  return [...taches.values()]
    .filter((t) => t.etat === 'en_cours')
    .map((t) => ({
      id: t.id,
      nom: t.nom,
      prenom: t.prenom,
      poste: t.poste,
      pole: t.pole,
      consigne: resumeTexte(t.consigne, 180),
      etat: t.etat,
      debut: t.debut,
      cout: t.cout,
      dossier: `live/travaux/${t.agent.slug}`,
    }));
}

function resumeTexte(texte, max) {
  return String(texte || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function tachesTerminees() {
  const recents = [...taches.values()]
    .filter((t) => t.etat !== 'en_cours' && t.fin)
    .sort((a, b) => b.fin - a.fin)
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      nom: t.nom,
      prenom: t.prenom,
      poste: t.poste,
      pole: t.pole,
      consigne: resumeTexte(t.consigne, 180),
      rapport: resumeTexte(t.rapport, 240),
      etat: t.etat,
      debut: t.debut,
      fin: t.fin,
      cout: t.cout,
      fichiers: t.fichiers || { crees: [], modifies: [] },
    }));

  const vus = new Set(recents.map((t) => t.id));
  const fusion = recents.slice();
  for (const entree of historique) {
    if (vus.has(entree.id)) continue;
    fusion.push(entree);
    vus.add(entree.id);
  }
  fusion.sort((a, b) => (b.fin || 0) - (a.fin || 0));
  return fusion.slice(0, 12);
}

function listerOutils() {
  const maintenant = Date.now();
  if (maintenant - cacheOutils.quand < 60 * 1000) return Promise.resolve(cacheOutils.outils);

  return new Promise((resolve) => {
    execFile(
      CLI,
      ['mcp', 'list'],
      { timeout: 20000, maxBuffer: 2 * 1024 * 1024, env: process.env },
      (err, stdout) => {
        const propre = String(stdout || '')
          .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
          .replace(/\r/g, '');
        const outils = [];
        const vus = new Set();
        for (const ligne of propre.split('\n')) {
          const trouve = ligne.match(/^\s*([A-Za-z0-9][A-Za-z0-9._-]{0,31}):\s*(.+)$/);
          if (!trouve) continue;
          const nom = trouve[1].trim();
          const reste = trouve[2];
          if (!nom || vus.has(nom.toLowerCase())) continue;
          if (/^(checking|no|servers?|error|erreur|warning|info)$/i.test(nom)) continue;
          const ok = /(✓|connected|connecté)/i.test(reste);
          const ko = /(✗|failed|erreur|error|unable|introuvable)/i.test(reste);
          if (!ok && !ko) continue;
          vus.add(nom.toLowerCase());
          outils.push({ nom, etat: ko ? 'ko' : 'ok' });
        }
        cacheOutils = { quand: maintenant, outils };
        resolve(outils);
      }
    );
  });
}

function detecterIA() {
  const maintenant = Date.now();
  if (maintenant - cacheIA.quand < 60 * 1000) return Promise.resolve(cacheIA.candidates);

  const sondes = IA_CONNUS.map((c) => {
    if (c.genre === 'qoder') {
      return new Promise((res) => {
        execFile('which', ['qoder'], { timeout: 5000 }, (err) => {
          const application = fs.existsSync(APP_QODER);
          res({ id: c.id, nom: c.nom, installe: !err || application, application: !err ? false : application });
        });
      });
    }
    return new Promise((res) => {
      execFile('which', [c.cmd], { timeout: 5000 }, (err) => {
        res({ id: c.id, nom: c.nom, installe: !err });
      });
    });
  });

  const sondesCustoms = iaCustoms.map(
    (c) =>
      new Promise((res) => {
        execFile('which', [c.cmd], { timeout: 5000 }, (err) => {
          res({
            id: c.id,
            nom: c.nom,
            installe: !err,
            perso: true,
            commande: c.cmd,
            envVar: c.envVar || '',
            cle: cleMasquee(c.cle),
          });
        });
      })
  );

  return Promise.all([...sondes, ...sondesCustoms]).then((candidates) => {
    cacheIA = { quand: maintenant, candidates };
    return candidates;
  });
}

async function choisirIA(id) {
  const c = trouverIA(id);
  if (!c) throw new ErreurApi(400, 'IA inconnue.');
  iaChoisie = id;
  cacheIA.quand = 0;
  await ecrireReglages();
}

async function ajouterIA({ nom, commande, envVar, cle }) {
  if (!/^[^\n]{1,40}$/.test(String(nom || '').trim())) throw new ErreurApi(400, 'Nom requis (40 caractères max).');
  if (!/^[A-Za-z0-9][A-Za-z0-9._\/-]{0,119}$/.test(String(commande || ''))) {
    throw new ErreurApi(400, 'Commande invalide : un seul mot, sans espace ni caractère spécial.');
  }
  if (envVar && !/^[A-Za-z_][A-Za-z0-9_]{0,59}$/.test(String(envVar))) {
    throw new ErreurApi(400, 'Nom de variable invalide.');
  }
  if (cle && String(cle).length > 200) throw new ErreurApi(400, 'Clé trop longue.');

  const nomNet = String(nom).trim();
  const existante = iaCustoms.find((c) => c.nom.toLowerCase() === nomNet.toLowerCase());
  const entree = {
    id: existante ? existante.id : `perso-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    nom: nomNet,
    cmd: String(commande),
    envVar: envVar ? String(envVar) : '',
    cle: cle ? String(cle) : (existante ? existante.cle : ''),
  };
  if (existante) Object.assign(existante, entree);
  else iaCustoms.push(entree);

  await new Promise((res) => {
    execFile('which', [entree.cmd], { timeout: 5000 }, () => res());
  });
  cacheIA.quand = 0;
  await ecrireReglages();
  return { id: entree.id, nom: entree.nom };
}

async function retirerIA(id) {
  const avant = iaCustoms.length;
  iaCustoms = iaCustoms.filter((c) => c.id !== id);
  if (iaCustoms.length === avant) throw new ErreurApi(404, 'Cette IA ne fait pas partie des IA ajoutées.');
  if (iaChoisie === id) iaChoisie = 'claude';
  cacheIA.quand = 0;
  await ecrireReglages();
}

function dernierCommit(dossier) {
  return new Promise((res) => {
    execFile('git', ['-C', dossier, 'log', '-1', '--format=%ct'], { timeout: 5000 }, (err, stdout) => {
      res(err ? 0 : (Number(String(stdout).trim()) || 0) * 1000);
    });
  });
}

async function listerProjets() {
  const maintenant = Date.now();
  if (maintenant - cacheProjets.quand < 30 * 1000) return cacheProjets.projets;

  let entrees;
  try {
    entrees = await fsp.readdir(RACINE_PROJETS, { withFileTypes: true });
  } catch {
    return [];
  }

  const dossiers = entrees
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .slice(0, 60)
    .map((e) => path.join(RACINE_PROJETS, e.name));

  const projets = await Promise.all(
    dossiers.map(async (d) => {
      const projet = { nom: path.basename(d), type: 'Dossier', modifie: 0 };
      try {
        const stat = await fsp.stat(d);
        projet.modifie = stat.mtimeMs;
      } catch {}
      for (const [fichier, type] of [
        ['package.json', 'Node'],
        ['pubspec.yaml', 'Flutter'],
        ['pyproject.toml', 'Python'],
        ['requirements.txt', 'Python'],
        ['composer.json', 'PHP'],
      ]) {
        try {
          await fsp.access(path.join(d, fichier));
          projet.type = type;
          break;
        } catch {}
      }
      const commit = await dernierCommit(d);
      if (commit > projet.modifie) projet.modifie = commit;
      return projet;
    })
  );

  projets.sort((a, b) => b.modifie - a.modifie);
  cacheProjets = { quand: maintenant, projets };
  return projets;
}

async function demarrerTache(agent, consigne, options = {}) {
  const enCours = [...taches.values()].filter((t) => t.etat === 'en_cours');
  if (enCours.length >= MAX_TACHES) {
    throw new ErreurApi(429, `Les ${MAX_TACHES} tâches simultanées sont déjà en cours.`);
  }
  if (enCours.some((t) => t.nom === agent.nom)) {
    throw new ErreurApi(409, `${agent.prenom} a déjà une tâche en cours.`);
  }

  const lien = options.lien || null;
  const terminal = !!options.terminal;
  const projetNom = options.projet ? texteCourt(options.projet, 80) : '';

  let dossier = path.join(TRAVAUX, agent.slug);
  let projet = '';
  let branche = '';

  if (projetNom) {
    const chemin = path.join(RACINE_PROJETS, projetNom);
    const stat = await fsp.stat(chemin).catch(() => null);
    if (stat && stat.isDirectory() && (await gitOps.estRepo(chemin))) {
      try {
        const prep = await gitOps.preparerBranche(chemin, agent.slug);
        dossier = prep.dossier;
        branche = prep.branche;
        projet = projetNom;
      } catch (err) {
        console.error(`[git] worktree impossible pour ${projetNom} : ${err.message}`);
      }
    } else {
      console.error(`[git] ${projetNom} n'est pas un dépôt git lisible — repli sur le bac à sable.`);
    }
  }

  await fsp.mkdir(dossier, { recursive: true });
  const avant = await instantane(dossier);
  const memoire = lireMemoire(agent);

  const tache = {
    id: crypto.randomUUID(),
    nom: agent.nom,
    prenom: agent.prenom,
    poste: agent.poste,
    pole: agent.pole,
    lieu: agent.lieu,
    agent,
    memoire,
    dossier,
    consigne,
    lien,
    projet,
    branche,
    terminal,
    etat: 'en_cours',
    debut: Date.now(),
    fin: null,
    cout: 0,
    evenements: [],
    lignes: [],
    rapport: '',
    fichiers: { crees: [], modifies: [] },
    erreur: '',
    refus: 0,
    avant,
    enfant: null,
    minuteur: null,
  };

  taches.set(tache.id, tache);
  console.log('[tache] ' + agent.prenom + ' démarre' + (projet ? ' sur ' + projet + ' (' + branche + ')' : '') + ' : ' + consigne.slice(0, 80));
  lancerTache(tache);
  return tache;
}

function jetonPont() {
  try {
    return fs.readFileSync(path.join(__dirname, 'pont-jeton.txt'), 'utf8').trim() || null;
  } catch {
    return null;
  }
}

async function demanderAuPont(dossier) {
  const jeton = jetonPont();
  if (!jeton) {
    throw new ErreurApi(503, 'Le pont Mac n\'est pas prêt : lance-le avec « node live/pont-mac.js ».');
  }
  let reponse;
  try {
    reponse = await fetch(`${PONT}/ouvrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier, jeton }),
    });
  } catch {
    throw new ErreurApi(503, 'Le pont Mac n\'est pas lancé. Dans un terminal : node live/pont-mac.js');
  }
  let donnees = null;
  try { donnees = await reponse.json(); } catch {}
  if (!reponse.ok) {
    throw new ErreurApi(reponse.status === 403 ? 403 : 502, donnees?.erreur || 'Le Finder ne s\'est pas ouvert.');
  }
}

async function gererApi(req, res, chemin) {
  const jeton = req.headers['x-qg-jeton'];
  if (!jetonValide(jeton)) {
    json(res, 403, { erreur: 'Demande refusée.' });
    return;
  }
  if (req.method === 'POST' && !ORIGINES.has(String(req.headers.origin || ''))) {
    json(res, 403, { erreur: 'Demande refusée.' });
    return;
  }

  if (req.method === 'GET' && chemin === '/api/taches') {
    json(res, 200, { taches: tachesActives(), termine: tachesTerminees() });
    return;
  }

  if (req.method === 'GET' && chemin === '/api/equipe') {
    const equipe = await lireEquipe();
    const agents = [...equipe.agents.values()].map((a) => ({
      nom: a.nom,
      prenom: a.prenom,
      poste: a.poste,
      pole: a.pole,
      lieu: a.lieu,
      missions: a.missions,
      outils: a.outils,
    }));
    json(res, 200, { agents });
    return;
  }

  if (req.method === 'GET' && chemin === '/api/outils') {
    const outils = await listerOutils();
    json(res, 200, { outils });
    return;
  }

  if (req.method === 'GET' && chemin === '/api/ia') {
    const candidates = await detecterIA();
    json(res, 200, { ia: iaChoisie, iaNom: iaActive().nom, candidates });
    return;
  }

  if (req.method === 'POST' && chemin === '/api/ia') {
    const corps = await corpsJson(req);
    const id = texteCourt(corps.ia, 40);
    if (!id) throw new ErreurApi(400, 'IA requise.');
    const candidates = await detecterIA();
    const choisie = candidates.find((c) => c.id === id && c.installe && !c.application);
    if (!choisie) throw new ErreurApi(400, 'Cette IA n\'est pas pilotable depuis le QG.');
    await choisirIA(id);
    json(res, 200, { ia: id, iaNom: choisie.nom });
    return;
  }

  if (req.method === 'POST' && chemin === '/api/ia/ajouter') {
    const corps = await corpsJson(req);
    const creee = await ajouterIA({
      nom: texteCourt(corps.nom, 40),
      commande: texteCourt(corps.commande, 120),
      envVar: texteCourt(corps.envVar, 60),
      cle: typeof corps.cle === 'string' ? corps.cle.slice(0, 200) : '',
    });
    json(res, 201, creee);
    return;
  }

  if (req.method === 'POST' && chemin === '/api/ia/retirer') {
    const corps = await corpsJson(req);
    const id = texteCourt(corps.ia, 40);
    if (!id) throw new ErreurApi(400, 'IA requise.');
    await retirerIA(id);
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && chemin === '/api/projets') {
    const projets = await listerProjets();
    json(res, 200, { projets, racine: path.basename(RACINE_PROJETS) });
    return;
  }

  const cheminHote = (p) => {
    if (HOTE_APP) return p.replace(PROJET, HOTE_APP);
    return p;
  };
  const ouvertureProjet = chemin === '/api/projet/ouvrir';
  if (req.method === 'POST' && ouvertureProjet) {
    const corps = await corpsJson(req);
    const nom = texteCourt(corps.nom, 80);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(nom)) throw new ErreurApi(403, 'Projet refusé.');
    const dossier = path.join(RACINE_PROJETS, nom);
    const stat = await fsp.stat(dossier).catch(() => null);
    if (!stat || !stat.isDirectory()) throw new ErreurApi(404, 'Projet introuvable.');
    if (PONT) {
      await demanderAuPont(HOTE_PROJETS ? path.join(HOTE_PROJETS, nom) : dossier);
      json(res, 200, { ok: true });
      return;
    }
    const commande = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    await new Promise((resolve, reject) => {
      execFile(commande, [dossier], (err) => (err ? reject(new ErreurApi(500, 'Impossible d\'ouvrir le dossier.')) : resolve()));
    });
    json(res, 200, { ok: true });
    return;
  }

  const ouverture = chemin.match(/^\/api\/tache\/([0-9a-f-]+)\/ouvrir$/);
  if (req.method === 'POST' && ouverture) {
    const tache = taches.get(ouverture[1]);
    if (!tache) throw new ErreurApi(404, 'Tâche introuvable.');
    if (!tache.dossier.startsWith(TRAVAUX + path.sep)) throw new ErreurApi(403, 'Dossier refusé.');
    if (PONT) {
      await demanderAuPont(cheminHote(tache.dossier));
      json(res, 200, { ok: true });
      return;
    }
    const commande = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    await new Promise((resolve, reject) => {
      execFile(commande, [tache.dossier], (err) => (err ? reject(new ErreurApi(500, 'Impossible d\'ouvrir le dossier.')) : resolve()));
    });
    json(res, 200, { ok: true });
    return;
  }

  const fichierTache = chemin.match(/^\/api\/tache\/([0-9a-f-]+)\/fichier$/);
  if (req.method === 'GET' && fichierTache) {
    const info = trouverTache(fichierTache[1]);
    if (!info) throw new ErreurApi(404, 'Tâche introuvable.');
    const dossier = info.dossier;
    const url = new URL(req.url, `http://${HOST}`);
    const relatif = texteCourt(url.searchParams.get('chemin') || '', 500);
    if (!relatif) throw new ErreurApi(400, 'Chemin de fichier requis.');
    const cible = path.resolve(dossier, relatif);
    if (cible !== dossier && !cible.startsWith(dossier + path.sep)) {
      throw new ErreurApi(403, 'Fichier refusé.');
    }
    if (cible !== TRAVAUX && !cible.startsWith(TRAVAUX + path.sep)) {
      throw new ErreurApi(403, 'Fichier refusé.');
    }
    const stat = await fsp.stat(cible).catch(() => null);
    if (!stat || !stat.isFile()) throw new ErreurApi(404, 'Fichier introuvable.');
    if (stat.size > 200 * 1024) throw new ErreurApi(413, 'Fichier trop lourd à afficher (200 Ko max).');
    const contenu = await fsp.readFile(cible, 'utf8');
    json(res, 200, { chemin: relatif, contenu });
    return;
  }

  const detail = chemin.match(/^\/api\/tache\/([0-9a-f-]+)$/);
  if (req.method === 'GET' && detail) {
    const tache = taches.get(detail[1]);
    if (!tache) throw new ErreurApi(404, 'Tâche introuvable.');
    json(res, 200, etatTache(tache));
    return;
  }

  if (req.method === 'POST' && chemin === '/api/discuter') {
    const corps = await corpsJson(req);
    const nom = texteCourt(corps.nom, 80);
    const message = texteCourt(corps.message, 2000);
    if (!nom || !message) throw new ErreurApi(400, 'Agent et message requis.');

    const equipe = await lireEquipe();
    const agent = equipe.agents.get(nom);
    if (!agent) throw new ErreurApi(404, 'Agent inconnu.');

    const historique = [];
    if (Array.isArray(corps.historique)) {
      for (const tour of corps.historique.slice(-12)) {
        if (!tour || typeof tour !== 'object') continue;
        const role = tour.role === 'agent' ? 'agent' : 'dg';
        const contenu = texteCourt(tour.contenu, 2000);
        if (contenu) historique.push({ role, contenu });
      }
    }

    const reponse = await discuter(agent, message, historique);
    json(res, 200, reponse);
    return;
  }

  if (req.method === 'POST' && chemin === '/api/reunion') {
    const corps = await corpsJson(req);
    const sujet = texteCourt(corps.sujet, 300);
    if (!sujet) throw new ErreurApi(400, 'Sujet requis.');
    const noms = Array.isArray(corps.participants)
      ? corps.participants.slice(0, 8).map((n) => texteCourt(n, 80)).filter(Boolean)
      : [];
    if (!noms.length) throw new ErreurApi(400, 'Participants requis.');
    const compteRendu = await tenirReunion(sujet, noms);
    json(res, 200, compteRendu);
    return;
  }

  if (req.method === 'POST' && chemin === '/api/mission') {
    const corps = await corpsJson(req);
    const idee = texteCourt(corps.idee, 3000);
    if (!idee) throw new ErreurApi(400, 'Décris ton idée ou ta mission.');
    const plan = await planifierMission(idee);
    json(res, 200, plan);
    return;
  }

  if (req.method === 'POST' && chemin === '/api/mission/lancer') {
    const corps = await corpsJson(req);
    const taches = Array.isArray(corps.taches) ? corps.taches.slice(0, MAX_TACHES) : [];
    if (!taches.length) throw new ErreurApi(400, 'Aucune tâche à lancer.');
    const resultat = await lancerMission(taches);
    json(res, 202, resultat);
    return;
  }

  if (req.method === 'GET' && chemin === '/api/chantiers') {
    json(res, 200, { chantiers });
    return;
  }

  if (req.method === 'POST' && chemin === '/api/chantier') {
    const corps = await corpsJson(req);
    const idee = texteCourt(corps.idee, 3000);
    if (!idee) throw new ErreurApi(400, 'Décris ton idée ou ta mission.');
    const projet = texteCourt(corps.projet, 80);
    const chantier = await creerChantier(idee, projet);
    json(res, 201, chantier);
    return;
  }

  const lancerChantier = chemin.match(/^\/api\/chantier\/([0-9a-f-]+)\/lancer$/);
  if (req.method === 'POST' && lancerChantier) {
    const chantier = chantiers.find((c) => c.id === lancerChantier[1]);
    if (!chantier) throw new ErreurApi(404, 'Chantier introuvable.');
    const resultat = await lancerEtapeChantier(chantier);
    json(res, 202, resultat);
    return;
  }

  const validerChantier = chemin.match(/^\/api\/chantier\/([0-9a-f-]+)\/valider$/);
  if (req.method === 'POST' && validerChantier) {
    const chantier = chantiers.find((c) => c.id === validerChantier[1]);
    if (!chantier) throw new ErreurApi(404, 'Chantier introuvable.');
    const maj = await validerEtapeChantier(chantier);
    json(res, 200, maj);
    return;
  }

  const detailChantier = chemin.match(/^\/api\/chantier\/([0-9a-f-]+)$/);
  if (req.method === 'GET' && detailChantier) {
    const chantier = chantiers.find((c) => c.id === detailChantier[1]);
    if (!chantier) throw new ErreurApi(404, 'Chantier introuvable.');
    json(res, 200, chantier);
    return;
  }

  if (req.method === 'POST' && chemin === '/api/tache') {
    const corps = await corpsJson(req);
    const nom = texteCourt(corps.nom, 80);
    const consigne = texteCourt(corps.consigne, 4000);
    if (!nom || !consigne) throw new ErreurApi(400, 'Agent et consigne requis.');

    const equipe = await lireEquipe();
    const agent = equipe.agents.get(nom);
    if (!agent) throw new ErreurApi(404, 'Agent inconnu.');

    if (agent.pole === 'Direction Générale') {
      const plan = await planifierMission(consigne);
      const resultat = await lancerMission(plan.taches);
      json(res, 202, {
        delegue: true,
        objectif: plan.objectif,
        taches: plan.taches,
        lancees: resultat.lancees,
        refus: resultat.refus,
      });
      return;
    }

    const tache = await demarrerTache(agent, consigne, {
      projet: texteCourt(corps.projet, 80),
      terminal: !!corps.terminal,
    });
    json(res, 202, etatTache(tache));
    return;
  }

  json(res, 404, { erreur: 'Route inconnue.' });
}

function servirFichier(req, res, chemin) {
  fs.stat(chemin, (err, stats) => {
    if (err) return repondre(res, 404, 'Page introuvable');

    let fichier = chemin;
    if (stats.isDirectory()) {
      fichier = path.join(chemin, 'index.html');
      if (!fs.existsSync(fichier)) return repondre(res, 404, 'Page introuvable');
    }

    fs.stat(fichier, (err2, stats2) => {
      if (err2 || !stats2.isFile()) return repondre(res, 404, 'Page introuvable');

      const entetes = {
        'Content-Type': MIME[path.extname(fichier).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      };

      if (fichier === path.join(RACINE, 'index.html')) {
        fs.readFile(fichier, 'utf8', (err3, page) => {
          if (err3) return repondre(res, 500, 'Lecture impossible');
          const html = page.replaceAll('__JETON__', JETON);
          res.writeHead(200, { ...entetes, 'Content-Length': Buffer.byteLength(html) });
          if (req.method === 'HEAD') return res.end();
          res.end(html);
        });
        return;
      }

      res.writeHead(200, { ...entetes, 'Content-Length': stats2.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(fichier)
        .on('error', () => res.destroy())
        .pipe(res);
    });
  });
}

const serveur = http.createServer(async (req, res) => {
  const hote = String(req.headers.host || '').toLowerCase();
  if (!HOSTS.has(hote)) return repondre(res, 403, 'Accès refusé');

  let cheminUrl;
  try {
    cheminUrl = decodeURIComponent(new URL(req.url, `http://${HOST}`).pathname);
  } catch {
    return repondre(res, 400, 'Requête invalide');
  }

  if (cheminUrl.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return repondre(res, 405, 'Méthode non autorisée', { Allow: 'GET, POST' });
    }
    try {
      await gererApi(req, res, cheminUrl);
    } catch (err) {
      if (res.headersSent) return;
      if (err instanceof ErreurApi) return json(res, err.code, { erreur: err.message });
      console.error(err);
      return json(res, 500, { erreur: 'Erreur interne.' });
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return repondre(res, 405, 'Méthode non autorisée', { Allow: 'GET, HEAD' });
  }

  if (cheminUrl === '/') cheminUrl = '/index.html';

  const chemin = path.resolve(RACINE, '.' + cheminUrl);
  if (chemin !== RACINE && !chemin.startsWith(RACINE + path.sep)) {
    return repondre(res, 403, 'Accès refusé');
  }

  servirFichier(req, res, chemin);
});

function arreter() {
  for (const enfant of enfants) {
    try { enfant.kill('SIGTERM'); } catch {}
  }
  for (const tache of taches.values()) clearTimeout(tache.minuteur);
  process.exit(0);
}

process.on('SIGINT', arreter);
process.on('SIGTERM', arreter);

setInterval(() => {
  const limite = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, tache] of taches) {
    if (tache.etat !== 'en_cours' && tache.fin && tache.fin < limite) taches.delete(id);
  }
}, 10 * 60 * 1000).unref();

serveur.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Le port ${PORT} est déjà utilisé. Lance avec PORT=4174 node live/server.js`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

chargerRegistre();
chargerChantiers();

serveur.listen(PORT, HOST, () => {
  console.log(`QG en ligne sur http://${HOST}:${PORT}/`);
  console.log('Seul cet ordinateur peut y accéder. Ctrl+C pour arrêter.');
  console.log(`Claude Code : ${CLI} - discussions sans outil - tâches ${MODELE} plafonnées à ${BUDGET} $.`);
  console.log(`Mémoire par agent dans live/memoire/ · registre ${historique.length} travaux dans live/registre/travaux.json`);
});
