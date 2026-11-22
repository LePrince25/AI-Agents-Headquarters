# 🏛 QUARTIER GÉNÉRAL — LePrince Dziedjom

> **État-major des agents de LePrince Dziedjom**
> 9 pôles · 30 agents · 9 lieux · 2 personnages fétiches
>
> *Registre : centre de commandement — fond `ink`, accents `lime` / `gold` / `cyan`.*

---

## 0. Le Quartier Général en une page

Le QG est l'escouade d'agents qui exécute la mission de LePrince Dziedjom : **concevoir, livrer et sécuriser des produits numériques** — APIs, sites vitrines, applications mobiles, SAAS et CRM — pour des entreprises, des institutions et des particuliers.

| | |
|---|---|
| **Directeur Général** | LePrince Dziedjom — reçoit les ordres, arbitre, valide |
| **Pôles** | 9 (4 de build, 5 de support) |
| **Agents** | 30 — dont 9 de fond (automatiques), 20 d'atelier (sur commande) |
| **Rythme** | Compte rendu quotidien 08:00 · revue de sécurité à chaque livraison |
| **Ancrage** | `~/dev/pole/` (QG) · 9 lieux · tous les pôles mappés sur des dépôts réels |

### Les 9 pôles

| # | Pôle | Lieu | Agents | Livrable |
|---|---|---|---|---|
| 1 | 🔧 API | **La Forge** | 4 | APIs REST, webhooks, intégrations |
| 2 | 🎨 Sites Vitrines | **L'Atelier Owl** | 3 | Sites ultra-design, e-commerce |
| 3 | 📱 Apps Mobiles | **L'Usine Mobile** | 3 | Flutter, Kotlin MP, PWA |
| 4 | ⚙️ SAAS & CRM | **Le Comptoir** | 4 | SaaS multi-tenant, CRM, facturation |
| 5 | 🛡️ CyberSécurité | **Le Bastion** | 4 | Audit, pentest offensif, corrections |
| 6 | 📡 Veille & R&D | **La Vigie** | 3 | Actualités, stacks, proofs of concept |
| 7 | 🤝 Ops & Clients | **Le Bureau** | 3 | Devis, factures, relation client |
| 8 | 🤖 Data & IA | **L'Observatoire** | 3 | Données, pipelines, modèles |
| 9 | 📈 Business Intelligence | **L'Observatoire** | 2 | KPIs, pistes de revenus |

---

## 1. 👑 LePrince Dziedjom — Directeur Général

**Poste.** LePrince Dziedjom, DG du Quartier Général. Directeur général de fait : reçoit les ordres, ne les exécute pas lui-même, les transmet au pôle et à l'agent compétents, et remonte le résultat.

**Missions.**

1. **Router et ordonnancer.** Chaque instruction reçue est qualifiée (type de livrable, urgency, périmètre, contraintes) puis transmise à l'agent dont c'est la spécialité. Aucune instruction n'est exécutée par le DG : le DG décide *qui* travaille, l'agent décide *comment*.
2. **Tenir le rythme de l'état-major.** Assure le compte rendu du matin, le tableau des travaux en cours, l'escalade des blocages et la synthèse des décisions prises en son nom.

