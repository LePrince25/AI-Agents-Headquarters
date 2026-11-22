export function versMonde(groupe, c) {
  const cos = Math.cos(groupe.rotation.y);
  const sin = Math.sin(groupe.rotation.y);
  return {
    x: groupe.position.x + cos * c.x + sin * c.z,
    z: groupe.position.z - sin * c.x + cos * c.z,
    hw: c.hw,
    hd: c.hd,
    r: c.r,
    cercle: !!c.cercle,
    rot: groupe.rotation.y + (c.rot || 0),
    actif: true,
  };
}

export function resoudre(px, pz, rayon, colliders) {
  let x = px;
  let z = pz;

  for (let passe = 0; passe < 3; passe++) {
    let touche = false;

    for (const c of colliders) {
      if (c.actif === false) continue;

      const dx = x - c.x;
      const dz = z - c.z;
      const cos = Math.cos(c.rot);
      const sin = Math.sin(c.rot);
      const lx = cos * dx - sin * dz;
      const lz = sin * dx + cos * dz;

      if (c.cercle) {
        const d = Math.hypot(lx, lz);
        const mini = c.r + rayon;
        if (d >= mini) continue;
        if (d < 1e-5) {
          x += rayon;
          touche = true;
          continue;
        }
        const p = mini - d;
        const nx = lx / d;
        const nz = lz / d;
        x += (cos * nx + sin * nz) * p;
        z += (-sin * nx + cos * nz) * p;
        touche = true;
      } else {
        const qx = Math.max(-c.hw, Math.min(c.hw, lx));
        const qz = Math.max(-c.hd, Math.min(c.hd, lz));
        let nx = lx - qx;
        let nz = lz - qz;
        const d = Math.hypot(nx, nz);
        if (d >= rayon) continue;

        let p;
        if (d > 1e-6) {
          nx /= d;
          nz /= d;
          p = rayon - d;
        } else {
          const penX = c.hw - Math.abs(lx);
          const penZ = c.hd - Math.abs(lz);
          if (penX < penZ) {
            nx = Math.sign(lx) || 1;
            nz = 0;
            p = rayon + penX;
          } else {
            nx = 0;
            nz = Math.sign(lz) || 1;
            p = rayon + penZ;
          }
        }

        x += (cos * nx + sin * nz) * p;
        z += (-sin * nx + cos * nz) * p;
        touche = true;
      }
    }

    if (!touche) break;
  }

  return { x, z };
}

export function hauteurSol(x, z, batiments) {
  for (const b of batiments) {
    const cos = Math.cos(b.groupe.rotation.y);
    const sin = Math.sin(b.groupe.rotation.y);
    const dx = x - b.groupe.position.x;
    const dz = z - b.groupe.position.z;
    const lx = cos * dx - sin * dz;
    const lz = sin * dx + cos * dz;

    if (Math.abs(lx) <= b.bati.demiW && Math.abs(lz) <= b.bati.demiD) return b.bati.sol;

    const dalle = b.bati.dalle;
    if (dalle.type === 'cercle') {
      if (Math.hypot(lx, lz) <= dalle.r) return dalle.y;
    } else if (Math.abs(lx) <= dalle.demiW && Math.abs(lz) <= dalle.demiD) {
      return dalle.y;
    }
  }
  return null;
}
