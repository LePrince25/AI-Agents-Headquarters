export const ETATS = {
  travail: { libelle: 'Au travail', couleur: '#4f8f5d' },
  pause: { libelle: 'En pause', couleur: '#c98a2e' },
  attente: { libelle: 'En attente', couleur: '#7b8496' },
};

export const RAYON_ILE = 35;
export const RAYON_POLES = 20.5;
export const TERRASSE = { x: 0, z: 27.2 };
export const ATELIER_OUTILS = { x: 21, z: 13 };

export const DIRECTION = {
  id: 'direction',
  pole: 'Direction Générale',
  lieu: 'LePrince WorkLand',
  accent: '#b08145',
  mission: 'Arbitrages, comptes rendus, tableau des travaux',
  agent: { nom: 'LePrince Dziedjom', poste: 'Directeur Général', etat: 'travail' },
};

export const SIEGE = {
  id: 'siege',
  pole: 'Siège Social',
  lieu: 'LePrince Headquarters',
  accent: '#b08145',
  mission: 'Tour de 10 niveaux : accueil, direction et un étage par pôle',
  agents: [],
};

export const POLES = [
  {
    id: 'api',
    etage: 1,
    pole: 'Pôle API',
    lieu: 'La Forge',
    x: -21,
    z: -13,
    accent: '#4f8b86',
    kind: 'forge',
    sol: 0xe7dcc6,
    mission: 'APIs REST, webhooks, intégrations',
    agents: [
      { nom: 'Noé Kamdem', poste: 'Architecte API', etat: 'travail' },
      { nom: 'Iris Sossou', poste: 'Intégrations & Webhooks', etat: 'travail' },
      { nom: 'Malo Akakpo', poste: 'Performance & Contrats', etat: 'pause' },
      { nom: "Lior d'Almeida", poste: 'Développeur Connecteurs', etat: 'attente' },
    ],
  },
  {
    id: 'vitrines',
    etage: 2,
    pole: 'Sites Vitrines',
    lieu: "L'Atelier Owl",
    x: -7,
    z: -13,
    accent: '#c9763f',
    kind: 'atelier',
    sol: 0xead9c2,
    mission: 'Sites ultra-design, e-commerce',
    agents: [
      { nom: 'Yasmine Alimi', poste: 'Directrice Artistique', etat: 'travail' },
      { nom: 'Tom Ségal', poste: 'Frontend Vitrine', etat: 'travail' },
      { nom: 'Émilie Kponou', poste: 'E-commerce & Contenu', etat: 'pause' },
    ],
  },
  {
    id: 'mobiles',
    etage: 3,
    pole: 'Apps Mobiles',
    lieu: "L'Usine Mobile",
    x: 7,
    z: -13,
    accent: '#c2a04a',
    kind: 'mobile',
    sol: 0xe9dcc8,
    mission: 'Flutter, Kotlin MP, PWA',
    agents: [
      { nom: "Sacha N'Dri", poste: 'Lead Cross-platform', etat: 'travail' },
      { nom: 'Maya Agbodjan', poste: 'Releases & Stores', etat: 'attente' },
      { nom: 'Jo Nkpenza', poste: 'PWA & Synchronisation Offline', etat: 'travail' },
    ],
  },
  {
    id: 'saas',
    etage: 4,
    pole: 'SAAS & CRM',
    lieu: 'Le Comptoir',
    x: 21,
    z: -13,
    accent: '#8d9a4c',
    kind: 'comptoir',
    sol: 0xe6dcc3,
    mission: 'SaaS multi-tenant, CRM, facturation',
    agents: [
      { nom: 'Alex Koffi', poste: 'Architecte SaaS Multi-tenant', etat: 'travail' },
      { nom: 'Sadio Touré', poste: 'CRM & Workflows', etat: 'travail' },
      { nom: 'Nour Diallo', poste: 'Facturation & Abonnements', etat: 'pause' },
      { nom: 'Rachid Ouro-Sama', poste: 'Schéma & Migrations', etat: 'attente' },
    ],
  },
  {
    id: 'cyber',
    etage: 5,
    pole: 'CyberSécurité',
    lieu: 'Le Bastion',
    x: -21,
    z: 0,
    accent: '#a65a4f',
    kind: 'bastion',
    sol: 0xe7d8c4,
    mission: 'Audit, pentest offensif, corrections',
    agents: [
      { nom: 'Yao Mensah', poste: 'Auditeur & Supply Chain', etat: 'travail' },
      { nom: 'Rina Adjo', poste: 'Pentestrice', etat: 'travail' },
      { nom: 'Théo Bessou', poste: 'Correcteur & Durcissement', etat: 'pause' },
      { nom: 'Fatou Sy', poste: 'Threat Modeling & CVE', etat: 'attente' },
    ],
  },
  {
    id: 'veille',
    etage: 6,
    pole: 'Veille & R&D',
    lieu: 'La Vigie',
    x: -21,
    z: 13,
    accent: '#6f8f5f',
    kind: 'vigie',
    sol: 0xe8ddc6,
    mission: 'Actualités, stacks, proofs of concept',
    agents: [
      { nom: 'Kévin Eku', poste: 'Radar Stacks & Librairies', etat: 'travail' },
      { nom: 'Inès Bassolé', poste: 'Actualités & Évolutions', etat: 'pause' },
      { nom: 'Paulin Hounkpatin', poste: 'Exploration & POC', etat: 'attente' },
    ],
  },
  {
    id: 'ops',
    etage: 7,
    pole: 'Ops & Clients',
    lieu: 'Le Bureau',
    x: 21,
    z: 0,
    accent: '#b08145',
    kind: 'bureau',
    sol: 0xe9dbc2,
    mission: 'Devis, factures, relation client',
    agents: [
      { nom: 'Aïcha Bio', poste: 'Devis & Chiffrage', etat: 'travail' },
      { nom: 'Cyrille Zinsou', poste: 'Recouvrement & Impayés', etat: 'pause' },
      { nom: 'Nadège Komla', poste: 'Relation Client', etat: 'travail' },
    ],
  },
  {
    id: 'data',
    etage: 8,
    pole: 'Data & IA',
    lieu: "L'Observatoire",
    x: -7,
    z: 13,
    accent: '#5f8a9a',
    kind: 'data',
    sol: 0xe4dcc9,
    mission: 'Données, pipelines, modèles',
    agents: [
      { nom: 'Séna Ahouandjinou', poste: 'Exploration & Qualité', etat: 'travail' },
      { nom: 'Kwami Tadesse', poste: 'Pipelines & Infra Data', etat: 'attente' },
      { nom: 'Olivier Lawson', poste: 'Modèles & Production', etat: 'travail' },
    ],
  },
  {
    id: 'bi',
    etage: 9,
    pole: 'Business Intelligence',
    lieu: "L'Observatoire",
    x: 7,
    z: 13,
    accent: '#8a8095',
    kind: 'bi',
    sol: 0xe5dbc9,
    mission: 'KPIs, pistes de revenus',
    agents: [
      { nom: 'Clarisse Dossou', poste: 'Analyste Produits & KPIs', etat: 'travail' },
      { nom: 'Yves Ahouandjigon', poste: 'Revenus & Pricing', etat: 'pause' },
    ],
  },
];

export const TOUS_LES_AGENTS = [
  ...POLES.flatMap((p) =>
    p.agents.map((a) => ({ ...a, poleId: p.id, lieu: p.lieu, accent: p.accent }))
  ),
  { ...DIRECTION.agent, poleId: DIRECTION.id, lieu: DIRECTION.lieu, accent: DIRECTION.accent },
];
