export function prenomDe(nom) {
  return String(nom).split(/\s+/)[0];
}

export function slugifier(texte) {
  return String(texte)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'agent';
}

export function formaterCout(cout) {
  const valeur = Number(cout) || 0;
  return valeur > 0 ? `${valeur.toFixed(2)} $` : '';
}

export function texteLisible(texte) {
  return String(texte).replace(/\*\*/g, '').replace(/`/g, '');
}

export function formaterDuree(ms) {
  const secondes = Math.max(0, Math.round(ms / 1000));
  if (secondes < 60) return `${secondes} s`;
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  return `${heures} h ${minutes % 60}`;
}
