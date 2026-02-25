/**
 * DoctorReferralsMadeScreen
 *
 * Shows referrals made by current doctor (Doctor DA's view)
 * Doctor can see status, appointment details, and outcomes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import referralService, { Referral } from '../../services/referralService';
import ReferralCard from '../../components/ReferralCard';

const DoctorReferralsMadeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const data = await referralService.getReferralsMade();
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
    // Show referral details and status
    const statusInfo = getStatusInfo(referral);

    Alert.alert(
      'Referral Status',
      statusInfo,
      [
        {
          text: 'View Patient',
          onPress: () => navigation.navigate('DoctorPatientProfile' as never, { patientId: referral.patient_id } as never),
        },
        referral.appointment_encounter_id && {
          text: 'View Appointment',
          onPress: () => {
            // TODO: Navigate to encounter detail
            Alert.alert('Info', 'Appointment detail coming soon');
          },
        },
        {
          text: 'Close',
          style: 'cancel',
        },
      ].filter(Boolean) as any
    );
  };

  const getStatusInfo = (referral: Referral): string => {
    let info = `Patient: ${referral.patient_name}\n`;
    info += `Referred to: ${referral.referred_to_doctor_name}\n`;
    info += `Status: ${referralService.getStatusText(referral.status)}\n`;
    info += `Priority: ${referral.priority}\n\n`;

    switch (referral.status) {
      case 'PENDING':
        info += 'Waiting for doctor to accept the referral.';
        break;
      case 'ACCEPTED':
        info += 'Doctor has accepted the referral. Appointment needs to be scheduled.';
        if (referral.referred_doctor_notes) {
          info += `\n\nDoctor's Notes: ${referral.referred_doctor_notes}`;
        }
        break;
      case 'APPOINTMENT_SCHEDULED':
        info += `Appointment scheduled for ${new Date(referral.appointment_scheduled_time!).toLocaleDateString()}.`;
        break;
      case 'COMPLETED':
        info += `Appointment completed on ${new Date(referral.appointment_completed_time!).toLocaleDateString()}.`;
        break;
      case 'DECLINED':
        info += 'Doctor has declined the referral.';
        if (referral.declined_reason) {
          info += `\n\nReason: ${referral.declined_reason}`;
        }
        break;
      case 'CANCELLED':
        info += 'Referral has been cancelled.';
        break;
    }

    return info;
  };

  const getFilteredReferrals = () => {
    switch (filter) {
      case 'pending':
        return referrals.filter((r) => r.status === 'PENDING');
      case 'active':
        return referrals.filter(
          (r) => r.status === 'ACCEPTED' || r.status === 'APPOINTMENT_SCHEDULED'
        );
      case 'completed':
        return referrals.filter(
          (r) => r.status === 'COMPLETED' || r.status === 'DECLINED' || r.status === 'CANCELLED'
        );
      default:
        return referrals;
    }
  };

  const filteredReferrals = getFilteredReferrals();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00695C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({referrals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending ({referrals.filter((r) => r.status === 'PENDING').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active ({referrals.filter((r) => r.status === 'ACCEPTED' || r.status === 'APPOINTMENT_SCHEDULED').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Done ({referrals.filter((r) => r.status === 'COMPLETED' || r.status === 'DECLINED' || r.status === 'CANCELLED').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          📋 Track referrals you've made. See status updates and appointment outcomes.
        </Text>
      </View>

      {/* Referrals List */}
      <FlatList
        data={filteredReferrals}
        keyExtractor={(item) => item.referral_id}
        renderItem={({ item }) => (
          <ReferralCard
            referral={item}
            viewType="made"
            onPress={() => handleReferralPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00695C']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'No referrals made yet'
                : `No ${filter} referrals`}
            </Text>
            <Text style={styles.emptySubtext}>
              Create a referral from a patient's encounter screen
            </Text>
          </View>
        }
      />
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#00695C',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#00695C',
  },
  infoBanner: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center',
  },
});

export default DoctorReferralsMadeScreen;