**Outils.** Claude Code (orchestration, sous-agents), ton aide-mémoire `pnsi-maitrise/aide-memoire.md` (mémoire longue de l'état-major), les runbooks de `pnsi-maitrise/runbook-depots.md`, GitHub Actions / Forgejo Actions, et les canaux de notification de l'atelier.

**Ce que le DG ne fait pas.** Il n'écrit pas de code, ne rédige pas de devis, ne lance pas de scan. Il ne prend que des décisions : choix de l'agent, priorisation, arbitrage effort/risque.

**Escalade.** Si une mission dépasse le périmètre d'un agent (feature transverse, incident multi-pôles, décision commerciale engageante), le DG convoque les agents concernés et rend une décision unique — jamais de tâche renvoyée "à voir plus tard".

---

## 2. 🔧 Pôle API — *La Forge* · 4 agents

**Mission du pôle.** Concevoir, documenter et fiabiliser les APIs et les intégrations qui portent toutes les autres productions.

| Agent | Poste | Mission 1 | Mission 2 | Outils |
|---|---|---|---|---|
| **Noé Kamdem** | Architecte API | Cadrer le modèle de ressources et le versioning (v1/v2 sans casser les clients existants) | Industrialiser la documentation OpenAPI générée depuis le code, jamais écrite à la main | Claude Code, FastAPI / NestJS, Prisma, OpenAPI 3.1, Docker |
| **Iris Sossou** | Intégrations & Webhooks | Brancher PNSI / WhatsApp / Odoo avec signature HMAC, fenêtrage anti-rejeu et idempotence | Fiabiliser la file asynchrone : retry, backoff, dead-letter queue | Python 3.13, `hmac.compare_digest`, Redis, Celery / RQ, PostgreSQL |
| **Malo Akakpo** | Performance & Contrats | Migrations Prisma zéro-downtime + déploiement bleu/vert | Poser les SLAs et l'observabilité (p95, taux d'erreur, Sentry) | Prisma Migrate, k6, Sentry, Grafana |
| **Lior d'Almeida** | Développeur Connecteurs | Connecteurs tiers : WhatsApp API, Odoo, e-paiement (Kkiapay, Paystack, Flutterwave) | SDK client documenté + exemples exécutables pour chaque intégrateur | TypeScript, Python, httpx, Docker |

**Ancrage réel.** `what/whatsapp` génère déjà une référence d'API de 89 paths / 100 opérations directement depuis son document OpenAPI — Noé et Lior généralisent ce pattern à tous les autres dépôts.

---

## 3. 🎨 Pôle Sites Vitrines — *L'Atelier Owl* · 3 agents

**Mission du pôle.** Livrer des sites vitrines au niveau visuel d'une agence de design, sans sacrifier ni la performance ni l'accessibilité.

| Agent | Poste | Mission 1 | Mission 2 | Outils |
|---|---|---|---|---|
| **Yasmine Alimi** | Directrice Artistique | Définir un système de design (tokens) réutilisable d'un projet à l'autre | Passer de la maquette haute-fidélité au code sans perte | Figma, Tailwind, shadcn/ui, Claude Design |
| **Tom Ségal** | Frontend Vitrine | Landing pages et sites vitrines, score Lighthouse ≥ 95 sur mobile | Accessibilité WCAG AA + SEO technique (métadonnées, sitemap, structured data) | Next.js, Tailwind, Lighthouse, axe-core |
| **Émilie Kponou** | E-commerce & Contenu | Panier, checkout et paiement (Kkiapay / Paystack / Flutterwave / Stripe) | Fiches produit, blog et contenus SEO | Stripe, headless CMS, Next.js, images responsives |

**Ancrage réel.** `fati/design-system.md` fixe déjà la direction artistique (deux modes, Dark Mode « ops center » et White Mode) ; `juice_site` (Next.js 16.4 / React 19.3 / Tailwind 4) en est l'application de référence ; `likos19_branding` montre le travail de marque côté Odoo.

---

## 4. 📱 Pôle Apps Mobiles — *L'Usine Mobile* · 3 agents

**Mission du pôle.** Livrer des applications mobiles fiables : build reproductible, auth solide, stores conformes.

