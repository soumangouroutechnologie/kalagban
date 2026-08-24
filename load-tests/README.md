# 🚀 KALAGBAN - Suite de Tests de Charge & Performance (k6)

Ce dossier contient l'ensemble des scénarios de tests de charge, de stress et de pic de trafic conçus avec **Grafana k6** pour la plateforme **KALAGBAN (SOUMANGOUROU TECHNOLOGIE)**.

---

## 📦 1. Installation de k6

### Sur macOS (Homebrew) :
```bash
brew install k6
```

### Sur Linux (Debian / Ubuntu) :
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Via Docker (sans installation locale) :
```bash
docker run --rm -i grafana/k6 run - <load-tests/scenarios/01_smoke_test.js
```

---

## 🎯 2. Scénarios Disponibles

| Fichier | Type de Test | Description & Objectif |
| :--- | :--- | :--- |
| `01_smoke_test.js` | **Smoke Test** | Vérifie en 30s avec 2 VUs que toutes les applications web (Acheteur, Vendeur, Relais, Admin) répondent 200 OK. |
| `02_buyer_journey.js` | **Load Test** | Simule 50 acheteurs simultanés effectuant des recherches, filtrant par catégorie et consultant les produits. |
| `03_stress_test.js` | **Stress Test** | Montée progressive jusqu'à 500 VUs pour déterminer le seuil de saturation du serveur et de Supabase. |
| `04_spike_sale.js` | **Spike Test** | Simule un afflux brutal de 0 à 300 utilisateurs en 15 secondes (type "Vente Flash" ou alerte promo). |
| `05_kpay_checkout.js` | **API Checkout** | Éprouve la route d'initialisation de paiement K-PAY et le calcul des frais logistiques. |

---

## ⚡ 3. Exécution des Tests

### Via les commandes npm :
```bash
# 1. Smoke test rapide
npm run test:load:smoke

# 2. Parcours complet acheteur
npm run test:load:buyer

# 3. Test de stress (jusqu'à 500 VUs)
npm run test:load:stress

# 4. Test de pic soudain (Vente Flash)
npm run test:load:spike

# 5. Test API Paiement KPay
npm run test:load:kpay
```

### Cibler un environnement spécifique (Local, Staging ou Production) :
Par défaut, les tests ciblent la production (`https://kalagban.com`). Vous pouvez basculer d'environnement via la variable `TARGET_ENV` :

```bash
# Tester l'environnement local (localhost:3000)
TARGET_ENV=local k6 run load-tests/scenarios/01_smoke_test.js

# Tester l'environnement de staging
TARGET_ENV=staging k6 run load-tests/scenarios/02_buyer_journey.js
```

---

## 📊 4. Interprétation des Métriques

Lorsqu'un test k6 s'exécute, il affiche un tableau récapitulatif :
- **`http_req_duration`** : Temps de réponse total de la requête.
  - `p(95) < 500ms` : 95% des utilisateurs reçoivent la page en moins de 0.5s (**Excellente réactivité**).
  - `p(99) < 1200ms` : 99% des requêtes sont servies en moins de 1.2s.
- **`http_req_failed`** : Taux d'erreurs (doit rester $< 1\%$).
- **`vus` / `vus_max`** : Nombre d'utilisateurs virtuels actifs simultanément.
- **`iterations`** : Nombre total de cycles de navigation complétés.
