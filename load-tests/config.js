/**
 * KALAGBAN - Configuration des Tests de Charge k6
 * Permet de basculer facilement entre local, staging et production.
 */

// Environnements cibles configurables via variable d'environnement TARGET_ENV
const ENVIRONMENTS = {
  local: {
    buyerUrl: __ENV.BUYER_URL || 'http://localhost:3000',
    sellerUrl: __ENV.SELLER_URL || 'http://localhost:3001',
    adminUrl: __ENV.ADMIN_URL || 'http://localhost:3002',
    relayUrl: __ENV.RELAY_URL || 'http://localhost:3003',
  },
  staging: {
    buyerUrl: __ENV.BUYER_URL || 'https://staging.kalagban.com',
    sellerUrl: __ENV.SELLER_URL || 'https://staging-vendeur.kalagban.com',
    adminUrl: __ENV.ADMIN_URL || 'https://staging-admin.kalagban.com',
    relayUrl: __ENV.RELAY_URL || 'https://staging-relais.kalagban.com',
  },
  production: {
    buyerUrl: __ENV.BUYER_URL || 'https://kalagban.com',
    sellerUrl: __ENV.SELLER_URL || 'https://vendeur.kalagban.com',
    adminUrl: __ENV.ADMIN_URL || 'https://admin.kalagban.com',
    relayUrl: __ENV.RELAY_URL || 'https://relais.kalagban.com',
  },
};

const currentEnv = __ENV.TARGET_ENV || 'production';
export const config = ENVIRONMENTS[currentEnv] || ENVIRONMENTS.production;

// En-têtes HTTP standards
export const DEFAULT_HEADERS = {
  'User-Agent': 'k6-load-test/kalagban-engine-v1.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
};

export const JSON_HEADERS = {
  ...DEFAULT_HEADERS,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Seuils de performance par défaut (SLO)
export const DEFAULT_THRESHOLDS = {
  // 95% des requêtes doivent répondre en moins de 500ms
  http_req_duration: ['p(95)<500', 'p(99)<1200'],
  // Moins de 1% d'erreurs HTTP autorisées
  http_req_failed: ['rate<0.01'],
};
