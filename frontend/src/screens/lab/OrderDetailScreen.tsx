import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {labService} from '../../services/labService';
import {LabOrder, PatientProfile, OrderStatus} from '../../types';
import {formatDateTime} from '../../utils/dateHelpers';
import {StatusBadge} from '../../components/StatusBadge';

export const OrderDetailScreen = ({route, navigation}: any) => {
  const {orderId} = route.params;
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    try {
      const [orderData, patientData] = await Promise.all([
        labService.getOrderDetail(orderId),
        labService.getOrderPatientInfo(orderId),
      ]);
      setOrder(orderData);
      setPatient(patientData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load order');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: OrderStatus) => {
    try {
      await labService.updateOrderStatus(orderId, status);
      Alert.alert('Success', 'Order status updated');
      loadOrder();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#9C27B0" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Information</Text>
          <Text style={styles.label}>Order ID: {order?.order_id.substring(0, 8)}</Text>
          <Text style={styles.label}>Created: {formatDateTime(order!.created_at)}</Text>
          <StatusBadge status={order!.status} type="order" />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Information</Text>
          <Text style={styles.value}>{patient?.first_name} {patient?.last_name}</Text>
          <Text style={styles.label}>{patient?.gender} • {patient?.date_of_birth}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instructions</Text>
          <Text style={styles.value}>{order?.instructions}</Text>
        </View>
        <View style={styles.actions}>
          {order?.status === OrderStatus.SENT && (
            <TouchableOpacity style={styles.button} onPress={() => handleUpdateStatus(OrderStatus.RECEIVED)}>
              <Text style={styles.buttonText}>Mark as Received</Text>
            </TouchableOpacity>
          )}
          {order?.status === OrderStatus.RECEIVED && (
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('UploadResults', {orderId})}>
              <Text style={styles.buttonText}>Upload Results</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {backgroundColor: '#9C27B0', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center'},
  title: {fontSize: 20, fontWeight: '700', color: '#fff', marginLeft: 16},
  content: {flex: 1, padding: 16},
  card: {backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3},
  cardTitle: {fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12},
  label: {fontSize: 14, color: '#666', marginBottom: 8},
  value: {fontSize: 16, color: '#333', fontWeight: '500'},
  actions: {marginTop: 16},
  button: {backgroundColor: '#9C27B0', padding: 16, borderRadius: 8, alignItems: 'center'},
  buttonText: {fontSize: 16, fontWeight: '600', color: '#fff'},
});