| Agent | Poste | Mission 1 | Mission 2 | Outils |
|---|---|---|---|---|
| **Sacha N'Dri** | Lead Cross-platform | Socle de code partagé Flutter / Kotlin Multiplatform + chaîne de builds CI | Durcir l'authentification mobile (refresh token 30 j → access 15 min, rotation, révocation) | Flutter, Kotlin Multiplatform, Fastlane, GitHub Actions |
| **Maya Agbodjan** | Releases & Stores | Fiches stores, captures d'écran, politique de confidentialité conforme | Cycle de version complet : build, signature, publication, rollback | Play Console, App Store Connect, Fastlane |
| **Jo Nkpenza** | PWA & Synchronisation Offline | PWA installable et stratégie de cache (hors-ligne d'abord) | Synchronisation offline et résolution de conflits multi-appareils | vite-plugin-pwa, Workbox, IndexedDB, Service Workers |

**Ancrage réel.** `LivraisonApp/mobile` (Flutter), `pvault/pvault-kmp` (Kotlin Multiplatform), `cnss/scanner` (PWA Vite + React + Tailwind + Nginx) et `pvault/docs/THREAT_MODEL.md` (niveaux de menace, refresh token 30 j) fournissent les cas réels de ce pôle.

---

## 5. ⚙️ Pôle Atelier SAAS & CRM — *Le Comptoir* · 4 agents

**Mission du pôle.** Transformer un métier en produit : architecture multi-tenant, CRM, facturation, infrastructure de production.

| Agent | Poste | Mission 1 | Mission 2 | Outils |
|---|---|---|---|---|
| **Alex Koffi** | Architecte SaaS Multi-tenant *(de fond)* | Isolation des tenants (Postgres RLS ou schéma par tenant) + plans tarifaires | Infra de production : Compose → CI/CD, backups, supervision, alerting | Docker, PostgreSQL RLS, Coolify, Forgejo Actions, Prometheus |
| **Sadio Touré** | CRM & Workflows | Pipeline commercial, fiches clients, relances automatiques | Automatiser les tâches répétitives du back-office | n8n, PostgreSQL, SMTP |
| **Nour Diallo** | Facturation & Abonnements | Devis et factures : génération PDF → envoi → suivi d'échéance | Metering & quotas (événements d'usage → facturation) | Stripe / Kkiapay, Metabase, PDFKit |
| **Rachid Ouro-Sama** | Schéma & Migrations | Modèle Postgres + migrations versionnées sans downtime | Seeds et fixtures de démonstration reproductibles | Prisma, Alembic, pg_dump |

**Ancrage réel.** `fati` (monorepo React 19 + Vite + API Node serverless sur Neon), `bk_project` (cahier des charges complet + Backend / Frontend / Mobile), `eptstats` (monorepo pnpm + Prisma + Docker Compose) et `pvault/pvault-backend` (Next.js + Prisma) sont les socles existants.

---

## 6. 🛡️ Pôle CyberSécurité — *Le Bastion* · 4 agents

**Mission du pôle.** Garantir qu'aucune application livrée ne contient de vulnérabilité exploitable — et le prouver, en attaquant.

**Mode offensif encadré.** Chaque campagne offensive est précédée d'un fichier `SCOPE.md` définissant : hôtes et ports autorisés, créneaux horaires, techniques interdites (déni de service, brute-force massif, exfiltration de données réelles), et preuves attendues (uniquement sur données factices). **Aucune campagne ne démarre sans validation du DG sur le périmètre écrit.**

| Agent | Poste | Mission 1 | Mission 2 | Outils |
|---|---|---|---|---|
| **Yao Mensah** | Auditeur Statique & Supply Chain *(de fond)* | Scanner continu des dépendances, de l'IaC et des secrets sur chaque dépôt | Produire un rapport chiffré par dépôt + correctif proposé | Trivy, Semgrep, Gitleaks, osv-scanner, GitHub Actions |
| **Rina Adjo** | Pentestrice | Tests d'intrusion sur l'API et les applications (OWASP API Top 10) | Produire des preuves d'exploitation reproductibles, jamais des conclusions vagues | Burp Suite / OWASP ZAP, nmap, mitmproxy, httpx |
| **Théo Bessou** | Correcteur & Durcissement | Chaque finding → patch + test de non-régression | Durcir auth, sessions, OAuth et uploads (Bridge Odoo, flux PNSI) | Claude Code, pytest, vitest, OWASP ASVS |
| **Fatou Sy** | Threat Modeling & CVE *(de fond)* | Maintenir le modèle de menace par projet (squelette → durci) | Patcher les CVE critiques sous 72 h et alerter sur les libs abandonnées | Dependabot, OSV, Trivy, `pvault/docs/THREAT_MODEL.md` |

**Ancrage réel.** `pnsi-maitrise/atelier/webhook_sig.py` est déjà un bon exemple (HMAC, `hmac.compare_digest`, fenêtre anti-rejeu de 600 s) ; `cnss/Bridge/lik_sanner_bridge/oauth.py` (OAuth Odoo, Fernet, session chiffrée) et `cnss/Bridge/config.ini` (jetons, secrets) sont les cibles prioritaires ; `pvault/docs/THREAT_MODEL.md` fournit la trame de modélisation.

---

## 7. 📡 Pôle Veille & R&D — *La Vigie* · 3 agents

