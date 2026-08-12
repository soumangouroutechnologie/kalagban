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
  KeyboardAvoidingView,
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
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('register');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('email');
  const [authType, setAuthType] = useState<'otp' | 'password'>('otp'); // 'otp' by default as requested
  const [authStep, setAuthStep] = useState<'form' | 'otp'>('form'); // 'form' or 'otp'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (authStep === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authStep, countdown]);

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

  const getCleanPhone = () => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10 && (clean.startsWith('07') || clean.startsWith('05') || clean.startsWith('01'))) {
      clean = '+225' + clean;
    } else if (!clean.startsWith('+')) {
      clean = '+' + clean;
    }
    return clean;
  };

  // Step 1: Send OTP Code
  const handleSendOtp = async () => {
    setAuthError('');
    setAuthSuccessMsg('');

    if (loginMethod === 'phone') {
      if (!phone.trim()) {
        setAuthError('Veuillez entrer votre numéro de téléphone.');
        return;
      }
    } else {
      if (!email.trim() || !email.includes('@')) {
        setAuthError('Veuillez entrer une adresse email valide.');
        return;
      }
    }

    setLoadingAuth(true);

    try {
      if (loginMethod === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            data: {
              full_name: fullName.trim() || 'Client Kalagban',
              role: 'buyer',
            },
          },
        });
        if (error) throw error;
      } else {
        const targetPhone = getCleanPhone();
        const { error } = await supabase.auth.signInWithOtp({
          phone: targetPhone,
          options: {
            shouldCreateUser: true,
            data: {
              full_name: fullName.trim() || 'Client Kalagban',
              role: 'buyer',
            },
          },
        });
        if (error) throw error;
      }

      setAuthStep('otp');
      setCountdown(60);
      setCanResend(false);
      setAuthSuccessMsg(`Un code de vérification à 6 chiffres a été envoyé par ${loginMethod === 'email' ? 'email' : 'SMS / WhatsApp'}.`);
    } catch (err: any) {
      setAuthError(err?.message || "Impossible d'envoyer le code OTP. Veuillez réessayer.");
    } finally {
      setLoadingAuth(false);
    }
  };

  // Step 2: Verify OTP Code
  const handleVerifyOtp = async () => {
    setAuthError('');
    setAuthSuccessMsg('');

    if (!otpCode || otpCode.trim().length < 6) {
      setAuthError('Veuillez saisir le code complet à 6 chiffres.');
      return;
    }

    setLoadingAuth(true);

    try {
      let authRes;
      if (loginMethod === 'email') {
        authRes = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode.trim(),
          type: 'email',
        });
      } else {
        const targetPhone = getCleanPhone();
        authRes = await supabase.auth.verifyOtp({
          phone: targetPhone,
          token: otpCode.trim(),
          type: 'sms',
        });
      }

      if (authRes.error) throw authRes.error;

      if (authRes.data.user) {
        // If password was provided during registration, update user password
        if (password && password.length >= 6) {
          try {
            await supabase.auth.updateUser({ password });
          } catch (e) {
            console.warn('Password save error:', e);
          }
        }

        setUser(authRes.data.user);
        // Ensure profile exists in profiles table
        await supabase.from('profiles').upsert({
          id: authRes.data.user.id,
          full_name: fullName.trim() || authRes.data.user.user_metadata?.full_name || 'Client Kalagban',
          phone: loginMethod === 'phone' ? phone : (authRes.data.user.user_metadata?.phone || null),
          email: loginMethod === 'email' ? email.trim() : (authRes.data.user.email || null),
          role: 'buyer',
        });
      }

      await checkAuthStatus();
      setAuthModalVisible(false);
      setAuthStep('form');
      setOtpCode('');
      Alert.alert('Connexion réussie ! 🎉', 'Bienvenue sur votre compte Kalagban.');
    } catch (err: any) {
      setAuthError(err?.message || 'Code de vérification invalide ou expiré.');
    } finally {
      setLoadingAuth(false);
    }
  };

  // Password fallback flow
  const handlePasswordAuth = async () => {
    setLoadingAuth(true);
    setAuthError('');
    setAuthSuccessMsg('');

    let authEmail = '';
    if (loginMethod === 'phone') {
      if (!phone || (authMode !== 'forgot' && !password)) {
        setAuthError('Veuillez remplir votre numéro.');
        setLoadingAuth(false);
        return;
      }
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      authEmail = `${cleanPhone}@kalagban.ci`;
    } else {
      if (!email || (authMode !== 'forgot' && !password)) {
        setAuthError('Veuillez remplir votre adresse email.');
        setLoadingAuth(false);
        return;
      }
      authEmail = email.trim();
    }

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
      <Modal visible={authModalVisible} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setAuthModalVisible(false)}
          />
          <View style={[styles.modalContent, { paddingBottom: Math.max(bottomPadding, 24) }]}>
            <ScrollView
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 14, paddingBottom: 40 }}
            >
              {authStep === 'otp' ? (
                /* === STEP 2: OTP VERIFICATION UI === */
                <View style={{ gap: 16 }}>
                  <View style={{ alignItems: 'center', gap: 6, marginVertical: 8 }}>
                    <View style={styles.otpIconBadge}>
                      <ShieldCheck size={32} color="#4F46E5" />
                    </View>
                    <Text style={styles.modalTitle}>Vérification du Code</Text>
                    <Text style={[styles.modalSub, { textAlign: 'center', paddingHorizontal: 10 }]}>
                      Nous avons envoyé un code de vérification à 6 chiffres à :
                    </Text>
                    <Text style={styles.targetDestinationBadge}>
                      {loginMethod === 'phone' ? getCleanPhone() : email.trim()}
                    </Text>
                  </View>

                  {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                  {authSuccessMsg ? <Text style={styles.successText}>{authSuccessMsg}</Text> : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Code de confirmation (6 chiffres) *</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="• • • • • •"
                      placeholderTextColor="#94A3B8"
                      value={otpCode}
                      onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={handleVerifyOtp}
                    disabled={loadingAuth || otpCode.length < 6}
                    activeOpacity={0.85}
                  >
                    {loadingAuth ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Valider et Continuer ➔</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.otpResendRow}>
                    <Text style={styles.resendInfoText}>Vous n'avez pas reçu le code ?</Text>
                    {canResend ? (
                      <TouchableOpacity onPress={handleSendOtp} disabled={loadingAuth}>
                        <Text style={styles.resendBtnActive}>Renvoyer le code</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.resendTimerText}>Renvoyer dans {countdown}s</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.backStepBtn}
                    onPress={() => {
                      setAuthStep('form');
                      setAuthError('');
                      setAuthSuccessMsg('');
                    }}
                  >
                    <Text style={styles.backStepBtnText}>← Modifier mon {loginMethod === 'phone' ? 'numéro' : 'email'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* === STEP 1: CREDENTIALS INPUT UI === */
                <View style={{ gap: 12 }}>
                  <Text style={styles.modalTitle}>
                    {authMode === 'register' ? 'Créer un Compte' : 'Se Connecter'}
                  </Text>
                  <Text style={styles.modalSub}>
                    {authMode === 'register'
                      ? 'Inscrivez-vous rapidement avec votre numéro ou adresse email.'
                      : 'Accédez à vos commandes et favoris Kalagban.'}
                  </Text>

                  {/* Mode Switcher: Inscription vs Connexion */}
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[styles.tabBtn, authMode === 'register' && styles.tabBtnActive]}
                      onPress={() => {
                        setAuthMode('register');
                        setAuthError('');
                        setAuthSuccessMsg('');
                      }}
                    >
                      <Text style={[styles.tabBtnText, authMode === 'register' && styles.tabBtnTextActive]}>
                        Créer un Compte
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.tabBtn, authMode === 'login' && styles.tabBtnActive]}
                      onPress={() => {
                        setAuthMode('login');
                        setAuthError('');
                        setAuthSuccessMsg('');
                      }}
                    >
                      <Text style={[styles.tabBtnText, authMode === 'login' && styles.tabBtnTextActive]}>
                        Se Connecter
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Method Switcher: Téléphone vs Email */}
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
                        placeholder="Ex: Kévin Stéphane"
                        placeholderTextColor="#94A3B8"
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
                        placeholder="Ex: 07 77 62 08 64"
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

                  {/* Password Input Field */}
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

                  {/* Main Action Button */}
                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={() => {
                      if (authMode === 'register') {
                        if (!fullName.trim()) {
                          setAuthError('Veuillez entrer votre nom complet.');
                          return;
                        }
                        if (loginMethod === 'phone' && !phone.trim()) {
                          setAuthError('Veuillez entrer votre numéro de téléphone.');
                          return;
                        }
                        if (loginMethod === 'email' && (!email.trim() || !email.includes('@'))) {
                          setAuthError('Veuillez entrer une adresse email valide.');
                          return;
                        }
                        if (!password || password.length < 6) {
                          setAuthError('Le mot de passe doit contenir au moins 6 caractères.');
                          return;
                        }
                        handleSendOtp();
                      } else {
                        handlePasswordAuth();
                      }
                    }}
                    disabled={loadingAuth}
                    activeOpacity={0.85}
                  >
                    {loadingAuth ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitText}>
                        {authMode === 'register' ? 'Créer mon Compte ➔' : (authMode === 'login' ? 'Se Connecter ➔' : 'Réinitialiser ➔')}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Switch between Inscription and Connexion */}
                  <TouchableOpacity
                    style={{ marginTop: 6 }}
                    onPress={() => {
                      setAuthError('');
                      setAuthSuccessMsg('');
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                    }}
                  >
                    <Text style={styles.switchAuthText}>
                      {authMode === 'login'
                        ? "Pas encore de compte ? Créer un compte"
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
              )}
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
  toggleAuthTypeBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  toggleAuthTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  otpIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 4,
  },
  targetDestinationBadge: {
    backgroundColor: '#F1F5F9',
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderRadius: 16,
    height: 56,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 10,
    color: '#0F172A',
  },
  otpResendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  resendInfoText: {
    fontSize: 12,
    color: '#64748B',
  },
  resendBtnActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  resendTimerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  backStepBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  backStepBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
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
