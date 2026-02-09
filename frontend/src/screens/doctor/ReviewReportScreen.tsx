import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FileViewer from 'react-native-file-viewer';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {encounterService} from '../../services/encounterService';
import {SummaryReport, ReportStatus, Priority, SummaryReportContent, ComprehensiveEncounter, MediaFile, UserRole} from '../../types';
import {API_CONFIG, API_ENDPOINTS} from '../../config/api';
import {SendToLabModal} from '../../components/SendToLabModal';
import {SendToPharmacyModal} from '../../components/SendToPharmacyModal';
import {VoiceReportEditorModal} from '../../components/VoiceReportEditorModal';
import {scheduleConsultation, getConsultationById, VideoConsultation} from '../../services/videoConsultationService';

export const ReviewReportScreen = ({route, navigation}: any) => {
  const {encounterId} = route.params;
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [videoConsultation, setVideoConsultation] = useState<VideoConsultation | null>(null);

  // Form state
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [tests, setTests] = useState('');
  const [prescription, setPrescription] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [translating, setTranslating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUserRole();
      loadReport();
    }, [encounterId]),
  );

  const loadUserRole = async () => {
    try {
      const role = await AsyncStorage.getItem('user_role');
      if (role) {
        setUserRole(role as UserRole);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await encounterService.getEncounterDetail(encounterId);

      // Extract summary report and media files from comprehensive encounter
      if (data.summary_report) {
        setReport(data.summary_report);
        populateForm(data.summary_report);
      }

      if (data.media_files) {
        setMediaFiles(data.media_files);
      }

      // Extract patient and doctor IDs for video consultation scheduling
      if (data.encounter) {
        setPatientId(data.encounter.patient_id);
        setDoctorId(data.encounter.doctor_id);
      }

      // Check if there's a video consultation for this encounter
      try {
        const {getMyConsultations} = require('../../services/videoConsultationService');
        const consultations = await getMyConsultations();
        const linkedConsultation = consultations.find(
          (c: VideoConsultation) => c.encounter_id === encounterId
        );
        if (linkedConsultation) {
          setVideoConsultation(linkedConsultation);
        }
      } catch (error) {
        console.log('No video consultation found for this encounter');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load report');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: SummaryReport) => {
    setSymptoms(data.content.symptoms);
    setDiagnosis(data.content.diagnosis);
    setTreatment(data.content.treatment);
    setTests(data.content.tests || '');
    setPrescription(data.content.prescription || '');
    setNextSteps(data.content.next_steps);
    setPriority(data.priority || Priority.MEDIUM);
  };

  const handleTranslate = async (language: string, languageName: string) => {
    // Prevent multiple simultaneous translations
    if (translating) {
      return;
    }

    try {
      setTranslating(true);

      // Call translate API with timeout handling
      const response = await encounterService.translateSummary(encounterId, language);

      // Update form fields with translated content
      setSymptoms(response.content.symptoms);
      setDiagnosis(response.content.diagnosis);
      setTreatment(response.content.treatment);
      setTests(response.content.tests || '');
      setPrescription(response.content.prescription || '');
      setNextSteps(response.content.next_steps);

      Alert.alert('Success', `Report translated to ${languageName}`);
    } catch (error: any) {
      console.error('Translation error:', error);
      const errorMessage = error.code === 'ECONNABORTED'
        ? 'Translation is taking longer than expected. Please try again.'
        : error.message || 'Failed to translate report';
      Alert.alert('Translation Error', errorMessage);
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!symptoms || symptoms.trim() === '') {
      Alert.alert('Validation Error', 'Symptoms field is required');
      return;
    }
    if (!diagnosis || diagnosis.trim() === '') {
      Alert.alert('Validation Error', 'Diagnosis field is required');
      return;
    }
    if (!treatment || treatment.trim() === '') {
      Alert.alert('Validation Error', 'Treatment field is required');
      return;
    }
    if (!nextSteps || nextSteps.trim() === '') {
      Alert.alert('Validation Error', 'Next Steps field is required');
      return;
    }

    try {
      setSaving(true);
      await encounterService.updateSummaryReport(encounterId, {
        status: ReportStatus.REVIEWED,
        priority,
        content: {
          symptoms,
          diagnosis,
          treatment,
          tests: tests || null,
          prescription: prescription || null,
          next_steps: nextSteps,
        },
      });

      Alert.alert('Success', 'Report reviewed and saved', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleVideoCall = async () => {
    if (!patientId || !doctorId) {
      Alert.alert('Error', 'Patient or doctor information not available');
      return;
    }

    try {
      // Get current doctor ID from storage
      const currentDoctorId = await AsyncStorage.getItem('user_id');
      if (!currentDoctorId) {
        Alert.alert('Error', 'Unable to get doctor ID');
        return;
      }

      // Schedule for random time tomorrow between 9 AM and 5 PM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      // Add random hours (0-7) for time between 9 AM and 5 PM
      const randomHours = Math.floor(Math.random() * 8);
      tomorrow.setHours(tomorrow.getHours() + randomHours);

      const scheduledTime = tomorrow.toISOString();
      const formattedTime = tomorrow.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const confirmMessage = `Schedule video consultation for ${formattedTime}?\n\nThis will link the consultation to this encounter, so you'll have access to the symptoms and summary report during the call.`;

      if (Platform.OS === 'web') {
        if (window.confirm(confirmMessage)) {
          setLoading(true);
          await scheduleConsultation({
            doctor_id: currentDoctorId,
            patient_id: patientId,
            encounter_id: encounterId,
            scheduled_start_time: scheduledTime,
            duration_minutes: 30,
            patient_notes: symptoms ? `Follow-up for: ${symptoms.substring(0, 100)}${symptoms.length > 100 ? '...' : ''}` : undefined,
          });
          Alert.alert('Success', `Video consultation scheduled for ${formattedTime}`);
          setLoading(false);
        }
      } else {
        Alert.alert('Schedule Video Consultation', confirmMessage, [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Schedule',
            onPress: async () => {
              try {
                setLoading(true);
                await scheduleConsultation({
                  doctor_id: currentDoctorId,
                  patient_id: patientId,
                  encounter_id: encounterId,
                  scheduled_start_time: scheduledTime,
                  duration_minutes: 30,
                  patient_notes: symptoms ? `Follow-up for: ${symptoms.substring(0, 100)}${symptoms.length > 100 ? '...' : ''}` : undefined,
                });
                Alert.alert('Success', `Video consultation scheduled for ${formattedTime}`);
              } catch (error: any) {
                Alert.alert('Error', error.response?.data?.detail || 'Failed to schedule consultation');
              } finally {
                setLoading(false);
              }
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to schedule consultation');
      setLoading(false);
    }
  };

  const handleViewFile = async (file: MediaFile) => {
    const isImage = file.file_type.startsWith('image/') || file.file_type === 'image';
    const isPDF = file.file_type === 'application/pdf' || file.file_type === 'pdf' || file.file_type === 'document';
    const isVideo = file.file_type.startsWith('video/') || file.file_type === 'video';

    try {
      const token = await AsyncStorage.getItem('access_token');

      if (!token) {
        Alert.alert('Error', 'Authentication token not found');
        return;
      }

      const fileUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.ENCOUNTER_MEDIA_FILE(encounterId, file.file_id)}`;
      const localFilePath = `${RNFS.DocumentDirectoryPath}/${file.filename}`;

      if (isImage) {
        // Download image with authentication and display in modal
        setLoading(true);
        const downloadResult = await RNFS.downloadFile({
          fromUrl: fileUrl,
          toFile: localFilePath,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).promise;

        if (downloadResult.statusCode === 200) {
          // Set the local file path for display
          setSelectedFile({...file, file_path: localFilePath});
          setShowFileViewer(true);
        } else {
          Alert.alert('Error', 'Failed to load image');
        }
        setLoading(false);
      } else if (isPDF || isVideo) {
        // Download PDF/Video with authentication and open
        setLoading(true);
        const downloadResult = await RNFS.downloadFile({
          fromUrl: fileUrl,
          toFile: localFilePath,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).promise;

        if (downloadResult.statusCode === 200) {
          console.log('File downloaded to:', localFilePath);

          // Check if file exists
          const fileExists = await RNFS.exists(localFilePath);
          console.log('File exists:', fileExists);

          if (!fileExists) {
            Alert.alert('Error', 'Downloaded file not found');
            setLoading(false);
            return;
          }

          try {
            if (isVideo) {
              // For videos, use Share API directly (works better in simulator)
              await Share.open({
                url: localFilePath,
                type: 'video/*',
                title: file.filename,
                failOnCancel: false,
              });
            } else {
              // For PDFs, use FileViewer
              await FileViewer.open(localFilePath, {
                showOpenWithDialog: true,
                showAppsSuggestions: true,
              });
            }
          } catch (viewerError: any) {
            console.error('File viewer error:', viewerError);

            // If it's a "user cancelled" error, don't show alert
            if (viewerError.message && viewerError.message.includes('User did not share')) {
              console.log('User cancelled share sheet');
              // Just close silently
            } else {
              Alert.alert(
                'Unable to Open File',
                Platform.OS === 'ios' && __DEV__
                  ? 'File viewing may not work properly in the simulator. Please test on a real device.'
                  : `Error: ${viewerError.message || 'Unknown error'}`
              );
            }
          }
        } else {
          Alert.alert('Error', `Failed to download ${isPDF ? 'PDF' : 'video'} file`);
        }
        setLoading(false);
      } else {
        Alert.alert('Unsupported File', 'This file type cannot be previewed');
      }
    } catch (error: any) {
      console.error('File download error:', error);
      Alert.alert('Error', `Unable to open file: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ACC1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Review Report</Text>
        {!editing && userRole === UserRole.DOCTOR && (
          <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
            {/* Language Translation Buttons */}
            {translating ? (
              <View style={styles.translatingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.translatingText}>Translating</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.languageButton}
                  onPress={() => handleTranslate('gu', 'Gujarati')}
                  disabled={translating}>
                  <Text style={styles.languageButtonText}>ક</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.languageButton}
                  onPress={() => handleTranslate('hi', 'Hindi')}
                  disabled={translating}>
                  <Text style={styles.languageButtonText}>क</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.languageButton}
                  onPress={() => handleTranslate('en', 'English')}
                  disabled={translating}>
                  <Text style={styles.languageButtonText}>K</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Action Buttons - Only for DOCTOR */}
            <TouchableOpacity onPress={() => setShowVoiceModal(true)} disabled={translating}>
              <Icon name="mic" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(true)} disabled={translating}>
              <Icon name="edit" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Video Consultation Info Banner */}
        {videoConsultation && videoConsultation.status === 'SCHEDULED' && (
          <View style={styles.videoConsultBanner}>
            <Icon name="videocam" size={20} color="#2196F3" />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Video Consultation Scheduled</Text>
              <Text style={styles.bannerText}>
                {new Date(videoConsultation.scheduled_start_time).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </View>
          </View>
        )}

        {/* Priority Section */}
        {editing ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityButtons}>
              {Object.values(Priority).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && styles.priorityButtonActive,
                  ]}
                  onPress={() => setPriority(p)}>
                  <Text
                    style={[
                      styles.priorityButtonText,
                      priority === p && styles.priorityButtonTextActive,
                    ]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.readOnlyCard}>
            <Text style={styles.readOnlyLabel}>Priority</Text>
            <View style={[styles.priorityBadge, styles[`priorityBadge${priority}`]]}>
              <Text style={styles.priorityBadgeText}>{priority}</Text>
            </View>
          </View>
        )}

        {/* Symptoms Section */}
        {editing ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Symptoms</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
            />
          </View>
        ) : (
          symptoms && (
            <View style={styles.readOnlyCard}>
              <Text style={styles.readOnlyLabel}>Symptoms</Text>
              <Text style={styles.readOnlyValue}>{symptoms}</Text>
            </View>
          )
        )}

        {/* Diagnosis Section */}
        {editing ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Diagnosis</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={diagnosis}
              onChangeText={setDiagnosis}
              multiline
            />
          </View>
        ) : (
          diagnosis && (
            <View style={styles.readOnlyCard}>
              <Text style={styles.readOnlyLabel}>Diagnosis</Text>
              <Text style={styles.readOnlyValue}>{diagnosis}</Text>
            </View>
          )
        )}

        {/* Treatment Section */}
        {editing ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Treatment</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={treatment}
              onChangeText={setTreatment}
              multiline
            />
          </View>
        ) : (
          treatment && (
            <View style={styles.readOnlyCard}>
              <Text style={styles.readOnlyLabel}>Treatment</Text>
              <Text style={styles.readOnlyValue}>{treatment}</Text>
            </View>
          )
        )}

        {/* Tests Section */}
        {editing ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tests</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={tests}
              onChangeText={setTests}
              multiline
            />
          </View>
        ) : (
          tests && (
            <View style={styles.readOnlyCard}>
              <Text style={styles.readOnlyLabel}>Tests</Text>
              <Text style={styles.readOnlyValue}>{tests}</Text>
            </View>
          )
        )}

        {/* Prescription Section */}
        {editing ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Prescription</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={prescription}
              onChangeText={setPrescription}
              multiline
            />
          </View>
        ) : (
          prescription && (
            <View style={styles.readOnlyCard}>
              <Text style={styles.readOnlyLabel}>Prescription</Text>
              <Text style={styles.readOnlyValue}>{prescription}</Text>
            </View>
          )
        )}

        {/* Next Steps Section */}
        {editing ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Next Steps</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={nextSteps}
              onChangeText={setNextSteps}
              multiline
            />
          </View>
        ) : (
          nextSteps && (
            <View style={styles.readOnlyCard}>
              <Text style={styles.readOnlyLabel}>Next Steps</Text>
              <Text style={styles.readOnlyValue}>{nextSteps}</Text>
            </View>
          )
        )}

        {/* Patient Uploaded Files */}
        {mediaFiles.length > 0 && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Patient Uploaded Files</Text>
            <View style={styles.filesContainer}>
              {mediaFiles.map((file) => {
                const isImage = file.file_type.startsWith('image/') || file.file_type === 'image';
                const isPDF = file.file_type === 'application/pdf' || file.file_type === 'pdf' || file.file_type === 'document';
                const isVideo = file.file_type.startsWith('video/') || file.file_type === 'video';
                const fileSize = (file.file_size / 1024).toFixed(1); // Convert to KB

                return (
                  <TouchableOpacity
                    key={file.file_id}
                    style={styles.fileCard}
                    onPress={() => handleViewFile(file)}>
                    <Icon
                      name={isImage ? 'image' : isPDF ? 'picture-as-pdf' : isVideo ? 'videocam' : 'insert-drive-file'}
                      size={40}
                      color={isImage ? '#00ACC1' : isPDF ? '#f44336' : isVideo ? '#9C27B0' : '#757575'}
                    />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.filename}
                      </Text>
                      <Text style={styles.fileDetails}>
                        {fileSize} KB • {new Date(file.uploaded_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Icon name="visibility" size={24} color="#757575" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Send to Lab and Pharmacy buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowLabModal(true)}>
            <Icon name="science" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Send to Lab</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowPharmacyModal(true)}>
            <Icon name="local-pharmacy" size={20} color="#9C27B0" />
            <Text style={styles.actionButtonText}>Send to Pharmacy</Text>
          </TouchableOpacity>
        </View>

        {/* Voice Consultation and Video Call buttons - Doctor only */}
        {userRole === UserRole.DOCTOR && (
          <>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.voiceCallButton]}
                onPress={() => navigation.navigate('VoiceCall', {encounterId})}>
                <Icon name="phone" size={20} color="#fff" />
                <Text style={styles.voiceCallButtonText}>Start Voice Consultation</Text>
              </TouchableOpacity>
            </View>

            {videoConsultation ? (
              // Show Join Video Call button if consultation is scheduled
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.videoCallButton]}
                  onPress={() =>
                    (navigation as any).navigate('VideoCallScreen', {
                      consultationId: videoConsultation.consultation_id,
                    })
                  }>
                  <Icon name="videocam" size={20} color="#fff" />
                  <Text style={styles.videoCallButtonText}>
                    {videoConsultation.status === 'SCHEDULED' ? '🎥 Join Video Call' : 'View Video Call Details'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Show Schedule Video Call button if no consultation scheduled
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.videoCallButton]}
                  onPress={handleScheduleVideoCall}
                  disabled={!patientId || !doctorId}>
                  <Icon name="videocam" size={20} color="#fff" />
                  <Text style={styles.videoCallButtonText}>Schedule Video Call</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <SendToLabModal
        visible={showLabModal}
        encounterId={encounterId}
        onClose={() => setShowLabModal(false)}
        onSuccess={() => Alert.alert('Success', 'Lab order sent successfully')}
        initialInstructions={tests}
      />

      <SendToPharmacyModal
        visible={showPharmacyModal}
        encounterId={encounterId}
        onClose={() => setShowPharmacyModal(false)}
        onSuccess={() =>
          Alert.alert('Success', 'Prescription sent successfully')
        }
        initialInstructions={prescription}
      />

      <VoiceReportEditorModal
        visible={showVoiceModal}
        encounterId={encounterId}
        onClose={() => setShowVoiceModal(false)}
        onApprove={(extractedFields: Partial<SummaryReportContent>) => {
          // Populate form with extracted fields
          if (extractedFields.symptoms) setSymptoms(extractedFields.symptoms);
          if (extractedFields.diagnosis) setDiagnosis(extractedFields.diagnosis);
          if (extractedFields.treatment) setTreatment(extractedFields.treatment);
          if (extractedFields.tests) setTests(extractedFields.tests);
          if (extractedFields.prescription) setPrescription(extractedFields.prescription);
          if (extractedFields.next_steps) setNextSteps(extractedFields.next_steps);
          setEditing(true); // Auto-enable editing mode
          setShowVoiceModal(false);
        }}
      />

      {/* Image Viewer Modal */}
      <Modal
        visible={showFileViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFileViewer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.imageViewerContainer}>
            <View style={styles.imageViewerHeader}>
              <Text style={styles.imageViewerTitle} numberOfLines={1}>
                {selectedFile?.filename}
              </Text>
              <TouchableOpacity onPress={() => setShowFileViewer(false)}>
                <Icon name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {selectedFile && (
              <Image
                source={{uri: Platform.OS === 'ios' ? selectedFile.file_path : `file://${selectedFile.file_path}`}}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {editing && userRole === UserRole.DOCTOR && (
        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditing(false);
                if (report) {
                  populateForm(report);
                }
              }}
              disabled={saving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save & Mark Reviewed</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    backgroundColor: '#00ACC1',
    paddingTop: 32,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginLeft: 16,
  },
  languageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  languageButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  translatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  translatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
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
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#00ACC1',
    borderColor: '#00ACC1',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#00ACC1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  voiceCallButton: {
    backgroundColor: '#00ACC1',
    borderColor: '#00ACC1',
  },
  voiceCallButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  videoCallButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  videoCallButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  filesContainer: {
    gap: 12,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fileDetails: {
    fontSize: 12,
    color: '#757575',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: '100%',
    height: '100%',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  imageViewerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 16,
  },
  fullScreenImage: {
    flex: 1,
    width: '100%',
  },
  readOnlyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  readOnlyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00ACC1',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  readOnlyValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  priorityBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  priorityBadgeHIGH: {
    backgroundColor: '#ffebee',
  },
  priorityBadgeMEDIUM: {
    backgroundColor: '#fff8e1',
  },
  priorityBadgeLOW: {
    backgroundColor: '#e8f5e9',
  },
  priorityBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  videoConsultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    gap: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 13,
    color: '#1976D2',
  },
});
