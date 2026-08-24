/**
 * SCÉNARIO 02 : BUYER JOURNEY (Parcours Utilisateur Acheteur)
 * 
 * Objectif : Simuler un comportement réaliste d'acheteur :
 * 1. Accès à la boutique
 * 2. Recherche textuelle de produits
 * 3. Consultation d'une catégorie
 * 4. Consultation d'une fiche produit
 * 5. Simulation de panier et calcul de frais de livraison
 */
import http from 'k6/http';
import { group } from 'k6';
import { config, DEFAULT_HEADERS, DEFAULT_THRESHOLDS } from '../config.js';
import { validateResponse, thinkTime } from '../helpers/utils.js';
import { SEARCH_KEYWORDS, CATEGORIES, getRandomItem } from '../helpers/payload-data.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Montée à 20 acheteurs
    { duration: '1m',  target: 50 },  // Charge stable à 50 acheteurs
    { duration: '20s', target: 0 },   // Descente
  ],
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'http_req_duration{name:SearchPage}': ['p(95)<400'],
  },
};

export default function () {
  const keyword = getRandomItem(SEARCH_KEYWORDS);
  const category = getRandomItem(CATEGORIES);

  group('Étape 1: Page d\'accueil', function () {
    const resHome = http.get(`${config.buyerUrl}/`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'HomePage' },
    });
    validateResponse(resHome, 'Home Page');
    thinkTime(2, 4);
  });

  group('Étape 2: Recherche Produit', function () {
    const resSearch = http.get(`${config.buyerUrl}/?q=${encodeURIComponent(keyword)}`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'SearchPage' },
    });
    validateResponse(resSearch, `Search: ${keyword}`);
    thinkTime(2, 3);
  });

  group('Étape 3: Filtre par Catégorie', function () {
    const resCat = http.get(`${config.buyerUrl}/category/${category}`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'CategoryPage' },
    });
    validateResponse(resCat, `Category: ${category}`);
    thinkTime(2, 4);
  });

  group('Étape 4: Consultation Détail Produit', function () {
    const resProduct = http.get(`${config.buyerUrl}/products`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'ProductsCatalog' },
    });
    validateResponse(resProduct, 'Products Catalog');
    thinkTime(3, 5);
  });
}