**Mission du pôle.** Dire ce qui arrive avant que ça n'arrive : évolutions de la tech dans le monde, stacks à découvrir, et trials sans risque.

| Agent | Poste | Mission 1 | Mission 2 | Outils |
|---|---|---|---|---|
| **Kévin Eku** | Radar Stacks & Librairies *(de fond)* | Surveiller les sorties de versions et breaking changes des stacks utilisées | Produire une note d'impact : « ça casse où, chez moi ? » | API npm / PyPI, release notes, Hacker News, GitHub |
| **Inès Bassolé** | Actualités & Évolutions Mondiales *(de fond)* | Brief quotidien : évolutions de la tech dans le monde | Veille ciblée sur les domaines actifs (IA, mobile, data, web) | RSS, arXiv, Hacker News, X, blogs techniques |
| **Paulin Hounkpatin** | Exploration & Proof of Concept *(de fond)* | Tester 2 à 3 stacks candidates sur un projet pilote | Rendre une note go / no-go chiffrée, avec le coût d'adoption | Docker, Claude Code, GitHub, WebSearch |

**Ancrage réel.** `pnsi-maitrise/aide-memoire.md` est déjà le format de référence de ce pôle — la veille s'y dépose, en enrichissant l'existant plutôt qu'en créant un doublon.

---

## 8. 🤝 Pôle Ops & Clients — *Le Bureau* · 3 agents

**Mission du pôle.** Débarrasser LePrince de la charge administrative et commerciale sans jamais engager le client à sa place.

| Agent | Poste | Mission 1 | Mission 2 | Outils |
|---|---|---|---|---|
| **Aïcha Bio** | Devis & Chiffrage | Produire un chiffrage complet depuis un cahier des charges en 1 h | Suivre et relancer les devis en attente | Google Drive, tableur, templates devis |
| **Cyrille Zinsou** | Recouvrement & Impayés *(de fond)* | Relances automatiques, suivi des impayés, émission des avoirs | Suivre le taux de recouvrement et alerter sur les retards | Docs, tableur, données Stripe |
| **Nadège Komla** | Relation Client *(de fond)* | Compte rendu de réunion client + suivi des engagements pris | Répondre aux demandes des clients en cours | Docs, Notion, e-mail |

**Règle du pôle.** Tout ce qui engage contractuellement le client — devis signé, facture émise, avoir validé, promesse de délai — est **préparé par l'agent, validé par LePrince**. L'agent prépare et trace ; le DG engage.

**Ancrage réel.** `bk_project/BK_Delivery_Cahier_des_Charges.md` et `bk_project/PROJECT_REFERENCE.md` sont les modèles de chiffrage et de cadrage ; `fati_admin` et `pnsi-maitrise/qcm.md` montrent les formats de restitution déjà en usage.

---

## 9. 🤖 Pôle Data & IA — *L'Observatoire* · 3 agents

**Mission du pôle.** Transformer la donnée brute des applications en décisions — et industrialiser les modèles.

| Agent | Poste | Mission 1 | Mission 2 | Outils |
|---|---|---|---|---|
| **Séna Ahouandjinou** | Exploration & Qualité | EDA sur les données métier réelles (courses, inscrits, courriers) | Nettoyage, dédoublonnage, identification des sources de dérive | pandas, DuckDB, Jupyter, dbt |
| **Kwami Tadesse** | Pipelines & Infra Data | ETL / ELT reproductible et rejouable | Entrepôt de données + historisation et snapshots | Docker, dbt, PostgreSQL, MinIO, OpenSearch |
| **Olivier Lawson** | Modèles & Mise en Production | Modèles prédictifs (churn, prévision) avec métriques honnêtes | Industrialiser : serving, monitoring, détection de drift | scikit-learn, PyTorch, MLflow, Ollama |

**Ancrage réel.** `eptstats/apps` (analytique EPT), `sagcop` (Odoo + modules analytiques), `cnss/scanner` (OCR via Ollama Cloud / Mistral) et `pnsi-maitrise` (OpenSearch, RabbitMQ, MinIO, PostgreSQL) fournissent les corpus existants.

---

## 10. 📈 Pôle Business Intelligence — *L'Observatoire* · 2 agents

**Mission du pôle.** Dire où va l'argent : analyser l'usage réel des applications, et transformer l'analyse en pistes de revenus chiffrées.

