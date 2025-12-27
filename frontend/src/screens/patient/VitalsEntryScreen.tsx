import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {encounterService} from '../../services/encounterService';
import {validateVitalsInput} from '../../utils/vitalsHelpers';

export const VitalsEntryScreen = ({route, navigation}: any) => {
  const {encounterId} = route.params;
  const [saving, setSaving] = useState(false);

  // Vitals state
  const [bloodPressureSys, setBloodPressureSys] = useState('');
  const [bloodPressureDia, setBloodPressureDia] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [oxygenLevel, setOxygenLevel] = useState('');
  const [weight, setWeight] = useState('');
  const [temperature, setTemperature] = useState('');

  const handleSave = async () => {
    try {
      // Build vitals object
      const vitals: any = {encounter_id: encounterId};

      if (bloodPressureSys) vitals.blood_pressure_sys = parseFloat(bloodPressureSys);
      if (bloodPressureDia) vitals.blood_pressure_dia = parseFloat(bloodPressureDia);
      if (heartRate) vitals.heart_rate = parseFloat(heartRate);
      if (oxygenLevel) vitals.oxygen_level = parseFloat(oxygenLevel);
      if (weight) vitals.weight = parseFloat(weight);
      if (temperature) vitals.temperature = parseFloat(temperature);

      // Validate
      const validation = validateVitalsInput(vitals);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      setSaving(true);
      await encounterService.addVitals(vitals);

      Alert.alert('Success', 'Vitals saved successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save vitals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Enter Vitals</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.instruction}>
          Enter your vital signs. You can fill in as many or as few as you have.
        </Text>

        {/* Blood Pressure */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Blood Pressure (mmHg)</Text>
          <View style={styles.bpRow}>
            <View style={styles.bpInput}>
              <TextInput
                style={styles.input}
                value={bloodPressureSys}
                onChangeText={setBloodPressureSys}
                placeholder="Systolic"
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={styles.bpSeparator}>/</Text>
            <View style={styles.bpInput}>
              <TextInput
                style={styles.input}
                value={bloodPressureDia}
                onChangeText={setBloodPressureDia}
                placeholder="Diastolic"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Text style={styles.hint}>Normal: 90-120 / 60-80</Text>
        </View>

        {/* Heart Rate */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Heart Rate (bpm)</Text>
          <TextInput
            style={styles.input}
            value={heartRate}
            onChangeText={setHeartRate}
            placeholder="Enter heart rate"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>Normal: 60-100</Text>
        </View>

        {/* Oxygen Level */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Oxygen Level (%)</Text>
          <TextInput
            style={styles.input}
            value={oxygenLevel}
            onChangeText={setOxygenLevel}
            placeholder="Enter oxygen level"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>Normal: 95-100</Text>
        </View>

        {/* Temperature */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Temperature (°C)</Text>
          <TextInput
            style={styles.input}
            value={temperature}
            onChangeText={setTemperature}
            placeholder="Enter temperature"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>Normal: 36.1-37.2</Text>
        </View>

        {/* Weight */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            placeholder="Enter weight"
            keyboardType="decimal-pad"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="check" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Save Vitals</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bpInput: {
    flex: 1,
  },
  bpSeparator: {
    fontSize: 24,
    color: '#333',
    marginHorizontal: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});
