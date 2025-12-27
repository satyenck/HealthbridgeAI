import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {profileService} from '../services/profileService';

export const ProfileCreateScreen = ({navigation}: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<
    'male' | 'female' | 'other' | 'prefer_not_to_say'
  >('male');
  const [healthCondition, setHealthCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = async () => {
    if (!firstName || !lastName || !dateOfBirth) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await profileService.createProfile({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        gender,
        health_condition: healthCondition || undefined,
      });

      Alert.alert('Success', 'Profile created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.replace('Main'),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to create profile',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    Alert.alert(
      'Voice Input',
      'Voice recording requires react-native-audio-recorder-player package. This feature will allow you to speak your profile information.',
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Your Profile</Text>
        <Text style={styles.subtitle}>
          Tell us about yourself to get personalized care
        </Text>
      </View>

      <View style={styles.formContainer}>
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={handleVoiceInput}
          disabled={isRecording}>
          <Text style={styles.voiceButtonText}>
            {isRecording ? '🎤 Recording...' : '🎤 Use Voice Input'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>
          First Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter first name"
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>
          Last Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter last name"
          value={lastName}
          onChangeText={setLastName}
        />

        <Text style={styles.label}>
          Date of Birth <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
        />

        <Text style={styles.label}>
          Gender <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={gender}
            onValueChange={itemValue => setGender(itemValue)}
            style={styles.picker}>
            <Picker.Item label="Male" value="male" />
            <Picker.Item label="Female" value="female" />
            <Picker.Item label="Other" value="other" />
            <Picker.Item label="Prefer not to say" value="prefer_not_to_say" />
          </Picker>
        </View>

        <Text style={styles.label}>Health Condition (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any existing health conditions or medications"
          value={healthCondition}
          onChangeText={setHealthCondition}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  formContainer: {
    padding: 20,
  },
  voiceButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  voiceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 8,
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
