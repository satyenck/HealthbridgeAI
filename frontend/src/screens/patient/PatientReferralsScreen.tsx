/**
 * PatientReferralsScreen
 *
 * Shows referrals for current patient
 * Patient can see which doctor they should see and take action
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import referralService, { Referral } from '../../services/referralService';
import ReferralCard from '../../components/ReferralCard';
import messagingService from '../../services/messagingService';

const PatientReferralsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const data = await referralService.getMyReferrals();
      setReferrals(data);
    } catch (error) {
      console.error('Failed to load referrals:', error);
      Alert.alert('Error', 'Failed to load referrals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReferrals();
  }, []);

  const handleReferralPress = (referral: Referral) => {
    const actions: any[] = [];

    // Show referral details
    let message = `Your doctor ${referral.referring_doctor_name} has referred you to ${referral.referred_to_doctor_name}.\n\n`;
    message += `Reason: ${referral.reason}\n\n`;

    if (referral.specialty_needed) {
      message += `Specialty: ${referral.specialty_needed}\n\n`;
    }

    // Status-specific info
    switch (referral.status) {
      case 'PENDING':
        message += 'Status: Waiting for doctor to accept the referral.';
        break;
      case 'ACCEPTED':
        message += 'Status: Doctor has accepted. You can now book an appointment.';
        if (referral.referred_doctor_notes) {
          message += `\n\nDoctor's Notes: ${referral.referred_doctor_notes}`;
        }
        actions.push({
          text: 'Book Appointment',
          onPress: () => handleBookAppointment(referral),
        });
        break;
      case 'APPOINTMENT_SCHEDULED':
        message += `Appointment scheduled for ${new Date(referral.appointment_scheduled_time!).toLocaleString()}.`;
        if (referral.referred_doctor_notes) {
          message += `\n\nDoctor's Notes: ${referral.referred_doctor_notes}`;
        }
        break;
      case 'COMPLETED':
        message += 'Status: Appointment completed.';
        if (referral.referred_doctor_notes) {
          message += `\n\nDoctor's Notes: ${referral.referred_doctor_notes}`;
        }
        break;
      case 'DECLINED':
        message += 'Status: Doctor has declined the referral.';
        if (referral.declined_reason) {
          message += `\n\nReason: ${referral.declined_reason}`;
        }
        break;
    }

    // Add action to message doctor
    if (referral.status !== 'DECLINED' && referral.status !== 'CANCELLED') {
      actions.push({
        text: 'Message Doctor',
        onPress: () => handleMessageDoctor(referral),
      });
    }

    // Add action to call doctor if phone available
    if (referral.patient_phone) {
      actions.push({
        text: 'Call Doctor',
        onPress: () => handleCallDoctor(referral),
      });
    }

    actions.push({
      text: 'Close',
      style: 'cancel',
    });

    Alert.alert('Referral Details', message, actions);
  };

  const handleBookAppointment = (referral: Referral) => {
    // Navigate to video consultation booking with referred doctor pre-selected
    navigation.navigate('ScheduleVideoConsultation' as never, {
      preSelectedDoctorId: referral.referred_to_doctor_id,
      preSelectedDoctorName: referral.referred_to_doctor_name,
      symptomsText: referral.reason,
    } as never);
  };

  const handleMessageDoctor = async (referral: Referral) => {
    try {
      // Navigate to Messages stack -> DoctorMessages screen with the referred doctor
      navigation.navigate('Messages' as never, {
        screen: 'DoctorMessages',
        params: {
          doctorId: referral.referred_to_doctor_id,
          doctorName: referral.referred_to_doctor_name,
        },
      } as never);
    } catch (error) {
      console.error('Failed to open messaging:', error);
      Alert.alert('Error', 'Messaging feature not available');
    }
  };

  const handleCallDoctor = (referral: Referral) => {
    if (!referral.patient_phone) return;

    Alert.alert(
      'Call Doctor',
      `Call ${referral.referred_to_doctor_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${referral.patient_phone}`);
          },
        },
      ]
    );
  };

  const getActiveReferrals = () => {
    return referrals.filter(
      (r) =>
        r.status === 'PENDING' ||
        r.status === 'ACCEPTED' ||
        r.status === 'APPOINTMENT_SCHEDULED'
    );
  };

  const getCompletedReferrals = () => {
    return referrals.filter(
      (r) =>
        r.status === 'COMPLETED' ||
        r.status === 'DECLINED' ||
        r.status === 'CANCELLED'
    );
  };

  const activeReferrals = getActiveReferrals();
  const completedReferrals = getCompletedReferrals();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00695C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          🏥 Your doctor referrals. Take action to schedule appointments.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00695C']} />
        }
      >
        {/* Active Referrals */}
        {activeReferrals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Referrals</Text>
            {activeReferrals.map((referral) => (
              <ReferralCard
                key={referral.referral_id}
                referral={referral}
                viewType="patient"
                onPress={() => handleReferralPress(referral)}
              />
            ))}
          </View>
        )}

        {/* Completed Referrals */}
        {completedReferrals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Referrals</Text>
            {completedReferrals.map((referral) => (
              <ReferralCard
                key={referral.referral_id}
                referral={referral}
                viewType="patient"
                onPress={() => handleReferralPress(referral)}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {referrals.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No referrals yet</Text>
            <Text style={styles.emptySubtext}>
              Your doctor will refer you to specialists when needed
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  infoText: {
    fontSize: 13,
    color: '#2E7D32',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center',
  },
});

export default PatientReferralsScreen;
