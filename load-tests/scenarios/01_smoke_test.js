/**
 * SCÉNARIO 01 : SMOKE TEST (Test de Santé & Disponibilité)
 * 
 * Objectif : Vérifier avec une charge minimale (2 VUs pendant 30s) que
 * toutes les routes et pages critiques sont accessibles et retournent 200 OK.
 */
import http from 'k6/http';
import { group } from 'k6';
import { config, DEFAULT_HEADERS, DEFAULT_THRESHOLDS } from '../config.js';
import { validateResponse, thinkTime } from '../helpers/utils.js';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: DEFAULT_THRESHOLDS,
};

export default function () {
  group('1. Boutique Acheteur', function () {
    const resHome = http.get(`${config.buyerUrl}/`, { headers: DEFAULT_HEADERS });
    validateResponse(resHome, 'Home Page');

    thinkTime(1, 2);

    const resTerms = http.get(`${config.buyerUrl}/terms`, { headers: DEFAULT_HEADERS });
    validateResponse(resTerms, 'Conditions Générales');

    const resShipping = http.get(`${config.buyerUrl}/shipping-policy`, { headers: DEFAULT_HEADERS });
    validateResponse(resShipping, 'Politique de Livraison');
  });

  group('2. Portail Vendeur', function () {
    const resSeller = http.get(`${config.sellerUrl}/`, { headers: DEFAULT_HEADERS });
    validateResponse(resSeller, 'Accueil Vendeur');
  });

  group('3. Espace Relais', function () {
    const resRelay = http.get(`${config.relayUrl}/`, { headers: DEFAULT_HEADERS });
    validateResponse(resRelay, 'Accueil Relais');
  });

  group('4. Administration', function () {
    const resAdmin = http.get(`${config.adminUrl}/`, { headers: DEFAULT_HEADERS });
    validateResponse(resAdmin, 'Accueil Admin');
  });

  thinkTime(2, 3);
}
