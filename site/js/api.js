const JETON = document.querySelector('meta[name="qg-jeton"]')?.content || '';

export async function appel(chemin, corps) {
  const entetes = { 'X-QG-Jeton': JETON };
  const options = { headers: entetes };
  if (corps !== undefined) {
    options.method = 'POST';
    entetes['Content-Type'] = 'application/json';
    options.body = JSON.stringify(corps);
  }
  let reponse;
  try {
    reponse = await fetch(chemin, options);
  } catch {
    throw new Error(
      'Le serveur du QG est injoignable. Lance-le avec « node live/server.js » puis ouvre http://127.0.0.1:4173/'
    );
  }
  let donnees = null;
  try {
    donnees = await reponse.json();
  } catch {}
  if (!reponse.ok) {
    throw new Error(donnees?.erreur || 'Le serveur n\'a pas répondu.');
  }
  return donnees;
}
