import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {doctorService, DoctorStats} from '../../services/doctorService';

export const DashboardScreen = ({navigation}: any) => {
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, []),
  );

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getStats();
      setStats(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Doctor Dashboard</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#E3F2FD'}]}
            onPress={() => navigation.navigate('Patients')}>
            <View style={styles.actionIconContainer}>
              <Icon name="people" size={48} color="#1976D2" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#1565C0'}]}>My Patients</Text>
              <Text style={[styles.actionSubtitle, {color: '#1976D2'}]}>
                {stats?.total_patients || 0} {stats?.total_patients === 1 ? 'Patient' : 'Patients'}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#1976D2" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#FFF3E0'}]}
            onPress={() => navigation.navigate('Reports')}>
            <View style={styles.actionIconContainer}>
              <Icon name="assignment-late" size={48} color="#EF6C00" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#E65100'}]}>Pending Reports</Text>
              <Text style={[styles.actionSubtitle, {color: '#EF6C00'}]}>
                {stats?.pending_reports || 0} {stats?.pending_reports === 1 ? 'Report' : 'Reports'} awaiting review
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#EF6C00" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#E8F5E9'}]}
            onPress={() => navigation.navigate('Reports', {screen: 'ReviewedReports'})}>
            <View style={styles.actionIconContainer}>
              <Icon name="assignment-turned-in" size={48} color="#388E3C" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#2E7D32'}]}>Reviewed Reports</Text>
              <Text style={[styles.actionSubtitle, {color: '#388E3C'}]}>
                {stats?.reviewed_reports || 0} {stats?.reviewed_reports === 1 ? 'Report' : 'Reports'}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#388E3C" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#F3E5F5'}]}
            onPress={() => navigation.navigate('Search')}>
            <View style={styles.actionIconContainer}>
              <Icon name="search" size={48} color="#7B1FA2" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#6A1B9A'}]}>Search Patients</Text>
              <Text style={[styles.actionSubtitle, {color: '#7B1FA2'}]}>
                Find and view any patient records
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#7B1FA2" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#E1F5FE'}]}
            onPress={() => navigation.navigate('BulkVitalsRecord')}>
            <View style={styles.actionIconContainer}>
              <Icon name="mic" size={48} color="#0277BD" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#01579B'}]}>Record Patient Vitals</Text>
              <Text style={[styles.actionSubtitle, {color: '#0277BD'}]}>
                Voice record vitals for multiple patients
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#0277BD" />
          </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  actionsSection: {
    padding: 20,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    minHeight: 100,
  },
  actionIconContainer: {
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
});
