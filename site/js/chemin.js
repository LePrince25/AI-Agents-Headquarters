const MARGE = 0.34;
const PAS = 0.5;
const X0 = -24;
const X1 = 24;
const Z0 = -24;
const Z1 = 32;

function pointLibre(x, z, colliders) {
  for (const c of colliders) {
    if (c.actif === false || c.porte) continue;
    const dx = x - c.x;
    const dz = z - c.z;
    if (c.cercle) {
      if (Math.hypot(dx, dz) < c.r + MARGE) return false;
      continue;
    }
    const rot = c.rot || 0;
    if (!rot) {
      if (Math.abs(dx) < c.hw + MARGE && Math.abs(dz) < c.hd + MARGE) return false;
      continue;
    }
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const lx = cos * dx - sin * dz;
    const lz = sin * dx + cos * dz;
    if (Math.abs(lx) < c.hw + MARGE && Math.abs(lz) < c.hd + MARGE) return false;
  }
  return true;
}

export function creerChemin({ colliders }) {
  const nx = Math.ceil((X1 - X0) / PAS);
  const nz = Math.ceil((Z1 - Z0) / PAS);
  let grille = null;

  function construire() {
    grille = new Uint8Array(nx * nz);
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const x = X0 + (ix + 0.5) * PAS;
        const z = Z0 + (iz + 0.5) * PAS;
        if (!pointLibre(x, z, colliders)) grille[iz * nx + ix] = 1;
      }
    }
  }

  function cellule(x, z) {
    return { ix: Math.floor((x - X0) / PAS), iz: Math.floor((z - Z0) / PAS) };
  }

  function centre(ix, iz) {
    return { x: X0 + (ix + 0.5) * PAS, z: Z0 + (iz + 0.5) * PAS };
  }

  function libre(ix, iz) {
    return ix >= 0 && iz >= 0 && ix < nx && iz < nz && !grille[iz * nx + ix];
  }

  function plusProcheLibre(x, z) {
    const { ix, iz } = cellule(x, z);
    if (libre(ix, iz)) return { ix, iz };
    for (let r = 1; r <= 6; r++) {
      for (let diz = -r; diz <= r; diz++) {
        for (let dix = -r; dix <= r; dix++) {
          if (Math.max(Math.abs(dix), Math.abs(diz)) !== r) continue;
          if (libre(ix + dix, iz + diz)) return { ix: ix + dix, iz: iz + diz };
        }
      }
    }
    return null;
  }

  function voisinVisible(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const etapes = Math.max(1, Math.ceil(d / (PAS / 2)));
    for (let i = 1; i <= etapes; i++) {
      const t = i / etapes;
      if (!pointLibre(ax + (bx - ax) * t, az + (bz - az) * t, colliders)) return false;
    }
    return true;
  }

  function trouver(depart, arrivee) {
    if (!grille) construire();

    const debut = plusProcheLibre(depart.x, depart.z);
    const fin = plusProcheLibre(arrivee.x, arrivee.z);
    if (!debut || !fin) return null;

    const total = nx * nz;
    const g = new Float32Array(total).fill(Infinity);
    const origine = new Int32Array(total).fill(-1);
    const ouverts = [];
    const indiceDebut = debut.iz * nx + debut.ix;
    const indiceFin = fin.iz * nx + fin.ix;
    g[indiceDebut] = 0;
    ouverts.push(indiceDebut);

    const heuristique = (ix, iz) => Math.hypot(ix - fin.ix, iz - fin.iz);

    let trouve = false;
    let garde = 60000;
    while (ouverts.length && garde-- > 0) {
      let meilleur = 0;
      for (let i = 1; i < ouverts.length; i++) {
        if (g[ouverts[i]] + heuristique(ouverts[i] % nx, (ouverts[i] / nx) | 0) < g[ouverts[meilleur]] + heuristique(ouverts[meilleur] % nx, (ouverts[meilleur] / nx) | 0)) {
          meilleur = i;
        }
      }
      const courant = ouverts.splice(meilleur, 1)[0];
      if (courant === indiceFin) {
        trouve = true;
        break;
      }
      const cix = courant % nx;
      const ciz = (courant / nx) | 0;
      for (let diz = -1; diz <= 1; diz++) {
        for (let dix = -1; dix <= 1; dix++) {
          if (!dix && !diz) continue;
          const nix = cix + dix;
          const niz = ciz + diz;
          if (!libre(nix, niz)) continue;
          if (dix && diz && (!libre(cix + dix, ciz) || !libre(cix, ciz + diz))) continue;
          const voisin = niz * nx + nix;
          const cout = g[courant] + Math.hypot(dix, diz) * PAS;
          if (cout < g[voisin]) {
            g[voisin] = cout;
            origine[voisin] = courant;
            if (!ouverts.includes(voisin)) ouverts.push(voisin);
          }
        }
      }
    }
    if (!trouve) return null;

    const brut = [];
    let n = indiceFin;
    while (n !== -1) {
      brut.push(centre(n % nx, (n / nx) | 0));
      n = origine[n];
    }
    brut.reverse();

    const points = [];
    let actuel = { x: depart.x, z: depart.z };
    let i = 0;
    while (i < brut.length) {
      let loin = i;
      for (let j = brut.length - 1; j > i; j--) {
        if (voisinVisible(actuel.x, actuel.z, brut[j].x, brut[j].z)) {
          loin = j;
          break;
        }
      }
      points.push(brut[loin]);
      actuel = brut[loin];
      i = loin + 1;
    }
    return points;
  }

  return { trouver };
}
