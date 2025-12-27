import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator} from 'react-native';
import {pharmacyService} from '../../services/pharmacyService';
import {Prescription} from '../../types';
import {formatDateTime} from '../../utils/dateHelpers';
import {StatusBadge} from '../../components/StatusBadge';

export const PrescriptionsListScreen = ({navigation}: any) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const data = await pharmacyService.getPrescriptions();
      setPrescriptions(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderCard = ({item}: {item: Prescription}) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PrescriptionDetail', {prescriptionId: item.prescription_id})}>
      <View style={styles.header}>
        <View>
          <Text style={styles.id}>Rx #{item.prescription_id.substring(0, 8)}</Text>
          <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
        </View>
        <StatusBadge status={item.status} type="order" />
      </View>
      <Text style={styles.instructions} numberOfLines={2}>{item.instructions}</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FF9800" /></View>;

  return (
    <View style={styles.container}>
      <FlatList data={prescriptions} keyExtractor={(item) => item.prescription_id} renderItem={renderCard} contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); loadPrescriptions();}} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  listContent: {padding: 16},
  card: {backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3},
  header: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12},
  id: {fontSize: 12, color: '#999', marginBottom: 4},
  date: {fontSize: 14, fontWeight: '500', color: '#333'},
  instructions: {fontSize: 14, color: '#666', lineHeight: 20},
});
