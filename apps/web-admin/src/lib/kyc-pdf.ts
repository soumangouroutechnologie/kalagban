export interface KycExportData {
  id?: string;
  seller_name?: string;
  id_type?: string;
  id_number?: string;
  seller_photo_url?: string;
  id_card_front_url?: string;
  id_card_back_url?: string | null;
  primary_phone?: string;
  secondary_phone?: string | null;
  store_address?: string;
  location_description?: string | null;
  store_photos?: string[];
  signature_url?: string;
  submitted_at?: string;
  reviewed_at?: string;
  admin_notes?: string | null;
  status?: string;
}

export function printKycCertificate(kyc: KycExportData, shopName: string) {
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres contextuelles (pop-ups) pour télécharger le document PDF.");
    return;
  }

  const idTypeLabel = 
    kyc.id_type === "cni" ? "Carte Nationale d'Identité (CNI)" :
    kyc.id_type === "passport" ? "Passeport International" :
    kyc.id_type === "attestation" ? "Attestation d'Identité" :
    kyc.id_type === "permis" ? "Permis de Conduire" : (kyc.id_type || "Pièce d'Identité");

  const validationDate = kyc.reviewed_at 
    ? new Date(kyc.reviewed_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR");

  const submissionDate = kyc.submitted_at 
    ? new Date(kyc.submitted_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  const storePhotosHtml = kyc.store_photos && kyc.store_photos.length > 0 
    ? `
      <div class="section">
        <div class="section-title">
          <span>3. Localisation &amp; Visuels Boutique Physique</span>
          <span style="color:#64748b; font-weight: normal;">${kyc.store_photos.length} photo(s) certifiée(s)</span>
        </div>
        <div class="grid-4">
          ${kyc.store_photos.map((url, idx) => `
            <div class="store-photo-card">
              <img src="${url}" class="store-img" alt="Magasin ${idx + 1}" />
            </div>
          `).join("")}
        </div>
      </div>
    `
    : "";

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Certificat_KYC_${shopName.replace(/[^a-zA-Z0-9]/g, "_")}</title>
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
      border-bottom: 2.5px solid #4338ca;
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
      color: #1e1b4b;
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
      background: #4338ca;
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
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
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
      background: #4338ca;
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
      color: #1e1b4b;
    }
    .status-text p {
      margin: 1px 0 0 0;
      font-size: 9.5px;
      color: #475569;
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
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
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
      color: #4338ca;
      font-family: monospace;
    }
    .field-value.whatsapp {
      color: #047857;
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
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #4338ca;
      font-weight: bold;
      font-size: 10px;
    }
    .store-img {
      width: 100%;
      height: 65px;
      object-fit: cover;
      border-radius: 5px;
      border: 1px solid #e2e8f0;
      display: block;
    }
    .signature-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 12px;
      margin-top: 4px;
    }
    .sig-img {
      height: 42px;
      max-width: 150px;
      object-fit: contain;
      display: block;
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
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo-box">
        <h1 class="header-title">KALAGBAN MARKETPLACE</h1>
        <span class="badge">DOSSIER OFFICIEL KYC 🛡️</span>
      </div>
      <div class="subtitle">Service Conformité &amp; Certification des Marchands</div>
    </div>
    <div class="header-right">
      <strong>CERTIFICAT D'AUDIT VENDEUR</strong>
      <div>Réf : <span style="font-family: monospace;">${(kyc.id || "KLG-CERT").slice(0, 13).toUpperCase()}</span></div>
      <div>Date : ${submissionDate || validationDate}</div>
    </div>
  </div>

  <!-- Status Card -->
  <div class="status-card">
    <div class="status-icon">🛡️</div>
    <div class="status-text">
      <h4>Boutique : ${shopName}</h4>
      <p>Statut du dossier : <strong>${kyc.status === "approved" ? "Validé & Certifié Conforme ✓" : kyc.status === "rejected" ? "Rejeté" : "En cours d'examen"}</strong>${kyc.admin_notes ? ` — Note : "${kyc.admin_notes}"` : ""}</p>
    </div>
  </div>

  <!-- Section 1: Informations Générales -->
  <div class="section">
    <div class="section-title">
      <span>1. Responsable Légal &amp; Coordonnées</span>
      <span style="color: #4338ca;">Boutique : <strong>${shopName}</strong></span>
    </div>
    <div class="grid-3">
      <div class="field">
        <span class="field-label">Nom du Responsable</span>
        <div class="field-value">${kyc.seller_name || "Non renseigné"}</div>
      </div>

      <div class="field">
        <span class="field-label">Type &amp; N° Pièce</span>
        <div class="field-value highlight">${idTypeLabel} : ${kyc.id_number || ""}</div>
      </div>

      <div class="field">
        <span class="field-label">WhatsApp Principal</span>
        <div class="field-value whatsapp">${kyc.primary_phone || "Non renseigné"}</div>
      </div>

      ${kyc.secondary_phone ? `
        <div class="field">
          <span class="field-label">Numéro Secondaire</span>
          <div class="field-value">${kyc.secondary_phone}</div>
        </div>
      ` : ""}

      <div class="field" style="grid-column: span 2;">
        <span class="field-label">Adresse Physique &amp; Commune</span>
        <div class="field-value">${kyc.store_address || "Non renseignée"}</div>
      </div>
    </div>

    ${kyc.location_description ? `
      <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #f1f5f9;">
        <span class="field-label">Repères Géographiques</span>
        <div style="font-size: 10px; color: #475569;">${kyc.location_description}</div>
      </div>
    ` : ""}
  </div>

  <!-- Section 2: Pièces Justificatives -->
  <div class="section">
    <div class="section-title">
      <span>2. Pièces Justificatives (Documents d'Identité)</span>
      <span style="color:#64748b; font-weight: normal;">Documents Authentifiés</span>
    </div>
    <div class="grid-3">
      <!-- Photo Portrait -->
      <div class="photo-card">
        <span class="photo-card-label">Photo Gérant</span>
        ${kyc.seller_photo_url ? `<img src="${kyc.seller_photo_url}" class="photo-img" alt="Portrait" />` : `<div class="pdf-placeholder">Aucune photo</div>`}
      </div>

      <!-- ID Front -->
      <div class="photo-card">
        <span class="photo-card-label">Pièce Recto</span>
        ${kyc.id_card_front_url?.endsWith(".pdf") 
          ? `<div class="pdf-placeholder"><span>📄 Document PDF</span><span style="font-size:8px;margin-top:2px;">(Fiche CNI Recto)</span></div>`
          : (kyc.id_card_front_url ? `<img src="${kyc.id_card_front_url}" class="photo-img" alt="Recto" />` : `<div class="pdf-placeholder">Non fourni</div>`)
        }
      </div>

      <!-- ID Back -->
      <div class="photo-card">
        <span class="photo-card-label">Pièce Verso</span>
        ${kyc.id_card_back_url?.endsWith(".pdf")
          ? `<div class="pdf-placeholder"><span>📄 Document PDF</span><span style="font-size:8px;margin-top:2px;">(Fiche CNI Verso)</span></div>`
          : (kyc.id_card_back_url ? `<img src="${kyc.id_card_back_url}" class="photo-img" alt="Verso" />` : `<div class="pdf-placeholder">Non applicable</div>`)
        }
      </div>
    </div>
  </div>

  <!-- Section 3: Store Photos -->
  ${storePhotosHtml}

  <!-- Section 4: Signature & Sceau -->
  <div class="section">
    <div class="section-title">
      <span>4. Signature Manuscrite &amp; Engagement Légal</span>
      <span style="color:#059669;">Attestation Validée</span>
    </div>
    <div class="signature-box">
      <div>
        <div style="font-size: 10px; font-weight: 700; color: #0f172a;">
          Certifié sur l'honneur par <strong>${kyc.seller_name || ""}</strong>
        </div>
        <div style="font-size: 9px; color: #059669; font-weight: bold; margin-top: 2px;">
          ✓ Charte de conformité et conditions générales marchandes acceptées
        </div>
        ${submissionDate ? `<div style="font-size: 8.5px; color: #94a3b8; margin-top: 2px;">Horodatage numérique : ${submissionDate}</div>` : ""}
      </div>

      <div style="text-align: center; border: 1px dashed #cbd5e1; padding: 4px 8px; border-radius: 6px; background: #ffffff;">
        ${kyc.signature_url ? `<img src="${kyc.signature_url}" class="sig-img" alt="Signature" />` : `<span style="font-size:9px;color:#94a3b8;">Signature archivée</span>`}
        <span style="font-size: 7.5px; color: #94a3b8; font-family: monospace; display: block; margin-top: 2px;">Certificat Numérique Kalagban</span>
      </div>
    </div>
  </div>

  <!-- Footer Stamp -->
  <div class="footer-stamp">
    DOCUMENT OFFICIEL KALAGBAN - GÉNÉRÉ LE ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR")} - TOUS DROITS RÉSERVÉS
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
