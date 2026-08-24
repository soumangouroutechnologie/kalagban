/**
 * Données de test réalistes pour l'écosystème KALAGBAN (Côte d'Ivoire)
 */

export const SEARCH_KEYWORDS = [
  'telephone',
  'iphone',
  'samsung',
  'chaussure',
  'robe',
  'montre',
  'sac',
  'ordinateur',
  'perruque',
  'chemise',
  'baskets',
  'ecouteurs',
];

// Catégories réelles définies dans la plateforme KALAGBAN
export const CATEGORIES = [
  'femme',
  'homme',
  'enfants',
  'deco-maison',
];

export const ABIDJAN_COMMUNES = [
  'Cocody',
  'Yopougon',
  'Marcory',
  'Plateau',
  'Koumassi',
  'Treichville',
  'Port-Bouët',
  'Abobo',
  'Adjamé',
  'Attécoubé',
  'Bingerville',
  'Songon',
];

export const PAYMENT_METHODS = [
  'WAVE',
  'ORANGE_MONEY',
  'MTN_MOMO',
  'MOOV_MONEY',
  'CREDIT_CARD',
];

export function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function getRandomPhone() {
  const prefixes = ['07', '05', '01'];
  const prefix = getRandomItem(prefixes);
  const suffix = Math.floor(10000000 + Math.random() * 90000000);
  return `+225${prefix}${suffix}`.slice(0, 14);
}
