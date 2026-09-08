# 📖 DOSSIER DE PASSATION TECHNIQUE & DOCUMENTATION GLOBALE
## 🌟 Plateforme E-Commerce Multi-Canal Kalagban
**Propriétaire :** SOUMANGOUROU TECHNOLOGIE  
**Date de Passation :** Septembre 2026  
**Auteur / Concepteur :** Équipe d'Ingénierie & Antigravity IDE  

---

## 📑 TABLE DES MATIÈRES
1. [Introduction & Vision du Projet](#1-introduction--vision-du-projet)
2. [Architecture Globale du Monorepo](#2-architecture-globale-du-monorepo)
3. [Détail des Applications du Monorepo](#3-détail-des-applications-du-monorepo)
4. [Base de Données & Backend Supabase](#4-base-de-données--backend-supabase)
5. [Sécurité, Authentification & Matrice RBAC](#5-sécurité-authentification--matrice-rbac)
6. [Système Logistique : Domicile & Points Relais](#6-système-logistique--domicile--points-relais)
7. [Moteur Financier, Frais & Commissions](#7-moteur-financier-frais--commissions)
8. [Guide de Démarrage Développeur (Local)](#8-guide-de-démarrage-développeur-local)
9. [Procédures de Build & Déploiement](#9-procédures-de-build--déploiement)
10. [Surveillance, Télémétrie & Bonnes Pratiques](#10-surveillance-télémétrie--bonnes-pratiques)

---

## 1. Introduction & Vision du Projet

**Kalagban** est une marketplace e-commerce multi-vendeurs innovante, optimisée pour l'Afrique de l'Ouest (monnaie : **FCFA**). Elle connecte de manière fluide et sécurisée :
- **Les Acheteurs (Clients)** : Via une application mobile ultra-rapide et un site web e-commerce moderne.
- **Les Vendeurs (Commerçants & Créateurs)** : Via leur espace web dédié et application mobile marchande.
- **Les Points Relais & Transporteurs** : Via un guichet opérationnel pour le dépôt/retrait sécurisé par code OTP/PIN et géolocalisation.
- **L'Équipe d'Administration Centrale** : Via un back-office complet avec contrôle d'accès strict (RBAC), modération en direct, comptabilité, logistique et télémétrie des bugs en temps réel.

---

## 2. Architecture Globale du Monorepo

Le projet est structuré sous forme de **Monorepo Turborepo + npm workspaces** assurant un partage de code optimal, une cohérence des types TypeScript et des builds ultra-rapides.

```text
App de Vente Kalagban/
├── apps/
│   ├── web-admin/         # Back-Office Administrateur Global (Next.js 15 App Router)
│   ├── web-buyer/         # Marketplace E-Commerce Acheteur Web (Next.js 15)
│   ├── web-seller/        # Espace Commerçant & Gestionnaire de Boutique (Next.js 15)
│   ├── web-relay/         # Guichet Opérationnel Points Relais (Next.js 15)
│   ├── mobile-buyer/      # Application Mobile Acheteurs (React Native / Expo SDK 52)
│   └── mobile-seller/     # Application Mobile Vendeurs (React Native / Expo SDK 52)
├── packages/
│   └── fee-calculator/    # Moteur partagé de calcul des commissions & frais
├── supabase/
│   └── migrations/        # 52+ scripts SQL versionnés (Schéma, RLS, Triggers, RPC)
├── security-reports/      # Rapports d'analyse Semgrep, Trivy, Gitleaks
├── turbo.json             # Configuration du pipeline de build Turborepo
└── package.json           # Dépendances racine et scripts globaux
```

---

## 3. Détail des Applications du Monorepo

### A. `apps/web-admin` (Panneau d'Administration Globale)
- **Framework :** Next.js 15 (React 19), Tailwind CSS, Lucide Icons.
- **Rôle :** Supervision 360° de la plateforme pour tous les corps de métier de l'entreprise.
- **Fonctionnalités Clés :**
  - **Tableau de Bord Réactif :** Chiffre d'affaires en direct, alertes d'action requise, bouton d'actualisation instantanée sans rechargement de page.
  - **Modération Produits (`/products-moderation`) :** File d'attente d'approbation/rejet avec motifs personnalisés.
  - **Logistique & Flotte (`/relays`, `/couriers`, `/logistics/incidents`) :** Carte interactive, assignation des coursiers, résolution des incidents.
  - **Finances & Tarification (`/finance`, `/finance/pricing`) :** Traitement des demandes de virement (Payouts) et grilles tarifaires.
  - **Éditeur Visuel CMS (`/cms`) :** Modification dynamique en direct des bannières, carrousels et textes de la marketplace.
  - **Télémétrie & Logs (`/bugs`, `/logs`, `/audit`) :** Suivi des erreurs temps réel et traçabilité complète des actions.
  - **Gestion Équipe & RBAC (`/team`) :** Attribution des rôles et permissions par utilisateur.

### B. `apps/web-buyer` (Boutique Web Clients)
- **Rôle :** Vitrine e-commerce pour les clients sur ordinateur et mobile web.
- **Fonctionnalités :** Navigation par catégories, recherche intelligente, ventes flash et promotions avec compte à rebours, panier d'achat, tunnel de commande (Livraison à Domicile vs Retrait en Point Relais), suivi de commande temps réel et espace client.

### C. `apps/web-seller` (Espace Vendeurs Web)
- **Rôle :** Gestion complète pour les commerçants partenaires.
- **Fonctionnalités :** Ajout et gestion du catalogue produits (variantes, prix, photos), validation et expédition des commandes reçues, suivi du solde financier et demandes de retrait (Payout).

### D. `apps/web-relay` (Guichet Points Relais)
- **Rôle :** Interface simplifiée pour les commerces partenaires servant de points relais.
- **Fonctionnalités :** Réception des colis déposés par les vendeurs, vérification du code PIN/OTP présenté par l'acheteur, validation sécurisée de la remise du colis et gestion des litiges de stockage.

### E. `apps/mobile-buyer` (Application Mobile Acheteur)
- **Stack :** React Native, Expo SDK, Expo Router, Supabase JS, Push Notifications.
- **Plateformes :** iOS (IPA) & Android (APK/AAB).
- **Expérience Utilisateur :** UI/UX native fluide, géolocalisation des points relais proches, notifications push lors de l'expédition et du retrait.

### F. `apps/mobile-seller` (Application Mobile Commerçant)
- **Stack :** React Native, Expo SDK, Supabase JS.
- **Fonctionnalités :** Notification instantanée à chaque nouvelle commande, prise de photo directe pour les nouveaux articles, mise à jour rapide des stocks.

---

## 4. Base de Données & Backend Supabase

### A. Tables Principales & Entités
- `profiles` : Profils utilisateurs (acheteurs, vendeurs, administrateurs, livreurs, agents relais).
- `shops` : Boutiques commerçantes (nom, slug, statut, KYC, logo, solde).
- `products` : Catalogue articles (prix, stock, statut de modération, médias).
- `orders` & `order_items` : Commandes, lignes d'articles, adresses, modes de livraison.
- `pickup_points` : Points relais enregistrés avec coordonnées GPS, capacité et gérants.
- `couriers` : Livreurs et transporteurs affiliés avec statut de disponibilité.
- `payouts` : Historique des reversements financiers aux vendeurs.
- `promotional_campaigns` : Ventes flash, campagnes promotionnelles et bannières actives.
- `support_tickets` : Tickets de réclamation et assistance client/vendeur.
- `system_logs` : Logs d'erreurs techniques et télémétrie des bugs.
- `audit_logs` : Journal de sécurité et traçabilité des modifications administratives.

### B. Sécurité RLS (Row Level Security)
Toutes les tables ont **RLS activé** avec des règles strictes :
- Un acheteur ne peut lire et écrire que **ses propres commandes et favoris**.
- Un vendeur n'a accès qu'**aux produits et commandes de sa propre boutique**.
- Les administrateurs disposent de privilèges supervisés régis par la table des permissions et les fonctions `SECURITY DEFINER`.

### C. Réplication en Temps Réel (Supabase Realtime)
La publication `supabase_realtime` diffuse les changements (`INSERT`, `UPDATE`, `DELETE`) en temps réel vers les clients web et mobiles connectés.

---

## 5. Sécurité, Authentification & Matrice RBAC

L'accès au panneau d'administration repose sur un système RBAC (*Role-Based Access Control*) modulaire défini dans `apps/web-admin/src/lib/rbac.ts`.

### Matrice des Rôles :
1. **`super_admin`** : Accès absolu à tous les modules, configuration système et gestion d'équipe.
2. **`moderator`** : Modération des fiches produits, validation des boutiques et contrôle conformité.
3. **`logistics_manager`** : Supervision de la flotte de livreurs, points relais et résolution des incidents.
4. **`finance_manager`** : Validation des décaissements (payouts), comptabilité et gestion des commissions.
5. **`support_agent`** : Prise en charge des tickets litiges, assistance acheteurs et vendeurs.

---

## 6. Système Logistique : Domicile & Points Relais

Kalagban propose un double parcours de distribution adapté au contexte ouest-africain :

### 1. Livraison en Point Relais (Économique & Sécurisé)
1. Le vendeur dépose le colis préparé au point relais sélectionné.
2. Le point relais enregistre la réception via `apps/web-relay`.
3. Le client reçoit une notification avec son **Code PIN / OTP unique**.
4. Le client se présente au relais, communique son code : le guichetier valide la remise et la commande passe automatiquement à `completed`.

### 2. Livraison à Domicile (Express)
1. La commande est assignée à un coursier disponible via `apps/web-admin/src/app/couriers`.
2. Le livreur récupère le colis auprès de la boutique et effectue la course.
3. Un lien WhatsApp et les coordonnées directes permettent un guidage fluide.

---

## 7. Moteur Financier, Frais & Commissions

Le package partagé `packages/fee-calculator` centralise l'ensemble des règles de calcul :
- **Commission Marketplace :** Pourcentage prélevé sur le montant des articles (ex: 5% à 15% selon catégorie).
- **Frais de Service & Livraison :** Calculés dynamiquement selon la distance ou forfaitaires en point relais.
- **Séquestre Financier :** Les fonds du vendeur sont crédités sur son solde disponible après validation de la livraison et peuvent être retirés via Mobile Money / Virement bancaire.

---

## 8. Guide de Démarrage Développeur (Local)

### Prérequis
- **Node.js :** Version 18.x ou 20.x LTS.
- **npm :** Version 9+.
- **Compte Supabase :** Projet configuré avec les variables d'environnement.

### 1. Cloner et Installer les Dépendances
```bash
git clone https://github.com/soumangouroutechnologie/kalagban.git
cd kalagban
npm install
```

### 2. Configuration des Variables d'Environnement
Créer les fichiers `.env.local` dans chaque sous-projet avec les clés Supabase :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-publique
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role-privee
```

### 3. Lancer les Applications en Local
- **Lancer le Back-Office Admin :**
  ```bash
  cd apps/web-admin && npm run dev
  # Accessible sur http://localhost:3000
  ```
- **Lancer la Marketplace Web Acheteur :**
  ```bash
  cd apps/web-buyer && npm run dev
  # Accessible sur http://localhost:3001
  ```
- **Lancer l'Espace Commerçant Web :**
  ```bash
  cd apps/web-seller && npm run dev
  # Accessible sur http://localhost:3002
  ```
- **Lancer l'Application Mobile (Expo) :**
  ```bash
  cd apps/mobile-buyer && npx expo start
  ```

---

## 9. Procédures de Build & Déploiement

### A. Applications Web (Vercel)
Chaque application web (`web-admin`, `web-buyer`, `web-seller`, `web-relay`) est configurée pour un déploiement continu CI/CD sur Vercel :
- **Branche de production :** `main`
- **Root Directory Vercel :** Définir le dossier spécifique (ex: `apps/web-admin`).

### B. Applications Mobiles (Expo EAS Build)
Pour générer les fichiers APK Android et bundles iOS :
```bash
# Pour l'app Acheteur
cd apps/mobile-buyer
eas build --platform android --profile preview

# Pour l'app Vendeur
cd apps/mobile-seller
eas build --platform android --profile preview
```

### C. Vérification de Non-Régression & Compilation TypeScript
Avant tout commit ou livraison :
```bash
# Vérifier la compilation globale de tous les projets
npm run check-all || (cd apps/web-admin && npx tsc --noEmit && cd ../web-buyer && npx tsc --noEmit && cd ../web-seller && npx tsc --noEmit && cd ../mobile-buyer && npx tsc --noEmit && cd ../mobile-seller && npx tsc --noEmit)
```

---

## 10. Surveillance, Télémétrie & Bonnes Pratiques

### 1. Télémétrie Automatique des Erreurs (`/bugs`)
Toute exception non interceptée sur les applications clientes est automatiquement capturée et insérée dans la table `system_logs`. L'administrateur peut visualiser la pile d'exécution (*stacktrace*), le terminal du client et passer le ticket à l'état *Résolu*.

### 2. Scanner de Sécurité Local
Le projet intègre un pipeline de scan de sécurité local :
```bash
# Lancer le scanner de sécurité global
~/security-tools/security-scan.sh
```
Ce script génère automatiquement les rapports Semgrep, Trivy et Gitleaks dans le dossier `security-reports/`.

---

### 🤝 Recommandation pour le Nouveau Développeur
1. Toujours appliquer les migrations SQL via `supabase/migrations/` de manière incrémentale.
2. Ne jamais modifier les règles RLS sans tester l'étanchéité des données acheteur/vendeur.
3. Toujours exécuter `npx tsc --noEmit` avant de pousser du code sur la branche `main`.
4. Consulter l'historique des commits pour suivre les évolutions récentes.
