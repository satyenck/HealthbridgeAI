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
import {getMyConsultations} from '../../services/videoConsultationService';
import {isFuture, parseISO} from 'date-fns';
import messagingService from '../../services/messagingService';

export const DashboardScreen = ({navigation}: any) => {
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [pastAppointments, setPastAppointments] = useState(0);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadUnreadMessages();
      // Poll for unread messages every 15 seconds
      const interval = setInterval(loadUnreadMessages, 15000);
      return () => clearInterval(interval);
    }, []),
  );

  const loadUnreadMessages = async () => {
    try {
      const unreadCount = await messagingService.getUnreadCount();
      setTotalUnreadMessages(unreadCount.total_unread);
    } catch (error) {
      // Silently fail if messaging service is not available
      console.log('[DashboardScreen] Messaging service not available, skipping unread count');
      setTotalUnreadMessages(0);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      console.log('[DashboardScreen] Loading stats...');
      const data = await doctorService.getStats();
      console.log('[DashboardScreen] Stats loaded:', data);
      setStats(data);

      // Load video consultation counts
      try {
        const consultations = await getMyConsultations({limit: 100});
        const upcoming = consultations.filter(
          c => c.status === 'SCHEDULED' && isFuture(parseISO(c.scheduled_start_time))
        ).length;
        const past = consultations.filter(
          c => c.status === 'COMPLETED' || c.status === 'CANCELLED' ||
          (c.status === 'SCHEDULED' && !isFuture(parseISO(c.scheduled_start_time)))
        ).length;
        setUpcomingAppointments(upcoming);
        setPastAppointments(past);
      } catch (error) {
        console.error('[DashboardScreen] Error loading appointments:', error);
        setUpcomingAppointments(0);
        setPastAppointments(0);
      }
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
    if (Platform.OS === 'web') {
      // Web uses window.confirm
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        await AsyncStorage.multiRemove(['access_token', 'user_id', 'user_role']);
        navigation.replace('Login');
      }
    } else {
      // Mobile uses Alert.alert
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
    }
  };

  console.log('[DashboardScreen] Rendering, loading:', loading, 'stats:', stats);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ACC1" />
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
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Messages')}>
              <Icon name="chat-bubble" size={24} color="#00ACC1" />
              {totalUnreadMessages > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleProfile}>
              <Icon name="person" size={24} color="#5B7C99" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <Icon name="logout" size={24} color="#6C757D" />
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
          {/* PREVIOUS COLOR SCHEME (for reference/revert):
              My Patients: backgroundColor: '#E3F2FD', icon: '#1976D2', title: '#1565C0', subtitle: '#1976D2'
              Reports: backgroundColor: '#E8F5E9', icon: '#00ACC1', title: '#00ACC1', subtitle: '#00ACC1'
              Appointments: backgroundColor: '#FCE4EC', icon: '#C2185B', title: '#880E4F', subtitle: '#C2185B'
              Search: backgroundColor: '#F3E5F5', icon: '#7B1FA2', title: '#6A1B9A', subtitle: '#7B1FA2'
              Vitals: backgroundColor: '#E1F5FE', icon: '#0277BD', title: '#01579B', subtitle: '#0277BD'
          */}
          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#FFFFFF'}]}
            onPress={() => navigation.navigate('Patients')}>
            <View style={[styles.actionIconContainer, {backgroundColor: '#F8F9FA'}]}>
              <Icon name="people" size={48} color="#5B7C99" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#2C3E50'}]}>My Patients</Text>
              <Text style={[styles.actionSubtitle, {color: '#6C757D'}]}>
                {stats?.total_patients || 0} {stats?.total_patients === 1 ? 'Patient' : 'Patients'}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ADB5BD" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#FFFFFF'}]}
            onPress={() => navigation.navigate('Reports')}>
            <View style={[styles.actionIconContainer, {backgroundColor: '#F8F9FA'}]}>
              <Icon name="assignment" size={48} color="#5B7C99" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#2C3E50'}]}>Reports</Text>
              <Text style={[styles.actionSubtitle, {color: '#6C757D'}]}>
                {stats?.pending_reports || 0} Pending • {stats?.reviewed_reports || 0} Reviewed
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ADB5BD" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#FFFFFF'}]}
            onPress={() => navigation.navigate('VideoConsultations')}>
            <View style={[styles.actionIconContainer, {backgroundColor: '#F8F9FA'}]}>
              <Icon name="event" size={48} color="#5B7C99" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#2C3E50'}]}>Appointments</Text>
              <Text style={[styles.actionSubtitle, {color: '#6C757D'}]}>
                {upcomingAppointments} Upcoming • {pastAppointments} Past
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ADB5BD" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#FFFFFF'}]}
            onPress={() => navigation.navigate('Search')}>
            <View style={[styles.actionIconContainer, {backgroundColor: '#F8F9FA'}]}>
              <Icon name="search" size={48} color="#5B7C99" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#2C3E50'}]}>Search Patients</Text>
              <Text style={[styles.actionSubtitle, {color: '#6C757D'}]}>
                Find and view any patient records
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ADB5BD" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#FFFFFF'}]}
            onPress={() => navigation.navigate('BulkVitalsRecord')}>
            <View style={[styles.actionIconContainer, {backgroundColor: '#F8F9FA'}]}>
              <Icon name="mic" size={48} color="#5B7C99" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, {color: '#2C3E50'}]}>Record Patient Vitals</Text>
              <Text style={[styles.actionSubtitle, {color: '#6C757D'}]}>
                Voice record vitals for multiple patients
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ADB5BD" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    minHeight: '100vh',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
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
    backgroundColor: '#00ACC1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  headerBadge: {
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
  headerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C3E50',
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
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  actionIconContainer: {
    marginRight: 16,
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  actionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
});
