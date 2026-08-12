import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth-context';
import { Store, Mail, Phone, Lock, User as UserIcon, Building2, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 14);

  const router = useRouter();
  const { signInWithEmail, signInWithPhone, sendOtpSeller, verifyOtpSeller, signUpSeller } = useAuth();

  const [isRegistering, setIsRegistering] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [authType, setAuthType] = useState<'otp' | 'password'>('otp');
  const [authStep, setAuthStep] = useState<'form' | 'otp'>('form');

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // Email or Phone number
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shopName, setShopName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Countdown timer for OTP
  React.useEffect(() => {
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

  const handleSendOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifier.trim()) {
      setErrorMessage(authMethod === 'email' ? 'Veuillez entrer votre adresse email.' : 'Veuillez entrer votre numéro de téléphone.');
      return;
    }

    if (isRegistering && !shopName.trim()) {
      setErrorMessage('Le nom de votre boutique est obligatoire.');
      return;
    }

    setLoading(true);

    try {
      const res = await sendOtpSeller(
        identifier.trim(),
        authMethod,
        shopName.trim(),
        firstName.trim(),
        lastName.trim()
      );

      if (res.error) {
        setErrorMessage(res.error.message || "Erreur lors de l'envoi du code OTP.");
      } else {
        setAuthStep('otp');
        setCountdown(60);
        setCanResend(false);
        setSuccessMessage(`Code de confirmation envoyé à ${identifier.trim()}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMessage('Veuillez saisir le code de vérification reçu.');
      return;
    }

    setLoading(true);

    try {
      const res = await verifyOtpSeller(
        identifier.trim(),
        authMethod,
        otpCode.trim(),
        shopName.trim(),
        firstName.trim(),
        lastName.trim(),
        password.trim()
      );

      if (res.error) {
        setErrorMessage(res.error.message || 'Code de vérification invalide ou expiré.');
      } else {
        Alert.alert(
          'Félicitations ! 🎉',
          isRegistering ? 'Votre boutique a été créée avec succès sur Kalagban.' : 'Connexion réussie !',
          [{ text: 'Accéder à mon tableau de bord', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la validation du code.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setErrorMessage('');
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (isRegistering && !shopName.trim()) {
      setErrorMessage('Le nom de votre boutique est obligatoire.');
      return;
    }

    setLoading(true);

    try {
      if (isRegistering) {
        // Register Seller
        const { error } = await signUpSeller(
          identifier.trim(),
          authMethod,
          password,
          shopName.trim(),
          firstName.trim(),
          lastName.trim()
        );
        if (error) {
          setErrorMessage(error.message || 'Erreur lors de la création de la boutique.');
        } else {
          Alert.alert(
            'Félicitations ! 🎉',
            'Votre boutique a été créée avec succès sur Kalagban.',
            [{ text: 'Accéder à mon tableau de bord', onPress: () => router.replace('/(tabs)') }]
          );
        }
      } else {
        // Sign In
        let res;
        if (authMethod === 'email') {
          res = await signInWithEmail(identifier.trim(), password);
        } else {
          res = await signInWithPhone(identifier.trim(), password);
        }
        if (res?.error) {
          const msg = res.error.message || '';
          if (msg.includes('Invalid login credentials')) {
            setErrorMessage('Email ou mot de passe incorrect. Si vous venez de créer votre compte, veuillez finaliser la validation par code OTP dans "Créer une Boutique".');
          } else {
            setErrorMessage(msg || 'Identifiants incorrects. Veuillez vérifier vos informations.');
          }
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + 10, paddingBottom: 160 + bottomPadding }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Top Header Card */}
        <View style={styles.headerBox}>
          <View style={styles.logoBadge}>
            <Store size={36} color="#4F46E5" />
          </View>
          <Text style={styles.headerTitle}>
            {authStep === 'otp'
              ? 'Vérification du Code'
              : (isRegistering ? 'Ouvrir ma Boutique' : 'Espace Vendeur')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {authStep === 'otp'
              ? `Saisissez le code de validation envoyé à ${identifier.trim()}`
              : (isRegistering
                ? 'Rejoignez des milliers de commerçants et vendez vos articles à travers tout le pays.'
                : 'Connectez-vous pour gérer votre catalogue et vos commandes.')}
          </Text>
        </View>

        {authStep === 'otp' ? (
          /* === STEP 2: OTP ENTRY FORM === */
          <View style={styles.formCard}>
            {!!errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
            {!!successMessage && (
              <View style={[styles.errorBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={[styles.errorText, { color: '#047857' }]}>{successMessage}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Code de Confirmation OTP *</Text>
              <TextInput
                style={styles.otpInputField}
                placeholder="• • • • • • • •"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={8}
                value={otpCode}
                onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 8))}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleVerifyOtp}
              disabled={loading || otpCode.length < 6}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Valider et Accéder ➔</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Pas reçu de code ?</Text>
              {canResend ? (
                <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#4F46E5', textDecorationLine: 'underline' }}>Renvoyer le code</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#94A3B8' }}>Renvoyer dans {countdown}s</Text>
              )}
            </View>

            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 16 }}
              onPress={() => {
                setAuthStep('form');
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>← Modifier mes informations</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* === STEP 1: FORM INPUTS === */
          <>
            {/* Tab Switcher: Login vs Register */}
            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                style={[styles.modeTab, !isRegistering && styles.activeModeTab]}
                onPress={() => {
                  setIsRegistering(false);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                <Text style={[styles.modeTabText, !isRegistering && styles.activeModeTabText]}>
                  Connexion
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, isRegistering && styles.activeModeTab]}
                onPress={() => {
                  setIsRegistering(true);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                <Text style={[styles.modeTabText, isRegistering && styles.activeModeTabText]}>
                  Créer une Boutique
                </Text>
              </TouchableOpacity>
            </View>

            {/* Auth Method Toggle: Email vs Phone */}
            <View style={styles.methodToggleRow}>
              <Text style={styles.methodLabel}>S'identifier par :</Text>
              <View style={styles.methodButtonsGroup}>
                <TouchableOpacity
                  style={[styles.methodBtn, authMethod === 'email' && styles.activeMethodBtn]}
                  onPress={() => setAuthMethod('email')}
                >
                  <Mail size={16} color={authMethod === 'email' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.methodBtnText, authMethod === 'email' && styles.activeMethodBtnText]}>
                    Email
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodBtn, authMethod === 'phone' && styles.activeMethodBtn]}
                  onPress={() => setAuthMethod('phone')}
                >
                  <Phone size={16} color={authMethod === 'phone' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.methodBtnText, authMethod === 'phone' && styles.activeMethodBtnText]}>
                    Téléphone
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error / Success Alert Box */}
            {!!errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
            {!!successMessage && (
              <View style={[styles.errorBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={[styles.errorText, { color: '#047857' }]}>{successMessage}</Text>
              </View>
            )}

            {/* Form Inputs */}
            <View style={styles.formCard}>
              {isRegistering && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nom de la Boutique *</Text>
                  <View style={styles.inputWrapper}>
                    <Building2 size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Pendyra Mode, TechIvoir..."
                      placeholderTextColor="#94A3B8"
                      value={shopName}
                      onChangeText={setShopName}
                    />
                  </View>
                </View>
              )}

              {/* Identifier Input (Email or Phone) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {authMethod === 'email' ? 'Adresse Email *' : 'Numéro de Téléphone *'}
                </Text>
                <View style={styles.inputWrapper}>
                  {authMethod === 'email' ? (
                    <Mail size={20} color="#64748B" style={styles.inputIcon} />
                  ) : (
                    <Phone size={20} color="#64748B" style={styles.inputIcon} />
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder={
                      authMethod === 'email'
                        ? 'vendeur@kalagban.com'
                        : '+225 07 77 62 08 64'
                    }
                    placeholderTextColor="#94A3B8"
                    keyboardType={authMethod === 'email' ? 'email-address' : 'phone-pad'}
                    autoCapitalize="none"
                    value={identifier}
                    onChangeText={setIdentifier}
                  />
                </View>
              </View>

              {isRegistering && (
                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Prénom</Text>
                    <View style={styles.inputWrapper}>
                      <UserIcon size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Kévin"
                        placeholderTextColor="#94A3B8"
                        value={firstName}
                        onChangeText={setFirstName}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Nom</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, { paddingLeft: 16 }]}
                        placeholder="Stéphane"
                        placeholderTextColor="#94A3B8"
                        value={lastName}
                        onChangeText={setLastName}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Password Field - Always Visible */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mot de Passe *</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingRight: 48 }]}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#4F46E5" />
                    ) : (
                      <Eye size={20} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => {
                  if (isRegistering) {
                    if (!shopName.trim()) {
                      setErrorMessage('Le nom de votre boutique est obligatoire.');
                      return;
                    }
                    if (!firstName.trim() || !lastName.trim()) {
                      setErrorMessage('Veuillez entrer votre prénom et nom.');
                      return;
                    }
                    if (!identifier.trim()) {
                      setErrorMessage(authMethod === 'email' ? 'Veuillez entrer votre adresse email.' : 'Veuillez entrer votre numéro de téléphone.');
                      return;
                    }
                    if (!password || password.length < 6) {
                      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
                      return;
                    }
                    handleSendOtp();
                  } else {
                    handlePasswordSubmit();
                  }
                }}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>
                      {isRegistering ? 'Créer ma Boutique ➔' : 'Se Connecter ➔'}
                    </Text>
                    <ArrowRight size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fast Account Tip */}
            {!isRegistering && (
              <View style={styles.quickAccessCard}>
                <CheckCircle2 size={20} color="#16A34A" />
                <Text style={styles.quickAccessText}>
                  Boutique déjà enregistrée ? Saisissez vos identifiants pour vous connecter instantanément.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeModeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  activeModeTabText: {
    color: '#4F46E5',
  },
  methodToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  methodButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  activeMethodBtn: {
    backgroundColor: '#4F46E5',
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeMethodBtnText: {
    color: '#FFFFFF',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
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
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    height: 52,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  quickAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    borderRadius: 16,
  },
  quickAccessText: {
    flex: 1,
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    lineHeight: 17,
  },
  otpInputField: {
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
});
