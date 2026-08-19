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
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #EEF2FF; color: #4F46E5; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #E0E7FF;">
                  🚚 Étape 3/4 : Expédition en cours
                </span>
              </div>

              <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 800; text-align: center;">
                Bonne nouvelle, ${customerName} !
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">
                Votre commande <strong style="color: #0F172A;">#${orderCode}</strong> a été emballée par <strong>${shopName}</strong> et remise à notre transporteur officiel Kalagban. Elle est actuellement en route vers votre point de livraison.
              </p>

              <!-- Order Summary Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0; margin-bottom: 28px; padding: 20px;">
                <tr>
                  <td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 10px; color: #64748B; font-size: 13px; font-weight: 600;">N° de Commande</td>
                        <td style="padding-bottom: 10px; color: #4F46E5; font-size: 14px; font-weight: 800; text-align: right; font-family: monospace;">#${orderCode}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; color: #64748B; font-size: 13px; font-weight: 600;">Boutique Vendeur</td>
                        <td style="padding-bottom: 10px; color: #0F172A; font-size: 13px; font-weight: 700; text-align: right;">${shopName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B; font-size: 13px; font-weight: 600;">Mode de Livraison</td>
                        <td style="color: #0F172A; font-size: 13px; font-weight: 700; text-align: right;">${deliveryType}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                  Suivre mon Colis en Direct →
                </a>
              </div>

              <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px; margin-top: 15px;">
                <p style="margin: 0; color: #92400E; font-size: 13px; font-weight: 600; text-align: center;">
                  🔔 Vous recevrez votre <strong>Code Secret de Retrait OTP</strong> par notification et e-mail dès que le colis arrivera au Point Relais.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 24px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; color: #64748B; font-size: 12px; font-weight: 600;">
                Besoin d'aide ? Notre support client est disponible 7j/7 au +225 07 00 00 00
              </p>
              <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                © 2026 Kalagban CI. Tous droits réservés. Abidjan, Côte d'Ivoire.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 2. Email : PRÊT À RÉCUPÉRER AU POINT RELAIS 📍
 */
export function generateReadyForPickupEmailHtml(props: ReadyForPickupEmailProps): string {
  const {
    orderCode,
    customerName,
    pickupCode,
    relayName,
    relayAddress = "Abidjan",
    relayCommune = "",
    trackingUrl = "https://kalagban.com/account",
  } = props;

  const fullRelayLocation = relayCommune ? `${relayName} (${relayCommune})` : relayName;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre colis #${orderCode} est disponible au Point Relais</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
          
          <!-- Header (Emerald Green) -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Kalagban</h1>
              <p style="margin: 6px 0 0 0; color: #D1FAE5; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Service de Retrait Express</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #ECFDF5; color: #059669; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #A7F3D0;">
                  📍 Colis Disponible en Point Relais
                </span>
              </div>

              <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 800; text-align: center;">
                Votre colis vous attend, ${customerName} !
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">
                Le coursier a déposé votre commande <strong style="color: #0F172A;">#${orderCode}</strong> au point relais partenaire. Vous pouvez passer la récupérer dès maintenant.
              </p>

              <!-- OTP SECRET CODE HIGHLIGHT BOX -->
              <div style="background-color: #F8FAFC; border: 2px dashed #059669; border-radius: 20px; padding: 24px; text-align: center; margin-bottom: 28px;">
                <span style="display: block; font-size: 12px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                  Votre Code Secret de Retrait OTP :
                </span>
                <span style="display: inline-block; font-family: monospace; font-size: 36px; font-weight: 900; color: #059669; letter-spacing: 8px; background-color: #FFFFFF; padding: 8px 24px; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
                  ${pickupCode}
                </span>
                <p style="margin: 10px 0 0 0; color: #64748B; font-size: 12px; font-weight: 600;">
                  Présentez ce code au gérant du point relais pour retirer votre colis en toute sécurité.
                </p>
              </div>

              <!-- Pickup Point Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border-radius: 16px; border: 1px solid #E2E8F0; margin-bottom: 28px; padding: 20px;">
                <tr>
                  <td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 10px; color: #64748B; font-size: 13px; font-weight: 600;">Point Relais</td>
                        <td style="padding-bottom: 10px; color: #0F172A; font-size: 14px; font-weight: 800; text-align: right;">${fullRelayLocation}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; color: #64748B; font-size: 13px; font-weight: 600;">Adresse</td>
                        <td style="padding-bottom: 10px; color: #475569; font-size: 13px; font-weight: 600; text-align: right;">${relayAddress}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B; font-size: 13px; font-weight: 600;">Délai de garde</td>
                        <td style="color: #DC2626; font-size: 13px; font-weight: 800; text-align: right;">5 jours max</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="text-align: center;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #059669; color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 14px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
                  Voir les Détails de ma Commande →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 24px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; color: #64748B; font-size: 12px; font-weight: 600;">
                Besoin d'aide ? Notre support client est disponible 7j/7 au +225 07 00 00 00
              </p>
              <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                © 2026 Kalagban CI. Tous droits réservés. Abidjan, Côte d'Ivoire.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
