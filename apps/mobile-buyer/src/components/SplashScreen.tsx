import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Easing,
  AccessibilityInfo,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Rocket, ShieldCheck, Headphones } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  // Animation Values
  const bgOpacity = useRef(new Animated.Value(0)).current;
  
  // Phase 1 & 4: Logo & Title
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoTranslateY = useRef(new Animated.Value(-15)).current;
  
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(10)).current;

  // Phase 2 & 3: Hands
  const leftHandTranslateX = useRef(new Animated.Value(-width * 0.8)).current;
  const leftHandOpacity = useRef(new Animated.Value(0)).current;
  const leftHandRotate = useRef(new Animated.Value(-8)).current;

  const rightHandTranslateX = useRef(new Animated.Value(width * 0.8)).current;
  const rightHandOpacity = useRef(new Animated.Value(0)).current;
  const rightHandRotate = useRef(new Animated.Value(8)).current;

  const handsPulseScale = useRef(new Animated.Value(1)).current;
  const handsGlowOpacity = useRef(new Animated.Value(0)).current;

  // Phase 5: Slogan
  const sloganOpacity = useRef(new Animated.Value(0)).current;
  const sloganTranslateY = useRef(new Animated.Value(12)).current;

  // Phase 6: Cards
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1TranslateY = useRef(new Animated.Value(20)).current;
  const card1Scale = useRef(new Animated.Value(0.96)).current;

  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card2TranslateY = useRef(new Animated.Value(20)).current;
  const card2Scale = useRef(new Animated.Value(0.96)).current;

  const card3Opacity = useRef(new Animated.Value(0)).current;
  const card3TranslateY = useRef(new Animated.Value(20)).current;
  const card3Scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    // Check Accessibility reduced motion
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) {
        // Fast forward to final state
        bgOpacity.setValue(1);
        logoOpacity.setValue(1);
        logoScale.setValue(1);
        logoTranslateY.setValue(0);
        titleOpacity.setValue(1);
        titleTranslateY.setValue(0);
        leftHandTranslateX.setValue(0);
        leftHandOpacity.setValue(1);
        leftHandRotate.setValue(0);
        rightHandTranslateX.setValue(0);
        rightHandOpacity.setValue(1);
        rightHandRotate.setValue(0);
        sloganOpacity.setValue(1);
        sloganTranslateY.setValue(0);
        card1Opacity.setValue(1);
        card1TranslateY.setValue(0);
        card1Scale.setValue(1);
        card2Opacity.setValue(1);
        card2TranslateY.setValue(0);
        card2Scale.setValue(1);
        card3Opacity.setValue(1);
        card3TranslateY.setValue(0);
        card3Scale.setValue(1);

        setTimeout(() => {
          if (onFinish) onFinish();
        }, 1500);
        return;
      }

      runFullSplashSequence();
    });
  }, []);

  const runFullSplashSequence = () => {
    // PHASE 1 — INTRODUCTION (0ms - 500ms)
    Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      
      // PHASE 2 — ARRIVÉE DES MAINS (500ms - 1700ms)
      Animated.parallel([
        Animated.timing(leftHandTranslateX, {
          toValue: 0,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(leftHandOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(leftHandRotate, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(rightHandTranslateX, {
          toValue: 0,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rightHandOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(rightHandRotate, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]).start(() => {

        // PHASE 3 — RENCONTRE & IMPULSION (1700ms - 2100ms)
        Animated.sequence([
          Animated.parallel([
            Animated.timing(handsPulseScale, {
              toValue: 1.04,
              duration: 200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(handsGlowOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(handsPulseScale, {
              toValue: 1.0,
              duration: 250,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(handsGlowOpacity, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {

          // PHASE 4 — REVIREMENT ET ANIMATION DU TITRE "KALAGBAN" (2100ms - 2500ms)
          Animated.parallel([
            Animated.timing(titleOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(titleTranslateY, {
              toValue: 0,
              duration: 400,
              easing: Easing.out(Easing.back(1.2)),
              useNativeDriver: true,
            }),
          ]).start(() => {

            // PHASE 5 — SLOGAN (2500ms - 2900ms)
            Animated.parallel([
              Animated.timing(sloganOpacity, {
                toValue: 1,
                duration: 450,
                useNativeDriver: true,
              }),
              Animated.timing(sloganTranslateY, {
                toValue: 0,
                duration: 450,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]).start(() => {

              // PHASE 6 — CARTES DE VALEUR SUCCESSIF (2900ms - 3600ms)
              Animated.stagger(130, [
                Animated.parallel([
                  Animated.timing(card1Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                  Animated.timing(card1TranslateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
                  Animated.timing(card1Scale, { toValue: 1, duration: 350, useNativeDriver: true }),
                ]),
                Animated.parallel([
                  Animated.timing(card2Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                  Animated.timing(card2TranslateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
                  Animated.timing(card2Scale, { toValue: 1, duration: 350, useNativeDriver: true }),
                ]),
                Animated.parallel([
                  Animated.timing(card3Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                  Animated.timing(card3TranslateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
                  Animated.timing(card3Scale, { toValue: 1, duration: 350, useNativeDriver: true }),
                ]),
              ]).start(() => {

                // PHASE 7 — FIN & TRANSITION (3600ms - 4000ms)
                setTimeout(() => {
                  if (onFinish) onFinish();
                }, 1200);
              });
            });
          });
        });
      });
    });
  };

  const leftRotateStr = leftHandRotate.interpolate({
    inputRange: [-8, 0],
    outputRange: ['-8deg', '0deg'],
  });

  const rightRotateStr = rightHandRotate.interpolate({
    inputRange: [0, 8],
    outputRange: ['0deg', '8deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F4FF" />

      <Animated.View style={[styles.bgContainer, { opacity: bgOpacity }]}>
        
        {/* Soft Decorative Background Circles */}
        <View style={styles.decorCircleTopLeft} />
        <View style={styles.decorCircleCenter} />
        <View style={styles.decorCircleBottomRight} />

        {/* 1. TOP LOGO & BRAND SECTION */}
        <View style={styles.topSection}>
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { translateY: logoTranslateY },
                ],
              },
            ]}
          >
            <Image
              source={require('@/assets/images/splash/kalagban-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
              alignItems: 'center',
            }}
          >
            <Text style={styles.brandTitle}>Kalagban</Text>
            <View style={styles.titleUnderline} />
          </Animated.View>

          {/* 5. SLOGAN */}
          <Animated.View
            style={[
              styles.sloganContainer,
              {
                opacity: sloganOpacity,
                transform: [{ translateY: sloganTranslateY }],
              },
            ]}
          >
            <Text style={styles.sloganLine}>
              Votre boutique <Text style={styles.sloganHighlight}>plus proche</Text> de vous.
            </Text>
            <Text style={styles.sloganLine}>
              Vos produits <Text style={styles.sloganHighlight}>plus proches</Text> de vous.
            </Text>
          </Animated.View>
        </View>

        {/* 2 & 3. CENTER HANDS MEETING SECTION */}
        <View style={styles.centerSection}>
          {/* Subtle Glow Aura behind Meeting Hands */}
          <Animated.View
            style={[
              styles.handsAuraGlow,
              { opacity: handsGlowOpacity, transform: [{ scale: handsPulseScale }] },
            ]}
          />

          <Animated.View
            style={[
              styles.handsContainer,
              { transform: [{ scale: handsPulseScale }] },
            ]}
          >
            {/* Left Hand: Holding 10,000 FCFA Banknotes */}
            <Animated.View
              style={[
                styles.handLeftWrapper,
                {
                  opacity: leftHandOpacity,
                  transform: [
                    { translateX: leftHandTranslateX },
                    { rotate: leftRotateStr },
                  ],
                },
              ]}
            >
              <Image
                source={require('@/assets/images/splash/hand-money.png')}
                style={styles.handImageLeft}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Right Hand: Holding Kalagban Purple Bag */}
            <Animated.View
              style={[
                styles.handRightWrapper,
                {
                  opacity: rightHandOpacity,
                  transform: [
                    { translateX: rightHandTranslateX },
                    { rotate: rightRotateStr },
                  ],
                },
              ]}
            >
              <Image
                source={require('@/assets/images/splash/hand-bag.png')}
                style={styles.handImageRight}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>
        </View>

        {/* 6. BOTTOM VALUE CARDS SECTION */}
        <View style={styles.bottomSection}>
          {/* Card 1: Rapide */}
          <Animated.View
            style={[
              styles.valueCard,
              {
                opacity: card1Opacity,
                transform: [{ translateY: card1TranslateY }, { scale: card1Scale }],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <Rocket size={22} color="#6D29D9" />
            </View>
            <Text style={styles.cardTitle}>Rapide</Text>
            <Text style={styles.cardSub}>Livraison express</Text>
          </Animated.View>

          {/* Card 2: Sécurisé */}
          <Animated.View
            style={[
              styles.valueCard,
              {
                opacity: card2Opacity,
                transform: [{ translateY: card2TranslateY }, { scale: card2Scale }],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <ShieldCheck size={22} color="#6D29D9" />
            </View>
            <Text style={styles.cardTitle}>Sécurisé</Text>
            <Text style={styles.cardSub}>Paiements protégés</Text>
          </Animated.View>

          {/* Card 3: À votre écoute */}
          <Animated.View
            style={[
              styles.valueCard,
              {
                opacity: card3Opacity,
                transform: [{ translateY: card3TranslateY }, { scale: card3Scale }],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <Headphones size={22} color="#6D29D9" />
            </View>
            <Text style={styles.cardTitle}>À votre écoute</Text>
            <Text style={styles.cardSub}>Support 24/7</Text>
          </Animated.View>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FF',
  },
  bgContainer: {
    flex: 1,
    backgroundColor: '#F5F4FF',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: height * 0.03,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircleTopLeft: {
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: '#EBE8FF',
    opacity: 0.6,
  },
  decorCircleCenter: {
    position: 'absolute',
    top: height * 0.35,
    alignSelf: 'center',
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: '#ECE7FF',
    opacity: 0.5,
  },
  decorCircleBottomRight: {
    position: 'absolute',
    bottom: -height * 0.08,
    right: -width * 0.15,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: '#E5DFFF',
    opacity: 0.4,
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
    paddingTop: height * 0.02,
    zIndex: 10,
  },
  logoWrapper: {
    width: width * 0.28,
    height: width * 0.28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#261758',
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 32,
    height: 4,
    backgroundColor: '#6D29D9',
    borderRadius: 2,
    marginTop: 4,
    marginBottom: 16,
  },
  sloganContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sloganLine: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3D2887',
    textAlign: 'center',
    lineHeight: 20,
  },
  sloganHighlight: {
    color: '#6D29D9',
    fontWeight: '900',
  },
  centerSection: {
    height: height * 0.36,
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  handsAuraGlow: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: 'rgba(109, 41, 217, 0.15)',
  },
  handsContainer: {
    width: width,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handLeftWrapper: {
    position: 'absolute',
    left: -width * 0.08,
    bottom: height * 0.01,
    width: width * 0.62,
    height: height * 0.32,
    zIndex: 2,
  },
  handImageLeft: {
    width: '100%',
    height: '100%',
  },
  handRightWrapper: {
    position: 'absolute',
    right: -width * 0.06,
    top: height * 0.01,
    width: width * 0.64,
    height: height * 0.34,
    zIndex: 3,
  },
  handImageRight: {
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: height * 0.02,
    zIndex: 10,
  },
  valueCard: {
    flex: 1,
    backgroundColor: '#FEFEFE',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3D2887',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0EBFF',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#261758',
    marginBottom: 2,
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#716799',
    textAlign: 'center',
  },
});
