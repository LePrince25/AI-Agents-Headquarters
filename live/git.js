// Opérations git sûres pour les chantiers : le serveur prépare une branche
// dans un worktree isolé, l'agent écrit dedans, puis le serveur committe.
const { execFile } = require('node:child_process');
const path = require('node:path');

const TRAVAUX = path.join(__dirname, 'travaux');

function git(repo, args) {
  return new Promise((resolve, reject) => {
    execFile('git', ['-C', repo, ...args], { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(String((stderr && stderr.toString()) || (err && err.message) || '').trim()));
      else resolve(String(stdout || '').trim());
    });
  });
}

async function estRepo(dossier) {
  try {
    await git(dossier, ['rev-parse', '--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}

function nomBranche(slug) {
  return `qg/${slug}-${Date.now().toString(36)}`;
}

async function preparerBranche(projet, slug, base = TRAVAUX) {
  const branche = nomBranche(slug);
  const dossier = path.join(base, slug, 'projet-' + branche.replace(/\//g, '-'));
  await git(projet, ['worktree', 'add', '-b', branche, dossier]);
  return { branche, dossier };
}

async function committer(worktree, message) {
  const statut = await git(worktree, ['status', '--porcelain']);
  if (!statut) return null;
  await git(worktree, ['add', '-A']);
  await new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      GIT_AUTHOR_NAME: 'LePrince WorkLand',
      GIT_AUTHOR_EMAIL: 'qg@localhost',
      GIT_COMMITTER_NAME: 'LePrince WorkLand',
      GIT_COMMITTER_EMAIL: 'qg@localhost',
    };
    execFile('git', ['-C', worktree, 'commit', '-m', message], { timeout: 30000, env }, (err) => {
      if (err) reject(new Error(String((err && err.message) || '').trim()));
      else resolve();
    });
  });
  return git(worktree, ['rev-parse', 'HEAD']);
}

module.exports = { estRepo, preparerBranche, committer };
