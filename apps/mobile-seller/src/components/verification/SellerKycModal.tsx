import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  ShieldCheck,
  FileCheck2,
  Clock,
  AlertCircle,
  Phone,
  MapPin,
  User,
  CreditCard,
  ExternalLink,
  ChevronRight,
  FileText,
  Building,
} from 'lucide-react-native';

export interface KycData {
  id?: string;
  shop_id?: string;
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
  store_photos?: string[] | null;
  signature_url?: string;
  terms_accepted?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'unsubmitted';
  rejection_reason?: string | null;
  admin_notes?: string | null;
  submitted_at?: string;
  reviewed_at?: string;
}

interface SellerKycModalProps {
  visible: boolean;
  onClose: () => void;
  shopName: string;
  kycInfo: KycData | null;
  isVerified: boolean;
  onRefresh?: () => void;
}

export default function SellerKycModal({
  visible,
  onClose,
  shopName,
  kycInfo,
  isVerified,
  onRefresh,
}: SellerKycModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const status = isVerified ? 'approved' : kycInfo?.status || 'unsubmitted';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.shieldIconWrapper}>
              <ShieldCheck size={22} color="#16A34A" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Dossier de Certification KYC</Text>
              <Text style={styles.headerSubtitle}>{shopName || 'Boutique Kalagban'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Banner */}
          {status === 'approved' ? (
            <View style={styles.approvedBanner}>
              <View style={styles.approvedIconBox}>
                <ShieldCheck size={26} color="#FFFFFF" />
              </View>
              <View style={styles.bannerTextContent}>
                <View style={styles.statusPillRow}>
                  <View style={styles.statusPillGreen}>
                    <Text style={styles.statusPillGreenText}>OFFICIEL & VÉRIFIÉ</Text>
                  </View>
                  <Text style={styles.statusBadgeText}>Badge Activé</Text>
                </View>
                <Text style={styles.bannerTitleGreen}>Boutique Officiellement Certifiée Kalagban 🛡️</Text>
                <Text style={styles.bannerDescGreen}>
                  Votre dossier a été validé avec succès par notre service Conformité. Vos pièces justificatives sont archivées en toute sécurité.
                </Text>
                {kycInfo?.reviewed_at && (
                  <Text style={styles.dateLabelGreen}>
                    Validé le : {new Date(kycInfo.reviewed_at).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>
            </View>
          ) : status === 'pending' ? (
            <View style={styles.pendingBanner}>
              <View style={styles.pendingIconBox}>
                <Clock size={26} color="#FFFFFF" />
              </View>
              <View style={styles.bannerTextContent}>
                <View style={styles.statusPillRow}>
                  <View style={styles.statusPillOrange}>
                    <Text style={styles.statusPillOrangeText}>EN EXAMEN</Text>
                  </View>
                  <Text style={styles.statusBadgeOrangeText}>Validation sous 24h à 48h</Text>
                </View>
                <Text style={styles.bannerTitleOrange}>Dossier en Cours d&apos;Examen ⏳</Text>
                <Text style={styles.bannerDescOrange}>
                  Vos pièces justificatives ont été transmises à l&apos;équipe Conformité Kalagban. Vous recevrez une notification dès validation.
                </Text>
                {kycInfo?.submitted_at && (
                  <Text style={styles.dateLabelOrange}>
                    Déposé le : {new Date(kycInfo.submitted_at).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.actionBanner}>
              <View style={styles.actionIconBox}>
                <AlertCircle size={26} color="#FFFFFF" />
              </View>
              <View style={styles.bannerTextContent}>
                <View style={styles.statusPillRow}>
                  <View style={styles.statusPillIndigo}>
                    <Text style={styles.statusPillIndigoText}>CERTIFICATION</Text>
                  </View>
                  <Text style={styles.statusBadgeIndigoText}>Recommandé</Text>
                </View>
                <Text style={styles.bannerTitleIndigo}>Obtenez votre Badge Vendeur Certifié 🛡️</Text>
                <Text style={styles.bannerDescIndigo}>
                  La certification renforce la confiance des acheteurs et booste la visibilité de votre boutique Kalagban.
                </Text>
              </View>
            </View>
          )}

          {/* Details Sections if info exists */}
          {kycInfo ? (
            <>
              {/* Section 1 : Responsable & Coordonnées */}
              <View style={styles.cardSection}>
                <View style={styles.sectionHeader}>
                  <User size={18} color="#4F46E5" />
                  <Text style={styles.sectionTitle}>Informations du Responsable</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nom complet :</Text>
                  <Text style={styles.infoValueBold}>{kycInfo.seller_name || 'Non renseigné'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Type de pièce :</Text>
                  <Text style={styles.infoValue}>
                    {(kycInfo.id_type || 'CNI').toUpperCase()}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>N° de la pièce :</Text>
                  <Text style={[styles.infoValueBold, { color: '#4F46E5', fontFamily: 'monospace' }]}>
                    {kycInfo.id_number || 'Non renseigné'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Téléphone (WhatsApp) :</Text>
                  <Text style={[styles.infoValueBold, { color: '#16A34A' }]}>
                    {kycInfo.primary_phone || 'Non renseigné'}
                  </Text>
                </View>

                {kycInfo.secondary_phone ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Téléphone secondaire :</Text>
                    <Text style={styles.infoValue}>{kycInfo.secondary_phone}</Text>
                  </View>
                ) : null}
              </View>

              {/* Section 2 : Adresse & Localisation de la Boutique */}
              <View style={styles.cardSection}>
                <View style={styles.sectionHeader}>
                  <Building size={18} color="#4F46E5" />
                  <Text style={styles.sectionTitle}>Localisation de la Boutique</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Adresse physique :</Text>
                  <Text style={styles.infoValueBold}>{kycInfo.store_address || 'Non renseignée'}</Text>
                </View>

                {kycInfo.location_description ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Repères d&apos;accès :</Text>
                    <Text style={styles.infoValue}>{kycInfo.location_description}</Text>
                  </View>
                ) : null}
              </View>

              {/* Section 3 : Pièces Justificatives */}
              <View style={styles.cardSection}>
                <View style={styles.sectionHeader}>
                  <FileText size={18} color="#4F46E5" />
                  <Text style={styles.sectionTitle}>Pièces Justificatives Déposées</Text>
                </View>

                <View style={styles.docsGrid}>
                  {/* Photo Gérant */}
                  {kycInfo.seller_photo_url ? (
                    <TouchableOpacity
                      style={styles.docItem}
                      onPress={() => setSelectedImage(kycInfo.seller_photo_url || null)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: kycInfo.seller_photo_url }} style={styles.docThumbnail} />
                      <Text style={styles.docLabel}>Photo Gérant</Text>
                      <View style={styles.zoomPill}>
                        <ExternalLink size={10} color="#4F46E5" />
                        <Text style={styles.zoomPillText}>Voir</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* CNI Recto */}
                  {kycInfo.id_card_front_url ? (
                    <TouchableOpacity
                      style={styles.docItem}
                      onPress={() => setSelectedImage(kycInfo.id_card_front_url || null)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: kycInfo.id_card_front_url }} style={styles.docThumbnail} />
                      <Text style={styles.docLabel}>Pièce Recto</Text>
                      <View style={styles.zoomPill}>
                        <ExternalLink size={10} color="#4F46E5" />
                        <Text style={styles.zoomPillText}>Voir</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* CNI Verso */}
                  {kycInfo.id_card_back_url ? (
                    <TouchableOpacity
                      style={styles.docItem}
                      onPress={() => setSelectedImage(kycInfo.id_card_back_url || null)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: kycInfo.id_card_back_url }} style={styles.docThumbnail} />
                      <Text style={styles.docLabel}>Pièce Verso</Text>
                      <View style={styles.zoomPill}>
                        <ExternalLink size={10} color="#4F46E5" />
                        <Text style={styles.zoomPillText}>Voir</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* Signature */}
                  {kycInfo.signature_url ? (
                    <TouchableOpacity
                      style={styles.docItem}
                      onPress={() => setSelectedImage(kycInfo.signature_url || null)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: kycInfo.signature_url }}
                        style={[styles.docThumbnail, { resizeMode: 'contain', backgroundColor: '#FFFFFF' }]}
                      />
                      <Text style={styles.docLabel}>Signature</Text>
                      <View style={styles.zoomPill}>
                        <ExternalLink size={10} color="#4F46E5" />
                        <Text style={styles.zoomPillText}>Voir</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Photos de la Boutique */}
                {Array.isArray(kycInfo.store_photos) && kycInfo.store_photos.length > 0 ? (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.subDocsTitle}>Photos de la Boutique ({kycInfo.store_photos.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {kycInfo.store_photos.map((uri, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.docItem, { width: 110, marginRight: 10 }]}
                          onPress={() => setSelectedImage(uri)}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri }} style={styles.docThumbnail} />
                          <Text style={styles.docLabel}>Vue {idx + 1}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <View style={styles.cardSection}>
              <View style={styles.emptyBox}>
                <ShieldCheck size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Aucun dossier KYC enregistré</Text>
                <Text style={styles.emptyText}>
                  Rendez-vous sur votre espace web vendeur Kalagban ou déposez vos pièces justificatives auprès du support.
                </Text>
              </View>
            </View>
          )}

          {/* Security & Confidentiality Box */}
          <View style={styles.securityNoteBox}>
            <ShieldCheck size={16} color="#64748B" />
            <Text style={styles.securityNoteText}>
              Vos données et pièces d&apos;identité sont chiffrées et sécurisées conformément aux normes de protection des données Kalagban.
            </Text>
          </View>
        </ScrollView>

        {/* Modal Fullscreen Image Viewer */}
        {selectedImage && (
          <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
            <View style={styles.imageViewerOverlay}>
              <TouchableOpacity
                style={styles.imageViewerClose}
                onPress={() => setSelectedImage(null)}
                activeOpacity={0.8}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Image source={{ uri: selectedImage }} style={styles.imageViewerImage} resizeMode="contain" />
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  /* Status Banners */
  approvedBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  approvedIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  pendingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBanner: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextContent: {
    flex: 1,
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusPillGreen: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  statusPillGreenText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  bannerTitleGreen: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14532D',
    marginBottom: 4,
  },
  bannerDescGreen: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  dateLabelGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 6,
  },
  statusPillOrange: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  statusPillOrangeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  statusBadgeOrangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  bannerTitleOrange: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 4,
  },
  bannerDescOrange: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  dateLabelOrange: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 6,
  },
  statusPillIndigo: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  statusPillIndigoText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  statusBadgeIndigoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  bannerTitleIndigo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#312E81',
    marginBottom: 4,
  },
  bannerDescIndigo: {
    fontSize: 12,
    color: '#3730A3',
    lineHeight: 17,
  },
  /* Card Sections */
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  infoValueBold: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  /* Docs Grid */
  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  docItem: {
    width: (Dimensions.get('window').width - 32 - 32 - 12) / 2,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  docThumbnail: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    marginBottom: 6,
  },
  docLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  zoomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  zoomPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  subDocsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  securityNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 14,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  /* Image Viewer */
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  imageViewerImage: {
    width: Dimensions.get('window').width * 0.95,
    height: Dimensions.get('window').height * 0.75,
  },
});
