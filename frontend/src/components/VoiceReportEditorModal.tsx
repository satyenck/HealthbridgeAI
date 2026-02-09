import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {VoiceRecorder} from './VoiceRecorder';
import {FieldReviewCard} from './FieldReviewCard';
import {encounterService} from '../services/encounterService';
import {voiceService, RecordingResult} from '../services/voiceService';
import {SummaryReportContent} from '../types';

interface VoiceReportEditorModalProps {
  visible: boolean;
  encounterId: string;
  onClose: () => void;
  onApprove: (extractedFields: Partial<SummaryReportContent>) => void;
}

type ModalState = 'recording' | 'processing' | 'review';

export const VoiceReportEditorModal: React.FC<VoiceReportEditorModalProps> = ({
  visible,
  encounterId,
  onClose,
  onApprove,
}) => {
  const [modalState, setModalState] = useState<ModalState>('recording');
  const [transcription, setTranscription] = useState('');
  const [extractedFields, setExtractedFields] = useState<Partial<SummaryReportContent>>({});
  const [existingContent, setExistingContent] = useState<SummaryReportContent | null>(null);

  const handleRecordingComplete = async (result: RecordingResult) => {
    try {
      setModalState('processing');

      // Convert audio to base64
      const audioBase64 = await voiceService.audioToBase64(result.uri);

      // Extract fields from voice
      const response = await encounterService.extractReportFieldsFromVoice(
        encounterId,
        audioBase64,
      );

      setTranscription(response.transcription);
      setExtractedFields(response.extracted_fields);
      setExistingContent(response.existing_content);
      setModalState('review');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process voice recording');
      setModalState('recording');
    }
  };

  const handleFieldEdit = (fieldName: keyof SummaryReportContent, value: string) => {
    setExtractedFields(prev => ({...prev, [fieldName]: value}));
  };

  const handleApproveAll = () => {
    // Filter out null values and symptoms (keep symptoms as patient described)
    const fieldsToApprove: Partial<SummaryReportContent> = {};
    Object.entries(extractedFields).forEach(([key, value]) => {
      if (value && value !== 'null' && key !== 'symptoms') {
        fieldsToApprove[key as keyof SummaryReportContent] = value;
      }
    });
    onApprove(fieldsToApprove);
    handleClose();
  };

  const handleClose = () => {
    setModalState('recording');
    setTranscription('');
    setExtractedFields({});
    setExistingContent(null);
    onClose();
  };

  const renderContent = () => {
    switch (modalState) {
      case 'recording':
        return (
          <View style={styles.recordingContainer}>
            <Text style={styles.title}>Record Voice Update</Text>
            <Text style={styles.subtitle}>
              Speak all the updates you want to make to the report
            </Text>
            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              onError={(error) => Alert.alert('Error', error.message)}
            />
            <Text style={styles.hint}>
              Example: "Update diagnosis to pneumonia, treatment to antibiotics and rest, add chest X-ray to tests"
            </Text>
          </View>
        );

      case 'processing':
        return (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#00ACC1" />
            <Text style={styles.processingText}>Processing your voice...</Text>
            <Text style={styles.processingSubtext}>
              Transcribing and extracting field updates
            </Text>
          </View>
        );

      case 'review':
        return (
          <View style={styles.reviewContainer}>
            <Text style={styles.title}>Review Extracted Updates</Text>
            
            {/* Show transcription */}
            <View style={styles.transcriptionContainer}>
              <Text style={styles.transcriptionLabel}>
                <Icon name="mic" size={16} color="#666" /> Transcription:
              </Text>
              <Text style={styles.transcriptionText}>{transcription}</Text>
            </View>

            {/* Show extracted fields */}
            <ScrollView style={styles.fieldsContainer}>
              {extractedFields.symptoms && (
                <FieldReviewCard
                  label="Symptoms"
                  currentValue={existingContent?.symptoms || null}
                  extractedValue={extractedFields.symptoms}
                  onEdit={(value) => handleFieldEdit('symptoms', value)}
                  readOnly={true}
                />
              )}
              
              {extractedFields.diagnosis && (
                <FieldReviewCard
                  label="Diagnosis"
                  currentValue={existingContent?.diagnosis || null}
                  extractedValue={extractedFields.diagnosis}
                  onEdit={(value) => handleFieldEdit('diagnosis', value)}
                />
              )}

              {extractedFields.treatment && (
                <FieldReviewCard
                  label="Treatment"
                  currentValue={existingContent?.treatment || null}
                  extractedValue={extractedFields.treatment}
                  onEdit={(value) => handleFieldEdit('treatment', value)}
                />
              )}

              {extractedFields.tests && (
                <FieldReviewCard
                  label="Tests"
                  currentValue={existingContent?.tests || null}
                  extractedValue={extractedFields.tests}
                  onEdit={(value) => handleFieldEdit('tests', value)}
                />
              )}

              {extractedFields.prescription && (
                <FieldReviewCard
                  label="Prescription"
                  currentValue={existingContent?.prescription || null}
                  extractedValue={extractedFields.prescription}
                  onEdit={(value) => handleFieldEdit('prescription', value)}
                />
              )}

              {extractedFields.next_steps && (
                <FieldReviewCard
                  label="Next Steps"
                  currentValue={existingContent?.next_steps || null}
                  extractedValue={extractedFields.next_steps}
                  onEdit={(value) => handleFieldEdit('next_steps', value)}
                />
              )}
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.reviewActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApproveAll}>
                <Text style={styles.approveButtonText}>Approve All</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Voice Report Editor</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  recordingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  processingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  reviewContainer: {
    flex: 1,
    padding: 16,
  },
  transcriptionContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  fieldsContainer: {
    flex: 1,
    marginBottom: 16,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#00ACC1',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