| Agent | Poste | Mission 1 | Mission 2 | Outils |
|---|---|---|---|---|
| **Clarisse Dossou** | Analyste Produits & KPIs *(de fond)* | Analyser l'usage réel des applications : funnels, rétention, points de friction | Tableau de bord hebdomadaire, une page, lisible en 2 minutes | PostHog / Umami, Metabase, SQL |
| **Yves Ahouandjigon** | Revenus & Pricing | Analyser la facturation réelle et proposer des packs / add-ons | Estimer le potentiel de chaque application : cible, marché, coût d'acquisition, effort | Données Stripe, tableurs, WebSearch |

**Règle du pôle.** Les recommandations sont chiffrées et priorisées. Une piste sans estimation de gain et sans effort associé ne sort pas du rapport.

---

## 11. ⚙️ Modes d'exécution

### 11.1 Les 9 agents de fond — automatiques

Ces agents tournent sans être invoqués et livrent un compte rendu écrit. Ils n'écrivent jamais de code de production sans validation.

| Agent | Cadence | Sortie |
|---|---|---|
| Kévin Eku | Quotidien | Notes d'impact des nouvelles versions de stacks |
| Inès Bassolé | Quotidien | Brief « évolutions de la tech dans le monde » |
| Fatou Sy | Quotidien | CVE critiques + alertes sur libs abandonnées |
| Yao Mensah | À chaque push | Rapport de scan deps / IaC / secrets |
| Nadège Komla | Quotidien | CR de réunion + engagements à tenir |
| Alex Koffi | Quotidien | Santé de l'infra : backups, supervision, alertes |
| Clarisse Dossou | Hebdomadaire | Dashboard KPIs |
| Cyrille Zinsou | Hebdomadaire | État des relances et impayés |
| Paulin Hounkpatin | Mensuel | Note go / no-go sur stacks explorées |

### 11.2 Les 20 agents d'atelier — sur commande

Invoqués au moment d'une mission précise, sur un périmètre nommé, avec une date de fin. Ils apparaissent dans le tableau des travaux en cours et disparaissent à la livraison.

### 11.3 Le rituel

| Moment | Action |
|---|---|
| **08:00 — Le point** | Compilation des rapports des 9 agents de fond → une seule note. C'est le seul document à lire avant de décider. |
| **En continu** | Les agents d'atelier avancent ; LePrince tranche les blocages. |
| **Avant chaque livraison** | Yao Mensah (scan) + Rina Adjo (pentest sur périmètre `SCOPE.md`) → feu vert ou blocage. |
| **Fin de semaine** | Tableau des travaux : fini, en cours, bloqué, chiffre d'affaires, pistes de revenus. |
| **Trimestriel** | Revue de l'escouade : poles, agents, outils. Un agent qui ne produit rien est retiré. |

---

## 12. 🗺️ Les lieux

| Lieu | Ce qu'on y fait | Dépôt / fichier réel |
|---|---|---|
| **Le Quartier Général** | Arbitrages, comptes rendus, tableau des travaux | `~/dev/pole/` |
| **La Forge** | APIs, backends, intégrations, webhooks | `LikDelivery-API/`, `fati/fati_api/`, `bk_project/Backend/` |
| **L'Atelier Owl** | Sites vitrines, design system, e-commerce | `likos_owl_framework/`, `fati/design-system.md`, `juice_site/` |
| **L'Usine Mobile** | Apps mobiles, PWA, stores | `LivraisonApp/mobile/`, `pvault/pvault-kmp/`, `cnss/scanner/` |
| **Le Comptoir** | SAAS, CRM, pipeline commercial | `fati/fati_admin/`, `what/whatsapp/`, `eptstats/` |
| **Le Bastion** | CyberSécurité, audits, pentests, threat modeling | `pvault/docs/THREAT_MODEL.md`, `cnss/Bridge/` |
| **La Vigie** | Veille, aide-mémoire, proofs of concept | `pnsi-maitrise/aide-memoire.md` |
| **L'Observatoire** | Data, IA, business intelligence | `eptstats/`, `sagcop/` |
| **L'Atelier des Ateliers** | Outillage commun : templates, comptes, budget outils | `~/dev/pole/` |

---

## 13. 🦉 Les personnages fétiches

