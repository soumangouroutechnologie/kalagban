import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Clock, Package, Truck, MapPin, KeyRound, Sparkles } from 'lucide-react-native';

interface OrderStatusTimelineProps {
  orderStatus: string;
  relayStatus?: string | null;
  deliveryType?: string | null;
  pickupCode?: string | null;
  createdAt?: string;
}

export default function OrderStatusTimeline({
  orderStatus = 'pending',
  relayStatus,
  deliveryType = 'pickup_point',
  pickupCode,
  createdAt,
}: OrderStatusTimelineProps) {
  let currentStep = 1;

  if (orderStatus === 'delivered' || relayStatus === 'picked_up') {
    currentStep = 6;
  } else if (relayStatus === 'ready_for_pickup' || relayStatus === 'deposited') {
    currentStep = 5;
  } else if (orderStatus === 'in_transit' || orderStatus === 'shipped') {
    currentStep = 4;
  } else if (orderStatus === 'preparing' || orderStatus === 'processing') {
    currentStep = 3;
  } else if (orderStatus === 'confirmed') {
    currentStep = 2;
  } else {
    currentStep = 1;
  }

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    : "Aujourd'hui";

  const steps = [
    {
      id: 1,
      title: 'COMMANDE EFFECTUÉE',
      description: 'Votre commande a été enregistrée avec succès sur Kalagban.',
      date: formattedDate,
    },
    {
      id: 2,
      title: 'EN ATTENTE DE CONFIRMATION',
      description: 'La boutique partenaire valide la disponibilité de vos articles.',
      date: currentStep >= 2 ? formattedDate : '--',
    },
    {
      id: 3,
      title: "EN ATTENTE D'EXPÉDITION",
      description: 'Le vendeur prépare votre colis et édite le bordereau.',
      date: currentStep >= 3 ? formattedDate : '--',
    },
    {
      id: 4,
      title: "EN COURS D'EXPÉDITION",
      description: 'Le livreur achemine votre colis vers votre Point Relais.',
      date: currentStep >= 4 ? formattedDate : '--',
    },
    {
      id: 5,
      title: deliveryType === 'pickup_point' ? 'PRÊT À RÉCUPÉRER AU POINT RELAIS' : 'EN ROUTE VERS ADRESSE',
      description: deliveryType === 'pickup_point'
        ? 'Votre colis est arrivé ! Présentez votre Code OTP au gérant.'
        : 'Le livreur est en route vers votre adresse de livraison.',
      date: currentStep >= 5 ? formattedDate : '--',
      showOtp: deliveryType === 'pickup_point' && pickupCode,
    },
    {
      id: 6,
      title: 'COLIS LIVRÉ',
      description: 'Votre commande a été remis en main propre. Merci !',
      date: currentStep >= 6 ? formattedDate : '--',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Timeline Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Sparkles size={14} color="#4F46E5" />
          <Text style={styles.badgeText}>SUIVI DE COMMANDE EN TEMPS RÉEL</Text>
        </View>
        <Text style={styles.title}>État de la commande</Text>
      </View>

      {/* Vertical Animated Timeline List */}
      <View style={styles.timelineContainer}>
        {/* Vertical Line */}
        <View style={styles.verticalLine} />

        {steps.map((step) => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <View key={step.id} style={styles.stepRow}>
              {/* Point Circle Icon */}
              <View
                style={[
                  styles.circle,
                  isDone && styles.circleDone,
                  isCurrent && styles.circleCurrent,
                ]}
              >
                {isDone ? (
                  <CheckCircle2 size={16} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.circleText, isCurrent && styles.circleTextCurrent]}>
                    {step.id}
                  </Text>
                )}
              </View>

              {/* Step Content */}
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepTag,
                      isDone && styles.stepTagDone,
                      isCurrent && styles.stepTagCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepTagText,
                        isDone && styles.stepTagTextDone,
                        isCurrent && styles.stepTagTextCurrent,
                      ]}
                    >
                      {step.title}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{step.date}</Text>
                </View>

                <Text style={[styles.descText, isCurrent && styles.descTextCurrent]}>
                  {step.description}
                </Text>

                {/* OTP Highlight Banner inside Step 5 */}
                {step.showOtp && (
                  <View style={styles.otpBanner}>
                    <View style={styles.otpHeader}>
                      <KeyRound size={16} color="#0F172A" />
                      <Text style={styles.otpLabel}>VOTRE CODE OTP À PRÉSENTER AU GÉRANT :</Text>
                    </View>
                    <Text style={styles.otpCode}>{pickupCode}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 28,
  },
  verticalLine: {
    position: 'absolute',
    left: 12,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: '#E2E8F0',
  },
  stepRow: {
    position: 'relative',
    marginBottom: 24,
  },
  circle: {
    position: 'absolute',
    left: -28,
    top: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  circleCurrent: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  circleText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
  },
  circleTextCurrent: {
    color: '#FFFFFF',
  },
  stepContent: {
    gap: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  stepTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepTagDone: {
    backgroundColor: '#ECFDF5',
  },
  stepTagCurrent: {
    backgroundColor: '#4F46E5',
  },
  stepTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
  },
  stepTagTextDone: {
    color: '#047857',
  },
  stepTagTextCurrent: {
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    fontFamily: 'Platform',
  },
  descText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 18,
  },
  descTextCurrent: {
    fontWeight: '700',
    color: '#0F172A',
  },
  otpBanner: {
    marginTop: 10,
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otpLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  otpCode: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 6,
    fontFamily: 'Platform',
  },
});
