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
  Platform,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      console.log('[DashboardScreen] Loading stats...');
      const data = await doctorService.getStats();
      console.log('[DashboardScreen] Stats loaded:', data);
      setStats(data);
    } catch (error: any) {
      console.error('[DashboardScreen] Error loading stats:', error);
      // Don't show alert, just use default stats
      setStats({
        total_patients: 0,
        pending_reports: 0,
        reviewed_reports: 0,
        total_encounters: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['access_token', 'user_id', 'user_role']);
            navigation.replace('Login');
          },
        },
      ],
    );
  };

  console.log('[DashboardScreen] Rendering, loading:', loading, 'stats:', stats);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{marginTop: 10}}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Icon name="favorite" size={24} color="#fff" />
          </View>
          <Text style={styles.title}>Doctor Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleProfile}>
              <Icon name="person" size={24} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <Icon name="logout" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>
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
    minHeight: '100vh',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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
    maxWidth: Platform.OS === 'web' ? 800 : undefined,
    width: '100%',
    alignSelf: 'center',
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
