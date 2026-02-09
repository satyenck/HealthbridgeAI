import React, {useState, useEffect, useCallback} from 'react';
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
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {doctorService} from '../../services/doctorService';
import {PatientProfile} from '../../types';
import {calculateAge} from '../../utils/dateHelpers';

export const MyPatientsScreen = ({navigation}: any) => {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, []),
  );

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getMyPatients();
      setPatients(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load patients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };

  const renderPatientCard = ({item}: {item: PatientProfile}) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() =>
        navigation.navigate('PatientTimeline', {patientId: item.user_id})
      }>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Icon name="person" size={48} color="#00ACC1" style={styles.avatar} />
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.patientDetails}>
              {calculateAge(item.date_of_birth)} years • {item.gender}
            </Text>
            {item.general_health_issues && (
              <Text style={styles.healthIssues} numberOfLines={1}>
                {item.general_health_issues}
              </Text>
            )}
          </View>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Icon name="folder-open" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No patients yet</Text>
      <Text style={styles.emptySubtext}>
        Reviewed encounters will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ACC1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={patients}
        keyExtractor={(item) => item.user_id}
        renderItem={renderPatientCard}
        ListEmptyComponent={renderEmpty}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 24,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  healthIssues: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
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
  },
});
