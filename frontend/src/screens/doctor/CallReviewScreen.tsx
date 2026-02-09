import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {FieldReviewCard} from '../../components/FieldReviewCard';
import {encounterService} from '../../services/encounterService';
import {SummaryReportContent, ReportStatus, Priority} from '../../types';

interface CallReviewScreenProps {
  route: {
    params: {
      encounterId: string;
      audioBase64: string;
      recordingUri: string;
    };
  };
  navigation: any;
}

export const CallReviewScreen: React.FC<CallReviewScreenProps> = ({
  route,
  navigation,
}) => {
  const {encounterId, audioBase64} = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [extractedData, setExtractedData] = useState<Partial<SummaryReportContent>>({});
  const [existingContent, setExistingContent] = useState<SummaryReportContent | null>(null);

  useEffect(() => {
    processCallRecording();
  }, []);

  const processCallRecording = async () => {
    try {
      setLoading(true);

      // Load existing summary report
      const existingSummary = await encounterService.getSummaryReport(encounterId);
      setExistingContent(existingSummary.content);

      // Process call recording
      const response = await encounterService.processCallRecording(
        encounterId,
        audioBase64,
      );

      setTranscription(response.transcription);
      setExtractedData(response.extracted_data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process call recording');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleFieldEdit = (fieldName: keyof SummaryReportContent, value: string) => {
    setExtractedData(prev => ({...prev, [fieldName]: value}));
  };

  const handleSaveReport = async () => {
    if (!existingContent) {
      Alert.alert('Error', 'No existing content found');
      return;
    }

    try {
      setSaving(true);

      // Merge extracted data with existing content (excluding symptoms)
      // Keep patient's original symptoms, update other fields
      const updatedContent: SummaryReportContent = {
        symptoms: existingContent.symptoms, // Keep patient's symptoms
        diagnosis: extractedData.diagnosis || existingContent.diagnosis,
        treatment: extractedData.treatment || existingContent.treatment,
        tests: extractedData.tests || existingContent.tests,
        prescription: extractedData.prescription || existingContent.prescription,
        next_steps: extractedData.next_steps || existingContent.next_steps,
      };

      await encounterService.updateSummaryReport(encounterId, {
        status: ReportStatus.REVIEWED,
        priority: Priority.MEDIUM,
        content: updatedContent,
      });

      Alert.alert('Success', 'Consultation notes saved successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to pending reports list
            navigation.navigate('PendingReportsMain');
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ACC1" />
        <Text style={styles.loadingText}>Processing consultation...</Text>
        <Text style={styles.loadingSubtext}>
          Transcribing and extracting medical information
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Consultation</Text>
        <View style={{width: 24}} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Transcription */}
        <View style={styles.transcriptionCard}>
          <View style={styles.transcriptionHeader}>
            <Icon name="mic" size={20} color="#00ACC1" />
            <Text style={styles.transcriptionTitle}>Consultation Transcript</Text>
          </View>
          <Text style={styles.transcriptionText}>{transcription}</Text>
        </View>

        {/* Extracted Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Extracted Medical Information</Text>
          <Text style={styles.sectionSubtitle}>
            Review and approve the information extracted from the consultation
          </Text>

          {extractedData.symptoms && (
            <FieldReviewCard
              label="Symptoms"
              currentValue={null}
              extractedValue={extractedData.symptoms}
              onEdit={(value) => handleFieldEdit('symptoms', value)}
              readOnly={true}
            />
          )}

          {extractedData.diagnosis && (
            <FieldReviewCard
              label="Diagnosis"
              currentValue={null}
              extractedValue={extractedData.diagnosis}
              onEdit={(value) => handleFieldEdit('diagnosis', value)}
            />
          )}

          {extractedData.treatment && (
            <FieldReviewCard
              label="Treatment"
              currentValue={null}
              extractedValue={extractedData.treatment}
              onEdit={(value) => handleFieldEdit('treatment', value)}
            />
          )}

          {extractedData.tests && (
            <FieldReviewCard
              label="Tests"
              currentValue={null}
              extractedValue={extractedData.tests}
              onEdit={(value) => handleFieldEdit('tests', value)}
            />
          )}

          {extractedData.prescription && (
            <FieldReviewCard
              label="Prescription"
              currentValue={null}
              extractedValue={extractedData.prescription}
              onEdit={(value) => handleFieldEdit('prescription', value)}
            />
          )}

          {extractedData.next_steps && (
            <FieldReviewCard
              label="Next Steps"
              currentValue={null}
              extractedValue={extractedData.next_steps}
              onEdit={(value) => handleFieldEdit('next_steps', value)}
            />
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.discardButton]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveReport}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Report</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#00ACC1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  transcriptionCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transcriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  transcriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  discardButton: {
    backgroundColor: '#f5f5f5',
  },
  discardButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#00ACC1',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
