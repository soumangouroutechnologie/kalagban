import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  ArrowLeft,
  Package,
  Heart,
  LogOut,
  Phone,
  Lock,
  ChevronRight,
  ShieldCheck,
  Headphones,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useFavorites } from '@/context/favorites-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const router = useRouter();
  const { checkAuthStatus } = useFavorites();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth Modal States
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (error) {
          setAuthError('Identifiants incorrects ou compte introuvable.');
          setLoadingAuth(false);
          return;
        }

        setUser(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: {
            data: {
              phone: loginMethod === 'phone' ? phone : '',
              email: loginMethod === 'email' ? email : '',
              full_name: fullName || 'Client Kalagban',
            },
          },
        });

        if (error) {
          setAuthError(error.message || 'Erreur lors de la création du compte.');
          setLoadingAuth(false);
          return;
        }

        setUser(data.user);
      }

      await checkAuthStatus();
      setLoadingAuth(false);
      setAuthModalVisible(false);
    } catch {
      setAuthError('Erreur de connexion.');
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      await checkAuthStatus();
      Alert.alert('Déconnexion réussie', 'Vous avez été déconnecté de votre compte Kalagban.');
    } catch {
      // Signout error
    }
  };

  const getUserPhone = () => {
    if (!user) return '';
    return user.user_metadata?.phone || user.email?.split('@')[0] || '';
  };

  const getUserName = () => {
    if (!user) return 'Acheteur Kalagban';
    return user.user_metadata?.full_name || `Client ${getUserPhone()}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Mon Compte</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomPadding }]}>
        {/* User Identity Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <User size={36} color="#4F46E5" />
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{getUserName()}</Text>
            {user ? (
              <View style={styles.phoneBadge}>
                <Phone size={12} color="#10B981" />
                <Text style={styles.phoneText}>+225 {getUserPhone()}</Text>
              </View>
            ) : (
              <Text style={styles.userSub}>Non connecté</Text>
            )}
          </View>
        </View>

        {!user ? (
          <View style={styles.loginBannerCard}>
            <View style={styles.loginBannerHeader}>
              <Lock size={24} color="#4F46E5" />
              <View style={{ flex: 1 }}>
                <Text style={styles.loginBannerTitle}>Connectez-vous à votre compte</Text>
                <Text style={styles.loginBannerSub}>
                  Accédez à vos commandes, vos codes OTP de retrait et vos favoris enregistrés.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.loginBannerBtn}
              onPress={() => setAuthModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.loginBannerBtnText}>Se Connecter / S'inscrire</Text>
              <ChevronRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Quick Menu Options */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>ESPACE COMMANDE &amp; RETRAIT</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/orders')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Package size={20} color="#4F46E5" />
            </View>
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Mes Commandes &amp; Codes OTP</Text>
              <Text style={styles.menuItemSub}>Consulter l'historique et les codes de retrait Point Relais</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/favorites')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Heart size={20} color="#EF4444" />
            </View>
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Mes Produits Favoris</Text>
              <Text style={styles.menuItemSub}>Retrouver tous vos coups de cœur enregistrés</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>AIDE &amp; SÉCURITÉ KALAGBAN</Text>

          <View style={styles.menuItem}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={20} color="#10B981" />
            </View>
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Achat Sécurisé par OTP</Text>
              <Text style={styles.menuItemSub}>Vendeurs certifiés &amp; retrait vérifié en Point Relais</Text>
            </View>
          </View>

          <View style={styles.menuItem}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Headphones size={20} color="#D97706" />
            </View>
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Support Client Abidjan</Text>
              <Text style={styles.menuItemSub}>Assistance 7j/7 au +225 25 20 00 61 61</Text>
            </View>
          </View>
        </View>

        {user ? (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Se Déconnecter</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Auth Modal */}
      <Modal visible={authModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {authMode === 'login' ? 'Connexion' : authMode === 'register' ? 'Créer un Compte' : 'Mot de Passe Oublié'}
            </Text>
            <Text style={styles.modalSub}>
              {authMode === 'forgot'
                ? 'Saisissez votre identifiant pour recevoir un lien de réinitialisation.'
                : 'Choisissez votre méthode de connexion (Téléphone ou Email).'}
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

            {authMode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom &amp; Prénom *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Jean Kouassi"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            )}

            {loginMethod === 'phone' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro de Téléphone *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 07 00 11 22 33"
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
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleAuthSubmit}
              disabled={loadingAuth}
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
          </View>
        </View>
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
  scrollContent: {
    padding: 20,
    gap: 18,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  userSub: {
    fontSize: 13,
    color: '#64748B',
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  loginBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  loginBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  loginBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  loginBannerSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 2,
  },
  loginBannerBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginBannerBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  menuSection: {
    gap: 10,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemBody: {
    flex: 1,
    gap: 2,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
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
