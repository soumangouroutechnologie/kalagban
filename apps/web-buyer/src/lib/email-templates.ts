// Kalagban Email Templates for Transactional Notifications
// Brand Colors: Indigo #4F46E5, Emerald #10B981, Dark #0F172A, Background #F8FAFC

interface ShippedEmailProps {
  orderCode: string;
  customerName: string;
  shopName?: string;
  itemsCount?: number;
  totalAmount?: number;
  deliveryType?: string;
  trackingUrl?: string;
}

interface ReadyForPickupEmailProps {
  orderCode: string;
  customerName: string;
  pickupCode: string;
  relayName: string;
  relayAddress?: string;
  relayCommune?: string;
  totalAmount?: number;
  trackingUrl?: string;
}

/**
 * 1. Email : EN COURS D'EXPÉDITION 🚚
 */
export function generateShippedEmailHtml(props: ShippedEmailProps): string {
  const {
    orderCode,
    customerName,
    shopName = "Boutique Kalagban",
    deliveryType = "Point Relais",
    trackingUrl = "https://kalagban.com/account",
  } = props;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre commande #${orderCode} est en cours d'expédition</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #3730A3 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Kalagban</h1>
              <p style="margin: 6px 0 0 0; color: #E0E7FF; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Marketplace Sécurisée de Côte d'Ivoire</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 30px;">
              <!-- Status Icon & Title -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; border-radius: 20px; background-color: #EEF2FF; font-size: 32px; text-align: center; margin-bottom: 12px;">
                  🚚
                </div>
                <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A;">Votre colis est en route !</h2>
                <p style="margin: 6px 0 0 0; color: #64748B; font-size: 14px; font-weight: 500;">
                  Bonjour <strong style="color: #0F172A;">${customerName}</strong>, votre commande a été prise en charge.
                </p>
              </div>

              <!-- Order Info Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; padding-bottom: 8px;">N° de Commande</td>
                        <td align="right" style="font-size: 14px; font-weight: 900; color: #4F46E5; font-family: monospace; padding-bottom: 8px;">#${orderCode}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; padding-bottom: 8px;">Boutique Vendeuse</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #0F172A; padding-bottom: 8px;">${shopName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Mode d'Acheminement</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #0F172A;">${deliveryType}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Timeline step callout -->
              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 16px; padding: 18px; margin-bottom: 28px; text-align: left;">
                <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600; line-height: 1.5;">
                  📦 <strong>Prochaine Étape :</strong> Dès que le coursier déposera votre colis au Point Relais désigné, vous recevrez un email immédiat contenant votre <strong>Code Secret de Retrait OTP</strong>.
                </p>
              </div>

              <!-- Button CTA -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; padding: 16px 32px; border-radius: 16px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                  Suivre ma commande en direct →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 24px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 12px; color: #64748B; font-weight: 500;">
                Besoin d'aide ? Contactez notre support 24/7 sur WhatsApp au <strong>+225 07 77 62 08 64</strong>.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                © 2026 Kalagban Côte d'Ivoire. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 2. Email : PRÊT À RÉCUPÉRER AU POINT RELAIS 📍 (AVEC CODE OTP & ADRESSE)
 */
export function generateReadyForPickupEmailHtml(props: ReadyForPickupEmailProps): string {
  const {
    orderCode,
    customerName,
    pickupCode,
    relayName,
    relayAddress = "Abidjan",
    relayCommune = "Cocody",
    trackingUrl = "https://kalagban.com/account",
  } = props;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre colis est disponible au Point Relais #${orderCode}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
          
          <!-- Header (Emerald & Indigo Gradient) -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #047857 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Kalagban</h1>
              <p style="margin: 6px 0 0 0; color: #D1FAE5; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Colis Prêt pour Retrait Immédiat</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 30px;">
              <!-- Title -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; border-radius: 20px; background-color: #ECFDF5; font-size: 32px; text-align: center; margin-bottom: 12px;">
                  📍
                </div>
                <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A;">Votre colis est disponible !</h2>
                <p style="margin: 6px 0 0 0; color: #64748B; font-size: 14px; font-weight: 500;">
                  Bonjour <strong style="color: #0F172A;">${customerName}</strong>, votre colis est arrivé au point de retrait.
                </p>
              </div>

              <!-- CRITICAL: OTP CODE CARD -->
              <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border: 2px dashed #6366F1; border-radius: 20px; padding: 24px; text-align: center; margin-bottom: 28px;">
                <span style="font-size: 11px; font-weight: 900; color: #4338CA; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">
                  🔐 Votre Code Secret de Retrait (OTP)
                </span>
                <span style="font-size: 38px; font-weight: 900; color: #1E1B4B; font-family: monospace; letter-spacing: 8px; display: block; margin: 6px 0;">
                  ${pickupCode}
                </span>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #4338CA; font-weight: 600;">
                  Ne communiquez ce code qu'au gérant au moment de récupérer votre colis.
                </p>
              </div>

              <!-- Pickup Point Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; padding-bottom: 8px;">Point Relais</td>
                        <td align="right" style="font-size: 14px; font-weight: 900; color: #0F172A; padding-bottom: 8px;">${relayName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; padding-bottom: 8px;">Localisation</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #0F172A; padding-bottom: 8px;">${relayAddress}${relayCommune ? ` (${relayCommune})` : ''}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Délai de Retrait</td>
                        <td align="right" style="font-size: 13px; font-weight: 800; color: #D97706;">5 jours ouvrés</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action button -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #10B981; color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; padding: 16px 32px; border-radius: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                  Voir les détails du retrait →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 24px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 12px; color: #64748B; font-weight: 500;">
                Besoin d'assistance ? Notre service client est disponible sur WhatsApp au <strong>+225 07 77 62 08 64</strong>.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                © 2026 Kalagban Côte d'Ivoire. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export interface OrderConfirmationEmailProps {
  orderCode: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  applicationFee: number;
  shippingFee: number;
  totalAmount: number;
  deliveryType: string;
  shippingAddress: string;
  paymentMethod: string;
  trackingUrl?: string;
}

/**
 * 3. Email : CONFIRMATION DE COMMANDE 🎉
 */
export function generateOrderConfirmationEmailHtml(props: OrderConfirmationEmailProps): string {
  const {
    orderCode,
    customerName,
    items = [],
    subtotal,
    applicationFee,
    shippingFee,
    totalAmount,
    deliveryType = "Point Relais",
    shippingAddress = "Abidjan",
    paymentMethod = "Paiement à la livraison",
    trackingUrl = "https://kalagban.com/account",
  } = props;

  const itemsRows = items.map((it) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 13px; font-weight: 600; color: #0F172A;">
        ${it.name} <span style="color: #64748B; font-size: 12px;">(x${it.quantity})</span>
      </td>
      <td align="right" style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 13px; font-weight: 800; color: #0F172A;">
        ${(it.price * it.quantity).toLocaleString("fr-FR")} FCFA
      </td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de votre commande #${orderCode}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #3730A3 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Kalagban</h1>
              <p style="margin: 6px 0 0 0; color: #E0E7FF; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Confirmation de Commande</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 30px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; border-radius: 20px; background-color: #ECFDF5; font-size: 32px; text-align: center; margin-bottom: 12px;">
                  🎉
                </div>
                <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A;">Merci pour votre achat !</h2>
                <p style="margin: 6px 0 0 0; color: #64748B; font-size: 14px; font-weight: 500;">
                  Bonjour <strong style="color: #0F172A;">${customerName}</strong>, votre commande <strong>#${orderCode}</strong> a été enregistrée avec succès.
                </p>
              </div>

              <!-- Order Summary Items Table -->
              <div style="background-color: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Détails des Articles</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  ${itemsRows}
                  <tr>
                    <td style="padding-top: 14px; font-size: 12px; color: #64748B;">Sous-total</td>
                    <td align="right" style="padding-top: 14px; font-size: 13px; font-weight: 700; color: #0F172A;">${(subtotal || 0).toLocaleString("fr-FR")} FCFA</td>
                  </tr>
                  ${applicationFee ? `
                  <tr>
                    <td style="padding-top: 6px; font-size: 12px; color: #64748B;">Frais de service</td>
                    <td align="right" style="padding-top: 6px; font-size: 13px; font-weight: 700; color: #4F46E5;">+${applicationFee.toLocaleString("fr-FR")} FCFA</td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding-top: 6px; font-size: 12px; color: #64748B;">Livraison (${deliveryType === "pickup_point" ? "Point Relais" : "À Domicile"})</td>
                    <td align="right" style="padding-top: 6px; font-size: 13px; font-weight: 700; color: #0F172A;">${(shippingFee || 0).toLocaleString("fr-FR")} FCFA</td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px; border-top: 2px solid #E2E8F0; font-size: 15px; font-weight: 900; color: #0F172A;">Total Réglé / Dû</td>
                    <td align="right" style="padding-top: 12px; border-top: 2px solid #E2E8F0; font-size: 17px; font-weight: 900; color: #4F46E5;">${(totalAmount || 0).toLocaleString("fr-FR")} FCFA</td>
                  </tr>
                </table>
              </div>

              <!-- Shipping and Payment Details -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; padding-bottom: 8px;">Mode de Livraison</td>
                        <td align="right" style="font-size: 13px; font-weight: 800; color: #0F172A; padding-bottom: 8px;">${deliveryType === "pickup_point" ? "Point Relais" : "Livraison à Domicile"}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; padding-bottom: 8px;">Destination</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #0F172A; padding-bottom: 8px;">${shippingAddress}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Moyen de Paiement</td>
                        <td align="right" style="font-size: 13px; font-weight: 800; color: #10B981;">${paymentMethod}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; padding: 16px 32px; border-radius: 16px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                  Suivre ma Commande en Direct →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F1F5F9; padding: 24px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 12px; color: #64748B; font-weight: 500;">
                Besoin d'aide ? Contactez notre support WhatsApp au <strong>+225 07 77 62 08 64</strong>.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                © 2026 Kalagban Marketplace. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

