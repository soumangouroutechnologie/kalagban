/**
 * Fonctions d'assistance pour les scénarios k6
 */
import { check, sleep } from 'k6';

/**
 * Pause aléatoire (Think Time de l'utilisateur) entre min et max secondes
 */
export function thinkTime(min = 1, max = 3) {
  const delay = Math.random() * (max - min) + min;
  sleep(delay);
}

/**
 * Validation standard d'une réponse HTTP avec vérification de statut et timing
 */
export function validateResponse(res, stepName, expectedStatus = 200) {
  const isOk = check(res, {
    [`${stepName} - Status ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${stepName} - Duration < 1000ms`]: (r) => r.timings.duration < 1000,
  });

  if (!isOk && res.status >= 400) {
    console.warn(`[WARN] Échec étape '${stepName}' - Status: ${res.status}, URL: ${res.url}`);
  }

  return isOk;
}
