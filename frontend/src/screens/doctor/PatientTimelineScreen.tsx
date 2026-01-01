import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {doctorService} from '../../services/doctorService';
import {encounterService} from '../../services/encounterService';
import {PatientTimeline, EncounterType, InputMethod} from '../../types';
import {TimelineItem} from '../../components/TimelineItem';
import {VitalsChart} from '../../components/VitalsChart';
import {calculateAge} from '../../utils/dateHelpers';

export const PatientTimelineScreen = ({route, navigation}: any) => {
  const {patientId} = route.params;
  const [timeline, setTimeline] = useState<PatientTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingEncounter, setCreatingEncounter] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getPatientTimeline(patientId);
      setTimeline(data);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!timeline) {
    return null;
  }

  const hasVitalsTrend = timeline.vitals_trend && timeline.vitals_trend.timestamps.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
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

      <ScrollView style={styles.content}>
        {timeline.patient.general_health_issues && (
          <View style={styles.healthIssuesCard}>
            <Text style={styles.cardTitle}>General Health Issues</Text>
            <Text style={styles.healthIssuesText}>
              {timeline.patient.general_health_issues}
            </Text>
          </View>
        )}

        {hasVitalsTrend && (
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>Vitals Trends</Text>
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
          </View>
        )}

        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Patient History</Text>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4CAF50',
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
  micButton: {
    marginLeft: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  healthIssuesCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  healthIssuesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  chartsSection: {
    padding: 16,
    paddingTop: 0,
  },
  timelineSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
});
