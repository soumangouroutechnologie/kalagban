/**
 * SCÉNARIO 05 : KPAY CHECKOUT & FEE CALCULATION
 * 
 * Objectif : Tester la charge et la résilience du tunnel d'initialisation de paiement K-PAY
 * et les routes d'API de checkout.
 */
import http from 'k6/http';
import { group, check } from 'k6';
import { config, JSON_HEADERS } from '../config.js';
import { thinkTime } from '../helpers/utils.js';
import { ABIDJAN_COMMUNES, getRandomItem, getRandomPhone } from '../helpers/payload-data.js';

export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '40s', target: 30 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const commune = getRandomItem(ABIDJAN_COMMUNES);
  const phone = getRandomPhone();

  group('Checkout & Init Paiement', function () {
    // 1. Simulation payload d'initialisation K-PAY
    const initPayload = JSON.stringify({
      amount: 15000,
      currency: 'XOF',
      customerPhone: phone,
      deliveryCommune: commune,
      deliveryType: 'RELAY_POINT',
      isTest: true,
    });

    const resInit = http.post(`${config.buyerUrl}/api/payments/kpay/init`, initPayload, {
      headers: JSON_HEADERS,
      tags: { name: 'KPay_Init_API' },
    });

    // L'API peut renvoyer 200 (si mock/test activé) ou 400/401 si validation stricte requise
    check(resInit, {
      'API KPay Init Responded': (r) => r.status === 200 || r.status === 400 || r.status === 401,
      'API KPay Duration < 800ms': (r) => r.timings.duration < 800,
    });

    thinkTime(2, 4);
  });
}
