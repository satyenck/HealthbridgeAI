/**
 * My Appointments Screen
 * Shows list of video consultations and in-person appointments
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format, parseISO, differenceInMinutes, isBefore, addMinutes } from 'date-fns';
import {
  getMyConsultations,
  cancelConsultation,
  VideoConsultation,
} from '../../services/videoConsultationService';
import apiService from '../../services/apiService';
import { API_ENDPOINTS } from '../../config/api';

interface InPersonAppointment {
  encounter_id: string;
  doctor_name?: string;
  created_at: string;
  status: string;
  symptoms?: string;
}

const MyVideoConsultationsScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'video' | 'inperson'>('video');
  const [consultations, setConsultations] = useState<VideoConsultation[]>([]);
  const [inPersonAppointments, setInPersonAppointments] = useState<InPersonAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchConsultations();
    }, [])
  );

  const fetchConsultations = async () => {
    try {
      setLoading(true);

      // Fetch video consultations
      const videoData = await getMyConsultations({ limit: 50 });
      const sortedVideo = videoData.sort((a, b) =>
        new Date(b.scheduled_start_time).getTime() - new Date(a.scheduled_start_time).getTime()
      );
      setConsultations(sortedVideo);

      // Fetch in-person appointments (LIVE_VISIT encounters)
      const timeline = await apiService.get(API_ENDPOINTS.PATIENT_TIMELINE);
      if (timeline && timeline.encounters) {
        const inPersonAppts = timeline.encounters
          .filter((enc: any) => enc.encounter.encounter_type === 'LIVE_VISIT')
          .map((enc: any) => ({
            encounter_id: enc.encounter.encounter_id,
            doctor_name: enc.doctor_info ?
              `Dr. ${enc.doctor_info.first_name} ${enc.doctor_info.last_name}` :
              'Doctor assigned',
            created_at: enc.encounter.created_at,
            status: enc.summary_report?.status || 'PENDING',
            symptoms: enc.summary_report?.symptoms_text,
          }))
          .sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        setInPersonAppointments(inPersonAppts);
      }
    } catch (error: any) {
      console.error('Failed to load appointments:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load appointments');
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
              await cancelConsultation(consultationId, 'Cancelled by patient');
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

    return (
      <View key={consultation.consultation_id} style={styles.consultationCard}>
        {/* Header */}
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

        {/* Patient Notes */}
        {consultation.patient_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Reason:</Text>
            <Text style={styles.notesText}>{consultation.patient_notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {consultation.status === 'SCHEDULED' && (
            <>
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
            </>
          )}
          {consultation.status === 'COMPLETED' && (
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() =>
                (navigation as any).navigate('EncounterDetailScreen', {
                  encounterId: consultation.encounter_id,
                })
              }
            >
              <Text style={styles.viewDetailsButtonText}>View Summary</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderInPersonAppointment = (appointment: InPersonAppointment) => {
    const appointmentDate = parseISO(appointment.created_at);
    const statusColor = appointment.status === 'COMPLETED' ? '#757575' : '#2196F3';

    return (
      <View key={appointment.encounter_id} style={styles.consultationCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.consultationDate}>
              {format(appointmentDate, 'EEEE, MMMM d')}
            </Text>
            <Text style={styles.consultationTime}>
              {format(appointmentDate, 'h:mm a')}
            </Text>
            <Text style={styles.doctorName}>{appointment.doctor_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{appointment.status}</Text>
          </View>
        </View>

        {appointment.symptoms && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Symptoms:</Text>
            <Text style={styles.notesText} numberOfLines={3}>{appointment.symptoms}</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() =>
              (navigation as any).navigate('EncounterDetailScreen', {
                encounterId: appointment.encounter_id,
              })
            }
          >
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
          </TouchableOpacity>
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

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'video' && styles.tabActive]}
          onPress={() => setActiveTab('video')}
        >
          <Icon name="videocam" size={20} color={activeTab === 'video' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>
            Video Calls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'inperson' && styles.tabActive]}
          onPress={() => setActiveTab('inperson')}
        >
          <Icon name="local-hospital" size={20} color={activeTab === 'inperson' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'inperson' && styles.tabTextActive]}>
            In-Person
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'video' ? (
          consultations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📹</Text>
              <Text style={styles.emptyTitle}>No Video Consultations</Text>
              <Text style={styles.emptyText}>
                Use the Health Assistant to schedule a video call with a doctor
              </Text>
            </View>
          ) : (
            <View style={styles.consultationsList}>
              {consultations.map(renderConsultation)}
            </View>
          )
        ) : (
          inPersonAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏥</Text>
              <Text style={styles.emptyTitle}>No In-Person Appointments</Text>
              <Text style={styles.emptyText}>
                Use the Health Assistant to schedule an in-person visit
              </Text>
            </View>
          ) : (
            <View style={styles.consultationsList}>
              {inPersonAppointments.map(renderInPersonAppointment)}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  doctorName: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  consultationsList: {
    padding: 16,
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
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MyVideoConsultationsScreen;
