export interface CourierPdfData {
  id: string;
  full_name: string;
  phone: string;
  secondary_phone?: string | null;
  photo_url?: string | null;
  vehicle_type: string;
  license_plate?: string | null;
  coverage_type?: string;
  preferred_communes?: string[] | null;
  preferred_zone?: string;
  id_card_type?: string;
  id_card_number?: string | null;
  id_card_front_url?: string | null;
  id_card_back_url?: string | null;
  is_partner_company?: boolean;
  company_name?: string | null;
  company_manager?: string | null;
  company_phone?: string | null;
  registered_by?: string | null;
  status: string;
  created_at: string;
}

export function printCourierBadge(courier: CourierPdfData) {
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres contextuelles (pop-ups) pour télécharger la fiche livreur.");
    return;
  }

  const vehicleLabel = 
    courier.vehicle_type === "moto" ? "🛵 Moto (Deux-roues)" :
    courier.vehicle_type === "voiture" ? "🚗 Véhicule / Voiture" :
    courier.vehicle_type === "camion" ? "🚛 Camion" :
    courier.vehicle_type === "camionnette" ? "🚐 Camionnette" :
    courier.vehicle_type === "tricycle_triporteur" ? "🛺 Tricycle / Triporteur" :
    courier.vehicle_type === "velo" ? "🚲 Vélo" : (courier.vehicle_type || "Véhicule");

  const idTypeLabel = 
    courier.id_card_type === "cni" ? "Carte Nationale d'Identité (CNI)" :
    courier.id_card_type === "passport" ? "Passeport International" :
    courier.id_card_type === "attestation" ? "Attestation d'Identité" :
    courier.id_card_type === "permis" ? "Permis de Conduire" : (courier.id_card_type || "Pièce d'Identité");

  const communes = Array.isArray(courier.preferred_communes) ? courier.preferred_communes : [];
  const coverageText = courier.coverage_type === "all_abidjan" || communes.length === 0
    ? "Tout Abidjan (Toutes communes)"
    : communes.join(", ");

  const partnerCompanyHtml = courier.is_partner_company && courier.company_name
    ? `
      <div class="section" style="background: #fdf4ff; border-color: #f0abfc;">
        <div class="section-title" style="color: #86198f; border-color: #f5d0fe;">
          <span>Société / Entreprise Partenaire</span>
          <span style="background: #a21caf; color: white; padding: 2px 6px; border-radius: 4px; font-size: 8px;">Prestataire Externe</span>
        </div>
        <div class="grid-3">
          <div class="field">
            <span class="field-label">Nom de l'Entreprise</span>
            <div class="field-value" style="color: #701a75;">${courier.company_name}</div>
          </div>
          <div class="field">
            <span class="field-label">Nom du Gérant</span>
            <div class="field-value">${courier.company_manager || "Non renseigné"}</div>
          </div>
          <div class="field">
            <span class="field-label">Contact Société</span>
            <div class="field-value" style="color: #059669;">${courier.company_phone || "Non renseigné"}</div>
          </div>
        </div>
      </div>
    `
    : "";

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Fiche_Livreur_${courier.full_name.replace(/[^a-zA-Z0-9]/g, "_")}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.35;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2.5px solid #ea580c;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-title {
      font-size: 18px;
      font-weight: 900;
      color: #9a3412;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .badge {
      display: inline-block;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 5px;
      background: #ea580c;
      color: #ffffff;
      letter-spacing: 0.5px;
    }
    .subtitle {
      font-size: 9px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      font-size: 9px;
    }
    .header-right strong {
      font-size: 10px;
      color: #0f172a;
      display: block;
    }
    .status-card {
      background: #fff7ed;
      border: 1.5px solid #ffedd5;
      border-radius: 10px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-icon {
      width: 28px;
      height: 28px;
      background: #ea580c;
      color: white;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 14px;
      flex-shrink: 0;
    }
    .status-text h4 {
      margin: 0;
      font-size: 12px;
      font-weight: 800;
      color: #9a3412;
    }
    .status-text p {
      margin: 1px 0 0 0;
      font-size: 9.5px;
      color: #c2410c;
    }
    .section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .field {
      margin-bottom: 4px;
    }
    .field-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      display: block;
      margin-bottom: 1px;
    }
    .field-value {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
    }
    .field-value.highlight {
      color: #ea580c;
      font-family: monospace;
    }
    .field-value.phone {
      color: #059669;
    }
    .photo-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 5px;
      text-align: center;
    }
    .photo-card-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 3px;
      display: block;
    }
    .photo-img {
      width: 100%;
      height: 105px;
      object-fit: cover;
      border-radius: 5px;
      border: 1px solid #e2e8f0;
      display: block;
    }
    .pdf-placeholder {
      width: 100%;
      height: 105px;
      border-radius: 5px;
      background: #fff7ed;
      border: 1px solid #ffedd5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ea580c;
      font-weight: bold;
      font-size: 10px;
    }
    .footer-stamp {
      text-align: center;
      margin-top: 10px;
      font-size: 8px;
      color: #94a3b8;
      font-family: monospace;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
    }
    .tag {
      display: inline-block;
      background: #e2e8f0;
      color: #334155;
      font-size: 8.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      margin-right: 4px;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo-box">
        <h1 class="header-title">KALAGBAN MARKETPLACE</h1>
        <span class="badge">FLOTTE OFFICIELLE 🛵</span>
      </div>
      <div class="subtitle">Service Logistique &amp; Supervision des Livreurs</div>
    </div>
    <div class="header-right">
      <strong>FICHE D'ENREGISTREMENT LIVREUR</strong>
      <div>Réf : <span style="font-family: monospace;">${courier.id.slice(0, 13).toUpperCase()}</span></div>
      <div>Date : ${new Date(courier.created_at).toLocaleDateString("fr-FR")}</div>
    </div>
  </div>

  <!-- Status Card -->
  <div class="status-card">
    <div class="status-icon">🚚</div>
    <div class="status-text">
      <h4>Livreur Référencé : ${courier.full_name}</h4>
      <p>Statut opérationnel : <strong>${courier.status === "available" ? "🟢 Actif & Disponible" : courier.status === "suspended" ? "⛔ Suspendu" : "🟡 Enregistré"}</strong> — Pièces et véhicule vérifiés.</p>
    </div>
  </div>

  <!-- Section 1: Identité & Coordonnées -->
  <div class="section">
    <div class="section-title">
      <span>1. Identité &amp; Coordonnées du Livreur</span>
      <span style="color: #ea580c;">Profil Opérationnel</span>
    </div>
    <div class="grid-3">
      <div class="field">
        <span class="field-label">Nom &amp; Prénoms</span>
        <div class="field-value">${courier.full_name}</div>
      </div>

      <div class="field">
        <span class="field-label">Numéro WhatsApp / Principal</span>
        <div class="field-value phone">${courier.phone}</div>
      </div>

      <div class="field">
        <span class="field-label">Second Numéro</span>
        <div class="field-value">${courier.secondary_phone || "Non renseigné"}</div>
      </div>

      <div class="field">
        <span class="field-label">Type &amp; N° Pièce</span>
        <div class="field-value highlight">${idTypeLabel} : ${courier.id_card_number || "Non renseigné"}</div>
      </div>

      <div class="field" style="grid-column: span 2;">
        <span class="field-label">Zone de Couverture</span>
        <div class="field-value">${coverageText}</div>
      </div>
    </div>
  </div>

  <!-- Section 2: Véhicule & Immatriculation -->
  <div class="section">
    <div class="section-title">
      <span>2. Engin &amp; Immatriculation</span>
      <span style="color: #ea580c;">Moyen de Transport</span>
    </div>
    <div class="grid-2">
      <div class="field">
        <span class="field-label">Type de Véhicule</span>
        <div class="field-value" style="font-size: 12px; color: #1e1b4b;">${vehicleLabel}</div>
      </div>

      <div class="field">
        <span class="field-label">Immatriculation / Plaque</span>
        <div class="field-value highlight" style="font-size: 13px;">${courier.license_plate || "Non immatriculé / En cours"}</div>
      </div>
    </div>
  </div>

  <!-- Partner Company Section (If applicable) -->
  ${partnerCompanyHtml}

  <!-- Section 3: Pièces Justificatives -->
  <div class="section">
    <div class="section-title">
      <span>3. Pièces Justificatives Archivées</span>
      <span style="color: #64748b; font-weight: normal;">Documents Authentifiés</span>
    </div>
    <div class="grid-3">
      <!-- Photo Portrait -->
      <div class="photo-card">
        <span class="photo-card-label">Photo Livreur</span>
        ${courier.photo_url ? `<img src="${courier.photo_url}" class="photo-img" alt="Portrait" />` : `<div class="pdf-placeholder">Aucune photo</div>`}
      </div>

      <!-- ID Front -->
      <div class="photo-card">
        <span class="photo-card-label">Pièce d'Identité (Recto)</span>
        ${courier.id_card_front_url?.endsWith(".pdf") 
          ? `<div class="pdf-placeholder"><span>📄 Document PDF</span><span style="font-size:8px;margin-top:2px;">(Fiche Recto)</span></div>`
          : (courier.id_card_front_url ? `<img src="${courier.id_card_front_url}" class="photo-img" alt="Recto" />` : `<div class="pdf-placeholder">Non fourni</div>`)
        }
      </div>

      <!-- ID Back -->
      <div class="photo-card">
        <span class="photo-card-label">Pièce d'Identité (Verso)</span>
        ${courier.id_card_back_url?.endsWith(".pdf")
          ? `<div class="pdf-placeholder"><span>📄 Document PDF</span><span style="font-size:8px;margin-top:2px;">(Fiche Verso)</span></div>`
          : (courier.id_card_back_url ? `<img src="${courier.id_card_back_url}" class="photo-img" alt="Verso" />` : `<div class="pdf-placeholder">Non applicable</div>`)
        }
      </div>
    </div>
  </div>

  <!-- Section 4: Conformité Interne -->
  <div class="section" style="background: #f0fdf4; border-color: #bbf7d0;">
    <div class="section-title" style="color: #166534; border-color: #dcfce7;">
      <span>4. Validation Interne Kalagban</span>
      <span>✓ Enregistrement Conforme</span>
    </div>
    <div style="font-size: 10px; color: #166534; line-height: 1.4;">
      ✓ L'agent enregistreur certifie que les pièces d'identité et les autorisations de conduite ont été contrôlées et validées conformément aux critères de qualité et de sécurité de la marketplace Kalagban.
      ${courier.registered_by ? `<div style="font-weight: bold; margin-top: 4px;">Enregistré par l'agent : ${courier.registered_by}</div>` : ""}
    </div>
  </div>

  <!-- Footer Stamp -->
  <div class="footer-stamp">
    FICHE OFFICIELLE FLOTTE KALAGBAN - GÉNÉRÉE LE ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR")} - TOUS DROITS RÉSERVÉS
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
