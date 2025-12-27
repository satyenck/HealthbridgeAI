import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {pharmacyService} from '../../services/pharmacyService';

export const FulfillmentScreen = ({route, navigation}: any) => {
  const {prescriptionId} = route.params;
  const [fulfilling, setFulfilling] = useState(false);

  const handleFulfill = async () => {
    try {
      setFulfilling(true);
      await pharmacyService.fulfillPrescription(prescriptionId);
      Alert.alert('Success', 'Prescription fulfilled', [
        {text: 'OK', onPress: () => navigation.navigate('PrescriptionsListMain')},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fulfill prescription');
    } finally {
      setFulfilling(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fulfill Prescription</Text>
      <Text style={styles.text}>Mark this prescription as fulfilled and dispensed to the patient.</Text>
      <TouchableOpacity style={styles.button} onPress={handleFulfill} disabled={fulfilling}>
        {fulfilling ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Complete Fulfillment</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#f5f5f5', justifyContent: 'center'},
  title: {fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 16, textAlign: 'center'},
  text: {fontSize: 16, color: '#666', marginBottom: 32, textAlign: 'center'},
  button: {backgroundColor: '#FF9800', padding: 16, borderRadius: 8, alignItems: 'center'},
  buttonText: {fontSize: 16, fontWeight: '600', color: '#fff'},
});