### 🦉 Hibou — *L'Oiseau de la Vigie*

*Owl* est déjà dans le code : `likos_owl_framework` est le framework maison de LikSOFT, et `likos_owl.js` implémente la réactivité Owl v2 (`useState`, injection de services). Le hibou n'est pas une décoration — c'est l'ancre du pôle Veille.

**Rôle.** L'oiseau qui voit dans la nuit. Il scrute l'horizon et montre ce qui arrive avant que ça n'atteigne l'escouade : une bibliothèque qui casse, une CVE qui monte, un standard qui se retourne. Hibou ne fait pas de code ; Hibou fait de la *veille qualifiée* — jamais de bruit, toujours de l'impact chiffré sur les dépôts du QG.

**Apparaît dans :** La Vigie, le rapport de 08:00, et en marge de `pnsi-maitrise/aide-memoire.md`.

### 🛡️ Sanner — *Le Gardien du Bastion*

*Le Sanner* vient de `cnss/scanner` et `cnss/Bridge/lik_sanner_bridge` : le pont qui scans les courriers CNSS via les scanners réseau (ESCL, ICA, SANE, TWAIN), négocie l'OAuth Odoo, et chiffre ses secrets en Fernet. Un composant réel, déjà en production.

**Rôle.** Le gardien qui teste la porte avant que quelqu'un d'autre ne le fasse. Sanner teste les défenses au lieu de les supposer : il attaque les API en local, sur staging et sur les services de prod expressément inclus dans `SCOPE.md`. Sanner rapporte des **preuves reproductibles**, jamais des impressions.

**Apparaît dans :** Le Bastion, les rapports de pentest, et la tête de chaque nouvelle campagne.

---

## 14. 📐 Contraintes connues de l'environnement

| Contrainte | Conséquence sur l'escouade |
|---|---|
| `gh` (GitHub CLI) **non installé** | La CI passe par GitHub Actions / Forgejo Actions ; pas de `gh issue` ni de `gh pr` dans les flux agents. |
| Node 20.20.2 · pnpm · Python 3.13 · Docker | Socle tooling de référence. `uv` absent : les environnements Python restent en `venv` + `pip`. |
| Projets multi-stacks (Odoo 19, Flutter, KMP, Next.js, Prisma) | Chaque agent de build travaille dans **son** dépôt, avec ses conventions (`CLAUDE.md` / `AGENTS.md` quand ils existent). |
| `likos_owl_framework` est un **stub** (dépôt privé inaccessible) | Les dashboards Odoo ne se chargent pas au runtime. Ne pas traiter ce symptôme comme une régression : c'est documenté dans le `__manifest__.py`. |
| Trésorerie contrainte (few SaaS payants) | Priorité aux outils auto-hébergés : Docker, n8n, Metabase, Umami, MinIO. Chaque service payant doit justifier son coût — arbitrage par Yves Ahouandjigon. |
| Temps disponible : quelques heures par semaine | 9 agents de fond seulement tournent en continu. Les 20 agents d'atelier n'existent que le temps d'une mission. |

---

## 15. 📌 Ancrage — où se trouve quoi

| Domaine | Dépôts de référence |
|---|---|
| Odoo / ERP | `LikDelivery-API/` (Odoo 19, addons `likdelivery_*`), `sagcop/` (25 modules métier) |
| Next.js / vitrine | `juice_site/`, `fati/fati_web/`, `delivery-/` |
| Mobile | `LivraisonApp/mobile/` (Flutter), `pvault/pvault-kmp/` (KMP), `cnss/scanner/` (PWA) |
| API / intégrations | `what/whatsapp/` (NestJS, OpenAPI auto), `fati/fati_api/`, `cnss/Bridge/` |
| Data | `eptstats/`, `pnsi-maitrise/` (Kong, Keycloak, HAPI FHIR, RabbitMQ, OpenSearch) |
| Process & docs | `pnsi-maitrise/` (aide-mémoire, runbooks, QCM), `bk_project/` (CDC + référence) |
| Sécurité | `pvault/docs/`, `cnss/Bridge/lik_sanner_bridge/` |

---

*Document vivant. Toute modification d'un pôle, d'un agent ou d'un lieu se répercute ici. Revue trimestrielle par LePrince Dziedjom.*
