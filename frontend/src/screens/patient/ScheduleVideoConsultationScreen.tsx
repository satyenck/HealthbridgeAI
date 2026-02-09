/**
 * Schedule Video Consultation Screen (Patient)
 * Allows patients to schedule video consultations with doctors
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { format, addDays, addMinutes } from 'date-fns';
import { scheduleConsultation } from '../../services/videoConsultationService';
import apiService from '../../services/apiService';
import { API_ENDPOINTS } from '../../config/api';

interface Doctor {
  user_id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  email: string;
}

const ScheduleVideoConsultationScreen = ({route}: any) => {
  const navigation = useNavigation();
  const symptomsText = route?.params?.symptomsText || '';
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [duration, setDuration] = useState<number>(30);
  const [patientNotes, setPatientNotes] = useState<string>(symptomsText);
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const response = await apiService.get<Doctor[]>(API_ENDPOINTS.AVAILABLE_DOCTORS);
      setDoctors(response);
      if (response.length > 0) {
        setSelectedDoctor(response[0].user_id);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedDoctor) {
      Alert.alert('Error', 'Please select a doctor');
      return;
    }

    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time');
      return;
    }

    try {
      setLoading(true);

      // Combine date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      // Convert to ISO 8601 format
      const scheduledStartTime = scheduledDateTime.toISOString();

      const consultation = await scheduleConsultation({
        doctor_id: selectedDoctor,
        scheduled_start_time: scheduledStartTime,
        duration_minutes: duration,
        patient_notes: patientNotes || undefined,
      });

      Alert.alert(
        'Success',
        `Video consultation scheduled for ${format(scheduledDateTime, 'PPpp')}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to schedule consultation';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots (9 AM to 5 PM, 30-minute intervals)
  const timeSlots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute of [0, 30]) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeStr);
    }
  }

  // Generate next 7 days
  const availableDates = [];
  for (let i = 1; i <= 7; i++) {
    availableDates.push(addDays(new Date(), i));
  }

  if (loadingDoctors) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading doctors...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Schedule Video Consultation</Text>
        <Text style={styles.subtitle}>
          Book a video call with your doctor at your convenience
        </Text>

        {/* Doctor Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Doctor *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedDoctor}
              onValueChange={(value) => setSelectedDoctor(value)}
              style={styles.picker}
            >
              {doctors.map((doctor) => (
                <Picker.Item
                  key={doctor.user_id}
                  label={`Dr. ${doctor.first_name} ${doctor.last_name} - ${doctor.specialization}`}
                  value={doctor.user_id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Date *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedDate.toISOString()}
              onValueChange={(value) => setSelectedDate(new Date(value))}
              style={styles.picker}
            >
              {availableDates.map((date) => (
                <Picker.Item
                  key={date.toISOString()}
                  label={format(date, 'EEEE, MMMM d, yyyy')}
                  value={date.toISOString()}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Time *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedTime}
              onValueChange={(value) => setSelectedTime(value)}
              style={styles.picker}
            >
              {timeSlots.map((time) => (
                <Picker.Item key={time} label={time} value={time} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Duration (minutes) *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={duration}
              onValueChange={(value) => setDuration(value)}
              style={styles.picker}
            >
              <Picker.Item label="15 minutes" value={15} />
              <Picker.Item label="30 minutes" value={30} />
              <Picker.Item label="45 minutes" value={45} />
              <Picker.Item label="60 minutes" value={60} />
            </Picker>
          </View>
        </View>

        {/* Patient Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Reason for Consultation (Optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe your symptoms or reason for consultation"
            value={patientNotes}
            onChangeText={setPatientNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Schedule Button */}
        <TouchableOpacity
          style={[styles.scheduleButton, loading && styles.scheduleButtonDisabled]}
          onPress={handleSchedule}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.scheduleButtonText}>Schedule Consultation</Text>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📌 Important:</Text>
          <Text style={styles.infoText}>• You can join the call 15 minutes before scheduled time</Text>
          <Text style={styles.infoText}>• Make sure you have a stable internet connection</Text>
          <Text style={styles.infoText}>• You'll receive a notification when it's time to join</Text>
          <Text style={styles.infoText}>• The consultation will be recorded for medical records</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  scheduleButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  scheduleButtonDisabled: {
    backgroundColor: '#999',
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
});

export default ScheduleVideoConsultationScreen;
