# 🛒 KALAGBAN MARKETPLACE - Architecture & Documentation Technique

> **Plateforme E-Commerce Multi-Vendeurs & Écosystème Logistique Intégré**  
> Développé pour le commerce digital en Afrique de l'Ouest (Guinée / Conakry & sous-région).

---

## 📋 Table des Matières

1. [Vue d'ensemble du Projet](#-vue-densemble-du-projet)
2. [Architecture du Monorepo](#-architecture-du-monorepo)
3. [Détail des Applications & Packages](#-détail-des-applications--packages)
4. [Logique Métier & Flux Clés](#-logique-métier--flux-clés)
5. [Base de Données & Sécurité Supabase (RLS)](#-base-de-données--sécurité-supabase-rls)
6. [Variables d'Environnement](#-variables-denvironnement)
7. [Installation & Démarrage](#-installation--démarrage)
8. [Build & Déploiement (Web & Mobile APK)](#-build--déploiement-web--mobile-apk)
9. [Guide pour les Développeurs Entrants](#-guide-pour-les-développeurs-entrants)
10. [Tests de Charge & Performance](#-tests-de-charge--performance)

---

## 🌟 Vue d'ensemble du Projet

**Kalagban** est une infrastructure e-commerce complète reliant acheteurs, vendeurs professionnels, agents de points relais et livreurs à domicile.

### Fonctionnalités Clés :
- 🛍️ **Marketplace Multi-Tenant** : Gestion de boutiques indépendantes avec modération des produits.
- 💳 **Paiements Multi-Canaux** : Passerelle K-Pay, Mobile Money (Orange Money, MTN MoMo) et Paiement à la livraison (Cash on Delivery).
- 📦 **Double Mode de Livraison** :
  - **Points Relais** : Dépôt sécurisé par le vendeur et retrait acheteur via **code PIN à 4 chiffres / OTP SMS/WhatsApp**.
  - **Livraison à Domicile** : Assignation de coursiers/livreurs avec redirection WhatsApp et suivi d'itinéraire.
- 📊 **Moteur de Frais d'Application Dégressifs** : Calcul automatique des commissions de plateforme.
- 📱 **Omnicanal Web & Mobile** : 4 applications Web (Next.js 16) et 2 applications Mobiles natives (Expo / React Native).

---

## 🏗️ Architecture du Monorepo

Le projet est structuré sous forme de monorepo géré avec **Turborepo** et **npm workspaces** :

```text
kalagban-monorepo/
├── apps/
│   ├── web-buyer/          # Boutique client Web (Next.js 16, React 19, TailwindCSS v4)
│   ├── web-seller/         # Dashboard vendeur Web (Gestion catalogue, commandes, retraits)
│   ├── web-admin/          # Back-Office Super Admin (Modération, analytics, configuration)
│   ├── web-relay/          # Portail agents Points Relais (Scan, validation OTP/PIN)
│   ├── mobile-buyer/       # Application mobile Acheteur (React Native / Expo SDK 57)
│   └── mobile-seller/      # Application mobile Vendeur (React Native / Expo SDK 57)
├── packages/
│   └── fee-calculator/     # Package TypeScript partagé : Moteur de calcul des commissions
├── supabase/
│   ├── migrations/         # 39+ migrations SQL (Schémas, RLS, triggers, fonctions)
│   ├── functions/          # Deno Edge Functions (send-otp-zavu pour envoi SMS/WhatsApp)
│   └── config.toml         # Configuration locale Supabase
├── load-tests/             # Scénarios de tests de charge k6 (Smoke, Stress, Spike, K-Pay)
├── build-apks/             # Builds Android APK compilés prêts pour distribution
└── package.json            # Configuration racine du monorepo
```

---

## 📱 Détail des Applications & Packages

### 1. `apps/web-buyer` (Boutique Acheteur Web)
- **Framework** : Next.js 16 (App Router), React 19, TailwindCSS v4, Lucide Icons.
- **Fonctions** :
  - Découverte produits, recherche multi-critères, filtres par catégorie et commune.
  - Panier d'achat persistent (`CartContext`), gestion des favoris.
  - Tunnel de commande (Checkout) avec sélection Point Relais ou Livraison à Domicile.
  - Intégration K-Pay Checkout et suivi de statut en temps réel (`OrderStatusTimeline`).
  - Suivi des commandes avec saisie du numéro de téléphone et code de commande.

### 2. `apps/web-seller` (Portail Vendeurs Web)
- **Framework** : Next.js 16, Supabase Auth.
- **Fonctions** :
  - Tableau de bord avec statistiques des ventes et revenus nets.
  - CRUD Produits avec upload d'images sur Supabase Storage.
  - Gestion du cycle de vie des commandes (En attente -> Expédiée -> Livrée).
  - Gestion des demandes de reversement (Payouts).
  - Configuration de la boutique (bannière, logo, contact, géolocalisation).

### 3. `apps/web-admin` (Super Administration)
- **Framework** : Next.js 16, Supabase Auth (RBAC avec rôle `super_admin`).
- **Fonctions** :
  - Modération des produits soumis par les vendeurs (Approbation / Rejet).
  - Gestion des utilisateurs, boutiques et vérifications KYC.
  - Administration du réseau de Points Relais et des Communes desservies.
  - Gestion des coursiers et de la flotte de livraison à domicile.
  - CMS du site (Bannières d'accueil, offres flash, paramètres généraux).
  - Suivi financier global et commissions perçues.

### 4. `apps/web-relay` (Portail Points Relais)
- **Framework** : Next.js 16.
- **Fonctions** :
  - Authentification dédiée aux agents de points relais avec **isolation multi-tenant stricte**.
  - Réception des colis déposés par les vendeurs (Vérification que la commande est bien marquée `shipped`).
  - Remise du colis à l'acheteur après validation du **Code PIN / OTP**.

### 5. `apps/mobile-buyer` & `apps/mobile-seller` (Applications Mobiles)
- **Framework** : Expo SDK 57, React Native 0.86, Expo Router, React Native Reanimated.
- **Plateformes** : Android & iOS.
- **Fonctions Acheteur** : Navigation fluide, géolocalisation des relais, notifications Push, paiement mobile.
- **Fonctions Vendeur** : Prise de photo directe avec la caméra pour les articles, alertes commandes en direct, gestion du stock en mobilité.

### 6. `packages/fee-calculator` (Moteur de Calcul Partagé)
- Package TypeScript centralisé garantissant l'exactitude des calculs de commission sur toute la plateforme :
  - `0 à 10 000 FCFA` ➔ **4.75%**
  - `10 001 à 20 000 FCFA` ➔ **3.00%**
  - `20 001 à 30 000 FCFA` ➔ **2.00%**
  - `30 001 à 100 000 FCFA` ➔ **1.50%**
  - `> 100 000 FCFA` ➔ **0.99%**

---

## 🔄 Logique Métier & Flux Clés

### Flux d'une Commande en Point Relais :
1. **Création** : L'acheteur valide son panier, sélectionne un point relais. Un code PIN unique à 4 chiffres est généré.
2. **Notification Vendeur** : Le vendeur prépare la commande et passe le statut à `shipped`.
3. **Dépôt au Relais** : Le vendeur dépose le colis au point relais désigné. L'agent enregistre le dépôt sur `apps/web-relay`.
4. **Retrait Client** : Le client se présente au point relais, fournit son code PIN/OTP. L'agent valide le code, la commande passe à `delivered` et les fonds sont débloqués pour le vendeur.

### Flux de Livraison à Domicile :
1. L'acheteur renseigne son adresse précise et son numéro de téléphone.
2. Le vendeur ou l'administrateur assigne un coursier partenaire (`courier`).
3. Le coursier reçoit les détails via WhatsApp et assure la livraison directe.

---

## 🔒 Base de Données & Sécurité Supabase (RLS)

Toutes les tables sont sécurisées par des **Row Level Security (RLS)** strictes garantissant l'isolation des données :

- **`shops`** : Modifiables uniquement par leur propriétaire (`auth.uid() = seller_id`) ou les super admins.
- **`orders`** : Visibles uniquement par l'acheteur ayant passé la commande, le vendeur concerné, l'agent du point relais assigné ou le super admin.
- **`products`** : Les produits doivent être modérés (`moderation_status = 'approved'`) pour apparaître sur le catalogue public.
- **`relay_points`** : Isolation stricte par point relais pour empêcher un agent de voir les colis d'un autre relais.

---

## ⚙️ Variables d'Environnement

Créez un fichier `.env.local` à la racine ou dans chaque sous-application selon les besoins :

```env
# Configuration Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Passerelle de Paiement K-Pay
NEXT_PUBLIC_KPAY_API_URL=https://api.k-pay.net/v1
NEXT_PUBLIC_KPAY_MERCHANT_ID=votre_merchant_id
KPAY_SECRET_KEY=votre_cle_secrete

# Passerelle SMS / WhatsApp OTP (Zavu)
ZAVU_API_KEY=votre_cle_zavu
```

---

## 🚀 Installation & Démarrage

### Prérequis :
- **Node.js** >= 18.0.0
- **npm** >= 10.0.0
- **Expo CLI** (pour les applications mobiles)

### 1. Installation des Dépendances
```bash
npm install
```

### 2. Lancement en Mode Développement
Pour lancer toutes les applications en parallèle via Turborepo :
```bash
npm run dev
```

Ou pour lancer une application spécifique :
```bash
# Boutique Web Acheteur (Port 3000)
npm run dev --workspace=web-buyer

# Espace Vendeur Web (Port 3001)
npm run dev --workspace=web-seller

# Super Admin Web (Port 3002)
npm run dev --workspace=web-admin

# Portail Points Relais (Port 3003)
npm run dev --workspace=web-relay

# Application Mobile Acheteur
npm run start --workspace=mobile-buyer

# Application Mobile Vendeur
npm run start --workspace=mobile-seller
```

---

## 📦 Build & Déploiement

### Applications Web (Next.js) :
```bash
npm run build
```

### Applications Mobiles (Expo / Android APK) :
Les builds autonomes d'APK peuvent être générés avec EAS Build ou en local :
```bash
cd apps/mobile-buyer
npx eas build -p android --profile preview
```
Les fichiers APK précompilés sont disponibles dans le dossier `/build-apks/`.

---

## 👨‍💻 Guide pour les Développeurs Entrants

Bienvenue dans l'équipe technique Kalagban ! Voici les règles et conventions à respecter :

1. **Typage Strict** : Tout le code est écrit en **TypeScript**. Évitez impérativement l'usage de `any`.
2. **Commentaires & Documentation** : 
   - Toutes les fonctions complexes, les hooks et les calculs financiers doivent comporter des blocs **JSDoc** explicatifs.
   - Indiquez la raison métier derrière chaque logique non évidente.
3. **Calculs Financiers** : Ne codez JAMAIS de calcul de commission en dur dans un composant UI. Utilisez systématiquement le package `@kalagban/fee-calculator`.
4. **Appels Supabase** :
   - Côté client : Utilisez le client anonyme initialisé dans `@/lib/supabase`.
   - Côté serveur / Admin : Utilisez les Server Actions ou Route Handlers sécurisés avec vérification de session.
5. **Gestion des Erreurs** : Tous les appels asynchrones doivent être entourés de blocs `try / catch` avec messages d'erreur explicites pour l'utilisateur.

---

## 🧪 Tests de Charge & Performance

Des scénarios de tests k6 automatisés sont disponibles dans le dossier `/load-tests` :

```bash
# Test de fumée (Smoke test)
npm run test:load:smoke

# Parcours complet acheteur
npm run test:load:buyer

# Test de résistance et pic de trafic (Spike sale)
npm run test:load:stress
npm run test:load:spike

# Test du flux de paiement K-Pay
npm run test:load:kpay
```

---

## 🛡️ Support & Maintenance

- **Société** : Soumangourou Technologie
- **Support Technique** : contact@soumangouroutechnologie.com
