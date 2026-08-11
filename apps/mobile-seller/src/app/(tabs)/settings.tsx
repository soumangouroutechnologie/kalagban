import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import {
  Store,
  User as UserIcon,
  CreditCard,
  Save,
  LogOut,
  Upload,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  HelpCircle,
} from 'lucide-react-native';

export default function SellerSettingsScreen() {
  const router = useRouter();
  const { shop, profile, user, signOut, refreshShopData } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'shop' | 'profile' | 'payments'>('shop');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Shop Tab State
  const [shopName, setShopName] = useState(shop?.name || '');
  const [shopDescription, setShopDescription] = useState(shop?.description || '');
  const [bannerUrl, setBannerUrl] = useState(shop?.logo_url || '');

  // Profile Tab State
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Payments Tab State
  const [payoutProvider, setPayoutProvider] = useState(shop?.payout_provider || 'Wave');
  const [payoutPhone, setPayoutPhone] = useState(shop?.payout_phone || '');

  useEffect(() => {
    if (shop) {
      setShopName(shop.name || '');
      setShopDescription(shop.description || '');
      setBannerUrl(shop.logo_url || '');
      setPayoutProvider(shop.payout_provider || 'Wave');
      setPayoutPhone(shop.payout_phone || '');
    }
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [shop, profile]);

  const handlePickBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setBannerUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveSuccess(false);

    try {
      const targetId = shop?.id || user?.id;

      if (targetId) {
        // Save Shop details & Payout settings
        await supabase.from('shops').upsert({
          id: targetId,
          name: shopName,
          description: shopDescription,
          logo_url: bannerUrl,
          payout_provider: payoutProvider,
          payout_phone: payoutPhone,
        });

        // Save User Profile details
        if (user?.id) {
          await supabase.from('profiles').upsert({
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim() || shopName,
            phone: phone,
          });
        }

        await refreshShopData();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving seller settings:', err);
      Alert.alert('Erreur', 'Impossible d\'enregistrer les modifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter de votre espace vendeur ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const mobileOperators = ['Wave', 'Orange Money', 'MTN Mobile Money', 'Moov Money'];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Paramètres</Text>
          <Text style={styles.subtitle}>Configurez l'identité visuelle et les réglages de votre boutique.</Text>
        </View>

        <TouchableOpacity
          style={styles.saveHeaderBtn}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Save size={16} color="#FFFFFF" />
              <Text style={styles.saveHeaderBtnText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Horizontal Sub-Tabs Switcher (Matching captured web interface) */}
      <View style={styles.subTabsContainer}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'shop' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('shop')}
        >
          <Store size={16} color={activeSubTab === 'shop' ? '#4F46E5' : '#64748B'} />
          <Text style={[styles.subTabText, activeSubTab === 'shop' && styles.activeSubTabText]}>
            Boutique
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'profile' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('profile')}
        >
          <UserIcon size={16} color={activeSubTab === 'profile' ? '#4F46E5' : '#64748B'} />
          <Text style={[styles.subTabText, activeSubTab === 'profile' && styles.activeSubTabText]}>
            Profil Utilisateur
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'payments' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('payments')}
        >
          <CreditCard size={16} color={activeSubTab === 'payments' ? '#4F46E5' : '#64748B'} />
          <Text style={[styles.subTabText, activeSubTab === 'payments' && styles.activeSubTabText]}>
            Paiements
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <View style={styles.successBox}>
          <CheckCircle2 size={18} color="#16A34A" />
          <Text style={styles.successText}>Modifications enregistrées avec succès !</Text>
        </View>
      )}

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SUB-TAB 1: BOUTIQUE */}
        {activeSubTab === 'shop' && (
          <View style={styles.cardSection}>
            <Text style={styles.cardSectionTitle}>Enseigne de la boutique</Text>
            <Text style={styles.cardSectionDesc}>
              Cette image apparaîtra tout en haut de votre page boutique pour les clients.
            </Text>

            <TouchableOpacity style={styles.bannerPickerBox} onPress={handlePickBanner} activeOpacity={0.8}>
              {bannerUrl ? (
                <Image source={{ uri: bannerUrl }} style={styles.bannerPreview} />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Upload size={28} color="#4F46E5" />
                  <Text style={styles.bannerPlaceholderText}>Cliquer pour choisir l'enseigne visuelle</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.cardSectionTitle}>Informations générales</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de la boutique</Text>
              <View style={styles.inputWrapper}>
                <Building2 size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="Nom de votre enseigne..."
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description détaillée</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={shopDescription}
                onChangeText={setShopDescription}
                placeholder="Vêtements femme, homme et enfant, appareils électroniques..."
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        )}

        {/* SUB-TAB 2: PROFIL UTILISATEUR */}
        {activeSubTab === 'profile' && (
          <View style={styles.cardSection}>
            <Text style={styles.cardSectionTitle}>Vos coordonnées personnelles</Text>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Prénom</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 12 }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Prénom"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Nom</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 12 }]}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Nom"
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse Email (lecture seule)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: '#F1F5F9' }]}>
                <Mail size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: '#64748B' }]}
                  value={user?.email || 'vendeur@kalagban.com'}
                  editable={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+225 07 00 00 00 00"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        )}

        {/* SUB-TAB 3: PAIEMENTS / REVERSEMENTS */}
        {activeSubTab === 'payments' && (
          <View style={styles.cardSection}>
            <View style={styles.paymentHeroBox}>
              <View style={styles.checkCircleLarge}>
                <CheckCircle2 size={32} color="#4F46E5" />
              </View>
              <Text style={styles.paymentHeroTitle}>Modes de Reversement</Text>
              <Text style={styles.paymentHeroDesc}>
                Kalagban vous reversera vos gains automatiquement sur votre compte Mobile Money. Veuillez configurer le numéro ci-dessous.
              </Text>
            </View>

            <Text style={styles.cardSectionTitle}>Compte de réception</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Opérateur Mobile Money</Text>
              <View style={styles.operatorChipsRow}>
                {mobileOperators.map(op => (
                  <TouchableOpacity
                    key={op}
                    style={[
                      styles.operatorChip,
                      payoutProvider === op && styles.activeOperatorChip,
                    ]}
                    onPress={() => setPayoutProvider(op)}
                  >
                    <Text
                      style={[
                        styles.operatorChipText,
                        payoutProvider === op && styles.activeOperatorChipText,
                      ]}
                    >
                      {op}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Numéro de réception des fonds</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={payoutPhone}
                  onChangeText={setPayoutPhone}
                  placeholder="Ex: +225 07 00 00 00 00"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        )}

        {/* Support Box */}
        <View style={styles.supportBox}>
          <HelpCircle size={24} color="#4F46E5" />
          <View style={{ flex: 1 }}>
            <Text style={styles.supportTitle}>Besoin d'assistance ?</Text>
            <Text style={styles.supportDesc}>Contactez l'équipe support Kalagban Vendeurs.</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={18} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Se déconnecter de l'espace vendeur</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    maxWidth: 220,
  },
  saveHeaderBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSubTab: {
    borderBottomColor: '#4F46E5',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeSubTabText: {
    color: '#4F46E5',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 12,
  },
  successText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSectionDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
  },
  bannerPickerBox: {
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  bannerPlaceholderText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
  },
  paymentHeroBox: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 20,
  },
  checkCircleLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  paymentHeroDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  operatorChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  operatorChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeOperatorChip: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  operatorChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  activeOperatorChipText: {
    color: '#FFFFFF',
  },
  supportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  supportDesc: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    height: 50,
    borderRadius: 16,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
});
