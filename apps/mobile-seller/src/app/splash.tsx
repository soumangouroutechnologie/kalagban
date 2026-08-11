import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { Store, ArrowRight, ShieldCheck, TrendingUp, Package } from 'lucide-react-native';

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  const handleStart = () => {
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Banner / Decorative Background */}
      <View style={styles.topDecoration}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo Badge */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <Store size={42} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>Kalagban</Text>
          <View style={styles.sellerTag}>
            <Text style={styles.sellerTagText}>ESPACE VENDEUR</Text>
          </View>
        </View>

        {/* Hero Slogan */}
        <View style={styles.sloganBox}>
          <Text style={styles.mainSlogan}>
            Développez votre audience & vos ventes en toute simplicité ✨
          </Text>
          <Text style={styles.subSlogan}>
            Suivez vos statistiques en temps réel, gérez vos produits et expédiez vos commandes rapidement.
          </Text>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#EEF2FF' }]}>
              <TrendingUp size={20} color="#4F46E5" />
            </View>
            <Text style={styles.featureText}>Ventes en Direct</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Package size={20} color="#16A34A" />
            </View>
            <Text style={styles.featureText}>Gestion Stock</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#FEF3C7' }]}>
              <ShieldCheck size={20} color="#D97706" />
            </View>
            <Text style={styles.featureText}>Paiements Mobile</Text>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.startButtonText}>Accéder à mon espace</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.copyrightText}>Kalagban Vendeur v1.0.0 • Tous droits réservés</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F46E5',
    justifyContent: 'space-between',
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  circle2: {
    position: 'absolute',
    top: 60,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  sellerTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  sellerTagText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sloganBox: {
    alignItems: 'center',
    marginBottom: 36,
  },
  mainSlogan: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 12,
  },
  subSlogan: {
    fontSize: 14,
    color: '#C7D2FE',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  startButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#1E1B4B',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  copyrightText: {
    color: '#A5B4FC',
    fontSize: 11,
    marginTop: 16,
    fontWeight: '500',
  },
});
