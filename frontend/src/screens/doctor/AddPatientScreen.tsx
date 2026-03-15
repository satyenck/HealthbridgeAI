import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {doctorService} from '../../services/doctorService';

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer Not to Say'];

export const AddPatientScreen = ({navigation}: any) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [generalHealthIssues, setGeneralHealthIssues] = useState('');
  const [saving, setSaving] = useState(false);

  // Convert DD-MM-YYYY to YYYY-MM-DD for backend
  const parseDate = (value: string): string | null => {
    const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = value.match(regex);
    if (!match) return null;
    const [, dd, mm, yyyy] = match;
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    if (isNaN(d.getTime())) return null;
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }
    if (!firstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Error', 'Last name is required');
      return;
    }
    if (!dateOfBirth.trim()) {
      Alert.alert('Error', 'Date of birth is required');
      return;
    }
    const isoDate = parseDate(dateOfBirth.trim());
    if (!isoDate) {
      Alert.alert('Error', 'Enter date of birth in DD-MM-YYYY format');
      return;
    }
    if (!gender) {
      Alert.alert('Error', 'Gender is required');
      return;
    }

    try {
      setSaving(true);
      const patient = await doctorService.addPatient({
        phone_number: phoneNumber.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: isoDate,
        gender,
        general_health_issues: generalHealthIssues.trim() || undefined,
      });
      navigation.replace('PatientTimeline', {patientId: patient.user_id});
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Failed to add patient';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      <View style={styles.section}>
        <Text style={styles.label}>
          Phone Number <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
          autoCorrect={false}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>
            First Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            autoCorrect={false}
          />
        </View>
        <View style={styles.halfRight}>
          <Text style={styles.label}>
            Last Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>
          Date of Birth <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="DD-MM-YYYY"
          keyboardType="default"
          maxLength={10}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>
          Gender <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option}
              style={StyleSheet.flatten([
                styles.genderChip,
                index < GENDER_OPTIONS.length - 1 ? styles.genderChipMargin : {},
                gender === option ? styles.genderChipSelected : {},
              ])}
              onPress={() => setGender(option)}>
              <Text
                style={StyleSheet.flatten([
                  styles.genderChipText,
                  gender === option ? styles.genderChipTextSelected : {},
                ])}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>General Health Issues</Text>
        <TextInput
          style={styles.textArea}
          value={generalHealthIssues}
          onChangeText={setGeneralHealthIssues}
          placeholder="e.g. Diabetes, Hypertension, Asthma (optional)"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.noteBox}>
        <Icon name="info" size={16} color="#00ACC1" />
        <Text style={styles.noteText}>
          {'  '}You will be set as this patient's primary care doctor.
        </Text>
      </View>

      <TouchableOpacity
        style={saving ? styles.submitButtonDisabled : styles.submitButton}
        onPress={handleSubmit}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.submitInner}>
            <Icon name="person-add" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>  Add Patient</Text>
          </View>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  half: {
    flex: 1,
    marginRight: 8,
  },
  halfRight: {
    flex: 1,
    marginLeft: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  required: {
    color: '#e53935',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    minHeight: 80,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  genderChipMargin: {
    marginRight: 8,
  },
  genderChipSelected: {
    backgroundColor: '#00ACC1',
    borderColor: '#00ACC1',
  },
  genderChipText: {
    fontSize: 14,
    color: '#555',
  },
  genderChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  noteText: {
    fontSize: 13,
    color: '#00838F',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#00ACC1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#00ACC1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
