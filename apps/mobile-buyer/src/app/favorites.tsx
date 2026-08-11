import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  ShoppingBag,
  Trash2,
  Lock,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Check,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { useFavorites } from '@/context/favorites-context';
import { useCart } from '@/context/cart-context';
import { supabase } from '@/lib/supabase';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const router = useRouter();
  const { favorites, toggleFavorite, isAuthenticated, checkAuthStatus } = useFavorites();
  const { addToCart } = useCart();

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  const handleAuthSubmit = async () => {
    let authEmail = '';
    if (loginMethod === 'phone') {
      if (!phone || (authMode !== 'forgot' && !password)) {
        setAuthError('Veuillez remplir votre numéro.');
        return;
      }
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      authEmail = `${cleanPhone}@kalagban.ci`;
    } else {
      if (!email || (authMode !== 'forgot' && !password)) {
        setAuthError('Veuillez remplir votre adresse email.');
        return;
      }
      authEmail = email.trim();
    }

    setLoadingAuth(true);
    setAuthError('');
    setAuthSuccessMsg('');

    try {
      if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail);
        if (error) {
          setAuthError(error.message || 'Erreur lors de la réinitialisation.');
        } else {
          setAuthSuccessMsg('Si votre compte existe, des instructions ont été envoyées.');
        }
        setLoadingAuth(false);
        return;
      }

      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: password,
        });
        if (error) {
          setAuthError('Identifiants incorrects ou compte introuvable.');
          setLoadingAuth(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: password,
          options: {
            data: {
              phone: loginMethod === 'phone' ? phone : '',
              email: loginMethod === 'email' ? email : '',
            },
          },
        });
        if (error) {
          setAuthError(error.message || 'Erreur lors de la création du compte.');
          setLoadingAuth(false);
          return;
        }
      }

      await checkAuthStatus();
      setLoadingAuth(false);
      setAuthModalVisible(false);
    } catch {
      setAuthError('Erreur de connexion.');
      setLoadingAuth(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Mes Favoris</Text>

        <View style={{ width: 40 }} />
      </View>

      {!isAuthenticated ? (
        /* Auth Required View */
        <View style={styles.authContainer}>
          <View style={styles.lockCircle}>
            <Lock size={44} color="#4F46E5" />
          </View>
          <Text style={styles.authTitle}>Connexion Requise</Text>
          <Text style={styles.authSub}>
            Vous devez être inscrit ou connecté à votre compte Kalagban pour ajouter des produits à vos favoris et les sauvegarder.
          </Text>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => setAuthModalVisible(true)}
            activeOpacity={0.85}
          >
            <User size={18} color="#FFFFFF" />
            <Text style={styles.loginBtnText}>Se Connecter / S'inscrire</Text>
          </TouchableOpacity>
        </View>
      ) : favorites.length === 0 ? (
        /* Empty Favorites */
        <View style={styles.emptyContainer}>
          <View style={styles.heartCircle}>
            <Heart size={44} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Aucun favori pour l'instant</Text>
          <Text style={styles.emptySub}>
            Cliquez sur le cœur d'un produit pour l'ajouter à vos coup de cœur !
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.exploreBtnText}>Explorer la Marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Favorites List */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {favorites.map((item) => (
            <View key={item.id} style={styles.favCard}>
              <Image source={{ uri: item.image_url }} style={styles.favImage} />

              <View style={styles.favInfo}>
                <Text style={styles.shopName}>{item.shop_name || 'Boutique Kalagban'}</Text>
                <Text style={styles.favTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.favPrice}>{formatPrice(item.price)}</Text>

                <View style={styles.favActionsRow}>
                  <TouchableOpacity
                    style={styles.addCartBtn}
                    onPress={() =>
                      addToCart({
                        id: item.id,
                        title: item.title,
                        price: item.price,
                        old_price: item.old_price,
                        image_url: item.image_url,
                        shop_id: 'shop',
                        shop_name: item.shop_name,
                      })
                    }
                  >
                    <ShoppingBag size={14} color="#FFFFFF" />
                    <Text style={styles.addCartText}>Au panier</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => toggleFavorite(item)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Auth Modal */}
      <Modal visible={authModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setAuthModalVisible(false)}
          />
          <View style={[styles.modalContent, { paddingBottom: Math.max(bottomPadding, 24) }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 12, paddingBottom: 10 }}
            >
              <Text style={styles.modalTitle}>
                {authMode === 'login' ? 'Connexion' : authMode === 'register' ? 'Créer un Compte' : 'Mot de Passe Oublié'}
              </Text>
              <Text style={styles.modalSub}>
                {authMode === 'forgot'
                  ? 'Saisissez votre identifiant pour recevoir un lien de réinitialisation.'
                  : 'Connectez-vous pour enregistrer vos favoris et suivre vos commandes.'}
              </Text>

              {/* Segmented Tab Switcher */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabBtn, loginMethod === 'phone' && styles.tabBtnActive]}
                  onPress={() => setLoginMethod('phone')}
                >
                  <Phone size={14} color={loginMethod === 'phone' ? '#4F46E5' : '#64748B'} />
                  <Text style={[styles.tabBtnText, loginMethod === 'phone' && styles.tabBtnTextActive]}>Téléphone</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, loginMethod === 'email' && styles.tabBtnActive]}
                  onPress={() => setLoginMethod('email')}
                >
                  <Mail size={14} color={loginMethod === 'email' ? '#4F46E5' : '#64748B'} />
                  <Text style={[styles.tabBtnText, loginMethod === 'email' && styles.tabBtnTextActive]}>Adresse Email</Text>
                </TouchableOpacity>
              </View>

              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
              {authSuccessMsg ? <Text style={styles.successText}>{authSuccessMsg}</Text> : null}

              {loginMethod === 'phone' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Numéro de Téléphone *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 07 00 11 22 33"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Adresse Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: client@kalagban.ci"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {authMode !== 'forgot' && (
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputLabel}>Mot de Passe *</Text>
                    {authMode === 'login' && (
                      <TouchableOpacity onPress={() => {
                        setAuthError('');
                        setAuthSuccessMsg('');
                        setAuthMode('forgot');
                      }}>
                        <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      activeOpacity={0.7}
                    >
                      {showPassword ? <EyeOff size={18} color="#4F46E5" /> : <Eye size={18} color="#64748B" />}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAuthSubmit}
                disabled={loadingAuth}
                activeOpacity={0.85}
              >
                {loadingAuth ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {authMode === 'login' ? 'Se Connecter' : authMode === 'register' ? 'Créer mon Compte' : 'Réinitialiser mon Mot de Passe'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 8 }}
                onPress={() => {
                  setAuthError('');
                  setAuthSuccessMsg('');
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
              >
                <Text style={styles.switchAuthText}>
                  {authMode === 'login'
                    ? 'Pas encore de compte ? S\'inscrire'
                    : 'Déjà un compte ? Se connecter'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setAuthModalVisible(false)}
              >
                <Text style={styles.closeModalText}>Fermer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
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
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  lockCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  authSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  loginBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  heartCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  exploreBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  favCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  favImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  favInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  shopName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  favTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  favPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  favActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  addCartBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addCartText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  removeBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
    marginVertical: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '900',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  successText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  forgotLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#0F172A',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 6,
  },
  modalSubmitBtn: {
    backgroundColor: '#4F46E5',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  switchAuthText: {
    textAlign: 'center',
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  closeModalBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeModalText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
