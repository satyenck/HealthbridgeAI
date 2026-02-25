/**
 * DoctorReferralsReceivedScreen
 *
 * Shows referrals received by current doctor (Doctor DB's view)
 * Doctor can accept/decline referrals and view patient details
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
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import referralService, { Referral } from '../../services/referralService';
import ReferralCard from '../../components/ReferralCard';

const DoctorReferralsReceivedScreen: React.FC = () => {
  console.log('[DoctorReferralsScreen] Component mounted');
  const navigation = useNavigation();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all');
  const [view, setView] = useState<'received' | 'made'>('received');

  // Modal states
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [acceptNotes, setAcceptNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    loadReferrals();
  }, [view]);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      console.log('[DoctorReferralsScreen] Loading referrals, view:', view);
      const data = view === 'received'
        ? await referralService.getReferralsReceived()
        : await referralService.getReferralsMade();
      console.log('[DoctorReferralsScreen] Raw response:', data);
      console.log('[DoctorReferralsScreen] Response type:', typeof data);
      console.log('[DoctorReferralsScreen] Is array:', Array.isArray(data));

      // Handle case where data is undefined or not an array
      if (!data || !Array.isArray(data)) {
        console.error('[DoctorReferralsScreen] Invalid response - not an array:', data);
        setReferrals([]);
        if (typeof window !== 'undefined') {
          alert(`API returned invalid data. You may need to log in again.\n\nView: ${view}\nResponse: ${JSON.stringify(data)}`);
        }
        return;
      }

      console.log('[DoctorReferralsScreen] Loaded', data.length, 'referrals');
      setReferrals(data);
    } catch (error: any) {
      console.error('[DoctorReferralsScreen] Failed to load referrals:', error);
      console.error('[DoctorReferralsScreen] Error details:', error.message, error.response);
      console.error('[DoctorReferralsScreen] Error response data:', error.response?.data);
      console.error('[DoctorReferralsScreen] Error response status:', error.response?.status);

      let errorMessage = error.message || 'Unknown error';
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      if (typeof window !== 'undefined') {
        alert(`Failed to load referrals: ${errorMessage}\n\nView: ${view}`);
      }
      Alert.alert('Error', `Failed to load referrals (${view}): ${errorMessage}`);
      setReferrals([]);
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
    setSelectedReferral(referral);
    // Navigate to referral detail screen (to be implemented) or show action sheet
    Alert.alert(
      'Referral Actions',
      `Patient: ${referral.patient_name}\nFrom: ${referral.referring_doctor_name}`,
      [
        {
          text: 'View Patient',
          onPress: () => navigation.navigate('DoctorPatientProfile' as never, { patientId: referral.patient_id } as never),
        },
        referral.status === 'PENDING' && {
          text: 'Accept',
          onPress: () => {
            setSelectedReferral(referral);
            setShowAcceptModal(true);
          },
        },
        referral.status === 'PENDING' && {
          text: 'Decline',
          onPress: () => {
            setSelectedReferral(referral);
            setShowDeclineModal(true);
          },
          style: 'destructive',
        },
        referral.status === 'ACCEPTED' && {
          text: 'Book Appointment',
          onPress: () => {
            // TODO: Navigate to appointment booking
            Alert.alert('Info', 'Appointment booking coming soon');
          },
        },
        referral.status === 'APPOINTMENT_SCHEDULED' && {
          text: 'Mark Complete',
          onPress: () => handleCompleteReferral(referral.referral_id),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ].filter(Boolean) as any
    );
  };

  const handleAcceptReferral = async () => {
    if (!selectedReferral) return;

    try {
      setActionLoading(true);
      await referralService.acceptReferral(
        selectedReferral.referral_id,
        acceptNotes.trim() || undefined
      );
      Alert.alert('Success', 'Referral accepted');
      setShowAcceptModal(false);
      setAcceptNotes('');
      loadReferrals();
    } catch (error) {
      console.error('Failed to accept referral:', error);
      Alert.alert('Error', 'Failed to accept referral');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineReferral = async () => {
    if (!selectedReferral) return;

    if (!declineReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for declining');
      return;
    }

    try {
      setActionLoading(true);
      await referralService.declineReferral(
        selectedReferral.referral_id,
        declineReason.trim()
      );
      Alert.alert('Success', 'Referral declined');
      setShowDeclineModal(false);
      setDeclineReason('');
      loadReferrals();
    } catch (error) {
      console.error('Failed to decline referral:', error);
      Alert.alert('Error', 'Failed to decline referral');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteReferral = async (referralId: string) => {
    Alert.alert(
      'Complete Referral',
      'Mark this referral as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await referralService.completeReferral(referralId);
              Alert.alert('Success', 'Referral marked as completed');
              loadReferrals();
            } catch (error) {
              console.error('Failed to complete referral:', error);
              Alert.alert('Error', 'Failed to complete referral');
            }
          },
        },
      ]
    );
  };

  const getFilteredReferrals = () => {
    switch (filter) {
      case 'pending':
        return referrals.filter((r) => r.status === 'PENDING');
      case 'accepted':
        return referrals.filter(
          (r) => r.status === 'ACCEPTED' || r.status === 'APPOINTMENT_SCHEDULED'
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
      {/* View Toggle (Received / Made) */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity
          style={[styles.viewToggleButton, view === 'received' && styles.viewToggleButtonActive]}
          onPress={() => setView('received')}
        >
          <Text style={[styles.viewToggleText, view === 'received' && styles.viewToggleTextActive]}>
            Received
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleButton, view === 'made' && styles.viewToggleButtonActive]}
          onPress={() => setView('made')}
        >
          <Text style={[styles.viewToggleText, view === 'made' && styles.viewToggleTextActive]}>
            Made
          </Text>
        </TouchableOpacity>
      </View>

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
          style={[styles.filterTab, filter === 'accepted' && styles.filterTabActive]}
          onPress={() => setFilter('accepted')}
        >
          <Text style={[styles.filterText, filter === 'accepted' && styles.filterTextActive]}>
            Accepted ({referrals.filter((r) => r.status === 'ACCEPTED' || r.status === 'APPOINTMENT_SCHEDULED').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Referrals List */}
      <FlatList
        data={filteredReferrals}
        keyExtractor={(item) => item.referral_id}
        renderItem={({ item }) => (
          <ReferralCard
            referral={item}
            viewType={view === 'received' ? 'received' : 'made'}
            onPress={() => handleReferralPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00695C']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No referrals found</Text>
          </View>
        }
      />

      {/* Accept Modal */}
      <Modal
        visible={showAcceptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAcceptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Accept Referral</Text>
            <Text style={styles.modalDescription}>
              You can add notes about accepting this referral (optional)
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Notes (optional)"
              value={acceptNotes}
              onChangeText={setAcceptNotes}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAcceptModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleAcceptReferral}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Decline Modal */}
      <Modal
        visible={showDeclineModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeclineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Referral</Text>
            <Text style={styles.modalDescription}>
              Please provide a reason for declining this referral
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for declining *"
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeclineModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, styles.modalDeclineButton]}
                onPress={handleDeclineReferral}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#00695C',
  },
  viewToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#00695C',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalDeclineButton: {
    backgroundColor: '#F44336',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DoctorReferralsReceivedScreen;
