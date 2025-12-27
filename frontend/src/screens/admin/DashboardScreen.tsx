import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {adminService} from '../../services/adminService';
import {SystemStats} from '../../types';

export const DashboardScreen = ({navigation}: any) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminService.getSystemStats();
      setStats(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#F44336" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Dashboard</Text>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); loadStats();}} />}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, {backgroundColor: '#E3F2FD'}]}>
            <Icon name="people" size={32} color="#2196F3" />
            <Text style={styles.statValue}>{stats?.total_patients || 0}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#E8F5E9'}]}>
            <Icon name="local-hospital" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>{stats?.total_doctors || 0}</Text>
            <Text style={styles.statLabel}>Doctors</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#F3E5F5'}]}>
            <Icon name="science" size={32} color="#9C27B0" />
            <Text style={styles.statValue}>{stats?.total_labs || 0}</Text>
            <Text style={styles.statLabel}>Labs</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#FFF3E0'}]}>
            <Icon name="local-pharmacy" size={32} color="#FF9800" />
            <Text style={styles.statValue}>{stats?.total_pharmacies || 0}</Text>
            <Text style={styles.statLabel}>Pharmacies</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#FCE4EC'}]}>
            <Icon name="assignment" size={32} color="#E91E63" />
            <Text style={styles.statValue}>{stats?.total_encounters || 0}</Text>
            <Text style={styles.statLabel}>Encounters</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#FFF9C4'}]}>
            <Icon name="pending" size={32} color="#FBC02D" />
            <Text style={styles.statValue}>{stats?.pending_reports || 0}</Text>
            <Text style={styles.statLabel}>Pending Reports</Text>
          </View>
        </View>
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Create')}>
            <Icon name="add-circle" size={32} color="#F44336" />
            <Text style={styles.actionText}>Create Professional</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Users')}>
            <Icon name="people" size={32} color="#2196F3" />
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {backgroundColor: '#fff', padding: 16, paddingTop: 48, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3},
  title: {fontSize: 24, fontWeight: '700', color: '#333'},
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12},
  statCard: {width: '48%', padding: 20, borderRadius: 12, alignItems: 'center'},
  statValue: {fontSize: 32, fontWeight: '700', color: '#333', marginTop: 12},
  statLabel: {fontSize: 12, color: '#666', marginTop: 4},
  actionsSection: {padding: 16},
  sectionTitle: {fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12},
  actionButton: {backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center'},
  actionText: {fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 16},
});
