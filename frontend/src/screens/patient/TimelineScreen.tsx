import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import apiService from '../../services/apiService';
import {API_ENDPOINTS} from '../../config/api';
import {PatientTimeline} from '../../types';
import {TimelineItem} from '../../components/TimelineItem';
import {VitalsChart} from '../../components/VitalsChart';

export const TimelineScreen = ({navigation}: any) => {
  const [timeline, setTimeline] = useState<PatientTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTimeline();
    }, []),
  );

  const loadTimeline = async () => {
    try {
      setLoading(true);

      // Use patient timeline endpoint
      const data = await apiService.get<PatientTimeline>(API_ENDPOINTS.PATIENT_TIMELINE);
      console.log('Timeline data loaded:', data);
      setTimeline(data);
    } catch (error: any) {
      console.error('Timeline loading error:', error);
      Alert.alert('Error', error.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTimeline();
  };

  const handleEncounterPress = (encounterId: string) => {
    navigation.navigate('EncounterDetail', {encounterId});
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const hasVitalsTrend = timeline?.vitals_trend && timeline.vitals_trend.timestamps.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Timeline</Text>
        {timeline && (
          <Text style={styles.subtitle}>
            {timeline.patient.first_name} {timeline.patient.last_name}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {/* Vitals Trends */}
        {hasVitalsTrend && (
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>Vitals Trends</Text>

            <VitalsChart
              title="Blood Pressure"
              data={timeline.vitals_trend!.blood_pressure_sys}
              timestamps={timeline.vitals_trend!.timestamps}
              color="#F44336"
              unit="mmHg"
            />

            <VitalsChart
              title="Heart Rate"
              data={timeline.vitals_trend!.heart_rate}
              timestamps={timeline.vitals_trend!.timestamps}
              color="#E91E63"
              unit="bpm"
            />

            <VitalsChart
              title="Oxygen Level"
              data={timeline.vitals_trend!.oxygen_level}
              timestamps={timeline.vitals_trend!.timestamps}
              color="#2196F3"
              unit="%"
            />

            <VitalsChart
              title="Temperature"
              data={timeline.vitals_trend!.temperature}
              timestamps={timeline.vitals_trend!.timestamps}
              color="#FF9800"
              unit="°C"
            />

            <VitalsChart
              title="Weight"
              data={timeline.vitals_trend!.weight}
              timestamps={timeline.vitals_trend!.timestamps}
              color="#4CAF50"
              unit="kg"
            />
          </View>
        )}

        {/* Consultations Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Consultation History</Text>
          {timeline && timeline.encounters.length > 0 ? (
            timeline.encounters.map((encounter, index) => (
              <TimelineItem
                key={encounter.encounter.encounter_id}
                encounter={encounter}
                onPress={() => handleEncounterPress(encounter.encounter.encounter_id)}
                isLast={index === timeline.encounters.length - 1}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No consultations yet</Text>
            </View>
          )}
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
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 48,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  chartsSection: {
    padding: 16,
    paddingBottom: 0,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
