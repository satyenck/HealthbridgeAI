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
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, {backgroundColor: '#E3F2FD'}]}>
            <Icon name="people" size={32} color="#2196F3" />
            <Text style={styles.statValue}>{stats?.total_patients || 0}</Text>
            <Text style={styles.statLabel}>My Patients</Text>
          </View>

          <View style={[styles.statCard, {backgroundColor: '#FFF3E0'}]}>
            <Icon name="assignment-late" size={32} color="#FF9800" />
            <Text style={styles.statValue}>{stats?.pending_reports || 0}</Text>
            <Text style={styles.statLabel}>Pending Reports</Text>
          </View>

          <View style={[styles.statCard, {backgroundColor: '#E8F5E9'}]}>
            <Icon name="assignment-turned-in" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>{stats?.reviewed_reports || 0}</Text>
            <Text style={styles.statLabel}>Reviewed</Text>
          </View>

          <View style={[styles.statCard, {backgroundColor: '#F3E5F5'}]}>
            <Icon name="description" size={32} color="#9C27B0" />
            <Text style={styles.statValue}>{stats?.consultations || 0}</Text>
            <Text style={styles.statLabel}>Consultations</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Patients')}>
            <View style={styles.actionContent}>
              <View style={styles.actionIconContainer}>
                <Icon name="people" size={32} color="#2196F3" />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>My Patients</Text>
                <Text style={styles.actionSubtitle}>
                  {stats?.total_patients || 0} patients you've reviewed
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Reports')}>
            <View style={styles.actionContent}>
              <View style={styles.actionIconContainer}>
                <Icon name="assignment-late" size={32} color="#FF9800" />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Pending Reports</Text>
                <Text style={styles.actionSubtitle}>
                  {stats?.pending_reports || 0} reports awaiting review
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Reports', {screen: 'ReviewedReports'})}>
            <View style={styles.actionContent}>
              <View style={styles.actionIconContainer}>
                <Icon name="assignment-turned-in" size={32} color="#4CAF50" />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Reviewed Reports</Text>
                <Text style={styles.actionSubtitle}>
                  {stats?.reviewed_reports || 0} reports you've reviewed
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Search')}>
            <View style={styles.actionContent}>
              <View style={styles.actionIconContainer}>
                <Icon name="search" size={32} color="#9C27B0" />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Search Patients</Text>
                <Text style={styles.actionSubtitle}>
                  Find and view any patient records
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
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
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#fff',
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
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
});
