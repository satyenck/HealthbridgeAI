import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {format, parseISO} from 'date-fns';
import apiService from '../../services/apiService';
import {API_ENDPOINTS} from '../../config/api';
import {PatientTimeline} from '../../types';
import {TimelineItem} from '../../components/TimelineItem';

interface VitalLog {
  vital_id: string;
  recorded_at: string;
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  heart_rate?: number;
  temperature?: number;
  glucose_level?: number;
  weight?: number;
  height?: number;
  notes?: string;
  created_at: string;
}

export const TimelineScreen = ({navigation}: any) => {
  const [timeline, setTimeline] = useState<PatientTimeline | null>(null);
  const [vitals, setVitals] = useState<VitalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<'consultations' | 'vitals'>('consultations');

  useFocusEffect(
    useCallback(() => {
      loadTimeline();
    }, []),
  );

  const loadTimeline = async () => {
    try {
      setLoading(true);

      // Load timeline
      const timelineData = await apiService.get<PatientTimeline>(API_ENDPOINTS.PATIENT_TIMELINE);
      console.log('Timeline data loaded:', timelineData);

      setTimeline(timelineData);

      // Extract vitals from all encounters
      const allVitals: VitalLog[] = [];
      if (timelineData && timelineData.encounters) {
        timelineData.encounters.forEach((encounterData) => {
          if (encounterData.vitals && encounterData.vitals.length > 0) {
            encounterData.vitals.forEach((vital: any) => {
              allVitals.push({
                vital_id: vital.vital_id,
                recorded_at: vital.recorded_at,
                blood_pressure_sys: vital.blood_pressure_sys,
                blood_pressure_dia: vital.blood_pressure_dia,
                heart_rate: vital.heart_rate,
                temperature: vital.temperature,
                glucose_level: vital.glucose_level,
                weight: vital.weight,
                height: vital.height,
                notes: vital.notes,
                created_at: vital.created_at || vital.recorded_at,
              });
            });
          }
        });
      }

      // Sort vitals by recorded_at date (most recent first)
      allVitals.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

      console.log('Extracted vitals:', allVitals);
      setVitals(allVitals);
    } catch (error: any) {
      console.error('Timeline loading error:', error);
      Alert.alert('Error', error.message || 'Failed to load history');
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

  const renderVitalItem = (vital: VitalLog, index: number) => {
    try {
      const vitalDate = vital.recorded_at ? parseISO(vital.recorded_at) : new Date();
      const createdDate = vital.created_at ? parseISO(vital.created_at) : vitalDate;
      const measurements = [];

      if (vital.blood_pressure_sys && vital.blood_pressure_dia) {
        measurements.push(`BP: ${vital.blood_pressure_sys}/${vital.blood_pressure_dia}`);
      }
      if (vital.heart_rate) {
        measurements.push(`HR: ${vital.heart_rate} bpm`);
      }
      if (vital.temperature) {
        measurements.push(`Temp: ${vital.temperature}°C`);
      }
      if (vital.glucose_level) {
        measurements.push(`Glucose: ${vital.glucose_level} mg/dL`);
      }
      if (vital.weight) {
        measurements.push(`Weight: ${vital.weight} kg`);
      }

      if (measurements.length === 0) {
        return null; // Don't render if no measurements
      }

      return (
        <View key={vital.vital_id || index} style={styles.vitalCard}>
          <View style={styles.vitalHeader}>
            <View style={styles.vitalDateContainer}>
              <Icon name="favorite" size={20} color="#F44336" />
              <Text style={styles.vitalDate}>
                {format(vitalDate, 'MMM dd, yyyy')}
              </Text>
            </View>
            <Text style={styles.vitalTime}>
              {format(createdDate, 'h:mm a')}
            </Text>
          </View>

          <View style={styles.vitalMeasurements}>
            {measurements.map((measurement, idx) => (
              <View key={idx} style={styles.measurementChip}>
                <Text style={styles.measurementText}>{measurement}</Text>
              </View>
            ))}
          </View>

          {vital.notes && (
            <View style={styles.vitalNotes}>
              <Text style={styles.vitalNotesText}>{vital.notes}</Text>
            </View>
          )}
        </View>
      );
    } catch (error) {
      console.error('Error rendering vital item:', error, vital);
      return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>History</Text>

        {/* Section Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'consultations' && styles.tabActive,
            ]}
            onPress={() => setActiveSection('consultations')}>
            <Icon
              name="local-hospital"
              size={20}
              color={activeSection === 'consultations' ? '#2196F3' : '#999'}
            />
            <Text
              style={[
                styles.tabText,
                activeSection === 'consultations' && styles.tabTextActive,
              ]}>
              Consultations
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'vitals' && styles.tabActive,
            ]}
            onPress={() => setActiveSection('vitals')}>
            <Icon
              name="favorite"
              size={20}
              color={activeSection === 'vitals' ? '#F44336' : '#999'}
            />
            <Text
              style={[
                styles.tabText,
                activeSection === 'vitals' && styles.tabTextActive,
              ]}>
              Vitals
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {activeSection === 'consultations' ? (
          /* Consultations Timeline */
          <View style={styles.timelineSection}>
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
                <Icon name="event-note" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No consultations yet</Text>
                <Text style={styles.emptySubtext}>
                  Your consultation history will appear here
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Vitals History */
          <View style={styles.timelineSection}>
            {vitals.length > 0 ? (
              <>
                {vitals.map((vital, index) => renderVitalItem(vital, index))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="favorite-border" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No vitals recorded yet</Text>
                <Text style={styles.emptySubtext}>
                  Record your vitals to see them here
                </Text>
              </View>
            )}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
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
  },
  tabActive: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  timelineSection: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  vitalCard: {
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
  vitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vitalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vitalDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  vitalTime: {
    fontSize: 14,
    color: '#999',
  },
  vitalMeasurements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measurementChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  measurementText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1976D2',
  },
  vitalNotes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  vitalNotesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});
