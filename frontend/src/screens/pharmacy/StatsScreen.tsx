import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {pharmacyService, PharmacyStats} from '../../services/pharmacyService';

export const StatsScreen = () => {
  const [stats, setStats] = useState<PharmacyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await pharmacyService.getStats();
      setStats(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FF9800" /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); loadStats();}} />}>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, {backgroundColor: '#FFF3E0'}]}>
          <Icon name="local-pharmacy" size={32} color="#F57C00" />
          <Text style={styles.statValue}>{stats?.total_prescriptions || 0}</Text>
          <Text style={styles.statLabel}>Total Prescriptions</Text>
        </View>
        <View style={[styles.statCard, {backgroundColor: '#FFE0B2'}]}>
          <Icon name="pending" size={32} color="#FF9800" />
          <Text style={styles.statValue}>{stats?.pending_prescriptions || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, {backgroundColor: '#E8F5E9'}]}>
          <Icon name="check-circle" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>{stats?.completed_prescriptions || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, {backgroundColor: '#F3E5F5'}]}>
          <Icon name="calendar-today" size={32} color="#9C27B0" />
          <Text style={styles.statValue}>{stats?.prescriptions_this_month || 0}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12},
  statCard: {width: '48%', padding: 20, borderRadius: 12, alignItems: 'center'},
  statValue: {fontSize: 32, fontWeight: '700', color: '#333', marginTop: 12},
  statLabel: {fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center'},
});
