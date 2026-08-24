/**
 * SCÉNARIO 04 : SPIKE TEST / FLASH SALE (Test de Pic Brutal de Trafic)
 * 
 * Objectif : Simuler l'arrivée soudaine et massive de visiteurs suite à une alerte
 * promo ou publication sur les réseaux sociaux (0 -> 300 VUs en 15s).
 */
import http from 'k6/http';
import { config, DEFAULT_HEADERS } from '../config.js';
import { validateResponse, thinkTime } from '../helpers/utils.js';

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Trafic de base calme
    { duration: '15s', target: 300 },  // 🚨 SPIKE BRUTAL (Arrivée massive)
    { duration: '45s', target: 300 },  // Maintien du pic
    { duration: '20s', target: 0 },    // Fin de la promo, retour au calme
  ],
  thresholds: {
    // Vérifier la réactivité du serveur durant le choc
    http_req_duration: ['p(95)<1200'],
    http_req_failed: ['rate<0.03'],
  },
};

export default function () {
  const res = http.get(`${config.buyerUrl}/`, {
    headers: DEFAULT_HEADERS,
    tags: { name: 'FlashSale_Landing' },
  });

  validateResponse(res, 'Flash Sale Landing');
  thinkTime(1, 2);
}
