/**
 * Kalagban Marketplace - Official Application Fee Calculation Engine
 * 
 * Official Fee Tiers:
 * - 0 <= montant <= 10 000 FCFA   -> 4.75%
 * - 10 000 < montant <= 20 000 FCFA -> 3.00%
 * - 20 000 < montant <= 30 000 FCFA -> 2.00%
 * - 30 000 < montant <= 100 000 FCFA -> 1.50%
 * - montant > 100 000 FCFA        -> 0.99%
 */

function calculateApplicationFee(amount, shippingFee = 0) {
  const cleanAmount = Math.max(0, Number(amount) || 0);
  const cleanShipping = Math.max(0, Number(shippingFee) || 0);

  if (cleanAmount === 0) {
    return {
      subtotal: 0,
      rate: 0,
      applicationFee: 0,
      shippingFee: cleanShipping,
      total: cleanShipping,
    };
  }

  let rate = 0;
  if (cleanAmount <= 10000) {
    rate = 0.0475; // 4.75%
  } else if (cleanAmount <= 20000) {
    rate = 0.03; // 3.00%
  } else if (cleanAmount <= 30000) {
    rate = 0.02; // 2.00%
  } else if (cleanAmount <= 100000) {
    rate = 0.015; // 1.50%
  } else {
    rate = 0.0099; // 0.99%
  }

  const applicationFee = Math.round(cleanAmount * rate);
  const total = cleanAmount + applicationFee + cleanShipping;

  return {
    subtotal: cleanAmount,
    rate,
    applicationFee,
    shippingFee: cleanShipping,
    total,
  };
}

console.log("================================================================================");
console.log("             KALAGBAN - TEST OFFICIEL DU BARÈME DES FRAIS D'APPLICATION          ");
console.log("================================================================================\n");

const testCases = [
  // Cas normaux
  { amount: 5000, expectedRate: 0.0475, expectedFee: 238, expectedTotal: 5238, desc: "Cas normal 5 000 FCFA (4.75%)" },
  { amount: 10000, expectedRate: 0.0475, expectedFee: 475, expectedTotal: 10475, desc: "Cas limite haut 10 000 FCFA (4.75%)" },
  { amount: 15000, expectedRate: 0.03, expectedFee: 450, expectedTotal: 15450, desc: "Cas normal 15 000 FCFA (3.00%)" },
  { amount: 20000, expectedRate: 0.03, expectedFee: 600, expectedTotal: 20600, desc: "Cas limite haut 20 000 FCFA (3.00%)" },
  { amount: 25000, expectedRate: 0.02, expectedFee: 500, expectedTotal: 25500, desc: "Cas normal 25 000 FCFA (2.00%)" },
  { amount: 30000, expectedRate: 0.02, expectedFee: 600, expectedTotal: 30600, desc: "Cas limite haut 30 000 FCFA (2.00%)" },
  { amount: 50000, expectedRate: 0.015, expectedFee: 750, expectedTotal: 50750, desc: "Cas normal 50 000 FCFA (1.50%)" },
  { amount: 100000, expectedRate: 0.015, expectedFee: 1500, expectedTotal: 101500, desc: "Cas limite haut 100 000 FCFA (1.50%)" },
  { amount: 150000, expectedRate: 0.0099, expectedFee: 1485, expectedTotal: 151485, desc: "Cas normal 150 000 FCFA (0.99%)" },

  // Cas limites / frontières
  { amount: 0, expectedRate: 0, expectedFee: 0, expectedTotal: 0, desc: "Cas montant 0 FCFA" },
  { amount: 10001, expectedRate: 0.03, expectedFee: 300, expectedTotal: 10301, desc: "Cas juste au-dessus 10 000 FCFA (3.00%)" },
  { amount: 20001, expectedRate: 0.02, expectedFee: 400, expectedTotal: 20401, desc: "Cas juste au-dessus 20 000 FCFA (2.00%)" },
  { amount: 30001, expectedRate: 0.015, expectedFee: 450, expectedTotal: 30451, desc: "Cas juste au-dessus 30 000 FCFA (1.50%)" },
  { amount: 100001, expectedRate: 0.0099, expectedFee: 990, expectedTotal: 100991, desc: "Cas juste au-dessus 100 000 FCFA (0.99%)" },
  
  // Avec frais de livraison (ex: 500 FCFA point relais)
  { amount: 5000, shippingFee: 500, expectedRate: 0.0475, expectedFee: 238, expectedTotal: 5738, desc: "5 000 FCFA + 500 FCFA livraison" },
  { amount: 20000, shippingFee: 1500, expectedRate: 0.03, expectedFee: 600, expectedTotal: 22100, desc: "20 000 FCFA + 1500 FCFA livraison à domicile" },
];

let allPassed = true;

testCases.forEach((tc, idx) => {
  const res = calculateApplicationFee(tc.amount, tc.shippingFee || 0);
  const rateMatch = Math.abs(res.rate - tc.expectedRate) < 0.0001;
  const feeMatch = res.applicationFee === tc.expectedFee;
  const totalMatch = res.total === tc.expectedTotal;

  const passed = rateMatch && feeMatch && totalMatch;
  if (!passed) allPassed = false;

  const symbol = passed ? "✅" : "❌";
  console.log(`${symbol} [Test ${idx + 1}] ${tc.desc}`);
  console.log(`   Base: ${tc.amount.toLocaleString()} FCFA | Taux: ${(res.rate * 100).toFixed(2)}% | Frais: ${res.applicationFee} FCFA (Attendu: ${tc.expectedFee}) | Total: ${res.total} FCFA (Attendu: ${tc.expectedTotal})`);
  if (!passed) {
    console.error(`   ERREUR sur le test:`, { res, expected: tc });
  }
});

console.log("\n--------------------------------------------------------------------------------");
if (allPassed) {
  console.log("🎉 TOUS LES TESTS UNITAIRES ET DE FRONTIÈRE ONT RÉUSSI AVEC SUCCÈS !");
} else {
  console.error("❌ DES ERREURS ONT ÉTÉ DÉTECTÉES DANS LES CALCULS !");
  process.exit(1);
}
console.log("--------------------------------------------------------------------------------\n");

module.exports = { calculateApplicationFee };
