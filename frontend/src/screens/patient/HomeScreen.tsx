import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {encounterService} from '../../services/encounterService';
import {authService} from '../../services/authService';
import {EncounterCard} from '../../components/EncounterCard';
import {Encounter, EncounterType, ReportStatus, DoctorProfile} from '../../types';

interface EncounterWithStatus extends Encounter {
  reportStatus?: ReportStatus;
  doctor_info?: DoctorProfile;
}

export const HomeScreen = ({navigation}: any) => {
  const [encounters, setEncounters] = useState<EncounterWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEncounters();
    }, []),
  );

  const loadEncounters = async () => {
    try {
      setLoading(true);
      const userId = await authService.getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const data = await encounterService.getEncounters(userId);

      // Fetch summary report status and doctor info for each encounter
      const encountersWithStatus = await Promise.all(
        data.map(async (encounter) => {
          try {
            const detail = await encounterService.getEncounterDetail(encounter.encounter_id);
            return {
              ...encounter,
              reportStatus: detail.summary_report?.status || ReportStatus.GENERATED,
              doctor_info: detail.doctor_info,
            };
          } catch (error) {
            console.log('Error loading encounter detail:', error);
            return {
              ...encounter,
              reportStatus: ReportStatus.GENERATED,
            };
          }
        })
      );

      // Sort by created_at descending
      setEncounters(encountersWithStatus.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load encounters');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEncounters();
  };

  const handleNewEncounter = (type: EncounterType) => {
    navigation.navigate('NewEncounter', {encounterType: type});
  };

  const handleEncounterPress = (encounter: EncounterWithStatus) => {
    navigation.navigate('EncounterDetail', {encounterId: encounter.encounter_id});
  };

  const handleHealthAssistant = () => {
    navigation.navigate('HealthAssistant');
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>New Consultation</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: '#9C27B0'}]}
          onPress={handleHealthAssistant}>
          <Icon name="health-and-safety" size={32} color="#fff" />
          <Text style={styles.actionText}>Health Assistant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: '#2196F3'}]}
          onPress={() => handleNewEncounter(EncounterType.REMOTE_CONSULT)}>
          <Icon name="videocam" size={32} color="#fff" />
          <Text style={styles.actionText}>Remote Consult</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: '#4CAF50'}]}
          onPress={() => handleNewEncounter(EncounterType.LIVE_VISIT)}>
          <Icon name="local-hospital" size={32} color="#fff" />
          <Text style={styles.actionText}>Live Visit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: '#FF9800'}]}
          onPress={() => handleNewEncounter(EncounterType.INITIAL_LOG)}>
          <Icon name="edit" size={32} color="#fff" />
          <Text style={styles.actionText}>Initial Log</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Icon name="folder-open" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No consultations yet</Text>
      <Text style={styles.emptySubtext}>
        Create your first consultation using the buttons above
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Dashboard</Text>
      </View>

      <FlatList
        data={encounters}
        keyExtractor={(item) => item.encounter_id}
        ListHeaderComponent={renderQuickActions}
        ListEmptyComponent={!loading ? renderEmpty : null}
        renderItem={({item}) => (
          <EncounterCard
            encounter={item}
            reportStatus={item.reportStatus}
            doctorInfo={item.doctor_info}
            onPress={() => handleEncounterPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  listContent: {
    padding: 16,
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
});
