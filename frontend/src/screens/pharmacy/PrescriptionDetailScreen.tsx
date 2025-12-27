import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {pharmacyService} from '../../services/pharmacyService';
import {Prescription, PatientProfile, OrderStatus} from '../../types';
import {formatDateTime} from '../../utils/dateHelpers';
import {StatusBadge} from '../../components/StatusBadge';

export const PrescriptionDetailScreen = ({route, navigation}: any) => {
  const {prescriptionId} = route.params;
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rxData, patientData] = await Promise.all([
        pharmacyService.getPrescriptionDetail(prescriptionId),
        pharmacyService.getPrescriptionPatientInfo(prescriptionId),
      ]);
      setPrescription(rxData);
      setPatient(patientData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load prescription');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: OrderStatus) => {
    try {
      await pharmacyService.updatePrescriptionStatus(prescriptionId, status);
      Alert.alert('Success', 'Status updated');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FF9800" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>Prescription</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prescription Info</Text>
          <Text>ID: {prescription?.prescription_id.substring(0, 8)}</Text>
          <Text>Created: {formatDateTime(prescription!.created_at)}</Text>
          <StatusBadge status={prescription!.status} type="order" />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient</Text>
          <Text style={styles.value}>{patient?.first_name} {patient?.last_name}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instructions</Text>
          <Text>{prescription?.instructions}</Text>
        </View>
        {prescription?.status === OrderStatus.SENT && (
          <TouchableOpacity style={styles.button} onPress={() => handleUpdateStatus(OrderStatus.RECEIVED)}>
            <Text style={styles.buttonText}>Mark as Received</Text>
          </TouchableOpacity>
        )}
        {prescription?.status === OrderStatus.RECEIVED && (
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Fulfillment', {prescriptionId})}>
            <Text style={styles.buttonText}>Fulfill Prescription</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {backgroundColor: '#FF9800', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center'},
  title: {fontSize: 20, fontWeight: '700', color: '#fff', marginLeft: 16},
  content: {flex: 1, padding: 16},
  card: {backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16},
  cardTitle: {fontSize: 16, fontWeight: '600', marginBottom: 8},
  value: {fontSize: 16, fontWeight: '500'},
  button: {backgroundColor: '#FF9800', padding: 16, borderRadius: 8, alignItems: 'center'},
  buttonText: {fontSize: 16, fontWeight: '600', color: '#fff'},
});
