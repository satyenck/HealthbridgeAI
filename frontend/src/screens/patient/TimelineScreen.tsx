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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Consultation History</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {/* Consultations Timeline */}
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
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
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
  },
  content: {
    flex: 1,
  },
  timelineSection: {
    padding: 16,
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
