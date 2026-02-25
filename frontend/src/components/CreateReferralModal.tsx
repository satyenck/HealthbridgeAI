/**
 * CreateReferralModal Component
 *
 * Modal for doctors to create a referral for a patient to another doctor
 * Used in patient profile/encounter screens
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import referralService, { ReferralCreate } from '../services/referralService';
import { doctorService } from '../services/doctorService';

interface CreateReferralModalProps {
  visible: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  sourceEncounterId?: string;
  onSuccess?: () => void;
}

interface Doctor {
  user_id: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  phone_number?: string;
}

const CreateReferralModal: React.FC<CreateReferralModalProps> = ({
  visible,
  onClose,
  patientId,
  patientName,
  sourceEncounterId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);

  // Form state
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [reason, setReason] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [specialtyNeeded, setSpecialtyNeeded] = useState('');

  // Load doctors when modal opens
  useEffect(() => {
    if (visible) {
      loadDoctors();
    }
  }, [visible]);

  // Filter doctors based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDoctors(doctors);
    } else {
      const filtered = doctors.filter(
        (doc) =>
          `${doc.first_name} ${doc.last_name}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          doc.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDoctors(filtered);
    }
  }, [searchQuery, doctors]);

  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true);
      console.log('[CreateReferralModal] Loading doctors...');
      // Search for all doctors (empty query returns all)
      const response = await doctorService.searchDoctors('');
      console.log('[CreateReferralModal] Doctors loaded:', response.length, 'doctors');
      console.log('[CreateReferralModal] Doctors:', response);
      setDoctors(response);
      setFilteredDoctors(response);
    } catch (error: any) {
      console.error('[CreateReferralModal] Failed to load doctors:', error);
      console.error('[CreateReferralModal] Error details:', error.message, error.response);
      if (typeof window !== 'undefined') {
        alert('Failed to load doctors: ' + (error.message || 'Unknown error'));
      }
      Alert.alert('Error', 'Failed to load doctors list: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedDoctor) {
      Alert.alert('Required', 'Please select a doctor to refer to');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for referral');
      return;
    }

    try {
      setLoading(true);

      const referralData: ReferralCreate = {
        patient_id: patientId,
        referred_to_doctor_id: selectedDoctor.user_id,
        reason: reason.trim(),
        clinical_notes: clinicalNotes.trim() || undefined,
        priority,
        specialty_needed: specialtyNeeded.trim() || undefined,
        source_encounter_id: sourceEncounterId,
      };

      await referralService.createReferral(referralData);

      Alert.alert('Success', 'Referral created successfully');
      resetForm();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to create referral:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create referral');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedDoctor(null);
    setReason('');
    setClinicalNotes('');
    setPriority('MEDIUM');
    setSpecialtyNeeded('');
    setSearchQuery('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Referral</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Patient Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient</Text>
            <Text style={styles.patientName}>{patientName}</Text>
          </View>

          {/* Select Doctor */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Refer To Doctor *</Text>
            {selectedDoctor ? (
              <View style={styles.selectedDoctorCard}>
                <View style={styles.selectedDoctorInfo}>
                  <Text style={styles.selectedDoctorName}>
                    Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                  </Text>
                  {selectedDoctor.specialty && (
                    <Text style={styles.selectedDoctorSpecialty}>
                      {selectedDoctor.specialty}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedDoctor(null)}
                  style={styles.changeButton}
                >
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search doctors by name or specialty..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {loadingDoctors ? (
                  <ActivityIndicator style={styles.loader} color="#00695C" />
                ) : (
                  <ScrollView style={styles.doctorsList} nestedScrollEnabled>
                    {filteredDoctors.map((doctor) => (
                      <TouchableOpacity
                        key={doctor.user_id}
                        style={styles.doctorItem}
                        onPress={() => setSelectedDoctor(doctor)}
                      >
                        <Text style={styles.doctorName}>
                          Dr. {doctor.first_name} {doctor.last_name}
                        </Text>
                        {doctor.specialty && (
                          <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                    {filteredDoctors.length === 0 && (
                      <Text style={styles.noResults}>No doctors found</Text>
                    )}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Priority *</Text>
            <View style={styles.priorityButtons}>
              {(['HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && styles.priorityButtonActive,
                    priority === p && p === 'HIGH' && styles.priorityButtonHigh,
                    priority === p && p === 'MEDIUM' && styles.priorityButtonMedium,
                    priority === p && p === 'LOW' && styles.priorityButtonLow,
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      priority === p && styles.priorityButtonTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Specialty Needed */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specialty Needed (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Cardiology, Orthopedics"
              value={specialtyNeeded}
              onChangeText={setSpecialtyNeeded}
            />
          </View>

          {/* Reason */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Referral *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief reason for referral (visible to all parties)"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Clinical Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinical Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detailed clinical context for referred doctor only"
              value={clinicalNotes}
              onChangeText={setClinicalNotes}
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create Referral</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  doctorsList: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  doctorItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#666',
  },
  noResults: {
    padding: 20,
    textAlign: 'center',
    color: '#999',
  },
  loader: {
    padding: 20,
  },
  selectedDoctorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
  },
  selectedDoctorInfo: {
    flex: 1,
  },
  selectedDoctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  selectedDoctorSpecialty: {
    fontSize: 12,
    color: '#666',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityButtonHigh: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  priorityButtonMedium: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  priorityButtonLow: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#00695C',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CreateReferralModal;
