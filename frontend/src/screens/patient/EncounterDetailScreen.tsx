import React, {useState, useEffect, useCallback} from 'react';
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
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tts from 'react-native-tts';
import {encounterService} from '../../services/encounterService';
import {ComprehensiveEncounter, DoctorProfile} from '../../types';
import {formatDateTime} from '../../utils/dateHelpers';
import {VitalsCard} from '../../components/VitalsCard';
import {SummaryReportCard} from '../../components/SummaryReportCard';
import {SendToLabModal} from '../../components/SendToLabModal';
import {SendToPharmacyModal} from '../../components/SendToPharmacyModal';
import apiService from '../../services/apiService';
import {API_ENDPOINTS} from '../../config/api';

export const EncounterDetailScreen = ({route, navigation}: any) => {
  const {encounterId} = route.params;
  const [encounter, setEncounter] = useState<ComprehensiveEncounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedSymptoms, setEditedSymptoms] = useState('');
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [language, setLanguage] = useState<'English' | 'Gujarati'>('English');
  const [translatedContent, setTranslatedContent] = useState<any>(null);
  const [translating, setTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEncounter();
    }, [encounterId])
  );

  useEffect(() => {
    // Initialize TTS with proper error handling
    const initTts = async () => {
      try {
        await Tts.setDefaultLanguage(language === 'Gujarati' ? 'gu-IN' : 'en-US');
        await Tts.setDefaultRate(0.5, true);
        await Tts.setDefaultPitch(1.0);
      } catch (error) {
        console.log('TTS init warning:', error);
      }
    };

    initTts();

    // Add TTS event listeners
    const startListener = Tts.addEventListener('tts-start', () => setIsSpeaking(true));
    const finishListener = Tts.addEventListener('tts-finish', () => setIsSpeaking(false));
    const cancelListener = Tts.addEventListener('tts-cancel', () => setIsSpeaking(false));

    return () => {
      // Cleanup
      try {
        if (startListener) startListener.remove();
        if (finishListener) finishListener.remove();
        if (cancelListener) cancelListener.remove();
        Tts.stop().catch(() => {});
      } catch (error) {
        console.log('TTS cleanup warning:', error);
      }
    };
  }, [language]);

  const loadEncounter = async () => {
    try {
      setLoading(true);
      const data = await encounterService.getEncounterDetail(encounterId);
      setEncounter(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load encounter');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddVitals = () => {
    navigation.navigate('VitalsEntry', {encounterId});
  };

  const handleAddVoice = () => {
    navigation.navigate('VoiceRecord', {encounterId});
  };

  const handleAddMedia = () => {
    navigation.navigate('MediaUpload', {encounterId});
  };

  const handleEditSymptoms = () => {
    if (encounter?.summary_report?.content.symptoms) {
      setEditedSymptoms(encounter.summary_report.content.symptoms);
      setEditModalVisible(true);
    }
  };

  const handleSaveSymptoms = async () => {
    if (!encounter?.summary_report) return;

    try {
      setSaving(true);
      await encounterService.updatePatientSymptoms(encounterId, editedSymptoms);

      // Reload encounter to show updated data
      await loadEncounter();
      setEditModalVisible(false);
      Alert.alert('Success', 'Symptoms updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update symptoms');
    } finally {
      setSaving(false);
    }
  };

  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const doctorsList = await encounterService.getAvailableDoctors();
      setDoctors(doctorsList);
      setDoctorModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleAssignDoctor = async (doctor: DoctorProfile) => {
    try {
      setAssigning(true);
      setDoctorModalVisible(false);
      await encounterService.assignDoctor(encounterId, doctor.user_id);
      await loadEncounter();
      Alert.alert('Success', `Dr. ${doctor.first_name} ${doctor.last_name} has been assigned`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to assign doctor');
    } finally {
      setAssigning(false);
    }
  };

  const handleTranslate = async () => {
    const targetLanguage = language === 'English' ? 'Gujarati' : 'English';

    if (targetLanguage === 'Gujarati') {
      // Always fetch fresh translation when switching to Gujarati
      try {
        setTranslating(true);
        const response = await apiService.get(API_ENDPOINTS.TRANSLATE_SUMMARY(encounterId));
        console.log('Translation API response:', response);
        console.log('Translated content:', response.translated_content);

        // Ensure all fields exist (fill in missing ones from original)
        const originalContent = encounter?.summary_report?.content || {};
        const translated = {
          symptoms: response.translated_content?.symptoms || originalContent.symptoms || '',
          diagnosis: response.translated_content?.diagnosis || originalContent.diagnosis || '',
          treatment: response.translated_content?.treatment || originalContent.treatment || '',
          tests: response.translated_content?.tests || originalContent.tests || '',
          prescription: response.translated_content?.prescription || originalContent.prescription || '',
          next_steps: response.translated_content?.next_steps || originalContent.next_steps || '',
        };

        console.log('Final translated content:', translated);

        setTranslatedContent(translated);
        setLanguage('Gujarati');
      } catch (error: any) {
        console.error('Translation error:', error);
        Alert.alert('Error', error.message || 'Failed to translate');
      } finally {
        setTranslating(false);
      }
    } else {
      // Switch back to English
      setLanguage(targetLanguage);
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      // Stop speaking
      try {
        await Tts.stop();
      } catch (error) {
        console.log('TTS stop error:', error);
      }
      setIsSpeaking(false);
      return;
    }

    if (!encounter?.summary_report) {
      Alert.alert('No Summary', 'No consultation summary available to read.');
      return;
    }

    try {
      // Check available voices and set language
      const voices = await Tts.voices();
      const gujaratiVoice = voices.find((v: any) =>
        v.language === 'gu-IN' || v.language.startsWith('gu')
      );

      if (language === 'Gujarati') {
        if (gujaratiVoice) {
          await Tts.setDefaultLanguage('gu-IN');
        } else {
          Alert.alert(
            'Gujarati Voice Not Available',
            'Your device does not have Gujarati voice installed. Speaking in English instead.',
          );
          await Tts.setDefaultLanguage('en-US');
        }
      } else {
        await Tts.setDefaultLanguage('en-US');
      }

      // Build speech text from summary
      const content = language === 'Gujarati' && translatedContent
        ? translatedContent
        : encounter.summary_report.content;

      let speechText = '';

      if (content.symptoms) {
        speechText += language === 'Gujarati'
          ? `લક્ષણો. ${content.symptoms}. `
          : `Symptoms. ${content.symptoms}. `;
      }

      if (content.diagnosis) {
        speechText += language === 'Gujarati'
          ? `નિદાન. ${content.diagnosis}. `
          : `Diagnosis. ${content.diagnosis}. `;
      }

      if (content.treatment) {
        speechText += language === 'Gujarati'
          ? `સારવાર. ${content.treatment}. `
          : `Treatment. ${content.treatment}. `;
      }

      if (content.tests) {
        speechText += language === 'Gujarati'
          ? `પરીક્ષણો. ${content.tests}. `
          : `Tests. ${content.tests}. `;
      }

      if (content.prescription) {
        speechText += language === 'Gujarati'
          ? `દવા. ${content.prescription}. `
          : `Prescription. ${content.prescription}. `;
      }

      if (content.next_steps) {
        speechText += language === 'Gujarati'
          ? `આગળના પગલાં. ${content.next_steps}. `
          : `Next Steps. ${content.next_steps}. `;
      }

      if (speechText.trim() === '') {
        Alert.alert('No Content', 'No consultation details to read aloud.');
        return;
      }

      // Speak the text
      Tts.speak(speechText);
    } catch (error) {
      console.error('TTS Error:', error);
      Alert.alert('Error', 'Failed to read consultation aloud');
      setIsSpeaking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!encounter) {
    return null;
  }

  const hasVitals = encounter.vitals && encounter.vitals.length > 0;
  const hasLabResults = encounter.lab_results && encounter.lab_results.length > 0;
  const hasSummary = !!encounter.summary_report;
  const hasMedia = encounter.media_files && encounter.media_files.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Encounter Details</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Encounter Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Encounter Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID:</Text>
            <Text style={styles.infoValue}>{encounter.encounter.encounter_id.substring(0, 8)}...</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>{encounter.encounter.encounter_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDateTime(encounter.encounter.created_at)}</Text>
          </View>
          {encounter.encounter.input_method && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Input Method:</Text>
              <Text style={styles.infoValue}>{encounter.encounter.input_method}</Text>
            </View>
          )}
        </View>

        {/* Doctor Assignment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Doctor</Text>
          {encounter.doctor_info ? (
            <>
              <View style={styles.doctorInfoContainer}>
                <Icon name="person" size={40} color="#2196F3" />
                <View style={styles.doctorDetails}>
                  <Text style={styles.doctorName}>
                    Dr. {encounter.doctor_info.first_name} {encounter.doctor_info.last_name}
                  </Text>
                  {encounter.doctor_info.specialty && (
                    <Text style={styles.doctorSpecialty}>{encounter.doctor_info.specialty}</Text>
                  )}
                  {encounter.doctor_info.hospital_name && (
                    <Text style={styles.doctorHospital}>{encounter.doctor_info.hospital_name}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.changeDoctorButton}
                onPress={loadDoctors}
                disabled={loadingDoctors || assigning}>
                <Icon name="swap-horiz" size={20} color="#2196F3" />
                <Text style={styles.changeDoctorText}>Change Doctor</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.assignDoctorButton}
              onPress={loadDoctors}
              disabled={loadingDoctors || assigning}>
              {loadingDoctors || assigning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="person-add" size={24} color="#fff" />
                  <Text style={styles.assignDoctorText}>Assign a Doctor</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Report */}
        {hasSummary && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Summary Report</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.iconButton, isSpeaking && styles.iconButtonActive]}
                  onPress={handleSpeak}
                  disabled={!encounter.summary_report}>
                  <Icon
                    name={isSpeaking ? 'stop' : 'volume-up'}
                    size={20}
                    color={isSpeaking ? '#F44336' : '#2196F3'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.translateButton}
                  onPress={handleTranslate}
                  disabled={translating}>
                  {translating ? (
                    <ActivityIndicator size="small" color="#2196F3" />
                  ) : (
                    <>
                      <Icon name="translate" size={18} color="#2196F3" />
                      <Text style={styles.translateButtonText}>
                        {language === 'English' ? 'ગુજરાતી' : 'English'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {encounter.summary_report!.status !== 'REVIEWED' && (
                  <TouchableOpacity onPress={handleEditSymptoms} style={styles.editButton}>
                    <Icon name="edit" size={20} color="#2196F3" />
                    <Text style={styles.editButtonText}>Edit Symptoms</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <SummaryReportCard
              report={{
                ...encounter.summary_report!,
                content: language === 'Gujarati' && translatedContent
                  ? translatedContent
                  : encounter.summary_report!.content
              }}
              showHeader={false}
              patientView={encounter.summary_report!.status !== 'REVIEWED'}
            />
          </View>
        )}

        {/* Vitals */}
        {hasVitals && (
          <View>
            <Text style={styles.sectionTitle}>Vitals History</Text>
            {encounter.vitals!.map((vital) => (
              <VitalsCard key={vital.vital_id} vitals={vital} />
            ))}
          </View>
        )}

        {/* Lab Results */}
        {hasLabResults && (
          <View>
            <Text style={styles.sectionTitle}>Lab Results</Text>
            {encounter.lab_results!.map((result) => (
              <View key={result.log_id} style={styles.card}>
                <Text style={styles.cardSubtitle}>
                  {formatDateTime(result.recorded_at)}
                </Text>
                <Text style={styles.labData}>
                  {JSON.stringify(result.metrics, null, 2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Media Files */}
        {hasMedia && (
          <View>
            <Text style={styles.sectionTitle}>Uploaded Files</Text>
            <View style={styles.card}>
              {encounter.media_files!.map((file) => (
                <View key={file.file_id} style={styles.fileRow}>
                  <Icon name="insert-drive-file" size={20} color="#666" />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName}>{file.filename}</Text>
                    <Text style={styles.fileSize}>
                      {(file.file_size / 1024).toFixed(2)} KB
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Add More Information</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={handleAddVitals}>
              <Icon name="favorite" size={24} color="#2196F3" />
              <Text style={styles.actionButtonText}>Add Vitals</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleAddVoice}>
              <Icon name="mic" size={24} color="#2196F3" />
              <Text style={styles.actionButtonText}>Voice Note</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleAddMedia}>
              <Icon name="attach-file" size={24} color="#2196F3" />
              <Text style={styles.actionButtonText}>Upload Files</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Send to Lab/Pharmacy Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Send Orders</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, styles.labButton]}
              onPress={() => setShowLabModal(true)}>
              <Icon name="science" size={24} color="#2196F3" />
              <Text style={styles.actionButtonText}>Send to Lab</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.pharmacyButton]}
              onPress={() => setShowPharmacyModal(true)}>
              <Icon name="local-pharmacy" size={24} color="#9C27B0" />
              <Text style={styles.actionButtonText}>Send to Pharmacy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Lab and Pharmacy Modals */}
      <SendToLabModal
        visible={showLabModal}
        encounterId={encounterId}
        onClose={() => setShowLabModal(false)}
        onSuccess={() => {
          Alert.alert('Success', 'Lab order sent successfully');
          loadEncounter();
        }}
        initialInstructions={encounter?.summary_report?.content?.tests || ''}
      />

      <SendToPharmacyModal
        visible={showPharmacyModal}
        encounterId={encounterId}
        onClose={() => setShowPharmacyModal(false)}
        onSuccess={() => {
          Alert.alert('Success', 'Prescription sent successfully');
          loadEncounter();
        }}
        initialInstructions={encounter?.summary_report?.content?.prescription || ''}
      />

      {/* Doctor Selection Modal */}
      <Modal
        visible={doctorModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDoctorModalVisible(false)}>
        <View style={styles.doctorModalOverlay}>
          <View style={styles.doctorModalContent}>
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
                  onPress={() => handleAssignDoctor(item)}>
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
                  <Icon name="arrow-forward-ios" size={20} color="#666" />
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

      {/* Edit Symptoms Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Symptoms</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={8}
              value={editedSymptoms}
              onChangeText={setEditedSymptoms}
              placeholder="Describe your symptoms..."
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveSymptoms}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  labData: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionsSection: {
    marginTop: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 8,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#FFEBEE',
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  translateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 200,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doctorInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 2,
  },
  doctorHospital: {
    fontSize: 13,
    color: '#666',
  },
  assignDoctorButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignDoctorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  changeDoctorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  changeDoctorText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 4,
  },
  doctorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  doctorModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
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
  labButton: {
    borderWidth: 1,
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  pharmacyButton: {
    borderWidth: 1,
    borderColor: '#9C27B0',
    backgroundColor: '#F3E5F5',
  },
});
