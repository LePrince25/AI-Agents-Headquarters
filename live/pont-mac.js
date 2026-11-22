// Pont Mac : le conteneur Docker lui demande d'ouvrir le Finder,
// et rien ne s'ouvre sans ta confirmation a l'ecran.
// A lancer sur le Mac : node live/pont-mac.js

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

if (process.platform !== 'darwin') {
  console.error('Ce pont se lance sur le Mac, pas ailleurs.');
  process.exit(1);
}

const PORT = Number(process.env.PONT_PORT) || 4174;
const RACINE = path.join(process.env.HOME || process.env.USERPROFILE || '~', 'dev');
const FICHIER_JETON = path.join(__dirname, 'pont-jeton.txt');

let jeton = '';
try {
  jeton = fs.readFileSync(FICHIER_JETON, 'utf8').trim();
} catch {}
if (!jeton) {
  jeton = crypto.randomBytes(24).toString('base64url');
  fs.writeFileSync(FICHIER_JETON, jeton, { mode: 0o600 });
}

function echapper(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function confirmer(dossier) {
  const script =
    `display dialog "LePrince WorkLand, dans Docker, veut ouvrir ce dossier dans le Finder :" & return & "${echapper(dossier)}" ` +
    'with title "LePrince WorkLand" buttons {"Refuser", "Ouvrir"} default button "Ouvrir" giving up after 30';
  return new Promise((resoudre) => {
    execFile('osascript', ['-e', script], (err, sortie) => {
      resoudre(!err && /Ouvrir/.test(String(sortie)));
    });
  });
}

function lireCorps(req) {
  return new Promise((resoudre, rejeter) => {
    let corps = '';
    req.on('data', (morceau) => {
      corps += morceau;
      if (corps.length > 4096) {
        req.destroy();
        rejeter(new Error('trop gros'));
      }
    });
    req.on('end', () => resoudre(corps));
    req.on('error', rejeter);
  });
}

const serveur = http.createServer(async (req, res) => {
  const repondre = (code, corps) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(corps));
  };

  if (req.method !== 'POST' || req.url !== '/ouvrir') return repondre(404, { erreur: 'Inconnu.' });

  let donnees;
  try {
    donnees = JSON.parse(await lireCorps(req));
  } catch {
    return repondre(400, { erreur: 'Requête invalide.' });
  }
  if (String(donnees.jeton || '') !== jeton) return repondre(403, { erreur: 'Demande refusée.' });

  const dossier = path.resolve(String(donnees.dossier || ''));
  if (dossier !== RACINE && !dossier.startsWith(RACINE + path.sep)) {
    return repondre(403, { erreur: 'Dossier refusé.' });
  }
  const stat = fs.statSync(dossier, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory()) return repondre(404, { erreur: 'Dossier introuvable.' });

  const accepte = await confirmer(dossier);
  if (!accepte) return repondre(403, { erreur: 'Ouverture refusée.' });

  execFile('open', [dossier], (err) =>
    repondre(err ? 500 : 200, err ? { erreur: "Impossible d'ouvrir le dossier." } : { ok: true })
  );
});

serveur.listen(PORT, '0.0.0.0', () => {
  console.log(`Pont Mac en écoute sur le port ${PORT} : Docker peut demander le Finder, toi seul confirmes.`);
});
