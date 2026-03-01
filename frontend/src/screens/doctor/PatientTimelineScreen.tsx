import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {format, parseISO, addDays, addHours, isFuture, isPast} from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doctorService} from '../../services/doctorService';
import {encounterService} from '../../services/encounterService';
import {scheduleConsultation, getMyConsultations, VideoConsultation} from '../../services/videoConsultationService';
import {PatientTimeline, EncounterType, InputMethod} from '../../types';
import {TimelineItem} from '../../components/TimelineItem';
import {VitalsChart} from '../../components/VitalsChart';
import {calculateAge} from '../../utils/dateHelpers';
import messagingService from '../../services/messagingService';
import CreateReferralModal from '../../components/CreateReferralModal';

export const PatientTimelineScreen = ({route, navigation}: any) => {
  const {patientId} = route.params;
  const [timeline, setTimeline] = useState<PatientTimeline | null>(null);
  const [videoConsultations, setVideoConsultations] = useState<VideoConsultation[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingEncounter, setCreatingEncounter] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'history' | 'appointments' | 'vitals' | 'reports' | 'documents'>('dashboard');
  const [appointmentTab, setAppointmentTab] = useState<'upcoming' | 'past'>('upcoming');
  const [reportTab, setReportTab] = useState<'pending' | 'reviewed'>('pending');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showReferralModal, setShowReferralModal] = useState(false);

  useEffect(() => {
    loadTimeline();
    loadUnreadMessages();
    // Poll for unread messages every 10 seconds
    const interval = setInterval(loadUnreadMessages, 10000);
    return () => clearInterval(interval);
  }, [patientId]);

  const loadUnreadMessages = async () => {
    try {
      const unreadCount = await messagingService.getUnreadCount();
      const patientUnread = unreadCount.unread_by_user.find(
        u => u.user_id === patientId
      );
      setUnreadMessages(patientUnread ? patientUnread.unread_count : 0);
    } catch (error) {
      // Silently fail if messaging service is not available
      console.log('[PatientTimeline] Messaging service not available, skipping unread count');
      setUnreadMessages(0);
    }
  };

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getPatientTimeline(patientId);
      setTimeline(data);

      // Fetch video consultations for this patient
      try {
        const allConsultations = await getMyConsultations({limit: 100});
        // Filter consultations for this specific patient
        const patientConsultations = allConsultations.filter(
          (consult: any) => consult.patient_id === patientId
        );
        setVideoConsultations(patientConsultations);
      } catch (error) {
        console.error('Failed to load video consultations:', error);
      }

      // Fetch patient documents
      try {
        const patientDocs = await doctorService.getPatientDocuments(patientId);
        setDocuments(patientDocs);
      } catch (error) {
        console.error('Failed to load patient documents:', error);
        setDocuments([]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load patient timeline');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStartVoiceConsultation = async () => {
    if (!timeline) return;

    try {
      setCreatingEncounter(true);

      // Create a new encounter for this patient
      const encounter = await encounterService.createEncounter({
        patient_id: patientId,
        encounter_type: EncounterType.LIVE_VISIT,
        input_method: InputMethod.VOICE,
      });

      // Navigate to voice call screen
      navigation.navigate('VoiceCall', {
        encounterId: encounter.encounter_id,
        isDoctorConsultation: true,
        patientName: `${timeline.patient.first_name} ${timeline.patient.last_name}`,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start voice consultation');
    } finally {
      setCreatingEncounter(false);
    }
  };

  const handleScheduleVideoConsultation = async () => {
    if (!timeline) return;

    try {
      // Get doctor ID from storage
      const doctorId = await AsyncStorage.getItem('user_id');
      if (!doctorId) {
        Alert.alert('Error', 'Doctor ID not found');
        return;
      }

      // Schedule for tomorrow at a random time between 9 AM and 5 PM to avoid conflicts
      const tomorrowBase = addDays(new Date(), 1);
      tomorrowBase.setHours(9, 0, 0, 0); // Start at 9 AM
      const randomHourOffset = Math.floor(Math.random() * 8); // 0-7 hours (9 AM to 5 PM)
      const scheduledTime = addHours(tomorrowBase, randomHourOffset).toISOString();

      const scheduledTimeFormatted = format(parseISO(scheduledTime), 'MMM dd, yyyy • h:mm a');

      if (Platform.OS === 'web') {
        const confirmed = window.confirm(
          `Schedule video consultation for ${timeline.patient.first_name} ${timeline.patient.last_name}?\n\nScheduled time: ${scheduledTimeFormatted}\nDuration: 30 minutes\n\nYou can modify this later.`
        );

        if (confirmed) {
          const consultation = await scheduleConsultation({
            doctor_id: doctorId,
            scheduled_start_time: scheduledTime,
            duration_minutes: 30,
            patient_notes: `Video consultation scheduled by doctor for ${timeline.patient.first_name} ${timeline.patient.last_name}`,
            patient_id: patientId,
          });

          Alert.alert(
            'Success',
            'Video consultation scheduled successfully! The patient has been notified.',
            [{text: 'OK', onPress: () => loadTimeline()}]
          );
        }
      } else {
        Alert.alert(
          'Schedule Video Consultation',
          `Schedule video consultation for ${timeline.patient.first_name} ${timeline.patient.last_name}?\n\nScheduled time: ${scheduledTimeFormatted}\nDuration: 30 minutes\n\nYou can modify this later.`,
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Schedule',
              onPress: async () => {
                try {
                  const consultation = await scheduleConsultation({
                    doctor_id: doctorId,
                    scheduled_start_time: scheduledTime,
                    duration_minutes: 30,
                    patient_notes: `Video consultation scheduled by doctor for ${timeline.patient.first_name} ${timeline.patient.last_name}`,
                    patient_id: patientId,
                  });

                  Alert.alert(
                    'Success',
                    'Video consultation scheduled successfully! The patient has been notified.',
                    [{text: 'OK', onPress: () => loadTimeline()}]
                  );
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to schedule video consultation');
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to schedule video consultation');
    }
  };

  const calculateRiskLevel = (): {level: 'LOW' | 'MEDIUM' | 'HIGH'; color: string; icon: string} => {
    if (!timeline) return {level: 'LOW', color: '#00ACC1', icon: 'check-circle'};

    let riskScore = 0;

    // Check general health issues
    if (timeline.patient.general_health_issues && timeline.patient.general_health_issues.length > 100) {
      riskScore += 2;
    }

    // Check recent encounters with pending reports
    const pendingReports = timeline.encounters.filter(
      enc => enc.summary_report && enc.summary_report.status === 'PENDING_REVIEW'
    );
    riskScore += pendingReports.length;

    // Check vitals trends - look for abnormal values
    if (timeline.vitals_trend && timeline.vitals_trend.blood_pressure_sys.length > 0) {
      const latestBP = timeline.vitals_trend.blood_pressure_sys[timeline.vitals_trend.blood_pressure_sys.length - 1];
      if (latestBP > 140) riskScore += 2;
      if (latestBP < 90) riskScore += 1;
    }

    // Check encounter frequency - too many recent encounters
    const recentEncounters = timeline.encounters.filter(enc => {
      const encounterDate = new Date(enc.encounter.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return encounterDate > thirtyDaysAgo;
    });
    if (recentEncounters.length > 5) riskScore += 2;

    if (riskScore >= 5) return {level: 'HIGH', color: '#F44336', icon: 'warning'};
    if (riskScore >= 2) return {level: 'MEDIUM', color: '#FF9800', icon: 'info'};
    return {level: 'LOW', color: '#00ACC1', icon: 'check-circle'};
  };

  const getLastVisitDate = (): string => {
    if (!timeline || timeline.encounters.length === 0) return 'No previous visits';
    const lastEncounter = timeline.encounters[0]; // Already sorted by date desc
    return format(parseISO(lastEncounter.encounter.created_at), 'MMM dd, yyyy');
  };

  const getUpcomingVisitDate = (): string => {
    // Get upcoming video consultations
    const upcomingVideo = videoConsultations.filter(
      consult => consult.status === 'SCHEDULED' && isFuture(parseISO(consult.scheduled_start_time))
    );

    if (upcomingVideo.length === 0) {
      return 'No upcoming visits scheduled';
    }

    // Sort by date and get the nearest one
    const nextVisit = upcomingVideo.sort((a, b) =>
      new Date(a.scheduled_start_time).getTime() - new Date(b.scheduled_start_time).getTime()
    )[0];

    return format(parseISO(nextVisit.scheduled_start_time), 'MMM dd, yyyy • h:mm a');
  };

  const getVisitRecommendation = (): string => {
    if (!timeline) return '';

    const risk = calculateRiskLevel();
    const lastVisit = timeline.encounters.length > 0
      ? new Date(timeline.encounters[0].encounter.created_at)
      : null;

    const daysSinceLastVisit = lastVisit
      ? Math.floor((new Date().getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (risk.level === 'HIGH') {
      return 'Immediate consultation recommended';
    } else if (risk.level === 'MEDIUM' && daysSinceLastVisit > 14) {
      return 'Follow-up consultation recommended within a week';
    } else if (daysSinceLastVisit > 90) {
      return 'Routine check-up recommended';
    } else {
      return 'No immediate consultation needed';
    }
  };

  const getHealthSummary = (): string => {
    if (!timeline) return '';

    const parts = [];

    if (timeline.patient.general_health_issues) {
      parts.push(timeline.patient.general_health_issues.substring(0, 100) + '...');
    }

    const completedEncounters = timeline.encounters.filter(
      enc => enc.summary_report && enc.summary_report.status === 'REVIEWED'
    );

    if (completedEncounters.length > 0) {
      parts.push(`${completedEncounters.length} completed consultation${completedEncounters.length > 1 ? 's' : ''}`);
    }

    return parts.join(' • ') || 'No health issues recorded';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ACC1" />
      </View>
    );
  }

  if (!timeline) {
    return null;
  }

  const hasVitalsTrend = timeline.vitals_trend && timeline.vitals_trend.timestamps.length > 0;
  const riskInfo = calculateRiskLevel();

  const renderDashboard = () => {
    // Calculate appointment counts
    const upcomingVideo = videoConsultations.filter(
      consult => isFuture(parseISO(consult.scheduled_start_time))
    );
    const pastVideo = videoConsultations.filter(
      consult => isPast(parseISO(consult.scheduled_start_time))
    );

    const offlineVisits = timeline.encounters.filter(
      enc => enc.encounter.encounter_type === 'LIVE_VISIT' || enc.encounter.encounter_type === 'INITIAL_LOG'
    );
    const upcomingOffline = offlineVisits.filter(
      enc => enc.summary_report?.status === 'PENDING_REVIEW' || !enc.summary_report
    );
    const pastOffline = offlineVisits.filter(
      enc => enc.summary_report?.status === 'REVIEWED'
    );

    const totalUpcoming = upcomingVideo.length + upcomingOffline.length;
    const totalPast = pastVideo.length + pastOffline.length;

    return (
      <>
        {/* Health Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Health Summary</Text>
            <View style={[styles.riskBadge, {backgroundColor: riskInfo.color}]}>
              <Icon name={riskInfo.icon} size={16} color="#fff" />
              <Text style={styles.riskText}>{riskInfo.level} RISK</Text>
            </View>
          </View>

          <Text style={styles.summaryDescription}>{getHealthSummary()}</Text>

          <View style={styles.summaryMeta}>
            <View style={styles.metaItem}>
              <Icon name="event" size={18} color="#666" />
              <Text style={styles.metaLabel}>Last Visit:</Text>
              <Text style={styles.metaValue}>{getLastVisitDate()}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="event-available" size={18} color="#00ACC1" />
              <Text style={styles.metaLabel}>Upcoming Visit:</Text>
              <Text style={styles.metaValue}>{getUpcomingVisitDate()}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="lightbulb" size={18} color="#5B7C99" />
              <Text style={styles.metaLabel}>Recommendation:</Text>
            </View>
          </View>
          <Text style={styles.recommendationText}>{getVisitRecommendation()}</Text>
        </View>

        {/* Dashboard Cards */}
        <View style={styles.dashboardCards}>
        {/* PREVIOUS COLOR SCHEME (for reference/revert):
            History: backgroundColor: '#E3F2FD', icon: '#2196F3', title: '#1565C0', desc: '#1976D2'
            Appointments: backgroundColor: '#F3E5F5', icon: '#9C27B0', title: '#6A1B9A', desc: '#7B1FA2'
            Vitals: backgroundColor: '#FFEBEE', icon: '#F44336', title: '#C62828', desc: '#D32F2F'
            Video Call: backgroundColor: '#E8F5E9', icon: '#00ACC1', title: '#00ACC1', desc: '#00ACC1'
            Reports: backgroundColor: '#FFF3E0', icon: '#F57C00', title: '#E65100', desc: '#EF6C00'
        */}
        <TouchableOpacity
          style={[styles.dashboardCard, {backgroundColor: '#FFFFFF'}]}
          onPress={() => setActiveView('history')}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="history" size={32} color="#5B7C99" />
          </View>
          <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Patient's History</Text>
          <Text style={[styles.cardDescription, {color: '#6C757D'}]}>
            {timeline.encounters.length} encounters
          </Text>
          <Icon name="chevron-right" size={24} color="#ADB5BD" style={styles.cardChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dashboardCard, {backgroundColor: '#FFFFFF'}]}
          onPress={() => setActiveView('appointments')}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="event" size={32} color="#5B7C99" />
          </View>
          <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Appointments</Text>
          <Text style={[styles.cardDescription, {color: '#6C757D'}]}>
            {totalUpcoming} Upcoming • {totalPast} Past
          </Text>
          <Icon name="chevron-right" size={24} color="#ADB5BD" style={styles.cardChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dashboardCard, {backgroundColor: '#FFFFFF'}]}
          onPress={() => setActiveView('vitals')}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="favorite" size={32} color="#5B7C99" />
          </View>
          <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Vitals & Trends</Text>
          <Text style={[styles.cardDescription, {color: '#6C757D'}]}>
            View all vital signs
          </Text>
          <Icon name="chevron-right" size={24} color="#ADB5BD" style={styles.cardChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dashboardCard, {backgroundColor: '#FFFFFF'}]}
          onPress={handleScheduleVideoConsultation}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="videocam" size={32} color="#5B7C99" />
          </View>
          <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Schedule Video Call</Text>
          <Text style={[styles.cardDescription, {color: '#6C757D'}]}>
            Create video consultation
          </Text>
          <Icon name="chevron-right" size={24} color="#ADB5BD" style={styles.cardChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dashboardCard, {backgroundColor: '#FFFFFF'}]}
          onPress={() => setShowReferralModal(true)}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="sync-alt" size={32} color="#5B7C99" />
          </View>
          <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Refer Patient</Text>
          <Text style={[styles.cardDescription, {color: '#6C757D'}]}>
            Refer to another doctor
          </Text>
          <Icon name="chevron-right" size={24} color="#ADB5BD" style={styles.cardChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dashboardCard, {backgroundColor: '#FFFFFF'}]}
          onPress={() => setActiveView('reports')}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="assignment" size={32} color="#5B7C99" />
          </View>
          <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Reports</Text>
          <Text style={[styles.cardDescription, {color: '#6C757D'}]}>
            {timeline.encounters.filter(enc => enc.summary_report?.status === 'PENDING_REVIEW').length} Pending • {timeline.encounters.filter(enc => enc.summary_report?.status === 'REVIEWED').length} Reviewed
          </Text>
          <Icon name="chevron-right" size={24} color="#ADB5BD" style={styles.cardChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dashboardCard, {backgroundColor: '#FFFFFF'}]}
          onPress={() => setActiveView('documents')}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="folder-open" size={32} color="#5B7C99" />
          </View>
          <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Patient Documents</Text>
          <Text style={[styles.cardDescription, {color: '#6C757D'}]}>
            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
          </Text>
          <Icon name="chevron-right" size={24} color="#ADB5BD" style={styles.cardChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dashboardCard, {backgroundColor: '#FFFFFF'}]}
          onPress={() =>
            navigation.navigate('PatientMessages', {
              patientId: patientId,
              patientName: `${timeline.patient.first_name} ${timeline.patient.last_name}`,
            })
          }>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="chat-bubble" size={32} color="#5B7C99" />
          </View>
          <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Messages</Text>
          <Text style={[styles.cardDescription, {color: '#6C757D'}]}>
            {unreadMessages > 0 ? `${unreadMessages} new message${unreadMessages > 1 ? 's' : ''}` : 'No new messages'}
          </Text>
          <Icon name="chevron-right" size={24} color="#ADB5BD" style={styles.cardChevron} />
          {unreadMessages > 0 && (
            <View style={styles.cardUnreadBadge}>
              <Text style={styles.cardUnreadBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </>
    );
  };

  const renderHistory = () => (
    <View style={styles.timelineSection}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={() => setActiveView('dashboard')}>
          <Icon name="arrow-back" size={24} color="#5B7C99" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Patient's History</Text>
      </View>
      {timeline.encounters.map((encounter, index) => (
        <TimelineItem
          key={encounter.encounter.encounter_id}
          encounter={encounter}
          isLast={index === timeline.encounters.length - 1}
          onPress={
            encounter.summary_report
              ? () =>
                  navigation.navigate('ReviewReport', {
                    reportId: encounter.summary_report!.report_id,
                    encounterId: encounter.encounter.encounter_id,
                  })
              : undefined
          }
        />
      ))}
    </View>
  );

  const renderAppointments = () => {
    // Filter video consultations by upcoming/past
    const now = new Date();
    const upcomingVideo = videoConsultations.filter(
      consult => isFuture(parseISO(consult.scheduled_start_time))
    );
    const pastVideo = videoConsultations.filter(
      consult => isPast(parseISO(consult.scheduled_start_time))
    );

    // Filter offline appointments (in-person visits + text consultations)
    const offlineVisits = timeline.encounters.filter(
      enc => enc.encounter.encounter_type === 'LIVE_VISIT' || enc.encounter.encounter_type === 'INITIAL_LOG'
    );
    const upcomingOffline = offlineVisits.filter(
      enc => enc.summary_report?.status === 'PENDING_REVIEW' || !enc.summary_report
    );
    const pastOffline = offlineVisits.filter(
      enc => enc.summary_report?.status === 'REVIEWED'
    );

    const showUpcoming = appointmentTab === 'upcoming';
    const videoToShow = showUpcoming ? upcomingVideo : pastVideo;
    const offlineToShow = showUpcoming ? upcomingOffline : pastOffline;

    return (
      <View style={styles.appointmentsSection}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')}>
            <Icon name="arrow-back" size={24} color="#5B7C99" />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Appointments</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              appointmentTab === 'upcoming' && styles.activeTab,
            ]}
            onPress={() => setAppointmentTab('upcoming')}>
            <Text
              style={[
                styles.tabText,
                appointmentTab === 'upcoming' && styles.activeTabText,
              ]}>
              Upcoming ({upcomingVideo.length + upcomingOffline.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              appointmentTab === 'past' && styles.activeTab,
            ]}
            onPress={() => setAppointmentTab('past')}>
            <Text
              style={[
                styles.tabText,
                appointmentTab === 'past' && styles.activeTabText,
              ]}>
              Past ({pastVideo.length + pastOffline.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.appointmentContent}>
          <View style={styles.appointmentGroup}>
            <Text style={styles.appointmentGroupTitle}>
              📹 Video Consultations ({videoToShow.length})
            </Text>
            {videoToShow.length === 0 ? (
              <Text style={styles.emptyText}>
                {showUpcoming ? 'No upcoming video consultations' : 'No past video consultations'}
              </Text>
            ) : (
              videoToShow.map((consult, index) => (
                <TouchableOpacity
                  key={consult.consultation_id}
                  style={styles.appointmentCard}
                  onPress={() =>
                    navigation.navigate('ReviewReport', {
                      encounterId: consult.encounter_id,
                    })
                  }>
                  <View style={styles.appointmentHeader}>
                    <Icon name="videocam" size={24} color="#5B7C99" />
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentDate}>
                        {format(parseISO(consult.scheduled_start_time), 'MMM dd, yyyy • h:mm a')}
                      </Text>
                      <Text style={styles.appointmentDuration}>
                        Duration: {consult.duration_minutes} minutes
                      </Text>
                      <Text style={[styles.appointmentStatus, {color: getStatusColor(consult.status)}]}>
                        {consult.status}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={24} color="#ADB5BD" style={{marginLeft: 'auto'}} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.appointmentGroup}>
            <Text style={styles.appointmentGroupTitle}>
              🏥 Offline Appointments ({offlineToShow.length})
            </Text>
            {offlineToShow.length === 0 ? (
              <Text style={styles.emptyText}>
                {showUpcoming ? 'No upcoming offline appointments' : 'No past offline appointments'}
              </Text>
            ) : (
              offlineToShow.map((encounter, index) => (
                <TimelineItem
                  key={encounter.encounter.encounter_id}
                  encounter={encounter}
                  isLast={index === offlineToShow.length - 1}
                  onPress={
                    encounter.summary_report
                      ? () =>
                          navigation.navigate('ReviewReport', {
                            reportId: encounter.summary_report!.report_id,
                            encounterId: encounter.encounter.encounter_id,
                          })
                      : undefined
                  }
                />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return '#2196F3';
      case 'WAITING':
        return '#FF9800';
      case 'IN_PROGRESS':
        return '#00ACC1';
      case 'COMPLETED':
        return '#9C27B0';
      case 'CANCELLED':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const renderVitals = () => (
    <View style={styles.vitalsSection}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={() => setActiveView('dashboard')}>
          <Icon name="arrow-back" size={24} color="#5B7C99" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Vitals & Trends</Text>
      </View>

      {hasVitalsTrend ? (
        <>
          <VitalsChart
            title="Blood Pressure"
            data={timeline.vitals_trend!.blood_pressure_sys}
            timestamps={timeline.vitals_trend!.timestamps}
            color="#F44336"
          />
          <VitalsChart
            title="Heart Rate"
            data={timeline.vitals_trend!.heart_rate}
            timestamps={timeline.vitals_trend!.timestamps}
            color="#E91E63"
          />
          <VitalsChart
            title="Oxygen Level"
            data={timeline.vitals_trend!.oxygen_level}
            timestamps={timeline.vitals_trend!.timestamps}
            color="#2196F3"
          />
        </>
      ) : (
        <Text style={styles.emptyText}>No vitals data available</Text>
      )}
    </View>
  );

  const renderReports = () => {
    const pendingReports = timeline.encounters.filter(
      enc => enc.summary_report?.status === 'PENDING_REVIEW'
    );
    const reviewedReports = timeline.encounters.filter(
      enc => enc.summary_report?.status === 'REVIEWED'
    );

    const showPending = reportTab === 'pending';
    const reportsToShow = showPending ? pendingReports : reviewedReports;

    return (
      <View style={styles.reportsSection}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')}>
            <Icon name="arrow-back" size={24} color="#5B7C99" />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Reports</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              reportTab === 'pending' && styles.activeTab,
            ]}
            onPress={() => setReportTab('pending')}>
            <Text
              style={[
                styles.tabText,
                reportTab === 'pending' && styles.activeTabText,
              ]}>
              Pending ({pendingReports.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              reportTab === 'reviewed' && styles.activeTab,
            ]}
            onPress={() => setReportTab('reviewed')}>
            <Text
              style={[
                styles.tabText,
                reportTab === 'reviewed' && styles.activeTabText,
              ]}>
              Reviewed ({reviewedReports.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.reportsContent}>
          {reportsToShow.length === 0 ? (
            <Text style={styles.emptyText}>
              {showPending ? 'No pending reports' : 'No reviewed reports'}
            </Text>
          ) : (
            reportsToShow.map((encounter, index) => (
              <TimelineItem
                key={encounter.encounter.encounter_id}
                encounter={encounter}
                isLast={index === reportsToShow.length - 1}
                onPress={
                  encounter.summary_report
                    ? () =>
                        navigation.navigate('ReviewReport', {
                          reportId: encounter.summary_report!.report_id,
                          encounterId: encounter.encounter.encounter_id,
                        })
                    : undefined
                }
              />
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'videocam';
    if (type === 'application/pdf') return 'picture-as-pdf';
    return 'insert-drive-file';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleViewDocument = async (doc: any) => {
    try {
      const baseUrl = 'https://healthbridgeai.duckdns.org';
      const fullUrl = `${baseUrl}${doc.file_url}`;

      if (Platform.OS === 'web') {
        window.open(fullUrl, '_blank');
      } else {
        await Linking.openURL(fullUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const renderDocuments = () => {
    return (
      <View style={styles.documentsSection}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')}>
            <Icon name="arrow-back" size={24} color="#5B7C99" />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Patient Documents</Text>
        </View>

        <View style={styles.infoBanner}>
          <Icon name="info" size={20} color="#00695C" />
          <Text style={styles.infoText}>
            Medical records, lab reports, MRI scans, and prescriptions uploaded by the patient
          </Text>
        </View>

        <ScrollView style={styles.documentsContent}>
          {documents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="folder-open" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No documents uploaded yet</Text>
              <Text style={styles.emptySubtext}>
                Patient hasn't uploaded any medical documents
              </Text>
            </View>
          ) : (
            documents.map((doc) => (
              <TouchableOpacity
                key={doc.file_id}
                style={styles.documentCard}
                onPress={() => handleViewDocument(doc)}>
                <View style={styles.documentInfo}>
                  <Icon name={getFileIcon(doc.file_type)} size={40} color="#2196F3" />
                  <View style={styles.documentDetails}>
                    <Text style={styles.documentName} numberOfLines={2}>
                      {doc.file_name}
                    </Text>
                    <Text style={styles.documentMeta}>
                      {formatFileSize(doc.file_size)} • {format(parseISO(doc.uploaded_at), 'MMM dd, yyyy')}
                    </Text>
                  </View>
                </View>
                <Icon name="visibility" size={24} color="#00ACC1" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (activeView === 'dashboard') {
              navigation.goBack();
            } else {
              setActiveView('dashboard');
            }
          }}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>
            {timeline.patient.first_name} {timeline.patient.last_name}
          </Text>
          <Text style={styles.subtitle}>
            {calculateAge(timeline.patient.date_of_birth)} years • {timeline.patient.gender}
          </Text>
        </View>
        <View style={{flexDirection: 'row', gap: 8}}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('PatientMessages', {
                patientId: patientId,
                patientName: `${timeline.patient.first_name} ${timeline.patient.last_name}`,
              })
            }
            style={styles.messageButton}>
            <Icon name="chat-bubble" size={24} color="#fff" />
            {unreadMessages > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStartVoiceConsultation}
            style={styles.micButton}
            disabled={creatingEncounter}>
            {creatingEncounter ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Icon name="mic" size={28} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'history' && renderHistory()}
        {activeView === 'appointments' && renderAppointments()}
        {activeView === 'vitals' && renderVitals()}
        {activeView === 'reports' && renderReports()}
        {activeView === 'documents' && renderDocuments()}
      </ScrollView>

      <CreateReferralModal
        visible={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        patientId={patientId}
        patientName={timeline ? `${timeline.patient.first_name} ${timeline.patient.last_name}` : ''}
        onSuccess={() => {
          setShowReferralModal(false);
          Alert.alert('Success', 'Referral created successfully');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#00ACC1',
    paddingTop: 32,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  messageButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  summaryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  summaryMeta: {
    gap: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    color: '#333',
  },
  recommendationText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '600',
    marginLeft: 24,
  },
  dashboardCards: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  dashboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    position: 'absolute',
    left: 76,
    bottom: 12,
  },
  cardChevron: {
    marginLeft: 8,
  },
  cardUnreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cardUnreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  timelineSection: {
    padding: 16,
  },
  appointmentsSection: {
    padding: 16,
  },
  vitalsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
  },
  appointmentGroup: {
    marginBottom: 24,
  },
  appointmentGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#5B7C99',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#5B7C99',
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  appointmentDuration: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  appointmentStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reportsSection: {
    padding: 16,
  },
  reportsContent: {
    flex: 1,
  },
  documentsSection: {
    padding: 16,
  },
  documentsContent: {
    flex: 1,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#999',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
  },
});
