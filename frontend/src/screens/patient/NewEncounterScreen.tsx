import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {encounterService} from '../../services/encounterService';
import {authService} from '../../services/authService';
import {EncounterType, InputMethod, DoctorProfile} from '../../types';

export const NewEncounterScreen = ({route, navigation}: any) => {
  const {encounterType} = route.params;
  const [creating, setCreating] = useState(false);
  const [selectedInputMethod, setSelectedInputMethod] = useState<InputMethod>(
    InputMethod.VOICE,
  );
  const [symptoms, setSymptoms] = useState('');
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const doctorsList = await encounterService.getAvailableDoctors();
      setDoctors(doctorsList);
    } catch (error: any) {
      console.error('Failed to load doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const getEncounterTypeInfo = () => {
    switch (encounterType) {
      case EncounterType.REMOTE_CONSULT:
        return {
          title: 'Remote Consultation',
          icon: 'videocam',
          color: '#2196F3',
          description: 'Virtual consultation with your doctor',
        };
      case EncounterType.LIVE_VISIT:
        return {
          title: 'Live Visit',
          icon: 'local-hospital',
          color: '#4CAF50',
          description: 'In-person visit at a healthcare facility',
        };
      case EncounterType.INITIAL_LOG:
        return {
          title: 'Initial Health Log',
          icon: 'edit',
          color: '#FF9800',
          description: 'Record your current health status',
        };
      default:
        return {
          title: 'New Encounter',
          icon: 'add',
          color: '#2196F3',
          description: '',
        };
    }
  };

  const info = getEncounterTypeInfo();

  const handleCreateEncounter = async () => {
    // Validate symptoms for manual entry
    if (selectedInputMethod === InputMethod.MANUAL && !symptoms.trim()) {
      Alert.alert('Error', 'Please describe your symptoms before consulting a doctor');
      return;
    }

    try {
      setCreating(true);
      const userId = await authService.getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const encounter = await encounterService.createEncounter({
        patient_id: userId,
        encounter_type: encounterType,
        input_method: selectedInputMethod,
        ...(selectedDoctor && { doctor_id: selectedDoctor.user_id }),
      });

      // For manual entry, generate AI summary report from the symptoms
      if (selectedInputMethod === InputMethod.MANUAL && symptoms.trim()) {
        await encounterService.generateSummary(
          encounter.encounter_id,
          symptoms.trim()
        );
      }

      // Navigate based on input method
      if (selectedInputMethod === InputMethod.VOICE) {
        navigation.replace('VoiceRecord', {
          encounterId: encounter.encounter_id,
        });
      } else {
        navigation.replace('EncounterDetail', {
          encounterId: encounter.encounter_id,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create encounter');
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, {backgroundColor: info.color}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name={info.icon} size={48} color="#fff" />
          <Text style={styles.title}>{info.title}</Text>
          <Text style={styles.description}>{info.description}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.sectionTitle}>Choose Input Method</Text>

        <TouchableOpacity
          style={[
            styles.methodCard,
            selectedInputMethod === InputMethod.VOICE && styles.methodCardActive,
          ]}
          onPress={() => setSelectedInputMethod(InputMethod.VOICE)}>
          <View style={styles.methodHeader}>
            <Icon
              name="mic"
              size={32}
              color={
                selectedInputMethod === InputMethod.VOICE
                  ? '#2196F3'
                  : '#666'
              }
            />
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Voice Recording</Text>
              <Text style={styles.methodDescription}>
                Speak naturally about your symptoms and health concerns
              </Text>
            </View>
          </View>
          {selectedInputMethod === InputMethod.VOICE && (
            <Icon name="check-circle" size={24} color="#2196F3" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodCard,
            selectedInputMethod === InputMethod.MANUAL && styles.methodCardActive,
          ]}
          onPress={() => setSelectedInputMethod(InputMethod.MANUAL)}>
          <View style={styles.methodHeader}>
            <Icon
              name="edit"
              size={32}
              color={
                selectedInputMethod === InputMethod.MANUAL
                  ? '#2196F3'
                  : '#666'
              }
            />
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Manual Entry</Text>
              <Text style={styles.methodDescription}>
                Type your information and add vitals, files, etc.
              </Text>
            </View>
          </View>
          {selectedInputMethod === InputMethod.MANUAL && (
            <Icon name="check-circle" size={24} color="#2196F3" />
          )}
        </TouchableOpacity>

        <View style={styles.symptomsContainer}>
          <Text style={styles.sectionTitle}>Describe Your Symptoms</Text>
          <TextInput
            style={styles.symptomsInput}
            multiline
            numberOfLines={6}
            placeholder="Describe your symptoms, concerns, or reason for consultation..."
            value={symptoms}
            onChangeText={setSymptoms}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.doctorContainer}>
          <Text style={styles.sectionTitle}>Select Doctor (Optional)</Text>
          <TouchableOpacity
            style={styles.doctorSelectButton}
            onPress={() => setDoctorModalVisible(true)}
            disabled={loadingDoctors}>
            <View style={styles.doctorSelectContent}>
              <Icon name="person" size={24} color="#666" />
              <Text style={styles.doctorSelectText}>
                {selectedDoctor
                  ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}${selectedDoctor.specialty ? ` (${selectedDoctor.specialty})` : ''}`
                  : loadingDoctors
                  ? 'Loading doctors...'
                  : 'Tap to select a doctor'}
              </Text>
            </View>
            <Icon name="arrow-forward-ios" size={20} color="#666" />
          </TouchableOpacity>
          {selectedDoctor && (
            <TouchableOpacity
              style={styles.clearDoctorButton}
              onPress={() => setSelectedDoctor(null)}>
              <Text style={styles.clearDoctorText}>Clear selection</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoBox}>
          <Icon name="info" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            {selectedInputMethod === InputMethod.VOICE
              ? 'You will be taken to a voice recording screen where you can describe your symptoms. AI will generate a summary for doctor review.'
              : 'Describe your symptoms above, then add vitals and files after creating the encounter.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateEncounter}
          disabled={creating}>
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="add-circle" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Consult Doctor</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Doctor Selection Modal */}
      <Modal
        visible={doctorModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDoctorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Doctor</Text>
              <TouchableOpacity onPress={() => setDoctorModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={doctors}
              keyExtractor={(item) => item.user_id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.doctorItem}
                  onPress={() => {
                    setSelectedDoctor(item);
                    setDoctorModalVisible(false);
                  }}>
                  <View style={styles.doctorItemContent}>
                    <Icon name="person" size={32} color="#2196F3" />
                    <View style={styles.doctorItemInfo}>
                      <Text style={styles.doctorItemName}>
                        Dr. {item.first_name} {item.last_name}
                      </Text>
                      {item.specialty && (
                        <Text style={styles.doctorItemSpecialty}>{item.specialty}</Text>
                      )}
                      {item.hospital_name && (
                        <Text style={styles.doctorItemHospital}>{item.hospital_name}</Text>
                      )}
                    </View>
                  </View>
                  {selectedDoctor?.user_id === item.user_id && (
                    <Icon name="check-circle" size={24} color="#2196F3" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyDoctorList}>
                  <Icon name="person-off" size={48} color="#ccc" />
                  <Text style={styles.emptyDoctorText}>No doctors available</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  methodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  methodCardActive: {
    borderColor: '#2196F3',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodInfo: {
    marginLeft: 16,
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 24,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  symptomsContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  symptomsInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 150,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  createButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  doctorContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  doctorSelectButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  doctorSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doctorSelectText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  clearDoctorButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDoctorText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  doctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  doctorItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doctorItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  doctorItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  doctorItemSpecialty: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 2,
  },
  doctorItemHospital: {
    fontSize: 13,
    color: '#666',
  },
  emptyDoctorList: {
    alignItems: 'center',
    padding: 40,
  },
  emptyDoctorText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
