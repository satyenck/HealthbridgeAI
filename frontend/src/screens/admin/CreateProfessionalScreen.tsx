import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {adminService} from '../../services/adminService';

export const CreateProfessionalScreen = ({navigation}: any) => {
  const [type, setType] = useState<'doctor' | 'lab' | 'pharmacy'>('doctor');
  const [creating, setCreating] = useState(false);

  // Common fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Doctor fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [specialty, setSpecialty] = useState('');

  // Lab/Pharmacy fields
  const [businessName, setBusinessName] = useState('');

  const handleCreate = async () => {
    try {
      setCreating(true);
      if (type === 'doctor') {
        await adminService.createDoctor({
          email,
          phone,
          first_name: firstName,
          last_name: lastName,
          address,
          hospital_name: hospitalName || undefined,
          specialty: specialty || undefined,
        });
      } else if (type === 'lab') {
        await adminService.createLab({
          email,
          phone,
          business_name: businessName,
          address,
        });
      } else {
        await adminService.createPharmacy({
          email,
          phone,
          business_name: businessName,
          address,
        });
      }
      Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create professional');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Professional</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.typeButtons}>
          {['doctor', 'lab', 'pharmacy'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeButton, type === t && styles.typeButtonActive]}
              onPress={() => setType(t as any)}>
              <Text style={[styles.typeButtonText, type === t && styles.typeButtonTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput style={styles.input} placeholder="Email *" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Phone *" value={phone} onChangeText={setPhone} />
        <TextInput style={styles.input} placeholder="Address *" value={address} onChangeText={setAddress} />

        {type === 'doctor' ? (
          <>
            <TextInput style={styles.input} placeholder="First Name *" value={firstName} onChangeText={setFirstName} />
            <TextInput style={styles.input} placeholder="Last Name *" value={lastName} onChangeText={setLastName} />
            <TextInput style={styles.input} placeholder="Hospital Name" value={hospitalName} onChangeText={setHospitalName} />
            <TextInput style={styles.input} placeholder="Specialty" value={specialty} onChangeText={setSpecialty} />
          </>
        ) : (
          <TextInput style={styles.input} placeholder="Business Name *" value={businessName} onChangeText={setBusinessName} />
        )}

        <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={creating}>
          {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Create {type.charAt(0).toUpperCase() + type.slice(1)}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  header: {backgroundColor: '#fff', padding: 16, paddingTop: 48},
  title: {fontSize: 24, fontWeight: '700', color: '#333'},
  content: {flex: 1, padding: 16},
  typeButtons: {flexDirection: 'row', gap: 8, marginBottom: 20},
  typeButton: {flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#ddd'},
  typeButtonActive: {backgroundColor: '#F44336', borderColor: '#F44336'},
  typeButtonText: {fontSize: 14, color: '#666'},
  typeButtonTextActive: {color: '#fff', fontWeight: '600'},
  input: {backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16},
  createButton: {backgroundColor: '#F44336', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20},
  createButtonText: {fontSize: 16, fontWeight: '600', color: '#fff'},
});
