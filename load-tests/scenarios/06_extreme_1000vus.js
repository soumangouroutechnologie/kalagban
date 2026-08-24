/**
 * SCÉNARIO 06 : TEST EXTRÊME - 1000 UTILISATEURS SIMULTANÉS (1000 VUs)
 * 
 * Objectif : Pousser la plateforme dans ses retranchements avec 1000 VUs
 * pour observer la latence sous charge maximale, le débit (req/s) et la résilience.
 */
import http from 'k6/http';
import { group } from 'k6';
import { config, DEFAULT_HEADERS } from '../config.js';
import { validateResponse, thinkTime } from '../helpers/utils.js';
import { SEARCH_KEYWORDS, CATEGORIES, getRandomItem } from '../helpers/payload-data.js';

export const options = {
  stages: [
    { duration: '15s', target: 250 },   // Montée rapide à 250 VUs
    { duration: '20s', target: 750 },   // Accélération vers 750 VUs
    { duration: '25s', target: 1000 },  // Atteinte du pic de 1000 VUs
    { duration: '30s', target: 1000 },  // Maintien à 1000 VUs en continu
    { duration: '15s', target: 0 },     // Descente progressive
  ],
  thresholds: {
    // Sous charge extrême de 1000 VUs
    http_req_failed: ['rate<0.10'], // Moins de 10% d'erreurs tolérées au pic
  },
};

export default function () {
  const keyword = getRandomItem(SEARCH_KEYWORDS);
  const category = getRandomItem(CATEGORIES);

  group('1. Consultation Accueil', function () {
    const resHome = http.get(`${config.buyerUrl}/`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'Home_1000' },
    });
    validateResponse(resHome, 'Home Page');
    thinkTime(1, 2);
  });

  group('2. Recherche Intense', function () {
    const resSearch = http.get(`${config.buyerUrl}/?q=${encodeURIComponent(keyword)}`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'Search_1000' },
    });
    validateResponse(resSearch, `Search: ${keyword}`);
    thinkTime(1, 2);
  });

  group('3. Rayon / Catégorie', function () {
    const resCat = http.get(`${config.buyerUrl}/category/${category}`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'Category_1000' },
    });
    validateResponse(resCat, `Cat: ${category}`);
    thinkTime(1, 2);
  });
}
