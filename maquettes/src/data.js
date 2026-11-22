// data.js — Le Quartier Général : pôles, agents, implantation sur l'île.
// Source : EQUIPE.md. Les états reflètent le mode « auto + sur commande ».

export const ETATS = {
  mission: { libelle: 'En mission', dot: '#ff7a3c' },
  veille:  { libelle: 'De fond',    dot: '#9fe038' },
  repos:   { libelle: 'Au repos',   dot: '#8b9bb4' },
  off:     { libelle: 'Hors ligne', dot: '#ff3d63' },
};

// Implantation : 4 au nord, 3 au milieu, 3 au sud.
// L'Observatoire (data + bi) est au sud, La Vigie à l'est — la tour de guet.
export const POLES = [
  {
    id: 'api', nom: 'Pôle API', lieu: 'La Forge', icone: '⚙',
    bat: { x: -25, z: -19, w: 15, d: 12, h: 3.4 },
    neon: '#34d8ff',
    style: 'api',
    agents: [
      { prenom: 'Noé Kamdem', poste: 'Architecte API', etat: 'mission' },
      { prenom: 'Iris Sossou', poste: 'Intégrations & Webhooks', etat: 'mission' },
      { prenom: 'Malo Akakpo', poste: 'Performance & Contrats', etat: 'repos' },
      { prenom: "Lior d'Almeida", poste: 'Développeur Connecteurs', etat: 'off' },
    ],
  },
  {
    id: 'vitrines', nom: 'Sites Vitrines', lieu: "L'Atelier Owl", icone: '✦',
    bat: { x: -9, z: -19, w: 13, d: 12, h: 3.4 },
    neon: '#9fe038',
    style: 'vitrines',
    agents: [
      { prenom: 'Yasmine Alimi', poste: 'Directrice Artistique', etat: 'mission' },
      { prenom: 'Tom Ségal', poste: 'Frontend Vitrine', etat: 'mission' },
      { prenom: 'Émilie Kponou', poste: 'E-commerce & Contenu', etat: 'repos' },
    ],
  },
  {
    id: 'mobiles', nom: 'Apps Mobiles', lieu: "L'Usine Mobile", icone: '▤',
    bat: { x: 9, z: -19, w: 13, d: 12, h: 3.4 },
    neon: '#f6c545',
    style: 'mobiles',
    agents: [
      { prenom: "Sacha N'Dri", poste: 'Lead Cross-platform', etat: 'mission' },
      { prenom: 'Maya Agbodjan', poste: 'Releases & Stores', etat: 'repos' },
      { prenom: 'Jo Nkpenza', poste: 'PWA & Synchronisation Offline', etat: 'mission' },
    ],
  },
  {
    id: 'saas', nom: 'SAAS & CRM', lieu: 'Le Comptoir', icone: '◧',
    bat: { x: 25, z: -19, w: 13, d: 12, h: 3.4 },
    neon: '#34d8ff',
    style: 'saas',
    agents: [
      { prenom: 'Alex Koffi', poste: 'Architecte SaaS Multi-tenant', etat: 'veille' },
      { prenom: 'Sadio Touré', poste: 'CRM & Workflows', etat: 'mission' },
      { prenom: 'Nour Diallo', poste: 'Facturation & Abonnements', etat: 'mission' },
      { prenom: 'Rachid Ouro-Sama', poste: 'Schéma & Migrations', etat: 'off' },
    ],
  },
  {
    id: 'cybersecurite', nom: 'CyberSécurité', lieu: 'Le Bastion', icone: '⬢',
    bat: { x: -24, z: 0, w: 15, d: 13, h: 3.4 },
    neon: '#ff3d63',
    style: 'cyber',
    agents: [
      { prenom: 'Yao Mensah', poste: 'Auditeur Statique & Supply Chain', etat: 'veille' },
      { prenom: 'Rina Adjo', poste: 'Pentestrice', etat: 'mission' },
      { prenom: 'Théo Bessou', poste: 'Correcteur & Durcissement', etat: 'mission' },
      { prenom: 'Fatou Sy', poste: 'Threat Modeling & CVE', etat: 'veille' },
    ],
  },
  {
    id: 'veille', nom: 'Veille & R&D', lieu: 'La Vigie', icone: '◎',
    bat: { x: 24, z: 0, w: 13, d: 13, h: 3.4 },
    neon: '#9fe038',
    style: 'veille',
    agents: [
      { prenom: 'Kévin Eku', poste: 'Radar Stacks & Librairies', etat: 'veille' },
      { prenom: 'Inès Bassolé', poste: 'Actualités & Évolutions Mondiales', etat: 'veille' },
      { prenom: 'Paulin Hounkpatin', poste: 'Exploration & Proof of Concept', etat: 'veille' },
    ],
  },
  {
    id: 'ops', nom: 'Ops & Clients', lieu: 'Le Bureau', icone: '✎',
    bat: { x: -25, z: 19, w: 13, d: 12, h: 3.4 },
    neon: '#f6c545',
    style: 'ops',
    agents: [
      { prenom: 'Aïcha Bio', poste: 'Devis & Chiffrage', etat: 'mission' },
      { prenom: 'Cyrille Zinsou', poste: 'Recouvrement & Impayés', etat: 'veille' },
      { prenom: 'Nadège Komla', poste: 'Relation Client', etat: 'veille' },
    ],
  },
  {
    id: 'data', nom: 'Data & IA', lieu: "L'Observatoire", icone: '◔',
    bat: { x: -9, z: 19, w: 13, d: 12, h: 3.4 },
    neon: '#34d8ff',
    style: 'data',
    agents: [
      { prenom: 'Séna Ahouandjinou', poste: 'Exploration & Qualité', etat: 'mission' },
      { prenom: 'Kwami Tadesse', poste: 'Pipelines & Infra Data', etat: 'off' },
      { prenom: 'Olivier Lawson', poste: 'Modèles & Mise en Production', etat: 'repos' },
    ],
  },
  {
    id: 'bi', nom: 'Business Intelligence', lieu: "L'Observatoire", icone: '◑',
    bat: { x: 9, z: 19, w: 13, d: 12, h: 3.4 },
    neon: '#9fe038',
    style: 'bi',
    agents: [
      { prenom: 'Clarisse Dossou', poste: 'Analyste Produits & KPIs', etat: 'veille' },
      { prenom: 'Yves Ahouandjigon', poste: 'Revenus & Pricing', etat: 'mission' },
    ],
  },
];

