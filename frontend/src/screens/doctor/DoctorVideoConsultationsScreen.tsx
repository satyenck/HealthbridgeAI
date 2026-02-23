/**
 * Doctor Appointments Screen
 * Shows list of appointments for the doctor (video consultations)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format, parseISO, differenceInMinutes, isFuture, isPast } from 'date-fns';
import {
  getMyConsultations,
  cancelConsultation,
  VideoConsultation,
} from '../../services/videoConsultationService';
import apiService from '../../services/apiService';
import { API_ENDPOINTS } from '../../config/api';

interface PatientInfo {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

const DoctorVideoConsultationsScreen = () => {
  const navigation = useNavigation();
  const [consultations, setConsultations] = useState<VideoConsultation[]>([]);
  const [patientMap, setPatientMap] = useState<Record<string, PatientInfo>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useFocusEffect(
    useCallback(() => {
      fetchConsultations();
    }, [])
  );

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const data = await getMyConsultations({ limit: 50 });
      // Sort by scheduled time (most recent first)
      const sorted = data.sort((a, b) =>
        new Date(b.scheduled_start_time).getTime() - new Date(a.scheduled_start_time).getTime()
      );
      setConsultations(sorted);

      // Fetch patient information for all unique patient IDs
      const patientIds = [...new Set(data.map(c => c.patient_id))];
      const patients: Record<string, PatientInfo> = {};

      for (const patientId of patientIds) {
        try {
          const response = await apiService.get(`${API_ENDPOINTS.DOCTOR_PATIENT_TIMELINE}/${patientId}`);
          if (response && response.patient) {
            patients[patientId] = response.patient;
          }
        } catch (error) {
          console.error(`Failed to fetch patient ${patientId}:`, error);
        }
      }

      setPatientMap(patients);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load consultations');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConsultations();
    setRefreshing(false);
  };

  const handleCancelConsultation = (consultationId: string) => {
    Alert.alert(
      'Cancel Consultation',
      'Are you sure you want to cancel this consultation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelConsultation(consultationId, 'Cancelled by doctor');
              Alert.alert('Success', 'Consultation cancelled successfully');
              fetchConsultations();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel consultation');
            }
          },
        },
      ]
    );
  };

  const canJoinNow = (scheduledTime: string): boolean => {
    // TEMPORARY: Allow joining anytime for testing
    return true;

    // PRODUCTION CODE (commented out for testing):
    // const scheduled = parseISO(scheduledTime);
    // const now = new Date();
    // const minutesUntil = differenceInMinutes(scheduled, now);
    // Can join 15 minutes before to 1 hour after scheduled time
    // return minutesUntil <= 15 && minutesUntil >= -60;
  };

  const getTimeUntilConsultation = (scheduledTime: string): string => {
    const scheduled = parseISO(scheduledTime);
    const now = new Date();
    const minutesUntil = differenceInMinutes(scheduled, now);

    if (minutesUntil < 0) {
      return 'Started';
    } else if (minutesUntil === 0) {
      return 'Starting now';
    } else if (minutesUntil < 60) {
      return `In ${minutesUntil} minutes`;
    } else if (minutesUntil < 1440) {
      const hours = Math.floor(minutesUntil / 60);
      return `In ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    } else {
      const days = Math.floor(minutesUntil / 1440);
      return `In ${days} ${days === 1 ? 'day' : 'days'}`;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'SCHEDULED':
        return '#2196F3';
      case 'WAITING':
        return '#FF9800';
      case 'IN_PROGRESS':
        return '#00ACC1';
      case 'COMPLETED':
        return '#757575';
      case 'CANCELLED':
        return '#F44336';
      case 'NO_SHOW':
        return '#9E9E9E';
      default:
        return '#757575';
    }
  };

  const renderConsultation = (consultation: VideoConsultation) => {
    const scheduledTime = parseISO(consultation.scheduled_start_time);
    const canJoin = canJoinNow(consultation.scheduled_start_time);
    const timeUntil = getTimeUntilConsultation(consultation.scheduled_start_time);
    const statusColor = getStatusColor(consultation.status);
    const patient = patientMap[consultation.patient_id];
    const patientName = patient
      ? `${patient.first_name} ${patient.last_name}`
      : 'Loading...';

    return (
      <View key={consultation.consultation_id} style={styles.consultationCard}>
        {/* Patient Name */}
        <View style={styles.patientHeader}>
          <Icon name="person" size={24} color="#2196F3" />
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patientName}</Text>
            {patient && (
              <Text style={styles.patientDetails}>
                {patient.gender} • {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years
              </Text>
            )}
          </View>
        </View>

        {/* Consultation Info */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.consultationDate}>
              {format(scheduledTime, 'EEEE, MMMM d')}
            </Text>
            <Text style={styles.consultationTime}>
              {format(scheduledTime, 'h:mm a')} • {consultation.duration_minutes} min
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{consultation.status}</Text>
          </View>
        </View>

        {/* Time Until */}
        {consultation.status === 'SCHEDULED' && (
          <Text style={styles.timeUntil}>{timeUntil}</Text>
        )}

        {/* Patient Notes/Symptoms */}
        {consultation.patient_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Symptoms / Notes:</Text>
            <Text style={styles.notesText}>{consultation.patient_notes}</Text>
          </View>
        )}

        {/* Channel Info for Upcoming */}
        {consultation.status === 'SCHEDULED' && (
          <View style={styles.channelInfo}>
            <Icon name="info-outline" size={16} color="#666" />
            <Text style={styles.channelText}>Channel: {consultation.channel_name}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {consultation.status === 'SCHEDULED' && (
            <>
              <View style={styles.topActions}>
                {canJoin ? (
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() =>
                      (navigation as any).navigate('VideoCallScreen', {
                        consultationId: consultation.consultation_id,
                      })
                    }
                  >
                    <Text style={styles.joinButtonText}>🎥 Join Call</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.waitingButton}>
                    <Text style={styles.waitingButtonText}>
                      ⏰ Available 15 min before
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelConsultation(consultation.consultation_id)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.viewDetailsButtonSecondary}
                onPress={() =>
                  (navigation as any).navigate('Search', {
                    screen: 'ReviewReport',
                    params: {
                      encounterId: consultation.encounter_id,
                    }
                  })
                }
              >
                <Icon name="description" size={18} color="#2196F3" />
                <Text style={styles.viewDetailsButtonSecondaryText}>View Encounter Details</Text>
              </TouchableOpacity>
            </>
          )}
          {(consultation.status === 'COMPLETED' || consultation.status === 'CANCELLED') && (
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() =>
                (navigation as any).navigate('Search', {
                  screen: 'DoctorConsultationReview',
                  params: {
                    encounterId: consultation.encounter_id,
                  }
                })
              }
            >
              <Text style={styles.viewDetailsButtonText}>
                {consultation.status === 'COMPLETED' ? 'View Summary' : 'View Details'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  // Filter consultations by upcoming/past
  const upcomingConsultations = consultations.filter(
    c => isFuture(parseISO(c.scheduled_start_time)) && c.status !== 'COMPLETED' && c.status !== 'CANCELLED'
  );
  const pastConsultations = consultations.filter(
    c => isPast(parseISO(c.scheduled_start_time)) || c.status === 'COMPLETED' || c.status === 'CANCELLED'
  );

  const showUpcoming = activeTab === 'upcoming';
  const displayConsultations = showUpcoming ? upcomingConsultations : pastConsultations;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Appointments</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'upcoming' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('upcoming')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'upcoming' && styles.activeTabText,
            ]}>
            Upcoming ({upcomingConsultations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'past' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('past')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'past' && styles.activeTabText,
            ]}>
            Past ({pastConsultations.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {displayConsultations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>
              {showUpcoming ? 'No Upcoming Appointments' : 'No Past Appointments'}
            </Text>
            <Text style={styles.emptyText}>
              {showUpcoming
                ? "You don't have any upcoming appointments"
                : "You don't have any past appointments yet"}
            </Text>
          </View>
        ) : (
          <View style={styles.consultationsList}>
            {displayConsultations.map(renderConsultation)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  consultationsList: {
    padding: 16,
    maxWidth: Platform.OS === 'web' ? 800 : undefined,
    width: '100%',
    alignSelf: 'center',
  },
  consultationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  consultationDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  consultationTime: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeUntil: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 12,
  },
  notesContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
  },
  actionsContainer: {
    gap: 8,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#00ACC1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingButton: {
    flex: 1,
    backgroundColor: '#FFE0B2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  waitingButtonText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewDetailsButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  viewDetailsButtonSecondaryText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
    maxWidth: Platform.OS === 'web' ? 800 : undefined,
    width: '100%',
    alignSelf: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '700',
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  patientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  patientDetails: {
    fontSize: 14,
    color: '#666',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  channelText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
});

export default DoctorVideoConsultationsScreen;
