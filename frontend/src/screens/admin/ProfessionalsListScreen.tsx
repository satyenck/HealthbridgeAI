import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator} from 'react-native';
import {adminService} from '../../services/adminService';
import {DoctorProfile, LabProfile, PharmacyProfile} from '../../types';

export const ProfessionalsListScreen = () => {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [labs, setLabs] = useState<LabProfile[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [doctorsData, labsData, pharmaciesData] = await Promise.all([
        adminService.getDoctors(),
        adminService.getLabs(),
        adminService.getPharmacies(),
      ]);
      setDoctors(doctorsData);
      setLabs(labsData);
      setPharmacies(pharmaciesData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load professionals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#F44336" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Doctors ({doctors.length})</Text>
        {doctors.map((doc) => (
          <View key={doc.user_id} style={styles.card}>
            <Text style={styles.name}>{doc.first_name} {doc.last_name}</Text>
            <Text style={styles.detail}>{doc.specialty || 'General'}</Text>
            <Text style={styles.detail}>{doc.email}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Labs ({labs.length})</Text>
        {labs.map((lab) => (
          <View key={lab.user_id} style={styles.card}>
            <Text style={styles.name}>{lab.business_name}</Text>
            <Text style={styles.detail}>{lab.email}</Text>
            <Text style={styles.detail}>{lab.address}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pharmacies ({pharmacies.length})</Text>
        {pharmacies.map((pharmacy) => (
          <View key={pharmacy.user_id} style={styles.card}>
            <Text style={styles.name}>{pharmacy.business_name}</Text>
            <Text style={styles.detail}>{pharmacy.email}</Text>
            <Text style={styles.detail}>{pharmacy.address}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  content: {padding: 16},
  section: {marginBottom: 24},
  sectionTitle: {fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12},
  card: {backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8},
  name: {fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4},
  detail: {fontSize: 14, color: '#666'},
});