// Le siège : LePrince Dziedjom, Directeur Général.
export const SIEGE = {
  id: 'qg', nom: 'Le Quartier Général', lieu: 'Le QG', icone: '★',
  bat: { x: 0, z: 0, w: 20, d: 15, h: 4.4 },
  neon: '#f6c545',
  style: 'qg',
  agents: [
    { prenom: 'LePrince Dziedjom', poste: 'Directeur Général', etat: 'mission', dg: true },
  ],
};

export const TOUS = [SIEGE, ...POLES];

export const LIEUX = [
  { nom: 'Le Quartier Général', quoi: 'Arbitrages, comptes rendus, tableau des travaux' },
  { nom: 'La Forge', quoi: 'APIs, backends, intégrations, webhooks' },
  { nom: "L'Atelier Owl", quoi: 'Sites vitrines, design system, e-commerce' },
  { nom: "L'Usine Mobile", quoi: 'Apps mobiles, PWA, stores' },
  { nom: 'Le Comptoir', quoi: 'SAAS, CRM, pipeline commercial' },
  { nom: 'Le Bastion', quoi: 'CyberSécurité, audits, pentests' },
  { nom: 'La Vigie', quoi: 'Veille, aide-mémoire, proofs of concept' },
  { nom: 'Le Bureau', quoi: 'Devis, factures, relation client' },
  { nom: "L'Observatoire", quoi: 'Data, IA, business intelligence' },
];
