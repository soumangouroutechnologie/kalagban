import https from "https";

/**
 * Script de test d'envoi de notification Push Expo
 * Usage: node scripts/send-test-push.mjs <ExponentPushToken> [title] [body] [orderId]
 * Ex: node scripts/send-test-push.mjs "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" "Kalagban" "Votre commande est prête !" "123e4567-e89b-12d3-a456-426614174000"
 */

const args = process.argv.slice(2);
const pushToken = args[0];
const title = args[1] || "🛍️ Kalagban - Test Notification";
const body = args[2] || "Ceci est un test de notification push en temps réel sur Android !";
const orderId = args[3] || "test-order-123";

if (!pushToken || !pushToken.startsWith("ExponentPushToken[")) {
  console.error("\n❌ Erreur : Veuillez fournir un token Expo valide en premier argument.");
  console.log("Usage: node scripts/send-test-push.mjs \"ExponentPushToken[xxxxxxxx]\" [titre] [message] [orderId]\n");
  process.exit(1);
}

const payload = JSON.stringify([
  {
    to: pushToken,
    sound: "default",
    title: title,
    body: body,
    data: {
      orderId: orderId,
      url: `/orders/${orderId}`,
    },
    priority: "high",
    channelId: "default",
  },
]);

const options = {
  hostname: "exp.host",
  port: 443,
  path: "/--/api/v2/push/send",
  method: "POST",
  headers: {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  },
};

console.log(`\n🚀 Envoi de la notification de test vers : ${pushToken}...`);
console.log(`📌 Titre : ${title}`);
console.log(`💬 Message : ${body}`);
console.log(`🔗 Payload Deep Link : orderId = ${orderId}\n`);

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(data);
      console.log("✅ Réponse d'Expo Push API :");
      console.dir(response, { depth: null, colors: true });

      if (response.data && response.data[0] && response.data[0].status === "ok") {
        console.log("\n🎉 Succès ! La notification a été envoyée avec succès à votre appareil Android.");
      } else if (response.data && response.data[0] && response.data[0].status === "error") {
        console.error(`\n⚠️ Erreur Expo : ${response.data[0].message} (${response.data[0].details?.error})`);
      }
    } catch (e) {
      console.log("Réponse brute :", data);
    }
  });
});

req.on("error", (e) => {
  console.error("❌ Erreur réseau lors de l'appel Expo :", e);
});

req.write(payload);
req.end();
