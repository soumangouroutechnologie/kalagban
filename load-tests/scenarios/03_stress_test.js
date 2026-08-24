/**
 * SCÉNARIO 03 : STRESS TEST (Montée en charge progressive jusqu'à saturation)
 * 
 * Objectif : Déterminer la capacité maximale de la plateforme et vérifier son comportement
 * sous forte charge (jusqu'à 250 - 500 VUs) sans crash serveur ni dégradation critique.
 */
import http from 'k6/http';
import { group } from 'k6';
import { config, DEFAULT_HEADERS } from '../config.js';
import { validateResponse, thinkTime } from '../helpers/utils.js';
import { SEARCH_KEYWORDS, getRandomItem } from '../helpers/payload-data.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Échauffement
    { duration: '1m',  target: 150 },  // Charge soutenue normale
    { duration: '1m',  target: 300 },  // Charge élevée
    { duration: '1m',  target: 500 },  // Pic de stress maximal
    { duration: '30s', target: 0 },    // Récupération
  ],
  thresholds: {
    // Sous charge extrême, 90% des requêtes doivent rester sous 1.5s
    http_req_duration: ['p(90)<1500'],
    // Moins de 5% d'erreurs même au pic de stress
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const keyword = getRandomItem(SEARCH_KEYWORDS);

  group('Stress - Navigation & Recherche', function () {
    const resHome = http.get(`${config.buyerUrl}/`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'Stress_Home' },
    });
    validateResponse(resHome, 'Stress Home');

    thinkTime(1, 2);

    const resSearch = http.get(`${config.buyerUrl}/?q=${encodeURIComponent(keyword)}`, {
      headers: DEFAULT_HEADERS,
      tags: { name: 'Stress_Search' },
    });
    validateResponse(resSearch, 'Stress Search');

    thinkTime(1, 2);
  });
}
